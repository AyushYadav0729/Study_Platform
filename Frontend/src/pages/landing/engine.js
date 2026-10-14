import { createContext, useContext, useEffect, useLayoutEffect, useRef } from "react";
import Lenis from "lenis";

// One requestAnimationFrame loop for the whole landing page. Lenis smooths
// the native scroll (so position: sticky keeps working), and every animated
// piece subscribes here instead of running its own loop.
export function createEngine() {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    time: 0,
    dt: 1 / 60,
    scrollY: 0,
    velocity: 0,
    vw: typeof window !== "undefined" ? window.innerWidth : 1280,
    vh: typeof window !== "undefined" ? window.innerHeight : 800,
    reduced,
  };

  let subs = [];
  const resizeSubs = new Set();
  let lenis = null;
  let raf = 0;
  let last = 0;
  let locked = false;

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const t = now / 1000;
    state.dt = last ? Math.min(0.05, t - last) : 1 / 60;
    last = t;
    state.time = t;
    if (lenis) lenis.raf(now);
    state.scrollY = window.scrollY;
    state.velocity = lenis ? lenis.velocity : 0;
    for (let i = 0; i < subs.length; i++) subs[i].fn(state);
  };

  let lastW = state.vw;
  let lastH = state.vh;
  const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === lastW && h === lastH) return;
    // On phones, ignore the small height jumps from the address bar.
    if (touch && w === lastW && Math.abs(h - lastH) < 120) return;
    lastW = w;
    lastH = h;
    state.vw = w;
    state.vh = h;
    resizeSubs.forEach((fn) => fn(state));
  };

  return {
    state,
    subscribe(fn, order = 0) {
      const entry = { fn, order };
      subs = [...subs, entry].sort((a, b) => a.order - b.order);
      return () => {
        subs = subs.filter((s) => s !== entry);
      };
    },
    onResize(fn) {
      resizeSubs.add(fn);
      return () => resizeSubs.delete(fn);
    },
    start() {
      if (!reduced) {
        lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.9 });
        if (locked) lenis.stop();
      }
      window.addEventListener("resize", onResize);
      raf = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      if (lenis) lenis.destroy();
      lenis = null;
      document.documentElement.style.overflow = "";
    },
    lock() {
      locked = true;
      document.documentElement.style.overflow = "hidden";
      if (lenis) lenis.stop();
    },
    unlock() {
      locked = false;
      document.documentElement.style.overflow = "";
      if (lenis) lenis.start();
    },
    scrollTo(y, duration = 1.6) {
      if (lenis) {
        lenis.scrollTo(y, { duration, easing: (x) => 1 - Math.pow(1 - x, 4) });
      } else {
        window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
      }
    },
  };
}

export const EngineContext = createContext(null);

export function useEngine() {
  return useContext(EngineContext);
}

// Run `fn(state)` every frame. The latest closure is always used, so callers
// can read fresh props without re-subscribing.
export function useFrame(fn, order = 0) {
  const engine = useEngine();
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    if (!engine) return undefined;
    return engine.subscribe((s) => ref.current(s), order);
  }, [engine, order]);
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
