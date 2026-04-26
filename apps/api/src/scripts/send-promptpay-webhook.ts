import { eq } from "drizzle-orm";

import { db, pool } from "../db/index.js";
import { paymentIntents, providerConfigs } from "../db/schema.js";
import { signWebhookPayload } from "../lib/security.js";

type CliOptions = {
  baseUrl: string;
  paymentIntentId: string | null;
  referenceCode: string | null;
  amountCents: number | null;
  secret: string | null;
  note: string | null;
};

function readOption(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function readOptions(): CliOptions {
  const amountValue = readOption("--amount-cents");

  return {
    baseUrl: readOption("--base-url") ?? "http://127.0.0.1:3001",
    paymentIntentId: readOption("--payment-intent-id"),
    referenceCode: readOption("--reference-code"),
    amountCents: amountValue ? Number(amountValue) : null,
    secret: readOption("--secret"),
    note: readOption("--note")
  };
}

async function resolveSecret(inputSecret: string | null) {
  if (inputSecret) {
    return inputSecret;
  }

  const [provider] = await db.select().from(providerConfigs).where(eq(providerConfigs.providerKey, "promptpay")).limit(1);
  if (!provider) {
    throw new Error("ไม่พบ provider config ของ promptpay");
  }

  const parsed = JSON.parse(provider.configJson) as { webhookSecret?: unknown };
  if (typeof parsed.webhookSecret !== "string" || parsed.webhookSecret.length < 8) {
    throw new Error("promptpay webhookSecret ยังไม่ถูกตั้งค่า");
  }

  return parsed.webhookSecret;
}

async function resolvePaymentIntent(input: CliOptions) {
  if (input.paymentIntentId) {
    const [intent] = await db.select().from(paymentIntents).where(eq(paymentIntents.id, input.paymentIntentId)).limit(1);
    if (!intent) {
      throw new Error("ไม่พบ payment intent ตาม id ที่ระบุ");
    }

    return {
      referenceCode: intent.referenceCode,
      amountCents: intent.uniqueAmountCents
    };
  }

  if (!input.referenceCode || input.amountCents === null || !Number.isFinite(input.amountCents)) {
    throw new Error("ต้องระบุ --payment-intent-id หรือระบุ --reference-code พร้อม --amount-cents");
  }

  return {
    referenceCode: input.referenceCode,
    amountCents: input.amountCents
  };
}

async function main() {
  const options = readOptions();
  const secret = await resolveSecret(options.secret);
  const intent = await resolvePaymentIntent(options);
  const payload = {
    referenceCode: intent.referenceCode,
    amountCents: intent.amountCents,
    source: "promptpay-bridge-helper",
    note: options.note ?? null
  };
  const rawBody = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const signature = signWebhookPayload(secret, timestamp, rawBody);

  const response = await fetch(`${options.baseUrl}/api/webhooks/promptpay`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cip-timestamp": timestamp,
      "x-cip-signature": signature
    },
    body: rawBody
  });
  const text = await response.text();

  console.log(
    JSON.stringify(
      {
        ok: response.ok,
        status: response.status,
        request: {
          baseUrl: options.baseUrl,
          referenceCode: intent.referenceCode,
          amountCents: intent.amountCents
        },
        response: text ? JSON.parse(text) : null
      },
      null,
      2
    )
  );

  if (!response.ok) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
