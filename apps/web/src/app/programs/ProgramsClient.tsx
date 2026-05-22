'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ProgramType, UserProgram } from './page';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const PATTERNS = [
  { value: 'TWO_POINTERS',       label: 'Two Pointers' },
  { value: 'SLIDING_WINDOW',     label: 'Sliding Window' },
  { value: 'FAST_SLOW_POINTERS', label: 'Fast & Slow Pointers' },
  { value: 'BINARY_SEARCH',      label: 'Binary Search' },
  { value: 'BFS',                label: 'BFS' },
  { value: 'DFS_BACKTRACKING',   label: 'DFS / Backtracking' },
  { value: 'DP_1D',              label: 'Dynamic Prog. 1D' },
  { value: 'DP_2D',              label: 'Dynamic Prog. 2D' },
  { value: 'MONOTONIC_STACK',    label: 'Monotonic Stack' },
  { value: 'HEAP',               label: 'Heap' },
  { value: 'INTERVALS',          label: 'Intervals' },
  { value: 'UNION_FIND',         label: 'Union-Find' },
  { value: 'TRIE',               label: 'Trie' },
  { value: 'BIT_MANIPULATION',   label: 'Bit Manipulation' },
  { value: 'LINKED_LISTS',       label: 'Linked Lists' },
  { value: 'HASH_MAPS',          label: 'Hash Maps' },
  { value: 'PREFIX_SUMS',        label: 'Prefix Sums' },
  { value: 'GREEDY',             label: 'Greedy' },
  { value: 'SORT_SEARCH',        label: 'Sort & Search' },
  { value: 'MATH_GEOMETRY',      label: 'Math & Geometry' },
];

const PROGRAM_META: Record<ProgramType, { label: string; tag: string; description: string; detail: string }> = {
  DAILY_SPRINT: {
    label: 'Daily Sprint',
    tag: '1 problem / day',
    description: 'One problem daily. Pattern is hidden — you must identify it yourself.',
    detail: 'Rotates through your weakest patterns automatically. Missed days carry over for up to 7 days.',
  },
  DEEP_DIVE: {
    label: 'Pattern Deep Dive',
    tag: '3 problems / day',
    description: 'Easy → Medium → Hard on one pattern. Pattern is shown — focus on execution.',
    detail: 'Choose a pattern to master. Same pattern every day until you change it. Carry-over applies.',
  },
  INTERVIEW_SIM: {
    label: 'Interview Sim',
    tag: '3 problems · strict',
    description: '3 mixed problems, patterns hidden, no hints. Real interview conditions.',
    detail: 'Start on demand when you\'re ready to test yourself. Sessions are always strict mode.',
  },
};

interface Props {
  apiToken: string;
  enrolled: UserProgram[];
}

export function ProgramsClient({ apiToken, enrolled }: Props) {
  const router = useRouter();
  const [programs, setPrograms] = useState<UserProgram[]>(enrolled);
  const [loading, setLoading] = useState<ProgramType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` };

  function getProgram(type: ProgramType) {
    return programs.find((p) => p.type === type);
  }

  async function toggle(type: ProgramType) {
    setLoading(type);
    setError(null);
    try {
      const existing = getProgram(type);
      if (existing) {
        const res = await fetch(`${API}/programs/${existing.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ active: !existing.active }),
        });
        if (!res.ok) throw new Error('Failed to update');
        const updated: UserProgram = await res.json();
        setPrograms((p) => p.map((pr) => (pr.id === updated.id ? updated : pr)));
      } else {
        const defaultConfig = type === 'DEEP_DIVE' ? { pattern: 'TWO_POINTERS' } : {};
        const res = await fetch(`${API}/programs`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ type, config: defaultConfig }),
        });
        if (!res.ok) throw new Error('Failed to enroll');
        const created: UserProgram = await res.json();
        setPrograms((p) => [...p, created]);
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(null);
    }
  }

  async function changePattern(programId: string, pattern: string) {
    const res = await fetch(`${API}/programs/${programId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ config: { pattern } }),
    });
    if (!res.ok) return;
    const updated: UserProgram = await res.json();
    setPrograms((p) => p.map((pr) => (pr.id === updated.id ? updated : pr)));
  }

  return (
    <div className="min-h-screen bg-canvas px-6 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Nav */}
        <div className="mb-8 flex items-center gap-4 text-xs text-muted">
          <Link href="/dashboard" className="transition hover:text-white">← dashboard</Link>
          <span className="text-border">·</span>
          <span className="text-white">programs</span>
        </div>

        <p className="mb-1 text-[10px] tracking-widest text-muted">TRAINING PROGRAMS</p>
        <h1 className="mb-2 text-lg font-semibold text-white">Practice Schedule</h1>
        <p className="mb-8 text-xs text-muted">
          Enroll in programs to get problems delivered automatically. Your daily work
          appears on the dashboard.
        </p>

        {error && <p className="mb-4 text-xs text-danger">&gt; {error}</p>}

        <div className="space-y-4">
          {(Object.keys(PROGRAM_META) as ProgramType[]).map((type) => {
            const meta = PROGRAM_META[type];
            const program = getProgram(type);
            const active = program?.active ?? false;
            const busy = loading === type;

            return (
              <div
                key={type}
                className={`border p-5 transition ${active ? 'border-accent bg-accent/5' : 'border-border'}`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`text-sm font-semibold ${active ? 'text-white' : 'text-muted'}`}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] tracking-widest text-muted/60">{meta.tag}</span>
                      {active && (
                        <span className="border border-accent/40 px-1.5 py-0.5 text-[9px] tracking-widest text-accent">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted">{meta.description}</p>
                  </div>

                  <button
                    onClick={() => toggle(type)}
                    disabled={busy}
                    className={`ml-4 shrink-0 border px-4 py-1.5 text-xs tracking-widest transition disabled:opacity-40 ${
                      active
                        ? 'border-border text-muted hover:border-danger/50 hover:text-danger'
                        : 'border-accent text-accent hover:bg-accent hover:text-white'
                    }`}
                  >
                    {busy ? '…' : active ? 'deactivate' : 'activate'}
                  </button>
                </div>

                <p className="mb-3 text-[10px] text-muted/50">{meta.detail}</p>

                {/* Deep Dive pattern selector */}
                {type === 'DEEP_DIVE' && active && program && (
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] tracking-widest text-muted/60">PATTERN</span>
                    <select
                      value={program.config.pattern ?? 'TWO_POINTERS'}
                      onChange={(e) => changePattern(program.id, e.target.value)}
                      className="border border-border bg-canvas px-2 py-1 text-xs text-white focus:border-accent focus:outline-none"
                    >
                      {PATTERNS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
