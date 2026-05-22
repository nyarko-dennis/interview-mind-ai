import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 7 — HASH_MAPS (28 problems: 9 Easy, 9 Medium, 10 Hard)
// Already seeded: Two Sum (Easy), Group Anagrams (Medium)
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
    title: 'Valid Anagram',
    slug: 'valid-anagram',
    pattern: 'HASH_MAPS',
    difficulty: 'EASY',
    statement:
      'Given two strings s and t, return true if t is an anagram of s (same characters in any order, same frequencies).\n\nExample: s="anagram", t="nagaram" → true\nExample: s="rat", t="car" → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Count the frequency of each character in both strings. If all frequencies match, they are anagrams. You can use one frequency map: increment for s, decrement for t, check all are zero.',
      },
      {
        level: 2,
        content:
          'Hash Map. count=Counter(s). For ch in t: count[ch]-=1. Return all(v==0 for v in count.values()). Or simply: return Counter(s)==Counter(t). Both are O(n) time. For ASCII-only strings, a fixed array of 26 integers is slightly faster.',
      },
    ],
  },

  {
    title: 'Intersection of Two Arrays',
    slug: 'intersection-of-two-arrays',
    pattern: 'HASH_MAPS',
    difficulty: 'EASY',
    statement:
      'Given two integer arrays nums1 and nums2, return their intersection — each element in the result must be unique.\n\nExample: nums1=[1,2,2,1], nums2=[2,2] → [2]\nExample: nums1=[4,9,5], nums2=[9,4,9,8,4] → [9,4] (order does not matter)',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Convert one array to a set for O(1) lookup. Iterate the other; if an element is in the set, add it to the result set. Using a result set automatically deduplicates.',
      },
      {
        level: 2,
        content:
          'Hash Set. set1=set(nums1). return list(set(n for n in nums2 if n in set1)). O(m+n) time. Alternatively, return list(set(nums1) & set(nums2)) — Python set intersection does this in one line.',
      },
    ],
  },

  {
    title: 'Intersection of Two Arrays II',
    slug: 'intersection-of-two-arrays-ii',
    pattern: 'HASH_MAPS',
    difficulty: 'EASY',
    statement:
      'Given two integer arrays, return their intersection including duplicates — if an element appears k1 times in nums1 and k2 times in nums2, include it min(k1, k2) times.\n\nExample: nums1=[1,2,2,1], nums2=[2,2] → [2,2]\nExample: nums1=[4,9,5], nums2=[9,4,9,8,4] → [4,9]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Count the frequency of each element in the smaller array. Iterate the other; for each match, include the element in the result and decrement the count.',
      },
      {
        level: 2,
        content:
          'Hash Map. count=Counter(nums1). result=[]. For n in nums2: if count[n]>0: result.append(n); count[n]-=1. Return result. O(m+n) time, O(min(m,n)) space for the counter. If arrays are sorted, a two-pointer approach uses O(1) extra space.',
      },
    ],
  },

  {
    title: 'Happy Number',
    slug: 'happy-number',
    pattern: 'HASH_MAPS',
    difficulty: 'EASY',
    statement:
      'Starting from n, repeatedly replace the number by the sum of squares of its digits. Return true if this process eventually reaches 1. Return false if it loops endlessly.\n\nExample: n=19 → true (1²+9²=82 → 8²+2²=68 → 6²+8²=100 → 1)\nExample: n=2 → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'An unhappy number always cycles back through a known set of values before reaching 1. Use a hash set to detect if a value has been seen before — if so, there is a cycle and the number is not happy.',
      },
      {
        level: 2,
        content:
          'Hash Set cycle detection. def sumSq(n): return sum(int(d)**2 for d in str(n)). seen=set(). While n!=1: if n in seen: return False. seen.add(n); n=sumSq(n). return True. Alternative: fast/slow pointer (Floyd\'s cycle detection) avoids the set entirely.',
      },
    ],
  },

  {
    title: 'Contains Duplicate',
    slug: 'contains-duplicate',
    pattern: 'HASH_MAPS',
    difficulty: 'EASY',
    statement:
      'Given an integer array nums, return true if any value appears at least twice, false if every element is distinct.\n\nExample: nums=[1,2,3,1] → true\nExample: nums=[1,2,3,4] → false\nExample: nums=[1,1,1,3,3,4,3,2,4,2] → true',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'A hash set stores only unique elements. As you insert each number, check if it is already in the set. If it is, a duplicate has been found.',
      },
      {
        level: 2,
        content:
          'Hash Set. seen=set(). For n in nums: if n in seen: return True. seen.add(n). return False. Or: return len(nums)!=len(set(nums)). Both are O(n) time. The one-liner builds the full set; the loop returns immediately on the first duplicate.',
      },
    ],
  },

  {
    title: 'Word Pattern',
    slug: 'word-pattern',
    pattern: 'HASH_MAPS',
    difficulty: 'EASY',
    statement:
      'Given a pattern string and a string s (words separated by spaces), return true if s follows the same pattern — each letter in pattern maps to exactly one word, and each word maps to exactly one letter (bijection).\n\nExample: pattern="abba", s="dog cat cat dog" → true\nExample: pattern="abba", s="dog cat cat fish" → false\nExample: pattern="aaaa", s="dog cat cat dog" → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'You need a bijection: each pattern character maps to exactly one word AND each word maps to exactly one character. Two maps (char→word and word→char) let you check both directions.',
      },
      {
        level: 2,
        content:
          'Two Hash Maps. words=s.split(). if len(words)!=len(pattern): return False. c2w={}; w2c={}. For c,w in zip(pattern,words): if c in c2w and c2w[c]!=w: return False. if w in w2c and w2c[w]!=c: return False. c2w[c]=w; w2c[w]=c. Return True. Both directions must be consistent.',
      },
    ],
  },

  {
    title: 'Isomorphic Strings',
    slug: 'isomorphic-strings',
    pattern: 'HASH_MAPS',
    difficulty: 'EASY',
    statement:
      'Given two strings s and t, return true if they are isomorphic — each character in s can be replaced by exactly one character to get t, and no two characters map to the same character.\n\nExample: s="egg", t="add" → true (e→a, g→d)\nExample: s="foo", t="bar" → false (o maps to a and r simultaneously)\nExample: s="paper", t="title" → true',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Maintain two maps: one from s-char to t-char, one from t-char to s-char. At each position, verify both the forward and reverse mappings are consistent.',
      },
      {
        level: 2,
        content:
          'Two Hash Maps. s2t={}; t2s={}. For a,b in zip(s,t): if s2t.get(a,b)!=b or t2s.get(b,a)!=a: return False. s2t[a]=b; t2s[b]=a. Return True. Checking both maps ensures no two characters in s map to the same character in t.',
      },
    ],
  },

  {
    title: 'Ransom Note',
    slug: 'ransom-note',
    pattern: 'HASH_MAPS',
    difficulty: 'EASY',
    statement:
      'Given two strings ransomNote and magazine, return true if ransomNote can be constructed using letters from magazine. Each letter in magazine may only be used once.\n\nExample: ransomNote="a", magazine="b" → false\nExample: ransomNote="aa", magazine="ab" → false\nExample: ransomNote="aa", magazine="aab" → true',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Count the frequency of each letter in magazine. For each letter in ransomNote, check you have enough available; if not, return false.',
      },
      {
        level: 2,
        content:
          'Hash Map. mag=Counter(magazine). For ch in ransomNote: if mag[ch]<=0: return False. mag[ch]-=1. Return True. Or: return not (Counter(ransomNote)-Counter(magazine)) — Counter subtraction drops zero/negative counts; a non-empty result means a deficit.',
      },
    ],
  },

  {
    title: 'First Unique Character in a String',
    slug: 'first-unique-character-in-a-string',
    pattern: 'HASH_MAPS',
    difficulty: 'EASY',
    statement:
      'Given a string s, find the first non-repeating character and return its index. Return -1 if none exists.\n\nExample: s="leetcode" → 0 (\'l\')\nExample: s="loveleetcode" → 2 (\'v\')\nExample: s="aabb" → -1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Two passes: first, count the frequency of each character. Second, return the index of the first character with frequency 1.',
      },
      {
        level: 2,
        content:
          'Hash Map. count=Counter(s). For i,ch in enumerate(s): if count[ch]==1: return i. Return -1. O(n) time, O(1) space (at most 26 distinct lowercase letters). The two-pass approach is necessary — you can\'t know if a character is unique until you\'ve seen all occurrences.',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Longest Consecutive Sequence',
    slug: 'longest-consecutive-sequence',
    pattern: 'HASH_MAPS',
    difficulty: 'MEDIUM',
    statement:
      'Given an unsorted integer array nums, return the length of the longest consecutive sequence. Must run in O(n).\n\nExample: nums=[100,4,200,1,3,2] → 4 (sequence 1,2,3,4)\nExample: nums=[0,3,7,2,5,8,4,6,0,1] → 9',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Put all numbers in a hash set for O(1) lookup. A sequence only needs to be counted from its start — a number n is the start of a sequence only if n-1 is NOT in the set. From each start, extend the sequence by checking n+1, n+2, …',
      },
      {
        level: 2,
        content:
          'Hash Set. num_set=set(nums). ans=0. For n in num_set: if n-1 not in num_set (n is a sequence start): length=1. While n+length in num_set: length++. ans=max(ans,length). Return ans. The "start" check ensures each sequence is counted once, giving O(n) amortised.',
      },
      {
        level: 3,
        content:
          'num_set=set(nums); ans=0. For n in num_set: if n-1 not in num_set: cur=n; streak=1. While cur+1 in num_set: cur+=1; streak+=1. ans=max(ans,streak). Return ans. Each element is visited at most twice (once as a start candidate, once during a streak), so the total work is O(n).',
      },
    ],
  },

  {
    title: 'Top K Frequent Elements',
    slug: 'top-k-frequent-elements',
    pattern: 'HASH_MAPS',
    difficulty: 'MEDIUM',
    statement:
      'Given an integer array nums and integer k, return the k most frequent elements. You may return the answer in any order.\n\nExample: nums=[1,1,1,2,2,3], k=2 → [1,2]\nExample: nums=[1], k=1 → [1]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Count frequencies with a hash map. Then extract the top k by frequency. A min-heap of size k or bucket sort (by frequency, max frequency ≤ n) can do this optimally.',
      },
      {
        level: 2,
        content:
          'Bucket Sort. Count frequencies (O(n)). Create buckets[i] = list of numbers with frequency i (i from 1 to n). Iterate buckets from highest to lowest, collecting elements until you have k. O(n) total — faster than sorting by frequency.',
      },
      {
        level: 3,
        content:
          'count=Counter(nums). buckets=[[] for _ in range(n+1)]. For num,freq in count.items(): buckets[freq].append(num). result=[]. For freq in range(n,0,-1): result.extend(buckets[freq]). if len(result)>=k: return result[:k]. Return result. The bucket index directly encodes frequency, giving O(n) without a sort.',
      },
    ],
  },

  {
    title: 'Subarray Sum Equals K',
    slug: 'subarray-sum-equals-k',
    pattern: 'HASH_MAPS',
    difficulty: 'MEDIUM',
    statement:
      'Given an array nums of integers and integer k, return the total number of subarrays whose sum equals k.\n\nExample: nums=[1,1,1], k=2 → 2\nExample: nums=[1,2,3], k=3 → 2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A subarray sum from index i to j equals prefix[j+1] - prefix[i]. You need count of pairs where prefix[j+1] - prefix[i] == k, i.e., prefix[i] == prefix[j+1] - k. Use a hash map counting prefix sum occurrences seen so far.',
      },
      {
        level: 2,
        content:
          'Prefix Sum + Hash Map. prefix_count={0:1}; prefix_sum=0; count=0. For each num: prefix_sum+=num. count+=prefix_count.get(prefix_sum-k, 0). prefix_count[prefix_sum]=prefix_count.get(prefix_sum,0)+1. Return count. O(n) time, O(n) space.',
      },
      {
        level: 3,
        content:
          'from collections import defaultdict. prefix_count=defaultdict(int); prefix_count[0]=1; ps=count=0. For n in nums: ps+=n. count+=prefix_count[ps-k]. prefix_count[ps]+=1. Return count. The initial {0:1} handles subarrays starting at index 0. Lookup happens before insertion to avoid counting a subarray [i,i] as a match with itself.',
      },
    ],
  },

  {
    title: '4Sum II',
    slug: '4sum-ii',
    pattern: 'HASH_MAPS',
    difficulty: 'MEDIUM',
    statement:
      'Given four integer arrays of length n, count tuples (i,j,k,l) such that nums1[i]+nums2[j]+nums3[k]+nums4[l]==0.\n\nExample: nums1=[1,2], nums2=[-2,-1], nums3=[-1,2], nums4=[0,2] → 2\nExample: nums1=[0], nums2=[0], nums3=[0], nums4=[0] → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Brute force is O(n⁴). Split into two halves: for all pairs from nums1×nums2 count their sums; then for all pairs from nums3×nums4 check if the negation of their sum exists in the map.',
      },
      {
        level: 2,
        content:
          'Hash Map meet-in-the-middle. count=Counter(a+b for a in nums1 for b in nums2). Return sum(count[-(c+d)] for c in nums3 for d in nums4). O(n²) time and space.',
      },
      {
        level: 3,
        content:
          'from collections import defaultdict. ab=defaultdict(int). For a in nums1: for b in nums2: ab[a+b]+=1. result=0. For c in nums3: for d in nums4: result+=ab[-(c+d)]. Return result. The key insight: -(c+d) is what a+b must equal. Two O(n²) loops instead of one O(n⁴) loop.',
      },
    ],
  },

  {
    title: 'LRU Cache',
    slug: 'lru-cache',
    pattern: 'HASH_MAPS',
    difficulty: 'MEDIUM',
    statement:
      'Design a data structure implementing LRU (Least Recently Used) cache eviction. get(key) returns value or -1. put(key,value) inserts/updates and evicts the LRU key if capacity is exceeded. Both operations must run in O(1).\n\nExample: LRUCache(2); put(1,1); put(2,2); get(1)→1; put(3,3); get(2)→-1; put(4,4); get(1)→-1; get(3)→3; get(4)→4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'O(1) get needs a hash map. O(1) eviction of LRU and O(1) marking as recently used needs a data structure where you can move a node to the front and remove from the back in O(1) — a doubly linked list.',
      },
      {
        level: 2,
        content:
          'Hash Map + Doubly Linked List. Map key → node. List maintains recency order (head = most recent, tail = least recent). get: look up node, move to head, return value. put: if key exists, update and move to head. If new: create node, add to head, add to map. If over capacity: remove tail node and its map entry.',
      },
      {
        level: 3,
        content:
          'Use sentinel head and tail nodes to avoid edge cases. class Node: key,val,prev,next. def remove(node): link prev↔next. def insert_front(node): link after head. get: if not in map: -1 else: remove+insert_front, return val. put: if in map: update val, remove+insert_front else: create+insert_front+add to map; if over capacity: evict tail.prev (remove from list and map). Python\'s OrderedDict provides this for free: move_to_end() + popitem(last=False).',
      },
    ],
  },

  {
    title: 'Insert Delete GetRandom O(1)',
    slug: 'insert-delete-getrandom-o1',
    pattern: 'HASH_MAPS',
    difficulty: 'MEDIUM',
    statement:
      'Design a data structure with O(1) average-time insert, remove, and getRandom. getRandom returns a random element with equal probability.\n\nExample: insert(1)→true; insert(2)→true; getRandom()→1 or 2; remove(1)→true; getRandom()→2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A hash map gives O(1) insert and remove, but not O(1) getRandom (can\'t index into a map). An array gives O(1) getRandom by index, but O(n) removal. Combine them: store elements in an array, map each element to its array index.',
      },
      {
        level: 2,
        content:
          'Hash Map + Array. insert: if not in map, append to array, store index in map. remove: swap target with last element, update the swapped element\'s index in map, pop last, delete target from map. getRandom: return array[random index].',
      },
      {
        level: 3,
        content:
          'self.idx={}; self.arr=[]. insert(v): if v in idx: return False. idx[v]=len(arr); arr.append(v); return True. remove(v): if v not in idx: return False. i=idx[v]; last=arr[-1]; arr[i]=last; idx[last]=i; arr.pop(); del idx[v]; return True. getRandom(): return arr[random.randint(0,len(arr)-1)]. The swap-with-last trick avoids gaps in the array.',
      },
    ],
  },

  {
    title: 'Contiguous Array',
    slug: 'contiguous-array',
    pattern: 'HASH_MAPS',
    difficulty: 'MEDIUM',
    statement:
      'Given a binary array nums, find the maximum length subarray with an equal number of 0s and 1s.\n\nExample: nums=[0,1] → 2\nExample: nums=[0,1,0] → 2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Replace 0s with -1. Now "equal number of 0s and 1s" becomes "subarray sum equals 0". Use the prefix sum + hash map technique: find the longest subarray with sum 0.',
      },
      {
        level: 2,
        content:
          'Prefix Sum + Hash Map. Replace 0→-1. prefix_map={0:-1} (sum 0 seen at "before index 0"). For i in range(n): prefix_sum+=(1 if nums[i]==1 else -1). If prefix_sum in map: update max_len=max(max_len, i-map[prefix_sum]). Else: map[prefix_sum]=i. The first occurrence of a prefix sum is stored — later occurrences give the longest subarray.',
      },
      {
        level: 3,
        content:
          'prefix_map={0:-1}; ps=max_len=0. For i,n in enumerate(nums): ps+=(1 if n==1 else -1). if ps in prefix_map: max_len=max(max_len,i-prefix_map[ps]). else: prefix_map[ps]=i. Return max_len. Key: only store the FIRST occurrence of each prefix sum. Two equal prefix sums at i and j mean the subarray [i+1..j] sums to 0 (equal 0s and 1s after the -1 transform).',
      },
    ],
  },

  {
    title: 'Sort Characters By Frequency',
    slug: 'sort-characters-by-frequency',
    pattern: 'HASH_MAPS',
    difficulty: 'MEDIUM',
    statement:
      'Given a string s, sort characters in decreasing order of frequency and return the result. Characters with the same frequency may appear in any order.\n\nExample: s="tree" → "eert" or "eetr"\nExample: s="cccaaa" → "cccaaa" or "aaaccc"\nExample: s="Aabb" → "bbAa" or "bbaA"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Count character frequencies with a hash map. Then sort characters by frequency descending. Build the result by repeating each character its frequency number of times.',
      },
      {
        level: 2,
        content:
          'Hash Map + Sort. count=Counter(s). sorted_chars=sorted(count.keys(), key=lambda c: -count[c]). Return "".join(c*count[c] for c in sorted_chars). O(n log n) due to sort. For O(n): bucket sort by frequency (max frequency ≤ n).',
      },
      {
        level: 3,
        content:
          'count=Counter(s). buckets=[[] for _ in range(len(s)+1)]. For ch,freq in count.items(): buckets[freq].append(ch). result=[]. For freq in range(len(s),0,-1): for ch in buckets[freq]: result.append(ch*freq). Return "".join(result). O(n) with bucket sort. Note: "Aa" are distinct characters (case-sensitive).',
      },
    ],
  },

  {
    title: 'Brick Wall',
    slug: 'brick-wall',
    pattern: 'HASH_MAPS',
    difficulty: 'MEDIUM',
    statement:
      'A wall is made of rows of bricks. Draw a vertical line top-to-bottom to cross the fewest bricks. Return the minimum number of bricks crossed (edges between bricks do not count as crossing).\n\nExample: wall=[[1,2,2,1],[3,1,2],[1,3,2],[2,4],[3,1,2],[1,3,1,1]] → 2\nExample: wall=[[1],[1],[1]] → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'The best cut position passes through the most brick edges. Count how many rows have an edge at each x-position (excluding the wall boundaries). The answer is total_rows minus the maximum edge count.',
      },
      {
        level: 2,
        content:
          'Hash Map of edge counts. For each row, compute prefix sums of brick widths (excluding the last brick — the right wall boundary). Increment edge_count[pos] for each prefix sum. Answer = total_rows - max(edge_count.values(), default=0).',
      },
      {
        level: 3,
        content:
          'from collections import defaultdict. edge=defaultdict(int). For row in wall: pos=0. For brick in row[:-1]: pos+=brick; edge[pos]+=1. Return len(wall)-(max(edge.values()) if edge else 0). Excluding the last brick (row[:-1]) avoids counting the right wall boundary as an edge. The max gives the column where the line crosses the fewest bricks.',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'All O`one Data Structure',
    slug: 'all-oone-data-structure',
    pattern: 'HASH_MAPS',
    difficulty: 'HARD',
    statement:
      'Design a data structure with O(1) operations: inc(key) increments key\'s count; dec(key) decrements count (removes if 0); getMaxKey() returns any key with max count; getMinKey() returns any key with min count.\n\nExample: inc("a"); inc("b"); inc("b"); inc("c"); inc("c"); inc("c"); getMaxKey()→"c"; getMinKey()→"a"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A hash map gives O(1) count lookup. But getMaxKey/getMinKey need O(1) access to the current extremes. A doubly linked list sorted by count, where each node holds all keys with that count, enables O(1) for all operations.',
      },
      {
        level: 2,
        content:
          'Doubly Linked List of count-buckets + Hash Maps. Each node: {count, set_of_keys, prev, next}. Sentinel head (count=0) and tail (count=inf). key_to_count maps key→count. count_to_node maps count→node. inc/dec: move key between adjacent nodes. getMinKey: head.next.any_key. getMaxKey: tail.prev.any_key.',
      },
      {
        level: 3,
        content:
          'class Node: count, keys (set), prev, next. inc(key): old=key_to_count.get(key,0); new=old+1. Get/create new_node for count new (next of old_node or head if old==0). Move key: remove from old_node.keys (delete if empty), add to new_node.keys. Update key_to_count[key]=new. dec(key): symmetric. getMinKey: return any(head.next.keys). getMaxKey: return any(tail.prev.keys). The linked list always stays sorted by count.',
      },
    ],
  },

  {
    title: 'Maximum Frequency Stack',
    slug: 'maximum-frequency-stack',
    pattern: 'HASH_MAPS',
    difficulty: 'HARD',
    statement:
      'Design a stack that: push(val) pushes val; pop() removes and returns the most frequent element (tie-break: most recently pushed).\n\nExample: push(5);push(7);push(5);push(7);push(4);push(5); pop()→5 (freq 3); pop()→7 (freq 2, most recent); pop()→5 (freq 2); pop()→4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Track the frequency of each element. Also track the maximum frequency so far. For the tie-break, maintain a separate stack for each frequency level — the top of the max-frequency stack is the answer.',
      },
      {
        level: 2,
        content:
          'Two Hash Maps + max_freq. freq maps element→frequency. group maps frequency→stack of elements pushed at that frequency level. push: freq[val]++; group[freq[val]].append(val); max_freq=max(max_freq,freq[val]). pop: val=group[max_freq].pop(); freq[val]--; if not group[max_freq]: max_freq--. return val.',
      },
      {
        level: 3,
        content:
          'from collections import defaultdict. freq=defaultdict(int); group=defaultdict(list); max_freq=0. def push(v): freq[v]+=1; max_freq=max(max_freq,freq[v]); group[freq[v]].append(v). def pop(): v=group[max_freq].pop(); freq[v]-=1; if not group[max_freq]: max_freq-=1; return v. Each element appears exactly once in group[k] for each of the k times it was pushed — giving correct recency within a frequency level.',
      },
    ],
  },

  {
    title: 'LFU Cache',
    slug: 'lfu-cache',
    pattern: 'HASH_MAPS',
    difficulty: 'HARD',
    statement:
      'Design a Least Frequently Used (LFU) cache. get(key): return value or -1, incrementing frequency. put(key,value): insert/update. When at capacity, evict the LFU key (tie: evict least recently used). All operations O(1).\n\nExample: LFUCache(2); put(1,1); put(2,2); get(1)→1; put(3,3); get(2)→-1; get(3)→3; put(4,4); get(1)→-1; get(3)→3; get(4)→4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'You need O(1) access by key (hash map), O(1) finding the minimum frequency (track min_freq), and O(1) LRU eviction within a frequency group (ordered set or doubly linked list per frequency level).',
      },
      {
        level: 2,
        content:
          'Three data structures: key_to_val (key→value), key_to_freq (key→frequency), freq_to_keys (frequency→OrderedDict of keys in insertion order). min_freq tracks global minimum. On access: update frequency bucket, maintain min_freq. On eviction: pop the LRU key from freq_to_keys[min_freq].',
      },
      {
        level: 3,
        content:
          'from collections import defaultdict, OrderedDict. key_val={}; key_freq=defaultdict(int); freq_keys=defaultdict(OrderedDict); min_freq=0. def get(k): if k not in key_val: return -1. _update(k); return key_val[k]. def put(k,v): if cap==0: return. if k in key_val: key_val[k]=v; _update(k) else: if len(key_val)==cap: evict=freq_keys[min_freq].popitem(last=False)[0]; del key_val[evict]; del key_freq[evict]. key_val[k]=v; key_freq[k]=1; freq_keys[1][k]=None; min_freq=1. def _update(k): f=key_freq[k]; del freq_keys[f][k]; key_freq[k]=f+1; freq_keys[f+1][k]=None; if not freq_keys[min_freq]: min_freq+=1.',
      },
    ],
  },

  {
    title: 'Number of Atoms',
    slug: 'number-of-atoms',
    pattern: 'HASH_MAPS',
    difficulty: 'HARD',
    statement:
      'Given a chemical formula string, return the count of each atom in sorted (lexicographic) order. Nested parentheses are multiplied through.\n\nExample: formula="H2O" → "H2O"\nExample: formula="Mg(OH)2" → "H2MgO2"\nExample: formula="K4(ON(SO3)2)2" → "K4N2O14S4"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a stack of hash maps. When you encounter \'(\': push a new map. When you encounter \')\': pop the map, read the multiplier, and merge into the top map (multiplying all counts). Otherwise, parse the atom name and count and add to the top map.',
      },
      {
        level: 2,
        content:
          'Stack of Counters. Use an index i to scan the string. Letter: parse atom (capital + lowercase*). Digit: parse count (may be multi-digit). \'(\': push new Counter. \')\': pop counter, parse multiplier, multiply all counts, add to new top. At the end, the single remaining counter has all atom counts.',
      },
      {
        level: 3,
        content:
          'stack=[Counter()]; i=0; n=len(formula). While i<n: if formula[i]=="(": stack.append(Counter()); i+=1. elif formula[i]==")": i+=1; j=i; while i<n and formula[i].isdigit(): i+=1. mult=int(formula[j:i]) if j<i else 1. top=stack.pop(). for k,v in top.items(): stack[-1][k]+=v*mult. elif formula[i].isupper(): j=i+1; while j<n and formula[j].islower(): j+=1. atom=formula[i:j]; i=j; k=i; while i<n and formula[i].isdigit(): i+=1. cnt=int(formula[k:i]) if k<i else 1. stack[-1][atom]+=cnt. Return "".join(f"{a}{(str(c) if c>1 else \'\')}" for a,c in sorted(stack[0].items())).',
      },
    ],
  },

  {
    title: 'Palindrome Pairs',
    slug: 'palindrome-pairs',
    pattern: 'HASH_MAPS',
    difficulty: 'HARD',
    statement:
      'Given a list of unique words, return all pairs [i,j] where words[i]+words[j] is a palindrome.\n\nExample: words=["abcd","dcba","lls","s","sssll"] → [[0,1],[1,0],[3,2],[2,4]]\nExample: words=["bat","tab","cat"] → [[0,1],[1,0]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For words[i]+words[j] to be a palindrome, there are three cases based on relative lengths. A hash map (word→index) enables O(L) lookup per check instead of O(n*L) brute force.',
      },
      {
        level: 2,
        content:
          'Hash Map + case analysis. word_map={w:i for i,w in enumerate(words)}. For each word i, split it at every position k into prefix s[:k] and suffix s[k:]. Case 1: if suffix is palindrome and reverse(prefix) exists in map → append [i, map[rev_prefix]]. Case 2: if prefix is palindrome and reverse(suffix) exists in map → append [map[rev_suffix], i]. Handle edge cases (empty string, duplicate pairs).',
      },
      {
        level: 3,
        content:
          'word_map={w:i for i,w in enumerate(words)}. def isPalin(s): return s==s[::-1]. result=[]. For i,w in enumerate(words): for k in range(len(w)+1): pre=w[:k]; suf=w[k:]. if isPalin(suf) and pre[::-1] in word_map and word_map[pre[::-1]]!=i: result.append([i,word_map[pre[::-1]]]). if k>0 and isPalin(pre) and suf[::-1] in word_map and word_map[suf[::-1]]!=i: result.append([word_map[suf[::-1]],i]). Return result. The k>0 guard for case 2 prevents double-counting.',
      },
    ],
  },

  {
    title: 'Max Points on a Line',
    slug: 'max-points-on-a-line',
    pattern: 'HASH_MAPS',
    difficulty: 'HARD',
    statement:
      'Given an array of points on a 2D plane, return the maximum number of points that lie on the same straight line.\n\nExample: points=[[1,1],[2,2],[3,3]] → 3\nExample: points=[[1,1],[3,2],[5,3],[4,1],[2,3],[1,4]] → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each point, count how many other points share the same slope. Points on the same line through a fixed point all share the same slope. Use a hash map of slope→count. The maximum count + 1 (the fixed point itself) is the line size through that point.',
      },
      {
        level: 2,
        content:
          'For each pair (i,j): represent slope as a reduced fraction (dy/gcd, dx/gcd) to avoid floating-point errors. Count slopes from point i with a hash map. Answer is max over all i of (max_count + 1). Handle vertical lines (dx=0) and duplicate points separately.',
      },
      {
        level: 3,
        content:
          'from math import gcd. ans=1. For i in range(n): slopes=defaultdict(int); dups=0. For j in range(i+1,n): dx=points[j][0]-points[i][0]; dy=points[j][1]-points[i][1]. if dx==0 and dy==0: dups+=1; continue. g=gcd(abs(dx),abs(dy)); key=(dx//g,dy//g) if dx>=0 else (-dx//g,-dy//g). slopes[key]+=1. ans=max(ans,(max(slopes.values()) if slopes else 0)+1+dups). Return ans. Normalising the sign ensures (1,2) and (2,4) give the same key.',
      },
    ],
  },

  {
    title: 'Longest Well-Performing Interval',
    slug: 'longest-well-performing-interval',
    pattern: 'HASH_MAPS',
    difficulty: 'HARD',
    statement:
      'A day is "tiring" if hours>8. Find the length of the longest well-performing interval — a contiguous subarray with more tiring days than non-tiring days.\n\nExample: hours=[9,9,6,0,6,6,9] → 3\nExample: hours=[6,6,6] → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Replace each day with +1 (tiring) or -1 (not tiring). A well-performing interval has positive sum. This becomes: find the longest subarray with sum > 0, equivalently prefix_sum[j] > prefix_sum[i]. Use a prefix sum hash map.',
      },
      {
        level: 2,
        content:
          'Prefix Sum + Hash Map. score[i] = +1 or -1. ps = running prefix sum. If ps>0: the whole prefix [0..i] is well-performing, ans=i+1. Otherwise: look for the earliest position where prefix_sum was ps-1 (one less). If found at index j, interval [j+1..i] has sum 1 > 0. Store first occurrence of each prefix sum.',
      },
      {
        level: 3,
        content:
          'seen={}; ps=ans=0. For i,h in enumerate(hours): ps+=(1 if h>8 else -1). if ps>0: ans=i+1. else: if ps-1 in seen: ans=max(ans,i-seen[ps-1]). if ps not in seen: seen[ps]=i. Return ans. Why ps-1? We want ps[j]=ps[i]-1, meaning prefix[j+1..i]=+1. The earliest such j gives the longest interval. Storing first-occurrence (not overwriting) ensures maximum length.',
      },
    ],
  },

  {
    title: 'Largest Color Value in a Directed Graph',
    slug: 'largest-color-value-in-directed-graph',
    pattern: 'HASH_MAPS',
    difficulty: 'HARD',
    statement:
      'There is a directed graph of n nodes. Each node has a color (lowercase letter). The value of a path is the maximum frequency of any single color in that path. Return the largest value among all paths, or -1 if a cycle exists.\n\nExample: colors="abaca", edges=[[0,1],[0,2],[2,3],[3,4]] → 3 (path 0→2→3→4 has colors "a","a","c","a" → "a" appears 3 times)\nExample: colors="a", edges=[[0,0]] → -1 (self-loop)',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Topological sort (Kahn\'s) to detect cycles and process nodes in order. Use DP: dp[node][c] = max occurrences of color c on any path ending at node. Propagate through edges. Return max across all dp values, or -1 if any node is unprocessed (cycle).',
      },
      {
        level: 2,
        content:
          'Kahn\'s Algorithm + DP. dp[i][26] = max count of each color on paths ending at node i. Initialise dp[i][color[i]]=1. Process in topological order: for each edge i→j, update dp[j][c]=max(dp[j][c], dp[i][c]) for all c, then increment dp[j][color[j]]. Answer = max over all dp values. If processed < n: cycle → -1.',
      },
      {
        level: 3,
        content:
          'in_deg=[0]*n. For u,v in edges: in_deg[v]+=1. q=deque(i for i in range(n) if in_deg[i]==0). dp=[[0]*26 for _ in range(n)]. For i in range(n): dp[i][ord(colors[i])-97]=1. processed=ans=0. While q: u=q.popleft(); processed+=1. ans=max(ans,max(dp[u])). For v in adj[u]: for c in range(26): dp[v][c]=max(dp[v][c],dp[u][c]). dp[v][ord(colors[v])-97]=max(dp[v][ord(colors[v])-97],dp[v][ord(colors[v])-97]) — actually after propagation, ensure dp[v][color_v]>=1. in_deg[v]-=1; if in_deg[v]==0: q.append(v). return -1 if processed<n else ans.',
      },
    ],
  },

  {
    title: 'Random Pick with Blacklist',
    slug: 'random-pick-with-blacklist',
    pattern: 'HASH_MAPS',
    difficulty: 'HARD',
    statement:
      'Given range [0, n) and a blacklist array, pick a random integer from the whitelist uniformly. Minimize calls to random in pick().\n\nExample: n=7, blacklist=[2,3,5]; pick() returns one of {0,1,4,6} with equal probability 1/4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'The whitelist has size n-len(blacklist). Generate a random number in [0, whitelist_size). Map blacklisted numbers in [0, whitelist_size) to non-blacklisted numbers in [whitelist_size, n). One random call per pick.',
      },
      {
        level: 2,
        content:
          'Hash Map remap. sz=n-len(blacklist). Build a mapping: for each blacklisted number b < sz, map it to an unused number in [sz, n). Use a set of blacklisted numbers ≥ sz to identify "available" remaps. pick(): generate r=random(0,sz-1). if r in remap: return remap[r]. else: return r.',
      },
      {
        level: 3,
        content:
          'self.sz=n-len(blacklist); remap={}. black_set=set(blacklist). ptr=sz. For b in blacklist: if b<sz: while ptr in black_set: ptr+=1. remap[b]=ptr; ptr+=1. def pick(): r=random.randint(0,sz-1). return remap.get(r,r). The mapping redirects blacklisted numbers in the "virtual" range [0,sz) to safe numbers in [sz,n). pick always returns from the whitelist.',
      },
    ],
  },

  {
    title: 'Find All People With Secret',
    slug: 'find-all-people-with-secret',
    pattern: 'HASH_MAPS',
    difficulty: 'HARD',
    statement:
      'n people (0-indexed). Person 0 knows a secret at time 0 and shares it with firstPerson. meetings[i]=[x,y,time]: x and y meet and share secrets at that time. Return all people who eventually know the secret.\n\nExample: n=6, meetings=[[1,2,5],[2,3,8],[1,5,10]], firstPerson=1 → [0,1,2,3,5]\nExample: n=4, meetings=[[3,1,3],[1,2,2],[0,3,3]], firstPerson=3 → [0,1,3]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Group meetings by time. Process each time step together. At each time, run BFS/DFS or Union-Find on all meetings at that time starting from participants who already know the secret. Spread the secret to their connected components.',
      },
      {
        level: 2,
        content:
          'Union-Find per time step. Sort meetings by time. For each group of simultaneous meetings: temporarily union all meeting participants. After processing each group, unroot (reset) any component whose root does not know the secret — participants who shared with uninformed people remain uninformed. Repeat.',
      },
      {
        level: 3,
        content:
          'from collections import defaultdict. knows=set([0,firstPerson]). meetings.sort(key=lambda x:x[2]). time_meetings=defaultdict(list). For x,y,t in meetings: time_meetings[t].append((x,y)). For t in sorted(time_meetings): # BFS on this time slice. adj=defaultdict(set); nodes=set(). For x,y in time_meetings[t]: adj[x].add(y); adj[y].add(x); nodes.add(x); nodes.add(y). For start in list(nodes): if start in knows: # BFS to spread. q=deque([start]); visited={start}. While q: p=q.popleft(); knows.add(p). For nb in adj[p]: if nb not in visited: visited.add(nb); q.append(nb). Return sorted(knows).',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 7 — HASH_MAPS (28 problems)...\n');

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
