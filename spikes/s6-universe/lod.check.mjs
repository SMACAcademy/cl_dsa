// LOD boundary check. From spikes/: node s6-universe/lod.check.mjs
// Thresholds are hardcoded HERE (2.5 and 4), independent of the constants in main.ts, so drift or a > vs >= slip fails.
// Expected DOM counts are literal: 0 or 800 circles/labels, always 81 tiles. Needs `vite build` output in s6-universe/dist.
import { spawn, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
execSync("pnpm exec vite build --config s6-universe/vite.config.ts s6-universe", { cwd: path.join(here, ".."), stdio: "ignore" });
const port = 4178, origin = `http://localhost:${port}`;
const proc = spawn(process.execPath, [path.join(here, "serve-prod.mjs"), String(port)], { cwd: here, stdio: "ignore" });
const kill = () => { try { execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" }); } catch { proc.kill(); } };
let checks = 0;
const CASES = [ // [k, circles, labels]
  [1, 0, 0], [2.4999, 0, 0], [2.5, 800, 0], [3, 800, 0], [3.9999, 800, 0], [4, 800, 800], [8, 800, 800],
  [3.9999, 800, 0], [2.4999, 0, 0], [2.5, 800, 0], [4, 800, 800], [2.4999, 0, 0], // down-crossings and re-crossings
];
try {
  for (const [name, type] of [["chromium", chromium], ["firefox", firefox]]) {
    const b = await type.launch({ headless: true });
    const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
    for (let i = 0; i < 100; i++) { try { if ((await fetch(origin)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
    await page.goto(origin + "/");
    await page.waitForFunction(() => window.s6ready === true);
    for (const [k, c, l] of CASES) {
      const r = await page.evaluate((k) => window.s6probe(k), k);
      const dom = await page.evaluate(() => ({ c: document.querySelectorAll("g.concepts circle").length, l: document.querySelectorAll("g.labels text").length, t: document.querySelectorAll("g.tiles polygon").length }));
      checks += 3;
      if (dom.c !== c || dom.l !== l || dom.t !== 81 || Math.abs(r.k - k) > 1e-9)
        throw new Error(`${name} k=${k}: expected ${c} circles / ${l} labels / 81 tiles, got ${dom.c}/${dom.l}/${dom.t} (k=${r.k})`);
    }
    await b.close();
  }
  console.log(`lod.check OK: ${checks} checks (chromium, firefox; boundaries 2.4999/2.5 and 3.9999/4, up and down)`);
} finally { kill(); }
