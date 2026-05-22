import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, sql } from 'drizzle-orm';
import * as schema from './schema';
const { problems } = schema;

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

// ---------------------------------------------------------------------------
// Each entry maps a problem slug to stubs and runners per language.
// The runner is appended to user code before Piston execution.
// Format: "X/Y tests passed" in stdout → parsed by parseTestCounts().
//
// _t helper counts passes without stopping on failure (no assert).
// ---------------------------------------------------------------------------

const PY_T = `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    if result == expected:
        _pass += 1
`;

const JS_T = `
let _pass = 0, _total = 0;
function _t(r, e) { _total++; if (JSON.stringify(r) === JSON.stringify(e)) _pass++; }
`;

const TS_T = `
let _pass = 0, _total = 0;
function _t(r: any, e: any): void { _total++; if (JSON.stringify(r) === JSON.stringify(e)) _pass++; }
`;

// Opens a main() block with a scalar comparison helper. Each runner that uses
// this template must close it with a `}` after the final println.
const KT_T = `
fun main() {
var _pass = 0; var _total = 0
fun _t(r: Any?, e: Any?) { _total++; if (r == e) _pass++ }`;

type LangMap = Record<'python' | 'javascript' | 'typescript' | 'kotlin', string>;

const TEST_DATA: Record<string, { stubs: LangMap; runners: LangMap }> = {

  // ── TWO POINTERS ──────────────────────────────────────────────────────────

  'valid-palindrome': {
    stubs: {
      python: `def is_palindrome(s: str) -> bool:
    pass`,
      javascript: `function isPalindrome(s) {

}`,
      typescript: `function isPalindrome(s: string): boolean {

}`,
      kotlin: `fun isPalindrome(s: String): Boolean {
    return false
}`,
    },
    runners: {
      python: `${PY_T}
_t(is_palindrome("A man, a plan, a canal: Panama"), True,  "basic palindrome")
_t(is_palindrome("race a car"),                    False, "not a palindrome")
_t(is_palindrome(" "),                             True,  "single space")
_t(is_palindrome(""),                              True,  "empty string")
_t(is_palindrome("a"),                             True,  "single char")
_t(is_palindrome("0P"),                            False, "alphanumeric mismatch")
_t(is_palindrome("Was it a car or a cat I saw?"),  True,  "phrase palindrome")
_t(is_palindrome("No lemon, no melon"),            True,  "classic phrase")
print(f"{_pass}/{_total} tests passed")`,
      javascript: `${JS_T}
_t(isPalindrome("A man, a plan, a canal: Panama"), true);
_t(isPalindrome("race a car"), false);
_t(isPalindrome(" "), true);
_t(isPalindrome(""), true);
_t(isPalindrome("a"), true);
_t(isPalindrome("0P"), false);
_t(isPalindrome("Was it a car or a cat I saw?"), true);
_t(isPalindrome("No lemon, no melon"), true);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `${TS_T}
_t(isPalindrome("A man, a plan, a canal: Panama"), true);
_t(isPalindrome("race a car"), false);
_t(isPalindrome(" "), true);
_t(isPalindrome(""), true);
_t(isPalindrome("a"), true);
_t(isPalindrome("0P"), false);
_t(isPalindrome("Was it a car or a cat I saw?"), true);
_t(isPalindrome("No lemon, no melon"), true);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `${KT_T}
_t(isPalindrome("A man, a plan, a canal: Panama"), true)
_t(isPalindrome("race a car"), false)
_t(isPalindrome(" "), true)
_t(isPalindrome(""), true)
_t(isPalindrome("a"), true)
_t(isPalindrome("0P"), false)
_t(isPalindrome("Was it a car or a cat I saw?"), true)
_t(isPalindrome("No lemon, no melon"), true)
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  'container-with-most-water': {
    stubs: {
      python: `def max_area(height: list) -> int:
    pass`,
      javascript: `function maxArea(height) {

}`,
      typescript: `function maxArea(height: number[]): number {

}`,
      kotlin: `fun maxArea(height: IntArray): Int {
    return 0
}`,
    },
    runners: {
      python: `${PY_T}
_t(max_area([1,8,6,2,5,4,8,3,7]), 49,  "standard case")
_t(max_area([1,1]),                1,   "two elements equal")
_t(max_area([4,3,2,1,4]),          16,  "equal bookends")
_t(max_area([1,2,1]),              2,   "three elements")
_t(max_area([2,3,4,5,18,17,6]),    17,  "skewed heights")
_t(max_area([1,8,100,2,100,4,8,3,7]), 200, "tall inner walls")
print(f"{_pass}/{_total} tests passed")`,
      javascript: `${JS_T}
_t(maxArea([1,8,6,2,5,4,8,3,7]), 49);
_t(maxArea([1,1]), 1);
_t(maxArea([4,3,2,1,4]), 16);
_t(maxArea([1,2,1]), 2);
_t(maxArea([2,3,4,5,18,17,6]), 17);
_t(maxArea([1,8,100,2,100,4,8,3,7]), 200);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `${TS_T}
_t(maxArea([1,8,6,2,5,4,8,3,7]), 49);
_t(maxArea([1,1]), 1);
_t(maxArea([4,3,2,1,4]), 16);
_t(maxArea([1,2,1]), 2);
_t(maxArea([2,3,4,5,18,17,6]), 17);
_t(maxArea([1,8,100,2,100,4,8,3,7]), 200);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `${KT_T}
_t(maxArea(intArrayOf(1,8,6,2,5,4,8,3,7)), 49)
_t(maxArea(intArrayOf(1,1)), 1)
_t(maxArea(intArrayOf(4,3,2,1,4)), 16)
_t(maxArea(intArrayOf(1,2,1)), 2)
_t(maxArea(intArrayOf(2,3,4,5,18,17,6)), 17)
_t(maxArea(intArrayOf(1,8,100,2,100,4,8,3,7)), 200)
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── SLIDING WINDOW ────────────────────────────────────────────────────────

  'longest-substring-without-repeating-characters': {
    stubs: {
      python: `def length_of_longest_substring(s: str) -> int:
    pass`,
      javascript: `function lengthOfLongestSubstring(s) {

}`,
      typescript: `function lengthOfLongestSubstring(s: string): number {

}`,
      kotlin: `fun lengthOfLongestSubstring(s: String): Int {
    return 0
}`,
    },
    runners: {
      python: `${PY_T}
_t(length_of_longest_substring("abcabcbb"), 3)
_t(length_of_longest_substring("bbbbb"),   1)
_t(length_of_longest_substring("pwwkew"),  3)
_t(length_of_longest_substring(""),        0)
_t(length_of_longest_substring(" "),       1)
_t(length_of_longest_substring("dvdf"),    3)
_t(length_of_longest_substring("abba"),    2)
_t(length_of_longest_substring("tmmzuxt"), 5)
print(f"{_pass}/{_total} tests passed")`,
      javascript: `${JS_T}
_t(lengthOfLongestSubstring("abcabcbb"), 3);
_t(lengthOfLongestSubstring("bbbbb"), 1);
_t(lengthOfLongestSubstring("pwwkew"), 3);
_t(lengthOfLongestSubstring(""), 0);
_t(lengthOfLongestSubstring(" "), 1);
_t(lengthOfLongestSubstring("dvdf"), 3);
_t(lengthOfLongestSubstring("abba"), 2);
_t(lengthOfLongestSubstring("tmmzuxt"), 5);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `${TS_T}
_t(lengthOfLongestSubstring("abcabcbb"), 3);
_t(lengthOfLongestSubstring("bbbbb"), 1);
_t(lengthOfLongestSubstring("pwwkew"), 3);
_t(lengthOfLongestSubstring(""), 0);
_t(lengthOfLongestSubstring(" "), 1);
_t(lengthOfLongestSubstring("dvdf"), 3);
_t(lengthOfLongestSubstring("abba"), 2);
_t(lengthOfLongestSubstring("tmmzuxt"), 5);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `${KT_T}
_t(lengthOfLongestSubstring("abcabcbb"), 3)
_t(lengthOfLongestSubstring("bbbbb"), 1)
_t(lengthOfLongestSubstring("pwwkew"), 3)
_t(lengthOfLongestSubstring(""), 0)
_t(lengthOfLongestSubstring(" "), 1)
_t(lengthOfLongestSubstring("dvdf"), 3)
_t(lengthOfLongestSubstring("abba"), 2)
_t(lengthOfLongestSubstring("tmmzuxt"), 5)
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── FAST & SLOW POINTERS ─────────────────────────────────────────────────

  'linked-list-cycle': {
    stubs: {
      python: `class ListNode:
    def __init__(self, x):
        self.val = x
        self.next = None

def has_cycle(head) -> bool:
    pass`,
      javascript: `class ListNode {
  constructor(val) { this.val = val; this.next = null; }
}
function hasCycle(head) {

}`,
      typescript: `class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val: number) { this.val = val; this.next = null; }
}
function hasCycle(head: ListNode | null): boolean {

}`,
      kotlin: `class ListNode(var \`val\`: Int) {
    var next: ListNode? = null
}

fun hasCycle(head: ListNode?): Boolean {
    return false
}`,
    },
    runners: {
      python: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    if result == expected:
        _pass += 1

n = [ListNode(v) for v in [3,2,0,-4]]
for i in range(3): n[i].next = n[i+1]
n[3].next = n[1]
_t(has_cycle(n[0]),  True,  "cycle at pos 1")
a, b = ListNode(1), ListNode(2)
a.next = b; b.next = a
_t(has_cycle(a),     True,  "two-node cycle")
_t(has_cycle(ListNode(1)), False, "single node no cycle")
m = [ListNode(i) for i in range(1,5)]
for i in range(3): m[i].next = m[i+1]
_t(has_cycle(m[0]), False, "four nodes no cycle")
_t(has_cycle(None), False, "null head")
print(f"{_pass}/{_total} tests passed")`,
      javascript: `
let _pass = 0, _total = 0;
function _t(r, e) { _total++; if (r === e) _pass++; }
const n = [3,2,0,-4].map(v => new ListNode(v));
for (let i = 0; i < 3; i++) n[i].next = n[i+1];
n[3].next = n[1];
_t(hasCycle(n[0]), true);
const a = new ListNode(1), b = new ListNode(2);
a.next = b; b.next = a;
_t(hasCycle(a), true);
_t(hasCycle(new ListNode(1)), false);
const m = [1,2,3,4].map(v => new ListNode(v));
for (let i = 0; i < 3; i++) m[i].next = m[i+1];
_t(hasCycle(m[0]), false);
_t(hasCycle(null), false);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `
let _pass = 0, _total = 0;
function _t(r: boolean, e: boolean): void { _total++; if (r === e) _pass++; }
const n = [3,2,0,-4].map(v => new ListNode(v));
for (let i = 0; i < 3; i++) n[i].next = n[i+1];
n[3].next = n[1];
_t(hasCycle(n[0]), true);
const a = new ListNode(1), b = new ListNode(2);
a.next = b; b.next = a;
_t(hasCycle(a), true);
_t(hasCycle(new ListNode(1)), false);
const m = [1,2,3,4].map(v => new ListNode(v));
for (let i = 0; i < 3; i++) m[i].next = m[i+1];
_t(hasCycle(m[0]), false);
_t(hasCycle(null), false);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `
fun main() {
var _pass = 0; var _total = 0
fun _t(r: Boolean, e: Boolean) { _total++; if (r == e) _pass++ }
val n = listOf(3,2,0,-4).map { ListNode(it) }
for (i in 0..2) n[i].next = n[i+1]
n[3].next = n[1]
_t(hasCycle(n[0]), true)
val a = ListNode(1); val b = ListNode(2)
a.next = b; b.next = a
_t(hasCycle(a), true)
_t(hasCycle(ListNode(1)), false)
val m = listOf(1,2,3,4).map { ListNode(it) }
for (i in 0..2) m[i].next = m[i+1]
_t(hasCycle(m[0]), false)
_t(hasCycle(null), false)
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── BINARY SEARCH ─────────────────────────────────────────────────────────

  'binary-search': {
    stubs: {
      python: `def search(nums: list, target: int) -> int:
    pass`,
      javascript: `function search(nums, target) {

}`,
      typescript: `function search(nums: number[], target: number): number {

}`,
      kotlin: `fun search(nums: IntArray, target: Int): Int {
    return -1
}`,
    },
    runners: {
      python: `${PY_T}
_t(search([-1,0,3,5,9,12], 9),   4)
_t(search([-1,0,3,5,9,12], 2),  -1)
_t(search([5], 5),               0)
_t(search([5], 3),              -1)
_t(search([-1,0,3,5,9,12], -1),  0)
_t(search([-1,0,3,5,9,12], 12),  5)
_t(search([1,3,5,7,9,11,13,15,17,19], 13), 6)
print(f"{_pass}/{_total} tests passed")`,
      javascript: `${JS_T}
_t(search([-1,0,3,5,9,12], 9), 4);
_t(search([-1,0,3,5,9,12], 2), -1);
_t(search([5], 5), 0);
_t(search([5], 3), -1);
_t(search([-1,0,3,5,9,12], -1), 0);
_t(search([-1,0,3,5,9,12], 12), 5);
_t(search([1,3,5,7,9,11,13,15,17,19], 13), 6);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `${TS_T}
_t(search([-1,0,3,5,9,12], 9), 4);
_t(search([-1,0,3,5,9,12], 2), -1);
_t(search([5], 5), 0);
_t(search([5], 3), -1);
_t(search([-1,0,3,5,9,12], -1), 0);
_t(search([-1,0,3,5,9,12], 12), 5);
_t(search([1,3,5,7,9,11,13,15,17,19], 13), 6);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `${KT_T}
_t(search(intArrayOf(-1,0,3,5,9,12), 9), 4)
_t(search(intArrayOf(-1,0,3,5,9,12), 2), -1)
_t(search(intArrayOf(5), 5), 0)
_t(search(intArrayOf(5), 3), -1)
_t(search(intArrayOf(-1,0,3,5,9,12), -1), 0)
_t(search(intArrayOf(-1,0,3,5,9,12), 12), 5)
_t(search(intArrayOf(1,3,5,7,9,11,13,15,17,19), 13), 6)
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  'search-in-rotated-sorted-array': {
    stubs: {
      python: `def search(nums: list, target: int) -> int:
    pass`,
      javascript: `function search(nums, target) {

}`,
      typescript: `function search(nums: number[], target: number): number {

}`,
      kotlin: `fun search(nums: IntArray, target: Int): Int {
    return -1
}`,
    },
    runners: {
      python: `${PY_T}
_t(search([4,5,6,7,0,1,2], 0),  4)
_t(search([4,5,6,7,0,1,2], 3), -1)
_t(search([1], 0),             -1)
_t(search([1], 1),              0)
_t(search([3,1], 1),            1)
_t(search([5,1,3], 5),          0)
_t(search([4,5,6,7,0,1,2], 4),  0)
_t(search([4,5,6,7,0,1,2], 2),  6)
print(f"{_pass}/{_total} tests passed")`,
      javascript: `${JS_T}
_t(search([4,5,6,7,0,1,2], 0), 4);
_t(search([4,5,6,7,0,1,2], 3), -1);
_t(search([1], 0), -1);
_t(search([1], 1), 0);
_t(search([3,1], 1), 1);
_t(search([5,1,3], 5), 0);
_t(search([4,5,6,7,0,1,2], 4), 0);
_t(search([4,5,6,7,0,1,2], 2), 6);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `${TS_T}
_t(search([4,5,6,7,0,1,2], 0), 4);
_t(search([4,5,6,7,0,1,2], 3), -1);
_t(search([1], 0), -1);
_t(search([1], 1), 0);
_t(search([3,1], 1), 1);
_t(search([5,1,3], 5), 0);
_t(search([4,5,6,7,0,1,2], 4), 0);
_t(search([4,5,6,7,0,1,2], 2), 6);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `${KT_T}
_t(search(intArrayOf(4,5,6,7,0,1,2), 0), 4)
_t(search(intArrayOf(4,5,6,7,0,1,2), 3), -1)
_t(search(intArrayOf(1), 0), -1)
_t(search(intArrayOf(1), 1), 0)
_t(search(intArrayOf(3,1), 1), 1)
_t(search(intArrayOf(5,1,3), 5), 0)
_t(search(intArrayOf(4,5,6,7,0,1,2), 4), 0)
_t(search(intArrayOf(4,5,6,7,0,1,2), 2), 6)
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── BFS ───────────────────────────────────────────────────────────────────

  'number-of-islands': {
    stubs: {
      python: `def num_islands(grid: list) -> int:
    pass`,
      javascript: `function numIslands(grid) {

}`,
      typescript: `function numIslands(grid: string[][]): number {

}`,
      kotlin: `fun numIslands(grid: Array<CharArray>): Int {
    return 0
}`,
    },
    runners: {
      python: `
import copy
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    if result == expected:
        _pass += 1

g1 = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]
g2 = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]
g3 = [["1","0","0"],["0","1","0"],["0","0","1"]]
g4 = [["0","0","0"],["0","0","0"]]
g5 = [["1"]]
g6 = [["1","1","1"],["0","1","0"],["1","1","1"]]
_t(num_islands(copy.deepcopy(g1)), 1)
_t(num_islands(copy.deepcopy(g2)), 3)
_t(num_islands(copy.deepcopy(g3)), 3)
_t(num_islands(copy.deepcopy(g4)), 0)
_t(num_islands(copy.deepcopy(g5)), 1)
_t(num_islands(copy.deepcopy(g6)), 1)
print(f"{_pass}/{_total} tests passed")`,
      javascript: `${JS_T}
const g1=[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]];
const g2=[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]];
const g3=[["1","0","0"],["0","1","0"],["0","0","1"]];
const g4=[["0","0","0"],["0","0","0"]];
const g5=[["1"]];
const g6=[["1","1","1"],["0","1","0"],["1","1","1"]];
const dc = g => g.map(r => [...r]);
_t(numIslands(dc(g1)), 1);
_t(numIslands(dc(g2)), 3);
_t(numIslands(dc(g3)), 3);
_t(numIslands(dc(g4)), 0);
_t(numIslands(dc(g5)), 1);
_t(numIslands(dc(g6)), 1);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `${TS_T}
const g1=[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]];
const g2=[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]];
const g3=[["1","0","0"],["0","1","0"],["0","0","1"]];
const g4=[["0","0","0"],["0","0","0"]];
const g5=[["1"]];
const g6=[["1","1","1"],["0","1","0"],["1","1","1"]];
const dc = (g: string[][]) => g.map(r => [...r]);
_t(numIslands(dc(g1)), 1);
_t(numIslands(dc(g2)), 3);
_t(numIslands(dc(g3)), 3);
_t(numIslands(dc(g4)), 0);
_t(numIslands(dc(g5)), 1);
_t(numIslands(dc(g6)), 1);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `
fun main() {
var _pass = 0; var _total = 0
fun _t(r: Int, e: Int) { _total++; if (r == e) _pass++ }
fun dc(g: Array<CharArray>): Array<CharArray> = Array(g.size) { g[it].copyOf() }
val g1 = arrayOf(charArrayOf('1','1','1','1','0'),charArrayOf('1','1','0','1','0'),charArrayOf('1','1','0','0','0'),charArrayOf('0','0','0','0','0'))
val g2 = arrayOf(charArrayOf('1','1','0','0','0'),charArrayOf('1','1','0','0','0'),charArrayOf('0','0','1','0','0'),charArrayOf('0','0','0','1','1'))
val g3 = arrayOf(charArrayOf('1','0','0'),charArrayOf('0','1','0'),charArrayOf('0','0','1'))
val g4 = arrayOf(charArrayOf('0','0','0'),charArrayOf('0','0','0'))
val g5 = arrayOf(charArrayOf('1'))
val g6 = arrayOf(charArrayOf('1','1','1'),charArrayOf('0','1','0'),charArrayOf('1','1','1'))
_t(numIslands(dc(g1)), 1)
_t(numIslands(dc(g2)), 3)
_t(numIslands(dc(g3)), 3)
_t(numIslands(dc(g4)), 0)
_t(numIslands(dc(g5)), 1)
_t(numIslands(dc(g6)), 1)
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── DFS / BACKTRACKING ────────────────────────────────────────────────────

  'subsets': {
    stubs: {
      python: `def subsets(nums: list) -> list:
    pass`,
      javascript: `function subsets(nums) {

}`,
      typescript: `function subsets(nums: number[]): number[][] {

}`,
      kotlin: `fun subsets(nums: IntArray): List<List<Int>> {
    return emptyList()
}`,
    },
    runners: {
      python: `
_pass = _total = 0
def _t(result, expected_count, expected_contains, label=""):
    global _pass, _total
    _total += 1
    result_sorted = sorted([sorted(s) for s in result])
    if len(result) == expected_count and all(sorted(sub) in result_sorted for sub in expected_contains):
        _pass += 1

_t(subsets([1,2,3]), 8,  [[], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]])
_t(subsets([0]),     2,  [[], [0]])
_t(subsets([]),      1,  [[]])
_t(subsets([1,2]),   4,  [[], [1], [2], [1,2]])
_t(subsets([1,2,3,4]), 16, [[], [4], [1,4], [2,3,4], [1,2,3,4]])
print(f"{_pass}/{_total} tests passed")`,
      javascript: `
let _pass = 0, _total = 0;
function _t(r, expectedCount, expectedContains) {
  _total++;
  const sorted = r.map(s => [...s].sort((a,b) => a-b));
  const has = sub => sorted.some(s => JSON.stringify(s) === JSON.stringify([...sub].sort((a,b) => a-b)));
  if (r.length === expectedCount && expectedContains.every(has)) _pass++;
}
_t(subsets([1,2,3]), 8, [[], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]]);
_t(subsets([0]), 2, [[], [0]]);
_t(subsets([]), 1, [[]]);
_t(subsets([1,2]), 4, [[], [1], [2], [1,2]]);
_t(subsets([1,2,3,4]), 16, [[], [4], [1,4], [2,3,4], [1,2,3,4]]);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `
let _pass = 0, _total = 0;
function _t(r: number[][], expectedCount: number, expectedContains: number[][]): void {
  _total++;
  const sorted = r.map(s => [...s].sort((a,b) => a-b));
  const has = (sub: number[]) => sorted.some(s => JSON.stringify(s) === JSON.stringify([...sub].sort((a,b) => a-b)));
  if (r.length === expectedCount && expectedContains.every(has)) _pass++;
}
_t(subsets([1,2,3]), 8, [[], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]]);
_t(subsets([0]), 2, [[], [0]]);
_t(subsets([]), 1, [[]]);
_t(subsets([1,2]), 4, [[], [1], [2], [1,2]]);
_t(subsets([1,2,3,4]), 16, [[], [4], [1,4], [2,3,4], [1,2,3,4]]);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `
fun main() {
var _pass = 0; var _total = 0
fun _t(r: List<List<Int>>, expectedCount: Int, expectedContains: List<List<Int>>) {
    _total++
    val sorted = r.map { it.sorted() }
    if (r.size == expectedCount && expectedContains.all { sub -> sorted.any { it == sub.sorted() } }) _pass++
}
_t(subsets(intArrayOf(1,2,3)), 8, listOf(listOf(),listOf(1),listOf(2),listOf(3),listOf(1,2),listOf(1,3),listOf(2,3),listOf(1,2,3)))
_t(subsets(intArrayOf(0)), 2, listOf(listOf(),listOf(0)))
_t(subsets(intArrayOf()), 1, listOf(listOf()))
_t(subsets(intArrayOf(1,2)), 4, listOf(listOf(),listOf(1),listOf(2),listOf(1,2)))
_t(subsets(intArrayOf(1,2,3,4)), 16, listOf(listOf(),listOf(4),listOf(1,4),listOf(2,3,4),listOf(1,2,3,4)))
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── DP 1D ─────────────────────────────────────────────────────────────────

  'climbing-stairs': {
    stubs: {
      python: `def climb_stairs(n: int) -> int:
    pass`,
      javascript: `function climbStairs(n) {

}`,
      typescript: `function climbStairs(n: number): number {

}`,
      kotlin: `fun climbStairs(n: Int): Int {
    return 0
}`,
    },
    runners: {
      python: `${PY_T}
_t(climb_stairs(1),  1)
_t(climb_stairs(2),  2)
_t(climb_stairs(3),  3)
_t(climb_stairs(4),  5)
_t(climb_stairs(5),  8)
_t(climb_stairs(10), 89)
_t(climb_stairs(20), 10946)
_t(climb_stairs(45), 1836311903)
print(f"{_pass}/{_total} tests passed")`,
      javascript: `${JS_T}
_t(climbStairs(1), 1);
_t(climbStairs(2), 2);
_t(climbStairs(3), 3);
_t(climbStairs(4), 5);
_t(climbStairs(5), 8);
_t(climbStairs(10), 89);
_t(climbStairs(20), 10946);
_t(climbStairs(45), 1836311903);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `${TS_T}
_t(climbStairs(1), 1);
_t(climbStairs(2), 2);
_t(climbStairs(3), 3);
_t(climbStairs(4), 5);
_t(climbStairs(5), 8);
_t(climbStairs(10), 89);
_t(climbStairs(20), 10946);
_t(climbStairs(45), 1836311903);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `${KT_T}
_t(climbStairs(1), 1)
_t(climbStairs(2), 2)
_t(climbStairs(3), 3)
_t(climbStairs(4), 5)
_t(climbStairs(5), 8)
_t(climbStairs(10), 89)
_t(climbStairs(20), 10946)
_t(climbStairs(45), 1836311903)
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  'house-robber': {
    stubs: {
      python: `def rob(nums: list) -> int:
    pass`,
      javascript: `function rob(nums) {

}`,
      typescript: `function rob(nums: number[]): number {

}`,
      kotlin: `fun rob(nums: IntArray): Int {
    return 0
}`,
    },
    runners: {
      python: `${PY_T}
_t(rob([1,2,3,1]),   4)
_t(rob([2,7,9,3,1]), 12)
_t(rob([0]),         0)
_t(rob([5]),         5)
_t(rob([2,1]),       2)
_t(rob([1,1,1]),     2)
_t(rob([100,1,1,100]), 200)
_t(rob([2,1,1,2]),   4)
print(f"{_pass}/{_total} tests passed")`,
      javascript: `${JS_T}
_t(rob([1,2,3,1]), 4);
_t(rob([2,7,9,3,1]), 12);
_t(rob([0]), 0);
_t(rob([5]), 5);
_t(rob([2,1]), 2);
_t(rob([1,1,1]), 2);
_t(rob([100,1,1,100]), 200);
_t(rob([2,1,1,2]), 4);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `${TS_T}
_t(rob([1,2,3,1]), 4);
_t(rob([2,7,9,3,1]), 12);
_t(rob([0]), 0);
_t(rob([5]), 5);
_t(rob([2,1]), 2);
_t(rob([1,1,1]), 2);
_t(rob([100,1,1,100]), 200);
_t(rob([2,1,1,2]), 4);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `${KT_T}
_t(rob(intArrayOf(1,2,3,1)), 4)
_t(rob(intArrayOf(2,7,9,3,1)), 12)
_t(rob(intArrayOf(0)), 0)
_t(rob(intArrayOf(5)), 5)
_t(rob(intArrayOf(2,1)), 2)
_t(rob(intArrayOf(1,1,1)), 2)
_t(rob(intArrayOf(100,1,1,100)), 200)
_t(rob(intArrayOf(2,1,1,2)), 4)
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── DP 2D ─────────────────────────────────────────────────────────────────

  'unique-paths': {
    stubs: {
      python: `def unique_paths(m: int, n: int) -> int:
    pass`,
      javascript: `function uniquePaths(m, n) {

}`,
      typescript: `function uniquePaths(m: number, n: number): number {

}`,
      kotlin: `fun uniquePaths(m: Int, n: Int): Int {
    return 0
}`,
    },
    runners: {
      python: `${PY_T}
_t(unique_paths(3, 7),  28)
_t(unique_paths(3, 2),  3)
_t(unique_paths(1, 1),  1)
_t(unique_paths(1, 10), 1)
_t(unique_paths(10, 1), 1)
_t(unique_paths(2, 2),  2)
_t(unique_paths(3, 3),  6)
_t(unique_paths(5, 5),  70)
_t(unique_paths(7, 3),  28)
print(f"{_pass}/{_total} tests passed")`,
      javascript: `${JS_T}
_t(uniquePaths(3, 7), 28);
_t(uniquePaths(3, 2), 3);
_t(uniquePaths(1, 1), 1);
_t(uniquePaths(1, 10), 1);
_t(uniquePaths(10, 1), 1);
_t(uniquePaths(2, 2), 2);
_t(uniquePaths(3, 3), 6);
_t(uniquePaths(5, 5), 70);
_t(uniquePaths(7, 3), 28);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `${TS_T}
_t(uniquePaths(3, 7), 28);
_t(uniquePaths(3, 2), 3);
_t(uniquePaths(1, 1), 1);
_t(uniquePaths(1, 10), 1);
_t(uniquePaths(10, 1), 1);
_t(uniquePaths(2, 2), 2);
_t(uniquePaths(3, 3), 6);
_t(uniquePaths(5, 5), 70);
_t(uniquePaths(7, 3), 28);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `${KT_T}
_t(uniquePaths(3, 7), 28)
_t(uniquePaths(3, 2), 3)
_t(uniquePaths(1, 1), 1)
_t(uniquePaths(1, 10), 1)
_t(uniquePaths(10, 1), 1)
_t(uniquePaths(2, 2), 2)
_t(uniquePaths(3, 3), 6)
_t(uniquePaths(5, 5), 70)
_t(uniquePaths(7, 3), 28)
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── MONOTONIC STACK ───────────────────────────────────────────────────────

  'daily-temperatures': {
    stubs: {
      python: `def daily_temperatures(temperatures: list) -> list:
    pass`,
      javascript: `function dailyTemperatures(temperatures) {

}`,
      typescript: `function dailyTemperatures(temperatures: number[]): number[] {

}`,
      kotlin: `fun dailyTemperatures(temperatures: IntArray): IntArray {
    return intArrayOf()
}`,
    },
    runners: {
      python: `${PY_T}
_t(daily_temperatures([73,74,75,71,69,72,76,73]), [1,1,4,2,1,1,0,0])
_t(daily_temperatures([30,40,50,60]),             [1,1,1,0])
_t(daily_temperatures([30,60,90]),                [1,1,0])
_t(daily_temperatures([90,80,70,60]),             [0,0,0,0])
_t(daily_temperatures([50]),                      [0])
_t(daily_temperatures([55,55,55]),                [0,0,0])
_t(daily_temperatures([34,80,80,34,80]),          [1,0,0,1,0])
print(f"{_pass}/{_total} tests passed")`,
      javascript: `${JS_T}
_t(dailyTemperatures([73,74,75,71,69,72,76,73]), [1,1,4,2,1,1,0,0]);
_t(dailyTemperatures([30,40,50,60]), [1,1,1,0]);
_t(dailyTemperatures([30,60,90]), [1,1,0]);
_t(dailyTemperatures([90,80,70,60]), [0,0,0,0]);
_t(dailyTemperatures([50]), [0]);
_t(dailyTemperatures([55,55,55]), [0,0,0]);
_t(dailyTemperatures([34,80,80,34,80]), [1,0,0,1,0]);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `${TS_T}
_t(dailyTemperatures([73,74,75,71,69,72,76,73]), [1,1,4,2,1,1,0,0]);
_t(dailyTemperatures([30,40,50,60]), [1,1,1,0]);
_t(dailyTemperatures([30,60,90]), [1,1,0]);
_t(dailyTemperatures([90,80,70,60]), [0,0,0,0]);
_t(dailyTemperatures([50]), [0]);
_t(dailyTemperatures([55,55,55]), [0,0,0]);
_t(dailyTemperatures([34,80,80,34,80]), [1,0,0,1,0]);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `
fun main() {
var _pass = 0; var _total = 0
fun _t(r: IntArray, e: IntArray) { _total++; if (r.contentEquals(e)) _pass++ }
_t(dailyTemperatures(intArrayOf(73,74,75,71,69,72,76,73)), intArrayOf(1,1,4,2,1,1,0,0))
_t(dailyTemperatures(intArrayOf(30,40,50,60)), intArrayOf(1,1,1,0))
_t(dailyTemperatures(intArrayOf(30,60,90)), intArrayOf(1,1,0))
_t(dailyTemperatures(intArrayOf(90,80,70,60)), intArrayOf(0,0,0,0))
_t(dailyTemperatures(intArrayOf(50)), intArrayOf(0))
_t(dailyTemperatures(intArrayOf(55,55,55)), intArrayOf(0,0,0))
_t(dailyTemperatures(intArrayOf(34,80,80,34,80)), intArrayOf(1,0,0,1,0))
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── HEAP ──────────────────────────────────────────────────────────────────

  'kth-largest-element-in-an-array': {
    stubs: {
      python: `def find_kth_largest(nums: list, k: int) -> int:
    pass`,
      javascript: `function findKthLargest(nums, k) {

}`,
      typescript: `function findKthLargest(nums: number[], k: number): number {

}`,
      kotlin: `fun findKthLargest(nums: IntArray, k: Int): Int {
    return 0
}`,
    },
    runners: {
      python: `${PY_T}
_t(find_kth_largest([3,2,1,5,6,4], 2),          5)
_t(find_kth_largest([3,2,3,1,2,4,5,5,6], 4),    4)
_t(find_kth_largest([1], 1),                     1)
_t(find_kth_largest([2,1], 1),                   2)
_t(find_kth_largest([2,1], 2),                   1)
_t(find_kth_largest([7,6,5,4,3,2,1], 5),         3)
_t(find_kth_largest([-1,-2,-3,-4,-5], 2),        -2)
_t(find_kth_largest([3,3,3,3,3], 3),              3)
print(f"{_pass}/{_total} tests passed")`,
      javascript: `${JS_T}
_t(findKthLargest([3,2,1,5,6,4], 2), 5);
_t(findKthLargest([3,2,3,1,2,4,5,5,6], 4), 4);
_t(findKthLargest([1], 1), 1);
_t(findKthLargest([2,1], 1), 2);
_t(findKthLargest([2,1], 2), 1);
_t(findKthLargest([7,6,5,4,3,2,1], 5), 3);
_t(findKthLargest([-1,-2,-3,-4,-5], 2), -2);
_t(findKthLargest([3,3,3,3,3], 3), 3);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `${TS_T}
_t(findKthLargest([3,2,1,5,6,4], 2), 5);
_t(findKthLargest([3,2,3,1,2,4,5,5,6], 4), 4);
_t(findKthLargest([1], 1), 1);
_t(findKthLargest([2,1], 1), 2);
_t(findKthLargest([2,1], 2), 1);
_t(findKthLargest([7,6,5,4,3,2,1], 5), 3);
_t(findKthLargest([-1,-2,-3,-4,-5], 2), -2);
_t(findKthLargest([3,3,3,3,3], 3), 3);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `${KT_T}
_t(findKthLargest(intArrayOf(3,2,1,5,6,4), 2), 5)
_t(findKthLargest(intArrayOf(3,2,3,1,2,4,5,5,6), 4), 4)
_t(findKthLargest(intArrayOf(1), 1), 1)
_t(findKthLargest(intArrayOf(2,1), 1), 2)
_t(findKthLargest(intArrayOf(2,1), 2), 1)
_t(findKthLargest(intArrayOf(7,6,5,4,3,2,1), 5), 3)
_t(findKthLargest(intArrayOf(-1,-2,-3,-4,-5), 2), -2)
_t(findKthLargest(intArrayOf(3,3,3,3,3), 3), 3)
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── INTERVALS ─────────────────────────────────────────────────────────────

  'merge-intervals': {
    stubs: {
      python: `def merge(intervals: list) -> list:
    pass`,
      javascript: `function merge(intervals) {

}`,
      typescript: `function merge(intervals: number[][]): number[][] {

}`,
      kotlin: `fun merge(intervals: Array<IntArray>): Array<IntArray> {
    return emptyArray()
}`,
    },
    runners: {
      python: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    if sorted([sorted(i) for i in result]) == sorted([sorted(i) for i in expected]):
        _pass += 1

_t(merge([[1,3],[2,6],[8,10],[15,18]]), [[1,6],[8,10],[15,18]])
_t(merge([[1,4],[4,5]]),               [[1,5]])
_t(merge([[1,4],[2,3]]),               [[1,4]])
_t(merge([[1,4]]),                     [[1,4]])
_t(merge([[1,3],[6,9]]),               [[1,3],[6,9]])
_t(merge([[2,3],[4,5],[6,7],[8,9],[1,10]]), [[1,10]])
_t(merge([[1,4],[0,4]]),               [[0,4]])
_t(merge([[1,4],[0,2],[3,5]]),         [[0,5]])
print(f"{_pass}/{_total} tests passed")`,
      javascript: `
let _pass = 0, _total = 0;
function _t(r, e) {
  _total++;
  const s = arr => arr.map(x => [...x].sort((a,b) => a-b)).sort((a,b) => a[0]-b[0]);
  if (JSON.stringify(s(r)) === JSON.stringify(s(e))) _pass++;
}
_t(merge([[1,3],[2,6],[8,10],[15,18]]), [[1,6],[8,10],[15,18]]);
_t(merge([[1,4],[4,5]]), [[1,5]]);
_t(merge([[1,4],[2,3]]), [[1,4]]);
_t(merge([[1,4]]), [[1,4]]);
_t(merge([[1,3],[6,9]]), [[1,3],[6,9]]);
_t(merge([[2,3],[4,5],[6,7],[8,9],[1,10]]), [[1,10]]);
_t(merge([[1,4],[0,4]]), [[0,4]]);
_t(merge([[1,4],[0,2],[3,5]]), [[0,5]]);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `
let _pass = 0, _total = 0;
function _t(r: number[][], e: number[][]): void {
  _total++;
  const s = (arr: number[][]) => arr.map(x => [...x].sort((a,b) => a-b)).sort((a,b) => a[0]-b[0]);
  if (JSON.stringify(s(r)) === JSON.stringify(s(e))) _pass++;
}
_t(merge([[1,3],[2,6],[8,10],[15,18]]), [[1,6],[8,10],[15,18]]);
_t(merge([[1,4],[4,5]]), [[1,5]]);
_t(merge([[1,4],[2,3]]), [[1,4]]);
_t(merge([[1,4]]), [[1,4]]);
_t(merge([[1,3],[6,9]]), [[1,3],[6,9]]);
_t(merge([[2,3],[4,5],[6,7],[8,9],[1,10]]), [[1,10]]);
_t(merge([[1,4],[0,4]]), [[0,4]]);
_t(merge([[1,4],[0,2],[3,5]]), [[0,5]]);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `
fun main() {
var _pass = 0; var _total = 0
fun _t(r: Array<IntArray>, e: Array<IntArray>) {
    _total++
    val s = { arr: Array<IntArray> -> arr.map { it.sorted() }.sortedWith(compareBy { it[0] }) }
    if (s(r) == s(e)) _pass++
}
_t(merge(arrayOf(intArrayOf(1,3),intArrayOf(2,6),intArrayOf(8,10),intArrayOf(15,18))), arrayOf(intArrayOf(1,6),intArrayOf(8,10),intArrayOf(15,18)))
_t(merge(arrayOf(intArrayOf(1,4),intArrayOf(4,5))), arrayOf(intArrayOf(1,5)))
_t(merge(arrayOf(intArrayOf(1,4),intArrayOf(2,3))), arrayOf(intArrayOf(1,4)))
_t(merge(arrayOf(intArrayOf(1,4))), arrayOf(intArrayOf(1,4)))
_t(merge(arrayOf(intArrayOf(1,3),intArrayOf(6,9))), arrayOf(intArrayOf(1,3),intArrayOf(6,9)))
_t(merge(arrayOf(intArrayOf(2,3),intArrayOf(4,5),intArrayOf(6,7),intArrayOf(8,9),intArrayOf(1,10))), arrayOf(intArrayOf(1,10)))
_t(merge(arrayOf(intArrayOf(1,4),intArrayOf(0,4))), arrayOf(intArrayOf(0,4)))
_t(merge(arrayOf(intArrayOf(1,4),intArrayOf(0,2),intArrayOf(3,5))), arrayOf(intArrayOf(0,5)))
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── UNION-FIND ────────────────────────────────────────────────────────────

  'number-of-connected-components': {
    stubs: {
      python: `def count_components(n: int, edges: list) -> int:
    pass`,
      javascript: `function countComponents(n, edges) {

}`,
      typescript: `function countComponents(n: number, edges: number[][]): number {

}`,
      kotlin: `fun countComponents(n: Int, edges: Array<IntArray>): Int {
    return 0
}`,
    },
    runners: {
      python: `${PY_T}
_t(count_components(5, [[0,1],[1,2],[3,4]]),       2)
_t(count_components(5, [[0,1],[1,2],[2,3],[3,4]]), 1)
_t(count_components(5, []),                        5)
_t(count_components(1, []),                        1)
_t(count_components(4, [[0,1],[2,3]]),             2)
_t(count_components(6, [[0,1],[0,2],[1,2],[3,4],[3,5],[4,5]]), 2)
_t(count_components(3, [[0,1],[0,2],[1,2]]),       1)
print(f"{_pass}/{_total} tests passed")`,
      javascript: `${JS_T}
_t(countComponents(5, [[0,1],[1,2],[3,4]]), 2);
_t(countComponents(5, [[0,1],[1,2],[2,3],[3,4]]), 1);
_t(countComponents(5, []), 5);
_t(countComponents(1, []), 1);
_t(countComponents(4, [[0,1],[2,3]]), 2);
_t(countComponents(6, [[0,1],[0,2],[1,2],[3,4],[3,5],[4,5]]), 2);
_t(countComponents(3, [[0,1],[0,2],[1,2]]), 1);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `${TS_T}
_t(countComponents(5, [[0,1],[1,2],[3,4]]), 2);
_t(countComponents(5, [[0,1],[1,2],[2,3],[3,4]]), 1);
_t(countComponents(5, []), 5);
_t(countComponents(1, []), 1);
_t(countComponents(4, [[0,1],[2,3]]), 2);
_t(countComponents(6, [[0,1],[0,2],[1,2],[3,4],[3,5],[4,5]]), 2);
_t(countComponents(3, [[0,1],[0,2],[1,2]]), 1);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `${KT_T}
_t(countComponents(5, arrayOf(intArrayOf(0,1),intArrayOf(1,2),intArrayOf(3,4))), 2)
_t(countComponents(5, arrayOf(intArrayOf(0,1),intArrayOf(1,2),intArrayOf(2,3),intArrayOf(3,4))), 1)
_t(countComponents(5, emptyArray()), 5)
_t(countComponents(1, emptyArray()), 1)
_t(countComponents(4, arrayOf(intArrayOf(0,1),intArrayOf(2,3))), 2)
_t(countComponents(6, arrayOf(intArrayOf(0,1),intArrayOf(0,2),intArrayOf(1,2),intArrayOf(3,4),intArrayOf(3,5),intArrayOf(4,5))), 2)
_t(countComponents(3, arrayOf(intArrayOf(0,1),intArrayOf(0,2),intArrayOf(1,2))), 1)
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── TRIE ──────────────────────────────────────────────────────────────────

  'implement-trie': {
    stubs: {
      python: `class Trie:
    def __init__(self):
        pass

    def insert(self, word: str) -> None:
        pass

    def search(self, word: str) -> bool:
        pass

    def startsWith(self, prefix: str) -> bool:
        pass`,
      javascript: `class Trie {
  constructor() {

  }
  insert(word) {

  }
  search(word) {

  }
  startsWith(prefix) {

  }
}`,
      typescript: `class Trie {
  constructor() {

  }
  insert(word: string): void {

  }
  search(word: string): boolean {
    return false;
  }
  startsWith(prefix: string): boolean {
    return false;
  }
}`,
      kotlin: `class Trie {
    fun insert(word: String) {
    }
    fun search(word: String): Boolean {
        return false
    }
    fun startsWith(prefix: String): Boolean {
        return false
    }
}`,
    },
    runners: {
      python: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    if result == expected:
        _pass += 1

t = Trie()
t.insert("apple")
_t(t.search("apple"),    True)
_t(t.search("app"),      False)
_t(t.startsWith("app"),  True)
t.insert("app")
_t(t.search("app"),      True)
_t(t.startsWith("ap"),   True)
_t(t.startsWith("b"),    False)
_t(t.search("appl"),     False)
t2 = Trie()
t2.insert("hello"); t2.insert("help"); t2.insert("world")
_t(t2.startsWith("hel"), True)
_t(t2.search("hell"),    False)
_t(t2.search("hello"),   True)
_t(t2.search("world"),   True)
print(f"{_pass}/{_total} tests passed")`,
      javascript: `${JS_T}
const t = new Trie();
t.insert("apple");
_t(t.search("apple"), true);
_t(t.search("app"), false);
_t(t.startsWith("app"), true);
t.insert("app");
_t(t.search("app"), true);
_t(t.startsWith("ap"), true);
_t(t.startsWith("b"), false);
_t(t.search("appl"), false);
const t2 = new Trie();
t2.insert("hello"); t2.insert("help"); t2.insert("world");
_t(t2.startsWith("hel"), true);
_t(t2.search("hell"), false);
_t(t2.search("hello"), true);
_t(t2.search("world"), true);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `${TS_T}
const t = new Trie();
t.insert("apple");
_t(t.search("apple"), true);
_t(t.search("app"), false);
_t(t.startsWith("app"), true);
t.insert("app");
_t(t.search("app"), true);
_t(t.startsWith("ap"), true);
_t(t.startsWith("b"), false);
_t(t.search("appl"), false);
const t2 = new Trie();
t2.insert("hello"); t2.insert("help"); t2.insert("world");
_t(t2.startsWith("hel"), true);
_t(t2.search("hell"), false);
_t(t2.search("hello"), true);
_t(t2.search("world"), true);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `${KT_T}
val t = Trie()
t.insert("apple")
_t(t.search("apple"), true)
_t(t.search("app"), false)
_t(t.startsWith("app"), true)
t.insert("app")
_t(t.search("app"), true)
_t(t.startsWith("ap"), true)
_t(t.startsWith("b"), false)
_t(t.search("appl"), false)
val t2 = Trie()
t2.insert("hello"); t2.insert("help"); t2.insert("world")
_t(t2.startsWith("hel"), true)
_t(t2.search("hell"), false)
_t(t2.search("hello"), true)
_t(t2.search("world"), true)
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── BIT MANIPULATION ──────────────────────────────────────────────────────

  'single-number': {
    stubs: {
      python: `def single_number(nums: list) -> int:
    pass`,
      javascript: `function singleNumber(nums) {

}`,
      typescript: `function singleNumber(nums: number[]): number {

}`,
      kotlin: `fun singleNumber(nums: IntArray): Int {
    return 0
}`,
    },
    runners: {
      python: `${PY_T}
_t(single_number([2,2,1]),       1)
_t(single_number([4,1,2,1,2]),   4)
_t(single_number([1]),           1)
_t(single_number([0,1,0]),       1)
_t(single_number([-1,-1,2]),     2)
_t(single_number([100,200,100]), 200)
_t(single_number([7,3,5,3,7,9,5,9,11]), 11)
print(f"{_pass}/{_total} tests passed")`,
      javascript: `${JS_T}
_t(singleNumber([2,2,1]), 1);
_t(singleNumber([4,1,2,1,2]), 4);
_t(singleNumber([1]), 1);
_t(singleNumber([0,1,0]), 1);
_t(singleNumber([-1,-1,2]), 2);
_t(singleNumber([100,200,100]), 200);
_t(singleNumber([7,3,5,3,7,9,5,9,11]), 11);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `${TS_T}
_t(singleNumber([2,2,1]), 1);
_t(singleNumber([4,1,2,1,2]), 4);
_t(singleNumber([1]), 1);
_t(singleNumber([0,1,0]), 1);
_t(singleNumber([-1,-1,2]), 2);
_t(singleNumber([100,200,100]), 200);
_t(singleNumber([7,3,5,3,7,9,5,9,11]), 11);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `${KT_T}
_t(singleNumber(intArrayOf(2,2,1)), 1)
_t(singleNumber(intArrayOf(4,1,2,1,2)), 4)
_t(singleNumber(intArrayOf(1)), 1)
_t(singleNumber(intArrayOf(0,1,0)), 1)
_t(singleNumber(intArrayOf(-1,-1,2)), 2)
_t(singleNumber(intArrayOf(100,200,100)), 200)
_t(singleNumber(intArrayOf(7,3,5,3,7,9,5,9,11)), 11)
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── LINKED LISTS ──────────────────────────────────────────────────────────

  'reverse-linked-list': {
    stubs: {
      python: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def reverse_list(head):
    pass`,
      javascript: `class ListNode {
  constructor(val = 0, next = null) { this.val = val; this.next = next; }
}
function reverseList(head) {

}`,
      typescript: `class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val: number = 0, next: ListNode | null = null) { this.val = val; this.next = next; }
}
function reverseList(head: ListNode | null): ListNode | null {

}`,
      kotlin: `class ListNode(var \`val\`: Int = 0, var next: ListNode? = null)

fun reverseList(head: ListNode?): ListNode? {
    return null
}`,
    },
    runners: {
      python: `
def _make(vals):
    if not vals: return None
    h = ListNode(vals[0]); c = h
    for v in vals[1:]: c.next = ListNode(v); c = c.next
    return h
def _toArr(head):
    r = []
    while head: r.append(head.val); head = head.next
    return r
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    if _toArr(result) == expected:
        _pass += 1

_t(reverse_list(_make([1,2,3,4,5])), [5,4,3,2,1])
_t(reverse_list(_make([1,2])),       [2,1])
_t(reverse_list(_make([1])),         [1])
_t(reverse_list(None),               [])
_t(reverse_list(_make([1,2,3])),     [3,2,1])
print(f"{_pass}/{_total} tests passed")`,
      javascript: `
function _make(vals) {
  if (!vals.length) return null;
  const h = new ListNode(vals[0]); let c = h;
  for (let i = 1; i < vals.length; i++) { c.next = new ListNode(vals[i]); c = c.next; }
  return h;
}
function _toArr(h) { const r = []; while (h) { r.push(h.val); h = h.next; } return r; }
let _pass = 0, _total = 0;
function _t(r, e) { _total++; if (JSON.stringify(_toArr(r)) === JSON.stringify(e)) _pass++; }
_t(reverseList(_make([1,2,3,4,5])), [5,4,3,2,1]);
_t(reverseList(_make([1,2])), [2,1]);
_t(reverseList(_make([1])), [1]);
_t(reverseList(null), []);
_t(reverseList(_make([1,2,3])), [3,2,1]);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `
function _make(vals: number[]): ListNode | null {
  if (!vals.length) return null;
  const h = new ListNode(vals[0]); let c = h;
  for (let i = 1; i < vals.length; i++) { c.next = new ListNode(vals[i]); c = c.next; }
  return h;
}
function _toArr(h: ListNode | null): number[] { const r: number[] = []; while (h) { r.push(h.val); h = h.next; } return r; }
let _pass = 0, _total = 0;
function _t(r: ListNode | null, e: number[]): void { _total++; if (JSON.stringify(_toArr(r)) === JSON.stringify(e)) _pass++; }
_t(reverseList(_make([1,2,3,4,5])), [5,4,3,2,1]);
_t(reverseList(_make([1,2])), [2,1]);
_t(reverseList(_make([1])), [1]);
_t(reverseList(null), []);
_t(reverseList(_make([1,2,3])), [3,2,1]);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `
fun main() {
fun _make(vals: List<Int>): ListNode? {
    if (vals.isEmpty()) return null
    val h = ListNode(vals[0]); var c = h
    for (i in 1 until vals.size) { c.next = ListNode(vals[i]); c = c.next!! }
    return h
}
fun _toArr(h: ListNode?): List<Int> {
    val r = mutableListOf<Int>(); var n = h
    while (n != null) { r.add(n.\`val\`); n = n.next }
    return r
}
var _pass = 0; var _total = 0
fun _t(r: ListNode?, e: List<Int>) { _total++; if (_toArr(r) == e) _pass++ }
_t(reverseList(_make(listOf(1,2,3,4,5))), listOf(5,4,3,2,1))
_t(reverseList(_make(listOf(1,2))), listOf(2,1))
_t(reverseList(_make(listOf(1))), listOf(1))
_t(reverseList(null), listOf<Int>())
_t(reverseList(_make(listOf(1,2,3))), listOf(3,2,1))
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── HASH MAPS ─────────────────────────────────────────────────────────────

  'two-sum': {
    stubs: {
      python: `def two_sum(nums: list, target: int) -> list:
    pass`,
      javascript: `function twoSum(nums, target) {

}`,
      typescript: `function twoSum(nums: number[], target: number): number[] {

}`,
      kotlin: `fun twoSum(nums: IntArray, target: Int): IntArray {
    return intArrayOf()
}`,
    },
    runners: {
      python: `
_pass = _total = 0
def _t(result, expected_options, label=""):
    global _pass, _total
    _total += 1
    if result in expected_options:
        _pass += 1

_t(two_sum([2,7,11,15], 9),    [[0,1]])
_t(two_sum([3,2,4], 6),        [[1,2]])
_t(two_sum([3,3], 6),          [[0,1]])
_t(two_sum([0,4,3,0], 0),      [[0,3]])
_t(two_sum([-3,4,3,90], 0),    [[0,2]])
_t(two_sum([1,2,3,4,5], 9),    [[3,4]])
_t(two_sum([-1,-2,-3,-4,-5], -8), [[2,4]])
print(f"{_pass}/{_total} tests passed")`,
      javascript: `
let _pass = 0, _total = 0;
function _t(r, options) {
  _total++;
  const s = x => JSON.stringify([...x].sort((a,b) => a-b));
  if (options.some(o => s(r) === s(o))) _pass++;
}
_t(twoSum([2,7,11,15], 9), [[0,1]]);
_t(twoSum([3,2,4], 6), [[1,2]]);
_t(twoSum([3,3], 6), [[0,1]]);
_t(twoSum([0,4,3,0], 0), [[0,3]]);
_t(twoSum([-3,4,3,90], 0), [[0,2]]);
_t(twoSum([1,2,3,4,5], 9), [[3,4]]);
_t(twoSum([-1,-2,-3,-4,-5], -8), [[2,4]]);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `
let _pass = 0, _total = 0;
function _t(r: number[], options: number[][]): void {
  _total++;
  const s = (x: number[]) => JSON.stringify([...x].sort((a,b) => a-b));
  if (options.some(o => s(r) === s(o))) _pass++;
}
_t(twoSum([2,7,11,15], 9), [[0,1]]);
_t(twoSum([3,2,4], 6), [[1,2]]);
_t(twoSum([3,3], 6), [[0,1]]);
_t(twoSum([0,4,3,0], 0), [[0,3]]);
_t(twoSum([-3,4,3,90], 0), [[0,2]]);
_t(twoSum([1,2,3,4,5], 9), [[3,4]]);
_t(twoSum([-1,-2,-3,-4,-5], -8), [[2,4]]);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `
fun main() {
var _pass = 0; var _total = 0
fun _t(r: IntArray, options: List<IntArray>) {
    _total++
    val rs = r.sorted()
    if (options.any { it.sorted() == rs }) _pass++
}
_t(twoSum(intArrayOf(2,7,11,15), 9), listOf(intArrayOf(0,1)))
_t(twoSum(intArrayOf(3,2,4), 6), listOf(intArrayOf(1,2)))
_t(twoSum(intArrayOf(3,3), 6), listOf(intArrayOf(0,1)))
_t(twoSum(intArrayOf(0,4,3,0), 0), listOf(intArrayOf(0,3)))
_t(twoSum(intArrayOf(-3,4,3,90), 0), listOf(intArrayOf(0,2)))
_t(twoSum(intArrayOf(1,2,3,4,5), 9), listOf(intArrayOf(3,4)))
_t(twoSum(intArrayOf(-1,-2,-3,-4,-5), -8), listOf(intArrayOf(2,4)))
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  'group-anagrams': {
    stubs: {
      python: `def group_anagrams(strs: list) -> list:
    pass`,
      javascript: `function groupAnagrams(strs) {

}`,
      typescript: `function groupAnagrams(strs: string[]): string[][] {

}`,
      kotlin: `fun groupAnagrams(strs: Array<String>): List<List<String>> {
    return emptyList()
}`,
    },
    runners: {
      python: `
_pass = _total = 0
def _t(result, expected_groups, label=""):
    global _pass, _total
    _total += 1
    norm_r = sorted([sorted(g) for g in result])
    norm_e = sorted([sorted(g) for g in expected_groups])
    if norm_r == norm_e:
        _pass += 1

_t(group_anagrams(["eat","tea","tan","ate","nat","bat"]),
   [["bat"],["nat","tan"],["ate","eat","tea"]])
_t(group_anagrams([""]),          [[""]])
_t(group_anagrams(["a"]),         [["a"]])
_t(group_anagrams(["abc","cba","bac","foo","ofo"]),
   [["abc","cba","bac"],["foo","ofo"]])
_t(group_anagrams(["a","b","c"]), [["a"],["b"],["c"]])
_t(group_anagrams(["","",""]),    [["","",""]])
print(f"{_pass}/{_total} tests passed")`,
      javascript: `
let _pass = 0, _total = 0;
function _t(r, e) {
  _total++;
  const norm = arr => arr.map(g => [...g].sort().join('§')).sort().join('|');
  if (norm(r) === norm(e)) _pass++;
}
_t(groupAnagrams(["eat","tea","tan","ate","nat","bat"]), [["bat"],["nat","tan"],["ate","eat","tea"]]);
_t(groupAnagrams([""]), [[""]]);
_t(groupAnagrams(["a"]), [["a"]]);
_t(groupAnagrams(["abc","cba","bac","foo","ofo"]), [["abc","cba","bac"],["foo","ofo"]]);
_t(groupAnagrams(["a","b","c"]), [["a"],["b"],["c"]]);
_t(groupAnagrams(["","",""]), [["","",""]]);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `
let _pass = 0, _total = 0;
function _t(r: string[][], e: string[][]): void {
  _total++;
  const norm = (arr: string[][]) => arr.map(g => [...g].sort().join('§')).sort().join('|');
  if (norm(r) === norm(e)) _pass++;
}
_t(groupAnagrams(["eat","tea","tan","ate","nat","bat"]), [["bat"],["nat","tan"],["ate","eat","tea"]]);
_t(groupAnagrams([""]), [[""]]);
_t(groupAnagrams(["a"]), [["a"]]);
_t(groupAnagrams(["abc","cba","bac","foo","ofo"]), [["abc","cba","bac"],["foo","ofo"]]);
_t(groupAnagrams(["a","b","c"]), [["a"],["b"],["c"]]);
_t(groupAnagrams(["","",""]), [["","",""]]);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `
fun main() {
var _pass = 0; var _total = 0
fun _t(r: List<List<String>>, e: List<List<String>>) {
    _total++
    val norm = { arr: List<List<String>> -> arr.map { g -> g.sorted().joinToString("§") }.sorted().joinToString("|") }
    if (norm(r) == norm(e)) _pass++
}
_t(groupAnagrams(arrayOf("eat","tea","tan","ate","nat","bat")), listOf(listOf("bat"),listOf("nat","tan"),listOf("ate","eat","tea")))
_t(groupAnagrams(arrayOf("")), listOf(listOf("")))
_t(groupAnagrams(arrayOf("a")), listOf(listOf("a")))
_t(groupAnagrams(arrayOf("abc","cba","bac","foo","ofo")), listOf(listOf("abc","cba","bac"),listOf("foo","ofo")))
_t(groupAnagrams(arrayOf("a","b","c")), listOf(listOf("a"),listOf("b"),listOf("c")))
_t(groupAnagrams(arrayOf("","","")), listOf(listOf("","","")))
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── PREFIX SUMS ───────────────────────────────────────────────────────────

  'range-sum-query-immutable': {
    stubs: {
      python: `class NumArray:
    def __init__(self, nums: list):
        pass

    def sumRange(self, left: int, right: int) -> int:
        pass`,
      javascript: `class NumArray {
  constructor(nums) {

  }
  sumRange(left, right) {

  }
}`,
      typescript: `class NumArray {
  constructor(nums: number[]) {

  }
  sumRange(left: number, right: number): number {
    return 0;
  }
}`,
      kotlin: `class NumArray(private val nums: IntArray) {
    fun sumRange(left: Int, right: Int): Int {
        return 0
    }
}`,
    },
    runners: {
      python: `${PY_T}
na = NumArray([-2,0,3,-5,2,-1])
_t(na.sumRange(0,2),  1)
_t(na.sumRange(2,5), -1)
_t(na.sumRange(0,5), -3)
_t(na.sumRange(0,0), -2)
_t(na.sumRange(5,5), -1)
_t(na.sumRange(1,4),  0)
na2 = NumArray([1,2,3,4,5])
_t(na2.sumRange(0,4), 15)
_t(na2.sumRange(1,3),  9)
na3 = NumArray([0])
_t(na3.sumRange(0,0),  0)
print(f"{_pass}/{_total} tests passed")`,
      javascript: `${JS_T}
const na = new NumArray([-2,0,3,-5,2,-1]);
_t(na.sumRange(0,2), 1);
_t(na.sumRange(2,5), -1);
_t(na.sumRange(0,5), -3);
_t(na.sumRange(0,0), -2);
_t(na.sumRange(5,5), -1);
_t(na.sumRange(1,4), 0);
const na2 = new NumArray([1,2,3,4,5]);
_t(na2.sumRange(0,4), 15);
_t(na2.sumRange(1,3), 9);
const na3 = new NumArray([0]);
_t(na3.sumRange(0,0), 0);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `${TS_T}
const na = new NumArray([-2,0,3,-5,2,-1]);
_t(na.sumRange(0,2), 1);
_t(na.sumRange(2,5), -1);
_t(na.sumRange(0,5), -3);
_t(na.sumRange(0,0), -2);
_t(na.sumRange(5,5), -1);
_t(na.sumRange(1,4), 0);
const na2 = new NumArray([1,2,3,4,5]);
_t(na2.sumRange(0,4), 15);
_t(na2.sumRange(1,3), 9);
const na3 = new NumArray([0]);
_t(na3.sumRange(0,0), 0);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `${KT_T}
val na = NumArray(intArrayOf(-2,0,3,-5,2,-1))
_t(na.sumRange(0,2), 1)
_t(na.sumRange(2,5), -1)
_t(na.sumRange(0,5), -3)
_t(na.sumRange(0,0), -2)
_t(na.sumRange(5,5), -1)
_t(na.sumRange(1,4), 0)
val na2 = NumArray(intArrayOf(1,2,3,4,5))
_t(na2.sumRange(0,4), 15)
_t(na2.sumRange(1,3), 9)
val na3 = NumArray(intArrayOf(0))
_t(na3.sumRange(0,0), 0)
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── GREEDY ────────────────────────────────────────────────────────────────

  'jump-game': {
    stubs: {
      python: `def can_jump(nums: list) -> bool:
    pass`,
      javascript: `function canJump(nums) {

}`,
      typescript: `function canJump(nums: number[]): boolean {

}`,
      kotlin: `fun canJump(nums: IntArray): Boolean {
    return false
}`,
    },
    runners: {
      python: `${PY_T}
_t(can_jump([2,3,1,1,4]),  True)
_t(can_jump([3,2,1,0,4]),  False)
_t(can_jump([0]),           True)
_t(can_jump([1,0]),         True)
_t(can_jump([0,1]),         False)
_t(can_jump([2,0,0]),       True)
_t(can_jump([1,1,1,1,0]),   True)
_t(can_jump([3,0,0,0,0]),   False)
_t(can_jump([1,2,3]),       True)
print(f"{_pass}/{_total} tests passed")`,
      javascript: `${JS_T}
_t(canJump([2,3,1,1,4]), true);
_t(canJump([3,2,1,0,4]), false);
_t(canJump([0]), true);
_t(canJump([1,0]), true);
_t(canJump([0,1]), false);
_t(canJump([2,0,0]), true);
_t(canJump([1,1,1,1,0]), true);
_t(canJump([3,0,0,0,0]), false);
_t(canJump([1,2,3]), true);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `${TS_T}
_t(canJump([2,3,1,1,4]), true);
_t(canJump([3,2,1,0,4]), false);
_t(canJump([0]), true);
_t(canJump([1,0]), true);
_t(canJump([0,1]), false);
_t(canJump([2,0,0]), true);
_t(canJump([1,1,1,1,0]), true);
_t(canJump([3,0,0,0,0]), false);
_t(canJump([1,2,3]), true);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `${KT_T}
_t(canJump(intArrayOf(2,3,1,1,4)), true)
_t(canJump(intArrayOf(3,2,1,0,4)), false)
_t(canJump(intArrayOf(0)), true)
_t(canJump(intArrayOf(1,0)), true)
_t(canJump(intArrayOf(0,1)), false)
_t(canJump(intArrayOf(2,0,0)), true)
_t(canJump(intArrayOf(1,1,1,1,0)), true)
_t(canJump(intArrayOf(3,0,0,0,0)), false)
_t(canJump(intArrayOf(1,2,3)), true)
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── SORT & SEARCH ─────────────────────────────────────────────────────────

  'sort-colors': {
    stubs: {
      python: `def sort_colors(nums: list) -> None:
    # Sort in-place. Do not return anything.
    pass`,
      javascript: `function sortColors(nums) {
  // Sort in-place.
}`,
      typescript: `function sortColors(nums: number[]): void {
  // Sort in-place.
}`,
      kotlin: `fun sortColors(nums: IntArray): Unit {
    // Sort in-place.
}`,
    },
    runners: {
      python: `
import copy
_pass = _total = 0
def _t(arr, expected, label=""):
    global _pass, _total
    _total += 1
    sort_colors(arr)
    if arr == expected:
        _pass += 1

_t([2,0,2,1,1,0], [0,0,1,1,2,2])
_t([2,0,1],       [0,1,2])
_t([0],           [0])
_t([1],           [1])
_t([2],           [2])
_t([2,2,2],       [2,2,2])
_t([0,0,0],       [0,0,0])
_t([1,1,1],       [1,1,1])
_t([1,2,0,2,0,1,0,2], [0,0,0,1,1,2,2,2])
print(f"{_pass}/{_total} tests passed")`,
      javascript: `
let _pass = 0, _total = 0;
function _t(arr, expected) {
  _total++;
  sortColors(arr);
  if (JSON.stringify(arr) === JSON.stringify(expected)) _pass++;
}
_t([2,0,2,1,1,0], [0,0,1,1,2,2]);
_t([2,0,1], [0,1,2]);
_t([0], [0]);
_t([1], [1]);
_t([2], [2]);
_t([2,2,2], [2,2,2]);
_t([0,0,0], [0,0,0]);
_t([1,1,1], [1,1,1]);
_t([1,2,0,2,0,1,0,2], [0,0,0,1,1,2,2,2]);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `
let _pass = 0, _total = 0;
function _t(arr: number[], expected: number[]): void {
  _total++;
  sortColors(arr);
  if (JSON.stringify(arr) === JSON.stringify(expected)) _pass++;
}
_t([2,0,2,1,1,0], [0,0,1,1,2,2]);
_t([2,0,1], [0,1,2]);
_t([0], [0]);
_t([1], [1]);
_t([2], [2]);
_t([2,2,2], [2,2,2]);
_t([0,0,0], [0,0,0]);
_t([1,1,1], [1,1,1]);
_t([1,2,0,2,0,1,0,2], [0,0,0,1,1,2,2,2]);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `
fun main() {
var _pass = 0; var _total = 0
fun _t(arr: IntArray, expected: IntArray) {
    _total++
    sortColors(arr)
    if (arr.contentEquals(expected)) _pass++
}
_t(intArrayOf(2,0,2,1,1,0), intArrayOf(0,0,1,1,2,2))
_t(intArrayOf(2,0,1), intArrayOf(0,1,2))
_t(intArrayOf(0), intArrayOf(0))
_t(intArrayOf(1), intArrayOf(1))
_t(intArrayOf(2), intArrayOf(2))
_t(intArrayOf(2,2,2), intArrayOf(2,2,2))
_t(intArrayOf(0,0,0), intArrayOf(0,0,0))
_t(intArrayOf(1,1,1), intArrayOf(1,1,1))
_t(intArrayOf(1,2,0,2,0,1,0,2), intArrayOf(0,0,0,1,1,2,2,2))
println("\$_pass/\$_total tests passed")
}`,
    },
  },

  // ── MATH & GEOMETRY ───────────────────────────────────────────────────────

  'rotate-image': {
    stubs: {
      python: `def rotate(matrix: list) -> None:
    # Rotate in-place. Do not return anything.
    pass`,
      javascript: `function rotate(matrix) {
  // Rotate in-place.
}`,
      typescript: `function rotate(matrix: number[][]): void {
  // Rotate in-place.
}`,
      kotlin: `fun rotate(matrix: Array<IntArray>): Unit {
    // Rotate in-place.
}`,
    },
    runners: {
      python: `
import copy
_pass = _total = 0
def _t(matrix, expected, label=""):
    global _pass, _total
    _total += 1
    rotate(matrix)
    if matrix == expected:
        _pass += 1

_t([[1,2,3],[4,5,6],[7,8,9]],           [[7,4,1],[8,5,2],[9,6,3]])
_t([[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]],
   [[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]])
_t([[1]], [[1]])
_t([[1,2],[3,4]], [[3,1],[4,2]])
_t([[1,2,3,4,5],[6,7,8,9,10],[11,12,13,14,15],[16,17,18,19,20],[21,22,23,24,25]],
   [[21,16,11,6,1],[22,17,12,7,2],[23,18,13,8,3],[24,19,14,9,4],[25,20,15,10,5]])
print(f"{_pass}/{_total} tests passed")`,
      javascript: `
let _pass = 0, _total = 0;
function _t(matrix, expected) {
  _total++;
  rotate(matrix);
  if (JSON.stringify(matrix) === JSON.stringify(expected)) _pass++;
}
_t([[1,2,3],[4,5,6],[7,8,9]], [[7,4,1],[8,5,2],[9,6,3]]);
_t([[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]], [[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]);
_t([[1]], [[1]]);
_t([[1,2],[3,4]], [[3,1],[4,2]]);
_t([[1,2,3,4,5],[6,7,8,9,10],[11,12,13,14,15],[16,17,18,19,20],[21,22,23,24,25]],
   [[21,16,11,6,1],[22,17,12,7,2],[23,18,13,8,3],[24,19,14,9,4],[25,20,15,10,5]]);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      typescript: `
let _pass = 0, _total = 0;
function _t(matrix: number[][], expected: number[][]): void {
  _total++;
  rotate(matrix);
  if (JSON.stringify(matrix) === JSON.stringify(expected)) _pass++;
}
_t([[1,2,3],[4,5,6],[7,8,9]], [[7,4,1],[8,5,2],[9,6,3]]);
_t([[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]], [[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]);
_t([[1]], [[1]]);
_t([[1,2],[3,4]], [[3,1],[4,2]]);
_t([[1,2,3,4,5],[6,7,8,9,10],[11,12,13,14,15],[16,17,18,19,20],[21,22,23,24,25]],
   [[21,16,11,6,1],[22,17,12,7,2],[23,18,13,8,3],[24,19,14,9,4],[25,20,15,10,5]]);
console.log(\`\${_pass}/\${_total} tests passed\`);`,
      kotlin: `
fun main() {
var _pass = 0; var _total = 0
fun _t(matrix: Array<IntArray>, expected: Array<IntArray>) {
    _total++
    rotate(matrix)
    if (matrix.zip(expected).all { (r, e) -> r.contentEquals(e) }) _pass++
}
_t(arrayOf(intArrayOf(1,2,3),intArrayOf(4,5,6),intArrayOf(7,8,9)), arrayOf(intArrayOf(7,4,1),intArrayOf(8,5,2),intArrayOf(9,6,3)))
_t(arrayOf(intArrayOf(5,1,9,11),intArrayOf(2,4,8,10),intArrayOf(13,3,6,7),intArrayOf(15,14,12,16)), arrayOf(intArrayOf(15,13,2,5),intArrayOf(14,3,4,1),intArrayOf(12,6,8,9),intArrayOf(16,7,10,11)))
_t(arrayOf(intArrayOf(1)), arrayOf(intArrayOf(1)))
_t(arrayOf(intArrayOf(1,2),intArrayOf(3,4)), arrayOf(intArrayOf(3,1),intArrayOf(4,2)))
_t(arrayOf(intArrayOf(1,2,3,4,5),intArrayOf(6,7,8,9,10),intArrayOf(11,12,13,14,15),intArrayOf(16,17,18,19,20),intArrayOf(21,22,23,24,25)), arrayOf(intArrayOf(21,16,11,6,1),intArrayOf(22,17,12,7,2),intArrayOf(23,18,13,8,3),intArrayOf(24,19,14,9,4),intArrayOf(25,20,15,10,5)))
println("\$_pass/\$_total tests passed")
}`,
    },
  },
};

// ---------------------------------------------------------------------------

async function seedTests() {
  console.log('Seeding stubs and test runners (python, javascript, typescript, kotlin)…\n');
  let updated = 0;

  for (const [slug, { stubs, runners }] of Object.entries(TEST_DATA)) {
    const problem = await db.query.problems.findFirst({
      where: eq(problems.slug, slug),
    });

    if (!problem) {
      console.log(`  skip  ${slug} (not in DB — run db:seed first)`);
      continue;
    }

    await db
      .update(problems)
      .set({
        functionStub: stubs.python,
        testRunner: runners.python.trim(),
        functionStubs: sql`${stubs}::jsonb`,
        testRunners: sql`${runners}::jsonb`,
      })
      .where(eq(problems.id, problem.id));

    console.log(`  ✓  ${slug}`);
    updated++;
  }

  console.log(`\nDone. ${updated}/${Object.keys(TEST_DATA).length} problems updated.`);
  await client.end();
}

seedTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
