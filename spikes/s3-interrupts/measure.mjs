// Automated S3 measurement. From spikes/: node s3-interrupts/measure.mjs [--out results.json] [--no-docker]
// Host: prod (serve-prod.mjs) + dev (vite) x Chromium/Firefox/WebKit; then Chromium in the Playwright Docker image
// with --cpus=0.5. Per-run assertions fail loudly. `--container` is the in-Docker entry point (prod only).
import { spawn, execSync, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const spikes = path.join(here, "..");
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const flag = (n) => process.argv.includes(n);
const outFile = arg("--out");
const inContainer = flag("--container");
const RUNS = 5, C_RUNS = 3, C_CAP_MS = 3000;
const fwd = (p) => p.split(path.sep).join("/");

const stat = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  const r = (v) => +v.toFixed(1);
  return { median: r(m), min: r(s[0]), max: r(s.at(-1)) };
};

async function waitUp(url) {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).status < 500) return; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("server did not start: " + url);
}

// Runs inside the page. Assertions that need page state (KeyboardInterrupt, 1+1) throw here.
async function scenario({ RUNS, C_RUNS, C_CAP_MS }) {
  const s3 = window.__s3;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const must = (c, msg) => { if (!c) throw new Error(msg); };
  const out = { pageCrossOriginIsolated: s3.crossOriginIsolated, soft: [], softSends: [], hard: [], cLoop: [] };
  const checkReady = (m, where) => {
    must(m.workerCrossOriginIsolated === true, `${where}: worker crossOriginIsolated=${m.workerCrossOriginIsolated}`);
    must(m.workerSharedArrayBuffer === "function", `${where}: worker typeof SharedArrayBuffer=${m.workerSharedArrayBuffer}`);
  };
  const two = async (where) => {
    const m = await s3.run("1 + 1").done;
    must(m.type === "result" && m.value === "2", `${where}: 1+1 -> ${JSON.stringify(m)}`);
  };

  let t = s3.now();
  const first = await s3.spawn();
  out.firstBootMs = s3.now() - t;
  checkReady(first, "first boot");
  out.workerInfo = { crossOriginIsolated: first.workerCrossOriginIsolated, sharedArrayBuffer: first.workerSharedArrayBuffer, loader: first.loader };
  await two("first boot");

  // Soft stop of `while True: pass`; the SAME worker must then run 1+1.
  for (let i = 1; i <= RUNS; i++) {
    const r = s3.run("while True: pass");
    await r.started; await sleep(300); // worker has begun executing; let it enter the loop
    t = s3.now();
    // Resend policy: a stop that arrives before Pyodide has entered the loop is dropped (observed at 0.5 CPU and once in
    // WebKit), so resend every 250 ms until the run ends; fail loudly if 8 sends do not stop it. Latency is from the FIRST send.
    let m = { type: "timeout" }, sends = 0;
    while (m.type === "timeout" && sends < 8) {
      s3.softStop(); sends++;
      m = await Promise.race([r.done, sleep(250).then(() => ({ type: "timeout" }))]);
    }
    const ms = s3.now() - t;
    out.softSends.push(sends);
    must(m.type === "error" && /KeyboardInterrupt/.test(m.message), `soft ${i}: expected KeyboardInterrupt, got ${JSON.stringify(m)}`);
    await two(`soft ${i} survival`);
    out.soft.push(ms);
  }

  // Hard kill of a busy worker: terminate() -> new worker ready, then 1+1 on the NEW worker.
  for (let i = 1; i <= RUNS; i++) {
    const busy = s3.run("while True: pass");
    await busy.started; await sleep(300);
    const k = await s3.hardKill();
    checkReady(k.ready, `hard ${i}`);
    await two(`hard ${i} new worker`);
    out.hard.push(k.ms);
  }

  // C-level loop: does the soft interrupt reach it?
  for (let i = 1; i <= C_RUNS; i++) {
    const r = s3.run("sum(range(10**10))");
    await r.started; await sleep(300);
    t = s3.now();
    s3.softStop();
    const m = await Promise.race([r.done, sleep(C_CAP_MS).then(() => ({ type: "timeout" }))]);
    const ms = s3.now() - t;
    if (m.type === "timeout") {
      const k = await s3.hardKill(); // soft failed: fall back
      checkReady(k.ready, `cLoop ${i}`);
      await two(`cLoop ${i} after hard kill`);
      out.cLoop.push({ softStopped: false, capMs: C_CAP_MS, hardKillRebootMs: k.ms });
    } else {
      must(m.type === "error" && /KeyboardInterrupt/.test(m.message), `cLoop ${i}: unexpected ${JSON.stringify(m)}`);
      await two(`cLoop ${i} survival`);
      out.cLoop.push({ softStopped: true, latencyMs: ms });
    }
  }

  // Spare-worker mode. Memory of one idle spare: measureUserAgentSpecificMemory before/after booting it (Chromium only).
  out.spare = { swap: [], rebuild: [], double: [], doubleFirst: [], memory: null };
  const rssNow = async () => { await sleep(1500); return window.__rss ? await window.__rss() : null; }; // container only
  const mem0 = await s3.memory();
  const rss0 = await rssNow();
  const sr = await s3.prepareSpare();
  checkReady(sr, "initial spare");
  const mem1 = await s3.memory();
  const rss1 = await rssNow();
  out.spare.rss = rss0 != null && rss1 != null ? { method: "sum of /proc/*/statm resident pages inside the container, 1.5 s after each step", oneWorkerBytes: rss0, withSpareBytes: rss1, spareBytes: rss1 - rss0 } : null;
  out.spare.memory = mem0?.bytes != null && mem1?.bytes != null
    ? { method: "performance.measureUserAgentSpecificMemory", oneWorkerBytes: mem0.bytes, withSpareBytes: mem1.bytes, spareBytes: mem1.bytes - mem0.bytes }
    : { unavailable: mem0?.error ?? mem1?.error ?? "no result" };

  const checkTwo = (m, where) => must(m.type === "result" && m.value === "2", `${where}: 1+1 -> ${JSON.stringify(m)}`);
  // Single kill: terminate the busy worker, route 1+1 to the spare. swap = terminate() -> spare's 1+1 result.
  for (let i = 1; i <= RUNS; i++) {
    const busy = s3.run("while True: pass");
    await busy.started; await sleep(300);
    const sw = s3.swapToSpare();
    const m = await sw.run("1 + 1");
    const ms = s3.now() - sw.t0;
    checkTwo(m, `swap ${i}`);
    out.spare.swap.push(ms);
    const rr = await sw.spareReady; // replacement spare finished booting in the background
    checkReady(rr, `swap ${i} replacement spare`);
    out.spare.rebuild.push(s3.now() - sw.t0);
  }
  // Double kill: a second kill right after the first, while the replacement spare is still booting.
  for (let i = 1; i <= RUNS; i++) {
    const busy = s3.run("while True: pass");
    await busy.started; await sleep(300);
    const a = s3.swapToSpare();
    checkTwo(await a.run("1 + 1"), `double ${i} first`);
    out.spare.doubleFirst.push(s3.now() - a.t0);
    const b = s3.swapToSpare(); // immediately: the active worker is idle, the spare it promotes is still booting
    const m = await b.run("1 + 1");
    const ms = s3.now() - b.t0;
    checkTwo(m, `double ${i} second`);
    out.spare.double.push(ms);
    checkReady(await b.spareReady, `double ${i} replacement spare`);
  }
  return out;
}

async function measure(label, type, origin) {
  const out = { label, browser: type.name() };
  let browser;
  try { browser = await type.launch(); } catch (e) { return { ...out, untested: String(e).split("\n")[0] }; }
  out.browserVersion = browser.version();
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const foreign = [];
    ctx.on("request", (r) => {
      const u = r.url();
      if (!u.startsWith("data:") && !u.startsWith("blob:") && new URL(u).origin !== origin) foreign.push(u);
    });
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    if (inContainer) {
      await page.exposeFunction("__rss", () => {
        let pages = 0;
        for (const pid of readdirSync("/proc")) {
          if (!/^\d+$/.test(pid)) continue;
          try { pages += +readFileSync(`/proc/${pid}/statm`, "utf8").split(" ")[1]; } catch {}
        }
        return pages * 4096;
      });
    }
    await page.goto(origin + "/?manual");
    await page.waitForFunction(() => window.__s3, null, { timeout: 30000 });
    const d = await page.evaluate(scenario, { RUNS, C_RUNS, C_CAP_MS });
    if (!d.pageCrossOriginIsolated) throw new Error(`[${label}] page not crossOriginIsolated`);
    if (foreign.length) throw new Error(`[${label}] foreign requests: ${foreign.join(", ")}`);
    // Observed: with runPythonAsync a soft-stopped run ALSO surfaces KeyboardInterrupt as an uncaught error event
    // (Pyodide's webloop re-raises it out of the setTimeout callback). Tolerate exactly that, count it, fail on anything else.
    const stray = errs.filter((e) => !/KeyboardInterrupt/.test(e));
    if (stray.length) throw new Error(`[${label}] unexpected page errors: ${stray.join("; ")}`);
    out.uncaughtKeyboardInterruptErrors = errs.length;
    out.assertions = d.soft.length * 2 + d.hard.length * 2 + d.cLoop.length + 1;
    Object.assign(out, { firstBootMs: +d.firstBootMs.toFixed(1), workerInfo: d.workerInfo, raw: d });
    out.softStopMs = stat(d.soft);
    out.softSendsPerStop = d.softSends;
    out.hardKillRebootMs = stat(d.hard);
    const cs = d.cLoop.filter((c) => c.softStopped);
    const cf = d.cLoop.filter((c) => !c.softStopped);
    out.cLoopSummary = { runs: d.cLoop.length, softStopped: cs.length, latencyMs: cs.length ? stat(cs.map((c) => c.latencyMs)) : null,
      capMs: C_CAP_MS, hardKillRebootMs: cf.length ? stat(cf.map((c) => c.hardKillRebootMs)) : null };
    const sp = d.spare;
    out.spare = { swapMs: stat(sp.swap), replacementSpareReadyMs: stat(sp.rebuild), doubleKillFirstMs: stat(sp.doubleFirst),
      doubleKillSecondMs: stat(sp.double), memory: sp.memory, rss: sp.rss };
    out.assertions += sp.swap.length * 2 + sp.double.length * 2 + 1;
    await ctx.close();
  } finally { await browser.close().catch(() => {}); }
  return out;
}

function systemInfo() {
  const cpus = os.cpus();
  const pkg = (n) => { try { return JSON.parse(readFileSync(path.join(spikes, "node_modules", n, "package.json"), "utf8")).version; } catch { return null; } };
  let cgroup = null;
  try { cgroup = readFileSync("/sys/fs/cgroup/cpu.max", "utf8").trim(); } catch {}
  return {
    cpu: cpus[0].model.trim(), logicalCores: cpus.length, ramGB: +(os.totalmem() / 2 ** 30).toFixed(1),
    os: `${os.type()} ${os.release()}`, node: process.version, playwright: pkg("playwright"), vite: pkg("vite"),
    pyodide: /^version=(.+)$/m.exec(readFileSync(path.join(spikes, "pyodide-version.txt"), "utf8"))[1].trim(),
    ...(inContainer ? { cgroupCpuMax: cgroup } : {}),
  };
}

const kill = (proc) => {
  if (process.platform === "win32") { try { execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" }); } catch { proc.kill(); } }
  else proc.kill();
};
async function withServer(mode, fn) {
  const port = inContainer ? 4175 : mode === "dev" ? 5173 : 4174;
  const proc = mode === "dev"
    ? spawn("pnpm exec vite --config s3-interrupts/vite.config.ts s3-interrupts --port 5173 --strictPort", { cwd: spikes, shell: true, stdio: "ignore" })
    : spawn(process.execPath, [path.join(here, "serve-prod.mjs"), String(port)], { cwd: here, stdio: "ignore" });
  const origin = `http://localhost:${port}`;
  try { await waitUp(origin + "/"); return await fn(origin); } finally { kill(proc); }
}

const describe = (r) => r.untested ? `${r.label}: UNTESTED ${r.untested}` :
  `${r.label} ${r.browserVersion}: first boot ${r.firstBootMs}; soft ${JSON.stringify(r.softStopMs)}; hard re-boot ${JSON.stringify(r.hardKillRebootMs)}; ` +
  `C loop ${JSON.stringify(r.cLoopSummary)}; spare swap ${JSON.stringify(r.spare.swapMs)} double-kill 2nd ${JSON.stringify(r.spare.doubleKillSecondMs)} mem ${JSON.stringify(r.spare.memory)} rss ${JSON.stringify(r.spare.rss)}`;

const system = systemInfo();
console.log("SYSTEM", JSON.stringify(system));

if (inContainer) {
  const results = await withServer("prod", async (o) => [await measure("chromium (Docker --cpus=0.5)", chromium, o)]);
  results.forEach((r) => console.log(describe(r)));
  writeFileSync(outFile, JSON.stringify({ system, results }, null, 2));
  process.exit(0);
}

execSync("pnpm exec vite build --config s3-interrupts/vite.config.ts s3-interrupts", { cwd: spikes, stdio: "inherit" });

const results = [];
for (const mode of (arg("--modes") ?? "prod,dev").split(",")) {
  await withServer(mode, async (origin) => {
    const only = (arg("--browsers") ?? "chromium,firefox,webkit").split(",");
    for (const [n, t] of [["chromium", chromium], ["firefox", firefox], ["webkit", webkit]].filter(([n]) => only.includes(n))) {
      let r;
      try { r = await measure(`${mode}/${n} (desktop)`, t, origin); }
      catch (e) {
        console.error("FAIL", String(e.message ?? e));
        if (n !== "webkit") throw e;
        r = { label: `${mode}/${n} (desktop)`, browser: n, untested: "run failed: " + String(e.message ?? e).split("\n")[0] };
      }
      r.server = mode;
      results.push(r);
      console.log(describe(r));
    }
  });
}

if (!flag("--no-docker")) {
  const cache = path.join(here, ".cache");
  mkdirSync(cache, { recursive: true });
  const image = "mcr.microsoft.com/playwright:v1.65.1-noble";
  const pnpm = fwd(path.join(spikes, "node_modules/.pnpm"));
  console.log(`DOCKER ${image} --cpus=0.5`);
  execFileSync("docker", ["run", "--rm", "--cpus=0.5", "--ipc=host",
    "-v", `${fwd(here)}:/work/s3`,
    "-v", `${fwd(spikes)}/pyodide-version.txt:/work/pyodide-version.txt:ro`,
    "-v", `${pnpm}/playwright@1.65.1/node_modules/playwright:/work/node_modules/playwright:ro`,
    "-v", `${pnpm}/playwright-core@1.65.1/node_modules/playwright-core:/work/node_modules/playwright-core:ro`,
    image, "bash", "-c", "node /work/s3/measure.mjs --container --out /work/s3/.cache/docker.json"],
    { stdio: "inherit", env: { ...process.env, MSYS_NO_PATHCONV: "1" } });
  const d = JSON.parse(readFileSync(path.join(cache, "docker.json"), "utf8"));
  for (const r of d.results) { r.label = "chromium, mid-range-laptop approximation (Docker --cpus=0.5)"; r.server = "prod"; r.system = d.system; results.push(r); }
}

const untested = results.filter((r) => r.untested).map((r) => r.label);
const total = results.reduce((a, r) => a + (r.assertions ?? 0), 0);
console.log(`ASSERTIONS OK: ${total} checks (per run: soft stop -> KeyboardInterrupt and same worker 1+1=2; hard kill -> new worker ready, worker isolated + SharedArrayBuffer, 1+1=2; C loop outcome asserted either way; spare swap and double kill -> 1+1=2 on the spare, replacement spare ready); untested: ${untested.join(", ") || "none"}`);
if (outFile) {
  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify({ system, results }, null, 2));
}
