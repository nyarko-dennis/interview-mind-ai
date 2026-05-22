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
// 28 DP_1D PROBLEMS DATA
// ---------------------------------------------------------------------------

const PROBLEMS_DATA: Array<{
  slug: string;
  type?: string;
  functionName?: Record<string, string>;
  inputTypes?: string[];
  expectedType?: string;
  stubs: Record<string, string>;
  testCases: any[];
}> = [
  {
    slug: 'fibonacci-number',
    functionName: { python: 'fib', javascript: 'fib', typescript: 'fib', kotlin: 'fib' },
    stubs: {
      python: `def fib(n: int) -> int:\n    pass`,
      javascript: `function fib(n) {\n\n}`,
      typescript: `function fib(n: number): number {\n\n}`,
      kotlin: `fun fib(n: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 2, expected: 1 },
        { n: 3, expected: 2 },
        { n: 4, expected: 3 },
        { n: 0, expected: 0 },
        { n: 10, expected: 55 }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'n-th-tribonacci-number',
    functionName: { python: 'tribonacci', javascript: 'tribonacci', typescript: 'tribonacci', kotlin: 'tribonacci' },
    stubs: {
      python: `def tribonacci(n: int) -> int:\n    pass`,
      javascript: `function tribonacci(n) {\n\n}`,
      typescript: `function tribonacci(n: number): number {\n\n}`,
      kotlin: `fun tribonacci(n: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 4, expected: 4 },
        { n: 25, expected: 1389537 },
        { n: 0, expected: 0 },
        { n: 1, expected: 1 },
        { n: 2, expected: 1 }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'min-cost-climbing-stairs',
    functionName: { python: 'minCostClimbingStairs', javascript: 'minCostClimbingStairs', typescript: 'minCostClimbingStairs', kotlin: 'minCostClimbingStairs' },
    stubs: {
      python: `def minCostClimbingStairs(cost: list) -> int:\n    pass`,
      javascript: `function minCostClimbingStairs(cost) {\n\n}`,
      typescript: `function minCostClimbingStairs(cost: number[]): number {\n\n}`,
      kotlin: `fun minCostClimbingStairs(cost: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { cost: [10,15,20], expected: 15 },
        { cost: [1,100,1,1,1,100,1,1,100,1], expected: 6 }
      ];
      return { inputs: [base[i % base.length].cost], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'pascals-triangle',
    functionName: { python: 'generate', javascript: 'generate', typescript: 'generate', kotlin: 'generate' },
    stubs: {
      python: `def generate(numRows: int) -> list:\n    pass`,
      javascript: `function generate(numRows) {\n\n}`,
      typescript: `function generate(numRows: number): number[][] {\n\n}`,
      kotlin: `fun generate(numRows: Int): List<List<Int>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { numRows: 5, expected: [[1],[1,1],[1,2,1],[1,3,3,1],[1,4,6,4,1]] },
        { numRows: 1, expected: [[1]] }
      ];
      return { inputs: [base[i % base.length].numRows], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'pascals-triangle-ii',
    functionName: { python: 'getRow', javascript: 'getRow', typescript: 'getRow', kotlin: 'getRow' },
    stubs: {
      python: `def getRow(rowIndex: int) -> list:\n    pass`,
      javascript: `function getRow(rowIndex) {\n\n}`,
      typescript: `function getRow(rowIndex: number): number[] {\n\n}`,
      kotlin: `fun getRow(rowIndex: Int): List<Int> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { rowIndex: 3, expected: [1,3,3,1] },
        { rowIndex: 0, expected: [1] },
        { rowIndex: 1, expected: [1,1] }
      ];
      return { inputs: [base[i % base.length].rowIndex], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'best-time-to-buy-and-sell-stock',
    functionName: { python: 'maxProfit', javascript: 'maxProfit', typescript: 'maxProfit', kotlin: 'maxProfit' },
    stubs: {
      python: `def maxProfit(prices: list) -> int:\n    pass`,
      javascript: `function maxProfit(prices) {\n\n}`,
      typescript: `function maxProfit(prices: number[]): number {\n\n}`,
      kotlin: `fun maxProfit(prices: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { prices: [7,1,5,3,6,4], expected: 5 },
        { prices: [7,6,4,3,1], expected: 0 }
      ];
      return { inputs: [base[i % base.length].prices], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'counting-bits',
    functionName: { python: 'countBits', javascript: 'countBits', typescript: 'countBits', kotlin: 'countBits' },
    expectedType: 'int_array',
    stubs: {
      python: `def countBits(n: int) -> list:\n    pass`,
      javascript: `function countBits(n) {\n\n}`,
      typescript: `function countBits(n: number): number[] {\n\n}`,
      kotlin: `fun countBits(n: Int): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 2, expected: [0,1,1] },
        { n: 5, expected: [0,1,1,2,1,2] }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'get-maximum-in-generated-array',
    functionName: { python: 'getMaximumGenerated', javascript: 'getMaximumGenerated', typescript: 'getMaximumGenerated', kotlin: 'getMaximumGenerated' },
    stubs: {
      python: `def getMaximumGenerated(n: int) -> int:\n    pass`,
      javascript: `function getMaximumGenerated(n) {\n\n}`,
      typescript: `function getMaximumGenerated(n: number): number {\n\n}`,
      kotlin: `fun getMaximumGenerated(n: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 7, expected: 3 },
        { n: 2, expected: 1 },
        { n: 3, expected: 2 },
        { n: 0, expected: 0 }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximum-subarray',
    functionName: { python: 'maxSubArray', javascript: 'maxSubArray', typescript: 'maxSubArray', kotlin: 'maxSubArray' },
    stubs: {
      python: `def maxSubArray(nums: list) -> int:\n    pass`,
      javascript: `function maxSubArray(nums) {\n\n}`,
      typescript: `function maxSubArray(nums: number[]): number {\n\n}`,
      kotlin: `fun maxSubArray(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [-2,1,-3,4,-1,2,1,-5,4], expected: 6 },
        { nums: [1], expected: 1 },
        { nums: [5,4,-1,7,8], expected: 23 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'coin-change',
    functionName: { python: 'coinChange', javascript: 'coinChange', typescript: 'coinChange', kotlin: 'coinChange' },
    stubs: {
      python: `def coinChange(coins: list, amount: int) -> int:\n    pass`,
      javascript: `function coinChange(coins, amount) {\n\n}`,
      typescript: `function coinChange(coins: number[], amount: number): number {\n\n}`,
      kotlin: `fun coinChange(coins: IntArray, amount: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { coins: [1,2,5], amount: 11, expected: 3 },
        { coins: [2], amount: 3, expected: -1 },
        { coins: [1], amount: 0, expected: 0 }
      ];
      return { inputs: [base[i % base.length].coins, base[i % base.length].amount], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'longest-increasing-subsequence',
    functionName: { python: 'lengthOfLIS', javascript: 'lengthOfLIS', typescript: 'lengthOfLIS', kotlin: 'lengthOfLIS' },
    stubs: {
      python: `def lengthOfLIS(nums: list) -> int:\n    pass`,
      javascript: `function lengthOfLIS(nums) {\n\n}`,
      typescript: `function lengthOfLIS(nums: number[]): number {\n\n}`,
      kotlin: `fun lengthOfLIS(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [10,9,2,5,3,7,101,18], expected: 4 },
        { nums: [0,1,0,3,2,3], expected: 4 },
        { nums: [7,7,7,7,7], expected: 1 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'word-break',
    functionName: { python: 'wordBreak', javascript: 'wordBreak', typescript: 'wordBreak', kotlin: 'wordBreak' },
    stubs: {
      python: `def wordBreak(s: str, wordDict: list) -> bool:\n    pass`,
      javascript: `function wordBreak(s, wordDict) {\n\n}`,
      typescript: `function wordBreak(s: string, wordDict: string[]): boolean {\n\n}`,
      kotlin: `fun wordBreak(s: String, wordDict: List<String>): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "leetcode", wordDict: ["leet","code"], expected: true },
        { s: "applepenapple", wordDict: ["apple","pen"], expected: true },
        { s: "catsandog", wordDict: ["cats","dog","sand","and","cat"], expected: false }
      ];
      return { inputs: [base[i % base.length].s, base[i % base.length].wordDict], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'decode-ways',
    functionName: { python: 'numDecodings', javascript: 'numDecodings', typescript: 'numDecodings', kotlin: 'numDecodings' },
    stubs: {
      python: `def numDecodings(s: str) -> int:\n    pass`,
      javascript: `function numDecodings(s) {\n\n}`,
      typescript: `function numDecodings(s: string): number {\n\n}`,
      kotlin: `fun numDecodings(s: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "12", expected: 2 },
        { s: "226", expected: 3 },
        { s: "06", expected: 0 }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximum-product-subarray',
    functionName: { python: 'maxProduct', javascript: 'maxProduct', typescript: 'maxProduct', kotlin: 'maxProduct' },
    stubs: {
      python: `def maxProduct(nums: list) -> int:\n    pass`,
      javascript: `function maxProduct(nums) {\n\n}`,
      typescript: `function maxProduct(nums: number[]): number {\n\n}`,
      kotlin: `fun maxProduct(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [2,3,-2,4], expected: 6 },
        { nums: [-2,0,-1], expected: 0 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'house-robber-ii',
    functionName: { python: 'rob', javascript: 'rob', typescript: 'rob', kotlin: 'rob' },
    stubs: {
      python: `def rob(nums: list) -> int:\n    pass`,
      javascript: `function rob(nums) {\n\n}`,
      typescript: `function rob(nums: number[]): number {\n\n}`,
      kotlin: `fun rob(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [2,3,2], expected: 3 },
        { nums: [1,2,3,1], expected: 4 },
        { nums: [1,2,3], expected: 3 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'jump-game-ii',
    functionName: { python: 'jump', javascript: 'jump', typescript: 'jump', kotlin: 'jump' },
    stubs: {
      python: `def jump(nums: list) -> int:\n    pass`,
      javascript: `function jump(nums) {\n\n}`,
      typescript: `function jump(nums: number[]): number {\n\n}`,
      kotlin: `fun jump(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [2,3,1,1,4], expected: 2 },
        { nums: [2,3,0,1,4], expected: 2 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'perfect-squares',
    functionName: { python: 'numSquares', javascript: 'numSquares', typescript: 'numSquares', kotlin: 'numSquares' },
    stubs: {
      python: `def numSquares(n: int) -> int:\n    pass`,
      javascript: `function numSquares(n) {\n\n}`,
      typescript: `function numSquares(n: number): number {\n\n}`,
      kotlin: `fun numSquares(n: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 12, expected: 3 },
        { n: 13, expected: 2 },
        { n: 1, expected: 1 }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'longest-palindromic-subsequence',
    functionName: { python: 'longestPalindromeSubseq', javascript: 'longestPalindromeSubseq', typescript: 'longestPalindromeSubseq', kotlin: 'longestPalindromeSubseq' },
    stubs: {
      python: `def longestPalindromeSubseq(s: str) -> int:\n    pass`,
      javascript: `function longestPalindromeSubseq(s) {\n\n}`,
      typescript: `function longestPalindromeSubseq(s: string): number {\n\n}`,
      kotlin: `fun longestPalindromeSubseq(s: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "bbbab", expected: 4 },
        { s: "cbbd", expected: 2 }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'burst-balloons',
    functionName: { python: 'maxCoins', javascript: 'maxCoins', typescript: 'maxCoins', kotlin: 'maxCoins' },
    stubs: {
      python: `def maxCoins(nums: list) -> int:\n    pass`,
      javascript: `function maxCoins(nums) {\n\n}`,
      typescript: `function maxCoins(nums: number[]): number {\n\n}`,
      kotlin: `fun maxCoins(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [3,1,5,8], expected: 167 },
        { nums: [1,5], expected: 10 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'jump-game-vi',
    functionName: { python: 'maxResult', javascript: 'maxResult', typescript: 'maxResult', kotlin: 'maxResult' },
    stubs: {
      python: `def maxResult(nums: list, k: int) -> int:\n    pass`,
      javascript: `function maxResult(nums, k) {\n\n}`,
      typescript: `function maxResult(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun maxResult(nums: IntArray, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,-1,-2,4,-7,3], k: 2, expected: 7 },
        { nums: [10,-5,-2,4,0,3], k: 3, expected: 17 }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'decode-ways-ii',
    functionName: { python: 'numDecodings', javascript: 'numDecodings', typescript: 'numDecodings', kotlin: 'numDecodings' },
    stubs: {
      python: `def numDecodings(s: str) -> int:\n    pass`,
      javascript: `function numDecodings(s) {\n\n}`,
      typescript: `function numDecodings(s: string): number {\n\n}`,
      kotlin: `fun numDecodings(s: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "*", expected: 9 },
        { s: "1*", expected: 18 },
        { s: "2*", expected: 15 }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-difficulty-of-a-job-schedule',
    functionName: { python: 'minDifficulty', javascript: 'minDifficulty', typescript: 'minDifficulty', kotlin: 'minDifficulty' },
    stubs: {
      python: `def minDifficulty(jobDifficulty: list, d: int) -> int:\n    pass`,
      javascript: `function minDifficulty(jobDifficulty, d) {\n\n}`,
      typescript: `function minDifficulty(jobDifficulty: number[], d: number): number {\n\n}`,
      kotlin: `fun minDifficulty(jobDifficulty: IntArray, d: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { jobDifficulty: [6,5,4,3,2,1], d: 2, expected: 7 },
        { jobDifficulty: [9,9,9], d: 4, expected: -1 },
        { jobDifficulty: [1,1,1], d: 3, expected: 3 }
      ];
      return { inputs: [base[i % base.length].jobDifficulty, base[i % base.length].d], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximum-sum-of-3-non-overlapping-subarrays',
    functionName: { python: 'maxSumOfThreeSubarrays', javascript: 'maxSumOfThreeSubarrays', typescript: 'maxSumOfThreeSubarrays', kotlin: 'maxSumOfThreeSubarrays' },
    expectedType: 'int_array',
    stubs: {
      python: `def maxSumOfThreeSubarrays(nums: list, k: int) -> list:\n    pass`,
      javascript: `function maxSumOfThreeSubarrays(nums, k) {\n\n}`,
      typescript: `function maxSumOfThreeSubarrays(nums: number[], k: number): number[] {\n\n}`,
      kotlin: `fun maxSumOfThreeSubarrays(nums: IntArray, k: Int): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,2,1,2,6,7,5,1], k: 2, expected: [0,3,5] },
        { nums: [1,2,1,2,1,2,1,2,1], k: 2, expected: [0,2,4] }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-number-of-refueling-stops',
    functionName: { python: 'minRefuelStops', javascript: 'minRefuelStops', typescript: 'minRefuelStops', kotlin: 'minRefuelStops' },
    inputTypes: ['normal', 'normal', 'int_array_2d'],
    stubs: {
      python: `def minRefuelStops(target: int, startFuel: int, stations: list) -> int:\n    pass`,
      javascript: `function minRefuelStops(target, startFuel, stations) {\n\n}`,
      typescript: `function minRefuelStops(target: number, startFuel: number, stations: number[][]): number {\n\n}`,
      kotlin: `fun minRefuelStops(target: Int, startFuel: Int, stations: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { target: 1, startFuel: 1, stations: [], expected: 0 },
        { target: 100, startFuel: 1, stations: [[10,100]], expected: -1 },
        { target: 100, startFuel: 10, stations: [[10,60],[20,30],[30,30],[60,40]], expected: 2 }
      ];
      return { inputs: [base[i % base.length].target, base[i % base.length].startFuel, base[i % base.length].stations], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'count-vowels-permutation',
    functionName: { python: 'countVowelPermutation', javascript: 'countVowelPermutation', typescript: 'countVowelPermutation', kotlin: 'countVowelPermutation' },
    stubs: {
      python: `def countVowelPermutation(n: int) -> int:\n    pass`,
      javascript: `function countVowelPermutation(n) {\n\n}`,
      typescript: `function countVowelPermutation(n: number): number {\n\n}`,
      kotlin: `fun countVowelPermutation(n: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 1, expected: 5 },
        { n: 2, expected: 10 },
        { n: 5, expected: 68 }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'best-time-to-buy-and-sell-stock-iv',
    functionName: { python: 'maxProfit', javascript: 'maxProfit', typescript: 'maxProfit', kotlin: 'maxProfit' },
    stubs: {
      python: `def maxProfit(k: int, prices: list) -> int:\n    pass`,
      javascript: `function maxProfit(k, prices) {\n\n}`,
      typescript: `function maxProfit(k: number, prices: number[]): number {\n\n}`,
      kotlin: `fun maxProfit(k: Int, prices: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { k: 2, prices: [2,4,1], expected: 2 },
        { k: 2, prices: [3,2,6,5,0,3], expected: 7 }
      ];
      return { inputs: [base[i % base.length].k, base[i % base.length].prices], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'strange-printer',
    functionName: { python: 'strangePrinter', javascript: 'strangePrinter', typescript: 'strangePrinter', kotlin: 'strangePrinter' },
    stubs: {
      python: `def strangePrinter(s: str) -> int:\n    pass`,
      javascript: `function strangePrinter(s) {\n\n}`,
      typescript: `function strangePrinter(s: string): number {\n\n}`,
      kotlin: `fun strangePrinter(s: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "aaabbb", expected: 2 },
        { s: "aba", expected: 2 }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-cost-to-cut-a-stick',
    functionName: { python: 'minCost', javascript: 'minCost', typescript: 'minCost', kotlin: 'minCost' },
    stubs: {
      python: `def minCost(n: int, cuts: list) -> int:\n    pass`,
      javascript: `function minCost(n, cuts) {\n\n}`,
      typescript: `function minCost(n: number, cuts: number[]): number {\n\n}`,
      kotlin: `fun minCost(n: Int, cuts: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 7, cuts: [1,3,4,5], expected: 16 },
        { n: 9, cuts: [5,6,1,4,2], expected: 22 }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].cuts], expected: base[i % base.length].expected };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 28 DP_1D problems…\n');

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
    const funcName = prob.functionName!;
    const testCases = prob.testCases!;
    runners.python = buildPythonRunner(funcName.python, prob.type || 'normal', testCases);
    runners.javascript = buildJSRunner(funcName.javascript, prob.type || 'normal', testCases);
    runners.typescript = buildTSRunner(funcName.typescript, prob.type || 'normal', testCases);
    runners.kotlin = buildKotlinRunner(funcName.kotlin, prob.type || 'normal', testCases, prob.inputTypes, prob.expectedType);

    await db.update(problems)
      .set({
        functionStubs: sql`${langStubs}::jsonb`,
        testRunners: sql`${runners}::jsonb`
      })
      .where(eq(problems.id, dbProblem.id));

    console.log(`  ✓  [${dbProblem.difficulty}] ${prob.slug} (${prob.testCases.length} test cases seeded)`);
  }

  console.log('\nDone.');
  await client.end();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
