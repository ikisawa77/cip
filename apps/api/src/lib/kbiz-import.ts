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
  filePattern?: string;
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
    filePattern: typeof parsed.filePattern === "string" ? parsed.filePattern.trim() : undefined,
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

async function listImportCandidates(config: KbizImportConfig) {
  if (!config.sourceDir) {
    return [];
  }

  const entries = await fs.readdir(config.sourceDir, { withFileTypes: true });
  const accepts = buildMatcher(config.filePattern);

  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && accepts(entry.name))
      .map(async (entry) => {
        const absolutePath = path.join(config.sourceDir!, entry.name);
        const stat = await fs.stat(absolutePath);

        return {
          absolutePath,
          fileName: entry.name,
          stat,
          signature: buildFileSignature(absolutePath, stat)
        };
      })
  );

  return files.sort((left, right) => left.stat.mtimeMs - right.stat.mtimeMs).slice(0, config.maxFiles);
}

async function archiveImportedFile(archiveDir: string, sourcePath: string, fileName: string) {
  await fs.mkdir(archiveDir, { recursive: true });
  const targetPath = path.join(archiveDir, fileName);
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
        sourceCreatedAt: new Date(candidate.stat.mtimeMs),
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
        await archiveImportedFile(config.archiveDir, candidate.absolutePath, candidate.fileName);
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
    }
  }

  if (summary.imported === 0 && summary.skipped > 0) {
    summary.note = "ยังไม่มีไฟล์ใหม่ให้ import";
  }

  return summary;
}
