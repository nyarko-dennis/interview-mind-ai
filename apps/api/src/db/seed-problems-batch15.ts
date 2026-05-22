import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 15 — PREFIX_SUMS (30 problems: 10 Easy, 10 Medium, 10 Hard)
// Already seeded: Range Sum Query - Immutable 303 (original seed) — will be skipped
// Sub-patterns covered: 1D prefix sums, prefix sum + hashmap, difference arrays,
//   2D prefix sums, and advanced applications (merge sort + prefix, monotonic deque + prefix)
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
    title: 'Range Sum Query - Immutable',
    slug: 'range-sum-query-immutable',
    pattern: 'PREFIX_SUMS',
    difficulty: 'EASY',
    statement:
      'Given an integer array nums, handle multiple queries sumRange(left, right) that return the sum of elements between indices left and right (inclusive). Process queries in O(1) after O(n) preprocessing.\n\nExample: nums=[-2,0,3,-5,2,-1]; sumRange(0,2)→1; sumRange(2,5)→-1; sumRange(0,5)→-3',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Precompute a prefix sum array where prefix[i] = sum of nums[0..i-1]. Any range sum is prefix[right+1] - prefix[left].',
      },
      {
        level: 2,
        content:
          'Build prefix[0..n] where prefix[0]=0 and prefix[i]=prefix[i-1]+nums[i-1]. sumRange(l,r)=prefix[r+1]-prefix[l]. O(n) build, O(1) query.',
      },
    ],
  },

  {
    title: 'Running Sum of 1d Array',
    slug: 'running-sum-of-1d-array',
    pattern: 'PREFIX_SUMS',
    difficulty: 'EASY',
    statement:
      'Given an array nums, return the running sum where runningSum[i] = sum(nums[0..i]).\n\nExample: nums=[1,1,1,1,1] → [1,2,3,4,5]\nExample: nums=[1,2,3,4] → [1,3,6,10]\nExample: nums=[3,1,2,10,1] → [3,4,6,16,17]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Each running sum is the previous running sum plus the current element.',
      },
      {
        level: 2,
        content:
          'For i from 1..n-1: nums[i]+=nums[i-1]. Return nums. O(n), O(1) extra space (in-place modification).',
      },
    ],
  },

  {
    title: 'Find Pivot Index',
    slug: 'find-pivot-index',
    pattern: 'PREFIX_SUMS',
    difficulty: 'EASY',
    statement:
      'Find the leftmost index where the sum of all elements to the left equals the sum of all elements to the right. Return -1 if no such index exists.\n\nExample: nums=[1,7,3,6,5,6] → 3\nExample: nums=[1,2,3] → -1\nExample: nums=[2,1,-1] → 0',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Precompute the total sum. At index i, left_sum = prefix up to i-1, and right_sum = total - left_sum - nums[i]. Check if they match.',
      },
      {
        level: 2,
        content:
          'total=sum(nums); left=0. For i,v in enumerate(nums): if left==total-left-v: return i. left+=v. Return -1. O(n), O(1).',
      },
    ],
  },

  {
    title: 'Find the Highest Altitude',
    slug: 'find-the-highest-altitude',
    pattern: 'PREFIX_SUMS',
    difficulty: 'EASY',
    statement:
      'A biker starts at altitude 0. gain[i] is the altitude difference between points i and i+1. Return the highest altitude reached.\n\nExample: gain=[-5,1,5,0,-7] → 1\nExample: gain=[-4,-3,-2,-1,4,3,2] → 0',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'The altitude at each point is a prefix sum of the gain array. Track the maximum prefix sum, starting from 0.',
      },
      {
        level: 2,
        content:
          'curr=0; max_alt=0. For g in gain: curr+=g; max_alt=max(max_alt,curr). Return max_alt. O(n), O(1).',
      },
    ],
  },

  {
    title: 'Minimum Value to Get Positive Step by Step Sum',
    slug: 'minimum-value-to-get-positive-step-by-step-sum',
    pattern: 'PREFIX_SUMS',
    difficulty: 'EASY',
    statement:
      'Find the minimum positive startValue such that the step-by-step sum (startValue + prefix of nums) is always ≥ 1.\n\nExample: nums=[-3,2,-3,4,2] → 5\nExample: nums=[1,2] → 1\nExample: nums=[1,-2,-3] → 5',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'The constraint is startValue + min_prefix_sum ≥ 1. Find the minimum prefix sum; startValue = max(1, 1 - min_prefix_sum).',
      },
      {
        level: 2,
        content:
          'curr=0; min_prefix=0. For x in nums: curr+=x; min_prefix=min(min_prefix,curr). Return max(1, 1-min_prefix). O(n), O(1).',
      },
    ],
  },

  {
    title: 'Left and Right Sum Differences',
    slug: 'left-and-right-sum-differences',
    pattern: 'PREFIX_SUMS',
    difficulty: 'EASY',
    statement:
      'Return answer[i] = |leftSum[i] - rightSum[i]| where leftSum[i] is the sum of elements to the left of i and rightSum[i] is the sum to the right.\n\nExample: nums=[10,4,8,3] → [15,1,11,22]\nExample: nums=[1] → [0]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Precompute prefix sums and suffix sums. leftSum[i] = prefix[i] (sum of elements before i); rightSum[i] = total - prefix[i] - nums[i].',
      },
      {
        level: 2,
        content:
          'total=sum(nums); left=0; ans=[]. For i,v in enumerate(nums): right=total-left-v; ans.append(abs(left-right)); left+=v. Return ans. O(n), O(1) extra.',
      },
    ],
  },

  {
    title: 'Maximum Score After Splitting a String',
    slug: 'maximum-score-after-splitting-a-string',
    pattern: 'PREFIX_SUMS',
    difficulty: 'EASY',
    statement:
      'Split binary string s into two non-empty parts. Score = number of \'0\'s in left part + number of \'1\'s in right part. Return the maximum score.\n\nExample: s="011101" → 5\nExample: s="00111" → 5\nExample: s="1111" → 3',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Precompute total \'1\'s. For each split point, track zeros in the left part; ones in the right = total_ones - ones_seen_left.',
      },
      {
        level: 2,
        content:
          'ones=s.count(\'1\'); best=0; zeros=0. For i in 0..n-2: zeros+=(s[i]==\'0\'); ones-=(s[i]==\'1\'); best=max(best,zeros+ones). Return best. O(n), O(1).',
      },
    ],
  },

  {
    title: 'Sum of All Odd Length Subarrays',
    slug: 'sum-of-all-odd-length-subarrays',
    pattern: 'PREFIX_SUMS',
    difficulty: 'EASY',
    statement:
      'Return the sum of all possible odd-length contiguous subarrays.\n\nExample: arr=[1,4,2,5,3] → 58\nExample: arr=[1,2] → 3\nExample: arr=[10,11,12] → 66',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Build a prefix sum array. For each start index and each odd length, add the subarray sum in O(1). Or compute each element\'s contribution directly.',
      },
      {
        level: 2,
        content:
          'Each arr[i] appears in subarrays: left_choices = i//2+1, right_choices = (n-i-1)//2+1 (for each parity). contribution = arr[i]*left_choices*right_choices. Sum all contributions. O(n), O(1). Or O(n²): prefix sum + loop over start/odd-length pairs.',
      },
    ],
  },

  {
    title: 'Find the Pivot Integer',
    slug: 'find-the-pivot-integer',
    pattern: 'PREFIX_SUMS',
    difficulty: 'EASY',
    statement:
      'Find a pivot integer x such that sum(1..x) = sum(x..n). Return x, or -1 if none.\n\nExample: n=8 → 6 (1+2+3+4+5+6 = 6+7+8 = 21)\nExample: n=1 → 1\nExample: n=4 → -1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'sum(1..x) = x*(x+1)/2. Setting sum(1..x) = sum(x..n) leads to 2x² = n*(n+1). Check if n*(n+1)/2 is a perfect square.',
      },
      {
        level: 2,
        content:
          'target=n*(n+1)//2. x=int(target**0.5). Return x if x*x==target else -1. O(1). The equation simplifies to x=√(n*(n+1)/2).',
      },
    ],
  },

  {
    title: 'Longest Subsequence With Limited Sum',
    slug: 'longest-subsequence-with-limited-sum',
    pattern: 'PREFIX_SUMS',
    difficulty: 'EASY',
    statement:
      'Given array nums and queries, for each query[i] return the maximum length subsequence of nums whose sum ≤ query[i].\n\nExample: nums=[4,5,2,1], queries=[3,10,21] → [2,3,4]\nExample: nums=[2,3,4,5], queries=[1] → [0]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'To maximize length within a budget, greedily pick the smallest elements. Sort nums, build prefix sums, then binary search for each query.',
      },
      {
        level: 2,
        content:
          'Sort nums. prefix=[0]+cumsum(nums). For each query q: ans=bisect_right(prefix,q)-1 (number of prefix sums ≤ q, minus the zero sentinel). O((n+q) log n).',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Subarray Sum Equals K',
    slug: 'subarray-sum-equals-k',
    pattern: 'PREFIX_SUMS',
    difficulty: 'MEDIUM',
    statement:
      'Return the total number of contiguous subarrays whose sum equals k.\n\nExample: nums=[1,1,1], k=2 → 2\nExample: nums=[1,2,3], k=3 → 2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each ending index j, you need prefix[j] - prefix[i] = k, i.e., prefix[i] = prefix[j] - k. Count previously seen prefix sums with a hash map.',
      },
      {
        level: 2,
        content:
          'seen={0:1}; curr=0; count=0. For x in nums: curr+=x; count+=seen.get(curr-k,0); seen[curr]=seen.get(curr,0)+1. Return count. O(n).',
      },
      {
        level: 3,
        content:
          'The key equation: prefix[j]-prefix[i]=k means subarray (i,j] sums to k. Initializing seen={0:1} handles subarrays starting at index 0 (prefix[i]=0 before any element). Only one pass needed since we process j left to right and look up already-seen prefix[i] values.',
      },
    ],
  },

  {
    title: 'Continuous Subarray Sum',
    slug: 'continuous-subarray-sum',
    pattern: 'PREFIX_SUMS',
    difficulty: 'MEDIUM',
    statement:
      'Return true if there exists a subarray of length ≥ 2 whose sum is a multiple of k.\n\nExample: nums=[23,2,4,6,7], k=6 → true\nExample: nums=[23,2,6,4,7], k=6 → true\nExample: nums=[23,2,6,4,7], k=13 → false',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'If prefix[j] ≡ prefix[i] (mod k), then sum(i+1..j) is a multiple of k. Store the FIRST occurrence of each prefix mod, then check for a gap of ≥ 2.',
      },
      {
        level: 2,
        content:
          'seen={0:-1}; curr=0. For i,x in enumerate(nums): curr=(curr+x)%k. If curr in seen: if i-seen[curr]>=2: return True. Else if curr not in seen: seen[curr]=i. Return False. O(n).',
      },
      {
        level: 3,
        content:
          'Store only the FIRST occurrence (do not overwrite) so the gap i-seen[curr] is maximized. seen={0:-1} handles the case where the entire prefix is a multiple of k (gap = i-(-1) = i+1 ≥ 2 when i ≥ 1). The condition ≥2 enforces the minimum subarray length of 2.',
      },
    ],
  },

  {
    title: 'Subarray Sums Divisible by K',
    slug: 'subarray-sums-divisible-by-k',
    pattern: 'PREFIX_SUMS',
    difficulty: 'MEDIUM',
    statement:
      'Return the number of non-empty subarrays with a sum divisible by k.\n\nExample: nums=[4,5,0,-2,-3,1], k=5 → 7\nExample: nums=[5], k=9 → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Two subarrays (i,j) share the same prefix sum mod k iff their sum is divisible by k. Count pairs of equal remainders.',
      },
      {
        level: 2,
        content:
          'seen={0:1}; curr=0; count=0. For x in nums: curr=(curr+x)%k; if curr<0: curr+=k; count+=seen.get(curr,0); seen[curr]=seen.get(curr,0)+1. Return count. O(n).',
      },
      {
        level: 3,
        content:
          'For each new remainder r, all c previous occurrences pair with the current position to form valid subarrays. Normalize negative remainders: Python\'s % handles this, but adding k when curr<0 is explicit and portable. Initialize seen={0:1} for subarrays starting at index 0.',
      },
    ],
  },

  {
    title: 'Contiguous Array',
    slug: 'contiguous-array',
    pattern: 'PREFIX_SUMS',
    difficulty: 'MEDIUM',
    statement:
      'Find the maximum length contiguous subarray with equal numbers of 0s and 1s.\n\nExample: nums=[0,1] → 2\nExample: nums=[0,1,0] → 2\nExample: nums=[0,0,1,1,0,0,1,1] → 8',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Replace each 0 with -1. The problem becomes: find the longest subarray with sum 0 — a prefix sum hash map with FIRST occurrences solves it.',
      },
      {
        level: 2,
        content:
          'seen={0:-1}; curr=0; best=0. For i,x in enumerate(nums): curr+=1 if x else -1. If curr in seen: best=max(best,i-seen[curr]). Else seen[curr]=i. Return best. O(n).',
      },
      {
        level: 3,
        content:
          'Replace 0→-1 so equal counts give sum=0. Store the FIRST occurrence of each prefix sum to maximize length. Initializing seen={0:-1} means a sum-0 subarray starting from index 0 has length i-(-1)=i+1. Only update seen when the key is absent.',
      },
    ],
  },

  {
    title: 'Range Sum Query 2D - Immutable',
    slug: 'range-sum-query-2d-immutable',
    pattern: 'PREFIX_SUMS',
    difficulty: 'MEDIUM',
    statement:
      'Given a 2D matrix, efficiently answer sumRegion(r1,c1,r2,c2) queries that return the sum of all elements within the rectangle.\n\nExample: sumRegion(2,1,4,3)→8; sumRegion(1,1,2,2)→11; sumRegion(1,2,2,4)→12',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Precompute a 2D prefix sum table. Any rectangle sum reduces to an inclusion-exclusion formula over four prefix values.',
      },
      {
        level: 2,
        content:
          'prefix[i][j] = matrix[i-1][j-1]+prefix[i-1][j]+prefix[i][j-1]-prefix[i-1][j-1] (1-indexed). Query(r1,c1,r2,c2) = prefix[r2+1][c2+1]-prefix[r1][c2+1]-prefix[r2+1][c1]+prefix[r1][c1]. O(mn) build, O(1) query.',
      },
      {
        level: 3,
        content:
          'The (m+1)×(n+1) prefix table (padded with zeros) eliminates boundary checks. The query formula is inclusion-exclusion: full rectangle − top strip − left strip + double-subtracted top-left corner. Memorize: add bottom-right, subtract the two sides, add back the top-left.',
      },
    ],
  },

  {
    title: 'Product of Array Except Self',
    slug: 'product-of-array-except-self',
    pattern: 'PREFIX_SUMS',
    difficulty: 'MEDIUM',
    statement:
      'Return an array where answer[i] is the product of all elements except nums[i]. Solve in O(n) without division.\n\nExample: nums=[1,2,3,4] → [24,12,8,6]\nExample: nums=[-1,1,0,-3,3] → [0,0,9,0,0]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Build a prefix product (products to the left of each index) and a suffix product (products to the right). Multiply them pointwise.',
      },
      {
        level: 2,
        content:
          'Pass 1 (left to right): ans[i] = product of nums[0..i-1]. Pass 2 (right to left): multiply ans[i] by running right product. O(n) time, O(1) extra space (beyond output).',
      },
      {
        level: 3,
        content:
          'Pass 1: ans[0]=1; for i from 1..n-1: ans[i]=ans[i-1]*nums[i-1]. Pass 2: right=1; for i from n-1..0: ans[i]*=right; right*=nums[i]. The two-pass approach avoids the O(n) space of explicit prefix/suffix arrays.',
      },
    ],
  },

  {
    title: 'Count Number of Nice Subarrays',
    slug: 'count-number-of-nice-subarrays',
    pattern: 'PREFIX_SUMS',
    difficulty: 'MEDIUM',
    statement:
      'Return the number of contiguous subarrays with exactly k odd numbers.\n\nExample: nums=[1,1,2,1,1], k=3 → 2\nExample: nums=[2,4,6], k=1 → 0\nExample: nums=[2,2,2,1,2,2,1,2,2,2], k=2 → 16',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Replace each number with 1 (if odd) or 0 (if even). Count subarrays with sum exactly k — this is Subarray Sum Equals K on the transformed array.',
      },
      {
        level: 2,
        content:
          'seen={0:1}; curr=0; count=0. For x in nums: curr+=(x%2). count+=seen.get(curr-k,0). seen[curr]=seen.get(curr,0)+1. Return count. O(n).',
      },
      {
        level: 3,
        content:
          'Direct application of the prefix-sum + hashmap pattern. Alternative: atMost(k) - atMost(k-1) where atMost(x) uses a two-pointer sliding window counting subarrays with ≤x odd numbers. Both approaches are O(n).',
      },
    ],
  },

  {
    title: 'Car Pooling',
    slug: 'car-pooling',
    pattern: 'PREFIX_SUMS',
    difficulty: 'MEDIUM',
    statement:
      'A car has capacity seats. trips[i]=[numPassengers, from, to]. Passengers board at from and leave at to (exclusive). Return true if all trips can be completed without exceeding capacity.\n\nExample: trips=[[2,1,5],[3,3,7]], capacity=4 → false\nExample: trips=[[2,1,5],[3,5,7]], capacity=3 → true',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a difference array indexed by stop number. Add passengers at "from" and remove at "to". Take the prefix sum and check if any point exceeds capacity.',
      },
      {
        level: 2,
        content:
          'diff=[0]*1001. For (n,f,t) in trips: diff[f]+=n; diff[t]-=n. curr=0. For d in diff: curr+=d; if curr>capacity: return False. Return True. O(n + max_stop).',
      },
      {
        level: 3,
        content:
          'The difference array encodes events: +n passengers arrive at stop f, -n depart at stop t. The prefix sum of the difference array gives the current passenger count at each stop. Size 1001 covers the full stop range. This is the core difference-array / event-based prefix sum pattern.',
      },
    ],
  },

  {
    title: 'Range Addition',
    slug: 'range-addition',
    pattern: 'PREFIX_SUMS',
    difficulty: 'MEDIUM',
    statement:
      'Start with an array of n zeros. Apply updates [start, end, inc] that add inc to all elements from index start to end (inclusive). Return the final array.\n\nExample: n=5, updates=[[1,3,2],[2,4,3],[0,2,-2]] → [-2,0,3,5,3]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a difference array. For each update, add inc at start and subtract inc at end+1. A single prefix sum sweep produces the final values.',
      },
      {
        level: 2,
        content:
          'diff=[0]*(n+1). For (s,e,v) in updates: diff[s]+=v; diff[e+1]-=v. result[i]=sum(diff[0..i]) for each i. Return result[:n]. O(n + updates).',
      },
      {
        level: 3,
        content:
          'The difference array is the dual of prefix sums: prefix sums convert point values to range queries; difference arrays convert range updates to point values via one prefix sweep. O(1) per update, O(n) final reconstruction — far better than O(range) per update naively.',
      },
    ],
  },

  {
    title: 'Corporate Flight Bookings',
    slug: 'corporate-flight-bookings',
    pattern: 'PREFIX_SUMS',
    difficulty: 'MEDIUM',
    statement:
      'n flights numbered 1..n. bookings[i]=[first, last, seats] reserves seats on flights first through last (inclusive). Return total reserved seats per flight.\n\nExample: n=5, bookings=[[1,2,10],[2,3,20],[2,5,25]] → [10,55,45,25,25]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a difference array on flights 1..n. For each booking, add seats at first and subtract at last+1. A prefix sum sweep gives the total per flight.',
      },
      {
        level: 2,
        content:
          'diff=[0]*(n+2). For (f,l,s) in bookings: diff[f]+=s; diff[l+1]-=s. result[i]=prefix_sum(diff)[i] for i in 1..n. Return result. O(n + bookings).',
      },
      {
        level: 3,
        content:
          'Identical pattern to Range Addition and Car Pooling — the difference array technique. Each booking is an O(1) range update; the final prefix sum is O(n). The +2 size of diff avoids out-of-bounds when last=n and we write diff[n+1].',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Count of Range Sum',
    slug: 'count-of-range-sum',
    pattern: 'PREFIX_SUMS',
    difficulty: 'HARD',
    statement:
      'Given integer array nums and bounds [lower, upper], return the number of range sums S(i,j) = sum(nums[i..j]) that lie in [lower, upper].\n\nExample: nums=[-2,5,-1], lower=-2, upper=2 → 3\nExample: nums=[0], lower=0, upper=0 → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'S(i,j) = prefix[j+1] - prefix[i]. Count pairs (i,j) where lower ≤ prefix[j+1]-prefix[i] ≤ upper. Use modified merge sort on the prefix array to count valid pairs during merging.',
      },
      {
        level: 2,
        content:
          'Merge sort on prefix[0..n]: during merge, for each prefix[j] in right half, count prefix[i] in left half satisfying prefix[j]-upper ≤ prefix[i] ≤ prefix[j]-lower using two pointers lo, hi. O(n log n).',
      },
      {
        level: 3,
        content:
          'Both halves are sorted during merge sort. For each j (right half), lo advances while prefix[lo]<prefix[j]-upper; hi advances while prefix[hi]<=prefix[j]-lower. count+=hi-lo. Both pointers move monotonically across all j in the right half → O(n) per merge level, O(n log n) total.',
      },
    ],
  },

  {
    title: 'Max Sum of Rectangle No Larger Than K',
    slug: 'max-sum-of-rectangle-no-larger-than-k',
    pattern: 'PREFIX_SUMS',
    difficulty: 'HARD',
    statement:
      'Given a matrix and integer k, find the maximum sum of a rectangle in the matrix such that the sum is no larger than k.\n\nExample: matrix=[[1,0,1],[0,-2,3]], k=2 → 2\nExample: matrix=[[2,2,-1]], k=3 → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Fix the left and right column bounds. Reduce each column range to a 1D row sum, then find the maximum subarray sum ≤ k using a sorted set of prefix sums.',
      },
      {
        level: 2,
        content:
          'For each column pair (l,r): build row sums. Maintain a sorted set of prefix sums. For each curr prefix: find the smallest val ≥ curr-k (bisect_left); answer = curr-val if found. Insert curr. O(m²n log m).',
      },
      {
        level: 3,
        content:
          'The 1D subproblem: maximize prefix[j]-prefix[i] ≤ k, i.e., maximize prefix[j]-k ≤ prefix[i]. A sorted set with bisect_left gives the smallest prefix[i] ≥ prefix[j]-k in O(log n). Initialize the set with {0}. Reset per column pair. If m<n, iterate over the shorter dimension as the outer loop.',
      },
    ],
  },

  {
    title: 'Number of Submatrices That Sum to Target',
    slug: 'number-of-submatrices-that-sum-to-target',
    pattern: 'PREFIX_SUMS',
    difficulty: 'HARD',
    statement:
      'Return the number of non-empty submatrices whose elements sum to target.\n\nExample: matrix=[[0,1,0],[1,1,1],[0,1,0]], target=0 → 4\nExample: matrix=[[1,-1],[-1,1]], target=0 → 5',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Fix the top and bottom row boundaries. Compress each column into a 1D column sum array, then apply "Subarray Sum Equals K" on that array.',
      },
      {
        level: 2,
        content:
          'Precompute row-wise prefix sums for O(1) column sum computation. For each row pair (r1,r2): colSum[j]=prefix[r2][j+1]-prefix[r2][j+1]−... Apply hashmap count on colSum. O(m²n).',
      },
      {
        level: 3,
        content:
          'For row pair (r1,r2), colSum[j] = sum of column j from row r1 to r2. With row prefix sums precomputed as prefix[i][j] = sum of row i columns 0..j-1, colSum[j] = sum over rows r1..r2 of (prefix[r][j+1]-prefix[r][j]). Then run the standard prefix-sum + hashmap 1D algorithm on colSum. Total O(m²n) — same asymptotic as 1D reduction from both dimensions.',
      },
    ],
  },

  {
    title: 'Maximum Sum of 3 Non-Overlapping Subarrays',
    slug: 'maximum-sum-of-3-non-overlapping-subarrays',
    pattern: 'PREFIX_SUMS',
    difficulty: 'HARD',
    statement:
      'Find three non-overlapping subarrays of length k with the maximum total sum. Return their starting indices (lexicographically smallest if tie).\n\nExample: nums=[1,2,1,2,6,7,5,1], k=2 → [0,3,5]\nExample: nums=[1,2,1,2,1,2,1,2,1], k=2 → [0,2,4]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Precompute sliding window sums. Build a "best left" array (optimal window starting at or before each position) and a "best right" array (optimal window starting at or after). Sweep the middle window.',
      },
      {
        level: 2,
        content:
          'w[i]=window sum starting at i. left[i]=index of max w in [0,i] (leftmost on tie). right[i]=index of max w in [i,n-k] (leftmost on tie). For each middle i in [k, n-2k]: candidate=(left[i-k], i, right[i+k]). Track max total. O(n).',
      },
      {
        level: 3,
        content:
          'left: scan left→right, update left[i]=i if w[i]>w[left[i-1]] (strict > preserves leftmost). right: scan right→left, update right[i]=i if w[i]>=w[right[i+1]] (>= gives leftmost when equal). The middle position i must not overlap: left boundary ≤ i-k and right boundary ≥ i+k. Compare sum w[left[i-k]]+w[i]+w[right[i+k]].',
      },
    ],
  },

  {
    title: 'Shortest Subarray with Sum at Least K',
    slug: 'shortest-subarray-with-sum-at-least-k',
    pattern: 'PREFIX_SUMS',
    difficulty: 'HARD',
    statement:
      'Return the length of the shortest contiguous subarray with sum ≥ k, or -1 if none.\n\nExample: nums=[1], k=1 → 1\nExample: nums=[1,2], k=4 → -1\nExample: nums=[2,-1,2], k=3 → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A sliding window fails because negative numbers mean shrinking from the left can increase the sum. Use prefix sums and a monotonic deque to find the minimum valid window efficiently.',
      },
      {
        level: 2,
        content:
          'prefix[0..n]. Monotone increasing deque of indices. For each j from 0..n: while deque and prefix[j]-prefix[deque[0]]>=k: ans=min(ans, j-deque.popleft()). While deque and prefix[j]<=prefix[deque[-1]]: deque.pop(). deque.append(j). O(n).',
      },
      {
        level: 3,
        content:
          'The deque holds indices with strictly increasing prefix sums. For each j, the front is the best candidate for i (smallest prefix, giving largest subarray sum). Once a valid i is found and popped, no future j can give a shorter valid window with that i (since j\' > j and we already found the shortest). Back-popping: a smaller prefix[j\'] later makes earlier larger prefixes useless as left endpoints.',
      },
    ],
  },

  {
    title: 'Minimum Time to Remove All Cars Containing Illegal Goods',
    slug: 'minimum-time-to-remove-all-cars-containing-illegal-goods',
    pattern: 'PREFIX_SUMS',
    difficulty: 'HARD',
    statement:
      'A train is represented by a binary string. You can: remove from the left end (cost 1), remove from the right end (cost 1), or remove any car from the middle (cost 2). Return the minimum total time to remove all \'1\' cars.\n\nExample: s="1100101" → 5\nExample: s="0010" → 2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each split point, compute the minimum cost to clear all \'1\'s in the left segment (using left-end removal or middle removal) and all \'1\'s in the right segment. Combine.',
      },
      {
        level: 2,
        content:
          'left[i] = min cost to remove all \'1\'s in s[0..i] = min(left[i-1]+2*(s[i]==\'1\'), i+1). right[i] similar. ans=min over all i of left[i]+right[i+1]. O(n).',
      },
      {
        level: 3,
        content:
          'left[i]: either remove s[i] from the middle (cost 2) extending left[i-1], or remove the entire prefix 0..i from the left end (cost i+1). Take the minimum. right[i]: symmetric from the right. ans = min(left[i] + right[i+1]) over all split points, plus corner cases of clearing the whole string from one end.',
      },
    ],
  },

  {
    title: 'Minimum Adjacent Swaps for K Consecutive Ones',
    slug: 'minimum-adjacent-swaps-for-k-consecutive-ones',
    pattern: 'PREFIX_SUMS',
    difficulty: 'HARD',
    statement:
      'Return the minimum number of adjacent swaps to group exactly k consecutive ones together in a binary array.\n\nExample: nums=[1,0,0,0,1,0,1], k=2 → 1\nExample: nums=[1,0,0,0,1,0,1], k=3 → 5\nExample: nums=[1,1,0,1], k=2 → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Collect the positions of all ones. For each window of k consecutive ones, the minimum swaps to make them adjacent equals the cost of moving them to the median position. Use prefix sums of positions to compute each window cost in O(1).',
      },
      {
        level: 2,
        content:
          'pos = positions of ones. prefix[i] = sum of pos[0..i-1]. For each window [l, l+k-1]: median = pos[l+k//2]. Cost = (median * left_count - left_prefix_sum) + (right_prefix_sum - median * right_count) - correction. Slide window. O(n).',
      },
      {
        level: 3,
        content:
          'For window pos[l..l+k-1], let m=l+k//2 (median index). Swap cost = Σ|pos[i]-pos[m]| for i in [l,l+k-1]. This equals (pos[m]*k//2 - prefix[m] + prefix[l]) + (prefix[l+k] - prefix[m+1] - pos[m]*(k-1-k//2)). Subtract the "already adjacent" triangular adjustment: sum(0,1,...,k//2-1) on the left and sum(0,...,k-1-k//2) on the right.',
      },
    ],
  },

  {
    title: 'Split Array Largest Sum',
    slug: 'split-array-largest-sum',
    pattern: 'PREFIX_SUMS',
    difficulty: 'HARD',
    statement:
      'Split array nums into exactly k non-empty subarrays to minimize the largest subarray sum.\n\nExample: nums=[7,2,5,10,8], k=2 → 18\nExample: nums=[1,2,3,4,5], k=2 → 9\nExample: nums=[1,4,4], k=3 → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Binary search on the answer (the maximum subarray sum). For each candidate maximum, greedily check if the array can be split into ≤ k parts.',
      },
      {
        level: 2,
        content:
          'lo=max(nums); hi=sum(nums). Binary search: mid=(lo+hi)//2. canSplit(mid): greedy — start new subarray when adding next element exceeds mid; count parts. If parts≤k: hi=mid. Else lo=mid+1. Return lo. O(n log(sum)).',
      },
      {
        level: 3,
        content:
          'canSplit(limit): walk left to right with a running sum. When the running sum + nums[i] > limit: start a new subarray at i, increment parts. If parts > k at any point: return False. This greedy is optimal because making subarrays as large as possible (without exceeding limit) minimizes the split count. Prefix sums allow O(1) range sum checks but aren\'t needed — the linear greedy is sufficient.',
      },
    ],
  },

  {
    title: 'Sum of Floored Pairs',
    slug: 'sum-of-floored-pairs',
    pattern: 'PREFIX_SUMS',
    difficulty: 'HARD',
    statement:
      'Return the sum of floor(nums[i]/nums[j]) for all 0≤i,j<n, modulo 10^9+7.\n\nExample: nums=[2,5,9] → 10\nExample: nums=[7,7,7,7,7,7,7] → 49',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Build a frequency array. For each unique value v, compute its contribution by grouping all x values whose floor(v/x) equals the same quotient q. Use prefix sums of the frequency array to count elements in each range.',
      },
      {
        level: 2,
        content:
          'cnt=frequency of each value. prefix=prefix sums of cnt. For each value v (with freq[v]>0): for q=1,2,...: range of x giving floor(v/x)=q is [v//(q+1)+1, v//q]. count=prefix[v//q+1]-prefix[v//(q+1)+1]. ans+=q*count*freq[v]. O(M log M) where M=max value.',
      },
      {
        level: 3,
        content:
          'The harmonic series trick: for fixed v, the number of distinct quotients q=floor(v/x) over all x is O(√v), because floor(v/x) only takes O(√v) distinct values. For each quotient q, the range of x giving floor(v/x)=q is [v//(q+1)+1, v//q]. Prefix sums count elements in this range in O(1). Total: O(Σ√v * freq(v)) which is O(M log M) by the harmonic series.',
      },
    ],
  },

  {
    title: 'Stamping the Grid',
    slug: 'stamping-the-grid',
    pattern: 'PREFIX_SUMS',
    difficulty: 'HARD',
    statement:
      'Given a binary grid and stamp dimensions H×W, return true if you can place stamps (possibly overlapping) on zero cells to cover all zero cells without covering any one cell.\n\nExample: grid=[[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,0,0,1]], stampHeight=3, stampWidth=2 → true\nExample: grid=[[1,0,0],[0,1,0],[0,0,1]], stampHeight=2, stampWidth=2 → false',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use 2D prefix sums to check if a rectangle is all-zeros in O(1). For each valid stamp position (no 1s in its footprint), mark coverage using a 2D difference array. Verify every 0 cell is covered.',
      },
      {
        level: 2,
        content:
          'Build 2D prefix sums of grid to detect 1s in O(1). For each (r,c) where the stamp fits and has no 1s: update a 2D diff array (+1 at (r,c), adjustments at borders). Prefix sum the diff → coverage per cell. Any grid[r][c]==0 with coverage==0 → false. O(mn).',
      },
      {
        level: 3,
        content:
          '2D difference array update for a rectangle [r1,c1,r2,c2]: diff[r1][c1]+=1, diff[r2+1][c1]-=1, diff[r1][c2+1]-=1, diff[r2+1][c2+1]+=1. After all stamps, compute 2D prefix sums of diff. For each cell (r,c): if grid[r][c]==0 and coverage[r][c]==0 → impossible. One-cells are always "pre-covered" — only zero cells need coverage.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 15 — PREFIX_SUMS (30 problems)...\n');

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
