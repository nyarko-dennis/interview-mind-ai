import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 1 — TWO_POINTERS (29 problems: 9 Easy, 9 Medium, 10 Hard)
// Skips: Valid Palindrome (Easy) and Container With Most Water (Medium) already seeded.
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
    title: 'Two Sum II - Input Array Is Sorted',
    slug: 'two-sum-ii-input-array-is-sorted',
    pattern: 'TWO_POINTERS',
    difficulty: 'EASY',
    statement:
      'Given a 1-indexed sorted array numbers in non-decreasing order, find two numbers that add up to target. Return their 1-indexed positions as [index1, index2]. You may not use the same element twice. Exactly one solution exists.\n\nExample: numbers = [2,7,11,15], target = 9 → [1,2]\nExample: numbers = [2,3,4], target = 6 → [1,3]\nExample: numbers = [-1,0], target = -1 → [1,2]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'The array is sorted. Place one pointer at the start and one at the end. If their sum is too large, which pointer should move inward? If too small, which one?',
      },
      {
        level: 2,
        content:
          'Two Pointers from opposite ends. If sum > target: right--. If sum < target: left++. If sum == target: return [left+1, right+1]. The sorted order guarantees exactly one solution is always found in O(n).',
      },
    ],
  },

  {
    title: 'Remove Duplicates from Sorted Array',
    slug: 'remove-duplicates-from-sorted-array',
    pattern: 'TWO_POINTERS',
    difficulty: 'EASY',
    statement:
      'Given an integer array nums sorted in non-decreasing order, remove duplicates in-place so each unique element appears only once. Return k, the count of unique elements. The first k elements of nums must hold the result in order.\n\nExample: nums = [1,1,2] → k=2, nums=[1,2,...]\nExample: nums = [0,0,1,1,1,2,2,3,3,4] → k=5, nums=[0,1,2,3,4,...]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use a slow pointer to track where the next unique element should be written, and a fast pointer to scan ahead. When does the fast pointer find a value worth keeping?',
      },
      {
        level: 2,
        content:
          'Two Pointers: slow=0, fast=1. While fast < n: if nums[fast] != nums[slow]: slow++; nums[slow] = nums[fast]. fast++. Return slow+1. The slow pointer always points at the last confirmed unique element.',
      },
    ],
  },

  {
    title: 'Move Zeroes',
    slug: 'move-zeroes',
    pattern: 'TWO_POINTERS',
    difficulty: 'EASY',
    statement:
      'Given an integer array nums, move all 0s to the end while maintaining the relative order of non-zero elements. Do it in-place without making a copy.\n\nExample: nums = [0,1,0,3,12] → [1,3,12,0,0]\nExample: nums = [0] → [0]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Keep a write pointer for the next non-zero position. Scan with a read pointer — when you find a non-zero, place it at the write pointer and advance it. What fills the remaining positions after the scan?',
      },
      {
        level: 2,
        content:
          'Two Pointers: slow=0 (write). For fast in range(n): if nums[fast] != 0: nums[slow]=nums[fast]; slow++. After the loop, fill nums[slow:] with zeros. Single pass, preserves order.',
      },
    ],
  },

  {
    title: 'Reverse String',
    slug: 'reverse-string',
    pattern: 'TWO_POINTERS',
    difficulty: 'EASY',
    statement:
      "Write a function that reverses a character array s in-place using O(1) extra memory.\n\nExample: s = ['h','e','l','l','o'] → ['o','l','l','e','h']\nExample: s = ['H','a','n','n','a','h'] → ['h','a','n','n','a','H']",
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Place one pointer at the start and one at the end. Swap the characters they point to, then move both inward. When do they stop?',
      },
      {
        level: 2,
        content:
          'Two Pointers: left=0, right=len(s)-1. While left < right: swap s[left] and s[right]; left++; right--. Exactly n//2 swaps needed. The loop stops when pointers meet or cross in the middle.',
      },
    ],
  },

  {
    title: 'Squares of a Sorted Array',
    slug: 'squares-of-a-sorted-array',
    pattern: 'TWO_POINTERS',
    difficulty: 'EASY',
    statement:
      'Given an integer array nums sorted in non-decreasing order, return an array of the squares of each number in non-decreasing order.\n\nExample: nums = [-4,-1,0,3,10] → [0,1,9,16,100]\nExample: nums = [-7,-3,2,3,11] → [4,9,9,49,121]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Squaring removes the sign, so the largest square is always at one end of the sorted array. Fill the result array from the back — which pointer should you advance after placing each value?',
      },
      {
        level: 2,
        content:
          'Two Pointers from opposite ends, fill result right-to-left. pos=n-1. While left <= right: if abs(nums[left]) > abs(nums[right]): result[pos]=nums[left]**2; left++ else: result[pos]=nums[right]**2; right--. pos--. The largest unsquared value is always at one of the two ends.',
      },
    ],
  },

  {
    title: 'Is Subsequence',
    slug: 'is-subsequence',
    pattern: 'TWO_POINTERS',
    difficulty: 'EASY',
    statement:
      'Given two strings s and t, return true if s is a subsequence of t. A subsequence preserves relative order but does not require consecutive characters.\n\nExample: s = "abc", t = "ahbgdc" → true\nExample: s = "axc", t = "ahbgdc" → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Walk through t with one pointer. Use a second pointer to track how far into s you have matched. What condition at the end tells you s is a full subsequence?',
      },
      {
        level: 2,
        content:
          'Two Pointers: i=0 for s, j=0 for t. While i < len(s) and j < len(t): if s[i]==t[j]: i++. j++ always. Return i==len(s). You advance s\'s pointer only on a match; you always advance t\'s pointer.',
      },
    ],
  },

  {
    title: 'Merge Sorted Array',
    slug: 'merge-sorted-array',
    pattern: 'TWO_POINTERS',
    difficulty: 'EASY',
    statement:
      'You are given two integer arrays nums1 and nums2 sorted in non-decreasing order, and integers m and n representing their element counts. Merge nums2 into nums1 in-place in sorted order. nums1 has size m+n; its last n slots are 0 placeholders.\n\nExample: nums1=[1,2,3,0,0,0], m=3, nums2=[2,5,6], n=3 → [1,2,2,3,5,6]\nExample: nums1=[1], m=1, nums2=[], n=0 → [1]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          "Merging from the front overwrites unprocessed elements. Start from the back instead — the last slot in nums1 should get the overall largest element. Which array does that come from?",
      },
      {
        level: 2,
        content:
          'Three Pointers from the back: p1=m-1, p2=n-1, p=m+n-1. While p2>=0: if p1>=0 and nums1[p1]>nums2[p2]: nums1[p]=nums1[p1]; p1-- else: nums1[p]=nums2[p2]; p2--. p--. Leftover nums1 elements are already in place; leftover nums2 must be copied.',
      },
    ],
  },

  {
    title: 'Remove Element',
    slug: 'remove-element',
    pattern: 'TWO_POINTERS',
    difficulty: 'EASY',
    statement:
      'Given an integer array nums and an integer val, remove all occurrences of val in-place and return k, the count of remaining elements. The first k elements must hold the remaining values in any order.\n\nExample: nums=[3,2,2,3], val=3 → k=2, nums=[2,2,...]\nExample: nums=[0,1,2,2,3,0,4,2], val=2 → k=5, nums=[0,1,3,0,4,...]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use a write pointer k starting at 0. Scan through the array — when should you write to position k and advance it?',
      },
      {
        level: 2,
        content:
          'Single Pointer: k=0. For each num in nums: if num != val: nums[k]=num; k++. Return k. One pass, no extra space. Values after position k are irrelevant.',
      },
    ],
  },

  {
    title: 'Valid Palindrome II',
    slug: 'valid-palindrome-ii',
    pattern: 'TWO_POINTERS',
    difficulty: 'EASY',
    statement:
      'Given a string s, return true if it can become a palindrome by deleting at most one character.\n\nExample: s = "aba" → true\nExample: s = "abca" → true (delete \'c\')\nExample: s = "abc" → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Walk two pointers inward. When characters match, advance both. When they differ, you must delete one of the two — but which one? After the deletion, what must be true of the remaining substring?',
      },
      {
        level: 2,
        content:
          'Two Pointers: left=0, right=len(s)-1. While left<right: if s[left]!=s[right]: return isPalin(s,left+1,right) or isPalin(s,left,right-1). left++;right--. Return True. Helper isPalin checks if a substring is already a palindrome. You only ever need one deletion — try both options.',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: '3Sum',
    slug: '3sum',
    pattern: 'TWO_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Given an integer array nums, return all unique triplets [nums[i], nums[j], nums[k]] where i, j, k are distinct and nums[i] + nums[j] + nums[k] == 0.\n\nExample: nums = [-1,0,1,2,-1,-4] → [[-1,-1,2],[-1,0,1]]\nExample: nums = [0,1,1] → []\nExample: nums = [0,0,0] → [[0,0,0]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort first so duplicates are adjacent and easy to skip. Fixing one element at index i reduces the problem to finding two numbers in the rest that sum to -nums[i]. How does sorting help with that inner search?',
      },
      {
        level: 2,
        content:
          'Sort + Two Pointers. Fix nums[i] in outer loop. left=i+1, right=n-1. If sum<0: left++. If sum>0: right--. If sum==0: record, then skip duplicate values on both sides before continuing. Also skip duplicate nums[i] values in the outer loop. O(n²) total.',
      },
      {
        level: 3,
        content:
          'Sort(nums). For i in range(n-2): if i>0 and nums[i]==nums[i-1]: continue. left,right=i+1,n-1. While left<right: s=nums[i]+nums[left]+nums[right]. if s<0: left++ elif s>0: right-- else: result.append([...]); while left<right and nums[left]==nums[left+1]: left++; while nums[right]==nums[right-1]: right--; left++;right--. Return result.',
      },
    ],
  },

  {
    title: '3Sum Closest',
    slug: '3sum-closest',
    pattern: 'TWO_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Given an integer array nums and an integer target, find three integers in nums whose sum is closest to target. Return that sum. Exactly one solution exists.\n\nExample: nums = [-1,2,1,-4], target = 1 → 2 (sum of -1+2+1)\nExample: nums = [0,0,0], target = 1 → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort and fix one element. For the remaining two, use two pointers. When the sum is closer to target than your best, update it. Which pointer should move based on whether the sum is too large or too small?',
      },
      {
        level: 2,
        content:
          'Sort + Two Pointers. Fix nums[i], left=i+1, right=n-1. Compute s=sum of three. If |s-target| < |closest-target|: update closest. If s==target: return immediately. If s<target: left++ else right--. Return closest after all iterations.',
      },
      {
        level: 3,
        content:
          'Sort nums. closest=nums[0]+nums[1]+nums[2]. For i in range(n-2): left,right=i+1,n-1. While left<right: s=nums[i]+nums[left]+nums[right]. if abs(s-target)<abs(closest-target): closest=s. if s==target: return s elif s<target: left++ else right--. Return closest.',
      },
    ],
  },

  {
    title: '4Sum',
    slug: '4sum',
    pattern: 'TWO_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Given an integer array nums and an integer target, return all unique quadruplets that sum to target.\n\nExample: nums = [1,0,-1,0,-2,2], target = 0 → [[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]\nExample: nums = [2,2,2,2,2], target = 8 → [[2,2,2,2]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Extend the 3Sum approach. Two nested loops fix the first two elements; two pointers handle the remaining two. How do you avoid duplicate quadruplets at each level of nesting?',
      },
      {
        level: 2,
        content:
          'Sort + nested Two Pointers. Outer loop fixes nums[i]; inner loop fixes nums[j] (starting at i+1). left=j+1, right=n-1. Skip duplicate values of nums[i] and nums[j] in each loop. After finding a valid quad, skip duplicates on both pointer sides. O(n³) total.',
      },
      {
        level: 3,
        content:
          'Sort. For i in range(n-3): skip dup i. For j in range(i+1,n-2): skip dup j. left,right=j+1,n-1. While left<right: s=nums[i]+nums[j]+nums[left]+nums[right]. if s==target: append; skip dup left; skip dup right; left++;right--. elif s<target: left++ else right--.',
      },
    ],
  },

  {
    title: 'Longest Palindromic Substring',
    slug: 'longest-palindromic-substring',
    pattern: 'TWO_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Given a string s, return the longest palindromic substring.\n\nExample: s = "babad" → "bab" (or "aba")\nExample: s = "cbbd" → "bb"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Every palindrome has a center — either a single character (odd length) or a pair of equal characters (even length). If you expand outward from each possible center while characters match, how many potential centers exist for a string of length n?',
      },
      {
        level: 2,
        content:
          'Expand Around Center. For each index i, try both odd center (i,i) and even center (i,i+1). Two pointers l and r move outward while s[l]==s[r]. Track the longest expansion found. There are 2n-1 centers; each expansion is O(n) → O(n²) total, O(1) space.',
      },
      {
        level: 3,
        content:
          'best_start,best_len=0,1. def expand(l,r): while l>=0 and r<n and s[l]==s[r]: l--;r++; return (l+1, r-l-1). For i in range(n): for (start,length) in [expand(i,i), expand(i,i+1)]: if length>best_len: best_start,best_len=start,length. Return s[best_start:best_start+best_len].',
      },
    ],
  },

  {
    title: 'Boats to Save People',
    slug: 'boats-to-save-people',
    pattern: 'TWO_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'You are given an array people where people[i] is the weight of the ith person, and a boat weight limit. Each boat carries at most 2 people within the limit. Return the minimum number of boats required.\n\nExample: people = [1,2], limit = 3 → 1\nExample: people = [3,2,2,1], limit = 3 → 3\nExample: people = [3,5,3,4], limit = 5 → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort by weight. The heaviest person must board some boat — can they share with anyone? The best candidate to pair with them is the lightest remaining person. What does that tell you about the pointer strategy?',
      },
      {
        level: 2,
        content:
          'Greedy + Two Pointers. Sort. left=0 (lightest), right=n-1 (heaviest). If people[left]+people[right]<=limit: both fit, left++, right--. Else: heaviest goes alone, right--. Always boats++. Pairing heaviest with lightest is always optimal — pairing heaviest with someone heavier forces more boats.',
      },
      {
        level: 3,
        content:
          'Sort people. left,right=0,n-1. boats=0. While left<=right: if people[left]+people[right]<=limit: left++. right--; boats++. Return boats. Note: right-- handles both cases — if paired, right moves inward; if solo, right moves inward. Each iteration always uses exactly one boat.',
      },
    ],
  },

  {
    title: 'Rotate Array',
    slug: 'rotate-array',
    pattern: 'TWO_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Given an integer array nums, rotate it to the right by k steps in-place.\n\nExample: nums = [1,2,3,4,5,6,7], k = 3 → [5,6,7,1,2,3,4]\nExample: nums = [-1,-100,3,99], k = 2 → [3,99,-1,-100]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          "Rotating right by k moves the last k elements to the front. There's an elegant in-place trick using three reversal operations — what three segments of the array would you reverse, and in what order?",
      },
      {
        level: 2,
        content:
          "Three Reversals. k = k % n. Step 1: reverse the entire array. Step 2: reverse nums[0:k]. Step 3: reverse nums[k:]. Why: reversing all places the last k elements at the front (backwards); reversing each half restores order. O(n) time, O(1) space.",
      },
      {
        level: 3,
        content:
          'def rev(l,r): while l<r: nums[l],nums[r]=nums[r],nums[l]; l++;r--. k%=n. rev(0,n-1); rev(0,k-1); rev(k,n-1). Trace [1,2,3,4,5,6,7] k=3: full reverse → [7,6,5,4,3,2,1] → rev [0:2] → [5,6,7,4,3,2,1] → rev [3:] → [5,6,7,1,2,3,4]. ✓',
      },
    ],
  },

  {
    title: 'Remove Duplicates from Sorted Array II',
    slug: 'remove-duplicates-from-sorted-array-ii',
    pattern: 'TWO_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Given a sorted array nums, remove duplicates in-place so each element appears at most twice. Return k, the length of the modified array. The first k elements must hold the result.\n\nExample: nums = [1,1,1,2,2,3] → k=5, nums=[1,1,2,2,3,...]\nExample: nums = [0,0,1,1,1,1,2,3,3] → k=7, nums=[0,0,1,1,2,3,3,...]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a write pointer k. For each element, when is it safe to write it? Think about comparing the current element to the element two positions back in the already-written portion.',
      },
      {
        level: 2,
        content:
          'Two Pointers: k=0 (write index). For each num in nums: write it if k<2 OR num!=nums[k-2]. The condition num!=nums[k-2] ensures you never write a third copy. Generalises to "at most p copies" by checking nums[k-p].',
      },
      {
        level: 3,
        content:
          'k=0. For num in nums: if k<2 or num!=nums[k-2]: nums[k]=num; k++. Return k. Trace [1,1,1,2,2,3]: writes 1(k=1), 1(k=2), skips 1(nums[0]==1), writes 2(k=3), 2(k=4), 3(k=5). Result [1,1,2,2,3] length 5. ✓',
      },
    ],
  },

  {
    title: 'Number of Subsequences That Satisfy the Given Sum Condition',
    slug: 'number-of-subsequences-given-sum-condition',
    pattern: 'TWO_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Given a sorted array nums and integer target, return the number of non-empty subsequences where min+max <= target, modulo 10^9+7.\n\nExample: nums = [3,5,6,7], target = 9 → 4\nExample: nums = [3,3,6,8], target = 10 → 6\nExample: nums = [2,3,3,4,6,7], target = 12 → 61',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          "Sort the array (subsequence count doesn't change). The min of any subsequence is its leftmost element after sorting. Fix left as the minimum — what range of elements can serve as the maximum without violating the condition?",
      },
      {
        level: 2,
        content:
          'Sort + Two Pointers. For a fixed left, find the rightmost right where nums[left]+nums[right] <= target. Every subset of elements between left+1 and right can be added freely — there are 2^(right-left) such valid subsequences. Precompute powers of 2 mod 1e9+7 up to n.',
      },
      {
        level: 3,
        content:
          'Sort. MOD=10**9+7. pow2=[1]*(n+1); for i in range(1,n+1): pow2[i]=pow2[i-1]*2%MOD. left,right=0,n-1; ans=0. While left<=right: if nums[left]+nums[right]>target: right--. else: ans=(ans+pow2[right-left])%MOD; left++. Return ans. The 2^(right-left) counts all subsets of middle elements — each can be included or excluded independently.',
      },
    ],
  },

  {
    title: 'Partition Labels',
    slug: 'partition-labels',
    pattern: 'TWO_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Given a string s, partition it into as many parts as possible so that each letter appears in at most one part. Return the sizes of these parts.\n\nExample: s = "ababcbacadefegdehijhklij" → [9,7,8]\nExample: s = "eccbbbbdec" → [10]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each character in a partition, all of its occurrences must be in that same partition. What can you precompute about each character? Once a partition starts, when is it safe to end it?',
      },
      {
        level: 2,
        content:
          "Greedy window. Precompute last[c] = last index of each character. Scan left to right, tracking window_end = max last occurrence of any character seen so far. When i == window_end: close the partition (size = window_end - start + 1), start new from window_end+1.",
      },
      {
        level: 3,
        content:
          'last={c:i for i,c in enumerate(s)}. start=end=0; result=[]. For i,c in enumerate(s): end=max(end,last[c]). if i==end: result.append(end-start+1); start=end+1. Return result. Key: every new character potentially extends the required window — you can only close when no character in the window has occurrences beyond it.',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Trapping Rain Water',
    slug: 'trapping-rain-water',
    pattern: 'TWO_POINTERS',
    difficulty: 'HARD',
    statement:
      'Given n non-negative integers representing an elevation map with bar width 1, compute how much water can be trapped after raining.\n\nExample: height = [0,1,0,2,1,0,1,3,2,1,2,1] → 6\nExample: height = [4,2,0,3,2,5] → 9',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Water at position i equals min(max_left, max_right) - height[i]. A prefix/suffix max array gives O(n) with O(n) space. Can you compute this without storing all maxima, using only two pointers?',
      },
      {
        level: 2,
        content:
          'Two Pointers. left=0, right=n-1, left_max=0, right_max=0. Always process the side with the smaller current max. If left_max <= right_max: water += max(0, left_max - height[left]); update left_max; left++. Else: symmetric on right. The key insight: if left_max < right_max, the water at left is fully determined by left_max regardless of the right side.',
      },
      {
        level: 3,
        content:
          'left,right=0,n-1; lmax=rmax=water=0. While left<right: if height[left]<height[right]: if height[left]>=lmax: lmax=height[left] else: water+=lmax-height[left]; left++. else: if height[right]>=rmax: rmax=height[right] else: water+=rmax-height[right]; right--. Return water. We process the shorter side because its water is bounded by its own max — the other side is guaranteed to be at least as tall.',
      },
    ],
  },

  {
    title: 'Minimum Window Substring',
    slug: 'minimum-window-substring',
    pattern: 'TWO_POINTERS',
    difficulty: 'HARD',
    statement:
      'Given strings s and t, return the minimum window substring of s containing every character of t (including duplicates). Return "" if none exists.\n\nExample: s = "ADOBECODEBANC", t = "ABC" → "BANC"\nExample: s = "a", t = "a" → "a"\nExample: s = "a", t = "aa" → ""',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Expand right until the window contains all required characters, then shrink left to minimise. What data structures let you efficiently track whether all required characters are satisfied at each step?',
      },
      {
        level: 2,
        content:
          'Sliding Window + frequency maps. need=Counter(t), have={}. Track formed=number of characters in have that match their required count. Expand right: update have; if have[c]==need[c]: formed++. While formed==required: record window if smaller; shrink left: update have; if have[c]<need[c]: formed--. O(|s|+|t|).',
      },
      {
        level: 3,
        content:
          'need=Counter(t); have=defaultdict(int); l=0; formed=0; required=len(need); res=(-1,0,0). For r,c in enumerate(s): have[c]+=1; if c in need and have[c]==need[c]: formed+=1. While formed==required: if res[0]==-1 or r-l+1<res[0]: res=(r-l+1,l,r). lc=s[l]; have[lc]-=1; if lc in need and have[lc]<need[lc]: formed-=1; l+=1. Return "" if res[0]==-1 else s[res[1]:res[2]+1].',
      },
    ],
  },

  {
    title: 'Subarrays with K Different Integers',
    slug: 'subarrays-with-k-different-integers',
    pattern: 'TWO_POINTERS',
    difficulty: 'HARD',
    statement:
      'Given an integer array nums and integer k, return the number of good subarrays — subarrays with exactly k distinct integers.\n\nExample: nums = [1,2,1,2,3], k = 2 → 7\nExample: nums = [1,2,1,3,4], k = 3 → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Counting subarrays with exactly k distinct values is hard to do directly. But there is a useful identity: exactly(k) = atMost(k) - atMost(k-1). How would you count subarrays with at most k distinct values with a sliding window?',
      },
      {
        level: 2,
        content:
          'Sliding Window helper atMost(k): expand right, track frequency map. When distinct count > k: shrink left (remove and decrement, delete key if zero). At each right, add (right-left+1) to ans — that counts all valid subarrays ending at right. Return atMost(k) - atMost(k-1). O(n) total.',
      },
      {
        level: 3,
        content:
          'def atMost(k): count=defaultdict(int); left=ans=0. For right in range(n): count[nums[right]]+=1. While len(count)>k: count[nums[left]]-=1; if count[nums[left]]==0: del count[nums[left]]; left+=1. ans+=right-left+1. return ans. Return atMost(k)-atMost(k-1). The right-left+1 counts subarrays [...left..right], [...left+1..right], ..., [right..right] — all ending at right with ≤k distinct.',
      },
    ],
  },

  {
    title: 'Find K-th Smallest Pair Distance',
    slug: 'find-k-th-smallest-pair-distance',
    pattern: 'TWO_POINTERS',
    difficulty: 'HARD',
    statement:
      'Given an integer array nums and integer k, return the kth smallest distance among all pairs (i,j) where i < j. Distance is |nums[i] - nums[j]|.\n\nExample: nums = [1,3,1], k = 1 → 0\nExample: nums = [1,1,3,4,5], k = 3 → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'The answer lies in [0, max-min]. Binary search on the answer: for a candidate distance mid, count how many pairs have distance ≤ mid. If that count ≥ k, mid may be the answer. After sorting, how would you count such pairs efficiently?',
      },
      {
        level: 2,
        content:
          'Binary Search on Answer + Two Pointers. Sort nums. Binary search d in [0, nums[-1]-nums[0]]. For each candidate d: count pairs with distance ≤ d using a sliding window — for each right, find the leftmost left where nums[right]-nums[left] ≤ d; count = right-left. Find smallest d where count ≥ k.',
      },
      {
        level: 3,
        content:
          'Sort nums. def countPairs(mid): left=ans=0. For right in range(n): while nums[right]-nums[left]>mid: left++. ans+=right-left. return ans. lo,hi=0,nums[-1]-nums[0]. While lo<hi: mid=(lo+hi)//2. if countPairs(mid)>=k: hi=mid else: lo=mid+1. Return lo. Binary search converges because countPairs is monotonically non-decreasing in d.',
      },
    ],
  },

  {
    title: 'Count Subarrays With Fixed Bounds',
    slug: 'count-subarrays-with-fixed-bounds',
    pattern: 'TWO_POINTERS',
    difficulty: 'HARD',
    statement:
      'Given an integer array nums and integers minK, maxK, return the number of fixed-bound subarrays — subarrays where the minimum equals minK and the maximum equals maxK.\n\nExample: nums = [1,3,5,2,7,5], minK = 1, maxK = 5 → 2\nExample: nums = [1,1,1,1], minK = 1, maxK = 1 → 10',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A valid subarray must contain minK and maxK and no element outside [minK, maxK]. An out-of-range value resets the window. For each right endpoint, how many valid left endpoints are there? Track the last positions of minK, maxK, and the last bad index.',
      },
      {
        level: 2,
        content:
          'Three Pointers. last_min = last index of minK. last_max = last index of maxK. bad = last index of any element outside [minK, maxK]. For each position i: update bad/last_min/last_max as appropriate. Count = max(0, min(last_min, last_max) - bad). Sum over all i.',
      },
      {
        level: 3,
        content:
          'last_min=last_max=bad=-1; ans=0. For i,num in enumerate(nums): if num<minK or num>maxK: bad=i. if num==minK: last_min=i. if num==maxK: last_max=i. ans+=max(0, min(last_min,last_max)-bad). Return ans. min(last_min,last_max) is the earliest right boundary where both extremes are present; bad is the hard reset. Subarrays starting in (bad, min(...)] are all valid.',
      },
    ],
  },

  {
    title: 'Minimum Operations to Make Array Continuous',
    slug: 'minimum-operations-to-make-array-continuous',
    pattern: 'TWO_POINTERS',
    difficulty: 'HARD',
    statement:
      'You are given an integer array nums. In one operation you can replace any element. An array is continuous if all elements are unique and max - min == n - 1. Return the minimum number of operations.\n\nExample: nums = [4,2,5,3] → 0 (already [2,3,4,5])\nExample: nums = [1,2,3,5,6] → 1\nExample: nums = [1,10,100,1000] → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A continuous array of length n contains exactly n consecutive distinct integers. Sort and deduplicate. For each possible starting value, count how many existing elements already fall in [start, start+n-1] — those are free; the rest must be replaced.',
      },
      {
        level: 2,
        content:
          'Sort and deduplicate. Sliding Window over unique values: for each unique[left] as the window start, advance right while unique[right] < unique[left]+n. Window size = right-left elements already in range. Answer candidate = n - window_size. Minimise over all left positions.',
      },
      {
        level: 3,
        content:
          'unique=sorted(set(nums)); m=len(unique); n=len(nums); ans=n; right=0. For left in range(m): while right<m and unique[right]<unique[left]+n: right++. window=right-left. ans=min(ans, n-window). Return ans. Note: deduplication is crucial — duplicate values in the original array will both need replacement in any valid continuous array.',
      },
    ],
  },

  {
    title: 'Minimum Window Subsequence',
    slug: 'minimum-window-subsequence',
    pattern: 'TWO_POINTERS',
    difficulty: 'HARD',
    statement:
      'Given strings s1 and s2, return the minimum window in s1 that contains s2 as a subsequence. If there are multiple valid windows of the same length, return the one with the leftmost starting index. Return "" if none exists.\n\nExample: s1 = "abcdebdde", s2 = "bde" → "bcde"\nExample: s1 = "jmeqksfrsdcmsiwvaovztaqenprpvnbstl", s2 = "ims" → "msiwva"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Forward pass: walk s1 left-to-right matching s2 characters in order to find a valid window endpoint. But the window may not be minimal — the start could be pushed right. How do you find the tightest left boundary once you know the right end?',
      },
      {
        level: 2,
        content:
          'Two-pass Two Pointers per window. Forward: scan s1 matching s2 left-to-right until fully matched — record end. Backward: from end, scan backward re-matching s2 right-to-left to find the tightest left start. Record this window. Restart the forward scan from start+1. O(|s1|*|s2|) worst case.',
      },
      {
        level: 3,
        content:
          'i=j=0; res="". While i<len(s1): if s1[i]==s2[j]: j+=1. if j==len(s2): end=i+1; j-=1. while j>=0: if s1[i]==s2[j]: j-=1. i-=1. i+=1; start=i. if res=="" or end-start<len(res): res=s1[start:end]. else: i+=1. Return res. The backward pass is the key optimisation — it tightens the left boundary for the window ending at end.',
      },
    ],
  },

  {
    title: 'Shortest Subarray with Sum at Least K',
    slug: 'shortest-subarray-with-sum-at-least-k',
    pattern: 'TWO_POINTERS',
    difficulty: 'HARD',
    statement:
      'Given an integer array nums (may include negatives) and integer k, return the length of the shortest non-empty subarray with sum ≥ k. Return -1 if no such subarray exists.\n\nExample: nums = [1], k = 1 → 1\nExample: nums = [1,2], k = 4 → -1\nExample: nums = [2,-1,2], k = 3 → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Negative numbers break the basic sliding window — shrinking the window no longer guarantees the sum decreases. Prefix sums help: sum(i..j) = prefix[j+1] - prefix[i]. You want the smallest j-i where prefix[j]-prefix[i] >= k. What data structure lets you efficiently find the best i for each j?',
      },
      {
        level: 2,
        content:
          'Prefix Sum + Monotonic Deque. Build prefix sums. Maintain a deque of indices with strictly increasing prefix values. For each new index j: pop from the front while prefix[j] - prefix[front] >= k (valid window — record length, pop to seek shorter). Then pop from the back while prefix[j] <= prefix[back] (maintain monotone). Push j.',
      },
      {
        level: 3,
        content:
          'prefix=[0]*(n+1). For i in range(n): prefix[i+1]=prefix[i]+nums[i]. dq=deque(); ans=inf. For j in range(n+1): while dq and prefix[j]-prefix[dq[0]]>=k: ans=min(ans, j-dq.popleft()). While dq and prefix[j]<=prefix[dq[-1]]: dq.pop(). dq.append(j). Return -1 if ans==inf else ans. The deque is monotone increasing in prefix value because a later index with a smaller prefix always dominates earlier ones.',
      },
    ],
  },

  {
    title: 'Reverse Pairs',
    slug: 'reverse-pairs',
    pattern: 'TWO_POINTERS',
    difficulty: 'HARD',
    statement:
      'Given an integer array nums, return the number of reverse pairs — pairs (i,j) where i < j and nums[i] > 2 * nums[j].\n\nExample: nums = [1,3,2,3,1] → 2\nExample: nums = [2,4,3,5,1] → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Brute force O(n²) is too slow. Think divide and conquer: split in half, count pairs within each half recursively, then count cross pairs. For cross pairs with both halves sorted, how do you count efficiently without checking every pair?',
      },
      {
        level: 2,
        content:
          'Modified Merge Sort. During the merge step (both halves are already sorted): use two pointers to count cross-pairs where nums[left_i] > 2*nums[right_j]. Because both are sorted, the right pointer only moves forward as left_i increases. After counting, proceed with the standard merge. O(n log n).',
      },
      {
        level: 3,
        content:
          'def mergeSort(l,r): if r-l<=1: return 0. mid=(l+r)//2. count=mergeSort(l,mid)+mergeSort(mid,r). j=mid. For i in range(l,mid): while j<r and nums[i]>2*nums[j]: j++. count+=j-mid. nums[l:r]=sorted(nums[l:r]). return count. IMPORTANT: count pairs BEFORE sorting the merged half — counting uses original order; merging uses sorted order.',
      },
    ],
  },

  {
    title: 'Count Subarrays with Score Less Than K',
    slug: 'count-subarrays-with-score-less-than-k',
    pattern: 'TWO_POINTERS',
    difficulty: 'HARD',
    statement:
      'The score of a subarray is its sum multiplied by its length. Given a positive integer array nums and integer k, return the number of non-empty subarrays with score strictly less than k.\n\nExample: nums = [2,1,4,3,5], k = 10 → 6\nExample: nums = [1,1,1], k = 5 → 5',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'All numbers are positive. When you extend the window right, the score increases. When you shrink from the left, the score decreases. Does this monotone behaviour support a sliding window approach?',
      },
      {
        level: 2,
        content:
          'Sliding Window. left=0, cur_sum=0. For each right: add nums[right] to cur_sum. While cur_sum*(right-left+1) >= k: subtract nums[left]; left++. All subarrays ending at right with start in [left, right] are valid — add (right-left+1) to answer.',
      },
      {
        level: 3,
        content:
          'left=cur_sum=ans=0. For right in range(n): cur_sum+=nums[right]. While cur_sum*(right-left+1)>=k: cur_sum-=nums[left]; left++. ans+=right-left+1. Return ans. Correctness relies on all elements being positive: score strictly increases on expansion and strictly decreases on contraction, so the window boundary is a clean threshold.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 1 — TWO_POINTERS (29 problems)...\n');

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
