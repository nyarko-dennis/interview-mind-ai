import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 16 — SORT_SEARCH (30 problems: 10 Easy, 10 Medium, 10 Hard)
// Already seeded: Sort Colors 75 (original seed, SORT_SEARCH Medium) — will be skipped
// Avoids overlap with BINARY_SEARCH batch3 (median-of-two-sorted-arrays,
//   russian-doll-envelopes, count-of-smaller-numbers-after-self, etc.)
// Sub-patterns: merge operations, custom comparators, Dutch flag / partition,
//   sorting algorithms, merge-sort counting, bucket sort, quick select
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
    title: 'Merge Sorted Array',
    slug: 'merge-sorted-array',
    pattern: 'SORT_SEARCH',
    difficulty: 'EASY',
    statement:
      'Merge two sorted arrays nums1 (length m) and nums2 (length n) into nums1 in-place. nums1 has m+n total space.\n\nExample: nums1=[1,2,3,0,0,0], m=3, nums2=[2,5,6], n=3 → [1,2,2,3,5,6]\nExample: nums1=[1], m=1, nums2=[], n=0 → [1]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Fill from the end to avoid overwriting. Compare the two largest remaining elements and place the bigger one at the last unfilled position.',
      },
      {
        level: 2,
        content:
          'i=m-1, j=n-1, k=m+n-1. While i>=0 and j>=0: nums1[k--]=max element, decrement its pointer. Copy remaining nums2 if any. O(m+n), O(1).',
      },
    ],
  },

  {
    title: 'Valid Anagram',
    slug: 'valid-anagram',
    pattern: 'SORT_SEARCH',
    difficulty: 'EASY',
    statement:
      'Given two strings s and t, return true if t is an anagram of s (same characters, same frequencies).\n\nExample: s="anagram", t="nagaram" → true\nExample: s="rat", t="car" → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Two strings are anagrams if sorting both gives identical results, or if their character frequency counts are equal.',
      },
      {
        level: 2,
        content:
          'Sort: return sorted(s)==sorted(t). O(n log n). Or count frequencies: count[c]++ for s, count[c]-- for t; all zeros → anagram. O(n).',
      },
    ],
  },

  {
    title: 'Contains Duplicate',
    slug: 'contains-duplicate',
    pattern: 'SORT_SEARCH',
    difficulty: 'EASY',
    statement:
      'Return true if any value appears at least twice in nums.\n\nExample: nums=[1,2,3,1] → true\nExample: nums=[1,2,3,4] → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Sort the array — duplicates become adjacent and easy to detect in a single scan.',
      },
      {
        level: 2,
        content:
          'Sort, then for i from 1..n-1: if nums[i]==nums[i-1]: return True. Return False. O(n log n). Or: return len(set(nums)) < len(nums). O(n).',
      },
    ],
  },

  {
    title: 'Intersection of Two Arrays',
    slug: 'intersection-of-two-arrays',
    pattern: 'SORT_SEARCH',
    difficulty: 'EASY',
    statement:
      'Return an array of the unique intersection of nums1 and nums2 (each element in the result must be unique).\n\nExample: nums1=[1,2,2,1], nums2=[2,2] → [2]\nExample: nums1=[4,9,5], nums2=[9,4,9,8,4] → [9,4]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Sort both arrays, then use two pointers to find common elements in a single pass.',
      },
      {
        level: 2,
        content:
          'Sort both. i=j=0; result=[]. While both in range: if nums1[i]==nums2[j]: add if not dup, advance both. Elif nums1[i]<nums2[j]: i++. Else j++. O(n log n). Or: return list(set(nums1)&set(nums2)). O(n).',
      },
    ],
  },

  {
    title: 'Relative Sort Array',
    slug: 'relative-sort-array',
    pattern: 'SORT_SEARCH',
    difficulty: 'EASY',
    statement:
      'Sort arr1 so items appear in the same relative order as arr2. Items not in arr2 go to the end in ascending order.\n\nExample: arr1=[2,3,1,3,2,4,6,7,9,2,19], arr2=[2,1,4,3,9,6] → [2,2,2,1,4,3,3,9,6,7,19]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Assign each value in arr2 a priority based on its position. Values not in arr2 sort by their actual value, placed after all arr2 values.',
      },
      {
        level: 2,
        content:
          'rank={v:i for i,v in enumerate(arr2)}. Sort arr1 with key: (rank[x],0) if x in rank else (len(arr2),x). O(n log n).',
      },
    ],
  },

  {
    title: 'Sort Array By Parity',
    slug: 'sort-array-by-parity',
    pattern: 'SORT_SEARCH',
    difficulty: 'EASY',
    statement:
      'Move all even integers to the beginning of nums followed by all odd integers. Any valid output order is accepted.\n\nExample: nums=[3,1,2,4] → [2,4,3,1]\nExample: nums=[0] → [0]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use two pointers: one scanning from the left for an odd element, one from the right for an even element. Swap them.',
      },
      {
        level: 2,
        content:
          'left=0, right=n-1. While left<right: while left<right and nums[left]%2==0: left++. While left<right and nums[right]%2==1: right--. swap and advance. O(n), O(1).',
      },
    ],
  },

  {
    title: 'Height Checker',
    slug: 'height-checker',
    pattern: 'SORT_SEARCH',
    difficulty: 'EASY',
    statement:
      'Students are in line with given heights. The expected order is ascending. Return how many students are not in the expected position.\n\nExample: heights=[1,1,4,2,1,3] → 3\nExample: heights=[5,1,2,3,4] → 5\nExample: heights=[1,2,3,4,5] → 0',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Sort the heights to get the expected array, then count positions where the original and sorted arrays differ.',
      },
      {
        level: 2,
        content:
          'expected=sorted(heights). Return sum(1 for h,e in zip(heights,expected) if h!=e). O(n log n).',
      },
    ],
  },

  {
    title: 'Minimum Number of Moves to Seat Everyone',
    slug: 'minimum-number-of-moves-to-seat-everyone',
    pattern: 'SORT_SEARCH',
    difficulty: 'EASY',
    statement:
      'n students and n seats. One move shifts a student by one position. Return the minimum total moves to seat everyone (one student per seat).\n\nExample: seats=[3,1,5], students=[2,7,4] → 4\nExample: seats=[4,1,5,9], students=[1,3,2,6] → 7',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Sort both arrays. Pairing the ith smallest student with the ith smallest seat always minimizes total distance.',
      },
      {
        level: 2,
        content:
          'Sort seats and students. Return sum(abs(s-t) for s,t in zip(sorted(seats),sorted(students))). O(n log n).',
      },
    ],
  },

  {
    title: 'Largest Number At Least Twice of Others',
    slug: 'largest-number-at-least-twice-of-others',
    pattern: 'SORT_SEARCH',
    difficulty: 'EASY',
    statement:
      'Return the index of the maximum element if it is at least twice as large as all other elements. Return -1 otherwise.\n\nExample: nums=[3,6,1,0] → 1\nExample: nums=[1,2,3,4] → -1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Find the maximum and the second maximum in one pass. If max >= 2 * second_max, return the max\'s index.',
      },
      {
        level: 2,
        content:
          'Track max_val, max_idx, second_max in one pass. If max_val>=2*second_max: return max_idx. Else -1. O(n). Or: sort with indices and check.',
      },
    ],
  },

  {
    title: 'Find Target Indices After Sorting Array',
    slug: 'find-target-indices-after-sorting-array',
    pattern: 'SORT_SEARCH',
    difficulty: 'EASY',
    statement:
      'Sort nums in non-decreasing order. Return a sorted list of indices where the element equals target.\n\nExample: nums=[1,2,5,2,3], target=2 → [1,2]\nExample: nums=[1,2,5,2,3], target=3 → [3]\nExample: nums=[1,1,1,1,1], target=1 → [0,1,2,3,4]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Sort the array. The targets will be contiguous. Use binary search to find the first and last occurrence.',
      },
      {
        level: 2,
        content:
          'Sort. left=bisect_left(nums,target); right=bisect_right(nums,target). Return list(range(left,right)). O(n log n). Or: count elements < target (that\'s the start index) and count target occurrences. O(n).',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Sort Colors',
    slug: 'sort-colors',
    pattern: 'SORT_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'Given an array of 0s, 1s, and 2s, sort them in-place in one pass without using a library sort function.\n\nExample: nums=[2,0,2,1,1,0] → [0,0,1,1,2,2]\nExample: nums=[2,0,1] → [0,1,2]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use the Dutch National Flag algorithm with three pointers: low (boundary of 0s), mid (current), high (boundary of 2s).',
      },
      {
        level: 2,
        content:
          'low=mid=0, high=n-1. While mid<=high: if nums[mid]==0: swap(low,mid), low++, mid++. If 1: mid++. If 2: swap(mid,high), high--. O(n), O(1).',
      },
      {
        level: 3,
        content:
          'Invariant: nums[0..low-1]=0, nums[low..mid-1]=1, nums[mid..high]=unsorted, nums[high+1..n-1]=2. When swapping a 2 to high, do not advance mid (the swapped element needs inspection). When swapping a 0 to low, advance both since nums[low] was already a 1.',
      },
    ],
  },

  {
    title: 'Largest Number',
    slug: 'largest-number',
    pattern: 'SORT_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'Given a list of non-negative integers, arrange them to form the largest number. Return the result as a string.\n\nExample: nums=[10,2] → "210"\nExample: nums=[3,30,34,5,9] → "9534330"\nExample: nums=[0,0] → "0"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a custom comparator: prefer number a before b if str(a)+str(b) > str(b)+str(a) lexicographically.',
      },
      {
        level: 2,
        content:
          'from functools import cmp_to_key. cmp = lambda a,b: 1 if a+b>b+a else -1. Sort strs descending. Join. If result starts with "0": return "0". O(n log n).',
      },
      {
        level: 3,
        content:
          'The custom comparison is a valid total ordering (transitive, antisymmetric). Convert nums to strings before comparing. The all-zeros edge case: result after joining is "000..0" — return "0" instead. Python\'s cmp_to_key bridges the comparator API to the key-based sort.',
      },
    ],
  },

  {
    title: 'Sort an Array',
    slug: 'sort-an-array',
    pattern: 'SORT_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'Sort an integer array in ascending order in O(n log n) without using built-in sort functions.\n\nExample: nums=[5,2,3,1] → [1,2,3,5]\nExample: nums=[5,1,1,2,0,0] → [0,0,1,1,2,5]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Implement merge sort (guaranteed O(n log n)) or randomized quick sort (O(n log n) average). Heap sort also works.',
      },
      {
        level: 2,
        content:
          'Merge sort: mergeSort(lo,hi): if lo<hi: mid=(lo+hi)//2; sort left; sort right; merge. O(n log n) time, O(n) extra space. Randomized quick sort avoids O(n²) worst case on sorted input.',
      },
      {
        level: 3,
        content:
          'Merge implementation: use a temp array. Two pointers into the two halves; copy the smaller element each step; append remaining. Bottom-up merge sort avoids recursion: start with subarray size 1, merge adjacent pairs to size 2, then 4, etc. Quick sort: shuffle first (Fisher-Yates), then Lomuto or Hoare partition.',
      },
    ],
  },

  {
    title: 'Pancake Sorting',
    slug: 'pancake-sorting',
    pattern: 'SORT_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'Sort an array using only prefix reversals (a flip reverses arr[0..k-1]). Return a sequence of flip sizes that sorts the array in at most 2n flips.\n\nExample: arr=[3,2,4,1] → [4,2,4,3] (one valid output)\nExample: arr=[1,2,3] → []',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Selection sort approach: find the maximum in the unsorted portion, flip it to position 0, then flip it to its final position. Repeat for decreasing sizes.',
      },
      {
        level: 2,
        content:
          'result=[]. For size from n..2: max_idx=index of max in arr[0..size-1]. If max_idx!=size-1: if max_idx!=0: flip(arr,max_idx+1); result.append(max_idx+1). flip(arr,size); result.append(size). O(n²).',
      },
      {
        level: 3,
        content:
          'Each element needs at most 2 flips: one to bring it to index 0, one to place it at its final position. Skip the first flip if the max is already at index 0. After processing size k, arr[k-1..n-1] is permanently sorted. Total flips ≤ 2(n-1), well within the 2n bound.',
      },
    ],
  },

  {
    title: 'H-Index',
    slug: 'h-index',
    pattern: 'SORT_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'Given citation counts for a researcher\'s papers, return the h-index: the largest h such that h papers have ≥ h citations each.\n\nExample: citations=[3,0,6,1,5] → 3\nExample: citations=[1,3,1] → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort descending. The h-index is the largest i (1-indexed) where citations[i-1] ≥ i.',
      },
      {
        level: 2,
        content:
          'Sort descending. For i from 1..n: if citations[i-1]<i: return i-1. Return n. O(n log n). Bucket sort gives O(n): count[min(c,n)]++ for each c; scan from n down.',
      },
      {
        level: 3,
        content:
          'Bucket sort: count[i] = papers with exactly i citations (cap at n). Scan i from n to 0: cumulative += count[i]; if cumulative >= i: return i. This linear approach avoids sorting by exploiting the fact that h ≤ n.',
      },
    ],
  },

  {
    title: 'Custom Sort String',
    slug: 'custom-sort-string',
    pattern: 'SORT_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'Sort string s so characters present in order appear first in the same relative order as order; characters not in order can appear anywhere at the end.\n\nExample: order="cba", s="abcd" → "cbad"\nExample: order="bcafg", s="abcd" → "bcad"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Assign a priority to each character based on its position in order. Characters absent from order get the lowest priority and sort among themselves.',
      },
      {
        level: 2,
        content:
          'rank={c:i for i,c in enumerate(order)}. Return "".join(sorted(s, key=lambda x: rank.get(x, len(order)))). O(|s| log |s|).',
      },
      {
        level: 3,
        content:
          'Alternative O(|order|+|s|): build result by iterating order and appending each character count[c] times; then append all characters not in order. Count characters of s with a frequency map. This avoids sorting entirely.',
      },
    ],
  },

  {
    title: 'K-diff Pairs in an Array',
    slug: 'k-diff-pairs-in-an-array',
    pattern: 'SORT_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'Return the number of unique k-diff pairs (a, b) in nums where a≤b and b-a=k (using two distinct indices).\n\nExample: nums=[3,1,4,1,5], k=2 → 2 (pairs (1,3),(3,5))\nExample: nums=[1,2,3,4,5], k=1 → 4\nExample: nums=[1,3,1,5,4], k=0 → 1 (pair (1,1))',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort the array. For each unique element a, check if a+k exists (binary search). For k=0, check if the element appears at least twice.',
      },
      {
        level: 2,
        content:
          'Convert to Counter. count=0. For each unique a: if k>0 and (a+k) in counter: count++. If k==0 and counter[a]>1: count++. Return count. O(n).',
      },
      {
        level: 3,
        content:
          'Sorted + two-pointer: left=right=0. While right<n: if right==left or nums[right]-nums[left]<k: right++. Elif nums[right]-nums[left]==k: count++; left++. Else left++. Deduplicate by only counting when left pointer hasn\'t seen this value before. O(n log n).',
      },
    ],
  },

  {
    title: 'Sort the Matrix Diagonally',
    slug: 'sort-the-matrix-diagonally',
    pattern: 'SORT_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'Sort each diagonal of a matrix (from top-left to bottom-right) in ascending order and return the resulting matrix.\n\nExample: mat=[[3,3,1,1],[2,2,1,2],[1,1,1,2]] → [[1,1,1,1],[1,2,2,2],[1,2,3,3]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'All cells (r,c) with the same value of r-c lie on the same diagonal. Group them, sort each group, and write back.',
      },
      {
        level: 2,
        content:
          'diags=defaultdict(list). For (r,c): diags[r-c].append(mat[r][c]). Sort each list descending. For (r,c) from bottom-right to top-left per diagonal: mat[r][c]=diags[r-c].pop(). Return mat. O(mn log(min(m,n))).',
      },
      {
        level: 3,
        content:
          'Sorting each diagonal in descending order and using pop() (takes from the end) naturally fills from top-left to bottom-right in ascending order. Alternatively: sort ascending and fill with pop(0) / use index. The r-c key uniquely identifies each diagonal; there are m+n-1 diagonals total.',
      },
    ],
  },

  {
    title: 'Wiggle Sort',
    slug: 'wiggle-sort',
    pattern: 'SORT_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'Reorder nums in-place so nums[0] ≤ nums[1] ≥ nums[2] ≤ nums[3] ≥ … in a single pass without sorting.\n\nExample: nums=[3,5,2,1,6,4] → [3,5,1,6,2,4] (one valid answer)\nExample: nums=[1] → [1]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Scan left to right. At each index, check if the wiggle condition holds. If not, swap with the neighbor.',
      },
      {
        level: 2,
        content:
          'For i from 1..n-1: if (i is odd and nums[i]<nums[i-1]) or (i is even and nums[i]>nums[i-1]): swap(nums[i], nums[i-1]). O(n), O(1).',
      },
      {
        level: 3,
        content:
          'Correctness: at each step i, swapping only affects the pair (i-1, i). It cannot violate the previously fixed condition at (i-2, i-1) because: when i is odd and we swap to make nums[i]≥nums[i-1], this can only increase nums[i-1], which still satisfies the even condition nums[i-2]≤nums[i-1]. Symmetric for even i.',
      },
    ],
  },

  {
    title: 'Frequency of the Most Frequent Element',
    slug: 'frequency-of-the-most-frequent-element',
    pattern: 'SORT_SEARCH',
    difficulty: 'MEDIUM',
    statement:
      'In at most k increment operations, find the maximum frequency any single value can achieve.\n\nExample: nums=[1,2,4], k=5 → 3 (make all 4: cost 3+2=5)\nExample: nums=[1,4,8,13], k=5 → 2\nExample: nums=[3,9,6], k=2 → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort the array. Use a sliding window where the target value is the rightmost element. The window cost = target*(window_size) - window_sum.',
      },
      {
        level: 2,
        content:
          'Sort. left=0; window_sum=0; ans=0. For right: window_sum+=nums[right]. While nums[right]*(right-left+1)-window_sum>k: window_sum-=nums[left]; left++. ans=max(ans,right-left+1). O(n log n).',
      },
      {
        level: 3,
        content:
          'After sorting, the optimal target is always the window\'s maximum (rightmost element). Cost to equalize [left,right] to nums[right] = nums[right]*size - sum(window). Shrink from the left when cost exceeds k. The sliding window maintains the invariant in amortized O(1) per element.',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Reverse Pairs',
    slug: 'reverse-pairs',
    pattern: 'SORT_SEARCH',
    difficulty: 'HARD',
    statement:
      'Return the number of reverse pairs (i,j) where i<j and nums[i] > 2*nums[j].\n\nExample: nums=[1,3,2,3,1] → 2\nExample: nums=[2,4,3,5,1] → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use modified merge sort. Count pairs where left[i] > 2*right[j] during the merge step, before performing the actual merge.',
      },
      {
        level: 2,
        content:
          'mergeSort counts: for each i in left half, advance j in right half while left[i]>2*right[j]; count+=j-right_start. Then merge the two sorted halves normally. O(n log n).',
      },
      {
        level: 3,
        content:
          'The count step and merge step are separate: first count pairs (left sorted, right sorted → two-pointer scan is O(n)); then merge. The counting pointer never resets across iterations of i — it only moves forward, giving O(n) counting per merge level. Total O(n log n).',
      },
    ],
  },

  {
    title: 'Wiggle Sort II',
    slug: 'wiggle-sort-ii',
    pattern: 'SORT_SEARCH',
    difficulty: 'HARD',
    statement:
      'Reorder nums in-place so nums[0] < nums[1] > nums[2] < nums[3] > … (strict inequalities).\n\nExample: nums=[1,5,1,1,6,4] → [1,6,1,5,1,4]\nExample: nums=[1,3,2,2,3,1] → [2,3,1,3,1,2]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Find the median with Quick Select. Place values smaller than the median at even indices and larger values at odd indices using a virtual index mapping.',
      },
      {
        level: 2,
        content:
          'Find median in O(n) with Quick Select. Virtual index: I(i)=(1+2*i)%(n|1) maps odd indices first, then even. Three-way Dutch flag partition on virtual indices using the median as pivot. O(n), O(1) extra.',
      },
      {
        level: 3,
        content:
          'The virtual index I(i)=(1+2*i)%(n|1) visits odd positions 1,3,5,... then even positions 0,2,4,... When n is odd, (n|1)=n; when even, (n|1)=n+1. After mapping, the three-way partition places: large elements at virtual-low (odd positions), median in the middle, small at virtual-high (even positions). Strict inequalities hold because equal elements are sandwiched between the two halves rather than adjacent to each other.',
      },
    ],
  },

  {
    title: 'Maximum Gap',
    slug: 'maximum-gap',
    pattern: 'SORT_SEARCH',
    difficulty: 'HARD',
    statement:
      'Return the maximum difference between successive elements in the sorted form of an unsorted integer array. Solve in O(n) time and space.\n\nExample: nums=[3,6,9,1] → 3\nExample: nums=[10] → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use bucket sort. By the pigeonhole principle, the maximum gap spans at least one empty bucket when the range is divided into n-1 equal buckets.',
      },
      {
        level: 2,
        content:
          'lo=min, hi=max. bucket_size=max(1, (hi-lo)//(n-1)). n-1 buckets, each tracking min and max. For each num: place in bucket, update min/max. Max gap = max over consecutive non-empty buckets of (bucket[i].min - bucket[i-1].max). O(n).',
      },
      {
        level: 3,
        content:
          'Key insight: if n numbers span [lo, hi] in n-1 buckets, bucket_size=(hi-lo)/(n-1). By pigeonhole, the maximum gap ≥ bucket_size (average gap), and at least one bucket is empty. So the max gap spans an empty bucket — we only track min/max per bucket and check gaps between consecutive non-empty ones. O(n) time and space.',
      },
    ],
  },

  {
    title: 'Find K-th Smallest Pair Distance',
    slug: 'find-k-th-smallest-pair-distance',
    pattern: 'SORT_SEARCH',
    difficulty: 'HARD',
    statement:
      'Return the kth smallest distance among all pairs (nums[i], nums[j]) where i<j.\n\nExample: nums=[1,3,1], k=1 → 0\nExample: nums=[1,6,1], k=3 → 5',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Binary search on the answer (distance d). For a candidate d, count how many pairs have distance ≤ d using a sliding window on the sorted array.',
      },
      {
        level: 2,
        content:
          'Sort nums. lo=0, hi=nums[-1]-nums[0]. Binary search: mid=(lo+hi)//2. countPairs(d): two pointers; count+=right-left as right advances. If count>=k: hi=mid. Else lo=mid+1. Return lo. O(n log W).',
      },
      {
        level: 3,
        content:
          'countPairs(d): left=0, count=0. For right from 0..n-1: while nums[right]-nums[left]>d: left++. count+=right-left. This counts pairs ending at right with distance ≤ d. Binary search converges to the smallest d with at least k such pairs. Sorting is required for the two-pointer approach.',
      },
    ],
  },

  {
    title: 'Best Meeting Point',
    slug: 'best-meeting-point',
    pattern: 'SORT_SEARCH',
    difficulty: 'HARD',
    statement:
      'Given a binary grid where 1 represents a person, find the meeting point minimizing the total Manhattan distance from all people.\n\nExample: grid=[[1,0,0,1],[0,0,0,0],[0,1,0,0],[0,0,0,0]] → 6',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'The optimal meeting point minimizes sum of Manhattan distances. For Manhattan distance, rows and columns are independent — solve each 1D problem separately using the median.',
      },
      {
        level: 2,
        content:
          'Collect all row indices and column indices of 1s. Sort both. Median row = rows[n//2], median col = cols[n//2]. Total = sum |r-med_r| + sum |c-med_c| over all people. O(mn).',
      },
      {
        level: 3,
        content:
          'The 1D sum-of-distances is minimized at the median. In 2D, Manhattan distance separates into independent row and column problems. Rows are naturally sorted as you scan top-to-bottom; columns need sorting. For the median, use the middle element (lower-middle for even count). Two-pointer sum of |r-med| and |c-med| is O(n).',
      },
    ],
  },

  {
    title: 'Number of Pairs Satisfying Inequality',
    slug: 'number-of-pairs-satisfying-inequality',
    pattern: 'SORT_SEARCH',
    difficulty: 'HARD',
    statement:
      'Return the number of pairs (i,j) with i<j such that nums1[i]-nums1[j] ≤ nums2[i]-nums2[j]+diff.\n\nExample: nums1=[3,2,5], nums2=[2,2,1], diff=1 → 3\nExample: nums1=[3,-1], nums2=[-2,2], diff=-1 → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Rearrange: (nums1[i]-nums2[i]) ≤ (nums1[j]-nums2[j]) + diff. Let arr[i]=nums1[i]-nums2[i]. Count pairs (i<j) with arr[i] ≤ arr[j]+diff using merge sort.',
      },
      {
        level: 2,
        content:
          'Transform: arr[i]=nums1[i]-nums2[i]. Modified merge sort on arr: during merge, for each i in left half, count j in right half with arr[j] ≥ arr[i]-diff using a pointer. Then merge normally. O(n log n).',
      },
      {
        level: 3,
        content:
          'During merge sort, both halves are sorted. For each i in the left half, advance pointer j in right half while arr[j]<arr[i]-diff. count+=len(right_half)-j. Then perform the standard merge. The pointer moves monotonically across all i → O(n) per level, O(n log n) total. BIT with coordinate compression is an alternative.',
      },
    ],
  },

  {
    title: 'Find the Kth Smallest Sum of a Matrix With Sorted Rows',
    slug: 'find-the-kth-smallest-sum-of-a-matrix-with-sorted-rows',
    pattern: 'SORT_SEARCH',
    difficulty: 'HARD',
    statement:
      'Each row of matrix is sorted ascending. Choose one element per row to form an array; its sum is the array sum. Return the kth smallest such sum.\n\nExample: mat=[[1,3,11],[2,4,6]], k=5 → 7\nExample: mat=[[1,3,11],[2,4,6]], k=9 → 17',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Merge rows one by one. After merging two rows, keep only the k smallest combined sums before moving to the next row.',
      },
      {
        level: 2,
        content:
          'Start with sorted(row[0][:k]). For each subsequent row: combine all current sums with row elements, take k smallest using nsmallest or a heap. Repeat until all rows processed. Return sums[k-1]. O(m * k log k).',
      },
      {
        level: 3,
        content:
          'For each merge step, form a virtual sorted matrix where entry (i,j) = prev_sums[i] + row[j]. The kth smallest in this matrix (similar to LeetCode 378) can be found with a min-heap in O(k log k). After m-1 merges, the answer is at index k-1 of the final sums array.',
      },
    ],
  },

  {
    title: 'Sliding Window Median',
    slug: 'sliding-window-median',
    pattern: 'SORT_SEARCH',
    difficulty: 'HARD',
    statement:
      'Return the median of each sliding window of size k as it moves across nums.\n\nExample: nums=[1,3,-1,-3,5,3,6,7], k=3 → [1.0,-1.0,-1.0,3.0,5.0,6.0]\nExample: nums=[1,2,3,4,2,3,6,7,3,8], k=2 → [1.5,2.5,3.5,3.0,2.5,4.5,6.5,5.0,5.5]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Maintain two heaps (max-heap for the lower half, min-heap for the upper half) with lazy deletion for outgoing elements.',
      },
      {
        level: 2,
        content:
          'Max-heap lo (lower half) + min-heap hi (upper half). For each new element: add to appropriate heap; rebalance so |lo|=|hi|±1. Lazy deletion: track "dead" elements; skip them when popping. Median = hi[0] if k odd, average otherwise. O(n log k).',
      },
      {
        level: 3,
        content:
          'Lazy deletion: maintain a "dead" counter per value. On removal, increment counter instead of removing. When popping, skip elements with dead count > 0. Rebalancing after each add/remove maintains the size invariant. A SortedList (Python sortedcontainers) is a cleaner O(n log k) alternative with O(1) median via index.',
      },
    ],
  },

  {
    title: 'Create Sorted Array through Instructions',
    slug: 'create-sorted-array-through-instructions',
    pattern: 'SORT_SEARCH',
    difficulty: 'HARD',
    statement:
      'Build an array by inserting elements one at a time. The cost of inserting x is min(count of elements < x, count of elements > x) currently in the array. Return total cost mod 10^9+7.\n\nExample: instructions=[1,5,6,4,1,4,3,4,7] → 1\nExample: instructions=[1,2,3,6,5,4] → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each insertion of x, you need the count of current elements that are strictly less than x and strictly greater than x. A Fenwick tree (BIT) answers these prefix count queries in O(log n).',
      },
      {
        level: 2,
        content:
          'BIT of size max_val. For each x: less=query(x-1); greater=n_inserted-query(x). cost+=min(less,greater); update(x,+1). Return cost % MOD. O(n log max_val). Coordinate-compress if values are large.',
      },
      {
        level: 3,
        content:
          'query(i) returns the count of elements ≤ i inserted so far. less=query(x-1), equal=query(x)-query(x-1), greater=n_inserted-query(x). Cost = min(less, greater) — equal elements contribute 0 to both sides. Merge sort is an alternative O(n log n) approach using the same inversion-counting technique.',
      },
    ],
  },

  {
    title: 'Sort Items by Groups Respecting Dependencies',
    slug: 'sort-items-by-groups-respecting-dependencies',
    pattern: 'SORT_SEARCH',
    difficulty: 'HARD',
    statement:
      'n items belong to m groups (group[i]=-1 means ungrouped). Return a sorted order respecting all dependencies (beforeItems[i] must come before item i) while keeping group members contiguous. Return [] if impossible.\n\nExample: n=8, m=2, group=[-1,-1,1,0,0,1,0,-1], beforeItems=[[],[6],[5],[6],[3,6],[],[],[]] → [6,3,4,1,5,2,0,7]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Perform two topological sorts: one on items (respecting item-level dependencies), one on groups (respecting inter-group dependencies). Assign each ungrouped item its own unique group.',
      },
      {
        level: 2,
        content:
          'Give singleton groups unique IDs. Build item graph (direct beforeItems edges) and group graph (edge from group(u) to group(v) for each cross-group dependency). Topo sort both. If any cycle: return []. Order groups by group-topo-order, items within each group by item-topo-order. O(n+m+E).',
      },
      {
        level: 3,
        content:
          'Step 1: remap group[i]=-1 to m, m+1, ... to give each singleton a unique group. Step 2: build both graphs (item DAG and group DAG). Step 3: topological sort each with Kahn\'s algorithm — detect cycles via remaining in-degree. Step 4: group items by their group, order groups by group topo order, order items within each group by item topo order. Concatenate.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 16 — SORT_SEARCH (30 problems)...\n');

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
