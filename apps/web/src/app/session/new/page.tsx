'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import type { AlgorithmicPattern, DifficultyLevel, InterviewerMode, InterviewerPersona } from '@interview-mind/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface Problem { id: string; title: string; difficulty: string; pattern: string }
interface SessionSummary { problemId: string; score: { correctness: number } | null }

const PATTERNS: { value: AlgorithmicPattern; label: string }[] = [
  { value: 'TWO_POINTERS',       label: 'Two Pointers' },
  { value: 'SLIDING_WINDOW',     label: 'Sliding Window' },
  { value: 'FAST_SLOW_POINTERS', label: 'Fast & Slow Pointers' },
  { value: 'BINARY_SEARCH',      label: 'Binary Search' },
  { value: 'BFS',                label: 'BFS' },
  { value: 'DFS_BACKTRACKING',   label: 'DFS / Backtracking' },
  { value: 'DP_1D',              label: 'Dynamic Prog. 1D' },
  { value: 'DP_2D',              label: 'Dynamic Prog. 2D' },
  { value: 'MONOTONIC_STACK',    label: 'Monotonic Stack' },
  { value: 'HEAP',               label: 'Heap / Priority Queue' },
  { value: 'INTERVALS',          label: 'Intervals' },
  { value: 'UNION_FIND',         label: 'Union-Find' },
  { value: 'TRIE',               label: 'Trie' },
  { value: 'BIT_MANIPULATION',   label: 'Bit Manipulation' },
  { value: 'LINKED_LISTS',       label: 'Linked Lists' },
  { value: 'HASH_MAPS',          label: 'Hash Maps & Sets' },
  { value: 'PREFIX_SUMS',        label: 'Prefix Sums' },
  { value: 'GREEDY',             label: 'Greedy' },
  { value: 'SORT_SEARCH',        label: 'Sort & Search' },
  { value: 'MATH_GEOMETRY',      label: 'Math & Geometry' },
];

const DIFFICULTIES: { value: DifficultyLevel; label: string; cls: string }[] = [
  { value: 'EASY',   label: 'Easy',   cls: 'border-success text-success bg-success/10' },
  { value: 'MEDIUM', label: 'Medium', cls: 'border-warning text-warning bg-warning/10' },
  { value: 'HARD',   label: 'Hard',   cls: 'border-danger  text-danger  bg-danger/10'  },
];

const MODES: { value: InterviewerMode; label: string; description: string }[] = [
  { value: 'GUIDED', label: 'Guided', description: 'Hints available on request' },
  { value: 'STRICT', label: 'Strict', description: 'No hints — real interview feel' },
];

const PERSONAS: { value: InterviewerPersona; label: string; description: string }[] = [
  { value: 'STANDARD',      label: 'Standard',        description: 'Balanced, professional interviewer' },
  { value: 'DISINTERESTED', label: 'Disinterested',   description: 'Terse, minimal feedback — you drive the conversation' },
  { value: 'NITPICKER',     label: 'Nitpicker',       description: 'Demanding on edge cases, naming, and precision' },
  { value: 'BACKSEAT_CODER',label: 'Backseat Coder',  description: 'Always has an alternative approach in mind' },
  { value: 'COACH',         label: 'Coach',           description: 'Warm and encouraging — great for building confidence' },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function FreePracticePage() {
  const router = useRouter();
  const { data: authSession } = useSession();

  const [pattern, setPattern] = useState<AlgorithmicPattern>('TWO_POINTERS');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('EASY');
  const [mode, setMode] = useState<InterviewerMode>('GUIDED');
  const [persona, setPersona] = useState<InterviewerPersona>('STANDARD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    if (!authSession?.apiToken) return;
    setLoading(true);
    setError(null);

    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authSession.apiToken}`,
      };

      const meRes = await fetch(`${API}/users/me`, { headers });
      let userId: string;
      if (meRes.ok) {
        userId = (await meRes.json()).id;
      } else {
        const createRes = await fetch(`${API}/users/onboarding`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email: authSession.user?.email,
            displayName: authSession.user?.name ?? authSession.user?.email,
            calibrationScore: 0,
            tier: 'NOVICE',
            persona: 'STUDENT',
            preferredMode: mode,
          }),
        });
        if (!createRes.ok) throw new Error('Failed to create user');
        userId = (await createRes.json()).id;
      }

      // Get solved problem IDs to prefer unsolved
      const sessionsRes = await fetch(`${API}/sessions`, { headers });
      const pastSessions: SessionSummary[] = sessionsRes.ok ? await sessionsRes.json() : [];
      const solvedIds = new Set(
        pastSessions
          .filter((s) => s.score !== null && s.score.correctness >= 50)
          .map((s) => s.problemId),
      );

      const q = new URLSearchParams({ pattern, difficulty });
      const res = await fetch(`${API}/problems?${q}`, { headers });
      if (!res.ok) throw new Error('Failed to load problems');
      const all: Problem[] = await res.json();
      if (!all.length) throw new Error(`No ${difficulty.toLowerCase()} ${pattern.replace(/_/g, ' ').toLowerCase()} problems found`);

      const unsolved = all.filter((p) => !solvedIds.has(p.id));
      const problem = pickRandom(unsolved.length > 0 ? unsolved : all);

      const sessionRes = await fetch(`${API}/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, problemId: problem.id, mode, persona }),
      });
      if (!sessionRes.ok) {
        const body = await sessionRes.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? 'Failed to create session');
      }
      const { id } = await sessionRes.json() as { id: string };
      router.push(`/session/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4 text-xs text-muted">
          <Link href="/dashboard" className="transition hover:text-white">← dashboard</Link>
          <span className="text-border">·</span>
          <span className="text-white">free practice</span>
        </div>

        <p className="mb-1 text-[10px] tracking-widest text-muted">FREE PRACTICE</p>
        <h1 className="mb-6 text-lg font-semibold text-white">Pick a problem</h1>

        {/* Pattern */}
        <section className="mb-6">
          <p className="mb-3 text-[10px] tracking-widest text-muted">PATTERN</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PATTERNS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPattern(p.value)}
                className={[
                  'border px-3 py-2 text-left text-xs transition',
                  pattern === p.value
                    ? 'border-accent bg-accent/10 text-white'
                    : 'border-border text-muted hover:border-accent/50 hover:text-white',
                ].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* Difficulty */}
        <section className="mb-6">
          <p className="mb-3 text-[10px] tracking-widest text-muted">DIFFICULTY</p>
          <div className="flex gap-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                className={[
                  'flex-1 border px-4 py-2 text-xs font-semibold transition',
                  difficulty === d.value
                    ? d.cls
                    : 'border-border text-muted hover:border-accent/50',
                ].join(' ')}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>

        {/* Mode */}
        <section className="mb-6">
          <p className="mb-3 text-[10px] tracking-widest text-muted">MODE</p>
          <div className="flex gap-3">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={[
                  'flex-1 border p-3 text-left transition',
                  mode === m.value
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/50',
                ].join(' ')}
              >
                <p className={`text-xs font-semibold ${mode === m.value ? 'text-white' : 'text-muted'}`}>
                  {m.label}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">{m.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Persona */}
        <section className="mb-8">
          <p className="mb-3 text-[10px] tracking-widest text-muted">INTERVIEWER PERSONA</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PERSONAS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPersona(p.value)}
                className={[
                  'border p-3 text-left transition',
                  persona === p.value
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/50',
                ].join(' ')}
              >
                <p className={`text-xs font-semibold ${persona === p.value ? 'text-white' : 'text-muted'}`}>
                  {p.label}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">{p.description}</p>
              </button>
            ))}
          </div>
        </section>

        {error && <p className="mb-4 text-xs text-danger">&gt; error: {error}</p>}

        <button
          onClick={handleStart}
          disabled={loading || !authSession}
          className="w-full border border-accent py-3 text-sm tracking-widest text-accent transition hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'setting up…' : 'START →'}
        </button>
      </div>
    </div>
  );
}
