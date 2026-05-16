'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface Drill {
  id: string;
  type: string;
  pattern: string | null;
  prompt: string;
  difficulty: string;
}

interface AttemptResult {
  score: number;
  feedback: string;
  xpAwarded: number;
  newLevel: number;
  newXp: number;
  statusChange: { from: string; to: string } | null;
}

interface Props {
  drill: Drill;
  placeholder?: string;
}

const DIFFICULTY_CLS: Record<string, string> = {
  EASY: 'text-success',
  MEDIUM: 'text-warning',
  HARD: 'text-danger',
};

const TYPE_LABELS: Record<string, string> = {
  PATTERN_ID: 'Pattern Identification',
  CLARIFICATION: 'Clarification Drill',
  APPROACH: 'Approach Drill',
};

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 80 ? 'text-success border-success/40 bg-success/10' :
    score >= 50 ? 'text-warning border-warning/40 bg-warning/10' :
                  'text-danger border-danger/40 bg-danger/10';
  return (
    <span className={`border px-2 py-0.5 text-sm font-bold ${cls}`}>
      {score}
    </span>
  );
}

export function DrillCard({ drill, placeholder }: Props) {
  const { data: authSession } = useSession();
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!answer.trim() || loading || !authSession?.apiToken) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/dojo/attempts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authSession.apiToken}`,
        },
        body: JSON.stringify({ drillId: drill.id, answer: answer.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? 'Submission failed');
      }

      const data: AttemptResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setAnswer('');
    setResult(null);
    setError(null);
  }

  return (
    <div className="border border-border">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-widest text-muted">
            {TYPE_LABELS[drill.type] ?? drill.type}
          </span>
          {drill.pattern && (
            <>
              <span className="text-border">·</span>
              <span className="text-[10px] text-muted/60">{drill.pattern.replace(/_/g, ' ')}</span>
            </>
          )}
        </div>
        <span className={`text-[10px] tracking-widest ${DIFFICULTY_CLS[drill.difficulty] ?? 'text-muted'}`}>
          {drill.difficulty.toLowerCase()}
        </span>
      </div>

      {/* Prompt */}
      <div className="px-4 py-4">
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-white/90">
          {drill.prompt}
        </pre>
      </div>

      {/* Result */}
      {result ? (
        <div className="border-t border-border px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <ScoreBadge score={result.score} />
            <span className="text-xs text-muted">
              +{result.xpAwarded} XP · Level {result.newLevel} · {result.newXp} XP total
            </span>
          </div>

          {result.statusChange && (
            <div className="border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-accent">
              ✦ Status advanced: {result.statusChange.from} → {result.statusChange.to}
              {result.statusChange.to === 'INTERVIEW_READY' && (
                <span className="ml-1 text-muted">· Guided interview now unlocked</span>
              )}
            </div>
          )}

          <p className="text-xs leading-relaxed text-muted/90">{result.feedback}</p>

          <button
            onClick={reset}
            className="border border-border px-4 py-1.5 text-xs text-muted transition hover:border-accent hover:text-white"
          >
            try another →
          </button>
        </div>
      ) : (
        <div className="border-t border-border px-4 py-4 space-y-3">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={placeholder ?? 'Type your answer here…'}
            rows={drill.type === 'PATTERN_ID' ? 3 : 6}
            className="w-full resize-none border border-border bg-transparent px-3 py-2 font-mono text-xs text-white placeholder:text-muted/40 focus:border-accent focus:outline-none"
          />

          {error && <p className="text-xs text-danger">&gt; {error}</p>}

          <button
            onClick={submit}
            disabled={!answer.trim() || loading || !authSession}
            className="border border-accent px-5 py-2 text-xs tracking-widest text-accent transition hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'scoring…' : 'SUBMIT FOR SCORING →'}
          </button>
        </div>
      )}
    </div>
  );
}
