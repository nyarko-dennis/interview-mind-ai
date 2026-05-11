'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { DebriefPanel } from '@/components/session/DebriefPanel';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { PhaseIndicator } from '@/components/session/PhaseIndicator';
import { useSessionStore } from '@/lib/store';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { WsServerEvents } from '@interview-mind/shared';
import type { SessionPhase, InterviewerMode, HintLevel } from '@interview-mind/shared';

interface Props {
  sessionId: string;
  problemTitle: string;
  problemStatement: string;
  hintCeiling: number;
  initialPhase: SessionPhase;
  initialMode: InterviewerMode;
  difficulty?: string;
  functionStub?: string;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function SessionArena({
  sessionId,
  problemTitle,
  problemStatement,
  hintCeiling,
  initialPhase,
  initialMode,
  difficulty,
  functionStub,
}: Props) {
  const router = useRouter();
  const { data: authSession } = useSession();
  const {
    phase,
    phaseStartedAt,
    setPhase,
    addMessage,
    appendStreamChunk,
    flushStream,
    setTestResults,
    setIsRunning,
    setRunOutput,
    setHintLevel,
    setSubmissionError,
    setReviewFeedback,
    setDebriefData,
    setDebriefError,
    initSession,
  } = useSessionStore();
  const [elapsed, setElapsed] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [queue, setQueue] = useState<{ ids: string[]; goalMinutes: number } | null>(null);

  useEffect(() => {
    initSession({ sessionId, phase: initialPhase, mode: initialMode, hintCeiling, functionStub });
  }, [sessionId]);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((e) => e + 1);
      setPhaseElapsed(Math.floor((Date.now() - phaseStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [phaseStartedAt]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('imQueue');
      if (raw) setQueue(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (!authSession?.apiToken) return;

    const socket = connectSocket(sessionId, authSession.apiToken);

    socket.on(WsServerEvents.PHASE_CHANGE, ({ phase }: { phase: SessionPhase }) => {
      setPhase(phase);
    });

    socket.on(WsServerEvents.CLARIFICATION_RESULT, (result: { passed: boolean; feedback: string }) => {
      addMessage({ role: 'ai', content: result.feedback });
    });

    socket.on(WsServerEvents.APPROACH_RESULT, (result: { accepted: boolean; probe?: string }) => {
      if (result.probe) addMessage({ role: 'ai', content: result.probe });
    });

    socket.on(WsServerEvents.AI_STREAM_CHUNK, ({ chunk }: { chunk: string }) => {
      appendStreamChunk(chunk);
    });

    socket.on(WsServerEvents.AI_STREAM_END, (data: { level: number; isCeiling: boolean }) => {
      flushStream();
      setHintLevel(data.level as HintLevel);
    });

    socket.on(WsServerEvents.CODE_RUNNING, () => {
      setIsRunning(true);
    });

    socket.on(WsServerEvents.CODE_RESULT, (result: {
      testsPassed: number;
      testsTotal: number;
      status?: string;
      runtimeMs?: number;
      stderr?: string;
    }) => {
      setIsRunning(false);
      setTestResults(result.testsPassed, result.testsTotal);
      if (result.status) {
        setRunOutput({ status: result.status, runtimeMs: result.runtimeMs, stderr: result.stderr });
      }
    });

    socket.on(WsServerEvents.REVIEW_RESULT, (result: { accepted: boolean; feedback: string }) => {
      if (!result.accepted) {
        setReviewFeedback(result.feedback);
      }
    });

    socket.on(WsServerEvents.SESSION_ERROR, ({ message, context }: { message: string; context?: string }) => {
      if (context === 'submission') {
        setIsRunning(false);
        setSubmissionError(message);
      } else {
        setDebriefError(message);
      }
    });

    socket.on('debrief:ready', (data: {
      total: number;
      correctness: number;
      efficiency: number;
      communication: number;
      independence: number;
      debriefReport: string;
    }) => {
      setDebriefData(data);
    });

    return () => {
      disconnectSocket();
    };
  }, [sessionId, authSession?.apiToken]);

  const queueIndex = queue ? queue.ids.indexOf(sessionId) : -1;
  const isMultiProblem = queue !== null && queue.ids.length > 1 && queueIndex >= 0;
  const isOverGoal = queue !== null && elapsed > queue.goalMinutes * 60;

  const editorLocked = phase === 'CLARIFICATION' || phase === 'IDLE';
  // editorLocked drives the blur overlay; editorDisabled additionally covers REVIEW/DEBRIEF
  const editorDisabled = editorLocked || phase === 'REVIEW' || phase === 'DEBRIEF';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      {/* Header */}
      <header className="relative flex h-12 shrink-0 items-center border-b border-border px-4">
        {/* Left: logo + problem info */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-widest">
            <span className="text-white">INTERVIEWMIND</span>
            <span className="text-accent">.AI</span>
          </span>
          <span className="text-border">|</span>
          <span className={`text-xs ${isOverGoal ? 'text-warning' : 'text-muted'}`}>
            {formatTime(elapsed)}
            {queue ? ` / ${String(queue.goalMinutes).padStart(2, '0')}:00` : ''}
            {' · '}
            {problemTitle}
            {difficulty ? ` · ${difficulty}` : ''}
          </span>
          {phase !== 'IDLE' && phase !== 'DEBRIEF' && (
            <span className="text-[10px] text-muted/40">
              phase {formatTime(phaseElapsed)}
            </span>
          )}
          {isMultiProblem && (
            <span className="text-[10px] tracking-widest text-muted/50">
              {queueIndex + 1} / {queue!.ids.length}
            </span>
          )}
        </div>

        {/* Center: phase stepper (absolutely centered so it doesn't shift with left/right content) */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <PhaseIndicator phase={phase} />
        </div>

        {/* Right: End Session */}
        <button
          onClick={() => router.push('/dashboard')}
          className="ml-auto text-xs text-muted/60 transition hover:text-white"
        >
          End Session
        </button>
      </header>

      {/* Split: chat left, editor right */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-[420px] shrink-0 flex-col border-r border-border">
          {phase === 'DEBRIEF' ? (
            <DebriefPanel problemTitle={problemTitle} elapsed={elapsed} sessionId={sessionId} />
          ) : (
            <ChatPanel
              sessionId={sessionId}
              problemTitle={problemTitle}
              problemStatement={problemStatement}
            />
          )}
        </div>

        <div className="relative flex flex-1 flex-col">
          <AnimatePresence>
            {editorLocked && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-canvas/70 backdrop-blur-sm"
              >
                <div className="flex flex-col items-center gap-3 border border-border bg-surface px-10 py-8 text-center">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted"
                  >
                    <rect x="5" y="11" width="14" height="10" rx="1" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                  <p className="text-xs tracking-widest text-white">
                    LOCKED ·{' '}
                    {phase === 'CLARIFICATION' ? 'CLARIFICATION' : 'APPROACH'} PHASE
                  </p>
                  <p className="max-w-[200px] text-xs text-muted">
                    {phase === 'CLARIFICATION'
                      ? 'Ask at least one clarifying question to proceed.'
                      : 'Describe your approach to proceed.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <CodeEditor sessionId={sessionId} disabled={editorDisabled} />
        </div>
      </div>
    </div>
  );
}
