import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// ---------------------------------------------------------------------------
// Seed data — all 20 algorithmic patterns
// Hint levels: L1 = structural nudge, L2 = pattern pointer, L3 = pseudocode scaffold
// hintCeiling: Easy = 2, Medium = 3, Hard = 3
// ---------------------------------------------------------------------------

const SEED: Array<{
  title: string;
  slug: string;
  pattern: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  statement: string;
  hintCeiling: number;
  hints: Array<{ level: number; content: string }>;
}> = [
  // -------------------------------------------------------------------------
  // 1. TWO POINTERS
  // -------------------------------------------------------------------------
  {
    title: 'Valid Palindrome',
    slug: 'valid-palindrome',
    pattern: 'TWO_POINTERS',
    difficulty: 'EASY',
    statement:
      'A phrase is a palindrome if, after converting all uppercase letters into lowercase and removing all non-alphanumeric characters, it reads the same forward and backward. Given a string s, return true if it is a palindrome, or false otherwise.\n\nExample: s = "A man, a plan, a canal: Panama" → true\nExample: s = "race a car" → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'You need to check if a string reads the same forwards and backwards. Instead of creating a reversed copy, think about comparing characters from both ends simultaneously — what two positions would you start at, and when do they stop?',
      },
      {
        level: 2,
        content:
          'Two Pointers. Place left at the start and right at the end. Skip non-alphanumeric characters as you go. At each step, compare the lowercased characters at left and right — if they differ, return false. Move both pointers inward. Loop ends when left >= right.',
      },
    ],
  },
  {
    title: 'Container With Most Water',
    slug: 'container-with-most-water',
    pattern: 'TWO_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are at (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container that holds the most water. Return the maximum amount of water a container can store.\n\nExample: height = [1,8,6,2,5,4,8,3,7] → 49',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Water held between two lines equals min(height[left], height[right]) × (right − left). As you move pointers inward, width always shrinks. So what must change for area to potentially increase?',
      },
      {
        level: 2,
        content:
          'Two Pointers starting at opposite ends. When you move a pointer inward, width decreases. The only way to find a better answer is if height increases — so always move the pointer at the shorter line. Why is moving the taller one provably wrong?',
      },
      {
        level: 3,
        content:
          'left = 0, right = n−1, max_area = 0. While left < right: area = min(height[left], height[right]) × (right − left); max_area = max(max_area, area). If height[left] < height[right]: left++ else right--. Return max_area. Moving the shorter side is the only chance to find a taller boundary — moving the taller side can only decrease area.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 2. SLIDING WINDOW
  // -------------------------------------------------------------------------
  {
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring-without-repeating-characters',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'MEDIUM',
    statement:
      'Given a string s, find the length of the longest substring without repeating characters.\n\nExample: s = "abcabcbb" → 3 (the answer is "abc")\nExample: s = "bbbbb" → 1\nExample: s = "pwwkew" → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'You need a window of characters with no duplicates. When you encounter a repeated character, you need to shrink the window from the left. What data structure lets you check in O(1) whether a character is already in your current window?',
      },
      {
        level: 2,
        content:
          'Sliding Window with a hash map (char → last seen index). Expand the right pointer freely. When s[right] is already in the window, instead of shrinking one step at a time, jump the left pointer directly past the duplicate. What value do you need to store in the map to enable that jump?',
      },
      {
        level: 3,
        content:
          'map = {}, left = 0, max_len = 0. For right in range(len(s)): if s[right] in map AND map[s[right]] >= left: left = map[s[right]] + 1. map[s[right]] = right. max_len = max(max_len, right − left + 1). The condition >= left is critical — a character might be in the map but to the left of your window.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. FAST & SLOW POINTERS
  // -------------------------------------------------------------------------
  {
    title: 'Linked List Cycle',
    slug: 'linked-list-cycle',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'EASY',
    statement:
      'Given the head of a linked list, determine if it contains a cycle. A cycle exists if some node can be reached again by continuously following next pointers. Return true if there is a cycle, otherwise false. Solve it using O(1) memory.\n\nExample: head = [3,2,0,-4], tail connects to node at index 1 → true\nExample: head = [1,2], tail connects to node at index 0 → true\nExample: head = [1], no cycle → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'A hash set works (store visited nodes) but uses O(n) space. You need O(1). Think about what happens if you have two runners on a circular track — one moving one step at a time, the other two steps. Will they ever meet?',
      },
      {
        level: 2,
        content:
          "Fast & Slow Pointers (Floyd's Cycle Detection). slow moves one step, fast moves two. If there's a cycle, fast will lap slow and they'll meet. If there's no cycle, fast reaches null first. Initialize both at head. Loop while fast and fast.next are not null.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. BINARY SEARCH
  // -------------------------------------------------------------------------
  {
    title: 'Binary Search',
    slug: 'binary-search',
    pattern: 'BINARY_SEARCH',
    difficulty: 'EASY',
    statement:
      'Given an array of integers nums sorted in ascending order and an integer target, return the index of target in nums, or -1 if it is not present. Your solution must run in O(log n).\n\nExample: nums = [-1,0,3,5,9,12], target = 9 → 4\nExample: nums = [-1,0,3,5,9,12], target = 2 → -1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          "The array is sorted. You don't need to check every element — if the middle element is too large, the target can't be in the right half. What are the three possible outcomes each time you examine the midpoint?",
      },
      {
        level: 2,
        content:
          'Binary Search: left = 0, right = n−1. While left <= right: mid = (left + right) // 2. If nums[mid] == target: return mid. If nums[mid] < target: left = mid + 1. If nums[mid] > target: right = mid − 1. Be precise about whether your boundary is inclusive or exclusive — a wrong condition causes infinite loops or off-by-one misses.',
      },
    ],
  },
  {
    title: 'Search in Rotated Sorted Array',
    slug: 'search-in-rotated-sorted-array',
    pattern: 'BINARY_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'An integer array nums sorted in ascending order has been rotated at an unknown pivot. Given the rotated array and a target, return the index of target or -1 if not found. You must achieve O(log n).\n\nExample: nums = [4,5,6,7,0,1,2], target = 0 → 4\nExample: nums = [4,5,6,7,0,1,2], target = 3 → -1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          "It's still binary search, but the array was rotated. When you look at the midpoint, one of the two halves is always normally sorted (ascending). Can you determine which half is sorted, and use that to decide where to search?",
      },
      {
        level: 2,
        content:
          'Modified Binary Search. At each step: if nums[left] <= nums[mid], the left half is sorted. Check if target falls in [nums[left], nums[mid]). If yes, go left; else go right. Otherwise the right half is sorted — check if target falls in (nums[mid], nums[right]]. Apply symmetrically.',
      },
      {
        level: 3,
        content:
          'left, right = 0, n−1. While left <= right: mid = (left+right)//2. If nums[mid] == target: return mid. If nums[left] <= nums[mid] (left sorted): if nums[left] <= target < nums[mid]: right = mid−1 else: left = mid+1. Else (right sorted): if nums[mid] < target <= nums[right]: left = mid+1 else: right = mid−1. Return -1.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. BFS
  // -------------------------------------------------------------------------
  {
    title: 'Number of Islands',
    slug: 'number-of-islands',
    pattern: 'BFS',
    difficulty: 'MEDIUM',
    statement:
      "Given an m×n 2D binary grid where '1' represents land and '0' represents water, return the number of islands. An island is surrounded by water and formed by connecting adjacent land cells horizontally or vertically.\n\nExample:\n11110\n11010\n11000\n00000\n→ 1\n\nExample:\n11000\n11000\n00100\n00011\n→ 3",
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          "When you find a '1', all the '1's connected to it (up/down/left/right) belong to the same island. How would you systematically visit every cell in one island before moving on to count the next? What do you need to track so you don't count the same cell twice?",
      },
      {
        level: 2,
        content:
          "BFS or DFS flood-fill. When you find an unvisited '1': increment island count, then expand in all 4 directions, marking visited cells so they won't be counted again. You can mark in-place by changing '1' to '0', avoiding a separate visited set. Does that modification affect correctness?",
      },
      {
        level: 3,
        content:
          "islands = 0. For every cell (i,j): if grid[i][j] == '1': islands++; add (i,j) to queue; mark grid[i][j] = '0'. BFS loop: pop (r,c); for each neighbor (nr,nc) in 4 directions: if in-bounds AND grid[nr][nc]=='1': mark '0', enqueue. The in-place marking prevents re-visits and avoids a separate data structure.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. DFS / BACKTRACKING
  // -------------------------------------------------------------------------
  {
    title: 'Subsets',
    slug: 'subsets',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'MEDIUM',
    statement:
      'Given an integer array nums of unique elements, return all possible subsets (the power set). The solution set must not contain duplicate subsets. Return the answer in any order.\n\nExample: nums = [1,2,3] → [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]\nExample: nums = [0] → [[],[0]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          "Every element has exactly two choices: it's in the subset or it's not. If you drew a binary decision tree where each level represents one element (include or exclude), what would be at the leaves? How many leaves are there for n elements?",
      },
      {
        level: 2,
        content:
          'Backtracking. At each recursive call, record the current path as a valid subset (every node is valid, not just leaves). Then for each remaining element starting at the current index: add it to the path, recurse with the next index, then remove it (backtrack). This avoids duplicate subsets by never going backwards.',
      },
      {
        level: 3,
        content:
          'result = []. def dfs(start, path): result.append(list(path)). For i in range(start, len(nums)): path.append(nums[i]); dfs(i+1, path); path.pop(). Call dfs(0, []). The result.append at the top of dfs captures every node of the decision tree — including the empty path — giving all 2ⁿ subsets.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. DYNAMIC PROGRAMMING 1D
  // -------------------------------------------------------------------------
  {
    title: 'Climbing Stairs',
    slug: 'climbing-stairs',
    pattern: 'DP_1D',
    difficulty: 'EASY',
    statement:
      'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. How many distinct ways can you climb to the top?\n\nExample: n = 2 → 2 (1+1, or 2)\nExample: n = 3 → 3 (1+1+1, 1+2, or 2+1)',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'To reach step n you could have come from step n−1 (one step) or step n−2 (two steps). So the number of ways to reach step n depends on the number of ways to reach the two steps before it. Write out ways(1), ways(2), ways(3), ways(4) by hand — do you recognise the sequence?',
      },
      {
        level: 2,
        content:
          '1D DP. dp[i] = ways to reach step i. Base: dp[1]=1, dp[2]=2. Recurrence: dp[i] = dp[i−1] + dp[i−2] (Fibonacci). You only need the last two values, so reduce space to O(1): a, b = 1, 1; for _ in range(2, n+1): a, b = b, a+b; return b.',
      },
    ],
  },
  {
    title: 'House Robber',
    slug: 'house-robber',
    pattern: 'DP_1D',
    difficulty: 'MEDIUM',
    statement:
      "You are a professional robber. Each house has some money. Adjacent houses have connected alarms — you cannot rob two adjacent houses. Given an integer array nums representing each house's money, return the maximum amount you can rob without triggering alarms.\n\nExample: nums = [1,2,3,1] → 4\nExample: nums = [2,7,9,3,1] → 12",
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'At each house you have two choices: rob it (skip the previous house) or skip it (carry forward whatever was optimal up to the previous house). How does the maximum at house i depend on the maximums at earlier houses?',
      },
      {
        level: 2,
        content:
          '1D DP. dp[i] = max money robbing up to house i. Recurrence: dp[i] = max(dp[i−1], dp[i−2] + nums[i]). Either skip house i (take dp[i−1]) or rob it (add nums[i] to the best answer two houses back). You only need the previous two values → O(1) space.',
      },
      {
        level: 3,
        content:
          'prev2 = 0, prev1 = 0. For num in nums: curr = max(prev1, prev2 + num); prev2 = prev1; prev1 = curr. Return prev1. Trace through [2,7,9,3,1]: prev1 goes 0→2→7→11→11→12. At each step, prev2 is "two houses back" and prev1 is the running maximum.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 8. DYNAMIC PROGRAMMING 2D
  // -------------------------------------------------------------------------
  {
    title: 'Unique Paths',
    slug: 'unique-paths',
    pattern: 'DP_2D',
    difficulty: 'MEDIUM',
    statement:
      'A robot starts at the top-left corner of an m×n grid and tries to reach the bottom-right corner. The robot can only move right or down. How many unique paths are there?\n\nExample: m=3, n=7 → 28\nExample: m=3, n=2 → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'The robot can only move right or down. To reach any cell (i,j) it could only have come from (i−1,j) above or (i,j−1) to the left. So the number of paths to (i,j) is the sum of paths to those two cells. What are the base cases?',
      },
      {
        level: 2,
        content:
          '2D DP. dp[i][j] = number of paths to (i,j). Base: entire first row = 1, entire first column = 1 (only one direction available). Recurrence: dp[i][j] = dp[i−1][j] + dp[i][j−1]. You only need the previous row at any time — can you reduce this to a 1D array?',
      },
      {
        level: 3,
        content:
          'dp = [1] * n. For each row i from 1 to m−1: for j from 1 to n−1: dp[j] += dp[j−1]. Return dp[n−1]. Why this works: dp[j] already holds the value from the row above (paths from above), and dp[j−1] was just updated in the current row (paths from the left). No 2D array needed.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 9. MONOTONIC STACK
  // -------------------------------------------------------------------------
  {
    title: 'Daily Temperatures',
    slug: 'daily-temperatures',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'MEDIUM',
    statement:
      "Given an array of integers temperatures representing daily temperatures, return an array answer where answer[i] is the number of days until a warmer temperature after day i. If no such future day exists, answer[i] = 0.\n\nExample: temperatures = [73,74,75,71,69,72,76,73] → [1,1,4,2,1,1,0,0]",
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          "For each day you need the next day that's warmer. Brute force is O(n²). What if you maintained a list of days that are still waiting for their warmer day, and whenever you find a warmer day you resolve all the waiting days it satisfies?",
      },
      {
        level: 2,
        content:
          'Monotonic Decreasing Stack (stores indices). Iterate forward. When temperatures[i] is warmer than the temperature at the index on top of the stack, that top index has found its answer: i − top. Pop and record. Keep popping while the condition holds. Then push i. The stack always holds indices in order of decreasing temperature.',
      },
      {
        level: 3,
        content:
          'answer = [0]*n, stack = []. For i in range(n): while stack and temperatures[i] > temperatures[stack[-1]]: j = stack.pop(); answer[j] = i − j. stack.append(i). Remaining indices in stack keep their 0 (no warmer day exists). The stack is monotonically decreasing in temperature because any index that would break that order gets resolved immediately.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 10. HEAP / PRIORITY QUEUE
  // -------------------------------------------------------------------------
  {
    title: 'Kth Largest Element in an Array',
    slug: 'kth-largest-element-in-an-array',
    pattern: 'HEAP',
    difficulty: 'MEDIUM',
    statement:
      'Given an integer array nums and an integer k, return the kth largest element. Note: kth largest in sorted order, not kth distinct element.\n\nExample: nums = [3,2,1,5,6,4], k = 2 → 5\nExample: nums = [3,2,3,1,2,4,5,5,6], k = 4 → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sorting gives the answer in O(n log n) but you can do better. Think about maintaining just the k largest elements as you scan — what data structure efficiently tracks k elements and lets you quickly discard the smallest one when you exceed size k?',
      },
      {
        level: 2,
        content:
          'Min-Heap of size k. Push each element. When the heap exceeds size k, pop the minimum (the k+1th largest is expelled). At the end, the heap root is the kth largest. Why a min-heap and not a max-heap? What would a max-heap give you at the root?',
      },
      {
        level: 3,
        content:
          'import heapq. heap = []. For num in nums: heapq.heappush(heap, num). If len(heap) > k: heapq.heappop(heap). Return heap[0]. The heap always contains exactly the k largest elements seen so far. Its minimum (root) is the kth largest by definition.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 11. INTERVALS
  // -------------------------------------------------------------------------
  {
    title: 'Merge Intervals',
    slug: 'merge-intervals',
    pattern: 'INTERVALS',
    difficulty: 'MEDIUM',
    statement:
      'Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals and return an array of the non-overlapping intervals covering all input intervals.\n\nExample: intervals = [[1,3],[2,6],[8,10],[15,18]] → [[1,6],[8,10],[15,18]]\nExample: intervals = [[1,4],[4,5]] → [[1,5]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Two intervals [a,b] and [c,d] overlap if c <= b (the second starts before the first ends). If you sorted intervals by start time, what can you say about which intervals can possibly overlap with each other?',
      },
      {
        level: 2,
        content:
          'Sort by start time, then greedily merge. Walk through: if the current interval overlaps with the last merged one (current.start <= last.end), extend last.end to max(last.end, current.end). Otherwise add current as a new merged interval. Why does sorting guarantee you only ever need to compare with the last merged interval?',
      },
      {
        level: 3,
        content:
          'Sort intervals by start. result = [intervals[0]]. For interval in intervals[1:]: if interval[0] <= result[-1][1]: result[-1][1] = max(result[-1][1], interval[1]). Else: result.append(interval). Return result. The max is needed because one interval might be entirely contained within another ([1,10] and [2,5]).',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 12. GRAPH (UNION-FIND)
  // -------------------------------------------------------------------------
  {
    title: 'Number of Connected Components in an Undirected Graph',
    slug: 'number-of-connected-components',
    pattern: 'UNION_FIND',
    difficulty: 'MEDIUM',
    statement:
      'You have a graph of n nodes labeled 0 to n−1. Given an integer n and an array edges where edges[i] = [ai, bi] indicates an edge between ai and bi, return the number of connected components.\n\nExample: n=5, edges=[[0,1],[1,2],[3,4]] → 2\nExample: n=5, edges=[[0,1],[1,2],[2,3],[3,4]] → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'BFS/DFS from each unvisited node counts components in O(n+e). There is also a data structure specifically designed for this: it tracks which nodes are in the same group, and supports efficiently merging two groups when an edge connects them. What is it?',
      },
      {
        level: 2,
        content:
          'Union-Find (Disjoint Set Union). Initialize each node as its own component — that gives you n components. For each edge, union the two endpoints. If they were in different components, merge them and decrement the count. At the end, return the count. Two optimisations: path compression in find(), union by rank.',
      },
      {
        level: 3,
        content:
          'parent = list(range(n)), rank = [0]*n, components = n. def find(x): if parent[x] != x: parent[x] = find(parent[x]); return parent[x]. def union(x,y): rx,ry = find(x),find(y). If rx==ry: return. components -= 1. If rank[rx]<rank[ry]: parent[rx]=ry elif rank[rx]>rank[ry]: parent[ry]=rx else: parent[ry]=rx; rank[rx]+=1. For a,b in edges: union(a,b). Return components.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 13. TRIE
  // -------------------------------------------------------------------------
  {
    title: 'Implement Trie (Prefix Tree)',
    slug: 'implement-trie',
    pattern: 'TRIE',
    difficulty: 'MEDIUM',
    statement:
      'Implement the Trie class with: Trie() initializes the object. insert(word) inserts word into the trie. search(word) returns true if word is in the trie. startsWith(prefix) returns true if any word in the trie starts with prefix.\n\nExample:\ntrie.insert("apple")\ntrie.search("apple") → true\ntrie.search("app") → false\ntrie.startsWith("app") → true',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          "A Trie stores strings character-by-character as a tree. Each node represents one character position. What must each node store to support both search (which requires knowing whether a full word ends here) and startsWith (which doesn't)?",
      },
      {
        level: 2,
        content:
          'Each TrieNode holds: children (a dict or array of up to 26 child nodes) and is_end_of_word (bool). insert: walk character by character, creating nodes as needed, mark the final node is_end=True. search: walk the path — return True only if you reach the end AND is_end is True. startsWith: same walk, return True if you reach the end of the prefix regardless of is_end.',
      },
      {
        level: 3,
        content:
          'class TrieNode: def __init__(self): self.children={}; self.is_end=False. insert(word): node=root; for ch in word: node=node.children.setdefault(ch, TrieNode()); node.is_end=True. def _walk(s): node=root; for ch in s: if ch not in node.children: return None; node=node.children[ch]; return node. search(w): node=_walk(w); return node is not None and node.is_end. startsWith(p): return _walk(p) is not None.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 14. BIT MANIPULATION
  // -------------------------------------------------------------------------
  {
    title: 'Single Number',
    slug: 'single-number',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'EASY',
    statement:
      'Given a non-empty array of integers where every element appears twice except for one, find and return that single one. Your solution must be O(n) time and O(1) space.\n\nExample: nums = [2,2,1] → 1\nExample: nums = [4,1,2,1,2] → 4',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          "A hash map works but uses O(n) space. Think about XOR's properties: a XOR a = 0, a XOR 0 = a, and XOR is commutative and associative. What happens if you XOR every number in the array together?",
      },
      {
        level: 2,
        content:
          'XOR all elements: result = 0; for n in nums: result ^= n; return result. Every number appearing twice XORs to 0. The single number XORed with 0 remains. Trace through [4,1,2,1,2]: 0^4=4, 4^1=5, 5^2=7, 7^1=6, 6^2=4. Answer is 4. ✓',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 15. LINKED LISTS
  // -------------------------------------------------------------------------
  {
    title: 'Reverse Linked List',
    slug: 'reverse-linked-list',
    pattern: 'LINKED_LISTS',
    difficulty: 'EASY',
    statement:
      'Given the head of a singly linked list, reverse the list and return the reversed list.\n\nExample: head = [1,2,3,4,5] → [5,4,3,2,1]\nExample: head = [1,2] → [2,1]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'To reverse the list, each node must point to its previous node instead of its next. As you walk forward, you need to redirect each .next pointer. How many pointers do you need to track at any given step to safely redirect a node without losing the rest of the list?',
      },
      {
        level: 2,
        content:
          'Three pointers: prev=None, curr=head, next_node=temp. Loop while curr: save next_node=curr.next (so you don\'t lose the rest). Redirect curr.next=prev. Advance prev=curr. Advance curr=next_node. When curr is None, prev points to the new head. Walk through [1→2→3] step by step.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 16. HASH MAPS & HASH SETS
  // -------------------------------------------------------------------------
  {
    title: 'Two Sum',
    slug: 'two-sum',
    pattern: 'HASH_MAPS',
    difficulty: 'EASY',
    statement:
      "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target. You may assume exactly one solution exists and you may not use the same element twice.\n\nExample: nums = [2,7,11,15], target = 9 → [0,1]\nExample: nums = [3,2,4], target = 6 → [1,2]",
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'For each number, you need its complement (target − number). Checking the rest of the array each time is O(n²). What data structure gives you O(1) lookup to check whether the complement has already been seen?',
      },
      {
        level: 2,
        content:
          'Hash Map (num → index). Walk through nums once. At each index i: compute complement = target − nums[i]. If complement is in the map: return [map[complement], i]. Else: map[nums[i]] = i. Check first, then store — this prevents using the same element twice and handles the case where complement == nums[i].',
      },
    ],
  },
  {
    title: 'Group Anagrams',
    slug: 'group-anagrams',
    pattern: 'HASH_MAPS',
    difficulty: 'MEDIUM',
    statement:
      'Given an array of strings strs, group the anagrams together. You can return the answer in any order.\n\nExample: strs = ["eat","tea","tan","ate","nat","bat"] → [["bat"],["nat","tan"],["ate","eat","tea"]]\nExample: strs = [""] → [[""]]\nExample: strs = ["a"] → [["a"]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Two strings are anagrams if they have the same characters in the same frequencies. What property could serve as a canonical hash map key such that all anagrams produce the same key?',
      },
      {
        level: 2,
        content:
          'Hash Map (key → list of words). Two approaches for the key: (1) sort each word — anagrams sort to the same string, O(k log k) per word. (2) Use a tuple of 26 character counts, O(k) per word. Map each word to its key, append to the corresponding bucket, return the buckets.',
      },
      {
        level: 3,
        content:
          'from collections import defaultdict. map = defaultdict(list). For word in strs: key = tuple(sorted(word)) [or: counts = [0]*26; for c in word: counts[ord(c)-ord("a")]+=1; key=tuple(counts)]. map[key].append(word). Return list(map.values()). The sort approach is simpler; the count approach is faster for long words.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 17. PREFIX SUMS
  // -------------------------------------------------------------------------
  {
    title: 'Range Sum Query - Immutable',
    slug: 'range-sum-query-immutable',
    pattern: 'PREFIX_SUMS',
    difficulty: 'EASY',
    statement:
      'Given an integer array nums, handle multiple queries of the form sumRange(left, right), which returns the sum of elements between indices left and right (inclusive). Implement a class that processes queries in O(1) after O(n) preprocessing.\n\nExample:\nnumArray = NumArray([-2,0,3,-5,2,-1])\nnumArray.sumRange(0,2) → 1\nnumArray.sumRange(2,5) → -1\nnumArray.sumRange(0,5) → -3',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Recomputing the sum from scratch per query is O(n) each. To get O(1) queries you need O(n) preprocessing. Think about what cumulative information you could precompute so that any range sum becomes a simple subtraction.',
      },
      {
        level: 2,
        content:
          'Prefix Sum: prefix[i] = sum of nums[0..i−1] (prefix[0] = 0). Then sumRange(left, right) = prefix[right+1] − prefix[left]. Build prefix once in O(n). Each query is O(1). The +1 offset (prefix has n+1 elements) keeps the formula clean and avoids conditional logic for left=0.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 18. GREEDY
  // -------------------------------------------------------------------------
  {
    title: 'Jump Game',
    slug: 'jump-game',
    pattern: 'GREEDY',
    difficulty: 'MEDIUM',
    statement:
      'You are given an integer array nums. You are initially positioned at index 0, and each element represents your maximum jump length from that position. Return true if you can reach the last index, or false otherwise.\n\nExample: nums = [2,3,1,1,4] → true\nExample: nums = [3,2,1,0,4] → false',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'You don\'t need to track every possible path. Instead, think about tracking a single value: the furthest index reachable so far. How does that value update as you walk through the array? What condition tells you you\'re stuck?',
      },
      {
        level: 2,
        content:
          'Greedy. Track max_reach = furthest index reachable. At each index i: if i > max_reach, you cannot reach here — return False. Otherwise update max_reach = max(max_reach, i + nums[i]). If max_reach >= last index at any point, return True. Greedy works because a longer jump always dominates shorter jumps from the same position.',
      },
      {
        level: 3,
        content:
          'max_reach = 0. For i in range(len(nums)): if i > max_reach: return False. max_reach = max(max_reach, i + nums[i]). return True. No need to check max_reach >= n−1 inside the loop — if you complete the loop without returning False, you must be able to reach the end (you iterated through every reachable index).',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 19. SORT & SEARCH
  // -------------------------------------------------------------------------
  {
    title: 'Sort Colors',
    slug: 'sort-colors',
    pattern: 'SORT_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'Given an array nums with n objects colored red (0), white (1), or blue (2), sort them in-place so that objects of the same color are adjacent in the order red, white, blue. You must solve this in one pass without using a library sort.\n\nExample: nums = [2,0,2,1,1,0] → [0,0,1,1,2,2]\nExample: nums = [2,0,1] → [0,1,2]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'You have exactly three distinct values and need a single-pass in-place sort. Think about maintaining three regions simultaneously: 0s at the front, 2s at the back, and 1s accumulating in the middle. How many pointers would you need to track the boundaries of these regions?',
      },
      {
        level: 2,
        content:
          'Dutch National Flag Algorithm. Three pointers: low (right boundary of 0-region), mid (current element being examined), high (left boundary of 2-region). Key insight: when you swap from the high end, the element you receive is unexamined — so you must not advance mid in that case.',
      },
      {
        level: 3,
        content:
          'low=mid=0, high=n−1. While mid <= high: if nums[mid]==0: swap(low,mid); low++; mid++. elif nums[mid]==2: swap(mid,high); high--. (don\'t increment mid). else: mid++. Why no mid++ for 2? The element swapped from high is unknown — it might itself be a 0 or 2 and needs re-examining. Elements before low are all 0, after high are all 2.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 20. MATH & GEOMETRY
  // -------------------------------------------------------------------------
  {
    title: 'Rotate Image',
    slug: 'rotate-image',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'MEDIUM',
    statement:
      "You are given an n×n 2D matrix representing an image. Rotate the image 90 degrees clockwise in-place — do not allocate another 2D matrix.\n\nExample:\nInput:  [[1,2,3],[4,5,6],[7,8,9]]\nOutput: [[7,4,1],[8,5,2],[9,6,3]]",
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A 90-degree clockwise rotation applied directly is complex. But it can be decomposed into two simpler operations that each touch every element once. What does transposing a matrix do to the positions of elements? What does reversing each row do?',
      },
      {
        level: 2,
        content:
          'Transpose then reverse each row = 90° clockwise. Transpose: swap matrix[i][j] with matrix[j][i] for all i < j. Then reverse each row. Verify with 2×2: [[1,2],[3,4]] → transpose → [[1,3],[2,4]] → reverse rows → [[3,1],[4,2]]. Is that a clockwise rotation? Check where 1 ended up.',
      },
      {
        level: 3,
        content:
          'Step 1 (transpose): for i in range(n): for j in range(i+1, n): matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]. Step 2 (reverse rows): for row in matrix: row.reverse(). Both steps are O(n²) time, O(1) space. Counter-clockwise rotation: reverse rows first, then transpose. Confirm with the 3×3 example above.',
      },
    ],
  },
];

// ---------------------------------------------------------------------------

async function seed() {
  console.log('Seeding problem bank...\n');

  for (const problem of SEED) {
    const { hints: problemHints, ...problemData } = problem;

    const [inserted] = await db
      .insert(problems)
      .values(problemData)
      .onConflictDoNothing({ target: problems.slug })
      .returning({ id: problems.id, title: problems.title });

    if (!inserted) {
      console.log(`  skip  ${problem.slug} (already exists)`);
      continue;
    }

    for (const hint of problemHints) {
      await db.insert(hints).values({ problemId: inserted.id, ...hint });
    }

    console.log(`  ✓  [${problem.pattern}] ${inserted.title} (${problemHints.length} hints)`);
  }

  console.log(`\nDone. ${SEED.length} problems seeded.`);
  await client.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
