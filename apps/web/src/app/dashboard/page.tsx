import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ---- types ----------------------------------------------------------------

type UserData = {
  id: string;
  displayName: string;
  tier: string;
  persona: string | null;
  preferredMode: string;
  onboardingComplete: boolean;
};

type SessionRow = {
  id: string;
  phase: string;
  startedAt: string;
  completedAt: string | null;
  problem: { title: string; difficulty: string; pattern: string } | null;
  score: { total: number; correctness: number } | null;
};

type ProgressRow = {
  pattern: string;
  problemsAttempted: number;
  avgScore: number;
};

type ProblemRow = {
  id: string;
  title: string;
  difficulty: string;
  pattern: string;
};

// ---- pattern display names ------------------------------------------------

const PATTERN_LABELS: Record<string, string> = {
  TWO_POINTERS: 'Two Pointers',
  SLIDING_WINDOW: 'Sliding Window',
  FAST_SLOW_POINTERS: 'Fast & Slow Pointers',
  BINARY_SEARCH: 'Binary Search',
  BFS: 'BFS',
  DFS_BACKTRACKING: 'DFS / Backtracking',
  DP_1D: 'Dynamic Prog. 1D',
  DP_2D: 'Dynamic Prog. 2D',
  MONOTONIC_STACK: 'Monotonic Stack',
  HEAP: 'Heap',
  INTERVALS: 'Intervals',
  UNION_FIND: 'Union-Find',
  TRIE: 'Trie',
  BIT_MANIPULATION: 'Bit Manipulation',
  LINKED_LISTS: 'Linked Lists',
  HASH_MAPS: 'Hash Maps',
  PREFIX_SUMS: 'Prefix Sums',
  GREEDY: 'Greedy',
  SORT_SEARCH: 'Sort & Search',
  MATH_GEOMETRY: 'Math & Geometry',
};

// ---- helpers --------------------------------------------------------------

function computeStreak(sessions: SessionRow[]): number {
  if (sessions.length === 0) return 0;
  const dates = new Set(sessions.map((s) => s.startedAt.slice(0, 10)));
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const startOffset = dates.has(todayStr) ? 0 : 1;
  let streak = 0;
  for (let i = startOffset; i < 366; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (dates.has(d.toISOString().slice(0, 10))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function toFifths(score: number) {
  return (score / 100 * 5).toFixed(1);
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

// ---- sub-components (server-rendered) ------------------------------------

function ScoreTrend({ sessions }: { sessions: SessionRow[] }) {
  const data = sessions
    .filter((s) => s.score !== null && s.completedAt)
    .slice(0, 30)
    .reverse();

  if (data.length < 2) {
    return (
      <div className="flex h-20 items-center">
        <p className="text-xs text-muted/50">Complete sessions to see your trend.</p>
      </div>
    );
  }

  const n = data.length;
  const pts = data.map((s, i) => ({
    x: (i / (n - 1)) * 100,
    y: (1 - s.score!.total / 100) * 100,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fillPath = `${linePath} L 100 100 L 0 100 Z`;

  return (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-20 w-full">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C63FF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6C63FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill="url(#trendFill)" />
        <path d={linePath} fill="none" stroke="#6C63FF" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted/50">
        <span>{fmtDate(data[0].startedAt)}</span>
        <span>{fmtDate(data[n - 1].startedAt)}</span>
      </div>
    </>
  );
}

function ActivityHeatmap({ sessions }: { sessions: SessionRow[] }) {
  const counts: Record<string, number> = {};
  for (const s of sessions) {
    const key = s.startedAt.slice(0, 10);
    counts[key] = (counts[key] || 0) + 1;
  }

  // Start on the Sunday that is ~52 weeks ago so every column = one week,
  // row 0 = Sunday, row 6 = Saturday (matches GitHub's layout).
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 51 * 7 - today.getDay());

  type Cell = { key: string; count: number; pad: boolean };
  const cells: Cell[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    cells.push({ key, count: counts[key] || 0, pad: false });
    cursor.setDate(cursor.getDate() + 1);
  }
  // Pad to exactly 52 columns
  while (cells.length < 52 * 7) cells.push({ key: '', count: 0, pad: true });

  // Month labels: one label per month, placed at the column where the 1st falls
  const monthLabels: Array<{ col: number; label: string }> = [];
  const seen = new Set<string>();
  cells.forEach((cell, i) => {
    if (cell.pad) return;
    const d = new Date(cell.key);
    if (d.getDate() === 1) {
      const mk = `${d.getFullYear()}-${d.getMonth()}`;
      if (!seen.has(mk)) {
        seen.add(mk);
        monthLabels.push({
          col: Math.floor(i / 7),
          label: d.toLocaleDateString('en', { month: 'short' }),
        });
      }
    }
  });

  // row 0=Sun · 1=Mon · 2=Tue · 3=Wed · 4=Thu · 5=Fri · 6=Sat
  const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return (
    <div className="flex w-full gap-2">
      {/* Day-of-week labels — offset down by 20px to sit beside the cell rows */}
      <div
        className="flex shrink-0 flex-col justify-around text-right"
        style={{ width: '26px', marginTop: '20px', height: '112px' }}
      >
        {DAY_LABELS.map((label, i) => (
          <span key={i} className="text-[10px] leading-none text-muted/50">
            {label}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        {/* Month labels share the same 52-column grid so they align exactly */}
        <div
          className="mb-1"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(52, 1fr)',
            gap: '3px',
            height: '16px',
          }}
        >
          {monthLabels.map(({ col, label }) => (
            <span
              key={col}
              className="overflow-hidden text-[10px] text-muted/60"
              style={{ gridColumn: col + 1, gridRow: 1 }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Activity cells */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: 'repeat(7, 1fr)',
            gridTemplateColumns: 'repeat(52, 1fr)',
            gridAutoFlow: 'column',
            gap: '3px',
            height: '112px',
          }}
        >
          {cells.map((cell, i) => (
            <div
              key={cell.key || `pad-${i}`}
              title={
                !cell.pad && cell.key
                  ? `${cell.key}: ${cell.count} session${cell.count !== 1 ? 's' : ''}`
                  : undefined
              }
              className={
                cell.pad
                  ? 'opacity-0'
                  : cell.count === 0
                  ? 'bg-border/40'
                  : cell.count === 1
                  ? 'bg-accent/35'
                  : cell.count === 2
                  ? 'bg-accent/60'
                  : 'bg-accent'
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- pattern radar --------------------------------------------------------
// Patterns ordered by family so adjacent axes on the radar are related.

const RADAR_ORDER = [
  'TWO_POINTERS', 'SLIDING_WINDOW', 'PREFIX_SUMS', 'SORT_SEARCH',
  'HASH_MAPS', 'BINARY_SEARCH', 'BFS', 'DFS_BACKTRACKING',
  'UNION_FIND', 'FAST_SLOW_POINTERS', 'LINKED_LISTS', 'DP_1D',
  'DP_2D', 'HEAP', 'MONOTONIC_STACK', 'INTERVALS',
  'TRIE', 'BIT_MANIPULATION', 'MATH_GEOMETRY', 'GREEDY',
] as const;

const RADAR_SHORT: Record<string, string> = {
  TWO_POINTERS: '2 Ptr', SLIDING_WINDOW: 'Slide', PREFIX_SUMS: 'Pfx',
  SORT_SEARCH: 'Sort', HASH_MAPS: 'Hash', BINARY_SEARCH: 'BSrch',
  BFS: 'BFS', DFS_BACKTRACKING: 'DFS', UNION_FIND: 'UFnd',
  FAST_SLOW_POINTERS: 'F&S', LINKED_LISTS: 'Link', DP_1D: 'DP1',
  DP_2D: 'DP2', HEAP: 'Heap', MONOTONIC_STACK: 'Stk', INTERVALS: 'Intvl',
  TRIE: 'Trie', BIT_MANIPULATION: 'Bits', MATH_GEOMETRY: 'Math', GREEDY: 'Grdy',
};

function PatternRadar({ progress }: { progress: ProgressRow[] }) {
  const scoreMap: Record<string, number> = {};
  for (const p of progress) scoreMap[p.pattern] = p.avgScore;

  const hasData = progress.some((p) => p.problemsAttempted > 0);
  if (!hasData) {
    return (
      <div className="flex h-40 items-center justify-center text-center">
        <p className="text-xs text-muted/50">
          Complete sessions across different
          <br />
          patterns to populate your radar.
        </p>
      </div>
    );
  }

  const cx = 100, cy = 100, r = 63, labelR = 83;
  const N = RADAR_ORDER.length;
  const angle = (i: number) => (2 * Math.PI * i) / N - Math.PI / 2;
  const ax = (i: number, f: number) => cx + r * f * Math.cos(angle(i));
  const ay = (i: number, f: number) => cy + r * f * Math.sin(angle(i));
  const pt = (i: number, f: number) => `${ax(i, f).toFixed(1)},${ay(i, f).toFixed(1)}`;

  const gridPolygons = [0.25, 0.5, 0.75, 1.0].map((level) =>
    RADAR_ORDER.map((_, i) => pt(i, level)).join(' '),
  );

  const scorePts = RADAR_ORDER.map((p, i) =>
    pt(i, (scoreMap[p] ?? 0) / 100),
  ).join(' ');

  return (
    <svg viewBox="0 0 200 200" className="w-full">
      {/* Grid rings */}
      {gridPolygons.map((pts, gi) => (
        <polygon
          key={gi}
          points={pts}
          fill="none"
          stroke="#2A2A45"
          strokeWidth={gi === 3 ? '0.75' : '0.4'}
        />
      ))}

      {/* Axis spokes */}
      {RADAR_ORDER.map((_, i) => (
        <line
          key={i}
          x1={cx} y1={cy}
          x2={ax(i, 1).toFixed(1)} y2={ay(i, 1).toFixed(1)}
          stroke="#2A2A45"
          strokeWidth="0.4"
        />
      ))}

      {/* Score polygon */}
      <polygon
        points={scorePts}
        fill="#6C63FF"
        fillOpacity="0.18"
        stroke="#6C63FF"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Axis labels */}
      {RADAR_ORDER.map((pattern, i) => {
        const a = angle(i);
        const lx = cx + labelR * Math.cos(a);
        const ly = cy + labelR * Math.sin(a);
        const anchor = lx < cx - 3 ? 'end' : lx > cx + 3 ? 'start' : 'middle';
        const attempted = (scoreMap[pattern] ?? 0) > 0;
        return (
          <text
            key={i}
            x={lx.toFixed(1)}
            y={ly.toFixed(1)}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize="5"
            fontFamily="'JetBrains Mono', monospace"
            fill={attempted ? '#8888AA' : '#2A2A45'}
          >
            {RADAR_SHORT[pattern] ?? pattern.slice(0, 5)}
          </text>
        );
      })}
    </svg>
  );
}

// ---- page -----------------------------------------------------------------

export default async function DashboardPage() {
  const authSession = await auth();
  if (!authSession?.apiToken) redirect('/login');

  const headers = { Authorization: `Bearer ${authSession.apiToken}` };

  const userRes = await fetch(`${API}/users/me`, { headers, cache: 'no-store' });
  if (!userRes.ok) redirect('/onboarding/calibration');
  const user: UserData = await userRes.json();
  if (!user.onboardingComplete) redirect('/onboarding/calibration');

  const [sessionsRes, progressRes, problemsRes] = await Promise.all([
    fetch(`${API}/sessions`, { headers, cache: 'no-store' }),
    fetch(`${API}/users/${user.id}/progress`, { headers, cache: 'no-store' }),
    fetch(`${API}/problems`, { cache: 'no-store' }),
  ]);

  const sessions: SessionRow[] = sessionsRes.ok ? await sessionsRes.json() : [];
  const progress: ProgressRow[] = progressRes.ok ? await progressRes.json() : [];
  const allProblems: ProblemRow[] = problemsRes.ok ? await problemsRes.json() : [];

  // Compute stats
  const completed = sessions.filter((s) => s.score !== null);
  const streak = computeStreak(sessions);
  const avgScore =
    completed.length > 0
      ? completed.reduce((sum, s) => sum + s.score!.total, 0) / completed.length
      : 0;
  const solved = completed.filter((s) => s.score!.correctness >= 50).length;

  // Focus areas — 3 weakest attempted patterns for the "WHERE TO INVEST" panel
  const focusAreas = [...progress]
    .filter((p) => p.problemsAttempted > 0)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 3);

  // Next up — first 4 problems (recommendation logic can layer on later)
  const nextUp = allProblems.slice(0, 4);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* Nav */}
      <nav className="flex h-10 shrink-0 items-center border-b border-border px-6">
        <span className="text-xs font-bold tracking-widest">
          <span className="text-white">INTERVIEWMIND</span>
          <span className="text-accent">.AI</span>
        </span>
        <span className="mx-3 text-border">·</span>
        <Link href="/profile" className="text-xs text-muted transition hover:text-white">
          profile
        </Link>
        <span className="mx-2 text-border/50">·</span>
        <Link href="/dashboard" className="text-xs text-white">
          sessions
        </Link>
        <span className="mx-2 text-border/50">·</span>
        <Link href="/session/new" className="text-xs text-muted transition hover:text-white">
          new session
        </Link>
        <span className="mx-2 text-border/50">·</span>
        <Link href="/dojo" className="text-xs text-muted transition hover:text-white">
          dojo
        </Link>
        <span className="ml-auto text-xs text-muted">{user.displayName.toLowerCase()}</span>
      </nav>

      {/* Hero */}
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-surface text-sm font-bold text-white">
            {getInitials(user.displayName)}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{user.displayName.toLowerCase()}</p>
            <p className="text-xs text-muted">
              {user.tier.toLowerCase()}
              {' · '}
              {user.preferredMode.toLowerCase()} mode
              {user.persona ? ` · ${user.persona.toLowerCase().replace('_', ' ')}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {(
            [
              { label: 'SESSIONS', value: String(sessions.length) },
              { label: 'STREAK', value: `${streak}d` },
              { label: 'AVG SCORE', value: avgScore > 0 ? toFifths(avgScore) : '—' },
              { label: 'SOLVED', value: `${solved}/${allProblems.length}` },
            ] as const
          ).map(({ label, value }) => (
            <div key={label} className="text-right">
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-[10px] tracking-widest text-muted">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main 3-col grid */}
      <div className="grid flex-1 grid-cols-[1fr_1fr_220px] divide-x divide-border border-b border-border">
        {/* Score trend */}
        <div className="p-5">
          <p className="mb-3 text-[10px] tracking-widest text-muted">SCORE TREND · 30d</p>
          <ScoreTrend sessions={sessions} />
        </div>

        {/* Pattern radar */}
        <div className="p-5">
          <p className="mb-1 text-[10px] tracking-widest text-muted">PATTERN MASTERY</p>
          <PatternRadar progress={progress} />
          {focusAreas.length > 0 && (
            <>
              <p className="mb-2 mt-3 text-[10px] tracking-widest text-muted">
                FOCUS · WHERE TO INVEST
              </p>
              <div className="space-y-2">
                {focusAreas.map((row) => (
                  <div key={row.pattern} className="flex items-center justify-between">
                    <span className="text-xs text-muted/70">
                      {PATTERN_LABELS[row.pattern] ?? row.pattern}
                    </span>
                    <span className="text-[10px] text-accent">{toFifths(row.avgScore)} / 5</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Next up */}
        <div className="flex flex-col p-5">
          <p className="mb-3 text-[10px] tracking-widest text-muted">NEXT UP</p>
          <div className="flex-1 space-y-2.5">
            {nextUp.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-xs text-white">{p.title}</span>
                <span className="ml-2 shrink-0 text-[10px] text-muted">
                  {p.difficulty.toLowerCase()}
                </span>
              </div>
            ))}
            {nextUp.length === 0 && (
              <p className="text-xs text-muted/50">No problems found.</p>
            )}
          </div>
          <Link
            href="/session/new"
            className="mt-4 block border border-accent py-2 text-center text-xs tracking-widest text-accent transition hover:bg-accent hover:text-white"
          >
            START NEXT SESSION →
          </Link>
        </div>
      </div>

      {/* Activity heatmap */}
      <div className="px-6 py-4">
        <p className="mb-3 text-[10px] tracking-widest text-muted">ACTIVITY · LAST 12 WEEKS</p>
        <ActivityHeatmap sessions={sessions} />
      </div>
    </div>
  );
}
