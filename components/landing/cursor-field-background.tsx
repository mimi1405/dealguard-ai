"use client";

import { useRef, useEffect, useCallback } from "react";

interface Dot {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  baseAlpha: number;
  alpha: number;
}

const GRID_SPACING = 28;
const DOT_RADIUS = 0.8;
const INFLUENCE_RADIUS = 180;
const INFLUENCE_STRENGTH = 0.12;
const DISPLACEMENT_STRENGTH = 8;
const EASE_SPEED = 0.04;
const CURSOR_EASE = 0.08;
const BASE_ALPHA_MIN = 0.04;
const BASE_ALPHA_MAX = 0.12;

export function CursorFieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const cursorRef = useRef({ x: -9999, y: -9999 });
  const smoothCursorRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);
  const reducedMotionRef = useRef(false);

  const buildGrid = useCallback((width: number, height: number) => {
    const dots: Dot[] = [];
    const cols = Math.ceil(width / GRID_SPACING) + 1;
    const rows = Math.ceil(height / GRID_SPACING) + 1;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * GRID_SPACING;
        const y = row * GRID_SPACING;
        const baseAlpha =
          BASE_ALPHA_MIN +
          Math.random() * (BASE_ALPHA_MAX - BASE_ALPHA_MIN);
        dots.push({ baseX: x, baseY: y, x, y, baseAlpha, alpha: baseAlpha });
      }
    }
    dotsRef.current = dots;
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
      buildGrid(w, h);
    };

    resize();
    window.addEventListener("resize", resize);

    let lastPointerTime = 0;
    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastPointerTime < 16) return;
      lastPointerTime = now;

      const rect = canvas.getBoundingClientRect();
      cursorRef.current.x = e.clientX - rect.left;
      cursorRef.current.y = e.clientY - rect.top;
    };

    const onPointerLeave = () => {
      cursorRef.current.x = -9999;
      cursorRef.current.y = -9999;
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);

    const animate = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);

      const smooth = smoothCursorRef.current;
      const target = cursorRef.current;

      if (!reducedMotionRef.current) {
        smooth.x += (target.x - smooth.x) * CURSOR_EASE;
        smooth.y += (target.y - smooth.y) * CURSOR_EASE;
      }

      const cx = smooth.x;
      const cy = smooth.y;
      const rSq = INFLUENCE_RADIUS * INFLUENCE_RADIUS;
      const isActive = !reducedMotionRef.current && cx > -1000;

      const dots = dotsRef.current;
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        if (isActive) {
          const dx = dot.baseX - cx;
          const dy = dot.baseY - cy;
          const distSq = dx * dx + dy * dy;

          if (distSq < rSq) {
            const dist = Math.sqrt(distSq);
            const t = 1 - dist / INFLUENCE_RADIUS;
            const eased = t * t * (3 - 2 * t);

            const targetAlpha = dot.baseAlpha + eased * INFLUENCE_STRENGTH;
            dot.alpha += (targetAlpha - dot.alpha) * 0.1;

            const pushX = dist > 0 ? (dx / dist) * eased * DISPLACEMENT_STRENGTH : 0;
            const pushY = dist > 0 ? (dy / dist) * eased * DISPLACEMENT_STRENGTH : 0;
            dot.x += (dot.baseX + pushX - dot.x) * 0.08;
            dot.y += (dot.baseY + pushY - dot.y) * 0.08;
          } else {
            dot.alpha += (dot.baseAlpha - dot.alpha) * EASE_SPEED;
            dot.x += (dot.baseX - dot.x) * EASE_SPEED;
            dot.y += (dot.baseY - dot.y) * EASE_SPEED;
          }
        } else {
          dot.alpha += (dot.baseAlpha - dot.alpha) * EASE_SPEED;
          dot.x += (dot.baseX - dot.x) * EASE_SPEED;
          dot.y += (dot.baseY - dot.y) * EASE_SPEED;
        }

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${dot.alpha})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      mql.removeEventListener("change", onMotionChange);
    };
  }, [buildGrid]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto"
      style={{ zIndex: 0 }}
    />
  );
}
