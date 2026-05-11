import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db';
import { DB_TOKEN } from '../db/db.module';
import {
  dojoTips,
  dojodrills,
  dojoAttempts,
  dojoProgress,
  patternProgress,
  userGamification,
} from '../db/schema';
import { AiService } from '../ai/ai.service';
import type { DrillAttemptResult, PatternStatus } from '@interview-mind/shared';

// XP thresholds for level-ups (from drills only; levels 4-5 set by interview outcomes)
const XP_THRESHOLDS = [0, 30, 80] as const; // level 1, 2, 3

// XP awarded per drill type/outcome
const XP = {
  PATTERN_ID_CORRECT: 10,
  PATTERN_ID_WRONG: 2,
  DRILL_SCORE_DIVISOR: 10, // score/10 XP, max 10
} as const;

function computeLevel(xp: number): number {
  if (xp >= XP_THRESHOLDS[2]) return 3;
  if (xp >= XP_THRESHOLDS[1]) return 2;
  return 1;
}

/** Returns the ISO date string (YYYY-MM-DD) of the most recent Monday at or before `date`. */
function getMondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const daysBack = day === 0 ? 6 : day - 1; // Mon=0 offset
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class DojoService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly ai: AiService,
  ) {}

  // ── Tips ──────────────────────────────────────────────────────────────────

  async getTips(category: string, key: string, mode: string) {
    const rows = await this.db.query.dojoTips.findMany({
      where: and(
        eq(dojoTips.category, category),
        eq(dojoTips.key, key),
      ),
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
    });
    // Return tips that match the requested mode or apply to all modes
    return rows.filter((r) => r.mode === mode || r.mode === 'ALL');
  }

  // ── Drills ────────────────────────────────────────────────────────────────

  async getDrills(type: string, pattern?: string) {
    const conditions = [eq(dojodrills.type, type)];
    if (pattern) conditions.push(eq(dojodrills.pattern, pattern));
    return this.db.query.dojodrills.findMany({
      where: and(...conditions),
    });
  }

  // ── Attempt submission ────────────────────────────────────────────────────

  async submitAttempt(
    userId: string,
    drillId: string,
    answer: string,
  ): Promise<DrillAttemptResult> {
    const drill = await this.db.query.dojodrills.findFirst({
      where: eq(dojodrills.id, drillId),
    });
    if (!drill) throw new NotFoundException(`Drill ${drillId} not found`);

    // 1. Score with AI
    const { score, feedback } = await this.scoreWithAi(drill, answer);

    // 2. Compute XP
    const xpAwarded = this.computeXp(drill.type, score);

    // 3. Determine progress key
    const progressCategory = drill.type === 'PATTERN_ID' ? 'PATTERN' : 'PHASE';
    const progressKey =
      drill.type === 'PATTERN_ID'
        ? drill.pattern!
        : drill.type === 'CLARIFICATION'
          ? 'CLARIFICATION'
          : 'APPROACH';

    // 4. Upsert dojo_progress and compute level/status changes
    const { newLevel, newXp, statusChange } = await this.updateProgress(
      userId,
      progressCategory,
      progressKey,
      xpAwarded,
      score,
    );

    // 5. Update user-level gamification (streak + weekly XP)
    await this.updateGamification(userId, xpAwarded);

    // 6. Record the attempt
    await this.db.insert(dojoAttempts).values({
      userId,
      drillId,
      answer,
      score,
      aiFeedback: feedback,
    });

    return { score, feedback, xpAwarded, newLevel, newXp, statusChange };
  }

  private async scoreWithAi(
    drill: typeof dojodrills.$inferSelect,
    answer: string,
  ): Promise<{ score: number; feedback: string }> {
    if (drill.type === 'PATTERN_ID') {
      const result = await this.ai.scorePatternId({
        prompt: drill.prompt,
        correctPattern: drill.correctAnswer ?? '',
        userAnswer: answer,
      });
      return { score: result.score, feedback: result.feedback };
    }

    if (drill.type === 'CLARIFICATION') {
      return this.ai.scoreClarificationDrill({
        problemPrompt: drill.prompt,
        userQuestions: answer,
      });
    }

    // APPROACH
    return this.ai.scoreApproachDrill({
      problemPrompt: drill.prompt,
      userApproach: answer,
    });
  }

  private computeXp(type: string, score: number): number {
    if (type === 'PATTERN_ID') {
      return score === 100 ? XP.PATTERN_ID_CORRECT : XP.PATTERN_ID_WRONG;
    }
    return Math.min(Math.round(score / XP.DRILL_SCORE_DIVISOR), 10);
  }

  private async updateProgress(
    userId: string,
    category: string,
    key: string,
    xpAwarded: number,
    score: number,
  ): Promise<{ newLevel: number; newXp: number; statusChange: DrillAttemptResult['statusChange'] }> {
    const existing = await this.db.query.dojoProgress.findFirst({
      where: and(
        eq(dojoProgress.userId, userId),
        eq(dojoProgress.category, category),
        eq(dojoProgress.key, key),
      ),
    });

    const prevXp = existing?.xp ?? 0;
    const prevStatus = (existing?.status ?? 'LOCKED') as PatternStatus;
    const prevAttempts = existing?.attemptsCount ?? 0;
    const prevAvg = existing?.avgScore ?? 0;

    const newXp = prevXp + xpAwarded;
    const newLevel = Math.min(computeLevel(newXp), existing?.level ?? 0 <= 3 ? 3 : existing!.level);
    const newAttempts = prevAttempts + 1;
    const newAvg = (prevAvg * prevAttempts + score) / newAttempts;
    const newBest = Math.max(existing?.bestScore ?? 0, score);

    // Status can only advance to INTERVIEW_READY from drills (levels 4/5 come from interviews)
    let newStatus = prevStatus;
    const statusExtra: Partial<typeof dojoProgress.$inferInsert> = {};
    if (
      category === 'PATTERN' &&
      newLevel >= 3 &&
      (prevStatus === 'LOCKED' || prevStatus === 'TRAINING')
    ) {
      newStatus = 'INTERVIEW_READY';
      statusExtra.guidedUnlockedAt = new Date();
    } else if (prevStatus === 'LOCKED' && xpAwarded > 0) {
      newStatus = 'TRAINING';
    }

    const statusChange: DrillAttemptResult['statusChange'] =
      newStatus !== prevStatus ? { from: prevStatus, to: newStatus } : null;

    await this.db
      .insert(dojoProgress)
      .values({
        userId,
        category,
        key,
        status: newStatus,
        level: newLevel,
        xp: newXp,
        attemptsCount: newAttempts,
        avgScore: newAvg,
        bestScore: newBest,
        ...statusExtra,
      })
      .onConflictDoUpdate({
        target: [dojoProgress.userId, dojoProgress.category, dojoProgress.key],
        set: {
          status: newStatus,
          level: newLevel,
          xp: newXp,
          attemptsCount: newAttempts,
          avgScore: newAvg,
          bestScore: newBest,
          updatedAt: new Date(),
          ...statusExtra,
        },
      });

    return { newLevel, newXp, statusChange };
  }

  private async updateGamification(userId: string, xpAwarded: number): Promise<void> {
    const existing = await this.db.query.userGamification.findFirst({
      where: eq(userGamification.userId, userId),
    });

    const thisMonday = getMondayOf(new Date());
    const lastMonday = getMondayOf(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    let streakWeeks = existing?.streakWeeks ?? 0;
    let currentWeekXp = existing?.currentWeekXp ?? 0;
    const totalXp = (existing?.totalXp ?? 0) + xpAwarded;
    const weeklyGoal = existing?.weeklyGoal ?? 50;

    // Detect week rollover (first activity of a new week)
    const isNewWeek = !existing || existing.weekStart !== thisMonday;
    if (isNewWeek) {
      currentWeekXp = 0; // reset weekly counter
      if (existing?.lastActiveWeek === lastMonday) {
        streakWeeks += 1; // consecutive weeks
      } else {
        streakWeeks = 1; // first time or missed a week
      }
    }

    currentWeekXp += xpAwarded;

    await this.db
      .insert(userGamification)
      .values({
        userId,
        streakWeeks,
        lastActiveWeek: thisMonday,
        currentWeekXp,
        weekStart: thisMonday,
        totalXp,
        weeklyGoal,
      })
      .onConflictDoUpdate({
        target: [userGamification.userId],
        set: {
          streakWeeks,
          lastActiveWeek: thisMonday,
          currentWeekXp,
          weekStart: thisMonday,
          totalXp,
          updatedAt: new Date(),
        },
      });
  }

  // ── Progress & stats ──────────────────────────────────────────────────────

  async getProgress(userId: string) {
    return this.db.query.dojoProgress.findMany({
      where: eq(dojoProgress.userId, userId),
    });
  }

  async getWeakPatterns(userId: string) {
    const [dojoRows, interviewRows] = await Promise.all([
      this.db.query.dojoProgress.findMany({
        where: and(eq(dojoProgress.userId, userId), eq(dojoProgress.category, 'PATTERN')),
      }),
      this.db.query.patternProgress.findMany({
        where: eq(patternProgress.userId, userId),
      }),
    ]);

    const interviewMap = new Map(interviewRows.map((r) => [r.pattern, r.avgScore]));

    const ranked = dojoRows
      .map((r) => {
        const interviewAvg = interviewMap.get(r.key);
        const blendedScore =
          interviewAvg !== undefined
            ? 0.7 * interviewAvg + 0.3 * r.avgScore
            : r.avgScore;
        return { ...r, blendedScore };
      })
      .sort((a, b) => a.blendedScore - b.blendedScore)
      .slice(0, 3);

    return ranked;
  }

  async getWeeklySummary(userId: string) {
    const gam = await this.db.query.userGamification.findFirst({
      where: eq(userGamification.userId, userId),
    });

    const currentWeekXp = gam?.currentWeekXp ?? 0;
    const weeklyGoal = gam?.weeklyGoal ?? 50;

    return {
      currentWeekXp,
      weeklyGoal,
      streakWeeks: gam?.streakWeeks ?? 0,
      goalMet: currentWeekXp >= weeklyGoal,
      progressPct: Math.min(Math.round((currentWeekXp / weeklyGoal) * 100), 100),
    };
  }
}
