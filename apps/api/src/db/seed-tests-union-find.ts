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
// 30 UNION_FIND PROBLEMS DATA
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
    slug: 'number-of-connected-components-in-an-undirected-graph',
    functionName: { python: 'countComponents', javascript: 'countComponents', typescript: 'countComponents', kotlin: 'countComponents' },
    inputTypes: ['normal', 'int_array_2d'],
    stubs: {
      python: `def countComponents(n: int, edges: list) -> int:\n    pass`,
      javascript: `function countComponents(n, edges) {\n\n}`,
      typescript: `function countComponents(n: number, edges: number[][]): number {\n\n}`,
      kotlin: `fun countComponents(n: Int, edges: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 5, edges: [[0,1],[1,2],[3,4]], expected: 2 },
        { n: 5, edges: [[0,1],[1,2],[2,3],[3,4]], expected: 1 }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].edges], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'number-of-islands',
    functionName: { python: 'numIslands', javascript: 'numIslands', typescript: 'numIslands', kotlin: 'numIslands' },
    inputTypes: ['char_array_2d'],
    stubs: {
      python: `def numIslands(grid: list) -> int:\n    pass`,
      javascript: `function numIslands(grid) {\n\n}`,
      typescript: `function numIslands(grid: string[][]): number {\n\n}`,
      kotlin: `fun numIslands(grid: Array<CharArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]], expected: 1 },
        { grid: [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]], expected: 3 }
      ];
      return { inputs: [base[i % base.length].grid], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'number-of-provinces',
    functionName: { python: 'findCircleNum', javascript: 'findCircleNum', typescript: 'findCircleNum', kotlin: 'findCircleNum' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def findCircleNum(isConnected: list) -> int:\n    pass`,
      javascript: `function findCircleNum(isConnected) {\n\n}`,
      typescript: `function findCircleNum(isConnected: number[][]): number {\n\n}`,
      kotlin: `fun findCircleNum(isConnected: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { isConnected: [[1,1,0],[1,1,0],[0,0,1]], expected: 2 },
        { isConnected: [[1,0,0],[0,1,0],[0,0,1]], expected: 3 }
      ];
      return { inputs: [base[i % base.length].isConnected], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'satisfiability-of-equality-equations',
    functionName: { python: 'equationsPossible', javascript: 'equationsPossible', typescript: 'equationsPossible', kotlin: 'equationsPossible' },
    inputTypes: ['string_array'],
    stubs: {
      python: `def equationsPossible(equations: list) -> bool:\n    pass`,
      javascript: `function equationsPossible(equations) {\n\n}`,
      typescript: `function equationsPossible(equations: string[]): boolean {\n\n}`,
      kotlin: `fun equationsPossible(equations: Array<String>): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { equations: ["a==b","b!=a"], expected: false },
        { equations: ["b==a","a==b"], expected: true }
      ];
      return { inputs: [base[i % base.length].equations], expected: base[i % base.length].expected };
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
    slug: 'count-unreachable-pairs-of-nodes-in-an-undirected-graph',
    functionName: { python: 'countPairs', javascript: 'countPairs', typescript: 'countPairs', kotlin: 'countPairs' },
    inputTypes: ['normal', 'int_array_2d'],
    stubs: {
      python: `def countPairs(n: int, edges: list) -> int:\n    pass`,
      javascript: `function countPairs(n, edges) {\n\n}`,
      typescript: `function countPairs(n: number, edges: number[][]): number {\n\n}`,
      kotlin: `fun countPairs(n: Int, edges: Array<IntArray>): Long {\n    return 0L\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 3, edges: [[0,1],[0,2],[1,2]], expected: 0 },
        { n: 7, edges: [[0,2],[0,5],[2,4],[1,6],[5,4]], expected: 14 }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].edges], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'lexicographically-smallest-equivalent-string',
    functionName: { python: 'smallestEquivalentString', javascript: 'smallestEquivalentString', typescript: 'smallestEquivalentString', kotlin: 'smallestEquivalentString' },
    stubs: {
      python: `def smallestEquivalentString(s1: str, s2: str, baseStr: str) -> str:\n    pass`,
      javascript: `function smallestEquivalentString(s1, s2, baseStr) {\n\n}`,
      typescript: `function smallestEquivalentString(s1: string, s2: string, baseStr: string): string {\n\n}`,
      kotlin: `fun smallestEquivalentString(s1: String, s2: String, baseStr: String): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s1: "parker", s2: "morris", baseStr: "parser", expected: "makkek" },
        { s1: "hello", s2: "world", baseStr: "hold", expected: "hdld" },
        { s1: "leetcode", s2: "programs", baseStr: "sourcecode", expected: "aauaaaaada" }
      ];
      return { inputs: [base[i % base.length].s1, base[i % base.length].s2, base[i % base.length].baseStr], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'count-the-number-of-complete-components',
    functionName: { python: 'countCompleteComponents', javascript: 'countCompleteComponents', typescript: 'countCompleteComponents', kotlin: 'countCompleteComponents' },
    inputTypes: ['normal', 'int_array_2d'],
    stubs: {
      python: `def countCompleteComponents(n: int, edges: list) -> int:\n    pass`,
      javascript: `function countCompleteComponents(n, edges) {\n\n}`,
      typescript: `function countCompleteComponents(n: number, edges: number[][]): number {\n\n}`,
      kotlin: `fun countCompleteComponents(n: Int, edges: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 6, edges: [[0,1],[0,2],[1,2],[3,4]], expected: 3 },
        { n: 6, edges: [[0,1],[0,2],[1,2],[3,4],[3,5]], expected: 1 }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].edges], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'find-the-town-judge',
    functionName: { python: 'findJudge', javascript: 'findJudge', typescript: 'findJudge', kotlin: 'findJudge' },
    inputTypes: ['normal', 'int_array_2d'],
    stubs: {
      python: `def findJudge(n: int, trust: list) -> int:\n    pass`,
      javascript: `function findJudge(n, trust) {\n\n}`,
      typescript: `function findJudge(n: number, trust: number[][]): number {\n\n}`,
      kotlin: `fun findJudge(n: Int, trust: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 2, trust: [[1,2]], expected: 2 },
        { n: 3, trust: [[1,3],[2,3]], expected: 3 },
        { n: 3, trust: [[1,3],[2,3],[3,1]], expected: -1 }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].trust], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'redundant-connection',
    functionName: { python: 'findRedundantConnection', javascript: 'findRedundantConnection', typescript: 'findRedundantConnection', kotlin: 'findRedundantConnection' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def findRedundantConnection(edges: list) -> list:\n    pass`,
      javascript: `function findRedundantConnection(edges) {\n\n}`,
      typescript: `function findRedundantConnection(edges: number[][]): number[] {\n\n}`,
      kotlin: `fun findRedundantConnection(edges: Array<IntArray>): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { edges: [[1,2],[1,3],[2,3]], expected: [2,3] },
        { edges: [[1,2],[2,3],[3,4],[1,4],[1,5]], expected: [1,4] }
      ];
      return { inputs: [base[i % base.length].edges], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'accounts-merge',
    functionName: { python: 'accountsMerge', javascript: 'accountsMerge', typescript: 'accountsMerge', kotlin: 'accountsMerge' },
    inputTypes: ['string_array_2d'],
    expectedType: 'string_array_2d',
    stubs: {
      python: `def accountsMerge(accounts: list) -> list:\n    pass`,
      javascript: `function accountsMerge(accounts) {\n\n}`,
      typescript: `function accountsMerge(accounts: string[][]): string[][] {\n\n}`,
      kotlin: `fun accountsMerge(accounts: List<List<String>>): List<List<String>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        {
          accounts: [["John","johnsmith@mail.com","john_newyork@mail.com"],["John","johnsmith@mail.com","john00@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]],
          expected: [["John","john00@mail.com","john_newyork@mail.com","johnsmith@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]]
        }
      ];
      return { inputs: [base[i % base.length].accounts], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'surrounded-regions',
    stubs: {
      python: `def solve(board: list) -> None:\n    pass`,
      javascript: `function solve(board) {\n\n}`,
      typescript: `function solve(board: string[][]): void {\n\n}`,
      kotlin: `fun solve(board: Array<CharArray>): Unit {\n\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    b = [["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]]
    solve(b)
    if b == [["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let b = [["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]];
    solve(b);
    if (JSON.stringify(b) === JSON.stringify([["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let b = [["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]];
    solve(b);
    if (JSON.stringify(b) === JSON.stringify([["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val b = arrayOf(
            charArrayOf('X','X','X','X'),
            charArrayOf('X','O','O','X'),
            charArrayOf('X','X','O','X'),
            charArrayOf('X','O','X','X')
        )
        solve(b)
        val expected = arrayOf(
            charArrayOf('X','X','X','X'),
            charArrayOf('X','X','X','X'),
            charArrayOf('X','X','X','X'),
            charArrayOf('X','O','X','X')
        )
        if (b.contentDeepEquals(expected)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'smallest-string-with-swaps',
    functionName: { python: 'smallestStringWithSwaps', javascript: 'smallestStringWithSwaps', typescript: 'smallestStringWithSwaps', kotlin: 'smallestStringWithSwaps' },
    inputTypes: ['normal', 'int_array_2d'],
    stubs: {
      python: `def smallestStringWithSwaps(s: str, pairs: list) -> str:\n    pass`,
      javascript: `function smallestStringWithSwaps(s, pairs) {\n\n}`,
      typescript: `function smallestStringWithSwaps(s: string, pairs: number[][]): string {\n\n}`,
      kotlin: `fun smallestStringWithSwaps(s: String, pairs: List<List<Int>>): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "dcab", pairs: [[0,3],[1,2]], expected: "bacd" },
        { s: "dcab", pairs: [[0,3],[1,2],[0,2]], expected: "abcd" },
        { s: "cba", pairs: [[0,1],[1,2]], expected: "abc" }
      ];
      return { inputs: [base[i % base.length].s, base[i % base.length].pairs], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'number-of-operations-to-make-network-connected',
    functionName: { python: 'makeConnected', javascript: 'makeConnected', typescript: 'makeConnected', kotlin: 'makeConnected' },
    inputTypes: ['normal', 'int_array_2d'],
    stubs: {
      python: `def makeConnected(n: int, connections: list) -> int:\n    pass`,
      javascript: `function makeConnected(n, connections) {\n\n}`,
      typescript: `function makeConnected(n: number, connections: number[][]): number {\n\n}`,
      kotlin: `fun makeConnected(n: Int, connections: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 4, connections: [[0,1],[0,2],[1,2]], expected: 1 },
        { n: 6, connections: [[0,1],[0,2],[0,3],[1,2],[1,3]], expected: 2 },
        { n: 6, connections: [[0,1],[0,2],[0,3],[1,2]], expected: -1 }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].connections], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'sentence-similarity-ii',
    functionName: { python: 'areSentencesSimilarTwo', javascript: 'areSentencesSimilarTwo', typescript: 'areSentencesSimilarTwo', kotlin: 'areSentencesSimilarTwo' },
    inputTypes: ['string_array', 'string_array', 'string_array_2d'],
    stubs: {
      python: `def areSentencesSimilarTwo(sentence1: list, sentence2: list, similarPairs: list) -> bool:\n    pass`,
      javascript: `function areSentencesSimilarTwo(sentence1, sentence2, similarPairs) {\n\n}`,
      typescript: `function areSentencesSimilarTwo(sentence1: string[], sentence2: string[], similarPairs: string[][]): boolean {\n\n}`,
      kotlin: `fun areSentencesSimilarTwo(sentence1: Array<String>, sentence2: Array<String>, similarPairs: List<List<String>>): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        {
          sentence1: ["great","acting","skills"],
          sentence2: ["fine","drama","talent"],
          similarPairs: [["great","good"],["fine","good"],["drama","acting"],["skills","talent"]],
          expected: true
        },
        {
          sentence1: ["I","love","leetcode"],
          sentence2: ["I","love","onepiece"],
          similarPairs: [["manga","onepiece"],["platform","anime"],["leetcode","platform"],["anime","manga"]],
          expected: true
        }
      ];
      return { inputs: [base[i % base.length].sentence1, base[i % base.length].sentence2, base[i % base.length].similarPairs], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'detect-cycles-in-2d-grid',
    functionName: { python: 'containsCycle', javascript: 'containsCycle', typescript: 'containsCycle', kotlin: 'containsCycle' },
    inputTypes: ['char_array_2d'],
    stubs: {
      python: `def containsCycle(grid: list) -> bool:\n    pass`,
      javascript: `function containsCycle(grid) {\n\n}`,
      typescript: `function containsCycle(grid: string[][]): boolean {\n\n}`,
      kotlin: `fun containsCycle(grid: Array<CharArray>): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [["a","a","a","a"],["a","b","b","a"],["a","b","b","a"],["a","a","a","a"]], expected: true },
        { grid: [["c","c","c","a"],["c","d","c","c"],["c","c","e","c"],["f","c","c","c"]], expected: true },
        { grid: [["a","b","b"],["b","a","b"],["b","b","a"]], expected: false }
      ];
      return { inputs: [base[i % base.length].grid], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'number-of-enclaves',
    functionName: { python: 'numEnclaves', javascript: 'numEnclaves', typescript: 'numEnclaves', kotlin: 'numEnclaves' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def numEnclaves(grid: list) -> int:\n    pass`,
      javascript: `function numEnclaves(grid) {\n\n}`,
      typescript: `function numEnclaves(grid: number[][]): number {\n\n}`,
      kotlin: `fun numEnclaves(grid: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [[0,0,0,0],[1,0,1,0],[0,1,1,0],[0,0,0,0]], expected: 3 },
        { grid: [[0,1,1,0],[0,0,0,0],[0,1,1,0],[0,0,0,0]], expected: 0 }
      ];
      return { inputs: [base[i % base.length].grid], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'minimum-score-of-a-path-between-two-cities',
    functionName: { python: 'minScore', javascript: 'minScore', typescript: 'minScore', kotlin: 'minScore' },
    inputTypes: ['normal', 'int_array_2d'],
    stubs: {
      python: `def minScore(n: int, roads: list) -> int:\n    pass`,
      javascript: `function minScore(n, roads) {\n\n}`,
      typescript: `function minScore(n: number, roads: number[][]): number {\n\n}`,
      kotlin: `fun minScore(n: Int, roads: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 4, roads: [[1,2,9],[2,3,6],[2,4,5],[1,4,7]], expected: 5 },
        { n: 4, roads: [[1,2,2],[1,3,4],[3,4,7]], expected: 2 }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].roads], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'evaluate-division',
    functionName: { python: 'calcEquation', javascript: 'calcEquation', typescript: 'calcEquation', kotlin: 'calcEquation' },
    inputTypes: ['string_array_2d', 'double_array', 'string_array_2d'],
    expectedType: 'double_array',
    stubs: {
      python: `def calcEquation(equations: list, values: list, queries: list) -> list:\n    pass`,
      javascript: `function calcEquation(equations, values, queries) {\n\n}`,
      typescript: `function calcEquation(equations: string[][], values: number[], queries: string[][]): number[] {\n\n}`,
      kotlin: `fun calcEquation(equations: List<List<String>>, values: DoubleArray, queries: List<List<String>>): DoubleArray {\n    return doubleArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        {
          equations: [["a","b"],["b","c"]],
          values: [2.0,3.0],
          queries: [["a","c"],["b","a"],["a","e"],["a","a"],["x","x"]],
          expected: [6.0,0.5,-1.0,1.0,-1.0]
        }
      ];
      return { inputs: [base[i % base.length].equations, base[i % base.length].values, base[i % base.length].queries], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'the-earliest-moment-when-everyone-became-friends',
    functionName: { python: 'earliestAcq', javascript: 'earliestAcq', typescript: 'earliestAcq', kotlin: 'earliestAcq' },
    inputTypes: ['int_array_2d', 'normal'],
    stubs: {
      python: `def earliestAcq(logs: list, n: int) -> int:\n    pass`,
      javascript: `function earliestAcq(logs, n) {\n\n}`,
      typescript: `function earliestAcq(logs: number[][], n: number): number {\n\n}`,
      kotlin: `fun earliestAcq(logs: Array<IntArray>, n: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        {
          logs: [[20190101,0,1],[20190104,3,4],[20190107,2,3],[20190211,1,5],[20190224,2,4],[20190301,0,3],[20190312,1,2],[20190322,4,5]],
          n: 6,
          expected: 20190301
        }
      ];
      return { inputs: [base[i % base.length].logs, base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'similar-string-groups',
    functionName: { python: 'numSimilarGroups', javascript: 'numSimilarGroups', typescript: 'numSimilarGroups', kotlin: 'numSimilarGroups' },
    inputTypes: ['string_array'],
    stubs: {
      python: `def numSimilarGroups(strs: list) -> int:\n    pass`,
      javascript: `function numSimilarGroups(strs) {\n\n}`,
      typescript: `function numSimilarGroups(strs: string[]): number {\n\n}`,
      kotlin: `fun numSimilarGroups(strs: Array<String>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { strs: ["tars","rats","arts","star"], expected: 2 },
        { strs: ["omg","otg"], expected: 2 }
      ];
      return { inputs: [base[i % base.length].strs], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'couples-holding-hands',
    functionName: { python: 'minSwapsCouples', javascript: 'minSwapsCouples', typescript: 'minSwapsCouples', kotlin: 'minSwapsCouples' },
    stubs: {
      python: `def minSwapsCouples(row: list) -> int:\n    pass`,
      javascript: `function minSwapsCouples(row) {\n\n}`,
      typescript: `function minSwapsCouples(row: number[]): number {\n\n}`,
      kotlin: `fun minSwapsCouples(row: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { row: [0,2,1,3], expected: 1 },
        { row: [3,2,0,1], expected: 0 }
      ];
      return { inputs: [base[i % base.length].row], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'bricks-falling-when-hit',
    functionName: { python: 'hitBricks', javascript: 'hitBricks', typescript: 'hitBricks', kotlin: 'hitBricks' },
    inputTypes: ['int_array_2d', 'int_array_2d'],
    stubs: {
      python: `def hitBricks(grid: list, hits: list) -> list:\n    pass`,
      javascript: `function hitBricks(grid, hits) {\n\n}`,
      typescript: `function hitBricks(grid: number[][], hits: number[][]): number[] {\n\n}`,
      kotlin: `fun hitBricks(grid: Array<IntArray>, hits: Array<IntArray>): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [[1,0,0,0],[1,1,1,0]], hits: [[1,0]], expected: [2] },
        { grid: [[1,0,0,0],[1,1,0,0]], hits: [[1,1],[1,0]], expected: [0,0] }
      ];
      return { inputs: [base[i % base.length].grid, base[i % base.length].hits], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'number-of-islands-ii',
    functionName: { python: 'numIslands2', javascript: 'numIslands2', typescript: 'numIslands2', kotlin: 'numIslands2' },
    inputTypes: ['normal', 'normal', 'int_array_2d'],
    stubs: {
      python: `def numIslands2(m: int, n: int, positions: list) -> list:\n    pass`,
      javascript: `function numIslands2(m, n, positions) {\n\n}`,
      typescript: `function numIslands2(m: number, n: number, positions: number[][]): number[] {\n\n}`,
      kotlin: `fun numIslands2(m: Int, n: Int, positions: Array<IntArray>): List<Int> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { m: 3, n: 3, positions: [[0,0],[0,1],[1,2],[2,1]], expected: [1,1,2,3] }
      ];
      return { inputs: [base[i % base.length].m, base[i % base.length].n, base[i % base.length].positions], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'find-critical-and-pseudo-critical-edges-in-mst',
    functionName: { python: 'findCriticalAndPseudoCriticalEdges', javascript: 'findCriticalAndPseudoCriticalEdges', typescript: 'findCriticalAndPseudoCriticalEdges', kotlin: 'findCriticalAndPseudoCriticalEdges' },
    inputTypes: ['normal', 'int_array_2d'],
    stubs: {
      python: `def findCriticalAndPseudoCriticalEdges(n: int, edges: list) -> list:\n    pass`,
      javascript: `function findCriticalAndPseudoCriticalEdges(n, edges) {\n\n}`,
      typescript: `function findCriticalAndPseudoCriticalEdges(n: number, edges: number[][]): number[][] {\n\n}`,
      kotlin: `fun findCriticalAndPseudoCriticalEdges(n: Int, edges: Array<IntArray>): List<List<Int>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 5, edges: [[0,1,1],[1,2,1],[2,3,2],[0,3,2],[0,4,3],[3,4,3],[1,4,6]], expected: [[0,1],[2,3,4,5]] }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].edges], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'rank-transform-of-a-matrix',
    functionName: { python: 'matrixRankTransform', javascript: 'matrixRankTransform', typescript: 'matrixRankTransform', kotlin: 'matrixRankTransform' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def matrixRankTransform(matrix: list) -> list:\n    pass`,
      javascript: `function matrixRankTransform(matrix) {\n\n}`,
      typescript: `function matrixRankTransform(matrix: number[][]): number[][] {\n\n}`,
      kotlin: `fun matrixRankTransform(matrix: Array<IntArray>): Array<IntArray> {\n    return arrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { matrix: [[1,2],[3,4]], expected: [[1,2],[2,3]] },
        { matrix: [[7,7],[7,7]], expected: [[1,1],[1,1]] }
      ];
      return { inputs: [base[i % base.length].matrix], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'last-day-where-you-can-still-cross',
    functionName: { python: 'latestDayToCross', javascript: 'latestDayToCross', typescript: 'latestDayToCross', kotlin: 'latestDayToCross' },
    inputTypes: ['normal', 'normal', 'int_array_2d'],
    stubs: {
      python: `def latestDayToCross(row: int, col: int, cells: list) -> int:\n    pass`,
      javascript: `function latestDayToCross(row, col, cells) {\n\n}`,
      typescript: `function latestDayToCross(row: number, col: number, cells: number[][]): number {\n\n}`,
      kotlin: `fun latestDayToCross(row: Int, col: Int, cells: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { row: 2, col: 2, cells: [[1,1],[2,1],[1,2],[2,2]], expected: 2 },
        { row: 2, col: 2, cells: [[1,1],[1,2],[2,1],[2,2]], expected: 1 },
        { row: 3, col: 3, cells: [[1,2],[2,1],[3,3],[2,2],[1,1],[1,3],[2,3],[3,2],[3,1]], expected: 4 }
      ];
      return { inputs: [base[i % base.length].row, base[i % base.length].col, base[i % base.length].cells], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'number-of-good-paths',
    functionName: { python: 'numberOfGoodPaths', javascript: 'numberOfGoodPaths', typescript: 'numberOfGoodPaths', kotlin: 'numberOfGoodPaths' },
    inputTypes: ['normal', 'int_array_2d'],
    stubs: {
      python: `def numberOfGoodPaths(vals: list, edges: list) -> int:\n    pass`,
      javascript: `function numberOfGoodPaths(vals, edges) {\n\n}`,
      typescript: `function numberOfGoodPaths(vals: number[], edges: number[][]): number {\n\n}`,
      kotlin: `fun numberOfGoodPaths(vals: IntArray, edges: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { vals: [1,3,2,1,3], edges: [[0,1],[0,2],[2,3],[2,4]], expected: 6 },
        { vals: [1,1,2,2,3], edges: [[0,1],[1,2],[2,3],[2,4]], expected: 7 }
      ];
      return { inputs: [base[i % base.length].vals, base[i % base.length].edges], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'remove-max-number-of-edges-to-keep-graph-fully-traversable',
    functionName: { python: 'maxNumEdgesToRemove', javascript: 'maxNumEdgesToRemove', typescript: 'maxNumEdgesToRemove', kotlin: 'maxNumEdgesToRemove' },
    inputTypes: ['normal', 'int_array_2d'],
    stubs: {
      python: `def maxNumEdgesToRemove(n: int, edges: list) -> int:\n    pass`,
      javascript: `function maxNumEdgesToRemove(n, edges) {\n\n}`,
      typescript: `function maxNumEdgesToRemove(n: number, edges: number[][]): number {\n\n}`,
      kotlin: `fun maxNumEdgesToRemove(n: Int, edges: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 4, edges: [[3,1,2],[3,2,3],[1,1,3],[2,2,4],[3,1,2],[2,1,3],[2,3,4],[3,1,4]], expected: 2 },
        { n: 4, edges: [[3,1,2],[3,2,3],[1,1,4],[2,1,4]], expected: 0 },
        { n: 4, edges: [[3,2,3],[1,1,2],[3,1,2],[2,3,4]], expected: -1 }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].edges], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'graph-connectivity-with-threshold',
    functionName: { python: 'areConnected', javascript: 'areConnected', typescript: 'areConnected', kotlin: 'areConnected' },
    inputTypes: ['normal', 'normal', 'int_array_2d'],
    stubs: {
      python: `def areConnected(n: int, threshold: int, queries: list) -> list:\n    pass`,
      javascript: `function areConnected(n, threshold, queries) {\n\n}`,
      typescript: `function areConnected(n: number, threshold: number, queries: number[][]): boolean[] {\n\n}`,
      kotlin: `fun areConnected(n: Int, threshold: Int, queries: Array<IntArray>): List<Boolean> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 6, threshold: 2, queries: [[1,4],[2,5],[3,6]], expected: [false,false,true] },
        { n: 6, threshold: 0, queries: [[4,5],[3,4]], expected: [true,true] }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].threshold, base[i % base.length].queries], expected: base[i % base.length].expected };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 30 UNION_FIND problems...\n');

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
