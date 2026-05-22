'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store';
import type { DebriefScore } from '@/lib/store';

const DIMENSIONS: { key: keyof Omit<DebriefScore, 'total' | 'debriefReport'>; label: string }[] = [
  { key: 'correctness', label: 'correctness' },
  { key: 'efficiency', label: 'efficiency' },
  { key: 'communication', label: 'communication' },
  { key: 'independence', label: 'independence' },
];

function toFifths(score: number) {
  return (score / 100 * 5).toFixed(1);
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const DEBRIEF_SECTIONS: { key: string; label: string }[] = [
  { key: 'complexity',    label: '// complexity' },
  { key: 'edgeCases',     label: '// edge cases' },
  { key: 'communication', label: '// communication' },
  { key: 'improvement',   label: '// improvement' },
];

function DebriefSections({ raw }: { raw: string }) {
  let parsed: Record<string, string> | null = null;
  try {
    const json = JSON.parse(raw);
    if (typeof json === 'object' && json !== null) parsed = json as Record<string, string>;
  } catch {}

  if (!parsed) {
    return (
      <>
        <p className="mb-2 text-[10px] tracking-widest text-muted/60">// debrief</p>
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted">{raw}</p>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {DEBRIEF_SECTIONS.map(({ key, label }) =>
        parsed![key] ? (
          <div key={key}>
            <p className="mb-1 text-[10px] tracking-widest text-muted/60">{label}</p>
            <p className="text-xs leading-relaxed text-muted">{parsed![key]}</p>
          </div>
        ) : null,
      )}
    </div>
  );
}

interface Props {
  problemTitle: string;
  elapsed: number;
  sessionId: string;
}

export function DebriefPanel({ problemTitle, elapsed, sessionId }: Props) {
  const router = useRouter();
  const { debriefData, debriefError } = useSessionStore();
  const [nextSessionId, setNextSessionId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('imQueue');
      if (!raw) return;
      const q = JSON.parse(raw) as { ids: string[]; goalMinutes: number };
      const idx = q.ids.indexOf(sessionId);
      if (idx >= 0 && idx < q.ids.length - 1) {
        setNextSessionId(q.ids[idx + 1]);
      }
    } catch {}
  }, [sessionId]);

  function handleNext() {
    if (nextSessionId) {
      router.push(`/session/${nextSessionId}`);
    } else {
      sessionStorage.removeItem('imQueue');
      router.push('/dashboard');
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <p className="mb-1 text-[10px] tracking-widest text-muted">
          SESSION COMPLETE · {formatTime(elapsed)}
        </p>

        {debriefData ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="mb-5 text-xl font-semibold leading-tight text-white">
              {problemTitle}
              <span className="ml-3 text-accent">{toFifths(debriefData.total)}</span>
              <span className="text-muted"> / 5</span>
            </h2>

            <p className="mb-3 text-[10px] tracking-widest text-muted">EVALUATION · RUBRIC</p>
            <div className="mb-6 space-y-3">
              {DIMENSIONS.map(({ key, label }, i) => {
                const score = debriefData[key];
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted/70">{label}</span>
                      <span className="text-white/80">{toFifths(score)} / 5</span>
                    </div>
                    <div className="h-0.5 w-full bg-border">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ duration: 0.5, delay: i * 0.08 }}
                        className="h-0.5 bg-accent"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <DebriefSections raw={debriefData.debriefReport} />
          </motion.div>
        ) : (
          <div>
            <h2 className="mb-6 text-xl font-semibold text-white">{problemTitle}</h2>
            {debriefError ? (
              <>
                <p className="mb-2 text-[10px] tracking-widest text-danger/80">// debrief failed</p>
                <p className="text-xs text-muted">{debriefError}</p>
              </>
            ) : (
              <>
                <p className="mb-4 text-[10px] tracking-widest text-muted/60">// generating debrief…</p>
                <div className="space-y-4">
                  {[75, 55, 65, 45].map((w, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="h-1.5 w-16 animate-pulse bg-border" />
                      <div className="h-0.5 animate-pulse bg-border" style={{ width: `${w}%` }} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-6 py-4">
        <div className="flex gap-3">
          <button
            onClick={() => { sessionStorage.removeItem('imQueue'); router.push('/dashboard'); }}
            className="flex-1 border border-border py-2 text-xs text-muted transition hover:border-accent hover:text-white"
          >
            dashboard
          </button>
          <button
            onClick={handleNext}
            className="flex-1 border border-accent py-2 text-xs text-accent transition hover:bg-accent hover:text-white"
          >
            {nextSessionId ? 'next problem →' : 'finish session →'}
          </button>
        </div>
      </div>
    </div>
  );
}
