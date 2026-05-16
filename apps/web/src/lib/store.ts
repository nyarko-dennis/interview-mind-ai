import { create } from 'zustand';
import type { SessionPhase, InterviewerMode, SupportedLanguage, HintLevel, ClarificationCoverage, ApproachStep } from '@interview-mind/shared';

export interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
  streaming?: boolean;
}

export interface RunOutput {
  status: string;
  runtimeMs?: number;
  stderr?: string;
}

export interface DebriefScore {
  total: number;
  correctness: number;
  efficiency: number;
  communication: number;
  independence: number;
  debriefReport: string;
}

interface SessionStore {
  // Session meta
  sessionId: string | null;
  phase: SessionPhase;
  mode: InterviewerMode;

  // Code editor
  code: string;
  language: SupportedLanguage;

  // Chat
  messages: ChatMessage[];
  streamingChunk: string;

  // Hints
  hintLevel: HintLevel;
  hintCeiling: number;
  isHintStreaming: boolean;

  // Test results
  testsPassed: number | null;
  testsTotal: number | null;
  isRunning: boolean;
  runOutput: RunOutput | null;

  // Submission error (Judge0 unavailable — phase stays in IMPLEMENTATION for retry)
  submissionError: string | null;

  // Clarification coverage tracker
  clarificationCoverage: ClarificationCoverage;

  // Approach sub-phase
  approachStep: ApproachStep | null;

  // Per-phase elapsed time tracking
  phaseStartedAt: number; // Date.now() snapshot when current phase began

  // Review phase
  reviewFeedback: string | null;

  // Debrief
  debriefData: DebriefScore | null;
  debriefError: string | null;

  // Actions
  initSession: (params: { sessionId: string; phase: SessionPhase; mode: InterviewerMode; hintCeiling: number; functionStub?: string }) => void;
  setPhase: (phase: SessionPhase) => void;
  setReviewFeedback: (feedback: string | null) => void;
  setCode: (code: string) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  addMessage: (msg: ChatMessage) => void;
  appendStreamChunk: (chunk: string) => void;
  flushStream: () => void;
  setHintLevel: (level: HintLevel) => void;
  setIsRunning: (running: boolean) => void;
  setTestResults: (passed: number, total: number) => void;
  setRunOutput: (output: RunOutput) => void;
  setSubmissionError: (msg: string | null) => void;
  setClarificationCoverage: (coverage: ClarificationCoverage) => void;
  setApproachStep: (step: ApproachStep | null) => void;
  setDebriefData: (data: DebriefScore) => void;
  setDebriefError: (msg: string) => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionId: null,
  phase: 'IDLE',
  mode: 'GUIDED',
  code: '',
  language: 'python',
  messages: [],
  streamingChunk: '',
  hintLevel: 0,
  hintCeiling: 2,
  isHintStreaming: false,
  testsPassed: null,
  testsTotal: null,
  isRunning: false,
  runOutput: null,
  submissionError: null,
  clarificationCoverage: { INPUT: 0, OUTPUT: 0, CONSTRAINTS: 0, EDGE_CASES: 0 },
  approachStep: null,
  phaseStartedAt: Date.now(),
  reviewFeedback: null,
  debriefData: null,
  debriefError: null,

  initSession: ({ sessionId, phase, mode, hintCeiling, functionStub }) =>
    set({
      sessionId,
      phase,
      mode,
      hintCeiling,
      code: functionStub ?? '',
      messages: [],
      streamingChunk: '',
      hintLevel: 0,
      isHintStreaming: false,
      testsPassed: null,
      testsTotal: null,
      isRunning: false,
      runOutput: null,
      submissionError: null,
      clarificationCoverage: { INPUT: 0, OUTPUT: 0, CONSTRAINTS: 0, EDGE_CASES: 0 },
      approachStep: null,
      phaseStartedAt: Date.now(),
      reviewFeedback: null,
      debriefData: null,
      debriefError: null,
    }),

  setPhase: (phase) => set({ phase, phaseStartedAt: Date.now() }),
  setReviewFeedback: (reviewFeedback) => set({ reviewFeedback }),
  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  appendStreamChunk: (chunk) =>
    set((s) => ({ streamingChunk: s.streamingChunk + chunk, isHintStreaming: true })),
  flushStream: () => {
    const { streamingChunk, messages } = get();
    if (!streamingChunk) return;
    set({
      messages: [...messages, { role: 'ai', content: streamingChunk }],
      streamingChunk: '',
      isHintStreaming: false,
    });
  },
  setHintLevel: (level) => set({ hintLevel: level }),
  // Clear stale output when a new submission starts so the UI is fresh.
  setIsRunning: (isRunning) =>
    set(isRunning ? { isRunning, runOutput: null, submissionError: null } : { isRunning }),
  setTestResults: (testsPassed, testsTotal) => set({ testsPassed, testsTotal }),
  setRunOutput: (runOutput) => set({ runOutput }),
  setSubmissionError: (submissionError) => set({ submissionError }),
  setClarificationCoverage: (clarificationCoverage) => set({ clarificationCoverage }),
  setApproachStep: (approachStep) => set({ approachStep }),
  setDebriefData: (debriefData) => set({ debriefData }),
  setDebriefError: (debriefError) => set({ debriefError }),
}));
