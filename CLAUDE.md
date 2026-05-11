# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# All apps together (from root)
pnpm dev          # starts web (port 3000) and api (port 4000) in parallel via Turborepo
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
pnpm --filter @interview-mind/api db:seed       # seed problems/hints
pnpm --filter @interview-mind/api db:seed-tests # seed test-specific data
pnpm --filter @interview-mind/api db:reset      # drop and recreate all tables
pnpm --filter @interview-mind/api db:studio     # Drizzle Studio GUI

# Judge0 (local code execution sandbox)
cd docker/judge0
docker compose --env-file .env.judge0 up -d
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

**Clarification thresholds** (progressive guidance, PRD §9 Q4):
- Attempt 3: AI starts adding hints to feedback
- Attempt 5: score-impact warning shown
- Attempt 10: auto-advance to APPROACH as last resort

**Tier-gated difficulty**: NOVICE → EASY only; DEVELOPING → EASY/MEDIUM; PROFICIENT/ADVANCED → all difficulties. Enforced in `SessionService.isDifficultyAllowed()`.

### Real-time communication
WebSocket namespace `/session` (Socket.io). Client emits:
- `session:join` — joins a Socket.io room keyed on `sessionId`
- `clarification:submit`, `approach:submit`, `hint:request`, `code:submit`

Server emits (event names defined in `packages/shared/src/schemas/ws-events.ts`):
- `phase:change`, `clarification:result`, `approach:result`
- `hint:deliver` — static hint delivery
- `ai:stream:chunk` / `ai:stream:end` — streamed hint tokens
- `code:running`, `code:result`
- `session:error` — error broadcast to room

Front-end socket wiring lives in `apps/web/src/lib/socket.ts`; the Zustand store (`apps/web/src/lib/store.ts`) consumes the events and drives UI.

### REST API
All routes under `http://localhost:4000`. JWT Bearer required unless noted.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sessions` | List sessions for authenticated user |
| POST | `/sessions` | Create a new session |
| GET | `/sessions/:id` | Get session by ID |
| GET | `/problems` | List problems (optional `?pattern=&difficulty=` filters) |
| GET | `/problems/:slug` | Get problem by slug |

### AI cost strategy
Two models are used (see `apps/api/src/ai/ai.service.ts`):
- **Haiku** (`claude-haiku-4-5-20251001`) — fast, cheap tasks: clarification eval, approach probing, hint streaming
- **Sonnet** (`claude-sonnet-4-6`) — debrief generation (higher quality, used once per session)

Local dev cost controls via env: `MAX_SESSIONS_PER_DAY`, `DEBRIEF_CACHE`.

### Code execution
`Judge0Service` submits code to a self-hosted Judge0 instance (`docker/judge0/`) via HTTP, then polls until the result is ready. Judge0 runs its own Postgres (port 5433) and Redis — separate from the app's Postgres (port 5434).

Supported languages: `python`, `javascript`, `typescript`, `java`, `cpp`, `go`.

### Scoring
`ScoringService` weights four dimensions (PRD §4.3):
- Correctness 40%, Efficiency 25%, Communication 20%, Independence 15%
- Independence degrades with hint level: L0=100%, L1=80%, L2=60%, L3=30%, L4=0%

### Database
Drizzle ORM on PostgreSQL. Schema in `apps/api/src/db/schema.ts`. Tables: `users`, `problems`, `hints`, `sessions`, `submissions`, `scores`, `pattern_progress`, `user_gamification`, `dojo_tips`, `dojo_drills`, `dojo_attempts`, `dojo_progress`.

### Key env vars

| App | Variable | Purpose |
|-----|----------|---------|
| api | `DATABASE_URL` | Postgres connection (default port 5434) |
| api | `ANTHROPIC_API_KEY` | Claude API |
| api | `JUDGE0_BASE_URL` | Judge0 base (default `http://localhost:2358`) |
| api | `AUTH_SECRET` | Must match web `AUTH_SECRET` |
| api | `FRONTEND_URL` | CORS origin for WS gateway (default `http://localhost:3000`) |
| api | `PORT` | API port (default 4000) |
| api | `MAX_SESSIONS_PER_DAY` | Local dev cost cap |
| api | `DEBRIEF_CACHE` | Cache debrief responses locally |
| web | `NEXT_PUBLIC_API_URL` | NestJS base URL |
| web | `AUTH_GITHUB_ID/SECRET` | GitHub OAuth |
| web | `AUTH_GOOGLE_ID/SECRET` | Google OAuth (optional) |

Copy `.env.example` in both `apps/api` and `apps/web` to `.env` before first run.
