'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { PATTERN_LABELS } from '@/lib/dojo-constants';
import type { AlgorithmicPattern, DifficultyLevel } from '@interview-mind/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Problem = { id: string; title: string; difficulty: string; pattern: string };
type InterviewerMode = 'GUIDED' | 'STRICT';

const DIFFICULTY_CLS: Record<string, string> = {
  EASY: 'text-success',
  MEDIUM: 'text-warning',
  HARD: 'text-danger',
};

const PATTERNS = Object.keys(PATTERN_LABELS) as AlgorithmicPattern[];
const DIFFICULTIES: DifficultyLevel[] = ['EASY', 'MEDIUM', 'HARD'];

export default function FreePracticePage() {
  const router = useRouter();
  const { data: authSession } = useSession();

  const [problems, setProblems] = useState<Problem[]>([]);
  const [pattern, setPattern] = useState<AlgorithmicPattern | ''>('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | ''>('');
  const [mode, setMode] = useState<InterviewerMode>('GUIDED');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const q = new URLSearchParams();
      if (pattern) q.set('pattern', pattern);
      if (difficulty) q.set('difficulty', difficulty);
      const res = await fetch(`${API}/problems?${q}`);
      if (res.ok) setProblems(await res.json());
      setLoading(false);
    }
    load();
  }, [pattern, difficulty]);

  async function startSession(problemId: string) {
    if (!authSession?.apiToken) return;
    setStarting(problemId);
    setError(null);

    try {
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession.apiToken}` };

      const meRes = await fetch(`${API}/users/me`, { headers });
      if (!meRes.ok) throw new Error('Could not fetch user');
      const user = await meRes.json();

      const res = await fetch(`${API}/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: user.id, problemId, mode, freePlay: true }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? 'Failed to create session');
      }

      const session = await res.json();
      router.push(`/session/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStarting(null);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Nav */}
      <nav className="flex h-10 shrink-0 items-center border-b border-border px-6">
        <span className="text-xs font-bold tracking-widest">
          <span className="text-white">INTERVIEWMIND</span>
          <span className="text-accent">.AI</span>
        </span>
        <span className="mx-3 text-border">·</span>
        <Link href="/dashboard" className="text-xs text-muted transition hover:text-white">dashboard</Link>
        <span className="mx-2 text-border/50">·</span>
        <Link href="/dojo" className="text-xs text-muted transition hover:text-white">dojo</Link>
        <span className="mx-2 text-border/50">·</span>
        <span className="text-xs text-white">free practice</span>
      </nav>

      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <div className="mb-6">
          <p className="mb-1 text-[10px] tracking-widest text-muted">$ free-practice --no-gating</p>
          <h1 className="text-xl font-bold text-white">Free Practice</h1>
          <p className="mt-1 text-xs text-muted">
            Pick any problem. Sessions here don&apos;t affect your Dojo progression or XP.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          {/* Pattern filter */}
          <select
            value={pattern}
            onChange={(e) => setPattern(e.target.value as AlgorithmicPattern | '')}
            className="border border-border bg-transparent px-3 py-1.5 text-xs text-white focus:border-accent focus:outline-none"
          >
            <option value="">All patterns</option>
            {PATTERNS.map((p) => (
              <option key={p} value={p}>{PATTERN_LABELS[p]}</option>
            ))}
          </select>

          {/* Difficulty filter */}
          <div className="flex gap-1">
            <button
              onClick={() => setDifficulty('')}
              className={`border px-3 py-1.5 text-xs transition ${difficulty === '' ? 'border-accent text-accent' : 'border-border text-muted hover:border-accent/50'}`}
            >
              All
            </button>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`border px-3 py-1.5 text-xs transition ${difficulty === d ? 'border-accent text-accent' : 'border-border text-muted hover:border-accent/50'}`}
              >
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Mode selector */}
          <div className="ml-auto flex gap-1">
            {(['GUIDED', 'STRICT'] as InterviewerMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`border px-3 py-1.5 text-xs tracking-widest transition ${mode === m ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted hover:border-accent/50'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mb-4 text-xs text-danger">&gt; {error}</p>}

        {/* Problem list */}
        {loading ? (
          <p className="text-xs text-muted animate-pulse">loading problems…</p>
        ) : problems.length === 0 ? (
          <p className="text-xs text-muted">No problems match these filters.</p>
        ) : (
          <div className="space-y-2">
            {problems.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border border-border px-4 py-3"
              >
                <div>
                  <span className="text-sm text-white">{p.title}</span>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted/60">
                    <span>{PATTERN_LABELS[p.pattern as AlgorithmicPattern] ?? p.pattern}</span>
                    <span className="text-border">·</span>
                    <span className={DIFFICULTY_CLS[p.difficulty] ?? 'text-muted'}>
                      {p.difficulty.toLowerCase()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => startSession(p.id)}
                  disabled={starting !== null || !authSession}
                  className="border border-accent px-4 py-1.5 text-xs tracking-widest text-accent transition hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {starting === p.id ? 'starting…' : `${mode.toLowerCase()} →`}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
