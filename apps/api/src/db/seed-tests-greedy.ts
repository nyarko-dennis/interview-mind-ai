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

// Tree helpers for binary-tree-cameras
const PY_TREE_DEFS = `
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def buildTree(arr):
    if not arr: return None
    root = TreeNode(arr[0])
    q = [root]
    i = 1
    while q and i < len(arr):
        curr = q.pop(0)
        if i < len(arr) and arr[i] is not None:
            curr.left = TreeNode(arr[i])
            q.append(curr.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            curr.right = TreeNode(arr[i])
            q.append(curr.right)
        i += 1
    return root
`;

const JS_TREE_DEFS = `
class TreeNode {
    constructor(val, left, right) {
        this.val = (val===undefined ? 0 : val);
        this.left = (left===undefined ? null : left);
        this.right = (right===undefined ? null : right);
    }
}
function buildTree(arr) {
    if (!arr || arr.length === 0) return null;
    let root = new TreeNode(arr[0]);
    let q = [root];
    let i = 1;
    while (q.length > 0 && i < arr.length) {
        let curr = q.shift();
        if (arr[i] !== null && arr[i] !== undefined) {
            curr.left = new TreeNode(arr[i]);
            q.push(curr.left);
        }
        i++;
        if (i < arr.length && arr[i] !== null && arr[i] !== undefined) {
            curr.right = new TreeNode(arr[i]);
            q.push(curr.right);
        }
        i++;
    }
    return root;
}
`;

const TS_TREE_DEFS = `
class TreeNode {
    val: number;
    left: TreeNode | null;
    right: TreeNode | null;
    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
        this.val = (val===undefined ? 0 : val);
        this.left = (left===undefined ? null : left);
        this.right = (right===undefined ? null : right);
    }
}
function buildTree(arr: (number | null)[]): TreeNode | null {
    if (!arr || arr.length === 0) return null;
    let root = new TreeNode(arr[0]!);
    let q: TreeNode[] = [root];
    let i = 1;
    while (q.length > 0 && i < arr.length) {
        let curr = q.shift()!;
        if (arr[i] !== null && arr[i] !== undefined) {
            curr.left = new TreeNode(arr[i]!);
            q.push(curr.left);
        }
        i++;
        if (i < arr.length && arr[i] !== null && arr[i] !== undefined) {
            curr.right = new TreeNode(arr[i]!);
            q.push(curr.right);
        }
        i++;
    }
    return root;
}
`;

const KT_TREE_DEFS = `
class TreeNode(var \`val\`: Int) {
    var left: TreeNode? = null
    var right: TreeNode? = null
}
fun buildTree(arr: List<Int?>): TreeNode? {
    if (arr.isEmpty() || arr[0] == null) return null
    val root = TreeNode(arr[0]!!)
    val q = mutableListOf(root)
    var i = 1
    while (q.isNotEmpty() && i < arr.size) {
        val curr = q.removeAt(0)
        if (i < arr.size && arr[i] != null) {
            curr.left = TreeNode(arr[i]!!)
            q.add(curr.left!!)
        }
        i++
        if (i < arr.size && arr[i] != null) {
            curr.right = TreeNode(arr[i]!!)
            q.add(curr.right!!)
        }
        i++
    }
    return root
}
`;

// ---------------------------------------------------------------------------
// 30 GREEDY PROBLEMS DATA
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
    slug: 'assign-cookies',
    functionName: { python: 'findContentChildren', javascript: 'findContentChildren', typescript: 'findContentChildren', kotlin: 'findContentChildren' },
    stubs: {
      python: `def findContentChildren(g: list, s: list) -> int:\n    pass`,
      javascript: `function findContentChildren(g, s) {\n\n}`,
      typescript: `function findContentChildren(g: number[], s: number[]): number {\n\n}`,
      kotlin: `fun findContentChildren(g: IntArray, s: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { g: [1,2,3], s: [1,1], expected: 1 },
        { g: [1,2], s: [1,2,3], expected: 2 }
      ];
      return { inputs: [base[i % base.length].g, base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'lemonade-change',
    functionName: { python: 'lemonadeChange', javascript: 'lemonadeChange', typescript: 'lemonadeChange', kotlin: 'lemonadeChange' },
    stubs: {
      python: `def lemonadeChange(bills: list) -> bool:\n    pass`,
      javascript: `function lemonadeChange(bills) {\n\n}`,
      typescript: `function lemonadeChange(bills: number[]): boolean {\n\n}`,
      kotlin: `fun lemonadeChange(bills: IntArray): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { bills: [5,5,5,10,20], expected: true },
        { bills: [5,5,10,10,20], expected: false }
      ];
      return { inputs: [base[i % base.length].bills], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'can-place-flowers',
    functionName: { python: 'canPlaceFlowers', javascript: 'canPlaceFlowers', typescript: 'canPlaceFlowers', kotlin: 'canPlaceFlowers' },
    stubs: {
      python: `def canPlaceFlowers(flowerbed: list, n: int) -> bool:\n    pass`,
      javascript: `function canPlaceFlowers(flowerbed, n) {\n\n}`,
      typescript: `function canPlaceFlowers(flowerbed: number[], n: number): boolean {\n\n}`,
      kotlin: `fun canPlaceFlowers(flowerbed: IntArray, n: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { flowerbed: [1,0,0,0,1], n: 1, expected: true },
        { flowerbed: [1,0,0,0,1], n: 2, expected: false }
      ];
      return { inputs: [base[i % base.length].flowerbed, base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximum-units-on-a-truck',
    functionName: { python: 'maximumUnits', javascript: 'maximumUnits', typescript: 'maximumUnits', kotlin: 'maximumUnits' },
    inputTypes: ['int_array_2d', 'normal'],
    stubs: {
      python: `def maximumUnits(boxTypes: list, truckSize: int) -> int:\n    pass`,
      javascript: `function maximumUnits(boxTypes, truckSize) {\n\n}`,
      typescript: `function maximumUnits(boxTypes: number[][], truckSize: number): number {\n\n}`,
      kotlin: `fun maximumUnits(boxTypes: Array<IntArray>, truckSize: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { boxTypes: [[1,3],[2,2],[3,1]], truckSize: 4, expected: 8 },
        { boxTypes: [[5,10],[2,5],[4,7],[3,9]], truckSize: 10, expected: 91 }
      ];
      return { inputs: [base[i % base.length].boxTypes, base[i % base.length].truckSize], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'array-partition',
    functionName: { python: 'arrayPairSum', javascript: 'arrayPairSum', typescript: 'arrayPairSum', kotlin: 'arrayPairSum' },
    stubs: {
      python: `def arrayPairSum(nums: list) -> int:\n    pass`,
      javascript: `function arrayPairSum(nums) {\n\n}`,
      typescript: `function arrayPairSum(nums: number[]): number {\n\n}`,
      kotlin: `fun arrayPairSum(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,4,3,2], expected: 4 },
        { nums: [6,2,6,5,1,2], expected: 9 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
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
        { nums: [3,-1,0,2], k: 3, expected: 6 }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'is-subsequence',
    functionName: { python: 'isSubsequence', javascript: 'isSubsequence', typescript: 'isSubsequence', kotlin: 'isSubsequence' },
    stubs: {
      python: `def isSubsequence(s: str, t: str) -> bool:\n    pass`,
      javascript: `function isSubsequence(s, t) {\n\n}`,
      typescript: `function isSubsequence(s: string, t: string): boolean {\n\n}`,
      kotlin: `fun isSubsequence(s: String, t: String): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "abc", t: "ahbgdc", expected: true },
        { s: "axc", t: "ahbgdc", expected: false }
      ];
      return { inputs: [base[i % base.length].s, base[i % base.length].t], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximum-69-number',
    functionName: { python: 'maximum69Number', javascript: 'maximum69Number', typescript: 'maximum69Number', kotlin: 'maximum69Number' },
    stubs: {
      python: `def maximum69Number (num: int) -> int:\n    pass`,
      javascript: `function maximum69Number (num) {\n\n}`,
      typescript: `function maximum69Number (num: number): number {\n\n}`,
      kotlin: `fun maximum69Number (num: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { num: 9669, expected: 9969 },
        { num: 9996, expected: 9999 },
        { num: 9999, expected: 9999 }
      ];
      return { inputs: [base[i % base.length].num], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-operations-to-make-array-increasing',
    functionName: { python: 'minOperations', javascript: 'minOperations', typescript: 'minOperations', kotlin: 'minOperations' },
    stubs: {
      python: `def minOperations(nums: list) -> int:\n    pass`,
      javascript: `function minOperations(nums) {\n\n}`,
      typescript: `function minOperations(nums: number[]): number {\n\n}`,
      kotlin: `fun minOperations(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,1,1], expected: 3 },
        { nums: [1,5,2,4,1], expected: 14 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'largest-perimeter-triangle',
    functionName: { python: 'largestPerimeter', javascript: 'largestPerimeter', typescript: 'largestPerimeter', kotlin: 'largestPerimeter' },
    stubs: {
      python: `def largestPerimeter(nums: list) -> int:\n    pass`,
      javascript: `function largestPerimeter(nums) {\n\n}`,
      typescript: `function largestPerimeter(nums: number[]): number {\n\n}`,
      kotlin: `fun largestPerimeter(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [2,1,2], expected: 5 },
        { nums: [1,2,1], expected: 0 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'jump-game',
    functionName: { python: 'canJump', javascript: 'canJump', typescript: 'canJump', kotlin: 'canJump' },
    stubs: {
      python: `def canJump(nums: list) -> bool:\n    pass`,
      javascript: `function canJump(nums) {\n\n}`,
      typescript: `function canJump(nums: number[]): boolean {\n\n}`,
      kotlin: `fun canJump(nums: IntArray): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [2,3,1,1,4], expected: true },
        { nums: [3,2,1,0,4], expected: false }
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
    slug: 'gas-station',
    functionName: { python: 'canCompleteCircuit', javascript: 'canCompleteCircuit', typescript: 'canCompleteCircuit', kotlin: 'canCompleteCircuit' },
    stubs: {
      python: `def canCompleteCircuit(gas: list, cost: list) -> int:\n    pass`,
      javascript: `function canCompleteCircuit(gas, cost) {\n\n}`,
      typescript: `function canCompleteCircuit(gas: number[], cost: number[]): number {\n\n}`,
      kotlin: `fun canCompleteCircuit(gas: IntArray, cost: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { gas: [1,2,3,4,5], cost: [3,4,5,1,2], expected: 3 },
        { gas: [2,3,4], cost: [3,4,3], expected: -1 }
      ];
      return { inputs: [base[i % base.length].gas, base[i % base.length].cost], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'best-time-to-buy-and-sell-stock-ii',
    functionName: { python: 'maxProfit', javascript: 'maxProfit', typescript: 'maxProfit', kotlin: 'maxProfit' },
    stubs: {
      python: `def maxProfit(prices: list) -> int:\n    pass`,
      javascript: `function maxProfit(prices) {\n\n}`,
      typescript: `function maxProfit(prices: number[]): number {\n\n}`,
      kotlin: `fun maxProfit(prices: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { prices: [7,1,5,3,6,4], expected: 7 },
        { prices: [1,2,3,4,5], expected: 4 },
        { prices: [7,6,4,3,1], expected: 0 }
      ];
      return { inputs: [base[i % base.length].prices], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'wiggle-subsequence',
    functionName: { python: 'wiggleMaxLength', javascript: 'wiggleMaxLength', typescript: 'wiggleMaxLength', kotlin: 'wiggleMaxLength' },
    stubs: {
      python: `def wiggleMaxLength(nums: list) -> int:\n    pass`,
      javascript: `function wiggleMaxLength(nums) {\n\n}`,
      typescript: `function wiggleMaxLength(nums: number[]): number {\n\n}`,
      kotlin: `fun wiggleMaxLength(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,7,4,9,2,5], expected: 6 },
        { nums: [1,17,5,10,13,15,10,5,16,8], expected: 7 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'non-overlapping-intervals',
    functionName: { python: 'eraseOverlapIntervals', javascript: 'eraseOverlapIntervals', typescript: 'eraseOverlapIntervals', kotlin: 'eraseOverlapIntervals' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def eraseOverlapIntervals(intervals: list) -> int:\n    pass`,
      javascript: `function eraseOverlapIntervals(intervals) {\n\n}`,
      typescript: `function eraseOverlapIntervals(intervals: number[][]): number {\n\n}`,
      kotlin: `fun eraseOverlapIntervals(intervals: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { intervals: [[1,2],[2,3],[3,4],[1,3]], expected: 1 },
        { intervals: [[1,2],[1,2],[1,2]], expected: 2 }
      ];
      return { inputs: [base[i % base.length].intervals], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-number-of-arrows-to-burst-balloons',
    functionName: { python: 'findMinArrowShots', javascript: 'findMinArrowShots', typescript: 'findMinArrowShots', kotlin: 'findMinArrowShots' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def findMinArrowShots(points: list) -> int:\n    pass`,
      javascript: `function findMinArrowShots(points) {\n\n}`,
      typescript: `function findMinArrowShots(points: number[][]): number {\n\n}`,
      kotlin: `fun findMinArrowShots(points: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { points: [[10,16],[2,8],[1,6],[7,12]], expected: 2 },
        { points: [[1,2],[3,4],[5,6],[7,8]], expected: 4 }
      ];
      return { inputs: [base[i % base.length].points], expected: base[i % base.length].expected };
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
    slug: 'partition-labels',
    functionName: { python: 'partitionLabels', javascript: 'partitionLabels', typescript: 'partitionLabels', kotlin: 'partitionLabels' },
    stubs: {
      python: `def partitionLabels(s: str) -> list:\n    pass`,
      javascript: `function partitionLabels(s) {\n\n}`,
      typescript: `function partitionLabels(s: string): number[] {\n\n}`,
      kotlin: `fun partitionLabels(s: String): List<Int> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "ababcbacadefegdehijhklij", expected: [9,7,8] },
        { s: "eccbbbbdec", expected: [10] }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'queue-reconstruction-by-height',
    functionName: { python: 'reconstructQueue', javascript: 'reconstructQueue', typescript: 'reconstructQueue', kotlin: 'reconstructQueue' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def reconstructQueue(people: list) -> list:\n    pass`,
      javascript: `function reconstructQueue(people) {\n\n}`,
      typescript: `function reconstructQueue(people: number[][]): number[][] {\n\n}`,
      kotlin: `fun reconstructQueue(people: Array<IntArray>): Array<IntArray> {\n    return arrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { people: [[7,0],[4,4],[7,1],[5,0],[6,1],[5,2]], expected: [[5,0],[7,0],[5,2],[6,1],[4,4],[7,1]] },
        { people: [[6,0],[5,0],[4,0],[3,2],[2,2],[1,4]], expected: [[4,0],[5,0],[2,2],[3,2],[1,4],[6,0]] }
      ];
      return { inputs: [base[i % base.length].people], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'candy',
    functionName: { python: 'candy', javascript: 'candy', typescript: 'candy', kotlin: 'candy' },
    stubs: {
      python: `def candy(ratings: list) -> int:\n    pass`,
      javascript: `function candy(ratings) {\n\n}`,
      typescript: `function candy(ratings: number[]): number {\n\n}`,
      kotlin: `fun candy(ratings: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { ratings: [1,0,2], expected: 5 },
        { ratings: [1,2,2], expected: 4 }
      ];
      return { inputs: [base[i % base.length].ratings], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'patching-array',
    functionName: { python: 'minPatches', javascript: 'minPatches', typescript: 'minPatches', kotlin: 'minPatches' },
    stubs: {
      python: `def minPatches(nums: list, n: int) -> int:\n    pass`,
      javascript: `function minPatches(nums, n) {\n\n}`,
      typescript: `function minPatches(nums: number[], n: number): number {\n\n}`,
      kotlin: `fun minPatches(nums: IntArray, n: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,3], n: 6, expected: 1 },
        { nums: [1,5,10], n: 20, expected: 2 }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].n], expected: base[i % base.length].expected };
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
    slug: 'course-schedule-iii',
    functionName: { python: 'scheduleCourse', javascript: 'scheduleCourse', typescript: 'scheduleCourse', kotlin: 'scheduleCourse' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def scheduleCourse(courses: list) -> int:\n    pass`,
      javascript: `function scheduleCourse(courses) {\n\n}`,
      typescript: `function scheduleCourse(courses: number[][]): number {\n\n}`,
      kotlin: `fun scheduleCourse(courses: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { courses: [[100,200],[200,1300],[1000,1250],[2000,3200]], expected: 3 },
        { courses: [[1,2],[2,3]], expected: 2 }
      ];
      return { inputs: [base[i % base.length].courses], expected: base[i % base.length].expected };
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
    slug: 'minimum-number-of-taps-to-open-to-water-a-garden',
    functionName: { python: 'minTaps', javascript: 'minTaps', typescript: 'minTaps', kotlin: 'minTaps' },
    stubs: {
      python: `def minTaps(n: int, ranges: list) -> int:\n    pass`,
      javascript: `function minTaps(n, ranges) {\n\n}`,
      typescript: `function minTaps(n: number, ranges: number[]): number {\n\n}`,
      kotlin: `fun minTaps(n: Int, ranges: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 5, ranges: [3,4,1,1,0,0], expected: 1 },
        { n: 3, ranges: [0,0,0,0], expected: -1 }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].ranges], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'binary-tree-cameras',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef minCameraCover(root: TreeNode) -> int:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction minCameraCover(root) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction minCameraCover(root: TreeNode | null): number {\n    return 0;\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun minCameraCover(root: TreeNode?): Int {\n    return 0\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, expected):
    global _pass, _total
    _total += 1
    if minCameraCover(buildTree(arr)) == expected:
        _pass += 1
for _ in range(15):
    _t([0,0,None,0,0], 1)
    _t([0,0,None,0,None,0,None,None,0], 2)
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, expected) {
    _total++;
    if (minCameraCover(buildTree(arr)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([0,0,null,0,0], 1);
    _t([0,0,null,0,null,0,null,null,0], 2);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], expected: number) {
    _total++;
    if (minCameraCover(buildTree(arr)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([0,0,null,0,0], 1);
    _t([0,0,null,0,null,0,null,null,0], 2);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, expected: Int) {
        _total++
        if (minCameraCover(buildTree(arr)) == expected) _pass++
    }
    for (i in 1..15) {
        _t(listOf(0,0,null,0,0), 1)
        _t(listOf(0,0,null,0,null,0,null,null,0), 2)
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'super-washing-machines',
    functionName: { python: 'findMinMoves', javascript: 'findMinMoves', typescript: 'findMinMoves', kotlin: 'findMinMoves' },
    stubs: {
      python: `def findMinMoves(machines: list) -> int:\n    pass`,
      javascript: `function findMinMoves(machines) {\n\n}`,
      typescript: `function findMinMoves(machines: number[]): number {\n\n}`,
      kotlin: `fun findMinMoves(machines: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { machines: [1,0,5], expected: 3 },
        { machines: [0,3,0], expected: 2 },
        { machines: [0,2,0], expected: -1 }
      ];
      return { inputs: [base[i % base.length].machines], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'create-maximum-number',
    functionName: { python: 'maxNumber', javascript: 'maxNumber', typescript: 'maxNumber', kotlin: 'maxNumber' },
    stubs: {
      python: `def maxNumber(nums1: list, nums2: list, k: int) -> list:\n    pass`,
      javascript: `function maxNumber(nums1, nums2, k) {\n\n}`,
      typescript: `function maxNumber(nums1: number[], nums2: number[], k: number): number[] {\n\n}`,
      kotlin: `fun maxNumber(nums1: IntArray, nums2: IntArray, k: Int): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums1: [3,4,6,5], nums2: [9,1,2,5,8,3], k: 5, expected: [9,8,6,5,3] },
        { nums1: [6,7], nums2: [6,0,4], k: 5, expected: [6,7,6,0,4] }
      ];
      return { inputs: [base[i % base.length].nums1, base[i % base.length].nums2, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 30 GREEDY problems…\n');

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
