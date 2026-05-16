'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { useOnboardingStore, scoreToTier } from '@/lib/onboarding-store';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function FirstSessionPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const store = useOnboardingStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    if (!session?.apiToken) return;
    setLoading(true);
    setError(null);

    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.apiToken}`,
      };

      const userRes = await fetch(`${API}/users/onboarding`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: session.user?.email,
          displayName: session.user?.name ?? session.user?.email,
          calibrationScore: store.calibrationScore,
          tier: scoreToTier(store.calibrationScore),
          persona: store.persona ?? 'STUDENT',
          preferredMode: store.mode,
        }),
      });
      if (!userRes.ok) throw new Error('Failed to save onboarding data');
      const user = await userRes.json();

      const problemsRes = await fetch(
        `${API}/problems?pattern=TWO_POINTERS&difficulty=EASY`,
        { headers },
      );
      if (!problemsRes.ok) throw new Error('Failed to load problems');
      const problemsList = await problemsRes.json();
      if (!problemsList.length) throw new Error('No onboarding problem found');

      const sessionRes = await fetch(`${API}/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user.id,
          problemId: problemsList[0].id,
          mode: store.mode,
        }),
      });
      if (!sessionRes.ok) throw new Error('Failed to create session');
      const newSession = await sessionRes.json();

      router.push(`/session/${newSession.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  const tier = scoreToTier(store.calibrationScore);

  return (
    <div className="flex flex-1 flex-col justify-center px-16 py-12">
      <p className="mb-8 text-xs text-muted">$ first_session.sh</p>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg">
        <p className="mb-4 text-xs text-muted/60">// session config</p>
        <div className="mb-8 space-y-2 text-sm">
          <ConfigRow label="problem" value="Two Pointers — Easy" />
          <ConfigRow label="mode" value={store.mode.toLowerCase()} />
          <ConfigRow
            label="persona"
            value={(store.persona ?? 'STUDENT').toLowerCase().replace('_', ' ')}
          />
          <ConfigRow label="tier" value={tier.toLowerCase()} accent />
          <ConfigRow label="score recorded" value="no · first session" />
        </div>

        <p className="mb-3 text-xs text-muted/60">// session phases</p>
        <div className="mb-8 space-y-1.5 border-l border-border pl-4 text-xs text-muted">
          <p>1 · clarification — ask a question to unlock the editor</p>
          <p>2 · approach — describe your plan before writing code</p>
          <p>3 · implementation — write and submit your solution</p>
          <p>4 · debrief — receive a structured performance report</p>
        </div>

        {error && <p className="mb-4 text-xs text-danger">&gt; error: {error}</p>}

        <button
          onClick={handleStart}
          disabled={loading || !session}
          className="border border-accent px-6 py-2.5 text-sm text-accent transition hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'initializing…' : 'start session →'}
        </button>
      </motion.div>
    </div>
  );
}

function ConfigRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex gap-6">
      <span className="w-28 shrink-0 text-muted">{label}</span>
      <span className={accent ? 'font-semibold text-accent' : 'text-white'}>{value}</span>
    </div>
  );
}
