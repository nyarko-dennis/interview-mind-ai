import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { dojoTips, dojodrills } from './schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// ---------------------------------------------------------------------------
// PHASE TIPS
// ---------------------------------------------------------------------------

const PHASE_TIPS: Array<{
  category: string;
  key: string;
  mode: string;
  title: string;
  body: string;
  sortOrder: number;
}> = [
  // ── CLARIFICATION ──────────────────────────────────────────────────────────
  {
    category: 'PHASE',
    key: 'CLARIFICATION',
    mode: 'ALL',
    title: 'The three questions that unlock every problem',
    body: `Ask these in order — they cover 90% of what you need to know before approaching a solution.

**1. Input constraints** — "How large can the input be?" (affects whether O(n²) is acceptable), "Can values be negative?", "Can the input be empty or contain duplicates?"

**2. Output format** — "Should I return indices or values?", "Should the result be sorted?", "Is there always exactly one answer?" These change your entire approach.

**3. Edge cases** — "What should I return for an empty input?", "What if all elements are the same?" Asking this signals you think defensively.

Time-box to 2–3 minutes. Ask the most impactful question first.`,
    sortOrder: 1,
  },
  {
    category: 'PHASE',
    key: 'CLARIFICATION',
    mode: 'ALL',
    title: 'What NOT to ask',
    body: `Bad clarifying questions waste time and signal unpreparedness.

**Don't ask what you can infer.** If an example shows [1, 2, 3] → 6, the output is a sum — don't ask "should I sum the elements?".

**Don't ask about implementation.** "Should I use a hash map?" is a design choice, not a clarification. Save that for the Approach phase.

**Don't over-clarify.** Asking 8 questions signals anxiety. Ask 2–3 targeted questions, state remaining assumptions explicitly, then move on.

**Do state assumptions you make.** "I'll assume values fit in a 32-bit integer unless told otherwise." This is better than either asking or silently assuming.`,
    sortOrder: 2,
  },
  {
    category: 'PHASE',
    key: 'CLARIFICATION',
    mode: 'GUIDED',
    title: "Use the interviewer's answers to your advantage",
    body: `In Guided mode your interviewer will confirm or redirect your understanding. Use this.

**Ask about the constraint you're least sure about** — if they say "n can be up to 10⁸", you've just learned O(n²) is impossible and O(n log n) is borderline.

**Paraphrase the problem back** — "So to confirm: I'm given a list of intervals, I need to merge overlapping ones, and return a list with no overlaps?" A brief confirmation now prevents building the wrong thing.

**Ask one follow-up** if an answer surprises you. If the interviewer says values can be negative, that rules out certain greedy approaches — it's worth asking "And can the array be empty?" as a follow-up.`,
    sortOrder: 3,
  },
  {
    category: 'PHASE',
    key: 'CLARIFICATION',
    mode: 'STRICT',
    title: 'Clarity without confirmation',
    body: `In Strict mode your interviewer won't volunteer agreement. Structure your clarifications differently.

**State assumptions, don't ask for permission.** Instead of "Can values be negative?", say "I'll assume values can be negative and handle that — if that assumption is wrong please let me know."

**When the interviewer gives a non-answer**, treat it as "figure it out yourself." State your assumption and proceed rather than repeating the question.

**Use the examples as your oracle.** If the examples don't cover a case (e.g., empty input), state your assumption explicitly: "The examples don't include the empty case — I'll return 0 for that."

Spending more than 3 minutes here without moving forward signals poor time management in a strict interview.`,
    sortOrder: 4,
  },

  // ── APPROACH ───────────────────────────────────────────────────────────────
  {
    category: 'PHASE',
    key: 'APPROACH',
    mode: 'ALL',
    title: 'Always start with brute force',
    body: `**State the naive solution first, every time.**

"The brute force would be to check every pair — O(n²) time, O(1) space. But with n up to 10⁵ that's 10¹⁰ operations, which is too slow."

This accomplishes three things:
1. It shows you understand the problem correctly
2. It gives the interviewer a baseline to confirm before you invest in optimization
3. It establishes the optimization target — you now know you need better than O(n²)

**Then ask what's bottlenecking the brute force.** Redundant recomputation → memoize. Repeated scanning → precompute. Nested loops → better data structure. The bottleneck points directly at the pattern.`,
    sortOrder: 1,
  },
  {
    category: 'PHASE',
    key: 'APPROACH',
    mode: 'ALL',
    title: 'State complexity before writing code',
    body: `Before you touch the keyboard, say:

*"My approach will be O(n log n) time and O(n) space. Here's why..."*

This does two things:
- It forces you to verify the complexity before you're committed to 50 lines of code
- It gives the interviewer a chance to redirect you ("can you do it in O(1) space?") before you implement the wrong thing

**Common complexity targets by input size:**
- n ≤ 20: O(2ⁿ) or O(n!) acceptable — think backtracking/permutations
- n ≤ 10³: O(n²) acceptable
- n ≤ 10⁵: need O(n log n) or better
- n ≤ 10⁸: need O(n) or O(log n)`,
    sortOrder: 2,
  },
  {
    category: 'PHASE',
    key: 'APPROACH',
    mode: 'ALL',
    title: 'Trace one example by hand before coding',
    body: `Pick a small, representative example — ideally different from the given one — and trace your algorithm step by step.

**Why this matters:** Off-by-one errors, wrong boundary conditions, and incorrect invariants all surface here before they become bugs. It's much faster to fix an algorithm on paper than in code.

**What to trace through:**
- The main case (your typical input)
- A boundary case (empty, single element, all same values)

**How to trace:** Write out the state of every variable at every step. If you can't trace it easily, your algorithm is underspecified — clarify it before coding.`,
    sortOrder: 3,
  },
  {
    category: 'PHASE',
    key: 'APPROACH',
    mode: 'GUIDED',
    title: 'How to use approach probing questions',
    body: `When your interviewer asks a follow-up question ("What's the time complexity of that?", "Can you do better?"), it's a signal — not an attack.

**"Can you do better?"** usually means your current approach passes but a more optimal one exists. Don't abandon your current solution — ask "Is the complexity the concern, or the space?" to understand what dimension to optimize.

**"What happens if the input is empty?"** means you missed an edge case. Handle it immediately and move on.

**"Are you sure about that?"** means something is wrong. Walk back your last statement, not your entire approach. Say "Let me reconsider that step..." and trace through again.`,
    sortOrder: 4,
  },
  {
    category: 'PHASE',
    key: 'APPROACH',
    mode: 'STRICT',
    title: 'Commit and be precise',
    body: `In Strict mode you won't get redirected before you code. Your approach description must be complete enough to catch your own mistakes.

**Be precise about invariants.** Don't say "I'll use two pointers." Say "I'll use two pointers — left starts at 0, right starts at n−1, and I advance the pointer at the shorter height. The invariant is that the best answer from positions [left, right] is still reachable."

**Commit to one approach.** Don't say "I could do BFS or DFS." Say "I'll use BFS because I need the shortest path — DFS doesn't give shortest paths in unweighted graphs."

**Anticipate your own bugs.** "I need to be careful about the boundary condition when left == right" shows you've thought ahead.`,
    sortOrder: 5,
  },

  // ── IMPLEMENTATION ─────────────────────────────────────────────────────────
  {
    category: 'PHASE',
    key: 'IMPLEMENTATION',
    mode: 'ALL',
    title: 'Write code that reads like prose',
    body: `The interviewer reads your code as you write it. Make it easy to follow.

**Name variables for what they mean.** \`max_length\` over \`ml\`, \`left_pointer\` over \`l\`. Exception: loop indices \`i\`, \`j\` are fine.

**Write top-to-bottom.** Complete your main logic flow before extracting helpers. Don't jump between a helper and main logic — it's hard to follow.

**Handle base cases at the top.** Check empty input, single element, and null before your main loop. Cluttered conditionals inside a loop are harder to reason about.

**When you finish, don't say "done."** Say "let me trace through the example." Catch your own bug before the interviewer does.`,
    sortOrder: 1,
  },
  {
    category: 'PHASE',
    key: 'IMPLEMENTATION',
    mode: 'ALL',
    title: 'Common bugs to catch before submitting',
    body: `These are the most frequent sources of wrong answers. Check them before calling it done.

**Off-by-one errors:** Is your loop \`while left < right\` or \`while left <= right\`? Does your index go to \`n\` or \`n-1\`? Trace the last iteration.

**Not returning early:** Make sure every code path returns a value. If your function returns inside a loop, what does it return if the loop completes without returning?

**Integer overflow:** In Java/C++, \`mid = (left + right) / 2\` can overflow. Use \`left + (right - left) / 2\` instead.

**Mutating the input:** Unless asked to modify in-place, work on a copy or use separate state.

**Forgetting to advance pointers:** The classic infinite loop — if you have a \`while\` loop, make sure the pointer/index changes in every branch.`,
    sortOrder: 2,
  },
  {
    category: 'PHASE',
    key: 'IMPLEMENTATION',
    mode: 'GUIDED',
    title: 'How to handle hints during coding',
    body: `When you receive a hint during implementation, integrate it visibly.

**Acknowledge it:** "Good point — I was about to miss that edge case. Let me handle it here." This shows you understood the hint, not just followed an instruction.

**Trace forward from the hint.** If a hint points out your loop doesn't handle the last element, fix that specific spot and then re-trace the rest to see if it cascades.

**If a hint reveals a design flaw**, don't panic — say "That suggests my overall approach needs adjustment. Let me step back and..." Pivoting cleanly under pressure is itself a strong signal.`,
    sortOrder: 3,
  },
  {
    category: 'PHASE',
    key: 'IMPLEMENTATION',
    mode: 'STRICT',
    title: 'Self-reviewing in silence',
    body: `In Strict mode no one will catch your bugs for you. Build a self-review habit.

**After each logical block, pause and ask yourself:** Does this invariant still hold? Is this index in bounds? Did I cover the empty case?

**Trace the example out loud** (or in comments) as you write — don't wait until the end. If the example breaks mid-trace, you've found your bug early.

**Read your code once before submitting** as if you've never seen it. Every variable name, every loop boundary, every return statement. The bug is always "obvious in hindsight" — make the hindsight happen before the test runs.`,
    sortOrder: 4,
  },
];

// ---------------------------------------------------------------------------
// PATTERN TIPS
// ---------------------------------------------------------------------------

const PATTERN_TIPS: Array<{
  key: string;
  title: string;
  body: string;
  sortOrder: number;
}> = [
  {
    key: 'TWO_POINTERS',
    title: 'Two Pointers',
    body: `## Identification signals
- Input is a **sorted array or string** and you need pairs/triplets that satisfy a condition
- Problem asks you to do something "in-place" with O(1) extra space
- Keywords: "find two numbers that sum to", "remove duplicates", "container", "palindrome check"
- Brute force requires a nested loop — you need to eliminate one of them

## Core structure
Place one pointer at the start and one at the end (or both at start for same-direction problems). Advance them based on a comparison result — always advancing the pointer that gives you the best chance of improving the answer.

**Opposite-direction:** \`left=0, right=n-1\`. Advance whichever pointer's current value is less promising (e.g., shorter height in container problem).

**Same-direction:** Both start at 0. Fast pointer scans ahead; slow pointer marks a position. Used for "remove duplicates in-place".

## Complexity
Typically **O(n) time, O(1) space** — replacing an O(n²) nested loop.

## Don't use when
- Array is unsorted and you can't sort it (changes index semantics)
- You need more than 2 pointers tracking independent positions`,
    sortOrder: 1,
  },
  {
    key: 'SLIDING_WINDOW',
    title: 'Sliding Window',
    body: `## Identification signals
- Problem involves a **contiguous subarray or substring**
- You're asked to find the min/max/count of something within a window of a certain size or constraint
- Keywords: "longest substring", "minimum subarray", "at most k distinct", "all characters of t"
- Brute force considers all O(n²) subarrays — you want to reuse work from the previous window

## Core structure
Maintain a window [left, right]. Expand right freely. When a constraint is violated, shrink from the left until the constraint is restored.

The key insight: you never move left backwards, so each element is added and removed from the window at most once → **O(n)** total.

**Fixed-size window:** Slide a window of exactly k elements — add the new right element, remove the leftmost.
**Variable-size window:** Expand right until invalid, shrink left until valid again.

## Complexity
**O(n) time** (each element enters/exits the window once), typically **O(k) space** for the window's state (e.g., character counts).

## Don't use when
- Elements in the "window" don't need to be contiguous
- The optimal window isn't defined by a simple invariant that you can restore by shrinking from the left`,
    sortOrder: 2,
  },
  {
    key: 'FAST_SLOW_POINTERS',
    title: 'Fast & Slow Pointers',
    body: `## Identification signals
- Input is a **linked list** or sequence where you suspect a **cycle**
- Problem asks you to find the **middle** of a linked list
- Problem involves finding the kth element from the end
- Constraint: O(1) extra space (no storing visited nodes in a set)

## Core structure
Two pointers move through the structure at different speeds. Slow moves 1 step, fast moves 2 steps.

**Cycle detection:** If they ever meet, there's a cycle. If fast reaches null, there's no cycle.

**Finding middle:** When fast reaches the end, slow is at the middle. (For even-length lists, this lands slow at the first or second middle depending on your exact condition.)

**Finding kth from end:** Move fast k steps ahead first, then move both until fast reaches the end — slow is at the target.

## Complexity
**O(n) time, O(1) space** — this is the whole point.

## Don't use when
- The data structure allows random access (use index math instead)
- You need to find the cycle length (Floyd's algorithm needs an extra traversal for that)`,
    sortOrder: 3,
  },
  {
    key: 'BINARY_SEARCH',
    title: 'Binary Search',
    body: `## Identification signals
- Array is **sorted** (or you can binary search on the answer space)
- Problem requires **O(log n)** — explicitly stated or implied by input size (n ≤ 10⁸)
- You're looking for a value, or asking "can I achieve X?" where the answer is monotone (if X works, so does X-1)
- Keywords: "sorted array", "search", "find minimum", "find position"

## Core structure
\`left=0, right=n-1\`. At each step compute \`mid = left + (right-left)//2\`. Compare target to mid value, eliminate half the search space.

**Key decision:** Is your loop \`while left <= right\` (inclusive boundaries, search for exact match) or \`while left < right\` (converging to a point)? The wrong choice creates infinite loops or off-by-one errors. Pick one style and stick to it.

**Binary search on the answer:** When you can't binary search on an array but the answer itself is monotone (e.g., "minimum capacity that works"), binary search on the range of possible answers.

## Complexity
**O(log n) time, O(1) space**.

## Don't use when
- Array is unsorted and sorting it would lose needed information (indices)
- The search space isn't monotone`,
    sortOrder: 4,
  },
  {
    key: 'BFS',
    title: 'Breadth-First Search',
    body: `## Identification signals
- Problem involves a **graph or grid** and you need the **shortest path** or **minimum steps**
- You need to process nodes **level by level** (tree level-order, word ladder)
- Keywords: "shortest path", "minimum steps to reach", "level order", "nearest X"
- DFS would find *a* path but not necessarily the *shortest* one

## Core structure
Queue-based. Process level by level using a queue. Mark nodes visited immediately on enqueue (not on dequeue) to avoid duplicate processing.

\`\`\`
queue = deque([start])
visited = {start}
distance = 0
while queue:
    for _ in range(len(queue)):  # process one level at a time
        node = queue.popleft()
        if node == target: return distance
        for neighbor in get_neighbors(node):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    distance += 1
\`\`\`

## Complexity
**O(V + E)** for graphs, **O(m × n)** for grids. Space is O(V) for the visited set.

## Don't use when
- You need to explore all paths or all solutions (use DFS/backtracking)
- The graph is very deep and wide (BFS's queue can be large; DFS uses call-stack depth instead)`,
    sortOrder: 5,
  },
  {
    key: 'DFS_BACKTRACKING',
    title: 'DFS & Backtracking',
    body: `## Identification signals
- Problem asks to **enumerate all** solutions: permutations, subsets, combinations, paths
- Keywords: "generate all", "find all possible", "count all valid", "word search"
- The solution space can be modeled as a **decision tree** — at each step you make a choice
- Brute force "try everything" IS the intended approach (just prune cleverly)

## Core structure
Recursive function with a state parameter. At each call, record the current state as a valid result (if appropriate), then try all choices, recurse, then **undo the choice** (backtrack).

\`\`\`
def backtrack(state, choices):
    if is_solution(state):
        result.append(copy(state))
        return  # or continue if all prefixes are also solutions
    for choice in choices:
        if is_valid(choice, state):
            state.add(choice)
            backtrack(state, remaining_choices)
            state.remove(choice)  # ← the backtrack step
\`\`\`

**Critical:** The \`state.remove\` must be the exact inverse of \`state.add\`. Anything you do before recursing must be undone after.

## Complexity
Exponential in the worst case: **O(2ⁿ)** for subsets, **O(n!)** for permutations. Pruning reduces the constant factor significantly.

## Don't use when
- You only need one solution (use greedy or DP — they're much faster)
- The problem has optimal substructure (use DP instead)`,
    sortOrder: 6,
  },
  {
    key: 'DP_1D',
    title: 'Dynamic Programming — 1D',
    body: `## Identification signals
- Problem asks for an **optimal value** (min, max, count) over a sequence
- Each decision depends only on a **fixed number of previous states** (not all of them)
- Keywords: "minimum cost", "number of ways", "maximum profit", "can you reach"
- You notice your recursive solution recomputes the same subproblems repeatedly

## Core structure
\`dp[i]\` = optimal answer for the problem of size i. Fill left to right.

**Two questions to derive the recurrence:**
1. What does \`dp[i]\` represent exactly?
2. How does \`dp[i]\` depend on earlier states?

Once you have the recurrence, check: do you need the full array or just the last 1–2 values? If the latter, reduce to O(1) space.

## Common recurrences
- Fibonacci-style: \`dp[i] = dp[i-1] + dp[i-2]\`
- Take/skip: \`dp[i] = max(dp[i-1], dp[i-2] + val[i])\`
- Unbounded choice: \`dp[i] = min(dp[i-j] + cost for all valid j)\`

## Complexity
Usually **O(n) time, O(n) space** — reducible to O(1) space when only recent states are needed.

## Don't use when
- Decisions are independent (use greedy)
- The state space is too large to memoize`,
    sortOrder: 7,
  },
  {
    key: 'DP_2D',
    title: 'Dynamic Programming — 2D',
    body: `## Identification signals
- Problem involves two sequences (strings, arrays) and you compare/combine them
- Problem is a grid problem where cost/count at each cell depends on adjacent cells
- Keywords: "longest common subsequence", "edit distance", "unique paths", "minimum path sum"
- Recursive solution has two indices (i, j) that both change across subproblems

## Core structure
\`dp[i][j]\` = answer for the subproblem defined by position (i, j). Fill row by row.

**Key questions:**
1. What does \`dp[i][j]\` represent? (Be precise — "minimum cost to reach cell (i,j)" vs "maximum coins collected")
2. What are the base cases? (Usually row 0 and column 0)
3. How does \`dp[i][j]\` depend on \`dp[i-1][j]\`, \`dp[i][j-1]\`, \`dp[i-1][j-1]\`?

Often reducible to **1D space** by keeping only the current and previous row.

## Complexity
**O(m × n) time and space**, reducible to **O(min(m, n)) space**.

## Don't use when
- The problem doesn't have overlapping subproblems at both dimensions
- One dimension is too large (consider rolling array or different approach)`,
    sortOrder: 8,
  },
  {
    key: 'MONOTONIC_STACK',
    title: 'Monotonic Stack',
    body: `## Identification signals
- For each element, you need the **next/previous greater or smaller element**
- Problem involves a **histogram** or "trapped water" shape
- You need to maintain elements in a specific order while processing left-to-right
- Keywords: "next greater element", "largest rectangle", "trapping rain water", "daily temperatures"

## Core structure
A stack that is always sorted (either increasing or decreasing). When a new element breaks the order, pop elements and resolve them.

**Monotonic decreasing stack** (for next greater element):
- Push index onto stack
- When \`arr[i] > arr[stack.top()]\`: the top element found its next greater → pop, record answer, repeat
- Push i

The key insight: each element is pushed and popped at most once → **O(n) total**.

## What the stack stores
Store **indices**, not values — you need the position to compute distances or retrieve associated values.

## Complexity
**O(n) time, O(n) space** (for the stack).

## Don't use when
- You need more than one future element (not just the immediate next/previous)
- The relationship between elements isn't reducible to a stack ordering`,
    sortOrder: 9,
  },
  {
    key: 'HEAP',
    title: 'Heap / Priority Queue',
    body: `## Identification signals
- Problem involves finding the **kth largest/smallest** element
- You need to repeatedly extract the min or max from a changing set
- Keywords: "k closest", "kth largest", "merge k sorted", "top k", "median from stream"
- Sorting solves it but you need to handle a **dynamic stream** of elements

## Core structure
**Min-heap of size k** → tracks the k largest elements (root is the kth largest).
**Max-heap of size k** → tracks the k smallest elements (root is the kth smallest).

Push each element. If size exceeds k, pop the top. After processing, the root is your answer.

**Two-heap technique** (median from stream): A max-heap of the lower half and a min-heap of the upper half, kept balanced. The median is the tops of these heaps.

## Complexity
**O(n log k)** for k-element problems. Heap operations are O(log k).

## Don't use when
- k is close to n (just sort — O(n log n) is simpler and comparable)
- The input is already sorted (just index directly)`,
    sortOrder: 10,
  },
  {
    key: 'INTERVALS',
    title: 'Intervals',
    body: `## Identification signals
- Input contains pairs [start, end] representing ranges or time windows
- Keywords: "merge intervals", "meeting rooms", "insert interval", "non-overlapping intervals"
- Problem asks about overlap, coverage, or gaps between ranges

## Core structure
**Almost always: sort by start time first.** Once sorted, you only ever need to compare each interval with the last processed one.

**Overlap condition:** Interval [a, b] and [c, d] overlap if \`c <= b\` (second starts before first ends).

**Merge:** If current overlaps last merged, extend: \`last.end = max(last.end, current.end)\`. The max handles containment ([1,10] contains [2,5]).

**Count non-overlapping (greedy):** Sort by end time. Greedily take intervals that don't conflict with the last taken. This maximizes the count.

## Complexity
**O(n log n)** for sort, **O(n)** for the merge sweep. Total: **O(n log n)**.

## Don't use when
- Intervals don't have a useful sort order
- The problem is really a graph problem (scheduling dependencies → topological sort)`,
    sortOrder: 11,
  },
  {
    key: 'UNION_FIND',
    title: 'Union-Find (Disjoint Set Union)',
    body: `## Identification signals
- Problem involves **grouping elements into components** or checking if two elements are connected
- You're processing edges/connections one at a time and need to track connectivity incrementally
- Keywords: "connected components", "redundant connection", "accounts merge", "detect cycle"
- BFS/DFS would work but you need faster repeated connectivity queries

## Core structure
Two arrays: \`parent[]\` and \`rank[]\`. Initially each node is its own parent (n components).

\`find(x)\`: traverse parent pointers up to the root. With path compression, flatten the tree.
\`union(x, y)\`: merge the components of x and y by linking their roots. Use rank to keep the tree shallow.

\`\`\`
def find(x):
    if parent[x] != x: parent[x] = find(parent[x])  # path compression
    return parent[x]

def union(x, y):
    rx, ry = find(x), find(y)
    if rx == ry: return False  # already connected
    if rank[rx] < rank[ry]: parent[rx] = ry
    elif rank[rx] > rank[ry]: parent[ry] = rx
    else: parent[ry] = rx; rank[rx] += 1
    return True
\`\`\`

## Complexity
Nearly **O(1) per operation** with path compression + union by rank (technically O(α(n)) — inverse Ackermann, effectively constant).

## Don't use when
- You need the full path between two nodes (UF only answers "are they connected?")
- The graph has directed edges (UF is for undirected graphs)`,
    sortOrder: 12,
  },
  {
    key: 'TRIE',
    title: 'Trie (Prefix Tree)',
    body: `## Identification signals
- Problem involves **prefix matching** or prefix-based search
- You have a large set of strings and need efficient lookup by prefix
- Keywords: "autocomplete", "word search II", "prefix", "starts with", "dictionary"
- A hash set stores words but can't answer "any word starts with this prefix?" in O(k)

## Core structure
Each node stores: \`children\` (dict or 26-element array) and \`is_end\` (bool).

**Insert:** Walk character by character, create nodes as needed, mark final node \`is_end = True\`.
**Search:** Walk the path. Return True only if you reach the end of the word AND \`is_end\` is True.
**StartsWith:** Same walk, return True if you reach the end of the prefix regardless of \`is_end\`.

**Space optimization:** If only lowercase letters, use an array of 26 instead of a dict (faster access, fixed size).

## Complexity
**O(k) per operation** where k is word length — independent of the number of words stored. Space: **O(total characters across all words)**.

## Don't use when
- You're only doing exact-match lookups (use a hash set — simpler and faster)
- The alphabet is very large (dict children, not array)`,
    sortOrder: 13,
  },
  {
    key: 'BIT_MANIPULATION',
    title: 'Bit Manipulation',
    body: `## Identification signals
- Problem involves **finding unique/missing elements** in an array where others repeat
- Problem asks to operate on binary representations directly
- Constraint: O(1) space (ruling out hash maps)
- Keywords: "appears once/twice", "missing number", "power of two", "count bits", "swap without temp"

## Key operations
| Expression | Meaning |
|------------|---------|
| \`a ^ a = 0\` | XOR cancels duplicates |
| \`a ^ 0 = a\` | XOR with 0 is identity |
| \`a & (a-1)\` | Clears the lowest set bit |
| \`a & (-a)\` | Isolates the lowest set bit |
| \`a >> k\` | Divide by 2^k |
| \`1 << k\` | 2^k |

## Common tricks
- **Find single in array of doubles:** XOR all elements (pairs cancel, single remains)
- **Check power of 2:** \`n > 0 and (n & (n-1)) == 0\`
- **Count set bits:** \`while n: count += n & 1; n >>= 1\` or \`bin(n).count('1')\`
- **Find missing number 0..n:** XOR all indices with all values

## Complexity
Usually **O(n) time, O(1) space** — the whole point is avoiding extra data structures.

## Don't use when
- A hash map would be simpler and performance isn't critical
- The problem doesn't actually involve binary properties`,
    sortOrder: 14,
  },
  {
    key: 'LINKED_LISTS',
    title: 'Linked Lists',
    body: `## Identification signals
- Input is explicitly a linked list
- Problem involves reversal, merging, cycle detection, or finding a position
- Constraint: O(1) extra space (no converting to array)

## Core techniques

**Three-pointer reversal:** \`prev=None, curr=head\`. Loop: save \`nxt=curr.next\`, set \`curr.next=prev\`, advance \`prev=curr, curr=nxt\`. When \`curr\` is None, \`prev\` is the new head.

**Dummy node:** Prepend a dummy node (\`dummy.next = head\`) to unify the case where you need to modify the head. Return \`dummy.next\` at the end. Eliminates conditional logic for empty lists.

**Runner technique (fast/slow):** Fast moves 2 steps, slow moves 1. Used for cycle detection, finding middle, finding kth from end.

**In-place merge:** Use pointer manipulation to weave two lists together without allocating new nodes.

## Complexity
Most linked list operations are **O(n) time, O(1) space**. If you find yourself using O(n) space, you're probably converting to an array unnecessarily.

## Don't use when
- Random access is needed (linked lists are O(n) for index access)`,
    sortOrder: 15,
  },
  {
    key: 'HASH_MAPS',
    title: 'Hash Maps & Hash Sets',
    body: `## Identification signals
- Problem requires **O(1) lookup** of whether something exists or what its value is
- You're grouping elements by some computed property (anagrams → sorted key, frequency → count)
- Keywords: "two sum", "anagram", "frequency", "first unique", "group by"
- Brute force requires checking every element against every other element — O(n²)

## Hash map vs hash set
- **Map (dict):** When you need to store a value associated with each key (e.g., index, count, last-seen position)
- **Set:** When you only need to know if something exists, not a value (e.g., visited nodes, seen characters)

## Common patterns
- **Complement lookup (Two Sum):** Store what you've seen, look up target − current
- **Frequency count:** \`count[x] += 1\` for each x, then query counts
- **Canonical key grouping (Anagrams):** Map each element to a canonical form, group by that key
- **Sliding window state:** Track character counts in a window with a map

## Complexity
**O(n) time average, O(n) space.** Hash collisions can degrade to O(n) per operation in adversarial inputs — not an issue in interview problems with typical inputs.

## Don't use when
- Input is sorted and binary search would be O(log n) vs your O(1) per query (hash map wins on per-query but loses on setup if n is small)`,
    sortOrder: 16,
  },
  {
    key: 'PREFIX_SUMS',
    title: 'Prefix Sums',
    body: `## Identification signals
- Multiple queries asking for the **sum of a subarray**
- Problem asks to count subarrays where sum equals k (or satisfies some condition)
- You need to compute something about every subarray efficiently
- Keywords: "subarray sum", "range query", "running total", "cumulative"

## Core structure
\`prefix[i] = sum(arr[0..i-1])\` with \`prefix[0] = 0\`.

**Range sum in O(1):** \`sum(left, right) = prefix[right+1] - prefix[left]\`

**Count subarrays summing to k:** At each position, check how many previous prefix sums equal \`prefix[i] - k\`. Use a hash map: \`count[prefix_sum] → number of times seen\`.

\`\`\`
count = {0: 1}  # empty prefix
prefix = 0
result = 0
for num in arr:
    prefix += num
    result += count.get(prefix - k, 0)
    count[prefix] = count.get(prefix, 0) + 1
\`\`\`

## Complexity
**O(n) time and space** for the prefix array. Range queries become **O(1)** after O(n) preprocessing.

## Don't use when
- The array changes frequently (updates invalidate the prefix array — use a segment tree instead)
- You only need one range query (just scan that range directly)`,
    sortOrder: 17,
  },
  {
    key: 'GREEDY',
    title: 'Greedy',
    body: `## Identification signals
- At each step, making the **locally optimal choice** leads to the globally optimal solution
- Problem involves **scheduling, intervals, or resource allocation**
- Keywords: "minimum number of X to cover Y", "maximum non-overlapping", "gas station", "jump game"
- DP also works but greedy would be simpler — verify the greedy choice is safe

## How to verify a greedy is correct
Ask: *"If I make the greedy choice now, can it ever hurt me later?"*

Proof strategy: assume an optimal solution differs from greedy at some step. Show you can swap the greedy choice in without making the solution worse (exchange argument).

## Common greedy patterns
- **Sort by end time:** Maximizes the number of non-overlapping intervals you can pick
- **Sort by start time:** Best for merging/covering problems
- **Track reachable range:** Jump Game — track the furthest index reachable, fail if current index exceeds it
- **Take the biggest denomination first:** Coin change with specific denominations

## Complexity
Usually **O(n log n)** (dominated by sort) or **O(n)** if no sort needed.

## Don't use when
- You can't prove the greedy choice is always safe (use DP instead — greedy without proof is wrong)
- The problem has the "counting all solutions" shape (use backtracking)`,
    sortOrder: 18,
  },
  {
    key: 'SORT_SEARCH',
    title: 'Sort & Search',
    body: `## Identification signals
- Problem becomes much simpler if the input were sorted
- You need to find elements satisfying a condition among unsorted elements
- Problem involves ordering, ranking, or selection (kth element, median)
- Keywords: "k closest elements", "sort and then", "find the kth", "three sum"

## Core techniques

**Sort then two-pointer:** Three Sum — sort first, fix one element, use two pointers for the rest. Sorting transforms O(n³) to O(n²).

**Quickselect (kth element):** Like quicksort's partition step. Expected O(n) for finding kth smallest without full sort.

**Custom sort key:** Sort by a derived property (sort intervals by start, sort tasks by frequency).

**Dutch National Flag:** Three-way partition for problems with exactly 3 values (0, 1, 2 — sort colors).

## Complexity
**O(n log n)** for sort-based approaches. Quickselect is **O(n) average, O(n²) worst case**.

## Sorting stability
Python's sort is stable (Timsort). Java's \`Arrays.sort\` for primitives uses quicksort (unstable). Matters when secondary ordering is important.

## Don't use when
- The array is already sorted (binary search directly)
- Sorting would lose needed index information and you can't afford O(n) extra space`,
    sortOrder: 19,
  },
  {
    key: 'MATH_GEOMETRY',
    title: 'Math & Geometry',
    body: `## Identification signals
- Problem involves coordinates, areas, distances, or geometric shapes
- Problem has a mathematical trick that eliminates the need for a data structure
- Keywords: "rotate", "spiral", "find the pattern", "power of", "count primes", "GCD"

## Common tricks

**Matrix rotation (90° clockwise):** Transpose then reverse each row. Counter-clockwise: reverse each row then transpose.

**Spiral traversal:** Use four boundary pointers (top, bottom, left, right). Process each boundary in order, shrink.

**GCD/LCM:** \`gcd(a,b) = gcd(b, a%b)\` (Euclidean). \`lcm(a,b) = a*b // gcd(a,b)\`.

**Collinear points:** Three points A, B, C are collinear if the slope AB equals slope BC: \`(y2-y1)*(x3-x2) == (y3-y2)*(x2-x1)\`. Use cross product to avoid division (and floating point errors).

**Count primes (Sieve of Eratosthenes):** Initialize all True, mark multiples of each prime as False.

**Power of 2:** \`n > 0 and (n & (n-1)) == 0\`

## Complexity
Highly variable. Sieve is O(n log log n). Most matrix tricks are O(n²). GCD is O(log min(a,b)).

## Don't use when
- A simpler pattern (hash map, two pointers) solves it without math`,
    sortOrder: 20,
  },
];

// ---------------------------------------------------------------------------
// DRILLS
// ---------------------------------------------------------------------------

const DRILLS: Array<{
  type: string;
  pattern: string | null;
  prompt: string;
  correctAnswer: string | null;
  difficulty: string;
}> = [
  // ── PATTERN_ID DRILLS (2 per pattern, 40 total) ───────────────────────────

  // TWO_POINTERS
  {
    type: 'PATTERN_ID',
    pattern: 'TWO_POINTERS',
    prompt: `Given a sorted array of integers and a target sum, find two numbers in the array that add up to the target. Return their 1-based positions. The array is guaranteed to have exactly one solution and you cannot use the same element twice. Your solution must use O(1) extra space.

Example: numbers = [2,7,11,15], target = 9 → [1,2]
Example: numbers = [2,3,4], target = 6 → [1,3]

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'TWO_POINTERS',
    difficulty: 'EASY',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'TWO_POINTERS',
    prompt: `Given a sorted array of integers, remove duplicates in-place so that each unique element appears only once. Return the count of unique elements. The relative order of elements must be maintained. Use O(1) extra space — you may not create a new array.

Example: nums = [1,1,2] → 2, with the first two elements being [1,2]
Example: nums = [0,0,1,1,1,2,2,3,3,4] → 5

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'TWO_POINTERS',
    difficulty: 'EASY',
  },

  // SLIDING_WINDOW
  {
    type: 'PATTERN_ID',
    pattern: 'SLIDING_WINDOW',
    prompt: `Given an array of positive integers and a number k, find the maximum sum of any contiguous subarray of exactly length k.

Example: arr = [2,1,5,1,3,2], k = 3 → 9 (subarray [5,1,3])
Example: arr = [2,3,4,1,5], k = 2 → 7 (subarray [3,4])

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'SLIDING_WINDOW',
    difficulty: 'EASY',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'SLIDING_WINDOW',
    prompt: `Given a string s and a string t, find the minimum length substring of s that contains all characters of t (including duplicates). If no such substring exists, return "".

Example: s = "ADOBECODEBANC", t = "ABC" → "BANC"
Example: s = "a", t = "a" → "a"
Example: s = "a", t = "aa" → ""

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'SLIDING_WINDOW',
    difficulty: 'HARD',
  },

  // FAST_SLOW_POINTERS
  {
    type: 'PATTERN_ID',
    pattern: 'FAST_SLOW_POINTERS',
    prompt: `Given the head of a singly linked list, find and return the middle node. If there are two middle nodes (even-length list), return the second one. Your solution must use O(1) extra space — you may not store nodes in an array or count the length first.

Example: [1,2,3,4,5] → node with value 3
Example: [1,2,3,4,5,6] → node with value 4

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'FAST_SLOW_POINTERS',
    difficulty: 'EASY',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'FAST_SLOW_POINTERS',
    prompt: `A sequence is defined where the next value is the sum of squares of each digit of the current value. Determine if a given positive integer is "happy" — meaning repeatedly applying this process eventually reaches 1. Numbers that are not happy loop forever and never reach 1. Detect the cycle using O(1) space.

Example: 19 → 1² + 9² = 82 → 8² + 2² = 68 → ... → 1 ✓ (happy)
Example: 2 → 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4 (cycle, not happy)

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'FAST_SLOW_POINTERS',
    difficulty: 'EASY',
  },

  // BINARY_SEARCH
  {
    type: 'PATTERN_ID',
    pattern: 'BINARY_SEARCH',
    prompt: `Given a sorted array of integers, find the index of the leftmost position where a target value could be inserted to keep the array sorted. If the target already exists, return the index of its first occurrence. Your solution must run in O(log n).

Example: nums = [1,3,5,6], target = 5 → 2
Example: nums = [1,3,5,6], target = 2 → 1
Example: nums = [1,3,5,6], target = 7 → 4

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'BINARY_SEARCH',
    difficulty: 'EASY',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'BINARY_SEARCH',
    prompt: `You need to ship packages over D days. The weights array gives the weight of each package in order — you must ship them in order. You have a conveyor belt with a daily weight capacity; you want to find the minimum capacity needed to ship all packages within D days. Packages cannot be split across days.

Example: weights=[1,2,3,4,5,6,7,8,9,10], days=5 → 15

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'BINARY_SEARCH',
    difficulty: 'MEDIUM',
  },

  // BFS
  {
    type: 'PATTERN_ID',
    pattern: 'BFS',
    prompt: `Given a binary tree, return the average value of nodes at each depth level, in order from root to leaves.

Example:
    3
   / \\
  9  20
    /  \\
   15   7
→ [3.0, 14.5, 11.0]

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'BFS',
    difficulty: 'EASY',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'BFS',
    prompt: `Given two words (start and end) and a word list, find the length of the shortest transformation sequence from start to end, where each step changes exactly one letter and every intermediate word must be in the word list. Return 0 if no sequence exists.

Example: start="hit", end="cog", list=["hot","dot","dog","lot","log","cog"] → 5
Sequence: hit → hot → dot → dog → cog

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'BFS',
    difficulty: 'HARD',
  },

  // DFS_BACKTRACKING
  {
    type: 'PATTERN_ID',
    pattern: 'DFS_BACKTRACKING',
    prompt: `Given an integer n, return all structurally unique binary search trees that have exactly n nodes with values 1 to n. The order of results doesn't matter.

Example: n=3 → 5 unique trees

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'DFS_BACKTRACKING',
    difficulty: 'HARD',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'DFS_BACKTRACKING',
    prompt: `Given a collection of numbers that might contain duplicates, return all possible unique permutations.

Example: nums = [1,1,2] → [[1,1,2],[1,2,1],[2,1,1]]

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'DFS_BACKTRACKING',
    difficulty: 'MEDIUM',
  },

  // DP_1D
  {
    type: 'PATTERN_ID',
    pattern: 'DP_1D',
    prompt: `Given an array of non-negative integers where each element represents the cost to step on that stair, find the minimum cost to reach the top of the floor. You can either start from step 0 or step 1, and from any step you can climb 1 or 2 steps.

Example: cost = [10,15,20] → 15
Example: cost = [1,100,1,1,1,100,1,1,100,1] → 6

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'DP_1D',
    difficulty: 'EASY',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'DP_1D',
    prompt: `Given an integer array where each element represents the maximum jump length from that position, find the minimum number of jumps required to reach the last index from the first index. Assume you can always reach the last index.

Example: nums = [2,3,1,1,4] → 2 (jump from index 0 to 1, then 1 to 4)
Example: nums = [2,3,0,1,4] → 2

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'DP_1D',
    difficulty: 'MEDIUM',
  },

  // DP_2D
  {
    type: 'PATTERN_ID',
    pattern: 'DP_2D',
    prompt: `Given two strings word1 and word2, find the minimum number of operations (insert, delete, or replace a character) needed to transform word1 into word2.

Example: word1="horse", word2="ros" → 3
  horse → rorse → rose → ros

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'DP_2D',
    difficulty: 'HARD',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'DP_2D',
    prompt: `Given a grid of non-negative integers, find the path from the top-left to the bottom-right corner (moving only right or down) that minimizes the sum of all numbers along the path.

Example:
grid = [[1,3,1],[1,5,1],[4,2,1]] → 7
Path: 1→3→1→1→1

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'DP_2D',
    difficulty: 'MEDIUM',
  },

  // MONOTONIC_STACK
  {
    type: 'PATTERN_ID',
    pattern: 'MONOTONIC_STACK',
    prompt: `Given n non-negative integers representing an elevation map where each bar has width 1, compute how much water can be trapped after raining.

Example: height = [0,1,0,2,1,0,1,3,2,1,2,1] → 6

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'MONOTONIC_STACK',
    difficulty: 'HARD',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'MONOTONIC_STACK',
    prompt: `Given a circular integer array (the next element of the last element is the first element), return the next greater number for every element. If no greater number exists, output -1.

Example: nums = [1,2,1] → [2,-1,2]
(For the last 1, the next greater element looking circularly is 2.)

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'MONOTONIC_STACK',
    difficulty: 'MEDIUM',
  },

  // HEAP
  {
    type: 'PATTERN_ID',
    pattern: 'HEAP',
    prompt: `Given a list of tasks labeled A–Z and a cooldown period n, find the minimum number of CPU intervals needed to execute all tasks. The same task cannot be executed within n intervals of its previous execution; the CPU can be idle.

Example: tasks=["A","A","A","B","B","B"], n=2 → 8
Sequence: A → B → idle → A → B → idle → A → B

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'HEAP',
    difficulty: 'MEDIUM',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'HEAP',
    prompt: `Given an infinite stream of integers, design a data structure that supports: (1) adding a number to the stream, (2) returning the median of all numbers added so far. Both operations should be efficient.

Example: add(1), add(2) → median=1.5, add(3) → median=2

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'HEAP',
    difficulty: 'HARD',
  },

  // INTERVALS
  {
    type: 'PATTERN_ID',
    pattern: 'INTERVALS',
    prompt: `Given an array of meeting time intervals where intervals[i] = [start, end], find the minimum number of conference rooms required to hold all meetings simultaneously.

Example: intervals = [[0,30],[5,10],[15,20]] → 2
Example: intervals = [[7,10],[2,4]] → 1

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'INTERVALS',
    difficulty: 'MEDIUM',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'INTERVALS',
    prompt: `Given a list of non-overlapping intervals sorted by start time, and a new interval, insert the new interval into the list and merge any overlapping intervals. Return the resulting list of non-overlapping intervals.

Example: intervals=[[1,3],[6,9]], newInterval=[2,5] → [[1,5],[6,9]]
Example: intervals=[[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval=[4,8] → [[1,2],[3,10],[12,16]]

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'INTERVALS',
    difficulty: 'MEDIUM',
  },

  // UNION_FIND
  {
    type: 'PATTERN_ID',
    pattern: 'UNION_FIND',
    prompt: `Given a list of accounts where each account contains a name and a list of emails, merge accounts that share at least one email. Return the merged accounts with emails sorted, in any order.

Example: accounts=[["John","john@ex.com","john_ny@ex.com"],["John","john_ny@ex.com","john00@ex.com"]]
→ [["John","john00@ex.com","john@ex.com","john_ny@ex.com"]]

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'UNION_FIND',
    difficulty: 'MEDIUM',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'UNION_FIND',
    prompt: `Given an undirected graph with n nodes and a list of edges, find the redundant edge — the one that, if removed, would make the graph a valid tree (connected and acyclic). If multiple answers exist, return the last one in the input.

Example: edges=[[1,2],[1,3],[2,3]] → [2,3]
Example: edges=[[1,2],[2,3],[3,4],[1,4],[1,5]] → [1,4]

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'UNION_FIND',
    difficulty: 'MEDIUM',
  },

  // TRIE
  {
    type: 'PATTERN_ID',
    pattern: 'TRIE',
    prompt: `Design a data structure that supports two operations: addWord(word) which adds a word to the structure, and search(word) which returns true if any word in the structure matches the query. The query may contain '.' characters which can match any single letter.

Example: addWord("bad"), addWord("dad"), search(".ad") → true, search("b..") → true

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'TRIE',
    difficulty: 'MEDIUM',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'TRIE',
    prompt: `Given a list of strings, find the longest string that is a prefix of at least two strings in the list and is itself a word in the list.

More concretely: given ["a","banana","app","appl","ap","apply","apple"], find the longest word such that every prefix of that word is also a word in the list.

Example: ["a","banana","app","appl","ap","apply","apple"] → "apple"

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'TRIE',
    difficulty: 'MEDIUM',
  },

  // BIT_MANIPULATION
  {
    type: 'PATTERN_ID',
    pattern: 'BIT_MANIPULATION',
    prompt: `Given an array where every element appears three times except for one element which appears exactly once, find that single element. Your solution must run in O(n) time and O(1) space.

Example: nums = [2,2,3,2] → 3
Example: nums = [0,1,0,1,0,1,99] → 99

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'BIT_MANIPULATION',
    difficulty: 'HARD',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'BIT_MANIPULATION',
    prompt: `Given a non-negative integer n, count the total number of 1-bits across the binary representations of all integers from 0 to n (inclusive).

Example: n=2 → 2  (0→0 bits, 1→1 bit, 2→1 bit)
Example: n=5 → 7  (0,1,1,2,1,2 → 0+1+1+1+2+1+1 = 7)

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'BIT_MANIPULATION',
    difficulty: 'MEDIUM',
  },

  // LINKED_LISTS
  {
    type: 'PATTERN_ID',
    pattern: 'LINKED_LISTS',
    prompt: `Given the heads of two sorted linked lists, merge them into a single sorted linked list and return its head. The merged list should be made by splicing together nodes from the two lists (no new nodes).

Example: list1=[1,2,4], list2=[1,3,4] → [1,1,2,3,4,4]

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'LINKED_LISTS',
    difficulty: 'EASY',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'LINKED_LISTS',
    prompt: `Given the head of a linked list, reorder it such that nodes are arranged as: first node, last node, second node, second-to-last node, and so on. Modify the list in-place — do not return a new list or use extra space beyond O(1).

Example: [1,2,3,4] → [1,4,2,3]
Example: [1,2,3,4,5] → [1,5,2,4,3]

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'LINKED_LISTS',
    difficulty: 'MEDIUM',
  },

  // HASH_MAPS
  {
    type: 'PATTERN_ID',
    pattern: 'HASH_MAPS',
    prompt: `Given an unsorted array of integers, find the length of the longest sequence of consecutive integers (e.g., 4,5,6,7). The sequence elements don't need to be adjacent in the array. Your solution must run in O(n) time.

Example: nums=[100,4,200,1,3,2] → 4  (sequence: 1,2,3,4)
Example: nums=[0,3,7,2,5,8,4,6,0,1] → 9

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'HASH_MAPS',
    difficulty: 'MEDIUM',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'HASH_MAPS',
    prompt: `Given a string, find the first character that appears only once. Return its index, or -1 if no such character exists.

Example: s="leetcode" → 0  ('l' appears once, at index 0)
Example: s="loveleetcode" → 2  ('v' is first unique)
Example: s="aabb" → -1

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'HASH_MAPS',
    difficulty: 'EASY',
  },

  // PREFIX_SUMS
  {
    type: 'PATTERN_ID',
    pattern: 'PREFIX_SUMS',
    prompt: `Given an integer array and an integer k, return the total number of contiguous subarrays whose sum equals k. The array may contain negative numbers.

Example: nums=[1,1,1], k=2 → 2
Example: nums=[1,2,3], k=3 → 2  (subarrays [1,2] and [3])

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'PREFIX_SUMS',
    difficulty: 'MEDIUM',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'PREFIX_SUMS',
    prompt: `Given a binary array (containing only 0s and 1s), find the maximum length subarray with an equal number of 0s and 1s.

Example: nums=[0,1] → 2
Example: nums=[0,1,0] → 2

Hint: try converting the problem by treating 0 as -1 and looking for subarrays that sum to 0.

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'PREFIX_SUMS',
    difficulty: 'MEDIUM',
  },

  // GREEDY
  {
    type: 'PATTERN_ID',
    pattern: 'GREEDY',
    prompt: `You are given an array of integers where each element represents the maximum number of steps you can jump forward from that position. Return true if you can reach the last index from index 0, or false otherwise.

Example: nums=[2,3,1,1,4] → true
Example: nums=[3,2,1,0,4] → false

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'GREEDY',
    difficulty: 'MEDIUM',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'GREEDY',
    prompt: `Given an array of non-negative integers representing the height of walls (each with width 1), find the two walls that together with the ground form a container that holds the most water. You want to maximize the area of water contained.

Example: height=[1,8,6,2,5,4,8,3,7] → 49

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'GREEDY',
    difficulty: 'MEDIUM',
  },

  // SORT_SEARCH
  {
    type: 'PATTERN_ID',
    pattern: 'SORT_SEARCH',
    prompt: `Given an integer array and a target, find three integers that sum closest to the target. Return the sum of those three integers. Assume exactly one solution exists.

Example: nums=[-1,2,1,-4], target=1 → 2 (sum -1+2+1=2 is closest to 1)

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'SORT_SEARCH',
    difficulty: 'MEDIUM',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'SORT_SEARCH',
    prompt: `Given an array of n objects colored red (0), white (1), or blue (2), sort them in-place so objects of the same color are adjacent, in the order 0, 1, 2. You must not use a library sort function, and you may only make one pass through the array.

Example: nums=[2,0,2,1,1,0] → [0,0,1,1,2,2]

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'SORT_SEARCH',
    difficulty: 'MEDIUM',
  },

  // MATH_GEOMETRY
  {
    type: 'PATTERN_ID',
    pattern: 'MATH_GEOMETRY',
    prompt: `Given an n×n matrix, rotate it 90 degrees clockwise in-place. You must not allocate another 2D matrix.

Example:
[[1,2,3],[4,5,6],[7,8,9]] → [[7,4,1],[8,5,2],[9,6,3]]

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'MATH_GEOMETRY',
    difficulty: 'MEDIUM',
  },
  {
    type: 'PATTERN_ID',
    pattern: 'MATH_GEOMETRY',
    prompt: `Given a positive integer n, determine if it is a perfect square without using any built-in square root function. A perfect square is an integer that is the square of another integer.

Example: n=16 → true, n=14 → false

What algorithmic pattern does this problem call for? Explain what signals in the problem led you to that conclusion.`,
    correctAnswer: 'MATH_GEOMETRY',
    difficulty: 'EASY',
  },

  // ── CLARIFICATION DRILLS (4) ──────────────────────────────────────────────

  {
    type: 'CLARIFICATION',
    pattern: null,
    prompt: `You are given this problem at the start of a technical interview:

"Given an array of integers, return the indices of the two numbers that add up to a target."

You have 3 minutes before you need to start your approach. Write all the clarifying questions you would ask the interviewer, in the order you would ask them. For each question, briefly explain why you're asking it (what it changes about your solution).`,
    correctAnswer: null,
    difficulty: 'EASY',
  },
  {
    type: 'CLARIFICATION',
    pattern: null,
    prompt: `You are given this problem at the start of a technical interview:

"Design a data structure that supports insert, delete, and getRandom in O(1) average time. getRandom should return each element with equal probability."

You have 3 minutes before you need to start your approach. Write all the clarifying questions you would ask, in priority order. For each question, briefly note what it changes about your approach if answered differently.`,
    correctAnswer: null,
    difficulty: 'MEDIUM',
  },
  {
    type: 'CLARIFICATION',
    pattern: null,
    prompt: `You are given this problem at the start of a technical interview:

"Given a string, find the longest palindromic substring."

The interviewer has given you no additional context. You have 2 minutes. Write your clarifying questions in priority order. Be specific — vague questions ("any other constraints?") score poorly. Each question should target a specific assumption that could change your solution.`,
    correctAnswer: null,
    difficulty: 'MEDIUM',
  },
  {
    type: 'CLARIFICATION',
    pattern: null,
    prompt: `You are given this problem at the start of a technical interview — a STRICT mode interview where the interviewer will not volunteer information:

"Implement a cache with a capacity limit that evicts the least recently used item when full."

Since you won't get confirmations, you must state your assumptions clearly. Write: (1) your 2–3 most important clarifying questions, and (2) for each question you don't ask, the assumption you're making and why it's a safe default.`,
    correctAnswer: null,
    difficulty: 'HARD',
  },

  // ── APPROACH DRILLS (4) ───────────────────────────────────────────────────

  {
    type: 'APPROACH',
    pattern: null,
    prompt: `Problem: Given an array of integers, find two numbers that sum to a target. Return their indices.

Constraints confirmed: array can contain duplicates, negative numbers, exactly one solution guaranteed, n ≤ 10⁵.

Write your full approach as if describing it to an interviewer before coding. Include: (1) your brute force and why it's too slow, (2) your optimized approach and the key insight, (3) the data structures you'll use and why, (4) time and space complexity, (5) any edge cases you'll handle.`,
    correctAnswer: null,
    difficulty: 'EASY',
  },
  {
    type: 'APPROACH',
    pattern: null,
    prompt: `Problem: Given a string containing just '(', ')', '{', '}', '[', ']', determine if the input string is valid. A string is valid if: open brackets are closed by the same type of bracket, open brackets are closed in the correct order, and every close bracket has a corresponding open bracket.

Example: "()[]{}" → true, "([)]" → false, "{[]}" → true

Write your full approach before coding. Include brute force (if applicable), your optimized solution, data structures, complexity, and edge cases you anticipate.`,
    correctAnswer: null,
    difficulty: 'EASY',
  },
  {
    type: 'APPROACH',
    pattern: null,
    prompt: `Problem: Given a list of non-overlapping intervals sorted by start time, insert a new interval and merge any overlapping intervals. Return the result.

Constraints confirmed: existing intervals are sorted and non-overlapping, new interval may overlap multiple existing ones, input can be empty.

Write your approach for an interviewer. Start with brute force, optimize, state your invariants clearly, give complexity, and call out the tricky cases (e.g., new interval overlaps none, all, or some existing intervals).`,
    correctAnswer: null,
    difficulty: 'MEDIUM',
  },
  {
    type: 'APPROACH',
    pattern: null,
    prompt: `Problem: Given a string s containing only digits, return all possible valid IP addresses that can be formed by inserting exactly three dots into s. A valid IP address has four octets, each between 0 and 255, with no leading zeros.

Example: s="25525511135" → ["255.255.11.135","255.255.111.35"]

Write your approach. This problem has a constrained search space — explain how you'd enumerate possibilities, what constraints prune the search, and why your approach terminates. Include complexity analysis.`,
    correctAnswer: null,
    difficulty: 'MEDIUM',
  },
];

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

async function seedDojo() {
  console.log('Seeding Dojo tips...\n');

  // Phase tips
  for (const tip of PHASE_TIPS) {
    await db
      .insert(dojoTips)
      .values(tip)
      .onConflictDoNothing();
    console.log(`  ✓  [PHASE/${tip.key}/${tip.mode}] ${tip.title}`);
  }

  // Pattern tips
  for (const tip of PATTERN_TIPS) {
    await db
      .insert(dojoTips)
      .values({
        category: 'PATTERN',
        key: tip.key,
        mode: 'ALL',
        title: tip.title,
        body: tip.body,
        sortOrder: tip.sortOrder,
      })
      .onConflictDoNothing();
    console.log(`  ✓  [PATTERN/${tip.key}] ${tip.title}`);
  }

  console.log(`\nSeeding Dojo drills...\n`);

  const patternIdCount = DRILLS.filter((d) => d.type === 'PATTERN_ID').length;
  const clarCount = DRILLS.filter((d) => d.type === 'CLARIFICATION').length;
  const approachCount = DRILLS.filter((d) => d.type === 'APPROACH').length;

  for (const drill of DRILLS) {
    await db
      .insert(dojodrills)
      .values({
        type: drill.type,
        pattern: drill.pattern,
        prompt: drill.prompt,
        correctAnswer: drill.correctAnswer,
        difficulty: drill.difficulty,
      });
    const label = drill.pattern ?? drill.type;
    console.log(`  ✓  [${drill.type}/${label}] ${drill.difficulty}`);
  }

  console.log(`
Done.
  Phase tips:   ${PHASE_TIPS.length}
  Pattern tips: ${PATTERN_TIPS.length}
  PATTERN_ID drills:   ${patternIdCount}
  CLARIFICATION drills: ${clarCount}
  APPROACH drills:      ${approachCount}
  Total drills: ${DRILLS.length}
  `);

  await client.end();
}

seedDojo().catch((err) => {
  console.error(err);
  process.exit(1);
});
