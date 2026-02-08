'use client';

import { useEffect, useState, useRef } from 'react';

interface AnalysisStatusProps {
  progress?: number;
  className?: string;
}

const STATUS_MESSAGES = [
  'Analyzing documents',
  'Checking risk factors',
  'Computing signals',
  'Validating assumptions',
  'Finalizing analysis',
] as const;

const getMessageFromProgress = (progress: number): string => {
  if (progress < 0.25) return STATUS_MESSAGES[0];
  if (progress < 0.5) return STATUS_MESSAGES[1];
  if (progress < 0.75) return STATUS_MESSAGES[2];
  if (progress < 0.92) return STATUS_MESSAGES[3];
  return STATUS_MESSAGES[4];
};

export function AnalysisStatus({ progress, className }: AnalysisStatusProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const messageIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    motionQuery.addEventListener('change', handleMotionChange);
    return () => motionQuery.removeEventListener('change', handleMotionChange);
  }, []);

  useEffect(() => {
    const isProgressMode = progress !== undefined;

    const startNewMessage = (message: string) => {
      if (currentMessage === message) return;

      if (process.env.NODE_ENV === 'development') {
        console.debug('[AnalysisStatus] Message changed:', message);
      }

      setCurrentMessage(message);
      charIndexRef.current = 0;
      setDisplayText('');
      setIsVisible(true);

      if (reducedMotion) {
        setDisplayText(message);
        return;
      }

      const typewriterDelay = Math.floor(Math.random() * 20) + 25;

      const typeNextChar = () => {
        if (charIndexRef.current < message.length) {
          setDisplayText(message.slice(0, charIndexRef.current + 1));
          charIndexRef.current++;
          timeoutRef.current = setTimeout(typeNextChar, typewriterDelay);
        } else {
          timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
            timeoutRef.current = setTimeout(() => {
              if (!isProgressMode) {
                messageIndexRef.current = (messageIndexRef.current + 1) % STATUS_MESSAGES.length;
                startNewMessage(STATUS_MESSAGES[messageIndexRef.current]);
              }
            }, 300);
          }, 900);
        }
      };

      typeNextChar();
    };

    if (isProgressMode) {
      const message = getMessageFromProgress(progress);
      startNewMessage(message);
    } else {
      startNewMessage(STATUS_MESSAGES[messageIndexRef.current]);

      if (!reducedMotion) {
        intervalRef.current = setInterval(() => {
          messageIndexRef.current = (messageIndexRef.current + 1) % STATUS_MESSAGES.length;
        }, 2200);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [progress, reducedMotion, currentMessage]);

  return (
    <div
      className={`flex items-center justify-center min-h-[1.5rem] ${className ?? ''}`}
      role="status"
      aria-live="polite"
    >
      <p
        className={`text-xs tracking-[0.12em] text-muted-foreground transition-opacity duration-300 ${
          isVisible ? 'opacity-75' : 'opacity-0'
        }`}
      >
        {displayText}
      </p>
    </div>
  );
}
