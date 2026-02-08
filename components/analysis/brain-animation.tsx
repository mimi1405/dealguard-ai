'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createBrainScene, BrainScene } from './brain-scene';

interface BrainAnimationProps {
  particleCount?: number;
  progress?: number;
  className?: string;
}

export function BrainAnimation({
  particleCount = 20000,
  progress,
  className,
}: BrainAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BrainScene | null>(null);
  const internalProgressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  const isControlled = progress !== undefined;

  const animateInternalProgress = useCallback(() => {
    if (isControlled) return;

    const tick = () => {
      internalProgressRef.current += 0.0008;
      if (internalProgressRef.current > 1) {
        internalProgressRef.current = 0;
      }
      sceneRef.current?.setProgress(internalProgressRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [isControlled]);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setWebglSupported(false);
      return;
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const brainScene = createBrainScene(particleCount);
    sceneRef.current = brainScene;
    brainScene.setReducedMotion(reducedMotion);

    let cancelled = false;
    if (containerRef.current) {
      brainScene
        .mount(containerRef.current)
        .then(() => {
          if (!cancelled) animateInternalProgress();
        })
        .catch(() => {
          if (!cancelled) setWebglSupported(false);
        });
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      brainScene.setReducedMotion(e.matches);
    };
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      cancelled = true;
      motionQuery.removeEventListener('change', handleMotionChange);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      brainScene.unmount();
      sceneRef.current = null;
    };
  }, [particleCount, animateInternalProgress]);

  useEffect(() => {
    if (isControlled && sceneRef.current) {
      sceneRef.current.setProgress(progress);
    }
  }, [isControlled, progress]);

  if (!webglSupported) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#0b0d10] gap-4 ${className ?? ''}`}
      >
        <div className="relative flex items-center justify-center">
          <svg
            className="h-16 w-16 animate-spin"
            viewBox="0 0 64 64"
            fill="none"
            style={{ animationDuration: '3s' }}
          >
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="2"
            />
            <path
              d="M32 4 a28 28 0 0 1 28 28"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute h-2 w-2 rounded-full bg-white/20" />
        </div>
        <span className="text-xs tracking-widest text-white/30 uppercase">
          Analyzing
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full bg-[#0b0d10] ${className ?? ''}`}
    />
  );
}
