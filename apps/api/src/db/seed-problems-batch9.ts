import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 9 — HEAP (29 problems: 10 Easy, 9 Medium, 10 Hard)
// Already seeded: Kth Largest Element in an Array (Medium)
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
    title: 'Last Stone Weight',
    slug: 'last-stone-weight',
    pattern: 'HEAP',
    difficulty: 'EASY',
    statement:
      'Smash the two heaviest stones. If they weigh y ≥ x: if x==y both are destroyed; else one stone of weight y−x remains. Return the weight of the last stone, or 0 if none remain.\n\nExample: stones=[2,7,4,1,8,1] → 1\nExample: stones=[1] → 1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'You always need the two heaviest stones. A max-heap lets you extract the two largest in O(log n) and reinsert the remainder in O(log n).',
      },
      {
        level: 2,
        content:
          'Max-Heap (use negated values in Python\'s min-heap). While heap has ≥ 2 elements: pop y and x (largest two). If y>x: push y-x. Return heap[0] if non-empty else 0. O(n log n).',
      },
    ],
  },

  {
    title: 'Kth Largest Element in a Stream',
    slug: 'kth-largest-element-in-a-stream',
    pattern: 'HEAP',
    difficulty: 'EASY',
    statement:
      'Design a class to find the kth largest element in a stream. add(val) adds val and returns the current kth largest.\n\nExample: KthLargest(3,[4,5,8,2]); add(3)→4; add(5)→5; add(10)→5; add(9)→8; add(4)→8',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Maintain a min-heap of the k largest elements seen so far. The heap root is always the kth largest. When a new value is larger than the root, replace it.',
      },
      {
        level: 2,
        content:
          'Min-Heap of size k. __init__: heapify nums, trim to k. add(val): heappush(val); if len>k: heappop(). return heap[0]. O(log k) per add. The root of a size-k min-heap is by definition the kth largest element.',
      },
    ],
  },

  {
    title: 'Relative Ranks',
    slug: 'relative-ranks',
    pattern: 'HEAP',
    difficulty: 'EASY',
    statement:
      'Given an integer array score, return the ranks. 1st place → "Gold Medal", 2nd → "Silver Medal", 3rd → "Bronze Medal", others → their rank as a string.\n\nExample: score=[5,4,3,2,1] → ["Gold Medal","Silver Medal","Bronze Medal","4","5"]\nExample: score=[10,3,8,9,4] → ["Gold Medal","5","Bronze Medal","Silver Medal","4"]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Sort by score descending, keeping track of original indices. The first sorted index gets "Gold Medal", second gets "Silver Medal", etc.',
      },
      {
        level: 2,
        content:
          'Sort indices by score descending. result=[""]*n. For rank,idx in enumerate(sorted_indices): result[idx]="Gold Medal" if rank==0 else "Silver Medal" if rank==1 else "Bronze Medal" if rank==2 else str(rank+1). Return result. A heap-sort or sorted() both work in O(n log n).',
      },
    ],
  },

  {
    title: 'Sort Array by Increasing Frequency',
    slug: 'sort-array-by-increasing-frequency',
    pattern: 'HEAP',
    difficulty: 'EASY',
    statement:
      'Sort integers in increasing order of frequency. Ties are broken by decreasing value.\n\nExample: nums=[1,1,2,2,2,3] → [3,1,1,2,2,2]\nExample: nums=[2,3,1,3,2] → [1,3,3,2,2]\nExample: nums=[-1,1,-6,4,5,-6,1,4,1] → [5,-1,4,4,-6,-6,1,1,1]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Count frequency of each number. Sort by (frequency ascending, value descending) as the comparator, then rebuild the array by repeating each number its frequency times.',
      },
      {
        level: 2,
        content:
          'count=Counter(nums). Return sorted(nums, key=lambda x:(count[x],-x)). Python\'s sort is stable and handles the tie-break (−x sorts higher values first within the same frequency). O(n log n).',
      },
    ],
  },

  {
    title: 'Maximum Product of Two Elements in an Array',
    slug: 'maximum-product-of-two-elements-in-array',
    pattern: 'HEAP',
    difficulty: 'EASY',
    statement:
      'Given array nums, return the maximum value of (nums[i]-1)*(nums[j]-1) where i≠j.\n\nExample: nums=[3,4,5,2] → 12 ((5-1)*(4-1)=12)\nExample: nums=[1,5,4,5] → 16 ((5-1)*(5-1)=16)\nExample: nums=[3,7] → 12',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'The maximum product comes from the two largest elements. You only need the top 2 values — a full sort or a max-heap extraction of size 2 both work.',
      },
      {
        level: 2,
        content:
          'Find the two largest values. first=second=0. For n in nums: if n>=first: second=first; first=n. elif n>second: second=n. Return (first-1)*(second-1). O(n) single pass — no heap needed, but heapq.nlargest(2, nums) also works in O(n).',
      },
    ],
  },

  {
    title: 'Keep Multiplying Found Values by Two',
    slug: 'keep-multiplying-found-values-by-two',
    pattern: 'HEAP',
    difficulty: 'EASY',
    statement:
      'Given an array nums and an integer original: if original is in nums, multiply it by 2 and repeat. Return the final value.\n\nExample: nums=[5,3,6,1,12], original=3 → 24 (3→6→12→24)\nExample: nums=[2,7,9], original=4 → 4',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Convert nums to a set for O(1) lookup. Repeatedly double original as long as it exists in the set.',
      },
      {
        level: 2,
        content:
          'num_set=set(nums). While original in num_set: original*=2. Return original. O(n) to build set, O(log(max_val)) doubling steps. No heap needed — set membership is the key operation.',
      },
    ],
  },

  {
    title: 'The K Weakest Rows in a Matrix',
    slug: 'the-k-weakest-rows-in-a-matrix',
    pattern: 'HEAP',
    difficulty: 'EASY',
    statement:
      'Each row of a binary matrix has all 1s before all 0s. The strength of a row is its count of 1s. Return indices of the k weakest rows in order (ties: smaller index first).\n\nExample: mat=[[1,1,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,1,0,0,0],[1,1,1,1,1]], k=3 → [2,0,3]\nExample: mat=[[1,0,0,0],[1,1,1,1],[1,0,0,0],[1,0,0,0]], k=2 → [0,2]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Count soldiers (1s) per row using binary search (rows are sorted). Then return indices of the k rows with fewest soldiers, breaking ties by index.',
      },
      {
        level: 2,
        content:
          'strength=[(bisect_right(row,1)-bisect_left(row,1), i) for i,row in enumerate(mat)]. Return [i for _,i in heapq.nsmallest(k, strength)]. bisect gives O(log n) per row. heapq.nsmallest is O(m log k). Since rows have all 1s then 0s, sum(row) also works in O(n) per row.',
      },
    ],
  },

  {
    title: 'Make Array Zero by Subtracting Equal Amounts',
    slug: 'make-array-zero-by-subtracting-equal-amounts',
    pattern: 'HEAP',
    difficulty: 'EASY',
    statement:
      'In each operation, choose a positive integer x and subtract x from every positive element. Return the minimum number of operations to make all elements zero.\n\nExample: nums=[1,5,0,3,5] → 3 (subtract 1→[0,4,0,2,4]; subtract 2→[0,2,0,0,2]; subtract 2→all zero)\nExample: nums=[0] → 0',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Each operation reduces all positive elements by the same amount. The number of operations equals the number of distinct positive values — each unique positive number requires a dedicated "step" to be eliminated.',
      },
      {
        level: 2,
        content:
          'Return len(set(n for n in nums if n>0)). Each operation peels off one distinct value layer (like peeling an onion). No heap needed — a set suffices. O(n).',
      },
    ],
  },

  {
    title: 'Find Subsequence of Length K With the Largest Sum',
    slug: 'find-subsequence-of-length-k-with-largest-sum',
    pattern: 'HEAP',
    difficulty: 'EASY',
    statement:
      'Given an integer array nums and integer k, find a subsequence of length k with the maximum sum while preserving original relative order.\n\nExample: nums=[2,1,3,3], k=2 → [3,3]\nExample: nums=[-1,-2,3,4], k=3 → [-1,3,4]\nExample: nums=[3,4,3,3], k=2 → [4,3]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Find the k largest values (by value). Then output them in their original index order. Use a heap to find top-k indices efficiently.',
      },
      {
        level: 2,
        content:
          'top_k=set(i for i,_ in heapq.nlargest(k, enumerate(nums), key=lambda x:x[1])). Return [nums[i] for i in range(n) if i in top_k]. O(n log k). When values tie, heapq.nlargest picks leftmost — if you need rightmost for ties, sort by (val, -idx).',
      },
    ],
  },

  {
    title: 'Maximize Sum of Array After K Negations',
    slug: 'maximize-sum-of-array-after-k-negations',
    pattern: 'HEAP',
    difficulty: 'EASY',
    statement:
      'Given an integer array nums and integer k, choose any element k times and negate it. Return the maximum sum after exactly k operations.\n\nExample: nums=[4,2,3], k=1 → 5 (negate 2 → [4,-2,3]? No — negate 2 costs 4+(-2)+3=5; negate smallest positive is optimal)\nExample: nums=[2,-3,-1,5,-4], k=2 → 13 (negate -4 then -3)\nExample: nums=[-8,3,-5,-3,-5,-2], k=6 → 22',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Greedy with a min-heap: always negate the smallest (most negative) element. After all negatives are turned positive, if k is still odd, negate the smallest element repeatedly (which changes nothing if applied twice).',
      },
      {
        level: 2,
        content:
          'heapify(nums). For _ in range(k): heapreplace(heap, -heap[0]). Return sum(heap). Each operation negates the current minimum. Once all negatives are gone, the remaining odd negations just flip the smallest positive twice (net zero), except when k is odd — then subtract 2*min once. O(n + k log n).',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Top K Frequent Words',
    slug: 'top-k-frequent-words',
    pattern: 'HEAP',
    difficulty: 'MEDIUM',
    statement:
      'Given a string array words and integer k, return the k most frequent words sorted by frequency descending. Ties are broken by lexicographic order ascending.\n\nExample: words=["i","love","leetcode","i","love","coding"], k=2 → ["i","love"]\nExample: words=["the","day","is","sunny","the","the","the","sunny","is","is"], k=4 → ["the","is","sunny","day"]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Count frequencies. Then extract top k by (frequency desc, word asc). A heap of size k with custom comparison, or sort with a compound key, both work. What tuple represents "higher frequency, earlier alphabetically"?',
      },
      {
        level: 2,
        content:
          'Custom-compare heap. Use (-freq, word) as key — more frequent words have smaller negated frequency (heap naturally orders smallest first); ties on word are lexicographic. heapq.nsmallest(k, count.items(), key=lambda x:(-x[1],x[0])). Return [word for word,_ in result].',
      },
      {
        level: 3,
        content:
          'from collections import Counter; import heapq. count=Counter(words). return [w for w,_ in heapq.nsmallest(k, count.items(), key=lambda x:(-x[1],x[0]))]. Alternatively: sorted(count.keys(), key=lambda w:(-count[w],w))[:k]. Both O(n log k). The (-freq, word) key handles both sort dimensions in one tuple.',
      },
    ],
  },

  {
    title: 'K Closest Points to Origin',
    slug: 'k-closest-points-to-origin',
    pattern: 'HEAP',
    difficulty: 'MEDIUM',
    statement:
      'Given an array of points on a 2D plane, return the k points closest to the origin (0,0). Return in any order.\n\nExample: points=[[1,3],[-2,2]], k=1 → [[-2,2]]\nExample: points=[[3,3],[5,-1],[-2,4]], k=2 → [[3,3],[-2,4]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Distance² = x²+y² (no need for sqrt). Find k smallest distances. A max-heap of size k, quickselect, or simply sorting all points by distance — all are valid approaches.',
      },
      {
        level: 2,
        content:
          'Max-Heap of size k. For each point: compute dist²=x²+y². Push (-dist², point). If heap size > k: pop (removing the farthest). Final heap contains k closest. O(n log k). Or: return sorted(points, key=lambda p:p[0]**2+p[1]**2)[:k] — O(n log n) but simpler.',
      },
      {
        level: 3,
        content:
          'import heapq. heap=[]. For x,y in points: d=x*x+y*y. heapq.heappush(heap,(-d,[x,y])). if len(heap)>k: heapq.heappop(heap). Return [p for _,p in heap]. Quickselect (like numpy.partition) gives O(n) average and is the optimal approach for large inputs.',
      },
    ],
  },

  {
    title: 'Find K Pairs with Smallest Sums',
    slug: 'find-k-pairs-with-smallest-sums',
    pattern: 'HEAP',
    difficulty: 'MEDIUM',
    statement:
      'Given two integer arrays sorted in ascending order, find k pairs (u,v) — u from nums1, v from nums2 — with the smallest sums.\n\nExample: nums1=[1,7,11], nums2=[2,4,6], k=3 → [[1,2],[1,4],[1,6]]\nExample: nums1=[1,1,2], nums2=[1,2,3], k=2 → [[1,1],[1,1]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Naively generating all pairs is O(m*n). Use a min-heap seeded with (nums1[i]+nums2[0], i, 0) for all i. When you pop (sum, i, j), the next candidate from that "row" is (i, j+1).',
      },
      {
        level: 2,
        content:
          'Min-Heap. Seed with (nums1[i]+nums2[0], i, 0) for i in range(min(k,len(nums1))). Pop k times: record [nums1[i], nums2[j]]; push (nums1[i]+nums2[j+1], i, j+1) if j+1<len(nums2). O(k log k) after O(min(m,k)) initialisation.',
      },
      {
        level: 3,
        content:
          'heap=[(nums1[i]+nums2[0],i,0) for i in range(min(k,len(nums1)))]. heapify(heap). result=[]. While heap and len(result)<k: s,i,j=heappop(heap). result.append([nums1[i],nums2[j]]). if j+1<len(nums2): heappush(heap,(nums1[i]+nums2[j+1],i,j+1)). Return result. Each "row" i in nums1 paired with nums2[0] is always a candidate; expanding along j preserves sorted order for that row.',
      },
    ],
  },

  {
    title: 'Task Scheduler',
    slug: 'task-scheduler',
    pattern: 'HEAP',
    difficulty: 'MEDIUM',
    statement:
      'Given a list of CPU tasks (A-Z) and cooldown interval n between identical tasks, return the minimum total intervals (including idle time) needed.\n\nExample: tasks=["A","A","A","B","B","B"], n=2 → 8 (ABAB_ABA or AB_AB_AB)\nExample: tasks=["A","A","A","B","B","B"], n=0 → 6\nExample: tasks=["A","A","A","A","A","A","B","C","D","E","F","G"], n=2 → 16',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Greedy: always execute the task with the highest remaining count that is not in cooldown. Or use the math formula: the answer is max(len(tasks), (max_freq-1)*(n+1)+num_tasks_with_max_freq).',
      },
      {
        level: 2,
        content:
          'Max-Heap simulation. Each "cycle" of n+1 slots: pop up to n+1 tasks (most frequent first), decrement counts, push back those with count>0 after the cycle. Each cycle costs max(tasks_run, n+1). Sum all cycle costs. O(total_tasks * log 26).',
      },
      {
        level: 3,
        content:
          'Math formula: count=Counter(tasks). max_freq=max(count.values()). num_max=sum(1 for v in count.values() if v==max_freq). return max(len(tasks), (max_freq-1)*(n+1)+num_max). The formula: (max_freq-1) "full" blocks of size n+1, plus one final block holding all tasks tied at max frequency. Take max with len(tasks) since tasks themselves fill any idle gaps.',
      },
    ],
  },

  {
    title: 'Reorganize String',
    slug: 'reorganize-string',
    pattern: 'HEAP',
    difficulty: 'MEDIUM',
    statement:
      'Given a string s, rearrange it so that no two adjacent characters are the same. Return any valid rearrangement, or "" if impossible.\n\nExample: s="aab" → "aba"\nExample: s="aaab" → ""',
    hintCeHandle: 3,
    hints: [
      {
        level: 1,
        content:
          'If any character appears more than (n+1)/2 times, rearrangement is impossible. Otherwise, greedily place the most frequent character that is different from the last placed character.',
      },
      {
        level: 2,
        content:
          'Max-Heap greedy. Build max-heap of (-count, char). Maintain prev=(0, None). Each step: pop the most frequent available char. If it equals the prev char, pop the second-most frequent instead (push prev back). Append chosen char; update prev. O(n log 26).',
      },
      {
        level: 3,
        content:
          'count=Counter(s); if max(count.values())>(len(s)+1)//2: return "". heap=[(-c,ch) for ch,c in count.items()]; heapify(heap). result=[]; prev=(0,None). While heap: c,ch=heappop(heap). if ch==prev[1] and heap: c2,ch2=heappop(heap); result.append(ch2); if c2+1<0: heappush(heap,(c2+1,ch2)); heappush(heap,(c,ch)) else: result.append(ch); if c+1<0: heappush(heap,(c+1,ch)); prev=(c,ch). Return "".join(result).',
      },
    ],
  },

  {
    title: 'Minimum Cost to Connect Sticks',
    slug: 'minimum-cost-to-connect-sticks',
    pattern: 'HEAP',
    difficulty: 'MEDIUM',
    statement:
      'You have sticks of given lengths. Connecting two sticks of lengths x and y costs x+y. Connect all sticks into one with minimum total cost.\n\nExample: sticks=[2,4,3] → 14 (connect 2+3=5 cost 5; connect 5+4=9 cost 9; total=14)\nExample: sticks=[1,8,3,5] → 30\nExample: sticks=[5] → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'This is Huffman coding. Always merge the two cheapest (shortest) sticks — greedily, the total cost is minimised by always combining the two smallest. A min-heap makes each step O(log n).',
      },
      {
        level: 2,
        content:
          'Min-Heap. Heapify sticks. total=0. While len(heap)>1: a=heappop(); b=heappop(); cost=a+b; total+=cost; heappush(cost). Return total. Each merge creates a new "stick" at the combined length, which must pay for future merges — always combining the two cheapest minimises the multiplier effect.',
      },
      {
        level: 3,
        content:
          'heapify(sticks); total=0. While len(sticks)>1: a=heappop(sticks); b=heappop(sticks); merged=a+b; total+=merged; heappush(sticks,merged). Return total. Proof: each stick\'s length is multiplied by its "depth" in the merge tree. Huffman coding minimises total weighted depth, achieved by always merging smallest.',
      },
    ],
  },

  {
    title: 'Meeting Rooms II',
    slug: 'meeting-rooms-ii',
    pattern: 'HEAP',
    difficulty: 'MEDIUM',
    statement:
      'Given an array of meeting intervals [start,end], find the minimum number of conference rooms required.\n\nExample: intervals=[[0,30],[5,10],[15,20]] → 2\nExample: intervals=[[7,10],[2,4]] → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort by start time. Use a min-heap of end times (one per room in use). For each new meeting, if its start ≥ the earliest end, reuse that room (pop and push new end). Otherwise open a new room.',
      },
      {
        level: 2,
        content:
          'Min-Heap of end times. Sort by start. heap=[]. For start,end in intervals: if heap and start>=heap[0]: heapreplace(heap,end) else: heappush(heap,end). Return len(heap). O(n log n). The heap size = rooms currently in use = answer.',
      },
      {
        level: 3,
        content:
          'intervals.sort(); heap=[]. For s,e in intervals: if heap and s>=heap[0]: heapreplace(heap,e) else: heappush(heap,e). Return len(heap). Alternative: two sorted arrays of start/end times with two pointers — O(n log n) but no heap. The heap approach is more intuitive: each heap element is an occupied room\'s end time.',
      },
    ],
  },

  {
    title: 'Furthest Building You Can Reach',
    slug: 'furthest-building-you-can-reach',
    pattern: 'HEAP',
    difficulty: 'MEDIUM',
    statement:
      'Given building heights, ladders, and bricks, move from building 0 forward. For each gap (heights[i+1]>heights[i]): use bricks (exact gap) or a ladder (any gap). Return the index of the furthest building reachable.\n\nExample: heights=[4,2,7,6,9,14,12], bricks=5, ladders=1 → 4\nExample: heights=[4,12,2,7,3,18,20,3,19], bricks=10, ladders=2 → 7',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Greedily assign ladders to the largest gaps. Use a min-heap to track the gaps where ladders are used. When you run out of ladders, swap the smallest ladder-gap for bricks if you have enough bricks.',
      },
      {
        level: 2,
        content:
          'Min-Heap of ladder-allocated gaps. For each upward gap: push gap to heap. If heap size > ladders: pop the smallest gap and subtract from bricks. If bricks<0: return current index. O(n log ladders).',
      },
      {
        level: 3,
        content:
          'heap=[]. For i in range(len(heights)-1): gap=heights[i+1]-heights[i]. if gap<=0: continue. heappush(heap,gap). if len(heap)>ladders: bricks-=heappop(heap). if bricks<0: return i. Return len(heights)-1. The heap always holds the "ladder-worthy" gaps. When it overflows, the smallest gap gets downgraded to bricks — if bricks run out, stop.',
      },
    ],
  },

  {
    title: 'Single-Threaded CPU',
    slug: 'single-threaded-cpu',
    pattern: 'HEAP',
    difficulty: 'MEDIUM',
    statement:
      'Given tasks [enqueueTime, processingTime], a CPU processes the available task with the smallest processingTime (tie: smallest index). Return the order tasks are processed.\n\nExample: tasks=[[1,2],[2,4],[3,2],[4,1]] → [0,2,3,1]\nExample: tasks=[[7,10],[7,12],[7,5],[7,4],[7,2]] → [4,3,2,0,1]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort tasks by enqueue time. Simulate time advancing: when the CPU is free, either jump to the next task\'s enqueue time or process the next task from the available min-heap.',
      },
      {
        level: 2,
        content:
          'Sort tasks by enqueueTime (keeping original index). Min-Heap of (processingTime, originalIndex). Maintain current time. When heap is empty: jump time to next task\'s enqueueTime. Enqueue all tasks available at current time. Pop from heap; record order; advance time by processingTime. Repeat until all tasks done.',
      },
      {
        level: 3,
        content:
          'indexed=sorted(enumerate(tasks),key=lambda x:x[1][0]). heap=[]; order=[]; time=0; i=0. While heap or i<n: if not heap: time=indexed[i][1][0]. While i<n and indexed[i][1][0]<=time: heappush(heap,(indexed[i][1][1],indexed[i][0])); i+=1. pt,idx=heappop(heap); order.append(idx); time+=pt. Return order.',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Find Median from Data Stream',
    slug: 'find-median-from-data-stream',
    pattern: 'HEAP',
    difficulty: 'HARD',
    statement:
      'Design a data structure that supports addNum(num) and findMedian() returning the median of all added numbers. For even count: average of two middle values.\n\nExample: addNum(1); addNum(2); findMedian()→1.5; addNum(3); findMedian()→2.0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Maintain two heaps: a max-heap for the lower half and a min-heap for the upper half. Balance them so they differ in size by at most 1. The median is then the top of the larger heap (odd total) or the average of both tops (even total).',
      },
      {
        level: 2,
        content:
          'Two Heaps. lo=max-heap (negated in Python), hi=min-heap. addNum: push to lo; then rebalance by moving lo\'s max to hi. If hi has more elements than lo: move hi\'s min to lo. findMedian: if equal sizes: (−lo[0]+hi[0])/2. Else: −lo[0] (lo is always ≥ hi in size).',
      },
      {
        level: 3,
        content:
          'lo=[]; hi=[]. def addNum(n): heappush(lo,-n); heappush(hi,-heappop(lo)). if len(hi)>len(lo): heappush(lo,-heappop(hi)). def findMedian(): if len(lo)==len(hi): return (-lo[0]+hi[0])/2. return -lo[0]. O(log n) add, O(1) findMedian. lo always holds ⌈total/2⌉ elements; hi holds ⌊total/2⌋.',
      },
    ],
  },

  {
    title: 'Merge K Sorted Lists',
    slug: 'merge-k-sorted-lists',
    pattern: 'HEAP',
    difficulty: 'HARD',
    statement:
      'Given an array of k linked lists, each sorted in ascending order, merge them all into one sorted linked list.\n\nExample: lists=[[1,4,5],[1,3,4],[2,6]] → [1,1,2,3,4,4,5,6]\nExample: lists=[] → []\nExample: lists=[[]] → []',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A min-heap always gives the global smallest element across all list heads in O(log k). Seed the heap with the head of each non-empty list. Pop the minimum, append to result, and push the popped node\'s next.',
      },
      {
        level: 2,
        content:
          'Min-Heap of (value, list_index, node). Seed: for each non-null list head push (head.val, i, head). Pop (val, i, node): append node to result; if node.next: push (node.next.val, i, node.next). O(n log k) where n = total nodes.',
      },
      {
        level: 3,
        content:
          'heap=[(l.val,i,l) for i,l in enumerate(lists) if l]. heapify(heap). dummy=ListNode(); cur=dummy. While heap: v,i,node=heappop(heap); cur.next=node; cur=cur.next. if node.next: heappush(heap,(node.next.val,i,node.next)). Return dummy.next. The list index i breaks ties between equal values to avoid comparing ListNode objects directly.',
      },
    ],
  },

  {
    title: 'IPO',
    slug: 'ipo',
    pattern: 'HEAP',
    difficulty: 'HARD',
    statement:
      'Before IPO, complete at most k projects to maximise capital. Each project i has profit[i] and capital[i] (minimum starting capital required). Start with w capital.\n\nExample: k=2, w=0, profits=[1,2,3], capital=[0,1,1] → 4\nExample: k=3, w=0, profits=[1,2,3], capital=[0,1,2] → 6',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Greedy: always pick the most profitable project you can currently afford. Sort projects by capital. Use a min-heap on capital to efficiently find all unlocked projects, and a max-heap on profit to pick the best.',
      },
      {
        level: 2,
        content:
          'Two heaps. Sort projects by capital. Min-heap of (capital, profit) — to unlock projects as capital grows. Max-heap of (-profit) — to pick most profitable. Each of k rounds: unlock all affordable projects into max-heap; pop most profitable; add profit to w.',
      },
      {
        level: 3,
        content:
          'projects=sorted(zip(capital,profits)); min_heap=list(projects); heapify(min_heap); max_heap=[]. For _ in range(k): while min_heap and min_heap[0][0]<=w: cap,prof=heappop(min_heap); heappush(max_heap,-prof). if not max_heap: break. w+=-heappop(max_heap). Return w. Sorting + two heaps is O(n log n + k log n).',
      },
    ],
  },

  {
    title: 'K-th Smallest Prime Fraction',
    slug: 'k-th-smallest-prime-fraction',
    pattern: 'HEAP',
    difficulty: 'HARD',
    statement:
      'Given a sorted array arr of prime integers and 1, return the kth smallest fraction arr[i]/arr[j] where 0 ≤ i < j < arr.length.\n\nExample: arr=[1,2,3,5], k=3 → [2,5] (fractions: 1/5,1/3,2/5,1/2,3/5,2/3,3/5 → 3rd is 2/5)\nExample: arr=[1,7], k=1 → [1,7]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Think of the fractions as a matrix: row i is arr[i]/arr[j] for all j>i, and each row is sorted ascending (arr[j] increases). Use a min-heap seeded with the smallest fraction from each row (arr[i]/arr[n-1] are the smallest per row... wait actually arr[i]/arr[i+1] is the largest since denominator is smallest. arr[i]/arr[-1] is the smallest per row).',
      },
      {
        level: 2,
        content:
          'Min-Heap of (fraction, i, j). Seed with (arr[i]/arr[-1], i, n-1) for each i (largest denominator → smallest fraction). Pop k times: when popping (_, i, j), the next fraction in row i is (arr[i]/arr[j-1], i, j-1). O(k log n).',
      },
      {
        level: 3,
        content:
          'heap=[(arr[i]/arr[-1],i,len(arr)-1) for i in range(len(arr)-1)]; heapify(heap). For _ in range(k-1): _,i,j=heappop(heap). if j-1>i: heappush(heap,(arr[i]/arr[j-1],i,j-1)). _,i,j=heappop(heap). Return [arr[i],arr[j]]. Alternatively, binary search on the fraction value: find smallest x such that count(fractions ≤ x) ≥ k. O(n log(max_val)).',
      },
    ],
  },

  {
    title: 'Minimum Cost to Hire K Workers',
    slug: 'minimum-cost-to-hire-k-workers',
    pattern: 'HEAP',
    difficulty: 'HARD',
    statement:
      'Every worker in a paid group must be paid proportionally to their quality. Each worker expects at least wage[i]/quality[i] per unit quality. Hire exactly k workers to minimise total wages.\n\nExample: quality=[10,20,5], wage=[70,50,30], k=2 → 105.00000\nExample: quality=[3,1,10,10,1], wage=[4,8,2,2,7], k=3 → 30.66667',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'If a group pays at rate r (per quality unit), total cost = r * sum(quality). The rate r must satisfy r ≥ wage[i]/quality[i] for every worker i in the group — so r = max(wage[i]/quality[i]) in the group. Sort workers by their minimum rate.',
      },
      {
        level: 2,
        content:
          'Sort by wage/quality ratio. For each worker as the "captain" (highest ratio), find the k-1 lowest quality workers seen so far — they can be paid at the captain\'s rate. Use a max-heap to maintain the k lowest qualities. Total cost = captain_rate * sum_of_k_qualities.',
      },
      {
        level: 3,
        content:
          'workers=sorted((w/q,q) for w,q in zip(wage,quality)). heap=[]; q_sum=0; ans=inf. For ratio,q in workers: heappush(heap,-q); q_sum+=q. if len(heap)>k: q_sum+=heappop(heap). if len(heap)==k: ans=min(ans,ratio*q_sum). Return ans. The max-heap (negated) ejects the largest quality when size exceeds k, keeping the k smallest qualities. At each captain, we compute their rate times the optimal total quality.',
      },
    ],
  },

  {
    title: 'Find the Kth Smallest Sum of a Matrix With Sorted Rows',
    slug: 'find-kth-smallest-sum-matrix-sorted-rows',
    pattern: 'HEAP',
    difficulty: 'HARD',
    statement:
      'You must pick exactly one element from each row of a matrix. Return the kth smallest possible sum across all such picks.\n\nExample: mat=[[1,3,11],[2,4,6]], k=5 → 7\nExample: mat=[[1,3,11],[2,4,6]], k=9 → 17',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Merge two rows at a time: find the k smallest pairwise sums of one row with the next. Repeat until one row remains. Finding k smallest sums of two sorted arrays uses the same "K Pairs with Smallest Sums" pattern.',
      },
      {
        level: 2,
        content:
          'Reduce row by row. Start with mat[0]. For each subsequent row: compute the k smallest pairwise sums of current accumulation and the new row. Use a min-heap seeded with (accum[0]+row[j], 0, j) for all j; expand along the accum dimension. Return the kth smallest after processing all rows.',
      },
      {
        level: 3,
        content:
          'def kSmallestPairs(a,b,k): heap=[(a[0]+b[j],0,j) for j in range(min(k,len(b)))]; heapify(heap); res=[]. For _ in range(k): s,i,j=heappop(heap); res.append(s). if i+1<len(a): heappush(heap,(a[i+1]+b[j],i+1,j)). return res. ans=mat[0][:k]. For row in mat[1:]: ans=kSmallestPairs(ans,sorted(row),k). Return ans[k-1]. Each merge step computes k smallest sums in O(k log k).',
      },
    ],
  },

  {
    title: 'Maximum Performance of a Team',
    slug: 'maximum-performance-of-a-team',
    pattern: 'HEAP',
    difficulty: 'HARD',
    statement:
      'n engineers with speed[] and efficiency[]. Pick at most k engineers. Performance = sum(speeds) * min(efficiency). Return maximum performance mod 10^9+7.\n\nExample: n=6, speed=[2,10,3,1,5,8], efficiency=[5,4,3,9,7,2], k=2 → 60\nExample: n=6, speed=[2,10,3,1,5,8], efficiency=[5,4,3,9,7,2], k=3 → 68',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort engineers by efficiency descending. For each engineer as the minimum efficiency, all previously seen engineers have higher efficiency — pick the k-1 with the highest speeds. A min-heap of size k tracks the best speeds seen so far.',
      },
      {
        level: 2,
        content:
          'Sort by efficiency desc. Min-Heap of speeds (size ≤ k), running speed_sum. For each engineer: push speed; speed_sum += speed. If heap size > k: speed_sum -= heappop(). ans = max(ans, speed_sum * efficiency). Return ans % MOD. The current engineer\'s efficiency is the minimum — earlier engineers all have higher efficiency.',
      },
      {
        level: 3,
        content:
          'MOD=10**9+7. engineers=sorted(zip(efficiency,speed),reverse=True). heap=[]; speed_sum=ans=0. For eff,spd in engineers: heappush(heap,spd); speed_sum+=spd. if len(heap)>k: speed_sum-=heappop(heap). ans=max(ans,speed_sum*eff). Return ans%MOD. "At most k" (not exactly k): naturally handled because we consider all team sizes 1..k in the loop — each iteration tests using the current engineer as the efficiency bottleneck.',
      },
    ],
  },

  {
    title: 'Smallest Range Covering Elements from K Lists',
    slug: 'smallest-range-covering-elements-from-k-lists',
    pattern: 'HEAP',
    difficulty: 'HARD',
    statement:
      'Given k sorted lists of integers, find the smallest range [a,b] that includes at least one number from each list.\n\nExample: nums=[[4,10,15,24,26],[0,9,12,20],[5,18,22,30]] → [20,24]\nExample: nums=[[1,2,3],[1,2,3],[1,2,3]] → [1,1]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a min-heap containing one element from each list. The range is [heap_min, current_max]. Advance the list whose element is the current minimum — this keeps all lists represented while minimising the range width.',
      },
      {
        level: 2,
        content:
          'Min-Heap of (value, list_idx, element_idx). Initialise with the first element of each list; current_max = max of those. Each step: pop min; update range if smaller; push next element from the same list and update current_max. Stop when any list is exhausted.',
      },
      {
        level: 3,
        content:
          'heap=[(nums[i][0],i,0) for i in range(k)]; heapify(heap). cur_max=max(nums[i][0] for i in range(k)). best=[heap[0][0],cur_max]. While True: val,i,j=heappop(heap). if j+1>=len(nums[i]): break. nxt=nums[i][j+1]; heappush(heap,(nxt,i,j+1)); cur_max=max(cur_max,nxt). if cur_max-heap[0][0]<best[1]-best[0]: best=[heap[0][0],cur_max]. Return best. Advancing the minimum (not maximum) is the greedy key — it has the only chance of reducing the range.',
      },
    ],
  },

  {
    title: 'Ugly Number II',
    slug: 'ugly-number-ii',
    pattern: 'HEAP',
    difficulty: 'HARD',
    statement:
      'An ugly number has only prime factors 2, 3, and 5. 1 is considered ugly. Given an integer n, return the nth ugly number.\n\nExample: n=10 → 12 (sequence: 1,2,3,4,5,6,8,9,10,12)\nExample: n=1 → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Every ugly number is 2k, 3k, or 5k for some smaller ugly number k. Use a min-heap to always generate the next smallest ugly number. Or use three DP pointers tracking the next ugly produced by multiplying by 2, 3, and 5.',
      },
      {
        level: 2,
        content:
          'Min-Heap approach. Start with {1}. Pop the minimum; multiply by 2, 3, 5 and push each if not already seen. Use a set to avoid duplicates. After n pops, the last popped is the nth ugly. O(n log n).',
      },
      {
        level: 3,
        content:
          'DP (O(n)). dp=[1]*n; i2=i3=i5=0. For i in range(1,n): nxt2=dp[i2]*2; nxt3=dp[i3]*3; nxt5=dp[i5]*5. dp[i]=min(nxt2,nxt3,nxt5). if dp[i]==nxt2: i2+=1. if dp[i]==nxt3: i3+=1. if dp[i]==nxt5: i5+=1. Return dp[n-1]. Three pointers avoid duplicates — if dp[i] equals two of the candidates (e.g., 6=2*3=3*2), both pointers advance, correctly skipping the duplicate.',
      },
    ],
  },

  {
    title: 'Minimum Interval to Include Each Query',
    slug: 'minimum-interval-to-include-each-query',
    pattern: 'HEAP',
    difficulty: 'HARD',
    statement:
      'Given intervals and queries, for each query find the size (r-l+1) of the smallest interval containing it. Return -1 if none.\n\nExample: intervals=[[1,4],[2,4],[3,6],[4,4]], queries=[2,3,4,5] → [3,3,1,4]\nExample: intervals=[[2,3],[2,5],[1,8],[20,25]], queries=[2,19,5,22] → [2,-1,4,6]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort both intervals by start and queries by value (keeping original indices). Sweep queries in order: add all intervals starting ≤ query to a min-heap by size. Remove expired intervals (end < query). The heap top is the smallest valid interval.',
      },
      {
        level: 2,
        content:
          'Offline sweep. Sort intervals by start. Sort queries with original indices. Min-heap of (interval_size, interval_end). For each query q: push all intervals with start ≤ q. Pop expired intervals (end < q). Heap top gives the smallest valid size, or -1 if empty. O(n log n + m log m).',
      },
      {
        level: 3,
        content:
          'intervals.sort(); sorted_q=sorted(enumerate(queries),key=lambda x:x[1]). heap=[]; ans=[-1]*len(queries); i=0. For idx,q in sorted_q: while i<len(intervals) and intervals[i][0]<=q: l,r=intervals[i]; heappush(heap,(r-l+1,r)); i+=1. while heap and heap[0][1]<q: heappop(heap). if heap: ans[idx]=heap[0][0]. Return ans. Lazy deletion of expired intervals is key — only remove from heap when queried, not eagerly.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 9 — HEAP (29 problems)...\n');

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
