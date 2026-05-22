'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { connectSocket, disconnectSocket } from '@/lib/socket';

interface ScoreData {
  total: number;
  correctness: number;
  efficiency: number;
  communication: number;
  independence: number;
  debriefReport: string;
}

interface StructuredReport {
  complexity?: string;
  edgeCases?: string;
  communication?: string;
  improvement?: string;
}

interface Props {
  sessionId: string;
  problem: { title: string; difficulty: string; pattern: string };
  startedAt: string;
  completedAt: string | null;
  maxHintLevel: number;
  initialScore: ScoreData | null;
}

const DIFFICULTY_STYLE: Record<string, string> = {
  EASY:   'text-success border-success/40 bg-success/10',
  MEDIUM: 'text-warning border-warning/40 bg-warning/10',
  HARD:   'text-danger  border-danger/40  bg-danger/10',
};

const DIMENSIONS: { key: keyof Omit<ScoreData, 'total' | 'debriefReport'>; label: string }[] = [
  { key: 'correctness',   label: 'correctness' },
  { key: 'efficiency',    label: 'efficiency' },
  { key: 'communication', label: 'communication' },
  { key: 'independence',  label: 'independence' },
];

const SECTIONS: { key: keyof StructuredReport; label: string }[] = [
  { key: 'complexity',    label: '// complexity' },
  { key: 'edgeCases',     label: '// edge cases' },
  { key: 'communication', label: '// communication' },
  { key: 'improvement',   label: '// improvement' },
];

function scoreColor(pct: number) {
  if (pct >= 75) return 'bg-success';
  if (pct >= 50) return 'bg-warning';
  return 'bg-danger';
}

function toFifths(pct: number) {
  return (pct / 20).toFixed(1);
}

function formatElapsed(startedAt: string, completedAt: string | null) {
  const end = completedAt ? new Date(completedAt) : new Date();
  const secs = Math.floor((end.getTime() - new Date(startedAt).getTime()) / 1000);
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function parseReport(raw: string): StructuredReport | null {
  try {
    const json = JSON.parse(raw);
    if (typeof json === 'object' && json !== null) return json as StructuredReport;
  } catch {}
  return null;
}

function ScoreSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-14 w-24 bg-border/40 rounded" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 w-20 bg-border/40 rounded" />
            <div className="h-1 bg-border/40 rounded" style={{ width: `${55 + i * 8}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[80, 65, 75, 55].map((w, i) => (
        <div key={i} className="space-y-2">
          <div className="h-2.5 w-28 bg-border/40 rounded" />
          <div className="space-y-1.5">
            <div className="h-2 bg-border/30 rounded" style={{ width: `${w}%` }} />
            <div className="h-2 bg-border/30 rounded" style={{ width: `${w - 15}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DebriefView({
  sessionId,
  problem,
  startedAt,
  completedAt,
  maxHintLevel,
  initialScore,
}: Props) {
  const router = useRouter();
  const { data: authSession } = useSession();
  const [score, setScore] = useState<ScoreData | null>(initialScore);
  const [nextSessionId, setNextSessionId] = useState<string | null>(null);

  // Read queue from sessionStorage for multi-problem flows.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('imQueue');
      if (!raw) return;
      const q = JSON.parse(raw) as { ids: string[]; goalMinutes: number };
      const idx = q.ids.indexOf(sessionId);
      if (idx >= 0 && idx < q.ids.length - 1) setNextSessionId(q.ids[idx + 1]);
    } catch {}
  }, [sessionId]);

  // If the score isn't in the DB yet, connect WS and wait for debrief:ready.
  useEffect(() => {
    if (score !== null || !authSession?.apiToken) return;

    const socket = connectSocket(sessionId, authSession.apiToken);

    socket.on('debrief:ready', (data: ScoreData) => {
      setScore(data);
    });

    return () => {
      disconnectSocket();
    };
  }, [sessionId, authSession?.apiToken, score]);

  const report = score ? parseReport(score.debriefReport) : null;
  const elapsed = formatElapsed(startedAt, completedAt);
  const diffStyle = DIFFICULTY_STYLE[problem.difficulty] ?? 'text-muted border-border';
  const patternLabel = problem.pattern.replace(/_/g, ' ').toLowerCase();

  function handleNext() {
    if (nextSessionId) {
      router.push(`/session/${nextSessionId}`);
    } else {
      sessionStorage.removeItem('imQueue');
      router.push('/dashboard');
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* Nav */}
      <nav className="flex h-10 shrink-0 items-center border-b border-border px-6">
        <span className="text-xs font-bold tracking-widest">
          <span className="text-white">INTERVIEWMIND</span>
          <span className="text-accent">.AI</span>
        </span>
        <span className="mx-3 text-border">·</span>
        <span className="text-xs text-muted">session debrief</span>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-xs text-muted transition hover:text-white">
            dashboard
          </Link>
        </div>
      </nav>

      {/* Two-column layout */}
      <div className="flex flex-1 divide-x divide-border overflow-hidden">

        {/* ── Left column: score + metadata ── */}
        <div className="flex w-80 shrink-0 flex-col justify-between p-6">
          <div>
            {/* Problem identity */}
            <div className="mb-6">
              <p className="mb-1 text-[10px] tracking-widest text-muted">PROBLEM</p>
              <h1 className="mb-2 text-base font-semibold leading-tight text-white">
                {problem.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`border px-2 py-0.5 text-[10px] tracking-widest ${diffStyle}`}>
                  {problem.difficulty}
                </span>
                <span className="text-[10px] text-muted/60">{patternLabel}</span>
              </div>
            </div>

            <div className="mb-6 h-px bg-border" />

            {/* Total score */}
            {score ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <p className="mb-1 text-[10px] tracking-widest text-muted">TOTAL SCORE</p>
                <div className="mb-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{toFifths(score.total)}</span>
                  <span className="text-lg text-muted">/ 5.0</span>
                </div>

                {/* Dimension bars */}
                <div className="space-y-3">
                  {DIMENSIONS.map(({ key, label }, i) => {
                    const pct = score[key];
                    return (
                      <div key={key}>
                        <div className="mb-1 flex items-center justify-between text-[10px]">
                          <span className="text-muted/70">{label}</span>
                          <span className="text-white/70">{toFifths(pct)}</span>
                        </div>
                        <div className="h-0.5 w-full bg-border">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: i * 0.08 }}
                            className={`h-0.5 ${scoreColor(pct)}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <ScoreSkeleton />
            )}

            <div className="mt-6 mb-6 h-px bg-border" />

            {/* Session metadata */}
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-muted/60">time</span>
                <span className="text-muted">{elapsed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted/60">hints used</span>
                <span className="text-muted">
                  {maxHintLevel === 0 ? 'none' : `level ${maxHintLevel}`}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-2">
            <button
              onClick={() => { sessionStorage.removeItem('imQueue'); router.push('/dashboard'); }}
              className="border border-border py-2 text-xs text-muted transition hover:border-accent hover:text-white"
            >
              dashboard
            </button>
            <button
              onClick={handleNext}
              className="border border-accent py-2 text-xs text-accent transition hover:bg-accent hover:text-white"
            >
              {nextSessionId ? 'next problem →' : 'finish →'}
            </button>
          </div>
        </div>

        {/* ── Right column: AI analysis ── */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="mb-6 text-[10px] tracking-widest text-muted">AI ANALYSIS</p>

          {report ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {SECTIONS.map(({ key, label }) =>
                report[key] ? (
                  <div key={key}>
                    <p className="mb-2 text-[10px] tracking-widest text-accent/70">{label}</p>
                    <p className="text-sm leading-relaxed text-muted">{report[key]}</p>
                  </div>
                ) : null,
              )}
            </motion.div>
          ) : score ? (
            // Score received but report is plain text (legacy format)
            <div>
              <p className="mb-2 text-[10px] tracking-widest text-muted/60">// debrief</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
                {score.debriefReport}
              </p>
            </div>
          ) : (
            <SectionSkeleton />
          )}
        </div>

      </div>
    </div>
  );
}
