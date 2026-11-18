// Usage: node fetch-pyodide.mjs <targetDir>
// Downloads the pinned Pyodide core release, verifies SHA-256, extracts into <targetDir>.
import https from "node:https";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fail = (msg) => {
  console.error(`fetch-pyodide: ${msg}`);
  process.exit(1);
};

const targetArg = process.argv[2];
if (!targetArg) fail("usage: node fetch-pyodide.mjs <targetDir>");
const targetDir = path.resolve(targetArg);

const cfg = Object.fromEntries(
  fs
    .readFileSync(path.join(here, "pyodide-version.txt"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const { version, archive, sha256 } = cfg;
if (!version || !archive || !sha256) fail("pyodide-version.txt needs version, archive, sha256");

const cacheDir = path.join(here, ".cache");
const cachePath = path.join(cacheDir, archive);
const url = `https://github.com/pyodide/pyodide/releases/download/${version}/${archive}`;

const sha256File = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

function download(u, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 10) return reject(new Error("too many redirects"));
    https
      .get(u, { headers: { "User-Agent": "algoverse-spikes" } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          return resolve(download(new URL(res.headers.location, u).toString(), dest, redirects + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        }
        const out = fs.createWriteStream(dest);
        res.pipe(out);
        out.on("finish", () => out.close(resolve));
        out.on("error", reject);
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

const cacheOk = fs.existsSync(cachePath) && sha256File(cachePath) === sha256;

if (cacheOk && fs.existsSync(path.join(targetDir, "pyodide.mjs"))) {
  console.log(`Pyodide ${version} already present in ${targetDir}; skipping.`);
  process.exit(0);
}

if (!cacheOk) {
  fs.mkdirSync(cacheDir, { recursive: true });
  console.log(`Downloading ${url}`);
  try {
    await download(url, cachePath);
  } catch (e) {
    fs.rmSync(cachePath, { force: true });
    fail(`download failed: ${e.message}`);
  }
  const actual = sha256File(cachePath);
  if (actual !== sha256) {
    fs.rmSync(cachePath, { force: true });
    fail(`checksum mismatch for ${archive}: expected ${sha256}, got ${actual}`);
  }
}

fs.mkdirSync(targetDir, { recursive: true });
try {
  // Archive top-level folder is pyodide/; strip it so files land directly in targetDir.
  // Use cwd=targetDir and a relative archive path: GNU tar (Git Bash) treats "E:" in absolute paths as a remote host.
  execFileSync("tar", ["-xjf", path.relative(targetDir, cachePath), "--strip-components=1"], {
    cwd: targetDir,
    stdio: "inherit",
  });
} catch (e) {
  fail(`extraction failed: ${e.message}`);
}
for (const f of ["pyodide.mjs", "pyodide.asm.wasm"]) {
  if (!fs.existsSync(path.join(targetDir, f))) fail(`${f} missing after extraction`);
}
console.log(`Pyodide ${version} extracted to ${targetDir}`);
