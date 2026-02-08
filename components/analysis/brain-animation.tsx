'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createBrainScene, BrainScene } from './brain-scene';
import { AnalysisStatus } from './analysis-status';

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
      if (internalProgressRef.current > 1) internalProgressRef.current = 0;

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
    if (isControlled && sceneRef.current && typeof progress === 'number') {
      sceneRef.current.setProgress(progress);
    }
  }, [isControlled, progress]);



  return (
  <div className={`relative w-full h-full bg-[#0b0d10] ${className ?? ''}`}>
    {/* DAS ist das Mount-Ziel für WebGL */}
    <div ref={containerRef} className="absolute inset-0" />

    {/* Status Overlay */}
    <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
      <AnalysisStatus progress={progress} />
      {/* später hier: <AnalysisStatus progress={progress} /> */}
    </div>
  </div>
);
}
