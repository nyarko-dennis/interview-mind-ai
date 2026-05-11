'use client';

import { usePathname } from 'next/navigation';

const STEPS = [
  { label: 'CALIBRATION', path: '/onboarding/calibration' },
  { label: 'PERSONA', path: '/onboarding/persona' },
  { label: 'MODE', path: '/onboarding/mode' },
  { label: 'LAUNCH', path: '/onboarding/first-session' },
];

export function OnboardingStepper() {
  const pathname = usePathname();
  const currentIndex = STEPS.findIndex((s) => pathname.startsWith(s.path));

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-surface px-6 py-8">
      <div className="mb-10 text-xs font-bold tracking-widest">
        <span className="text-white">INTERVIEWMIND</span>
        <span className="text-accent">.AI</span>
      </div>

      <ol className="flex flex-col gap-5">
        {STEPS.map((step, i) => {
          const completed = i < currentIndex;
          const current = i === currentIndex;

          return (
            <li key={step.path} className="flex items-center gap-3">
              <span
                className={[
                  'flex h-5 w-5 shrink-0 items-center justify-center text-[10px] font-bold',
                  completed
                    ? 'bg-accent/20 text-accent'
                    : current
                    ? 'bg-accent text-white'
                    : 'border border-border text-muted',
                ].join(' ')}
              >
                {completed ? '✓' : i + 1}
              </span>
              <span
                className={[
                  'text-[11px] tracking-widest',
                  current ? 'text-white' : completed ? 'text-accent/60' : 'text-muted',
                ].join(' ')}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
