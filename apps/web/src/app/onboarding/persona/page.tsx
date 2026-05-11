'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { UserPersona } from '@interview-mind/shared';
import { useOnboardingStore } from '@/lib/onboarding-store';

const PERSONAS: { value: UserPersona; label: string; description: string }[] = [
  {
    value: 'JOB_SEEKER',
    label: 'Job Seeker',
    description:
      'Actively interviewing at top firms. High-pressure simulation with realistic time constraints.',
  },
  {
    value: 'SKILL_BUILDER',
    label: 'Skill Builder',
    description:
      'Currently employed and want to stay sharp. Consistent daily reps without friction.',
  },
  {
    value: 'STUDENT',
    label: 'Student',
    description:
      'Preparing for internships. Understand why patterns work, not just memorize them.',
  },
];

export default function PersonaPage() {
  const router = useRouter();
  const setPersona = useOnboardingStore((s) => s.setPersona);

  function select(persona: UserPersona) {
    setPersona(persona);
    router.push('/onboarding/mode');
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-16 py-12">
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-accent">›</span>
          <h2 className="text-xl font-semibold text-white">What describes you best?</h2>
        </div>
        <p className="ml-5 text-xs text-muted">
          Sets your default difficulty, session length, and hint ceiling.
        </p>
      </div>

      <div className="ml-5 flex max-w-xl flex-col gap-3">
        {PERSONAS.map((p, i) => (
          <motion.button
            key={p.value}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => select(p.value)}
            className="group border border-border p-4 text-left transition hover:border-accent"
          >
            <p className="text-sm font-semibold text-white transition group-hover:text-accent">
              {p.label}
            </p>
            <p className="mt-1 text-xs text-muted">{p.description}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
