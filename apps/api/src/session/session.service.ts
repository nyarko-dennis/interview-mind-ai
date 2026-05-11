import { Inject, Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import type { Db } from '../db';
import { DB_TOKEN } from '../db/db.module';
import { problems as problemsTable, scores, sessions, users } from '../db/schema';
import { AiService } from '../ai/ai.service';
import { Judge0Service } from '../judge0/judge0.service';
import { ProblemsService } from '../problems/problems.service';
import { ScoringService } from '../scoring/scoring.service';
import type {
  SessionPhase,
  InterviewerMode,
  SupportedLanguage,
  HintLevel,
} from '@interview-mind/shared';

@Injectable()
export class SessionService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly ai: AiService,
    private readonly judge0: Judge0Service,
    private readonly problems: ProblemsService,
    private readonly scoring: ScoringService,
  ) {}

  async create(params: {
    userId: string;
    problemId: string;
    mode: InterviewerMode;
  }) {
    const [problem, user] = await Promise.all([
      this.problems.findById(params.problemId),
      this.db.query.users.findFirst({ where: eq(users.id, params.userId) }),
    ]);

    if (user && !this.isDifficultyAllowed(user.tier, problem.difficulty)) {
      throw new ForbiddenException(
        `Tier ${user.tier} does not have access to ${problem.difficulty} problems.`,
      );
    }

    const [session] = await this.db
      .insert(sessions)
      .values({ ...params, phase: 'CLARIFICATION' })
      .returning();
    return session;
  }

  private isDifficultyAllowed(tier: string, difficulty: string): boolean {
    if (tier === 'NOVICE') return difficulty === 'EASY';
    if (tier === 'DEVELOPING') return difficulty !== 'HARD';
    return true; // PROFICIENT + ADVANCED access everything
  }

  async getById(sessionId: string) {
    const session = await this.db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });
    if (!session) throw new BadRequestException(`Session ${sessionId} not found`);
    const problem = await this.problems.findById(session.problemId);
    return { ...session, problem };
  }

  // Thresholds for progressive clarification guidance (PRD §9 Q4).
  private static readonly CLARIFICATION_HINT_THRESHOLD = 3;   // start adding hints
  private static readonly CLARIFICATION_WARN_THRESHOLD = 5;   // score-impact warning
  private static readonly CLARIFICATION_AUTO_ADVANCE   = 10;  // auto-advance as last resort

  async evaluateClarification(sessionId: string, question: string) {
    const session = await this.getById(sessionId);
    this.assertPhase(session.phase as SessionPhase, 'CLARIFICATION');

    const attempts = session.clarificationAttempts ?? 0;

    // Hard limit: after 10 failed attempts the user is clearly stuck.
    // Auto-advance so they can continue; communication score reflects the gap.
    if (attempts >= SessionService.CLARIFICATION_AUTO_ADVANCE) {
      await this.db
        .update(sessions)
        .set({ clarificationAttempts: 0 })
        .where(eq(sessions.id, sessionId));
      await this.transitionPhase(sessionId, 'APPROACH');
      return {
        passed: true,
        feedback:
          'Moving on to approach. Strong clarification is key to your communication score — focus on constraints, edge cases, and output format in future sessions.',
      };
    }

    const problem = await this.problems.findById(session.problemId);
    const result = await this.ai.evaluateClarification(problem.statement, question);

    if (result.passed) {
      await this.db
        .update(sessions)
        .set({ clarificationAttempts: 0 })
        .where(eq(sessions.id, sessionId));
      await this.transitionPhase(sessionId, 'APPROACH');
      return result;
    }

    // Increment the failed-attempt counter.
    const newAttempts = attempts + 1;
    await this.db
      .update(sessions)
      .set({ clarificationAttempts: newAttempts })
      .where(eq(sessions.id, sessionId));

    // Augment the AI feedback with progressive guidance.
    let feedback = result.feedback;

    if (newAttempts >= SessionService.CLARIFICATION_WARN_THRESHOLD) {
      feedback +=
        ` (Attempt ${newAttempts}/${SessionService.CLARIFICATION_AUTO_ADVANCE}: repeated failures affect your communication score.` +
        ' Try asking about input size limits, whether values can be negative, duplicate handling, or exact output format.)';
    } else if (newAttempts >= SessionService.CLARIFICATION_HINT_THRESHOLD) {
      feedback +=
        ' (Tip: good clarifying questions ask about input constraints, edge cases, or expected output format.)';
    }

    return { passed: false, feedback };
  }

  async evaluateApproach(sessionId: string, description: string) {
    const session = await this.getById(sessionId);
    this.assertPhase(session.phase as SessionPhase, 'APPROACH');

    const problem = await this.problems.findById(session.problemId);
    const result = await this.ai.probeApproach(problem.statement, description);

    if (result.accepted) {
      await this.transitionPhase(sessionId, 'IMPLEMENTATION');
    }

    return result;
  }

  async requestHint(sessionId: string) {
    const session = await this.getById(sessionId);
    this.assertPhase(session.phase as SessionPhase, 'IMPLEMENTATION');

    const problem = await this.problems.findById(session.problemId);
    const hintsUsed = session.hintsUsed as HintLevel[];
    const currentMax: HintLevel = hintsUsed.length > 0 ? Math.max(...hintsUsed) as HintLevel : 0;
    const nextLevel = Math.min(currentMax + 1, problem.hintCeiling) as HintLevel;

    const updatedHints = [...hintsUsed, nextLevel];
    await this.db
      .update(sessions)
      .set({ hintsUsed: updatedHints, maxHintLevel: nextLevel })
      .where(eq(sessions.id, sessionId));

    const hintRow = await this.problems.getHintByLevel(session.problemId, nextLevel);

    return {
      level: nextLevel,
      isCeiling: nextLevel >= problem.hintCeiling,
      hintContent: hintRow?.content ?? null,
      // Fallback fields used only when no DB hint exists
      problemStatement: problem.statement,
      context: `Hints used so far: ${hintsUsed.join(', ')}`,
    };
  }

  async submitCode(sessionId: string, code: string, language: SupportedLanguage) {
    const session = await this.getById(sessionId);
    this.assertPhase(session.phase as SessionPhase, 'IMPLEMENTATION');

    await this.transitionPhase(sessionId, 'REVIEW');

    // Append the problem's test runner (Python only for now) so Judge0 evaluates
    // against real test cases rather than just checking for a clean exit.
    const codeToRun =
      language === 'python' && session.problem.testRunner
        ? `${code}\n\n${session.problem.testRunner}`
        : code;

    try {
      const result = await this.judge0.submitAndWait({ code: codeToRun, language });
      // Stay in REVIEW — the gateway advances to DEBRIEF after review:submit is accepted.
      return result;
    } catch (err) {
      // Revert so the user can retry without creating a new session.
      await this.transitionPhase(sessionId, 'IMPLEMENTATION');
      throw err;
    }
  }

  async evaluateReview(sessionId: string, response: string, code: string) {
    const session = await this.getById(sessionId);
    this.assertPhase(session.phase as SessionPhase, 'REVIEW');

    const problem = await this.problems.findById(session.problemId);
    const result = await this.ai.evaluateReview({
      problemStatement: problem.statement,
      code,
      candidateReview: response,
    });

    if (result.accepted) {
      await this.transitionPhase(sessionId, 'DEBRIEF');
    }

    return result;
  }

  async findForUser(userId: string) {
    const rows = await this.db
      .select({
        session: sessions,
        score: scores,
        problem: problemsTable,
      })
      .from(sessions)
      .leftJoin(scores, eq(scores.sessionId, sessions.id))
      .leftJoin(problemsTable, eq(problemsTable.id, sessions.problemId))
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.startedAt));

    return rows.map((r) => ({
      ...r.session,
      problem: r.problem,
      score: r.score,
    }));
  }

  async computeAndSaveDebrief(params: {
    sessionId: string;
    code: string;
    language: SupportedLanguage;
    testsPassed: number;
    testsTotal: number;
  }) {
    const session = await this.getById(params.sessionId);
    const hintsUsed = session.hintsUsed as HintLevel[];

    const correctness =
      params.testsTotal > 0
        ? Math.round((params.testsPassed / params.testsTotal) * 100)
        : 0;
    const independence = this.scoring.computeIndependence(hintsUsed);
    // Efficiency and communication require richer telemetry; use sensible defaults for now
    const efficiency = 75;
    const communication = 70;

    const debriefReport = await this.ai.generateDebrief({
      problemTitle: session.problem.title,
      code: params.code,
      language: params.language,
      testsPassed: params.testsPassed,
      testsTotal: params.testsTotal,
      hintsUsed,
      clarificationNotes: 'N/A',
      approachNotes: 'N/A',
    });

    const score = await this.scoring.saveScore({
      sessionId: params.sessionId,
      correctness,
      efficiency,
      communication,
      independence,
      debriefReport,
    });

    await this.scoring.updatePatternProgress({
      userId: session.userId,
      pattern: session.problem.pattern,
      solved: params.testsPassed === params.testsTotal,
      scoreTotal: score.total,
      maxHintLevel: session.maxHintLevel,
    });

    return {
      total: score.total,
      correctness,
      efficiency,
      communication,
      independence,
      debriefReport,
    };
  }

  private async transitionPhase(sessionId: string, phase: SessionPhase) {
    const updates: Partial<typeof sessions.$inferInsert> = { phase };
    if (phase === 'DEBRIEF') updates.completedAt = new Date();

    await this.db.update(sessions).set(updates).where(eq(sessions.id, sessionId));
  }

  private assertPhase(current: SessionPhase, expected: SessionPhase) {
    if (current !== expected) {
      throw new BadRequestException(
        `Invalid phase transition: session is in ${current}, expected ${expected}`,
      );
    }
  }
}
