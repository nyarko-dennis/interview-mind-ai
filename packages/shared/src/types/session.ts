export type SessionPhase =
  | 'IDLE'
  | 'CLARIFICATION'
  | 'APPROACH'
  | 'IMPLEMENTATION'
  | 'DEBRIEF';

export type HintLevel = 0 | 1 | 2 | 3 | 4;

export type InterviewerMode = 'GUIDED' | 'STRICT';

export type InterviewerPersona = 'STANDARD' | 'DISINTERESTED' | 'NITPICKER' | 'BACKSEAT_CODER' | 'COACH';

export type SupportedLanguage = 'python' | 'javascript' | 'typescript' | 'java' | 'cpp' | 'go' | 'kotlin';

export type ClarificationCategory = 'INPUT' | 'OUTPUT' | 'CONSTRAINTS' | 'EDGE_CASES';

export type ApproachStep = 'NAIVE' | 'IMPROVE' | 'OPTIMAL';

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
