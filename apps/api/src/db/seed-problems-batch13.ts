import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 13 — FAST_SLOW_POINTERS (30 problems: 10 Easy, 10 Medium, 10 Hard)
// Already seeded: Linked List Cycle 141 (Easy) — will be skipped via onConflictDoNothing
// Easy tier covers linked list foundations + fast/slow basics
// Hard tier includes advanced linked list design + cycle detection in functional graphs
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
    title: 'Linked List Cycle',
    slug: 'linked-list-cycle',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'EASY',
    statement:
      'Given the head of a linked list, determine if it contains a cycle using O(1) memory.\n\nExample: head=[3,2,0,-4], tail connects to index 1 → true\nExample: head=[1,2], tail connects to index 0 → true\nExample: head=[1], no cycle → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use two pointers moving at different speeds. If there is a cycle, the fast pointer will eventually lap the slow pointer.',
      },
      {
        level: 2,
        content:
          'slow=fast=head. While fast and fast.next: slow=slow.next; fast=fast.next.next. If slow==fast: return True. Return False. O(n), O(1) space.',
      },
    ],
  },

  {
    title: 'Middle of the Linked List',
    slug: 'middle-of-the-linked-list',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'EASY',
    statement:
      'Return the middle node of a linked list. If two middle nodes exist, return the second.\n\nExample: head=[1,2,3,4,5] → node 3\nExample: head=[1,2,3,4,5,6] → node 4',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use fast and slow pointers. Fast moves 2 nodes at a time; slow moves 1. When fast reaches the end, slow is at the middle.',
      },
      {
        level: 2,
        content:
          'slow=fast=head. While fast and fast.next: slow=slow.next; fast=fast.next.next. Return slow. O(n), O(1) space.',
      },
    ],
  },

  {
    title: 'Happy Number',
    slug: 'happy-number',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'EASY',
    statement:
      'A number is happy if repeatedly replacing it with the sum of squares of its digits eventually reaches 1. Return true if happy, false if it loops forever.\n\nExample: n=19 → true (1²+9²=82→68→100→1)\nExample: n=2 → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'The sequence either reaches 1 (happy) or enters a cycle. Apply the fast/slow pointer cycle detection on the number sequence.',
      },
      {
        level: 2,
        content:
          'def sq(n): return sum(int(d)**2 for d in str(n)). slow=sq(n); fast=sq(sq(n)). While fast!=1 and slow!=fast: slow=sq(slow); fast=sq(sq(fast)). Return fast==1. O(log n) per step.',
      },
    ],
  },

  {
    title: 'Palindrome Linked List',
    slug: 'palindrome-linked-list',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'EASY',
    statement:
      'Return true if the linked list is a palindrome in O(n) time and O(1) space.\n\nExample: head=[1,2,2,1] → true\nExample: head=[1,2] → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Find the middle using fast/slow pointers, reverse the second half in-place, then compare both halves from the outside in.',
      },
      {
        level: 2,
        content:
          'Find mid (slow/fast). Reverse second half starting from mid.next; set mid.next=None. Compare first and reversed second halves node by node. O(n), O(1) space.',
      },
    ],
  },

  {
    title: 'Remove Duplicates from Sorted List',
    slug: 'remove-duplicates-from-sorted-list',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'EASY',
    statement:
      'Given a sorted linked list, delete all duplicate nodes leaving each element only once.\n\nExample: head=[1,1,2] → [1,2]\nExample: head=[1,1,2,3,3] → [1,2,3]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use a single pointer. When the current value equals the next value, skip the next node.',
      },
      {
        level: 2,
        content:
          'curr=head. While curr and curr.next: if curr.val==curr.next.val: curr.next=curr.next.next. Else curr=curr.next. Return head. O(n).',
      },
    ],
  },

  {
    title: 'Remove Linked List Elements',
    slug: 'remove-linked-list-elements',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'EASY',
    statement:
      'Remove all nodes from a linked list whose value equals val.\n\nExample: head=[1,2,6,3,4,5,6], val=6 → [1,2,3,4,5]\nExample: head=[7,7,7,7], val=7 → []',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use a dummy head node so the head itself can be removed without special casing. Scan with a pointer and skip matching nodes.',
      },
      {
        level: 2,
        content:
          'dummy=ListNode(0,head); curr=dummy. While curr.next: if curr.next.val==val: curr.next=curr.next.next. Else curr=curr.next. Return dummy.next. O(n).',
      },
    ],
  },

  {
    title: 'Reverse Linked List',
    slug: 'reverse-linked-list',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'EASY',
    statement:
      'Reverse a singly linked list and return the new head.\n\nExample: head=[1,2,3,4,5] → [5,4,3,2,1]\nExample: head=[1,2] → [2,1]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Track the previous node. At each step, reverse the current node\'s next pointer, then advance both pointers.',
      },
      {
        level: 2,
        content:
          'prev=None, curr=head. While curr: nxt=curr.next; curr.next=prev; prev=curr; curr=nxt. Return prev. O(n), O(1) space.',
      },
    ],
  },

  {
    title: 'Merge Two Sorted Lists',
    slug: 'merge-two-sorted-lists',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'EASY',
    statement:
      'Merge two sorted linked lists and return the merged sorted list.\n\nExample: list1=[1,2,4], list2=[1,3,4] → [1,1,2,3,4,4]\nExample: list1=[], list2=[0] → [0]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use two pointers, one per list. Always attach the smaller of the two current nodes and advance that pointer.',
      },
      {
        level: 2,
        content:
          'dummy=ListNode(); curr=dummy. While both: attach smaller node, advance its pointer. Attach remaining list. Return dummy.next. O(m+n).',
      },
    ],
  },

  {
    title: 'Intersection of Two Linked Lists',
    slug: 'intersection-of-two-linked-lists',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'EASY',
    statement:
      'Return the node at which two linked lists intersect, or null. The lists have no cycles.\n\nExample: listA=[4,1,8,4,5], listB=[5,6,1,8,4,5], intersecting at node 8 → node with val 8\nExample: listA=[2,6,4], listB=[1,5], no intersection → null',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use two pointers. When a pointer reaches the end of its list, redirect it to the head of the other list. After at most one redirect each, they meet at the intersection (or both reach null together).',
      },
      {
        level: 2,
        content:
          'a=headA; b=headB. While a!=b: a=a.next if a else headB; b=b.next if b else headA. Return a. O(m+n), O(1) space. Works because both pointers traverse the same total length.',
      },
    ],
  },

  {
    title: 'Delete Node in a Linked List',
    slug: 'delete-node-in-a-linked-list',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'EASY',
    statement:
      'Given only access to the node to be deleted (not the head), delete it from the list. The node is guaranteed not to be the tail.\n\nExample: head=[4,5,1,9], node=5 → [4,1,9]\nExample: head=[4,5,1,9], node=1 → [4,5,9]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'You cannot unlink from the previous node. Instead, overwrite this node with its successor\'s data and remove the successor.',
      },
      {
        level: 2,
        content:
          'node.val=node.next.val; node.next=node.next.next. O(1). No traversal needed — copy the next node\'s value into the current node then skip the next node.',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Linked List Cycle II',
    slug: 'linked-list-cycle-ii',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Return the node where the cycle begins in a linked list, or null if no cycle.\n\nExample: head=[3,2,0,-4], tail connects to index 1 → node with val 2\nExample: head=[1,2], tail connects to index 0 → node with val 1\nExample: head=[1], no cycle → null',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'First detect the cycle with fast/slow pointers. Then use a mathematical property to locate the start: reset one pointer to the head and advance both one step at a time.',
      },
      {
        level: 2,
        content:
          'Phase 1: slow=fast=head; advance until slow==fast (cycle detected). Phase 2: slow=head; while slow!=fast: slow=slow.next; fast=fast.next. Return slow. O(n), O(1).',
      },
      {
        level: 3,
        content:
          'Let F=distance head→cycle_start, C=cycle length, k=offset where they meet inside cycle. slow traveled F+k, fast traveled F+k+nC=2(F+k) → F=(n-1)C+(C-k). Distance from meeting point back to cycle_start = C-k = F mod C. So restarting one pointer at head and advancing both by 1 lands them at cycle_start simultaneously.',
      },
    ],
  },

  {
    title: 'Find the Duplicate Number',
    slug: 'find-the-duplicate-number',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Given an array of n+1 integers where each is in [1,n], find the duplicate without modifying the array and using only O(1) extra space.\n\nExample: nums=[1,3,4,2,2] → 2\nExample: nums=[3,1,3,4,2] → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Treat nums as a function f(i)=nums[i]. Since values are in [1,n] and there are n+1 elements, following indices creates a rho-shaped cycle — apply Linked List Cycle II.',
      },
      {
        level: 2,
        content:
          'slow=nums[0]; fast=nums[nums[0]]. Advance until slow==fast. Reset slow=0. Advance both one step (slow=nums[slow]; fast=nums[fast]) until slow==fast. Return slow. O(n), O(1).',
      },
      {
        level: 3,
        content:
          'The duplicate value is the "cycle entry" because two indices map to it as their next step. Phase 1 finds the meeting point inside the cycle; Phase 2 (same as Linked List Cycle II) finds the entry. Starting slow at index 0 (not nums[0]) is the key — index 0 is the "head" of the sequence.',
      },
    ],
  },

  {
    title: 'Remove Nth Node From End of List',
    slug: 'remove-nth-node-from-end-of-list',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Remove the nth node from the end of a linked list in one pass.\n\nExample: head=[1,2,3,4,5], n=2 → [1,2,3,5]\nExample: head=[1], n=1 → []\nExample: head=[1,2], n=1 → [1]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Advance a fast pointer n+1 steps ahead of a slow pointer. When fast reaches null, slow is at the node just before the one to remove.',
      },
      {
        level: 2,
        content:
          'dummy=ListNode(0,head); slow=fast=dummy. Advance fast n+1 steps. While fast: slow=slow.next; fast=fast.next. slow.next=slow.next.next. Return dummy.next. O(n), one pass.',
      },
      {
        level: 3,
        content:
          'The gap of n+1 (not n) positions slow just before the target node, enabling direct removal via slow.next=slow.next.next. The dummy node handles removal of the original head (when n==list length). One pass, O(1) extra space.',
      },
    ],
  },

  {
    title: 'Reorder List',
    slug: 'reorder-list',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Reorder L0→L1→…→Ln to L0→Ln→L1→Ln-1→L2→Ln-2→… in-place.\n\nExample: head=[1,2,3,4] → [1,4,2,3]\nExample: head=[1,2,3,4,5] → [1,5,2,4,3]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Three steps: (1) find the middle with fast/slow, (2) reverse the second half in-place, (3) interleave the two halves.',
      },
      {
        level: 2,
        content:
          'Find mid (slow/fast); second=reverse(mid.next); mid.next=None. Interleave: while second: tmp1=first.next; tmp2=second.next; first.next=second; second.next=tmp1; first=tmp1; second=tmp2. O(n), O(1).',
      },
      {
        level: 3,
        content:
          'After reversing, the second half\'s last node might still point somewhere — set it to None before interleaving. The weave pairs node 0 with reversed node 0 (= original last), then node 1 with reversed node 1, etc. Stop when the second half is exhausted.',
      },
    ],
  },

  {
    title: 'Sort List',
    slug: 'sort-list',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Sort a linked list in O(n log n) time and O(1) space (constant extra space, not counting recursion).\n\nExample: head=[4,2,1,3] → [1,2,3,4]\nExample: head=[-1,5,3,4,0] → [-1,0,3,4,5]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use merge sort. Find the middle with fast/slow, split into two halves, sort each, then merge.',
      },
      {
        level: 2,
        content:
          'Base case: length ≤ 1. Find mid (slow/fast); split: mid.next=None. left=sortList(head); right=sortList(right_head). Return merge(left,right). O(n log n), O(log n) stack. Bottom-up avoids the stack.',
      },
      {
        level: 3,
        content:
          'Bottom-up merge sort: start with sublist size=1, merge adjacent pairs into size 2, then 4, repeat until size≥n. Track the tail of each merged group with a dummy head. O(n log n) time, O(1) extra space. Avoids the O(log n) recursion stack of top-down.',
      },
    ],
  },

  {
    title: 'Circular Array Loop',
    slug: 'circular-array-loop',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Given a circular array nums of non-zero integers where nums[i] indicates a jump of |nums[i]| steps (forward if positive, backward if negative), return true if a cycle of length > 1 exists where all values have the same sign.\n\nExample: nums=[2,-1,1,2,2] → true\nExample: nums=[-1,2] → false\nExample: nums=[-2,1,-1,-2,-2] → false',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Apply fast/slow pointer from each unvisited starting position. A valid cycle must have length > 1 and all-same-sign values.',
      },
      {
        level: 2,
        content:
          'next(i)=((i+nums[i])%n+n)%n. For each i: slow=i; fast=next(i). While direction consistent and slow!=fast: slow=next(slow); fast=next(next(fast)). If slow==fast and next(slow)!=slow: return True. Mark visited by setting nums[i]=0. O(n), O(1).',
      },
      {
        level: 3,
        content:
          'Direction consistency check: nums[slow] and nums[next(slow)] must have the same sign as nums[i]. A self-loop (next(slow)==slow) is length-1 — invalid. Zeroing out visited nodes prevents re-processing and terminates infinite loops without a visited set.',
      },
    ],
  },

  {
    title: 'Remove Duplicates from Sorted List II',
    slug: 'remove-duplicates-from-sorted-list-ii',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Remove all nodes whose value appears more than once in a sorted linked list. Return only the nodes with distinct values.\n\nExample: head=[1,2,3,3,4,4,5] → [1,2,5]\nExample: head=[1,1,1,2,3] → [2,3]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a dummy head and a predecessor pointer. When you detect a duplicate run, skip the entire run before advancing the predecessor.',
      },
      {
        level: 2,
        content:
          'dummy=ListNode(0,head); prev=dummy; curr=head. While curr: if curr.next and curr.val==curr.next.val: skip all with curr.val; prev.next=curr. Else prev=prev.next. curr=curr.next. Return dummy.next. O(n).',
      },
      {
        level: 3,
        content:
          'prev always points to the last confirmed unique node. When a duplicate run starts (curr.val==curr.next.val), advance curr past all copies, then set prev.next=curr.next (skip the entire run including the last copy). Only advance prev when no skip occurred.',
      },
    ],
  },

  {
    title: 'Rotate List',
    slug: 'rotate-list',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Rotate a linked list to the right by k places.\n\nExample: head=[1,2,3,4,5], k=2 → [4,5,1,2,3]\nExample: head=[0,1,2], k=4 → [2,0,1]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Find the length n and reduce k to k%n. The new tail is at position n−k−1 (0-indexed from head). Make the list circular then cut.',
      },
      {
        level: 2,
        content:
          'Find length n; connect tail to head (circular). Steps to new tail = n−k%n. Traverse to new tail: new_head=new_tail.next; new_tail.next=None. Return new_head. O(n).',
      },
      {
        level: 3,
        content:
          'Making the list circular avoids edge cases. k%n handles k>n. The new tail is n−(k%n) steps from the original head (0-indexed). If k%n==0, no rotation needed — return early.',
      },
    ],
  },

  {
    title: 'Copy List with Random Pointer',
    slug: 'copy-list-with-random-pointer',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'Deep copy a linked list where each node has a next pointer and a random pointer (which may point to any node or null).\n\nExample: head=[[7,null],[13,0],[11,4],[10,2],[1,0]] → deep copy with identical structure',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a hash map from original nodes to their copies. First pass: create all copy nodes. Second pass: wire next and random pointers using the map.',
      },
      {
        level: 2,
        content:
          'map={None:None}. Pass 1: for each node: map[node]=Node(node.val). Pass 2: map[node].next=map[node.next]; map[node].random=map[node.random]. Return map[head]. O(n) time and space.',
      },
      {
        level: 3,
        content:
          'O(1) space trick: interleave copies alongside originals (A→A\'→B→B\'→...). Set copy.random=node.random.next. Then separate the two lists. Three passes, O(1) extra space. The interleaving allows resolving random pointers without a map.',
      },
    ],
  },

  {
    title: 'Maximum Twin Sum of a Linked List',
    slug: 'maximum-twin-sum-of-a-linked-list',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'MEDIUM',
    statement:
      'In an even-length linked list, the twin of node i is node (n-1-i). Return the maximum twin sum (node_i.val + twin_i.val).\n\nExample: head=[5,4,2,1] → 6 (pairs: 5+1=6, 4+2=6)\nExample: head=[4,2,2,3] → 7 (pairs: 4+3=7, 2+2=4)',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Find the middle with fast/slow, reverse the second half in-place, then walk both halves simultaneously computing pairwise sums.',
      },
      {
        level: 2,
        content:
          'Find mid (slow/fast). Reverse second half. max_sum=0. While second_half: max_sum=max(max_sum, first.val+second.val); first=first.next; second=second.next. Return max_sum. O(n), O(1).',
      },
      {
        level: 3,
        content:
          'After reversing, the reversed second half\'s first node is the original last node — the twin of the first node. Advancing both pointers simultaneously computes all n/2 twin sums. Same in-place technique as Palindrome Linked List.',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Reverse Nodes in k-Group',
    slug: 'reverse-nodes-in-k-group',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'HARD',
    statement:
      'Reverse every consecutive k nodes of a linked list in-place. If remaining nodes < k, leave them as-is.\n\nExample: head=[1,2,3,4,5], k=2 → [2,1,4,3,5]\nExample: head=[1,2,3,4,5], k=3 → [3,2,1,4,5]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Check if k nodes remain before each reversal. Reverse the k-node group, re-attach to the previously processed tail, then recurse or iterate.',
      },
      {
        level: 2,
        content:
          'Advance a check pointer k steps (return if fewer than k remain). Reverse those k nodes. Connect group_tail to reverseKGroup(next_group, k). O(n), O(n/k) recursion. Iterative = O(1) extra space.',
      },
      {
        level: 3,
        content:
          'Track four pointers: prev_tail (last node of previous group), group_head, group_tail, next_group. After reversing k nodes, set prev_tail.next=new_group_head and group_tail.next=next_group_head. Advance prev_tail=group_tail. A dummy head simplifies the first group.',
      },
    ],
  },

  {
    title: 'Merge k Sorted Lists',
    slug: 'merge-k-sorted-lists',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'HARD',
    statement:
      'Merge k sorted linked lists and return the merged sorted list.\n\nExample: lists=[[1,4,5],[1,3,4],[2,6]] → [1,1,2,3,4,4,5,6]\nExample: lists=[] → []\nExample: lists=[[]] → []',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a min-heap seeded with the head of each list. Always extract the minimum, append it to the result, and push its next node.',
      },
      {
        level: 2,
        content:
          'Min-heap of (val, idx, node). Push each list\'s head. While heap: pop (val,i,node); append to result; if node.next: push (node.next.val, i, node.next). O(n log k), O(k) space.',
      },
      {
        level: 3,
        content:
          'Divide-and-conquer alternative: pair up and merge lists until one remains. O(n log k) time, O(1) extra space per merge. The heap approach is simpler to code; divide-and-conquer avoids the heap overhead. Include a tiebreaker (index i) in the heap tuple to avoid comparing ListNode objects.',
      },
    ],
  },

  {
    title: 'All O(1) Data Structure',
    slug: 'all-o-1-data-structure',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'HARD',
    statement:
      'Design a data structure supporting inc(key), dec(key), getMaxKey(), getMinKey() all in O(1) average time.\n\nExample: inc("a"); inc("b"); inc("b"); inc("c"); inc("c"); inc("c"); getMaxKey()→"c"; getMinKey()→"a"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Maintain a doubly linked list of count-buckets ordered from min to max count. A hash map from key to bucket provides O(1) access to any key\'s bucket.',
      },
      {
        level: 2,
        content:
          'DLL of buckets {count, set<keys>} (head=min, tail=max). HashMap key→bucket. inc: move key to count+1 bucket (create if needed, delete old if empty). dec: move to count-1 (remove key if count reaches 0). getMax/getMin: tail/head bucket. O(1) all ops.',
      },
      {
        level: 3,
        content:
          'Create the count+1 or count-1 bucket immediately after/before the current bucket in the DLL only if it doesn\'t already exist. After moving a key, delete the old bucket if its key set is empty. The DLL head/tail always give O(1) min/max without scanning.',
      },
    ],
  },

  {
    title: 'LFU Cache',
    slug: 'lfu-cache',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'HARD',
    statement:
      'Design an LFU cache with capacity cap. get(key) returns -1 if absent. put(key,value) inserts or updates; if full, evicts the least frequently used key (LRU within ties).\n\nExample: cap=2; put(1,1); put(2,2); get(1)→1; put(3,3)[evict 2]; get(2)→-1; get(3)→3; put(4,4)[evict 1]; get(1)→-1; get(3)→3; get(4)→4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Track frequency per key. For each frequency, maintain an ordered set of keys (ordered by recency). A min_freq pointer speeds up eviction.',
      },
      {
        level: 2,
        content:
          'HashMap key→(val,freq). HashMap freq→OrderedDict (key→None, insertion-order = LRU). Int min_freq. get: bump freq, move to new freq bucket. put: evict min_freq LRU if full; insert with freq=1; reset min_freq=1. O(1) all ops.',
      },
      {
        level: 3,
        content:
          'min_freq resets to 1 on every put (new keys start at freq=1). OrderedDict preserves insertion order — oldest entry (LRU) is first, remove with popitem(last=False). On get/put bump: pop from old freq bucket; if bucket empty and old_freq==min_freq, min_freq++; push to new freq bucket.',
      },
    ],
  },

  {
    title: 'Design Skiplist',
    slug: 'design-skiplist',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'HARD',
    statement:
      'Design a skiplist supporting search(target), add(num), and erase(num) without using built-in ordered structures.\n\nExample: add(1); add(2); add(3); search(0)→false; add(4); search(1)→true; erase(0)→false; erase(1)→true; search(1)→false',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A skiplist is a multi-level sorted linked list. Higher levels skip more elements. Navigate from the top level downward, moving right when the next value is ≤ target.',
      },
      {
        level: 2,
        content:
          'Nodes have forward[0..MAX_LEVEL] pointers. Search/insert: start at top level, advance right while next.val≤target, drop one level at a time. Insert: randomly assign a level (geometric distribution); wire forward pointers at each level. O(log n) average.',
      },
      {
        level: 3,
        content:
          'Track update[level] = rightmost node at each level that is ≤ target (the "predecessor"). For add: generate random_level; create node; for i in 0..random_level: new_node.forward[i]=update[i].forward[i]; update[i].forward[i]=new_node. For erase: if update[0].forward[0].val==target: unlink at each level. Use a sentinel head node with -inf value.',
      },
    ],
  },

  {
    title: 'Max Stack',
    slug: 'max-stack',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'HARD',
    statement:
      'Design a max stack supporting push, pop, top, peekMax, and popMax. All O(log n) time.\n\nExample: push(5); push(1); push(5); top()→5; popMax()→5; top()→1; peekMax()→5; pop()→1; top()→5',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a doubly linked list (DLL) for stack order and a sorted structure (e.g., sorted list keyed by value) for O(log n) max access. Each node is referenced in both structures.',
      },
      {
        level: 2,
        content:
          'DLL (stack order) + SortedList of (val, node). push: add to DLL tail; add to SortedList. pop: remove DLL tail; remove from SortedList. peekMax: SortedList max. popMax: remove from SortedList; remove its node from DLL. top: DLL tail value. O(log n) all ops.',
      },
      {
        level: 3,
        content:
          'Storing (val, node) in the SortedList allows O(log n) search and removal of the max without scanning the DLL. The node reference in the SortedList entry lets you do O(1) DLL removal once found. Use a timestamp or unique ID as a tiebreaker in the SortedList for equal values.',
      },
    ],
  },

  {
    title: 'Design a Text Editor',
    slug: 'design-a-text-editor',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'HARD',
    statement:
      'Design a text editor with: addText(text), deleteText(k) (delete k chars left of cursor), cursorLeft(k) (move cursor left min(k,left_chars)), cursorRight(k). Each cursor move returns the last min(10, left_of_cursor) characters.\n\nExample: addText("leetcode"); deleteText(4); addText("practice"); cursorRight(3); cursorLeft(8) → "practi"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Model the cursor position with two stacks: left stack holds characters to the left of the cursor (top = adjacent left), right stack holds characters to the right.',
      },
      {
        level: 2,
        content:
          'left, right = [], []. addText: extend left. deleteText(k): pop min(k,len(left)) from left. cursorLeft(k): move min(k,len(left)) chars from left to right. cursorRight(k): reverse. Return "".join(left[-10:]). O(k) per op.',
      },
      {
        level: 3,
        content:
          'The two-stack (gap buffer) approach cleanly models a text cursor. left[-10:] gives the last 10 characters without reversing. addText is O(|text|); deleteText and cursor moves are O(k). A doubly linked list with a cursor pointer achieves O(1) per character but O(n) for the return string.',
      },
    ],
  },

  {
    title: 'Maximum Employees to Be Invited to a Meeting',
    slug: 'maximum-employees-to-be-invited-to-a-meeting',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'HARD',
    statement:
      'n employees sit at a round table. favorite[i] is employee i\'s favorite person. Invite a subset so that every invited employee sits next to their favorite. Return the maximum number of employees that can be invited.\n\nExample: favorite=[2,2,1,2] → 3\nExample: favorite=[1,2,0] → 3\nExample: favorite=[3,0,1,4,1] → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'The favorite graph is a functional graph (one outgoing edge per node). Cycles of length ≥ 3 occupy the entire table alone. Mutual pairs (length-2 cycles) can sit with their longest incoming chains.',
      },
      {
        level: 2,
        content:
          'Find all cycles via topological sort (Kahn\'s). Case 1: max cycle of length ≥ 3. Case 2: for each mutual pair a↔b, longest chain into a (not via b) + longest chain into b (not via a) + 2. Answer = max(max_long_cycle, sum of all pair chains). O(n).',
      },
      {
        level: 3,
        content:
          'Topological sort removes all non-cycle nodes while computing chain lengths into each node. After Kahn\'s, remaining nodes form cycles. For each length-2 cycle {a,b}: contribution = chain_a + chain_b + 2 (sum these across all pairs — they can all sit at the same table as a line). For cycles ≥ 3: only the whole cycle fits at the round table. Return max of both cases.',
      },
    ],
  },

  {
    title: 'Longest Cycle in a Graph',
    slug: 'longest-cycle-in-a-graph',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'HARD',
    statement:
      'Directed graph with n nodes. edges[i] is the only outgoing edge from node i (or -1 if none). Find the length of the longest cycle, or -1 if no cycle exists.\n\nExample: edges=[3,3,4,2,3] → 3\nExample: edges=[2,-1,3,1] → -1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each unvisited node, follow the chain recording visit times. If you reach a node visited during the current traversal, you\'ve found a cycle.',
      },
      {
        level: 2,
        content:
          'visit_time=[0]*n, time=1. For each unvisited node start: follow edges; record visit_time[node]=time++. If node already visited in current traversal: cycle_len=current_time-visit_time[node]. Update answer. O(n).',
      },
      {
        level: 3,
        content:
          'Use a single global timestamp. Start a new chain from each unvisited node with a fresh start_time. If during traversal you reach a node with visit_time in [start_time, current_time): it\'s in the current chain — cycle found. If visit_time < start_time: globally visited from a previous chain — no new cycle. Mark all nodes in the current chain as globally visited when done.',
      },
    ],
  },

  {
    title: 'Redundant Connection II',
    slug: 'redundant-connection-ii',
    pattern: 'FAST_SLOW_POINTERS',
    difficulty: 'HARD',
    statement:
      'A rooted tree had one extra directed edge added. Each node has at most one parent. Find and return the redundant edge that, when removed, restores a valid rooted tree.\n\nExample: edges=[[1,2],[1,3],[2,3]] → [2,3]\nExample: edges=[[1,2],[2,3],[3,4],[4,1],[1,5]] → [4,1]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'The extra edge causes either a node with two parents, a cycle, or both. Handle each case: find the candidate edge(s) first, then validate with Union-Find.',
      },
      {
        level: 2,
        content:
          'Find node with two parents → candidate1 (first edge), candidate2 (second edge). If no double-parent: use Union-Find to find the cycle edge and return it. If double-parent: try removing candidate2; if the remaining graph has a cycle, return candidate1 instead. O(n α(n)).',
      },
      {
        level: 3,
        content:
          'Three cases: (1) no double-parent node → standard Union-Find cycle detection, return the last edge that creates a cycle. (2) double-parent but removing candidate2 creates no cycle → return candidate2. (3) double-parent and removing candidate2 still has a cycle → return candidate1. Removing candidate2 first (the later edge) is the greedy choice per problem constraints.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 13 — FAST_SLOW_POINTERS (30 problems)...\n');

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
