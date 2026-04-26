import { syncProvider } from "../services/store.js";

function readIntervalMs() {
  const raw = Number(process.env.KBIZ_SYNC_INTERVAL_MS ?? process.env.KBIZ_SYNC_INTERVAL_MINUTES ?? 300000);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 300_000;
  }

  if (raw < 1_000) {
    return Math.round(raw * 60_000);
  }

  return Math.round(raw);
}

async function tick() {
  const startedAt = new Date().toISOString();
  const result = await syncProvider("kbiz");
  console.log(`[kbiz-scheduler] ${startedAt} ok=${result.ok} note=${result.note}`);
}

async function main() {
  const intervalMs = readIntervalMs();
  console.log(`[kbiz-scheduler] started intervalMs=${intervalMs}`);
  await tick();

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);

  const shutdown = () => {
    clearInterval(timer);
    console.log("[kbiz-scheduler] stopped");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main();
