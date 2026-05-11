import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function DojoLayout({ children }: { children: React.ReactNode }) {
  const authSession = await auth();
  if (!authSession?.apiToken) redirect('/login');

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <nav className="flex h-10 shrink-0 items-center border-b border-border px-6">
        <span className="text-xs font-bold tracking-widest">
          <span className="text-white">INTERVIEWMIND</span>
          <span className="text-accent">.AI</span>
        </span>
        <span className="mx-3 text-border">·</span>
        <Link href="/dashboard" className="text-xs text-muted transition hover:text-white">
          dashboard
        </Link>
        <span className="mx-2 text-border/50">·</span>
        <Link href="/dojo" className="text-xs text-muted transition hover:text-white">
          dojo
        </Link>
        <span className="mx-2 text-border/50">·</span>
        <Link href="/dojo/patterns" className="text-xs text-muted transition hover:text-white">
          patterns
        </Link>
        <span className="mx-2 text-border/50">·</span>
        <Link href="/dojo/phases" className="text-xs text-muted transition hover:text-white">
          phases
        </Link>
        <span className="mx-2 text-border/50">·</span>
        <Link href="/free-practice" className="text-xs text-muted transition hover:text-white">
          free practice
        </Link>
      </nav>
      {children}
    </div>
  );
}
