import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 8 — DP_2D (29 problems: 10 Easy, 9 Medium, 10 Hard)
// Already seeded: Unique Paths (Medium)
// Hint levels: L1 = structural nudge, L2 = pattern pointer, L3 = pseudocode scaffold
// hintCeiling: Easy = 2, Medium/Hard = 3

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const BATCH: Array<{
  title: string;
  slug: string;
  pattern: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  statement: string;
  hintCeiling: number;
  hints: Array<{ level: number; content: string }>;
}> = [
  // ── EASY ──────────────────────────────────────────────────────────────────

  {
    title: 'Island Perimeter',
    slug: 'island-perimeter',
    pattern: 'DP_2D',
    difficulty: 'EASY',
    statement:
      'You are given a grid where 1 = land and 0 = water. Calculate the perimeter of the island. There is exactly one island and no lakes.\n\nExample: grid=[[0,1,0,0],[1,1,1,0],[0,1,0,0],[1,1,0,0]] → 16\nExample: grid=[[1]] → 4\nExample: grid=[[1,0]] → 4',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Each land cell contributes 4 sides to the perimeter. Subtract 2 for every edge shared with an adjacent land cell (each shared edge removes one side from each of the two cells). Count land cells and shared edges.',
      },
      {
        level: 2,
        content:
          'Iterate every cell. For each land cell: perimeter += 4. For each of its 4 neighbours that is also land: perimeter -= 1 (or check only right and down to avoid double-counting: perimeter -= 2 per shared edge). O(m*n).',
      },
    ],
  },

  {
    title: 'Matrix Diagonal Sum',
    slug: 'matrix-diagonal-sum',
    pattern: 'DP_2D',
    difficulty: 'EASY',
    statement:
      'Given a square matrix mat, return the sum of both diagonals. If the matrix has an odd number of rows/columns, the centre element is counted only once.\n\nExample: mat=[[1,2,3],[4,5,6],[7,8,9]] → 25\nExample: mat=[[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1]] → 8',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'The main diagonal contains mat[i][i]. The anti-diagonal contains mat[i][n-1-i]. For odd n, mat[n//2][n//2] is on both diagonals — subtract it once.',
      },
      {
        level: 2,
        content:
          'total = sum(mat[i][i] + mat[i][n-1-i] for i in range(n)). if n%2==1: total -= mat[n//2][n//2]. Return total. O(n) time — you only need one pass through the n diagonal index pairs.',
      },
    ],
  },

  {
    title: 'Toeplitz Matrix',
    slug: 'toeplitz-matrix',
    pattern: 'DP_2D',
    difficulty: 'EASY',
    statement:
      'A matrix is Toeplitz if every diagonal from top-left to bottom-right has the same value. Given an m×n matrix, return true if it is Toeplitz.\n\nExample: matrix=[[1,2,3,4],[5,1,2,3],[9,5,1,2]] → true\nExample: matrix=[[1,2],[2,2]] → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Every element (except those in the top row and left column) must equal the element diagonally above-left: matrix[i][j] == matrix[i-1][j-1].',
      },
      {
        level: 2,
        content:
          'For i in range(1,m): for j in range(1,n): if matrix[i][j] != matrix[i-1][j-1]: return False. Return True. O(m*n). For very large matrices that don\'t fit in memory, process row by row — each row only needs to be compared to the previous one.',
      },
    ],
  },

  {
    title: 'Lucky Numbers in a Matrix',
    slug: 'lucky-numbers-in-a-matrix',
    pattern: 'DP_2D',
    difficulty: 'EASY',
    statement:
      'A lucky number is the minimum element in its row and the maximum in its column. Given a matrix with distinct values, find all lucky numbers.\n\nExample: matrix=[[3,7,8],[9,11,13],[15,16,17]] → [15]\nExample: matrix=[[1,10,4,2],[9,3,8,7],[15,16,17,12]] → [12]\nExample: matrix=[[7,8],[1,2]] → [7]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Precompute the minimum of each row and the maximum of each column. A lucky number must equal its row minimum AND its column maximum.',
      },
      {
        level: 2,
        content:
          'row_min=[min(row) for row in matrix]. col_max=[max(matrix[r][c] for r in range(m)) for c in range(n)]. Return [matrix[r][c] for r in range(m) for c in range(n) if matrix[r][c]==row_min[r] and matrix[r][c]==col_max[c]]. O(m*n) with distinct values guarantees at most one lucky number.',
      },
    ],
  },

  {
    title: 'Range Sum Query 2D - Immutable',
    slug: 'range-sum-query-2d-immutable',
    pattern: 'DP_2D',
    difficulty: 'EASY',
    statement:
      'Implement a class NumMatrix where sumRegion(row1,col1,row2,col2) returns the sum of the submatrix in O(1) after O(m*n) preprocessing.\n\nExample: NumMatrix([[3,0,1,4,2],[5,6,3,2,1],[1,2,0,1,5],[4,1,0,1,7],[1,0,3,0,5]])\nsumRegion(2,1,4,3) → 8; sumRegion(1,1,2,2) → 11; sumRegion(1,2,2,4) → 12',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Precompute a 2D prefix sum table: prefix[i][j] = sum of all elements in the submatrix from (0,0) to (i-1,j-1). Any rectangular sum can then be computed in O(1) using inclusion-exclusion.',
      },
      {
        level: 2,
        content:
          'Build prefix[i+1][j+1] = matrix[i][j] + prefix[i][j+1] + prefix[i+1][j] - prefix[i][j]. sumRegion(r1,c1,r2,c2) = prefix[r2+1][c2+1] - prefix[r1][c2+1] - prefix[r2+1][c1] + prefix[r1][c1]. The +1 offsets keep prefix[0][*] and prefix[*][0] as zero boundary rows/columns.',
      },
    ],
  },

  {
    title: 'Richest Customer Wealth',
    slug: 'richest-customer-wealth',
    pattern: 'DP_2D',
    difficulty: 'EASY',
    statement:
      'accounts[i][j] is the amount of money customer i has in bank j. Return the wealth of the richest customer (the maximum row sum).\n\nExample: accounts=[[1,2,3],[3,2,1]] → 6\nExample: accounts=[[1,5],[7,3],[3,5]] → 10\nExample: accounts=[[2,8,7],[7,1,3],[1,9,5]] → 17',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          "A customer's wealth is the sum of all their bank accounts (sum of a row). The richest customer has the maximum row sum.",
      },
      {
        level: 2,
        content:
          'return max(sum(row) for row in accounts). O(m*n). Building a 2D prefix sum is overkill here; a simple row sum is sufficient since queries are not repeated.',
      },
    ],
  },

  {
    title: 'Check if Matrix Is X-Matrix',
    slug: 'check-if-matrix-is-x-matrix',
    pattern: 'DP_2D',
    difficulty: 'EASY',
    statement:
      'A square matrix is an X-Matrix if all diagonal elements are non-zero and all non-diagonal elements are zero. Both diagonals count.\n\nExample: grid=[[2,0,0,1],[0,3,1,0],[0,5,2,0],[4,0,0,2]] → true\nExample: grid=[[5,7,0],[0,3,1],[0,5,0]] → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'A cell (i,j) is on a diagonal if i==j (main diagonal) or i+j==n-1 (anti-diagonal). Check: diagonal cells must be non-zero, non-diagonal cells must be zero.',
      },
      {
        level: 2,
        content:
          'For i in range(n): for j in range(n): on_diag = (i==j or i+j==n-1). if on_diag and grid[i][j]==0: return False. if not on_diag and grid[i][j]!=0: return False. return True. O(n²).',
      },
    ],
  },

  {
    title: 'Minimum Path Sum',
    slug: 'minimum-path-sum',
    pattern: 'DP_2D',
    difficulty: 'EASY',
    statement:
      'Given an m×n grid of non-negative integers, find a path from top-left to bottom-right that minimises the sum of all numbers along the path. You can only move right or down.\n\nExample: grid=[[1,3,1],[1,5,1],[4,2,1]] → 7 (path 1→3→1→1→1)\nExample: grid=[[1,2,3],[4,5,6]] → 12',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'dp[i][j] = minimum path sum to reach cell (i,j). You can arrive only from the left or above: dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1]). Handle the first row and column as special cases.',
      },
      {
        level: 2,
        content:
          'In-place DP (modify grid). First row: grid[0][j] += grid[0][j-1]. First col: grid[i][0] += grid[i-1][0]. Interior: grid[i][j] += min(grid[i-1][j], grid[i][j-1]). Return grid[m-1][n-1]. O(m*n) time, O(1) extra space.',
      },
    ],
  },

  {
    title: 'Triangle',
    slug: 'triangle',
    pattern: 'DP_2D',
    difficulty: 'EASY',
    statement:
      'Given a triangle array (list of rows), find the minimum path sum from top to bottom. At each step you can move to an adjacent number in the row below (index i or i+1).\n\nExample: triangle=[[2],[3,4],[6,5,7],[4,1,8,3]] → 11 (path 2→3→5→1)\nExample: triangle=[[-10]] → -10',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Process bottom-up: for each row, the minimum cost to reach the bottom from position j is triangle[i][j] + min(dp[j], dp[j+1]). Start with dp = last row. This avoids copying the triangle.',
      },
      {
        level: 2,
        content:
          'Bottom-up DP. dp=triangle[-1][:]. For i in range(len(triangle)-2,-1,-1): for j in range(len(triangle[i])): dp[j]=triangle[i][j]+min(dp[j],dp[j+1]). Return dp[0]. O(n²) time, O(n) space where n is the number of rows.',
      },
    ],
  },

  {
    title: 'Count Square Submatrices with All Ones',
    slug: 'count-square-submatrices-with-all-ones',
    pattern: 'DP_2D',
    difficulty: 'EASY',
    statement:
      'Given a binary matrix, return the total number of square submatrices that have all ones.\n\nExample: matrix=[[0,1,1,1],[1,1,1,1],[0,1,1,1]] → 15\nExample: matrix=[[1,0,1],[1,1,0],[1,1,0]] → 7',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'dp[i][j] = side length of the largest square with bottom-right corner at (i,j). The number of squares with that corner is exactly dp[i][j] (a 1×1, 2×2, …, dp[i][j]×dp[i][j] square all end here).',
      },
      {
        level: 2,
        content:
          'DP. dp[i][j] = 0 if matrix[i][j]==0 else 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]). Sum all dp values. This counts every square: a square of side k contributes 1 to each of the k² cells in its bottom-right "staircase". Total = sum(dp). O(m*n).',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Longest Common Subsequence',
    slug: 'longest-common-subsequence',
    pattern: 'DP_2D',
    difficulty: 'MEDIUM',
    statement:
      'Given two strings text1 and text2, return the length of their longest common subsequence. Return 0 if none exists.\n\nExample: text1="abcde", text2="ace" → 3 (subsequence "ace")\nExample: text1="abc", text2="abc" → 3\nExample: text1="abc", text2="def" → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[i][j] = LCS length of text1[0:i] and text2[0:j]. If the last characters match: dp[i][j] = dp[i-1][j-1] + 1. Otherwise: dp[i][j] = max(dp[i-1][j], dp[i][j-1]). What are the base cases?',
      },
      {
        level: 2,
        content:
          '2D DP. dp[i][j]: if text1[i-1]==text2[j-1]: dp[i][j]=dp[i-1][j-1]+1. else: dp[i][j]=max(dp[i-1][j],dp[i][j-1]). Base: dp[0][*]=dp[*][0]=0. Return dp[m][n]. O(m*n) time and space. Space can be reduced to O(min(m,n)) by keeping only two rows.',
      },
      {
        level: 3,
        content:
          'dp=[[0]*(n+1) for _ in range(m+1)]. For i in range(1,m+1): for j in range(1,n+1): if text1[i-1]==text2[j-1]: dp[i][j]=dp[i-1][j-1]+1. else: dp[i][j]=max(dp[i-1][j],dp[i][j-1]). Return dp[m][n]. LCS is the foundation for Edit Distance, Shortest Common Supersequence, and Minimum ASCII Delete Sum.',
      },
    ],
  },

  {
    title: 'Edit Distance',
    slug: 'edit-distance',
    pattern: 'DP_2D',
    difficulty: 'MEDIUM',
    statement:
      'Given two strings word1 and word2, return the minimum number of operations (insert, delete, replace) to convert word1 to word2.\n\nExample: word1="horse", word2="ros" → 3\nExample: word1="intention", word2="execution" → 5',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[i][j] = edit distance between word1[0:i] and word2[0:j]. If characters match: dp[i][j] = dp[i-1][j-1] (no cost). If not: dp[i][j] = 1 + min(dp[i-1][j-1] replace, dp[i-1][j] delete, dp[i][j-1] insert). What do the three transitions represent?',
      },
      {
        level: 2,
        content:
          'dp[i][j]: if word1[i-1]==word2[j-1]: dp[i][j]=dp[i-1][j-1]. else: dp[i][j]=1+min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]). Base: dp[i][0]=i (delete i chars), dp[0][j]=j (insert j chars). dp[i-1][j-1]=replace, dp[i-1][j]=delete from word1, dp[i][j-1]=insert into word1.',
      },
      {
        level: 3,
        content:
          'dp=[[0]*(n+1) for _ in range(m+1)]. For i in range(m+1): dp[i][0]=i. For j in range(n+1): dp[0][j]=j. For i in range(1,m+1): for j in range(1,n+1): if word1[i-1]==word2[j-1]: dp[i][j]=dp[i-1][j-1]. else: dp[i][j]=1+min(dp[i-1][j-1],dp[i-1][j],dp[i][j-1]). Return dp[m][n]. Space can be reduced to O(n) with a rolling array.',
      },
    ],
  },

  {
    title: 'Coin Change 2',
    slug: 'coin-change-2',
    pattern: 'DP_2D',
    difficulty: 'MEDIUM',
    statement:
      'Given an array coins and an integer amount, return the number of combinations that make up amount. Each coin can be used unlimited times.\n\nExample: amount=5, coins=[1,2,5] → 4\nExample: amount=3, coins=[2] → 0\nExample: amount=10, coins=[10] → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[i][j] = number of ways to make amount j using first i coin types. Transition: dp[i][j] = dp[i-1][j] (skip coin i) + dp[i][j-coins[i]] (use coin i, reusable). This is the unbounded knapsack variant.',
      },
      {
        level: 2,
        content:
          'Space-optimised to 1D. dp=[0]*(amount+1); dp[0]=1. For coin in coins: for j in range(coin, amount+1): dp[j]+=dp[j-coin]. Return dp[amount]. The outer loop over coins ensures each combination is counted once (not permutations). If you loop amount first, you get permutations instead.',
      },
      {
        level: 3,
        content:
          'dp=[0]*(amount+1); dp[0]=1. For coin in coins: for j in range(coin,amount+1): dp[j]+=dp[j-coin]. Return dp[amount]. Contrast with Coin Change (minimum coins): dp[j]=min(dp[j],dp[j-coin]+1). Here we sum instead of min. The outer coin loop is the key: it prevents counting [1,2] and [2,1] as different combinations.',
      },
    ],
  },

  {
    title: 'Interleaving String',
    slug: 'interleaving-string',
    pattern: 'DP_2D',
    difficulty: 'MEDIUM',
    statement:
      'Given strings s1, s2, s3, return true if s3 is formed by an interleaving of s1 and s2 (characters maintain their relative order from each source).\n\nExample: s1="aabcc", s2="dbbca", s3="aadbbcbcac" → true\nExample: s1="aabcc", s2="dbbca", s3="aadbbbaccc" → false\nExample: s1="", s2="", s3="" → true',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[i][j] = true if s3[0:i+j] can be formed by interleaving s1[0:i] and s2[0:j]. At each step, the next character of s3 came from either s1[i] or s2[j]. What must be true in each case?',
      },
      {
        level: 2,
        content:
          '2D DP. dp[i][j]: if s1[i-1]==s3[i+j-1] and dp[i-1][j]: True. if s2[j-1]==s3[i+j-1] and dp[i][j-1]: True. Base: dp[0][0]=True. dp[i][0]: s1[0:i] matches s3[0:i]. dp[0][j]: s2[0:j] matches s3[0:j]. Return dp[m][n].',
      },
      {
        level: 3,
        content:
          'if len(s1)+len(s2)!=len(s3): return False. dp=[[False]*(n+1) for _ in range(m+1)]. dp[0][0]=True. For i in range(1,m+1): dp[i][0]=dp[i-1][0] and s1[i-1]==s3[i-1]. For j in range(1,n+1): dp[0][j]=dp[0][j-1] and s2[j-1]==s3[j-1]. For i in range(1,m+1): for j in range(1,n+1): dp[i][j]=(dp[i-1][j] and s1[i-1]==s3[i+j-1]) or (dp[i][j-1] and s2[j-1]==s3[i+j-1]). Return dp[m][n].',
      },
    ],
  },

  {
    title: 'Maximal Square',
    slug: 'maximal-square',
    pattern: 'DP_2D',
    difficulty: 'MEDIUM',
    statement:
      'Given an m×n binary string matrix, find the largest square containing only \'1\'s and return its area.\n\nExample: matrix=[["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]] → 4\nExample: matrix=[["0","1"],["1","0"]] → 1\nExample: matrix=[["0"]] → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[i][j] = side length of the largest square with bottom-right corner at (i,j). If matrix[i][j]==\'1\': dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]). Why is it the minimum of three neighbours?',
      },
      {
        level: 2,
        content:
          'The minimum of the three neighbours (above, left, diagonal) determines the largest square that can be extended to (i,j). A square of side k at (i,j) requires all three to have side ≥ k-1. Track max_side. Return max_side². Base: first row/col = value of matrix[i][j].',
      },
      {
        level: 3,
        content:
          'dp=[[0]*(n+1) for _ in range(m+1)]; max_side=0. For i in range(1,m+1): for j in range(1,n+1): if matrix[i-1][j-1]=="1": dp[i][j]=min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1])+1. max_side=max(max_side,dp[i][j]). Return max_side*max_side. Space can be reduced to O(n) with two rolling rows, or O(1) if you modify matrix in-place.',
      },
    ],
  },

  {
    title: 'Partition Equal Subset Sum',
    slug: 'partition-equal-subset-sum',
    pattern: 'DP_2D',
    difficulty: 'MEDIUM',
    statement:
      'Given an integer array nums, return true if you can partition it into two subsets with equal sum.\n\nExample: nums=[1,5,11,5] → true (subsets [1,5,5] and [11])\nExample: nums=[1,2,3,5] → false',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Two equal subsets means each has sum = total/2. If total is odd: impossible. Otherwise it\'s a 0/1 knapsack problem: can you choose a subset of nums that sums to total/2?',
      },
      {
        level: 2,
        content:
          '0/1 Knapsack DP. dp[j] = true if a subset of processed numbers sums to j. Process each number in outer loop: iterate j from target down to num (to avoid reusing the same number). dp[j] |= dp[j-num]. Start dp[0]=True.',
      },
      {
        level: 3,
        content:
          'total=sum(nums). if total%2!=0: return False. target=total//2. dp=[False]*(target+1); dp[0]=True. For num in nums: for j in range(target,num-1,-1): dp[j]|=dp[j-num]. if dp[target]: return True. Return dp[target]. Iterating j backwards (high→low) prevents reusing the same element twice — this is the key difference from the unbounded Coin Change 2.',
      },
    ],
  },

  {
    title: 'Knight Probability in Chessboard',
    slug: 'knight-probability-in-chessboard',
    pattern: 'DP_2D',
    difficulty: 'MEDIUM',
    statement:
      'Place a knight on an n×n chessboard at (row,col). After exactly k moves, return the probability the knight is still on the board. The knight moves like in chess.\n\nExample: n=3, k=2, row=0, column=0 → 0.0625\nExample: n=1, k=0, row=0, column=0 → 1.0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[r][c] = probability of being at (r,c) after t moves. Start with dp[row][col]=1.0. Each step: new_dp[nr][nc] += dp[r][c]/8 for each of the 8 knight moves landing in bounds. After k steps, sum all dp values.',
      },
      {
        level: 2,
        content:
          '2D DP with two boards. Initialise dp with 1.0 at starting position. For each of k steps: new_dp=[zeros]. For each (r,c) with dp[r][c]>0: for each of 8 knight moves (nr,nc): if in bounds: new_dp[nr][nc]+=dp[r][c]/8. dp=new_dp. Return sum(dp). O(k*n²).',
      },
      {
        level: 3,
        content:
          'MOVES=[(-2,-1),(-2,1),(-1,-2),(-1,2),(1,-2),(1,2),(2,-1),(2,1)]. dp=[[0]*n for _ in range(n)]; dp[row][col]=1.0. For _ in range(k): ndp=[[0]*n for _ in range(n)]. For r in range(n): for c in range(n): if dp[r][c]>0: for dr,dc in MOVES: nr,nc=r+dr,c+dc. if 0<=nr<n and 0<=nc<n: ndp[nr][nc]+=dp[r][c]/8. dp=ndp. Return sum(dp[r][c] for r in range(n) for c in range(n)).',
      },
    ],
  },

  {
    title: 'Minimum Falling Path Sum',
    slug: 'minimum-falling-path-sum',
    pattern: 'DP_2D',
    difficulty: 'MEDIUM',
    statement:
      'Given an n×n matrix, return the minimum sum of a falling path — choose one element from each row where chosen elements in adjacent rows must be in the same or adjacent column.\n\nExample: matrix=[[2,1,3],[6,5,4],[7,8,9]] → 13 (path 1→4→8 or 1→5→7)\nExample: matrix=[[-19,57],[-40,-5]] → -59',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[i][j] = minimum falling path sum ending at (i,j). It can come from (i-1,j-1), (i-1,j), or (i-1,j+1) — all adjacent columns in the row above. Handle boundary columns specially.',
      },
      {
        level: 2,
        content:
          'In-place DP. For i in range(1,n): for j in range(n): above=matrix[i-1][j]. left=matrix[i-1][j-1] if j>0 else inf. right=matrix[i-1][j+1] if j<n-1 else inf. matrix[i][j]+=min(above,left,right). Return min(matrix[-1]). O(n²) time, O(1) extra space.',
      },
      {
        level: 3,
        content:
          'For i in range(1,n): for j in range(n): best=matrix[i-1][j]; if j>0: best=min(best,matrix[i-1][j-1]); if j<n-1: best=min(best,matrix[i-1][j+1]). matrix[i][j]+=best. Return min(matrix[n-1]). For Minimum Falling Path Sum II (can jump to any column except same), use the two-minimum values of the previous row to make transitions O(1) per cell.',
      },
    ],
  },

  {
    title: 'Minimum ASCII Delete Sum for Two Strings',
    slug: 'minimum-ascii-delete-sum-for-two-strings',
    pattern: 'DP_2D',
    difficulty: 'MEDIUM',
    statement:
      'Given two strings s1 and s2, return the lowest ASCII sum of deleted characters to make the strings equal.\n\nExample: s1="sea", s2="eat" → 231 (delete \'s\' from s1 and \'t\' from s2: 115+116)\nExample: s1="delete", s2="leet" → 403',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Equivalent to finding the maximum ASCII-weight common subsequence. Total deletion cost = sum(ASCII of s1) + sum(ASCII of s2) - 2 * sum(ASCII of LCS). Maximise the ASCII sum of the common subsequence.',
      },
      {
        level: 2,
        content:
          '2D DP similar to LCS. dp[i][j] = minimum ASCII delete cost to make s1[0:i] == s2[0:j] equal. If s1[i-1]==s2[j-1]: dp[i][j]=dp[i-1][j-1]. Else: dp[i][j]=min(dp[i-1][j]+ord(s1[i-1]), dp[i][j-1]+ord(s2[j-1])). Base: dp[i][0]=sum(ord(c) for c in s1[:i]).',
      },
      {
        level: 3,
        content:
          'dp=[[0]*(n+1) for _ in range(m+1)]. For i in range(1,m+1): dp[i][0]=dp[i-1][0]+ord(s1[i-1]). For j in range(1,n+1): dp[0][j]=dp[0][j-1]+ord(s2[j-1]). For i in range(1,m+1): for j in range(1,n+1): if s1[i-1]==s2[j-1]: dp[i][j]=dp[i-1][j-1] else: dp[i][j]=min(dp[i-1][j]+ord(s1[i-1]),dp[i][j-1]+ord(s2[j-1])). Return dp[m][n].',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Distinct Subsequences',
    slug: 'distinct-subsequences',
    pattern: 'DP_2D',
    difficulty: 'HARD',
    statement:
      'Given strings s and t, return the number of distinct subsequences of s that equals t.\n\nExample: s="rabbbit", t="rabbit" → 3\nExample: s="babgbag", t="bag" → 5',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[i][j] = number of ways to form t[0:j] as a subsequence of s[0:i]. When s[i-1]==t[j-1]: we can either use s[i-1] (then we need dp[i-1][j-1] ways) or skip it (dp[i-1][j] ways). When they differ: dp[i][j]=dp[i-1][j].',
      },
      {
        level: 2,
        content:
          '2D DP. if s[i-1]==t[j-1]: dp[i][j]=dp[i-1][j-1]+dp[i-1][j]. else: dp[i][j]=dp[i-1][j]. Base: dp[i][0]=1 (empty t is always a subsequence), dp[0][j]=0 for j>0 (non-empty t from empty s). Return dp[m][n]. Space can be reduced to O(n) with a 1D rolling array.',
      },
      {
        level: 3,
        content:
          'dp=[[0]*(n+1) for _ in range(m+1)]. For i in range(m+1): dp[i][0]=1. For i in range(1,m+1): for j in range(1,n+1): dp[i][j]=dp[i-1][j]. if s[i-1]==t[j-1]: dp[i][j]+=dp[i-1][j-1]. Return dp[m][n]. 1D optimisation: dp=[0]*(n+1); dp[0]=1. For c in s: for j in range(n,0,-1): if c==t[j-1]: dp[j]+=dp[j-1]. Backwards iteration prevents using the same s character twice.',
      },
    ],
  },

  {
    title: 'Dungeon Game',
    slug: 'dungeon-game',
    pattern: 'DP_2D',
    difficulty: 'HARD',
    statement:
      'A knight must travel from the top-left to the bottom-right of a dungeon grid. Negative cells drain HP; positive cells restore HP. The knight dies if HP drops to 0 or below at any point. Find the minimum initial HP needed.\n\nExample: dungeon=[[-2,-3,3],[-5,-10,1],[10,30,-5]] → 7',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Process bottom-up. dp[i][j] = minimum HP needed to reach the princess from (i,j). At the princess cell: min HP = max(1, 1 - dungeon[n-1][m-1]). For each other cell: the knight must survive the current cell and then have enough HP for the best path from (i+1,j) or (i,j+1).',
      },
      {
        level: 2,
        content:
          'dp[i][j] = min HP entering (i,j) to survive the rest. dp[i][j] = max(1, min(dp[i+1][j], dp[i][j+1]) - dungeon[i][j]). Process from bottom-right to top-left. dp[n-1][m-1]=max(1, 1-dungeon[n-1][m-1]). Use infinity for out-of-bounds.',
      },
      {
        level: 3,
        content:
          'dp=[[inf]*(m+1) for _ in range(n+1)]; dp[n][m-1]=dp[n-1][m]=1. For i in range(n-1,-1,-1): for j in range(m-1,-1,-1): need=min(dp[i+1][j],dp[i][j+1])-dungeon[i][j]. dp[i][j]=max(need,1). Return dp[0][0]. Top-down DP would require knowing future HP simultaneously — bottom-up is natural here because HP requirements propagate backwards from the goal.',
      },
    ],
  },

  {
    title: 'Wildcard Matching',
    slug: 'wildcard-matching',
    pattern: 'DP_2D',
    difficulty: 'HARD',
    statement:
      "Given string s and pattern p, where '?' matches any single character and '*' matches any sequence (including empty), return true if s fully matches p.\n\nExample: s=\"aa\", p=\"a\" → false\nExample: s=\"aa\", p=\"*\" → true\nExample: s=\"cb\", p=\"?a\" → false\nExample: s=\"adceb\", p=\"*a*b\" → true",
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          "dp[i][j] = true if s[0:i] matches p[0:j]. If p[j-1]='?': dp[i][j]=dp[i-1][j-1] (matches any one char). If p[j-1]='*': dp[i][j]=dp[i][j-1] (match empty) OR dp[i-1][j] (match one more char of s). If literal: dp[i][j]=dp[i-1][j-1] and s[i-1]==p[j-1].",
      },
      {
        level: 2,
        content:
          "2D DP. Base: dp[0][0]=True. dp[0][j]=dp[0][j-1] if p[j-1]=='*' (leading stars match empty s). dp[i][0]=False for i>0. Transition: if p[j-1]=='*': dp[i][j]=dp[i-1][j] or dp[i][j-1]. elif p[j-1]=='?' or p[j-1]==s[i-1]: dp[i][j]=dp[i-1][j-1]. Return dp[m][n].",
      },
      {
        level: 3,
        content:
          "dp=[[False]*(n+1) for _ in range(m+1)]; dp[0][0]=True. For j in range(1,n+1): if p[j-1]=='*': dp[0][j]=dp[0][j-1]. For i in range(1,m+1): for j in range(1,n+1): if p[j-1]=='*': dp[i][j]=dp[i-1][j] or dp[i][j-1]. elif p[j-1]=='?' or p[j-1]==s[i-1]: dp[i][j]=dp[i-1][j-1]. Return dp[m][n]. Contrast with Regular Expression Matching: '*' semantics differ ('*' means zero-or-more of previous char there vs. any sequence here).",
      },
    ],
  },

  {
    title: 'Regular Expression Matching',
    slug: 'regular-expression-matching',
    pattern: 'DP_2D',
    difficulty: 'HARD',
    statement:
      "Given string s and pattern p where '.' matches any single character and '*' matches zero or more of the preceding element, return true if s fully matches p.\n\nExample: s=\"aa\", p=\"a\" → false\nExample: s=\"aa\", p=\"a*\" → true\nExample: s=\"ab\", p=\".*\" → true\nExample: s=\"aab\", p=\"c*a*b\" → true",
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          "dp[i][j] = true if s[0:i] matches p[0:j]. When p[j-1]='*': either use it zero times (dp[i][j]=dp[i][j-2]) or one-or-more times if the preceding pattern char matches s[i-1]. When p[j-1]='.' or p[j-1]==s[i-1]: dp[i][j]=dp[i-1][j-1].",
      },
      {
        level: 2,
        content:
          "2D DP. dp[0][j]: '*' can eliminate the preceding pattern char. dp[0][j]=dp[0][j-2] if p[j-1]=='*'. Transition: if p[j-1]=='*': dp[i][j]=dp[i][j-2] (zero uses) or (dp[i-1][j] if p[j-2]=='.' or p[j-2]==s[i-1]) (one+ uses). Else if p[j-1]=='.' or p[j-1]==s[i-1]: dp[i][j]=dp[i-1][j-1].",
      },
      {
        level: 3,
        content:
          "dp=[[False]*(n+1) for _ in range(m+1)]; dp[0][0]=True. For j in range(2,n+1): if p[j-1]=='*': dp[0][j]=dp[0][j-2]. For i in range(1,m+1): for j in range(1,n+1): if p[j-1]=='*': dp[i][j]=dp[i][j-2] or (dp[i-1][j] and (p[j-2]=='.' or p[j-2]==s[i-1])). elif p[j-1]=='.' or p[j-1]==s[i-1]: dp[i][j]=dp[i-1][j-1]. Return dp[m][n]. The 'a*' pattern is a single unit — think of it as 'zero or more a's', not 'a then star'.",
      },
    ],
  },

  {
    title: 'Maximal Rectangle',
    slug: 'maximal-rectangle',
    pattern: 'DP_2D',
    difficulty: 'HARD',
    statement:
      "Given a binary matrix of '0's and '1's, find the largest rectangle containing only '1's and return its area.\n\nExample: matrix=[[\"1\",\"0\",\"1\",\"0\",\"0\"],[\"1\",\"0\",\"1\",\"1\",\"1\"],[\"1\",\"1\",\"1\",\"1\",\"1\"],[\"1\",\"0\",\"0\",\"1\",\"0\"]] → 6\nExample: matrix=[[\"0\"]] → 0",
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Treat each row as the base of a histogram: heights[j] = number of consecutive \'1\'s above (including current row). Then find the largest rectangle in each histogram. This reduces each row to the "Largest Rectangle in Histogram" problem.',
      },
      {
        level: 2,
        content:
          'Build heights array row by row: heights[j] = heights[j]+1 if matrix[i][j]==\'1\' else 0. For each row, apply the monotonic stack "Largest Rectangle in Histogram" algorithm. O(m*n) total.',
      },
      {
        level: 3,
        content:
          'def largestHistRect(h): stack=[]; max_area=0. For i,height in enumerate(h+[0]): while stack and h[stack[-1]]>=height: H=h[stack.pop()]; W=i if not stack else i-stack[-1]-1. max_area=max(max_area,H*W). stack.append(i). return max_area. heights=[0]*n. For row in matrix: for j in range(n): heights[j]=(heights[j]+1) if row[j]=="1" else 0. ans=max(ans,largestHistRect(heights)). Return ans.',
      },
    ],
  },

  {
    title: 'Scramble String',
    slug: 'scramble-string',
    pattern: 'DP_2D',
    difficulty: 'HARD',
    statement:
      'We can scramble a string by recursively splitting it into two non-empty parts and optionally swapping them. Return true if s2 is a scrambled form of s1.\n\nExample: s1="great", s2="rgeat" → true\nExample: s1="abcde", s2="caebd" → false\nExample: s1="a", s2="a" → true',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[i][j][length] = true if s1[i:i+length] can be scrambled into s2[j:j+length]. For each split point k (1 to length-1): either no-swap (s1[i:i+k]→s2[j:j+k] AND s1[i+k:i+length]→s2[j+k:j+length]) or swap (s1[i:i+k]→s2[j+length-k:j+length] AND s1[i+k:i+length]→s2[j:j+length-k]).',
      },
      {
        level: 2,
        content:
          '3D DP on length. dp[len][i][j] = true if s1[i:i+len] is a scramble of s2[j:j+len]. Fill from length=1 upward. For length=1: dp[1][i][j]=(s1[i]==s2[j]). For larger lengths: try all split points k. Return dp[n][0][0]. O(n⁴) time.',
      },
      {
        level: 3,
        content:
          'n=len(s1). dp=[[[False]*n for _ in range(n)] for _ in range(n+1)]. For i in range(n): for j in range(n): dp[1][i][j]=(s1[i]==s2[j]). For length in range(2,n+1): for i in range(n-length+1): for j in range(n-length+1): for k in range(1,length): if (dp[k][i][j] and dp[length-k][i+k][j+k]) or (dp[k][i][j+length-k] and dp[length-k][i+k][j]): dp[length][i][j]=True; break. Return dp[n][0][0]. Memoisation (top-down) is often cleaner for this problem.',
      },
    ],
  },

  {
    title: 'Cherry Pickup',
    slug: 'cherry-pickup',
    pattern: 'DP_2D',
    difficulty: 'HARD',
    statement:
      'An n×n grid: 0=empty, 1=cherry, -1=thorn. Walk from (0,0) to (n-1,n-1) and back, collecting cherries. Cannot walk through thorns or re-collect. Return max cherries; 0 if no valid round trip.\n\nExample: grid=[[0,1,-1],[1,0,-1],[1,1,1]] → 5\nExample: grid=[[1,1,-1],[1,-1,1],[-1,1,1]] → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A round trip equals two forward paths from (0,0) to (n-1,n-1) simultaneously. Model as two people making t steps each: after t steps, person 1 is at (r1,t-r1) and person 2 is at (r2,t-r2). Only need to track r1,r2 (c1=t-r1, c2=t-r2).',
      },
      {
        level: 2,
        content:
          '3D DP: dp[t][r1][r2] = max cherries for two paths after t steps, person 1 at row r1, person 2 at row r2. If (r1,c1) or (r2,c2) is a thorn: -inf. Cherries collected: grid[r1][c1] + (grid[r2][c2] if r1!=r2 else 0). Transitions: both move down or right — 4 combinations.',
      },
      {
        level: 3,
        content:
          'dp=[[-inf]*n for _ in range(n)]; dp[0][0]=grid[0][0]. For t in range(1,2*n-1): ndp=[[-inf]*n for _ in range(n)]. For r1 in range(max(0,t-n+1),min(n,t+1)): c1=t-r1; if c1<0 or c1>=n or grid[r1][c1]==-1: continue. For r2 in range(r1,min(n,t+1)): c2=t-r2; if c2<0 or c2>=n or grid[r2][c2]==-1: continue. cherries=grid[r1][c1]+(grid[r2][c2] if r1!=r2 else 0). best=max of dp[pr1][pr2] for all prev (pr1,pr2). if best!=-inf: ndp[r1][r2]=max(ndp[r1][r2],best+cherries). dp=ndp. Return max(0,dp[n-1][n-1]).',
      },
    ],
  },

  {
    title: 'Cherry Pickup II',
    slug: 'cherry-pickup-ii',
    pattern: 'DP_2D',
    difficulty: 'HARD',
    statement:
      'Two robots start at row 0, columns 0 and n-1 respectively. Both move to the next row each step, choosing column c-1, c, or c+1. Cherries on the same cell are collected only once. Return maximum cherries collected.\n\nExample: grid=[[3,1,1],[2,5,1],[1,5,5],[2,1,1]] → 24\nExample: grid=[[1,0,0,0,0,0,1],[2,0,0,0,0,3,0],[2,0,9,0,0,0,0],[0,3,0,5,4,0,0],[1,0,2,3,0,0,6]] → 28',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[row][c1][c2] = max cherries when both robots are at row "row" in columns c1 and c2. Each robot can move to one of three columns at the next row. Try all 9 combinations per step. Cherry collection: grid[row][c1] + (grid[row][c2] if c1!=c2 else 0).',
      },
      {
        level: 2,
        content:
          'Top-down DP with memoization or bottom-up. State: (row, c1, c2). Since both robots always advance one row, process row by row. For each state, try all 9 (dc1, dc2) combinations from {-1,0,1}×{-1,0,1}. O(m * n² * 9) time.',
      },
      {
        level: 3,
        content:
          'from functools import lru_cache. @lru_cache(None). def dp(row,c1,c2): if row==m: return 0. cherries=grid[row][c1]+(0 if c1==c2 else grid[row][c2]). best=0. For dc1 in [-1,0,1]: for dc2 in [-1,0,1]: nc1,nc2=c1+dc1,c2+dc2. if 0<=nc1<n and 0<=nc2<n: best=max(best,dp(row+1,nc1,nc2)). return cherries+best. Return dp(0,0,n-1). Since both robots always move to the next row, the state space is O(m*n²).',
      },
    ],
  },

  {
    title: 'Paint House III',
    slug: 'paint-house-iii',
    pattern: 'DP_2D',
    difficulty: 'HARD',
    statement:
      'There are m houses in a row, n colors, and a target number of neighborhoods (groups of consecutive houses with the same color). cost[i][j] = cost to paint house i with color j. Some houses have fixed colors (houses[i]>0). Find the minimum cost to achieve exactly target neighborhoods, or -1 if impossible.\n\nExample: houses=[0,0,0,0,0], cost=[[1,10],[10,1],[10,1],[1,10],[5,1]], m=5, n=2, target=3 → 9\nExample: houses=[0,2,1,2,0], cost=[[1,10],[10,1],[10,1],[1,10],[5,1]], m=5, n=2, target=3 → 11',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[i][j][k] = minimum cost to paint houses 0..i where house i has color j and there are k neighborhoods so far. Transitions: same color as previous (k stays same), different color (k increases by 1). Skip fixed houses (only one color option).',
      },
      {
        level: 2,
        content:
          '3D DP. dp[i][j][k] for house i, color j (1-indexed), k neighborhoods. From dp[i-1][pj][pk]: if pj==j: dp[i][j][pk] = min(..., dp[i-1][pj][pk] + paint_cost). If pj!=j: dp[i][j][pk+1] = min(...). Fixed houses: only consider houses[i] as color. Return min(dp[m-1][*][target]) or -1.',
      },
      {
        level: 3,
        content:
          'INF=float("inf"). dp=[[[INF]*(target+1) for _ in range(n+1)] for _ in range(m)]. Init row 0: if houses[0]>0: dp[0][houses[0]][1]=0 else: for c in 1..n: dp[0][c][1]=cost[0][c-1]. For i in 1..m-1: colors=[houses[i]] if houses[i]>0 else range(1,n+1). For j in colors: paint=0 if houses[i]>0 else cost[i][j-1]. For k in 1..target: for pj in 1..n: if dp[i-1][pj][k]==INF: continue. if pj==j: dp[i][j][k]=min(dp[i][j][k],dp[i-1][pj][k]+paint). elif k>1: dp[i][j][k]=min(dp[i][j][k],dp[i-1][pj][k-1]+paint). Return min(dp[m-1][c][target] for c in 1..n) or -1.',
      },
    ],
  },

  {
    title: 'Number of Music Playlists',
    slug: 'number-of-music-playlists',
    pattern: 'DP_2D',
    difficulty: 'HARD',
    statement:
      'Your music player has n unique songs. Build a playlist of exactly goal songs where: every song is played at least once, and a song can be replayed only after k other songs have been played since its last play. Return the number of valid playlists mod 10^9+7.\n\nExample: goal=3, n=3, k=1 → 6\nExample: goal=2, n=2, k=0 → 2\nExample: goal=2, n=3, k=1 → 6',
    hintCeilling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[i][j] = number of playlists of length i using exactly j unique songs. At each step, either add a new song (j-1 unique songs before, n-(j-1) choices) or replay an old one (j unique songs already in playlist, max(0, j-k) choices to avoid recentness constraint).',
      },
      {
        level: 2,
        content:
          '2D DP. dp[i][j] = playlists of length i with exactly j distinct songs. dp[i][j] += dp[i-1][j-1] * (n-(j-1)) (add new song: n-j+1 choices). dp[i][j] += dp[i-1][j] * max(0, j-k) (replay old: j-k valid choices). Base: dp[0][0]=1.',
      },
      {
        level: 3,
        content:
          'MOD=10**9+7. dp=[[0]*(n+1) for _ in range(goal+1)]; dp[0][0]=1. For i in range(1,goal+1): for j in range(1,min(i,n)+1): dp[i][j]=(dp[i-1][j-1]*(n-j+1)+dp[i-1][j]*max(0,j-k))%MOD. Return dp[goal][n]. Adding a new song: n-(j-1) choices because j-1 songs are already in use. Replaying: j songs in library, but the k most recently played are forbidden, leaving max(0,j-k) choices.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 8 — DP_2D (29 problems)...\n');

  let seeded = 0;
  let skipped = 0;

  for (const problem of BATCH) {
    const { hints: problemHints, ...problemData } = problem;

    const [inserted] = await db
      .insert(problems)
      .values(problemData)
      .onConflictDoNothing({ target: problems.slug })
      .returning({ id: problems.id, title: problems.title });

    if (!inserted) {
      console.log(`  skip  ${problem.slug}`);
      skipped++;
      continue;
    }

    for (const hint of problemHints) {
      await db.insert(hints).values({ problemId: inserted.id, ...hint });
    }

    const tag = `[${problem.difficulty}]`;
    console.log(`  ✓  ${tag.padEnd(8)} ${inserted.title}`);
    seeded++;
  }

  console.log(`\nDone. ${seeded} seeded, ${skipped} skipped.`);
  await client.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
