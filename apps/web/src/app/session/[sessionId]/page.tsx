import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { SessionArena } from '@/components/session/SessionArena';
import type { SessionPhase } from '@interview-mind/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface SessionData {
  id: string;
  phase: SessionPhase;
  mode: string;
  startedAt: string;
  problem: {
    id: string;
    title: string;
    statement: string;
    hintCeiling: number;
    pattern: string;
    difficulty: string;
    functionStub: string | null;
    functionStubs: Record<string, string> | null;
  };
}

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionPage({ params }: Props) {
  const { sessionId } = await params;
  const session = await auth();
  const headers = { Authorization: `Bearer ${session?.apiToken ?? ''}` };

  const [res, xpRes] = await Promise.all([
    fetch(`${API}/sessions/${sessionId}`, { headers, cache: 'no-store' }),
    fetch(`${API}/dojo/weekly-summary`, { headers, cache: 'no-store' }),
  ]);

  if (!res.ok) notFound();

  const data: SessionData = await res.json();
  const xpData = xpRes.ok ? await xpRes.json() : { totalXp: 0 };

  return (
    <SessionArena
      sessionId={data.id}
      problemTitle={data.problem.title}
      problemStatement={data.problem.statement}
      hintCeiling={data.problem.hintCeiling}
      initialPhase={data.phase}
      initialMode={data.mode as 'GUIDED' | 'STRICT'}
      difficulty={data.problem.difficulty}
      functionStub={data.problem.functionStub ?? undefined}
      functionStubs={data.problem.functionStubs ?? {}}
      sessionStartedAt={data.startedAt}
      initialXpBalance={xpData.totalXp ?? 0}
    />
  );
}
