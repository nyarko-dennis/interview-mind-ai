import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
  ALL_PATTERNS,
  PATTERN_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  xpToNextLevel,
} from '@/lib/dojo-constants';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

type ProgressRow = {
  key: string;
  status: string;
  level: number;
  xp: number;
  avgScore: number;
  attemptsCount: number;
};

export default async function PatternsPage() {
  const authSession = await auth();
  if (!authSession?.apiToken) redirect('/login');

  const headers = { Authorization: `Bearer ${authSession.apiToken}` };

  const progressRes = await fetch(`${API}/dojo/progress`, { headers, cache: 'no-store' });
  const progressRows: ProgressRow[] = progressRes.ok ? await progressRes.json() : [];

  const progressMap = new Map(progressRows.filter((r) => r.key && typeof r.key === 'string').map((r) => [r.key, r]));

  // Sort: LOCKED last, then by status priority, then by avg score asc (weakest first)
  const STATUS_ORDER: Record<string, number> = {
    TRAINING: 0,
    INTERVIEW_READY: 1,
    GUIDED_PASSED: 2,
    MASTERED: 3,
    LOCKED: 4,
  };

  const sorted = [...ALL_PATTERNS].sort((a, b) => {
    const pa = progressMap.get(a);
    const pb = progressMap.get(b);
    const sa = STATUS_ORDER[pa?.status ?? 'LOCKED'] ?? 4;
    const sb = STATUS_ORDER[pb?.status ?? 'LOCKED'] ?? 4;
    if (sa !== sb) return sa - sb;
    return (pa?.avgScore ?? 0) - (pb?.avgScore ?? 0);
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <p className="mb-1 text-[10px] tracking-widest text-muted">$ dojo patterns --list</p>
        <h1 className="text-xl font-bold text-white">Pattern Library</h1>
        <p className="mt-1 text-xs text-muted">
          20 algorithmic patterns. Weakest active patterns shown first.
          Reach level 3 through drills to unlock Guided interviews.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {sorted.map((pattern) => {
          const p = progressMap.get(pattern);
          const status = p?.status ?? 'LOCKED';
          const xpInfo = p ? xpToNextLevel(p.xp) : null;

          return (
            <Link
              key={pattern}
              href={`/dojo/patterns/${pattern}`}
              className="flex flex-col justify-between border border-border p-4 transition hover:border-accent/50"
            >
              <div className="mb-3 flex items-start justify-between">
                <span className="text-sm font-medium text-white leading-tight">
                  {PATTERN_LABELS[pattern]}
                </span>
                <span className={`ml-2 shrink-0 border px-1.5 py-0.5 text-[9px] tracking-widest ${STATUS_COLORS[status] ?? 'text-muted border-border'}`}>
                  {STATUS_LABELS[status] ?? status}
                </span>
              </div>

              {p && p.status !== 'LOCKED' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-muted">
                    <span>Lv.{p.level}</span>
                    <span>{p.xp} XP · {p.attemptsCount} drill{p.attemptsCount !== 1 ? 's' : ''}</span>
                  </div>
                  {/* XP bar — only shown for levels 1-3 */}
                  {p.level < 4 && xpInfo && (
                    <div className="h-1 w-full bg-border/40">
                      <div
                        className="h-1 bg-accent/60"
                        style={{ width: `${xpInfo.pct}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {(!p || p.status === 'LOCKED') && (
                <span className="text-[10px] text-muted/40">start drilling to unlock →</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
