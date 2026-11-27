import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CAMERA_END_Z,
  CAMERA_START_Z,
  cameraZAt,
  LANE,
  lateralScale,
  SPACING,
  WORLD_OBJECTS,
  ZONE_START,
  ZONES,
  zoneCameraZ,
} from "../src/features/landing/objects";
import { STORAGE_KEYS } from "../src/lib/progress";
import { renderRoute } from "./render";

describe("the landing world (data)", () => {
  it("has five objects per zone, each beside the path and inside its own stretch", () => {
    for (const zone of ZONES) {
      const own = WORLD_OBJECTS.filter((o) => o.zone === zone);
      expect(own, zone).toHaveLength(5);
      for (const o of own) {
        const [x, , z] = o.position;
        expect(Math.abs(x), o.kind).toBeGreaterThanOrEqual(LANE);
        expect(z, o.kind).toBeLessThanOrEqual(ZONE_START[zone]);
        expect(z, o.kind).toBeGreaterThan(ZONE_START[zone] - 5 * SPACING);
      }
    }
    expect(new Set(WORLD_OBJECTS.map((o) => o.kind)).size).toBe(WORLD_OBJECTS.length);
  });

  it("zones run one after another; the camera starts before and ends after them all", () => {
    const starts = ZONES.map((z) => ZONE_START[z]);
    expect(starts).toEqual([...starts].sort((a, b) => b - a));
    const zs = WORLD_OBJECTS.map((o) => o.position[2]);
    expect(CAMERA_START_Z).toBeGreaterThan(Math.max(...zs));
    expect(CAMERA_END_Z).toBeLessThan(Math.min(...zs));
  });

  it("the camera eases between stops and holds at the ends", () => {
    const stops = [
      { at: 0, z: 10 },
      { at: 100, z: 0 },
    ];
    expect(cameraZAt(-5, stops)).toBe(10);
    expect(cameraZAt(50, stops)).toBeCloseTo(5);
    expect(cameraZAt(25, stops)).toBeGreaterThan(7.5);
    expect(cameraZAt(500, stops)).toBe(0);
    expect(cameraZAt(10, [])).toBe(CAMERA_START_Z);
  });

  it("narrow screens pull objects in, but not all the way", () => {
    expect(lateralScale(2)).toBe(1);
    expect(lateralScale(0.7)).toBeCloseTo(0.5);
    expect(lateralScale(0.1)).toBe(0.42);
  });
});

describe("the landing page", () => {
  it("renders every section and link without WebGL", async () => {
    renderRoute("/");
    const h1 = await screen.findByRole("heading", { level: 1, name: /See algorithms come alive/ });
    expect(h1).toBeVisible();
    expect(document.querySelector("canvas")).toBeNull();

    for (const name of ["Data structures", "Algorithms", "System design", "AI and integration"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    expect(screen.getByRole("heading", { level: 2, name: "How it works" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Practise and prove it" })).toBeVisible();

    const nav = screen.getByRole("navigation", { name: "Landing" });
    expect(within(nav).getByRole("link", { name: "Open AlgoVerse" })).toHaveAttribute(
      "href",
      "/home",
    );
    expect(within(nav).getByRole("link", { name: "Algorithms" })).toHaveAttribute(
      "href",
      "#algorithms",
    );
    for (const start of screen.getAllByRole("link", { name: /Start learning/ })) {
      expect(start).toHaveAttribute("href", "/home");
    }
    expect(screen.getByRole("link", { name: /Open the Data Structure Lab/ })).toHaveAttribute(
      "href",
      "/structures",
    );
    expect(screen.getByRole("link", { name: /Try the Design Lab/ })).toHaveAttribute(
      "href",
      "/systems/lab",
    );
    expect(screen.getByRole("link", { name: /Muthukumar Subramanian/ })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/muthu4all/",
    );
    await waitFor(() => expect(document.title).toBe("See algorithms come alive · AlgoVerse"));
  });

  it("puts one camera stop on each section, deeper as the page goes down", async () => {
    renderRoute("/");
    await screen.findByRole("heading", { level: 1 });
    const stops = Array.from(document.querySelectorAll<HTMLElement>("[data-world-z]")).map((el) =>
      Number(el.dataset.worldZ),
    );
    expect(stops).toHaveLength(8);
    expect(stops[0]).toBe(CAMERA_START_Z);
    expect(stops.slice(1, 5)).toEqual(ZONES.map(zoneCameraZ));
    expect(stops.at(-1)).toBe(CAMERA_END_Z);
    for (let i = 1; i < stops.length; i++) {
      expect(stops[i] as number).toBeLessThan(stops[i - 1] as number);
    }
  });

  it("offers to continue when this browser has been here before", async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.last,
      JSON.stringify({ path: "/algorithms/binary-search", title: "Binary search" }),
    );
    renderRoute("/");
    const links = await screen.findAllByRole("link", { name: /Continue learning/ });
    for (const l of links) expect(l).toHaveAttribute("href", "/algorithms/binary-search");
  });
});
