import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 3 — BINARY_SEARCH (28 problems: 9 Easy, 9 Medium, 10 Hard)
// Already seeded: Binary Search (Easy), Search in Rotated Sorted Array (Medium)
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
    title: 'First Bad Version',
    slug: 'first-bad-version',
    pattern: 'BINARY_SEARCH',
    difficulty: 'EASY',
    statement:
      'You are a product manager. The latest version fails QA. All versions after the first bad one are also bad. Given n versions [1..n] and an API isBadVersion(v) → bool, find the first bad version while minimising API calls.\n\nExample: n=5, bad=4 → isBadVersion(3)=false, isBadVersion(4)=true → return 4\nExample: n=1, bad=1 → return 1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'The versions form a pattern: false, false, ..., true, true, true. Binary search on this pattern: if the midpoint is bad, the first bad version is at mid or earlier; if it is not bad, the first bad version is strictly after mid.',
      },
      {
        level: 2,
        content:
          'Binary Search on predicate. left=1, right=n. While left<right: mid=(left+right)//2. if isBadVersion(mid): right=mid else: left=mid+1. Return left. Using left<right (not <=) and right=mid (not mid-1) ensures the loop terminates on the exact first bad version.',
      },
    ],
  },

  {
    title: 'Sqrt(x)',
    slug: 'sqrt-x',
    pattern: 'BINARY_SEARCH',
    difficulty: 'EASY',
    statement:
      'Given a non-negative integer x, return the floor of its square root (the largest integer r such that r² ≤ x). Do not use built-in exponent functions or sqrt.\n\nExample: x = 4 → 2\nExample: x = 8 → 2 (sqrt(8) ≈ 2.828, floor = 2)',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'The answer lies in [0, x]. The function f(r) = r² is monotonically increasing — binary search for the largest r where r² ≤ x. What are your left and right bounds, and which condition shrinks which side?',
      },
      {
        level: 2,
        content:
          'Binary Search. left=0, right=x. While left<=right: mid=(left+right)//2. if mid*mid==x: return mid. elif mid*mid<x: left=mid+1 (mid is a candidate, keep going right). else: right=mid-1. Return right. When the loop exits, right is the largest integer whose square does not exceed x.',
      },
    ],
  },

  {
    title: 'Search Insert Position',
    slug: 'search-insert-position',
    pattern: 'BINARY_SEARCH',
    difficulty: 'EASY',
    statement:
      'Given a sorted array of distinct integers and a target, return the index if found, or the index where it would be inserted in order.\n\nExample: nums=[1,3,5,6], target=5 → 2\nExample: nums=[1,3,5,6], target=2 → 1\nExample: nums=[1,3,5,6], target=7 → 4\nExample: nums=[1,3,5,6], target=0 → 0',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Standard binary search with one twist: if the target is not found, what does the left pointer point to when the loop exits? Trace through a case where target is not in the array.',
      },
      {
        level: 2,
        content:
          'Binary Search. left=0, right=n-1. While left<=right: mid=(left+right)//2. if nums[mid]==target: return mid. elif nums[mid]<target: left=mid+1 else: right=mid-1. Return left. When the loop exits without finding target, left equals the first index greater than target — exactly the insertion point.',
      },
    ],
  },

  {
    title: 'Guess Number Higher or Lower',
    slug: 'guess-number-higher-or-lower',
    pattern: 'BINARY_SEARCH',
    difficulty: 'EASY',
    statement:
      'I pick a number from 1 to n. You guess using guess(num), which returns: -1 if your guess is too high, 1 if too low, 0 if correct. Return the number I picked.\n\nExample: n=10, pick=6 → guess(6) returns 0 → return 6',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'The API gives you directional feedback — identical to comparing against a hidden target. Binary search on [1, n], adjusting bounds based on what guess() returns.',
      },
      {
        level: 2,
        content:
          'Binary Search. left=1, right=n. While left<=right: mid=(left+right)//2. res=guess(mid). if res==0: return mid. elif res==-1: right=mid-1 (guessed too high). else: left=mid+1 (guessed too low). The API result directly maps to which half to discard.',
      },
    ],
  },

  {
    title: 'Count Negative Numbers in a Sorted Matrix',
    slug: 'count-negative-numbers-in-sorted-matrix',
    pattern: 'BINARY_SEARCH',
    difficulty: 'EASY',
    statement:
      'Given an m×n matrix grid sorted in non-increasing order in each row and column, return the number of negative numbers.\n\nExample: grid=[[4,3,2,-1],[3,2,1,-1],[1,1,-1,-2],[-1,-1,-2,-3]] → 8\nExample: grid=[[3,2],[1,0]] → 0',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Each row is sorted in non-increasing order. For each row, binary search for the first negative index — all elements from that index to the end are negative. Or use a staircase approach exploiting both row and column ordering.',
      },
      {
        level: 2,
        content:
          'Binary Search per row. For each row: find the first index where grid[row][mid] < 0 using binary search (left=0, right=n). The count for that row is n - first_negative_index. Sum across all rows. O(m log n). Alternatively, start at top-right and walk left/down in O(m+n).',
      },
    ],
  },

  {
    title: 'Find Smallest Letter Greater Than Target',
    slug: 'find-smallest-letter-greater-than-target',
    pattern: 'BINARY_SEARCH',
    difficulty: 'EASY',
    statement:
      "Given a sorted character array letters (wraps around) and a character target, return the smallest letter lexicographically greater than target. If none, return the first letter.\n\nExample: letters=['c','f','j'], target='a' → 'c'\nExample: letters=['c','f','j'], target='c' → 'f'\nExample: letters=['c','f','j'], target='j' → 'c' (wrap around)",
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          "Binary search for the first letter strictly greater than target. The wrap-around means if no letter is greater, the answer is letters[0]. How does the boundary condition differ from a standard lower-bound search?",
      },
      {
        level: 2,
        content:
          "Binary Search (lower bound, strict). left=0, right=n. While left<right: mid=(left+right)//2. if letters[mid]<=target: left=mid+1 else: right=mid. Return letters[left%n]. The %n handles wrap-around — if left==n, no letter was greater, so we return letters[0].",
      },
    ],
  },

  {
    title: 'Kth Missing Positive Number',
    slug: 'kth-missing-positive-number',
    pattern: 'BINARY_SEARCH',
    difficulty: 'EASY',
    statement:
      'Given an array arr of positive integers sorted in strictly increasing order and an integer k, return the kth missing positive integer.\n\nExample: arr=[2,3,4,7,11], k=5 → 9\nExample: arr=[1,2,3,4], k=2 → 6',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'At index i (0-based), arr[i] would be i+1 if no numbers were missing. The count of missing numbers before arr[i] is arr[i] - (i+1). Binary search for the first index where missing_count >= k.',
      },
      {
        level: 2,
        content:
          'Binary Search. left=0, right=n. While left<right: mid=(left+right)//2. if arr[mid]-(mid+1)>=k: right=mid else: left=mid+1. After the loop, left is the first index where missing count reaches k. Answer = left + k. (left elements have been "used up" by arr, so the kth missing is at position left+k in the positive integers.)',
      },
    ],
  },

  {
    title: 'Peak Index in a Mountain Array',
    slug: 'peak-index-in-a-mountain-array',
    pattern: 'BINARY_SEARCH',
    difficulty: 'EASY',
    statement:
      'A mountain array increases strictly then decreases strictly. Given a guaranteed mountain array arr, return the index of the peak element in O(log n).\n\nExample: arr=[0,1,0] → 1\nExample: arr=[0,2,1,0] → 1\nExample: arr=[0,10,5,2] → 1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'At the midpoint, compare arr[mid] with arr[mid+1]. If arr[mid] < arr[mid+1], you are on the ascending slope — the peak is to the right. Otherwise you are on or past the peak — it is at mid or to the left.',
      },
      {
        level: 2,
        content:
          'Binary Search. left=0, right=n-1. While left<right: mid=(left+right)//2. if arr[mid]<arr[mid+1]: left=mid+1 else: right=mid. Return left. The condition arr[mid]<arr[mid+1] tells you the slope is still ascending, so peak is strictly to the right. Using right=mid (not mid-1) keeps the peak in range.',
      },
    ],
  },

  {
    title: 'Valid Perfect Square',
    slug: 'valid-perfect-square',
    pattern: 'BINARY_SEARCH',
    difficulty: 'EASY',
    statement:
      'Given a positive integer num, return true if it is a perfect square, false otherwise. Do not use any built-in library function such as sqrt.\n\nExample: num=16 → true\nExample: num=14 → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'You need to check if any integer r in [1, num] satisfies r² = num. The function r² is monotonically increasing — binary search for r and check if r² equals num exactly.',
      },
      {
        level: 2,
        content:
          'Binary Search. left=1, right=num. While left<=right: mid=(left+right)//2. sq=mid*mid. if sq==num: return True. elif sq<num: left=mid+1 else: right=mid-1. Return False. For large inputs, use right=num//2+1 as the initial bound (any perfect square root is ≤ num/2 for num>1) to avoid overflow in some languages.',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Find First and Last Position of Element in Sorted Array',
    slug: 'find-first-and-last-position-in-sorted-array',
    pattern: 'BINARY_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'Given a sorted integer array nums and a target, find the starting and ending position of target. Return [-1,-1] if not present. Must run in O(log n).\n\nExample: nums=[5,7,7,8,8,10], target=8 → [3,4]\nExample: nums=[5,7,7,8,8,10], target=6 → [-1,-1]\nExample: nums=[], target=0 → [-1,-1]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A single binary search finds one occurrence. To find the leftmost and rightmost, run two separate binary searches — one biased left (find first), one biased right (find last). How do you bias a binary search to prefer the leftmost match?',
      },
      {
        level: 2,
        content:
          'Two Binary Searches. findFirst: when nums[mid]==target, set right=mid (keep searching left). findLast: when nums[mid]==target, set left=mid+1 (keep searching right). Both use the standard template otherwise. O(log n) each.',
      },
      {
        level: 3,
        content:
          'def findFirst(t): l,r=0,n-1; res=-1. While l<=r: m=(l+r)//2. if nums[m]==t: res=m; r=m-1. elif nums[m]<t: l=m+1. else: r=m-1. return res. def findLast(t): l,r=0,n-1; res=-1. While l<=r: m=(l+r)//2. if nums[m]==t: res=m; l=m+1. elif nums[m]<t: l=m+1. else: r=m-1. return res. Return [findFirst(target), findLast(target)].',
      },
    ],
  },

  {
    title: 'Find Minimum in Rotated Sorted Array',
    slug: 'find-minimum-in-rotated-sorted-array',
    pattern: 'BINARY_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'A sorted array of unique integers was rotated at an unknown pivot. Given the rotated array, find the minimum element in O(log n).\n\nExample: nums=[3,4,5,1,2] → 1\nExample: nums=[4,5,6,7,0,1,2] → 0\nExample: nums=[11,13,15,17] → 11 (not rotated)',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'The minimum is where the rotation occurred. Compare nums[mid] with nums[right]: if nums[mid] > nums[right], the minimum is in the right half (including right); otherwise it is in the left half (including mid). Which side of the comparison always contains the minimum?',
      },
      {
        level: 2,
        content:
          'Binary Search. left=0, right=n-1. While left<right: mid=(left+right)//2. if nums[mid]>nums[right]: left=mid+1 (minimum must be to the right of mid). else: right=mid (minimum is mid or to its left). Return nums[left]. Using right=mid (not mid-1) ensures the minimum stays in range.',
      },
      {
        level: 3,
        content:
          'left,right=0,n-1. While left<right: mid=(left+right)//2. if nums[mid]>nums[right]: left=mid+1. else: right=mid. Return nums[left]. Intuition: the right half of the rotation always contains the minimum. If nums[mid] > nums[right], the mid is in the larger (left) portion of the rotation, so go right. Otherwise mid is in the smaller portion, so go left (keeping mid as a candidate).',
      },
    ],
  },

  {
    title: 'Search a 2D Matrix',
    slug: 'search-a-2d-matrix',
    pattern: 'BINARY_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'You are given an m×n integer matrix where each row is sorted in ascending order and the first element of each row is greater than the last element of the previous row. Return true if target exists.\n\nExample: matrix=[[1,3,5,7],[10,11,16,20],[23,30,34,60]], target=3 → true\nExample: matrix=[[1,3,5,7],[10,11,16,20],[23,30,34,60]], target=13 → false',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'The whole matrix, read row by row, forms a single sorted list of m*n elements. You can treat it as a 1D sorted array and run standard binary search. How do you convert a 1D index back to (row, col)?',
      },
      {
        level: 2,
        content:
          'Flatten to 1D Binary Search. left=0, right=m*n-1. For index mid: row=mid//n, col=mid%n, value=matrix[row][col]. Standard binary search on this virtual array. O(log(m*n)).',
      },
      {
        level: 3,
        content:
          'left,right=0,m*n-1. While left<=right: mid=(left+right)//2. val=matrix[mid//n][mid%n]. if val==target: return True. elif val<target: left=mid+1. else: right=mid-1. Return False. The key insight is that the problem statement guarantees strict row ordering, making the entire matrix a sorted sequence.',
      },
    ],
  },

  {
    title: 'Koko Eating Bananas',
    slug: 'koko-eating-bananas',
    pattern: 'BINARY_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'Koko has n piles of bananas. piles[i] is the size of pile i. She can eat k bananas per hour; if a pile has fewer than k, she finishes it and waits. Find the minimum eating speed k such that she can eat all piles within h hours.\n\nExample: piles=[3,6,7,11], h=8 → 4\nExample: piles=[30,11,23,4,20], h=5 → 30\nExample: piles=[30,11,23,4,20], h=6 → 23',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'If Koko can finish at speed k, she can finish at any speed > k. If she cannot at speed k, she cannot at any speed < k. This monotone feasibility means binary search on the answer space [1, max(piles)]. What does the feasibility check look like?',
      },
      {
        level: 2,
        content:
          'Binary Search on Answer. canFinish(k): return sum(ceil(p/k) for p in piles) <= h. Binary search for the minimum k in [1, max(piles)]. If canFinish(mid): right=mid (mid is feasible, try smaller). Else: left=mid+1. Return left.',
      },
      {
        level: 3,
        content:
          'import math. left,right=1,max(piles). While left<right: mid=(left+right)//2. hours=sum(math.ceil(p/mid) for p in piles). if hours<=h: right=mid else: left=mid+1. Return left. Using math.ceil(p/mid) or equivalently (p+mid-1)//mid gives the hours for one pile. The search space is [1, max(piles)] because speed > max(piles) never helps.',
      },
    ],
  },

  {
    title: 'Find Peak Element',
    slug: 'find-peak-element',
    pattern: 'BINARY_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'A peak element is strictly greater than its neighbours. Given nums where nums[-1] = nums[n] = -∞, return the index of any peak element. Must run in O(log n).\n\nExample: nums=[1,2,3,1] → 2\nExample: nums=[1,2,1,3,5,6,4] → 1 or 5 (either valid)',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Compare nums[mid] with nums[mid+1]. If nums[mid] < nums[mid+1], the slope is ascending — there must be a peak to the right (the right endpoint is -∞ so it must come back down). Otherwise a peak exists at mid or to its left. Does this guarantee you always find a peak?',
      },
      {
        level: 2,
        content:
          'Binary Search. left=0, right=n-1. While left<right: mid=(left+right)//2. if nums[mid]<nums[mid+1]: left=mid+1 (ascending slope, peak is to the right). else: right=mid (peak is at mid or left). Return left. The problem guarantees at least one peak exists, so the loop always converges.',
      },
      {
        level: 3,
        content:
          'left,right=0,n-1. While left<right: mid=(left+right)//2. if nums[mid]<nums[mid+1]: left=mid+1. else: right=mid. Return left. Proof: when nums[mid]<nums[mid+1], the subarray [mid+1..right] has at least one peak (since nums[right+1]=-∞ forces a descent at the right end). The symmetric argument holds for the else branch.',
      },
    ],
  },

  {
    title: 'Time-Based Key-Value Store',
    slug: 'time-based-key-value-store',
    pattern: 'BINARY_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'Design a time-based key-value store. set(key, value, timestamp) stores the value. get(key, timestamp) returns the most recently set value with timestamp ≤ given timestamp, or "" if none.\n\nExample:\nset("foo","bar",1) → get("foo",1)="bar" → get("foo",3)="bar"\nset("foo","bar2",4) → get("foo",4)="bar2" → get("foo",5)="bar2"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          "Since timestamps are always increasing (as per the problem guarantee), each key's list of (timestamp, value) pairs is already sorted by timestamp. get() needs the largest timestamp ≤ the query — that is a standard binary search for the rightmost valid entry.",
      },
      {
        level: 2,
        content:
          'Hash map of key → list of (timestamp, value). set: append to the list. get: binary search on the list for the rightmost timestamp ≤ query. Return "" if no valid entry exists. O(1) set, O(log n) get where n is the number of entries for that key.',
      },
      {
        level: 3,
        content:
          'self.store=defaultdict(list). set(k,v,t): store[k].append((t,v)). get(k,t): entries=store[k]. l,r=0,len(entries)-1; res="". While l<=r: m=(l+r)//2. if entries[m][0]<=t: res=entries[m][1]; l=m+1 else: r=m-1. return res. The binary search finds the rightmost (timestamp,value) pair where timestamp≤t, updating res each time a valid candidate is found.',
      },
    ],
  },

  {
    title: 'Capacity to Ship Packages Within D Days',
    slug: 'capacity-to-ship-packages-within-d-days',
    pattern: 'BINARY_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'Packages must be shipped in order. weights[i] is the weight of package i. Find the minimum ship capacity to ship all packages within days days.\n\nExample: weights=[1,2,3,4,5,6,7,8,9,10], days=5 → 15\nExample: weights=[3,2,2,4,1,4], days=3 → 6\nExample: weights=[1,2,3,1,1], days=4 → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'If a capacity c works, any larger capacity also works. The minimum feasible capacity is bounded between max(weights) (must fit the heaviest package) and sum(weights) (ship everything in one day). Binary search in this range.',
      },
      {
        level: 2,
        content:
          'Binary Search on Answer. canShip(cap): greedily fill each day — accumulate weights; start a new day when adding the next weight would exceed cap. Count days needed; return days_needed <= days. Binary search for the minimum cap in [max(weights), sum(weights)].',
      },
      {
        level: 3,
        content:
          'def canShip(cap): days_used=1; cur=0. For w in weights: if cur+w>cap: days_used+=1; cur=0. cur+=w. return days_used<=days. left,right=max(weights),sum(weights). While left<right: mid=(left+right)//2. if canShip(mid): right=mid else: left=mid+1. Return left. The lower bound max(weights) is essential — capacity below that cannot accommodate the heaviest package.',
      },
    ],
  },

  {
    title: 'Search in Rotated Sorted Array II',
    slug: 'search-in-rotated-sorted-array-ii',
    pattern: 'BINARY_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'A sorted array (may contain duplicates) was rotated at an unknown pivot. Given the rotated array and a target, return true if target exists.\n\nExample: nums=[2,5,6,0,0,1,2], target=0 → true\nExample: nums=[2,5,6,0,0,1,2], target=3 → false',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'This is like Search in Rotated Sorted Array but with duplicates. The tricky case is when nums[left] == nums[mid] == nums[right] — you cannot determine which half is sorted. What do you do in that case?',
      },
      {
        level: 2,
        content:
          'Modified Binary Search. If nums[left]==nums[mid]==nums[right]: left++; right-- (shrink both sides, skip duplicates). Otherwise use the same logic as the unique-value version: determine which half is sorted, then check if target falls in that half. O(n) worst case with duplicates.',
      },
      {
        level: 3,
        content:
          'left,right=0,n-1. While left<=right: mid=(left+right)//2. if nums[mid]==target: return True. if nums[left]==nums[mid]==nums[right]: left+=1; right-=1. elif nums[left]<=nums[mid]: if nums[left]<=target<nums[mid]: right=mid-1 else: left=mid+1. else: if nums[mid]<target<=nums[right]: left=mid+1 else: right=mid-1. Return False. Duplicates prevent determining which side is sorted, forcing the shrink fallback.',
      },
    ],
  },

  {
    title: 'Minimum Number of Days to Make m Bouquets',
    slug: 'minimum-number-of-days-to-make-m-bouquets',
    pattern: 'BINARY_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'Given bloomDay[i] (day flower i blooms) and integers m and k, you need m bouquets each requiring k adjacent bloomed flowers. Return the minimum number of days, or -1 if impossible.\n\nExample: bloomDay=[1,10,3,10,2], m=3, k=1 → 3\nExample: bloomDay=[1,10,3,10,2], m=3, k=2 → -1\nExample: bloomDay=[7,7,7,7,12,7,7], m=2, k=3 → 12',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'If you can make m bouquets by day d, you can also by any day > d. If you cannot by day d, you cannot by any day < d. Binary search on the answer day in [min(bloomDay), max(bloomDay)]. What does the feasibility check look like?',
      },
      {
        level: 2,
        content:
          'Binary Search on Answer. canMake(d): scan left to right; count consecutive bloomed flowers (bloomDay[i]<=d). Every time you collect k consecutive, form a bouquet. Return bouquets_made >= m. Binary search for minimum d. If m*k > n: return -1 immediately.',
      },
      {
        level: 3,
        content:
          'if m*k>len(bloomDay): return -1. def canMake(d): bouquets=consec=0. For bloom in bloomDay: if bloom<=d: consec+=1 else: consec=0. if consec==k: bouquets+=1; consec=0. return bouquets>=m. left,right=min(bloomDay),max(bloomDay). While left<right: mid=(left+right)//2. if canMake(mid): right=mid else: left=mid+1. Return left.',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Median of Two Sorted Arrays',
    slug: 'median-of-two-sorted-arrays',
    pattern: 'BINARY_SEARCH',
    difficulty: 'HARD',
    statement:
      'Given two sorted arrays nums1 and nums2 of sizes m and n, return the median of the two sorted arrays combined. Must run in O(log(m+n)).\n\nExample: nums1=[1,3], nums2=[2] → 2.0\nExample: nums1=[1,2], nums2=[3,4] → 2.5',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'To find the median, you need to partition both arrays so the left halves together contain exactly (m+n)//2 elements, and every element in any left half ≤ every element in any right half. Binary search on the partition point in the smaller array.',
      },
      {
        level: 2,
        content:
          'Binary Search on partition. Always binary search on the smaller array (say nums1, length m). Partition at i in nums1 and j=(m+n+1)//2 - i in nums2. Valid partition: nums1[i-1]<=nums2[j] AND nums2[j-1]<=nums1[i]. If not, adjust i. Median = max of left halves (odd total) or average of max-left and min-right (even total).',
      },
      {
        level: 3,
        content:
          'Ensure len(nums1)<=len(nums2). half=(m+n+1)//2. left,right=0,m. While left<=right: i=(left+right)//2; j=half-i. l1=nums1[i-1] if i>0 else -inf; r1=nums1[i] if i<m else inf; l2=nums2[j-1] if j>0 else -inf; r2=nums2[j] if j<n else inf. if l1<=r2 and l2<=r1: if (m+n)%2: return max(l1,l2) else: return (max(l1,l2)+min(r1,r2))/2. elif l1>r2: right=i-1 else: left=i+1.',
      },
    ],
  },

  {
    title: 'Split Array Largest Sum',
    slug: 'split-array-largest-sum',
    pattern: 'BINARY_SEARCH',
    difficulty: 'HARD',
    statement:
      'Given integer array nums and integer k, split nums into k non-empty subarrays (in order) to minimise the largest subarray sum. Return that minimum.\n\nExample: nums=[7,2,5,10,8], k=2 → 18\nExample: nums=[1,2,3,4,5], k=2 → 9\nExample: nums=[1,4,4], k=3 → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'The answer is bounded between max(nums) (each element its own subarray, k=n) and sum(nums) (one subarray). For a candidate maximum sum mid, you can greedily check: split whenever adding the next element would exceed mid. Does the number of splits exceed k?',
      },
      {
        level: 2,
        content:
          'Binary Search on Answer. canSplit(mid): greedy count splits. Accumulate nums into current subarray; when it would exceed mid, start a new one. Count total subarrays; return count <= k. Search for minimum mid in [max(nums), sum(nums)] where canSplit returns true.',
      },
      {
        level: 3,
        content:
          'def canSplit(mid): count=1; cur=0. For n in nums: if cur+n>mid: count+=1; cur=0. cur+=n. return count<=k. left,right=max(nums),sum(nums). While left<right: mid=(left+right)//2. if canSplit(mid): right=mid else: left=mid+1. Return left. Note: canSplit is equivalent to "can we partition into at most k groups each with sum ≤ mid" — greedy packing is optimal here.',
      },
    ],
  },

  {
    title: 'Find K-th Smallest Element in a Sorted Matrix',
    slug: 'find-k-th-smallest-element-sorted-matrix',
    pattern: 'BINARY_SEARCH',
    difficulty: 'HARD',
    statement:
      'Given an n×n matrix where each row and column is sorted in ascending order, return the kth smallest element.\n\nExample: matrix=[[1,5,9],[10,11,13],[12,13,15]], k=8 → 13\nExample: matrix=[[-5]], k=1 → -5',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Binary search on the value itself, not an index. The answer lies in [matrix[0][0], matrix[n-1][n-1]]. For a candidate value mid, count how many elements are ≤ mid. If count < k, the answer is larger. If count >= k, the answer is mid or smaller.',
      },
      {
        level: 2,
        content:
          'Binary Search on value. countLessEqual(mid): use the staircase technique — start at top-right corner; go left if value > mid, go down if value <= mid (counting the column). Binary search for the smallest value where countLessEqual >= k.',
      },
      {
        level: 3,
        content:
          'def count(mid): c=0; j=n-1. For i in range(n): while j>=0 and matrix[i][j]>mid: j-=1. c+=j+1. return c. left,right=matrix[0][0],matrix[n-1][n-1]. While left<right: mid=(left+right)//2. if count(mid)>=k: right=mid else: left=mid+1. Return left. The key insight: left always converges to a value that actually exists in the matrix because we use strict binary search bounds.',
      },
    ],
  },

  {
    title: 'Kth Smallest Number in Multiplication Table',
    slug: 'kth-smallest-number-in-multiplication-table',
    pattern: 'BINARY_SEARCH',
    difficulty: 'HARD',
    statement:
      'The multiplication table of size m×n has entry r*c at row r, column c (1-indexed). Return the kth smallest number in the table.\n\nExample: m=3, n=3, k=5 → 3\nExample: m=2, n=3, k=6 → 6',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Binary search on the value. The answer lies in [1, m*n]. For a candidate value x, count how many entries in the table are ≤ x. Row r contributes min(x//r, n) entries ≤ x. Find the smallest x where count >= k.',
      },
      {
        level: 2,
        content:
          'Binary Search on Answer. count(x) = sum(min(x//r, n) for r in 1..m). This counts all entries ≤ x. Binary search for the smallest x in [1, m*n] where count(x) >= k. The answer is guaranteed to exist in the table (the search converges to an actual table value).',
      },
      {
        level: 3,
        content:
          'def count(x): return sum(min(x//r, n) for r in range(1,m+1)). left,right=1,m*n. While left<right: mid=(left+right)//2. if count(mid)>=k: right=mid else: left=mid+1. Return left. O(m log(mn)) total. The count function is monotonically non-decreasing in x, making binary search valid. The answer is always a real table entry because left converges to the smallest valid value.',
      },
    ],
  },

  {
    title: 'Maximum Profit in Job Scheduling',
    slug: 'maximum-profit-in-job-scheduling',
    pattern: 'BINARY_SEARCH',
    difficulty: 'HARD',
    statement:
      'You have n jobs. Job i runs from startTime[i] to endTime[i] and earns profit[i]. Find the maximum profit from non-overlapping jobs.\n\nExample: startTime=[1,2,3,3], endTime=[3,4,5,6], profit=[50,10,40,70] → 120\nExample: startTime=[1,2,3,4,6], endTime=[3,5,10,6,9], profit=[20,20,100,70,60] → 150\nExample: startTime=[1,1,1], endTime=[2,3,4], profit=[5,6,4] → 6',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort jobs by end time. For each job, decide: skip it (take best profit up to previous job) or take it (add its profit to best profit ending before its start). For "best profit ending before start", binary search on end times.',
      },
      {
        level: 2,
        content:
          'DP + Binary Search. Sort by endTime. dp[i] = max profit using first i jobs. For job i: find the latest job j whose endTime <= startTime[i] using binary search. dp[i] = max(dp[i-1], profit[i] + dp[j]). The binary search replaces an O(n) scan per job, giving O(n log n) total.',
      },
      {
        level: 3,
        content:
          'jobs=sorted(zip(endTime,startTime,profit)). dp=[(0,0)]. For end,start,p in jobs: j=bisect_right(dp,(start,float("inf")))-1. best=dp[j][1]+p. if best>dp[-1][1]: dp.append((end,best)). Return dp[-1][1]. Storing (endTime, maxProfit) in dp and using bisect_right to find the latest non-conflicting job gives an elegant O(n log n) solution.',
      },
    ],
  },

  {
    title: 'Minimum Time to Complete Trips',
    slug: 'minimum-time-to-complete-trips',
    pattern: 'BINARY_SEARCH',
    difficulty: 'HARD',
    statement:
      'You have buses where time[i] is how long bus i takes per trip. All buses operate simultaneously. Find the minimum time for them collectively to complete at least totalTrips trips.\n\nExample: time=[1,2,3], totalTrips=5 → 3\nExample: time=[2], totalTrips=1 → 2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'At time t, bus i completes floor(t / time[i]) trips. Total trips at time t = sum of floor(t / time[i]). This function is non-decreasing in t — binary search for the minimum t where total >= totalTrips.',
      },
      {
        level: 2,
        content:
          'Binary Search on Answer. canFinish(t): return sum(t // ti for ti in time) >= totalTrips. Search in [1, min(time) * totalTrips] (worst case: only the fastest bus running alone). When canFinish(mid): right=mid else: left=mid+1.',
      },
      {
        level: 3,
        content:
          'left,right=1,min(time)*totalTrips. While left<right: mid=(left+right)//2. if sum(mid//t for t in time)>=totalTrips: right=mid else: left=mid+1. Return left. The upper bound min(time)*totalTrips is tight: if only the fastest bus ran, it would take exactly that many time units. Any valid answer is ≤ this.',
      },
    ],
  },

  {
    title: 'Find Minimum in Rotated Sorted Array II',
    slug: 'find-minimum-in-rotated-sorted-array-ii',
    pattern: 'BINARY_SEARCH',
    difficulty: 'HARD',
    statement:
      'A sorted array (may contain duplicates) was rotated at an unknown pivot. Find the minimum element. Must run better than O(n) on average.\n\nExample: nums=[1,3,5] → 1\nExample: nums=[2,2,2,0,1] → 0\nExample: nums=[3,3,1,3] → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'This extends Find Minimum in Rotated Sorted Array I to handle duplicates. When nums[mid]==nums[right], you cannot determine which half is sorted. What safe operation shrinks the search space without discarding the minimum?',
      },
      {
        level: 2,
        content:
          'Binary Search with duplicate handling. Same as version I except: when nums[mid]==nums[right]: right-- (safely shrink the right side — we can\'t lose the minimum because it also equals nums[mid] which stays in range). O(n) worst case (all same), O(log n) average.',
      },
      {
        level: 3,
        content:
          'left,right=0,n-1. While left<right: mid=(left+right)//2. if nums[mid]>nums[right]: left=mid+1. elif nums[mid]<nums[right]: right=mid. else: right-=1. Return nums[left]. The else branch handles nums[mid]==nums[right]: decrement right since nums[right] is a duplicate of nums[mid] and the minimum is still in [left, right-1] (or at mid itself, which is still in range).',
      },
    ],
  },

  {
    title: 'Russian Doll Envelopes',
    slug: 'russian-doll-envelopes',
    pattern: 'BINARY_SEARCH',
    difficulty: 'HARD',
    statement:
      'You have envelopes [wi, hi]. Envelope A fits inside envelope B only if A\'s width and height are both strictly less than B\'s. Return the maximum number of envelopes you can nest (Russian doll style).\n\nExample: envelopes=[[5,4],[6,4],[6,7],[2,3]] → 3 ([2,3]⊂[5,4]⊂[6,7])\nExample: envelopes=[[1,1],[1,1],[1,1]] → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort by width ascending. Now the problem reduces to finding the longest increasing subsequence (LIS) on heights. But the tricky part is handling equal widths — envelopes with the same width cannot nest. How do you sort heights to prevent same-width envelopes from forming a valid sequence?',
      },
      {
        level: 2,
        content:
          'Sort by width ascending, then by height descending for equal widths. Now run LIS on heights only. The descending-height trick for equal widths ensures only one envelope per width group can appear in any increasing subsequence. Use binary search (patience sorting) for O(n log n) LIS.',
      },
      {
        level: 3,
        content:
          'Sort envelopes by (w asc, h desc). Extract heights. Run LIS with binary search: maintain tails array. For each h: find first index in tails >= h (bisect_left); replace tails[idx]=h or append. Return len(tails). import bisect. tails=[]. For _,h in envelopes: i=bisect.bisect_left(tails,h). if i==len(tails): tails.append(h) else: tails[i]=h. Return len(tails). The descending-height sort for equal widths is the key insight.',
      },
    ],
  },

  {
    title: 'Minimum Limit of Balls in a Bag',
    slug: 'minimum-limit-of-balls-in-a-bag',
    pattern: 'BINARY_SEARCH',
    difficulty: 'HARD',
    statement:
      'You have bags of balls. nums[i] is the count in bag i. In one operation, split any bag into two bags. After at most maxOperations, minimise the maximum number of balls in any bag.\n\nExample: nums=[9], maxOperations=2 → 3\nExample: nums=[2,4,8,2], maxOperations=4 → 2\nExample: nums=[7,17], maxOperations=2 → 7',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Binary search on the answer: the maximum bag size after operations. For a candidate max size m, how many operations are needed to ensure no bag has more than m balls? ceil(n/m) - 1 splits are needed for a bag of n balls.',
      },
      {
        level: 2,
        content:
          'Binary Search on Answer. ops(m) = sum(ceil(n/m) - 1 for n in nums) = sum((n-1)//m for n in nums). Find the minimum m in [1, max(nums)] where ops(m) <= maxOperations. If ops(mid) <= maxOperations: right=mid else: left=mid+1.',
      },
      {
        level: 3,
        content:
          'left,right=1,max(nums). While left<right: mid=(left+right)//2. ops=sum((n-1)//mid for n in nums). if ops<=maxOperations: right=mid else: left=mid+1. Return left. The formula (n-1)//mid gives the number of splits needed to break a bag of n balls into pieces each of size ≤ mid. For example, 9 balls with limit 3 needs (9-1)//3 = 2 splits.',
      },
    ],
  },

  {
    title: 'Count of Smaller Numbers After Self',
    slug: 'count-of-smaller-numbers-after-self',
    pattern: 'BINARY_SEARCH',
    difficulty: 'HARD',
    statement:
      'Given integer array nums, return an array counts where counts[i] is the number of elements to the right of nums[i] that are smaller than nums[i].\n\nExample: nums=[5,2,6,1] → [2,1,1,0]\nExample: nums=[-1] → [0]\nExample: nums=[-1,-1] → [0,0]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Process elements right to left, maintaining a sorted list of elements seen so far. For each element, binary search in this sorted list to find how many elements are smaller. What does the insertion position tell you about the count of smaller elements?',
      },
      {
        level: 2,
        content:
          'Sort-and-Binary-Search. Maintain a sorted array. Process right to left: bisect_left(sorted_arr, nums[i]) gives the count of elements smaller than nums[i] currently in sorted_arr (all are to the right). Insert nums[i] into sorted_arr maintaining order. O(n log n) with SortedList or O(n²) with plain list insert.',
      },
      {
        level: 3,
        content:
          'from sortedcontainers import SortedList. sl=SortedList(); result=[]. For num in reversed(nums): result.append(sl.bisect_left(num)); sl.add(num). Return result[::-1]. bisect_left gives the number of elements strictly less than num in the current sorted list — all inserted after (i.e., to the right of) the current position. SortedList.add is O(log n).',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 3 — BINARY_SEARCH (28 problems)...\n');

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
