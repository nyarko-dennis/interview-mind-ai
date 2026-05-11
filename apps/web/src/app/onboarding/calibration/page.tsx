'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingStore, scoreToTier } from '@/lib/onboarding-store';

const QUESTIONS = [
  {
    id: 1,
    question: 'Which pattern would you use to find a pair in a sorted array that sums to a target?',
    options: ['Binary Search', 'Two Pointers', 'BFS', 'Dynamic Programming'],
    answer: 1,
  },
  {
    id: 2,
    question: "What data structure underpins Dijkstra's shortest path algorithm?",
    options: ['Stack', 'Queue', 'Min-Heap', 'Hash Map'],
    answer: 2,
  },
  {
    id: 3,
    question: 'A problem asks for the maximum sum subarray of length k. Which pattern fits?',
    options: ['Two Pointers', 'Sliding Window', 'Prefix Sums', 'Greedy'],
    answer: 1,
  },
  {
    id: 4,
    question: 'Detecting a cycle in a linked list is best solved with:',
    options: ['Hash Set', 'Fast & Slow Pointers', 'DFS', 'Binary Search'],
    answer: 1,
  },
  {
    id: 5,
    question: 'Which recurrence defines the classic 0/1 knapsack problem?',
    options: [
      'dp[i] = dp[i-1] + dp[i-2]',
      'dp[i][w] = max(dp[i-1][w], dp[i-1][w-wt]+val)',
      'dp[i] = min(dp[i-1]+1, dp[i-2]+1)',
      'dp[i][j] = dp[i-1][j-1] + 1',
    ],
    answer: 1,
  },
  {
    id: 6,
    question: 'Finding the shortest path in an unweighted grid is best approached with:',
    options: ['DFS', 'BFS', 'Dijkstra', 'Binary Search'],
    answer: 1,
  },
  {
    id: 7,
    question: 'Which approach finds all subsets of an array in O(2ⁿ) time?',
    options: ['Greedy', 'Two Pointers', 'DFS / Backtracking', 'Prefix Sums'],
    answer: 2,
  },
  {
    id: 8,
    question: 'Checking whether two strings are anagrams in O(n) time uses:',
    options: ['Sorting', 'Hash Map (character counts)', 'Sliding Window', 'Union-Find'],
    answer: 1,
  },
  {
    id: 9,
    question: 'You need to find the kth largest element efficiently. The right data structure is:',
    options: ['Sorted Array', 'Stack', 'Min-Heap of size k', 'Queue'],
    answer: 2,
  },
  {
    id: 10,
    question: 'Merging overlapping intervals requires sorting by start time, then:',
    options: [
      'Using a stack to track open intervals',
      'Comparing each interval to the last merged one',
      'Running BFS across interval pairs',
      'Using a prefix sum over start times',
    ],
    answer: 1,
  },
];

const OPT_LABELS = ['A', 'B', 'C', 'D'];

export default function CalibrationPage() {
  const router = useRouter();
  const setCalibrationScore = useOnboardingStore((s) => s.setCalibrationScore);

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = QUESTIONS[current];

  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === q.answer) setScore((s) => s + 1);
  }

  function handleNext() {
    if (current + 1 >= QUESTIONS.length) {
      setDone(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
    }
  }

  function handleContinue() {
    setCalibrationScore(score);
    router.push('/onboarding/persona');
  }

  if (done) {
    const tier = scoreToTier(score);
    return (
      <div className="flex flex-1 flex-col justify-center px-16 py-12">
        <p className="mb-8 text-xs text-muted">$ calibration.sh</p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg">
          <div className="mb-6 space-y-2 text-sm">
            <div className="flex gap-6">
              <span className="w-20 shrink-0 text-muted">score</span>
              <span className="text-white">
                {score} / {QUESTIONS.length}
              </span>
            </div>
            <div className="flex gap-6">
              <span className="w-20 shrink-0 text-muted">tier</span>
              <span className="font-semibold text-accent">{tier}</span>
            </div>
          </div>
          <button
            onClick={handleContinue}
            className="border border-border px-5 py-2 text-sm text-white transition hover:border-accent hover:text-accent"
          >
            continue →
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-16 py-12">
      <p className="mb-10 text-xs text-muted">$ calibration.sh</p>

      {current > 0 && (
        <div className="mb-5 flex flex-col gap-1.5">
          {QUESTIONS.slice(0, current).map((pq) => (
            <p key={pq.id} className="flex items-center gap-2 text-xs text-muted/40">
              <span className="text-success/60">✓</span>
              {pq.question}
            </p>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="max-w-xl"
        >
          <div className="mb-5 flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-accent">›</span>
            <p className="text-base leading-snug text-white">{q.question}</p>
          </div>

          <div className="ml-4 flex flex-col gap-2">
            {q.options.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = selected !== null && i === q.answer;
              const isWrong = isSelected && i !== q.answer;
              const isDimmed = selected !== null && !isSelected && i !== q.answer;

              return (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={selected !== null}
                  className={[
                    'flex items-center gap-3 border px-4 py-2.5 text-left text-sm transition',
                    isCorrect
                      ? 'border-success text-success'
                      : isWrong
                      ? 'border-danger text-danger'
                      : isDimmed
                      ? 'border-border text-muted/30'
                      : 'border-border text-white hover:border-accent',
                  ].join(' ')}
                >
                  <span className="shrink-0 text-xs text-muted">[{OPT_LABELS[i]}]</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ml-4 mt-5 flex items-center justify-between"
            >
              <span className="text-xs text-muted">
                {selected === q.answer
                  ? '> correct'
                  : `> correct: [${OPT_LABELS[q.answer]}] ${q.options[q.answer]}`}
              </span>
              <button onClick={handleNext} className="text-xs text-accent hover:underline">
                {current + 1 >= QUESTIONS.length ? 'finish →' : 'next →'}
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {current < QUESTIONS.length - 1 && (
        <div className="mt-5 flex flex-col gap-1.5">
          {QUESTIONS.slice(current + 1).map((uq) => (
            <p key={uq.id} className="flex items-center gap-2 text-xs text-muted/25">
              <span className="shrink-0">›</span>
              {uq.question}
            </p>
          ))}
        </div>
      )}

      <p className="mt-10 text-[11px] tracking-widest text-muted/50">
        QUESTION {current + 1} / {QUESTIONS.length}
      </p>
    </div>
  );
}
