'use client';

import { BrainAnimation } from './brain-animation';
import { AnalysisStatus } from './analysis-status';

type AnalysisOverlayProps = {
  show: boolean;
  progress?: number;
  className?: string;
};

export function AnalysisOverlay({ show, progress, className }: AnalysisOverlayProps) {
  if (!show) return null;

  return (
    <div className={`fixed inset-0 z-50 ${className ?? ''}`}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />
      <div className="absolute inset-0">
        <BrainAnimation progress={progress} className="w-full h-full" />

        <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
          <AnalysisStatus progress={progress} />
        </div>
      </div>
    </div>
  );
}
