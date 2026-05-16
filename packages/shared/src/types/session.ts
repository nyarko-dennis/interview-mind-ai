export type SessionPhase =
  | 'IDLE'
  | 'CLARIFICATION'
  | 'APPROACH'
  | 'IMPLEMENTATION'
  | 'REVIEW'
  | 'DEBRIEF';

export type HintLevel = 0 | 1 | 2 | 3 | 4;

export type InterviewerMode = 'GUIDED' | 'STRICT';

export type SupportedLanguage = 'python' | 'javascript' | 'typescript' | 'java' | 'cpp' | 'go';

export type ClarificationCategory = 'INPUT' | 'OUTPUT' | 'CONSTRAINTS' | 'EDGE_CASES';

export interface ClarificationCoverage {
  INPUT: number;
  OUTPUT: number;
  CONSTRAINTS: number;
  EDGE_CASES: number;
}

export interface SessionState {
  sessionId: string;
  phase: SessionPhase;
  mode: InterviewerMode;
  hintsUsed: HintLevel[];
  maxHintReached: HintLevel;
  startedAt: string;
}
