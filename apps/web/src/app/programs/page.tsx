import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ProgramsClient } from './ProgramsClient';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export type ProgramType = 'DAILY_SPRINT' | 'DEEP_DIVE' | 'INTERVIEW_SIM';

export interface UserProgram {
  id: string;
  type: ProgramType;
  config: { pattern?: string };
  active: boolean;
}

export default async function ProgramsPage() {
  const session = await auth();
  if (!session?.apiToken) redirect('/login');

  const res = await fetch(`${API}/programs`, {
    headers: { Authorization: `Bearer ${session.apiToken}` },
    cache: 'no-store',
  });

  const enrolled: UserProgram[] = res.ok ? await res.json() : [];

  return (
    <ProgramsClient
      apiToken={session.apiToken}
      enrolled={enrolled}
    />
  );
}
