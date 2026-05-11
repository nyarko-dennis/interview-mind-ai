import Link from 'next/link';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-canvas px-6 py-8">
      <header className="mb-8 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-muted hover:text-white">
          ← Dashboard
        </Link>
        <h1 className="text-lg font-bold text-white">Profile</h1>
      </header>

      <div className="max-w-lg space-y-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Account</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Email</span>
              <span className="text-white">—</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Tier</span>
              <span className="text-accent">Novice</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Persona</span>
              <span className="text-white">—</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Default Mode</span>
              <span className="text-white">Mentor</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Session History</h2>
          <p className="text-sm text-muted">No sessions yet.</p>
        </div>
      </div>
    </div>
  );
}
