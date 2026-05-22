'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProgramWithAssignments, TodayAssignment } from './page';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const PROGRAM_LABELS: Record<string, string> = {
  DAILY_SPRINT:  'Daily Sprint',
  DEEP_DIVE:     'Deep Dive',
  INTERVIEW_SIM: 'Interview Sim',
};

const DIFFICULTY_STYLE: Record<string, string> = {
  EASY:   'text-success border-success/40',
  MEDIUM: 'text-warning border-warning/40',
  HARD:   'text-danger border-danger/40',
};

// Patterns are hidden for these program types — the whole point is recognition training
const PATTERN_BLIND: Set<string> = new Set(['DAILY_SPRINT', 'INTERVIEW_SIM']);

interface Props {
  programs: ProgramWithAssignments[];
  apiToken: string;
  preferredMode: string;
}

export function TodaysPractice({ programs, apiToken, preferredMode }: Props) {
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);

  const pendingCount = programs.reduce(
    (n, p) => n + p.assignments.filter((a) => !a.completed).length,
    0,
  );

  // Request browser notification permission and nudge if there's pending work
  useEffect(() => {
    if (pendingCount === 0) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification('InterviewMind — practice ready', {
        body: `You have ${pendingCount} problem${pendingCount > 1 ? 's' : ''} waiting today.`,
        icon: '/favicon.ico',
      });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          new Notification('InterviewMind — practice ready', {
            body: `You have ${pendingCount} problem${pendingCount > 1 ? 's' : ''} waiting today.`,
            icon: '/favicon.ico',
          });
        }
      });
    }
  }, [pendingCount]);

  async function startAssignment(assignmentId: string, existingSessionId: string | null) {
    if (existingSessionId) {
      router.push(`/session/${existingSessionId}`);
      return;
    }
    setStarting(assignmentId);
    try {
      const res = await fetch(`${API}/programs/assignments/${assignmentId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ preferredMode }),
      });
      if (!res.ok) throw new Error();
      const { sessionId } = await res.json() as { sessionId: string };
      router.push(`/session/${sessionId}`);
    } catch {
      setStarting(null);
    }
  }

  async function startInterviewSim() {
    setStarting('sim');
    try {
      const res = await fetch(`${API}/programs/interview-sim/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      });
      if (!res.ok) throw new Error();
      const assignments = await res.json() as TodayAssignment[];
      if (assignments[0]) await startAssignment(assignments[0].id, null);
    } catch {
      setStarting(null);
    }
  }

  return (
    <div className="border-b border-border px-6 py-5">
      <p className="mb-4 text-[10px] tracking-widest text-muted">TODAY'S PRACTICE</p>

      <div className="flex flex-wrap gap-4">
        {programs.map(({ program, assignments }) => {
          const isBlind = PATTERN_BLIND.has(program.type);
          const isSim = program.type === 'INTERVIEW_SIM';
          const pending = assignments.filter((a) => !a.completed);
          const allDone = assignments.length > 0 && pending.length === 0;

          // Interview Sim: show a start button if no assignments yet
          if (isSim && assignments.length === 0) {
            return (
              <div key={program.id} className="flex min-w-[220px] flex-1 flex-col border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] tracking-widest text-muted">{PROGRAM_LABELS[program.type]}</p>
                  <span className="text-[10px] text-muted/50">strict · no hints</span>
                </div>
                <p className="mb-4 flex-1 text-xs text-muted/70">
                  3 mixed problems, patterns hidden. Start when ready.
                </p>
                <button
                  onClick={startInterviewSim}
                  disabled={starting === 'sim'}
                  className="border border-accent py-2 text-xs text-accent transition hover:bg-accent hover:text-white disabled:opacity-40"
                >
                  {starting === 'sim' ? 'starting…' : 'start interview sim →'}
                </button>
              </div>
            );
          }

          if (assignments.length === 0) return null;

          return (
            <div key={program.id} className="flex min-w-[220px] flex-1 flex-col border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] tracking-widest text-muted">{PROGRAM_LABELS[program.type]}</p>
                {!isBlind && program.config.pattern && (
                  <span className="text-[10px] text-muted/50">
                    {program.config.pattern.replace(/_/g, ' ').toLowerCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-2">
                {assignments.map((a) => (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between gap-3 border px-3 py-2 ${
                      a.completed ? 'border-border opacity-50' : 'border-border/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`truncate text-xs ${a.completed ? 'text-muted/60' : 'text-white'}`}>
                        {a.problem.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className={`text-[10px] ${DIFFICULTY_STYLE[a.problem.difficulty] ?? 'text-muted'}`}>
                          {a.problem.difficulty.toLowerCase()}
                        </span>
                        {!isBlind && (
                          <span className="text-[10px] text-muted/40">
                            {a.problem.pattern.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        )}
                        {a.overdue && !a.completed && (
                          <span className="text-[10px] text-warning">overdue</span>
                        )}
                      </div>
                    </div>
                    {a.completed ? (
                      <span className="shrink-0 text-[10px] text-success">✓</span>
                    ) : (
                      <button
                        onClick={() => startAssignment(a.id, a.sessionId)}
                        disabled={!!starting}
                        className="shrink-0 border border-accent px-3 py-1 text-[10px] text-accent transition hover:bg-accent hover:text-white disabled:opacity-40"
                      >
                        {starting === a.id ? '…' : a.sessionId ? 'resume' : 'start'}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {allDone && (
                <p className="mt-3 text-[10px] text-success/70">all done for today ✓</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
