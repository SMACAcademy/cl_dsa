// Unit check with a fake rAF clock. Run: node s5-animation/tween.check.ts (from spikes/)
import { animate, interpolate, easeOut, type Attrs } from "./tween.ts";

let checks = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) throw new Error("CHECK FAILED: " + m); };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

let queue: ((t: number) => void)[] = [];
(globalThis as any).requestAnimationFrame = (cb: (t: number) => void) => { queue.push(cb); return queue.length; };
const step = (t: number) => { const q = queue; queue = []; q.forEach((cb) => cb(t)); };

ok(near(easeOut(0), 0) && near(easeOut(1), 1) && easeOut(0.5) > 0.5, "ease-out shape");

// ids matched regardless of order
const from: Attrs[] = [{ id: "a", x: 0, y: 0, h: 10 }, { id: "b", x: 100, y: 0, h: 20 }];
const to: Attrs[] = [{ id: "b", x: 0, y: 0, h: 20 }, { id: "a", x: 100, y: 0, h: 10 }];
const mid = interpolate(from, to, 0.5);
ok(mid[0].id === "b" && near(mid[0].x, 50) && mid[1].id === "a" && near(mid[1].x, 50), "match by id, not index");
ok(near(interpolate(from, to, 0)[1].x, 0) && near(interpolate(from, to, 1)[1].x, 100), "endpoints");

const frames: Attrs[][] = [];
let done = false;
const p = animate(from, to, 100, (a) => frames.push(a)).then(() => { done = true; });
step(1000); // start
ok(frames.length === 1 && near(frames[0][1].x, 0), "first frame at from");
step(1050); // t=.5
ok(frames.length === 2 && near(frames[1][1].x, 100 * easeOut(0.5)) && frames[1][1].x > 50, "mid frame eased (ease-out is ahead of linear)");
ok(!done, "not resolved early");
step(1200); // past end
await p;
ok(done && near(frames.at(-1)![1].x, 100) && near(frames.at(-1)![0].x, 0), "final frame exactly `to`, promise resolved");
ok(queue.length === 0, "no further rAF scheduled after completion");
console.log(`tween.check OK: ${checks} checks`);
