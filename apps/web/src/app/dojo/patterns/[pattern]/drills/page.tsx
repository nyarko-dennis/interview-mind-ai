import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { DrillCard } from '@/components/dojo/DrillCard';
import { PATTERN_LABELS, ALL_PATTERNS, xpToNextLevel } from '@/lib/dojo-constants';
import type { AlgorithmicPattern } from '@interview-mind/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Drill = { id: string; type: string; pattern: string | null; prompt: string; difficulty: string };
type ProgressRow = { key: string; category: string; status: string; level: number; xp: number; attemptsCount: number };

export default async function PatternDrillsPage({ params }: { params: Promise<{ pattern: string }> }) {
  const { pattern } = await params;
  const patternKey = pattern.toUpperCase() as AlgorithmicPattern;

  if (!ALL_PATTERNS.includes(patternKey)) notFound();

  const authSession = await auth();
  if (!authSession?.apiToken) redirect('/login');

  const headers = { Authorization: `Bearer ${authSession.apiToken}` };

  const [drillsRes, progressRes] = await Promise.all([
    fetch(`${API}/dojo/drills?type=PATTERN_ID&pattern=${patternKey}`, { headers, cache: 'no-store' }),
    fetch(`${API}/dojo/progress`, { headers, cache: 'no-store' }),
  ]);

  const drills: Drill[] = drillsRes.ok ? await drillsRes.json() : [];
  const allProgress: ProgressRow[] = progressRes.ok ? await progressRes.json() : [];

  const progress = allProgress.find((r) => r.category === 'PATTERN' && r.key === patternKey) ?? null;
  const xpInfo = progress ? xpToNextLevel(progress.xp) : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="flex items-center justify-between">
        <Link href={`/dojo/patterns/${pattern}`} className="text-xs text-muted hover:text-white">
          ← back to tips
        </Link>
        <span className="text-[10px] text-muted/50">no notes · test yourself</span>
      </div>

      <div className="mb-6 mt-4">
        <p className="text-[10px] tracking-widest text-muted">PATTERN · DRILLS</p>
        <h1 className="text-xl font-bold text-white">{PATTERN_LABELS[patternKey]}</h1>
        <p className="mt-0.5 text-xs text-muted">
          {drills.length} drill{drills.length !== 1 ? 's' : ''} · identify the pattern · earn XP
        </p>
      </div>

      {/* Compact progress — shows current state without dominating the page */}
      {progress && xpInfo && progress.level < 4 && (
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1">
            <div className="h-1 w-full bg-border/40">
              <div className="h-1 bg-accent/70" style={{ width: `${xpInfo.pct}%` }} />
            </div>
          </div>
          <span className="shrink-0 text-[10px] text-muted">
            Lv.{progress.level} · {progress.xp} XP · {progress.attemptsCount} attempt{progress.attemptsCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {drills.length > 0 ? (
        <div className="space-y-4">
          {drills.map((drill, i) => (
            <div key={drill.id}>
              <p className="mb-2 text-[10px] tracking-widest text-muted/50">
                DRILL {i + 1} of {drills.length}
              </p>
              <DrillCard
                drill={drill}
                placeholder="Name the algorithmic pattern and explain what signals in the problem led you to that conclusion…"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">No drills available for this pattern yet.</p>
      )}
    </div>
  );
}
