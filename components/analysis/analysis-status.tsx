'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type AnalysisStatusProps = {
  progress?: number; // 0..1 optional
  className?: string;
};

const DEFAULT_MESSAGES = [
  'Analyzing documents',
  'Checking risk factors',
  'Computing signals',
  'Validating assumptions',
  'Finalizing analysis',
];

function pickMessageByProgress(progress: number) {
  if (progress < 0.25) return DEFAULT_MESSAGES[0];
  if (progress < 0.5) return DEFAULT_MESSAGES[1];
  if (progress < 0.75) return DEFAULT_MESSAGES[2];
  if (progress < 0.92) return DEFAULT_MESSAGES[3];
  return DEFAULT_MESSAGES[4];
}

export function AnalysisStatus({ progress, className }: AnalysisStatusProps) {
  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const controlled = typeof progress === 'number';

  const [activeMessage, setActiveMessage] = useState<string>(
    controlled ? pickMessageByProgress(progress!) : DEFAULT_MESSAGES[0]
  );
  const [typed, setTyped] = useState<string>(reducedMotion ? activeMessage : '');
  const [visible, setVisible] = useState(true);

  const timeouts = useRef<number[]>([]);
  const clearAll = () => {
    timeouts.current.forEach((t) => window.clearTimeout(t));
    timeouts.current = [];
  };

  // Update message either by progress or by timed rotation
  useEffect(() => {
    if (reducedMotion) return;

    clearAll();

    if (controlled) {
      setActiveMessage(pickMessageByProgress(progress!));
      return;
    }

    // timed rotation
    let i = 0;
    const rotate = () => {
      i = (i + 1) % DEFAULT_MESSAGES.length;
      setActiveMessage(DEFAULT_MESSAGES[i]);

      const t = window.setTimeout(rotate, 2200);
      timeouts.current.push(t);
    };

    const t0 = window.setTimeout(rotate, 2200);
    timeouts.current.push(t0);

    return clearAll;
  }, [controlled, progress, reducedMotion]);

  // Typewriter when activeMessage changes
  useEffect(() => {
    if (reducedMotion) {
      setTyped(activeMessage);
      return;
    }

    clearAll();
    setVisible(true);
    setTyped('');

    const baseMin = 25;
    const baseMax = 45;

    for (let i = 1; i <= activeMessage.length; i++) {
      const delay = i * (baseMin + Math.random() * (baseMax - baseMin));
      const t = window.setTimeout(() => {
        setTyped(activeMessage.slice(0, i));
      }, delay);
      timeouts.current.push(t);
    }

    // small idle then fade (only in timed mode)
    if (!controlled) {
      const doneDelay = activeMessage.length * 35 + 1200;
      const tFade = window.setTimeout(() => setVisible(false), doneDelay);
      timeouts.current.push(tFade);

      const tShow = window.setTimeout(() => setVisible(true), doneDelay + 250);
      timeouts.current.push(tShow);
    }

    return clearAll;
  }, [activeMessage, controlled, reducedMotion]);

  return (
    <div
      className={[
        'min-h-[16px] text-xs uppercase tracking-[0.12em] text-white/35',
        'transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
        className ?? '',
      ].join(' ')}
      aria-live="polite"
      aria-atomic="true"
    >
      {typed}
      {!reducedMotion && (
        <span className="inline-block w-[0.6ch] animate-pulse align-baseline">
          ▍
        </span>
      )}
    </div>
  );
}