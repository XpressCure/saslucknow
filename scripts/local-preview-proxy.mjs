import { createReadStream, statSync } from "node:fs";
import { createServer, request as proxyRequest } from "node:http";
import { extname, join, normalize } from "node:path";

const host = "127.0.0.1";
const port = 4173;
const upstreamPort = 4174;
const publicRoot = join(process.cwd(), "dist", "client");
const types = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
};

function serveAsset(req, res, pathname) {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, "");
  const file = join(publicRoot, relative);
  if (!file.startsWith(publicRoot)) return false;

  let stats;
  try {
    stats = statSync(file);
  } catch {
    return false;
  }
  if (!stats.isFile()) return false;

  const headers = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Content-Type": types[extname(file).toLowerCase()] || "application/octet-stream",
  };
  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), stats.size - 1) : stats.size - 1;
      res.writeHead(206, { ...headers, "Content-Length": end - start + 1, "Content-Range": `bytes ${start}-${end}/${stats.size}` });
      createReadStream(file, { start, end }).pipe(res);
      return true;
    }
  }
  res.writeHead(200, { ...headers, "Content-Length": stats.size });
  createReadStream(file).pipe(res);
  return true;
}

createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${host}:${port}`);
  if (serveAsset(req, res, url.pathname)) return;

  const upstream = proxyRequest({
    hostname: host,
    port: upstreamPort,
    path: req.url,
    method: req.method,
    headers: req.headers,
  }, upstreamResponse => {
    res.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
    upstreamResponse.pipe(res);
  });
  upstream.on("error", () => {
    res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Local preview is starting. Please refresh in a moment.");
  });
  req.pipe(upstream);
}).listen(port, host, () => {
  console.log(`Local preview ready at http://${host}:${port}`);
});
