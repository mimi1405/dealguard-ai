"use client";

import { useRef, useEffect } from "react";

const BG_COLOR = "#0b0d10";
const IDLE_THRESHOLD_MS = 160;
const IDLE_LIFE_MULTIPLIER = 0.7;

const CLUSTER_SMOOTH = 0.12;

const EMIT_RADIUS_MIN = 18;
const EMIT_RADIUS_MAX = 38;

const EMIT_COUNT_MIN = 6;
const EMIT_COUNT_MAX = 14;

const MAX_PARTICLES = 220;

const LIFE_MIN = 900;
const LIFE_MAX = 1400;

const BASE_ALPHA_MIN = 0.11;
const BASE_ALPHA_MAX = 0.22;

const PULL_PHASE = 0.28;
const PULL_STRENGTH = 0.020;

const SWIRL_MIN = 0.002;
const SWIRL_MAX = 0.006;

const DRIFT_DAMPING = 0.972;

const GLOW_BLUR_MIN = 10;
const GLOW_BLUR_MAX = 14;
const GLOW_ALPHA = 0.10;

const FONT =
  "'SF Mono','Fira Code','Cascadia Code','JetBrains Mono',ui-monospace,monospace";

// “Codex-ish” glyphs
const GLYPHS = [
  "-", "—", "·", "•", "o", "0", ":", ";", ".", ",",
  ">", "<", "=", "+", "*", "/", "\\", "_",
  "=>", "->", "<-", "::", "..", "++", "--", "||", "&&",
] as const;

const FONT_SIZE_MIN = 11;
const FONT_SIZE_MAX = 17;

const MIN_EMIT_DIST_SQ = 9;

// Optional “digital” feel: set to 0 to disable
const QUANTIZE = 6; // pixels

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;

  bornAt: number;
  lifeMs: number;
  baseAlpha: number;

  cx: number;
  cy: number;
  swirl: number;

  glyph: string;
  fontSize: number;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function pick<T>(arr: readonly T[]) {
  return arr[(Math.random() * arr.length) | 0];
}

export function CodexTrailBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;

    const cursorRaw = { x: -9999, y: -9999 };
    const cluster = { x: -9999, y: -9999 };
    let hasMoved = false;

    let lastMoveTime = 0;
    let idleShrunk = false;

    const particles: Particle[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = parent.clientWidth;
      h = parent.clientHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.filter = "none";
      ctx.shadowBlur = 0;
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, w, h);
    };

    resize();
    window.addEventListener("resize", resize);

    let prevX = -9999;
    let prevY = -9999;

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (!hasMoved) {
        cluster.x = x;
        cluster.y = y;
        hasMoved = true;
        prevX = x;
        prevY = y;
      } else {
        prevX = cursorRaw.x;
        prevY = cursorRaw.y;
      }

      cursorRaw.x = x;
      cursorRaw.y = y;
      lastMoveTime = performance.now();
      idleShrunk = false;
    };

    const onPointerLeave = () => {
      cursorRaw.x = -9999;
      cursorRaw.y = -9999;
      hasMoved = false;
      prevX = -9999;
      prevY = -9999;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);

    const emit = (cx: number, cy: number, now: number, count: number) => {
      const budget = MAX_PARTICLES - particles.length;
      const n = Math.min(count, budget);
      for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = rand(EMIT_RADIUS_MIN, EMIT_RADIUS_MAX);
        const glyph = pick(GLYPHS);
        const fontSize = rand(FONT_SIZE_MIN, FONT_SIZE_MAX);

        particles.push({
          x: cx + Math.cos(angle) * r * Math.random(),
          y: cy + Math.sin(angle) * r * Math.random(),
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,

          // Keep rotation subtle; Codex feels “typed”, not confetti
          rot: (Math.random() - 0.5) * 0.35,

          bornAt: now,
          lifeMs: rand(LIFE_MIN, LIFE_MAX),
          baseAlpha: rand(BASE_ALPHA_MIN, BASE_ALPHA_MAX),

          cx,
          cy,
          swirl: rand(SWIRL_MIN, SWIRL_MAX),

          glyph,
          fontSize,
        });
      }
    };

    const quantize = (v: number) =>
      QUANTIZE > 0 ? Math.round(v / QUANTIZE) * QUANTIZE : v;

    const frame = () => {
      const now = performance.now();
      const idleMs = now - lastMoveTime;
      const isIdle = idleMs > IDLE_THRESHOLD_MS;

      // Clear fully each frame (TTL particle system, no “ink overlay”)
      ctx.globalAlpha = 1;
      ctx.filter = "none";
      ctx.shadowBlur = 0;
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, w, h);

      // Move cluster center + emit burst (cluster, not line)
      if (!isIdle && cursorRaw.x > -1000 && hasMoved) {
        cluster.x += (cursorRaw.x - cluster.x) * CLUSTER_SMOOTH;
        cluster.y += (cursorRaw.y - cluster.y) * CLUSTER_SMOOTH;

        const dx = cursorRaw.x - prevX;
        const dy = cursorRaw.y - prevY;
        const distSq = dx * dx + dy * dy;

        if (distSq > MIN_EMIT_DIST_SQ) {
          const speed = Math.sqrt(distSq);
          const count = Math.round(
            EMIT_COUNT_MIN +
              (EMIT_COUNT_MAX - EMIT_COUNT_MIN) * Math.min(speed / 60, 1)
          );
          emit(cluster.x, cluster.y, now, count);
        }
      }

      // Idle cleanup: shorten remaining life once when going idle
      if (isIdle && !idleShrunk && particles.length > 0) {
        idleShrunk = true;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const age = now - p.bornAt;
          const remaining = p.lifeMs - age;
          if (remaining > 0) {
            p.lifeMs = age + remaining * IDLE_LIFE_MULTIPLIER;
          }
        }
      }

      // Update/draw alive particles
      let alive = 0;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const age = now - p.bornAt;
        if (age >= p.lifeMs) continue;

        const t = age / p.lifeMs;
        const alpha = p.baseAlpha * Math.pow(1 - t, 2.2);
        if (alpha < 0.003) continue;

        // Dynamics: inward pull + swirl early, then dissolve drift
        if (t < PULL_PHASE) {
          const pull = PULL_STRENGTH * (1 - t / PULL_PHASE);
          let ax = (p.cx - p.x) * pull;
          let ay = (p.cy - p.y) * pull;

          // tangential swirl around center
          ax += -(p.cy - p.y) * p.swirl;
          ay += (p.cx - p.x) * p.swirl;

          p.vx += ax;
          p.vy += ay;
        } else {
          p.vx += (Math.random() - 0.5) * 0.08;
          p.vy += (Math.random() - 0.5) * 0.08;
        }

        p.vx *= DRIFT_DAMPING;
        p.vy *= DRIFT_DAMPING;
        p.x += p.vx;
        p.y += p.vy;

        const drawX = quantize(p.x);
        const drawY = quantize(p.y);

        // Render glyph (Codex-ish): sharp + subtle blurred pass
        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(p.rot);

        ctx.font = `${p.fontSize}px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Sharp pass
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = rand(GLOW_BLUR_MIN, GLOW_BLUR_MAX);
        ctx.shadowColor = `rgba(255,255,255,${GLOW_ALPHA})`;
        ctx.fillStyle = "rgba(255,255,255,1)";
        ctx.fillText(p.glyph, 0, 0);        

        ctx.restore();
        ctx.filter = "none";

        particles[alive] = p;
        alive++;
      }
      particles.length = alive;

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    const onMotionChange = () => {
      if (mql.matches) {
        cancelAnimationFrame(raf);
        ctx.globalAlpha = 1;
        ctx.filter = "none";
        ctx.shadowBlur = 0;
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, w, h);
      }
    };
    mql.addEventListener("change", onMotionChange);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      mql.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0, pointerEvents: "none" }}
    />
  );
}