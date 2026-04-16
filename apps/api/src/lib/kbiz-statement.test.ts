import assert from "node:assert/strict";
import test from "node:test";

import { normalizeKbizStatementRows, parseKbizStatementText } from "./kbiz-statement.ts";

test("parses csv with thai headers and normalizes amount/date", () => {
  const rows = parseKbizStatementText(
    ["เลขที่รายการ,จำนวนเงิน,วันที่,เวลา,หมายเหตุ", "KBZ-001,100.19,16/04/2026,19:45:11,รายการโอนเข้า"].join("\n"),
    "kbiz.csv"
  );

  const result = normalizeKbizStatementRows(rows);
  assert.equal(result.skipped, 0);
  assert.equal(result.transactions[0]?.transactionId, "KBZ-001");
  assert.equal(result.transactions[0]?.amountCents, 10019);
  assert.equal(result.transactions[0]?.note, "รายการโอนเข้า");
  assert.match(result.transactions[0]?.occurredAt ?? "", /2026-04-16/);
});

test("parses json rows with direct amountCents and reference code", () => {
  const rows = parseKbizStatementText(
    JSON.stringify([
      {
        transactionId: "txn-1",
        amountCents: 2550,
        occurredAt: "2026-04-16T12:30:00+07:00",
        referenceCode: "REF-123"
      }
    ]),
    "kbiz.json"
  );

  const result = normalizeKbizStatementRows(rows);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.transactions[0]?.transactionId, "txn-1");
  assert.equal(result.transactions[0]?.amountCents, 2550);
  assert.equal(result.transactions[0]?.referenceCode, "REF-123");
});

test("skips rows with invalid or negative amount", () => {
  const result = normalizeKbizStatementRows([
    { transactionId: "bad-1", amount: "-10.00" },
    { transactionId: "bad-2", amount: "0" }
  ]);

  assert.equal(result.transactions.length, 0);
  assert.equal(result.skipped, 2);
  assert.equal(result.warnings.length, 2);
});
