'use client';

import { useCallback, useState } from 'react';

export function useAnalysisOverlay() {
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState<number | undefined>(undefined);

  const start = useCallback(() => {
    setShow(true);
    setProgress(undefined);
  }, []);

  const stop = useCallback(() => {
    setShow(false);
    setProgress(undefined);
  }, []);

  const run = useCallback(async <T,>(fn: (api: { setProgress: (p?: number) => void }) => Promise<T>) => {
    setShow(true);
    setProgress(undefined);
    try {
      return await fn({ setProgress });
    } finally {
      setShow(false);
      setProgress(undefined);
    }
  }, []);

  return { show, progress, setProgress, start, stop, run };
}