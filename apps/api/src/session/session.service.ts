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
  ClarificationCoverage,
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

  // Per-category minimums required before advancing to APPROACH.
  private static readonly CLARIFICATION_MINIMUMS: ClarificationCoverage = {
    INPUT: 3,
    OUTPUT: 3,
    CONSTRAINTS: 2,
    EDGE_CASES: 3,
  };

  // Category weights for communication score (must sum to 100).
  private static readonly CLARIFICATION_WEIGHTS: ClarificationCoverage = {
    INPUT: 30,
    OUTPUT: 30,
    EDGE_CASES: 25,
    CONSTRAINTS: 15,
  };

  // Progressive guidance thresholds (total questions asked).
  private static readonly CLARIFICATION_HINT_THRESHOLD = 3;
  private static readonly CLARIFICATION_WARN_THRESHOLD = 5;
  private static readonly CLARIFICATION_AUTO_ADVANCE   = 10;

  private static readonly EMPTY_COVERAGE: ClarificationCoverage = {
    INPUT: 0,
    OUTPUT: 0,
    CONSTRAINTS: 0,
    EDGE_CASES: 0,
  };

  private isCoverageComplete(coverage: ClarificationCoverage): boolean {
    const mins = SessionService.CLARIFICATION_MINIMUMS;
    return (
      coverage.INPUT >= mins.INPUT &&
      coverage.OUTPUT >= mins.OUTPUT &&
      coverage.CONSTRAINTS >= mins.CONSTRAINTS &&
      coverage.EDGE_CASES >= mins.EDGE_CASES
    );
  }

  private missingCategories(coverage: ClarificationCoverage): string {
    const mins = SessionService.CLARIFICATION_MINIMUMS;
    const labels: Record<keyof ClarificationCoverage, string> = {
      INPUT: 'input understanding',
      OUTPUT: 'output format',
      CONSTRAINTS: 'constraints',
      EDGE_CASES: 'edge cases',
    };
    return (Object.keys(mins) as Array<keyof ClarificationCoverage>)
      .filter((k) => coverage[k] < mins[k])
      .map((k) => labels[k])
      .join(', ');
  }

  computeCommunicationScore(coverage: ClarificationCoverage): number {
    const mins = SessionService.CLARIFICATION_MINIMUMS;
    const weights = SessionService.CLARIFICATION_WEIGHTS;
    return Math.round(
      (Math.min(coverage.INPUT / mins.INPUT, 1) * weights.INPUT) +
      (Math.min(coverage.OUTPUT / mins.OUTPUT, 1) * weights.OUTPUT) +
      (Math.min(coverage.CONSTRAINTS / mins.CONSTRAINTS, 1) * weights.CONSTRAINTS) +
      (Math.min(coverage.EDGE_CASES / mins.EDGE_CASES, 1) * weights.EDGE_CASES),
    );
  }

  async evaluateClarification(sessionId: string, question: string) {
    const session = await this.getById(sessionId);
    this.assertPhase(session.phase as SessionPhase, 'CLARIFICATION');

    const attempts = session.clarificationAttempts ?? 0;
    const coverage: ClarificationCoverage =
      (session.clarificationCoverage as ClarificationCoverage) ??
      SessionService.EMPTY_COVERAGE;

    // Hard limit: auto-advance after 10 questions so the session can continue.
    if (attempts >= SessionService.CLARIFICATION_AUTO_ADVANCE) {
      await this.db
        .update(sessions)
        .set({ clarificationAttempts: 0 })
        .where(eq(sessions.id, sessionId));
      await this.transitionPhase(sessionId, 'APPROACH');
      return {
        passed: true,
        feedback:
          'Moving on to approach. In future sessions, focus on covering input types, output format, constraints, and edge cases to maximise your communication score.',
        category: null,
        coverage,
      };
    }

    const problem = await this.problems.findById(session.problemId);
    const result = await this.ai.evaluateClarification(problem.statement, question);

    // Only credit coverage when the AI judges the question substantive.
    const newCoverage: ClarificationCoverage = { ...coverage };
    if (result.passed) {
      newCoverage[result.category] = (newCoverage[result.category] ?? 0) + 1;
    }

    const newAttempts = attempts + 1;
    const coverageComplete = this.isCoverageComplete(newCoverage);

    await this.db
      .update(sessions)
      .set({ clarificationAttempts: newAttempts, clarificationCoverage: newCoverage })
      .where(eq(sessions.id, sessionId));

    if (coverageComplete) {
      await this.transitionPhase(sessionId, 'APPROACH');
      return {
        passed: true,
        feedback: "Excellent — you've covered all the key areas. Let's move to your approach.",
        category: result.category,
        coverage: newCoverage,
      };
    }

    // Phase stays in CLARIFICATION — augment feedback with progressive guidance.
    let feedback = result.feedback;
    const missing = this.missingCategories(newCoverage);

    if (newAttempts >= SessionService.CLARIFICATION_WARN_THRESHOLD) {
      feedback +=
        ` (Attempt ${newAttempts}/${SessionService.CLARIFICATION_AUTO_ADVANCE}: your communication score is affected.` +
        ` Still needed: ${missing}.)`;
    } else if (newAttempts >= SessionService.CLARIFICATION_HINT_THRESHOLD) {
      feedback += ` (Tip: you still need to cover ${missing}.)`;
    }

    return { passed: false, feedback, category: result.category, coverage: newCoverage };
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
    const efficiency = 75;
    const coverage =
      (session.clarificationCoverage as ClarificationCoverage) ??
      SessionService.EMPTY_COVERAGE;
    const communication = this.computeCommunicationScore(coverage);

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
