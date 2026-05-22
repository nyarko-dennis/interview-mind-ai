import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 10 — GREEDY (30 problems: 10 Easy, 10 Medium, 10 Hard)
// Already seeded: Jump Game (Medium) — will be skipped via onConflictDoNothing
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
    title: 'Assign Cookies',
    slug: 'assign-cookies',
    pattern: 'GREEDY',
    difficulty: 'EASY',
    statement:
      'Each child i has a greed factor g[i]. Each cookie j has a size s[j]. Assign at most one cookie per child; a child is content if s[j] >= g[i]. Maximize the number of content children.\n\nExample: g=[1,2,3], s=[1,1] → 1\nExample: g=[1,2], s=[1,2,3] → 2',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Sort both arrays. Try to satisfy the least greedy child first using the smallest cookie that works — this wastes the fewest resources.',
      },
      {
        level: 2,
        content:
          'Two pointers. Sort g and s. i=0 (children), j=0 (cookies). While both in range: if s[j]>=g[i]: match found, i++. Always j++. Return i. O(n log n).',
      },
    ],
  },

  {
    title: 'Lemonade Change',
    slug: 'lemonade-change',
    pattern: 'GREEDY',
    difficulty: 'EASY',
    statement:
      'Each customer pays $5, $10, or $20 for a $5 lemonade. Return true if you can give every customer correct change (no bills at start).\n\nExample: bills=[5,5,5,10,20] → true\nExample: bills=[5,5,10,10,20] → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Track $5 and $10 bill counts. When making $15 change for a $20, prefer using a $10+$5 rather than three $5s — preserve $5 bills since they are the most versatile.',
      },
      {
        level: 2,
        content:
          'five=0, ten=0. $5: five++. $10: five--,ten++. $20: if ten>0: ten--,five-- else five-=3. Return false if five<0 or ten<0. O(n).',
      },
    ],
  },

  {
    title: 'Can Place Flowers',
    slug: 'can-place-flowers',
    pattern: 'GREEDY',
    difficulty: 'EASY',
    statement:
      'A flowerbed is a binary array where 1 = flower planted. Flowers cannot be adjacent. Return true if n more flowers can be planted without violating the rule.\n\nExample: flowerbed=[1,0,0,0,1], n=1 → true\nExample: flowerbed=[1,0,0,0,1], n=2 → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Scan left to right. Planting as early as possible is always optimal — it never blocks a planting that a later-placed flower would have allowed.',
      },
      {
        level: 2,
        content:
          'For each i: if flowerbed[i]==0 and (i==0 or prev==0) and (i==len-1 or next==0): plant here (set to 1), n--. Return n<=0. O(n).',
      },
    ],
  },

  {
    title: 'Maximum Units on a Truck',
    slug: 'maximum-units-on-a-truck',
    pattern: 'GREEDY',
    difficulty: 'EASY',
    statement:
      'boxTypes[i]=[numberOfBoxes, unitsPerBox]. truckSize is the maximum number of boxes. Maximize the total units loaded.\n\nExample: boxTypes=[[1,3],[2,2],[3,1]], truckSize=4 → 8\nExample: boxTypes=[[5,10],[2,5],[4,7],[3,9]], truckSize=10 → 91',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Always load from the box type with the most units per box first — there is no reason to prefer a lower-density box when higher-density capacity remains.',
      },
      {
        level: 2,
        content:
          'Sort boxTypes descending by unitsPerBox. Greedily take min(available, remaining capacity) boxes from each type. Accumulate units. O(n log n).',
      },
    ],
  },

  {
    title: 'Array Partition',
    slug: 'array-partition',
    pattern: 'GREEDY',
    difficulty: 'EASY',
    statement:
      'Given 2n integers, partition them into n pairs and sum min(a, b) for each pair. Maximize this sum.\n\nExample: nums=[1,4,3,2] → 4 (pairs (1,2),(3,4) → 1+3=4)\nExample: nums=[6,2,6,5,1,2] → 9 (pairs (1,2),(2,5),(6,6) → 1+2+6=9)',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Pairing two large numbers wastes one of them. To minimize waste, pair adjacent sorted elements so the "discarded" minimum is as large as possible.',
      },
      {
        level: 2,
        content:
          'Sort nums. Sum every element at even indices: nums[0]+nums[2]+nums[4]+.... Pairing sorted neighbors ensures the minimum of each pair is maximized. O(n log n).',
      },
    ],
  },

  {
    title: 'Maximize Sum Of Array After K Negations',
    slug: 'maximize-sum-of-array-after-k-negations',
    pattern: 'GREEDY',
    difficulty: 'EASY',
    statement:
      'You may negate any element of nums up to k times. Maximize the resulting array sum.\n\nExample: nums=[4,2,3], k=1 → 5\nExample: nums=[3,-1,0,2], k=3 → 6\nExample: nums=[-2,-3,-1,5,6], k=5 → 13',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Negate the most negative elements first to gain the largest increase. If k is still odd after all negatives are gone, negate the element closest to zero (minimum absolute value) once.',
      },
      {
        level: 2,
        content:
          'Sort by value. Negate elements from index 0 while they are negative and k>0, decrementing k. If k is still odd, subtract 2*abs_min from the total sum (negating the smallest absolute value). O(n log n).',
      },
    ],
  },

  {
    title: 'Is Subsequence',
    slug: 'is-subsequence',
    pattern: 'GREEDY',
    difficulty: 'EASY',
    statement:
      'Return true if string s is a subsequence of string t (characters of s appear in t in order, not necessarily contiguous).\n\nExample: s="ace", t="abcde" → true\nExample: s="aec", t="abcde" → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Scan t left to right. Greedily match the earliest possible occurrence of each character in s — there is never a reason to skip a valid match.',
      },
      {
        level: 2,
        content:
          'Two pointers i=0 (s), j=0 (t). For each char in t: if t[j]==s[i]: i++. j++ always. Return i==len(s). O(|t|).',
      },
    ],
  },

  {
    title: 'Maximum 69 Number',
    slug: 'maximum-69-number',
    pattern: 'GREEDY',
    difficulty: 'EASY',
    statement:
      'Given a positive integer num containing only digits 6 and 9, flip at most one digit to maximize the number.\n\nExample: num=9669 → 9969\nExample: num=9996 → 9999\nExample: num=9999 → 9999',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Flipping the most-significant 6 to a 9 gives the largest possible gain. Flipping any later digit provides a smaller increase.',
      },
      {
        level: 2,
        content:
          'Convert to string, find the first \'6\', replace it with \'9\', return as int. Only one flip is ever needed — the first 6 from the left. O(d) where d = digit count.',
      },
    ],
  },

  {
    title: 'Minimum Operations to Make the Array Increasing',
    slug: 'minimum-operations-to-make-array-increasing',
    pattern: 'GREEDY',
    difficulty: 'EASY',
    statement:
      'Return the minimum number of increment operations (each adds 1 to one element) needed to make nums strictly increasing.\n\nExample: nums=[1,1,1] → 3\nExample: nums=[1,5,2,4,1] → 14',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Scan left to right. If nums[i] is not strictly greater than nums[i-1], raise it to nums[i-1]+1 — doing the minimum required at each step is always optimal.',
      },
      {
        level: 2,
        content:
          'ops=0. For i from 1..n-1: if nums[i]<=nums[i-1]: ops+=nums[i-1]+1-nums[i]; nums[i]=nums[i-1]+1. Return ops. O(n).',
      },
    ],
  },

  {
    title: 'Largest Perimeter Triangle',
    slug: 'largest-perimeter-triangle',
    pattern: 'GREEDY',
    difficulty: 'EASY',
    statement:
      'Given an array of positive integers, return the largest perimeter of a triangle with positive area using three of these lengths, or 0 if impossible. A valid triangle requires each side to be less than the sum of the other two.\n\nExample: nums=[2,1,2] → 5\nExample: nums=[1,2,1,10] → 0',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Sort descending. The only triangle condition you need to check for three sorted sides a≥b≥c is b+c>a. Start from the three largest — the first valid triple gives the maximum perimeter.',
      },
      {
        level: 2,
        content:
          'Sort descending. For i from 0..n-3: if nums[i+1]+nums[i+2]>nums[i]: return nums[i]+nums[i+1]+nums[i+2]. Return 0. O(n log n). Checking only adjacent triples works because spread-out triples are even harder to satisfy.',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Jump Game',
    slug: 'jump-game',
    pattern: 'GREEDY',
    difficulty: 'MEDIUM',
    statement:
      'Given an array of non-negative integers where nums[i] is the maximum jump length from index i, return true if you can reach the last index.\n\nExample: nums=[2,3,1,1,4] → true\nExample: nums=[3,2,1,0,4] → false',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Track the farthest index reachable so far. If you ever reach a position beyond that boundary, you are stuck.',
      },
      {
        level: 2,
        content:
          'max_reach=0. For i from 0..n-1: if i>max_reach: return False. max_reach=max(max_reach, i+nums[i]). Return True. O(n).',
      },
      {
        level: 3,
        content:
          'No need to track the path — just the furthest reachable index. If i > max_reach at any step, no jump chain from position 0 can reach i. A longer jump from the same position always dominates a shorter one, so max_reach is sufficient state.',
      },
    ],
  },

  {
    title: 'Jump Game II',
    slug: 'jump-game-ii',
    pattern: 'GREEDY',
    difficulty: 'MEDIUM',
    statement:
      'Given an array where nums[i] is the max jump length from index i (always reachable), return the minimum number of jumps to reach the last index.\n\nExample: nums=[2,3,1,1,4] → 2\nExample: nums=[2,3,0,1,4] → 2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Think of jumps as BFS levels. Within each jump, track the farthest you can reach. When you exhaust the current level, commit to a jump and start the next level.',
      },
      {
        level: 2,
        content:
          'jumps=0, cur_end=0, farthest=0. For i from 0..n-2: farthest=max(farthest, i+nums[i]). If i==cur_end: jumps++, cur_end=farthest. Return jumps. O(n).',
      },
      {
        level: 3,
        content:
          'cur_end marks the boundary of the current jump level. When i reaches cur_end, you must use one more jump to go further, so extend the boundary to farthest. Iterating only to n-2 avoids counting an extra jump when standing exactly on the last index.',
      },
    ],
  },

  {
    title: 'Gas Station',
    slug: 'gas-station',
    pattern: 'GREEDY',
    difficulty: 'MEDIUM',
    statement:
      'n gas stations in a circle. net[i] = gas[i]-cost[i] to travel to next station. Return the starting index to complete the full circuit, or -1 if impossible. The solution is guaranteed unique if it exists.\n\nExample: gas=[1,2,3,4,5], cost=[3,4,5,1,2] → 3\nExample: gas=[2,3,4], cost=[3,4,3] → -1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'If total gas < total cost, it is impossible. Otherwise a solution always exists. The question is where to start.',
      },
      {
        level: 2,
        content:
          'tank=0, start=0, total=0. For i from 0..n-1: net=gas[i]-cost[i]; tank+=net; total+=net. If tank<0: start=i+1, tank=0. Return start if total>=0 else -1. O(n).',
      },
      {
        level: 3,
        content:
          'When tank goes negative before station i, no station from the current start through i can be the answer (the cumulative deficit makes them all fail). Reset start=i+1. The last standing start works because: total≥0 means there is a surplus somewhere; the surplus is in the segment from start to end, which covers the earlier deficit.',
      },
    ],
  },

  {
    title: 'Best Time to Buy and Sell Stock II',
    slug: 'best-time-to-buy-and-sell-stock-ii',
    pattern: 'GREEDY',
    difficulty: 'MEDIUM',
    statement:
      'You may buy and sell stock on multiple days but can only hold one share at a time. Maximize total profit.\n\nExample: prices=[7,1,5,3,6,4] → 7\nExample: prices=[1,2,3,4,5] → 4\nExample: prices=[7,6,4,3,1] → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Think of profit as the sum of all positive day-to-day price increases. You can capture every upward move.',
      },
      {
        level: 2,
        content:
          'profit=0. For i from 1..n-1: if prices[i]>prices[i-1]: profit+=prices[i]-prices[i-1]. Return profit. O(n).',
      },
      {
        level: 3,
        content:
          'This is equivalent to buying at every local minimum and selling at every local maximum. The shortcut: sum of all positive daily deltas equals the total profit of all optimal trades. No need to explicitly track buy/sell points.',
      },
    ],
  },

  {
    title: 'Wiggle Subsequence',
    slug: 'wiggle-subsequence',
    pattern: 'GREEDY',
    difficulty: 'MEDIUM',
    statement:
      'A wiggle sequence alternates strictly up and down. Return the length of the longest wiggle subsequence of nums.\n\nExample: nums=[1,7,4,9,2,5] → 6\nExample: nums=[1,17,5,10,13,15,10,5,16,8] → 7\nExample: nums=[1,2,3,4,5,6,7,8,9] → 2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Count peaks and valleys. Each time the direction (up/down) changes, you have found a new wiggle point.',
      },
      {
        level: 2,
        content:
          'up=1, down=1. For i from 1..n-1: if nums[i]>nums[i-1]: up=down+1. If nums[i]<nums[i-1]: down=up+1. Return max(up, down). O(n).',
      },
      {
        level: 3,
        content:
          'up = best length if the last move was ascending; down = best length if last move was descending. Plateaus (equal neighbors) do not change either. No DP table needed — the two variables carry all required state because the greedy "take every turn" strategy is provably optimal.',
      },
    ],
  },

  {
    title: 'Non-overlapping Intervals',
    slug: 'non-overlapping-intervals',
    pattern: 'GREEDY',
    difficulty: 'MEDIUM',
    statement:
      'Return the minimum number of intervals to remove so the remaining intervals are non-overlapping.\n\nExample: intervals=[[1,2],[2,3],[3,4],[1,3]] → 1\nExample: intervals=[[1,2],[1,2],[1,2]] → 2\nExample: intervals=[[1,2],[2,3]] → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Equivalent to finding the maximum number of non-overlapping intervals (activity selection). Intervals to remove = total − max kept.',
      },
      {
        level: 2,
        content:
          'Sort by end time. kept=1, prev_end=intervals[0][1]. For i from 1: if intervals[i][0]>=prev_end: kept++, prev_end=intervals[i][1]. Return n-kept. O(n log n).',
      },
      {
        level: 3,
        content:
          'Sorting by end time is the classic activity-selection insight: the interval that ends earliest always leaves the most room for future intervals. Greedily keeping each non-overlapping interval maximizes the count kept, minimizing removals.',
      },
    ],
  },

  {
    title: 'Minimum Number of Arrows to Burst Balloons',
    slug: 'minimum-number-of-arrows-to-burst-balloons',
    pattern: 'GREEDY',
    difficulty: 'MEDIUM',
    statement:
      'Balloons span [xstart, xend] on a wall. One arrow shot at position x bursts all balloons with xstart ≤ x ≤ xend. Return the minimum number of arrows needed.\n\nExample: points=[[10,16],[2,8],[1,6],[7,12]] → 2\nExample: points=[[1,2],[3,4],[5,6],[7,8]] → 4\nExample: points=[[1,2],[2,3],[3,4],[4,5]] → 2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort by end position. Shoot one arrow at the end of the first balloon — this hits the maximum number of overlapping balloons starting from the left.',
      },
      {
        level: 2,
        content:
          'Sort by end. arrows=1, cur_end=points[0][1]. For each [start,end]: if start>cur_end: arrows++, cur_end=end. Else: cur_end=min(cur_end,end). Return arrows. O(n log n).',
      },
      {
        level: 3,
        content:
          'cur_end tracks the tightest shared end for the current arrow. When a new balloon starts after cur_end, no arrow can hit both — fire a new one. Narrowing cur_end to min(cur_end, end) keeps the arrow position as constrainted as possible for future balloons.',
      },
    ],
  },

  {
    title: 'Task Scheduler',
    slug: 'task-scheduler',
    pattern: 'GREEDY',
    difficulty: 'MEDIUM',
    statement:
      'Schedule tasks (letters A-Z) with a cooldown of n slots between identical task repeats (idle slots are allowed). Return the minimum total intervals needed.\n\nExample: tasks=["A","A","A","B","B","B"], n=2 → 8\nExample: tasks=["A","A","A","B","B","B"], n=0 → 6\nExample: tasks=["A","A","A","A","B","B","B","C","C","D","D","E"], n=2 → 12',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'The most frequent task is the bottleneck. Arrange it first, then fill the cooling gaps with other tasks or idles.',
      },
      {
        level: 2,
        content:
          'Count frequencies. max_count=max freq. max_freq_tasks=count of tasks with that frequency. Answer=max(len(tasks), (max_count-1)*(n+1)+max_freq_tasks). O(n).',
      },
      {
        level: 3,
        content:
          '(max_count-1) full frames of (n+1) slots, plus a final row of max_freq_tasks tasks. If there are enough varied tasks to fill all gaps, no idle slots are needed and the answer is simply len(tasks). The formula captures both cases with a single max().',
      },
    ],
  },

  {
    title: 'Partition Labels',
    slug: 'partition-labels',
    pattern: 'GREEDY',
    difficulty: 'MEDIUM',
    statement:
      'Partition string s into as many parts as possible so each letter appears in at most one part. Return a list of the part sizes.\n\nExample: s="ababcbacadefegdehijhklij" → [9,7,8]\nExample: s="eccbbbbdec" → [10]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each character, record the last index it appears. A partition can end only when you have passed the last occurrence of every character seen so far.',
      },
      {
        level: 2,
        content:
          'Precompute last[c]=last index of c. start=0, end=0. For i,c in enumerate(s): end=max(end,last[c]). If i==end: append i-start+1, start=i+1. O(n).',
      },
      {
        level: 3,
        content:
          '"end" expands to include the last occurrence of every new character encountered. When i reaches end, the invariant holds: every character from start..end appears only within this partition. Cutting here is both valid and maximally greedy (earliest possible cut).',
      },
    ],
  },

  {
    title: 'Queue Reconstruction by Height',
    slug: 'queue-reconstruction-by-height',
    pattern: 'GREEDY',
    difficulty: 'MEDIUM',
    statement:
      'people[i]=[h,k] where h is height and k is the number of people with height ≥ h who stand in front. Reconstruct and return the valid queue.\n\nExample: people=[[7,0],[4,4],[7,1],[5,0],[6,1],[5,2]] → [[5,0],[7,0],[5,2],[6,1],[4,4],[7,1]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Taller people are invisible to shorter ones. Process people tallest-first: inserting each at index k into the growing result is always correct at the time of insertion.',
      },
      {
        level: 2,
        content:
          'Sort: primary descending by h, secondary ascending by k. result=[]. For each person: result.insert(k, person). Return result. O(n²) due to insertions, O(n log n) sorting.',
      },
      {
        level: 3,
        content:
          'After sorting tallest-first, all currently placed people have height ≥ h, so they all count toward the k constraint. Shorter people placed later do not affect the k count of already-placed taller people. Inserting at position k places exactly k taller people in front — correct by construction.',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Candy',
    slug: 'candy',
    pattern: 'GREEDY',
    difficulty: 'HARD',
    statement:
      'n children in a row, each with a rating. Give each child at least 1 candy. Children with a higher rating than a direct neighbor must receive more candy than that neighbor. Return the minimum total candies.\n\nExample: ratings=[1,0,2] → 5\nExample: ratings=[1,2,2] → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A single left-to-right pass cannot satisfy both neighbor constraints simultaneously. Consider two separate passes: one for the left neighbor condition, one for the right.',
      },
      {
        level: 2,
        content:
          'Pass 1 (L→R): candies[i]=candies[i-1]+1 if ratings[i]>ratings[i-1] else 1. Pass 2 (R→L): if ratings[i]>ratings[i+1]: candies[i]=max(candies[i], candies[i+1]+1). Return sum(candies). O(n).',
      },
      {
        level: 3,
        content:
          'Pass 1 enforces the "beats left neighbor" rule. Pass 2 enforces the "beats right neighbor" rule without breaking pass-1 results by taking the max. A peak in the rating array gets the max of its left and right slopes — exactly the minimum needed to satisfy both neighbors.',
      },
    ],
  },

  {
    title: 'Patching Array',
    slug: 'patching-array',
    pattern: 'GREEDY',
    difficulty: 'HARD',
    statement:
      'Given a sorted array nums and integer n, add the minimum number of patches (integers) so every integer in [1, n] can be formed as a subset sum of the array. Return the patch count.\n\nExample: nums=[1,3], n=6 → 1 (add 2)\nExample: nums=[1,5,10], n=20 → 2 (add 2, add 4)\nExample: nums=[1,2,2], n=5 → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Track "reach": the maximum value that can currently be represented as a subset sum (covering [1..reach]). Extend reach greedily using existing numbers or patches.',
      },
      {
        level: 2,
        content:
          'reach=0, patches=0, i=0. While reach<n: if i<len(nums) and nums[i]<=reach+1: reach+=nums[i]; i++. Else: reach+=reach+1; patches++. Return patches. O(m + log n).',
      },
      {
        level: 3,
        content:
          'Invariant: [1..reach] is fully covered. If nums[i]≤reach+1, adding it extends coverage to reach+nums[i]. If there\'s a gap (nums[i]>reach+1 or no more nums), the optimal patch is reach+1 — it is the smallest missing value, and adding it doubles coverage to 2*reach+1. This patch is both necessary and maximally efficient.',
      },
    ],
  },

  {
    title: 'Minimum Number of Refueling Stops',
    slug: 'minimum-number-of-refueling-stops',
    pattern: 'GREEDY',
    difficulty: 'HARD',
    statement:
      'A car starts at 0 with startFuel. Stations at stations[i]=[position, fuel]. Return the minimum number of stops to reach target, or -1 if impossible.\n\nExample: target=1, startFuel=1, stations=[] → 0\nExample: target=100, startFuel=10, stations=[[10,60],[20,30],[30,30],[60,40]] → 2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'As you drive, record the fuel available at every station you pass. When you run out, retroactively pick the largest available fuel stop you have already passed.',
      },
      {
        level: 2,
        content:
          'Max-heap of fuels passed. fuel=startFuel, stops=0. For each station in order: if station.pos>fuel: while heap and fuel<station.pos: fuel+=heappop(heap); stops++. If fuel<station.pos: return -1. Push station.fuel to heap. Handle reaching target similarly. O(n log n).',
      },
      {
        level: 3,
        content:
          'The key insight: defer refueling decisions until forced. The max-heap stores all "available" refuels you have driven past. When stuck, always pick the largest — it minimizes future stops. This greedy choice is optimal because a larger refuel strictly dominates any sequence of smaller ones for the same stop count.',
      },
    ],
  },

  {
    title: 'IPO',
    slug: 'ipo',
    pattern: 'GREEDY',
    difficulty: 'HARD',
    statement:
      'Before starting project i you need capital ≥ capital[i]; completing it adds profits[i] to your capital. Start with w capital, complete at most k projects. Maximize final capital.\n\nExample: k=2, w=0, profits=[1,2,3], capital=[0,1,1] → 4\nExample: k=3, w=0, profits=[1,2,3], capital=[0,1,2] → 6',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'At any capital level, always pick the most profitable project you can currently afford — taking the highest available profit maximizes capital for future rounds.',
      },
      {
        level: 2,
        content:
          'Min-heap by capital: push all (capital[i], profits[i]). Max-heap for profits. Repeat k times: move all projects with capital≤w from min-heap to max-heap. If max-heap empty: break. w+=heappop(max-heap). O(n log n + k log n).',
      },
      {
        level: 3,
        content:
          'The min-heap unlocks projects as capital grows. The max-heap greedily selects the best available. Correctness: choosing the highest-profit affordable project is optimal because all projects increase capital, and any project affordable before this choice remains affordable afterward — no opportunity is foreclosed.',
      },
    ],
  },

  {
    title: 'Course Schedule III',
    slug: 'course-schedule-iii',
    pattern: 'GREEDY',
    difficulty: 'HARD',
    statement:
      'courses[i]=[duration, lastDay]. You must finish course i within lastDay. Taking courses consecutively, maximize the number of courses you can take.\n\nExample: courses=[[100,200],[200,1300],[1000,1250],[2000,3200]] → 3\nExample: courses=[[1,2],[2,3]] → 2\nExample: courses=[[5,5],[4,6],[2,6]] → 2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort by deadline. Greedily take each course. If the new course pushes you past its deadline, swap it with the longest course taken so far if that frees time without reducing count.',
      },
      {
        level: 2,
        content:
          'Sort by lastDay. Max-heap of durations taken. timeTaken=0. For each [d, end]: timeTaken+=d; push d to max-heap. If timeTaken>end: timeTaken-=heappop(max-heap). Return len(heap). O(n log n).',
      },
      {
        level: 3,
        content:
          'Sorting by deadline is the classic interval insight. The swap: if a new course exceeds the deadline, removing the longest previously taken course (same count, less timeTaken) is always the best trade. If the new course is shorter than the max, swapping is strictly beneficial — same count but less time used, enabling more future courses.',
      },
    ],
  },

  {
    title: 'Minimum Cost to Hire K Workers',
    slug: 'minimum-cost-to-hire-k-workers',
    pattern: 'GREEDY',
    difficulty: 'HARD',
    statement:
      'n workers with quality[i] and minWage[i]. Hire exactly k workers where each is paid proportionally to their quality relative to their peers, and every worker receives at least their minWage. Return the minimum total wage (floating-point answer acceptable).\n\nExample: quality=[10,20,5], wage=[70,50,30], k=2 → 105.0\nExample: quality=[3,1,10,10,1], wage=[4,8,2,2,7], k=3 → 30.66667',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Every group of k workers must share a common wage rate r = wage/quality. The captain (highest rate) sets r; all other workers receive r*quality. Sort workers by their individual rate.',
      },
      {
        level: 2,
        content:
          'Sort by rate=wage[i]/quality[i]. Max-heap of qualities (size k). sumQ=0. For each worker as captain: push quality; if heap size>k: sumQ-=heappop(max). if heap size==k: cost=rate*sumQ; update answer. O(n log k).',
      },
      {
        level: 3,
        content:
          'The captain\'s rate is the group rate. All workers seen before the captain have a lower rate, so paying them captain_rate*quality satisfies their minWage (rate*quality ≥ minWage). We want the k-1 workers with the smallest total quality to minimize cost, hence the max-heap evicts the largest quality when over k. Try each worker as captain.',
      },
    ],
  },

  {
    title: 'Minimum Number of Taps to Open to Water a Garden',
    slug: 'minimum-number-of-taps-to-open-to-water-a-garden',
    pattern: 'GREEDY',
    difficulty: 'HARD',
    statement:
      'A garden spans [0, n]. Tap i at position i covers [i-ranges[i], i+ranges[i]]. Return the minimum number of taps to open to water [0, n] completely, or -1 if impossible.\n\nExample: n=5, ranges=[3,4,1,1,0,0] → 1\nExample: n=3, ranges=[0,0,0,0] → -1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Transform each tap into an interval it covers, then solve: minimum intervals to cover [0,n]. This reduces to Jump Game II.',
      },
      {
        level: 2,
        content:
          'Build maxReach[i]=farthest right covered by any tap starting at ≤ i. Then: jumps=0, cur_end=0, farthest=0. For i from 0..n: farthest=max(farthest, maxReach[i]). If i==cur_end: if farthest==cur_end: return -1; jumps++; cur_end=farthest. O(n).',
      },
      {
        level: 3,
        content:
          'Preprocessing: for tap j with range r, interval is [max(0,j-r), min(n,j+r)]. Set maxReach[max(0,j-r)]=max(maxReach[max(0,j-r)], min(n,j+r)). This maps every possible starting point to the farthest reachable endpoint by one tap. The subsequent Jump Game II greedy selects the fewest taps to span [0,n].',
      },
    ],
  },

  {
    title: 'Binary Tree Cameras',
    slug: 'binary-tree-cameras',
    pattern: 'GREEDY',
    difficulty: 'HARD',
    statement:
      'Place cameras on tree nodes to monitor every node. A camera at node v monitors v, its parent, and its children. Return the minimum number of cameras needed.\n\nExample: root=[0,0,null,0,0] → 1\nExample: root=[0,0,null,0,null,0,null,null,0] → 2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A bottom-up greedy works: never place a camera at a leaf (the parent is always a better location). Place a camera at a node only when a child is uncovered.',
      },
      {
        level: 2,
        content:
          'DFS returns 0=uncovered, 1=has_camera, 2=covered. Null nodes return 2. If any child==0: place camera here, cameras++, return 1. If any child==1: return 2. Else return 0. If root returns 0: cameras++. O(n).',
      },
      {
        level: 3,
        content:
          'Three states encode the minimum information needed. Leaves return 0 (uncovered) — their parents will handle them. If either child is uncovered (state 0), we must place a camera here (state 1). If a child has a camera (state 1), we are covered (state 2). Otherwise we remain uncovered and hope the parent covers us. Check root last: if still uncovered, add one final camera.',
      },
    ],
  },

  {
    title: 'Super Washing Machines',
    slug: 'super-washing-machines',
    pattern: 'GREEDY',
    difficulty: 'HARD',
    statement:
      'n washing machines in a row, each with some dresses. In one move, each machine can pass one dress to an adjacent machine simultaneously. Return the minimum number of moves to equalize dresses, or -1 if impossible.\n\nExample: machines=[1,0,5] → 3\nExample: machines=[0,3,0] → 2\nExample: machines=[0,2,0] → -1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'If total dresses is not divisible by n, return -1. The answer is the maximum of two bottleneck types: the largest net flow across any gap, and the largest excess any single machine must export.',
      },
      {
        level: 2,
        content:
          'target=sum/n. flow=0, ans=0. For each machines[i]: flow+=machines[i]-target. ans=max(ans, abs(flow), machines[i]-target). Return ans. O(n).',
      },
      {
        level: 3,
        content:
          'Two independent bottlenecks: (a) abs(prefix_sum[i]-i*target) = net dresses that must cross the gap after machine i — limited by one move per slot per round; (b) machines[i]-target = dresses a single overloaded machine must ship out, each requiring a distinct move. The answer is the max over all positions of both quantities simultaneously.',
      },
    ],
  },

  {
    title: 'Create Maximum Number',
    slug: 'create-maximum-number',
    pattern: 'GREEDY',
    difficulty: 'HARD',
    statement:
      'Given two arrays of digits nums1 (length m) and nums2 (length n), create the lexicographically maximum number of length k ≤ m+n using digits from both arrays while preserving their relative order within each array.\n\nExample: nums1=[3,4,6,5], nums2=[9,1,2,5,8,3], k=5 → [9,8,6,5,3]\nExample: nums1=[6,7], nums2=[6,0,4], k=5 → [6,7,6,0,4]\nExample: nums1=[3,9], nums2=[8,9], k=3 → [9,8,9]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Try every valid split: take i digits from nums1 and k-i from nums2. For each split, extract the max subsequence from each array, then merge them into the largest combined number.',
      },
      {
        level: 2,
        content:
          'maxSub(arr, t): monotone stack — pop while stack non-empty, arr[i]>top, and remaining elements are enough. merge(a, b): compare remaining suffixes to break ties; always pick the lexicographically larger start. Answer=max over all valid i. O(k*(m+n)).',
      },
      {
        level: 3,
        content:
          'maxSub extracts the largest t-length subsequence using a greedy stack — pop a smaller top only if enough digits remain to fill t. merge is the key: when heads are equal, compare the full remaining suffix (not just one digit) to decide which array to take from next. Both steps must be correct for the overall answer to be correct.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 10 — GREEDY (30 problems)...\n');

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
