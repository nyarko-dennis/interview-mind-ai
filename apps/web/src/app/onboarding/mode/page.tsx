'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { InterviewerMode } from '@interview-mind/shared';
import { useOnboardingStore } from '@/lib/onboarding-store';

const MODES: { value: InterviewerMode; label: string; tag: string; description: string }[] = [
  {
    value: 'GUIDED',
    label: 'Guided',
    tag: 'recommended',
    description:
      'High feedback, supportive tone. Proactively surfaces hints at lower idle thresholds. Good for building intuition.',
  },
  {
    value: 'STRICT',
    label: 'Strict',
    tag: 'FAANG simulation',
    description:
      "Silent mode — interviewer is present but rarely prompts. Standard 'interviewer at rest' style.",
  },
];

export default function ModePage() {
  const router = useRouter();
  const setMode = useOnboardingStore((s) => s.setMode);

  function select(mode: InterviewerMode) {
    setMode(mode);
    router.push('/onboarding/first-session');
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-16 py-12">
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-accent">›</span>
          <h2 className="text-xl font-semibold text-white">Choose your interviewer mode</h2>
        </div>
        <p className="ml-5 text-xs text-muted">You can change this before any session.</p>
      </div>

      <div className="ml-5 flex max-w-xl flex-col gap-3">
        {MODES.map((m, i) => (
          <motion.button
            key={m.value}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => select(m.value)}
            className="group border border-border p-4 text-left transition hover:border-accent"
          >
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white transition group-hover:text-accent">
                {m.label}
              </p>
              <span className="text-[10px] tracking-widest text-muted/60">{m.tag}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{m.description}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
