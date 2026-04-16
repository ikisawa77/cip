import fs from "node:fs/promises";
import path from "node:path";

import { env } from "../config/env";

type CliOptions = {
  baseUrl: string;
  filePath: string | null;
};

function readOption(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function readOptions(): CliOptions {
  return {
    baseUrl: readOption("--base-url") ?? "http://127.0.0.1:3001",
    filePath: readOption("--file")
  };
}

async function main() {
  const options = readOptions();
  if (!options.filePath) {
    throw new Error("กรุณาระบุ --file <path-to-statement>");
  }

  const raw = await fs.readFile(options.filePath, "utf8");
  const response = await fetch(`${options.baseUrl}/api/internal/kbiz/match-statement`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cron-secret": env.cronSecret
    },
    body: JSON.stringify({
      fileName: path.basename(options.filePath),
      text: raw
    })
  });

  const text = await response.text();
  console.log(
    JSON.stringify(
      {
        ok: response.ok,
        status: response.status,
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
