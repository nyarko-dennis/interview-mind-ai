import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PATTERN_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/lib/dojo-constants';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

type WeeklySummary = {
  currentWeekXp: number;
  weeklyGoal: number;
  streakWeeks: number;
  goalMet: boolean;
  progressPct: number;
};

type WeakPattern = {
  key: string;
  status: string;
  level: number;
  xp: number;
  avgScore: number;
  blendedScore: number;
};

export default async function DojoPage() {
  const authSession = await auth();
  if (!authSession?.apiToken) redirect('/login');

  const headers = { Authorization: `Bearer ${authSession.apiToken}` };

  const [summaryRes, weakRes] = await Promise.all([
    fetch(`${API}/dojo/weekly-summary`, { headers, cache: 'no-store' }),
    fetch(`${API}/dojo/weak-patterns`, { headers, cache: 'no-store' }),
  ]);

  const summary: WeeklySummary = summaryRes.ok
    ? await summaryRes.json()
    : { currentWeekXp: 0, weeklyGoal: 50, streakWeeks: 0, goalMet: false, progressPct: 0 };

  const weakPatterns: WeakPattern[] = weakRes.ok ? await weakRes.json() : [];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-1 text-[10px] tracking-widest text-muted">$ dojo --status</p>
        <h1 className="text-xl font-bold text-white">Training Dojo</h1>
        <p className="mt-1 text-xs text-muted">
          Build skills pattern by pattern. Reach level 3 to unlock Guided interviews.
          Beat Strict to achieve mastery.
        </p>
      </div>

      {/* Weekly goal + streak */}
      <section className="mb-8 border border-border p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] tracking-widest text-muted">THIS WEEK</p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted">
              {summary.streakWeeks > 0 ? (
                <span className="text-accent">
                  {summary.streakWeeks} week streak {summary.streakWeeks >= 3 ? '🔥' : ''}
                </span>
              ) : (
                'no streak yet'
              )}
            </span>
            {summary.goalMet && (
              <span className="border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] tracking-widest text-success">
                GOAL MET
              </span>
            )}
          </div>
        </div>

        {/* XP progress bar */}
        <div className="mb-2 flex items-end justify-between">
          <span className="text-2xl font-bold text-white">{summary.currentWeekXp}</span>
          <span className="text-xs text-muted">/ {summary.weeklyGoal} XP goal</span>
        </div>
        <div className="h-1.5 w-full bg-border/40">
          <div
            className="h-1.5 bg-accent transition-all"
            style={{ width: `${summary.progressPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-muted/60">
          Complete drills to earn XP. 50 XP / week maintains your streak.
        </p>
      </section>

      {/* Weak patterns */}
      {weakPatterns.length > 0 && (
        <section className="mb-8">
          <p className="mb-3 text-[10px] tracking-widest text-muted">FOCUS · WEAKEST PATTERNS</p>
          <div className="space-y-2">
            {weakPatterns.map((p) => (
              <Link
                key={p.key}
                href={`/dojo/patterns/${p.key}`}
                className="flex items-center justify-between border border-border px-4 py-3 transition hover:border-accent/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white">
                    {PATTERN_LABELS[p.key as keyof typeof PATTERN_LABELS] ?? p.key}
                  </span>
                  <span className={`border px-1.5 py-0.5 text-[10px] tracking-widest ${STATUS_COLORS[p.status] ?? 'text-muted border-border'}`}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span>Lv.{p.level}</span>
                  <span>{Math.round(p.avgScore)} avg</span>
                  <span className="text-accent">drill →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick nav */}
      <section className="grid grid-cols-3 gap-3">
        {[
          { href: '/dojo/patterns', label: 'Pattern Library', sub: '20 patterns · identification drills' },
          { href: '/dojo/phases', label: 'Phase Training', sub: 'Clarification · Approach · Implementation' },
          { href: '/free-practice', label: 'Free Practice', sub: 'Any problem · no gating' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="border border-border p-4 transition hover:border-accent/50"
          >
            <p className="mb-1 text-sm font-semibold text-white">{item.label}</p>
            <p className="text-[10px] text-muted">{item.sub}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
