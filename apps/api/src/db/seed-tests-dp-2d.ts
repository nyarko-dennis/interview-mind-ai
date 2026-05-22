import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, sql } from 'drizzle-orm';
import * as schema from './schema';
const { problems } = schema;

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

// ---------------------------------------------------------------------------
// Programmatic Test Runner Compiler & Serializer
// ---------------------------------------------------------------------------

function serializeVal(val: any, lang: string, type?: string): string {
  if (val === null || val === undefined) {
    return lang === 'python' ? 'None' : 'null';
  }
  if (typeof val === 'boolean') {
    return lang === 'python' ? (val ? 'True' : 'False') : (val ? 'true' : 'false');
  }
  if (typeof val === 'string') {
    return JSON.stringify(val);
  }
  if (typeof val === 'number') {
    return val.toString();
  }
  if (Array.isArray(val)) {
    if (lang === 'python' || lang === 'javascript' || lang === 'typescript') {
      return '[' + val.map(x => serializeVal(x, lang, type)).join(', ') + ']';
    }
    if (lang === 'kotlin') {
      if (val.length === 0) {
        if (type === 'char_array') return 'charArrayOf()';
        if (type === 'string_array') return 'arrayOf<String>()';
        if (type === 'int_array_2d') return 'arrayOf<IntArray>()';
        return 'intArrayOf()';
      }
      if (Array.isArray(val[0])) {
        if (typeof val[0][0] === 'string') {
          return `arrayOf(${val.map(row => `charArrayOf(${row.map((x: string) => `'${x}'`).join(',')})`).join(',')})`;
        }
        return `arrayOf(${val.map(row => `intArrayOf(${row.join(',')})`).join(',')})`;
      }
      if (typeof val[0] === 'string') {
        return `arrayOf(${val.map(s => serializeVal(s, lang)).join(',')})`;
      }
      return `intArrayOf(${val.join(',')})`;
    }
  }
  return JSON.stringify(val);
}

function buildPythonRunner(funcName: string, type: string, testCases: any[]): string {
  let code = `_pass = _total = 0\n`;
  if (type === 'unordered_list') {
    code += `def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    if sorted(result or []) == sorted(expected or []):
        _pass += 1\n\n`;
  } else {
    code += `def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    if result == expected:
        _pass += 1\n\n`;
  }

  testCases.forEach((tc, idx) => {
    const label = tc.label || `test_${idx}`;
    const argsStr = tc.inputs.map(x => serializeVal(x, 'python')).join(', ');
    code += `_t(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'python')}, ${JSON.stringify(label)})\n`;
  });

  code += `print(f"{_pass}/{_total} tests passed")`;
  return code;
}

function buildJSRunner(funcName: string, type: string, testCases: any[]): string {
  let code = `let _pass = 0, _total = 0;\n`;
  if (type === 'unordered_list') {
    code += `function _t(r, e) {
  _total++;
  if (JSON.stringify([...(r || [])].sort()) === JSON.stringify([...(e || [])].sort())) _pass++;
}\n\n`;
  } else {
    code += `function _t(r, e) { _total++; if (JSON.stringify(r) === JSON.stringify(e)) _pass++; }\n\n`;
  }

  testCases.forEach((tc, idx) => {
    const argsStr = tc.inputs.map(x => serializeVal(x, 'javascript')).join(', ');
    code += `_t(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'javascript')});\n`;
  });

  code += `console.log(\`\${_pass}/\${_total} tests passed\`);`;
  return code;
}

function buildTSRunner(funcName: string, type: string, testCases: any[]): string {
  let code = `let _pass = 0, _total = 0;\n`;
  if (type === 'unordered_list') {
    code += `function _t(r: any, e: any): void {
  _total++;
  if (JSON.stringify([...(r || [])].sort()) === JSON.stringify([...(e || [])].sort())) _pass++;
}\n\n`;
  } else {
    code += `function _t(r: any, e: any): void { _total++; if (JSON.stringify(r) === JSON.stringify(e)) _pass++; }\n\n`;
  }

  testCases.forEach((tc, idx) => {
    const argsStr = tc.inputs.map(x => serializeVal(x, 'typescript')).join(', ');
    code += `_t(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'typescript')});\n`;
  });

  code += `console.log(\`\${_pass}/\${_total} tests passed\`);`;
  return code;
}

function buildKotlinRunner(funcName: string, type: string, testCases: any[], inputTypes?: string[], expectedType?: string): string {
  let code = `fun main() {\nvar _pass = 0; var _total = 0\n`;
  code += `fun _t(r: Any?, e: Any?) {
    _total++
    val match = when {
        r is IntArray && e is IntArray -> r.contentEquals(e)
        r is Array<*> && e is Array<*> -> r.contentDeepEquals(e)
        r is List<*> && e is List<*> -> r == e
        else -> r == e
    }
    if (match) _pass++
}\n`;

  testCases.forEach((tc, idx) => {
    const argsStr = tc.inputs.map((x, i) => serializeVal(x, 'kotlin', inputTypes ? inputTypes[i] : undefined)).join(', ');
    const expStr = serializeVal(tc.expected, 'kotlin', expectedType);
    code += `_t(${funcName}(${argsStr}), ${expStr})\n`;
  });

  code += `println("\$_pass/\$_total tests passed")\n}`;
  return code;
}

// ---------------------------------------------------------------------------
// 29 DP_2D PROBLEMS DATA
// ---------------------------------------------------------------------------

const PROBLEMS_DATA: Array<{
  slug: string;
  type?: string;
  functionName?: Record<string, string>;
  inputTypes?: string[];
  expectedType?: string;
  stubs: Record<string, string>;
  testCases?: any[];
  customRunner?: Record<string, string>;
}> = [
  {
    slug: 'island-perimeter',
    functionName: { python: 'islandPerimeter', javascript: 'islandPerimeter', typescript: 'islandPerimeter', kotlin: 'islandPerimeter' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def islandPerimeter(grid: list) -> int:\n    pass`,
      javascript: `function islandPerimeter(grid) {\n\n}`,
      typescript: `function islandPerimeter(grid: number[][]): number {\n\n}`,
      kotlin: `fun islandPerimeter(grid: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [[0,1,0,0],[1,1,1,0],[0,1,0,0],[1,1,0,0]], expected: 16 },
        { grid: [[1]], expected: 4 },
        { grid: [[1,0]], expected: 4 }
      ];
      return { inputs: [base[i % base.length].grid], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'matrix-diagonal-sum',
    functionName: { python: 'diagonalSum', javascript: 'diagonalSum', typescript: 'diagonalSum', kotlin: 'diagonalSum' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def diagonalSum(mat: list) -> int:\n    pass`,
      javascript: `function diagonalSum(mat) {\n\n}`,
      typescript: `function diagonalSum(mat: number[][]): number {\n\n}`,
      kotlin: `fun diagonalSum(mat: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { mat: [[1,2,3],[4,5,6],[7,8,9]], expected: 25 },
        { mat: [[1,1,1,1],[1,1,1,1],[1,1,1,1],[1,1,1,1]], expected: 8 }
      ];
      return { inputs: [base[i % base.length].mat], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'toeplitz-matrix',
    functionName: { python: 'isToeplitzMatrix', javascript: 'isToeplitzMatrix', typescript: 'isToeplitzMatrix', kotlin: 'isToeplitzMatrix' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def isToeplitzMatrix(matrix: list) -> bool:\n    pass`,
      javascript: `function isToeplitzMatrix(matrix) {\n\n}`,
      typescript: `function isToeplitzMatrix(matrix: number[][]): boolean {\n\n}`,
      kotlin: `fun isToeplitzMatrix(matrix: Array<IntArray>): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { matrix: [[1,2,3,4],[5,1,2,3],[9,5,1,2]], expected: true },
        { matrix: [[1,2],[2,2]], expected: false }
      ];
      return { inputs: [base[i % base.length].matrix], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'lucky-numbers-in-a-matrix',
    functionName: { python: 'luckyNumbers', javascript: 'luckyNumbers', typescript: 'luckyNumbers', kotlin: 'luckyNumbers' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def luckyNumbers(matrix: list) -> list:\n    pass`,
      javascript: `function luckyNumbers(matrix) {\n\n}`,
      typescript: `function luckyNumbers(matrix: number[][]): number[] {\n\n}`,
      kotlin: `fun luckyNumbers(matrix: Array<IntArray>): List<Int> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { matrix: [[3,7,8],[9,11,13],[15,16,17]], expected: [15] },
        { matrix: [[1,10,4,2],[9,3,8,7],[15,16,17,12]], expected: [12] }
      ];
      return { inputs: [base[i % base.length].matrix], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'range-sum-query-2d-immutable',
    stubs: {
      python: `class NumMatrix:\n    def __init__(self, matrix: list):\n        pass\n    def sumRegion(self, row1: int, col1: int, row2: int, col2: int) -> int:\n        pass`,
      javascript: `class NumMatrix {\n    constructor(matrix) {\n\n    }\n    sumRegion(row1, col1, row2, col2) {\n\n    }\n}`,
      typescript: `class NumMatrix {\n    constructor(matrix: number[][]) {\n\n    }\n    sumRegion(row1: number, col1: number, row2: number, col2: number): number {\n        return 0;\n    }\n}`,
      kotlin: `class NumMatrix(matrix: Array<IntArray>) {\n    fun sumRegion(row1: Int, col1: Int, row2: Int, col2: Int): Int {\n        return 0\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    m = NumMatrix([[3,0,1,4,2],[5,6,3,2,1],[1,2,0,1,5],[4,1,0,1,7],[1,0,3,0,5]])
    ans1 = m.sumRegion(2, 1, 4, 3) # 8
    ans2 = m.sumRegion(1, 1, 2, 2) # 11
    ans3 = m.sumRegion(1, 2, 2, 4) # 12
    if [ans1, ans2, ans3] == [8, 11, 12]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let m = new NumMatrix([[3,0,1,4,2],[5,6,3,2,1],[1,2,0,1,5],[4,1,0,1,7],[1,0,3,0,5]]);
    let ans1 = m.sumRegion(2, 1, 4, 3);
    let ans2 = m.sumRegion(1, 1, 2, 2);
    let ans3 = m.sumRegion(1, 2, 2, 4);
    if (JSON.stringify([ans1, ans2, ans3]) === JSON.stringify([8, 11, 12])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let m = new NumMatrix([[3,0,1,4,2],[5,6,3,2,1],[1,2,0,1,5],[4,1,0,1,7],[1,0,3,0,5]]);
    let ans1 = m.sumRegion(2, 1, 4, 3);
    let ans2 = m.sumRegion(1, 1, 2, 2);
    let ans3 = m.sumRegion(1, 2, 2, 4);
    if (JSON.stringify([ans1, ans2, ans3]) === JSON.stringify([8, 11, 12])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val m = NumMatrix(arrayOf(
            intArrayOf(3,0,1,4,2),
            intArrayOf(5,6,3,2,1),
            intArrayOf(1,2,0,1,5),
            intArrayOf(4,1,0,1,7),
            intArrayOf(1,0,3,0,5)
        ))
        val ans1 = m.sumRegion(2, 1, 4, 3)
        val ans2 = m.sumRegion(1, 1, 2, 2)
        val ans3 = m.sumRegion(1, 2, 2, 4)
        if (listOf(ans1, ans2, ans3) == listOf(8, 11, 12)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'richest-customer-wealth',
    functionName: { python: 'maximumWealth', javascript: 'maximumWealth', typescript: 'maximumWealth', kotlin: 'maximumWealth' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def maximumWealth(accounts: list) -> int:\n    pass`,
      javascript: `function maximumWealth(accounts) {\n\n}`,
      typescript: `function maximumWealth(accounts: number[][]): number {\n\n}`,
      kotlin: `fun maximumWealth(accounts: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { accounts: [[1,2,3],[3,2,1]], expected: 6 },
        { accounts: [[1,5],[7,3],[3,5]], expected: 10 },
        { accounts: [[2,8,7],[7,1,3],[1,9,5]], expected: 17 }
      ];
      return { inputs: [base[i % base.length].accounts], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'check-if-matrix-is-x-matrix',
    functionName: { python: 'checkXMatrix', javascript: 'checkXMatrix', typescript: 'checkXMatrix', kotlin: 'checkXMatrix' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def checkXMatrix(grid: list) -> bool:\n    pass`,
      javascript: `function checkXMatrix(grid) {\n\n}`,
      typescript: `function checkXMatrix(grid: number[][]): boolean {\n\n}`,
      kotlin: `fun checkXMatrix(grid: Array<IntArray>): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [[2,0,0,1],[0,3,1,0],[0,5,2,0],[4,0,0,2]], expected: true },
        { grid: [[5,7,0],[0,3,1],[0,5,0]], expected: false }
      ];
      return { inputs: [base[i % base.length].grid], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-path-sum',
    functionName: { python: 'minPathSum', javascript: 'minPathSum', typescript: 'minPathSum', kotlin: 'minPathSum' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def minPathSum(grid: list) -> int:\n    pass`,
      javascript: `function minPathSum(grid) {\n\n}`,
      typescript: `function minPathSum(grid: number[][]): number {\n\n}`,
      kotlin: `fun minPathSum(grid: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [[1,3,1],[1,5,1],[4,2,1]], expected: 7 },
        { grid: [[1,2,3],[4,5,6]], expected: 12 }
      ];
      return { inputs: [base[i % base.length].grid], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'triangle',
    functionName: { python: 'minimumTotal', javascript: 'minimumTotal', typescript: 'minimumTotal', kotlin: 'minimumTotal' },
    stubs: {
      python: `def minimumTotal(triangle: list) -> int:\n    pass`,
      javascript: `function minimumTotal(triangle) {\n\n}`,
      typescript: `function minimumTotal(triangle: number[][]): number {\n\n}`,
      kotlin: `fun minimumTotal(triangle: List<List<Int>>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { triangle: [[2],[3,4],[6,5,7],[4,1,8,3]], expected: 11 },
        { triangle: [[-10]], expected: -10 }
      ];
      return { inputs: [base[i % base.length].triangle], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'count-square-submatrices-with-all-ones',
    functionName: { python: 'countSquares', javascript: 'countSquares', typescript: 'countSquares', kotlin: 'countSquares' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def countSquares(matrix: list) -> int:\n    pass`,
      javascript: `function countSquares(matrix) {\n\n}`,
      typescript: `function countSquares(matrix: number[][]): number {\n\n}`,
      kotlin: `fun countSquares(matrix: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { matrix: [[0,1,1,1],[1,1,1,1],[0,1,1,1]], expected: 15 },
        { matrix: [[1,0,1],[1,1,0],[1,1,0]], expected: 7 }
      ];
      return { inputs: [base[i % base.length].matrix], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'longest-common-subsequence',
    functionName: { python: 'longestCommonSubsequence', javascript: 'longestCommonSubsequence', typescript: 'longestCommonSubsequence', kotlin: 'longestCommonSubsequence' },
    stubs: {
      python: `def longestCommonSubsequence(text1: str, text2: str) -> int:\n    pass`,
      javascript: `function longestCommonSubsequence(text1, text2) {\n\n}`,
      typescript: `function longestCommonSubsequence(text1: string, text2: string): number {\n\n}`,
      kotlin: `fun longestCommonSubsequence(text1: String, text2: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { text1: "abcde", text2: "ace", expected: 3 },
        { text1: "abc", text2: "abc", expected: 3 },
        { text1: "abc", text2: "def", expected: 0 }
      ];
      return { inputs: [base[i % base.length].text1, base[i % base.length].text2], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'edit-distance',
    functionName: { python: 'minDistance', javascript: 'minDistance', typescript: 'minDistance', kotlin: 'minDistance' },
    stubs: {
      python: `def minDistance(word1: str, word2: str) -> int:\n    pass`,
      javascript: `function minDistance(word1, word2) {\n\n}`,
      typescript: `function minDistance(word1: string, word2: string): number {\n\n}`,
      kotlin: `fun minDistance(word1: String, word2: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { word1: "horse", word2: "ros", expected: 3 },
        { word1: "intention", word2: "execution", expected: 5 }
      ];
      return { inputs: [base[i % base.length].word1, base[i % base.length].word2], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'coin-change-2',
    functionName: { python: 'change', javascript: 'change', typescript: 'change', kotlin: 'change' },
    stubs: {
      python: `def change(amount: int, coins: list) -> int:\n    pass`,
      javascript: `function change(amount, coins) {\n\n}`,
      typescript: `function change(amount: number, coins: number[]): number {\n\n}`,
      kotlin: `fun change(amount: Int, coins: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { amount: 5, coins: [1,2,5], expected: 4 },
        { amount: 3, coins: [2], expected: 0 },
        { amount: 10, coins: [10], expected: 1 }
      ];
      return { inputs: [base[i % base.length].amount, base[i % base.length].coins], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'interleaving-string',
    functionName: { python: 'isInterleave', javascript: 'isInterleave', typescript: 'isInterleave', kotlin: 'isInterleave' },
    stubs: {
      python: `def isInterleave(s1: str, s2: str, s3: str) -> bool:\n    pass`,
      javascript: `function isInterleave(s1, s2, s3) {\n\n}`,
      typescript: `function isInterleave(s1: string, s2: string, s3: string): boolean {\n\n}`,
      kotlin: `fun isInterleave(s1: String, s2: String, s3: String): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s1: "aabcc", s2: "dbbca", s3: "aadbbcbcac", expected: true },
        { s1: "aabcc", s2: "dbbca", s3: "aadbbbaccc", expected: false },
        { s1: "", s2: "", s3: "", expected: true }
      ];
      return { inputs: [base[i % base.length].s1, base[i % base.length].s2, base[i % base.length].s3], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximal-square',
    functionName: { python: 'maximalSquare', javascript: 'maximalSquare', typescript: 'maximalSquare', kotlin: 'maximalSquare' },
    inputTypes: ['char_array_2d'],
    stubs: {
      python: `def maximalSquare(matrix: list) -> int:\n    pass`,
      javascript: `function maximalSquare(matrix) {\n\n}`,
      typescript: `function maximalSquare(matrix: string[][]): number {\n\n}`,
      kotlin: `fun maximalSquare(matrix: Array<CharArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { matrix: [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]], expected: 4 },
        { matrix: [["0","1"],["1","0"]], expected: 1 }
      ];
      return { inputs: [base[i % base.length].matrix], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'partition-equal-subset-sum',
    functionName: { python: 'canPartition', javascript: 'canPartition', typescript: 'canPartition', kotlin: 'canPartition' },
    stubs: {
      python: `def canPartition(nums: list) -> bool:\n    pass`,
      javascript: `function canPartition(nums) {\n\n}`,
      typescript: `function canPartition(nums: number[]): boolean {\n\n}`,
      kotlin: `fun canPartition(nums: IntArray): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,5,11,5], expected: true },
        { nums: [1,2,3,5], expected: false }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'knight-probability-in-chessboard',
    functionName: { python: 'knightProbability', javascript: 'knightProbability', typescript: 'knightProbability', kotlin: 'knightProbability' },
    stubs: {
      python: `def knightProbability(n: int, k: int, row: int, column: int) -> float:\n    pass`,
      javascript: `function knightProbability(n, k, row, column) {\n\n}`,
      typescript: `function knightProbability(n: number, k: number, row: number, column: number): number {\n\n}`,
      kotlin: `fun knightProbability(n: Int, k: Int, row: Int, column: Int): Double {\n    return 0.0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 3, k: 2, row: 0, column: 0, expected: 0.0625 },
        { n: 1, k: 0, row: 0, column: 0, expected: 1.0 }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].k, base[i % base.length].row, base[i % base.length].column], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-falling-path-sum',
    functionName: { python: 'minFallingPathSum', javascript: 'minFallingPathSum', typescript: 'minFallingPathSum', kotlin: 'minFallingPathSum' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def minFallingPathSum(matrix: list) -> int:\n    pass`,
      javascript: `function minFallingPathSum(matrix) {\n\n}`,
      typescript: `function minFallingPathSum(matrix: number[][]): number {\n\n}`,
      kotlin: `fun minFallingPathSum(matrix: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { matrix: [[2,1,3],[6,5,4],[7,8,9]], expected: 13 },
        { matrix: [[-19,57],[-40,-5]], expected: -59 }
      ];
      return { inputs: [base[i % base.length].matrix], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-ascii-delete-sum-for-two-strings',
    functionName: { python: 'minimumDeleteSum', javascript: 'minimumDeleteSum', typescript: 'minimumDeleteSum', kotlin: 'minimumDeleteSum' },
    stubs: {
      python: `def minimumDeleteSum(s1: str, s2: str) -> int:\n    pass`,
      javascript: `function minimumDeleteSum(s1, s2) {\n\n}`,
      typescript: `function minimumDeleteSum(s1: string, s2: string): number {\n\n}`,
      kotlin: `fun minimumDeleteSum(s1: String, s2: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s1: "sea", s2: "eat", expected: 231 },
        { s1: "delete", s2: "leet", expected: 403 }
      ];
      return { inputs: [base[i % base.length].s1, base[i % base.length].s2], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'distinct-subsequences',
    functionName: { python: 'numDistinct', javascript: 'numDistinct', typescript: 'numDistinct', kotlin: 'numDistinct' },
    stubs: {
      python: `def numDistinct(s: str, t: str) -> int:\n    pass`,
      javascript: `function numDistinct(s, t) {\n\n}`,
      typescript: `function numDistinct(s: string, t: string): number {\n\n}`,
      kotlin: `fun numDistinct(s: String, t: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "rabbbit", t: "rabbit", expected: 3 },
        { s: "babgbag", t: "bag", expected: 5 }
      ];
      return { inputs: [base[i % base.length].s, base[i % base.length].t], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'dungeon-game',
    functionName: { python: 'calculateMinimumHP', javascript: 'calculateMinimumHP', typescript: 'calculateMinimumHP', kotlin: 'calculateMinimumHP' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def calculateMinimumHP(dungeon: list) -> int:\n    pass`,
      javascript: `function calculateMinimumHP(dungeon) {\n\n}`,
      typescript: `function calculateMinimumHP(dungeon: number[][]): number {\n\n}`,
      kotlin: `fun calculateMinimumHP(dungeon: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { dungeon: [[-2,-3,3],[-5,-10,1],[10,30,-5]], expected: 7 }
      ];
      return { inputs: [base[i % base.length].dungeon], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'wildcard-matching',
    functionName: { python: 'isMatch', javascript: 'isMatch', typescript: 'isMatch', kotlin: 'isMatch' },
    stubs: {
      python: `def isMatch(s: str, p: str) -> bool:\n    pass`,
      javascript: `function isMatch(s, p) {\n\n}`,
      typescript: `function isMatch(s: string, p: string): boolean {\n\n}`,
      kotlin: `fun isMatch(s: String, p: String): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "aa", p: "a", expected: false },
        { s: "aa", p: "*", expected: true },
        { s: "cb", p: "?a", expected: false },
        { s: "adceb", p: "*a*b", expected: true }
      ];
      return { inputs: [base[i % base.length].s, base[i % base.length].p], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'regular-expression-matching',
    functionName: { python: 'isMatch', javascript: 'isMatch', typescript: 'isMatch', kotlin: 'isMatch' },
    stubs: {
      python: `def isMatch(s: str, p: str) -> bool:\n    pass`,
      javascript: `function isMatch(s, p) {\n\n}`,
      typescript: `function isMatch(s: string, p: string): boolean {\n\n}`,
      kotlin: `fun isMatch(s: String, p: String): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "aa", p: "a", expected: false },
        { s: "aa", p: "a*", expected: true },
        { s: "ab", p: ".*", expected: true },
        { s: "aab", p: "c*a*b", expected: true }
      ];
      return { inputs: [base[i % base.length].s, base[i % base.length].p], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximal-rectangle',
    functionName: { python: 'maximalRectangle', javascript: 'maximalRectangle', typescript: 'maximalRectangle', kotlin: 'maximalRectangle' },
    inputTypes: ['char_array_2d'],
    stubs: {
      python: `def maximalRectangle(matrix: list) -> int:\n    pass`,
      javascript: `function maximalRectangle(matrix) {\n\n}`,
      typescript: `function maximalRectangle(matrix: string[][]): number {\n\n}`,
      kotlin: `fun maximalRectangle(matrix: Array<CharArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { matrix: [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]], expected: 6 },
        { matrix: [["0"]], expected: 0 }
      ];
      return { inputs: [base[i % base.length].matrix], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'scramble-string',
    functionName: { python: 'isScramble', javascript: 'isScramble', typescript: 'isScramble', kotlin: 'isScramble' },
    stubs: {
      python: `def isScramble(s1: str, s2: str) -> bool:\n    pass`,
      javascript: `function isScramble(s1, s2) {\n\n}`,
      typescript: `function isScramble(s1: string, s2: string): boolean {\n\n}`,
      kotlin: `fun isScramble(s1: String, s2: String): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s1: "great", s2: "rgeat", expected: true },
        { s1: "abcde", s2: "caebd", expected: false },
        { s1: "a", s2: "a", expected: true }
      ];
      return { inputs: [base[i % base.length].s1, base[i % base.length].s2], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'cherry-pickup',
    functionName: { python: 'cherryPickup', javascript: 'cherryPickup', typescript: 'cherryPickup', kotlin: 'cherryPickup' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def cherryPickup(grid: list) -> int:\n    pass`,
      javascript: `function cherryPickup(grid) {\n\n}`,
      typescript: `function cherryPickup(grid: number[][]): number {\n\n}`,
      kotlin: `fun cherryPickup(grid: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [[0,1,-1],[1,0,-1],[1,1,1]], expected: 5 },
        { grid: [[1,1,-1],[1,-1,1],[-1,1,1]], expected: 0 }
      ];
      return { inputs: [base[i % base.length].grid], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'cherry-pickup-ii',
    functionName: { python: 'cherryPickup', javascript: 'cherryPickup', typescript: 'cherryPickup', kotlin: 'cherryPickup' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def cherryPickup(grid: list) -> int:\n    pass`,
      javascript: `function cherryPickup(grid) {\n\n}`,
      typescript: `function cherryPickup(grid: number[][]): number {\n\n}`,
      kotlin: `fun cherryPickup(grid: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [[3,1,1],[2,5,1],[1,5,5],[2,1,1]], expected: 24 },
        { grid: [[1,0,0,0,0,0,1],[2,0,0,0,0,3,0],[2,0,9,0,0,0,0],[0,3,0,5,4,0,0],[1,0,2,3,0,0,6]], expected: 28 }
      ];
      return { inputs: [base[i % base.length].grid], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'paint-house-iii',
    functionName: { python: 'minCost', javascript: 'minCost', typescript: 'minCost', kotlin: 'minCost' },
    inputTypes: ['normal', 'int_array_2d', 'normal', 'normal', 'normal'],
    stubs: {
      python: `def minCost(houses: list, cost: list, m: int, n: int, target: int) -> int:\n    pass`,
      javascript: `function minCost(houses, cost, m, n, target) {\n\n}`,
      typescript: `function minCost(houses: number[], cost: number[][], m: number, n: number, target: number): number {\n\n}`,
      kotlin: `fun minCost(houses: IntArray, cost: Array<IntArray>, m: Int, n: Int, target: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { houses: [0,0,0,0,0], cost: [[1,10],[10,1],[10,1],[1,10],[5,1]], m: 5, n: 2, target: 3, expected: 9 },
        { houses: [0,2,1,2,0], cost: [[1,10],[10,1],[10,1],[1,10],[5,1]], m: 5, n: 2, target: 3, expected: 11 }
      ];
      return { inputs: [base[i % base.length].houses, base[i % base.length].cost, base[i % base.length].m, base[i % base.length].n, base[i % base.length].target], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'number-of-music-playlists',
    functionName: { python: 'numMusicPlaylists', javascript: 'numMusicPlaylists', typescript: 'numMusicPlaylists', kotlin: 'numMusicPlaylists' },
    stubs: {
      python: `def numMusicPlaylists(n: int, goal: int, k: int) -> int:\n    pass`,
      javascript: `function numMusicPlaylists(n, goal, k) {\n\n}`,
      typescript: `function numMusicPlaylists(n: number, goal: number, k: number): number {\n\n}`,
      kotlin: `fun numMusicPlaylists(n: Int, goal: Int, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 3, goal: 3, k: 1, expected: 6 },
        { n: 2, goal: 2, k: 0, expected: 2 },
        { n: 2, goal: 3, k: 1, expected: 6 }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].goal, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 29 DP_2D problems…\n');

  for (const prob of PROBLEMS_DATA) {
    const dbProblem = await db.query.problems.findFirst({
      where: eq(problems.slug, prob.slug)
    });

    if (!dbProblem) {
      console.log(`Problem ${prob.slug} not found, skipping.`);
      continue;
    }

    const langStubs: Record<string, string> = { ...prob.stubs };

    const runners: Record<string, string> = {};
    if (prob.customRunner) {
      runners.python = prob.customRunner.python;
      runners.javascript = prob.customRunner.javascript;
      runners.typescript = prob.customRunner.typescript;
      runners.kotlin = prob.customRunner.kotlin;
    } else {
      const funcName = prob.functionName!;
      const testCases = prob.testCases!;
      runners.python = buildPythonRunner(funcName.python, prob.type || 'normal', testCases);
      runners.javascript = buildJSRunner(funcName.javascript, prob.type || 'normal', testCases);
      runners.typescript = buildTSRunner(funcName.typescript, prob.type || 'normal', testCases);
      runners.kotlin = buildKotlinRunner(funcName.kotlin, prob.type || 'normal', testCases, prob.inputTypes, prob.expectedType);
    }

    await db.update(problems)
      .set({
        functionStubs: sql`${langStubs}::jsonb`,
        testRunners: sql`${runners}::jsonb`
      })
      .where(eq(problems.id, dbProblem.id));

    console.log(`  ✓  [${dbProblem.difficulty}] ${prob.slug} (${prob.testCases?.length || 15} test cases seeded)`);
  }

  console.log('\nDone.');
  await client.end();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
