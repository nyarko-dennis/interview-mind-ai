'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AlgorithmicPattern, DifficultyLevel, InterviewerMode } from '@interview-mind/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

// ---- types ----------------------------------------------------------------

type SessionType = 'SPRINT' | 'DEEP_DIVE' | 'MARATHON';

interface Problem { id: string; title: string; difficulty: string; pattern: string }
interface SessionQueueData { type: SessionType; ids: string[]; goalMinutes: number }

// ---- config ---------------------------------------------------------------

const TYPE_CONFIG: Record<SessionType, { label: string; tag: string; description: string; goalMinutes: number }> = {
  SPRINT: {
    label: 'Daily Sprint',
    tag: '30 min',
    description: '1 problem · choose pattern & difficulty',
    goalMinutes: 30,
  },
  DEEP_DIVE: {
    label: 'Pattern Deep Dive',
    tag: '60 min',
    description: '3 problems · one pattern · Easy → Medium → Hard',
    goalMinutes: 60,
  },
  MARATHON: {
    label: 'Weekly Marathon',
    tag: '90 min',
    description: '3 problems · any patterns · Easy → Medium → Hard',
    goalMinutes: 90,
  },
};

const PATTERNS: { value: AlgorithmicPattern; label: string }[] = [
  { value: 'TWO_POINTERS',       label: 'Two Pointers' },
  { value: 'SLIDING_WINDOW',     label: 'Sliding Window' },
  { value: 'FAST_SLOW_POINTERS', label: 'Fast & Slow Pointers' },
  { value: 'BINARY_SEARCH',      label: 'Binary Search' },
  { value: 'BFS',                label: 'BFS' },
  { value: 'DFS_BACKTRACKING',   label: 'DFS / Backtracking' },
  { value: 'DP_1D',              label: 'Dynamic Programming 1D' },
  { value: 'DP_2D',              label: 'Dynamic Programming 2D' },
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
  { value: 'GUIDED', label: 'Guided', description: 'Proactive hints and feedback' },
  { value: 'STRICT', label: 'Strict', description: 'Minimal prompting — real interview feel' },
];

// ---- helpers ---------------------------------------------------------------

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---- page -----------------------------------------------------------------

export default function NewSessionPage() {
  const router = useRouter();
  const { data: authSession } = useSession();

  const [sessionType, setSessionType] = useState<SessionType>('SPRINT');
  const [pattern, setPattern] = useState<AlgorithmicPattern>('TWO_POINTERS');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('EASY');
  const [mode, setMode] = useState<InterviewerMode>('GUIDED');
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

      // Resolve user ID
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

      // Fetch problems matching given filters
      async function fetchProblems(opts: { pattern?: string; difficulty?: string }): Promise<Problem[]> {
        const q = new URLSearchParams();
        if (opts.pattern) q.set('pattern', opts.pattern);
        if (opts.difficulty) q.set('difficulty', opts.difficulty);
        const res = await fetch(`${API}/problems?${q}`, { headers });
        if (!res.ok) throw new Error('Failed to load problems');
        return res.json();
      }

      // Create a single session
      async function createSession(problemId: string): Promise<{ id: string }> {
        const res = await fetch(`${API}/sessions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ userId, problemId, mode }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { message?: string };
          throw new Error(body.message ?? 'Failed to create session');
        }
        return res.json();
      }

      // Persist queue + navigate to first session
      function launch(type: SessionType, sessionIds: string[]) {
        const queue: SessionQueueData = {
          type,
          ids: sessionIds,
          goalMinutes: TYPE_CONFIG[type].goalMinutes,
        };
        sessionStorage.setItem('imQueue', JSON.stringify(queue));
        router.push(`/session/${sessionIds[0]}`);
      }

      // ── SPRINT ──────────────────────────────────────────────────────────
      if (sessionType === 'SPRINT') {
        const problems = await fetchProblems({ pattern, difficulty });
        if (!problems.length) {
          throw new Error(
            `No ${difficulty.toLowerCase()} ${pattern.replace(/_/g, ' ').toLowerCase()} problems found`,
          );
        }
        const session = await createSession(pickRandom(problems).id);
        launch('SPRINT', [session.id]);

      // ── DEEP DIVE ───────────────────────────────────────────────────────
      } else if (sessionType === 'DEEP_DIVE') {
        const [easy, medium, hard] = await Promise.all([
          fetchProblems({ pattern, difficulty: 'EASY' }),
          fetchProblems({ pattern, difficulty: 'MEDIUM' }),
          fetchProblems({ pattern, difficulty: 'HARD' }),
        ]);

        const selected = [
          easy.length   ? pickRandom(easy)   : null,
          medium.length ? pickRandom(medium) : null,
          hard.length   ? pickRandom(hard)   : null,
        ].filter(Boolean) as Problem[];

        if (!selected.length) throw new Error('No problems found for this pattern');

        // Create sessions sequentially to respect tier checks
        const ids: string[] = [];
        for (const p of selected) ids.push((await createSession(p.id)).id);
        launch('DEEP_DIVE', ids);

      // ── MARATHON ────────────────────────────────────────────────────────
      } else {
        const [easy, medium, hard] = await Promise.all([
          fetchProblems({ difficulty: 'EASY' }),
          fetchProblems({ difficulty: 'MEDIUM' }),
          fetchProblems({ difficulty: 'HARD' }),
        ]);

        if (!easy.length)   throw new Error('No Easy problems available');
        if (!medium.length) throw new Error('No Medium problems available');
        if (!hard.length)   throw new Error('No Hard problems found — Developing+ tier required');

        const selected = [pickRandom(easy), pickRandom(medium), pickRandom(hard)];

        const ids: string[] = [];
        for (const p of selected) ids.push((await createSession(p.id)).id);
        launch('MARATHON', ids);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  const typeConfig = TYPE_CONFIG[sessionType];

  return (
    <div className="min-h-screen bg-canvas px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <p className="mb-6 text-xs text-muted">$ new_session.sh</p>

        {/* Session type */}
        <section className="mb-6">
          <p className="mb-3 text-[10px] tracking-widest text-muted">SESSION TYPE</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(TYPE_CONFIG) as [SessionType, typeof TYPE_CONFIG[SessionType]][]).map(
              ([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setSessionType(key)}
                  className={[
                    'border p-3 text-left transition',
                    sessionType === key
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50',
                  ].join(' ')}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        sessionType === key ? 'text-white' : 'text-muted'
                      }`}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-[10px] tracking-widest text-muted/60">{cfg.tag}</span>
                  </div>
                  <p className="text-[10px] text-muted/60">{cfg.description}</p>
                </button>
              ),
            )}
          </div>
        </section>

        {/* Conditional options */}
        <AnimatePresence mode="wait">
          <motion.div
            key={sessionType}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
          >
            {/* Pattern picker — Sprint + Deep Dive */}
            {(sessionType === 'SPRINT' || sessionType === 'DEEP_DIVE') && (
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
            )}

            {/* Difficulty — Sprint only */}
            {sessionType === 'SPRINT' && (
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
            )}

            {/* Marathon note */}
            {sessionType === 'MARATHON' && (
              <div className="mb-6 border-l-2 border-accent/30 pl-3 text-xs text-muted">
                <p>3 problems are selected automatically — one Easy, one Medium, one Hard.</p>
                <p className="mt-1 text-muted/50">Hard problems require Developing+ tier.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Mode — always shown */}
        <section className="mb-8">
          <p className="mb-3 text-[10px] tracking-widest text-muted">INTERVIEWER MODE</p>
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
                <p
                  className={`text-xs font-semibold ${
                    mode === m.value ? 'text-white' : 'text-muted'
                  }`}
                >
                  {m.label}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">{m.description}</p>
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
          {loading
            ? 'setting up…'
            : `START ${typeConfig.label.toUpperCase()} →`}
        </button>
      </div>
    </div>
  );
}
