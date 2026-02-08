'use client';

import { BrainAnimation } from './brain-animation';
import { AnalysisStatus } from './analysis-status';

type AnalysisOverlayProps = {
  show: boolean;
  progress?: number;          // 0..1 optional
  className?: string;
  blur?: boolean;
};

export function AnalysisOverlay({
  show,
  progress,
  className,
  blur = true,
}: AnalysisOverlayProps) {
  if (!show) return null;

  return (
    <div className={`fixed inset-0 z-50 ${className ?? ''}`}>
      {/* optional: dim/blur backdrop */}
      <div
        className={`absolute inset-0 ${blur ? 'backdrop-blur-sm' : ''}`}
        style={{ background: 'rgba(0,0,0,0.55)' }}
      />

      {/* content */}
      <div className="absolute inset-0">
        <BrainAnimation progress={progress} className="w-full h-full" />

        <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center pointer-events-none">
          <AnalysisStatus progress={progress} />
        </div>
      </div>
    </div>
  );
}