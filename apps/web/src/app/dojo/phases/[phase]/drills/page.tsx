import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { DrillCard } from '@/components/dojo/DrillCard';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const VALID_PHASES = ['CLARIFICATION', 'APPROACH', 'IMPLEMENTATION'] as const;

const DRILL_TYPE: Record<string, string> = {
  CLARIFICATION: 'CLARIFICATION',
  APPROACH: 'APPROACH',
  IMPLEMENTATION: 'APPROACH', // implementation uses approach-style drills
};

const PLACEHOLDERS: Record<string, string> = {
  CLARIFICATION: 'Write your clarifying questions in priority order. For each, note briefly what it changes about your approach…',
  APPROACH: 'Describe your approach as if talking to an interviewer before coding. Cover brute force, optimization, complexity, and edge cases…',
  IMPLEMENTATION: 'Describe the implementation steps, naming conventions, and self-review habits you would apply…',
};

type Drill = { id: string; type: string; pattern: string | null; prompt: string; difficulty: string };

export default async function PhaseDrillsPage({ params }: { params: Promise<{ phase: string }> }) {
  const { phase } = await params;
  const phaseKey = phase.toUpperCase();

  if (!VALID_PHASES.includes(phaseKey as typeof VALID_PHASES[number])) notFound();

  const authSession = await auth();
  if (!authSession?.apiToken) redirect('/login');

  const headers = { Authorization: `Bearer ${authSession.apiToken}` };

  const drillType = DRILL_TYPE[phaseKey];
  const drillsRes = await fetch(
    `${API}/dojo/drills?type=${drillType}`,
    { headers, cache: 'no-store' },
  );
  const drills: Drill[] = drillsRes.ok ? await drillsRes.json() : [];

  const phaseLabel = phaseKey.charAt(0) + phaseKey.slice(1).toLowerCase();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="flex items-center justify-between">
        <Link href={`/dojo/phases/${phase}`} className="text-xs text-muted hover:text-white">
          ← back to tips
        </Link>
        <span className="text-[10px] text-muted/50">no notes · test yourself</span>
      </div>

      <div className="mb-6 mt-4">
        <p className="text-[10px] tracking-widest text-muted">PHASE · DRILLS</p>
        <h1 className="text-xl font-bold text-white">{phaseLabel}</h1>
        <p className="mt-0.5 text-xs text-muted">
          {drills.length} drill{drills.length !== 1 ? 's' : ''} · AI scored · COACH feedback
        </p>
      </div>

      {drills.length > 0 ? (
        <div className="space-y-4">
          {drills.map((drill, i) => (
            <div key={drill.id}>
              <p className="mb-2 text-[10px] tracking-widest text-muted/50">
                DRILL {i + 1} of {drills.length}
              </p>
              <DrillCard drill={drill} placeholder={PLACEHOLDERS[phaseKey]} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">No drills available for this phase yet.</p>
      )}
    </div>
  );
}
