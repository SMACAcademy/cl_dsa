import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cameraZAt, WORLD_OBJECTS } from "./objects";
import type { ScenePalette, WorldScene } from "./scene";

/**
 * The 3D world behind the landing page. The camera flies through it as the page scrolls: any
 * element with `data-world-z` is a stop, and the camera reaches that depth when the element is
 * centred on screen.
 *
 * It is decoration, so it is hidden from assistive technology, and without WebGL it steps aside
 * and leaves a still gradient. Page content goes above it with `relative z-10`.
 */
export function AlgoWorld() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<(HTMLElement | null)[]>([]);
  const [failed, setFailed] = useState(() => !hasWebGL());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || failed) return;
    const still = prefersStillness();
    let scene: WorldScene | null = null;
    let raf = 0;
    let stops: { at: number; z: number }[] = [];
    let cancelled = false;

    const measure = () => {
      stops = Array.from(document.querySelectorAll<HTMLElement>("[data-world-z]")).map((el) => {
        const rect = el.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        return {
          at: Math.max(0, top + rect.height / 2 - window.innerHeight / 2),
          z: Number(el.dataset.worldZ),
        };
      });
      scene?.resize(window.innerWidth, window.innerHeight);
    };

    const draw = (time: number) => {
      if (!scene) return;
      scene.setCameraZ(cameraZAt(window.scrollY, stops));
      scene.frame(time);
      scene.placeLabels(labelRefs.current);
    };

    const loop = (time: number) => {
      raf = requestAnimationFrame(loop);
      if (!document.hidden) draw(time);
    };

    // With reduced motion nothing moves on its own: redraw only when the page does.
    let settle = 0;
    const redraw = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(() => draw(performance.now()), 60);
    };
    const onResize = () => {
      measure();
      if (still) redraw();
    };
    const onPointer = (event: PointerEvent) => {
      scene?.setPointer(
        (event.clientX / window.innerWidth) * 2 - 1,
        -((event.clientY / window.innerHeight) * 2 - 1),
      );
    };

    import("./scene")
      .then(({ createWorldScene }) => {
        if (cancelled) return;
        scene = createWorldScene(canvas, { palette: readPalette(canvas), still });
        measure();
        setReady(true);
        if (still) draw(performance.now());
        else raf = requestAnimationFrame(loop);
      })
      .catch(() => setFailed(true));

    window.addEventListener("resize", onResize);
    if (still) window.addEventListener("scroll", redraw, { passive: true });
    else window.addEventListener("pointermove", onPointer, { passive: true });
    // Layout shifts (fonts arriving, sections growing) move the stops.
    const observer = new ResizeObserver(() => measure());
    observer.observe(document.body);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", redraw);
      window.removeEventListener("pointermove", onPointer);
      observer.disconnect();
      scene?.dispose();
    };
  }, [failed]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* The still backdrop: all there is without WebGL, and what shows while the scene loads. */}
      <div className="lw-backdrop absolute inset-0" />
      {!failed && (
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
        />
      )}
      {!failed &&
        WORLD_OBJECTS.map((o, i) => (
          <span
            key={o.kind}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            className="glass absolute top-0 left-0 rounded-2xl px-3 py-1.5 whitespace-nowrap will-change-transform"
            style={{ opacity: 0, visibility: "hidden" }}
          >
            <span
              className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.16em] uppercase"
              style={{ color: `var(--lw-${o.zone})` }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: `var(--lw-${o.zone})` }}
              />
              {t(`landing.zones.${o.zone}.name`)}
            </span>
            <span className="block text-sm font-bold text-[var(--lw-text)]">{o.title}</span>
            <span className="hidden text-xs text-[var(--lw-muted)] sm:block">{o.caption}</span>
          </span>
        ))}
    </div>
  );
}

function hasWebGL(): boolean {
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    // Give the probe's context straight back; browsers allow only a few at once.
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

function prefersStillness(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readPalette(from: Element): ScenePalette {
  const css = getComputedStyle(from);
  const get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    structures: get("--lw-structures", "#a78bfa"),
    algorithms: get("--lw-algorithms", "#38bdf8"),
    systems: get("--lw-systems", "#34d399"),
    ai: get("--lw-ai", "#fbbf24"),
    ink: get("--lw-text", "#e2e8f0"),
    muted: get("--lw-muted", "#94a3b8"),
    bg: get("--lw-bg", "#070b17"),
  };
}
