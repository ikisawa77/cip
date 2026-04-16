export type MatchablePromptpayTransactionInput = {
  transactionId?: string | null;
  amountCents: number;
  occurredAt?: string | null;
  referenceCode?: string | null;
  note?: string | null;
};

export type KbizStatementNormalizationResult = {
  transactions: MatchablePromptpayTransactionInput[];
  skipped: number;
  warnings: string[];
};

const transactionIdAliases = [
  "transactionId",
  "transaction_id",
  "transactionNo",
  "transaction_no",
  "transactionNumber",
  "id",
  "reference",
  "referenceNo",
  "reference_no",
  "เลขที่รายการ",
  "เลขที่อ้างอิง",
  "หมายเลขรายการ"
];

const amountCentsAliases = ["amountCents", "amount_cents"];
const amountAliases = [
  "amount",
  "ยอด",
  "ยอดเงิน",
  "จำนวนเงิน",
  "amountThb",
  "amount_thb",
  "transferAmount",
  "transfer_amount",
  "depositAmount",
  "deposit_amount"
];

const dateTimeAliases = [
  "occurredAt",
  "occurred_at",
  "dateTime",
  "datetime",
  "transactionDateTime",
  "transaction_datetime",
  "timestamp",
  "วันที่เวลา",
  "วันเวลารายการ",
  "วันที่ทำรายการ"
];

const dateAliases = ["date", "transactionDate", "transaction_date", "วันที่", "วันที่รายการ"];
const timeAliases = ["time", "transactionTime", "transaction_time", "เวลา"];
const referenceCodeAliases = [
  "referenceCode",
  "reference_code",
  "merchantReference",
  "merchant_reference",
  "merchantRef",
  "merchant_ref",
  "ref",
  "ref1",
  "refCode",
  "ref_code",
  "รหัสอ้างอิง",
  "เลขอ้างอิงร้าน"
];
const noteAliases = ["note", "memo", "remark", "description", "details", "channel", "รายละเอียด", "หมายเหตุ"];

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildLookup(row: Record<string, unknown>) {
  const map = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    map.set(normalizeKey(key), value);
  }

  return map;
}

function firstDefined(lookup: Map<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    const value = lookup.get(normalizeKey(alias));
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

function toTrimmedString(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function parseAmountCentsValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  const text = toTrimmedString(value);
  if (!text) {
    return null;
  }

  const normalized = text.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function parseAmountBahtToCents(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100);
  }

  const text = toTrimmedString(value);
  if (!text) {
    return null;
  }

  const cleaned = text.replace(/[^\d,.\-+]/g, "");
  if (!cleaned) {
    return null;
  }

  let normalized = cleaned;
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/,/g, "");
  } else if (normalized.includes(",") && !normalized.includes(".")) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

function toIsoDateString(dateValue: unknown, timeValue?: unknown) {
  const dateText = toTrimmedString(dateValue);
  const timeText = toTrimmedString(timeValue);
  const combined = [dateText, timeText].filter(Boolean).join(" ");

  if (!combined) {
    return null;
  }

  const direct = new Date(combined);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  const thaiMatch = combined.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/
  );
  if (thaiMatch) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] = thaiMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ).toISOString();
  }

  const isoLikeMatch = combined.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/
  );
  if (isoLikeMatch) {
    const [, year, month, day, hour = "0", minute = "0", second = "0"] = isoLikeMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ).toISOString();
  }

  return null;
}

function detectDelimiter(headerLine: string) {
  const candidates = [",", ";", "\t", "|"];
  const counts = candidates.map((delimiter) => ({
    delimiter,
    count: headerLine.split(delimiter).length
  }));
  counts.sort((left, right) => right.count - left.count);
  return counts[0]?.delimiter ?? ",";
}

function parseCsvRows(text: string) {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    return [];
  }

  const delimiter = detectDelimiter(trimmed.split(/\r?\n/, 1)[0] ?? ",");
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  const flushCell = () => {
    currentRow.push(currentCell);
    currentCell = "";
  };

  const flushRow = () => {
    if (currentRow.length === 0) {
      return;
    }

    rows.push(currentRow);
    currentRow = [];
  };

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    const next = trimmed[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      flushCell();
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      flushCell();
      flushRow();
      continue;
    }

    currentCell += char;
  }

  flushCell();
  flushRow();

  if (rows.length === 0) {
    return [];
  }

  const [headers, ...body] = rows;
  return body
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header.trim(), row[index]?.trim() ?? ""]))
    );
}

export function parseKbizStatementText(text: string, fileName?: string) {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    return [];
  }

  const extension = fileName?.split(".").pop()?.toLowerCase();
  const looksLikeJson = extension === "json" || trimmed.startsWith("[") || trimmed.startsWith("{");

  if (looksLikeJson) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (isRecord(parsed)) {
      if (Array.isArray(parsed.rows)) {
        return parsed.rows;
      }
      if (Array.isArray(parsed.transactions)) {
        return parsed.transactions;
      }
      if (Array.isArray(parsed.data)) {
        return parsed.data;
      }
    }

    throw new Error("ไฟล์ JSON ของ K-Biz ต้องเป็น array หรือ object ที่มี rows / transactions / data");
  }

  return parseCsvRows(trimmed);
}

export function normalizeKbizStatementRows(rows: unknown[]): KbizStatementNormalizationResult {
  const warnings: string[] = [];
  const transactions: MatchablePromptpayTransactionInput[] = [];

  rows.forEach((row, index) => {
    if (!isRecord(row)) {
      warnings.push(`row ${index + 1}: skipped because row is not an object`);
      return;
    }

    const lookup = buildLookup(row);
    const transactionId = toTrimmedString(firstDefined(lookup, transactionIdAliases)) ?? `kbiz-${index + 1}`;
    const directAmountCents = parseAmountCentsValue(firstDefined(lookup, amountCentsAliases));
    const derivedAmountCents = parseAmountBahtToCents(firstDefined(lookup, amountAliases));
    const amountCents = directAmountCents ?? derivedAmountCents;

    if (!amountCents || amountCents <= 0) {
      warnings.push(`row ${index + 1}: skipped because amount is missing or not positive`);
      return;
    }

    const occurredAt =
      toIsoDateString(firstDefined(lookup, dateTimeAliases)) ??
      toIsoDateString(firstDefined(lookup, dateAliases), firstDefined(lookup, timeAliases));

    const referenceCode = toTrimmedString(firstDefined(lookup, referenceCodeAliases));
    const note = toTrimmedString(firstDefined(lookup, noteAliases));

    transactions.push({
      transactionId,
      amountCents,
      occurredAt,
      referenceCode,
      note
    });
  });

  return {
    transactions,
    skipped: rows.length - transactions.length,
    warnings
  };
}
