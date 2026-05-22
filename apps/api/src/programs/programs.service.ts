import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, ne, notInArray } from 'drizzle-orm';
import type { Db } from '../db';
import { DB_TOKEN } from '../db/db.module';
import {
  problems,
  programAssignments,
  scores,
  sessions,
  userPrograms,
  patternProgress,
} from '../db/schema';

export type ProgramType = 'DAILY_SPRINT' | 'DEEP_DIVE' | 'INTERVIEW_SIM';

interface ProgramConfig {
  pattern?: string;
}

// All algorithm patterns — used for Daily Sprint rotation when no progress data exists.
const ALL_PATTERNS = [
  'TWO_POINTERS', 'SLIDING_WINDOW', 'FAST_SLOW_POINTERS', 'BINARY_SEARCH',
  'BFS', 'DFS_BACKTRACKING', 'DP_1D', 'DP_2D', 'MONOTONIC_STACK', 'HEAP',
  'INTERVALS', 'UNION_FIND', 'TRIE', 'BIT_MANIPULATION', 'LINKED_LISTS',
  'HASH_MAPS', 'PREFIX_SUMS', 'GREEDY', 'SORT_SEARCH', 'MATH_GEOMETRY',
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

@Injectable()
export class ProgramsService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  // ── Program CRUD ───────────────────────────────────────────────────────────

  async getPrograms(userId: string) {
    return this.db.query.userPrograms.findMany({
      where: eq(userPrograms.userId, userId),
      orderBy: [asc(userPrograms.createdAt)],
    });
  }

  async upsertProgram(userId: string, type: ProgramType, config: ProgramConfig = {}) {
    const existing = await this.db.query.userPrograms.findFirst({
      where: and(eq(userPrograms.userId, userId), eq(userPrograms.type, type)),
    });
    if (existing) {
      const [updated] = await this.db
        .update(userPrograms)
        .set({ active: true, config })
        .where(eq(userPrograms.id, existing.id))
        .returning();
      return updated;
    }
    const [program] = await this.db
      .insert(userPrograms)
      .values({ userId, type, config, active: true })
      .returning();
    return program;
  }

  async updateProgram(userId: string, programId: string, updates: { active?: boolean; config?: ProgramConfig }) {
    const [updated] = await this.db
      .update(userPrograms)
      .set(updates)
      .where(and(eq(userPrograms.id, programId), eq(userPrograms.userId, userId)))
      .returning();
    if (!updated) throw new NotFoundException('Program not found');
    return updated;
  }

  // ── Today's assignments + carry-over ──────────────────────────────────────

  async getTodayAssignments(userId: string) {
    const active = await this.db.query.userPrograms.findMany({
      where: and(eq(userPrograms.userId, userId), eq(userPrograms.active, true)),
    });

    const result = [];
    for (const program of active) {
      const assignments = await this.getAssignmentsWithStatus(userId, program.id);

      // INTERVIEW_SIM is on-demand — never auto-generate, just surface what exists
      if (program.type !== 'INTERVIEW_SIM') {
        const hasToday = assignments.some((a) => a.assignedDate === today());
        if (!hasToday) {
          const generated = await this.generateAssignments(userId, program);
          assignments.push(...generated.map((a) => ({ ...a, completed: false })));
        }
      }

      // Include: incomplete assignments + today's (even if completed — so user can see their work)
      const relevant = assignments.filter(
        (a) => !a.completed || a.assignedDate === today(),
      );

      result.push({ program, assignments: relevant });
    }
    return result;
  }

  // Start an Interview Sim session on demand
  async startInterviewSim(userId: string) {
    const program = await this.db.query.userPrograms.findFirst({
      where: and(
        eq(userPrograms.userId, userId),
        eq(userPrograms.type, 'INTERVIEW_SIM'),
        eq(userPrograms.active, true),
      ),
    });
    if (!program) throw new BadRequestException('No active Interview Sim program');

    // If already has incomplete sim assignments from today, return those
    const existing = await this.getAssignmentsWithStatus(userId, program.id);
    const todayIncomplete = existing.filter((a) => a.assignedDate === today() && !a.completed);
    if (todayIncomplete.length > 0) return todayIncomplete;

    return this.generateAssignments(userId, program);
  }

  // Create a session for an assignment and link it
  async startAssignment(userId: string, assignmentId: string, preferredMode: string) {
    const assignment = await this.db.query.programAssignments.findFirst({
      where: and(
        eq(programAssignments.id, assignmentId),
        eq(programAssignments.userId, userId),
      ),
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.sessionId) return { sessionId: assignment.sessionId };

    const program = await this.db.query.userPrograms.findFirst({
      where: eq(userPrograms.id, assignment.programId),
    });
    if (!program) throw new NotFoundException('Program not found');

    // Interview Sim is always STRICT — no hints, real interview feel
    const mode = program.type === 'INTERVIEW_SIM' ? 'STRICT' : preferredMode;

    const [session] = await this.db
      .insert(sessions)
      .values({ userId, problemId: assignment.problemId, phase: 'CLARIFICATION', mode })
      .returning();

    await this.db
      .update(programAssignments)
      .set({ sessionId: session.id })
      .where(eq(programAssignments.id, assignmentId));

    return { sessionId: session.id };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async getAssignmentsWithStatus(userId: string, programId: string) {
    const cutoff = daysAgo(7);

    const rows = await this.db
      .select({
        id: programAssignments.id,
        assignedDate: programAssignments.assignedDate,
        sessionId: programAssignments.sessionId,
        problemId: programAssignments.problemId,
        createdAt: programAssignments.createdAt,
        scoreId: scores.id,
        problemTitle: problems.title,
        problemDifficulty: problems.difficulty,
        problemPattern: problems.pattern,
      })
      .from(programAssignments)
      .leftJoin(sessions, eq(sessions.id, programAssignments.sessionId))
      .leftJoin(scores, eq(scores.sessionId, sessions.id))
      .leftJoin(problems, eq(problems.id, programAssignments.problemId))
      .where(
        and(
          eq(programAssignments.userId, userId),
          eq(programAssignments.programId, programId),
          gte(programAssignments.assignedDate, cutoff),
        ),
      )
      .orderBy(asc(programAssignments.assignedDate));

    return rows.map((r) => ({
      id: r.id,
      assignedDate: r.assignedDate,
      overdue: r.assignedDate < today(),
      completed: r.scoreId !== null,
      sessionId: r.sessionId,
      problem: {
        id: r.problemId,
        title: r.problemTitle ?? '',
        difficulty: r.problemDifficulty ?? '',
        pattern: r.problemPattern ?? '',
      },
    }));
  }

  private async getSolvedProblemIds(userId: string): Promise<Set<string>> {
    const rows = await this.db
      .select({ problemId: sessions.problemId })
      .from(sessions)
      .innerJoin(scores, eq(scores.sessionId, sessions.id))
      .where(and(eq(sessions.userId, userId), gte(scores.correctness, 50)));
    return new Set(rows.map((r) => r.problemId));
  }

  private async generateAssignments(
    userId: string,
    program: typeof userPrograms.$inferSelect,
  ) {
    const date = today();
    const solved = await this.getSolvedProblemIds(userId);

    let problemIds: string[] = [];

    if (program.type === 'DAILY_SPRINT') {
      problemIds = await this.pickDailySprint(userId, program.id, solved);
    } else if (program.type === 'DEEP_DIVE') {
      const config = program.config as ProgramConfig;
      problemIds = await this.pickDeepDive(config.pattern ?? 'TWO_POINTERS', solved);
    } else {
      problemIds = await this.pickInterviewSim(userId, solved);
    }

    if (problemIds.length === 0) return [];

    const inserted = await this.db
      .insert(programAssignments)
      .values(problemIds.map((problemId) => ({ userId, programId: program.id, problemId, assignedDate: date })))
      .returning();

    // Fetch problem details for the response
    const problemRows = await this.db
      .select({ id: problems.id, title: problems.title, difficulty: problems.difficulty, pattern: problems.pattern })
      .from(problems)
      .where(inArray(problems.id, problemIds));

    const problemMap = new Map(problemRows.map((p) => [p.id, p]));

    return inserted.map((a) => ({
      id: a.id,
      assignedDate: a.assignedDate,
      overdue: false,
      completed: false,
      sessionId: null as string | null,
      problem: problemMap.get(a.problemId) ?? { id: a.problemId, title: '', difficulty: '', pattern: '' },
    }));
  }

  private async pickDailySprint(
    userId: string,
    programId: string,
    solved: Set<string>,
  ): Promise<string[]> {
    // Find yesterday's pattern to avoid repeating
    const yesterday = daysAgo(1);
    const yesterdayAssignment = await this.db
      .select({ pattern: problems.pattern })
      .from(programAssignments)
      .innerJoin(problems, eq(problems.id, programAssignments.problemId))
      .where(
        and(
          eq(programAssignments.programId, programId),
          eq(programAssignments.assignedDate, yesterday),
        ),
      )
      .limit(1)
      .then((r) => r[0]);

    const yesterdayPattern = yesterdayAssignment?.pattern;

    // Order patterns by user's weakest first
    const progress = await this.db.query.patternProgress.findMany({
      where: eq(patternProgress.userId, userId),
      orderBy: [asc(patternProgress.avgScore)],
    });

    const rankedPatterns = [
      ...progress.map((p) => p.pattern),
      ...ALL_PATTERNS.filter((p) => !progress.some((pr) => pr.pattern === p)),
    ];

    // Try each pattern (skip yesterday's if possible)
    const patternsToTry = [
      ...rankedPatterns.filter((p) => p !== yesterdayPattern),
      ...(yesterdayPattern ? [yesterdayPattern] : []),
    ];

    for (const pattern of patternsToTry) {
      const available = await this.db
        .select({ id: problems.id })
        .from(problems)
        .where(eq(problems.pattern, pattern));

      const unsolved = available.filter((p) => !solved.has(p.id));
      const pool = unsolved.length > 0 ? unsolved : available;
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        return [pick.id];
      }
    }

    return [];
  }

  private async pickDeepDive(
    pattern: string,
    solved: Set<string>,
  ): Promise<string[]> {
    const ids: string[] = [];
    for (const difficulty of ['EASY', 'MEDIUM', 'HARD']) {
      const available = await this.db
        .select({ id: problems.id })
        .from(problems)
        .where(and(eq(problems.pattern, pattern), eq(problems.difficulty, difficulty)));

      if (available.length === 0) continue;
      const unsolved = available.filter((p) => !solved.has(p.id));
      const pool = unsolved.length > 0 ? unsolved : available;
      ids.push(pool[Math.floor(Math.random() * pool.length)].id);
    }
    return ids;
  }

  private async pickInterviewSim(
    userId: string,
    solved: Set<string>,
  ): Promise<string[]> {
    const progress = await this.db.query.patternProgress.findMany({
      where: eq(patternProgress.userId, userId),
      orderBy: [asc(patternProgress.avgScore)],
    });

    const rankedPatterns = [
      ...progress.map((p) => p.pattern),
      ...ALL_PATTERNS.filter((p) => !progress.some((pr) => pr.pattern === p)),
    ];

    const ids: string[] = [];
    const usedPatterns = new Set<string>();
    const difficulties = ['EASY', 'MEDIUM', 'HARD'];

    for (let i = 0; i < difficulties.length; i++) {
      for (const pattern of rankedPatterns) {
        if (usedPatterns.has(pattern)) continue;
        const available = await this.db
          .select({ id: problems.id })
          .from(problems)
          .where(and(eq(problems.pattern, pattern), eq(problems.difficulty, difficulties[i])));
        if (available.length === 0) continue;
        const unsolved = available.filter((p) => !solved.has(p.id));
        const pool = unsolved.length > 0 ? unsolved : available;
        ids.push(pool[Math.floor(Math.random() * pool.length)].id);
        usedPatterns.add(pattern);
        break;
      }
    }

    return ids;
  }
}
