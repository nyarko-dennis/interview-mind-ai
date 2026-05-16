import { z } from 'zod';
import type { ClarificationCategory, ClarificationCoverage } from '../types/session';

// Client → Server
export const JoinSessionPayload = z.object({ sessionId: z.string().uuid() });

export const ClarificationSubmitPayload = z.object({
  sessionId: z.string().uuid(),
  question: z.string().min(1).max(1000),
});

export const ApproachSubmitPayload = z.object({
  sessionId: z.string().uuid(),
  description: z.string().min(1).max(2000),
});

export const HintRequestPayload = z.object({ sessionId: z.string().uuid() });

export const CodeSubmitPayload = z.object({
  sessionId: z.string().uuid(),
  code: z.string(),
  language: z.enum(['python', 'javascript', 'typescript', 'java', 'cpp', 'go']),
});

// Server → Client event names
export const WsServerEvents = {
  CLARIFICATION_RESULT: 'clarification:result',
  APPROACH_RESULT: 'approach:result',
  HINT_DELIVER: 'hint:deliver',
  CODE_RUNNING: 'code:running',
  CODE_RESULT: 'code:result',
  REVIEW_RESULT: 'review:result',
  PHASE_CHANGE: 'phase:change',
  AI_STREAM_CHUNK: 'ai:stream:chunk',
  AI_STREAM_END: 'ai:stream:end',
  SESSION_ERROR: 'session:error',
} as const;

export type WsServerEvent = typeof WsServerEvents[keyof typeof WsServerEvents];

export type ClarificationResult = {
  passed: boolean;
  feedback: string;
  category: ClarificationCategory | null;
  coverage: ClarificationCoverage;
};

export type ApproachResult = {
  accepted: boolean;
  probe?: string;
};

export type HintDelivery = {
  level: number;
  content: string;
  isCeiling: boolean;
};

export type CodeResult = {
  testsPassed: number;
  testsTotal: number;
  runtimeMs?: number;
  memoryKb?: number;
  failedCase?: { input: string; expected: string; actual: string };
};

export type ReviewResult = {
  accepted: boolean;
  feedback: string;
};
