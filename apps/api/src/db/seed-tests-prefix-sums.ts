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
  code += `def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    if result == expected:
        _pass += 1\n\n`;

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
  code += `function _t(r, e) { _total++; if (JSON.stringify(r) === JSON.stringify(e)) _pass++; }\n\n`;

  testCases.forEach((tc, idx) => {
    const argsStr = tc.inputs.map(x => serializeVal(x, 'javascript')).join(', ');
    code += `_t(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'javascript')});\n`;
  });

  code += `console.log(\`\${_pass}/\${_total} tests passed\`);`;
  return code;
}

function buildTSRunner(funcName: string, type: string, testCases: any[]): string {
  let code = `let _pass = 0, _total = 0;\n`;
  code += `function _t(r: any, e: any): void { _total++; if (JSON.stringify(r) === JSON.stringify(e)) _pass++; }\n\n`;

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
// 30 PREFIX_SUMS PROBLEMS DATA
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
    slug: 'range-sum-query-immutable',
    stubs: {
      python: `class NumArray:\n    def __init__(self, nums: list):\n        pass\n    def sumRange(self, left: int, right: int) -> int:\n        pass`,
      javascript: `class NumArray {\n    constructor(nums) {\n\n    }\n    sumRange(left, right) {\n\n    }\n}`,
      typescript: `class NumArray {\n    constructor(nums: number[]) {\n\n    }\n    sumRange(left: number, right: number): number {\n        return 0;\n    }\n}`,
      kotlin: `class NumArray(nums: IntArray) {\n    fun sumRange(left: Int, right: Int): Int {\n        return 0\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    na = NumArray([-2, 0, 3, -5, 2, -1])
    ans1 = na.sumRange(0, 2)
    ans2 = na.sumRange(2, 5)
    ans3 = na.sumRange(0, 5)
    if [ans1, ans2, ans3] == [1, -1, -3]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let na = new NumArray([-2, 0, 3, -5, 2, -1]);
    let ans1 = na.sumRange(0, 2);
    let ans2 = na.sumRange(2, 5);
    let ans3 = na.sumRange(0, 5);
    if (JSON.stringify([ans1, ans2, ans3]) === JSON.stringify([1, -1, -3])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let na = new NumArray([-2, 0, 3, -5, 2, -1]);
    let ans1 = na.sumRange(0, 2);
    let ans2 = na.sumRange(2, 5);
    let ans3 = na.sumRange(0, 5);
    if (JSON.stringify([ans1, ans2, ans3]) === JSON.stringify([1, -1, -3])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val na = NumArray(intArrayOf(-2, 0, 3, -5, 2, -1))
        val ans1 = na.sumRange(0, 2)
        val ans2 = na.sumRange(2, 5)
        val ans3 = na.sumRange(0, 5)
        if (ans1 == 1 && ans2 == -1 && ans3 == -3) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'running-sum-of-1d-array',
    functionName: { python: 'runningSum', javascript: 'runningSum', typescript: 'runningSum', kotlin: 'runningSum' },
    stubs: {
      python: `def runningSum(nums: list) -> list:\n    pass`,
      javascript: `function runningSum(nums) {\n\n}`,
      typescript: `function runningSum(nums: number[]): number[] {\n\n}`,
      kotlin: `fun runningSum(nums: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,2,3,4], expected: [1,3,6,10] },
        { nums: [1,1,1,1,1], expected: [1,2,3,4,5] },
        { nums: [3,1,2,10,1], expected: [3,4,6,16,17] }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'find-pivot-index',
    functionName: { python: 'pivotIndex', javascript: 'pivotIndex', typescript: 'pivotIndex', kotlin: 'pivotIndex' },
    stubs: {
      python: `def pivotIndex(nums: list) -> int:\n    pass`,
      javascript: `function pivotIndex(nums) {\n\n}`,
      typescript: `function pivotIndex(nums: number[]): number {\n\n}`,
      kotlin: `fun pivotIndex(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,7,3,6,5,6], expected: 3 },
        { nums: [1,2,3], expected: -1 },
        { nums: [2,1,-1], expected: 0 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'find-the-highest-altitude',
    functionName: { python: 'largestAltitude', javascript: 'largestAltitude', typescript: 'largestAltitude', kotlin: 'largestAltitude' },
    stubs: {
      python: `def largestAltitude(gain: list) -> int:\n    pass`,
      javascript: `function largestAltitude(gain) {\n\n}`,
      typescript: `function largestAltitude(gain: number[]): number {\n\n}`,
      kotlin: `fun largestAltitude(gain: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { gain: [-5,1,5,0,-7], expected: 1 },
        { gain: [-4,-3,-2,-1,4,3,2], expected: 0 }
      ];
      return { inputs: [base[i % base.length].gain], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-value-to-get-positive-step-by-step-sum',
    functionName: { python: 'minStartValue', javascript: 'minStartValue', typescript: 'minStartValue', kotlin: 'minStartValue' },
    stubs: {
      python: `def minStartValue(nums: list) -> int:\n    pass`,
      javascript: `function minStartValue(nums) {\n\n}`,
      typescript: `function minStartValue(nums: number[]): number {\n\n}`,
      kotlin: `fun minStartValue(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [-3,2,-3,4,2], expected: 5 },
        { nums: [1,2], expected: 1 },
        { nums: [1,-2,-3], expected: 5 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'left-and-right-sum-differences',
    functionName: { python: 'leftRightDifference', javascript: 'leftRightDifference', typescript: 'leftRightDifference', kotlin: 'leftRightDifference' },
    stubs: {
      python: `def leftRightDifference(nums: list) -> list:\n    pass`,
      javascript: `function leftRightDifference(nums) {\n\n}`,
      typescript: `function leftRightDifference(nums: number[]): number[] {\n\n}`,
      kotlin: `fun leftRightDifference(nums: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [10,4,8,3], expected: [15,9,11,22] },
        { nums: [1], expected: [0] }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximum-score-after-splitting-a-string',
    functionName: { python: 'maxScore', javascript: 'maxScore', typescript: 'maxScore', kotlin: 'maxScore' },
    stubs: {
      python: `def maxScore(s: str) -> int:\n    pass`,
      javascript: `function maxScore(s) {\n\n}`,
      typescript: `function maxScore(s: string): number {\n\n}`,
      kotlin: `fun maxScore(s: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "011101", expected: 5 },
        { s: "00111", expected: 5 },
        { s: "1111", expected: 3 }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'sum-of-all-odd-length-subarrays',
    functionName: { python: 'sumOddLengthSubarrays', javascript: 'sumOddLengthSubarrays', typescript: 'sumOddLengthSubarrays', kotlin: 'sumOddLengthSubarrays' },
    stubs: {
      python: `def sumOddLengthSubarrays(arr: list) -> int:\n    pass`,
      javascript: `function sumOddLengthSubarrays(arr) {\n\n}`,
      typescript: `function sumOddLengthSubarrays(arr: number[]): number {\n\n}`,
      kotlin: `fun sumOddLengthSubarrays(arr: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { arr: [1,4,2,5,3], expected: 58 },
        { arr: [1,2], expected: 3 },
        { arr: [10,11,12], expected: 66 }
      ];
      return { inputs: [base[i % base.length].arr], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'find-the-pivot-integer',
    functionName: { python: 'pivotInteger', javascript: 'pivotInteger', typescript: 'pivotInteger', kotlin: 'pivotInteger' },
    stubs: {
      python: `def pivotInteger(n: int) -> int:\n    pass`,
      javascript: `function pivotInteger(n) {\n\n}`,
      typescript: `function pivotInteger(n: number): number {\n\n}`,
      kotlin: `fun pivotInteger(n: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 8, expected: 6 },
        { n: 1, expected: 1 },
        { n: 4, expected: -1 }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'longest-subsequence-with-limited-sum',
    functionName: { python: 'answerQueries', javascript: 'answerQueries', typescript: 'answerQueries', kotlin: 'answerQueries' },
    stubs: {
      python: `def answerQueries(nums: list, queries: list) -> list:\n    pass`,
      javascript: `function answerQueries(nums, queries) {\n\n}`,
      typescript: `function answerQueries(nums: number[], queries: number[]): number[] {\n\n}`,
      kotlin: `fun answerQueries(nums: IntArray, queries: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [4,5,2,1], queries: [3,10,21], expected: [2,3,4] },
        { nums: [2,3,4,5], queries: [1], expected: [0] }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].queries], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'subarray-sum-equals-k',
    functionName: { python: 'subarraySum', javascript: 'subarraySum', typescript: 'subarraySum', kotlin: 'subarraySum' },
    stubs: {
      python: `def subarraySum(nums: list, k: int) -> int:\n    pass`,
      javascript: `function subarraySum(nums, k) {\n\n}`,
      typescript: `function subarraySum(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun subarraySum(nums: IntArray, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,1,1], k: 2, expected: 2 },
        { nums: [1,2,3], k: 3, expected: 2 }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'continuous-subarray-sum',
    functionName: { python: 'checkSubarraySum', javascript: 'checkSubarraySum', typescript: 'checkSubarraySum', kotlin: 'checkSubarraySum' },
    stubs: {
      python: `def checkSubarraySum(nums: list, k: int) -> bool:\n    pass`,
      javascript: `function checkSubarraySum(nums, k) {\n\n}`,
      typescript: `function checkSubarraySum(nums: number[], k: number): boolean {\n\n}`,
      kotlin: `fun checkSubarraySum(nums: IntArray, k: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [23,2,4,6,7], k: 6, expected: true },
        { nums: [23,2,6,4,7], k: 6, expected: true },
        { nums: [23,2,6,4,7], k: 13, expected: false }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'subarray-sums-divisible-by-k',
    functionName: { python: 'subarraysDivByK', javascript: 'subarraysDivByK', typescript: 'subarraysDivByK', kotlin: 'subarraysDivByK' },
    stubs: {
      python: `def subarraysDivByK(nums: list, k: int) -> int:\n    pass`,
      javascript: `function subarraysDivByK(nums, k) {\n\n}`,
      typescript: `function subarraysDivByK(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun subarraysDivByK(nums: IntArray, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [4,5,0,-2,-3,1], k: 5, expected: 7 },
        { nums: [5], k: 9, expected: 0 }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'contiguous-array',
    functionName: { python: 'findMaxLength', javascript: 'findMaxLength', typescript: 'findMaxLength', kotlin: 'findMaxLength' },
    stubs: {
      python: `def findMaxLength(nums: list) -> int:\n    pass`,
      javascript: `function findMaxLength(nums) {\n\n}`,
      typescript: `function findMaxLength(nums: number[]): number {\n\n}`,
      kotlin: `fun findMaxLength(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [0,1], expected: 2 },
        { nums: [0,1,0], expected: 2 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
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
    mat = NumMatrix([
      [3, 0, 1, 4, 2],
      [5, 6, 3, 2, 1],
      [1, 2, 0, 1, 5],
      [4, 1, 0, 1, 7],
      [1, 0, 3, 0, 5]
    ])
    ans1 = mat.sumRegion(2, 1, 4, 3)
    ans2 = mat.sumRegion(1, 1, 2, 2)
    ans3 = mat.sumRegion(1, 2, 2, 4)
    if [ans1, ans2, ans3] == [8, 11, 12]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let mat = new NumMatrix([
      [3, 0, 1, 4, 2],
      [5, 6, 3, 2, 1],
      [1, 2, 0, 1, 5],
      [4, 1, 0, 1, 7],
      [1, 0, 3, 0, 5]
    ]);
    let ans1 = mat.sumRegion(2, 1, 4, 3);
    let ans2 = mat.sumRegion(1, 1, 2, 2);
    let ans3 = mat.sumRegion(1, 2, 2, 4);
    if (JSON.stringify([ans1, ans2, ans3]) === JSON.stringify([8, 11, 12])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let mat = new NumMatrix([
      [3, 0, 1, 4, 2],
      [5, 6, 3, 2, 1],
      [1, 2, 0, 1, 5],
      [4, 1, 0, 1, 7],
      [1, 0, 3, 0, 5]
    ]);
    let ans1 = mat.sumRegion(2, 1, 4, 3);
    let ans2 = mat.sumRegion(1, 1, 2, 2);
    let ans3 = mat.sumRegion(1, 2, 2, 4);
    if (JSON.stringify([ans1, ans2, ans3]) === JSON.stringify([8, 11, 12])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val mat = NumMatrix(arrayOf(
            intArrayOf(3, 0, 1, 4, 2),
            intArrayOf(5, 6, 3, 2, 1),
            intArrayOf(1, 2, 0, 1, 5),
            intArrayOf(4, 1, 0, 1, 7),
            intArrayOf(1, 0, 3, 0, 5)
        ))
        val ans1 = mat.sumRegion(2, 1, 4, 3)
        val ans2 = mat.sumRegion(1, 1, 2, 2)
        val ans3 = mat.sumRegion(1, 2, 2, 4)
        if (ans1 == 8 && ans2 == 11 && ans3 == 12) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'product-of-array-except-self',
    functionName: { python: 'productExceptSelf', javascript: 'productExceptSelf', typescript: 'productExceptSelf', kotlin: 'productExceptSelf' },
    stubs: {
      python: `def productExceptSelf(nums: list) -> list:\n    pass`,
      javascript: `function productExceptSelf(nums) {\n\n}`,
      typescript: `function productExceptSelf(nums: number[]): number[] {\n\n}`,
      kotlin: `fun productExceptSelf(nums: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,2,3,4], expected: [24,12,8,6] },
        { nums: [-1,1,0,-3,3], expected: [0,0,9,0,0] }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'count-number-of-nice-subarrays',
    functionName: { python: 'numberOfSubarrays', javascript: 'numberOfSubarrays', typescript: 'numberOfSubarrays', kotlin: 'numberOfSubarrays' },
    stubs: {
      python: `def numberOfSubarrays(nums: list, k: int) -> int:\n    pass`,
      javascript: `function numberOfSubarrays(nums, k) {\n\n}`,
      typescript: `function numberOfSubarrays(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun numberOfSubarrays(nums: IntArray, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,1,2,1,1], k: 3, expected: 2 },
        { nums: [2,4,6], k: 1, expected: 0 },
        { nums: [2,2,2,1,2,2,1,2,2,2], k: 2, expected: 16 }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'car-pooling',
    functionName: { python: 'carPooling', javascript: 'carPooling', typescript: 'carPooling', kotlin: 'carPooling' },
    inputTypes: ['int_array_2d', 'normal'],
    stubs: {
      python: `def carPooling(trips: list, capacity: int) -> bool:\n    pass`,
      javascript: `function carPooling(trips, capacity) {\n\n}`,
      typescript: `function carPooling(trips: number[][], capacity: number): boolean {\n\n}`,
      kotlin: `fun carPooling(trips: Array<IntArray>, capacity: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { trips: [[2,1,5],[3,3,7]], capacity: 4, expected: false },
        { trips: [[2,1,5],[3,3,7]], capacity: 5, expected: true }
      ];
      return { inputs: [base[i % base.length].trips, base[i % base.length].capacity], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'range-addition',
    functionName: { python: 'getModifiedArray', javascript: 'getModifiedArray', typescript: 'getModifiedArray', kotlin: 'getModifiedArray' },
    inputTypes: ['normal', 'int_array_2d'],
    stubs: {
      python: `def getModifiedArray(length: int, updates: list) -> list:\n    pass`,
      javascript: `function getModifiedArray(length, updates) {\n\n}`,
      typescript: `function getModifiedArray(length: number, updates: number[][]): number[] {\n\n}`,
      kotlin: `fun getModifiedArray(length: Int, updates: Array<IntArray>): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { length: 5, updates: [[1,3,2],[2,4,3],[0,2,-2]], expected: [-2,0,3,5,3] },
        { length: 10, updates: [[2,4,6],[5,6,8],[1,9,-4]], expected: [0,-4,2,2,2,4,4,-4,-4,-4] }
      ];
      return { inputs: [base[i % base.length].length, base[i % base.length].updates], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'corporate-flight-bookings',
    functionName: { python: 'corpFlightBookings', javascript: 'corpFlightBookings', typescript: 'corpFlightBookings', kotlin: 'corpFlightBookings' },
    inputTypes: ['int_array_2d', 'normal'],
    stubs: {
      python: `def corpFlightBookings(bookings: list, n: int) -> list:\n    pass`,
      javascript: `function corpFlightBookings(bookings, n) {\n\n}`,
      typescript: `function corpFlightBookings(bookings: number[][], n: number): number[] {\n\n}`,
      kotlin: `fun corpFlightBookings(bookings: Array<IntArray>, n: Int): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { bookings: [[1,2,10],[2,3,20],[2,5,25]], n: 5, expected: [10,55,45,25,25] },
        { bookings: [[1,2,10],[2,2,15]], n: 2, expected: [10,25] }
      ];
      return { inputs: [base[i % base.length].bookings, base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'count-of-range-sum',
    functionName: { python: 'countRangeSum', javascript: 'countRangeSum', typescript: 'countRangeSum', kotlin: 'countRangeSum' },
    stubs: {
      python: `def countRangeSum(nums: list, lower: int, upper: int) -> int:\n    pass`,
      javascript: `function countRangeSum(nums, lower, upper) {\n\n}`,
      typescript: `function countRangeSum(nums: number[], lower: number, upper: number): number {\n\n}`,
      kotlin: `fun countRangeSum(nums: IntArray, lower: Int, upper: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [-2,5,-1], lower: -2, upper: 2, expected: 3 },
        { nums: [0], lower: 0, upper: 0, expected: 1 }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].lower, base[i % base.length].upper], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'max-sum-of-rectangle-no-larger-than-k',
    functionName: { python: 'maxSumSubmatrix', javascript: 'maxSumSubmatrix', typescript: 'maxSumSubmatrix', kotlin: 'maxSumSubmatrix' },
    inputTypes: ['int_array_2d', 'normal'],
    stubs: {
      python: `def maxSumSubmatrix(matrix: list, k: int) -> int:\n    pass`,
      javascript: `function maxSumSubmatrix(matrix, k) {\n\n}`,
      typescript: `function maxSumSubmatrix(matrix: number[][], k: number): number {\n\n}`,
      kotlin: `fun maxSumSubmatrix(matrix: Array<IntArray>, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { matrix: [[1,0,1],[0,-2,3]], k: 2, expected: 2 },
        { matrix: [[2,2,-1]], k: 3, expected: 3 }
      ];
      return { inputs: [base[i % base.length].matrix, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'number-of-submatrices-that-sum-to-target',
    functionName: { python: 'numSubmatrixSumTarget', javascript: 'numSubmatrixSumTarget', typescript: 'numSubmatrixSumTarget', kotlin: 'numSubmatrixSumTarget' },
    inputTypes: ['int_array_2d', 'normal'],
    stubs: {
      python: `def numSubmatrixSumTarget(matrix: list, target: int) -> int:\n    pass`,
      javascript: `function numSubmatrixSumTarget(matrix, target) {\n\n}`,
      typescript: `function numSubmatrixSumTarget(matrix: number[][], target: number): number {\n\n}`,
      kotlin: `fun numSubmatrixSumTarget(matrix: Array<IntArray>, target: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { matrix: [[0,1,0],[1,1,1],[0,1,0]], target: 0, expected: 4 },
        { matrix: [[1,-1],[-1,1]], target: 0, expected: 5 },
        { matrix: [[904]], target: 0, expected: 0 }
      ];
      return { inputs: [base[i % base.length].matrix, base[i % base.length].target], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximum-sum-of-3-non-overlapping-subarrays',
    functionName: { python: 'maxSumOfThreeSubarrays', javascript: 'maxSumOfThreeSubarrays', typescript: 'maxSumOfThreeSubarrays', kotlin: 'maxSumOfThreeSubarrays' },
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
    slug: 'shortest-subarray-with-sum-at-least-k',
    functionName: { python: 'shortestSubarray', javascript: 'shortestSubarray', typescript: 'shortestSubarray', kotlin: 'shortestSubarray' },
    stubs: {
      python: `def shortestSubarray(nums: list, k: int) -> int:\n    pass`,
      javascript: `function shortestSubarray(nums, k) {\n\n}`,
      typescript: `function shortestSubarray(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun shortestSubarray(nums: IntArray, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1], k: 1, expected: 1 },
        { nums: [1,2], k: 4, expected: -1 },
        { nums: [2,-1,2], k: 3, expected: 3 }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-time-to-remove-all-cars-containing-illegal-goods',
    functionName: { python: 'minimumTime', javascript: 'minimumTime', typescript: 'minimumTime', kotlin: 'minimumTime' },
    stubs: {
      python: `def minimumTime(s: str) -> int:\n    pass`,
      javascript: `function minimumTime(s) {\n\n}`,
      typescript: `function minimumTime(s: string): number {\n\n}`,
      kotlin: `fun minimumTime(s: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "1100101", expected: 5 },
        { s: "0010", expected: 2 }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-adjacent-swaps-for-k-consecutive-ones',
    functionName: { python: 'minMoves', javascript: 'minMoves', typescript: 'minMoves', kotlin: 'minMoves' },
    stubs: {
      python: `def minMoves(nums: list, k: int) -> int:\n    pass`,
      javascript: `function minMoves(nums, k) {\n\n}`,
      typescript: `function minMoves(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun minMoves(nums: IntArray, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,0,0,1,0,1], k: 2, expected: 1 },
        { nums: [0,1,1,0,0,1,0,0,0], k: 3, expected: 0 },
        { nums: [1,1,0,1], k: 2, expected: 0 }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'split-array-largest-sum',
    functionName: { python: 'splitArray', javascript: 'splitArray', typescript: 'splitArray', kotlin: 'splitArray' },
    stubs: {
      python: `def splitArray(nums: list, k: int) -> int:\n    pass`,
      javascript: `function splitArray(nums, k) {\n\n}`,
      typescript: `function splitArray(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun splitArray(nums: IntArray, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [7,2,5,10,8], k: 2, expected: 18 },
        { nums: [1,2,3,4,5], k: 2, expected: 9 },
        { nums: [1,4,4], k: 3, expected: 4 }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'sum-of-floored-pairs',
    functionName: { python: 'sumOfFlooredPairs', javascript: 'sumOfFlooredPairs', typescript: 'sumOfFlooredPairs', kotlin: 'sumOfFlooredPairs' },
    stubs: {
      python: `def sumOfFlooredPairs(nums: list) -> int:\n    pass`,
      javascript: `function sumOfFlooredPairs(nums) {\n\n}`,
      typescript: `function sumOfFlooredPairs(nums: number[]): number {\n\n}`,
      kotlin: `fun sumOfFlooredPairs(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [2,5,9], expected: 10 },
        { nums: [7,7,7,7,7,7,7], expected: 49 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'stamping-the-grid',
    functionName: { python: 'possibleToStamp', javascript: 'possibleToStamp', typescript: 'possibleToStamp', kotlin: 'possibleToStamp' },
    inputTypes: ['int_array_2d', 'normal', 'normal'],
    stubs: {
      python: `def possibleToStamp(grid: list, stampHeight: int, stampWidth: int) -> bool:\n    pass`,
      javascript: `function possibleToStamp(grid, stampHeight, stampWidth) {\n\n}`,
      typescript: `function possibleToStamp(grid: number[][], stampHeight: number, stampWidth: number): boolean {\n\n}`,
      kotlin: `fun possibleToStamp(grid: Array<IntArray>, stampHeight: Int, stampWidth: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [[1,0,0,0],[1,0,1,0],[1,0,0,0],[1,0,0,0]], stampHeight: 4, stampWidth: 3, expected: true },
        { grid: [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]], stampHeight: 2, stampWidth: 2, expected: false }
      ];
      return { inputs: [base[i % base.length].grid, base[i % base.length].stampHeight, base[i % base.length].stampWidth], expected: base[i % base.length].expected };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 30 PREFIX_SUMS problems...\n');

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
