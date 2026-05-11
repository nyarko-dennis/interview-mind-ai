'use client';

import type { SessionPhase } from '@interview-mind/shared';

const PHASES: { phase: SessionPhase; label: string }[] = [
  { phase: 'CLARIFICATION', label: 'CLARIFICATION' },
  { phase: 'APPROACH', label: 'APPROACH' },
  { phase: 'IMPLEMENTATION', label: 'IMPLEMENTATION' },
  { phase: 'DEBRIEF', label: 'DEBRIEF' },
];

export function PhaseIndicator({ phase }: { phase: SessionPhase }) {
  // REVIEW is a brief internal state between IMPLEMENTATION and DEBRIEF — keep IMPLEMENTATION lit
  const displayPhase: SessionPhase = phase === 'REVIEW' ? 'IMPLEMENTATION' : phase;
  const currentIdx = PHASES.findIndex((p) => p.phase === displayPhase);

  return (
    <div className="flex items-center gap-1">
      {PHASES.map(({ phase: p, label }, i) => {
        const isActive = p === displayPhase;
        const isPast = currentIdx !== -1 && i < currentIdx;

        return (
          <div key={p} className="flex items-center gap-1">
            <div className="flex items-center gap-1.5 px-1">
              <span
                className={[
                  'flex h-4 w-4 shrink-0 items-center justify-center text-[9px] font-bold',
                  isActive
                    ? 'bg-accent text-white'
                    : isPast
                    ? 'bg-success/20 text-success'
                    : 'border border-border text-muted/40',
                ].join(' ')}
              >
                {isPast ? '✓' : i + 1}
              </span>
              <span
                className={[
                  'text-[10px] tracking-widest',
                  isActive ? 'text-white' : isPast ? 'text-success/70' : 'text-muted/40',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
            {i < PHASES.length - 1 && (
              <span className="text-[10px] text-border/60">›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
