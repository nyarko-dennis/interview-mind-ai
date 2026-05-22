# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# All apps together (from root)
pnpm dev          # starts web (port 3000) and api (port 8000) in parallel via Turborepo
pnpm build        # builds shared → api → web in dependency order
pnpm lint
pnpm type-check

# Individual apps
pnpm --filter @interview-mind/web dev
pnpm --filter @interview-mind/api dev
pnpm --filter @interview-mind/shared build   # must run before api/web if types change

# Database (run from apps/api)
pnpm --filter @interview-mind/api db:generate   # generate migration from schema changes
pnpm --filter @interview-mind/api db:migrate    # apply migrations
pnpm --filter @interview-mind/api db:seed            # seed original 26 problems/hints
pnpm --filter @interview-mind/api db:seed-tests     # seed test-specific data
pnpm --filter @interview-mind/api db:seed-batch1    # TWO_POINTERS (29 problems)
pnpm --filter @interview-mind/api db:seed-batch2    # SLIDING_WINDOW (29 problems)
pnpm --filter @interview-mind/api db:seed-batch3    # BINARY_SEARCH (28 problems)
pnpm --filter @interview-mind/api db:seed-batch4    # BFS (29 problems)
pnpm --filter @interview-mind/api db:seed-batch5    # DFS_BACKTRACKING (29 problems)
pnpm --filter @interview-mind/api db:seed-batch6    # DP_1D (28 problems)
pnpm --filter @interview-mind/api db:seed-batch7    # HASH_MAPS (28 problems)
pnpm --filter @interview-mind/api db:seed-batch8    # DP_2D (29 problems)
pnpm --filter @interview-mind/api db:seed-batch9    # HEAP (29 problems)
pnpm --filter @interview-mind/api db:seed-batch10   # GREEDY (30 problems)
pnpm --filter @interview-mind/api db:seed-batch11   # INTERVALS (30 problems)
pnpm --filter @interview-mind/api db:seed-batch12   # MONOTONIC_STACK (30 problems)
pnpm --filter @interview-mind/api db:seed-batch13   # FAST_SLOW_POINTERS (30 problems)
pnpm --filter @interview-mind/api db:seed-batch14   # LINKED_LISTS (30 problems)
pnpm --filter @interview-mind/api db:seed-batch15   # PREFIX_SUMS (30 problems)
pnpm --filter @interview-mind/api db:seed-batch16   # SORT_SEARCH (30 problems)
pnpm --filter @interview-mind/api db:seed-batch17   # UNION_FIND (30 problems)
pnpm --filter @interview-mind/api db:seed-batch18   # TRIE (30 problems)
pnpm --filter @interview-mind/api db:seed-batch19   # BIT_MANIPULATION (30 problems)
pnpm --filter @interview-mind/api db:seed-batch20   # MATH_GEOMETRY (30 problems)
# All batch scripts are idempotent (onConflictDoNothing on slug)
pnpm --filter @interview-mind/api db:reset          # drop and recreate all tables
pnpm --filter @interview-mind/api db:studio         # Drizzle Studio GUI

# Piston (hosted on GCP VM deep-shop-prod, 136.119.99.101:2000)
# To redeploy: gcloud compute ssh deep-shop-prod --zone=us-central1-a --command="cd ~/piston && sudo docker compose up -d"
# To restart:  gcloud compute ssh deep-shop-prod --zone=us-central1-a --command="cd ~/piston && sudo docker compose restart"
# Runtimes are persisted in the piston-packages Docker volume — no reinstall needed after restart
```

## Architecture

Turborepo monorepo with three packages:
- `apps/web` — Next.js 15 + React 19 frontend
- `apps/api` — NestJS backend (REST + WebSocket)
- `packages/shared` — types, Zod schemas, and WS event constants shared by both apps

### Auth flow
NextAuth v5 (in `apps/web/src/auth.ts`) issues a custom HS256 JWT instead of the default JWE so the NestJS API can verify it directly using the shared `AUTH_SECRET`. The session callback mints a short-lived `apiToken` that the client passes as a WebSocket handshake auth token and as a `Bearer` header on REST calls. The NestJS side verifies it with `JwtStrategy` / `JwtGuard`.

OAuth providers: GitHub (required), Google (optional — `AUTH_GOOGLE_ID/SECRET` can be left empty locally).

### Onboarding flow
New users are routed through `/onboarding` before they can start sessions:
1. **calibration** — 10-question quiz; score maps to tier: ≤2 → NOVICE, ≤5 → DEVELOPING, ≤8 → PROFICIENT, 9–10 → ADVANCED
2. **persona** — `JOB_SEEKER | SKILL_BUILDER | STUDENT`
3. **mode** — `MENTOR` (hints enabled) or `SHADOW` (interviewer only observes)
4. **first-session** — guided first run

State is held in `apps/web/src/lib/onboarding-store.ts` (Zustand). `onboardingComplete` flag on the user record gates access to `/dashboard` and `/session`.

### Session FSM
Sessions advance through these phases in order: `IDLE → CLARIFICATION → APPROACH → IMPLEMENTATION → REVIEW → DEBRIEF`

Sessions are created with `phase: 'CLARIFICATION'` (IDLE is the DB schema default but never used at runtime). Phase transitions are enforced in `SessionService.assertPhase()` — calling any method out of order throws a `BadRequestException`. The WebSocket gateway (`SessionGateway`) drives transitions by calling `SessionService` methods and broadcasting `phase:change` events back to the client.

**Clarification category minimums** (questions must be judged substantive by AI):
- INPUT: 1, OUTPUT: 1, CONSTRAINTS: 1, EDGE_CASES: 2 — covering all four advances to APPROACH

**Clarification thresholds** (progressive guidance, PRD §9 Q4):
- Attempt 3: AI starts adding hints to feedback
- Attempt 5: score-impact warning shown
- Attempt 10: auto-advance to APPROACH as last resort

**IMPLEMENTATION check-ins**: during IMPLEMENTATION phase (MENTOR mode), the client can emit `checkin:request` and the server responds with one of 5 rotating static coaching prompts — no AI cost, no state change.

**Tier-gated difficulty**: NOVICE → EASY only; DEVELOPING → EASY/MEDIUM; PROFICIENT/ADVANCED → all difficulties. Enforced in `SessionService.isDifficultyAllowed()`.

### Real-time communication
WebSocket namespace `/session` (Socket.io). Client emits:
- `session:join` — joins a Socket.io room keyed on `sessionId`
- `clarification:submit`, `approach:submit`, `hint:request`, `code:submit`
- `checkin:request` — IMPLEMENTATION phase coaching prompt (MENTOR mode only)

Server emits (event names defined in `packages/shared/src/schemas/ws-events.ts`):
- `phase:change`, `clarification:result`, `approach:result`
- `hint:deliver` — static hint delivery
- `ai:stream:chunk` / `ai:stream:end` — streamed hint/check-in tokens; `ai:stream:end` payload includes `{level, isCeiling}` (hints) or `{level, isCeiling, type: 'checkin'}` (check-ins)
- `code:running`, `code:result`
- `review:result` — `{accepted: boolean, feedback: string}` after `review:submit`
- `debrief:ready` — full debrief report, emitted once per session after review acceptance
- `session:error` — error broadcast to room

Front-end socket wiring lives in `apps/web/src/lib/socket.ts`; the Zustand store (`apps/web/src/lib/store.ts`) consumes the events and drives UI.

### REST API
All routes under `http://localhost:8000`. JWT Bearer required unless noted.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sessions` | List sessions for authenticated user |
| POST | `/sessions` | Create a new session |
| GET | `/sessions/:id` | Get session by ID |
| GET | `/problems` | List problems (optional `?pattern=&difficulty=` filters) |
| GET | `/problems/:slug` | Get problem by slug |
| GET | `/users/me` | Authenticated user profile |
| POST | `/users/onboarding` | Complete onboarding (sets tier, persona, mode, calibrationScore) |
| GET | `/users/:id` | Get user by ID |
| GET | `/users/:id/progress` | Pattern progress stats (problemsAttempted, problemsSolved, avgScore, avgHintLevel) |
| GET | `/dojo/tips` | Tips/guidance (`?category=pattern\|phase&key=<key>&mode=ALL\|MENTOR\|SHADOW`) |
| GET | `/dojo/drills` | Drills by type/pattern (`?type=<drill_type>&pattern=<key>`) |
| POST | `/dojo/attempts` | Submit drill answer; returns score, XP delta, level change, status transition |
| GET | `/dojo/progress` | All dojo_progress rows for authenticated user |
| GET | `/dojo/weak-patterns` | Top 3 weakest patterns (blended interview + drill score) |
| GET | `/dojo/weekly-summary` | Gamification summary (weeklyXp, goal, streak, goalMet, progressPct) |

### Dojo
Pattern-based drill system for deliberate practice outside of live sessions. Lives in `apps/api/src/dojo/` and `apps/web/src/app/dojo/`.

**Patterns**: 20 algorithm patterns (TWO_POINTERS, SLIDING_WINDOW, BFS, DFS, DP_1D, DP_2D, UNION_FIND, etc.)

**Drill types**: `PATTERN_ID` (name the pattern), `CLARIFICATION`, `APPROACH_NAIVE`, `APPROACH_IMPROVE`, `APPROACH_OPTIMAL`

**Progress states**: `LOCKED → TRAINING → INTERVIEW_READY → GUIDED_PASSED → MASTERED` (levels 1–5, XP-based). Levels 4–5 are unlocked by interview performance only, not drills.

**XP model**:
- `PATTERN_ID` correct: 10 XP | wrong: 2 XP
- All other drills: `floor(score / 10)` XP (max 10)
- Level thresholds: L1 = 0–29 XP, L2 = 30–79 XP, L3 = 80+ XP → status becomes `INTERVIEW_READY`

**Gamification** (`user_gamification` table): weekly XP (resets Monday), streak weeks (consecutive weeks ≥50 XP), weekly goal (default 50 XP).

**Web routes**: `/dojo` (dashboard), `/dojo/patterns` (pattern library), `/dojo/patterns/[pattern]` (drill interface), `/dojo/phases` (phase trainers), `/dojo/phases/[phase]/drills`

### AI cost strategy
Two models are used (see `apps/api/src/ai/ai.service.ts`):
- **Haiku** (`claude-haiku-4-5-20251001`) — fast, cheap tasks: clarification eval, approach probing, hint streaming, all 5 Dojo drill-scoring methods (`scorePatternId`, `scoreClarificationDrill`, `scoreNaiveApproachDrill`, `scoreImprovedApproachDrill`, `scoreOptimalApproachDrill`)
- **Sonnet** (`claude-sonnet-4-6`) — debrief generation (higher quality, used once per session)

Local dev cost controls via env: `MAX_SESSIONS_PER_DAY`, `DEBRIEF_CACHE`.

### Code execution
`PistonService` submits code to a Piston instance hosted on GCP VM `deep-shop-prod` (`136.119.99.101:2000`) via a single synchronous POST to `/api/v2/execute` — no polling needed. Config and compose files live in `docker/piston/` — deployed to `~/piston/` on the VM. Piston is self-contained (no separate Postgres/Redis). Language runtimes (python 3.10, node 20, typescript 5, java 15, go 1.16, gcc 10) are persisted in the `piston-packages` Docker volume.

Supported languages: `python`, `javascript`, `typescript`, `java`, `cpp`, `go`.

### Scoring
`ScoringService` weights four dimensions (PRD §4.3):
- Correctness 40%, Efficiency 25%, Communication 20%, Independence 15%
- Independence degrades with hint level: L0=100%, L1=80%, L2=60%, L3=30%, L4=0%

After a session scores, `updatePatternProgress()` updates the `pattern_progress` table with running averages (avgScore, avgHintLevel) for that pattern — separate from the Dojo's `dojo_progress` which tracks drill XP.

### Problem Bank
600 problems seeded across all 20 patterns (30 per pattern = 10 Easy / 10 Medium / 10 Hard).

| Pattern | Total | Status |
|---------|-------|--------|
| TWO_POINTERS | 30 | ✅ Complete |
| SLIDING_WINDOW | 30 | ✅ Complete |
| BINARY_SEARCH | 30 | ✅ Complete |
| BFS | 30 | ✅ Complete |
| DFS_BACKTRACKING | 30 | ✅ Complete |
| DP_1D | 30 | ✅ Complete |
| HASH_MAPS | 30 | ✅ Complete |
| DP_2D | 30 | ✅ Complete |
| HEAP | 30 | ✅ Complete |
| GREEDY | 30 | ✅ Complete |
| INTERVALS | 30 | ✅ Complete |
| MONOTONIC_STACK | 30 | ✅ Complete |
| FAST_SLOW_POINTERS | 30 | ✅ Complete |
| LINKED_LISTS | 30 | ✅ Complete |
| PREFIX_SUMS | 30 | ✅ Complete |
| SORT_SEARCH | 30 | ✅ Complete |
| UNION_FIND | 30 | ✅ Complete |
| TRIE | 30 | ✅ Complete |
| BIT_MANIPULATION | 30 | ✅ Complete |
| MATH_GEOMETRY | 30 | ✅ Complete |

Seed scripts live in `apps/api/src/db/seed-problems-batch{1..20}.ts`. Each script is idempotent.

### Database
Drizzle ORM on PostgreSQL. Schema in `apps/api/src/db/schema.ts`.

**Session tables**: `users`, `problems`, `hints`, `sessions`, `submissions`, `scores`

**Pattern tracking**: `pattern_progress` — interview-driven stats per pattern (problemsAttempted, problemsSolved, avgScore, avgHintLevel)

**Dojo tables**:
- `dojo_tips` — guidance content (category, key, mode, title, body, sortOrder)
- `dojo_drills` — drill prompts (type, pattern, prompt, correctAnswer, difficulty)
- `dojo_attempts` — per-attempt records (userId, drillId, answer, score, aiFeedback)
- `dojo_progress` — per-user per-pattern progress (status, level, xp, attemptsCount, avgScore, bestScore)
- `user_gamification` — weekly XP, streak weeks, total XP, weekly goal

### Key env vars

| App | Variable | Purpose |
|-----|----------|---------|
| api | `DATABASE_URL` | Postgres connection (default port 5434) |
| api | `ANTHROPIC_API_KEY` | Claude API |
| api | `PISTON_BASE_URL` | Piston base (GCP VM: `http://136.119.99.101:2000`) |
| api | `AUTH_SECRET` | Must match web `AUTH_SECRET` |
| api | `FRONTEND_URL` | CORS origin for WS gateway (default `http://localhost:3000`) |
| api | `PORT` | API port (default 8000) |
| api | `MAX_SESSIONS_PER_DAY` | Local dev cost cap |
| api | `DEBRIEF_CACHE` | Cache debrief responses locally |
| api | `ENV` | Environment tag (default `local`) |
| web | `NEXT_PUBLIC_API_URL` | NestJS base URL |
| web | `AUTH_GITHUB_ID/SECRET` | GitHub OAuth |
| web | `AUTH_GOOGLE_ID/SECRET` | Google OAuth (optional) |

Copy `.env.example` in both `apps/api` and `apps/web` to `.env` before first run.
