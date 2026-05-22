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
// 29 HEAP PROBLEMS DATA
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
    slug: 'last-stone-weight',
    functionName: { python: 'lastStoneWeight', javascript: 'lastStoneWeight', typescript: 'lastStoneWeight', kotlin: 'lastStoneWeight' },
    stubs: {
      python: `def lastStoneWeight(stones: list) -> int:\n    pass`,
      javascript: `function lastStoneWeight(stones) {\n\n}`,
      typescript: `function lastStoneWeight(stones: number[]): number {\n\n}`,
      kotlin: `fun lastStoneWeight(stones: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { stones: [2,7,4,1,8,1], expected: 1 },
        { stones: [1], expected: 1 }
      ];
      return { inputs: [base[i % base.length].stones], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'kth-largest-element-in-a-stream',
    stubs: {
      python: `class KthLargest:\n    def __init__(self, k: int, nums: list):\n        pass\n    def add(self, val: int) -> int:\n        pass`,
      javascript: `class KthLargest {\n    constructor(k, nums) {\n\n    }\n    add(val) {\n\n    }\n}`,
      typescript: `class KthLargest {\n    constructor(k: number, nums: number[]) {\n\n    }\n    add(val: number): number {\n        return 0;\n    }\n}`,
      kotlin: `class KthLargest(k: Int, nums: IntArray) {\n    fun add(valParam: Int): Int {\n        return 0\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    kl = KthLargest(3, [4, 5, 8, 2])
    ans1 = kl.add(3) # 4
    ans2 = kl.add(5) # 5
    ans3 = kl.add(10) # 5
    ans4 = kl.add(9) # 8
    ans5 = kl.add(4) # 8
    if [ans1, ans2, ans3, ans4, ans5] == [4, 5, 5, 8, 8]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let kl = new KthLargest(3, [4, 5, 8, 2]);
    let ans1 = kl.add(3);
    let ans2 = kl.add(5);
    let ans3 = kl.add(10);
    let ans4 = kl.add(9);
    let ans5 = kl.add(4);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5]) === JSON.stringify([4, 5, 5, 8, 8])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let kl = new KthLargest(3, [4, 5, 8, 2]);
    let ans1 = kl.add(3);
    let ans2 = kl.add(5);
    let ans3 = kl.add(10);
    let ans4 = kl.add(9);
    let ans5 = kl.add(4);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5]) === JSON.stringify([4, 5, 5, 8, 8])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val kl = KthLargest(3, intArrayOf(4, 5, 8, 2))
        val ans1 = kl.add(3)
        val ans2 = kl.add(5)
        val ans3 = kl.add(10)
        val ans4 = kl.add(9)
        val ans5 = kl.add(4)
        if (listOf(ans1, ans2, ans3, ans4, ans5) == listOf(4, 5, 5, 8, 8)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'relative-ranks',
    functionName: { python: 'findRelativeRanks', javascript: 'findRelativeRanks', typescript: 'findRelativeRanks', kotlin: 'findRelativeRanks' },
    expectedType: 'string_array',
    stubs: {
      python: `def findRelativeRanks(score: list) -> list:\n    pass`,
      javascript: `function findRelativeRanks(score) {\n\n}`,
      typescript: `function findRelativeRanks(score: number[]): string[] {\n\n}`,
      kotlin: `fun findRelativeRanks(score: IntArray): Array<String> {\n    return arrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { score: [5,4,3,2,1], expected: ["Gold Medal","Silver Medal","Bronze Medal","4","5"] },
        { score: [10,3,8,9,4], expected: ["Gold Medal","5","Bronze Medal","Silver Medal","4"] }
      ];
      return { inputs: [base[i % base.length].score], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'sort-array-by-increasing-frequency',
    functionName: { python: 'frequencySort', javascript: 'frequencySort', typescript: 'frequencySort', kotlin: 'frequencySort' },
    stubs: {
      python: `def frequencySort(nums: list) -> list:\n    pass`,
      javascript: `function frequencySort(nums) {\n\n}`,
      typescript: `function frequencySort(nums: number[]): number[] {\n\n}`,
      kotlin: `fun frequencySort(nums: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,1,2,2,2,3], expected: [3,1,1,2,2,2] },
        { nums: [2,3,1,3,2], expected: [1,3,3,2,2] }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximum-product-of-two-elements-in-array',
    functionName: { python: 'maxProduct', javascript: 'maxProduct', typescript: 'maxProduct', kotlin: 'maxProduct' },
    stubs: {
      python: `def maxProduct(nums: list) -> int:\n    pass`,
      javascript: `function maxProduct(nums) {\n\n}`,
      typescript: `function maxProduct(nums: number[]): number {\n\n}`,
      kotlin: `fun maxProduct(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [3,4,5,2], expected: 12 },
        { nums: [1,5,4,5], expected: 16 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'keep-multiplying-found-values-by-two',
    functionName: { python: 'findFinalValue', javascript: 'findFinalValue', typescript: 'findFinalValue', kotlin: 'findFinalValue' },
    stubs: {
      python: `def findFinalValue(nums: list, original: int) -> int:\n    pass`,
      javascript: `function findFinalValue(nums, original) {\n\n}`,
      typescript: `function findFinalValue(nums: number[], original: number): number {\n\n}`,
      kotlin: `fun findFinalValue(nums: IntArray, original: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [5,3,6,1,12], original: 3, expected: 24 },
        { nums: [2,7,9], original: 4, expected: 4 }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].original], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'the-k-weakest-rows-in-a-matrix',
    functionName: { python: 'kWeakestRows', javascript: 'kWeakestRows', typescript: 'kWeakestRows', kotlin: 'kWeakestRows' },
    inputTypes: ['int_array_2d', 'normal'],
    stubs: {
      python: `def kWeakestRows(mat: list, k: int) -> list:\n    pass`,
      javascript: `function kWeakestRows(mat, k) {\n\n}`,
      typescript: `function kWeakestRows(mat: number[][], k: number): number[] {\n\n}`,
      kotlin: `fun kWeakestRows(mat: Array<IntArray>, k: Int): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { mat: [[1,1,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,1,0,0,0],[1,1,1,1,1]], k: 3, expected: [2,0,3] },
        { mat: [[1,0,0,0],[1,1,1,1],[1,0,0,0],[1,0,0,0]], k: 2, expected: [0,2] }
      ];
      return { inputs: [base[i % base.length].mat, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'make-array-zero-by-subtracting-equal-amounts',
    functionName: { python: 'minimumOperations', javascript: 'minimumOperations', typescript: 'minimumOperations', kotlin: 'minimumOperations' },
    stubs: {
      python: `def minimumOperations(nums: list) -> int:\n    pass`,
      javascript: `function minimumOperations(nums) {\n\n}`,
      typescript: `function minimumOperations(nums: number[]): number {\n\n}`,
      kotlin: `fun minimumOperations(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,5,0,3,5], expected: 3 },
        { nums: [0], expected: 0 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'find-subsequence-of-length-k-with-largest-sum',
    functionName: { python: 'maxSubsequence', javascript: 'maxSubsequence', typescript: 'maxSubsequence', kotlin: 'maxSubsequence' },
    stubs: {
      python: `def maxSubsequence(nums: list, k: int) -> list:\n    pass`,
      javascript: `function maxSubsequence(nums, k) {\n\n}`,
      typescript: `function maxSubsequence(nums: number[], k: number): number[] {\n\n}`,
      kotlin: `fun maxSubsequence(nums: IntArray, k: Int): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [2,1,3,3], k: 2, expected: [3,3] },
        { nums: [-1,-2,3,4], k: 3, expected: [-1,3,4] }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximize-sum-of-array-after-k-negations',
    functionName: { python: 'largestSumAfterKNegations', javascript: 'largestSumAfterKNegations', typescript: 'largestSumAfterKNegations', kotlin: 'largestSumAfterKNegations' },
    stubs: {
      python: `def largestSumAfterKNegations(nums: list, k: int) -> int:\n    pass`,
      javascript: `function largestSumAfterKNegations(nums, k) {\n\n}`,
      typescript: `function largestSumAfterKNegations(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun largestSumAfterKNegations(nums: IntArray, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [4,2,3], k: 1, expected: 5 },
        { nums: [3,-1,0,2], k: 3, expected: 6 },
        { nums: [2,-3,-1,5,-4], k: 2, expected: 13 }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'top-k-frequent-words',
    functionName: { python: 'topKFrequent', javascript: 'topKFrequent', typescript: 'topKFrequent', kotlin: 'topKFrequent' },
    inputTypes: ['string_array', 'normal'],
    expectedType: 'string_array',
    stubs: {
      python: `def topKFrequent(words: list, k: int) -> list:\n    pass`,
      javascript: `function topKFrequent(words, k) {\n\n}`,
      typescript: `function topKFrequent(words: string[], k: number): string[] {\n\n}`,
      kotlin: `fun topKFrequent(words: Array<String>, k: Int): List<String> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { words: ["i","love","leetcode","i","love","coding"], k: 2, expected: ["i","love"] },
        { words: ["the","day","is","sunny","the","the","the","sunny","is","is"], k: 4, expected: ["the","is","sunny","day"] }
      ];
      return { inputs: [base[i % base.length].words, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'k-closest-points-to-origin',
    functionName: { python: 'kClosest', javascript: 'kClosest', typescript: 'kClosest', kotlin: 'kClosest' },
    inputTypes: ['int_array_2d', 'normal'],
    stubs: {
      python: `def kClosest(points: list, k: int) -> list:\n    pass`,
      javascript: `function kClosest(points, k) {\n\n}`,
      typescript: `function kClosest(points: number[][], k: number): number[][] {\n\n}`,
      kotlin: `fun kClosest(points: Array<IntArray>, k: Int): Array<IntArray> {\n    return arrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { points: [[1,3],[-2,2]], k: 1, expected: [[-2,2]] },
        { points: [[3,3],[5,-1],[-2,4]], k: 2, expected: [[3,3],[-2,4]] }
      ];
      return { inputs: [base[i % base.length].points, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'find-k-pairs-with-smallest-sums',
    functionName: { python: 'kSmallestPairs', javascript: 'kSmallestPairs', typescript: 'kSmallestPairs', kotlin: 'kSmallestPairs' },
    stubs: {
      python: `def kSmallestPairs(nums1: list, nums2: list, k: int) -> list:\n    pass`,
      javascript: `function kSmallestPairs(nums1, nums2, k) {\n\n}`,
      typescript: `function kSmallestPairs(nums1: number[], nums2: number[], k: number): number[][] {\n\n}`,
      kotlin: `fun kSmallestPairs(nums1: IntArray, nums2: IntArray, k: Int): List<List<Int>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums1: [1,7,11], nums2: [2,4,6], k: 3, expected: [[1,2],[1,4],[1,6]] },
        { nums1: [1,1,2], nums2: [3,0,3], k: 2, expected: [[1,0],[1,0]] }
      ];
      return { inputs: [base[i % base.length].nums1, base[i % base.length].nums2, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'task-scheduler',
    functionName: { python: 'leastInterval', javascript: 'leastInterval', typescript: 'leastInterval', kotlin: 'leastInterval' },
    stubs: {
      python: `def leastInterval(tasks: list, n: int) -> int:\n    pass`,
      javascript: `function leastInterval(tasks, n) {\n\n}`,
      typescript: `function leastInterval(tasks: string[], n: number): number {\n\n}`,
      kotlin: `fun leastInterval(tasks: CharArray, n: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { tasks: ["A","A","A","B","B","B"], n: 2, expected: 8 },
        { tasks: ["A","A","A","B","B","B"], n: 0, expected: 6 }
      ];
      return { inputs: [base[i % base.length].tasks, base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'reorganize-string',
    functionName: { python: 'reorganizeString', javascript: 'reorganizeString', typescript: 'reorganizeString', kotlin: 'reorganizeString' },
    stubs: {
      python: `def reorganizeString(s: str) -> str:\n    pass`,
      javascript: `function reorganizeString(s) {\n\n}`,
      typescript: `function reorganizeString(s: string): string {\n\n}`,
      kotlin: `fun reorganizeString(s: String): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "aab", expected: "aba" },
        { s: "aaab", expected: "" }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-cost-to-connect-sticks',
    functionName: { python: 'connectSticks', javascript: 'connectSticks', typescript: 'connectSticks', kotlin: 'connectSticks' },
    stubs: {
      python: `def connectSticks(sticks: list) -> int:\n    pass`,
      javascript: `function connectSticks(sticks) {\n\n}`,
      typescript: `function connectSticks(sticks: number[]): number {\n\n}`,
      kotlin: `fun connectSticks(sticks: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { sticks: [2,4,3], expected: 14 },
        { sticks: [1,8,3,5], expected: 30 }
      ];
      return { inputs: [base[i % base.length].sticks], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'meeting-rooms-ii',
    functionName: { python: 'minMeetingRooms', javascript: 'minMeetingRooms', typescript: 'minMeetingRooms', kotlin: 'minMeetingRooms' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def minMeetingRooms(intervals: list) -> int:\n    pass`,
      javascript: `function minMeetingRooms(intervals) {\n\n}`,
      typescript: `function minMeetingRooms(intervals: number[][]): number {\n\n}`,
      kotlin: `fun minMeetingRooms(intervals: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { intervals: [[0,30],[5,10],[15,20]], expected: 2 },
        { intervals: [[7,10],[2,4]], expected: 1 }
      ];
      return { inputs: [base[i % base.length].intervals], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'furthest-building-you-can-reach',
    functionName: { python: 'furthestBuilding', javascript: 'furthestBuilding', typescript: 'furthestBuilding', kotlin: 'furthestBuilding' },
    stubs: {
      python: `def furthestBuilding(heights: list, bricks: int, ladders: int) -> int:\n    pass`,
      javascript: `function furthestBuilding(heights, bricks, ladders) {\n\n}`,
      typescript: `function furthestBuilding(heights: number[], bricks: number, ladders: number): number {\n\n}`,
      kotlin: `fun furthestBuilding(heights: IntArray, bricks: Int, ladders: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { heights: [4,2,7,6,9,14,12], bricks: 5, ladders: 1, expected: 4 },
        { heights: [4,12,2,7,3,18,20,3,19], bricks: 10, ladders: 2, expected: 7 },
        { heights: [14,3,19,3], bricks: 17, ladders: 0, expected: 3 }
      ];
      return { inputs: [base[i % base.length].heights, base[i % base.length].bricks, base[i % base.length].ladders], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'single-threaded-cpu',
    functionName: { python: 'getOrder', javascript: 'getOrder', typescript: 'getOrder', kotlin: 'getOrder' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def getOrder(tasks: list) -> list:\n    pass`,
      javascript: `function getOrder(tasks) {\n\n}`,
      typescript: `function getOrder(tasks: number[][]): number[] {\n\n}`,
      kotlin: `fun getOrder(tasks: Array<IntArray>): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { tasks: [[1,2],[2,4],[3,2],[4,1]], expected: [0,2,3,1] },
        { tasks: [[7,10],[7,12],[7,5],[7,4],[7,2]], expected: [4,3,2,0,1] }
      ];
      return { inputs: [base[i % base.length].tasks], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'find-median-from-data-stream',
    stubs: {
      python: `class MedianFinder:\n    def __init__(self):\n        pass\n    def addNum(self, num: int) -> None:\n        pass\n    def findMedian(self) -> float:\n        pass`,
      javascript: `class MedianFinder {\n    constructor() {\n\n    }\n    addNum(num) {\n\n    }\n    findMedian() {\n\n    }\n}`,
      typescript: `class MedianFinder {\n    constructor() {\n\n    }\n    addNum(num: number): void {\n\n    }\n    findMedian(): number {\n        return 0;\n    }\n}`,
      kotlin: `class MedianFinder() {\n    fun addNum(num: Int) {\n\n    }\n    fun findMedian(): Double {\n        return 0.0\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    mf = MedianFinder()
    mf.addNum(1)
    mf.addNum(2)
    ans1 = mf.findMedian()
    mf.addNum(3)
    ans2 = mf.findMedian()
    if [ans1, ans2] == [1.5, 2.0]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let mf = new MedianFinder();
    mf.addNum(1);
    mf.addNum(2);
    let ans1 = mf.findMedian();
    mf.addNum(3);
    let ans2 = mf.findMedian();
    if (JSON.stringify([ans1, ans2]) === JSON.stringify([1.5, 2])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let mf = new MedianFinder();
    mf.addNum(1);
    mf.addNum(2);
    let ans1 = mf.findMedian();
    mf.addNum(3);
    let ans2 = mf.findMedian();
    if (JSON.stringify([ans1, ans2]) === JSON.stringify([1.5, 2])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val mf = MedianFinder()
        mf.addNum(1)
        mf.addNum(2)
        val ans1 = mf.findMedian()
        mf.addNum(3)
        val ans2 = mf.findMedian()
        if (ans1 == 1.5 && ans2 == 2.0) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'merge-k-sorted-lists',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\nclass Solution:\n    def mergeKLists(self, lists: list) -> ListNode:\n        pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction mergeKLists(lists) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction mergeKLists(lists: Array<ListNode | null>): ListNode | null {\n\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun mergeKLists(lists: Array<ListNode?>): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def _make(arr):
    if not arr: return None
    head = ListNode(arr[0])
    curr = head
    for v in arr[1:]:
        curr.next = ListNode(v)
        curr = curr.next
    return head

def _to_arr(head):
    res = []
    while head:
        res.append(head.val)
        head = head.next
    return res

_pass = _total = 0
for test_in, expected in [
    ([[1,4,5],[1,3,4],[2,6]], [1,1,2,3,4,4,5,6]),
    ([], []),
    ([[]], [])
]:
    _total += 1
    lists = [_make(x) for x in test_in]
    res = Solution().mergeKLists(lists)
    if _to_arr(res) == expected:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
function _make(arr) {
    if (!arr || arr.length === 0) return null;
    let head = new ListNode(arr[0]);
    let curr = head;
    for (let i = 1; i < arr.length; i++) {
        curr.next = new ListNode(arr[i]);
        curr = curr.next;
    }
    return head;
}
function _to_arr(head) {
    let res = [];
    while (head) {
        res.push(head.val);
        head = head.next;
    }
    return res;
}
let _pass = 0, _total = 0;
for (let [test_in, expected] of [
    [[[1,4,5],[1,3,4],[2,6]], [1,1,2,3,4,4,5,6]],
    [[], []],
    [[[]], []]
]) {
    _total++;
    let lists = test_in.map(x => _make(x));
    let res = mergeKLists(lists);
    if (JSON.stringify(_to_arr(res)) === JSON.stringify(expected)) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
function _make(arr: number[]): ListNode | null {
    if (!arr || arr.length === 0) return null;
    let head = new ListNode(arr[0]);
    let curr = head;
    for (let i = 1; i < arr.length; i++) {
        curr.next = new ListNode(arr[i]);
        curr = curr.next;
    }
    return head;
}
function _to_arr(head: ListNode | null): number[] {
    let res: number[] = [];
    while (head) {
        res.push(head.val);
        head = head.next;
    }
    return res;
}
let _pass = 0, _total = 0;
for (let [test_in, expected] of [
    [[[1,4,5],[1,3,4],[2,6]], [1,1,2,3,4,4,5,6]],
    [[], []],
    [[[]], []]
] as [number[][], number[]][]) {
    _total++;
    let lists = test_in.map(x => _make(x));
    let res = mergeKLists(lists);
    if (JSON.stringify(_to_arr(res)) === JSON.stringify(expected)) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun _make(arr: IntArray): ListNode? {
    if (arr.isEmpty()) return null
    val head = ListNode(arr[0])
    var curr = head
    for (i in 1 until arr.size) {
        curr.next = ListNode(arr[i])
        curr = curr.next!!
    }
    return head
}
fun _to_arr(head: ListNode?): List<Int> {
    val res = mutableListOf<Int>()
    var curr = head
    while (curr != null) {
        res.add(curr.\`val\`)
        curr = curr.next
    }
    return res
}
fun main() {
    var _pass = 0; var _total = 0
    val cases = listOf(
        Pair(arrayOf(intArrayOf(1,4,5), intArrayOf(1,3,4), intArrayOf(2,6)), listOf(1,1,2,3,4,4,5,6)),
        Pair(arrayOf(), listOf<Int>())
    )
    for (c in cases) {
        _total++
        val lists = c.first.map { _make(it) }.toTypedArray()
        val res = mergeKLists(lists)
        if (_to_arr(res) == c.second) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'ipo',
    functionName: { python: 'findMaximizedCapital', javascript: 'findMaximizedCapital', typescript: 'findMaximizedCapital', kotlin: 'findMaximizedCapital' },
    stubs: {
      python: `def findMaximizedCapital(k: int, w: int, profits: list, capital: list) -> int:\n    pass`,
      javascript: `function findMaximizedCapital(k, w, profits, capital) {\n\n}`,
      typescript: `function findMaximizedCapital(k: number, w: number, profits: number[], capital: number[]): number {\n\n}`,
      kotlin: `fun findMaximizedCapital(k: Int, w: Int, profits: IntArray, capital: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { k: 2, w: 0, profits: [1,2,3], capital: [0,1,1], expected: 4 },
        { k: 3, w: 0, profits: [1,2,3], capital: [0,1,2], expected: 6 }
      ];
      return { inputs: [base[i % base.length].k, base[i % base.length].w, base[i % base.length].profits, base[i % base.length].capital], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'k-th-smallest-prime-fraction',
    functionName: { python: 'kthSmallestPrimeFraction', javascript: 'kthSmallestPrimeFraction', typescript: 'kthSmallestPrimeFraction', kotlin: 'kthSmallestPrimeFraction' },
    stubs: {
      python: `def kthSmallestPrimeFraction(arr: list, k: int) -> list:\n    pass`,
      javascript: `function kthSmallestPrimeFraction(arr, k) {\n\n}`,
      typescript: `function kthSmallestPrimeFraction(arr: number[], k: number): number[] {\n\n}`,
      kotlin: `fun kthSmallestPrimeFraction(arr: IntArray, k: Int): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { arr: [1,2,3,5], k: 3, expected: [2,5] },
        { arr: [1,7], k: 1, expected: [1,7] }
      ];
      return { inputs: [base[i % base.length].arr, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-cost-to-hire-k-workers',
    functionName: { python: 'mincostToHireWorkers', javascript: 'mincostToHireWorkers', typescript: 'mincostToHireWorkers', kotlin: 'mincostToHireWorkers' },
    stubs: {
      python: `def mincostToHireWorkers(quality: list, wage: list, k: int) -> float:\n    pass`,
      javascript: `function mincostToHireWorkers(quality, wage, k) {\n\n}`,
      typescript: `function mincostToHireWorkers(quality: number[], wage: number[], k: number): number {\n\n}`,
      kotlin: `fun mincostToHireWorkers(quality: IntArray, wage: IntArray, k: Int): Double {\n    return 0.0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { quality: [10,20,5], wage: [70,50,30], k: 2, expected: 105.0 },
        { quality: [3,1,10,10,1], wage: [4,8,2,2,7], k: 3, expected: 30.66667 }
      ];
      return { inputs: [base[i % base.length].quality, base[i % base.length].wage, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'find-kth-smallest-sum-matrix-sorted-rows',
    functionName: { python: 'kthSmallest', javascript: 'kthSmallest', typescript: 'kthSmallest', kotlin: 'kthSmallest' },
    inputTypes: ['int_array_2d', 'normal'],
    stubs: {
      python: `def kthSmallest(mat: list, k: int) -> int:\n    pass`,
      javascript: `function kthSmallest(mat, k) {\n\n}`,
      typescript: `function kthSmallest(mat: number[][], k: number): number {\n\n}`,
      kotlin: `fun kthSmallest(mat: Array<IntArray>, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { mat: [[1,3,11],[2,4,6]], k: 5, expected: 7 },
        { mat: [[1,3,11],[2,4,6]], k: 9, expected: 17 },
        { mat: [[1,10,10],[1,4,5],[2,3,6]], k: 7, expected: 9 }
      ];
      return { inputs: [base[i % base.length].mat, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximum-performance-of-a-team',
    functionName: { python: 'maxPerformance', javascript: 'maxPerformance', typescript: 'maxPerformance', kotlin: 'maxPerformance' },
    stubs: {
      python: `def maxPerformance(n: int, speed: list, efficiency: list, k: int) -> int:\n    pass`,
      javascript: `function maxPerformance(n, speed, efficiency, k) {\n\n}`,
      typescript: `function maxPerformance(n: number, speed: number[], efficiency: number[], k: number): number {\n\n}`,
      kotlin: `fun maxPerformance(n: Int, speed: IntArray, efficiency: IntArray, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 6, speed: [2,10,3,1,5,8], efficiency: [5,4,3,9,7,2], k: 2, expected: 60 },
        { n: 6, speed: [2,10,3,1,5,8], efficiency: [5,4,3,9,7,2], k: 3, expected: 68 },
        { n: 6, speed: [2,10,3,1,5,8], efficiency: [5,4,3,9,7,2], k: 4, expected: 72 }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].speed, base[i % base.length].efficiency, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'smallest-range-covering-elements-from-k-lists',
    functionName: { python: 'smallestRange', javascript: 'smallestRange', typescript: 'smallestRange', kotlin: 'smallestRange' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def smallestRange(nums: list) -> list:\n    pass`,
      javascript: `function smallestRange(nums) {\n\n}`,
      typescript: `function smallestRange(nums: number[][]): number[] {\n\n}`,
      kotlin: `fun smallestRange(nums: List<List<Int>>): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [[4,10,15,24,26],[0,9,12,20],[5,18,22,30]], expected: [20,24] },
        { nums: [[1,2,3],[1,2,3],[1,2,3]], expected: [1,1] }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'ugly-number-ii',
    functionName: { python: 'nthUglyNumber', javascript: 'nthUglyNumber', typescript: 'nthUglyNumber', kotlin: 'nthUglyNumber' },
    stubs: {
      python: `def nthUglyNumber(n: int) -> int:\n    pass`,
      javascript: `function nthUglyNumber(n) {\n\n}`,
      typescript: `function nthUglyNumber(n: number): number {\n\n}`,
      kotlin: `fun nthUglyNumber(n: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 10, expected: 12 },
        { n: 1, expected: 1 }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-interval-to-include-each-query',
    functionName: { python: 'minInterval', javascript: 'minInterval', typescript: 'minInterval', kotlin: 'minInterval' },
    inputTypes: ['int_array_2d', 'normal'],
    stubs: {
      python: `def minInterval(intervals: list, queries: list) -> list:\n    pass`,
      javascript: `function minInterval(intervals, queries) {\n\n}`,
      typescript: `function minInterval(intervals: number[][], queries: number[]): number[] {\n\n}`,
      kotlin: `fun minInterval(intervals: Array<IntArray>, queries: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { intervals: [[1,4],[2,4],[3,6],[4,4]], queries: [2,3,4,5], expected: [3,3,1,4] },
        { intervals: [[2,3],[2,5],[1,8],[20,25]], queries: [2,19,5,22], expected: [2,-1,4,6] }
      ];
      return { inputs: [base[i % base.length].intervals, base[i % base.length].queries], expected: base[i % base.length].expected };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 29 HEAP problems…\n');

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
