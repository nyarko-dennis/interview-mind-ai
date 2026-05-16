import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { DrillCard } from '@/components/dojo/DrillCard';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

const VALID_PHASES = ['CLARIFICATION', 'APPROACH', 'IMPLEMENTATION'] as const;

const CLARIFICATION_PLACEHOLDER =
  'Write your clarifying questions grouped by type: input understanding, output format, edge cases, and constraints. Aim for at least 2–3 questions per group.';

const APPROACH_SECTIONS = [
  {
    type: 'APPROACH_NAIVE',
    label: 'Brute Force',
    placeholder: 'Describe your naive solution. State its time complexity and explain specifically why it is suboptimal.',
  },
  {
    type: 'APPROACH_IMPROVE',
    label: 'Improved',
    placeholder: 'Describe how you improve the brute force. Name the key insight or data structure, and state the new time and space complexity.',
  },
  {
    type: 'APPROACH_OPTIMAL',
    label: 'Optimal',
    placeholder: 'Is there a further optimal solution, or is your improvement already optimal? State the final complexity and explain why it cannot be improved further.',
  },
] as const;

type Drill = { id: string; type: string; pattern: string | null; prompt: string; difficulty: string };

async function fetchDrills(type: string, headers: Record<string, string>): Promise<Drill[]> {
  const res = await fetch(`${API}/dojo/drills?type=${type}`, { headers, cache: 'no-store' });
  return res.ok ? res.json() : [];
}

export default async function PhaseDrillsPage({ params }: { params: Promise<{ phase: string }> }) {
  const { phase } = await params;
  const phaseKey = phase.toUpperCase();

  if (!VALID_PHASES.includes(phaseKey as typeof VALID_PHASES[number])) notFound();

  const authSession = await auth();
  if (!authSession?.apiToken) redirect('/login');

  const headers = { Authorization: `Bearer ${authSession.apiToken}` };
  const phaseLabel = phaseKey.charAt(0) + phaseKey.slice(1).toLowerCase();

  if (phaseKey === 'CLARIFICATION' || phaseKey === 'IMPLEMENTATION') {
    const type = phaseKey === 'CLARIFICATION' ? 'CLARIFICATION' : 'APPROACH_NAIVE';
    const drills = await fetchDrills(type, headers);

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
                <DrillCard drill={drill} placeholder={CLARIFICATION_PLACEHOLDER} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted">No drills available for this phase yet.</p>
        )}
      </div>
    );
  }

  // APPROACH — fetch all three sub-step drill types in parallel
  const [naiveDrills, improveDrills, optimalDrills] = await Promise.all(
    APPROACH_SECTIONS.map((s) => fetchDrills(s.type, headers)),
  );
  const sectionDrills = [naiveDrills, improveDrills, optimalDrills];
  const totalDrills = sectionDrills.reduce((n, d) => n + d.length, 0);

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
          {totalDrills} drill{totalDrills !== 1 ? 's' : ''} · 3 steps · AI scored · COACH feedback
        </p>
      </div>

      <div className="space-y-10">
        {APPROACH_SECTIONS.map((section, si) => {
          const drills = sectionDrills[si];
          return (
            <div key={section.type}>
              <div className="mb-4 flex items-center gap-3">
                <span className="text-[10px] font-bold tracking-widest text-accent">
                  STEP {si + 1}
                </span>
                <span className="text-sm font-semibold text-white">{section.label}</span>
              </div>
              {drills.length > 0 ? (
                <div className="space-y-4">
                  {drills.map((drill, i) => (
                    <div key={drill.id}>
                      <p className="mb-2 text-[10px] tracking-widest text-muted/50">
                        DRILL {i + 1} of {drills.length}
                      </p>
                      <DrillCard drill={drill} placeholder={section.placeholder} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">No drills available for this step yet.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
