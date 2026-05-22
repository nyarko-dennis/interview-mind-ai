import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 12 — MONOTONIC_STACK (30 problems: 10 Easy, 10 Medium, 10 Hard)
// Already seeded: Daily Temperatures 739 (Medium) — will be skipped via onConflictDoNothing
// Easy tier includes stack-foundation problems that lead into the monotonic stack pattern
// Hint levels: L1 = structural nudge, L2 = pattern pointer, L3 = pseudocode scaffold
// hintCeiling: Easy = 2, Medium/Hard = 3

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const BATCH: Array<{
  title: string;
  slug: string;
  pattern: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  statement: string;
  hintCeiling: number;
  hints: Array<{ level: number; content: string }>;
}> = [
  // ── EASY ──────────────────────────────────────────────────────────────────

  {
    title: 'Next Greater Element I',
    slug: 'next-greater-element-i',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'EASY',
    statement:
      'nums1 is a subset of nums2. For each element in nums1, find the next greater element to its right in nums2. Return -1 if none exists.\n\nExample: nums1=[4,1,2], nums2=[1,3,4,2] → [-1,3,-1]\nExample: nums1=[2,4], nums2=[1,2,3,4] → [3,-1]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Process nums2 with a monotonic decreasing stack to precompute the next greater element for every value, then look up each element of nums1 in the map.',
      },
      {
        level: 2,
        content:
          'Monotone decreasing stack over nums2. For each x: while stack and stack.top()<x: nge[stack.pop()]=x. Push x. Look up nums1 elements in nge map. O(n+m).',
      },
    ],
  },

  {
    title: 'Final Prices With a Special Discount in a Shop',
    slug: 'final-prices-with-a-special-discount-in-a-shop',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'EASY',
    statement:
      'For each item at prices[i], apply the first discount prices[j] where j>i and prices[j]<=prices[i]. Return the final prices array.\n\nExample: prices=[8,4,6,2,3] → [4,2,4,2,3]\nExample: prices=[1,2,3,4,5] → [1,2,3,4,5]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'For each price, find the next smaller or equal value — a "next smaller element" problem solved with a monotonic increasing stack.',
      },
      {
        level: 2,
        content:
          'Monotone increasing stack of indices. For each i: while stack and prices[i]<=prices[stack.top()]: prices[stack.pop()]-=prices[i]. Push i. O(n).',
      },
    ],
  },

  {
    title: 'Replace Elements with Greatest Element on Right Side',
    slug: 'replace-elements-with-greatest-element-on-right-side',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'EASY',
    statement:
      'Replace each element in arr with the greatest element among all elements to its right. Replace the last element with -1. Return the modified array.\n\nExample: arr=[17,18,5,4,6,1] → [18,6,6,6,1,-1]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Traverse right to left, tracking the running maximum — equivalent to a monotonic scan from the right.',
      },
      {
        level: 2,
        content:
          'max_right=-1. For i from n-1 down to 0: new_val=max_right; max_right=max(max_right, arr[i]); arr[i]=new_val. Return arr. O(n).',
      },
    ],
  },

  {
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'EASY',
    statement:
      'Given a string of \'(\', \')\', \'{\', \'}\', \'[\', \']\', return true if it is valid (every opener has a matching closer in the correct order).\n\nExample: s="()" → true\nExample: s="()[]{}" → true\nExample: s="(]" → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Push opening brackets onto a stack. For each closing bracket, the stack top must be its matching opener.',
      },
      {
        level: 2,
        content:
          'match={\')\':\'(\', \'}\':\'{\', \']\':\'[\'}. stack=[]. For c: if opener: push. If closer: if not stack or stack[-1]!=match[c]: return False; pop. Return stack is empty. O(n).',
      },
    ],
  },

  {
    title: 'Remove All Adjacent Duplicates In String',
    slug: 'remove-all-adjacent-duplicates-in-string',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'EASY',
    statement:
      'Repeatedly remove pairs of adjacent identical characters from string s until no more can be removed. Return the result.\n\nExample: s="abbaca" → "ca"\nExample: s="azxxzy" → "ay"',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Simulate with a stack. If the current character matches the stack top, pop (remove the pair); otherwise push.',
      },
      {
        level: 2,
        content:
          'stack=[]. For c in s: if stack and stack[-1]==c: stack.pop(). Else stack.append(c). Return "".join(stack). O(n).',
      },
    ],
  },

  {
    title: 'Backspace String Compare',
    slug: 'backspace-string-compare',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'EASY',
    statement:
      'Given strings s and t where \'#\' means backspace, return true if they are equal after processing all backspaces.\n\nExample: s="ab#c", t="ad#c" → true\nExample: s="ab##", t="c#d#" → false\nExample: s="a#c", t="b" → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Simulate each string with a stack: push regular characters, pop on \'#\'. Compare the resulting stacks.',
      },
      {
        level: 2,
        content:
          'def build(s): stack=[]; [stack.pop() if c==\'#\' and stack else stack.append(c) for c in s if c!=\'#\' or stack]; return stack. Return build(s)==build(t). O(n). Two-pointer from the right gives O(1) space.',
      },
    ],
  },

  {
    title: 'Baseball Game',
    slug: 'baseball-game',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'EASY',
    statement:
      'Process operations on a score record: integer (record score), \'+\' (sum of last two), \'D\' (double last), \'C\' (remove last). Return total score.\n\nExample: ops=["5","2","C","D","+"] → 30\nExample: ops=["5","-2","4","C","D","9","+","+"] → 27',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use a stack to maintain the current record. Each operation reads or modifies the top one or two elements.',
      },
      {
        level: 2,
        content:
          'stack=[]. For op: if int → push int. "+" → push stack[-1]+stack[-2]. "D" → push stack[-1]*2. "C" → pop. Return sum(stack). O(n).',
      },
    ],
  },

  {
    title: 'Make The String Great',
    slug: 'make-the-string-great',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'EASY',
    statement:
      'A string is "great" if no two adjacent characters are the same letter with different cases (e.g., \'a\' and \'A\'). Repeatedly remove such pairs. Return the final string.\n\nExample: s="leEeetcode" → "leetcode"\nExample: s="abBAcC" → ""\nExample: s="s" → "s"',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Simulate with a stack. If the top is the same letter in opposite case as the current character, pop; otherwise push.',
      },
      {
        level: 2,
        content:
          'stack=[]. For c in s: if stack and stack[-1]!=c and stack[-1].lower()==c.lower(): stack.pop(). Else stack.append(c). Return "".join(stack). O(n).',
      },
    ],
  },

  {
    title: 'Minimum String Length After Removing Substrings',
    slug: 'minimum-string-length-after-removing-substrings',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'EASY',
    statement:
      'Repeatedly remove occurrences of "AB" and "CD" from string s until none remain. Return the minimum possible length.\n\nExample: s="ABFCACDB" → 2\nExample: s="ACBBD" → 5',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use a stack. For each character, check if it forms "AB" or "CD" with the stack top and pop the pair if so.',
      },
      {
        level: 2,
        content:
          'stack=[]. For c in s: if stack and ((stack[-1]==\'A\' and c==\'B\') or (stack[-1]==\'C\' and c==\'D\')): stack.pop(). Else stack.append(c). Return len(stack). O(n).',
      },
    ],
  },

  {
    title: 'Remove Outermost Parentheses',
    slug: 'remove-outermost-parentheses',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'EASY',
    statement:
      'A primitive valid parentheses string cannot be split into non-empty valid substrings. Remove the outermost parentheses of every primitive substring and return the result.\n\nExample: s="(()())(())" → "()()()" \nExample: s="(()())(())(()(()))" → "()()()()(())"',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Track nesting depth. The outermost \'(\' transitions depth 0→1 and the outermost \')\' transitions 1→0 — skip those two characters.',
      },
      {
        level: 2,
        content:
          'depth=0, result=[]. For c: if c==\'(\': if depth>0: result.append(c); depth++. Else: depth--; if depth>0: result.append(c). Return "".join(result). O(n).',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Daily Temperatures',
    slug: 'daily-temperatures',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'MEDIUM',
    statement:
      'Given daily temperatures, return an array where answer[i] is the number of days until a warmer temperature after day i. Return 0 if no such day exists.\n\nExample: temperatures=[73,74,75,71,69,72,76,73] → [1,1,4,2,1,1,0,0]\nExample: temperatures=[30,40,50,60] → [1,1,1,0]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Maintain a monotonic decreasing stack of indices. When a warmer day arrives, pop all cooler days and record the gap.',
      },
      {
        level: 2,
        content:
          'stack of indices. For i, t in enumerate(temps): while stack and temps[stack[-1]]<t: j=stack.pop(); ans[j]=i-j. Push i. O(n).',
      },
      {
        level: 3,
        content:
          'The stack holds indices of temperatures seen but not yet resolved (no warmer day found yet). Each index is pushed once and popped at most once → O(n). Elements still in the stack at the end never find a warmer day (answer stays 0).',
      },
    ],
  },

  {
    title: 'Next Greater Element II',
    slug: 'next-greater-element-ii',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'MEDIUM',
    statement:
      'Given a circular integer array nums, find the next greater element for each element (search wraps around). Return -1 if none.\n\nExample: nums=[1,2,1] → [2,-1,2]\nExample: nums=[1,2,3,4,3] → [2,3,4,-1,4]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Process the array twice to simulate the circular traversal. Use a monotonic decreasing stack of indices; only push during the first pass.',
      },
      {
        level: 2,
        content:
          'res=[-1]*n, stack=[]. For i from 0..2n-1: while stack and nums[stack[-1]]<nums[i%n]: res[stack.pop()]=nums[i%n]. If i<n: stack.append(i). Return res. O(n).',
      },
      {
        level: 3,
        content:
          'The double-pass trick: first pass builds the stack (push indices); second pass resolves remaining unmatched indices without adding new ones. Elements still on the stack after both passes never find a next greater element.',
      },
    ],
  },

  {
    title: 'Online Stock Span',
    slug: 'online-stock-span',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'MEDIUM',
    statement:
      'Design a StockSpanner class. next(price) returns the span: the number of consecutive days (up to and including today) with a price ≤ today\'s price.\n\nExample: prices [100,80,60,70,60,75,85] → spans [1,1,1,2,1,4,6]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Maintain a monotonic decreasing stack of (price, span) pairs. When a new price arrives, merge the spans of all smaller or equal previous prices.',
      },
      {
        level: 2,
        content:
          'stack of (price, span). For each price: span=1. While stack and stack[-1][0]<=price: span+=stack.pop()[1]. Push (price, span). Return span. O(1) amortized per call.',
      },
      {
        level: 3,
        content:
          'Each (price, span) entry collapses multiple consecutive days into one, avoiding rescanning. Every element is pushed and popped at most once across all calls → O(n) total. The accumulated span correctly counts all consecutive days ≤ the current price.',
      },
    ],
  },

  {
    title: 'Remove Duplicate Letters',
    slug: 'remove-duplicate-letters',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'MEDIUM',
    statement:
      'Remove duplicate letters so every letter appears exactly once and the result is the lexicographically smallest possible subsequence.\n\nExample: s="bcabc" → "abc"\nExample: s="cbacdcbc" → "acdb"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a greedy monotonic stack. Remove a character from the result only when a smaller character appears later AND the removed character still has future occurrences.',
      },
      {
        level: 2,
        content:
          'last_idx={c:i for i,c in enumerate(s)}. stack=[], seen=set(). For i,c: if c in seen: skip. While stack and stack[-1]>c and last_idx[stack[-1]]>i: seen.remove(stack.pop()). stack.append(c); seen.add(c). Return "".join(stack). O(n).',
      },
      {
        level: 3,
        content:
          'Three conditions to pop the stack top: (1) it\'s larger than the current char (want lexicographically smaller), (2) it appears later (safe to remove now), (3) the current char isn\'t already in the result. "last_idx" maps each char to its last occurrence so we know whether it\'s safe to pop.',
      },
    ],
  },

  {
    title: 'Remove K Digits',
    slug: 'remove-k-digits',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'MEDIUM',
    statement:
      'Remove k digits from number string num to produce the smallest possible number. No leading zeros except "0" itself.\n\nExample: num="1432219", k=3 → "1219"\nExample: num="10200", k=1 → "200"\nExample: num="10", k=2 → "0"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a monotonic increasing stack. Remove a digit whenever a smaller digit appears to its right and k > 0.',
      },
      {
        level: 2,
        content:
          'stack=[]. For d in num: while k>0 and stack and stack[-1]>d: stack.pop(); k--. stack.append(d). If k>0: stack=stack[:-k]. Return "".join(stack).lstrip("0") or "0". O(n).',
      },
      {
        level: 3,
        content:
          'The first position where a larger digit is followed by a smaller one is the optimal removal. The monotone stack finds these greedily left to right. If k is still positive at the end, trim from the right (the remaining tail is non-decreasing). Strip leading zeros last.',
      },
    ],
  },

  {
    title: '132 Pattern',
    slug: '132-pattern',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'MEDIUM',
    statement:
      'Return true if there exist indices i < j < k such that nums[i] < nums[k] < nums[j].\n\nExample: nums=[1,2,3,4] → false\nExample: nums=[3,1,4,2] → true\nExample: nums=[-1,3,2,0] → true',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Scan right to left. Maintain a monotonic stack representing candidates for nums[j]. Track the largest valid nums[k] seen so far (a value popped when a larger nums[j] candidate arrives).',
      },
      {
        level: 2,
        content:
          'stack=[], third=-inf. For i from n-1..0: if nums[i]<third: return True. While stack and stack[-1]<nums[i]: third=stack.pop(). stack.append(nums[i]). Return False. O(n).',
      },
      {
        level: 3,
        content:
          'Right-to-left: nums[i] is the candidate for nums[j]. Popping stack[-1]<nums[i] sets "third" to the largest valid nums[k] (sits between j and end). If we later see nums[i]<third with i even further left, the 132 pattern is found. The stack stays monotone decreasing.',
      },
    ],
  },

  {
    title: 'Find the Most Competitive Subsequence',
    slug: 'find-the-most-competitive-subsequence',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'MEDIUM',
    statement:
      'Return the most competitive subsequence of nums of length k. A sequence is more competitive if at the first different position it has a smaller element.\n\nExample: nums=[3,5,2,6], k=2 → [2,6]\nExample: nums=[2,4,3,3,5,4,9,6], k=4 → [2,3,3,4]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a monotonic increasing stack. Pop a larger element only if enough elements remain to complete a subsequence of length k.',
      },
      {
        level: 2,
        content:
          'stack=[]. For i, x in enumerate(nums): while stack and stack[-1]>x and len(stack)+(n-i)>k: stack.pop(). If len(stack)<k: stack.append(x). Return stack. O(n).',
      },
      {
        level: 3,
        content:
          'len(stack)+(n-i)>k checks: if we pop now, are there still enough remaining elements (including current) to fill k positions? This prevents under-filling. Very similar to Remove K Digits — the stack stays monotone increasing and we cap size at k.',
      },
    ],
  },

  {
    title: 'Sum of Subarray Minimums',
    slug: 'sum-of-subarray-minimums',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'MEDIUM',
    statement:
      'Return the sum of min(b) for every contiguous subarray b of arr, modulo 10^9+7.\n\nExample: arr=[3,1,2,4] → 17\nExample: arr=[11,81,94,43,3] → 444',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each element, count how many subarrays have it as the minimum using left and right boundary distances found with a monotonic stack.',
      },
      {
        level: 2,
        content:
          'For each i find: left[i]=distance to previous strictly smaller (use monotone increasing stack); right[i]=distance to next smaller or equal. Contribution=arr[i]*left[i]*right[i]. Sum all contributions mod 1e9+7. O(n).',
      },
      {
        level: 3,
        content:
          'left[i] * right[i] counts subarrays where arr[i] is the minimum. Using strict < on the left and ≤ on the right avoids double-counting equal elements. Two separate stack passes (or one combined pass) compute both boundaries in O(n).',
      },
    ],
  },

  {
    title: 'Buildings With an Ocean View',
    slug: 'buildings-with-an-ocean-view',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'MEDIUM',
    statement:
      'Buildings stand in a row. A building has an ocean view if every building to its right is shorter. Return the sorted indices of all buildings with an ocean view.\n\nExample: heights=[4,2,3,1] → [0,2,3]\nExample: heights=[4,3,2,1] → [0,1,2,3]\nExample: heights=[1,3,2,4] → [3]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Traverse right to left tracking the running max. Any building taller than all buildings to its right has an ocean view.',
      },
      {
        level: 2,
        content:
          'result=[], max_right=0. For i from n-1..0: if heights[i]>max_right: result.append(i); max_right=heights[i]. Return result[::-1]. O(n). Alternatively, a monotone decreasing stack left-to-right: pop buildings that lose their view when a taller one arrives.',
      },
      {
        level: 3,
        content:
          'Right-to-left: any building taller than the current max has an unobstructed view — max_right tracks the tallest seen so far to the right. Reverse the result for ascending order. The monotone stack from the left is equivalent: surviving stack entries at the end are exactly the buildings with ocean views.',
      },
    ],
  },

  {
    title: 'Next Greater Node In Linked List',
    slug: 'next-greater-node-in-linked-list',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'MEDIUM',
    statement:
      'Return an array of the next greater value for each node in a singly linked list. Return 0 if no greater value exists to the right.\n\nExample: head=[2,1,5] → [5,5,0]\nExample: head=[2,7,4,3,5] → [7,0,5,5,0]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Convert the linked list to an array, then apply the standard Next Greater Element algorithm with a monotonic decreasing stack.',
      },
      {
        level: 2,
        content:
          'vals=[node.val for node in list]; res=[0]*n; stack=[]. For i,v in enumerate(vals): while stack and vals[stack[-1]]<v: res[stack.pop()]=v. stack.append(i). Return res. O(n).',
      },
      {
        level: 3,
        content:
          'This is NGE applied to a linear sequence. Storing indices (not values) in the stack lets you write to res[j] when a greater value is found. Nodes still on the stack at the end have no next greater element (res stays 0).',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Trapping Rain Water',
    slug: 'trapping-rain-water',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'HARD',
    statement:
      'Given n non-negative integers representing elevation heights where each bar has width 1, compute how much water can be trapped after raining.\n\nExample: height=[0,1,0,2,1,0,1,3,2,1,2,1] → 6\nExample: height=[4,2,0,3,2,5] → 9',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'At each position, the trapped water equals min(max_height_left, max_height_right) − height[i]. Precompute prefix/suffix maxes, or use a monotonic stack to process valleys.',
      },
      {
        level: 2,
        content:
          'Monotonic stack: maintain a decreasing stack of indices. When height[i]>stack.top(): pop valley floor, compute water as (min(height[stack.top()], height[i]) − height[floor]) * (i − stack.top() − 1). Two-pointer approach: O(n) time O(1) space.',
      },
      {
        level: 3,
        content:
          'Stack approach: stack holds decreasing heights. When a taller bar arrives, pop the lowest bar (valley bottom). Left wall = new stack top; right wall = current bar. Water in this layer = (min(left_wall, right_wall) − bottom_height) × width. Repeat until stack top ≥ current bar or stack is empty.',
      },
    ],
  },

  {
    title: 'Largest Rectangle in Histogram',
    slug: 'largest-rectangle-in-histogram',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'HARD',
    statement:
      'Given an array of bar heights where each bar has width 1, find the area of the largest rectangle that can be formed within the histogram.\n\nExample: heights=[2,1,5,6,2,3] → 10\nExample: heights=[2,4] → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each bar, the largest rectangle using it as the shortest bar extends left and right until a shorter bar is encountered. A monotonic stack finds these boundaries in O(n).',
      },
      {
        level: 2,
        content:
          'Monotone increasing stack of indices. Append sentinel 0 at end. For i from 0..n: while stack and heights[stack[-1]]>=heights[i]: h=heights[stack.pop()]; w=i-(stack[-1]+1 if stack else 0); area=max(area,h*w). Push i. O(n).',
      },
      {
        level: 3,
        content:
          'When a shorter bar arrives at i, every popped bar can extend right only to i-1. The left boundary for a popped bar is the new stack top+1 (or 0 if stack is empty). The sentinel height-0 at the end flushes all remaining bars. Width = right_boundary − left_boundary.',
      },
    ],
  },

  {
    title: 'Maximal Rectangle',
    slug: 'maximal-rectangle',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'HARD',
    statement:
      'Given a binary matrix of \'0\'s and \'1\'s, find the largest rectangle containing only \'1\'s and return its area.\n\nExample: matrix=[["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]] → 6',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Build a cumulative heights array row by row (heights[j] = consecutive 1s upward in column j). Then apply Largest Rectangle in Histogram on each row\'s heights.',
      },
      {
        level: 2,
        content:
          'heights=[0]*cols. For each row: heights[j] = heights[j]+1 if matrix[i][j]==\'1\' else 0. Run largestRectangleHistogram(heights). Answer=max over all rows. O(m*n).',
      },
      {
        level: 3,
        content:
          'Each row\'s heights array represents the number of consecutive 1s upward, with each column acting as a histogram bar. Applying the O(n) histogram solution per row gives O(m*n) total. This reduces a 2D problem to a sequence of 1D histogram problems.',
      },
    ],
  },

  {
    title: 'Sliding Window Maximum',
    slug: 'sliding-window-maximum',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'HARD',
    statement:
      'Given array nums and window size k, return an array of the maximum of each sliding window of size k.\n\nExample: nums=[1,3,-1,-3,5,3,6,7], k=3 → [3,3,5,5,6,7]\nExample: nums=[1], k=1 → [1]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a monotonic decreasing deque of indices. The front is always the window maximum. Remove from the front when out of the window; remove from the back when smaller than the new element.',
      },
      {
        level: 2,
        content:
          'deque of indices. For i from 0..n-1: while deque and deque[0]<i-k+1: popleft(). While deque and nums[deque[-1]]<nums[i]: pop(). append(i). If i>=k-1: res.append(nums[deque[0]]). O(n).',
      },
      {
        level: 3,
        content:
          'Invariant: indices in the deque are in increasing order; corresponding values are in decreasing order. Front removal keeps the window valid; back removal maintains the monotone property (a smaller element earlier can never be the max while a larger later element is present).',
      },
    ],
  },

  {
    title: 'Number of Visible People in a Queue',
    slug: 'number-of-visible-people-in-a-queue',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'HARD',
    statement:
      'People of distinct heights stand in a queue. Person i can see person j (i<j) if every person between them is shorter than both heights[i] and heights[j]. Return for each person the number of people they can see.\n\nExample: heights=[10,6,8,5,11,9] → [3,1,2,1,1,0]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Scan right to left with a monotonic decreasing stack. Person i sees each person that gets popped (shorter, then blocked) plus one more if a taller person still remains.',
      },
      {
        level: 2,
        content:
          'stack=[], ans=[0]*n. For i from n-1..0: count=0. While stack and stack[-1]<heights[i]: stack.pop(); count++. If stack: count++ (can see the first taller person). ans[i]=count; stack.append(heights[i]). O(n).',
      },
      {
        level: 3,
        content:
          'Each popped person was visible to i (shorter, not blocked from i\'s perspective), and was then "consumed" by the taller person now at the top. The +1 for a remaining taller top accounts for seeing that person directly (even though they block everything beyond). Right-to-left processing naturally respects the ordering constraint.',
      },
    ],
  },

  {
    title: 'Sum of Total Strength of Wizards',
    slug: 'sum-of-total-strength-of-wizards',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'HARD',
    statement:
      'The strength of a wizard group is its minimum strength multiplied by the total strength sum. Return the sum of strengths over all non-empty contiguous groups, modulo 10^9+7.\n\nExample: strength=[1,3,1,2] → 44\nExample: strength=[5,4,6] → 213',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each element as the group minimum, find the span of subarrays it governs using a monotonic stack. Then use prefix sums of prefix sums to efficiently compute the sum of all subarray sums within that span.',
      },
      {
        level: 2,
        content:
          'Find left[i] (previous strictly smaller index) and right[i] (next smaller-or-equal index) via monotone increasing stack. Let P=prefix sums, PP=prefix sums of P. Contribution of i = strength[i] * ((i-left[i])*PP[right[i]+1] - (right[i]-i)*PP[i+1]) mod MOD. O(n).',
      },
      {
        level: 3,
        content:
          'PP (double prefix sum) lets you compute the sum of all subarray sums in a range in O(1). For subarrays [l..r] where i is the minimum: sum of subarray sums = (i-l+1)*P[r+1] - (r-i)*P[i+1] summed over all valid l, r — this simplifies to the formula above using PP. Apply modular arithmetic at each step.',
      },
    ],
  },

  {
    title: 'Car Fleet II',
    slug: 'car-fleet-ii',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'HARD',
    statement:
      'n cars travel right on an infinite road. cars[i]=[position, speed]. A car collides with the car directly ahead if it catches up. Return for each car the time it takes to collide with the next car, or -1 if it never does.\n\nExample: cars=[[1,2],[2,1],[4,3],[7,2]] → [1.0,-1.0,3.0,-1.0]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Process cars right to left with a monotonic stack. For each car, check if it catches up before the car ahead has already merged into a farther fleet.',
      },
      {
        level: 2,
        content:
          'stack of car indices (right to left). For each car i: while stack: t=(cars[stack[-1]][0]-cars[i][0])/(cars[i][1]-cars[stack[-1]][1]) if cars[i][1]>cars[stack[-1]][1] else inf. If ans[stack[-1]]!=-1 and ans[stack[-1]]<=t: pop (i merges with a farther fleet first). Else: ans[i]=t; break. If stack empty: ans[i]=-1. Push i. O(n).',
      },
      {
        level: 3,
        content:
          'The stack holds "surviving fleet leaders" (cars that haven\'t been caught yet from the right perspective). If car i would catch fleet leader j, but j already merged into a farther fleet before that time (ans[j]<=t), then j is no longer an independent leader when i reaches it — pop j. Continue until finding a leader that i cannot catch in time, or the stack is empty.',
      },
    ],
  },

  {
    title: 'Max Chunks To Make Sorted II',
    slug: 'max-chunks-to-make-sorted-ii',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'HARD',
    statement:
      'Given an integer array arr (possibly with duplicates), split it into the maximum number of chunks such that sorting each chunk individually and concatenating gives the fully sorted array.\n\nExample: arr=[5,4,3,2,1] → 1\nExample: arr=[2,1,3,4,4] → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A valid chunk boundary exists where the maximum of everything to the left ≤ minimum of everything to the right. Precompute prefix maxes and suffix mins.',
      },
      {
        level: 2,
        content:
          'prefix_max[i]=max(arr[0..i]); suffix_min[i]=min(arr[i..n-1]). chunks=0. For i from 0..n-2: if prefix_max[i]<=suffix_min[i+1]: chunks++. Return chunks+1. O(n). Monotone stack approach: stack of chunk-maximums — push cur_max after merging smaller tops; len(stack)=answer.',
      },
      {
        level: 3,
        content:
          'Monotone stack approach: for each arr[i], set cur_max=arr[i]. While stack.top()>arr[i]: cur_max=max(cur_max, stack.pop()) (merge overlapping chunks). Push cur_max. Stack length at the end = number of valid chunks. Each stack entry represents the maximum of one non-overlapping chunk.',
      },
    ],
  },

  {
    title: 'Maximum Sum Queries',
    slug: 'maximum-sum-queries',
    pattern: 'MONOTONIC_STACK',
    difficulty: 'HARD',
    statement:
      'Given arrays nums1, nums2 (same length) and queries[i]=[xi, yi], for each query return the maximum nums1[j]+nums2[j] where nums1[j]>=xi and nums2[j]>=yi. Return -1 if no such j exists.\n\nExample: nums1=[4,3,1,2], nums2=[2,4,9,5], queries=[[4,1],[1,3],[2,5]] → [6,10,7]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort elements and queries by their first dimension descending. Use a monotonic stack on nums2 values to efficiently answer each query\'s second-dimension constraint.',
      },
      {
        level: 2,
        content:
          'Sort elements by nums1 desc. Sort queries by xi desc (keep original indices). For each query: add all elements with nums1[j]>=xi to a monotone stack (decreasing nums2, increasing sums). Binary search the stack for the first entry with nums2>=yi. O((n+q) log n).',
      },
      {
        level: 3,
        content:
          'Stack invariant: as nums2 decreases (front to back), sums must strictly increase — otherwise a dominated entry (lower nums2 AND lower sum) is useless and should be discarded. This forms a Pareto front. Binary search on nums2 finds the leftmost entry satisfying the query threshold, which has the maximum sum by the invariant.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 12 — MONOTONIC_STACK (30 problems)...\n');

  let seeded = 0;
  let skipped = 0;

  for (const problem of BATCH) {
    const { hints: problemHints, ...problemData } = problem;

    const [inserted] = await db
      .insert(problems)
      .values(problemData)
      .onConflictDoNothing({ target: problems.slug })
      .returning({ id: problems.id, title: problems.title });

    if (!inserted) {
      console.log(`  skip  ${problem.slug}`);
      skipped++;
      continue;
    }

    for (const hint of problemHints) {
      await db.insert(hints).values({ problemId: inserted.id, ...hint });
    }

    const tag = `[${problem.difficulty}]`;
    console.log(`  ✓  ${tag.padEnd(8)} ${inserted.title}`);
    seeded++;
  }

  console.log(`\nDone. ${seeded} seeded, ${skipped} skipped.`);
  await client.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
