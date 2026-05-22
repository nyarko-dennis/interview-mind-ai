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

const PY_LIST_DEFS = `
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
`;

const JS_LIST_DEFS = `
class ListNode {
    constructor(val, next) {
        this.val = (val===undefined ? 0 : val);
        this.next = (next===undefined ? null : next);
    }
}
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
`;

const TS_LIST_DEFS = `
class ListNode {
    val: number;
    next: ListNode | null;
    constructor(val?: number, next?: ListNode | null) {
        this.val = (val===undefined ? 0 : val);
        this.next = (next===undefined ? null : next);
    }
}
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
`;

const KT_LIST_DEFS = `
class ListNode(var \`val\`: Int) {
    var next: ListNode? = null
}
fun _make(arr: List<Int>): ListNode? {
    if (arr.isEmpty()) return null
    val head = ListNode(arr[0])
    var curr = head
    for (i in 1 until arr.size) {
        curr.next = ListNode(arr[i])
        curr = curr.next!!
    }
    return head
}
`;

// ---------------------------------------------------------------------------
// 30 MONOTONIC_STACK PROBLEMS DATA
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
    slug: 'next-greater-element-i',
    functionName: { python: 'nextGreaterElement', javascript: 'nextGreaterElement', typescript: 'nextGreaterElement', kotlin: 'nextGreaterElement' },
    stubs: {
      python: `def nextGreaterElement(nums1: list, nums2: list) -> list:\n    pass`,
      javascript: `function nextGreaterElement(nums1, nums2) {\n\n}`,
      typescript: `function nextGreaterElement(nums1: number[], nums2: number[]): number[] {\n\n}`,
      kotlin: `fun nextGreaterElement(nums1: IntArray, nums2: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums1: [4,1,2], nums2: [1,3,4,2], expected: [-1,3,-1] },
        { nums1: [2,4], nums2: [1,2,3,4], expected: [3,-1] }
      ];
      return { inputs: [base[i % base.length].nums1, base[i % base.length].nums2], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'final-prices-with-a-special-discount-in-a-shop',
    functionName: { python: 'finalPrices', javascript: 'finalPrices', typescript: 'finalPrices', kotlin: 'finalPrices' },
    stubs: {
      python: `def finalPrices(prices: list) -> list:\n    pass`,
      javascript: `function finalPrices(prices) {\n\n}`,
      typescript: `function finalPrices(prices: number[]): number[] {\n\n}`,
      kotlin: `fun finalPrices(prices: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { prices: [8,4,6,2,3], expected: [4,2,4,2,3] },
        { prices: [1,2,3,4,5], expected: [1,2,3,4,5] }
      ];
      return { inputs: [base[i % base.length].prices], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'replace-elements-with-greatest-element-on-right-side',
    functionName: { python: 'replaceElements', javascript: 'replaceElements', typescript: 'replaceElements', kotlin: 'replaceElements' },
    stubs: {
      python: `def replaceElements(arr: list) -> list:\n    pass`,
      javascript: `function replaceElements(arr) {\n\n}`,
      typescript: `function replaceElements(arr: number[]): number[] {\n\n}`,
      kotlin: `fun replaceElements(arr: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { arr: [17,18,5,4,6,1], expected: [18,6,6,6,1,-1] },
        { arr: [400], expected: [-1] }
      ];
      return { inputs: [base[i % base.length].arr], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'valid-parentheses',
    functionName: { python: 'isValid', javascript: 'isValid', typescript: 'isValid', kotlin: 'isValid' },
    stubs: {
      python: `def isValid(s: str) -> bool:\n    pass`,
      javascript: `function isValid(s) {\n\n}`,
      typescript: `function isValid(s: string): boolean {\n\n}`,
      kotlin: `fun isValid(s: String): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "()", expected: true },
        { s: "()[]{}", expected: true },
        { s: "(]", expected: false }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'remove-all-adjacent-duplicates-in-string',
    functionName: { python: 'removeDuplicates', javascript: 'removeDuplicates', typescript: 'removeDuplicates', kotlin: 'removeDuplicates' },
    stubs: {
      python: `def removeDuplicates(s: str) -> str:\n    pass`,
      javascript: `function removeDuplicates(s) {\n\n}`,
      typescript: `function removeDuplicates(s: string): string {\n\n}`,
      kotlin: `fun removeDuplicates(s: String): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "abbaca", expected: "ca" },
        { s: "azxxzy", expected: "ay" }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'backspace-string-compare',
    functionName: { python: 'backspaceCompare', javascript: 'backspaceCompare', typescript: 'backspaceCompare', kotlin: 'backspaceCompare' },
    stubs: {
      python: `def backspaceCompare(s: str, t: str) -> bool:\n    pass`,
      javascript: `function backspaceCompare(s, t) {\n\n}`,
      typescript: `function backspaceCompare(s: string, t: string): boolean {\n\n}`,
      kotlin: `fun backspaceCompare(s: String, t: String): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "ab#c", t: "ad#c", expected: true },
        { s: "ab##", t: "c#d#", expected: true },
        { s: "a#c", t: "b", expected: false }
      ];
      return { inputs: [base[i % base.length].s, base[i % base.length].t], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'baseball-game',
    functionName: { python: 'calPoints', javascript: 'calPoints', typescript: 'calPoints', kotlin: 'calPoints' },
    inputTypes: ['string_array'],
    stubs: {
      python: `def calPoints(operations: list) -> int:\n    pass`,
      javascript: `function calPoints(operations) {\n\n}`,
      typescript: `function calPoints(operations: string[]): number {\n\n}`,
      kotlin: `fun calPoints(operations: Array<String>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { operations: ["5","2","C","D","+"], expected: 30 },
        { operations: ["5","-2","4","C","D","9","+","+"], expected: 27 }
      ];
      return { inputs: [base[i % base.length].operations], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'make-the-string-great',
    functionName: { python: 'makeGood', javascript: 'makeGood', typescript: 'makeGood', kotlin: 'makeGood' },
    stubs: {
      python: `def makeGood(s: str) -> str:\n    pass`,
      javascript: `function makeGood(s) {\n\n}`,
      typescript: `function makeGood(s: string): string {\n\n}`,
      kotlin: `fun makeGood(s: String): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "leEeetcode", expected: "leetcode" },
        { s: "abBAcC", expected: "" }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-string-length-after-removing-substrings',
    functionName: { python: 'minLength', javascript: 'minLength', typescript: 'minLength', kotlin: 'minLength' },
    stubs: {
      python: `def minLength(s: str) -> int:\n    pass`,
      javascript: `function minLength(s) {\n\n}`,
      typescript: `function minLength(s: string): number {\n\n}`,
      kotlin: `fun minLength(s: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "ABFCACDB", expected: 2 },
        { s: "ACBBD", expected: 5 }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'remove-outermost-parentheses',
    functionName: { python: 'removeOuterParentheses', javascript: 'removeOuterParentheses', typescript: 'removeOuterParentheses', kotlin: 'removeOuterParentheses' },
    stubs: {
      python: `def removeOuterParentheses(s: str) -> str:\n    pass`,
      javascript: `function removeOuterParentheses(s) {\n\n}`,
      typescript: `function removeOuterParentheses(s: string): string {\n\n}`,
      kotlin: `fun removeOuterParentheses(s: String): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "(()())(())", expected: "()()()" },
        { s: "(()())(())(()(()))", expected: "()()()()(())" }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'daily-temperatures',
    functionName: { python: 'dailyTemperatures', javascript: 'dailyTemperatures', typescript: 'dailyTemperatures', kotlin: 'dailyTemperatures' },
    stubs: {
      python: `def dailyTemperatures(temperatures: list) -> list:\n    pass`,
      javascript: `function dailyTemperatures(temperatures) {\n\n}`,
      typescript: `function dailyTemperatures(temperatures: number[]): number[] {\n\n}`,
      kotlin: `fun dailyTemperatures(temperatures: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { temperatures: [73,74,75,71,69,72,76,73], expected: [1,1,4,2,1,1,0,0] },
        { temperatures: [30,40,50,60], expected: [1,1,1,0] }
      ];
      return { inputs: [base[i % base.length].temperatures], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'next-greater-element-ii',
    functionName: { python: 'nextGreaterElements', javascript: 'nextGreaterElements', typescript: 'nextGreaterElements', kotlin: 'nextGreaterElements' },
    stubs: {
      python: `def nextGreaterElements(nums: list) -> list:\n    pass`,
      javascript: `function nextGreaterElements(nums) {\n\n}`,
      typescript: `function nextGreaterElements(nums: number[]): number[] {\n\n}`,
      kotlin: `fun nextGreaterElements(nums: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,2,1], expected: [2,-1,2] },
        { nums: [1,2,3,4,3], expected: [2,3,4,-1,4] }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'online-stock-span',
    stubs: {
      python: `class StockSpanner:\n    def __init__(self):\n        pass\n    def next(self, price: int) -> int:\n        pass`,
      javascript: `class StockSpanner {\n    constructor() {\n\n    }\n    next(price) {\n\n    }\n}`,
      typescript: `class StockSpanner {\n    constructor() {\n\n    }\n    next(price: number): number {\n        return 0;\n    }\n}`,
      kotlin: `class StockSpanner() {\n    fun next(price: Int): Int {\n        return 0\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    sp = StockSpanner()
    ans1 = sp.next(100)
    ans2 = sp.next(80)
    ans3 = sp.next(60)
    ans4 = sp.next(70)
    ans5 = sp.next(60)
    ans6 = sp.next(75)
    ans7 = sp.next(85)
    if [ans1, ans2, ans3, ans4, ans5, ans6, ans7] == [1, 1, 1, 2, 1, 4, 6]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let sp = new StockSpanner();
    let ans1 = sp.next(100);
    let ans2 = sp.next(80);
    let ans3 = sp.next(60);
    let ans4 = sp.next(70);
    let ans5 = sp.next(60);
    let ans6 = sp.next(75);
    let ans7 = sp.next(85);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6, ans7]) === JSON.stringify([1, 1, 1, 2, 1, 4, 6])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let sp = new StockSpanner();
    let ans1 = sp.next(100);
    let ans2 = sp.next(80);
    let ans3 = sp.next(60);
    let ans4 = sp.next(70);
    let ans5 = sp.next(60);
    let ans6 = sp.next(75);
    let ans7 = sp.next(85);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6, ans7]) === JSON.stringify([1, 1, 1, 2, 1, 4, 6])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val sp = StockSpanner()
        val ans1 = sp.next(100)
        val ans2 = sp.next(80)
        val ans3 = sp.next(60)
        val ans4 = sp.next(70)
        val ans5 = sp.next(60)
        val ans6 = sp.next(75)
        val ans7 = sp.next(85)
        if (ans1 == 1 && ans2 == 1 && ans3 == 1 && ans4 == 2 && ans5 == 1 && ans6 == 4 && ans7 == 6) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'remove-duplicate-letters',
    functionName: { python: 'removeDuplicateLetters', javascript: 'removeDuplicateLetters', typescript: 'removeDuplicateLetters', kotlin: 'removeDuplicateLetters' },
    stubs: {
      python: `def removeDuplicateLetters(s: str) -> str:\n    pass`,
      javascript: `function removeDuplicateLetters(s) {\n\n}`,
      typescript: `function removeDuplicateLetters(s: string): string {\n\n}`,
      kotlin: `fun removeDuplicateLetters(s: String): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "bcabc", expected: "abc" },
        { s: "cbacdcbc", expected: "acdb" }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'remove-k-digits',
    functionName: { python: 'removeKdigits', javascript: 'removeKdigits', typescript: 'removeKdigits', kotlin: 'removeKdigits' },
    stubs: {
      python: `def removeKdigits(num: str, k: int) -> str:\n    pass`,
      javascript: `function removeKdigits(num, k) {\n\n}`,
      typescript: `function removeKdigits(num: string, k: number): string {\n\n}`,
      kotlin: `fun removeKdigits(num: String, k: Int): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { num: "1432219", k: 3, expected: "1219" },
        { num: "10200", k: 1, expected: "200" },
        { num: "10", k: 2, expected: "0" }
      ];
      return { inputs: [base[i % base.length].num, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: '132-pattern',
    functionName: { python: 'find132pattern', javascript: 'find132pattern', typescript: 'find132pattern', kotlin: 'find132pattern' },
    stubs: {
      python: `def find132pattern(nums: list) -> bool:\n    pass`,
      javascript: `function find132pattern(nums) {\n\n}`,
      typescript: `function find132pattern(nums: number[]): boolean {\n\n}`,
      kotlin: `fun find132pattern(nums: IntArray): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,2,3,4], expected: false },
        { nums: [3,1,4,2], expected: true },
        { nums: [-1,3,2,0], expected: true }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'find-the-most-competitive-subsequence',
    functionName: { python: 'mostCompetitive', javascript: 'mostCompetitive', typescript: 'mostCompetitive', kotlin: 'mostCompetitive' },
    stubs: {
      python: `def mostCompetitive(nums: list, k: int) -> list:\n    pass`,
      javascript: `function mostCompetitive(nums, k) {\n\n}`,
      typescript: `function mostCompetitive(nums: number[], k: number): number[] {\n\n}`,
      kotlin: `fun mostCompetitive(nums: IntArray, k: Int): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [3,5,2,6], k: 2, expected: [2,6] },
        { nums: [2,4,3,3,5,4,9,6], k: 4, expected: [2,3,3,4] }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'sum-of-subarray-minimums',
    functionName: { python: 'sumSubarrayMins', javascript: 'sumSubarrayMins', typescript: 'sumSubarrayMins', kotlin: 'sumSubarrayMins' },
    stubs: {
      python: `def sumSubarrayMins(arr: list) -> int:\n    pass`,
      javascript: `function sumSubarrayMins(arr) {\n\n}`,
      typescript: `function sumSubarrayMins(arr: number[]): number {\n\n}`,
      kotlin: `fun sumSubarrayMins(arr: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { arr: [3,1,2,4], expected: 17 },
        { arr: [11,81,94,43,3], expected: 444 }
      ];
      return { inputs: [base[i % base.length].arr], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'buildings-with-an-ocean-view',
    functionName: { python: 'findBuildings', javascript: 'findBuildings', typescript: 'findBuildings', kotlin: 'findBuildings' },
    stubs: {
      python: `def findBuildings(heights: list) -> list:\n    pass`,
      javascript: `function findBuildings(heights) {\n\n}`,
      typescript: `function findBuildings(heights: number[]): number[] {\n\n}`,
      kotlin: `fun findBuildings(heights: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { heights: [4,2,3,1], expected: [0,2,3] },
        { heights: [4,3,2,1], expected: [0,1,2,3] },
        { heights: [1,3,2,4], expected: [3] }
      ];
      return { inputs: [base[i % base.length].heights], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'next-greater-node-in-linked-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef nextLargerNodes(head: ListNode) -> list:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction nextLargerNodes(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction nextLargerNodes(head: ListNode | null): number[] {\n    return [];\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun nextLargerNodes(head: ListNode?): IntArray {\n    return intArrayOf()\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if list(nextLargerNodes(_make([2,1,5]))) == [5,5,0]: _pass += 1
    _total += 1
    if list(nextLargerNodes(_make([2,7,4,3,5]))) == [7,0,5,5,0]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(nextLargerNodes(_make([2,1,5]))) === JSON.stringify([5,5,0])) _pass++;
    if (JSON.stringify(nextLargerNodes(_make([2,7,4,3,5]))) === JSON.stringify([7,0,5,5,0])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(nextLargerNodes(_make([2,1,5]))) === JSON.stringify([5,5,0])) _pass++;
    if (JSON.stringify(nextLargerNodes(_make([2,7,4,3,5]))) === JSON.stringify([7,0,5,5,0])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (nextLargerNodes(_make(listOf(2,1,5))).contentEquals(intArrayOf(5,5,0))) _pass++
        if (nextLargerNodes(_make(listOf(2,7,4,3,5))).contentEquals(intArrayOf(7,0,5,5,0))) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'trapping-rain-water',
    functionName: { python: 'trap', javascript: 'trap', typescript: 'trap', kotlin: 'trap' },
    stubs: {
      python: `def trap(height: list) -> int:\n    pass`,
      javascript: `function trap(height) {\n\n}`,
      typescript: `function trap(height: number[]): number {\n\n}`,
      kotlin: `fun trap(height: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { height: [0,1,0,2,1,0,1,3,2,1,2,1], expected: 6 },
        { height: [4,2,0,3,2,5], expected: 9 }
      ];
      return { inputs: [base[i % base.length].height], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'largest-rectangle-in-histogram',
    functionName: { python: 'largestRectangleArea', javascript: 'largestRectangleArea', typescript: 'largestRectangleArea', kotlin: 'largestRectangleArea' },
    stubs: {
      python: `def largestRectangleArea(heights: list) -> int:\n    pass`,
      javascript: `function largestRectangleArea(heights) {\n\n}`,
      typescript: `function largestRectangleArea(heights: number[]): number {\n\n}`,
      kotlin: `fun largestRectangleArea(heights: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { heights: [2,1,5,6,2,3], expected: 10 },
        { heights: [2,4], expected: 4 }
      ];
      return { inputs: [base[i % base.length].heights], expected: base[i % base.length].expected };
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
        { matrix: [["0"]], expected: 0 },
        { matrix: [["1"]], expected: 1 }
      ];
      return { inputs: [base[i % base.length].matrix], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'sliding-window-maximum',
    functionName: { python: 'maxSlidingWindow', javascript: 'maxSlidingWindow', typescript: 'maxSlidingWindow', kotlin: 'maxSlidingWindow' },
    stubs: {
      python: `def maxSlidingWindow(nums: list, k: int) -> list:\n    pass`,
      javascript: `function maxSlidingWindow(nums, k) {\n\n}`,
      typescript: `function maxSlidingWindow(nums: number[], k: number): number[] {\n\n}`,
      kotlin: `fun maxSlidingWindow(nums: IntArray, k: Int): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,3,-1,-3,5,3,6,7], k: 3, expected: [3,3,5,5,6,7] },
        { nums: [1], k: 1, expected: [1] }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'number-of-visible-people-in-a-queue',
    functionName: { python: 'canSeePersonsCount', javascript: 'canSeePersonsCount', typescript: 'canSeePersonsCount', kotlin: 'canSeePersonsCount' },
    stubs: {
      python: `def canSeePersonsCount(heights: list) -> list:\n    pass`,
      javascript: `function canSeePersonsCount(heights) {\n\n}`,
      typescript: `function canSeePersonsCount(heights: number[]): number[] {\n\n}`,
      kotlin: `fun canSeePersonsCount(heights: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { heights: [10,6,8,5,11,9], expected: [3,1,2,1,1,0] },
        { heights: [5,1,2,3,10], expected: [4,1,1,1,0] }
      ];
      return { inputs: [base[i % base.length].heights], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'sum-of-total-strength-of-wizards',
    functionName: { python: 'totalStrength', javascript: 'totalStrength', typescript: 'totalStrength', kotlin: 'totalStrength' },
    stubs: {
      python: `def totalStrength(strength: list) -> int:\n    pass`,
      javascript: `function totalStrength(strength) {\n\n}`,
      typescript: `function totalStrength(strength: number[]): number {\n\n}`,
      kotlin: `fun totalStrength(strength: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { strength: [1,3,1,2], expected: 44 },
        { strength: [5,4,6], expected: 213 }
      ];
      return { inputs: [base[i % base.length].strength], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'car-fleet-ii',
    functionName: { python: 'getCollisionTimes', javascript: 'getCollisionTimes', typescript: 'getCollisionTimes', kotlin: 'getCollisionTimes' },
    inputTypes: ['int_array_2d'],
    expectedType: 'double_array',
    stubs: {
      python: `def getCollisionTimes(cars: list) -> list:\n    pass`,
      javascript: `function getCollisionTimes(cars) {\n\n}`,
      typescript: `function getCollisionTimes(cars: number[][]): number[] {\n\n}`,
      kotlin: `fun getCollisionTimes(cars: Array<IntArray>): DoubleArray {\n    return doubleArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { cars: [[1,2],[2,1],[4,3],[7,2]], expected: [1.00000,-1.00000,3.00000,-1.00000] },
        { cars: [[3,4],[5,4],[6,3],[9,1]], expected: [2.00000,1.00000,1.50000,-1.00000] }
      ];
      return { inputs: [base[i % base.length].cars], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'max-chunks-to-make-sorted-ii',
    functionName: { python: 'maxChunksToSorted', javascript: 'maxChunksToSorted', typescript: 'maxChunksToSorted', kotlin: 'maxChunksToSorted' },
    stubs: {
      python: `def maxChunksToSorted(arr: list) -> int:\n    pass`,
      javascript: `function maxChunksToSorted(arr) {\n\n}`,
      typescript: `function maxChunksToSorted(arr: number[]): number {\n\n}`,
      kotlin: `fun maxChunksToSorted(arr: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { arr: [5,4,3,2,1], expected: 1 },
        { arr: [2,1,3,4,4], expected: 4 }
      ];
      return { inputs: [base[i % base.length].arr], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximum-sum-queries',
    functionName: { python: 'maximumSumQueries', javascript: 'maximumSumQueries', typescript: 'maximumSumQueries', kotlin: 'maximumSumQueries' },
    inputTypes: ['normal', 'normal', 'int_array_2d'],
    stubs: {
      python: `def maximumSumQueries(nums1: list, nums2: list, queries: list) -> list:\n    pass`,
      javascript: `function maximumSumQueries(nums1, nums2, queries) {\n\n}`,
      typescript: `function maximumSumQueries(nums1: number[], nums2: number[], queries: number[][]): number[] {\n\n}`,
      kotlin: `fun maximumSumQueries(nums1: IntArray, nums2: IntArray, queries: Array<IntArray>): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums1: [4,3,1,2], nums2: [2,4,9,5], queries: [[4,1],[1,3],[2,5]], expected: [6,10,7] },
        { nums1: [3,2,5], nums2: [4,1,1], queries: [[2,5],[3,2]], expected: [-1,5] }
      ];
      return { inputs: [base[i % base.length].nums1, base[i % base.length].nums2, base[i % base.length].queries], expected: base[i % base.length].expected };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 30 MONOTONIC_STACK problems…\n');

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
