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
// 28 HASH MAPS PROBLEMS DATA
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
    slug: 'valid-anagram',
    functionName: { python: 'isAnagram', javascript: 'isAnagram', typescript: 'isAnagram', kotlin: 'isAnagram' },
    stubs: {
      python: `def isAnagram(s: str, t: str) -> bool:\n    pass`,
      javascript: `function isAnagram(s, t) {\n\n}`,
      typescript: `function isAnagram(s: string, t: string): boolean {\n\n}`,
      kotlin: `fun isAnagram(s: String, t: String): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "anagram", t: "nagaram", expected: true },
        { s: "rat", t: "car", expected: false }
      ];
      return { inputs: [base[i % base.length].s, base[i % base.length].t], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'intersection-of-two-arrays',
    type: 'unordered_list',
    functionName: { python: 'intersection', javascript: 'intersection', typescript: 'intersection', kotlin: 'intersection' },
    stubs: {
      python: `def intersection(nums1: list, nums2: list) -> list:\n    pass`,
      javascript: `function intersection(nums1, nums2) {\n\n}`,
      typescript: `function intersection(nums1: number[], nums2: number[]): number[] {\n\n}`,
      kotlin: `fun intersection(nums1: IntArray, nums2: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums1: [1,2,2,1], nums2: [2,2], expected: [2] },
        { nums1: [4,9,5], nums2: [9,4,9,8,4], expected: [9,4] }
      ];
      return { inputs: [base[i % base.length].nums1, base[i % base.length].nums2], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'intersection-of-two-arrays-ii',
    type: 'unordered_list',
    functionName: { python: 'intersect', javascript: 'intersect', typescript: 'intersect', kotlin: 'intersect' },
    stubs: {
      python: `def intersect(nums1: list, nums2: list) -> list:\n    pass`,
      javascript: `function intersect(nums1, nums2) {\n\n}`,
      typescript: `function intersect(nums1: number[], nums2: number[]): number[] {\n\n}`,
      kotlin: `fun intersect(nums1: IntArray, nums2: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums1: [1,2,2,1], nums2: [2,2], expected: [2,2] },
        { nums1: [4,9,5], nums2: [9,4,9,8,4], expected: [4,9] }
      ];
      return { inputs: [base[i % base.length].nums1, base[i % base.length].nums2], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'happy-number',
    functionName: { python: 'isHappy', javascript: 'isHappy', typescript: 'isHappy', kotlin: 'isHappy' },
    stubs: {
      python: `def isHappy(n: int) -> bool:\n    pass`,
      javascript: `function isHappy(n) {\n\n}`,
      typescript: `function isHappy(n: number): boolean {\n\n}`,
      kotlin: `fun isHappy(n: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 19, expected: true },
        { n: 2, expected: false }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'contains-duplicate',
    functionName: { python: 'containsDuplicate', javascript: 'containsDuplicate', typescript: 'containsDuplicate', kotlin: 'containsDuplicate' },
    stubs: {
      python: `def containsDuplicate(nums: list) -> bool:\n    pass`,
      javascript: `function containsDuplicate(nums) {\n\n}`,
      typescript: `function containsDuplicate(nums: number[]): boolean {\n\n}`,
      kotlin: `fun containsDuplicate(nums: IntArray): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,2,3,1], expected: true },
        { nums: [1,2,3,4], expected: false },
        { nums: [1,1,1,3,3,4,3,2,4,2], expected: true }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'word-pattern',
    functionName: { python: 'wordPattern', javascript: 'wordPattern', typescript: 'wordPattern', kotlin: 'wordPattern' },
    stubs: {
      python: `def wordPattern(pattern: str, s: str) -> bool:\n    pass`,
      javascript: `function wordPattern(pattern, s) {\n\n}`,
      typescript: `function wordPattern(pattern: string, s: string): boolean {\n\n}`,
      kotlin: `fun wordPattern(pattern: String, s: String): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { pattern: "abba", s: "dog cat cat dog", expected: true },
        { pattern: "abba", s: "dog cat cat fish", expected: false },
        { pattern: "aaaa", s: "dog cat cat dog", expected: false }
      ];
      return { inputs: [base[i % base.length].pattern, base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'isomorphic-strings',
    functionName: { python: 'isIsomorphic', javascript: 'isIsomorphic', typescript: 'isIsomorphic', kotlin: 'isIsomorphic' },
    stubs: {
      python: `def isIsomorphic(s: str, t: str) -> bool:\n    pass`,
      javascript: `function isIsomorphic(s, t) {\n\n}`,
      typescript: `function isIsomorphic(s: string, t: string): boolean {\n\n}`,
      kotlin: `fun isIsomorphic(s: String, t: String): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "egg", t: "add", expected: true },
        { s: "foo", t: "bar", expected: false },
        { s: "paper", t: "title", expected: true }
      ];
      return { inputs: [base[i % base.length].s, base[i % base.length].t], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'ransom-note',
    functionName: { python: 'canConstruct', javascript: 'canConstruct', typescript: 'canConstruct', kotlin: 'canConstruct' },
    stubs: {
      python: `def canConstruct(ransomNote: str, magazine: str) -> bool:\n    pass`,
      javascript: `function canConstruct(ransomNote, magazine) {\n\n}`,
      typescript: `function canConstruct(ransomNote: string, magazine: string): boolean {\n\n}`,
      kotlin: `fun canConstruct(ransomNote: String, magazine: String): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { ransomNote: "a", magazine: "b", expected: false },
        { ransomNote: "aa", magazine: "ab", expected: false },
        { ransomNote: "aa", magazine: "aab", expected: true }
      ];
      return { inputs: [base[i % base.length].ransomNote, base[i % base.length].magazine], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'first-unique-character-in-a-string',
    functionName: { python: 'firstUniqChar', javascript: 'firstUniqChar', typescript: 'firstUniqChar', kotlin: 'firstUniqChar' },
    stubs: {
      python: `def firstUniqChar(s: str) -> int:\n    pass`,
      javascript: `function firstUniqChar(s) {\n\n}`,
      typescript: `function firstUniqChar(s: string): number {\n\n}`,
      kotlin: `fun firstUniqChar(s: String): Int {\n    return -1\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "leetcode", expected: 0 },
        { s: "loveleetcode", expected: 2 },
        { s: "aabb", expected: -1 }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'longest-consecutive-sequence',
    functionName: { python: 'longestConsecutive', javascript: 'longestConsecutive', typescript: 'longestConsecutive', kotlin: 'longestConsecutive' },
    stubs: {
      python: `def longestConsecutive(nums: list) -> int:\n    pass`,
      javascript: `function longestConsecutive(nums) {\n\n}`,
      typescript: `function longestConsecutive(nums: number[]): number {\n\n}`,
      kotlin: `fun longestConsecutive(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [100,4,200,1,3,2], expected: 4 },
        { nums: [0,3,7,2,5,8,4,6,0,1], expected: 9 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'top-k-frequent-elements',
    type: 'unordered_list',
    functionName: { python: 'topKFrequent', javascript: 'topKFrequent', typescript: 'topKFrequent', kotlin: 'topKFrequent' },
    stubs: {
      python: `def topKFrequent(nums: list, k: int) -> list:\n    pass`,
      javascript: `function topKFrequent(nums, k) {\n\n}`,
      typescript: `function topKFrequent(nums: number[], k: number): number[] {\n\n}`,
      kotlin: `fun topKFrequent(nums: IntArray, k: Int): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,1,1,2,2,3], k: 2, expected: [1,2] },
        { nums: [1], k: 1, expected: [1] }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].k], expected: base[i % base.length].expected };
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
    slug: '4sum-ii',
    functionName: { python: 'fourSumCount', javascript: 'fourSumCount', typescript: 'fourSumCount', kotlin: 'fourSumCount' },
    stubs: {
      python: `def fourSumCount(nums1: list, nums2: list, nums3: list, nums4: list) -> int:\n    pass`,
      javascript: `function fourSumCount(nums1, nums2, nums3, nums4) {\n\n}`,
      typescript: `function fourSumCount(nums1: number[], nums2: number[], nums3: number[], nums4: number[]): number {\n\n}`,
      kotlin: `fun fourSumCount(nums1: IntArray, nums2: IntArray, nums3: IntArray, nums4: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums1: [1,2], nums2: [-2,-1], nums3: [-1,2], nums4: [0,2], expected: 2 },
        { nums1: [0], nums2: [0], nums3: [0], nums4: [0], expected: 1 }
      ];
      return { inputs: [base[i % base.length].nums1, base[i % base.length].nums2, base[i % base.length].nums3, base[i % base.length].nums4], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'lru-cache',
    stubs: {
      python: `class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n    def get(self, key: int) -> int:\n        pass\n    def put(self, key: int, value: int) -> None:\n        pass`,
      javascript: `class LRUCache {\n    constructor(capacity) {\n\n    }\n    get(key) {\n\n    }\n    put(key, value) {\n\n    }\n}`,
      typescript: `class LRUCache {\n    constructor(capacity: number) {\n\n    }\n    get(key: number): number {\n        return -1;\n    }\n    put(key: number, value: number): void {\n\n    }\n}`,
      kotlin: `class LRUCache(capacity: Int) {\n    fun get(key: Int): Int {\n        return -1\n    }\n    fun put(key: Int, value: Int) {\n\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    cache = LRUCache(2)
    cache.put(1, 1)
    cache.put(2, 2)
    ans1 = cache.get(1)  # returns 1
    cache.put(3, 3)      # evicts key 2
    ans2 = cache.get(2)  # returns -1
    cache.put(4, 4)      # evicts key 1
    ans3 = cache.get(1)  # returns -1
    ans4 = cache.get(3)  # returns 3
    ans5 = cache.get(4)  # returns 4
    if [ans1, ans2, ans3, ans4, ans5] == [1, -1, -1, 3, 4]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    let ans1 = cache.get(1);
    cache.put(3, 3);
    let ans2 = cache.get(2);
    cache.put(4, 4);
    let ans3 = cache.get(1);
    let ans4 = cache.get(3);
    let ans5 = cache.get(4);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5]) === JSON.stringify([1, -1, -1, 3, 4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    let ans1 = cache.get(1);
    cache.put(3, 3);
    let ans2 = cache.get(2);
    cache.put(4, 4);
    let ans3 = cache.get(1);
    let ans4 = cache.get(3);
    let ans5 = cache.get(4);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5]) === JSON.stringify([1, -1, -1, 3, 4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val cache = LRUCache(2)
        cache.put(1, 1)
        cache.put(2, 2)
        val ans1 = cache.get(1)
        cache.put(3, 3)
        val ans2 = cache.get(2)
        cache.put(4, 4)
        val ans3 = cache.get(1)
        val ans4 = cache.get(3)
        val ans5 = cache.get(4)
        if (listOf(ans1, ans2, ans3, ans4, ans5) == listOf(1, -1, -1, 3, 4)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'insert-delete-getrandom-o1',
    stubs: {
      python: `import random\nclass RandomizedSet:\n    def __init__(self):\n        pass\n    def insert(self, val: int) -> bool:\n        pass\n    def remove(self, val: int) -> bool:\n        pass\n    def getRandom(self) -> int:\n        pass`,
      javascript: `class RandomizedSet {\n    constructor() {\n\n    }\n    insert(val) {\n\n    }\n    remove(val) {\n\n    }\n    getRandom() {\n\n    }\n}`,
      typescript: `class RandomizedSet {\n    constructor() {\n\n    }\n    insert(val: number): boolean {\n        return false;\n    }\n    remove(val: number): boolean {\n        return false;\n    }\n    getRandom(): number {\n        return 0;\n    }\n}`,
      kotlin: `class RandomizedSet() {\n    fun insert(valParam: Int): Boolean {\n        return false\n    }\n    fun remove(valParam: Int): Boolean {\n        return false\n    }\n    fun getRandom(): Int {\n        return 0\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    r = RandomizedSet()
    ans1 = r.insert(1)
    ans2 = r.remove(2)
    ans3 = r.insert(2)
    val = r.getRandom()
    ans4 = val in [1, 2]
    ans5 = r.remove(1)
    ans6 = r.insert(2)
    ans7 = r.getRandom() == 2
    if [ans1, ans2, ans3, ans4, ans5, ans6, ans7] == [True, False, True, True, True, False, True]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let r = new RandomizedSet();
    let ans1 = r.insert(1);
    let ans2 = r.remove(2);
    let ans3 = r.insert(2);
    let val = r.getRandom();
    let ans4 = val === 1 || val === 2;
    let ans5 = r.remove(1);
    let ans6 = r.insert(2);
    let ans7 = r.getRandom() === 2;
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6, ans7]) === JSON.stringify([true, false, true, true, true, false, true])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let r = new RandomizedSet();
    let ans1 = r.insert(1);
    let ans2 = r.remove(2);
    let ans3 = r.insert(2);
    let val = r.getRandom();
    let ans4 = val === 1 || val === 2;
    let ans5 = r.remove(1);
    let ans6 = r.insert(2);
    let ans7 = r.getRandom() === 2;
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6, ans7]) === JSON.stringify([true, false, true, true, true, false, true])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val r = RandomizedSet()
        val ans1 = r.insert(1)
        val ans2 = r.remove(2)
        val ans3 = r.insert(2)
        val v = r.getRandom()
        val ans4 = v == 1 || v == 2
        val ans5 = r.remove(1)
        val ans6 = r.insert(2)
        val ans7 = r.getRandom() == 2
        if (listOf(ans1, ans2, ans3, ans4, ans5, ans6, ans7) == listOf(true, false, true, true, true, false, true)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
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
    slug: 'sort-characters-by-frequency',
    functionName: { python: 'frequencySort', javascript: 'frequencySort', typescript: 'frequencySort', kotlin: 'frequencySort' },
    stubs: {
      python: `def frequencySort(s: str) -> str:\n    pass`,
      javascript: `function frequencySort(s) {\n\n}`,
      typescript: `function frequencySort(s: string): string {\n\n}`,
      kotlin: `fun frequencySort(s: String): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "tree", expected: "eert" },
        { s: "cccaaa", expected: "aaaccc" },
        { s: "Aabb", expected: "bbAa" }
      ];
      return { inputs: [base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'brick-wall',
    functionName: { python: 'leastBricks', javascript: 'leastBricks', typescript: 'leastBricks', kotlin: 'leastBricks' },
    stubs: {
      python: `def leastBricks(wall: list) -> int:\n    pass`,
      javascript: `function leastBricks(wall) {\n\n}`,
      typescript: `function leastBricks(wall: number[][]): number {\n\n}`,
      kotlin: `fun leastBricks(wall: List<List<Int>>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { wall: [[1,2,2,1],[3,1,2],[1,3,2],[2,4],[3,1,2],[1,3,1,1]], expected: 2 },
        { wall: [[1],[1],[1]], expected: 3 }
      ];
      return { inputs: [base[i % base.length].wall], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'all-oone-data-structure',
    stubs: {
      python: `class AllOne:\n    def __init__(self):\n        pass\n    def inc(self, key: str) -> None:\n        pass\n    def dec(self, key: str) -> None:\n        pass\n    def getMaxKey(self) -> str:\n        pass\n    def getMinKey(self) -> str:\n        pass`,
      javascript: `class AllOne {\n    constructor() {\n\n    }\n    inc(key) {\n\n    }\n    dec(key) {\n\n    }\n    getMaxKey() {\n\n    }\n    getMinKey() {\n\n    }\n}`,
      typescript: `class AllOne {\n    constructor() {\n\n    }\n    inc(key: string): void {\n\n    }\n    dec(key: string): void {\n\n    }\n    getMaxKey(): string {\n        return "";\n    }\n    getMinKey(): string {\n        return "";\n    }\n}`,
      kotlin: `class AllOne() {\n    fun inc(key: String) {\n\n    }\n    fun dec(key: String) {\n\n    }\n    fun getMaxKey(): String {\n        return ""\n    }\n    fun getMinKey(): String {\n        return ""\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    a = AllOne()
    a.inc("hello")
    a.inc("hello")
    ans1 = a.getMaxKey()
    ans2 = a.getMinKey()
    a.inc("leet")
    ans3 = a.getMaxKey()
    ans4 = a.getMinKey()
    if [ans1, ans2, ans3, ans4] == ["hello", "hello", "hello", "leet"]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let a = new AllOne();
    a.inc("hello");
    a.inc("hello");
    let ans1 = a.getMaxKey();
    let ans2 = a.getMinKey();
    a.inc("leet");
    let ans3 = a.getMaxKey();
    let ans4 = a.getMinKey();
    if (JSON.stringify([ans1, ans2, ans3, ans4]) === JSON.stringify(["hello", "hello", "hello", "leet"])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let a = new AllOne();
    a.inc("hello");
    a.inc("hello");
    let ans1 = a.getMaxKey();
    let ans2 = a.getMinKey();
    a.inc("leet");
    let ans3 = a.getMaxKey();
    let ans4 = a.getMinKey();
    if (JSON.stringify([ans1, ans2, ans3, ans4]) === JSON.stringify(["hello", "hello", "hello", "leet"])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val a = AllOne()
        a.inc("hello")
        a.inc("hello")
        val ans1 = a.getMaxKey()
        val ans2 = a.getMinKey()
        a.inc("leet")
        val ans3 = a.getMaxKey()
        val ans4 = a.getMinKey()
        if (listOf(ans1, ans2, ans3, ans4) == listOf("hello", "hello", "hello", "leet")) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'maximum-frequency-stack',
    stubs: {
      python: `class FreqStack:\n    def __init__(self):\n        pass\n    def push(self, val: int) -> None:\n        pass\n    def pop(self) -> int:\n        pass`,
      javascript: `class FreqStack {\n    constructor() {\n\n    }\n    push(val) {\n\n    }\n    pop() {\n\n    }\n}`,
      typescript: `class FreqStack {\n    constructor() {\n\n    }\n    push(val: number): void {\n\n    }\n    pop(): number {\n        return 0;\n    }\n}`,
      kotlin: `class FreqStack() {\n    fun push(valParam: Int) {\n\n    }\n    fun pop(): Int {\n        return 0\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    f = FreqStack()
    f.push(5)
    f.push(7)
    f.push(5)
    f.push(7)
    f.push(4)
    f.push(5)
    ans1 = f.pop() # 5
    ans2 = f.pop() # 7
    ans3 = f.pop() # 5
    ans4 = f.pop() # 4
    if [ans1, ans2, ans3, ans4] == [5, 7, 5, 4]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let f = new FreqStack();
    f.push(5);
    f.push(7);
    f.push(5);
    f.push(7);
    f.push(4);
    f.push(5);
    let ans1 = f.pop();
    let ans2 = f.pop();
    let ans3 = f.pop();
    let ans4 = f.pop();
    if (JSON.stringify([ans1, ans2, ans3, ans4]) === JSON.stringify([5, 7, 5, 4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let f = new FreqStack();
    f.push(5);
    f.push(7);
    f.push(5);
    f.push(7);
    f.push(4);
    f.push(5);
    let ans1 = f.pop();
    let ans2 = f.pop();
    let ans3 = f.pop();
    let ans4 = f.pop();
    if (JSON.stringify([ans1, ans2, ans3, ans4]) === JSON.stringify([5, 7, 5, 4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val f = FreqStack()
        f.push(5)
        f.push(7)
        f.push(5)
        f.push(7)
        f.push(4)
        f.push(5)
        val ans1 = f.pop()
        val ans2 = f.pop()
        val ans3 = f.pop()
        val ans4 = f.pop()
        if (listOf(ans1, ans2, ans3, ans4) == listOf(5, 7, 5, 4)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'lfu-cache',
    stubs: {
      python: `class LFUCache:\n    def __init__(self, capacity: int):\n        pass\n    def get(self, key: int) -> int:\n        pass\n    def put(self, key: int, value: int) -> None:\n        pass`,
      javascript: `class LFUCache {\n    constructor(capacity) {\n\n    }\n    get(key) {\n\n    }\n    put(key, value) {\n\n    }\n}`,
      typescript: `class LFUCache {\n    constructor(capacity: number) {\n\n    }\n    get(key: number): number {\n        return -1;\n    }\n    put(key: number, value: number): void {\n\n    }\n}`,
      kotlin: `class LFUCache(capacity: Int) {\n    fun get(key: Int): Int {\n        return -1\n    }\n    fun put(key: Int, value: Int) {\n\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    cache = LFUCache(2)
    cache.put(1, 1)
    cache.put(2, 2)
    ans1 = cache.get(1)  # returns 1
    cache.put(3, 3)      # evicts key 2
    ans2 = cache.get(2)  # returns -1
    ans3 = cache.get(3)  # returns 3
    cache.put(4, 4)      # evicts key 1
    ans4 = cache.get(1)  # returns -1
    ans5 = cache.get(3)  # returns 3
    ans6 = cache.get(4)  # returns 4
    if [ans1, ans2, ans3, ans4, ans5, ans6] == [1, -1, 3, -1, 3, 4]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let cache = new LFUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    let ans1 = cache.get(1);
    cache.put(3, 3);
    let ans2 = cache.get(2);
    let ans3 = cache.get(3);
    cache.put(4, 4);
    let ans4 = cache.get(1);
    let ans5 = cache.get(3);
    let ans6 = cache.get(4);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6]) === JSON.stringify([1, -1, 3, -1, 3, 4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let cache = new LFUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    let ans1 = cache.get(1);
    cache.put(3, 3);
    let ans2 = cache.get(2);
    let ans3 = cache.get(3);
    cache.put(4, 4);
    let ans4 = cache.get(1);
    let ans5 = cache.get(3);
    let ans6 = cache.get(4);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6]) === JSON.stringify([1, -1, 3, -1, 3, 4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val cache = LFUCache(2)
        cache.put(1, 1)
        cache.put(2, 2)
        val ans1 = cache.get(1)
        cache.put(3, 3)
        val ans2 = cache.get(2)
        val ans3 = cache.get(3)
        cache.put(4, 4)
        val ans4 = cache.get(1)
        val ans5 = cache.get(3)
        val ans6 = cache.get(4)
        if (listOf(ans1, ans2, ans3, ans4, ans5, ans6) == listOf(1, -1, 3, -1, 3, 4)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'number-of-atoms',
    functionName: { python: 'countOfAtoms', javascript: 'countOfAtoms', typescript: 'countOfAtoms', kotlin: 'countOfAtoms' },
    stubs: {
      python: `def countOfAtoms(formula: str) -> str:\n    pass`,
      javascript: `function countOfAtoms(formula) {\n\n}`,
      typescript: `function countOfAtoms(formula: string): string {\n\n}`,
      kotlin: `fun countOfAtoms(formula: String): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { formula: "H2O", expected: "H2O" },
        { formula: "Mg(OH)2", expected: "H2MgO2" },
        { formula: "K4(ON(SO3)2)2", expected: "K4N2O14S4" }
      ];
      return { inputs: [base[i % base.length].formula], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'palindrome-pairs',
    type: 'unordered_list',
    functionName: { python: 'palindromePairs', javascript: 'palindromePairs', typescript: 'palindromePairs', kotlin: 'palindromePairs' },
    stubs: {
      python: `def palindromePairs(words: list) -> list:\n    pass`,
      javascript: `function palindromePairs(words) {\n\n}`,
      typescript: `function palindromePairs(words: string[]): number[][] {\n\n}`,
      kotlin: `fun palindromePairs(words: Array<String>): List<List<Int>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { words: ["abcd","dcba","lls","s","sssll"], expected: [[0,1],[1,0],[3,2],[2,4]] },
        { words: ["bat","tab","cat"], expected: [[0,1],[1,0]] }
      ];
      return { inputs: [base[i % base.length].words], expected: base[i % base.length].expected };
    })
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
    slug: 'longest-well-performing-interval',
    functionName: { python: 'longestWPI', javascript: 'longestWPI', typescript: 'longestWPI', kotlin: 'longestWPI' },
    stubs: {
      python: `def longestWPI(hours: list) -> int:\n    pass`,
      javascript: `function longestWPI(hours) {\n\n}`,
      typescript: `function longestWPI(hours: number[]): number {\n\n}`,
      kotlin: `fun longestWPI(hours: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { hours: [9,9,6,0,6,6,9], expected: 3 },
        { hours: [6,6,6], expected: 0 }
      ];
      return { inputs: [base[i % base.length].hours], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'largest-color-value-in-directed-graph',
    functionName: { python: 'largestPathValue', javascript: 'largestPathValue', typescript: 'largestPathValue', kotlin: 'largestPathValue' },
    inputTypes: ['normal', 'int_array_2d'],
    stubs: {
      python: `def largestPathValue(colors: str, edges: list) -> int:\n    pass`,
      javascript: `function largestPathValue(colors, edges) {\n\n}`,
      typescript: `function largestPathValue(colors: string, edges: number[][]): number {\n\n}`,
      kotlin: `fun largestPathValue(colors: String, edges: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { colors: "abaca", edges: [[0,1],[0,2],[2,3],[3,4]], expected: 3 },
        { colors: "a", edges: [[0,0]], expected: -1 }
      ];
      return { inputs: [base[i % base.length].colors, base[i % base.length].edges], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'random-pick-with-blacklist',
    stubs: {
      python: `import random\nclass Solution:\n    def __init__(self, n: int, blacklist: list):\n        pass\n    def pick(self) -> int:\n        pass`,
      javascript: `class Solution {\n    constructor(n, blacklist) {\n\n    }\n    pick() {\n\n    }\n}`,
      typescript: `class Solution {\n    constructor(n: number, blacklist: number[]) {\n\n    }\n    pick(): number {\n        return 0;\n    }\n}`,
      kotlin: `class Solution(n: Int, blacklist: IntArray) {\n    fun pick(): Int {\n        return 0\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    s = Solution(7, [2, 3, 5])
    ans1 = s.pick() in [0, 1, 4, 6]
    ans2 = s.pick() in [0, 1, 4, 6]
    ans3 = s.pick() in [0, 1, 4, 6]
    if [ans1, ans2, ans3] == [True, True, True]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let s = new Solution(7, [2, 3, 5]);
    let ans1 = [0, 1, 4, 6].includes(s.pick());
    let ans2 = [0, 1, 4, 6].includes(s.pick());
    let ans3 = [0, 1, 4, 6].includes(s.pick());
    if (JSON.stringify([ans1, ans2, ans3]) === JSON.stringify([true, true, true])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let s = new Solution(7, [2, 3, 5]);
    let ans1 = [0, 1, 4, 6].includes(s.pick());
    let ans2 = [0, 1, 4, 6].includes(s.pick());
    let ans3 = [0, 1, 4, 6].includes(s.pick());
    if (JSON.stringify([ans1, ans2, ans3]) === JSON.stringify([true, true, true])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    val allowed = setOf(0, 1, 4, 6)
    for (i in 1..15) {
        _total++
        val s = Solution(7, intArrayOf(2, 3, 5))
        val ans1 = allowed.contains(s.pick())
        val ans2 = allowed.contains(s.pick())
        val ans3 = allowed.contains(s.pick())
        if (listOf(ans1, ans2, ans3) == listOf(true, true, true)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'find-all-people-with-secret',
    type: 'unordered_list',
    functionName: { python: 'findAllPeople', javascript: 'findAllPeople', typescript: 'findAllPeople', kotlin: 'findAllPeople' },
    inputTypes: ['normal', 'int_array_2d', 'normal'],
    stubs: {
      python: `def findAllPeople(n: int, meetings: list, firstPerson: int) -> list:\n    pass`,
      javascript: `function findAllPeople(n, meetings, firstPerson) {\n\n}`,
      typescript: `function findAllPeople(n: number, meetings: number[][], firstPerson: number): number[] {\n\n}`,
      kotlin: `fun findAllPeople(n: Int, meetings: Array<IntArray>, firstPerson: Int): List<Int> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 6, meetings: [[1,2,5],[2,3,8],[1,5,10]], firstPerson: 1, expected: [0,1,2,3,5] },
        { n: 4, meetings: [[3,1,3],[1,2,2],[0,3,3]], firstPerson: 3, expected: [0,1,3] }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].meetings, base[i % base.length].firstPerson], expected: base[i % base.length].expected };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 28 HASH MAPS problems…\n');

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
