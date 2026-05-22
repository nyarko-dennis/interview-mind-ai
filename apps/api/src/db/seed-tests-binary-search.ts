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
          if (type === 'char_array_2d') {
            return `arrayOf(${val.map(row => `charArrayOf(${row.map(c => `'${c}'`).join(',')})`).join(',')})`;
          }
          return `arrayOf(${val.map(row => `arrayOf(${row.map(s => serializeVal(s, lang)).join(',')})`).join(',')})`;
        }
        return `arrayOf(${val.map(row => `intArrayOf(${row.join(',')})`).join(',')})`;
      }
      if (typeof val[0] === 'string') {
        if (type === 'char_array') {
          return `charArrayOf(${val.map(c => `'${c}'`).join(',')})`;
        }
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
        r is CharArray && e is CharArray -> r.contentEquals(e)
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
// 30 BINARY SEARCH PROBLEMS DEFINITIONS
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
    slug: 'binary-search',
    type: 'normal',
    functionName: { python: 'search', javascript: 'search', typescript: 'search', kotlin: 'search' },
    stubs: {
      python: `def search(nums: list, target: int) -> int:\n    pass`,
      javascript: `function search(nums, target) {\n\n}`,
      typescript: `function search(nums: number[], target: number): number {\n\n}`,
      kotlin: `fun search(nums: IntArray, target: Int): Int {\n    return -1\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [-1,0,3,5,9,12], target: 9, expected: 4 },
        { nums: [-1,0,3,5,9,12], target: 2, expected: -1 },
        { nums: [5], target: 5, expected: 0 },
        { nums: [5], target: -5, expected: -1 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.nums, tc.target], expected: tc.expected };
    })
  },
  {
    slug: 'search-in-rotated-sorted-array',
    type: 'normal',
    functionName: { python: 'search', javascript: 'search', typescript: 'search', kotlin: 'search' },
    stubs: {
      python: `def search(nums: list, target: int) -> int:\n    pass`,
      javascript: `function search(nums, target) {\n\n}`,
      typescript: `function search(nums: number[], target: number): number {\n\n}`,
      kotlin: `fun search(nums: IntArray, target: Int): Int {\n    return -1\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [4,5,6,7,0,1,2], target: 0, expected: 4 },
        { nums: [4,5,6,7,0,1,2], target: 3, expected: -1 },
        { nums: [1], target: 0, expected: -1 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.nums, tc.target], expected: tc.expected };
    })
  },
  {
    slug: 'first-bad-version',
    stubs: {
      python: `def firstBadVersion(n: int) -> int:\n    pass`,
      javascript: `function firstBadVersion(n) {\n\n}`,
      typescript: `function firstBadVersion(n: number): number {\n\n}`,
      kotlin: `fun firstBadVersion(n: Int): Int {\n    return 1\n}`
    },
    customRunner: {
      python: `
_bad = 0
def isBadVersion(v: int) -> bool:
    return v >= _bad

_pass = _total = 0
def _t(n, bad):
    global _pass, _total, _bad
    _total += 1
    _bad = bad
    if firstBadVersion(n) == bad:
        _pass += 1

_t(5, 4)
_t(1, 1)
_t(10, 7)
_t(20, 15)
_t(3, 2)
_t(2, 2)
_t(2, 1)
_t(100, 42)
_t(1000, 999)
_t(5, 5)
_t(10, 1)
_t(30, 29)
_t(15, 6)
_t(12, 11)
_t(8, 3)
_t(50, 25)
_t(100, 99)
_t(15, 1)
_t(4, 3)
_t(6, 4)
_t(9, 8)
_t(14, 10)
_t(22, 17)
_t(80, 79)
_t(35, 12)
_t(60, 45)
_t(40, 39)
_t(90, 89)
_t(75, 74)
_t(11, 6)
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _bad = 0;
function isBadVersion(v) { return v >= _bad; }
let _pass = 0, _total = 0;
function _t(n, bad) {
    _total++;
    _bad = bad;
    if (firstBadVersion(n) === bad) _pass++;
}
_t(5, 4); _t(1, 1); _t(10, 7); _t(20, 15); _t(3, 2); _t(2, 2); _t(2, 1); _t(100, 42); _t(1000, 999); _t(5, 5);
_t(10, 1); _t(30, 29); _t(15, 6); _t(12, 11); _t(8, 3); _t(50, 25); _t(100, 99); _t(15, 1); _t(4, 3); _t(6, 4);
_t(9, 8); _t(14, 10); _t(22, 17); _t(80, 79); _t(35, 12); _t(60, 45); _t(40, 39); _t(90, 89); _t(75, 74); _t(11, 6);
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _bad = 0;
function isBadVersion(v: number): boolean { return v >= _bad; }
let _pass = 0, _total = 0;
function _t(n: number, bad: number) {
    _total++;
    _bad = bad;
    if (firstBadVersion(n) === bad) _pass++;
}
_t(5, 4); _t(1, 1); _t(10, 7); _t(20, 15); _t(3, 2); _t(2, 2); _t(2, 1); _t(100, 42); _t(1000, 999); _t(5, 5);
_t(10, 1); _t(30, 29); _t(15, 6); _t(12, 11); _t(8, 3); _t(50, 25); _t(100, 99); _t(15, 1); _t(4, 3); _t(6, 4);
_t(9, 8); _t(14, 10); _t(22, 17); _t(80, 79); _t(35, 12); _t(60, 45); _t(40, 39); _t(90, 89); _t(75, 74); _t(11, 6);
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
var _bad = 0
fun isBadVersion(v: Int): Boolean { return v >= _bad }
fun main() {
    var _pass = 0; var _total = 0
    fun _t(n: Int, bad: Int) {
        _total++
        _bad = bad
        if (firstBadVersion(n) == bad) _pass++
    }
    _t(5, 4); _t(1, 1); _t(10, 7); _t(20, 15); _t(3, 2); _t(2, 2); _t(2, 1); _t(100, 42); _t(1000, 999); _t(5, 5)
    _t(10, 1); _t(30, 29); _t(15, 6); _t(12, 11); _t(8, 3); _t(50, 25); _t(100, 99); _t(15, 1); _t(4, 3); _t(6, 4)
    _t(9, 8); _t(14, 10); _t(22, 17); _t(80, 79); _t(35, 12); _t(60, 45); _t(40, 39); _t(90, 89); _t(75, 74); _t(11, 6)
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'sqrt-x',
    type: 'normal',
    functionName: { python: 'mySqrt', javascript: 'mySqrt', typescript: 'mySqrt', kotlin: 'mySqrt' },
    stubs: {
      python: `def mySqrt(x: int) -> int:\n    pass`,
      javascript: `function mySqrt(x) {\n\n}`,
      typescript: `function mySqrt(x: number): number {\n\n}`,
      kotlin: `fun mySqrt(x: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const vals = [0, 1, 2, 3, 4, 8, 9, 15, 16, 25, 26, 35, 36, 48, 49, 99, 100, 120, 121, 224, 225, 1000, 10000, 99999, 81, 64, 46340*46340, 500, 600, 2147483647];
      const x = vals[i % vals.length];
      const expected = Math.floor(Math.sqrt(x));
      return { inputs: [x], expected };
    })
  },
  {
    slug: 'search-insert-position',
    type: 'normal',
    functionName: { python: 'searchInsert', javascript: 'searchInsert', typescript: 'searchInsert', kotlin: 'searchInsert' },
    stubs: {
      python: `def searchInsert(nums: list, target: int) -> int:\n    pass`,
      javascript: `function searchInsert(nums, target) {\n\n}`,
      typescript: `function searchInsert(nums: number[], target: number): number {\n\n}`,
      kotlin: `fun searchInsert(nums: IntArray, target: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,3,5,6], target: 5, expected: 2 },
        { nums: [1,3,5,6], target: 2, expected: 1 },
        { nums: [1,3,5,6], target: 7, expected: 4 },
        { nums: [1,3,5,6], target: 0, expected: 0 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.nums, tc.target], expected: tc.expected };
    })
  },
  {
    slug: 'guess-number-higher-or-lower',
    stubs: {
      python: `def guessNumber(n: int) -> int:\n    pass`,
      javascript: `function guessNumber(n) {\n\n}`,
      typescript: `function guessNumber(n: number): number {\n\n}`,
      kotlin: `fun guessNumber(n: Int): Int {\n    return 1\n}`
    },
    customRunner: {
      python: `
_pick = 0
def guess(num: int) -> int:
    if num > _pick: return -1
    if num < _pick: return 1
    return 0

_pass = _total = 0
def _t(n, pick):
    global _pass, _total, _pick
    _total += 1
    _pick = pick
    if guessNumber(n) == pick:
        _pass += 1

_t(10, 6)
_t(1, 1)
_t(2, 1)
_t(2, 2)
_t(100, 50)
_t(100, 1)
_t(100, 100)
_t(1000, 420)
_t(50, 25)
_t(30, 14)
_t(10, 1)
_t(10, 10)
_t(15, 8)
_t(8, 3)
_t(9, 7)
_t(12, 11)
_t(20, 19)
_t(4, 2)
_t(5, 3)
_t(7, 4)
_t(22, 13)
_t(60, 31)
_t(45, 17)
_t(80, 55)
_t(90, 89)
_t(1000000, 500000)
_t(70, 35)
_t(18, 9)
_t(33, 17)
_t(99, 50)
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pick = 0;
function guess(num) {
    if (num > _pick) return -1;
    if (num < _pick) return 1;
    return 0;
}
let _pass = 0, _total = 0;
function _t(n, pick) {
    _total++;
    _pick = pick;
    if (guessNumber(n) === pick) _pass++;
}
_t(10, 6); _t(1, 1); _t(2, 1); _t(2, 2); _t(100, 50); _t(100, 1); _t(100, 100); _t(1000, 420); _t(50, 25); _t(30, 14);
_t(10, 1); _t(10, 10); _t(15, 8); _t(8, 3); _t(9, 7); _t(12, 11); _t(20, 19); _t(4, 2); _t(5, 3); _t(7, 4);
_t(22, 13); _t(60, 31); _t(45, 17); _t(80, 55); _t(90, 89); _t(1000000, 500000); _t(70, 35); _t(18, 9); _t(33, 17); _t(99, 50);
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pick = 0;
function guess(num: number): number {
    if (num > _pick) return -1;
    if (num < _pick) return 1;
    return 0;
}
let _pass = 0, _total = 0;
function _t(n: number, pick: number) {
    _total++;
    _pick = pick;
    if (guessNumber(n) === pick) _pass++;
}
_t(10, 6); _t(1, 1); _t(2, 1); _t(2, 2); _t(100, 50); _t(100, 1); _t(100, 100); _t(1000, 420); _t(50, 25); _t(30, 14);
_t(10, 1); _t(10, 10); _t(15, 8); _t(8, 3); _t(9, 7); _t(12, 11); _t(20, 19); _t(4, 2); _t(5, 3); _t(7, 4);
_t(22, 13); _t(60, 31); _t(45, 17); _t(80, 55); _t(90, 89); _t(1000000, 500000); _t(70, 35); _t(18, 9); _t(33, 17); _t(99, 50);
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
var _pick = 0
fun guess(num: Int): Int {
    if (num > _pick) return -1
    if (num < _pick) return 1
    return 0
}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(n: Int, pick: Int) {
        _total++
        _pick = pick
        if (guessNumber(n) == pick) _pass++
    }
    _t(10, 6); _t(1, 1); _t(2, 1); _t(2, 2); _t(100, 50); _t(100, 1); _t(100, 100); _t(1000, 420); _t(50, 25); _t(30, 14)
    _t(10, 1); _t(10, 10); _t(15, 8); _t(8, 3); _t(9, 7); _t(12, 11); _t(20, 19); _t(4, 2); _t(5, 3); _t(7, 4)
    _t(22, 13); _t(60, 31); _t(45, 17); _t(80, 55); _t(90, 89); _t(1000000, 500000); _t(70, 35); _t(18, 9); _t(33, 17); _t(99, 50)
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'count-negative-numbers-in-sorted-matrix',
    type: 'normal',
    functionName: { python: 'countNegatives', javascript: 'countNegatives', typescript: 'countNegatives', kotlin: 'countNegatives' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def countNegatives(grid: list) -> int:\n    pass`,
      javascript: `function countNegatives(grid) {\n\n}`,
      typescript: `function countNegatives(grid: number[][]): number {\n\n}`,
      kotlin: `fun countNegatives(grid: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [[4,3,2,-1],[3,2,1,-1],[1,1,-1,-2],[-1,-1,-2,-3]], expected: 8 },
        { grid: [[3,2],[1,0]], expected: 0 },
        { grid: [[1,-1],[-1,-1]], expected: 3 },
        { grid: [[-1]], expected: 1 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.grid], expected: tc.expected };
    })
  },
  {
    slug: 'find-smallest-letter-greater-than-target',
    type: 'normal',
    functionName: { python: 'nextGreatestLetter', javascript: 'nextGreatestLetter', typescript: 'nextGreatestLetter', kotlin: 'nextGreatestLetter' },
    inputTypes: ['char_array'],
    expectedType: 'char',
    stubs: {
      python: `def nextGreatestLetter(letters: list, target: str) -> str:\n    pass`,
      javascript: `function nextGreatestLetter(letters, target) {\n\n}`,
      typescript: `function nextGreatestLetter(letters: string[], target: string): string {\n\n}`,
      kotlin: `fun nextGreatestLetter(letters: CharArray, target: Char): Char {\n    return letters[0]\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { letters: ['c','f','j'], target: 'a', expected: 'c' },
        { letters: ['c','f','j'], target: 'c', expected: 'f' },
        { letters: ['c','f','j'], target: 'd', expected: 'f' },
        { letters: ['c','f','j'], target: 'j', expected: 'c' }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.letters, tc.target], expected: tc.expected };
    })
  },
  {
    slug: 'kth-missing-positive-number',
    type: 'normal',
    functionName: { python: 'findKthPositive', javascript: 'findKthPositive', typescript: 'findKthPositive', kotlin: 'findKthPositive' },
    stubs: {
      python: `def findKthPositive(arr: list, k: int) -> int:\n    pass`,
      javascript: `function findKthPositive(arr, k) {\n\n}`,
      typescript: `function findKthPositive(arr: number[], k: number): number {\n\n}`,
      kotlin: `fun findKthPositive(arr: IntArray, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { arr: [2,3,4,7,11], k: 5, expected: 9 },
        { arr: [1,2,3,4], k: 2, expected: 6 },
        { arr: [5,6,7,8,9], k: 3, expected: 3 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.arr, tc.k], expected: tc.expected };
    })
  },
  {
    slug: 'peak-index-in-a-mountain-array',
    type: 'normal',
    functionName: { python: 'peakIndexInMountainArray', javascript: 'peakIndexInMountainArray', typescript: 'peakIndexInMountainArray', kotlin: 'peakIndexInMountainArray' },
    stubs: {
      python: `def peakIndexInMountainArray(arr: list) -> int:\n    pass`,
      javascript: `function peakIndexInMountainArray(arr) {\n\n}`,
      typescript: `function peakIndexInMountainArray(arr: number[]): number {\n\n}`,
      kotlin: `fun peakIndexInMountainArray(arr: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { arr: [0,1,0], expected: 1 },
        { arr: [0,2,1,0], expected: 1 },
        { arr: [0,10,5,2], expected: 1 },
        { arr: [3,4,5,1], expected: 2 },
        { arr: [0,5,10,2], expected: 2 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.arr], expected: tc.expected };
    })
  },
  {
    slug: 'valid-perfect-square',
    type: 'normal',
    functionName: { python: 'isPerfectSquare', javascript: 'isPerfectSquare', typescript: 'isPerfectSquare', kotlin: 'isPerfectSquare' },
    stubs: {
      python: `def isPerfectSquare(num: int) -> bool:\n    pass`,
      javascript: `function isPerfectSquare(num) {\n\n}`,
      typescript: `function isPerfectSquare(num: number): boolean {\n\n}`,
      kotlin: `fun isPerfectSquare(num: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [16, 14, 1, 4, 9, 25, 26, 36, 49, 100, 101, 144, 225, 256, 400, 625, 1000, 2147483647];
      const num = base[i % base.length];
      const root = Math.floor(Math.sqrt(num));
      return { inputs: [num], expected: root * root === num };
    })
  },
  {
    slug: 'find-first-and-last-position-in-sorted-array',
    type: 'normal',
    functionName: { python: 'searchRange', javascript: 'searchRange', typescript: 'searchRange', kotlin: 'searchRange' },
    expectedType: 'int_array',
    stubs: {
      python: `def searchRange(nums: list, target: int) -> list:\n    pass`,
      javascript: `function searchRange(nums, target) {\n\n}`,
      typescript: `function searchRange(nums: number[], target: number): number[] {\n\n}`,
      kotlin: `fun searchRange(nums: IntArray, target: Int): IntArray {\n    return intArrayOf(-1, -1)\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [5,7,7,8,8,10], target: 8, expected: [3,4] },
        { nums: [5,7,7,8,8,10], target: 6, expected: [-1,-1] },
        { nums: [], target: 0, expected: [-1,-1] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.nums, tc.target], expected: tc.expected };
    })
  },
  {
    slug: 'find-minimum-in-rotated-sorted-array',
    type: 'normal',
    functionName: { python: 'findMin', javascript: 'findMin', typescript: 'findMin', kotlin: 'findMin' },
    stubs: {
      python: `def findMin(nums: list) -> int:\n    pass`,
      javascript: `function findMin(nums) {\n\n}`,
      typescript: `function findMin(nums: number[]): number {\n\n}`,
      kotlin: `fun findMin(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [3,4,5,1,2], expected: 1 },
        { nums: [4,5,6,7,0,1,2], expected: 0 },
        { nums: [11,13,15,17], expected: 11 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.nums], expected: tc.expected };
    })
  },
  {
    slug: 'search-a-2d-matrix',
    type: 'normal',
    functionName: { python: 'searchMatrix', javascript: 'searchMatrix', typescript: 'searchMatrix', kotlin: 'searchMatrix' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def searchMatrix(matrix: list, target: int) -> bool:\n    pass`,
      javascript: `function searchMatrix(matrix, target) {\n\n}`,
      typescript: `function searchMatrix(matrix: number[][], target: number): boolean {\n\n}`,
      kotlin: `fun searchMatrix(matrix: Array<IntArray>, target: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { matrix: [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target: 3, expected: true },
        { matrix: [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target: 13, expected: false },
        { matrix: [[1]], target: 1, expected: true },
        { matrix: [[1]], target: 0, expected: false }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.matrix, tc.target], expected: tc.expected };
    })
  },
  {
    slug: 'koko-eating-bananas',
    type: 'normal',
    functionName: { python: 'minEatingSpeed', javascript: 'minEatingSpeed', typescript: 'minEatingSpeed', kotlin: 'minEatingSpeed' },
    stubs: {
      python: `def minEatingSpeed(piles: list, h: int) -> int:\n    pass`,
      javascript: `function minEatingSpeed(piles, h) {\n\n}`,
      typescript: `function minEatingSpeed(piles: number[], h: number): number {\n\n}`,
      kotlin: `fun minEatingSpeed(piles: IntArray, h: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { piles: [3,6,7,11], h: 8, expected: 4 },
        { piles: [30,11,23,4,20], h: 5, expected: 30 },
        { piles: [30,11,23,4,20], h: 6, expected: 23 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.piles, tc.h], expected: tc.expected };
    })
  },
  {
    slug: 'find-peak-element',
    stubs: {
      python: `def findPeakElement(nums: list) -> int:\n    pass`,
      javascript: `function findPeakElement(nums) {\n\n}`,
      typescript: `function findPeakElement(nums: number[]): number {\n\n}`,
      kotlin: `fun findPeakElement(nums: IntArray): Int {\n    return 0\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
def _t(nums):
    global _pass, _total
    _total += 1
    idx = findPeakElement(nums)
    if 0 <= idx < len(nums):
        left = nums[idx - 1] if idx > 0 else float('-inf')
        right = nums[idx + 1] if idx < len(nums) - 1 else float('-inf')
        if nums[idx] > left and nums[idx] > right:
            _pass += 1

_t([1,2,3,1])
_t([1,2,1,3,5,6,4])
_t([1])
_t([1,2])
_t([2,1])
_t([1,3,2,1])
_t([1,2,3,4,5])
_t([5,4,3,2,1])
_t([1,5,2,4,3])
_t([1,2,3,4,3,2,1])
_t([1,2,1,2,1,2,1])
_t([1,2,3])
_t([3,2,1])
_t([2,3,2])
_t([1,4,3,5,2])
_t([10,20,30,40,50,40])
_t([1,3,5,4,2])
_t([2,1,2])
_t([3,4,3])
_t([5,6,7,8,7])
_t([1,2,3,4,5,6,7,8,9,0])
_t([9,8,7,6,5,4,3,2,1,0])
_t([1,2,1,2,1,2,1,2])
_t([8,9,7,6,5,4,3,2,1])
_t([1,2,3,4,3])
_t([2,1,3,4,2])
_t([1,3,4,2,5])
_t([4,3,2,1,2])
_t([1,2,3,2,1])
_t([3,2,3,2,3])
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
function _t(nums) {
    _total++;
    let idx = findPeakElement(nums);
    if (idx >= 0 && idx < nums.length) {
        let left = idx > 0 ? nums[idx - 1] : -Infinity;
        let right = idx < nums.length - 1 ? nums[idx + 1] : -Infinity;
        if (nums[idx] > left && nums[idx] > right) _pass++;
    }
}
_t([1,2,3,1]); _t([1,2,1,3,5,6,4]); _t([1]); _t([1,2]); _t([2,1]); _t([1,3,2,1]); _t([1,2,3,4,5]); _t([5,4,3,2,1]); _t([1,5,2,4,3]);
_t([1,2,3,4,3,2,1]); _t([1,2,1,2,1,2,1]); _t([1,2,3]); _t([3,2,1]); _t([2,3,2]); _t([1,4,3,5,2]); _t([10,20,30,40,50,40]);
_t([1,3,5,4,2]); _t([2,1,2]); _t([3,4,3]); _t([5,6,7,8,7]); _t([1,2,3,4,5,6,7,8,9,0]); _t([9,8,7,6,5,4,3,2,1,0]);
_t([1,2,1,2,1,2,1,2]); _t([8,9,7,6,5,4,3,2,1]); _t([1,2,3,4,3]); _t([2,1,3,4,2]); _t([1,3,4,2,5]); _t([4,3,2,1,2]);
_t([1,2,3,2,1]); _t([3,2,3,2,3]);
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
function _t(nums: number[]) {
    _total++;
    let idx = findPeakElement(nums);
    if (idx >= 0 && idx < nums.length) {
        let left = idx > 0 ? nums[idx - 1] : -Infinity;
        let right = idx < nums.length - 1 ? nums[idx + 1] : -Infinity;
        if (nums[idx] > left && nums[idx] > right) _pass++;
    }
}
_t([1,2,3,1]); _t([1,2,1,3,5,6,4]); _t([1]); _t([1,2]); _t([2,1]); _t([1,3,2,1]); _t([1,2,3,4,5]); _t([5,4,3,2,1]); _t([1,5,2,4,3]);
_t([1,2,3,4,3,2,1]); _t([1,2,1,2,1,2,1]); _t([1,2,3]); _t([3,2,1]); _t([2,3,2]); _t([1,4,3,5,2]); _t([10,20,30,40,50,40]);
_t([1,3,5,4,2]); _t([2,1,2]); _t([3,4,3]); _t([5,6,7,8,7]); _t([1,2,3,4,5,6,7,8,9,0]); _t([9,8,7,6,5,4,3,2,1,0]);
_t([1,2,1,2,1,2,1,2]); _t([8,9,7,6,5,4,3,2,1]); _t([1,2,3,4,3]); _t([2,1,3,4,2]); _t([1,3,4,2,5]); _t([4,3,2,1,2]);
_t([1,2,3,2,1]); _t([3,2,3,2,3]);
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    fun _t(nums: IntArray) {
        _total++
        val idx = findPeakElement(nums)
        if (idx >= 0 && idx < nums.size) {
            val left = if (idx > 0) nums[idx - 1] else Int.MIN_VALUE
            val right = if (idx < nums.size - 1) nums[idx + 1] else Int.MIN_VALUE
            if (nums[idx] > left && nums[idx] > right) _pass++
        }
    }
    _t(intArrayOf(1,2,3,1)); _t(intArrayOf(1,2,1,3,5,6,4)); _t(intArrayOf(1)); _t(intArrayOf(1,2)); _t(intArrayOf(2,1)); _t(intArrayOf(1,3,2,1)); _t(intArrayOf(1,2,3,4,5)); _t(intArrayOf(5,4,3,2,1)); _t(intArrayOf(1,5,2,4,3))
    _t(intArrayOf(1,2,3,4,3,2,1)); _t(intArrayOf(1,2,1,2,1,2,1)); _t(intArrayOf(1,2,3)); _t(intArrayOf(3,2,1)); _t(intArrayOf(2,3,2)); _t(intArrayOf(1,4,3,5,2)); _t(intArrayOf(10,20,30,40,50,40))
    _t(intArrayOf(1,3,5,4,2)); _t(intArrayOf(2,1,2)); _t(intArrayOf(3,4,3)); _t(intArrayOf(5,6,7,8,7)); _t(intArrayOf(1,2,3,4,5,6,7,8,9,0)); _t(intArrayOf(9,8,7,6,5,4,3,2,1,0))
    _t(intArrayOf(1,2,1,2,1,2,1,2)); _t(intArrayOf(8,9,7,6,5,4,3,2,1)); _t(intArrayOf(1,2,3,4,3)); _t(intArrayOf(2,1,3,4,2)); _t(intArrayOf(1,3,4,2,5)); _t(intArrayOf(4,3,2,1,2))
    _t(intArrayOf(1,2,3,2,1)); _t(intArrayOf(3,2,3,2,3))
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'time-based-key-value-store',
    stubs: {
      python: `class TimeMap:\n    def __init__(self):\n        pass\n    def set(self, key: str, value: str, timestamp: int) -> None:\n        pass\n    def get(self, key: str, timestamp: int) -> str:\n        pass`,
      javascript: `class TimeMap {\n    constructor() {\n\n    }\n    set(key, value, timestamp) {\n\n    }\n    get(key, timestamp) {\n\n    }\n}`,
      typescript: `class TimeMap {\n    constructor() {\n\n    }\n    set(key: string, value: string, timestamp: number): void {\n\n    }\n    get(key: string, timestamp: number): string {\n        return "";\n    }\n}`,
      kotlin: `class TimeMap() {\n    fun set(key: String, value: String, timestamp: Int) {\n\n    }\n    fun get(key: String, timestamp: Int): String {\n        return ""\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
def _t(ops, vals, expected):
    global _pass, _total
    _total += 1
    obj = None
    res = []
    for i, op in enumerate(ops):
        if op == "TimeMap":
            obj = TimeMap()
            res.append(None)
        elif op == "set":
            obj.set(vals[i][0], vals[i][1], vals[i][2])
            res.append(None)
        elif op == "get":
            res.append(obj.get(vals[i][0], vals[i][1]))
    if res == expected:
        _pass += 1

# repeat test 30 times
for _ in range(30):
    _t(["TimeMap", "set", "get", "get", "set", "get", "get"], [[], ["foo", "bar", 1], ["foo", 1], ["foo", 3], ["foo", "bar2", 4], ["foo", 4], ["foo", 5]], [None, None, "bar", "bar", None, "bar2", "bar2"])
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
function _t(ops, vals, expected) {
    _total++;
    let obj = null;
    let res = [];
    for (let i = 0; i < ops.length; i++) {
        if (ops[i] === "TimeMap") {
            obj = new TimeMap();
            res.push(null);
        } else if (ops[i] === "set") {
            obj.set(vals[i][0], vals[i][1], vals[i][2]);
            res.push(null);
        } else if (ops[i] === "get") {
            res.push(obj.get(vals[i][0], vals[i][1]));
        }
    }
    if (JSON.stringify(res) === JSON.stringify(expected)) _pass++;
}
for (let i = 0; i < 30; i++) {
    _t(["TimeMap", "set", "get", "get", "set", "get", "get"], [[], ["foo", "bar", 1], ["foo", 1], ["foo", 3], ["foo", "bar2", 4], ["foo", 4], ["foo", 5]], [null, null, "bar", "bar", null, "bar2", "bar2"]);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
function _t(ops: string[], vals: any[], expected: any[]) {
    _total++;
    let obj: any = null;
    let res: any[] = [];
    for (let i = 0; i < ops.length; i++) {
        if (ops[i] === "TimeMap") {
            obj = new TimeMap();
            res.push(null);
        } else if (ops[i] === "set") {
            obj.set(vals[i][0], vals[i][1], vals[i][2]);
            res.push(null);
        } else if (ops[i] === "get") {
            res.push(obj.get(vals[i][0], vals[i][1]));
        }
    }
    if (JSON.stringify(res) === JSON.stringify(expected)) _pass++;
}
for (let i = 0; i < 30; i++) {
    _t(["TimeMap", "set", "get", "get", "set", "get", "get"], [[], ["foo", "bar", 1], ["foo", 1], ["foo", 3], ["foo", "bar2", 4], ["foo", 4], ["foo", 5]], [null, null, "bar", "bar", null, "bar2", "bar2"]);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    fun _t() {
        _total++
        val obj = TimeMap()
        obj.set("foo", "bar", 1)
        val r1 = obj.get("foo", 1)
        val r2 = obj.get("foo", 3)
        obj.set("foo", "bar2", 4)
        val r3 = obj.get("foo", 4)
        val r4 = obj.get("foo", 5)
        if (r1 == "bar" && r2 == "bar" && r3 == "bar2" && r4 == "bar2") _pass++
    }
    for (i in 1..30) {
        _t()
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'capacity-to-ship-packages-within-d-days',
    type: 'normal',
    functionName: { python: 'shipWithinDays', javascript: 'shipWithinDays', typescript: 'shipWithinDays', kotlin: 'shipWithinDays' },
    stubs: {
      python: `def shipWithinDays(weights: list, days: int) -> int:\n    pass`,
      javascript: `function shipWithinDays(weights, days) {\n\n}`,
      typescript: `function shipWithinDays(weights: number[], days: number): number {\n\n}`,
      kotlin: `fun shipWithinDays(weights: IntArray, days: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { weights: [1,2,3,4,5,6,7,8,9,10], days: 5, expected: 15 },
        { weights: [3,2,2,4,1,4], days: 3, expected: 6 },
        { weights: [1,2,3,1,1], days: 4, expected: 3 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.weights, tc.days], expected: tc.expected };
    })
  },
  {
    slug: 'search-in-rotated-sorted-array-ii',
    type: 'normal',
    functionName: { python: 'search', javascript: 'search', typescript: 'search', kotlin: 'search' },
    stubs: {
      python: `def search(nums: list, target: int) -> bool:\n    pass`,
      javascript: `function search(nums, target) {\n\n}`,
      typescript: `function search(nums: number[], target: number): boolean {\n\n}`,
      kotlin: `fun search(nums: IntArray, target: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [2,5,6,0,0,1,2], target: 0, expected: true },
        { nums: [2,5,6,0,0,1,2], target: 3, expected: false },
        { nums: [1,0,1,1,1], target: 0, expected: true }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.nums, tc.target], expected: tc.expected };
    })
  },
  {
    slug: 'minimum-number-of-days-to-make-m-bouquets',
    type: 'normal',
    functionName: { python: 'minDays', javascript: 'minDays', typescript: 'minDays', kotlin: 'minDays' },
    stubs: {
      python: `def minDays(bloomDay: list, m: int, k: int) -> int:\n    pass`,
      javascript: `function minDays(bloomDay, m, k) {\n\n}`,
      typescript: `function minDays(bloomDay: number[], m: number, k: number): number {\n\n}`,
      kotlin: `fun minDays(bloomDay: IntArray, m: Int, k: Int): Int {\n    return -1\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { bloomDay: [1,10,3,10,2], m: 3, k: 1, expected: 3 },
        { bloomDay: [1,10,3,10,2], m: 3, k: 2, expected: -1 },
        { bloomDay: [7,7,7,7,12,7,7], m: 2, k: 3, expected: 12 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.bloomDay, tc.m, tc.k], expected: tc.expected };
    })
  },
  {
    slug: 'median-of-two-sorted-arrays',
    type: 'normal',
    functionName: { python: 'findMedianSortedArrays', javascript: 'findMedianSortedArrays', typescript: 'findMedianSortedArrays', kotlin: 'findMedianSortedArrays' },
    expectedType: 'double',
    stubs: {
      python: `def findMedianSortedArrays(nums1: list, nums2: list) -> float:\n    pass`,
      javascript: `function findMedianSortedArrays(nums1, nums2) {\n\n}`,
      typescript: `function findMedianSortedArrays(nums1: number[], nums2: number[]): number {\n\n}`,
      kotlin: `fun findMedianSortedArrays(nums1: IntArray, nums2: IntArray): Double {\n    return 0.0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums1: [1,3], nums2: [2], expected: 2.0 },
        { nums1: [1,2], nums2: [3,4], expected: 2.5 },
        { nums1: [0,0], nums2: [0,0], expected: 0.0 },
        { nums1: [], nums2: [1], expected: 1.0 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.nums1, tc.nums2], expected: tc.expected };
    })
  },
  {
    slug: 'split-array-largest-sum',
    type: 'normal',
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
      const tc = base[i % base.length];
      return { inputs: [tc.nums, tc.k], expected: tc.expected };
    })
  },
  {
    slug: 'find-k-th-smallest-element-sorted-matrix',
    type: 'normal',
    functionName: { python: 'kthSmallest', javascript: 'kthSmallest', typescript: 'kthSmallest', kotlin: 'kthSmallest' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def kthSmallest(matrix: list, k: int) -> int:\n    pass`,
      javascript: `function kthSmallest(matrix, k) {\n\n}`,
      typescript: `function kthSmallest(matrix: number[][], k: number): number {\n\n}`,
      kotlin: `fun kthSmallest(matrix: Array<IntArray>, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { matrix: [[1,5,9],[10,11,13],[12,13,15]], k: 8, expected: 13 },
        { matrix: [[-5]], k: 1, expected: -5 },
        { matrix: [[1,2],[1,3]], k: 3, expected: 2 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.matrix, tc.k], expected: tc.expected };
    })
  },
  {
    slug: 'kth-smallest-number-in-multiplication-table',
    type: 'normal',
    functionName: { python: 'findKthNumber', javascript: 'findKthNumber', typescript: 'findKthNumber', kotlin: 'findKthNumber' },
    stubs: {
      python: `def findKthNumber(m: int, n: int, k: int) -> int:\n    pass`,
      javascript: `function findKthNumber(m, n, k) {\n\n}`,
      typescript: `function findKthNumber(m: number, n: number, k: number): number {\n\n}`,
      kotlin: `fun findKthNumber(m: Int, n: Int, k: Int): Int {\n    return 1\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { m: 3, n: 3, k: 5, expected: 3 },
        { m: 2, n: 3, k: 6, expected: 6 },
        { m: 1, n: 3, k: 2, expected: 2 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.m, tc.n, tc.k], expected: tc.expected };
    })
  },
  {
    slug: 'maximum-profit-in-job-scheduling',
    type: 'normal',
    functionName: { python: 'jobScheduling', javascript: 'jobScheduling', typescript: 'jobScheduling', kotlin: 'jobScheduling' },
    stubs: {
      python: `def jobScheduling(startTime: list, endTime: list, profit: list) -> int:\n    pass`,
      javascript: `function jobScheduling(startTime, endTime, profit) {\n\n}`,
      typescript: `function jobScheduling(startTime: number[], endTime: number[], profit: number[]): number {\n\n}`,
      kotlin: `fun jobScheduling(startTime: IntArray, endTime: IntArray, profit: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { startTime: [1,2,3,3], endTime: [3,4,5,6], profit: [50,10,40,70], expected: 120 },
        { startTime: [1,2,3,4,6], endTime: [3,5,10,6,9], profit: [20,20,100,70,60], expected: 150 },
        { startTime: [1,1,1], endTime: [2,3,4], profit: [5,6,4], expected: 6 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.startTime, tc.endTime, tc.profit], expected: tc.expected };
    })
  },
  {
    slug: 'minimum-time-to-complete-trips',
    type: 'normal',
    functionName: { python: 'minimumTime', javascript: 'minimumTime', typescript: 'minimumTime', kotlin: 'minimumTime' },
    stubs: {
      python: `def minimumTime(time: list, totalTrips: int) -> int:\n    pass`,
      javascript: `function minimumTime(time, totalTrips) {\n\n}`,
      typescript: `function minimumTime(time: number[], totalTrips: number): number {\n\n}`,
      kotlin: `fun minimumTime(time: IntArray, totalTrips: Int): Long {\n    return 0L\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { time: [1,2,3], totalTrips: 5, expected: 3 },
        { time: [2], totalTrips: 1, expected: 2 },
        { time: [5,1,3], totalTrips: 10, expected: 7 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.time, tc.totalTrips], expected: tc.expected };
    })
  },
  {
    slug: 'find-minimum-in-rotated-sorted-array-ii',
    type: 'normal',
    functionName: { python: 'findMin', javascript: 'findMin', typescript: 'findMin', kotlin: 'findMin' },
    stubs: {
      python: `def findMin(nums: list) -> int:\n    pass`,
      javascript: `function findMin(nums) {\n\n}`,
      typescript: `function findMin(nums: number[]): number {\n\n}`,
      kotlin: `fun findMin(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,3,5], expected: 1 },
        { nums: [2,2,2,0,1], expected: 0 },
        { nums: [3,3,1,3], expected: 1 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.nums], expected: tc.expected };
    })
  },
  {
    slug: 'russian-doll-envelopes',
    type: 'normal',
    functionName: { python: 'maxEnvelopes', javascript: 'maxEnvelopes', typescript: 'maxEnvelopes', kotlin: 'maxEnvelopes' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def maxEnvelopes(envelopes: list) -> int:\n    pass`,
      javascript: `function maxEnvelopes(envelopes) {\n\n}`,
      typescript: `function maxEnvelopes(envelopes: number[][]): number {\n\n}`,
      kotlin: `fun maxEnvelopes(envelopes: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { envelopes: [[5,4],[6,4],[6,7],[2,3]], expected: 3 },
        { envelopes: [[1,1],[1,1],[1,1]], expected: 1 },
        { envelopes: [[2,100],[3,200],[4,300]], expected: 3 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.envelopes], expected: tc.expected };
    })
  },
  {
    slug: 'minimum-limit-of-balls-in-a-bag',
    type: 'normal',
    functionName: { python: 'minimumSize', javascript: 'minimumSize', typescript: 'minimumSize', kotlin: 'minimumSize' },
    stubs: {
      python: `def minimumSize(nums: list, maxOperations: int) -> int:\n    pass`,
      javascript: `function minimumSize(nums, maxOperations) {\n\n}`,
      typescript: `function minimumSize(nums: number[], maxOperations: number): number {\n\n}`,
      kotlin: `fun minimumSize(nums: IntArray, maxOperations: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [9], maxOperations: 2, expected: 3 },
        { nums: [2,4,8,2], maxOperations: 4, expected: 2 },
        { nums: [7,17], maxOperations: 2, expected: 7 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.nums, tc.maxOperations], expected: tc.expected };
    })
  },
  {
    slug: 'count-of-smaller-numbers-after-self',
    type: 'normal',
    functionName: { python: 'countSmaller', javascript: 'countSmaller', typescript: 'countSmaller', kotlin: 'countSmaller' },
    expectedType: 'int_array',
    stubs: {
      python: `def countSmaller(nums: list) -> list:\n    pass`,
      javascript: `function countSmaller(nums) {\n\n}`,
      typescript: `function countSmaller(nums: number[]): number[] {\n\n}`,
      kotlin: `fun countSmaller(nums: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [5,2,6,1], expected: [2,1,1,0] },
        { nums: [-1], expected: [0] },
        { nums: [-1,-1], expected: [0,0] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.nums], expected: tc.expected };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 30 Binary Search problems…\n');

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

    console.log(`  ✓  [${dbProblem.difficulty}] ${prob.slug} (${prob.testCases?.length || 30} test cases seeded)`);
  }

  console.log('\nDone.');
  await client.end();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
