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
      if (type === 'double_array') {
        return `doubleArrayOf(${val.join(',')})`;
      }
      return `intArrayOf(${val.join(',')})`;
    }
  }
  return JSON.stringify(val);
}

function buildPythonRunner(funcName: string, type: string, testCases: any[]): string {
  let code = `_pass = _total = 0\n`;
  if (type === 'unordered_list') {
    code += `def _t_unordered_list(result, expected, label=""):
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
    if (type === 'unordered_list') {
      code += `_t_unordered_list(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'python')}, ${JSON.stringify(label)})\n`;
    } else {
      code += `_t(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'python')}, ${JSON.stringify(label)})\n`;
    }
  });

  code += `print(f"{_pass}/{_total} tests passed")`;
  return code;
}

function buildJSRunner(funcName: string, type: string, testCases: any[]): string {
  let code = `let _pass = 0, _total = 0;\n`;
  if (type === 'unordered_list') {
    code += `function _t_unordered_list(r, e) {
  _total++;
  if (JSON.stringify([...(r || [])].sort()) === JSON.stringify([...(e || [])].sort())) _pass++;
}\n\n`;
  } else {
    code += `function _t(r, e) { _total++; if (JSON.stringify(r) === JSON.stringify(e)) _pass++; }\n\n`;
  }

  testCases.forEach((tc, idx) => {
    const argsStr = tc.inputs.map(x => serializeVal(x, 'javascript')).join(', ');
    if (type === 'unordered_list') {
      code += `_t_unordered_list(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'javascript')});\n`;
    } else {
      code += `_t(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'javascript')});\n`;
    }
  });

  code += `console.log(\`\${_pass}/\${_total} tests passed\`);`;
  return code;
}

function buildTSRunner(funcName: string, type: string, testCases: any[]): string {
  let code = `let _pass = 0, _total = 0;\n`;
  if (type === 'unordered_list') {
    code += `function _t_unordered_list(r: any, e: any): void {
  _total++;
  if (JSON.stringify([...(r || [])].sort()) === JSON.stringify([...(e || [])].sort())) _pass++;
}\n\n`;
  } else {
    code += `function _t(r: any, e: any): void { _total++; if (JSON.stringify(r) === JSON.stringify(e)) _pass++; }\n\n`;
  }

  testCases.forEach((tc, idx) => {
    const argsStr = tc.inputs.map(x => serializeVal(x, 'typescript')).join(', ');
    if (type === 'unordered_list') {
      code += `_t_unordered_list(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'typescript')});\n`;
    } else {
      code += `_t(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'typescript')});\n`;
    }
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
        r is CharArray && e is CharArray -> r.contentEquals(e)
        r is Array<*> && e is Array<*> -> r.contentDeepEquals(e)
        r is List<*> && e is List<*> -> r == e
        else -> r == e
    }
    if (match) _pass++
}\n`;

  if (type === 'unordered_list') {
    code += `fun _t_unordered_list(r: List<Any?>?, e: List<Any?>?) {
    _total++
    if (r != null && e != null && r.map { it.toString() }.sorted() == e.map { it.toString() }.sorted()) _pass++
}\n`;
  }

  testCases.forEach((tc, idx) => {
    const argsStr = tc.inputs.map((x, i) => serializeVal(x, 'kotlin', inputTypes ? inputTypes[i] : undefined)).join(', ');
    const expStr = serializeVal(tc.expected, 'kotlin', expectedType);
    if (type === 'unordered_list') {
      code += `_t_unordered_list(${funcName}(${argsStr}), ${expStr})\n`;
    } else {
      code += `_t(${funcName}(${argsStr}), ${expStr})\n`;
    }
  });

  code += `println("\$_pass/\$_total tests passed")\n}`;
  return code;
}

// ---------------------------------------------------------------------------
// 30 SLIDING WINDOW PROBLEMS DEFINITIONS
// ---------------------------------------------------------------------------

const PROBLEMS_DATA: Array<{
  slug: string;
  type: string;
  functionName: Record<string, string>;
  inputTypes?: string[];
  expectedType?: string;
  stubs: Record<string, string>;
  testCases: any[];
}> = [
  {
    slug: 'longest-substring-without-repeating-characters',
    type: 'normal',
    functionName: { python: 'lengthOfLongestSubstring', javascript: 'lengthOfLongestSubstring', typescript: 'lengthOfLongestSubstring', kotlin: 'lengthOfLongestSubstring' },
    stubs: {
      python: `def lengthOfLongestSubstring(s: str) -> int:\n    pass`,
      javascript: `function lengthOfLongestSubstring(s) {\n\n}`,
      typescript: `function lengthOfLongestSubstring(s: string): number {\n\n}`,
      kotlin: `fun lengthOfLongestSubstring(s: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "abcabcbb", expected: 3 },
        { s: "bbbbb", expected: 1 },
        { s: "pwwkew", expected: 3 },
        { s: "", expected: 0 },
        { s: " ", expected: 1 },
        { s: "au", expected: 2 },
        { s: "dvdf", expected: 3 },
        { s: "abba", expected: 2 }
      ];
      const tc = base[i % base.length];
      const suffix = Math.floor(i / base.length).toString();
      const s = tc.s + (tc.s ? suffix : "");
      // recalculate max len
      let maxLen = 0, left = 0;
      const seen = new Set<string>();
      for (let right = 0; right < s.length; right++) {
        while (seen.has(s[right])) {
          seen.delete(s[left]);
          left++;
        }
        seen.add(s[right]);
        maxLen = Math.max(maxLen, right - left + 1);
      }
      return { inputs: [s], expected: maxLen, label: `test_${i}` };
    })
  },
  {
    slug: 'maximum-average-subarray-i',
    type: 'normal',
    functionName: { python: 'findMaxAverage', javascript: 'findMaxAverage', typescript: 'findMaxAverage', kotlin: 'findMaxAverage' },
    stubs: {
      python: `def findMaxAverage(nums: list, k: int) -> float:\n    pass`,
      javascript: `function findMaxAverage(nums, k) {\n\n}`,
      typescript: `function findMaxAverage(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun findMaxAverage(nums: IntArray, k: Int): Double {\n    return 0.0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,12,-5,-6,50,3], k: 4, expected: 12.75 },
        { nums: [5], k: 1, expected: 5.0 },
        { nums: [0,4,0,3,2], k: 1, expected: 4.0 },
        { nums: [4,0,4,3,3], k: 5, expected: 2.8 },
        { nums: [-1], k: 1, expected: -1.0 }
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 2;
      const nums = tc.nums.map(x => x + offset);
      const k = tc.k;
      // calculate max avg
      let sum = 0;
      for (let j = 0; j < k; j++) sum += nums[j];
      let maxSum = sum;
      for (let j = k; j < nums.length; j++) {
        sum += nums[j] - nums[j - k];
        maxSum = Math.max(maxSum, sum);
      }
      return { inputs: [nums, k], expected: maxSum / k, label: `test_${i}` };
    })
  },
  {
    slug: 'contains-duplicate-ii',
    type: 'normal',
    functionName: { python: 'containsNearbyDuplicate', javascript: 'containsNearbyDuplicate', typescript: 'containsNearbyDuplicate', kotlin: 'containsNearbyDuplicate' },
    stubs: {
      python: `def containsNearbyDuplicate(nums: list, k: int) -> bool:\n    pass`,
      javascript: `function containsNearbyDuplicate(nums, k) {\n\n}`,
      typescript: `function containsNearbyDuplicate(nums: number[], k: number): boolean {\n\n}`,
      kotlin: `fun containsNearbyDuplicate(nums: IntArray, k: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,2,3,1], k: 3, expected: true },
        { nums: [1,0,1,1], k: 1, expected: true },
        { nums: [1,2,3,1,2,3], k: 2, expected: false },
        { nums: [99,99], k: 2, expected: true },
        { nums: [1,2,3,4,5,6], k: 4, expected: false }
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 10;
      const nums = tc.nums.map(x => x + offset);
      const k = tc.k;
      // verify contains nearby duplicate
      let expected = false;
      const seen = new Map<number, number>();
      for (let j = 0; j < nums.length; j++) {
        if (seen.has(nums[j]) && j - seen.get(nums[j])! <= k) {
          expected = true;
          break;
        }
        seen.set(nums[j], j);
      }
      return { inputs: [nums, k], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'maximum-number-of-vowels-in-substring',
    type: 'normal',
    functionName: { python: 'maxVowels', javascript: 'maxVowels', typescript: 'maxVowels', kotlin: 'maxVowels' },
    stubs: {
      python: `def maxVowels(s: str, k: int) -> int:\n    pass`,
      javascript: `function maxVowels(s, k) {\n\n}`,
      typescript: `function maxVowels(s: string, k: number): number {\n\n}`,
      kotlin: `fun maxVowels(s: String, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "abciiidef", k: 3, expected: 3 },
        { s: "aeiou", k: 2, expected: 2 },
        { s: "leetcode", k: 3, expected: 2 },
        { s: "rhythms", k: 4, expected: 0 },
        { s: "trytoguessvowels", k: 5, expected: 3 }
      ];
      const tc = base[i % base.length];
      const suffix = "aeiou".charAt(i % 5);
      const s = tc.s + suffix;
      const k = tc.k;
      const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
      let maxV = 0, curV = 0;
      for (let j = 0; j < k; j++) {
        if (vowels.has(s[j])) curV++;
      }
      maxV = curV;
      for (let j = k; j < s.length; j++) {
        if (vowels.has(s[j])) curV++;
        if (vowels.has(s[j - k])) curV--;
        maxV = Math.max(maxV, curV);
      }
      return { inputs: [s, k], expected: maxV, label: `test_${i}` };
    })
  },
  {
    slug: 'minimum-recolors-to-get-k-consecutive-black-blocks',
    type: 'normal',
    functionName: { python: 'minimumRecolors', javascript: 'minimumRecolors', typescript: 'minimumRecolors', kotlin: 'minimumRecolors' },
    stubs: {
      python: `def minimumRecolors(blocks: str, k: int) -> int:\n    pass`,
      javascript: `function minimumRecolors(blocks, k) {\n\n}`,
      typescript: `function minimumRecolors(blocks: string, k: number): number {\n\n}`,
      kotlin: `fun minimumRecolors(blocks: String, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { blocks: "WBBWWBBWBW", k: 7, expected: 3 },
        { blocks: "WBWBBBW", k: 2, expected: 0 },
        { blocks: "BWWWBB", k: 3, expected: 1 },
        { blocks: "WWWWWW", k: 4, expected: 4 },
        { blocks: "BBBBBB", k: 4, expected: 0 }
      ];
      const tc = base[i % base.length];
      const prefix = i % 2 === 0 ? "W" : "B";
      const blocks = prefix + tc.blocks;
      const k = tc.k;
      let minW = k, curW = 0;
      for (let j = 0; j < k; j++) {
        if (blocks[j] === 'W') curW++;
      }
      minW = curW;
      for (let j = k; j < blocks.length; j++) {
        if (blocks[j] === 'W') curW++;
        if (blocks[j - k] === 'W') curW--;
        minW = Math.min(minW, curW);
      }
      return { inputs: [blocks, k], expected: minW, label: `test_${i}` };
    })
  },
  {
    slug: 'subarrays-size-k-average-threshold',
    type: 'normal',
    functionName: { python: 'numOfSubarrays', javascript: 'numOfSubarrays', typescript: 'numOfSubarrays', kotlin: 'numOfSubarrays' },
    stubs: {
      python: `def numOfSubarrays(arr: list, k: int, threshold: int) -> int:\n    pass`,
      javascript: `function numOfSubarrays(arr, k, threshold) {\n\n}`,
      typescript: `function numOfSubarrays(arr: number[], k: number, threshold: number): number {\n\n}`,
      kotlin: `fun numOfSubarrays(arr: IntArray, k: Int, threshold: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { arr: [2,2,2,2,5,5,5,8], k: 3, threshold: 4, expected: 3 },
        { arr: [11,13,17,23,29,31,7,5,2,3], k: 3, threshold: 5, expected: 6 },
        { arr: [7,7,7,7,7], k: 1, threshold: 7, expected: 5 },
        { arr: [4,4,4,4], k: 4, threshold: 5, expected: 0 },
        { arr: [1,2,3,4,5,6,7], k: 2, threshold: 3, expected: 4 }
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length);
      const arr = tc.arr.map(x => x + offset);
      const k = tc.k;
      const threshold = tc.threshold + offset;
      const targetSum = k * threshold;
      let count = 0, curSum = 0;
      for (let j = 0; j < k; j++) curSum += arr[j];
      if (curSum >= targetSum) count++;
      for (let j = k; j < arr.length; j++) {
        curSum += arr[j] - arr[j - k];
        if (curSum >= targetSum) count++;
      }
      return { inputs: [arr, k, threshold], expected: count, label: `test_${i}` };
    })
  },
  {
    slug: 'find-all-anagrams-in-a-string',
    type: 'unordered_list',
    functionName: { python: 'findAnagrams', javascript: 'findAnagrams', typescript: 'findAnagrams', kotlin: 'findAnagrams' },
    stubs: {
      python: `def findAnagrams(s: str, p: str) -> list:\n    pass`,
      javascript: `function findAnagrams(s, p) {\n\n}`,
      typescript: `function findAnagrams(s: string, p: string): number[] {\n\n}`,
      kotlin: `fun findAnagrams(s: String, p: String): List<Int> {\n    return emptyList()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "cbaebabacd", p: "abc", expected: [0, 6] },
        { s: "abab", p: "ab", expected: [0, 1, 2] },
        { s: "aa", p: "a", expected: [0, 1] },
        { s: "aaaa", p: "aa", expected: [0, 1, 2] },
        { s: "a", p: "b", expected: [] }
      ];
      const tc = base[i % base.length];
      const suffix = i % 2 === 0 ? "a" : "b";
      const s = tc.s + suffix;
      const p = tc.p;
      // calculate correct expected indices
      const expected: number[] = [];
      const pf = new Array(26).fill(0);
      for (const char of p) pf[char.charCodeAt(0) - 97]++;
      const sf = new Array(26).fill(0);
      const k = p.length;
      for (let j = 0; j < s.length; j++) {
        sf[s.charCodeAt(j) - 97]++;
        if (j >= k) {
          sf[s.charCodeAt(j - k) - 97]--;
        }
        if (j >= k - 1) {
          if (sf.every((x, idx) => x === pf[idx])) {
            expected.push(j - k + 1);
          }
        }
      }
      return { inputs: [s, p], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'maximum-points-you-can-obtain-from-cards',
    type: 'normal',
    functionName: { python: 'max_score', javascript: 'maxScore', typescript: 'maxScore', kotlin: 'maxScore' },
    stubs: {
      python: `def max_score(cardPoints: list, k: int) -> int:\n    pass`,
      javascript: `function maxScore(cardPoints, k) {\n\n}`,
      typescript: `function maxScore(cardPoints: number[], k: number): number {\n\n}`,
      kotlin: `fun maxScore(cardPoints: IntArray, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { cardPoints: [1,2,3,4,5,6,1], k: 3, expected: 12 },
        { cardPoints: [2,2,2], k: 2, expected: 4 },
        { cardPoints: [9,7,7,9,7,7,9], k: 7, expected: 55 },
        { cardPoints: [1,1000,1], k: 1, expected: 1 },
        { cardPoints: [1,79,80,1,1,1,200,1], k: 3, expected: 202 }
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length);
      const cardPoints = tc.cardPoints.map(x => x + offset);
      const k = tc.k;
      const n = cardPoints.length;
      let cur = 0;
      for (let j = 0; j < k; j++) cur += cardPoints[j];
      let maxS = cur;
      for (let j = 0; j < k; j++) {
        cur += cardPoints[n - 1 - j] - cardPoints[k - 1 - j];
        maxS = Math.max(maxS, cur);
      }
      return { inputs: [cardPoints, k], expected: maxS, label: `test_${i}` };
    })
  },
  {
    slug: 'minimum-difference-k-scores',
    type: 'normal',
    functionName: { python: 'minimumDifference', javascript: 'minimumDifference', typescript: 'minimumDifference', kotlin: 'minimumDifference' },
    stubs: {
      python: `def minimumDifference(nums: list, k: int) -> int:\n    pass`,
      javascript: `function minimumDifference(nums, k) {\n\n}`,
      typescript: `function minimumDifference(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun minimumDifference(nums: IntArray, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [90], k: 1, expected: 0 },
        { nums: [9,4,1,7], k: 2, expected: 2 },
        { nums: [1,3,10,12,15], k: 3, expected: 7 },
        { nums: [4,5,6,7,8], k: 5, expected: 4 },
        { nums: [100,10,20,30,40], k: 2, expected: 10 }
      ];
      const tc = base[i % base.length];
      const multiplier = Math.floor(i / base.length) + 1;
      const nums = tc.nums.map(x => x * multiplier);
      const k = tc.k;
      const sorted = [...nums].sort((a,b)=>a-b);
      let minD = Infinity;
      for (let j = k - 1; j < sorted.length; j++) {
        minD = Math.min(minD, sorted[j] - sorted[j - k + 1]);
      }
      return { inputs: [nums, k], expected: minD === Infinity ? 0 : minD, label: `test_${i}` };
    })
  },
  {
    slug: 'substrings-size-three-distinct-characters',
    type: 'normal',
    functionName: { python: 'countGoodSubstrings', javascript: 'countGoodSubstrings', typescript: 'countGoodSubstrings', kotlin: 'countGoodSubstrings' },
    stubs: {
      python: `def countGoodSubstrings(s: str) -> int:\n    pass`,
      javascript: `function countGoodSubstrings(s) {\n\n}`,
      typescript: `function countGoodSubstrings(s: string): number {\n\n}`,
      kotlin: `fun countGoodSubstrings(s: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "xyzzaz", expected: 1 },
        { s: "aababcabc", expected: 4 },
        { s: "abc", expected: 1 },
        { s: "aaaa", expected: 0 },
        { s: "abacaba", expected: 2 }
      ];
      const tc = base[i % base.length];
      const suffix = i % 2 === 0 ? "x" : "y";
      const s = tc.s + suffix;
      let count = 0;
      for (let j = 0; j <= s.length - 3; j++) {
        if (s[j] !== s[j + 1] && s[j] !== s[j + 2] && s[j + 1] !== s[j + 2]) {
          count++;
        }
      }
      return { inputs: [s], expected: count, label: `test_${i}` };
    })
  },
  {
    slug: 'repeated-dna-sequences',
    type: 'unordered_list',
    functionName: { python: 'findRepeatedDnaSequences', javascript: 'findRepeatedDnaSequences', typescript: 'findRepeatedDnaSequences', kotlin: 'findRepeatedDnaSequences' },
    stubs: {
      python: `def findRepeatedDnaSequences(s: str) -> list:\n    pass`,
      javascript: `function findRepeatedDnaSequences(s) {\n\n}`,
      typescript: `function findRepeatedDnaSequences(s: string): string[] {\n\n}`,
      kotlin: `fun findRepeatedDnaSequences(s: String): List<String> {\n    return emptyList()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT", expected: ["AAAAACCCCC", "CCCCCAAAAA"] },
        { s: "AAAAAAAAAAAAA", expected: ["AAAAAAAAAA"] },
        { s: "AAAAAAAAAA", expected: [] },
        { s: "AAAAAAAAAAATTTTTTTTTT", expected: [] },
        { s: "AAAAACCCCCAAAAACCCCC", expected: ["AAAAACCCCC"] }
      ];
      const tc = base[i % base.length];
      const suffix = i % 2 === 0 ? "A" : "T";
      const s = tc.s + suffix;
      const seen = new Set<string>();
      const repeated = new Set<string>();
      for (let j = 0; j <= s.length - 10; j++) {
        const sub = s.slice(j, j + 10);
        if (seen.has(sub)) {
          repeated.add(sub);
        }
        seen.add(sub);
      }
      return { inputs: [s], expected: Array.from(repeated), label: `test_${i}` };
    })
  },
  {
    slug: 'minimum-size-subarray-sum',
    type: 'normal',
    functionName: { python: 'minSubArrayLen', javascript: 'minSubArrayLen', typescript: 'minSubArrayLen', kotlin: 'minSubArrayLen' },
    stubs: {
      python: `def minSubArrayLen(target: int, nums: list) -> int:\n    pass`,
      javascript: `function minSubArrayLen(target, nums) {\n\n}`,
      typescript: `function minSubArrayLen(target: number, nums: number[]): number {\n\n}`,
      kotlin: `fun minSubArrayLen(target: Int, nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { target: 7, nums: [2,3,1,2,4,3], expected: 2 },
        { target: 4, nums: [1,4,4], expected: 1 },
        { target: 11, nums: [1,1,1,1,1,1,1,1], expected: 0 },
        { target: 15, nums: [5,1,3,5,10,7,4,9,2,8], expected: 2 },
        { target: 3, nums: [1,1,1], expected: 3 }
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length);
      const nums = tc.nums.map(x => x + offset);
      const target = tc.target + offset * 2;
      let minLen = Infinity, left = 0, sum = 0;
      for (let right = 0; right < nums.length; right++) {
        sum += nums[right];
        while (sum >= target) {
          minLen = Math.min(minLen, right - left + 1);
          sum -= nums[left];
          left++;
        }
      }
      return { inputs: [target, nums], expected: minLen === Infinity ? 0 : minLen, label: `test_${i}` };
    })
  },
  {
    slug: 'longest-repeating-character-replacement',
    type: 'normal',
    functionName: { python: 'characterReplacement', javascript: 'characterReplacement', typescript: 'characterReplacement', kotlin: 'characterReplacement' },
    stubs: {
      python: `def characterReplacement(s: str, k: int) -> int:\n    pass`,
      javascript: `function characterReplacement(s, k) {\n\n}`,
      typescript: `function characterReplacement(s: string, k: number): number {\n\n}`,
      kotlin: `fun characterReplacement(s: String, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "ABAB", k: 2, expected: 4 },
        { s: "AABABBA", k: 1, expected: 4 },
        { s: "AAAA", k: 2, expected: 4 },
        { s: "ABCDE", k: 1, expected: 2 },
        { s: "AABA", k: 0, expected: 2 }
      ];
      const tc = base[i % base.length];
      const suffix = i % 2 === 0 ? "A" : "B";
      const s = tc.s + suffix;
      const k = tc.k;
      const counts: Record<string, number> = {};
      let maxF = 0, left = 0, maxW = 0;
      for (let right = 0; right < s.length; right++) {
        counts[s[right]] = (counts[s[right]] || 0) + 1;
        maxF = Math.max(maxF, counts[s[right]]);
        if (right - left + 1 - maxF > k) {
          counts[s[left]]--;
          left++;
        }
        maxW = Math.max(maxW, right - left + 1);
      }
      return { inputs: [s, k], expected: maxW, label: `test_${i}` };
    })
  },
  {
    slug: 'max-consecutive-ones-iii',
    type: 'normal',
    functionName: { python: 'longestOnes', javascript: 'longestOnes', typescript: 'longestOnes', kotlin: 'longestOnes' },
    stubs: {
      python: `def longestOnes(nums: list, k: int) -> int:\n    pass`,
      javascript: `function longestOnes(nums, k) {\n\n}`,
      typescript: `function longestOnes(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun longestOnes(nums: IntArray, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,1,1,0,0,0,1,1,1,1,0], k: 2, expected: 6 },
        { nums: [0,0,1,1,0,0,1,1,1,0,1,1,0,0,0,1,1,1,1,0], k: 3, expected: 10 },
        { nums: [0,0,0], k: 2, expected: 2 },
        { nums: [1,1,1], k: 0, expected: 3 },
        { nums: [0,0,0], k: 0, expected: 0 }
      ];
      const tc = base[i % base.length];
      const prefix = i % 2 === 0 ? [1] : [0];
      const nums = [...prefix, ...tc.nums];
      const k = tc.k;
      let maxLen = 0, left = 0, zeros = 0;
      for (let right = 0; right < nums.length; right++) {
        if (nums[right] === 0) zeros++;
        while (zeros > k) {
          if (nums[left] === 0) zeros--;
          left++;
        }
        maxLen = Math.max(maxLen, right - left + 1);
      }
      return { inputs: [nums, k], expected: maxLen, label: `test_${i}` };
    })
  },
  {
    slug: 'fruit-into-baskets',
    type: 'normal',
    functionName: { python: 'totalFruit', javascript: 'totalFruit', typescript: 'totalFruit', kotlin: 'totalFruit' },
    stubs: {
      python: `def totalFruit(fruits: list) -> int:\n    pass`,
      javascript: `function totalFruit(fruits) {\n\n}`,
      typescript: `function totalFruit(fruits: number[]): number {\n\n}`,
      kotlin: `fun totalFruit(fruits: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { fruits: [1,2,1], expected: 3 },
        { fruits: [0,1,2,2], expected: 3 },
        { fruits: [1,2,3,2,2], expected: 4 },
        { fruits: [3,3,3,1,2,1,1,2,3,3,4], expected: 5 },
        { fruits: [1,1,1,1], expected: 4 }
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length);
      const fruits = tc.fruits.map(x => x + offset);
      let maxFruits = 0, left = 0;
      const map = new Map<number, number>();
      for (let right = 0; right < fruits.length; right++) {
        map.set(fruits[right], (map.get(fruits[right]) || 0) + 1);
        while (map.size > 2) {
          map.set(fruits[left], map.get(fruits[left])! - 1);
          if (map.get(fruits[left]) === 0) map.delete(fruits[left]);
          left++;
        }
        maxFruits = Math.max(maxFruits, right - left + 1);
      }
      return { inputs: [fruits], expected: maxFruits, label: `test_${i}` };
    })
  },
  {
    slug: 'longest-subarray-ones-after-deleting-one-element',
    type: 'normal',
    functionName: { python: 'longestSubarray', javascript: 'longestSubarray', typescript: 'longestSubarray', kotlin: 'longestSubarray' },
    stubs: {
      python: `def longestSubarray(nums: list) -> int:\n    pass`,
      javascript: `function longestSubarray(nums) {\n\n}`,
      typescript: `function longestSubarray(nums: number[]): number {\n\n}`,
      kotlin: `fun longestSubarray(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,1,0,1], expected: 3 },
        { nums: [0,1,1,1,0,1,1,0,1], expected: 5 },
        { nums: [1,1,1], expected: 2 },
        { nums: [0,0,0], expected: 0 },
        { nums: [1,0,0,1], expected: 1 }
      ];
      const tc = base[i % base.length];
      const suffix = i % 2 === 0 ? [1] : [0];
      const nums = [...tc.nums, ...suffix];
      let maxLen = 0, left = 0, zeros = 0;
      for (let right = 0; right < nums.length; right++) {
        if (nums[right] === 0) zeros++;
        while (zeros > 1) {
          if (nums[left] === 0) zeros--;
          left++;
        }
        maxLen = Math.max(maxLen, right - left);
      }
      return { inputs: [nums], expected: maxLen, label: `test_${i}` };
    })
  },
  {
    slug: 'grumpy-bookstore-owner',
    type: 'normal',
    functionName: { python: 'maxSatisfied', javascript: 'maxSatisfied', typescript: 'maxSatisfied', kotlin: 'maxSatisfied' },
    stubs: {
      python: `def maxSatisfied(customers: list, grumpy: list, minutes: int) -> int:\n    pass`,
      javascript: `function maxSatisfied(customers, grumpy, minutes) {\n\n}`,
      typescript: `function maxSatisfied(customers: number[], grumpy: number[], minutes: number): number {\n\n}`,
      kotlin: `fun maxSatisfied(customers: IntArray, grumpy: IntArray, minutes: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { customers: [1,0,1,2,1,1,7,5], grumpy: [0,1,0,1,0,1,0,1], minutes: 3, expected: 16 },
        { customers: [1], grumpy: [0], minutes: 1, expected: 1 },
        { customers: [4,10,10], grumpy: [1,1,0], minutes: 2, expected: 24 },
        { customers: [2,6,6,9], grumpy: [0,0,1,1], minutes: 1, expected: 17 }
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length);
      const customers = tc.customers.map(x => x + offset);
      const grumpy = tc.grumpy;
      const minutes = tc.minutes;
      // recalculate maxSatisfied
      let baseSatisfied = 0;
      for (let j = 0; j < customers.length; j++) {
        if (grumpy[j] === 0) baseSatisfied += customers[j];
      }
      let extra = 0;
      for (let j = 0; j < minutes; j++) {
        if (grumpy[j] === 1) extra += customers[j];
      }
      let maxExtra = extra;
      for (let j = minutes; j < customers.length; j++) {
        if (grumpy[j] === 1) extra += customers[j];
        if (grumpy[j - minutes] === 1) extra -= customers[j - minutes];
        maxExtra = Math.max(maxExtra, extra);
      }
      return { inputs: [customers, grumpy, minutes], expected: baseSatisfied + maxExtra, label: `test_${i}` };
    })
  },
  {
    slug: 'count-number-of-nice-subarrays',
    type: 'normal',
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
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 2;
      const nums = tc.nums.map(x => x + offset);
      const k = tc.k;
      const atMost = (limit: number) => {
        let left = 0, count = 0, odds = 0;
        for (let right = 0; right < nums.length; right++) {
          if (nums[right] % 2 !== 0) odds++;
          while (odds > limit) {
            if (nums[left] % 2 !== 0) odds--;
            left++;
          }
          count += right - left + 1;
        }
        return count;
      };
      const expected = atMost(k) - atMost(k - 1);
      return { inputs: [nums, k], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'maximum-erasure-value',
    type: 'normal',
    functionName: { python: 'maximumUniqueSubarray', javascript: 'maximumUniqueSubarray', typescript: 'maximumUniqueSubarray', kotlin: 'maximumUniqueSubarray' },
    stubs: {
      python: `def maximumUniqueSubarray(nums: list) -> int:\n    pass`,
      javascript: `function maximumUniqueSubarray(nums) {\n\n}`,
      typescript: `function maximumUniqueSubarray(nums: number[]): number {\n\n}`,
      kotlin: `fun maximumUniqueSubarray(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [4,2,4,5,6], expected: 17 },
        { nums: [5,2,1,2,5,2,1,2,5], expected: 8 },
        { nums: [1,1,1], expected: 1 },
        { nums: [1,2,3,4,5], expected: 15 }
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length);
      const nums = tc.nums.map(x => x + offset);
      let maxSum = 0, left = 0, curSum = 0;
      const seen = new Set<number>();
      for (let right = 0; right < nums.length; right++) {
        while (seen.has(nums[right])) {
          seen.delete(nums[left]);
          curSum -= nums[left];
          left++;
        }
        seen.add(nums[right]);
        curSum += nums[right];
        maxSum = Math.max(maxSum, curSum);
      }
      return { inputs: [nums], expected: maxSum, label: `test_${i}` };
    })
  },
  {
    slug: 'minimum-operations-to-reduce-x-to-zero',
    type: 'normal',
    functionName: { python: 'minOperations', javascript: 'minOperations', typescript: 'minOperations', kotlin: 'minOperations' },
    stubs: {
      python: `def minOperations(nums: list, x: int) -> int:\n    pass`,
      javascript: `function minOperations(nums, x) {\n\n}`,
      typescript: `function minOperations(nums: number[], x: number): number {\n\n}`,
      kotlin: `fun minOperations(nums: IntArray, x: Int): Int {\n    return -1\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,1,4,2,3], x: 5, expected: 2 },
        { nums: [5,6,7,8,9], x: 4, expected: -1 },
        { nums: [3,2,20,1,1,3], x: 10, expected: 5 },
        { nums: [1,1], x: 3, expected: -1 },
        { nums: [1,1], x: 2, expected: 2 }
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length);
      const nums = tc.nums.map(x => x + offset);
      // recalculate x to make it solvable if tc.expected !== -1
      const total = nums.reduce((a,b)=>a+b, 0);
      let x = tc.x;
      if (tc.expected !== -1) {
        // adjust x based on multiplier
        x = tc.x + offset * tc.expected;
      } else {
        x = tc.x + offset * 5;
      }
      const target = total - x;
      let maxLen = -1;
      if (target >= 0) {
        let left = 0, sum = 0;
        for (let right = 0; right < nums.length; right++) {
          sum += nums[right];
          while (sum > target) {
            sum -= nums[left];
            left++;
          }
          if (sum === target) {
            maxLen = Math.max(maxLen, right - left + 1);
          }
        }
      }
      const expected = maxLen === -1 ? -1 : nums.length - maxLen;
      return { inputs: [nums, x], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'sliding-window-maximum',
    type: 'normal',
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
        { nums: [1], k: 1, expected: [1] },
        { nums: [7,2,4], k: 2, expected: [7,4] },
        { nums: [1, -1], k: 1, expected: [1, -1] }
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length);
      const nums = tc.nums.map(x => x + offset);
      const k = tc.k;
      const expected: number[] = [];
      const q: number[] = [];
      for (let j = 0; j < nums.length; j++) {
        if (q.length && q[0] < j - k + 1) q.shift();
        while (q.length && nums[q[q.length - 1]] <= nums[j]) q.pop();
        q.push(j);
        if (j >= k - 1) expected.push(nums[q[0]]);
      }
      return { inputs: [nums, k], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'substring-with-concatenation-of-all-words',
    type: 'unordered_list',
    functionName: { python: 'findSubstring', javascript: 'findSubstring', typescript: 'findSubstring', kotlin: 'findSubstring' },
    inputTypes: ['string', 'string_array'],
    stubs: {
      python: `def findSubstring(s: str, words: list) -> list:\n    pass`,
      javascript: `function findSubstring(s, words) {\n\n}`,
      typescript: `function findSubstring(s: string, words: string[]): number[] {\n\n}`,
      kotlin: `fun findSubstring(s: String, words: Array<String>): List<Int> {\n    return emptyList()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "barfoothefoobarman", words: ["foo","bar"], expected: [0,9] },
        { s: "wordgoodgoodgoodbestword", words: ["word","good","best","word"], expected: [] },
        { s: "barfoofoobarthefoobarman", words: ["bar","foo","the"], expected: [6,9,12] }
      ];
      const tc = base[i % base.length];
      // create variation by prepending random letters
      const prefix = "a".repeat(i % 3);
      const s = prefix + tc.s;
      const words = tc.words;
      const expected = tc.expected.map(x => x + prefix.length);
      return { inputs: [s, words], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'minimum-number-of-k-consecutive-bit-flips',
    type: 'normal',
    functionName: { python: 'minKBitFlips', javascript: 'minKBitFlips', typescript: 'minKBitFlips', kotlin: 'minKBitFlips' },
    stubs: {
      python: `def minKBitFlips(nums: list, k: int) -> int:\n    pass`,
      javascript: `function minKBitFlips(nums, k) {\n\n}`,
      typescript: `function minKBitFlips(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun minKBitFlips(nums: IntArray, k: Int): Int {\n    return -1\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [0,1,0], k: 1, expected: 2 },
        { nums: [1,1,0], k: 2, expected: -1 },
        { nums: [0,0,0,1,0,1,1,0], k: 3, expected: 3 },
        { nums: [1,1,1], k: 2, expected: 0 },
        { nums: [0,0,0], k: 1, expected: 3 }
      ];
      const tc = base[i % base.length];
      const prefix = i % 2 === 0 ? [1] : [0];
      const nums = [...prefix, ...tc.nums];
      const k = tc.k;
      // recalculate minimum flips
      const n = nums.length;
      const diff = new Array(n + 1).fill(0);
      let flips = 0, current = 0;
      for (let j = 0; j < n; j++) {
        current += diff[j];
        if ((nums[j] + current) % 2 === 0) {
          if (j + k > n) {
            flips = -1;
            break;
          }
          flips++;
          current++;
          diff[j + k]--;
        }
      }
      return { inputs: [nums, k], expected: flips, label: `test_${i}` };
    })
  },
  {
    slug: 'max-value-of-equation',
    type: 'normal',
    functionName: { python: 'findMaxValueOfEquation', javascript: 'findMaxValueOfEquation', typescript: 'findMaxValueOfEquation', kotlin: 'findMaxValueOfEquation' },
    inputTypes: ['int_array_2d', 'int'],
    stubs: {
      python: `def findMaxValueOfEquation(points: list, k: int) -> int:\n    pass`,
      javascript: `function findMaxValueOfEquation(points, k) {\n\n}`,
      typescript: `function findMaxValueOfEquation(points: number[][], k: number): number {\n\n}`,
      kotlin: `fun findMaxValueOfEquation(points: Array<IntArray>, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { points: [[1,3],[2,0],[5,10],[6,-10]], k: 1, expected: 4 },
        { points: [[0,0],[3,0],[9,2]], k: 3, expected: 3 },
        { points: [[1,3],[3,6],[10,20]], k: 5, expected: 11 }
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 2;
      const points = tc.points.map(([x, y]) => [x + offset, y]);
      const k = tc.k;
      // calculate correct max value
      let maxVal = -Infinity;
      for (let a = 0; a < points.length; a++) {
        for (let b = a + 1; b < points.length; b++) {
          if (points[b][0] - points[a][0] > k) break;
          const val = points[a][1] + points[b][1] + points[b][0] - points[a][0];
          maxVal = Math.max(maxVal, val);
        }
      }
      return { inputs: [points, k], expected: maxVal === -Infinity ? -1 : maxVal, label: `test_${i}` };
    })
  },
  {
    slug: 'sliding-window-median',
    type: 'normal',
    functionName: { python: 'medianSlidingWindow', javascript: 'medianSlidingWindow', typescript: 'medianSlidingWindow', kotlin: 'medianSlidingWindow' },
    expectedType: 'double_array',
    stubs: {
      python: `def medianSlidingWindow(nums: list, k: int) -> list:\n    pass`,
      javascript: `function medianSlidingWindow(nums, k) {\n\n}`,
      typescript: `function medianSlidingWindow(nums: number[], k: number): number[] {\n\n}`,
      kotlin: `fun medianSlidingWindow(nums: IntArray, k: Int): DoubleArray {\n    return doubleArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,3,-1,-3,5,3,6,7], k: 3, expected: [1.0,-1.0,-1.0,3.0,5.0,6.0] },
        { nums: [1,2,3,4,2,3,1,4,2], k: 3, expected: [2.0,3.0,3.0,3.0,2.0,3.0,2.0] },
        { nums: [1,2], k: 2, expected: [1.5] }
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length);
      const nums = tc.nums.map(x => x + offset);
      const k = tc.k;
      const expected: number[] = [];
      for (let j = 0; j <= nums.length - k; j++) {
        const sub = nums.slice(j, j + k).sort((a,b)=>a-b);
        if (k % 2 !== 0) {
          expected.push(sub[Math.floor(k / 2)]);
        } else {
          expected.push((sub[k / 2 - 1] + sub[k / 2]) / 2.0);
        }
      }
      return { inputs: [nums, k], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'longest-substring-at-most-k-distinct',
    type: 'normal',
    functionName: { python: 'lengthOfLongestSubstringKDistinct', javascript: 'lengthOfLongestSubstringKDistinct', typescript: 'lengthOfLongestSubstringKDistinct', kotlin: 'lengthOfLongestSubstringKDistinct' },
    stubs: {
      python: `def lengthOfLongestSubstringKDistinct(s: str, k: int) -> int:\n    pass`,
      javascript: `function lengthOfLongestSubstringKDistinct(s, k) {\n\n}`,
      typescript: `function lengthOfLongestSubstringKDistinct(s: string, k: number): number {\n\n}`,
      kotlin: `fun lengthOfLongestSubstringKDistinct(s: String, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "eceba", k: 2, expected: 3 },
        { s: "aa", k: 1, expected: 2 },
        { s: "aabbcc", k: 1, expected: 2 },
        { s: "a", k: 0, expected: 0 },
        { s: "abcabc", k: 3, expected: 6 }
      ];
      const tc = base[i % base.length];
      const suffix = i % 2 === 0 ? "a" : "d";
      const s = tc.s + suffix;
      const k = tc.k;
      let maxLen = 0, left = 0;
      const counts: Record<string, number> = {};
      let distinct = 0;
      for (let right = 0; right < s.length; right++) {
        if (!counts[s[right]]) distinct++;
        counts[s[right]] = (counts[s[right]] || 0) + 1;
        while (distinct > k) {
          counts[s[left]]--;
          if (counts[s[left]] === 0) distinct--;
          left++;
        }
        maxLen = Math.max(maxLen, right - left + 1);
      }
      return { inputs: [s, k], expected: maxLen, label: `test_${i}` };
    })
  },
  {
    slug: 'replace-substring-for-balanced-string',
    type: 'normal',
    functionName: { python: 'balancedString', javascript: 'balancedString', typescript: 'balancedString', kotlin: 'balancedString' },
    stubs: {
      python: `def balancedString(s: str) -> int:\n    pass`,
      javascript: `function balancedString(s) {\n\n}`,
      typescript: `function balancedString(s: string): number {\n\n}`,
      kotlin: `fun balancedString(s: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "QWER", expected: 0 },
        { s: "QQWE", expected: 1 },
        { s: "QQQW", expected: 2 },
        { s: "QQQQ", expected: 3 }
      ];
      const tc = base[i % base.length];
      // create copies
      const repeat = Math.floor(i / base.length) + 1;
      const s = tc.s.split('').map(x => x.repeat(repeat)).join('');
      const n = s.length;
      const target = n / 4;
      const count: Record<string, number> = { Q: 0, W: 0, E: 0, R: 0 };
      for (const char of s) count[char]++;
      let ans = n, left = 0;
      const check = () => count.Q <= target && count.W <= target && count.E <= target && count.R <= target;
      if (check()) ans = 0;
      else {
        for (let right = 0; right < n; right++) {
          count[s[right]]--;
          while (check()) {
            ans = Math.min(ans, right - left + 1);
            count[s[left]]++;
            left++;
          }
        }
      }
      return { inputs: [s], expected: ans, label: `test_${i}` };
    })
  },
  {
    slug: 'frequency-of-the-most-frequent-element',
    type: 'normal',
    functionName: { python: 'maxFrequency', javascript: 'maxFrequency', typescript: 'maxFrequency', kotlin: 'maxFrequency' },
    stubs: {
      python: `def maxFrequency(nums: list, k: int) -> int:\n    pass`,
      javascript: `function maxFrequency(nums, k) {\n\n}`,
      typescript: `function maxFrequency(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun maxFrequency(nums: IntArray, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,2,4], k: 5, expected: 3 },
        { nums: [1,4,8,13], k: 5, expected: 2 },
        { nums: [3,9,6], k: 2, expected: 1 }
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 2;
      const nums = tc.nums.map(x => x + offset).sort((a,b)=>a-b);
      const k = tc.k;
      let left = 0, sum = 0, ans = 0;
      for (let right = 0; right < nums.length; right++) {
        sum += nums[right];
        while (nums[right] * (right - left + 1) - sum > k) {
          sum -= nums[left];
          left++;
        }
        ans = Math.max(ans, right - left + 1);
      }
      return { inputs: [nums, k], expected: ans, label: `test_${i}` };
    })
  },
  {
    slug: 'maximum-fruits-harvested-after-at-most-k-steps',
    type: 'normal',
    functionName: { python: 'maxTotalFruits', javascript: 'maxTotalFruits', typescript: 'maxTotalFruits', kotlin: 'maxTotalFruits' },
    inputTypes: ['int_array_2d', 'int', 'int'],
    stubs: {
      python: `def maxTotalFruits(fruits: list, startPos: int, k: int) -> int:\n    pass`,
      javascript: `function maxTotalFruits(fruits, startPos, k) {\n\n}`,
      typescript: `function maxTotalFruits(fruits: number[][], startPos: number, k: number): number {\n\n}`,
      kotlin: `fun maxTotalFruits(fruits: Array<IntArray>, startPos: Int, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { fruits: [[2,8],[6,3],[8,6]], startPos: 5, k: 4, expected: 9 },
        { fruits: [[0,9],[4,1],[5,7],[6,2],[7,4],[10,9]], startPos: 5, k: 4, expected: 14 },
        { fruits: [[0,3],[6,4],[8,5]], startPos: 3, k: 2, expected: 0 }
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 3;
      const fruits = tc.fruits.map(([pos, amt]) => [pos + offset, amt]);
      const startPos = tc.startPos + offset;
      const k = tc.k;
      let left = 0, curSum = 0, ans = 0;
      for (let right = 0; right < fruits.length; right++) {
        curSum += fruits[right][1];
        while (left <= right) {
          const lPos = fruits[left][0];
          const rPos = fruits[right][0];
          const steps = Math.min(
            2 * Math.max(0, startPos - lPos) + Math.max(0, rPos - startPos),
            2 * Math.max(0, rPos - startPos) + Math.max(0, startPos - lPos)
          );
          if (steps <= k) break;
          curSum -= fruits[left][1];
          left++;
        }
        ans = Math.max(ans, curSum);
      }
      return { inputs: [fruits, startPos, k], expected: ans, label: `test_${i}` };
    })
  },
  {
    slug: 'minimum-swaps-to-group-all-ones-together-ii',
    type: 'normal',
    functionName: { python: 'minSwaps', javascript: 'minSwaps', typescript: 'minSwaps', kotlin: 'minSwaps' },
    stubs: {
      python: `def minSwaps(nums: list) -> int:\n    pass`,
      javascript: `function minSwaps(nums) {\n\n}`,
      typescript: `function minSwaps(nums: number[]): number {\n\n}`,
      kotlin: `fun minSwaps(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [0,1,0,1,1,0,0], expected: 1 },
        { nums: [0,1,1,1,0,0,1,1,0], expected: 2 },
        { nums: [1,1,0,0,1], expected: 1 },
        { nums: [1,0,1,0,1], expected: 1 },
        { nums: [0,0,0], expected: 0 }
      ];
      const tc = base[i % base.length];
      const prefix = i % 2 === 0 ? [1] : [0];
      const nums = [...prefix, ...tc.nums];
      // calculate correct expected swaps
      const totalOnes = nums.reduce((a,b)=>a+b, 0);
      let ans = totalOnes;
      if (totalOnes > 0) {
        const doubled = [...nums, ...nums];
        let zeros = 0;
        for (let j = 0; j < totalOnes; j++) {
          if (doubled[j] === 0) zeros++;
        }
        ans = zeros;
        for (let j = totalOnes; j < nums.length + totalOnes; j++) {
          if (doubled[j] === 0) zeros++;
          if (doubled[j - totalOnes] === 0) zeros--;
          ans = Math.min(ans, zeros);
        }
      } else {
        ans = 0;
      }
      return { inputs: [nums], expected: ans, label: `test_${i}` };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 30 Sliding Window problems…\n');

  let updatedCount = 0;

  for (const item of PROBLEMS_DATA) {
    const dbProblem = await db.query.problems.findFirst({
      where: eq(problems.slug, item.slug),
    });

    if (!dbProblem) {
      console.log(`  skip  ${item.slug} (not found in DB)`);
      continue;
    }

    const functionStubs = item.stubs;
    const testRunners = {
      python: buildPythonRunner(item.functionName.python, item.type, item.testCases),
      javascript: buildJSRunner(item.functionName.javascript, item.type, item.testCases),
      typescript: buildTSRunner(item.functionName.typescript, item.type, item.testCases),
      kotlin: buildKotlinRunner(item.functionName.kotlin, item.type, item.testCases, item.inputTypes, item.expectedType),
    };

    await db.update(problems)
      .set({
        functionStubs: sql`${functionStubs}::jsonb`,
        testRunners: sql`${testRunners}::jsonb`,
      })
      .where(eq(problems.id, dbProblem.id));

    console.log(`  ✓  [${dbProblem.difficulty}] ${item.slug} (30 test cases seeded)`);
    updatedCount++;
  }

  console.log(`\nDone. ${updatedCount}/30 problems updated.`);
  await client.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
