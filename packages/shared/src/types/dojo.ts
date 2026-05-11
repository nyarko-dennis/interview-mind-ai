export type DojoPersona = 'COACH';

export type PatternStatus =
  | 'LOCKED'
  | 'TRAINING'
  | 'INTERVIEW_READY'
  | 'GUIDED_PASSED'
  | 'MASTERED';

export type DrillType = 'PATTERN_ID' | 'CLARIFICATION' | 'APPROACH';

export type DrillDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type TipCategory = 'PHASE' | 'PATTERN';

export type TipMode = 'GUIDED' | 'STRICT' | 'ALL';

export interface DojoProgress {
  id: string;
  userId: string;
  category: TipCategory;
  key: string;
  status: PatternStatus;
  level: number;
  xp: number;
  attemptsCount: number;
  avgScore: number;
  bestScore: number;
  guidedUnlockedAt?: string;
  strictUnlockedAt?: string;
  masteredAt?: string;
  updatedAt: string;
}

export interface UserGamification {
  streakWeeks: number;
  lastActiveWeek: string;
  currentWeekXp: number;
  weekStart: string;
  totalXp: number;
  weeklyGoal: number;
}

export interface DrillAttemptResult {
  score: number;
  feedback: string;
  xpAwarded: number;
  newLevel: number;
  newXp: number;
  statusChange: { from: PatternStatus; to: PatternStatus } | null;
}
