import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { TipBlock } from '@/components/dojo/TipBlock';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const VALID_PHASES = ['CLARIFICATION', 'APPROACH', 'IMPLEMENTATION'] as const;

type Tip = { id: string; title: string; body: string; mode: string };

export default async function PhaseTipsPage({ params }: { params: Promise<{ phase: string }> }) {
  const { phase } = await params;
  const phaseKey = phase.toUpperCase();

  if (!VALID_PHASES.includes(phaseKey as typeof VALID_PHASES[number])) notFound();

  const authSession = await auth();
  if (!authSession?.apiToken) redirect('/login');

  const headers = { Authorization: `Bearer ${authSession.apiToken}` };

  const userRes = await fetch(`${API}/users/me`, { headers, cache: 'no-store' });
  const user = userRes.ok ? await userRes.json() : null;
  const mode: string = user?.preferredMode ?? 'GUIDED';

  const tipsRes = await fetch(
    `${API}/dojo/tips?category=PHASE&key=${phaseKey}&mode=${mode}`,
    { headers, cache: 'no-store' },
  );
  const tips: Tip[] = tipsRes.ok ? await tipsRes.json() : [];

  const phaseLabel = phaseKey.charAt(0) + phaseKey.slice(1).toLowerCase();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <Link href="/dojo/phases" className="text-xs text-muted hover:text-white">
        ← phases
      </Link>

      <div className="mb-6 mt-4">
        <p className="text-[10px] tracking-widest text-muted">PHASE · TIPS</p>
        <h1 className="text-xl font-bold text-white">{phaseLabel}</h1>
        <p className="mt-0.5 text-[10px] text-muted/60">
          Tips for <span className="text-accent">{mode.toLowerCase()}</span> mode
        </p>
      </div>

      {tips.length > 0 ? (
        <section className="space-y-4">
          {tips.map((tip) => (
            <TipBlock key={tip.id} title={tip.title} body={tip.body} />
          ))}
        </section>
      ) : (
        <p className="text-xs text-muted">No tips found for this phase.</p>
      )}

      {/* Drill CTA — separated from tips so the intent is unambiguous */}
      <div className="mt-10 border-t border-border pt-6">
        <p className="mb-1 text-xs text-muted">
          Read through the tips above, then close your notes and test yourself.
        </p>
        <Link
          href={`/dojo/phases/${phase}/drills`}
          className="inline-block border border-accent px-6 py-2.5 text-xs tracking-widest text-accent transition hover:bg-accent hover:text-white"
        >
          READY TO DRILL →
        </Link>
      </div>
    </div>
  );
}
