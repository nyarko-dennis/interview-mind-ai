import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 14 — LINKED_LISTS (30 problems: 10 Easy, 10 Medium, 10 Hard)
// Already seeded: Reverse Linked List 206 (original seed, LINKED_LISTS Easy)
// FAST_SLOW_POINTERS batch covered cycle detection, middle finding, and traversal basics.
// This batch covers structural operations, arithmetic, and design patterns.
// Easy tier includes foundational structural ops (some LeetCode Medium, simpler in this context).
// Hard tier includes the 2 new Hard problems + complex design Medium problems elevated for challenge.
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
    title: 'Convert Binary Number in a Linked List to Integer',
    slug: 'convert-binary-number-in-a-linked-list-to-integer',
    pattern: 'LINKED_LISTS',
    difficulty: 'EASY',
    statement:
      'The head of a singly linked list whose nodes contain binary digits (0 or 1) represents a binary number (most significant bit first). Return its decimal value.\n\nExample: head=[1,0,1] → 5\nExample: head=[0] → 0',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Traverse the list left to right. Maintain a running integer: shift it left by 1 (multiply by 2) and OR in the current bit.',
      },
      {
        level: 2,
        content:
          'result=0. While node: result=(result<<1)|node.val; node=node.next. Return result. O(n), O(1) space.',
      },
    ],
  },

  {
    title: 'Design HashMap',
    slug: 'design-hashmap',
    pattern: 'LINKED_LISTS',
    difficulty: 'EASY',
    statement:
      'Design a HashMap without using built-in hash table libraries. Implement put(key,value), get(key), and remove(key).\n\nExample: put(1,1); put(2,2); get(1)→1; get(3)→-1; put(2,1); get(2)→1; remove(2); get(2)→-1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use an array of buckets with linked list chaining for collision resolution. Hash key to a bucket index.',
      },
      {
        level: 2,
        content:
          'buckets=[[] for _ in range(SIZE)]. idx=key%SIZE. put: scan bucket for key, update if found else append. get: scan bucket, return value or -1. remove: scan and delete matching pair. O(n/SIZE) average.',
      },
    ],
  },

  {
    title: 'Design HashSet',
    slug: 'design-hashset',
    pattern: 'LINKED_LISTS',
    difficulty: 'EASY',
    statement:
      'Design a HashSet without using built-in hash table libraries. Implement add(key), contains(key), and remove(key).\n\nExample: add(1); add(2); contains(1)→true; contains(3)→false; add(2); contains(2)→true; remove(2); contains(2)→false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use an array of buckets with linked list chaining. Hash each key to a bucket index.',
      },
      {
        level: 2,
        content:
          'buckets=[[] for _ in range(SIZE)]. idx=key%SIZE. add: if not contains(key): bucket.append(key). contains: key in bucket. remove: bucket.remove(key) if present. O(n/SIZE) average.',
      },
    ],
  },

  {
    title: 'Delete N Nodes After M Nodes of a Linked List',
    slug: 'delete-n-nodes-after-m-nodes-of-a-linked-list',
    pattern: 'LINKED_LISTS',
    difficulty: 'EASY',
    statement:
      'Given a linked list and integers m and n, traverse m nodes, delete the next n nodes, repeat until the end.\n\nExample: head=[1,2,3,4,5,6,7,8,9,10,11,12,13], m=2, n=3 → [1,2,6,7,11,12]\nExample: head=[1,2,3,4,5,6,7,8,9,10,11], m=1, n=3 → [1,5,9]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use a single pointer. Advance m nodes to find the tail of a "keep" run, then advance n nodes to skip a "delete" run. Rewire and repeat.',
      },
      {
        level: 2,
        content:
          'curr=head. While curr: advance m-1 steps (stop at last kept node). Store it. Advance n steps from next. Set keep_tail.next=curr. Repeat. O(n_total).',
      },
    ],
  },

  {
    title: 'Swap Nodes in Pairs',
    slug: 'swap-nodes-in-pairs',
    pattern: 'LINKED_LISTS',
    difficulty: 'EASY',
    statement:
      'Given a linked list, swap every two adjacent nodes without modifying node values. Return the new head.\n\nExample: head=[1,2,3,4] → [2,1,4,3]\nExample: head=[1] → [1]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use a dummy head. At each step, rewire two nodes: connect prev → second → first → rest, then advance.',
      },
      {
        level: 2,
        content:
          'dummy→head; prev=dummy. While prev.next and prev.next.next: first=prev.next; second=first.next; first.next=second.next; second.next=first; prev.next=second; prev=first. Return dummy.next. O(n).',
      },
    ],
  },

  {
    title: 'Partition List',
    slug: 'partition-list',
    pattern: 'LINKED_LISTS',
    difficulty: 'EASY',
    statement:
      'Partition a linked list around value x so all nodes less than x come before nodes ≥ x. Preserve the original relative order within each partition.\n\nExample: head=[1,4,3,2,5,2], x=3 → [1,2,2,4,3,5]\nExample: head=[2,1], x=2 → [1,2]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Build two separate lists: one for nodes < x and one for nodes ≥ x. Concatenate them at the end.',
      },
      {
        level: 2,
        content:
          'low_dummy, high_dummy = two dummy heads; low, high = their tails. For each node: if val<x: attach to low else to high. high.next=None; low.next=high_dummy.next. Return low_dummy.next. O(n).',
      },
    ],
  },

  {
    title: 'Odd Even Linked List',
    slug: 'odd-even-linked-list',
    pattern: 'LINKED_LISTS',
    difficulty: 'EASY',
    statement:
      'Group all nodes at odd indices first, then all nodes at even indices (1-indexed). Do it in O(1) extra space and O(n) time.\n\nExample: head=[1,2,3,4,5] → [1,3,5,2,4]\nExample: head=[2,1,3,5,6,4,7] → [2,3,6,7,1,5,4]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Use two pointers: one for the odd chain and one for the even chain. Alternate advancing each, then join the chains.',
      },
      {
        level: 2,
        content:
          'odd=head; even=head.next; even_head=even. While even and even.next: odd.next=even.next; odd=odd.next; even.next=odd.next; even=even.next. odd.next=even_head. Return head. O(n), O(1).',
      },
    ],
  },

  {
    title: 'Merge Nodes in Between Zeros',
    slug: 'merge-nodes-in-between-zeros',
    pattern: 'LINKED_LISTS',
    difficulty: 'EASY',
    statement:
      'A linked list begins and ends with 0, and no two consecutive 0s appear. Merge all nodes between consecutive 0s into a single node whose value is the sum. Return the modified list without the 0s.\n\nExample: head=[0,3,1,0,4,5,2,0] → [4,11]\nExample: head=[0,1,0,3,0,2,2,0] → [1,3,4]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Walk the list accumulating a sum between each pair of zeros. When you hit a zero, store the sum in a result node.',
      },
      {
        level: 2,
        content:
          'dummy=ListNode(0); curr=dummy; node=head.next; total=0. While node: if node.val==0: curr.next=ListNode(total); curr=curr.next; total=0. Else total+=node.val. node=node.next. Return dummy.next. O(n).',
      },
    ],
  },

  {
    title: 'Merge In Between Linked Lists',
    slug: 'merge-in-between-linked-lists',
    pattern: 'LINKED_LISTS',
    difficulty: 'EASY',
    statement:
      'Given list1, and list2, remove nodes a through b (inclusive) from list1 and insert list2 in their place.\n\nExample: list1=[10,1,13,6,9,5], a=3, b=4, list2=[1000000,1000001,1000002] → [10,1,13,1000000,1000001,1000002,5]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Find the node just before index a (call it left) and the node just after index b (call it right). Connect left to list2 head and list2 tail to right.',
      },
      {
        level: 2,
        content:
          'Walk list1: left = node at index a-1; right = node at index b+1. Find list2 tail. left.next=list2; list2_tail.next=right. Return list1. O(n+m).',
      },
    ],
  },

  {
    title: 'Double a Number Represented as a Linked List',
    slug: 'double-a-number-represented-as-a-linked-list',
    pattern: 'LINKED_LISTS',
    difficulty: 'EASY',
    statement:
      'A non-negative integer is stored as a linked list of digits (most significant first, no leading zeros). Double it and return the result as a linked list.\n\nExample: head=[1,8,9] → [3,7,8]\nExample: head=[9,9,9] → [1,9,9,8]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Reverse the list, double each digit propagating carry, then reverse back. Or use a stack to handle carries from the tail.',
      },
      {
        level: 2,
        content:
          'Reverse list. carry=0. For each node: val=node.val*2+carry; node.val=val%10; carry=val//10. If carry: append new node. Reverse again. Return head. O(n).',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Add Two Numbers',
    slug: 'add-two-numbers',
    pattern: 'LINKED_LISTS',
    difficulty: 'MEDIUM',
    statement:
      'Two non-empty linked lists represent non-negative integers with digits in reverse order. Add the two numbers and return the sum as a linked list.\n\nExample: l1=[2,4,3], l2=[5,6,4] → [7,0,8] (342+465=807)\nExample: l1=[9,9,9,9,9,9,9], l2=[9,9,9,9] → [8,9,9,9,0,0,0,1]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Simulate long addition. Walk both lists simultaneously, summing corresponding digits plus carry. Continue until both lists and carry are exhausted.',
      },
      {
        level: 2,
        content:
          'dummy=ListNode(); curr=dummy; carry=0. While l1 or l2 or carry: s=(l1.val if l1 else 0)+(l2.val if l2 else 0)+carry; carry=s//10; curr.next=ListNode(s%10); curr=curr.next; advance l1,l2. Return dummy.next. O(max(m,n)).',
      },
      {
        level: 3,
        content:
          'The reversed storage makes digit-by-digit addition natural (index 0 = ones place). Create a new result list rather than modifying either input. The extra carry node at the end (e.g., 999+1=1000) is handled by the "while carry" continuation after both lists end.',
      },
    ],
  },

  {
    title: 'Add Two Numbers II',
    slug: 'add-two-numbers-ii',
    pattern: 'LINKED_LISTS',
    difficulty: 'MEDIUM',
    statement:
      'Two non-empty linked lists represent non-negative integers with digits in forward order (most significant first). Add the two numbers and return the sum as a linked list. Do not reverse the input lists.\n\nExample: l1=[7,2,4,3], l2=[5,6,4] → [7,8,0,7]\nExample: l1=[5], l2=[5] → [1,0]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use stacks to process digits from least-significant to most-significant without reversing the lists.',
      },
      {
        level: 2,
        content:
          'Push both lists onto stacks. Pop simultaneously: sum=s1.pop()+s2.pop()+carry; new_node.next=curr_head; curr_head=new_node. Repeat until stacks and carry exhausted. Return curr_head. O(m+n).',
      },
      {
        level: 3,
        content:
          'Build the result by prepending nodes (inserting at the front) so digits naturally appear most-significant-first. The stacks invert the digit order so the least significant digit is processed first, enabling standard carry propagation.',
      },
    ],
  },

  {
    title: 'Reverse Linked List II',
    slug: 'reverse-linked-list-ii',
    pattern: 'LINKED_LISTS',
    difficulty: 'MEDIUM',
    statement:
      'Reverse the portion of a linked list between positions left and right (1-indexed) in one pass.\n\nExample: head=[1,2,3,4,5], left=2, right=4 → [1,4,3,2,5]\nExample: head=[5], left=1, right=1 → [5]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Find the node just before position left. Reverse the sublist from left to right using standard in-place reversal. Reconnect the boundaries.',
      },
      {
        level: 2,
        content:
          'dummy→head; pre=dummy. Advance pre to position left-1. Reverse right-left times using: curr=pre.next; next=curr.next; curr.next=next.next; next.next=pre.next; pre.next=next. Return dummy.next. O(n), one pass.',
      },
      {
        level: 3,
        content:
          'The "insert at front" technique: in each iteration, detach the node immediately after curr and reattach it just after pre. After right-left iterations, the sublist is reversed. pre stays fixed; curr stays at the tail of the reversed segment. No need to find the right boundary explicitly.',
      },
    ],
  },

  {
    title: 'Flatten a Multilevel Doubly Linked List',
    slug: 'flatten-a-multilevel-doubly-linked-list',
    pattern: 'LINKED_LISTS',
    difficulty: 'MEDIUM',
    statement:
      'A doubly linked list may have child pointers leading to separate lists. Flatten it so all nodes appear in a single-level doubly linked list (child lists appear after their parent, depth-first).\n\nExample: head=[1,2,3,4,5,6,null,null,null,7,8,9,10,null,null,11,12] → [1,2,3,7,8,11,12,9,10,4,5,6]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'When you encounter a node with a child, insert the child list between the current node and its next. Continue traversal; the child list will be processed naturally.',
      },
      {
        level: 2,
        content:
          'curr=head. While curr: if curr.child: find child list tail; tail.next=curr.next; if curr.next: curr.next.prev=tail; curr.next=curr.child; curr.child.prev=curr; curr.child=None. curr=curr.next. O(n).',
      },
      {
        level: 3,
        content:
          'The key is splicing the child list in place: wire (curr ↔ child_head) and (child_tail ↔ curr.next). After splicing, curr.child=None and traversal continues at the child head — it will eventually reach the original curr.next. No stack needed; the in-place rewiring handles all levels.',
      },
    ],
  },

  {
    title: 'LRU Cache',
    slug: 'lru-cache',
    pattern: 'LINKED_LISTS',
    difficulty: 'MEDIUM',
    statement:
      'Design an LRU cache with capacity. get(key) returns -1 if absent. put(key,value) inserts or updates; if at capacity, evict the least recently used key. Both operations must be O(1).\n\nExample: cap=2; put(1,1); put(2,2); get(1)→1; put(3,3)[evict 2]; get(2)→-1; put(4,4)[evict 1]; get(1)→-1; get(3)→3; get(4)→4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Combine a doubly linked list (for O(1) move-to-front and evict-from-tail) with a hash map (for O(1) key lookup). Most-recently used = head; least-recently used = tail.',
      },
      {
        level: 2,
        content:
          'DLL with dummy head and tail. HashMap key→node. get: if key in map: move node to head, return val. put: if key in map: update and move to head; else create node, insert at head; if len>cap: remove tail node and from map. O(1) all.',
      },
      {
        level: 3,
        content:
          'The dummy head/tail sentinels eliminate edge cases for insert and remove operations. "Move to front" = remove from current position + insert after dummy head. "Evict LRU" = remove the node just before dummy tail. All pointer updates are O(1) because you have direct references via the hashmap.',
      },
    ],
  },

  {
    title: 'Linked List Random Node',
    slug: 'linked-list-random-node',
    pattern: 'LINKED_LISTS',
    difficulty: 'MEDIUM',
    statement:
      'Given a singly linked list, return a random node\'s value (equal probability) using O(1) extra space and without knowing the list length in advance.\n\nExample: getRandom()→any value with equal probability over all nodes.',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use reservoir sampling. Traverse the list; for the i-th node, replace the result with a probability of 1/i.',
      },
      {
        level: 2,
        content:
          'result=head.val; i=1; node=head.next. While node: i++; if randint(1,i)==1: result=node.val. node=node.next. Return result. O(n) per call, O(1) space.',
      },
      {
        level: 3,
        content:
          'Proof of uniform probability: node k is chosen iff it was selected at step k (prob 1/k) and not replaced by any subsequent step k+1..n. P = (1/k) * (k/(k+1)) * ((k+1)/(k+2)) * ... * ((n-1)/n) = 1/n. The telescope product gives equal probability for all nodes.',
      },
    ],
  },

  {
    title: 'Design Linked List',
    slug: 'design-linked-list',
    pattern: 'LINKED_LISTS',
    difficulty: 'MEDIUM',
    statement:
      'Implement a singly or doubly linked list with get(index), addAtHead(val), addAtTail(val), addAtIndex(index,val), and deleteAtIndex(index).\n\nExample: addAtHead(1); addAtTail(3); addAtIndex(1,2); get(1)→2; deleteAtIndex(1); get(1)→3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a dummy head node and maintain a size counter. For get/add/delete, traverse to the target index using a pointer.',
      },
      {
        level: 2,
        content:
          'Store size and dummy head. get(i): traverse i steps from dummy.next. addAtIndex(i,v): traverse to i-1 steps from dummy, insert new node. deleteAtIndex: traverse to i-1 steps from dummy, skip next. O(n) per op.',
      },
      {
        level: 3,
        content:
          'The dummy head eliminates special cases for insertions/deletions at position 0. For a doubly linked list, also maintain a dummy tail for O(1) addAtTail. Always validate index bounds (0..size-1 for get/delete, 0..size for addAtIndex) before traversal.',
      },
    ],
  },

  {
    title: 'Split Linked List in Parts',
    slug: 'split-linked-list-in-parts',
    pattern: 'LINKED_LISTS',
    difficulty: 'MEDIUM',
    statement:
      'Split a linked list into k consecutive parts as evenly as possible. Larger parts come first. Parts not present are null.\n\nExample: head=[1,2,3], k=5 → [[1],[2],[3],[],[]]\nExample: head=[1,2,3,4,5,6,7,8,9,10], k=3 → [[1,2,3,4],[5,6,7],[8,9,10]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Find the list length. The first (length%k) parts get (length//k+1) nodes each; the rest get (length//k) nodes.',
      },
      {
        level: 2,
        content:
          'n=length(list). base=n//k; extra=n%k. curr=head. For i in 0..k-1: part_head=curr; size=base+(1 if i<extra else 0); advance size-1 steps; cut: save curr.next, set curr.next=None, curr=saved. res[i]=part_head. O(n+k).',
      },
      {
        level: 3,
        content:
          'The "cut" step requires: reach the last node of the current part (advance size-1 steps from part_head), save its next pointer, set it to None (terminating the part), then continue from the saved pointer for the next part. Guard against curr being null when the list runs out.',
      },
    ],
  },

  {
    title: 'Remove Nodes From Linked List',
    slug: 'remove-nodes-from-linked-list',
    pattern: 'LINKED_LISTS',
    difficulty: 'MEDIUM',
    statement:
      'Remove every node with a value strictly less than the maximum value to its right. Return the modified list.\n\nExample: head=[5,2,13,3,8] → [13,8]\nExample: head=[1,1,1,1] → [1]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A node is removed if any node to its right is strictly greater. Traverse right to left, keeping a running maximum; keep nodes equal to or greater than the max.',
      },
      {
        level: 2,
        content:
          'Reverse list. max_val=head.val; curr=head.next; prev=head. While curr: if curr.val<max_val: prev.next=curr.next. Else max_val=curr.val; prev=curr. curr=curr.next. Reverse back. O(n).',
      },
      {
        level: 3,
        content:
          'Monotonic stack alternative (no reversal): use a decreasing stack of nodes. For each node: while stack.top().val < curr.val: pop. Push curr. The remaining stack is the answer. Rewire next pointers from bottom of stack to top. O(n).',
      },
    ],
  },

  {
    title: 'Insertion Sort List',
    slug: 'insertion-sort-list',
    pattern: 'LINKED_LISTS',
    difficulty: 'MEDIUM',
    statement:
      'Sort a linked list using insertion sort.\n\nExample: head=[4,2,1,3] → [1,2,3,4]\nExample: head=[-1,5,3,4,0] → [-1,0,3,4,5]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Maintain a sorted portion starting from a dummy head. For each new node, find its insertion position in the sorted portion.',
      },
      {
        level: 2,
        content:
          'dummy=ListNode(-inf); For each node in original list: prev=dummy. While prev.next and prev.next.val<=node.val: prev=prev.next. node.next=prev.next; prev.next=node. Return dummy.next. O(n²).',
      },
      {
        level: 3,
        content:
          'Optimization: if the new node\'s value ≥ the current tail of the sorted portion, append directly (O(1) for already-sorted input). Otherwise, start the inner scan from dummy. Detach each node from the original list before inserting into the sorted portion to avoid stale next pointers.',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Maximum Frequency Stack',
    slug: 'maximum-frequency-stack',
    pattern: 'LINKED_LISTS',
    difficulty: 'HARD',
    statement:
      'Design a stack-like data structure. push(val) pushes an integer. pop() removes and returns the most frequent element (breaking ties by returning the most recently pushed).\n\nExample: push(5); push(7); push(5); push(7); push(4); push(5); pop()→5; pop()→7; pop()→5; pop()→4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Track the frequency of each element and maintain a map from frequency to a stack of elements with that frequency. Track the current maximum frequency.',
      },
      {
        level: 2,
        content:
          'freq=HashMap key→count. group=HashMap freq→stack. max_freq=0. push(v): freq[v]++; group[freq[v]].push(v); max_freq=max(max_freq,freq[v]). pop(): v=group[max_freq].pop(); freq[v]--; if group[max_freq] empty: max_freq--. Return v. O(1) both.',
      },
      {
        level: 3,
        content:
          'The group stacks preserve insertion order within a frequency level. When popping at max_freq, the most recently pushed element at that frequency is naturally at the top of group[max_freq]. When group[max_freq] becomes empty after a pop, max_freq decrements by 1 (because only a push could have raised it to max_freq, and we just undid one).',
      },
    ],
  },

  {
    title: 'Finding MK Average',
    slug: 'finding-mk-average',
    pattern: 'LINKED_LISTS',
    difficulty: 'HARD',
    statement:
      'Design a data structure that accepts a stream of integers. calculateMKAverage() returns the average of the last m elements, excluding the k smallest and k largest. Return -1 if fewer than m elements have been added. Round toward zero.\n\nExample: m=3, k=1; addElement(3); addElement(1); calculateMKAverage()→-1; addElement(10); calculateMKAverage()→3; addElement(5); calculateMKAverage()→5; addElement(5); calculateMKAverage()→5',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Maintain the last m elements in a sliding window. Use three sorted structures to track the smallest k, middle (m-2k), and largest k elements of the window.',
      },
      {
        level: 2,
        content:
          'Use a deque to track the window. Three sorted lists (or a sorted container): lo (size k), mid (size m-2k), hi (size k). Maintain their sums. On add: enqueue; when window size exceeds m, dequeue and remove from the right sorted structure. calculateMKAverage=mid_sum//(m-2k). O(log m) per add.',
      },
      {
        level: 3,
        content:
          'Rebalancing: after adding/removing, ensure lo has the k smallest and hi has the k largest of the current window. If lo.max > mid.min: swap. If hi.min < mid.max: swap. A SortedList (Python) or TreeMap (Java) supports O(log m) insertion, deletion, and min/max queries. Maintain running sums for O(1) average calculation.',
      },
    ],
  },

  {
    title: 'Flatten Nested List Iterator',
    slug: 'flatten-nested-list-iterator',
    pattern: 'LINKED_LISTS',
    difficulty: 'HARD',
    statement:
      'Implement an iterator to flatten a nested list of integers. next() returns the next integer; hasNext() returns true if there are more integers.\n\nExample: [[1,1],2,[1,1]] → 1,1,2,1,1\nExample: [1,[4,[6]]] → 1,4,6',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a stack of iterators (or index pointers). When an element is a list, push a new iterator for it onto the stack and recurse.',
      },
      {
        level: 2,
        content:
          'Stack of iterators. hasNext(): while stack non-empty and current iterator exhausted: pop. If current element is list: push new iterator for it; else return True. next(): return stack.top().current and advance. O(1) amortized.',
      },
      {
        level: 3,
        content:
          'The iterative approach: maintain a stack of (list, index) pairs. hasNext(): while stack top is exhausted or points to a list: unwrap. Peel lists off until you reach an integer. next(): return the integer and advance index. Each element is pushed/popped at most once → O(n) total across all calls.',
      },
    ],
  },

  {
    title: 'Reverse Nodes in Even Length Groups',
    slug: 'reverse-nodes-in-even-length-groups',
    pattern: 'LINKED_LISTS',
    difficulty: 'HARD',
    statement:
      'Nodes of a linked list are split into consecutive groups of sizes 1, 2, 3, ... The last group may be smaller. Reverse every group of even length. Return the modified list.\n\nExample: head=[5,2,6,3,9,1,7,3,8,4] → [5,6,2,3,9,1,4,8,3,7]\nExample: head=[1,1,0,6] → [1,0,1,6]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Walk the list in group-sized chunks. Count the actual size of each group (the last may be smaller). If the group\'s actual size is even, reverse it in place.',
      },
      {
        level: 2,
        content:
          'prev=dummy; group_size=1. While prev.next: count actual group length (min(group_size, remaining)). If count is even: reverse that sublist and reconnect. Advance prev to end of group. group_size++. O(n).',
      },
      {
        level: 3,
        content:
          'For each group: record group_head=prev.next; walk count steps to find group_tail. If count even: reverse group_head..group_tail using standard reversal; set prev.next=new_head; new_tail.next=next_group_head. Whether reversed or not, advance prev to the last node of the group. Careful: after reversal, group_head becomes the tail.',
      },
    ],
  },

  {
    title: 'Convert Binary Search Tree to Sorted Doubly Linked List',
    slug: 'convert-bst-to-sorted-doubly-linked-list',
    pattern: 'LINKED_LISTS',
    difficulty: 'HARD',
    statement:
      'Convert a BST to a sorted circular doubly linked list in-place. Nodes\' left pointers become prev pointers; right pointers become next pointers.\n\nExample: BST root=[4,2,5,1,3] → circular DLL [1↔2↔3↔4↔5↔] (circular)',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Do an in-order traversal. Link each visited node to the previous one (left=prev, prev.right=curr). Connect head and tail at the end to make it circular.',
      },
      {
        level: 2,
        content:
          'In-order DFS with global prev and head. For each node: if prev: prev.right=node; node.left=prev. Else head=node. prev=node. After traversal: head.left=prev; prev.right=head. Return head. O(n).',
      },
      {
        level: 3,
        content:
          'The in-order traversal visits nodes in sorted order. Maintaining "prev" allows linking each node to the previously visited one as we go. After the traversal, prev holds the rightmost (largest) node — wire it to head (smallest) and vice versa to close the circular structure.',
      },
    ],
  },

  {
    title: 'Design Front Middle Back Queue',
    slug: 'design-front-middle-back-queue',
    pattern: 'LINKED_LISTS',
    difficulty: 'HARD',
    statement:
      'Design a queue supporting pushFront, pushMiddle, pushBack, popFront, popMiddle, popBack in O(1) time. Middle of even-length queue is the lower-middle index.\n\nExample: pushFront(1); pushBack(2); pushMiddle(3); pushMiddle(4); popFront()→1; popMiddle()→3; popMiddle()→4; popBack()→2; popFront()→-1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use two deques: left (first half) and right (second half). Maintain the invariant that right.size - left.size ∈ {0, 1} by rebalancing after each operation.',
      },
      {
        level: 2,
        content:
          'left, right = deques. After each push/pop: if |right|-|left| > 1: left.append(right.popleft()); if |left| > |right|: right.appendleft(left.pop()). pushMiddle: if |left|==|right|: right.appendleft(val); else left.append(val); rebalance. O(1) all ops.',
      },
      {
        level: 3,
        content:
          'The two-deque invariant means the middle is always right[0] (lower-middle for even length) or left[-1] when left is longer. Rebalancing ensures the split stays correct. All push/pop operations only touch the front or back of either deque — O(1). popMiddle = pop right[0] if right size > left, else pop left[-1].',
      },
    ],
  },

  {
    title: 'Design Circular Queue',
    slug: 'design-circular-queue',
    pattern: 'LINKED_LISTS',
    difficulty: 'HARD',
    statement:
      'Design a circular queue (ring buffer) supporting enQueue, deQueue, Front, Rear, isEmpty, isFull in O(1) time.\n\nExample: cap=3; enQueue(1)→true; enQueue(2)→true; enQueue(3)→true; enQueue(4)→false; Rear()→3; isFull()→true; deQueue()→true; enQueue(4)→true; Rear()→4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a fixed-size array with head and tail index pointers that wrap around using modulo arithmetic.',
      },
      {
        level: 2,
        content:
          'data=[0]*k; head=0; tail=0; size=0. enQueue: if isFull: false; data[tail]=val; tail=(tail+1)%k; size++. deQueue: if isEmpty: false; head=(head+1)%k; size--. Front=data[head]; Rear=data[(tail-1+k)%k]. O(1) all.',
      },
      {
        level: 3,
        content:
          'The modulo wrapping eliminates the need to shift elements. Track size separately from head/tail to distinguish empty (size==0) from full (size==k) — otherwise head==tail is ambiguous. Rear = data[(tail-1+k)%k] handles the wrap-around correctly.',
      },
    ],
  },

  {
    title: 'Design Circular Deque',
    slug: 'design-circular-deque',
    pattern: 'LINKED_LISTS',
    difficulty: 'HARD',
    statement:
      'Design a circular double-ended queue supporting insertFront, insertLast, deleteFront, deleteLast, getFront, getRear, isEmpty, isFull in O(1) time.\n\nExample: cap=3; insertLast(1)→true; insertLast(2)→true; insertFront(3)→true; insertFront(4)→false; getRear()→2; isFull()→true; deleteLast()→true; insertFront(4)→true; getFront()→4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a fixed-size array with front and rear pointers that wrap around. Inserting at the front decrements (with wrap); inserting at the rear increments (with wrap).',
      },
      {
        level: 2,
        content:
          'data=[0]*k; front=0; size=0. insertFront(v): front=(front-1+k)%k; data[front]=v; size++. insertLast(v): data[(front+size)%k]=v; size++. deleteFront: front=(front+1)%k; size--. deleteLast: size--. getFront=data[front]; getRear=data[(front+size-1)%k]. O(1) all.',
      },
      {
        level: 3,
        content:
          'All positions derive from front and size: rear index = (front+size-1)%k. insertFront decrements front before writing; insertLast writes at (front+size)%k. Deletion is just pointer adjustment. A doubly linked list with dummy head/tail is an alternative O(1) implementation.',
      },
    ],
  },

  {
    title: 'Design Browser History',
    slug: 'design-browser-history',
    pattern: 'LINKED_LISTS',
    difficulty: 'HARD',
    statement:
      'Design a browser with visit(url), back(steps), and forward(steps). back/forward move at most as many steps as available in history.\n\nExample: visit("leetcode.com"); visit("google.com"); visit("facebook.com"); back(1)→"google.com"; back(1)→"leetcode.com"; forward(1)→"google.com"; visit("youtube.com"); forward(2)→"youtube.com"; back(2)→"leetcode.com"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a doubly linked list of visited URLs with a current pointer. visit clears forward history; back/forward move the pointer.',
      },
      {
        level: 2,
        content:
          'DLL with curr pointer. visit(url): create node; curr.next=node; node.prev=curr; curr=node (clears forward by not preserving curr.next chain). back(k): move curr = curr.prev up to k times. forward(k): move curr = curr.next up to k times. O(steps).',
      },
      {
        level: 3,
        content:
          'visit() truncates forward history simply by making curr.next = new_node (old forward chain becomes unreachable). No explicit deletion needed. back/forward are bounded by the actual available history. Two-stack alternative: left stack = history, right stack = forward — visit clears right stack.',
      },
    ],
  },

  {
    title: 'Remove Zero Sum Consecutive Nodes from Linked List',
    slug: 'remove-zero-sum-consecutive-nodes-from-linked-list',
    pattern: 'LINKED_LISTS',
    difficulty: 'HARD',
    statement:
      'Repeatedly remove contiguous subsequences of the linked list that sum to 0 until no more exist. Return the resulting list.\n\nExample: head=[1,2,-3,3,1] → [3,1] or [1,2,1]\nExample: head=[1,2,3,-3,-2] → [1]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a prefix sum hash map. If the same prefix sum appears twice, the sublist between those two nodes sums to zero — remove it.',
      },
      {
        level: 2,
        content:
          'dummy=ListNode(0); prefix=0; seen={0:dummy}. Pass 1: for each node: prefix+=node.val; seen[prefix]=node (overwrite). Pass 2: prefix=0; for each node: prefix+=node.val; node.next=seen[prefix].next. Return dummy.next. O(n).',
      },
      {
        level: 3,
        content:
          'Two-pass approach: Pass 1 records the LAST node at each prefix sum (overwrites earlier occurrences). Pass 2 uses those "last" nodes to skip over all zero-sum subsequences at once. The dummy node anchors prefix sum 0 so subsequences starting from the head are handled correctly.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 14 — LINKED_LISTS (30 problems)...\n');

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
