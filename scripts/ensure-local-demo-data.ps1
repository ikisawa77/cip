$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Push-Location $root

try {
  Write-Host "Checking local demo data..."

  $probeScript = @'
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const env = {};

if (fs.existsSync(envPath)) {
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    env[key] = value;
  }
}

const connection = await mysql.createConnection({
  host: env.DB_HOST || "127.0.0.1",
  port: Number(env.DB_PORT || "3306"),
  user: env.DB_USER || "root",
  password: env.DB_PASSWORD || "",
  database: env.DB_NAME || "cip_local"
});

await connection.execute(`
  CREATE TABLE IF NOT EXISTS site_contents (
    id varchar(36) NOT NULL,
    content_key varchar(120) NOT NULL,
    value_json text NOT NULL,
    updated_at datetime NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY site_contents_key_unique (content_key)
  )
`);

const counts = {};
for (const table of ["users", "products", "site_contents"]) {
  const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
  counts[table] = Number(rows[0].count ?? 0);
}

console.log(JSON.stringify(counts));
await connection.end();
'@

  $probeOutput = $probeScript | corepack pnpm --filter @cip/api exec node --input-type=module -
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to inspect local demo data state."
  }

  $counts = $probeOutput | ConvertFrom-Json
  $missingDemoData = ($counts.users -eq 0) -or ($counts.products -eq 0) -or ($counts.site_contents -eq 0)

  if ($missingDemoData) {
    Write-Host "Local database is missing demo data. Running seed..."
    corepack pnpm db:seed
    if ($LASTEXITCODE -ne 0) {
      throw "db:seed failed"
    }
    Write-Host "Local demo data restored."
  } else {
    Write-Host "Local demo data is ready."
  }
}
finally {
  Pop-Location
}
