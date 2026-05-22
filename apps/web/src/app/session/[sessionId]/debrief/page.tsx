import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { DebriefView } from '@/components/session/DebriefView';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface ScoreData {
  total: number;
  correctness: number;
  efficiency: number;
  communication: number;
  independence: number;
  debriefReport: string;
}

interface SessionData {
  id: string;
  startedAt: string;
  completedAt: string | null;
  maxHintLevel: number;
  problem: {
    title: string;
    difficulty: string;
    pattern: string;
  };
  score: ScoreData | null;
}

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function DebriefPage({ params }: Props) {
  const { sessionId } = await params;
  const session = await auth();

  const res = await fetch(`${API}/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${session?.apiToken ?? ''}` },
    cache: 'no-store',
  });

  if (!res.ok) notFound();

  const data: SessionData = await res.json();

  return (
    <DebriefView
      sessionId={sessionId}
      problem={data.problem}
      startedAt={data.startedAt}
      completedAt={data.completedAt}
      maxHintLevel={data.maxHintLevel}
      initialScore={data.score}
    />
  );
}
