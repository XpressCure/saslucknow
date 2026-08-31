import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qaDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(qaDirectory, "..", "..");
const host = "127.0.0.1";
const port = Number(process.env.SAS_EMULATOR_PORT || 4192);
const upstreamOrigin = "https://www.saslucknow.in";
const proxyRoutes = new Map([
  ["/emulator-api/savitri-videos", "/api/savitri-videos"],
  ["/emulator-api/gallery-items", "/api/gallery-items"],
  ["/emulator-api/library-search", "/api/library-search"],
  ["/emulator-api/savitri-sakhi", "/api/savitri-sakhi"],
]);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
  [".mp3", "audio/mpeg"],
  [".wav", "audio/wav"],
  [".ogg", "audio/ogg"],
  [".mp4", "video/mp4"],
]);

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  response.end(body);
}

async function proxyJson(request, upstreamPath, url, response) {
  try {
    const requestPayload = ["GET", "HEAD"].includes(request.method) ? undefined : await requestBody(request);
    const upstream = await fetch(`${upstreamOrigin}${upstreamPath}`, {
      method: request.method,
      headers: {
        Accept: "application/json",
        "Content-Type": request.headers["content-type"] || "application/json",
        "User-Agent": "SAS-Lucknow-Emulator/2.0",
      },
      body: requestPayload,
      signal: AbortSignal.timeout(60_000),
    });
    const responsePayload = await upstream.text();
    if (!upstream.ok) {
      send(response, 502, JSON.stringify({ error: `Upstream returned ${upstream.status}` }), {
        "Content-Type": "application/json; charset=utf-8",
      });
      return;
    }
    JSON.parse(responsePayload);
    send(response, 200, responsePayload, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": request.headers.origin || url.origin,
    });
  } catch (error) {
    send(response, 502, JSON.stringify({ error: "Live SAS Lucknow video feed is unavailable." }), {
      "Content-Type": "application/json; charset=utf-8",
    });
  }
}

async function requestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function proxyParticipation(request, url, response) {
  try {
    const body = ["GET", "HEAD"].includes(request.method) ? undefined : await requestBody(request);
    const headers = {
      Accept: request.headers.accept || "application/json",
      "User-Agent": "SAS-Lucknow-Android-Preview/15",
    };
    if (request.headers["content-type"]) headers["Content-Type"] = request.headers["content-type"];
    if (request.headers.cookie) headers.Cookie = request.headers.cookie;
    const upstream = await fetch(`${upstreamOrigin}${url.pathname}${url.search}`, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    const responseBody = request.method === "HEAD" ? null : Buffer.from(await upstream.arrayBuffer());
    const responseHeaders = {
      "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    };
    const cookies = typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie() : [];
    if (cookies.length) responseHeaders["Set-Cookie"] = cookies.map(cookie => cookie.replace(/;\s*Secure/gi, ""));
    send(response, upstream.status, responseBody, responseHeaders);
  } catch (error) {
    send(response, 502, JSON.stringify({ error: "The live SAS Lucknow member service is unavailable." }), {
      "Content-Type": "application/json; charset=utf-8",
    });
  }
}

async function serveStatic(urlPath, response) {
  let relativePath;
  try {
    relativePath = decodeURIComponent(urlPath).replace(/^\/+/, "");
  } catch {
    send(response, 400, "Bad request", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  if (!relativePath) relativePath = "android-app-design/qa/sas-lucknow-full-app-test.html";
  let filePath = path.resolve(workspaceRoot, relativePath);
  const allowedPrefix = `${workspaceRoot}${path.sep}`;
  if (filePath !== workspaceRoot && !filePath.startsWith(allowedPrefix)) {
    send(response, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = path.join(filePath, "index.html");
    const body = await readFile(filePath);
    send(response, 200, body, {
      "Content-Type": mimeTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream",
    });
  } catch {
    send(response, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);
  if (url.pathname.startsWith("/api/participation/member/") || url.pathname === "/api/participation/parichay/applications") {
    await proxyParticipation(request, url, response);
    return;
  }
  const upstreamPath = proxyRoutes.get(url.pathname);
  if (upstreamPath) {
    if (!["GET", "HEAD", "POST"].includes(request.method)) {
      send(response, 405, "Method not allowed", { Allow: "GET, HEAD, POST" });
      return;
    }
    await proxyJson(request, `${upstreamPath}${url.search}`, url, response);
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, "Method not allowed", { Allow: "GET, HEAD" });
    return;
  }
  await serveStatic(url.pathname, response);
});

server.listen(port, host, () => {
  process.stdout.write(`SAS Lucknow emulator server: http://${host}:${port}/android-app-design/qa/sas-lucknow-full-app-test.html\n`);
});
