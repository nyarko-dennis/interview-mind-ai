'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSessionStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import type { SupportedLanguage } from '@interview-mind/shared';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const LANGUAGES: SupportedLanguage[] = ['python', 'javascript', 'typescript', 'java', 'cpp', 'go', 'kotlin'];

const MONACO_LANG: Record<SupportedLanguage, string> = {
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  java: 'java',
  cpp: 'cpp',
  go: 'go',
  kotlin: 'kotlin',
};

const LANG_EXT: Record<SupportedLanguage, string> = {
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  java: 'java',
  cpp: 'cpp',
  go: 'go',
  kotlin: 'kt',
};

// Guided surfaces hints at lower idle threshold than Strict.
const IDLE_THRESHOLD_MS: Record<string, number> = {
  GUIDED: 60_000,
  STRICT: 120_000,
};

interface Props {
  sessionId: string;
  disabled?: boolean;
}

// Extract the first error line number from Judge0 stderr across common languages.
function parseErrorLine(stderr: string): number | null {
  const patterns = [
    /\bline (\d+)/i,       // Python, generic
    /:(\d+):\d+[:\s]/,     // C++, Go, TypeScript, Java
    /:(\d+):/,             // fallback col-less
  ];
  for (const p of patterns) {
    const m = stderr.match(p);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

export function CodeEditor({ sessionId, disabled }: Props) {
  const {
    phase,
    mode,
    code,
    language,
    isRunning,
    testsPassed,
    testsTotal,
    runOutput,
    submissionError,
    hintLevel,
    hintCeiling,
    isHintStreaming,
    setCode,
    setLanguage,
  } = useSessionStore();

  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const lastActivityRef = useRef(Date.now());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  const isApproach = phase === 'APPROACH';
  const isDebrief = phase === 'DEBRIEF';

  // Reset idle clock when implementation begins and after each hint delivery.
  useEffect(() => {
    if (phase === 'IMPLEMENTATION') lastActivityRef.current = Date.now();
  }, [phase]);

  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, [hintLevel]);

  // Auto-trigger the next hint level after the idle threshold (IMPLEMENTATION only).
  useEffect(() => {
    if (phase !== 'IMPLEMENTATION' || isHintStreaming || hintLevel >= hintCeiling) return;

    const thresholdMs = IDLE_THRESHOLD_MS[mode] ?? 60_000;

    const id = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= thresholdMs) {
        lastActivityRef.current = Date.now(); // prevent immediate re-fire
        getSocket().emit('hint:request', { sessionId });
      }
    }, 10_000); // poll every 10s

    return () => clearInterval(id);
  }, [phase, mode, hintLevel, hintCeiling, isHintStreaming, sessionId]);

  function submit() {
    if (isRunning || disabled || !code.trim()) return;
    getSocket().emit('code:submit', { sessionId, code, language });
  }

  function confirmApproach() {
    if (!code.trim()) return;
    useSessionStore.getState().addMessage({ role: 'user', content: code });
    getSocket().emit('approach:submit', { sessionId, description: code });
  }

  // Apply / clear error decorations when stderr changes.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    // Clear previous decorations first.
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    if (runOutput?.stderr) {
      const line = parseErrorLine(runOutput.stderr);
      if (line) {
        decorationsRef.current = editor.deltaDecorations([], [
          {
            range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
            options: {
              isWholeLine: true,
              className: 'im-error-line',
              linesDecorationsClassName: 'im-error-gutter',
            },
          },
        ]);
      }
    }
  }, [runOutput?.stderr]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleEditorMount(editor: any) {
    editorRef.current = editor;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.onDidChangeCursorPosition((e: any) => {
      setCursor({ line: e.position.lineNumber, col: e.position.column });
    });
    editor.onDidChangeModelContent(() => {
      lastActivityRef.current = Date.now();
    });
  }

  return (
    <div className="flex h-full flex-col">
      {isApproach ? (
        /* Approach toolbar */
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
          <span className="text-xs text-muted">
            approach.txt
            <span className="mx-2 text-border">·</span>
            plain text
            <span className="mx-2 text-border">·</span>
            <span className="text-muted/50">no syntax checking</span>
          </span>
          <button
            onClick={confirmApproach}
            disabled={!code.trim()}
            className="border border-accent px-4 py-1.5 text-xs tracking-widest text-accent transition hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            CONFIRM APPROACH →
          </button>
        </div>
      ) : (
        /* Tab bar */
        <div className="flex h-8 shrink-0 items-stretch border-b border-border">
          <div className="flex items-center gap-2 border-r border-border bg-canvas px-4 text-xs text-white">
            solution.{LANG_EXT[language]}
            {isDebrief && <span className="text-muted/50">· read-only</span>}
          </div>
          <div className="flex items-center border-r border-border px-4 text-xs text-muted/40">
            tests.py
          </div>
          <div className="ml-auto flex items-center px-3 text-xs text-muted/60">
            {language} · 4-space
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="min-h-0 flex-1">
        <MonacoEditor
          height="100%"
          language={isApproach ? 'plaintext' : MONACO_LANG[language]}
          value={code}
          onChange={(v) => setCode(v ?? '')}
          onMount={handleEditorMount}
          options={{
            theme: 'vs-dark',
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: !isApproach },
            scrollBeyondLastLine: false,
            readOnly: disabled,
            lineNumbers: 'on',
            renderLineHighlight: 'gutter',
            padding: { top: 12 },
            wordWrap: isApproach ? 'on' : 'off',
          }}
        />
      </div>

      {/* Running indicator */}
      {!isApproach && isRunning && (
        <div className="shrink-0 border-t border-border bg-canvas px-4 py-2 text-xs">
          <span className="animate-pulse text-muted">$ running…</span>
        </div>
      )}

      {/* Execution unavailable — retry prompt */}
      {!isApproach && submissionError && !isRunning && (
        <div className="shrink-0 border-t border-border bg-canvas px-4 py-2 text-xs">
          <p className="text-danger">$ execution unavailable</p>
          <p className="mt-0.5 text-muted/80">&gt; {submissionError}</p>
          <button
            onClick={() => {
              useSessionStore.getState().setSubmissionError(null);
              if (code.trim()) getSocket().emit('code:submit', { sessionId, code, language });
            }}
            className="mt-2 border border-border px-3 py-1 text-muted transition hover:border-accent hover:text-white"
          >
            ↺ retry submission
          </button>
        </div>
      )}

      {/* Test output panel */}
      {!isApproach && runOutput && !isRunning && (
        <div className="max-h-40 shrink-0 overflow-y-auto border-t border-border bg-canvas px-4 py-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted">$ judge0</span>
            <span className={runOutput.status === 'Accepted' ? 'text-success' : 'text-danger'}>
              {runOutput.status.toLowerCase()}
            </span>
          </div>
          {testsPassed !== null && (
            <p className={`mt-0.5 ${testsPassed === testsTotal ? 'text-success' : 'text-danger'}`}>
              &gt; {testsPassed}/{testsTotal} tests passed
            </p>
          )}
          {runOutput.runtimeMs !== undefined && (
            <p className="text-muted/60">&gt; {runOutput.runtimeMs}ms</p>
          )}
          {runOutput.stderr && (
            <div className="mt-1.5 border-l-2 border-danger/50 pl-2">
              <p className="mb-0.5 text-[10px] tracking-widest text-danger/70">
                {runOutput.status.toLowerCase().includes('compile') ? '// compile error' : '// stderr'}
              </p>
              <pre className="whitespace-pre-wrap break-all text-danger/80">{runOutput.stderr}</pre>
            </div>
          )}
        </div>
      )}

      {/* Status bar */}
      {!isApproach && (
        <div className="flex h-8 shrink-0 items-center justify-between border-t border-border px-3">
          <span className="text-xs text-muted/50">
            Ln {cursor.line}, Col {cursor.col}
          </span>
          <div className="flex items-center gap-4">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              disabled={isRunning}
              className="bg-transparent text-xs text-muted focus:outline-none disabled:opacity-50"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            {!isDebrief && (
              <button
                onClick={submit}
                disabled={disabled || isRunning || !code.trim()}
                className="text-xs font-semibold text-success transition hover:text-success/70 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isRunning ? 'Running…' : 'SUBMIT'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
