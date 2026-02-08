'use client';

import { BrainAnimation } from './brain-animation';
import { AnalysisStatus } from './analysis-status';

type AnalysisPanelProps = {
  show: boolean;
  progress?: number;
  className?: string;
  heightClassName?: string; // optional: "h-64", "h-80" usw.
};

export function AnalysisPanel({
  show,
  progress,
  className,
  heightClassName = 'h-72',
}: AnalysisPanelProps) {
  if (!show) return null;

  return (
    <div className={['w-full', className ?? ''].join(' ')}>
      <div className={['relative w-full overflow-hidden rounded-lg border border-white/10 bg-[#0b0d10]', heightClassName].join(' ')}>
        <BrainAnimation progress={progress} className="w-full h-full" />
      </div>

      <div className="mt-3 flex justify-center">
        <AnalysisStatus progress={progress} />
      </div>
    </div>
  );
}