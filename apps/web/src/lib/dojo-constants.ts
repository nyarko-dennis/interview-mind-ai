import type { AlgorithmicPattern } from '@interview-mind/shared';

export const PATTERN_LABELS: Record<AlgorithmicPattern, string> = {
  TWO_POINTERS: 'Two Pointers',
  SLIDING_WINDOW: 'Sliding Window',
  FAST_SLOW_POINTERS: 'Fast & Slow Pointers',
  BINARY_SEARCH: 'Binary Search',
  BFS: 'BFS',
  DFS_BACKTRACKING: 'DFS / Backtracking',
  DP_1D: 'Dynamic Prog. 1D',
  DP_2D: 'Dynamic Prog. 2D',
  MONOTONIC_STACK: 'Monotonic Stack',
  HEAP: 'Heap / Priority Queue',
  INTERVALS: 'Intervals',
  UNION_FIND: 'Union-Find',
  TRIE: 'Trie',
  BIT_MANIPULATION: 'Bit Manipulation',
  LINKED_LISTS: 'Linked Lists',
  HASH_MAPS: 'Hash Maps & Sets',
  PREFIX_SUMS: 'Prefix Sums',
  GREEDY: 'Greedy',
  SORT_SEARCH: 'Sort & Search',
  MATH_GEOMETRY: 'Math & Geometry',
};

export const ALL_PATTERNS = Object.keys(PATTERN_LABELS) as AlgorithmicPattern[];

export const PHASE_LABELS: Record<string, string> = {
  CLARIFICATION: 'Clarification',
  APPROACH: 'Approach',
  IMPLEMENTATION: 'Implementation',
};

export const STATUS_LABELS: Record<string, string> = {
  LOCKED: 'Locked',
  TRAINING: 'Training',
  INTERVIEW_READY: 'Interview Ready',
  GUIDED_PASSED: 'Guided Passed',
  MASTERED: 'Mastered',
};

export const STATUS_COLORS: Record<string, string> = {
  LOCKED: 'text-muted/50 border-border/50',
  TRAINING: 'text-warning border-warning/50',
  INTERVIEW_READY: 'text-accent border-accent/50',
  GUIDED_PASSED: 'text-success border-success/50',
  MASTERED: 'text-white border-white/50 bg-accent/10',
};

// XP required for each level boundary (drill-only levels 1-3)
export const XP_THRESHOLDS = [0, 30, 80] as const;

export function levelFromXp(xp: number): number {
  if (xp >= XP_THRESHOLDS[2]) return 3;
  if (xp >= XP_THRESHOLDS[1]) return 2;
  return 1;
}

export function xpToNextLevel(xp: number): { current: number; next: number; pct: number } {
  if (xp >= XP_THRESHOLDS[2]) return { current: xp, next: XP_THRESHOLDS[2], pct: 100 };
  if (xp >= XP_THRESHOLDS[1]) {
    const range = XP_THRESHOLDS[2] - XP_THRESHOLDS[1];
    return { current: xp - XP_THRESHOLDS[1], next: range, pct: Math.round(((xp - XP_THRESHOLDS[1]) / range) * 100) };
  }
  const range = XP_THRESHOLDS[1] - XP_THRESHOLDS[0];
  return { current: xp, next: range, pct: Math.round((xp / range) * 100) };
}
