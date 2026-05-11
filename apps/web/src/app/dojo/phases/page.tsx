import Link from 'next/link';

const PHASES = [
  {
    key: 'CLARIFICATION',
    label: 'Clarification',
    description:
      'Learn what questions to ask, in what order, and how to state assumptions confidently. The most underrated phase in interviews.',
    tips: ['Constraint questions', 'Output format', 'Edge case identification', 'Time-boxing'],
  },
  {
    key: 'APPROACH',
    label: 'Approach',
    description:
      'Practice describing your solution before touching the keyboard. Cover brute force, optimization, complexity, and edge cases.',
    tips: ['Brute force first', 'Complexity targets', 'State invariants', 'Trace an example'],
  },
  {
    key: 'IMPLEMENTATION',
    label: 'Implementation',
    description:
      'Sharpen your coding habits — readable names, top-to-bottom flow, self-review before submitting. Bugs you catch yourself don\'t count against you.',
    tips: ['Variable naming', 'Base cases upfront', 'Self-review loop', 'Common bug patterns'],
  },
];

export default function PhasesPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="mb-8">
        <p className="mb-1 text-[10px] tracking-widest text-muted">$ dojo phases</p>
        <h1 className="text-xl font-bold text-white">Phase Training</h1>
        <p className="mt-1 text-xs text-muted">
          Interview phases are independent skills. Pick one to study tips and practice drills.
        </p>
      </div>

      <div className="space-y-3">
        {PHASES.map((phase, i) => (
          <Link
            key={phase.key}
            href={`/dojo/phases/${phase.key}`}
            className="block border border-border p-5 transition hover:border-accent/50"
          >
            <div className="mb-2 flex items-center gap-3">
              <span className="text-[10px] tracking-widest text-muted/50">0{i + 1}</span>
              <h2 className="text-sm font-semibold text-white">{phase.label}</h2>
            </div>
            <p className="mb-3 text-xs text-muted">{phase.description}</p>
            <div className="flex flex-wrap gap-2">
              {phase.tips.map((tip) => (
                <span key={tip} className="border border-border px-2 py-0.5 text-[10px] text-muted/70">
                  {tip}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
