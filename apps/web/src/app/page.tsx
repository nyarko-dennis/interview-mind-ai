import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';

export default async function Home() {
  const session = await auth();
  if (session) redirect('/dashboard');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <p className="mb-3 text-xs tracking-widest text-muted">$ initialize_session.sh</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          INTERVIEWMIND<span className="text-accent">.AI</span>
        </h1>
        <p className="mt-3 max-w-sm text-sm text-muted">
          Socratic mock interviews that coach your thinking — not just grade your code.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/onboarding/calibration"
          className="border border-accent px-6 py-2.5 text-sm text-accent transition hover:bg-accent hover:text-white"
        >
          get started →
        </Link>
        <Link
          href="/login"
          className="border border-border px-6 py-2.5 text-sm text-muted transition hover:border-accent hover:text-white"
        >
          sign in
        </Link>
      </div>
    </main>
  );
}
