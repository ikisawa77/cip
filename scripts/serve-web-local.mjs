import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(rootDir, "apps", "api", "public");
const port = Number(process.env.WEB_PORT ?? 5173);
const apiTarget = new URL(process.env.API_URL ?? "http://127.0.0.1:3001");

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"]
]);

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "content-type": mimeTypes.get(ext) ?? "application/octet-stream"
  });
  fs.createReadStream(filePath).pipe(res);
}

function resolveStaticPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
  const candidate = path.resolve(publicDir, relativePath);

  if (!candidate.startsWith(publicDir)) {
    return null;
  }

  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  const fallback = path.join(publicDir, "index.html");
  return fs.existsSync(fallback) ? fallback : null;
}

function proxyApi(req, res) {
  const options = {
    hostname: apiTarget.hostname,
    port: apiTarget.port || 3001,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: apiTarget.host
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (error) => {
    res.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ message: "API proxy failed", detail: error.message }));
  });

  req.pipe(proxyReq);
}

if (!fs.existsSync(path.join(publicDir, "index.html"))) {
  console.error(`Frontend build not found at ${publicDir}. Run: pnpm --filter @cip/web build`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.url?.startsWith("/api/")) {
    proxyApi(req, res);
    return;
  }

  const filePath = resolveStaticPath(req.url ?? "/");
  if (!filePath) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  sendFile(res, filePath);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`CIP Web ready at http://localhost:${port}`);
});
