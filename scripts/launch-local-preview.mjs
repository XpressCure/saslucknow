import { closeSync, openSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

const project = process.cwd();
const logDir = join(project, "build");

function launch(args, name) {
  const stdout = openSync(join(logDir, `${name}.out.log`), "a");
  const stderr = openSync(join(logDir, `${name}.err.log`), "a");
  const child = spawn(process.execPath, args, {
    cwd: project,
    detached: true,
    env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
    stdio: ["ignore", stdout, stderr],
    windowsHide: true,
  });
  child.unref();
  closeSync(stdout);
  closeSync(stderr);
  return child.pid;
}

const backendPid = launch([
  "node_modules/vinext/dist/cli.js",
  "start",
  "--hostname",
  "127.0.0.1",
  "--port",
  "4174",
], "preview-backend");

const proxyPid = launch(["scripts/local-preview-proxy.mjs"], "preview-proxy");

console.log(JSON.stringify({ backendPid, proxyPid }));
