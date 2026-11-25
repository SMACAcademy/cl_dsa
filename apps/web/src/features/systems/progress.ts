/** Finished lessons, kept in this browser only (the public site has no database). */
const KEY = "algoverse.systems.done";

export function readDone(): Set<string> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function markDone(id: string): void {
  try {
    const done = readDone();
    if (done.has(id)) return;
    done.add(id);
    window.localStorage.setItem(KEY, JSON.stringify([...done]));
  } catch {
    // Private windows and blocked storage: progress just isn't remembered.
  }
}
