import fs from "node:fs/promises";
import path from "node:path";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "../db";
import { providerConfigs, providerSyncFiles, webhookEvents } from "../db/schema";
import { createId } from "./ids";
import {
  normalizeKbizStatementRows,
  parseKbizStatementText,
  type MatchablePromptpayTransactionInput
} from "./kbiz-statement";
import { now } from "./time";

type MatchResult = {
  total: number;
  matched: number;
  unmatched: number;
  results: unknown[];
};

type KbizImportConfig = {
  sourceDir?: string;
  archiveDir?: string;
  errorDir?: string;
  filePattern?: string;
  recursive: boolean;
  stableMs: number;
  archiveDuplicates: boolean;
  maxFiles: number;
};

type KbizImportSummary = {
  ok: boolean;
  note: string;
  scanned: number;
  imported: number;
  matched: number;
  unmatched: number;
  skipped: number;
  warnings: string[];
  files: Array<{
    fileName: string;
    normalized: number;
    skipped: number;
    matched: number;
    unmatched: number;
  }>;
};

type Matcher = (transactions: MatchablePromptpayTransactionInput[]) => Promise<MatchResult>;

function parseConfig(configJson: string): KbizImportConfig {
  let parsed: Record<string, unknown> = {};

  try {
    const raw = JSON.parse(configJson) as unknown;
    if (typeof raw === "object" && raw && !Array.isArray(raw)) {
      parsed = raw as Record<string, unknown>;
    }
  } catch {
    parsed = {};
  }

  return {
    sourceDir: typeof parsed.sourceDir === "string" ? parsed.sourceDir.trim() : undefined,
    archiveDir: typeof parsed.archiveDir === "string" ? parsed.archiveDir.trim() : undefined,
    errorDir: typeof parsed.errorDir === "string" ? parsed.errorDir.trim() : undefined,
    filePattern: typeof parsed.filePattern === "string" ? parsed.filePattern.trim() : undefined,
    recursive: parsed.recursive === true,
    stableMs:
      typeof parsed.stableMs === "number" && Number.isFinite(parsed.stableMs) && parsed.stableMs >= 0
        ? Math.min(10 * 60 * 1000, Math.round(parsed.stableMs))
        : 5_000,
    archiveDuplicates: parsed.archiveDuplicates !== false,
    maxFiles:
      typeof parsed.maxFiles === "number" && Number.isFinite(parsed.maxFiles) && parsed.maxFiles > 0
        ? Math.max(1, Math.min(20, Math.round(parsed.maxFiles)))
        : 5
  };
}

function buildMatcher(filePattern?: string) {
  if (!filePattern) {
    return (fileName: string) => /\.(csv|json)$/i.test(fileName);
  }

  try {
    const regex = new RegExp(filePattern, "i");
    return (fileName: string) => regex.test(fileName);
  } catch {
    return (fileName: string) => /\.(csv|json)$/i.test(fileName);
  }
}

function buildFileSignature(filePath: string, stat: { size: number; mtimeMs: number }) {
  return `${path.basename(filePath)}:${stat.size}:${Math.round(stat.mtimeMs)}`;
}

function toNumber(value: number | bigint) {
  return typeof value === "bigint" ? Number(value) : value;
}

async function listImportCandidates(config: KbizImportConfig) {
  if (!config.sourceDir) {
    return [];
  }

  const accepts = buildMatcher(config.filePattern);
  const excludedDirs = new Set(
    [config.archiveDir, config.errorDir]
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => path.resolve(value))
  );
  const cutoffTime = Date.now() - config.stableMs;

  async function walkDirectory(directory: string): Promise<
    Array<{
      absolutePath: string;
      fileName: string;
      relativePath: string;
      stat: Awaited<ReturnType<typeof fs.stat>>;
      signature: string;
    }>
  > {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const results: Array<{
      absolutePath: string;
      fileName: string;
      relativePath: string;
      stat: Awaited<ReturnType<typeof fs.stat>>;
      signature: string;
    }> = [];

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const normalizedPath = path.resolve(absolutePath);

      if (entry.isDirectory()) {
        if (config.recursive && !excludedDirs.has(normalizedPath)) {
          results.push(...(await walkDirectory(absolutePath)));
        }
        continue;
      }

      if (!entry.isFile() || !accepts(entry.name)) {
        continue;
      }

      const stat = await fs.stat(absolutePath);
      if (toNumber(stat.mtimeMs) > cutoffTime) {
        continue;
      }

      results.push({
        absolutePath,
        fileName: entry.name,
        relativePath: path.relative(config.sourceDir!, absolutePath) || entry.name,
        stat,
        signature: buildFileSignature(absolutePath, stat)
      });
    }

    return results;
  }

  const files = await walkDirectory(config.sourceDir);
  return files.sort((left, right) => toNumber(left.stat.mtimeMs) - toNumber(right.stat.mtimeMs)).slice(0, config.maxFiles);
}

async function moveProcessedFile(targetDir: string, sourceDir: string, sourcePath: string, relativePath: string) {
  const normalizedRelativePath = path.relative(sourceDir, sourcePath) || relativePath;
  const targetPath = path.join(targetDir, normalizedRelativePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.rename(sourcePath, targetPath);
}

export async function runKbizStatementImport(matchTransactions: Matcher): Promise<KbizImportSummary> {
  const [configRow] = await db.select().from(providerConfigs).where(eq(providerConfigs.providerKey, "kbiz")).limit(1);
  if (!configRow || !configRow.isEnabled) {
    return {
      ok: false,
      note: "K-Biz provider disabled",
      scanned: 0,
      imported: 0,
      matched: 0,
      unmatched: 0,
      skipped: 0,
      warnings: [],
      files: []
    };
  }

  const config = parseConfig(configRow.configJson);
  if (!config.sourceDir) {
    return {
      ok: false,
      note: "K-Biz sourceDir not configured",
      scanned: 0,
      imported: 0,
      matched: 0,
      unmatched: 0,
      skipped: 0,
      warnings: [],
      files: []
    };
  }

  const candidates = await listImportCandidates(config);
  if (candidates.length === 0) {
    return {
      ok: true,
      note: "ไม่พบไฟล์ statement ใหม่ใน sourceDir",
      scanned: 0,
      imported: 0,
      matched: 0,
      unmatched: 0,
      skipped: 0,
      warnings: [],
      files: []
    };
  }

  const existingRows = await db
    .select({ fileSignature: providerSyncFiles.fileSignature })
    .from(providerSyncFiles)
    .where(
      and(
        eq(providerSyncFiles.providerKey, "kbiz"),
        inArray(
          providerSyncFiles.fileSignature,
          candidates.map((candidate) => candidate.signature)
        )
      )
    )
    .orderBy(asc(providerSyncFiles.importedAt));
  const existingSignatures = new Set(existingRows.map((row) => row.fileSignature));

  const summary: KbizImportSummary = {
    ok: true,
    note: "นำเข้า K-Biz statement สำเร็จ",
    scanned: candidates.length,
    imported: 0,
    matched: 0,
    unmatched: 0,
    skipped: 0,
    warnings: [],
    files: []
  };

  for (const candidate of candidates) {
    if (existingSignatures.has(candidate.signature)) {
      summary.skipped += 1;
      if (config.archiveDir && config.archiveDuplicates) {
        await moveProcessedFile(config.archiveDir, config.sourceDir, candidate.absolutePath, candidate.relativePath);
      }
      continue;
    }

    try {
      const rawText = await fs.readFile(candidate.absolutePath, "utf8");
      const rows = parseKbizStatementText(rawText, candidate.fileName);
      const normalized = normalizeKbizStatementRows(rows);
      const matchResult = await matchTransactions(normalized.transactions);

      await db.insert(providerSyncFiles).values({
        id: createId(),
        providerKey: "kbiz",
        filePath: candidate.absolutePath,
        fileSignature: candidate.signature,
        importedAt: now(),
        sourceCreatedAt: new Date(toNumber(candidate.stat.mtimeMs)),
        payloadJson: JSON.stringify({
          fileName: candidate.fileName,
          normalized: normalized.transactions.length,
          skipped: normalized.skipped,
          warnings: normalized.warnings,
          matched: matchResult.matched,
          unmatched: matchResult.unmatched
        })
      });

      await db.insert(webhookEvents).values({
        id: createId(),
        providerKey: "kbiz_import",
        eventType: "statement.file.processed",
        payloadJson: JSON.stringify({
          fileName: candidate.fileName,
          fileSignature: candidate.signature,
          normalized: normalized.transactions.length,
          skipped: normalized.skipped,
          warnings: normalized.warnings,
          result: matchResult
        }),
        processed: true,
        createdAt: now()
      });

      if (config.archiveDir) {
        await moveProcessedFile(config.archiveDir, config.sourceDir, candidate.absolutePath, candidate.relativePath);
      }

      summary.imported += 1;
      summary.matched += matchResult.matched;
      summary.unmatched += matchResult.unmatched;
      summary.skipped += normalized.skipped;
      summary.warnings.push(...normalized.warnings);
      summary.files.push({
        fileName: candidate.fileName,
        normalized: normalized.transactions.length,
        skipped: normalized.skipped,
        matched: matchResult.matched,
        unmatched: matchResult.unmatched
      });
    } catch (error) {
      summary.ok = false;
      summary.warnings.push(`${candidate.fileName}: ${error instanceof Error ? error.message : "unknown error"}`);
      if (config.errorDir) {
        try {
          await moveProcessedFile(config.errorDir, config.sourceDir, candidate.absolutePath, candidate.relativePath);
        } catch (moveError) {
          summary.warnings.push(
            `${candidate.fileName}: errorDir move failed | ${moveError instanceof Error ? moveError.message : "unknown error"}`
          );
        }
      }
    }
  }

  if (summary.imported === 0 && summary.skipped > 0) {
    summary.note = "ยังไม่มีไฟล์ใหม่ให้ import";
  }

  return summary;
}
