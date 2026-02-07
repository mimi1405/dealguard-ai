"use client";

import { useRef, useEffect } from "react";

const GLYPHS = "{}[]()<>=;:+-/*._~&|^%#@!?$".split("").concat(["=>", "::", ".."]);

const FADE_ALPHA = 0.06;
const EMIT_SPACING = 14;
const GLYPH_SIZE_MIN = 11;
const GLYPH_SIZE_MAX = 17;
const SHADOW_BLUR = 10;
const SHADOW_ALPHA = 0.12;
const MIN_SPEED_SQ = 4;
const BG_COLOR = "rgba(11,13,16,";
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

    const frame = () => {
      ctx.fillStyle = `${BG_COLOR}${FADE_ALPHA})`;
      ctx.fillRect(0, 0, w, h);

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
            const alpha = 0.08 + Math.random() * 0.1;
            const rotation = (Math.random() - 0.5) * 0.5;

            ctx.save();
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
            ctx.globalAlpha = alpha * 0.4;
            ctx.filter = "blur(3px)";
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
