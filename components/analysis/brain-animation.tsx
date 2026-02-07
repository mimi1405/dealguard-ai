'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrainScene, BrainScene } from './brain-scene';

interface BrainAnimationProps {
  particleCount?: number;
  className?: string;
}

export function BrainAnimation({ particleCount = 20000, className }: BrainAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BrainScene | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setWebglSupported(false);
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const brainScene = createBrainScene(particleCount);
    sceneRef.current = brainScene;
    brainScene.setReducedMotion(reducedMotion);

    let cancelled = false;
    if (containerRef.current) {
      brainScene.mount(containerRef.current).catch(() => {
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
      brainScene.unmount();
      sceneRef.current = null;
    };
  }, [particleCount]);

  if (!webglSupported) {
    return (
      <div className={`flex items-center justify-center bg-[#0b0d10] ${className ?? ''}`}>
        <div className="relative flex items-center justify-center">
          <div className="h-32 w-32 rounded-full border border-white/10 animate-pulse" />
          <div className="absolute h-20 w-20 rounded-full border border-white/5 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
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
