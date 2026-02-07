"use client";

import { useRef, useEffect } from "react";

const GLYPHS = "{}[]()<>=;:+-/*._~&|^%#@!?$".split("").concat(["=>", "::", ".."]);

const FADE_ALPHA_ACTIVE = 0.14;
const FADE_ALPHA_IDLE = 0.28;
const IDLE_THRESHOLD_MS = 140;
const IDLE_CLEAN_MS = 2000;
const EMIT_SPACING = 14;
const GLYPH_SIZE_MIN = 11;
const GLYPH_SIZE_MAX = 17;
const SHADOW_BLUR = 10;
const SHADOW_ALPHA = 0.12;
const MIN_SPEED_SQ = 4;
const BG_COLOR = "#0b0d10";
const FONT = "'SF Mono','Fira Code','Cascadia Code','JetBrains Mono',monospace";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
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

    const cursor = { x: -9999, y: -9999 };
    const prev = { x: -9999, y: -9999 };
    let hasMoved = false;
    let lastMoveTime = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      dpr = window.devicePixelRatio || 1;
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0b0d10";
      ctx.fillRect(0, 0, w, h);
    };

    resize();
    window.addEventListener("resize", resize);

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (!hasMoved) {
        prev.x = x;
        prev.y = y;
        hasMoved = true;
      } else {
        prev.x = cursor.x;
        prev.y = cursor.y;
      }

      cursor.x = x;
      cursor.y = y;
      lastMoveTime = performance.now();
    };

    const onPointerLeave = () => {
      cursor.x = -9999;
      cursor.y = -9999;
      prev.x = -9999;
      prev.y = -9999;
      hasMoved = false;
    };

    const parentEl = canvas.parentElement!;
    parentEl.addEventListener("pointermove", onPointerMove);
    parentEl.addEventListener("pointerleave", onPointerLeave);

    let needsEmit = false;
    let debugMode = false;
    let frameCount = 0;
    let lastFpsTime = performance.now();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "d" || e.key === "D") {
        debugMode = !debugMode;
        if (debugMode) console.log("[CodexTrail] debug ON");
        else console.log("[CodexTrail] debug OFF");
      }
    };
    window.addEventListener("keydown", onKeyDown);

    const frame = () => {
      const now = performance.now();
      const idleMs = now - lastMoveTime;
      const isIdle = idleMs > IDLE_THRESHOLD_MS;
      const fadeAlpha = isIdle ? FADE_ALPHA_IDLE : FADE_ALPHA_ACTIVE;

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.filter = "none";
      if (idleMs > IDLE_CLEAN_MS) {
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = fadeAlpha;
      }
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      if (cursor.x > -1000 && prev.x > -1000) {
        const dx = cursor.x - prev.x;
        const dy = cursor.y - prev.y;
        const distSq = dx * dx + dy * dy;

        if (distSq > MIN_SPEED_SQ) {
          needsEmit = true;
          const dist = Math.sqrt(distSq);
          const steps = Math.max(1, Math.floor(dist / EMIT_SPACING));

          for (let i = 0; i < steps; i++) {
            const t = (i + 1) / steps;
            const gx = lerp(prev.x, cursor.x, t) + (Math.random() - 0.5) * 8;
            const gy = lerp(prev.y, cursor.y, t) + (Math.random() - 0.5) * 8;
            const size = GLYPH_SIZE_MIN + Math.random() * (GLYPH_SIZE_MAX - GLYPH_SIZE_MIN);
            const glyph = pick(GLYPHS);
            const alpha = 0.06 + Math.random() * 0.07;
            const rotation = (Math.random() - 0.5) * 0.5;

            ctx.save();
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1;
            ctx.filter = "none";
            ctx.translate(gx, gy);
            ctx.rotate(rotation);
            ctx.font = `${size}px ${FONT}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowBlur = SHADOW_BLUR;
            ctx.shadowColor = `rgba(255,255,255,${SHADOW_ALPHA})`;
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.fillText(glyph, 0, 0);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = alpha * 0.22;
            ctx.filter = "blur(2px)";
            ctx.fillText(glyph, 0, 0);
            ctx.restore();
          }
        } else {
          needsEmit = false;
        }
      }

      if (needsEmit) {
        prev.x = cursor.x;
        prev.y = cursor.y;
      }

      if (debugMode) {
        frameCount++;
        if (now - lastFpsTime >= 1000) {
          console.log(`[CodexTrail] fps=${frameCount} fadeAlpha=${fadeAlpha.toFixed(3)} idle=${isIdle}`);
          frameCount = 0;
          lastFpsTime = now;
        }
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    const onMotionChange = () => {
      if (mql.matches) {
        cancelAnimationFrame(raf);
        ctx.fillStyle = "#0b0d10";
        ctx.fillRect(0, 0, w, h);
      }
    };
    mql.addEventListener("change", onMotionChange);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      parentEl.removeEventListener("pointermove", onPointerMove);
      parentEl.removeEventListener("pointerleave", onPointerLeave);
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
