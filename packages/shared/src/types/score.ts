export interface SessionScore {
  sessionId: string;
  correctness: number;    // 0–100, weight 40%
  efficiency: number;     // 0–100, weight 25%
  communication: number;  // 0–100, weight 20%
  independence: number;   // 0–100, weight 15%
  total: number;
  debriefReport?: string;
}

export interface PatternProgress {
  pattern: string;
  problemsAttempted: number;
  problemsSolved: number;
  avgScore: number;
  avgHintLevel: number;
}
