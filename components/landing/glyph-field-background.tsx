"use client";

import { useRef, useEffect, useCallback } from "react";

const GLYPHS = [
  "{}",  "()",  "[]",  "<>",  ";",   "=>",  "//",  "&&",  "||",
  "const", "let", "function", "import", "export", "return",
  "async", "await", "dd.run()", "if", "else", "null", "true",
  "new", "class", "type", "interface", "::", "...", "===",
  "+=", "!=", "<<", ">>", "??", "?.","0x", "#",
];

interface Glyph {
  text: string;
  x: number;
  y: number;
  baseY: number;
  speed: number;
  size: number;
  alpha: number;
  layer: number;
  drift: number;
  driftPhase: number;
}

const LAYER_CONFIG = [
  { count: 40, sizeMin: 10, sizeMax: 13, speedMin: 0.08, speedMax: 0.2, alphaMin: 0.025, alphaMax: 0.05 },
  { count: 30, sizeMin: 13, sizeMax: 16, speedMin: 0.15, speedMax: 0.35, alphaMin: 0.035, alphaMax: 0.07 },
  { count: 18, sizeMin: 16, sizeMax: 20, speedMin: 0.25, speedMax: 0.5, alphaMin: 0.04, alphaMax: 0.08 },
];

const CURSOR_RADIUS = 220;
const CURSOR_EASE = 0.06;
const FOCUS_ALPHA_BOOST = 2.8;
const FONT_FAMILY = "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace";

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createGlyph(w: number, h: number, layer: number): Glyph {
  const cfg = LAYER_CONFIG[layer];
  const size = rand(cfg.sizeMin, cfg.sizeMax);
  return {
    text: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
    x: rand(0, w),
    y: rand(0, h),
    baseY: 0,
    speed: rand(cfg.speedMin, cfg.speedMax),
    size,
    alpha: rand(cfg.alphaMin, cfg.alphaMax),
    layer,
    drift: rand(0.15, 0.5),
    driftPhase: rand(0, Math.PI * 2),
  };
}

function buildGlyphs(w: number, h: number): Glyph[] {
  const glyphs: Glyph[] = [];
  for (let layer = 0; layer < LAYER_CONFIG.length; layer++) {
    const cfg = LAYER_CONFIG[layer];
    for (let i = 0; i < cfg.count; i++) {
      const g = createGlyph(w, h, layer);
      g.baseY = g.y;
      glyphs.push(g);
    }
  }
  return glyphs;
}

export function GlyphFieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glyphsRef = useRef<Glyph[]>([]);
  const cursorRef = useRef({ x: -9999, y: -9999 });
  const smoothCursorRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const sizeRef = useRef({ w: 0, h: 0 });

  const init = useCallback((w: number, h: number) => {
    glyphsRef.current = buildGlyphs(w, h);
    sizeRef.current = { w, h };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mql.matches;
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mql.addEventListener("change", onMotionChange);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      init(w, h);
    };

    resize();
    window.addEventListener("resize", resize);

    let lastPointerTime = 0;
    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastPointerTime < 12) return;
      lastPointerTime = now;
      const rect = canvas.getBoundingClientRect();
      cursorRef.current.x = e.clientX - rect.left;
      cursorRef.current.y = e.clientY - rect.top;
    };

    const onPointerLeave = () => {
      cursorRef.current.x = -9999;
      cursorRef.current.y = -9999;
    };

    const parentEl = canvas.parentElement!;
    parentEl.addEventListener("pointermove", onPointerMove);
    parentEl.addEventListener("pointerleave", onPointerLeave);

    const animate = () => {
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      const dt = 1;
      timeRef.current += 0.008;
      const time = timeRef.current;

      const smooth = smoothCursorRef.current;
      const target = cursorRef.current;
      const isReduced = reducedMotionRef.current;

      if (!isReduced) {
        smooth.x += (target.x - smooth.x) * CURSOR_EASE;
        smooth.y += (target.y - smooth.y) * CURSOR_EASE;
      }

      const cx = smooth.x;
      const cy = smooth.y;
      const cursorActive = !isReduced && cx > -1000;
      const rSq = CURSOR_RADIUS * CURSOR_RADIUS;

      const glyphs = glyphsRef.current;

      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      for (let i = 0; i < glyphs.length; i++) {
        const g = glyphs[i];

        if (!isReduced) {
          g.y -= g.speed * dt;
          g.x += Math.sin(time * g.drift + g.driftPhase) * 0.15;

          if (g.y < -30) {
            g.y = h + 30;
            g.x = rand(0, w);
            g.text = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
        }

        let drawAlpha = g.alpha;
        let blur = 1.5 + (2 - g.layer) * 0.8;

        if (cursorActive) {
          const dx = g.x - cx;
          const dy = g.y - cy;
          const distSq = dx * dx + dy * dy;

          if (distSq < rSq) {
            const dist = Math.sqrt(distSq);
            const t = 1 - dist / CURSOR_RADIUS;
            const eased = t * t * (3 - 2 * t);
            drawAlpha = g.alpha + eased * g.alpha * FOCUS_ALPHA_BOOST;
            blur = blur * (1 - eased * 0.85);
          }
        }

        ctx.save();
        ctx.font = `${g.size}px ${FONT_FAMILY}`;
        ctx.globalAlpha = Math.min(drawAlpha, 0.35);

        if (blur > 0.3) {
          ctx.filter = `blur(${blur.toFixed(1)}px)`;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillText(g.text, g.x, g.y);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      parentEl.removeEventListener("pointermove", onPointerMove);
      parentEl.removeEventListener("pointerleave", onPointerLeave);
      mql.removeEventListener("change", onMotionChange);
    };
  }, [init]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0, pointerEvents: "none" }}
    />
  );
}
