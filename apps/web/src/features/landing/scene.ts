import * as THREE from "three";
import {
  CAMERA_END_Z,
  CAMERA_START_Z,
  lateralScale,
  WORLD_OBJECTS,
  ZONE_START,
  type WorldObject,
  type WorldObjectKind,
} from "./objects";

/**
 * The AlgoVerse world, drawn with three.js. The landing page imports this module dynamically,
 * so three.js never weighs on the rest of the app. It is decoration: the page is complete
 * without it.
 */

export interface ScenePalette {
  structures: string;
  algorithms: string;
  systems: string;
  ai: string;
  ink: string;
  muted: string;
  bg: string;
}

export interface SceneOptions {
  palette: ScenePalette;
  /** Hold every object still; the camera still goes where it is told. */
  still: boolean;
}

export interface WorldScene {
  resize(width: number, height: number): void;
  /** Where the camera should be heading; it glides there unless `still`. */
  setCameraZ(z: number): void;
  /** Pointer position, −1..1 on each axis, for a little parallax. */
  setPointer(x: number, y: number): void;
  /** Advance and draw one frame. `time` is in milliseconds. */
  frame(time: number): void;
  /** Place one DOM label per object over its object, fading with distance. */
  placeLabels(labels: readonly (HTMLElement | null)[]): void;
  dispose(): void;
}

interface Built {
  group: THREE.Group;
  update?: (t: number) => void;
}

type Palette = Record<keyof ScenePalette, THREE.Color>;

const UP = new THREE.Vector3(0, 1, 0);
const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
const get = <T>(list: readonly T[], i: number): T => list[i] as T;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const frac = (x: number) => x - Math.floor(x);

/* ---------- small builders ---------- */

function solid(color: THREE.ColorRepresentation, glow = 0.25, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: glow,
    roughness: 0.35,
    metalness: 0.1,
    transparent: opacity < 1,
    opacity,
  });
}

function lineMaterial(color: THREE.ColorRepresentation, opacity = 1) {
  return new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
}

function sphere(radius: number, material: THREE.Material, at?: THREE.Vector3): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), material);
  if (at) mesh.position.copy(at);
  return mesh;
}

function cube(w: number, h: number, d: number, material: THREE.Material, at?: THREE.Vector3) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  if (at) mesh.position.copy(at);
  return mesh;
}

/** A rod from `a` to `b`: links, edges, branches. */
function rod(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, dir.length(), 10),
    material,
  );
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  return mesh;
}

function arrow(from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material) {
  const group = new THREE.Group();
  const dir = new THREE.Vector3().subVectors(to, from);
  const unit = dir.clone().normalize();
  const head = Math.min(0.22, dir.length() * 0.35);
  const neck = from.clone().addScaledVector(unit, dir.length() - head);
  group.add(rod(from, neck, radius, material));
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.8, head, 14), material);
  cone.position.copy(neck).addScaledVector(unit, head / 2);
  cone.quaternion.setFromUnitVectors(UP, unit);
  group.add(cone);
  return group;
}

function segments(pairs: THREE.Vector3[], material: THREE.LineBasicMaterial) {
  return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pairs), material);
}

/** Moves `mesh` a share `u` (0..1) of the way from `a` to `b`. */
function along(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, u: number) {
  mesh.position.lerpVectors(a, b, u);
}

/* ---------- data structures ---------- */

function array(p: Palette): Built {
  const group = new THREE.Group();
  const xs = range(8).map((i) => (i - 3.5) * 0.52);
  const mats = xs.map(() => solid(p.structures, 0.2));
  xs.forEach((x, i) => group.add(cube(0.42, 0.42, 0.42, get(mats, i), V(x, 0))));
  const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 14), solid(p.ink, 0.7));
  pointer.rotation.z = Math.PI;
  group.add(pointer);
  group.rotation.set(0.35, -0.4, 0);
  return {
    group,
    update: (t) => {
      const at = Math.floor(t * 1.3) % 8;
      mats.forEach((m, i) => (m.emissiveIntensity = i === at ? 0.85 : 0.2));
      pointer.position.set(get(xs, at), 0.55 + Math.abs(Math.sin(t * 4)) * 0.08, 0);
      group.rotation.y = -0.4 + Math.sin(t * 0.3) * 0.25;
    },
  };
}

function linkedList(p: Palette): Built {
  const group = new THREE.Group();
  const xs = [-1.65, -0.55, 0.55, 1.65];
  const node = solid(p.structures, 0.35);
  for (const x of xs) {
    group.add(sphere(0.24, node, V(x, 0)));
    group.add(cube(0.16, 0.16, 0.16, solid(p.ink, 0.3), V(x + 0.2, 0.22)));
  }
  const link = solid(p.ink, 0.4);
  for (let i = 0; i < xs.length - 1; i++) {
    group.add(arrow(V(get(xs, i) + 0.27, 0), V(get(xs, i + 1) - 0.27, 0), 0.025, link));
  }
  const walker = sphere(0.09, solid(p.ink, 0.9));
  group.add(walker);
  group.rotation.set(0.25, -0.35, 0);
  return {
    group,
    update: (t) => {
      const u = frac(t * 0.25);
      walker.position.set(-1.65 + u * 3.3, 0.38, 0);
      group.rotation.y = -0.35 + Math.sin(t * 0.35) * 0.35;
    },
  };
}

function tree(p: Palette): Built {
  const group = new THREE.Group();
  const levels = 4;
  const pos: THREE.Vector3[] = [];
  for (let level = 0; level < levels; level++) {
    const count = 2 ** level;
    for (let k = 0; k < count; k++) {
      const x = ((k + 0.5) / count - 0.5) * 3.4;
      pos.push(V(x, 1.2 - level * 0.8));
    }
  }
  const mats = pos.map(() => solid(p.structures, 0.25));
  const edge = solid(p.muted, 0.2, 0.7);
  pos.forEach((q, i) => {
    group.add(sphere(i === 0 ? 0.2 : 0.16, get(mats, i), q));
    if (i > 0) group.add(rod(get(pos, Math.floor((i - 1) / 2)), q, 0.02, edge));
  });
  group.rotation.x = 0.15;
  return {
    group,
    update: (t) => {
      // A search walks from the root to one leaf; a new leaf every two seconds.
      const leaf = 7 + (Math.floor(t / 2) % 8);
      const path = new Set<number>();
      for (let i = leaf; i > 0; i = Math.floor((i - 1) / 2)) path.add(i);
      path.add(0);
      const step = Math.floor(frac(t / 2) * 5);
      const depth = (i: number) => Math.floor(Math.log2(i + 1));
      mats.forEach((m, i) => (m.emissiveIntensity = path.has(i) && depth(i) <= step ? 0.9 : 0.2));
      group.rotation.y = Math.sin(t * 0.25) * 0.45;
    },
  };
}

function hashTable(p: Palette): Built {
  const group = new THREE.Group();
  const ys = range(5).map((i) => 1 - i * 0.5);
  const mats = ys.map(() => solid(p.structures, 0.2));
  ys.forEach((y, i) => group.add(cube(0.7, 0.34, 0.34, get(mats, i), V(-0.2, y))));
  const chain = [1, 0, 2, 1, 0];
  const item = solid(p.ink, 0.3);
  const edge = lineMaterial(p.muted, 0.7);
  ys.forEach((y, i) => {
    for (let k = 0; k < get(chain, i); k++) {
      const x = 0.55 + k * 0.45;
      group.add(sphere(0.12, item, V(x, y)));
      group.add(segments([V(x - 0.45 + (k === 0 ? 0.1 : 0.12), y), V(x - 0.12, y)], edge));
    }
  });
  const key = sphere(0.13, solid(p.ink, 0.9));
  group.add(key);
  group.rotation.set(0.1, 0.35, 0);
  return {
    group,
    update: (t) => {
      const bucket = Math.floor(t * 0.5) % 5;
      const u = frac(t * 0.5);
      along(key, V(-1.9, 1.5), V(-0.75, get(ys, bucket)), Math.min(1, u * 1.6));
      mats.forEach((m, i) => (m.emissiveIntensity = i === bucket && u > 0.6 ? 0.85 : 0.2));
      group.rotation.y = 0.35 + Math.sin(t * 0.3) * 0.3;
    },
  };
}

function stack(p: Palette): Built {
  const group = new THREE.Group();
  const plate = (glow: number) =>
    new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.2, 32), solid(p.structures, glow));
  range(4).forEach((i) => {
    const mesh = plate(0.2 + i * 0.08);
    mesh.position.y = -0.9 + i * 0.26;
    group.add(mesh);
  });
  const top = plate(0.7);
  group.add(top);
  // The open top: a thin ring above the pile.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.02, 8, 48), solid(p.ink, 0.4, 0.6));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.45;
  group.add(ring);
  group.rotation.x = 0.35;
  return {
    group,
    update: (t) => {
      // Push, pause, pop, pause: only the top ever moves.
      const u = frac(t / 4);
      const lift = u < 0.4 ? 1 - u / 0.4 : u < 0.5 ? 0 : u < 0.9 ? (u - 0.5) / 0.4 : 1;
      top.position.y = 0.14 + lift * 1.1;
      group.rotation.y = t * 0.2;
    },
  };
}

/* ---------- algorithms ---------- */

function sorting(p: Palette): Built {
  const group = new THREE.Group();
  const start = [5, 2, 8, 1, 6, 3, 7, 4];
  const bars = start.map((v) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), solid(p.algorithms, 0.25));
    mesh.scale.y = v * 0.28;
    mesh.position.y = (v * 0.28) / 2 - 1.1;
    group.add(mesh);
    return { mesh, value: v };
  });
  const slotX = (i: number) => (i - 3.5) * 0.42;
  let order = bars.map((_, i) => i);
  let done = 0;
  let compare = -1;
  const step = (n: number) => {
    // One bubble-sort comparison per step; when sorted, start again from the shuffle.
    const pass = n % 32;
    if (pass === 0) order = bars.map((_, i) => i);
    const j = pass % 7;
    compare = j;
    const a = get(bars, get(order, j));
    const b = get(bars, get(order, j + 1));
    if (pass < 28 && a.value > b.value) {
      const tmp = get(order, j);
      order[j] = get(order, j + 1);
      order[j + 1] = tmp;
    }
  };
  bars.forEach((b, i) => (b.mesh.position.x = slotX(i)));
  group.rotation.set(0.15, 0.3, 0);
  return {
    group,
    update: (t) => {
      const target = Math.floor(t / 0.55);
      if (target < done) {
        done = 0;
        order = bars.map((_, i) => i);
      }
      while (done < target) step(done++);
      order.forEach((bar, slot) => {
        const b = get(bars, bar);
        b.mesh.position.x += (slotX(slot) - b.mesh.position.x) * 0.15;
        const lit = slot === compare || slot === compare + 1;
        (b.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = lit ? 0.85 : 0.25;
      });
      group.rotation.y = 0.3 + Math.sin(t * 0.3) * 0.25;
    },
  };
}

function binarySearch(p: Palette): Built {
  const group = new THREE.Group();
  const n = 12;
  const xs = range(n).map((i) => (i - (n - 1) / 2) * 0.32);
  // Transparent from the start, so dimming a tile never needs a shader rebuild.
  const mats = xs.map(() => solid(p.algorithms, 0.25, 0.999));
  xs.forEach((x, i) =>
    group.add(cube(0.26, 0.5 + i * 0.05, 0.26, get(mats, i), V(x, -0.4 + i * 0.025))),
  );
  // The ranges a search for item 9 goes through.
  const ranges: [number, number][] = [
    [0, 11],
    [6, 11],
    [9, 11],
    [9, 9],
  ];
  const bracket = solid(p.ink, 0.6);
  const left = cube(0.04, 1.2, 0.04, bracket);
  const right = cube(0.04, 1.2, 0.04, bracket);
  group.add(left, right);
  group.rotation.set(0.3, -0.3, 0);
  return {
    group,
    update: (t) => {
      const phase = Math.floor(t / 1.2) % (ranges.length + 1);
      const [lo, hi] = get(ranges, Math.min(phase, ranges.length - 1));
      const mid = Math.floor((lo + hi) / 2);
      left.position.x += (get(xs, lo) - 0.18 - left.position.x) * 0.12;
      right.position.x += (get(xs, hi) + 0.18 - right.position.x) * 0.12;
      mats.forEach((m, i) => {
        const inside = i >= lo && i <= hi;
        m.opacity = inside ? 1 : 0.25;
        m.emissiveIntensity = i === mid ? 0.9 : 0.25;
      });
      group.rotation.y = -0.3 + Math.sin(t * 0.3) * 0.2;
    },
  };
}

function bfs(p: Palette): Built {
  const group = new THREE.Group();
  const pos = [
    V(0, 1.2, 0),
    V(-1, 0.4, 0.3),
    V(1, 0.4, -0.3),
    V(-1.6, -0.5, -0.2),
    V(-0.4, -0.5, 0.5),
    V(0.6, -0.4, 0.4),
    V(1.6, -0.5, -0.4),
    V(-1, -1.3, 0),
    V(1.1, -1.3, 0.2),
  ];
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 3],
    [1, 4],
    [2, 5],
    [2, 6],
    [4, 5],
    [3, 7],
    [5, 8],
    [6, 8],
  ];
  const level = pos.map(() => Infinity);
  level[0] = 0;
  for (let changed = true; changed;) {
    changed = false;
    for (const [a, b] of edges) {
      const best = Math.min(get(level, a), get(level, b));
      for (const i of [a, b]) {
        if (get(level, i) > best + 1) {
          level[i] = best + 1;
          changed = true;
        }
      }
    }
  }
  const mats = pos.map(() => solid(p.algorithms, 0.2));
  pos.forEach((q, i) => group.add(sphere(0.18, get(mats, i), q)));
  group.add(
    segments(
      edges.flatMap(([a, b]) => [get(pos, a), get(pos, b)]),
      lineMaterial(p.muted, 0.8),
    ),
  );
  const deepest = Math.max(...level);
  return {
    group,
    update: (t) => {
      const wave = (t * 0.9) % (deepest + 2.5);
      mats.forEach((m, i) => {
        const l = get(level, i);
        m.emissiveIntensity = l <= wave ? (wave - l < 1 ? 0.95 : 0.55) : 0.12;
      });
      group.rotation.y = Math.sin(t * 0.3) * 0.5;
    },
  };
}

function dpGrid(p: Palette): Built {
  const group = new THREE.Group();
  const n = 6;
  const cells = range(n * n).map((k) => {
    const i = Math.floor(k / n);
    const j = k % n;
    const mesh = cube(
      0.3,
      0.3,
      0.3,
      solid(p.algorithms, 0.15, 0.35),
      V((j - 2.5) * 0.38, (2.5 - i) * 0.38),
    );
    group.add(mesh);
    return { mesh, diagonal: i + j };
  });
  group.rotation.set(-0.45, 0.4, 0);
  return {
    group,
    update: (t) => {
      const filled = (t * 2.2) % (2 * n + 3);
      for (const c of cells) {
        const m = c.mesh.material as THREE.MeshStandardMaterial;
        const on = c.diagonal <= filled;
        m.opacity = on ? 1 : 0.3;
        m.emissiveIntensity = on ? (filled - c.diagonal < 1 ? 0.95 : 0.4) : 0.1;
        c.mesh.scale.z = on ? 1 + Math.min(1, filled - c.diagonal) * 0.8 : 1;
      }
      group.rotation.y = 0.4 + Math.sin(t * 0.3) * 0.25;
    },
  };
}

function recursion(p: Palette): Built {
  const group = new THREE.Group();
  const branch = (from: THREE.Vector3, angle: number, length: number, depth: number) => {
    const to = from.clone().add(V(Math.sin(angle) * length, Math.cos(angle) * length));
    const tint = p.algorithms.clone().lerp(p.ink, (5 - depth) / 6);
    group.add(rod(from, to, 0.012 + depth * 0.012, solid(tint, 0.4)));
    if (depth > 0) {
      branch(to, angle - 0.5, length * 0.72, depth - 1);
      branch(to, angle + 0.5, length * 0.72, depth - 1);
    } else {
      group.add(sphere(0.05, solid(p.ink, 0.8), to));
    }
  };
  branch(V(0, -1.4), 0, 0.9, 5);
  return { group, update: (t) => group.rotation.set(0, t * 0.25, Math.sin(t * 0.5) * 0.06) };
}

/* ---------- system design ---------- */

function loadBalancer(p: Palette): Built {
  const group = new THREE.Group();
  const lb = V(-0.6, 0, 0);
  const servers = range(4).map((i) => V(1.3, 1.05 - i * 0.7, 0));
  group.add(cube(0.5, 0.5, 0.5, solid(p.systems, 0.55), lb));
  const edge = solid(p.muted, 0.2, 0.6);
  for (const s of servers) {
    group.add(cube(0.55, 0.32, 0.4, solid(p.systems, 0.25), s));
    group.add(rod(lb, s, 0.015, edge));
  }
  const entry = V(-2.1, 0, 0);
  group.add(rod(entry, lb, 0.015, edge));
  const packets = range(4).map(() => sphere(0.07, solid(p.ink, 0.9)));
  const incoming = sphere(0.07, solid(p.ink, 0.9));
  group.add(...packets, incoming);
  group.rotation.set(0.2, -0.3, 0);
  return {
    group,
    update: (t) => {
      along(incoming, entry, lb, frac(t * 1.6));
      packets.forEach((pk, k) => along(pk, lb, get(servers, k), frac(t * 0.4 + k / 4)));
      group.rotation.y = -0.3 + Math.sin(t * 0.3) * 0.3;
    },
  };
}

function replicas(p: Palette): Built {
  const group = new THREE.Group();
  const db = (at: THREE.Vector3, glow: number) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.6, 28),
      solid(p.systems, glow),
    );
    mesh.position.copy(at);
    group.add(mesh);
    return mesh;
  };
  const leader = V(0, 0.9, 0);
  const followers = [V(-1.1, -0.6, 0.2), V(1.1, -0.6, -0.2)];
  db(leader, 0.6);
  followers.forEach((f) => db(f, 0.25));
  const edge = solid(p.muted, 0.2, 0.6);
  followers.forEach((f) => group.add(rod(leader, f, 0.015, edge)));
  const copies = followers.map(() => sphere(0.07, solid(p.ink, 0.9)));
  group.add(...copies);
  return {
    group,
    update: (t) => {
      copies.forEach((c, i) => along(c, leader, get(followers, i), frac(t * 0.5 + i * 0.35)));
      group.rotation.set(0.15, t * 0.22, 0);
    },
  };
}

function queue(p: Palette): Built {
  const group = new THREE.Group();
  group.add(cube(0.45, 0.45, 0.45, solid(p.systems, 0.3), V(-1.9, 0)));
  const belt = cube(3.1, 0.06, 0.5, solid(p.muted, 0.15, 0.7), V(0, -0.26));
  group.add(belt);
  const worker = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.09, 10, 6), solid(p.systems, 0.6));
  worker.position.set(1.9, 0.05, 0);
  group.add(worker);
  const jobs = range(6).map(() => cube(0.22, 0.22, 0.22, solid(p.ink, 0.5)));
  group.add(...jobs);
  group.rotation.set(0.35, -0.35, 0);
  return {
    group,
    update: (t) => {
      jobs.forEach((j, i) => {
        const u = frac(t * 0.18 + i / 6);
        j.position.set(-1.5 + u * 3, -0.08, 0);
        j.scale.setScalar(u > 0.92 ? (1 - u) / 0.08 : 1);
      });
      worker.rotation.z = t * 1.5;
      group.rotation.y = -0.35 + Math.sin(t * 0.3) * 0.3;
    },
  };
}

function hashRing(p: Palette): Built {
  const group = new THREE.Group();
  const R = 1.2;
  const onRing = (a: number) => V(Math.cos(a) * R, 0, Math.sin(a) * R);
  group.add(
    new THREE.Mesh(new THREE.TorusGeometry(R, 0.02, 8, 80), solid(p.muted, 0.3, 0.8)).rotateX(
      Math.PI / 2,
    ),
  );
  const servers = [0.3, 1.9, 3.4, 5].map((a) => ({ a, at: onRing(a) }));
  servers.forEach((s) => group.add(cube(0.26, 0.26, 0.26, solid(p.systems, 0.6), s.at)));
  const keys = range(10).map((k) => 0.15 + k * 0.62);
  const pairs: THREE.Vector3[] = [];
  for (const a of keys) {
    const at = onRing(a);
    group.add(sphere(0.06, solid(p.ink, 0.6), at));
    // Each key belongs to the next server clockwise.
    const owner = servers.find((s) => s.a >= a) ?? (servers[0] as { a: number; at: THREE.Vector3 });
    pairs.push(at, owner.at.clone().multiplyScalar(0.98));
  }
  group.add(segments(pairs, lineMaterial(p.systems, 0.35)));
  return { group, update: (t) => group.rotation.set(0.9, t * 0.25, 0) };
}

function cdn(p: Palette): Built {
  const group = new THREE.Group();
  group.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 18, 12),
      new THREE.MeshBasicMaterial({
        color: p.systems,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      }),
    ),
  );
  const origin = sphere(0.14, solid(p.ink, 0.8), V(0, 1.05, 0));
  group.add(origin);
  const edges = [
    [0.6, 0.4],
    [2.1, -0.2],
    [3.6, 0.5],
    [4.8, -0.5],
    [1.3, -0.9],
    [5.6, 0.1],
  ].map(([lon, lat]) => {
    const a = lon as number;
    const b = lat as number;
    const at = V(
      Math.cos(a) * Math.cos(b) * 1.05,
      Math.sin(b) * 1.05,
      Math.sin(a) * Math.cos(b) * 1.05,
    );
    const mesh = sphere(0.09, solid(p.systems, 0.7), at);
    group.add(mesh);
    return mesh;
  });
  return {
    group,
    update: (t) => {
      edges.forEach((e, i) => e.scale.setScalar(1 + 0.35 * Math.max(0, Math.sin(t * 2 + i))));
      group.rotation.set(0.2, t * 0.2, 0);
    },
  };
}

/* ---------- AI and integration ---------- */

function neural(p: Palette): Built {
  const group = new THREE.Group();
  const layers = [3, 5, 5, 2];
  const nodes = layers.map((count, l) =>
    range(count).map((k) => V((l - 1.5) * 1.1, ((count - 1) / 2 - k) * 0.5, 0)),
  );
  const mats = layers.map(() => solid(p.ai, 0.25));
  nodes.forEach((layer, l) => layer.forEach((q) => group.add(sphere(0.13, get(mats, l), q))));
  const pairs: THREE.Vector3[] = [];
  for (let l = 0; l < layers.length - 1; l++) {
    for (const a of get(nodes, l)) for (const b of get(nodes, l + 1)) pairs.push(a, b);
  }
  group.add(segments(pairs, lineMaterial(p.ai, 0.25)));
  return {
    group,
    update: (t) => {
      const live = Math.floor(t * 1.6) % layers.length;
      mats.forEach((m, l) => (m.emissiveIntensity = l === live ? 0.95 : 0.25));
      group.rotation.y = Math.sin(t * 0.3) * 0.6;
    },
  };
}

function vectors(p: Palette): Built {
  const group = new THREE.Group();
  const axis = lineMaterial(p.muted, 0.6);
  group.add(
    segments(
      [
        V(-1.2, -1, -1),
        V(1.3, -1, -1),
        V(-1.2, -1, -1),
        V(-1.2, 1.3, -1),
        V(-1.2, -1, -1),
        V(-1.2, -1, 1.3),
      ],
      axis,
    ),
  );
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const centres = [V(-0.5, 0.5, 0.2), V(0.7, -0.2, -0.3), V(0, -0.5, 0.7)];
  const points = centres.flatMap((c) =>
    range(14).map(() =>
      c.clone().add(V((rand() - 0.5) * 0.7, (rand() - 0.5) * 0.7, (rand() - 0.5) * 0.7)),
    ),
  );
  const dot = solid(p.ai, 0.45);
  points.forEach((q) => group.add(sphere(0.045, dot, q)));
  const query = sphere(0.09, solid(p.ink, 0.9));
  group.add(query);
  const near = new THREE.BufferGeometry().setFromPoints(range(6).map(() => V(0, 0, 0)));
  group.add(new THREE.LineSegments(near, lineMaterial(p.ink, 0.7)));
  return {
    group,
    update: (t) => {
      query.position.set(
        Math.cos(t * 0.4) * 0.8,
        Math.sin(t * 0.55) * 0.6,
        Math.sin(t * 0.4) * 0.6,
      );
      const nearest = [...points]
        .sort((a, b) => a.distanceToSquared(query.position) - b.distanceToSquared(query.position))
        .slice(0, 3);
      near.setFromPoints(nearest.flatMap((q) => [query.position.clone(), q]));
      group.rotation.y = t * 0.15;
    },
  };
}

function agentLoop(p: Palette): Built {
  const group = new THREE.Group();
  const R = 1.1;
  group.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.025, 8, 80), solid(p.muted, 0.3, 0.8)));
  const stations = range(4).map((i) => {
    const a = Math.PI / 2 - (i * Math.PI) / 2;
    const mesh = sphere(0.17, solid(p.ai, 0.25), V(Math.cos(a) * R, Math.sin(a) * R));
    group.add(mesh);
    return { mesh, a };
  });
  group.add(sphere(0.26, solid(p.ai, 0.5), V(0, 0, 0)));
  const runner = sphere(0.08, solid(p.ink, 0.95));
  group.add(runner);
  return {
    group,
    update: (t) => {
      const a = Math.PI / 2 - t * 0.9;
      runner.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
      const current = Math.floor(frac((t * 0.9) / (Math.PI * 2)) * 4 + 0.5) % 4;
      stations.forEach(
        (s, i) =>
          ((s.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
            i === current ? 0.95 : 0.25),
      );
      group.rotation.set(0.25, Math.sin(t * 0.3) * 0.5, 0);
    },
  };
}

function mainframe(p: Palette): Built {
  const group = new THREE.Group();
  group.add(cube(0.95, 1.9, 0.7, solid(p.muted, 0.15), V(-0.6, 0)));
  const lights = range(12).map((k) => {
    const mesh = cube(
      0.12,
      0.06,
      0.02,
      solid(p.ai, 0.3),
      V(-0.85 + (k % 3) * 0.25, 0.7 - Math.floor(k / 3) * 0.35, 0.36),
    );
    group.add(mesh);
    return mesh;
  });
  const api = V(1.1, 0, 0);
  group.add(cube(0.45, 0.45, 0.45, solid(p.ai, 0.55), api));
  group.add(rod(V(-0.12, 0), api, 0.02, solid(p.muted, 0.2, 0.7)));
  const packet = sphere(0.07, solid(p.ink, 0.9));
  group.add(packet);
  group.rotation.set(0.1, -0.4, 0);
  return {
    group,
    update: (t) => {
      lights.forEach(
        (l, i) =>
          ((l.material as THREE.MeshStandardMaterial).emissiveIntensity =
            Math.sin(t * 3 + i * 1.7) > 0.3 ? 0.95 : 0.2),
      );
      const u = frac(t * 0.6);
      along(packet, api, V(-0.12, 0), u < 0.5 ? u * 2 : 2 - u * 2);
      group.rotation.y = -0.4 + Math.sin(t * 0.3) * 0.3;
    },
  };
}

function gateway(p: Palette): Built {
  const group = new THREE.Group();
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.08, 10, 40, Math.PI),
    solid(p.ai, 0.55),
  );
  arch.position.y = -0.45;
  arch.rotation.y = Math.PI / 2;
  group.add(arch);
  group.add(sphere(0.28, solid(p.ai, 0.4), V(1.7, 0, 0)));
  const from = V(-1.8, 0, 0);
  const to = V(1.4, 0, 0);
  const packets = range(4).map((i) => ({
    mesh: sphere(0.08, solid(p.ink, 0.9, 0.999)),
    blocked: i === 2,
  }));
  packets.forEach((pk) => group.add(pk.mesh));
  group.rotation.set(0.25, -0.5, 0);
  return {
    group,
    update: (t) => {
      packets.forEach((pk, i) => {
        const u = frac(t * 0.25 + i / 4);
        // One in four is stopped at the gate and fades out.
        const stop = 0.55;
        along(pk.mesh, from, to, pk.blocked ? Math.min(u, stop) : u);
        const m = pk.mesh.material as THREE.MeshStandardMaterial;
        m.opacity = pk.blocked && u > stop ? Math.max(0, 1 - (u - stop) * 4) : 1;
      });
      group.rotation.y = -0.5 + Math.sin(t * 0.3) * 0.3;
    },
  };
}

const BUILDERS: Record<WorldObjectKind, (p: Palette) => Built> = {
  array,
  linkedList,
  tree,
  hashTable,
  stack,
  sorting,
  binarySearch,
  bfs,
  dpGrid,
  recursion,
  loadBalancer,
  replicas,
  queue,
  hashRing,
  cdn,
  neural,
  vectors,
  agentLoop,
  mainframe,
  gateway,
};

/* ---------- the scene ---------- */

/** Specks of light through the whole flight, tinted by the zone they sit in. */
function dust(p: Palette): THREE.Points {
  const count = 1800;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const top = CAMERA_START_Z + 10;
  const span = top - (CAMERA_END_Z - 30);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < count; i++) {
    const z = top - rand() * span;
    positions.set([(rand() - 0.5) * 50, (rand() - 0.5) * 30, z], i * 3);
    const tint =
      z > ZONE_START.algorithms + 2
        ? p.structures
        : z > ZONE_START.systems + 2
          ? p.algorithms
          : z > ZONE_START.ai + 2
            ? p.systems
            : p.ai;
    const c = tint.clone().lerp(p.ink, rand() * 0.6);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createWorldScene(
  canvas: HTMLCanvasElement,
  { palette, still }: SceneOptions,
): WorldScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const p = Object.fromEntries(
    Object.entries(palette).map(([k, v]) => [k, new THREE.Color(v)]),
  ) as Palette;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(p.bg, 12, 38);
  scene.add(new THREE.HemisphereLight(0xffffff, p.bg, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(5, 8, 10);
  scene.add(sun);
  scene.add(dust(p));

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 0.3, CAMERA_START_Z);

  const objects = WORLD_OBJECTS.map((o: WorldObject) => {
    const built = BUILDERS[o.kind](p);
    built.group.position.set(...o.position);
    built.group.scale.setScalar(o.scale);
    scene.add(built.group);
    return { spec: o, ...built };
  });
  // A still picture shows each object at a telling moment rather than at t = 0.
  const STILL_TIME = 3.3;
  objects.forEach((o) => o.update?.(STILL_TIME));

  let targetZ = CAMERA_START_Z;
  let z = CAMERA_START_Z;
  const pointer = new THREE.Vector2();
  const eased = new THREE.Vector2();
  let last = 0;
  let width = 1;
  let height = 1;
  let lateral = 1;
  const anchor = new THREE.Vector3();

  function placeCamera() {
    const sway = Math.sin(z * 0.06) * 0.7 * lateral;
    camera.position.set(sway + eased.x * 0.6 * lateral, 0.3 + eased.y * 0.35, z);
    camera.lookAt(sway * 0.4, 0, z - 10);
  }

  return {
    resize(w, h) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Narrow screens see less sideways, so objects move in and the view widens a little.
      camera.fov = camera.aspect < 0.8 ? 68 : 55;
      camera.updateProjectionMatrix();
      lateral = lateralScale(camera.aspect);
      objects.forEach((o) => (o.group.position.x = o.spec.position[0] * lateral));
    },
    setCameraZ(next) {
      targetZ = next;
      if (still) z = next;
    },
    setPointer(x, y) {
      pointer.set(x, y);
    },
    frame(time) {
      const dt = last ? Math.min(0.1, (time - last) / 1000) : 0;
      last = time;
      if (!still) {
        z += (targetZ - z) * (1 - Math.exp(-dt * 4));
        eased.lerp(pointer, 1 - Math.exp(-dt * 3));
        const t = time / 1000;
        for (const o of objects) {
          // Only animate what is near enough to see.
          if (Math.abs(o.group.position.z - z) < 45) o.update?.(t);
        }
      }
      placeCamera();
      renderer.render(scene, camera);
    },
    placeLabels(labels) {
      objects.forEach((o, i) => {
        const el = labels[i];
        if (!el) return;
        const distance = z - o.group.position.z;
        const fade = smoothstep(2.5, 6, distance) * (1 - smoothstep(15, 24, distance));
        anchor.copy(o.group.position);
        anchor.y += 1.75 * o.spec.scale;
        anchor.project(camera);
        if (fade <= 0.01 || anchor.z > 1) {
          el.style.opacity = "0";
          el.style.visibility = "hidden";
          return;
        }
        const x = ((anchor.x + 1) / 2) * width;
        const y = ((1 - anchor.y) / 2) * height;
        const scale = Math.min(1.05, Math.max(0.75, 9 / distance));
        el.style.visibility = "visible";
        el.style.opacity = fade.toFixed(3);
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%) scale(${scale.toFixed(3)})`;
      });
    },
    dispose() {
      scene.traverse((item) => {
        const mesh = item as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
