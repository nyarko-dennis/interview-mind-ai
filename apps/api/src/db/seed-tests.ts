import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
const { problems } = schema;

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

// ---------------------------------------------------------------------------
// Each entry maps a problem slug to its Python function stub and test runner.
// The test runner is appended to the user's code before Judge0 submission.
// Format: "X/Y tests passed" in stdout → parsed by parseTestCounts().
//
// Naming convention for test runners:
//   - Define _tc (test case counter) helpers inline
//   - Print "X/Y tests passed" at the end
//   - Each assert failure raises AssertionError → Judge0 Runtime Error
// ---------------------------------------------------------------------------

const TEST_DATA: Record<string, { stub: string; runner: string }> = {

  // ── TWO POINTERS ──────────────────────────────────────────────────────────

  'valid-palindrome': {
    stub: `def is_palindrome(s: str) -> bool:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

_t(is_palindrome("A man, a plan, a canal: Panama"), True,  "basic palindrome with spaces/punctuation")
_t(is_palindrome("race a car"),                    False, "not a palindrome")
_t(is_palindrome(" "),                             True,  "single space is palindrome")
_t(is_palindrome(""),                              True,  "empty string is palindrome")
_t(is_palindrome("a"),                             True,  "single char is palindrome")
_t(is_palindrome("0P"),                            False, "alphanumeric mismatch")
_t(is_palindrome("Was it a car or a cat I saw?"),  True,  "phrase palindrome")
_t(is_palindrome("No lemon, no melon"),            True,  "classic phrase palindrome")
print(f"{_pass}/{_total} tests passed")`,
  },

  'container-with-most-water': {
    stub: `def max_area(height: list) -> int:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

_t(max_area([1,8,6,2,5,4,8,3,7]), 49, "standard case")
_t(max_area([1,1]),                1,  "two elements equal")
_t(max_area([4,3,2,1,4]),          16, "equal bookends")
_t(max_area([1,2,1]),              2,  "three elements")
_t(max_area([2,3,4,5,18,17,6]),    17, "skewed heights")
_t(max_area([1,8,100,2,100,4,8,3,7]), 200, "tall inner walls")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── SLIDING WINDOW ────────────────────────────────────────────────────────

  'longest-substring-without-repeating-characters': {
    stub: `def length_of_longest_substring(s: str) -> int:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

_t(length_of_longest_substring("abcabcbb"), 3, "repeating abc")
_t(length_of_longest_substring("bbbbb"),   1, "all same")
_t(length_of_longest_substring("pwwkew"),  3, "wke window")
_t(length_of_longest_substring(""),        0, "empty string")
_t(length_of_longest_substring(" "),       1, "single space")
_t(length_of_longest_substring("dvdf"),    3, "vdf window")
_t(length_of_longest_substring("abba"),    2, "palindrome pattern")
_t(length_of_longest_substring("tmmzuxt"), 5, "long non-repeating suffix")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── FAST & SLOW POINTERS ─────────────────────────────────────────────────

  'linked-list-cycle': {
    stub: `class ListNode:
    def __init__(self, x):
        self.val = x
        self.next = None

def has_cycle(head) -> bool:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

# Build cyclic list [3,2,0,-4], tail → node at index 1
n = [ListNode(v) for v in [3,2,0,-4]]
for i in range(3): n[i].next = n[i+1]
n[3].next = n[1]  # cycle at pos 1
_t(has_cycle(n[0]),  True,  "cycle at pos 1")

# [1,2] cycle at pos 0
a, b = ListNode(1), ListNode(2)
a.next = b; b.next = a
_t(has_cycle(a),     True,  "two-node cycle")

# [1] no cycle
_t(has_cycle(ListNode(1)), False, "single node, no cycle")

# No cycle: [1,2,3,4]
m = [ListNode(i) for i in range(1,5)]
for i in range(3): m[i].next = m[i+1]
_t(has_cycle(m[0]), False, "four nodes, no cycle")

_t(has_cycle(None), False, "null head")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── BINARY SEARCH ─────────────────────────────────────────────────────────

  'binary-search': {
    stub: `def search(nums: list, target: int) -> int:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

_t(search([-1,0,3,5,9,12], 9),   4,  "target in middle")
_t(search([-1,0,3,5,9,12], 2),  -1,  "target absent")
_t(search([5], 5),               0,  "single element found")
_t(search([5], 3),              -1,  "single element not found")
_t(search([-1,0,3,5,9,12], -1),  0,  "first element")
_t(search([-1,0,3,5,9,12], 12),  5,  "last element")
_t(search([1,3,5,7,9,11,13,15,17,19], 13), 6, "larger array")
print(f"{_pass}/{_total} tests passed")`,
  },

  'search-in-rotated-sorted-array': {
    stub: `def search(nums: list, target: int) -> int:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

_t(search([4,5,6,7,0,1,2], 0),  4,  "pivot mid, target right")
_t(search([4,5,6,7,0,1,2], 3), -1,  "target absent")
_t(search([1], 0),             -1,  "single element not found")
_t(search([1], 1),              0,  "single element found")
_t(search([3,1], 1),            1,  "two elements rotated")
_t(search([5,1,3], 5),          0,  "target at head")
_t(search([4,5,6,7,0,1,2], 4),  0,  "target at rotation start")
_t(search([4,5,6,7,0,1,2], 2),  6,  "target at tail")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── BFS ───────────────────────────────────────────────────────────────────

  'number-of-islands': {
    stub: `def num_islands(grid: list) -> int:
    pass`,
    runner: `
import copy
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

g1 = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]
g2 = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]
g3 = [["1","0","0"],["0","1","0"],["0","0","1"]]
g4 = [["0","0","0"],["0","0","0"]]
g5 = [["1"]]
g6 = [["1","1","1"],["0","1","0"],["1","1","1"]]

_t(num_islands(copy.deepcopy(g1)), 1, "one large island")
_t(num_islands(copy.deepcopy(g2)), 3, "three islands")
_t(num_islands(copy.deepcopy(g3)), 3, "diagonal islands (not connected)")
_t(num_islands(copy.deepcopy(g4)), 0, "all water")
_t(num_islands(copy.deepcopy(g5)), 1, "single cell island")
_t(num_islands(copy.deepcopy(g6)), 1, "donut shape is still one island")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── DFS / BACKTRACKING ────────────────────────────────────────────────────

  'subsets': {
    stub: `def subsets(nums: list) -> list:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected_count, expected_contains, label=""):
    global _pass, _total
    _total += 1
    result_sorted = sorted([sorted(s) for s in result])
    assert len(result) == expected_count, f"{label}: expected {expected_count} subsets, got {len(result)}"
    for sub in expected_contains:
        assert sorted(sub) in result_sorted, f"{label}: missing subset {sub}"
    _pass += 1

_t(subsets([1,2,3]), 8,  [[], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]], "[1,2,3]")
_t(subsets([0]),     2,  [[], [0]],                                           "[0]")
_t(subsets([]),      1,  [[]],                                                "empty input")
_t(subsets([1,2]),   4,  [[], [1], [2], [1,2]],                              "[1,2]")
_t(subsets([1,2,3,4]), 16, [[], [4], [1,4], [2,3,4], [1,2,3,4]],            "[1,2,3,4]")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── DP 1D ─────────────────────────────────────────────────────────────────

  'climbing-stairs': {
    stub: `def climb_stairs(n: int) -> int:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

_t(climb_stairs(1),  1,  "n=1")
_t(climb_stairs(2),  2,  "n=2")
_t(climb_stairs(3),  3,  "n=3")
_t(climb_stairs(4),  5,  "n=4")
_t(climb_stairs(5),  8,  "n=5")
_t(climb_stairs(10), 89, "n=10")
_t(climb_stairs(20), 10946, "n=20")
_t(climb_stairs(45), 1836311903, "n=45 (constraint max)")
print(f"{_pass}/{_total} tests passed")`,
  },

  'house-robber': {
    stub: `def rob(nums: list) -> int:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

_t(rob([1,2,3,1]),   4,  "[1,2,3,1]: rob 1+3")
_t(rob([2,7,9,3,1]), 12, "[2,7,9,3,1]: rob 2+9+1")
_t(rob([0]),         0,  "single zero house")
_t(rob([5]),         5,  "single house")
_t(rob([2,1]),       2,  "two houses take larger")
_t(rob([1,1,1]),     2,  "alternating take 1+1")
_t(rob([100,1,1,100]), 200, "bookend high values")
_t(rob([2,1,1,2]),   4,  "take first and last")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── DP 2D ─────────────────────────────────────────────────────────────────

  'unique-paths': {
    stub: `def unique_paths(m: int, n: int) -> int:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

_t(unique_paths(3, 7),  28,  "3×7")
_t(unique_paths(3, 2),  3,   "3×2")
_t(unique_paths(1, 1),  1,   "1×1 trivial")
_t(unique_paths(1, 10), 1,   "single row")
_t(unique_paths(10, 1), 1,   "single column")
_t(unique_paths(2, 2),  2,   "2×2")
_t(unique_paths(3, 3),  6,   "3×3")
_t(unique_paths(5, 5),  70,  "5×5")
_t(unique_paths(7, 3),  28,  "7×3 same as 3×7")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── MONOTONIC STACK ───────────────────────────────────────────────────────

  'daily-temperatures': {
    stub: `def daily_temperatures(temperatures: list) -> list:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

_t(daily_temperatures([73,74,75,71,69,72,76,73]), [1,1,4,2,1,1,0,0], "standard case")
_t(daily_temperatures([30,40,50,60]),             [1,1,1,0],          "strictly increasing")
_t(daily_temperatures([30,60,90]),                [1,1,0],            "three increasing")
_t(daily_temperatures([90,80,70,60]),             [0,0,0,0],          "strictly decreasing → all zeros")
_t(daily_temperatures([50]),                      [0],                "single element")
_t(daily_temperatures([55,55,55]),                [0,0,0],            "all equal → all zeros")
_t(daily_temperatures([34,80,80,34,80]),          [1,0,0,1,0],        "ties and repeats")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── HEAP ──────────────────────────────────────────────────────────────────

  'kth-largest-element-in-an-array': {
    stub: `def find_kth_largest(nums: list, k: int) -> int:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

_t(find_kth_largest([3,2,1,5,6,4], 2),          5,  "k=2")
_t(find_kth_largest([3,2,3,1,2,4,5,5,6], 4),    4,  "k=4 with duplicates")
_t(find_kth_largest([1], 1),                     1,  "single element")
_t(find_kth_largest([2,1], 1),                   2,  "k=1 means max")
_t(find_kth_largest([2,1], 2),                   1,  "k=2 means min of two")
_t(find_kth_largest([7,6,5,4,3,2,1], 5),         3,  "sorted descending k=5")
_t(find_kth_largest([-1,-2,-3,-4,-5], 2),        -2, "all negative")
_t(find_kth_largest([3,3,3,3,3], 3),              3,  "all identical")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── INTERVALS ─────────────────────────────────────────────────────────────

  'merge-intervals': {
    stub: `def merge(intervals: list) -> list:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    result_s = sorted([sorted(i) for i in result])
    expected_s = sorted([sorted(i) for i in expected])
    assert result_s == expected_s, f"{label}: expected {expected}, got {result}"
    _pass += 1

_t(merge([[1,3],[2,6],[8,10],[15,18]]), [[1,6],[8,10],[15,18]], "standard overlap")
_t(merge([[1,4],[4,5]]),               [[1,5]],                "touching at edge")
_t(merge([[1,4],[2,3]]),               [[1,4]],                "inner contained")
_t(merge([[1,4]]),                     [[1,4]],                "single interval")
_t(merge([[1,3],[6,9]]),               [[1,3],[6,9]],          "no overlap")
_t(merge([[2,3],[4,5],[6,7],[8,9],[1,10]]), [[1,10]],          "one large contains all")
_t(merge([[1,4],[0,4]]),               [[0,4]],                "first swallows second after sort")
_t(merge([[1,4],[0,2],[3,5]]),         [[0,5]],                "chain merge")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── UNION-FIND ────────────────────────────────────────────────────────────

  'number-of-connected-components': {
    stub: `def count_components(n: int, edges: list) -> int:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

_t(count_components(5, [[0,1],[1,2],[3,4]]),       2, "two components")
_t(count_components(5, [[0,1],[1,2],[2,3],[3,4]]), 1, "one chain")
_t(count_components(5, []),                        5, "no edges → 5 components")
_t(count_components(1, []),                        1, "single node")
_t(count_components(4, [[0,1],[2,3]]),             2, "two pairs")
_t(count_components(6, [[0,1],[0,2],[1,2],[3,4],[3,5],[4,5]]), 2, "two triangles")
_t(count_components(3, [[0,1],[0,2],[1,2]]),       1, "full triangle")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── TRIE ──────────────────────────────────────────────────────────────────

  'implement-trie': {
    stub: `class Trie:
    def __init__(self):
        pass

    def insert(self, word: str) -> None:
        pass

    def search(self, word: str) -> bool:
        pass

    def startsWith(self, prefix: str) -> bool:
        pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

t = Trie()
t.insert("apple")
_t(t.search("apple"),    True,  "search inserted word")
_t(t.search("app"),      False, "prefix is not a word")
_t(t.startsWith("app"),  True,  "prefix exists")
t.insert("app")
_t(t.search("app"),      True,  "search after inserting prefix as word")
_t(t.startsWith("ap"),   True,  "shorter prefix")
_t(t.startsWith("b"),    False, "non-existent prefix")
_t(t.search("appl"),     False, "partial word not inserted")

t2 = Trie()
t2.insert("hello")
t2.insert("help")
t2.insert("world")
_t(t2.startsWith("hel"), True,  "shared prefix hel")
_t(t2.search("hell"),    False, "hell not inserted")
_t(t2.search("hello"),   True,  "hello is inserted")
_t(t2.search("world"),   True,  "world is inserted")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── BIT MANIPULATION ──────────────────────────────────────────────────────

  'single-number': {
    stub: `def single_number(nums: list) -> int:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

_t(single_number([2,2,1]),       1,  "[2,2,1]")
_t(single_number([4,1,2,1,2]),   4,  "[4,1,2,1,2]")
_t(single_number([1]),           1,  "single element")
_t(single_number([0,1,0]),       1,  "zero pairs with single")
_t(single_number([-1,-1,2]),     2,  "negative duplicates")
_t(single_number([100,200,100]), 200,"large values")
_t(single_number([7,3,5,3,7,9,5,9,11]), 11, "nine elements")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── LINKED LISTS ──────────────────────────────────────────────────────────

  'reverse-linked-list': {
    stub: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def reverse_list(head):
    pass`,
    runner: `
def _make(vals):
    if not vals: return None
    h = ListNode(vals[0])
    c = h
    for v in vals[1:]: c.next = ListNode(v); c = c.next
    return h

def _to_list(head):
    r = []
    while head: r.append(head.val); head = head.next
    return r

_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert _to_list(result) == expected, f"{label}: expected {expected}, got {_to_list(result)}"
    _pass += 1

_t(reverse_list(_make([1,2,3,4,5])), [5,4,3,2,1], "five nodes")
_t(reverse_list(_make([1,2])),       [2,1],         "two nodes")
_t(reverse_list(_make([1])),         [1],           "single node")
_t(reverse_list(None),               [],            "null head")
_t(reverse_list(_make([1,2,3])),     [3,2,1],       "three nodes")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── HASH MAPS ─────────────────────────────────────────────────────────────

  'two-sum': {
    stub: `def two_sum(nums: list, target: int) -> list:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected_options, label=""):
    global _pass, _total
    _total += 1
    assert result in expected_options, f"{label}: expected one of {expected_options}, got {result}"
    _pass += 1

_t(two_sum([2,7,11,15], 9),    [[0,1]],    "basic case")
_t(two_sum([3,2,4], 6),        [[1,2]],    "non-adjacent")
_t(two_sum([3,3], 6),          [[0,1]],    "duplicate values")
_t(two_sum([0,4,3,0], 0),      [[0,3]],    "two zeros")
_t(two_sum([-3,4,3,90], 0),    [[0,2]],    "negative and positive")
_t(two_sum([1,2,3,4,5], 9),    [[3,4]],    "last two elements")
_t(two_sum([-1,-2,-3,-4,-5], -8), [[2,4]], "all negatives")
print(f"{_pass}/{_total} tests passed")`,
  },

  'group-anagrams': {
    stub: `def group_anagrams(strs: list) -> list:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected_groups, label=""):
    global _pass, _total
    _total += 1
    norm_r = sorted([sorted(g) for g in result])
    norm_e = sorted([sorted(g) for g in expected_groups])
    assert norm_r == norm_e, f"{label}: expected {norm_e}, got {norm_r}"
    _pass += 1

_t(group_anagrams(["eat","tea","tan","ate","nat","bat"]),
   [["bat"],["nat","tan"],["ate","eat","tea"]],           "classic case")
_t(group_anagrams([""]),          [[""]],                "single empty string")
_t(group_anagrams(["a"]),         [["a"]],               "single char")
_t(group_anagrams(["abc","cba","bac","foo","ofo"]),
   [["abc","cba","bac"],["foo","ofo"]],                   "two groups")
_t(group_anagrams(["a","b","c"]), [["a"],["b"],["c"]],   "no anagrams")
_t(group_anagrams(["","",""]),    [["","",""]],           "multiple empty strings")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── PREFIX SUMS ───────────────────────────────────────────────────────────

  'range-sum-query-immutable': {
    stub: `class NumArray:
    def __init__(self, nums: list):
        pass

    def sumRange(self, left: int, right: int) -> int:
        pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

na = NumArray([-2,0,3,-5,2,-1])
_t(na.sumRange(0,2),  1,  "indices 0-2: -2+0+3")
_t(na.sumRange(2,5), -1,  "indices 2-5: 3-5+2-1")
_t(na.sumRange(0,5), -3,  "full range: sum all")
_t(na.sumRange(0,0), -2,  "single element first")
_t(na.sumRange(5,5), -1,  "single element last")
_t(na.sumRange(1,4),  0,  "middle range: 0+3-5+2")

na2 = NumArray([1,2,3,4,5])
_t(na2.sumRange(0,4), 15, "sum all positives")
_t(na2.sumRange(1,3),  9, "inner window 2+3+4")

na3 = NumArray([0])
_t(na3.sumRange(0,0),  0, "single zero element")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── GREEDY ────────────────────────────────────────────────────────────────

  'jump-game': {
    stub: `def can_jump(nums: list) -> bool:
    pass`,
    runner: `
_pass = _total = 0
def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    assert result == expected, f"{label}: expected {expected}, got {result}"
    _pass += 1

_t(can_jump([2,3,1,1,4]),  True,  "can reach end")
_t(can_jump([3,2,1,0,4]),  False, "stuck at zero")
_t(can_jump([0]),           True,  "already at end")
_t(can_jump([1,0]),         True,  "one step to end")
_t(can_jump([0,1]),         False, "stuck at first zero")
_t(can_jump([2,0,0]),       True,  "skip over zeros")
_t(can_jump([1,1,1,1,0]),   True,  "reach last zero (which is the end)")
_t(can_jump([3,0,0,0,0]),   False, "max jump exactly 3 but need 4")
_t(can_jump([1,2,3]),       True,  "easy path")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── SORT & SEARCH ─────────────────────────────────────────────────────────

  'sort-colors': {
    stub: `def sort_colors(nums: list) -> None:
    # Sort in-place. Do not return anything.
    pass`,
    runner: `
import copy
_pass = _total = 0
def _t(arr, expected, label=""):
    global _pass, _total
    _total += 1
    sort_colors(arr)
    assert arr == expected, f"{label}: expected {expected}, got {arr}"
    _pass += 1

_t([2,0,2,1,1,0], [0,0,1,1,2,2], "standard case")
_t([2,0,1],       [0,1,2],       "one of each")
_t([0],           [0],           "single 0")
_t([1],           [1],           "single 1")
_t([2],           [2],           "single 2")
_t([2,2,2],       [2,2,2],       "all 2s")
_t([0,0,0],       [0,0,0],       "all 0s")
_t([1,1,1],       [1,1,1],       "all 1s")
_t([1,2,0,2,0,1,0,2], [0,0,0,1,1,2,2,2], "larger mixed")
print(f"{_pass}/{_total} tests passed")`,
  },

  // ── MATH & GEOMETRY ───────────────────────────────────────────────────────

  'rotate-image': {
    stub: `def rotate(matrix: list) -> None:
    # Rotate in-place. Do not return anything.
    pass`,
    runner: `
import copy
_pass = _total = 0
def _t(matrix, expected, label=""):
    global _pass, _total
    _total += 1
    rotate(matrix)
    assert matrix == expected, f"{label}: expected {expected}, got {matrix}"
    _pass += 1

_t([[1,2,3],[4,5,6],[7,8,9]],
   [[7,4,1],[8,5,2],[9,6,3]], "3×3 standard")

_t([[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]],
   [[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]], "4×4 standard")

_t([[1]], [[1]], "1×1 trivial")

_t([[1,2],[3,4]], [[3,1],[4,2]], "2×2")

m = [[1,2,3,4,5],
     [6,7,8,9,10],
     [11,12,13,14,15],
     [16,17,18,19,20],
     [21,22,23,24,25]]
e = [[21,16,11,6,1],
     [22,17,12,7,2],
     [23,18,13,8,3],
     [24,19,14,9,4],
     [25,20,15,10,5]]
_t(m, e, "5×5")
print(f"{_pass}/{_total} tests passed")`,
  },
};

// ---------------------------------------------------------------------------

async function seedTests() {
  console.log('Seeding function stubs and test runners…\n');
  let updated = 0;

  for (const [slug, { stub, runner }] of Object.entries(TEST_DATA)) {
    const problem = await db.query.problems.findFirst({
      where: eq(problems.slug, slug),
    });

    if (!problem) {
      console.log(`  skip  ${slug} (not in DB — run db:seed first)`);
      continue;
    }

    await db
      .update(problems)
      .set({ functionStub: stub, testRunner: runner.trim() })
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
