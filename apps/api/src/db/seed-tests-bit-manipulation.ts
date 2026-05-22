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
      if (type === 'char_array_2d') {
        return `arrayOf(${val.map(row => `charArrayOf(${row.map(c => `'${c}'`).join(',')})`).join(',')})`;
      }
      if (type === 'string_array_2d') {
        return `listOf(${val.map(row => `listOf(${row.map(s => serializeVal(s, lang)).join(',')})`).join(',')})`;
      }
      if (type === 'string_array') {
        return `arrayOf(${val.map(s => serializeVal(s, lang)).join(',')})`;
      }
      if (type === 'double_array') {
        return `doubleArrayOf(${val.join(',')})`;
      }
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
        r is DoubleArray && e is DoubleArray -> r.contentEquals(e)
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
// 30 BIT_MANIPULATION PROBLEMS DATA
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
    slug: 'single-number',
    functionName: { python: 'singleNumber', javascript: 'singleNumber', typescript: 'singleNumber', kotlin: 'singleNumber' },
    stubs: {
      python: `def singleNumber(nums: list) -> int:\n    pass`,
      javascript: `function singleNumber(nums) {\n\n}`,
      typescript: `function singleNumber(nums: number[]): number {\n\n}`,
      kotlin: `fun singleNumber(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [2,2,1], expected: 1 },
        { nums: [4,1,2,1,2], expected: 4 },
        { nums: [1], expected: 1 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'number-of-1-bits',
    functionName: { python: 'hammingWeight', javascript: 'hammingWeight', typescript: 'hammingWeight', kotlin: 'hammingWeight' },
    stubs: {
      python: `def hammingWeight(n: int) -> int:\n    pass`,
      javascript: `function hammingWeight(n) {\n\n}`,
      typescript: `function hammingWeight(n: number): number {\n\n}`,
      kotlin: `fun hammingWeight(n: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 11, expected: 3 },
        { n: 128, expected: 1 }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'power-of-two',
    functionName: { python: 'isPowerOfTwo', javascript: 'isPowerOfTwo', typescript: 'isPowerOfTwo', kotlin: 'isPowerOfTwo' },
    stubs: {
      python: `def isPowerOfTwo(n: int) -> bool:\n    pass`,
      javascript: `function isPowerOfTwo(n) {\n\n}`,
      typescript: `function isPowerOfTwo(n: number): boolean {\n\n}`,
      kotlin: `fun isPowerOfTwo(n: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 1, expected: true },
        { n: 16, expected: true },
        { n: 3, expected: false }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'missing-number',
    functionName: { python: 'missingNumber', javascript: 'missingNumber', typescript: 'missingNumber', kotlin: 'missingNumber' },
    stubs: {
      python: `def missingNumber(nums: list) -> int:\n    pass`,
      javascript: `function missingNumber(nums) {\n\n}`,
      typescript: `function missingNumber(nums: number[]): number {\n\n}`,
      kotlin: `fun missingNumber(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [3,0,1], expected: 2 },
        { nums: [0,1], expected: 2 },
        { nums: [9,6,4,2,3,5,7,0,1], expected: 8 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'reverse-bits',
    functionName: { python: 'reverseBits', javascript: 'reverseBits', typescript: 'reverseBits', kotlin: 'reverseBits' },
    stubs: {
      python: `def reverseBits(n: int) -> int:\n    pass`,
      javascript: `function reverseBits(n) {\n\n}`,
      typescript: `function reverseBits(n: number): number {\n\n}`,
      kotlin: `fun reverseBits(n: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 43261596, expected: 964176192 }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'hamming-distance',
    functionName: { python: 'hammingDistance', javascript: 'hammingDistance', typescript: 'hammingDistance', kotlin: 'hammingDistance' },
    stubs: {
      python: `def hammingDistance(x: int, y: int) -> int:\n    pass`,
      javascript: `function hammingDistance(x, y) {\n\n}`,
      typescript: `function hammingDistance(x: number, y: number): number {\n\n}`,
      kotlin: `fun hammingDistance(x: Int, y: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { x: 1, y: 4, expected: 2 },
        { x: 3, y: 1, expected: 1 }
      ];
      return { inputs: [base[i % base.length].x, base[i % base.length].y], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'counting-bits',
    functionName: { python: 'countBits', javascript: 'countBits', typescript: 'countBits', kotlin: 'countBits' },
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
    slug: 'power-of-four',
    functionName: { python: 'isPowerOfFour', javascript: 'isPowerOfFour', typescript: 'isPowerOfFour', kotlin: 'isPowerOfFour' },
    stubs: {
      python: `def isPowerOfFour(n: int) -> bool:\n    pass`,
      javascript: `function isPowerOfFour(n) {\n\n}`,
      typescript: `function isPowerOfFour(n: number): boolean {\n\n}`,
      kotlin: `fun isPowerOfFour(n: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 16, expected: true },
        { n: 5, expected: false },
        { n: 1, expected: true }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'find-the-difference',
    functionName: { python: 'findTheDifference', javascript: 'findTheDifference', typescript: 'findTheDifference', kotlin: 'findTheDifference' },
    stubs: {
      python: `def findTheDifference(s: str, t: str) -> str:\n    pass`,
      javascript: `function findTheDifference(s, t) {\n\n}`,
      typescript: `function findTheDifference(s: string, t: string): string {\n\n}`,
      kotlin: `fun findTheDifference(s: String, t: String): Char {\n    return ' '\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "abcd", t: "abcde", expected: "e" },
        { s: "", t: "y", expected: "y" }
      ];
      return { inputs: [base[i % base.length].s, base[i % base.length].t], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'binary-number-with-alternating-bits',
    functionName: { python: 'hasAlternatingBits', javascript: 'hasAlternatingBits', typescript: 'hasAlternatingBits', kotlin: 'hasAlternatingBits' },
    stubs: {
      python: `def hasAlternatingBits(n: int) -> bool:\n    pass`,
      javascript: `function hasAlternatingBits(n) {\n\n}`,
      typescript: `function hasAlternatingBits(n: number): boolean {\n\n}`,
      kotlin: `fun hasAlternatingBits(n: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 5, expected: true },
        { n: 7, expected: false },
        { n: 11, expected: false }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'single-number-ii',
    functionName: { python: 'singleNumber', javascript: 'singleNumber', typescript: 'singleNumber', kotlin: 'singleNumber' },
    stubs: {
      python: `def singleNumber(nums: list) -> int:\n    pass`,
      javascript: `function singleNumber(nums) {\n\n}`,
      typescript: `function singleNumber(nums: number[]): number {\n\n}`,
      kotlin: `fun singleNumber(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [2,2,3,2], expected: 3 },
        { nums: [0,1,0,1,0,1,99], expected: 99 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'single-number-iii',
    functionName: { python: 'singleNumber', javascript: 'singleNumber', typescript: 'singleNumber', kotlin: 'singleNumber' },
    stubs: {
      python: `def singleNumber(nums: list) -> list:\n    pass`,
      javascript: `function singleNumber(nums) {\n\n}`,
      typescript: `function singleNumber(nums: number[]): number[] {\n\n}`,
      kotlin: `fun singleNumber(nums: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,2,1,3,2,5], expected: [3,5] },
        { nums: [-1,0], expected: [-1,0] }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'sum-of-two-integers',
    functionName: { python: 'getSum', javascript: 'getSum', typescript: 'getSum', kotlin: 'getSum' },
    stubs: {
      python: `def getSum(a: int, b: int) -> int:\n    pass`,
      javascript: `function getSum(a, b) {\n\n}`,
      typescript: `function getSum(a: number, b: number): number {\n\n}`,
      kotlin: `fun getSum(a: Int, b: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { a: 1, b: 2, expected: 3 },
        { a: 2, b: 3, expected: 5 }
      ];
      return { inputs: [base[i % base.length].a, base[i % base.length].b], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'divide-two-integers',
    functionName: { python: 'divide', javascript: 'divide', typescript: 'divide', kotlin: 'divide' },
    stubs: {
      python: `def divide(dividend: int, divisor: int) -> int:\n    pass`,
      javascript: `function divide(dividend, divisor) {\n\n}`,
      typescript: `function divide(dividend: number, divisor: number): number {\n\n}`,
      kotlin: `fun divide(dividend: Int, divisor: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { dividend: 10, divisor: 3, expected: 3 },
        { dividend: 7, divisor: -3, expected: -2 }
      ];
      return { inputs: [base[i % base.length].dividend, base[i % base.length].divisor], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'gray-code',
    functionName: { python: 'grayCode', javascript: 'grayCode', typescript: 'grayCode', kotlin: 'grayCode' },
    stubs: {
      python: `def grayCode(n: int) -> list:\n    pass`,
      javascript: `function grayCode(n) {\n\n}`,
      typescript: `function grayCode(n: number): number[] {\n\n}`,
      kotlin: `fun grayCode(n: Int): List<Int> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 2, expected: [0,1,3,2] },
        { n: 1, expected: [0,1] }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'bitwise-and-of-numbers-range',
    functionName: { python: 'rangeBitwiseAnd', javascript: 'rangeBitwiseAnd', typescript: 'rangeBitwiseAnd', kotlin: 'rangeBitwiseAnd' },
    stubs: {
      python: `def rangeBitwiseAnd(left: int, right: int) -> int:\n    pass`,
      javascript: `function rangeBitwiseAnd(left, right) {\n\n}`,
      typescript: `function rangeBitwiseAnd(left: number, right: number): number {\n\n}`,
      kotlin: `fun rangeBitwiseAnd(left: Int, right: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { left: 5, right: 7, expected: 4 },
        { left: 0, right: 0, expected: 0 },
        { left: 1, right: 2147483647, expected: 0 }
      ];
      return { inputs: [base[i % base.length].left, base[i % base.length].right], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'total-hamming-distance',
    functionName: { python: 'totalHammingDistance', javascript: 'totalHammingDistance', typescript: 'totalHammingDistance', kotlin: 'totalHammingDistance' },
    stubs: {
      python: `def totalHammingDistance(nums: list) -> int:\n    pass`,
      javascript: `function totalHammingDistance(nums) {\n\n}`,
      typescript: `function totalHammingDistance(nums: number[]): number {\n\n}`,
      kotlin: `fun totalHammingDistance(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [4,14,2], expected: 6 },
        { nums: [4,14,4], expected: 4 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-flips-to-make-a-or-b-equal-to-c',
    functionName: { python: 'minFlips', javascript: 'minFlips', typescript: 'minFlips', kotlin: 'minFlips' },
    stubs: {
      python: `def minFlips(a: int, b: int, c: int) -> int:\n    pass`,
      javascript: `function minFlips(a, b, c) {\n\n}`,
      typescript: `function minFlips(a: number, b: number, c: number): number {\n\n}`,
      kotlin: `fun minFlips(a: Int, b: Int, c: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { a: 2, b: 6, c: 5, expected: 3 },
        { a: 4, b: 2, c: 7, expected: 1 },
        { a: 1, b: 2, c: 3, expected: 0 }
      ];
      return { inputs: [base[i % base.length].a, base[i % base.length].b, base[i % base.length].c], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'utf-8-validation',
    functionName: { python: 'validUtf8', javascript: 'validUtf8', typescript: 'validUtf8', kotlin: 'validUtf8' },
    stubs: {
      python: `def validUtf8(data: list) -> bool:\n    pass`,
      javascript: `function validUtf8(data) {\n\n}`,
      typescript: `function validUtf8(data: number[]): boolean {\n\n}`,
      kotlin: `fun validUtf8(data: IntArray): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { data: [197,130,1], expected: true },
        { data: [235,140,4], expected: false }
      ];
      return { inputs: [base[i % base.length].data], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'count-triplets-that-can-form-two-arrays-of-equal-xor',
    functionName: { python: 'countTriplets', javascript: 'countTriplets', typescript: 'countTriplets', kotlin: 'countTriplets' },
    stubs: {
      python: `def countTriplets(arr: list) -> int:\n    pass`,
      javascript: `function countTriplets(arr) {\n\n}`,
      typescript: `function countTriplets(arr: number[]): number {\n\n}`,
      kotlin: `fun countTriplets(arr: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { arr: [2,3,1,6,7], expected: 4 },
        { arr: [1,1,1,1,1], expected: 10 }
      ];
      return { inputs: [base[i % base.length].arr], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximum-students-taking-exam',
    functionName: { python: 'maxStudents', javascript: 'maxStudents', typescript: 'maxStudents', kotlin: 'maxStudents' },
    inputTypes: ['char_array_2d'],
    stubs: {
      python: `def maxStudents(seats: list) -> int:\n    pass`,
      javascript: `function maxStudents(seats) {\n\n}`,
      typescript: `function maxStudents(seats: string[][]): number {\n\n}`,
      kotlin: `fun maxStudents(seats: Array<CharArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        {
          seats: [
            ["#",".","#","#",".","#"],
            [".","#",".",".","#","."],
            ["#",".","#","#",".","#"]
          ],
          expected: 4
        }
      ];
      return { inputs: [base[i % base.length].seats], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'smallest-sufficient-team',
    functionName: { python: 'smallestSufficientTeam', javascript: 'smallestSufficientTeam', typescript: 'smallestSufficientTeam', kotlin: 'smallestSufficientTeam' },
    inputTypes: ['string_array', 'string_array_2d'],
    stubs: {
      python: `def smallestSufficientTeam(req_skills: list, people: list) -> list:\n    pass`,
      javascript: `function smallestSufficientTeam(req_skills, people) {\n\n}`,
      typescript: `function smallestSufficientTeam(req_skills: string[], people: string[][]): number[] {\n\n}`,
      kotlin: `fun smallestSufficientTeam(req_skills: Array<String>, people: List<List<String>>): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        {
          req_skills: ["java","nodejs","reactjs"],
          people: [["java"],["nodejs"],["nodejs","reactjs"]],
          expected: [0,2]
        }
      ];
      return { inputs: [base[i % base.length].req_skills, base[i % base.length].people], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'number-of-ways-to-wear-different-hats-to-each-other',
    functionName: { python: 'numberWays', javascript: 'numberWays', typescript: 'numberWays', kotlin: 'numberWays' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def numberWays(hats: list) -> int:\n    pass`,
      javascript: `function numberWays(hats) {\n\n}`,
      typescript: `function numberWays(hats: number[][]): number {\n\n}`,
      kotlin: `fun numberWays(hats: List<List<Int>>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { hats: [[3,4],[4,5],[5]], expected: 4 },
        { hats: [[3,5,1],[],[1,3],[5,3]], expected: 8 }
      ];
      return { inputs: [base[i % base.length].hats], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-number-of-work-sessions-to-finish-the-tasks',
    functionName: { python: 'minSessions', javascript: 'minSessions', typescript: 'minSessions', kotlin: 'minSessions' },
    stubs: {
      python: `def minSessions(tasks: list, sessionTime: int) -> int:\n    pass`,
      javascript: `function minSessions(tasks, sessionTime) {\n\n}`,
      typescript: `function minSessions(tasks: number[], sessionTime: number): number {\n\n}`,
      kotlin: `fun minSessions(tasks: IntArray, sessionTime: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { tasks: [1,2,3], sessionTime: 3, expected: 2 },
        { tasks: [3,1,3,1,1], sessionTime: 8, expected: 2 }
      ];
      return { inputs: [base[i % base.length].tasks, base[i % base.length].sessionTime], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-number-of-flips-to-convert-binary-matrix-to-zero-matrix',
    functionName: { python: 'minFlips', javascript: 'minFlips', typescript: 'minFlips', kotlin: 'minFlips' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def minFlips(mat: list) -> int:\n    pass`,
      javascript: `function minFlips(mat) {\n\n}`,
      typescript: `function minFlips(mat: number[][]): number {\n\n}`,
      kotlin: `fun minFlips(mat: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { mat: [[0,0],[0,0]], expected: 0 },
        { mat: [[1,0,0],[1,0,0]], expected: -1 }
      ];
      return { inputs: [base[i % base.length].mat], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'number-of-valid-words-for-each-puzzle',
    functionName: { python: 'findNumOfValidWords', javascript: 'findNumOfValidWords', typescript: 'findNumOfValidWords', kotlin: 'findNumOfValidWords' },
    inputTypes: ['string_array', 'string_array'],
    stubs: {
      python: `def findNumOfValidWords(words: list, puzzles: list) -> list:\n    pass`,
      javascript: `function findNumOfValidWords(words, puzzles) {\n\n}`,
      typescript: `function findNumOfValidWords(words: string[], puzzles: string[]): number[] {\n\n}`,
      kotlin: `fun findNumOfValidWords(words: Array<String>, puzzles: Array<String>): List<Int> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        {
          words: ["aaaa","asas","able","ability","actt","actor","watercode"],
          puzzles: ["aboveyz","abrodyz","abslute","absoryz","actress","activeg"],
          expected: [1,1,3,2,4,0]
        }
      ];
      return { inputs: [base[i % base.length].words, base[i % base.length].puzzles], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'find-the-shortest-superstring',
    functionName: { python: 'shortestSuperstring', javascript: 'shortestSuperstring', typescript: 'shortestSuperstring', kotlin: 'shortestSuperstring' },
    inputTypes: ['string_array'],
    stubs: {
      python: `def shortestSuperstring(words: list) -> str:\n    pass`,
      javascript: `function shortestSuperstring(words) {\n\n}`,
      typescript: `function shortestSuperstring(words: string[]): string {\n\n}`,
      kotlin: `fun shortestSuperstring(words: Array<String>): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { words: ["alex","loves","leetcode"], expected: "alexlovesleetcode" },
        { words: ["catg","ctaagt","gcta","ttca","atgcatc"], expected: "gctaagtatgcatc" }
      ];
      return { inputs: [base[i % base.length].words], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'split-array-with-same-average',
    functionName: { python: 'splitArrayWithSameAverage', javascript: 'splitArrayWithSameAverage', typescript: 'splitArrayWithSameAverage', kotlin: 'splitArrayWithSameAverage' },
    stubs: {
      python: `def splitArrayWithSameAverage(nums: list) -> bool:\n    pass`,
      javascript: `function splitArrayWithSameAverage(nums) {\n\n}`,
      typescript: `function splitArrayWithSameAverage(nums: number[]): boolean {\n\n}`,
      kotlin: `fun splitArrayWithSameAverage(nums: IntArray): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,2,3,4,5,6,7,8], expected: true },
        { nums: [3,1], expected: false }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'the-number-of-good-subsets',
    functionName: { python: 'numberOfGoodSubsets', javascript: 'numberOfGoodSubsets', typescript: 'numberOfGoodSubsets', kotlin: 'numberOfGoodSubsets' },
    stubs: {
      python: `def numberOfGoodSubsets(nums: list) -> int:\n    pass`,
      javascript: `function numberOfGoodSubsets(nums) {\n\n}`,
      typescript: `function numberOfGoodSubsets(nums: number[]): number {\n\n}`,
      kotlin: `fun numberOfGoodSubsets(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,2,3,4], expected: 6 },
        { nums: [4,2,3,15], expected: 5 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'find-a-value-of-a-mysterious-function-closest-to-target',
    functionName: { python: 'closestToTarget', javascript: 'closestToTarget', typescript: 'closestToTarget', kotlin: 'closestToTarget' },
    stubs: {
      python: `def closestToTarget(arr: list, target: int) -> int:\n    pass`,
      javascript: `function closestToTarget(arr, target) {\n\n}`,
      typescript: `function closestToTarget(arr: number[], target: number): number {\n\n}`,
      kotlin: `fun closestToTarget(arr: IntArray, target: Int): Int {\n    return 1000000000\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { arr: [9,12,3,7,15], target: 5, expected: 2 },
        { arr: [1000000,1000000,1000000], target: 1, expected: 999999 }
      ];
      return { inputs: [base[i % base.length].arr, base[i % base.length].target], expected: base[i % base.length].expected };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 30 BIT_MANIPULATION problems...\n');

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
