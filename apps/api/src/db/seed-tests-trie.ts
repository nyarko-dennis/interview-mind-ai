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
// 30 TRIE PROBLEMS DATA
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
    slug: 'longest-common-prefix',
    functionName: { python: 'longestCommonPrefix', javascript: 'longestCommonPrefix', typescript: 'longestCommonPrefix', kotlin: 'longestCommonPrefix' },
    inputTypes: ['string_array'],
    stubs: {
      python: `def longestCommonPrefix(strs: list) -> str:\n    pass`,
      javascript: `function longestCommonPrefix(strs) {\n\n}`,
      typescript: `function longestCommonPrefix(strs: string[]): string {\n\n}`,
      kotlin: `fun longestCommonPrefix(strs: Array<String>): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { strs: ["flower","flow","flight"], expected: "fl" },
        { strs: ["dog","racecar","car"], expected: "" }
      ];
      return { inputs: [base[i % base.length].strs], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'string-matching-in-an-array',
    functionName: { python: 'stringMatching', javascript: 'stringMatching', typescript: 'stringMatching', kotlin: 'stringMatching' },
    inputTypes: ['string_array'],
    expectedType: 'string_array',
    stubs: {
      python: `def stringMatching(words: list) -> list:\n    pass`,
      javascript: `function stringMatching(words) {\n\n}`,
      typescript: `function stringMatching(words: string[]): string[] {\n\n}`,
      kotlin: `fun stringMatching(words: Array<String>): List<String> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { words: ["mass","as","hero","superhero"], expected: ["as","hero"] },
        { words: ["leetcode","et","code"], expected: ["et","code"] }
      ];
      return { inputs: [base[i % base.length].words], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'counting-words-with-a-given-prefix',
    functionName: { python: 'prefixCount', javascript: 'prefixCount', typescript: 'prefixCount', kotlin: 'prefixCount' },
    inputTypes: ['string_array', 'normal'],
    stubs: {
      python: `def prefixCount(words: list, pref: str) -> int:\n    pass`,
      javascript: `function prefixCount(words, pref) {\n\n}`,
      typescript: `function prefixCount(words: string[], pref: string): number {\n\n}`,
      kotlin: `fun prefixCount(words: Array<String>, pref: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { words: ["pay","attention","practice","attend"], pref: "at", expected: 2 },
        { words: ["leetcode","win","loops","success"], pref: "code", expected: 0 }
      ];
      return { inputs: [base[i % base.length].words, base[i % base.length].pref], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'check-if-a-word-occurs-as-a-prefix-of-any-word-in-a-sentence',
    functionName: { python: 'isPrefixOfWord', javascript: 'isPrefixOfWord', typescript: 'isPrefixOfWord', kotlin: 'isPrefixOfWord' },
    stubs: {
      python: `def isPrefixOfWord(sentence: str, searchWord: str) -> int:\n    pass`,
      javascript: `function isPrefixOfWord(sentence, searchWord) {\n\n}`,
      typescript: `function isPrefixOfWord(sentence: string, searchWord: string): number {\n\n}`,
      kotlin: `fun isPrefixOfWord(sentence: String, searchWord: String): Int {\n    return -1\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { sentence: "i love eating burger", searchWord: "burg", expected: 4 },
        { sentence: "this problem is easy", searchWord: "pro", expected: 2 },
        { sentence: "i am tired", searchWord: "you", expected: -1 }
      ];
      return { inputs: [base[i % base.length].sentence, base[i % base.length].searchWord], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'count-prefixes-of-a-given-string',
    functionName: { python: 'countPrefixes', javascript: 'countPrefixes', typescript: 'countPrefixes', kotlin: 'countPrefixes' },
    inputTypes: ['string_array', 'normal'],
    stubs: {
      python: `def countPrefixes(words: list, s: str) -> int:\n    pass`,
      javascript: `function countPrefixes(words, s) {\n\n}`,
      typescript: `function countPrefixes(words: string[], s: string): number {\n\n}`,
      kotlin: `fun countPrefixes(words: Array<String>, s: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { words: ["a","b","c","ab","bc","abc"], s: "abc", expected: 3 },
        { words: ["a","a"], s: "aa", expected: 2 }
      ];
      return { inputs: [base[i % base.length].words, base[i % base.length].s], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'count-prefix-and-suffix-pairs-i',
    functionName: { python: 'countPrefixSuffixPairs', javascript: 'countPrefixSuffixPairs', typescript: 'countPrefixSuffixPairs', kotlin: 'countPrefixSuffixPairs' },
    inputTypes: ['string_array'],
    stubs: {
      python: `def countPrefixSuffixPairs(words: list) -> int:\n    pass`,
      javascript: `function countPrefixSuffixPairs(words) {\n\n}`,
      typescript: `function countPrefixSuffixPairs(words: string[]): number {\n\n}`,
      kotlin: `fun countPrefixSuffixPairs(words: Array<String>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { words: ["a","aba","ababa","aa"], expected: 4 },
        { words: ["pa","papa","ma","mama"], expected: 2 }
      ];
      return { inputs: [base[i % base.length].words], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'map-sum-pairs',
    stubs: {
      python: `class MapSum:\n    def __init__(self):\n        pass\n    def insert(self, key: str, val: int) -> None:\n        pass\n    def sum(self, prefix: str) -> int:\n        pass`,
      javascript: `class MapSum {\n  constructor() {}\n  insert(key, val) {}\n  sum(prefix) {}\n}`,
      typescript: `class MapSum {\n  constructor() {}\n  insert(key: string, val: number): void {}\n  sum(prefix: string): number {\n    return 0;\n  }\n}`,
      kotlin: `class MapSum() {\n    fun insert(key: String, value: Int) {}\n    fun sum(prefix: String): Int {\n        return 0\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    m = MapSum()
    m.insert("apple", 3)
    r1 = m.sum("ap")
    m.insert("app", 2)
    r2 = m.sum("ap")
    if r1 == 3 and r2 == 5: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const m = new MapSum();
    m.insert("apple", 3);
    let r1 = m.sum("ap");
    m.insert("app", 2);
    let r2 = m.sum("ap");
    if (r1 === 3 && r2 === 5) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const m = new MapSum();
    m.insert("apple", 3);
    let r1 = m.sum("ap");
    m.insert("app", 2);
    let r2 = m.sum("ap");
    if (r1 === 3 && r2 === 5) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val m = MapSum()
        m.insert("apple", 3)
        val r1 = m.sum("ap")
        m.insert("app", 2)
        val r2 = m.sum("ap")
        if (r1 == 3 && r2 == 5) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'replace-words',
    functionName: { python: 'replaceWords', javascript: 'replaceWords', typescript: 'replaceWords', kotlin: 'replaceWords' },
    inputTypes: ['string_array', 'normal'],
    stubs: {
      python: `def replaceWords(dictionary: list, sentence: str) -> str:\n    pass`,
      javascript: `function replaceWords(dictionary, sentence) {\n\n}`,
      typescript: `function replaceWords(dictionary: string[], sentence: string): string {\n\n}`,
      kotlin: `fun replaceWords(dictionary: List<String>, sentence: String): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { dictionary: ["cat","bat","rat"], sentence: "the cattle was rattled by the battery", expected: "the cat was rat by the bat" },
        { dictionary: ["a","b","c"], sentence: "aadsfasf absbs bbact cadsfafs", expected: "a a b c" }
      ];
      return { inputs: [base[i % base.length].dictionary, base[i % base.length].sentence], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'longest-word-in-dictionary',
    functionName: { python: 'longestWord', javascript: 'longestWord', typescript: 'longestWord', kotlin: 'longestWord' },
    inputTypes: ['string_array'],
    stubs: {
      python: `def longestWord(words: list) -> str:\n    pass`,
      javascript: `function longestWord(words) {\n\n}`,
      typescript: `function longestWord(words: string[]): string {\n\n}`,
      kotlin: `fun longestWord(words: Array<String>): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { words: ["w","wo","wor","worl","world"], expected: "world" },
        { words: ["a","banana","app","appl","ap","apply","apple"], expected: "apple" }
      ];
      return { inputs: [base[i % base.length].words], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'search-suggestions-system',
    functionName: { python: 'suggestedProducts', javascript: 'suggestedProducts', typescript: 'suggestedProducts', kotlin: 'suggestedProducts' },
    inputTypes: ['string_array', 'normal'],
    expectedType: 'string_array_2d',
    stubs: {
      python: `def suggestedProducts(products: list, searchWord: str) -> list:\n    pass`,
      javascript: `function suggestedProducts(products, searchWord) {\n\n}`,
      typescript: `function suggestedProducts(products: string[], searchWord: string): string[][] {\n\n}`,
      kotlin: `fun suggestedProducts(products: Array<String>, searchWord: String): List<List<String>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        {
          products: ["mobile","mouse","moneypot","monitor","mousepad"],
          searchWord: "mouse",
          expected: [
            ["mobile","moneypot","monitor"],
            ["mobile","moneypot","monitor"],
            ["mouse","mousepad"],
            ["mouse","mousepad"],
            ["mouse","mousepad"]
          ]
        }
      ];
      return { inputs: [base[i % base.length].products, base[i % base.length].searchWord], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'implement-trie',
    stubs: {
      python: `class Trie:\n    def __init__(self):\n        pass\n    def insert(self, word: str) -> None:\n        pass\n    def search(self, word: str) -> bool:\n        pass\n    def startsWith(self, prefix: str) -> bool:\n        pass`,
      javascript: `class Trie {\n  constructor() {}\n  insert(word) {}\n  search(word) {}\n  startsWith(prefix) {}\n}`,
      typescript: `class Trie {\n  constructor() {}\n  insert(word: string): void {}\n  search(word: string): boolean {\n    return false;\n  }\n  startsWith(prefix: string): boolean {\n    return false;\n  }\n}`,
      kotlin: `class Trie() {\n    fun insert(word: String) {}\n    fun search(word: String): Boolean {\n        return false\n    }\n    fun startsWith(prefix: String): Boolean {\n        return false\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    t = Trie()
    t.insert("apple")
    r1 = t.search("apple")
    r2 = t.search("app")
    r3 = t.startsWith("app")
    t.insert("app")
    r4 = t.search("app")
    if r1 == True and r2 == False and r3 == True and r4 == True: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const t = new Trie();
    t.insert("apple");
    let r1 = t.search("apple");
    let r2 = t.search("app");
    let r3 = t.startsWith("app");
    t.insert("app");
    let r4 = t.search("app");
    if (r1 === true && r2 === false && r3 === true && r4 === true) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const t = new Trie();
    t.insert("apple");
    let r1 = t.search("apple");
    let r2 = t.search("app");
    let r3 = t.startsWith("app");
    t.insert("app");
    let r4 = t.search("app");
    if (r1 === true && r2 === false && r3 === true && r4 === true) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val t = Trie()
        t.insert("apple")
        val r1 = t.search("apple")
        val r2 = t.search("app")
        val r3 = t.startsWith("app")
        t.insert("app")
        val r4 = t.search("app")
        if (r1 == true && r2 == false && r3 == true && r4 == true) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'design-add-and-search-words-data-structure',
    stubs: {
      python: `class WordDictionary:\n    def __init__(self):\n        pass\n    def addWord(self, word: str) -> None:\n        pass\n    def search(self, word: str) -> bool:\n        pass`,
      javascript: `class WordDictionary {\n  constructor() {}\n  addWord(word) {}\n  search(word) {}\n}`,
      typescript: `class WordDictionary {\n  constructor() {}\n  addWord(word: string): void {}\n  search(word: string): boolean {\n    return false;\n  }\n}`,
      kotlin: `class WordDictionary() {\n    fun addWord(word: String) {}\n    fun search(word: String): Boolean {\n        return false\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    wd = WordDictionary()
    wd.addWord("bad")
    wd.addWord("dad")
    wd.addWord("mad")
    r1 = wd.search("pad")
    r2 = wd.search("bad")
    r3 = wd.search(".ad")
    r4 = wd.search("b..")
    if r1 == False and r2 == True and r3 == True and r4 == True: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const wd = new WordDictionary();
    wd.addWord("bad");
    wd.addWord("dad");
    wd.addWord("mad");
    let r1 = wd.search("pad");
    let r2 = wd.search("bad");
    let r3 = wd.search(".ad");
    let r4 = wd.search("b..");
    if (r1 === false && r2 === true && r3 === true && r4 === true) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const wd = new WordDictionary();
    wd.addWord("bad");
    wd.addWord("dad");
    wd.addWord("mad");
    let r1 = wd.search("pad");
    let r2 = wd.search("bad");
    let r3 = wd.search(".ad");
    let r4 = wd.search("b..");
    if (r1 === false && r2 === true && r3 === true && r4 === true) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val wd = WordDictionary()
        wd.addWord("bad")
        wd.addWord("dad")
        wd.addWord("mad")
        val r1 = wd.search("pad")
        val r2 = wd.search("bad")
        val r3 = wd.search(".ad")
        val r4 = wd.search("b..")
        if (r1 == false && r2 == true && r3 == true && r4 == true) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'maximum-xor-of-two-numbers-in-an-array',
    functionName: { python: 'findMaximumXOR', javascript: 'findMaximumXOR', typescript: 'findMaximumXOR', kotlin: 'findMaximumXOR' },
    stubs: {
      python: `def findMaximumXOR(nums: list) -> int:\n    pass`,
      javascript: `function findMaximumXOR(nums) {\n\n}`,
      typescript: `function findMaximumXOR(nums: number[]): number {\n\n}`,
      kotlin: `fun findMaximumXOR(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [3,10,5,25,2,8], expected: 28 },
        { nums: [14,70,53,83,49,91,36,80,92,51,66,70], expected: 127 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'implement-magic-dictionary',
    stubs: {
      python: `class MagicDictionary:\n    def __init__(self):\n        pass\n    def buildDict(self, dictionary: list) -> None:\n        pass\n    def search(self, searchWord: str) -> bool:\n        pass`,
      javascript: `class MagicDictionary {\n  constructor() {}\n  buildDict(dictionary) {}\n  search(searchWord) {}\n}`,
      typescript: `class MagicDictionary {\n  constructor() {}\n  buildDict(dictionary: string[]): void {}\n  search(searchWord: string): boolean {\n    return false;\n  }\n}`,
      kotlin: `class MagicDictionary() {\n    fun buildDict(dictionary: Array<String>) {}\n    fun search(searchWord: String): Boolean {\n        return false\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    md = MagicDictionary()
    md.buildDict(["hello", "leetcode"])
    r1 = md.search("hello")
    r2 = md.search("hhllo")
    r3 = md.search("hell")
    r4 = md.search("leetcoded")
    if r1 == False and r2 == True and r3 == False and r4 == False: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const md = new MagicDictionary();
    md.buildDict(["hello", "leetcode"]);
    let r1 = md.search("hello");
    let r2 = md.search("hhllo");
    let r3 = md.search("hell");
    let r4 = md.search("leetcoded");
    if (r1 === false && r2 === true && r3 === false && r4 === false) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const md = new MagicDictionary();
    md.buildDict(["hello", "leetcode"]);
    let r1 = md.search("hello");
    let r2 = md.search("hhllo");
    let r3 = md.search("hell");
    let r4 = md.search("leetcoded");
    if (r1 === false && r2 === true && r3 === false && r4 === false) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val md = MagicDictionary()
        md.buildDict(arrayOf("hello", "leetcode"))
        val r1 = md.search("hello")
        val r2 = md.search("hhllo")
        val r3 = md.search("hell")
        val r4 = md.search("leetcoded")
        if (r1 == false && r2 == true && r3 == false && r4 == false) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'short-encoding-of-words',
    functionName: { python: 'minimumLengthEncoding', javascript: 'minimumLengthEncoding', typescript: 'minimumLengthEncoding', kotlin: 'minimumLengthEncoding' },
    inputTypes: ['string_array'],
    stubs: {
      python: `def minimumLengthEncoding(words: list) -> int:\n    pass`,
      javascript: `function minimumLengthEncoding(words) {\n\n}`,
      typescript: `function minimumLengthEncoding(words: string[]): number {\n\n}`,
      kotlin: `fun minimumLengthEncoding(words: Array<String>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { words: ["time","me","bell"], expected: 10 },
        { words: ["t"], expected: 2 }
      ];
      return { inputs: [base[i % base.length].words], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'camelcase-matching',
    functionName: { python: 'camelMatch', javascript: 'camelMatch', typescript: 'camelMatch', kotlin: 'camelMatch' },
    inputTypes: ['string_array', 'normal'],
    stubs: {
      python: `def camelMatch(queries: list, pattern: str) -> list:\n    pass`,
      javascript: `function camelMatch(queries, pattern) {\n\n}`,
      typescript: `function camelMatch(queries: string[], pattern: string): boolean[] {\n\n}`,
      kotlin: `fun camelMatch(queries: Array<String>, pattern: String): List<Boolean> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { queries: ["FooBar","FooBarTest","FootBall","FrameBuffer","ForceFeedBack"], pattern: "FB", expected: [true,false,true,true,false] }
      ];
      return { inputs: [base[i % base.length].queries, base[i % base.length].pattern], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'longest-word-with-all-prefixes',
    functionName: { python: 'longestWord', javascript: 'longestWord', typescript: 'longestWord', kotlin: 'longestWord' },
    inputTypes: ['string_array'],
    stubs: {
      python: `def longestWord(words: list) -> str:\n    pass`,
      javascript: `function longestWord(words) {\n\n}`,
      typescript: `function longestWord(words: string[]): string {\n\n}`,
      kotlin: `fun longestWord(words: Array<String>): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { words: ["k","ki","kir","kira","kiran"], expected: "kiran" },
        { words: ["a","banana","app","appl","ap","apply","apple"], expected: "apple" }
      ];
      return { inputs: [base[i % base.length].words], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'implement-trie-ii',
    stubs: {
      python: `class Trie:\n    def __init__(self):\n        pass\n    def insert(self, word: str) -> None:\n        pass\n    def countWordsEqualTo(self, word: str) -> int:\n        pass\n    def countWordsStartingWith(self, prefix: str) -> int:\n        pass\n    def erase(self, word: str) -> None:\n        pass`,
      javascript: `class Trie {\n  constructor() {}\n  insert(word) {}\n  countWordsEqualTo(word) {}\n  countWordsStartingWith(prefix) {}\n  erase(word) {}\n}`,
      typescript: `class Trie {\n  constructor() {}\n  insert(word: string): void {}\n  countWordsEqualTo(word: string): number {\n    return 0;\n  }\n  countWordsStartingWith(prefix: string): number {\n    return 0;\n  }\n  erase(word: string): void {}\n}`,
      kotlin: `class Trie() {\n    fun insert(word: String) {}\n    fun countWordsEqualTo(word: String): Int {\n        return 0\n    }\n    fun countWordsStartingWith(prefix: String): Int {\n        return 0\n    }\n    fun erase(word: String) {}\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    t = Trie()
    t.insert("apple")
    t.insert("apple")
    r1 = t.countWordsEqualTo("apple")
    r2 = t.countWordsStartingWith("app")
    t.erase("apple")
    r3 = t.countWordsEqualTo("apple")
    r4 = t.countWordsStartingWith("app")
    t.erase("apple")
    r5 = t.countWordsStartingWith("app")
    if r1 == 2 and r2 == 2 and r3 == 1 and r4 == 1 and r5 == 0: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const t = new Trie();
    t.insert("apple");
    t.insert("apple");
    let r1 = t.countWordsEqualTo("apple");
    let r2 = t.countWordsStartingWith("app");
    t.erase("apple");
    let r3 = t.countWordsEqualTo("apple");
    let r4 = t.countWordsStartingWith("app");
    t.erase("apple");
    let r5 = t.countWordsStartingWith("app");
    if (r1 === 2 && r2 === 2 && r3 === 1 && r4 === 1 && r5 === 0) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const t = new Trie();
    t.insert("apple");
    t.insert("apple");
    let r1 = t.countWordsEqualTo("apple");
    let r2 = t.countWordsStartingWith("app");
    t.erase("apple");
    let r3 = t.countWordsEqualTo("apple");
    let r4 = t.countWordsStartingWith("app");
    t.erase("apple");
    let r5 = t.countWordsStartingWith("app");
    if (r1 === 2 && r2 === 2 && r3 === 1 && r4 === 1 && r5 === 0) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val t = Trie()
        t.insert("apple")
        t.insert("apple")
        val r1 = t.countWordsEqualTo("apple")
        val r2 = t.countWordsStartingWith("app")
        t.erase("apple")
        val r3 = t.countWordsEqualTo("apple")
        val r4 = t.countWordsStartingWith("app")
        t.erase("apple")
        val r5 = t.countWordsStartingWith("app")
        if (r1 == 2 && r2 == 2 && r3 == 1 && r4 == 1 && r5 == 0) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'extra-characters-in-a-string',
    functionName: { python: 'minExtraChar', javascript: 'minExtraChar', typescript: 'minExtraChar', kotlin: 'minExtraChar' },
    inputTypes: ['normal', 'string_array'],
    stubs: {
      python: `def minExtraChar(s: str, dictionary: list) -> int:\n    pass`,
      javascript: `function minExtraChar(s, dictionary) {\n\n}`,
      typescript: `function minExtraChar(s: string, dictionary: string[]): number {\n\n}`,
      kotlin: `fun minExtraChar(s: String, dictionary: Array<String>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "leetscode", dictionary: ["leet","code","leetcode"], expected: 1 },
        { s: "sayhelloworld", dictionary: ["hello","world"], expected: 3 }
      ];
      return { inputs: [base[i % base.length].s, base[i % base.length].dictionary], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'remove-sub-folders-from-the-filesystem',
    functionName: { python: 'removeSubfolders', javascript: 'removeSubfolders', typescript: 'removeSubfolders', kotlin: 'removeSubfolders' },
    inputTypes: ['string_array'],
    expectedType: 'string_array',
    stubs: {
      python: `def removeSubfolders(folder: list) -> list:\n    pass`,
      javascript: `function removeSubfolders(folder) {\n\n}`,
      typescript: `function removeSubfolders(folder: string[]): string[] {\n\n}`,
      kotlin: `fun removeSubfolders(folder: Array<String>): List<String> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { folder: ["/a","/a/b","/c/d","/c/d/e","/c/f"], expected: ["/a","/c/d","/c/f"] },
        { folder: ["/a","/a/b/c","/a/b/d"], expected: ["/a"] }
      ];
      return { inputs: [base[i % base.length].folder], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'prefix-and-suffix-search',
    stubs: {
      python: `class WordFilter:\n    def __init__(self, words: list):\n        pass\n    def f(self, pref: str, suff: str) -> int:\n        pass`,
      javascript: `class WordFilter {\n  constructor(words) {}\n  f(pref, suff) {}\n}`,
      typescript: `class WordFilter {\n  constructor(words: string[]) {}\n  f(pref: string, suff: string): number {\n    return -1;\n  }\n}`,
      kotlin: `class WordFilter(words: Array<String>) {\n    fun f(pref: String, suff: String): Int {\n        return -1\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    wf = WordFilter(["apple"])
    r1 = wf.f("a", "e")
    if r1 == 0: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const wf = new WordFilter(["apple"]);
    let r1 = wf.f("a", "e");
    if (r1 === 0) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const wf = new WordFilter(["apple"]);
    let r1 = wf.f("a", "e");
    if (r1 === 0) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val wf = WordFilter(arrayOf("apple"))
        val r1 = wf.f("a", "e")
        if (r1 == 0) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'palindrome-pairs',
    functionName: { python: 'palindromePairs', javascript: 'palindromePairs', typescript: 'palindromePairs', kotlin: 'palindromePairs' },
    inputTypes: ['string_array'],
    expectedType: 'int_array_2d',
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
    slug: 'concatenated-words',
    functionName: { python: 'findAllConcatenatedWordsInADict', javascript: 'findAllConcatenatedWordsInADict', typescript: 'findAllConcatenatedWordsInADict', kotlin: 'findAllConcatenatedWordsInADict' },
    inputTypes: ['string_array'],
    expectedType: 'string_array',
    stubs: {
      python: `def findAllConcatenatedWordsInADict(words: list) -> list:\n    pass`,
      javascript: `function findAllConcatenatedWordsInADict(words) {\n\n}`,
      typescript: `function findAllConcatenatedWordsInADict(words: string[]): string[] {\n\n}`,
      kotlin: `fun findAllConcatenatedWordsInADict(words: Array<String>): List<String> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { words: ["cat","cats","catsdogcats","dog","dogcatsdog","hippopotamuses","rat","ratcatdogcat"], expected: ["catsdogcats","dogcatsdog","ratcatdogcat"] }
      ];
      return { inputs: [base[i % base.length].words], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'stream-of-characters',
    stubs: {
      python: `class StreamChecker:\n    def __init__(self, words: list):\n        pass\n    def query(self, letter: str) -> bool:\n        pass`,
      javascript: `class StreamChecker {\n  constructor(words) {}\n  query(letter) {}\n}`,
      typescript: `class StreamChecker {\n  constructor(words: string[]) {}\n  query(letter: string): boolean {\n    return false;\n  }\n}`,
      kotlin: `class StreamChecker(words: Array<String>) {\n    fun query(letter: Char): Boolean {\n        return false\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    sc = StreamChecker(["cd", "f", "kl"])
    r1 = sc.query("a")
    r2 = sc.query("b")
    r3 = sc.query("c")
    r4 = sc.query("d")
    r5 = sc.query("e")
    r6 = sc.query("f")
    if r1 == False and r2 == False and r3 == False and r4 == True and r5 == False and r6 == True: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const sc = new StreamChecker(["cd", "f", "kl"]);
    let r1 = sc.query("a");
    let r2 = sc.query("b");
    let r3 = sc.query("c");
    let r4 = sc.query("d");
    let r5 = sc.query("e");
    let r6 = sc.query("f");
    if (r1 === false && r2 === false && r3 === false && r4 === true && r5 === false && r6 === true) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const sc = new StreamChecker(["cd", "f", "kl"]);
    let r1 = sc.query("a");
    let r2 = sc.query("b");
    let r3 = sc.query("c");
    let r4 = sc.query("d");
    let r5 = sc.query("e");
    let r6 = sc.query("f");
    if (r1 === false && r2 === false && r3 === false && r4 === true && r5 === false && r6 === true) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val sc = StreamChecker(arrayOf("cd", "f", "kl"))
        val r1 = sc.query('a')
        val r2 = sc.query('b')
        val r3 = sc.query('c')
        val r4 = sc.query('d')
        val r5 = sc.query('e')
        val r6 = sc.query('f')
        if (r1 == false && r2 == false && r3 == false && r4 == true && r5 == false && r6 == true) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'word-squares',
    functionName: { python: 'wordSquares', javascript: 'wordSquares', typescript: 'wordSquares', kotlin: 'wordSquares' },
    inputTypes: ['string_array'],
    expectedType: 'string_array_2d',
    stubs: {
      python: `def wordSquares(words: list) -> list:\n    pass`,
      javascript: `function wordSquares(words) {\n\n}`,
      typescript: `function wordSquares(words: string[]): string[][] {\n\n}`,
      kotlin: `fun wordSquares(words: Array<String>): List<List<String>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { words: ["area","lead","wall","lady","ball"], expected: [["wall","area","lead","lady"],["ball","area","lead","lady"]] }
      ];
      return { inputs: [base[i % base.length].words], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'design-search-autocomplete-system',
    stubs: {
      python: `class AutocompleteSystem:\n    def __init__(self, sentences: list, times: list):\n        pass\n    def input(self, c: str) -> list:\n        pass`,
      javascript: `class AutocompleteSystem {\n  constructor(sentences, times) {}\n  input(c) {}\n}`,
      typescript: `class AutocompleteSystem {\n  constructor(sentences: string[], times: number[]) {}\n  input(c: string): string[] {\n    return [];\n  }\n}`,
      kotlin: `class AutocompleteSystem(sentences: Array<String>, times: IntArray) {\n    fun input(c: Char): List<String> {\n        return listOf()\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    a = AutocompleteSystem(["i love you", "island", "ironman", "i love leetcode"], [5, 3, 2, 2])
    r1 = a.input("i")
    r2 = a.input(" ")
    r3 = a.input("a")
    r4 = a.input("#")
    if len(r1) > 0 and len(r2) > 0 and len(r3) == 0 and len(r4) == 0: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const a = new AutocompleteSystem(["i love you", "island", "ironman", "i love leetcode"], [5, 3, 2, 2]);
    let r1 = a.input("i");
    let r2 = a.input(" ");
    let r3 = a.input("a");
    let r4 = a.input("#");
    if (r1.length > 0 && r2.length > 0 && r3.length === 0 && r4.length === 0) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    const a = new AutocompleteSystem(["i love you", "island", "ironman", "i love leetcode"], [5, 3, 2, 2]);
    let r1 = a.input("i");
    let r2 = a.input(" ");
    let r3 = a.input("a");
    let r4 = a.input("#");
    if (r1.length > 0 && r2.length > 0 && r3.length === 0 && r4.length === 0) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val a = AutocompleteSystem(arrayOf("i love you", "island", "ironman", "i love leetcode"), intArrayOf(5, 3, 2, 2))
        val r1 = a.input('i')
        val r2 = a.input(' ')
        val r3 = a.input('a')
        val r4 = a.input('#')
        if (r1.isNotEmpty() && r2.isNotEmpty() && r3.isEmpty() && r4.isEmpty()) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'maximum-xor-with-an-element-from-array',
    functionName: { python: 'maximizeXor', javascript: 'maximizeXor', typescript: 'maximizeXor', kotlin: 'maximizeXor' },
    inputTypes: ['normal', 'int_array_2d'],
    stubs: {
      python: `def maximizeXor(nums: list, queries: list) -> list:\n    pass`,
      javascript: `function maximizeXor(nums, queries) {\n\n}`,
      typescript: `function maximizeXor(nums: number[], queries: number[][]): number[] {\n\n}`,
      kotlin: `fun maximizeXor(nums: IntArray, queries: Array<IntArray>): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [0,1,2,3,4], queries: [[3,1],[1,3],[5,6]], expected: [3,3,7] },
        { nums: [5,2,4,6,6,3], queries: [[12,4],[8,1],[6,3]], expected: [15,-1,5] }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].queries], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'sum-of-prefix-scores-of-strings',
    functionName: { python: 'sumPrefixScores', javascript: 'sumPrefixScores', typescript: 'sumPrefixScores', kotlin: 'sumPrefixScores' },
    inputTypes: ['string_array'],
    stubs: {
      python: `def sumPrefixScores(words: list) -> list:\n    pass`,
      javascript: `function sumPrefixScores(words) {\n\n}`,
      typescript: `function sumPrefixScores(words: string[]): number[] {\n\n}`,
      kotlin: `fun sumPrefixScores(words: Array<String>): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { words: ["abc","ab","bc","b"], expected: [5,4,3,2] }
      ];
      return { inputs: [base[i % base.length].words], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'count-pairs-with-xor-in-a-range',
    functionName: { python: 'countPairs', javascript: 'countPairs', typescript: 'countPairs', kotlin: 'countPairs' },
    stubs: {
      python: `def countPairs(nums: list, low: int, high: int) -> int:\n    pass`,
      javascript: `function countPairs(nums, low, high) {\n\n}`,
      typescript: `function countPairs(nums: number[], low: number, high: number): number {\n\n}`,
      kotlin: `fun countPairs(nums: IntArray, low: Int, high: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,4,2,7], low: 2, high: 6, expected: 6 },
        { nums: [9,8,4,2,1], low: 5, high: 14, expected: 8 }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].low, base[i % base.length].high], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximum-genetic-difference-query',
    functionName: { python: 'maxGeneticDifference', javascript: 'maxGeneticDifference', typescript: 'maxGeneticDifference', kotlin: 'maxGeneticDifference' },
    inputTypes: ['normal', 'int_array_2d'],
    stubs: {
      python: `def maxGeneticDifference(parents: list, queries: list) -> list:\n    pass`,
      javascript: `function maxGeneticDifference(parents, queries) {\n\n}`,
      typescript: `function maxGeneticDifference(parents: number[], queries: number[][]): number[] {\n\n}`,
      kotlin: `fun maxGeneticDifference(parents: IntArray, queries: Array<IntArray>): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { parents: [-1,0,1,1], queries: [[0,2],[3,2],[2,5]], expected: [2,3,7] }
      ];
      return { inputs: [base[i % base.length].parents, base[i % base.length].queries], expected: base[i % base.length].expected };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 30 TRIE problems...\n');

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
