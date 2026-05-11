import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db';
import { DB_TOKEN } from '../db/db.module';
import { scores, patternProgress } from '../db/schema';
import type { HintLevel } from '@interview-mind/shared';

// Score weights from PRD §4.3
const WEIGHTS = { correctness: 0.4, efficiency: 0.25, communication: 0.2, independence: 0.15 };

@Injectable()
export class ScoringService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  computeIndependence(hintsUsed: HintLevel[]): number {
    if (hintsUsed.length === 0) return 100;
    const maxHint = Math.max(...hintsUsed) as HintLevel;
    // L0=100%, L1=80%, L2=60%, L3=30%, L4=0%
    const mapping: Record<HintLevel, number> = { 0: 100, 1: 80, 2: 60, 3: 30, 4: 0 };
    return mapping[maxHint];
  }

  computeTotal(dimensions: {
    correctness: number;
    efficiency: number;
    communication: number;
    independence: number;
  }): number {
    return (
      dimensions.correctness * WEIGHTS.correctness +
      dimensions.efficiency * WEIGHTS.efficiency +
      dimensions.communication * WEIGHTS.communication +
      dimensions.independence * WEIGHTS.independence
    );
  }

  async saveScore(params: {
    sessionId: string;
    correctness: number;
    efficiency: number;
    communication: number;
    independence: number;
    debriefReport?: string;
  }) {
    const total = this.computeTotal(params);
    const [score] = await this.db
      .insert(scores)
      .values({ ...params, total })
      .returning();
    return score;
  }

  async updatePatternProgress(params: {
    userId: string;
    pattern: string;
    solved: boolean;
    scoreTotal: number;
    maxHintLevel: number;
  }) {
    const existing = await this.db.query.patternProgress.findFirst({
      where: and(
        eq(patternProgress.userId, params.userId),
        eq(patternProgress.pattern, params.pattern),
      ),
    });

    if (existing) {
      const attempted = existing.problemsAttempted + 1;
      const solved = existing.problemsSolved + (params.solved ? 1 : 0);
      const avgScore =
        (existing.avgScore * existing.problemsAttempted + params.scoreTotal) / attempted;
      const avgHint =
        (existing.avgHintLevel * existing.problemsAttempted + params.maxHintLevel) / attempted;

      await this.db
        .update(patternProgress)
        .set({ problemsAttempted: attempted, problemsSolved: solved, avgScore, avgHintLevel: avgHint })
        .where(eq(patternProgress.id, existing.id));
    } else {
      await this.db.insert(patternProgress).values({
        userId: params.userId,
        pattern: params.pattern,
        problemsAttempted: 1,
        problemsSolved: params.solved ? 1 : 0,
        avgScore: params.scoreTotal,
        avgHintLevel: params.maxHintLevel,
      });
    }
  }
}
