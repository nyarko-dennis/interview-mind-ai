import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 11 — INTERVALS (30 problems: 10 Easy, 10 Medium, 10 Hard)
// Already seeded elsewhere: Non-overlapping Intervals, Min Arrows (GREEDY batch)
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
    title: 'Meeting Rooms',
    slug: 'meeting-rooms',
    pattern: 'INTERVALS',
    difficulty: 'EASY',
    statement:
      'Given an array of meeting time intervals [start, end], determine if a person could attend all meetings without any two overlapping.\n\nExample: intervals=[[0,30],[5,10],[15,20]] → false\nExample: intervals=[[7,10],[2,4]] → true',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Sort by start time. A conflict exists only between consecutive intervals after sorting.',
      },
      {
        level: 2,
        content:
          'Sort by start. For i from 1..n-1: if intervals[i][0] < intervals[i-1][1]: return False. Return True. O(n log n).',
      },
    ],
  },

  {
    title: 'Determine if Two Events Have Conflict',
    slug: 'determine-if-two-events-have-conflict',
    pattern: 'INTERVALS',
    difficulty: 'EASY',
    statement:
      'Two events are given as ["HH:MM","HH:MM"] strings representing start and end. Return true if the events conflict (overlap at any point, inclusive).\n\nExample: event1=["01:15","02:00"], event2=["02:00","03:00"] → true\nExample: event1=["10:00","11:00"], event2=["14:00","15:00"] → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Two intervals [a,b] and [c,d] overlap if and only if a≤d and c≤b. Compare start and end times directly.',
      },
      {
        level: 2,
        content:
          'Return event1[0]<=event2[1] and event2[0]<=event1[1]. String comparison of "HH:MM" is lexicographically correct without conversion. O(1).',
      },
    ],
  },

  {
    title: 'Summary Ranges',
    slug: 'summary-ranges',
    pattern: 'INTERVALS',
    difficulty: 'EASY',
    statement:
      'Given a sorted unique integer array, return the smallest list of ranges that exactly covers all numbers. Format "a->b" if a≠b, or "a" if a==b.\n\nExample: nums=[0,1,2,4,5,7] → ["0->2","4->5","7"]\nExample: nums=[0,2,3,4,6,8,9] → ["0","2->4","6","8->9"]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Scan left to right. Extend the current range while numbers are consecutive; start a new range at each gap.',
      },
      {
        level: 2,
        content:
          'i=0. While i<n: start=i. While i<n-1 and nums[i+1]==nums[i]+1: i++. Append "nums[start]->nums[i]" or "nums[start]" if start==i. i++. O(n).',
      },
    ],
  },

  {
    title: 'Check if All the Integers in a Range Are Covered',
    slug: 'check-if-all-integers-in-range-are-covered',
    pattern: 'INTERVALS',
    difficulty: 'EASY',
    statement:
      'Given ranges[i]=[li, ri] and integers left and right, return true if every integer in [left, right] is covered by at least one range.\n\nExample: ranges=[[1,10],[10,20]], left=21, right=21 → false\nExample: ranges=[[1,10],[10,20]], left=5, right=12 → true',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'For each integer in [left, right], check if any range covers it. Since bounds are small (≤50), a direct check is fine.',
      },
      {
        level: 2,
        content:
          'Build a covered[50] boolean array: for each [l,r]: mark covered[l..r]=true. Check all positions in [left, right]. O(n * max_range). Alternatively: for each x in [left..right]: if no range has l<=x<=r, return False.',
      },
    ],
  },

  {
    title: 'Teemo Attacking',
    slug: 'teemo-attacking',
    pattern: 'INTERVALS',
    difficulty: 'EASY',
    statement:
      'Teemo attacks at each time in timeSeries. Each attack poisons the enemy for duration seconds (a new attack during poison resets, not stacks). Return total seconds the enemy is poisoned.\n\nExample: timeSeries=[1,4], duration=2 → 4\nExample: timeSeries=[1,2], duration=2 → 3',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Each attack contributes min(duration, gap_to_next_attack) poisoned seconds. The last attack always contributes full duration.',
      },
      {
        level: 2,
        content:
          'total=0. For i from 0..n-2: total+=min(duration, timeSeries[i+1]-timeSeries[i]). total+=duration. Return total. O(n).',
      },
    ],
  },

  {
    title: 'Count Days Spent Together',
    slug: 'count-days-spent-together',
    pattern: 'INTERVALS',
    difficulty: 'EASY',
    statement:
      'Alice and Bob each have a vacation range given as "MM-DD" strings (same year). Return the number of days they are both on vacation at the same time.\n\nExample: arriveAlice="08-15", leaveAlice="08-18", arriveBob="08-16", leaveBob="08-19" → 3\nExample: arriveAlice="10-01", leaveAlice="10-31", arriveBob="11-01", leaveBob="12-31" → 0',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Find the overlap of the two date intervals: overlap_start = max(arriveAlice, arriveBob); overlap_end = min(leaveAlice, leaveBob).',
      },
      {
        level: 2,
        content:
          'Convert "MM-DD" to day-of-year (use a days-per-month prefix sum). overlap_start=max(alice_start,bob_start); overlap_end=min(alice_end,bob_end). Return max(0, overlap_end - overlap_start + 1). O(1).',
      },
    ],
  },

  {
    title: 'Maximum Population Year',
    slug: 'maximum-population-year',
    pattern: 'INTERVALS',
    difficulty: 'EASY',
    statement:
      'logs[i]=[birth, death]. A person is alive during [birth, death-1] inclusive. Return the earliest year with the maximum population.\n\nExample: logs=[[1993,1999],[2000,2010]] → 1993\nExample: logs=[[1950,1961],[1960,1971],[1970,1981]] → 1960',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use a difference array. Increment at each birth year, decrement at each death year, then take a prefix sum to find the population at each year.',
      },
      {
        level: 2,
        content:
          'diff[birth]++, diff[death]-- for each person (years 1950..2050). Compute prefix sums. Return the year of the maximum value (earliest on tie). O(n + range).',
      },
    ],
  },

  {
    title: 'Points That Intersect With Cars',
    slug: 'points-that-intersect-with-cars',
    pattern: 'INTERVALS',
    difficulty: 'EASY',
    statement:
      'nums[i]=[start, end] represents a car covering that segment on a number line. Return the number of integer points covered by at least one car.\n\nExample: nums=[[3,6],[1,5],[4,7]] → 7\nExample: nums=[[1,3],[5,8]] → 7',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Merge all overlapping intervals, then count the total number of integers covered (sum of merged interval lengths).',
      },
      {
        level: 2,
        content:
          'Sort by start. Merge: track [cur_start, cur_end]. For each interval: if start<=cur_end: cur_end=max(cur_end,end). Else: total+=cur_end-cur_start+1, start new. Add final interval. O(n log n).',
      },
    ],
  },

  {
    title: 'Missing Ranges',
    slug: 'missing-ranges',
    pattern: 'INTERVALS',
    difficulty: 'EASY',
    statement:
      'Given a sorted unique integer array and bounds [lower, upper], return the list of inclusive ranges of integers in [lower, upper] that are missing from nums.\n\nExample: nums=[0,1,3,50,75], lower=0, upper=99 → ["2","4->49","51->74","76->99"]\nExample: nums=[], lower=1, upper=1 → ["1"]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Check the gap before the first element, between each pair of consecutive elements, and after the last element — all relative to [lower, upper].',
      },
      {
        level: 2,
        content:
          'Treat the sequence as [lower-1] + nums + [upper+1]. For each consecutive pair (prev, curr): if curr-prev>=2: gap is [prev+1, curr-1]. Format as "a" or "a->b". O(n).',
      },
    ],
  },

  {
    title: 'Count Days Without Meetings',
    slug: 'count-days-without-meetings',
    pattern: 'INTERVALS',
    difficulty: 'EASY',
    statement:
      'You have n workdays (1..n inclusive). meetings[i]=[start, end] (inclusive). Return the number of days with no meetings scheduled.\n\nExample: n=10, meetings=[[5,7],[1,3],[9,10]] → 2\nExample: n=5, meetings=[[2,4],[1,3]] → 1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Merge overlapping meetings into non-overlapping intervals, then count the days not covered within [1, n].',
      },
      {
        level: 2,
        content:
          'Sort by start. Merge overlapping intervals. covered_days = sum of (end-start+1) for each merged interval (clamped to [1,n]). Return n - covered_days. O(n log n).',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Merge Intervals',
    slug: 'merge-intervals',
    pattern: 'INTERVALS',
    difficulty: 'MEDIUM',
    statement:
      'Given an array of intervals, merge all overlapping intervals and return a non-overlapping array that covers all input intervals.\n\nExample: intervals=[[1,3],[2,6],[8,10],[15,18]] → [[1,6],[8,10],[15,18]]\nExample: intervals=[[1,4],[4,5]] → [[1,5]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort by start time. After sorting, you only need to compare each interval with the last merged one.',
      },
      {
        level: 2,
        content:
          'Sort by start. result=[intervals[0]]. For each [s,e]: if s<=result[-1][1]: result[-1][1]=max(result[-1][1],e). Else: result.append([s,e]). O(n log n).',
      },
      {
        level: 3,
        content:
          'After sorting, overlap is detected when the next start ≤ current end. Updating end to max(current_end, next_end) handles fully-contained intervals. No need to compare non-adjacent pairs after sorting.',
      },
    ],
  },

  {
    title: 'Insert Interval',
    slug: 'insert-interval',
    pattern: 'INTERVALS',
    difficulty: 'MEDIUM',
    statement:
      'Given sorted non-overlapping intervals and a newInterval, insert it and merge as needed. Return the resulting intervals.\n\nExample: intervals=[[1,3],[6,9]], newInterval=[2,5] → [[1,5],[6,9]]\nExample: intervals=[[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval=[4,8] → [[1,2],[3,10],[12,16]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Three phases: collect intervals ending before newInterval starts, merge all overlapping intervals into newInterval, collect remaining intervals.',
      },
      {
        level: 2,
        content:
          'result=[]; i=0. Phase 1: while i<n and intervals[i][1]<new[0]: append, i++. Phase 2: while i<n and intervals[i][0]<=new[1]: new=[min,max]; i++. Append new. Phase 3: append rest. O(n).',
      },
      {
        level: 3,
        content:
          'An interval is fully before newInterval if end<new.start. An interval overlaps if start≤new.end. Merge by updating newInterval to [min(starts), max(ends)]. This is O(n) with no sorting needed since input is already sorted.',
      },
    ],
  },

  {
    title: 'Meeting Rooms II',
    slug: 'meeting-rooms-ii',
    pattern: 'INTERVALS',
    difficulty: 'MEDIUM',
    statement:
      'Given meeting time intervals [start, end], return the minimum number of conference rooms required to hold all meetings simultaneously.\n\nExample: intervals=[[0,30],[5,10],[15,20]] → 2\nExample: intervals=[[7,10],[2,4]] → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'When a new meeting starts, check if any existing meeting has already ended. A min-heap of end times tracks when rooms become available.',
      },
      {
        level: 2,
        content:
          'Sort by start. Min-heap of end times. For each [s,e]: if heap non-empty and heap[0]<=s: heapreplace(heap,e) (reuse room). Else heappush(heap,e). Return len(heap). O(n log n).',
      },
      {
        level: 3,
        content:
          'The heap holds the end times of all currently occupied rooms. Comparing the earliest end time to the new start tells you whether a room is free. len(heap) at the end equals the maximum simultaneous overlap, which is the minimum rooms needed.',
      },
    ],
  },

  {
    title: 'Interval List Intersections',
    slug: 'interval-list-intersections',
    pattern: 'INTERVALS',
    difficulty: 'MEDIUM',
    statement:
      'Given two sorted lists of non-overlapping intervals, return their intersection.\n\nExample: firstList=[[0,2],[5,10],[13,23],[24,25]], secondList=[[1,5],[8,12],[15,24],[25,26]] → [[1,2],[5,5],[8,10],[15,23],[24,24],[25,25]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Two pointers, one per list. Two intervals intersect when max(starts) ≤ min(ends). Advance the pointer with the earlier end time.',
      },
      {
        level: 2,
        content:
          'i=j=0. While i<len(A) and j<len(B): lo=max(A[i][0],B[j][0]); hi=min(A[i][1],B[j][1]). If lo<=hi: append [lo,hi]. If A[i][1]<B[j][1]: i++ else j++. O(m+n).',
      },
      {
        level: 3,
        content:
          'After processing a potential intersection, you can discard the interval that ends first — it cannot intersect any future interval in the other list. The two-pointer invariant: both pointers always reference the only pair worth comparing next.',
      },
    ],
  },

  {
    title: 'My Calendar I',
    slug: 'my-calendar-i',
    pattern: 'INTERVALS',
    difficulty: 'MEDIUM',
    statement:
      'Implement a booking system. book(start, end) books a half-open interval [start, end) and returns true if it does not double-book (overlap any existing booking), otherwise returns false.\n\nExample: book(10,20)→true; book(15,25)→false; book(20,30)→true',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Maintain a sorted list of booked intervals. For each new booking, check if it overlaps any existing interval.',
      },
      {
        level: 2,
        content:
          'Two intervals [a,b) and [c,d) overlap iff a<d and c<b. Maintain a sorted list; use bisect to find the predecessor and successor. Check overlap with at most two neighbors. O(log n) check, O(n) insertion.',
      },
      {
        level: 3,
        content:
          'After finding the insertion position via bisect, check the predecessor (if any) and the successor (if any). Predecessor overlaps if pred.end > start. Successor overlaps if succ.start < end. No other interval can overlap since the list is sorted and non-overlapping.',
      },
    ],
  },

  {
    title: 'My Calendar II',
    slug: 'my-calendar-ii',
    pattern: 'INTERVALS',
    difficulty: 'MEDIUM',
    statement:
      'Implement a booking system where triple-booking is not allowed. book(start, end) returns true if the event can be added without causing a triple-booking.\n\nExample: book(10,20)→true; book(50,60)→true; book(10,40)→true; book(5,15)→false; book(5,10)→true; book(25,55)→true',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Track doubly-booked intervals separately. A new event is only valid if it does not overlap any doubly-booked interval.',
      },
      {
        level: 2,
        content:
          'Maintain singles and doubles lists. For book(s,e): if any [a,b] in doubles overlaps [s,e]: return False. For each [a,b] in singles: if overlap, add intersection [max(s,a),min(e,b)] to doubles. Append [s,e] to singles. Return True. O(n) per call.',
      },
      {
        level: 3,
        content:
          'The intersection of the new event with each existing single is a region that will now be doubly booked. If any part of this new double overlaps an existing double, it would become triple — block the booking. The key: only intersections of the new event with singles form candidates for the doubles list.',
      },
    ],
  },

  {
    title: 'Find Right Interval',
    slug: 'find-right-interval',
    pattern: 'INTERVALS',
    difficulty: 'MEDIUM',
    statement:
      'For each interval, find the index of the interval with the smallest start ≥ the current interval\'s end. Return -1 if none exists. All start points are distinct.\n\nExample: intervals=[[1,2]] → [-1]\nExample: intervals=[[3,4],[2,3],[1,2]] → [-1,0,1]\nExample: intervals=[[1,4],[2,3],[3,4]] → [-1,2,-1]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each interval\'s end, binary search for the smallest start value that is ≥ that end. Sort starts while preserving original indices.',
      },
      {
        level: 2,
        content:
          'Build sorted list of (start, index). For each interval [s,e]: bisect_left for e in starts. If valid position found: record its index; else -1. O(n log n).',
      },
      {
        level: 3,
        content:
          'bisect_left returns the insertion point for e in the sorted starts array. If that position is within bounds, the element at that position is the smallest start ≥ e. Since all starts are distinct, this is unambiguous. Store (start, original_index) pairs to map back after sorting.',
      },
    ],
  },

  {
    title: 'Remove Covered Intervals',
    slug: 'remove-covered-intervals',
    pattern: 'INTERVALS',
    difficulty: 'MEDIUM',
    statement:
      'Given intervals, remove all intervals that are covered by another (interval [a,b] is covered by [c,d] if c≤a and b≤d). Return the number of remaining intervals.\n\nExample: intervals=[[1,4],[3,6],[2,8]] → 2\nExample: intervals=[[1,4],[2,3]] → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort by start ascending, then by end descending for ties. After sorting, an interval is covered if its end ≤ the maximum end seen so far.',
      },
      {
        level: 2,
        content:
          'Sort: primary asc by start, secondary desc by end. max_end=0, count=0. For each [s,e]: if e>max_end: count++; max_end=e. Return count. O(n log n).',
      },
      {
        level: 3,
        content:
          'Sorting end descending for equal starts ensures a larger interval comes before a smaller one that it covers — the larger one increments count; the smaller one does not (its end ≤ max_end). For different starts, max_end tracks the rightmost seen; if current end ≤ max_end, it\'s completely covered.',
      },
    ],
  },

  {
    title: 'Maximum Number of Events That Can Be Attended',
    slug: 'maximum-number-of-events-that-can-be-attended',
    pattern: 'INTERVALS',
    difficulty: 'MEDIUM',
    statement:
      'You can attend each event on exactly one of its available days [start, end] (one event per day). Maximize the number of events attended.\n\nExample: events=[[1,2],[2,3],[3,4]] → 3\nExample: events=[[1,2],[2,3],[3,4],[1,2]] → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'On each day, attend the event that ends soonest — this frees up future days for other events. Use a min-heap of end times to track available events.',
      },
      {
        level: 2,
        content:
          'Sort events by start. Min-heap of end times. For day d from 1..max_day: push all events starting on d. Pop expired events (end<d). If heap: pop min-end event, attend++. O(D log n) where D = max day.',
      },
      {
        level: 3,
        content:
          'Advancing day by day and attending the earliest-ending available event is optimal: a later-ending event is always equally or more deferrable. The heap efficiently maintains available events as days advance. Expired events (end<current_day) are discarded.',
      },
    ],
  },

  {
    title: 'Count Ways to Group Overlapping Ranges',
    slug: 'count-ways-to-group-overlapping-ranges',
    pattern: 'INTERVALS',
    difficulty: 'MEDIUM',
    statement:
      'Given ranges, split them into two groups such that no two ranges in the same group overlap (touching ranges [a,b] and [b,c] are considered overlapping). Return the number of valid ways mod 10^9+7.\n\nExample: ranges=[[6,10],[5,15]] → 2\nExample: ranges=[[1,3],[10,20],[2,5],[4,8]] → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Find the connected components of overlapping ranges (as in Merge Intervals). Each component is independent and can go into either group.',
      },
      {
        level: 2,
        content:
          'Sort by start. Count connected components by merging overlapping ranges (same logic as Merge Intervals). Answer = 2^(number_of_components) mod 10^9+7. O(n log n).',
      },
      {
        level: 3,
        content:
          'Each merged group is an independent component — its ranges must be split between the two groups but do not constrain any other component. Each component independently multiplies the answer by 2. Use fast exponentiation: pow(2, components, 10**9+7).',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'The Skyline Problem',
    slug: 'the-skyline-problem',
    pattern: 'INTERVALS',
    difficulty: 'HARD',
    statement:
      'Given buildings[i]=[left, right, height], compute the skyline as a list of [x, height] key points where the outline height changes.\n\nExample: buildings=[[2,9,10],[3,7,15],[5,12,12],[15,20,10],[19,24,8]] → [[2,10],[3,15],[7,12],[12,0],[15,10],[20,8],[24,0]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Process building edges as events. At each x-coordinate, the skyline height equals the maximum height among all active buildings.',
      },
      {
        level: 2,
        content:
          'Events: (left, -h) for start, (right, h) for end. Sort by x (ties: starts before ends; taller starts before shorter starts). Use a max-heap with lazy deletion. After each event, if max height changed: emit key point. O(n log n).',
      },
      {
        level: 3,
        content:
          'Encode starts as negative heights so they sort before ends at the same x. Max-heap (negate heights for Python min-heap) + lazy deletion: when popping, skip heights no longer active (track active heights in a counter). Emit [x, current_max] only when max changes from the previous value. Multiple events at the same x produce a single key point.',
      },
    ],
  },

  {
    title: 'Range Module',
    slug: 'range-module',
    pattern: 'INTERVALS',
    difficulty: 'HARD',
    statement:
      'Design a data structure to track ranges of numbers. addRange(left, right): marks [left, right) as tracked. removeRange(left, right): unmarks [left, right). queryRange(left, right): returns true if every integer in [left, right) is tracked.\n\nExample: addRange(10,20); removeRange(14,16); queryRange(10,14)→true; queryRange(13,15)→false; queryRange(16,17)→true',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Maintain a sorted list of disjoint half-open intervals. addRange and removeRange require merging or splitting existing intervals at the operation boundaries.',
      },
      {
        level: 2,
        content:
          'Use a sorted structure keyed on interval start. addRange: find all intervals overlapping [left,right), compute merged union, replace them. removeRange: trim or split overlapping intervals. queryRange: find any single interval that fully contains [left,right). O(n) worst case per op; O(log n + k) with balanced BST.',
      },
      {
        level: 3,
        content:
          'For addRange(l,r): find the first interval with start>l; check the one before it too. Expand l=min(l,overlapping_starts), r=max(r,overlapping_ends). Delete all overlapping, insert [l,r]. For removeRange(l,r): preserve non-removed portions as up to two new intervals at the edges. queryRange: binary search for the interval with largest start ≤ left; check if its end ≥ right.',
      },
    ],
  },

  {
    title: 'Employee Free Time',
    slug: 'employee-free-time',
    pattern: 'INTERVALS',
    difficulty: 'HARD',
    statement:
      'Given a list of employees\' schedules (each a sorted list of [start, end] intervals), return a sorted list of finite intervals representing the free time common to all employees.\n\nExample: schedule=[[[1,3],[6,7]],[[2,4]],[[2,5],[9,12]]] → [[5,6],[7,9]]\nExample: schedule=[[[1,3],[6,7]],[[2,4]],[[3,5],[8,10]]] → [[6,8]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Flatten all employees\' intervals into one list, sort them, merge overlapping intervals (like LeetCode 56), then return the gaps between merged intervals.',
      },
      {
        level: 2,
        content:
          'Flatten all intervals. Sort by start. Merge overlapping intervals. Gaps between consecutive merged intervals [a,b] and [c,d] (where b<c) = [b,c]. Return those gaps. O(n log n).',
      },
      {
        level: 3,
        content:
          'The free time is the complement of the union of all working intervals within the overall time range. Merge intervals find the union. Gaps between merged intervals (not at the very beginning or end) are the free time slots. No employee distinction matters — any covered second is not free time.',
      },
    ],
  },

  {
    title: 'My Calendar III',
    slug: 'my-calendar-iii',
    pattern: 'INTERVALS',
    difficulty: 'HARD',
    statement:
      'Implement a calendar that returns the maximum number of simultaneous bookings after each new booking.\n\nExample: book(10,20)→1; book(50,60)→1; book(10,40)→2; book(5,15)→3; book(5,10)→3; book(25,55)→3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a difference array on the timeline. Each booking increments the count at start and decrements it at end. The maximum running prefix sum is the answer.',
      },
      {
        level: 2,
        content:
          'Sorted map (TreeMap/SortedDict): diff[start]+=1, diff[end]-=1. After each booking, scan all keys in order, track running sum. Return the max running sum. O(n) per booking; O(n²) total.',
      },
      {
        level: 3,
        content:
          'The difference array on a sorted map handles arbitrary time points without a fixed range. The running prefix sum at any key represents the number of active bookings at that moment. A segment tree with lazy propagation gives O(log n) per booking; for interview purposes, the sorted-map approach is O(n) per call but simpler.',
      },
    ],
  },

  {
    title: 'Minimum Interval to Include Each Query',
    slug: 'minimum-interval-to-include-each-query',
    pattern: 'INTERVALS',
    difficulty: 'HARD',
    statement:
      'Given intervals and queries, for each query find the size (right-left+1) of the smallest interval containing the query value. Return -1 if none.\n\nExample: intervals=[[1,4],[2,4],[3,6],[4,4]], queries=[2,3,4,5] → [3,3,1,4]\nExample: intervals=[[2,3],[2,5],[1,8],[20,25]], queries=[2,19,5,22] → [2,-1,4,6]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort queries and intervals by start. Use a heap to track active intervals by size. For each query, push newly eligible intervals and pop expired ones.',
      },
      {
        level: 2,
        content:
          'Sort queries with original indices. Sort intervals by start. Min-heap of (size, end). For each query q: push all intervals with start≤q (size=end-start+1). Pop while heap[0][1]<q. ans[idx]=heap[0][0] if heap else -1. O((n+m) log n).',
      },
      {
        level: 3,
        content:
          'Heap key is size (not end) so the smallest interval is always at the top. Lazy deletion of expired intervals (end<q) avoids pre-computing which intervals are valid for each query. Sorting queries enables a single left-to-right sweep through intervals, adding them as their start becomes reachable.',
      },
    ],
  },

  {
    title: 'Meeting Rooms III',
    slug: 'meeting-rooms-iii',
    pattern: 'INTERVALS',
    difficulty: 'HARD',
    statement:
      'n rooms numbered 0..n-1. Sort meetings by start. Each meeting is assigned the lowest available room number; if none is free, it waits until the earliest room frees (extending its end by the wait). Return the room that held the most meetings (lowest index on tie).\n\nExample: n=2, meetings=[[0,10],[1,5],[2,7],[3,4]] → 0\nExample: n=3, meetings=[[1,20],[2,10],[3,5],[4,9],[6,8]] → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Two heaps: a min-heap of available room numbers, and a min-heap of (end_time, room_number) for occupied rooms. Process meetings in start-time order.',
      },
      {
        level: 2,
        content:
          'Sort meetings by start. available=min-heap(0..n-1), occupied=min-heap of (end, room). For each [s,e]: release all rooms from occupied with end<=s into available. If available: room=heappop(available), new_end=e. Else: end_,room=heappop(occupied); new_end=end_+(e-s). heappush(occupied,(new_end,room)); count[room]++. O(m log n).',
      },
      {
        level: 3,
        content:
          'When no room is free, the meeting is delayed — it starts when the earliest room becomes available and runs for the same duration, so new_end = freed_time + duration. The occupied heap sorted by (end, room) picks the earliest room with the smallest number on ties. count[] tallies meetings per room; return argmax(count).',
      },
    ],
  },

  {
    title: 'Maximum Number of Events That Can Be Attended II',
    slug: 'maximum-number-of-events-that-can-be-attended-ii',
    pattern: 'INTERVALS',
    difficulty: 'HARD',
    statement:
      'Attend at most k events (no two can overlap, touching is fine). events[i]=[start, end, value]. Maximize the total value.\n\nExample: events=[[1,2,4],[3,4,3],[2,3,1]], k=2 → 7\nExample: events=[[1,2,4],[3,4,3],[2,3,10]], k=2 → 10\nExample: events=[[1,1,1],[2,2,2],[3,3,3],[4,4,4]], k=3 → 9',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'DP: sort by end time. dp[i][j] = max value attending j events from the first i. For each event, either skip it or attend it (binary search for the last non-overlapping event).',
      },
      {
        level: 2,
        content:
          'Sort by end. dp[i][j]=max(dp[i-1][j], dp[p][j-1]+events[i].value) where p = last index with end < events[i].start (binary search on ends array). Return dp[n][k]. O(nk log n).',
      },
      {
        level: 3,
        content:
          'This is weighted interval scheduling extended to k selections. bisect_left(ends, events[i][0]) finds the last event that ends strictly before the current event starts. dp[i][j] transitions are O(log n) per state; total O(nk log n). Space can be reduced to O(n) with rolling arrays.',
      },
    ],
  },

  {
    title: 'Data Stream as Disjoint Intervals',
    slug: 'data-stream-as-disjoint-intervals',
    pattern: 'INTERVALS',
    difficulty: 'HARD',
    statement:
      'Design a data structure that accepts a stream of integers and returns a sorted list of disjoint intervals containing all integers seen so far.\n\nExample: addNum(1)→[[1,1]]; addNum(3)→[[1,1],[3,3]]; addNum(7)→[[1,1],[3,3],[7,7]]; addNum(2)→[[1,3],[7,7]]; addNum(6)→[[1,3],[6,7]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'When adding n, check if it extends an existing interval on the left (n==end+1), the right (n==start-1), or merges two adjacent ones. Otherwise create a new [n,n].',
      },
      {
        level: 2,
        content:
          'Use a sorted structure of intervals. For addNum(n): find intervals with start==n+1 (right neighbor) and end==n-1 (left neighbor). Merge: new_start=min(n, left.start if exists else n), new_end=max(n, right.end if exists else n). Remove neighbors, insert new interval. O(log n) per add with SortedList.',
      },
      {
        level: 3,
        content:
          'Four cases for n: (1) standalone [n,n]; (2) extends left neighbor: [left.start, n]; (3) extends right neighbor: [n, right.end]; (4) bridges both: [left.start, right.end]. A SortedDict keyed by start supports O(log n) predecessor/successor queries to detect neighbors at n-1 and n+1.',
      },
    ],
  },

  {
    title: 'Minimum Time to Complete All Tasks',
    slug: 'minimum-time-to-complete-all-tasks',
    pattern: 'INTERVALS',
    difficulty: 'HARD',
    statement:
      'tasks[i]=[start, end, duration]. The computer must be on for exactly duration seconds within [start, end] for task i. Minimize total on-time (seconds the computer is running).\n\nExample: tasks=[[2,3,1],[4,5,1],[1,5,2]] → 2\nExample: tasks=[[1,3,2],[2,5,3],[5,6,2]] → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort by end time. For each task, greedily use already-on seconds first, then turn on additional seconds starting from the end of the interval (to maximize future reuse).',
      },
      {
        level: 2,
        content:
          'Sort by end. Maintain a boolean run[] array. For each [s,e,d]: count already-on seconds in [s,e]. If count<d: turn on (d-count) more seconds from the right side of [s,e], setting run[t]=True. Count total True values in run[]. O(n²) with linear scan; O(n log n) with segment tree.',
      },
      {
        level: 3,
        content:
          'Sorting by end is essential: greedily completing tasks by deadline minimizes conflict. Choosing the latest possible seconds within [start, end] maximizes overlap with future tasks (which have later end times). A segment tree with lazy propagation provides O(log n) range-count and range-set, giving O(n log n) overall.',
      },
    ],
  },

  {
    title: 'Maximum Profit in Job Scheduling',
    slug: 'maximum-profit-in-job-scheduling',
    pattern: 'INTERVALS',
    difficulty: 'HARD',
    statement:
      'Given jobs with [startTime, endTime, profit], select non-overlapping jobs to maximize total profit.\n\nExample: startTime=[1,2,3,3], endTime=[3,4,5,6], profit=[50,10,40,70] → 120\nExample: startTime=[1,2,3,4,6], endTime=[3,5,10,6,9], profit=[20,20,100,70,60] → 150',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'DP sorted by end time. For each job, either skip it or take it and add the best profit achievable from all jobs ending at or before its start.',
      },
      {
        level: 2,
        content:
          'Sort by end. dp[i]=max profit using a subset of first i jobs. For job i: p=bisect_right(ends, start[i])-1 (last job compatible with job i). dp[i]=max(dp[i-1], dp[p]+profit[i]). Return dp[n]. O(n log n).',
      },
      {
        level: 3,
        content:
          'dp[i] is non-decreasing (skipping is always an option). bisect_right(ends, start[i]) finds the count of jobs ending ≤ start[i], so dp[p] is the best value without conflicting with job i. The transition is O(log n) per state. This is the standard weighted interval scheduling DP.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 11 — INTERVALS (30 problems)...\n');

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
