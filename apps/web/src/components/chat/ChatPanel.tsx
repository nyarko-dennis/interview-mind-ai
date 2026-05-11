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

// GUIDED mode: emit a check-in request once after 3 minutes of implementation time.
const CHECKIN_DELAY_MS = 3 * 60 * 1000;

export function ChatPanel({ sessionId, problemTitle, problemStatement }: Props) {
  const { phase, mode, messages, streamingChunk, isHintStreaming, hintLevel, hintCeiling, reviewFeedback } =
    useSessionStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const checkinFiredRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingChunk]);

  // Check-in timer: GUIDED mode only, fires once 3 minutes into IMPLEMENTATION.
  useEffect(() => {
    if (phase !== 'IMPLEMENTATION' || mode !== 'GUIDED' || checkinFiredRef.current) return;
    checkinFiredRef.current = false; // reset when entering implementation
    const id = setTimeout(() => {
      if (checkinFiredRef.current) return;
      checkinFiredRef.current = true;
      getSocket().emit('checkin:request', { sessionId });
    }, CHECKIN_DELAY_MS);
    return () => clearTimeout(id);
  }, [phase, mode, sessionId]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;

    const socket = getSocket();
    useSessionStore.getState().addMessage({ role: 'user', content: text });
    useSessionStore.getState().setReviewFeedback(null);
    setInput('');

    if (phase === 'CLARIFICATION') {
      socket.emit('clarification:submit', { sessionId, question: text });
    } else if (phase === 'APPROACH') {
      socket.emit('approach:submit', { sessionId, description: text });
    } else if (phase === 'REVIEW') {
      socket.emit('review:submit', { sessionId, response: text });
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

      {/* Transcript */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (phase === 'CLARIFICATION' || phase === 'APPROACH') && (
          <div className="border-l-2 border-accent/30 py-0.5 pl-3">
            <p className="mb-1 text-[9px] tracking-widest text-muted">INTERVIEWER</p>
            <p className="text-sm leading-relaxed text-white/50">
              {phase === 'CLARIFICATION'
                ? "Take a moment to read the problem. When you're ready, ask a clarifying question."
                : 'Outline your approach in the editor on the right. Click CONFIRM APPROACH → when ready.'}
            </p>
          </div>
        )}

        {phase === 'REVIEW' && (
          <div className="border-l-2 border-accent/30 py-0.5 pl-3">
            <p className="mb-1 text-[9px] tracking-widest text-muted">INTERVIEWER</p>
            <p className="text-sm leading-relaxed text-white/80">
              Your code has been submitted. Before we wrap up — please state the time and
              space complexity of your solution, and walk me through 2–3 test cases you
              would run to verify it.
            </p>
          </div>
        )}

        {reviewFeedback && phase === 'REVIEW' && (
          <div className="border-l-2 border-warning/60 py-0.5 pl-3">
            <p className="mb-1 text-[9px] tracking-widest text-muted">INTERVIEWER</p>
            <p className="text-sm leading-relaxed text-white">{reviewFeedback}</p>
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

      {/* Hint button — implementation phase only */}
      {phase === 'IMPLEMENTATION' && hintLevel < hintCeiling && (
        <div className="shrink-0 border-t border-border px-4 py-2">
          <button
            onClick={requestHint}
            disabled={isHintStreaming}
            className="w-full border border-border py-2 text-xs tracking-widest text-muted transition hover:border-accent hover:text-white disabled:opacity-40"
          >
            REQUEST HINT (L{hintLevel + 1})
          </button>
        </div>
      )}

      {/* Input — clarification, approach, and review */}
      {(phase === 'CLARIFICATION' || phase === 'APPROACH' || phase === 'REVIEW') && (
        <div className="flex shrink-0 border-t border-border">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={
              phase === 'REVIEW'
                ? 'State time/space complexity and walk through test cases…'
                : 'Reply to interviewer…'
            }
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
