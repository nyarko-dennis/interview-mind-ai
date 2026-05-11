import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { TipBlock } from '@/components/dojo/TipBlock';
import {
  PATTERN_LABELS,
  ALL_PATTERNS,
  STATUS_LABELS,
  STATUS_COLORS,
  xpToNextLevel,
} from '@/lib/dojo-constants';
import type { AlgorithmicPattern } from '@interview-mind/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Tip = { id: string; title: string; body: string };
type ProgressRow = {
  key: string;
  category: string;
  status: string;
  level: number;
  xp: number;
  avgScore: number;
  attemptsCount: number;
};

export default async function PatternTipsPage({ params }: { params: Promise<{ pattern: string }> }) {
  const { pattern } = await params;
  const patternKey = pattern.toUpperCase() as AlgorithmicPattern;

  if (!ALL_PATTERNS.includes(patternKey)) notFound();

  const authSession = await auth();
  if (!authSession?.apiToken) redirect('/login');

  const headers = { Authorization: `Bearer ${authSession.apiToken}` };

  const [tipsRes, progressRes] = await Promise.all([
    fetch(`${API}/dojo/tips?category=PATTERN&key=${patternKey}`, { headers, cache: 'no-store' }),
    fetch(`${API}/dojo/progress`, { headers, cache: 'no-store' }),
  ]);

  const tips: Tip[] = tipsRes.ok ? await tipsRes.json() : [];
  const allProgress: ProgressRow[] = progressRes.ok ? await progressRes.json() : [];

  const progress = allProgress.find((r) => r.category === 'PATTERN' && r.key === patternKey) ?? null;
  const status = progress?.status ?? 'LOCKED';
  const xpInfo = progress ? xpToNextLevel(progress.xp) : null;
  const isInterviewReady = ['INTERVIEW_READY', 'GUIDED_PASSED', 'MASTERED'].includes(status);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <Link href="/dojo/patterns" className="text-xs text-muted hover:text-white">
        ← patterns
      </Link>

      <div className="mb-6 mt-4 flex items-start justify-between">
        <div>
          <p className="text-[10px] tracking-widest text-muted">PATTERN · TIPS</p>
          <h1 className="text-xl font-bold text-white">{PATTERN_LABELS[patternKey]}</h1>
        </div>
        <span className={`border px-2 py-1 text-[10px] tracking-widest ${STATUS_COLORS[status] ?? 'text-muted border-border'}`}>
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>

      {/* Progress bar */}
      {progress && progress.level < 4 && xpInfo && (
        <div className="mb-6 border border-border p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted">Level {progress.level}</span>
            <span className="text-muted">{xpInfo.current} / {xpInfo.next} XP</span>
          </div>
          <div className="h-1.5 w-full bg-border/40">
            <div className="h-1.5 bg-accent transition-all" style={{ width: `${xpInfo.pct}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted/50">
            <span>Lv.1</span>
            <span>Lv.2 · 30 XP</span>
            <span>Lv.3 · 80 XP → interview</span>
          </div>
          {progress.attemptsCount > 0 && (
            <p className="mt-2 text-[10px] text-muted/60">
              {progress.attemptsCount} drill{progress.attemptsCount !== 1 ? 's' : ''} completed · {Math.round(progress.avgScore)} avg score
            </p>
          )}
        </div>
      )}

      {status === 'MASTERED' && (
        <div className="mb-6 border border-white/20 bg-accent/5 p-4 text-center">
          <p className="text-sm font-semibold text-white">✦ Mastered</p>
          <p className="mt-0.5 text-xs text-muted">Passed both Guided and Strict interviews.</p>
        </div>
      )}

      {/* Interview unlock CTA */}
      {isInterviewReady && status !== 'MASTERED' && (
        <div className="mb-6 border border-accent/30 bg-accent/5 p-4">
          <p className="mb-1 text-xs font-semibold text-white">
            {status === 'GUIDED_PASSED' ? 'Strict interview available — final boss' : 'Guided interview unlocked'}
          </p>
          <p className="mb-3 text-xs text-muted">
            {status === 'GUIDED_PASSED'
              ? 'Pass the Strict interview to achieve mastery.'
              : "You've reached level 3. Take the Guided interview to advance."}
          </p>
          <Link
            href={`/session/new?pattern=${patternKey}&mode=${status === 'GUIDED_PASSED' ? 'STRICT' : 'GUIDED'}`}
            className="inline-block border border-accent px-5 py-2 text-xs tracking-widest text-accent transition hover:bg-accent hover:text-white"
          >
            START {status === 'GUIDED_PASSED' ? 'STRICT' : 'GUIDED'} INTERVIEW →
          </Link>
        </div>
      )}

      {/* Tips */}
      {tips.length > 0 ? (
        <section className="space-y-4">
          {tips.map((tip) => (
            <TipBlock key={tip.id} title={tip.title} body={tip.body} />
          ))}
        </section>
      ) : (
        <p className="text-xs text-muted">No tips found for this pattern.</p>
      )}

      {/* Drill CTA */}
      <div className="mt-10 border-t border-border pt-6">
        <p className="mb-1 text-xs text-muted">
          Study the guide above, then test your pattern recognition.
        </p>
        <Link
          href={`/dojo/patterns/${pattern}/drills`}
          className="inline-block border border-accent px-6 py-2.5 text-xs tracking-widest text-accent transition hover:bg-accent hover:text-white"
        >
          READY TO DRILL →
        </Link>
      </div>
    </div>
  );
}
