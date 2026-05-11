export type AlgorithmicPattern =
  | 'TWO_POINTERS'
  | 'SLIDING_WINDOW'
  | 'FAST_SLOW_POINTERS'
  | 'BINARY_SEARCH'
  | 'BFS'
  | 'DFS_BACKTRACKING'
  | 'DP_1D'
  | 'DP_2D'
  | 'MONOTONIC_STACK'
  | 'HEAP'
  | 'INTERVALS'
  | 'UNION_FIND'
  | 'TRIE'
  | 'BIT_MANIPULATION'
  | 'LINKED_LISTS'
  | 'HASH_MAPS'
  | 'PREFIX_SUMS'
  | 'GREEDY'
  | 'SORT_SEARCH'
  | 'MATH_GEOMETRY';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface Problem {
  id: string;
  title: string;
  slug: string;
  pattern: AlgorithmicPattern;
  difficulty: DifficultyLevel;
  statement: string;
  hintCeiling: number;
}

export interface Hint {
  id: string;
  problemId: string;
  level: 1 | 2 | 3 | 4;
  content: string;
}
