'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';

interface Props {
  sessionId: string;
  problemTitle: string;
  problemStatement: string;
}


export function ChatPanel({ sessionId, problemTitle, problemStatement }: Props) {
  const { phase, mode, messages, streamingChunk, isHintStreaming, hintLevel, hintCeiling, xpBalance, clarificationCoverage, approachStep } =
    useSessionStore();

  const HINT_COSTS: Record<number, number> = { 1: 5, 2: 15, 3: 40, 4: 80 };
  const nextHintLevel = hintLevel + 1;
  const nextHintCost = HINT_COSTS[nextHintLevel] ?? 5;
  const canAffordHint = xpBalance >= nextHintCost;
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingChunk]);

  function requestCheckin() {
    getSocket().emit('checkin:request', { sessionId });
  }

  function sendMessage() {
    const text = input.trim();
    if (!text) return;

    const socket = getSocket();
    useSessionStore.getState().addMessage({ role: 'user', content: text });
    setInput('');

    if (phase === 'CLARIFICATION') {
      socket.emit('clarification:submit', { sessionId, input: text });
    } else if (phase === 'APPROACH') {
      socket.emit('approach:submit', { sessionId, description: text });
    }
  }

  function requestHint() {
    getSocket().emit('hint:request', { sessionId });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Problem header */}
      <div className="shrink-0 border-b border-border p-4">
        <p className="mb-0.5 text-[10px] tracking-widest text-muted">PROBLEM</p>
        <p className="mb-2 text-sm font-semibold text-white">{problemTitle}</p>
        <p className="text-xs leading-relaxed text-muted">{problemStatement}</p>
      </div>

      {/* Approach step indicator */}
      {phase === 'APPROACH' && (
        <div className="shrink-0 border-b border-border px-4 py-3">
          <p className="mb-2 text-[9px] tracking-widest text-muted">APPROACH</p>
          <div className="flex gap-3">
            {([
              { step: 'NAIVE',   label: 'Brute Force' },
              { step: 'IMPROVE', label: 'Improved' },
              { step: 'OPTIMAL', label: 'Optimal' },
            ] as const).map(({ step, label }, idx) => {
              const stepOrder = { NAIVE: 0, IMPROVE: 1, OPTIMAL: 2 };
              const currentOrder = approachStep ? stepOrder[approachStep] : 0;
              const done = stepOrder[step] < currentOrder;
              const active = step === approachStep;
              return (
                <div key={step} className="flex items-center gap-1.5">
                  {idx > 0 && <span className="text-[10px] text-muted/40">›</span>}
                  <span className={`text-[10px] ${done ? 'text-accent' : active ? 'text-white' : 'text-muted/40'}`}>
                    {done ? '✓ ' : ''}{label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clarification coverage tracker */}
      {phase === 'CLARIFICATION' && (
        <div className="shrink-0 border-b border-border px-4 py-3">
          <p className="mb-2 text-[9px] tracking-widest text-muted">COVERAGE</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {([
              { key: 'INPUT',       label: 'Input',       min: 1 },
              { key: 'OUTPUT',      label: 'Output',      min: 1 },
              { key: 'EDGE_CASES',  label: 'Edge Cases',  min: 2 },
              { key: 'CONSTRAINTS', label: 'Constraints', min: 1 },
            ] as const).map(({ key, label, min }) => {
              const count = clarificationCoverage[key];
              const done = count >= min;
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={`text-[10px] ${done ? 'text-accent' : 'text-muted'}`}>
                    {done ? '✓' : '○'}
                  </span>
                  <span className={`text-[10px] ${done ? 'text-white/70' : 'text-muted'}`}>
                    {label}
                  </span>
                  <span className="ml-auto text-[10px] tabular-nums text-muted">
                    {count}/{min}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && phase === 'CLARIFICATION' && (
          <div className="border-l-2 border-accent/30 py-0.5 pl-3">
            <p className="mb-1 text-[9px] tracking-widest text-muted">INTERVIEWER</p>
            <p className="text-sm leading-relaxed text-white/50">
              Take a moment to read the problem. Ask a clarifying question, or state an inference you've drawn — either counts toward coverage.
            </p>
          </div>
        )}

        {phase === 'APPROACH' && approachStep === 'NAIVE' && (
          <div className="border-l-2 border-accent/30 py-0.5 pl-3">
            <p className="mb-1 text-[9px] tracking-widest text-muted">INTERVIEWER</p>
            <p className="text-sm leading-relaxed text-white/50">
              Start with the brute-force solution. Describe the algorithm, state its time complexity, and explain why it is suboptimal.
            </p>
          </div>
        )}

        {phase === 'APPROACH' && approachStep === 'IMPROVE' && (
          <div className="border-l-2 border-accent/30 py-0.5 pl-3">
            <p className="mb-1 text-[9px] tracking-widest text-muted">INTERVIEWER</p>
            <p className="text-sm leading-relaxed text-white/50">
              Good. Now describe how you would improve it — what changes and how does that affect time and space complexity?
            </p>
          </div>
        )}

        {phase === 'APPROACH' && approachStep === 'OPTIMAL' && (
          <div className="border-l-2 border-accent/30 py-0.5 pl-3">
            <p className="mb-1 text-[9px] tracking-widest text-muted">INTERVIEWER</p>
            <p className="text-sm leading-relaxed text-white/50">
              Is there a further optimal solution, or is your improvement already optimal? Explain why.
            </p>
          </div>
        )}


        <AnimatePresence initial={false}>
          {messages.map((msg, i) =>
            msg.role === 'ai' ? (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-l-2 border-accent/60 py-0.5 pl-3"
              >
                <p className="mb-1 text-[9px] tracking-widest text-muted">INTERVIEWER</p>
                <p className="text-sm leading-relaxed text-white">{msg.content}</p>
              </motion.div>
            ) : (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-l-2 border-white/20 py-0.5 pl-3"
              >
                <p className="mb-1 text-[9px] tracking-widest text-muted/60">YOU</p>
                <p className="text-sm leading-relaxed text-white/80">{msg.content}</p>
              </motion.div>
            ),
          )}

          {isHintStreaming && streamingChunk && (
            <motion.div
              key="stream"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-l-2 border-accent/60 py-0.5 pl-3"
            >
              <p className="mb-1 text-[9px] tracking-widest text-muted">INTERVIEWER</p>
              <p className="text-sm leading-relaxed text-white">
                {streamingChunk}
                <span className="ml-1 inline-block h-3 w-0.5 animate-pulse bg-accent" />
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Action buttons — implementation phase only */}
      {phase === 'IMPLEMENTATION' && (
        <div className="shrink-0 border-t border-border px-4 py-2">
          {mode !== 'STRICT' && hintLevel < hintCeiling && (
            <div className="mb-2 flex items-center justify-between text-[10px] text-muted">
              <span>HINT COST: {nextHintCost} XP</span>
              <span className={xpBalance < nextHintCost ? 'text-danger' : 'text-muted'}>
                BALANCE: {xpBalance} XP
              </span>
            </div>
          )}
          <div className="flex gap-2">
            {mode !== 'STRICT' && hintLevel < hintCeiling && (
              <button
                onClick={requestHint}
                disabled={isHintStreaming || !canAffordHint}
                title={!canAffordHint ? `Need ${nextHintCost} XP — earn more in the Dojo` : undefined}
                className="flex-1 border border-border py-2 text-xs tracking-widest text-muted transition hover:border-accent hover:text-white disabled:opacity-40"
              >
                REQUEST HINT (L{nextHintLevel})
              </button>
            )}
            <button
              onClick={requestCheckin}
              disabled={isHintStreaming}
              className="flex-1 border border-border py-2 text-xs tracking-widest text-muted transition hover:border-border hover:text-white disabled:opacity-40"
            >
              CHECK IN
            </button>
          </div>
        </div>
      )}

      {/* Input — clarification and approach */}
      {(phase === 'CLARIFICATION' || phase === 'APPROACH') && (
        <div className="flex shrink-0 border-t border-border">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Reply to interviewer…"
            className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-muted focus:outline-none"
          />
          <button
            onClick={sendMessage}
            className="shrink-0 border-l border-border px-4 py-3 text-xs tracking-widest text-accent transition hover:bg-accent hover:text-white"
          >
            SEND →
          </button>
        </div>
      )}
    </div>
  );
}
