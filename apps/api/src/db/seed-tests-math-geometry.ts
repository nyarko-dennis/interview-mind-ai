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
// 30 MATH_GEOMETRY PROBLEMS DATA
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
    slug: 'palindrome-number',
    functionName: { python: 'isPalindrome', javascript: 'isPalindrome', typescript: 'isPalindrome', kotlin: 'isPalindrome' },
    stubs: {
      python: `def isPalindrome(x: int) -> bool:\n    pass`,
      javascript: `function isPalindrome(x) {\n\n}`,
      typescript: `function isPalindrome(x: number): boolean {\n\n}`,
      kotlin: `fun isPalindrome(x: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { x: 121, expected: true },
        { x: -121, expected: false },
        { x: 10, expected: false }
      ];
      return { inputs: [base[i % base.length].x], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'roman-to-integer',
    functionName: { python: 'romanToInt', javascript: 'romanToInt', typescript: 'romanToInt', kotlin: 'romanToInt' },
    stubs: {
      python: `def romanToInt(s: str) -> int:\n    pass`,
      javascript: `function romanToInt(s) {\n\n}`,
      typescript: `function romanToInt(s: string): number {\n\n}`,
      kotlin: `fun romanToInt(s: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "III", expected: 3 },
        { s: "LVIII", expected: 58 },
        { s: "MCMXCIV", expected: 1994 }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'plus-one',
    functionName: { python: 'plusOne', javascript: 'plusOne', typescript: 'plusOne', kotlin: 'plusOne' },
    stubs: {
      python: `def plusOne(digits: list) -> list:\n    pass`,
      javascript: `function plusOne(digits) {\n\n}`,
      typescript: `function plusOne(digits: number[]): number[] {\n\n}`,
      kotlin: `fun plusOne(digits: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { digits: [1,2,3], expected: [1,2,4] },
        { digits: [4,3,2,1], expected: [4,3,2,2] },
        { digits: [9], expected: [1,0] }
      ];
      return { inputs: [base[i % base.length].digits], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'check-if-it-is-a-straight-line',
    functionName: { python: 'checkStraightLine', javascript: 'checkStraightLine', typescript: 'checkStraightLine', kotlin: 'checkStraightLine' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def checkStraightLine(coordinates: list) -> bool:\n    pass`,
      javascript: `function checkStraightLine(coordinates) {\n\n}`,
      typescript: `function checkStraightLine(coordinates: number[][]): boolean {\n\n}`,
      kotlin: `fun checkStraightLine(coordinates: Array<IntArray>): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { coordinates: [[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]], expected: true },
        { coordinates: [[1,1],[2,2],[3,4],[4,5],[5,6],[7,7]], expected: false }
      ];
      return { inputs: [base[i % base.length].coordinates], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'sign-of-the-product-of-an-array',
    functionName: { python: 'arraySign', javascript: 'arraySign', typescript: 'arraySign', kotlin: 'arraySign' },
    stubs: {
      python: `def arraySign(nums: list) -> int:\n    pass`,
      javascript: `function arraySign(nums) {\n\n}`,
      typescript: `function arraySign(nums: number[]): number {\n\n}`,
      kotlin: `fun arraySign(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [-1,-2,-3,-4,3,2,1], expected: 1 },
        { nums: [1,5,0,2,-3], expected: 0 },
        { nums: [-1,1,-1,1,-1], expected: -1 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'ugly-number',
    functionName: { python: 'isUgly', javascript: 'isUgly', typescript: 'isUgly', kotlin: 'isUgly' },
    stubs: {
      python: `def isUgly(n: int) -> bool:\n    pass`,
      javascript: `function isUgly(n) {\n\n}`,
      typescript: `function isUgly(n: number): boolean {\n\n}`,
      kotlin: `fun isUgly(n: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 6, expected: true },
        { n: 1, expected: true },
        { n: 14, expected: false }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'excel-sheet-column-number',
    functionName: { python: 'titleToNumber', javascript: 'titleToNumber', typescript: 'titleToNumber', kotlin: 'titleToNumber' },
    stubs: {
      python: `def titleToNumber(columnTitle: str) -> int:\n    pass`,
      javascript: `function titleToNumber(columnTitle) {\n\n}`,
      typescript: `function titleToNumber(columnTitle: string): number {\n\n}`,
      kotlin: `fun titleToNumber(columnTitle: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { columnTitle: "A", expected: 1 },
        { columnTitle: "AB", expected: 28 },
        { columnTitle: "ZY", expected: 701 }
      ];
      return { inputs: [base[i % base.length].columnTitle], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'add-binary',
    functionName: { python: 'addBinary', javascript: 'addBinary', typescript: 'addBinary', kotlin: 'addBinary' },
    stubs: {
      python: `def addBinary(a: str, b: str) -> str:\n    pass`,
      javascript: `function addBinary(a, b) {\n\n}`,
      typescript: `function addBinary(a: string, b: string): string {\n\n}`,
      kotlin: `fun addBinary(a: String, b: String): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { a: "11", b: "1", expected: "100" },
        { a: "1010", b: "1011", expected: "10101" }
      ];
      return { inputs: [base[i % base.length].a, base[i % base.length].b], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'count-odd-numbers-in-an-interval-range',
    functionName: { python: 'countOdds', javascript: 'countOdds', typescript: 'countOdds', kotlin: 'countOdds' },
    stubs: {
      python: `def countOdds(low: int, high: int) -> int:\n    pass`,
      javascript: `function countOdds(low, high) {\n\n}`,
      typescript: `function countOdds(low: number, high: number): number {\n\n}`,
      kotlin: `fun countOdds(low: Int, high: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { low: 3, high: 7, expected: 3 },
        { low: 8, high: 10, expected: 1 }
      ];
      return { inputs: [base[i % base.length].low, base[i % base.length].high], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'rotate-image',
    stubs: {
      python: `def rotate(matrix: list) -> None:\n    pass`,
      javascript: `function rotate(matrix) {\n\n}`,
      typescript: `function rotate(matrix: number[][]): void {\n\n}`,
      kotlin: `fun rotate(matrix: Array<IntArray>): Unit {\n\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    m = [[1,2,3],[4,5,6],[7,8,9]]
    rotate(m)
    if m == [[7,4,1],[8,5,2],[9,6,3]]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let m = [[1,2,3],[4,5,6],[7,8,9]];
    rotate(m);
    if (JSON.stringify(m) === JSON.stringify([[7,4,1],[8,5,2],[9,6,3]])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let m = [[1,2,3],[4,5,6],[7,8,9]];
    rotate(m);
    if (JSON.stringify(m) === JSON.stringify([[7,4,1],[8,5,2],[9,6,3]])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val m = arrayOf(intArrayOf(1,2,3), intArrayOf(4,5,6), intArrayOf(7,8,9))
        rotate(m)
        val expected = arrayOf(intArrayOf(7,4,1), intArrayOf(8,5,2), intArrayOf(9,6,3))
        if (m.contentDeepEquals(expected)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'spiral-matrix',
    functionName: { python: 'spiralOrder', javascript: 'spiralOrder', typescript: 'spiralOrder', kotlin: 'spiralOrder' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def spiralOrder(matrix: list) -> list:\n    pass`,
      javascript: `function spiralOrder(matrix) {\n\n}`,
      typescript: `function spiralOrder(matrix: number[][]): number[] {\n\n}`,
      kotlin: `fun spiralOrder(matrix: Array<IntArray>): List<Int> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { matrix: [[1,2,3],[4,5,6],[7,8,9]], expected: [1,2,3,6,9,8,7,4,5] },
        { matrix: [[1,2,3,4],[5,6,7,8],[9,10,11,12]], expected: [1,2,3,4,8,12,11,10,9,5,6,7] }
      ];
      return { inputs: [base[i % base.length].matrix], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'reverse-integer',
    functionName: { python: 'reverse', javascript: 'reverse', typescript: 'reverse', kotlin: 'reverse' },
    stubs: {
      python: `def reverse(x: int) -> int:\n    pass`,
      javascript: `function reverse(x) {\n\n}`,
      typescript: `function reverse(x: number): number {\n\n}`,
      kotlin: `fun reverse(x: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { x: 123, expected: 321 },
        { x: -123, expected: -321 },
        { x: 120, expected: 21 },
        { x: 1534236469, expected: 0 }
      ];
      return { inputs: [base[i % base.length].x], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'spiral-matrix-ii',
    functionName: { python: 'generateMatrix', javascript: 'generateMatrix', typescript: 'generateMatrix', kotlin: 'generateMatrix' },
    stubs: {
      python: `def generateMatrix(n: int) -> list:\n    pass`,
      javascript: `function generateMatrix(n) {\n\n}`,
      typescript: `function generateMatrix(n: number): number[][] {\n\n}`,
      kotlin: `fun generateMatrix(n: Int): Array<IntArray> {\n    return arrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 3, expected: [[1,2,3],[8,9,4],[7,6,5]] },
        { n: 1, expected: [[1]] }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'set-matrix-zeroes',
    stubs: {
      python: `def setZeroes(matrix: list) -> None:\n    pass`,
      javascript: `function setZeroes(matrix) {\n\n}`,
      typescript: `function setZeroes(matrix: number[][]): void {\n\n}`,
      kotlin: `fun setZeroes(matrix: Array<IntArray>): Unit {\n\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    m = [[1,1,1],[1,0,1],[1,1,1]]
    setZeroes(m)
    if m == [[1,0,1],[0,0,0],[1,0,1]]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let m = [[1,1,1],[1,0,1],[1,1,1]];
    setZeroes(m);
    if (JSON.stringify(m) === JSON.stringify([[1,0,1],[0,0,0],[1,0,1]])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let m = [[1,1,1],[1,0,1],[1,1,1]];
    setZeroes(m);
    if (JSON.stringify(m) === JSON.stringify([[1,0,1],[0,0,0],[1,0,1]])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val m = arrayOf(intArrayOf(1,1,1), intArrayOf(1,0,1), intArrayOf(1,1,1))
        setZeroes(m)
        val expected = arrayOf(intArrayOf(1,0,1), intArrayOf(0,0,0), intArrayOf(1,0,1))
        if (m.contentDeepEquals(expected)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'pow-x-n',
    functionName: { python: 'myPow', javascript: 'myPow', typescript: 'myPow', kotlin: 'myPow' },
    stubs: {
      python: `def myPow(x: float, n: int) -> float:\n    pass`,
      javascript: `function myPow(x, n) {\n\n}`,
      typescript: `function myPow(x: number, n: number): number {\n\n}`,
      kotlin: `fun myPow(x: Double, n: Int): Double {\n    return 0.0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { x: 2.0, n: 10, expected: 1024.0 },
        { x: 2.1, n: 3, expected: 9.261 },
        { x: 2.0, n: -2, expected: 0.25 }
      ];
      return { inputs: [base[i % base.length].x, base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'multiply-strings',
    functionName: { python: 'multiply', javascript: 'multiply', typescript: 'multiply', kotlin: 'multiply' },
    stubs: {
      python: `def multiply(num1: str, num2: str) -> str:\n    pass`,
      javascript: `function multiply(num1, num2) {\n\n}`,
      typescript: `function multiply(num1: string, num2: string): string {\n\n}`,
      kotlin: `fun multiply(num1: String, num2: String): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { num1: "2", num2: "3", expected: "6" },
        { num1: "123", num2: "456", expected: "56088" }
      ];
      return { inputs: [base[i % base.length].num1, base[i % base.length].num2], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'integer-to-roman',
    functionName: { python: 'intToRoman', javascript: 'intToRoman', typescript: 'intToRoman', kotlin: 'intToRoman' },
    stubs: {
      python: `def intToRoman(num: int) -> str:\n    pass`,
      javascript: `function intToRoman(num) {\n\n}`,
      typescript: `function intToRoman(num: number): string {\n\n}`,
      kotlin: `fun intToRoman(num: Int): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { num: 3, expected: "III" },
        { num: 58, expected: "LVIII" },
        { num: 1994, expected: "MCMXCIV" }
      ];
      return { inputs: [base[i % base.length].num], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'find-the-winner-of-the-circular-game',
    functionName: { python: 'findTheWinner', javascript: 'findTheWinner', typescript: 'findTheWinner', kotlin: 'findTheWinner' },
    stubs: {
      python: `def findTheWinner(n: int, k: int) -> int:\n    pass`,
      javascript: `function findTheWinner(n, k) {\n\n}`,
      typescript: `function findTheWinner(n: number, k: number): number {\n\n}`,
      kotlin: `fun findTheWinner(n: Int, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 5, k: 2, expected: 3 },
        { n: 6, k: 5, expected: 1 }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'valid-triangle-number',
    functionName: { python: 'triangleNumber', javascript: 'triangleNumber', typescript: 'triangleNumber', kotlin: 'triangleNumber' },
    stubs: {
      python: `def triangleNumber(nums: list) -> int:\n    pass`,
      javascript: `function triangleNumber(nums) {\n\n}`,
      typescript: `function triangleNumber(nums: number[]): number {\n\n}`,
      kotlin: `fun triangleNumber(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [2,2,3,4], expected: 3 },
        { nums: [4,2,3,4], expected: 4 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'detect-squares',
    stubs: {
      python: `class DetectSquares:\n    def __init__(self):\n        pass\n    def add(self, point: list) -> None:\n        pass\n    def count(self, point: list) -> int:\n        pass`,
      javascript: `class DetectSquares {\n  constructor() {}\n  add(point) {}\n  count(point) {}\n}`,
      typescript: `class DetectSquares {\n  constructor() {}\n  add(point: number[]): void {}\n  count(point: number[]): number {\n    return 0;\n  }\n}`,
      kotlin: `class DetectSquares() {\n    fun add(point: IntArray) {}\n    fun count(point: IntArray): Int {\n        return 0\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    ds = DetectSquares()
    ds.add([3, 10])
    ds.add([11, 2])
    ds.add([3, 2])
    r1 = ds.count([11, 10])
    r2 = ds.count([14, 8])
    ds.add([11, 2])
    r3 = ds.count([11, 10])
    if r1 == 1 and r2 == 0 and r3 == 2: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const ds = new DetectSquares();
    ds.add([3, 10]);
    ds.add([11, 2]);
    ds.add([3, 2]);
    let r1 = ds.count([11, 10]);
    let r2 = ds.count([14, 8]);
    ds.add([11, 2]);
    let r3 = ds.count([11, 10]);
    if (r1 === 1 && r2 === 0 && r3 === 2) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const ds = new DetectSquares();
    ds.add([3, 10]);
    ds.add([11, 2]);
    ds.add([3, 2]);
    let r1 = ds.count([11, 10]);
    let r2 = ds.count([14, 8]);
    ds.add([11, 2]);
    let r3 = ds.count([11, 10]);
    if (r1 === 1 && r2 === 0 && r3 === 2) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val ds = DetectSquares()
        ds.add(intArrayOf(3, 10))
        ds.add(intArrayOf(11, 2))
        ds.add(intArrayOf(3, 2))
        val r1 = ds.count(intArrayOf(11, 10))
        val r2 = ds.count(intArrayOf(14, 8))
        ds.add(intArrayOf(11, 2))
        val r3 = ds.count(intArrayOf(11, 10))
        if (r1 == 1 && r2 == 0 && r3 == 2) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'max-points-on-a-line',
    functionName: { python: 'maxPoints', javascript: 'maxPoints', typescript: 'maxPoints', kotlin: 'maxPoints' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def maxPoints(points: list) -> int:\n    pass`,
      javascript: `function maxPoints(points) {\n\n}`,
      typescript: `function maxPoints(points: number[][]): number {\n\n}`,
      kotlin: `fun maxPoints(points: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { points: [[1,1],[2,2],[3,3]], expected: 3 },
        { points: [[1,1],[3,2],[5,3],[4,1],[2,3],[1,4]], expected: 4 }
      ];
      return { inputs: [base[i % base.length].points], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'basic-calculator',
    functionName: { python: 'calculate', javascript: 'calculate', typescript: 'calculate', kotlin: 'calculate' },
    stubs: {
      python: `def calculate(s: str) -> int:\n    pass`,
      javascript: `function calculate(s) {\n\n}`,
      typescript: `function calculate(s: string): number {\n\n}`,
      kotlin: `fun calculate(s: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "1 + 1", expected: 2 },
        { s: " 2-1 + 2 ", expected: 3 },
        { s: "(1+(4+5+2)-3)+(6+8)", expected: 23 }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'erect-the-fence',
    functionName: { python: 'outerTrees', javascript: 'outerTrees', typescript: 'outerTrees', kotlin: 'outerTrees' },
    inputTypes: ['int_array_2d'],
    expectedType: 'int_array_2d',
    stubs: {
      python: `def outerTrees(trees: list) -> list:\n    pass`,
      javascript: `function outerTrees(trees) {\n\n}`,
      typescript: `function outerTrees(trees: number[][]): number[][] {\n\n}`,
      kotlin: `fun outerTrees(trees: Array<IntArray>): Array<IntArray> {\n    return arrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { trees: [[1,1],[2,2],[2,0],[2,4],[3,3],[4,2]], expected: [[1,1],[2,0],[3,3],[2,4],[4,2]] }
      ];
      return { inputs: [base[i % base.length].trees], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'self-crossing',
    functionName: { python: 'isSelfCrossing', javascript: 'isSelfCrossing', typescript: 'isSelfCrossing', kotlin: 'isSelfCrossing' },
    stubs: {
      python: `def isSelfCrossing(distance: list) -> bool:\n    pass`,
      javascript: `function isSelfCrossing(distance) {\n\n}`,
      typescript: `function isSelfCrossing(distance: number[]): boolean {\n\n}`,
      kotlin: `fun isSelfCrossing(distance: IntArray): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { distance: [2,1,1,2], expected: true },
        { distance: [1,2,3,4], expected: false },
        { distance: [1,1,1,1], expected: true }
      ];
      return { inputs: [base[i % base.length].distance], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'perfect-rectangle',
    functionName: { python: 'isRectangleCover', javascript: 'isRectangleCover', typescript: 'isRectangleCover', kotlin: 'isRectangleCover' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def isRectangleCover(rectangles: list) -> bool:\n    pass`,
      javascript: `function isRectangleCover(rectangles) {\n\n}`,
      typescript: `function isRectangleCover(rectangles: number[][]): boolean {\n\n}`,
      kotlin: `fun isRectangleCover(rectangles: Array<IntArray>): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { rectangles: [[1,1,3,3],[3,1,4,2],[3,2,4,4],[1,3,2,4],[2,3,3,4]], expected: true },
        { rectangles: [[1,1,2,3],[1,3,2,4],[3,1,4,2],[3,2,4,4]], expected: false }
      ];
      return { inputs: [base[i % base.length].rectangles], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'smallest-good-base',
    functionName: { python: 'smallestGoodBase', javascript: 'smallestGoodBase', typescript: 'smallestGoodBase', kotlin: 'smallestGoodBase' },
    stubs: {
      python: `def smallestGoodBase(n: str) -> str:\n    pass`,
      javascript: `function smallestGoodBase(n) {\n\n}`,
      typescript: `function smallestGoodBase(n: string): string {\n\n}`,
      kotlin: `fun smallestGoodBase(n: String): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: "13", expected: "3" },
        { n: "4681", expected: "8" },
        { n: "1000000000000000000", expected: "999999999999999999" }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'find-the-closest-palindrome',
    functionName: { python: 'nearestPalindromic', javascript: 'nearestPalindromic', typescript: 'nearestPalindromic', kotlin: 'nearestPalindromic' },
    stubs: {
      python: `def nearestPalindromic(n: str) -> str:\n    pass`,
      javascript: `function nearestPalindromic(n) {\n\n}`,
      typescript: `function nearestPalindromic(n: string): string {\n\n}`,
      kotlin: `fun nearestPalindromic(n: String): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: "123", expected: "121" },
        { n: "1", expected: "0" }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'consecutive-numbers-sum',
    functionName: { python: 'consecutiveNumbersSum', javascript: 'consecutiveNumbersSum', typescript: 'consecutiveNumbersSum', kotlin: 'consecutiveNumbersSum' },
    stubs: {
      python: `def consecutiveNumbersSum(n: int) -> int:\n    pass`,
      javascript: `function consecutiveNumbersSum(n) {\n\n}`,
      typescript: `function consecutiveNumbersSum(n: number): number {\n\n}`,
      kotlin: `fun consecutiveNumbersSum(n: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 5, expected: 2 },
        { n: 9, expected: 3 },
        { n: 15, expected: 4 }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'number-of-digit-one',
    functionName: { python: 'countDigitOne', javascript: 'countDigitOne', typescript: 'countDigitOne', kotlin: 'countDigitOne' },
    stubs: {
      python: `def countDigitOne(n: int) -> int:\n    pass`,
      javascript: `function countDigitOne(n) {\n\n}`,
      typescript: `function countDigitOne(n: number): number {\n\n}`,
      kotlin: `fun countDigitOne(n: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 13, expected: 6 },
        { n: 0, expected: 0 }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'equal-rational-numbers',
    functionName: { python: 'isRationalEqual', javascript: 'isRationalEqual', typescript: 'isRationalEqual', kotlin: 'isRationalEqual' },
    stubs: {
      python: `def isRationalEqual(s: str, t: str) -> bool:\n    pass`,
      javascript: `function isRationalEqual(s, t) {\n\n}`,
      typescript: `function isRationalEqual(s: string, t: string): boolean {\n\n}`,
      kotlin: `fun isRationalEqual(s: String, t: String): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "0.(9)", t: "1.", expected: true },
        { s: "0.191919...", t: "0.19191919...", expected: true },
        { s: "0.9(9)", t: "1.0", expected: true }
      ];
      return { inputs: [base[i % base.length].s, base[i % base.length].t], expected: base[i % base.length].expected };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 30 MATH_GEOMETRY problems...\n');

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
