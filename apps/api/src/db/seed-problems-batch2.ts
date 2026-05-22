import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 2 — SLIDING_WINDOW (29 problems: 10 Easy, 9 Medium, 10 Hard)
// Skips: Longest Substring Without Repeating Characters (Medium) already seeded.
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
    title: 'Maximum Average Subarray I',
    slug: 'maximum-average-subarray-i',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'EASY',
    statement:
      'Given an integer array nums and integer k, find the contiguous subarray of length k with the maximum average value. Return the maximum average.\n\nExample: nums = [1,12,-5,-6,50,3], k = 4 → 12.75 (subarray [12,-5,-6,50])\nExample: nums = [5], k = 1 → 5.0',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'The window size is fixed at k. Instead of recomputing the sum from scratch each time, how can you update the window sum in O(1) as you slide it one position to the right?',
      },
      {
        level: 2,
        content:
          'Fixed Sliding Window. Compute sum of first k elements. Then slide: window_sum += nums[i] - nums[i-k]. Track max_sum throughout. Return max_sum / k. Single pass after initial setup.',
      },
    ],
  },

  {
    title: 'Contains Duplicate II',
    slug: 'contains-duplicate-ii',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'EASY',
    statement:
      'Given an integer array nums and integer k, return true if there are two distinct indices i and j such that nums[i] == nums[j] and |i - j| <= k.\n\nExample: nums = [1,2,3,1], k = 3 → true\nExample: nums = [1,0,1,1], k = 1 → true\nExample: nums = [1,2,3,1,2,3], k = 2 → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Maintain a sliding window of at most k elements. For each new element, check if it is already in the window. What data structure gives O(1) lookup and easy removal of old elements?',
      },
      {
        level: 2,
        content:
          'Fixed Window + Hash Set. For each index i: if nums[i] is in the set → return true. Add nums[i] to the set. If the set size > k: remove nums[i-k] from the set. Return false. The set always holds exactly the last k elements.',
      },
    ],
  },

  {
    title: 'Maximum Number of Vowels in a Substring of Given Length',
    slug: 'maximum-number-of-vowels-in-substring',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'EASY',
    statement:
      "Given a string s and integer k, return the maximum number of vowel letters in any substring of s with length k. Vowels are 'a', 'e', 'i', 'o', 'u'.\n\nExample: s = \"abciiidef\", k = 3 → 3 (substring \"iii\")\nExample: s = \"aeiou\", k = 2 → 2\nExample: s = \"leetcode\", k = 3 → 2",
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'The window size is fixed at k. Count vowels in the first window, then slide: when the window moves right by one, one character leaves and one enters. What determines how the vowel count changes?',
      },
      {
        level: 2,
        content:
          'Fixed Sliding Window. vowels = set("aeiou"). count = vowels in s[0:k]. max_count = count. For i from k to n-1: count += (s[i] in vowels) - (s[i-k] in vowels). max_count = max(max_count, count). Return max_count.',
      },
    ],
  },

  {
    title: 'Minimum Recolors to Get K Consecutive Black Blocks',
    slug: 'minimum-recolors-to-get-k-consecutive-black-blocks',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'EASY',
    statement:
      "Given a string blocks of 'W' (white) and 'B' (black) and integer k, return the minimum number of operations to get k consecutive 'B' blocks. Each operation recolors one 'W' to 'B'.\n\nExample: blocks = \"WBBWWBBWBW\", k = 7 → 3\nExample: blocks = \"WBWBBBW\", k = 2 → 0",
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          "For any window of size k, the number of operations needed equals the number of 'W's in that window. Slide a fixed window of size k across the string and track the minimum white count.",
      },
      {
        level: 2,
        content:
          "Fixed Sliding Window. Count W's in s[0:k]. Slide: subtract leaving character, add entering character. Track min whites across all windows. Return min_whites. The answer is always between 0 and k.",
      },
    ],
  },

  {
    title: 'Number of Sub-arrays of Size K and Average Greater than or Equal to Threshold',
    slug: 'subarrays-size-k-average-threshold',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'EASY',
    statement:
      'Given integer array arr and integers k and threshold, return the number of subarrays of length k whose average is greater than or equal to threshold.\n\nExample: arr = [2,2,2,2,5,5,5,8], k = 3, threshold = 4 → 3\nExample: arr = [11,13,17,23,29,31,7,5,2,3], k = 3, threshold = 5 → 6',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Average >= threshold is equivalent to sum >= threshold * k. Slide a fixed window of size k, tracking the sum. Count each window where the condition holds.',
      },
      {
        level: 2,
        content:
          'Fixed Sliding Window. min_sum = threshold * k. Compute sum of first window. For each subsequent window: update sum by adding new element and removing outgoing element. Increment count if sum >= min_sum. O(n) time.',
      },
    ],
  },

  {
    title: 'Find All Anagrams in a String',
    slug: 'find-all-anagrams-in-a-string',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'EASY',
    statement:
      'Given strings s and p, return a list of all start indices of anagrams of p in s. An anagram has the same characters as p in any order.\n\nExample: s = "cbaebabacd", p = "abc" → [0,6]\nExample: s = "abab", p = "ab" → [0,1,2]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Slide a fixed window of size len(p) across s. At each position, check if the character frequencies in the window match those of p. How can you update frequencies in O(1) per step?',
      },
      {
        level: 2,
        content:
          'Fixed Sliding Window + frequency arrays. Build freq count for p. Maintain a window count for s. Track how many characters have matching frequencies (matches counter). Slide: update entering/leaving character counts, adjust matches counter. When matches == 26 (or len(unique chars)): record index. O(n).',
      },
    ],
  },

  {
    title: 'Maximum Points You Can Obtain from Cards',
    slug: 'maximum-points-you-can-obtain-from-cards',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'EASY',
    statement:
      'Cards are arranged in a row. In one step you pick from the front or back. You must pick exactly k cards. Return the maximum score.\n\nExample: cardPoints = [1,2,3,4,5,6,1], k = 3 → 12 (pick [1] from front, [6,1] from back: 1+6+5=12)\nExample: cardPoints = [2,2,2], k = 2 → 4\nExample: cardPoints = [9,7,7,9,7,7,9], k = 7 → 55',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Picking k cards from either end leaves a contiguous window of n-k cards in the middle untouched. Maximising what you pick is equivalent to minimising the sum of the middle window.',
      },
      {
        level: 2,
        content:
          "Invert to min-window problem. total = sum(cardPoints). Fixed window of size n-k: find minimum window sum. Answer = total - min_window_sum. If k == n, answer is total (window size 0). Slide the window of size n-k across the array.",
      },
    ],
  },

  {
    title: 'Minimum Difference Between Highest and Lowest of K Scores',
    slug: 'minimum-difference-k-scores',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'EASY',
    statement:
      'Given an integer array nums of student scores and integer k, return the minimum possible difference between the highest and lowest score among any k students.\n\nExample: nums = [90], k = 1 → 0\nExample: nums = [9,4,1,7], k = 2 → 2 (pick 1 and 3, or 6 and 7... actually [4,7]→3 or [7,9]→2)',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'The difference between highest and lowest in a group is minimised when the values are as close together as possible. Sorting the array means the optimal k students must be a contiguous window in the sorted array.',
      },
      {
        level: 2,
        content:
          'Sort + Fixed Window. Sort nums. Slide a window of size k: diff = nums[i+k-1] - nums[i] for each starting index i. Return the minimum diff. After sorting, any window of size k gives a contiguous range, and min(last - first) over all windows is the answer.',
      },
    ],
  },

  {
    title: 'Substrings of Size Three with Distinct Characters',
    slug: 'substrings-size-three-distinct-characters',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'EASY',
    statement:
      'Given a string s, return the number of substrings of length 3 where all characters are distinct.\n\nExample: s = "xyzzaz" → 1 (only "xyz")\nExample: s = "aababcabc" → 4',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'The window is fixed at size 3. For each window, you just need to check if all three characters are distinct. What is the simplest check for that?',
      },
      {
        level: 2,
        content:
          'Fixed Window of size 3. For each i from 0 to n-3: check if s[i], s[i+1], s[i+2] are all different — either compare all three pairs, or use len(set(s[i:i+3]))==3. Count valid windows. O(n).',
      },
    ],
  },

  {
    title: 'Repeated DNA Sequences',
    slug: 'repeated-dna-sequences',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'EASY',
    statement:
      "The DNA sequence is made of 'A', 'C', 'G', 'T'. Given a DNA string s, return all 10-letter-long sequences that appear more than once. Return results in any order.\n\nExample: s = \"AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT\" → [\"AAAAACCCCC\",\"CCCCCAAAAA\"]\nExample: s = \"AAAAAAAAAAAAA\" → [\"AAAAAAAAAA\"]",
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Slide a fixed window of size 10 across the string. Track each 10-character sequence you see. A sequence should be added to the result the second time you encounter it — how do you distinguish "seen once" from "seen twice"?',
      },
      {
        level: 2,
        content:
          'Fixed Window + two sets. seen = set(), repeated = set(). For each window s[i:i+10]: if it is in seen and not in repeated: add to repeated. Add to seen. Return list(repeated). Using two sets avoids re-adding duplicates of duplicates to the result.',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Minimum Size Subarray Sum',
    slug: 'minimum-size-subarray-sum',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'MEDIUM',
    statement:
      'Given an array nums of positive integers and a target, return the minimal length subarray whose sum is greater than or equal to target. Return 0 if no such subarray exists.\n\nExample: target = 7, nums = [2,3,1,2,4,3] → 2 (subarray [4,3])\nExample: target = 4, nums = [1,4,4] → 1\nExample: target = 11, nums = [1,1,1,1,1,1,1,1] → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'All numbers are positive — expanding the window always increases the sum; shrinking always decreases it. This monotone behaviour lets you use a variable-size sliding window. When should you stop expanding and start shrinking?',
      },
      {
        level: 2,
        content:
          'Variable Sliding Window. left=0, cur_sum=0, min_len=inf. Expand right: add nums[right]. While cur_sum >= target: update min_len = min(min_len, right-left+1); subtract nums[left]; left++. Return 0 if min_len == inf else min_len.',
      },
      {
        level: 3,
        content:
          'left=cur_sum=0; ans=inf. For right in range(n): cur_sum+=nums[right]. While cur_sum>=target: ans=min(ans,right-left+1); cur_sum-=nums[left]; left+=1. Return 0 if ans==inf else ans. The inner while loop always terminates because all numbers are positive — once you remove enough elements from the left, the sum drops below target.',
      },
    ],
  },

  {
    title: 'Longest Repeating Character Replacement',
    slug: 'longest-repeating-character-replacement',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'MEDIUM',
    statement:
      "Given a string s and integer k, you can replace any character in s with any other character at most k times. Return the length of the longest substring with all same characters after at most k replacements.\n\nExample: s = \"ABAB\", k = 2 → 4\nExample: s = \"AABABBA\", k = 1 → 4",
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'In a valid window, you replace all characters except the most frequent one. So the condition is: window_size - max_frequency <= k. Expand right freely; shrink left when the condition is violated. Do you need to re-compute max_frequency when shrinking?',
      },
      {
        level: 2,
        content:
          'Variable Sliding Window. Track char_count[c] and max_count (the max frequency seen so far). Expand right: update counts. If window_size - max_count > k: shrink by removing s[left], left++. You never need to shrink max_count — a smaller window will not record a new max anyway. Track max window size.',
      },
      {
        level: 3,
        content:
          'count=defaultdict(int); max_count=left=0; ans=0. For right in range(n): count[s[right]]+=1; max_count=max(max_count,count[s[right]]). If (right-left+1)-max_count>k: count[s[left]]-=1; left+=1. ans=max(ans,right-left+1). Return ans. Note: max_count is never decremented — this is intentional. A window can only record a new best when max_count improves.',
      },
    ],
  },

  {
    title: 'Max Consecutive Ones III',
    slug: 'max-consecutive-ones-iii',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'MEDIUM',
    statement:
      'Given a binary array nums and integer k, return the maximum number of consecutive 1s if you can flip at most k 0s.\n\nExample: nums = [1,1,1,0,0,0,1,1,1,1,0], k = 2 → 6\nExample: nums = [0,0,1,1,0,0,1,1,1,0,1,1,0,0,0,1,1,1,1,0], k = 3 → 10',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Flipping at most k zeros means the window can contain at most k zeros. Expand right; when zeros exceed k, shrink left until you have k or fewer zeros. What is the maximum window size seen across this process?',
      },
      {
        level: 2,
        content:
          'Variable Sliding Window. Track zeros_in_window. Expand right: if nums[right]==0: zeros++. While zeros > k: if nums[left]==0: zeros--; left++. Track max window size (right-left+1). The window always holds the longest stretch with at most k zeros.',
      },
      {
        level: 3,
        content:
          'left=zeros=ans=0. For right in range(n): if nums[right]==0: zeros+=1. While zeros>k: if nums[left]==0: zeros-=1. left+=1. ans=max(ans,right-left+1). Return ans. This is equivalent to asking: what is the longest subarray with at most k zeros? Flipping those zeros gives all-1s.',
      },
    ],
  },

  {
    title: 'Fruit Into Baskets',
    slug: 'fruit-into-baskets',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'MEDIUM',
    statement:
      'You are at a farm with fruit trees in a row. fruits[i] is the type of fruit at tree i. You have two baskets, each holding only one fruit type. Pick fruits moving right without skipping; stop when you would need a third type. Return the maximum number of fruits you can pick.\n\nExample: fruits = [1,2,3,2,2] → 4 (pick [2,3,2,2])\nExample: fruits = [0,1,2,2] → 3 (pick [1,2,2])\nExample: fruits = [1,2,1] → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'You need the longest subarray with at most 2 distinct values. This is a variable sliding window problem — expand right, and when you exceed 2 distinct types, shrink from the left.',
      },
      {
        level: 2,
        content:
          'Variable Sliding Window. freq map of types in window. Expand right: add fruits[right]. While len(freq) > 2: remove fruits[left] (decrement; delete if zero); left++. Track max window size. O(n) time.',
      },
      {
        level: 3,
        content:
          'from collections import defaultdict. freq=defaultdict(int); left=ans=0. For right in range(n): freq[fruits[right]]+=1. While len(freq)>2: freq[fruits[left]]-=1; if freq[fruits[left]]==0: del freq[fruits[left]]; left+=1. ans=max(ans,right-left+1). Return ans. This is the "at most K distinct" pattern with K=2.',
      },
    ],
  },

  {
    title: "Longest Subarray of 1's After Deleting One Element",
    slug: 'longest-subarray-ones-after-deleting-one-element',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'MEDIUM',
    statement:
      'Given a binary array nums, delete one element from it. Return the length of the longest non-empty subarray consisting entirely of 1s in the resulting array.\n\nExample: nums = [1,1,0,1] → 3\nExample: nums = [0,1,1,1,0,1,1,0,1] → 5\nExample: nums = [1,1,1] → 2 (must delete exactly one element)',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Deleting one element is equivalent to allowing at most one zero in your window (and then the result length is window_size - 1). This is a variant of "at most k zeros" with k=1.',
      },
      {
        level: 2,
        content:
          'Variable Sliding Window. Track zeros in window. Expand right; when zeros > 1: shrink left (decrement zero count if nums[left]==0). The answer is the maximum (window_size - 1), because you always delete the one zero (or any 1 if no zero in window).',
      },
      {
        level: 3,
        content:
          'left=zeros=ans=0. For right in range(n): if nums[right]==0: zeros+=1. While zeros>1: if nums[left]==0: zeros-=1; left+=1. ans=max(ans,right-left). Return ans. Note: right-left (not right-left+1) because we subtract 1 for the deleted element. If the array is all 1s, the answer is n-1 (forced to delete one 1).',
      },
    ],
  },

  {
    title: 'Grumpy Bookstore Owner',
    slug: 'grumpy-bookstore-owner',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'MEDIUM',
    statement:
      'A bookstore owner has customers[i] customers per minute. grumpy[i]=1 means the owner is grumpy that minute (those customers are unsatisfied). The owner can use a secret technique for minutes consecutive minutes to not be grumpy. Return the maximum number of customers satisfied.\n\nExample: customers=[1,0,1,2,1,1,7,5], grumpy=[0,1,0,1,0,1,0,1], minutes=3 → 16',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Customers in non-grumpy minutes are always satisfied — those are a fixed baseline. The technique adds satisfaction only for grumpy minutes within the chosen window. What are you maximising by sliding the fixed window of size minutes?',
      },
      {
        level: 2,
        content:
          'Baseline = sum of customers[i] where grumpy[i]==0. Extra = sum of customers[i] where grumpy[i]==1 within the chosen window. Slide a fixed window of size minutes to find the maximum extra. Answer = baseline + max_extra.',
      },
      {
        level: 3,
        content:
          'base=sum(c for c,g in zip(customers,grumpy) if g==0). extra=sum(customers[i]*grumpy[i] for i in range(minutes)). max_extra=extra. For i in range(minutes,n): extra+=customers[i]*grumpy[i]-customers[i-minutes]*grumpy[i-minutes]; max_extra=max(max_extra,extra). Return base+max_extra.',
      },
    ],
  },

  {
    title: 'Count Number of Nice Subarrays',
    slug: 'count-number-of-nice-subarrays',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'MEDIUM',
    statement:
      'Given an array nums of positive integers and integer k, return the number of contiguous subarrays with exactly k odd numbers.\n\nExample: nums = [1,1,2,1,1], k = 3 → 2\nExample: nums = [2,4,6], k = 1 → 0\nExample: nums = [2,2,2,1,2,2,1,2,2,2], k = 2 → 16',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Exactly k odd numbers is hard to handle directly. Use the identity: exactly(k) = atMost(k) - atMost(k-1). How do you count subarrays with at most k odd numbers using a sliding window?',
      },
      {
        level: 2,
        content:
          'atMost(k) sliding window: expand right, count odds. When odds > k: shrink left until odds <= k. At each right, all subarrays ending there with start in [left, right] are valid — add (right-left+1). Return atMost(k) - atMost(k-1).',
      },
      {
        level: 3,
        content:
          'def atMost(k): left=odds=ans=0. For right in range(n): odds+=(nums[right]%2). While odds>k: odds-=(nums[left]%2); left+=1. ans+=right-left+1. return ans. Return atMost(k)-atMost(k-1). Alternatively, use prefix sums: count prefix_odd occurrences, for each j find count of i where prefix[j]-prefix[i]==k.',
      },
    ],
  },

  {
    title: 'Maximum Erasure Value',
    slug: 'maximum-erasure-value',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'MEDIUM',
    statement:
      'Given an array nums, you can erase a subarray that contains only unique elements and earn a score equal to its sum. Return the maximum score you can earn.\n\nExample: nums = [4,2,4,5,6] → 17 (erase [2,4,5,6])\nExample: nums = [5,2,1,2,5,2,1,2,5] → 8 (erase [5,2,1])',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'You want the maximum sum subarray with all unique elements. This is a variable sliding window: expand right, adding elements. When a duplicate enters the window, shrink from the left until the duplicate is removed.',
      },
      {
        level: 2,
        content:
          'Variable Sliding Window + hash set. Expand right: if nums[right] is in set: shrink left until nums[right] is removed from set. Add nums[right] to set, add to current sum. Track max sum. O(n) amortised.',
      },
      {
        level: 3,
        content:
          'seen=set(); left=cur_sum=ans=0. For right in range(n): while nums[right] in seen: seen.remove(nums[left]); cur_sum-=nums[left]; left+=1. seen.add(nums[right]); cur_sum+=nums[right]. ans=max(ans,cur_sum). Return ans. This is a classic "longest subarray with distinct elements" extended to track sum instead of length.',
      },
    ],
  },

  {
    title: 'Minimum Operations to Reduce X to Zero',
    slug: 'minimum-operations-to-reduce-x-to-zero',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'MEDIUM',
    statement:
      'Given an integer array nums and integer x, return the minimum number of operations to reduce x to exactly 0 by removing elements from either end. Each removal reduces x by that element. Return -1 if impossible.\n\nExample: nums = [1,1,4,2,3], x = 5 → 2\nExample: nums = [5,6,7,8,9], x = 4 → -1\nExample: nums = [3,2,20,1,1,3], x = 10 → 5',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Removing elements from both ends to sum to x is equivalent to keeping a middle subarray that sums to total - x. Minimising the number of removals means maximising the length of the middle subarray.',
      },
      {
        level: 2,
        content:
          'Invert to max-length subarray with sum == total - x. Use a variable sliding window: expand right; when sum exceeds the target, shrink left. Record max length when sum equals target. Answer = n - max_length.',
      },
      {
        level: 3,
        content:
          'target=sum(nums)-x. If target<0: return -1. If target==0: return n. left=cur_sum=max_len=0; ans=-1. For right in range(n): cur_sum+=nums[right]. While cur_sum>target: cur_sum-=nums[left]; left+=1. if cur_sum==target: ans=max(ans,right-left+1). Return -1 if ans==-1 else n-ans.',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Sliding Window Maximum',
    slug: 'sliding-window-maximum',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'HARD',
    statement:
      'Given an integer array nums and a window size k, return the maximum value in each sliding window as it moves from left to right.\n\nExample: nums = [1,3,-1,-3,5,3,6,7], k = 3 → [3,3,5,5,6,7]\nExample: nums = [1], k = 1 → [1]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A naive approach recomputes the max each time in O(k), giving O(nk) total. You need O(n). Think about which elements can never be the maximum for any future window. If nums[i] < nums[j] and i < j, can nums[i] ever be the future max while nums[j] is still in the window?',
      },
      {
        level: 2,
        content:
          'Monotonic Deque (stores indices, decreasing order of values). When adding index i: pop from back while nums[deque.back] <= nums[i] (those can never be max). Pop from front when deque.front is outside the current window (index < i-k+1). The front is always the current maximum.',
      },
      {
        level: 3,
        content:
          'from collections import deque. dq=deque(); result=[]. For i in range(n): while dq and nums[dq[-1]]<=nums[i]: dq.pop(). dq.append(i). if dq[0]<i-k+1: dq.popleft(). if i>=k-1: result.append(nums[dq[0]]). Return result. The deque stays monotonically decreasing in value — any smaller element to the left of a larger one is useless for future maxima.',
      },
    ],
  },

  {
    title: 'Substring with Concatenation of All Words',
    slug: 'substring-with-concatenation-of-all-words',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'HARD',
    statement:
      'Given string s and an array words of equal-length words, return all start indices of substrings that are a concatenation of each word in words exactly once in any order.\n\nExample: s = "barfoothefoobarman", words = ["foo","bar"] → [0,9]\nExample: s = "wordgoodgoodgoodbestword", words = ["word","good","best","word"] → []\nExample: s = "barfoofoobarthefoobarman", words = ["bar","foo","the"] → [6,9,12]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Each word has the same length (word_len). A valid substring has length word_len * len(words). Instead of checking every start index naively (O(n * total_len)), you can slide a window of fixed size total_len. But checking frequency maps each time is expensive — how can you use word-level sliding?',
      },
      {
        level: 2,
        content:
          'Run word_len separate sliding windows, one for each starting offset 0..word_len-1. Within each, slide word-by-word: maintain a frequency map of words in the window and how many words are currently matched. When matched == len(words): record start. Shrink from left when window exceeds len(words) words. O(n) total.',
      },
      {
        level: 3,
        content:
          'need=Counter(words); wlen=len(words[0]); wcount=len(words); result=[]. For start in range(wlen): have=defaultdict(int); matched=left=0; j=start. While j+wlen<=n: w=s[j:j+wlen]; j+=wlen. If w in need: have[w]+=1; if have[w]==need[w]: matched+=1. While matched==wcount: if j-(left*wlen+start)==wcount*wlen: result.append(left*wlen+start); lw=s[left*wlen+start:(left+1)*wlen+start]; have[lw]-=1; if have[lw]<need[lw]: matched-=1; left+=1. else: have=defaultdict(int); matched=left=(j-start)//wlen. Return result.',
      },
    ],
  },

  {
    title: 'Minimum Number of K Consecutive Bit Flips',
    slug: 'minimum-number-of-k-consecutive-bit-flips',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'HARD',
    statement:
      'Given a binary array nums and integer k, each operation flips k consecutive bits. Return the minimum number of operations to make all bits 1, or -1 if impossible.\n\nExample: nums = [0,1,0], k = 1 → 2\nExample: nums = [1,1,0], k = 2 → -1\nExample: nums = [0,0,0,1,0,1,1,0], k = 3 → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Greedy: scan left to right. When you encounter a 0, you must flip starting here (flipping later would leave this 0 unchanged). The challenge is knowing whether the current bit is 0 or 1 after all previous flips, without re-simulating them. How can you track the cumulative flip effect efficiently?',
      },
      {
        level: 2,
        content:
          'Sliding Window + difference array. Maintain a flipped counter tracking how many active flip operations cover the current index. Use a difference array: flip_diff[i+k] -= 1 when a flip starts at i. For each position: effective_bit = nums[i] XOR (flipped % 2). If effective_bit == 0: must flip here, flipped++, flip_diff[i+k]--, ops++. If i+k > n: return -1.',
      },
      {
        level: 3,
        content:
          'flip_diff=[0]*(n+1); flipped=ops=0. For i in range(n): flipped+=flip_diff[i]. if (nums[i]+flipped)%2==0: if i+k>n: return -1. flipped+=1; flip_diff[i+k]-=1; ops+=1. Return ops. The flip_diff array acts as a lazy undo — when the window of the flip starting at i slides past i+k, we decrement flipped. This is O(n) time and O(n) space.',
      },
    ],
  },

  {
    title: 'Max Value of Equation',
    slug: 'max-value-of-equation',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'HARD',
    statement:
      'Given points sorted by x-coordinate and integer k, find the maximum value of yi + yj + xj - xi for pairs (i,j) where i < j and xj - xi <= k.\n\nExample: points = [[1,3],[2,0],[5,10],[6,-10]], k = 1 → 4\nExample: points = [[0,0],[3,0],[9,2]], k = 3 → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Rewrite the expression: yi + yj + xj - xi = (yj + xj) + (yi - xi). For a fixed j, you want to maximise (yi - xi) over all valid i where xj - xi <= k. As j increases, old points slide out of range. What data structure efficiently gives you the maximum (y-x) in a sliding window?',
      },
      {
        level: 2,
        content:
          'Monotonic Deque. Store pairs (y-x, x) in a decreasing deque by y-x value. For each point j: remove from front while xj - deque.front.x > k (out of range). Answer candidate = deque.front.(y-x) + yj + xj. Then add (yj-xj, xj) to back after removing all back entries with y-x <= yj-xj.',
      },
      {
        level: 3,
        content:
          'from collections import deque. dq=deque(); ans=-inf. For xj,yj in points: while dq and xj-dq[0][1]>k: dq.popleft(). if dq: ans=max(ans, dq[0][0]+yj+xj). while dq and dq[-1][0]<=yj-xj: dq.pop(). dq.append((yj-xj,xj)). Return ans. The deque holds (y-x, x) pairs in decreasing order of y-x, so the front always has the best historical candidate within range.',
      },
    ],
  },

  {
    title: 'Sliding Window Median',
    slug: 'sliding-window-median',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'HARD',
    statement:
      'Given an integer array nums and window size k, return an array of the median for each sliding window. The median is the middle value for odd k, or the average of the two middle values for even k.\n\nExample: nums = [1,3,-1,-3,5,3,6,7], k = 3 → [1.0,-1.0,-1.0,3.0,5.0,6.0]\nExample: nums = [1,2,3,4,2,3,1,4,2], k = 3 → [2.0,3.0,3.0,3.0,2.0,3.0,2.0]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A sorted structure gives the median easily but re-sorting per window is O(k log k). You need to maintain a sorted window efficiently as one element leaves and one enters. What pair of data structures lets you access both halves of a sorted sequence efficiently?',
      },
      {
        level: 2,
        content:
          'Two Heaps: max-heap for lower half, min-heap for upper half. Maintain balance so they differ in size by at most 1. Adding and removing both cost O(log k) with lazy deletion. Median = top of larger heap (odd k) or average of both tops (even k). Lazy deletion: track "to-remove" counts and skip stale tops when querying.',
      },
      {
        level: 3,
        content:
          'Use two heaps + lazy deletion dict. lo (max-heap, negated), hi (min-heap). Add nums[i]: push to lo, rebalance. For each window close: read median from tops (skip lazy-deleted elements). Remove outgoing element: add to lazy dict. Rebalance. Key invariant: len(lo) == len(hi) or len(lo) == len(hi)+1. Each operation is O(log k) amortised.',
      },
    ],
  },

  {
    title: 'Longest Substring with At Most K Distinct Characters',
    slug: 'longest-substring-at-most-k-distinct',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'HARD',
    statement:
      'Given a string s and integer k, return the length of the longest substring with at most k distinct characters.\n\nExample: s = "eceba", k = 2 → 3 ("ece")\nExample: s = "aa", k = 1 → 2\nExample: s = "aabbcc", k = 1 → 2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Maintain a frequency map of characters in the window. Expand right freely. When the number of distinct characters exceeds k, shrink from the left until you are back to k or fewer. Track the maximum valid window size.',
      },
      {
        level: 2,
        content:
          'Variable Sliding Window. freq={}. left=ans=0. For right in range(n): add s[right] to freq. While len(freq)>k: decrement freq[s[left]]; if zero: delete; left++. ans=max(ans, right-left+1). Return ans.',
      },
      {
        level: 3,
        content:
          'freq=defaultdict(int); left=ans=0. For right in range(n): freq[s[right]]+=1. While len(freq)>k: freq[s[left]]-=1; if freq[s[left]]==0: del freq[s[left]]; left+=1. ans=max(ans,right-left+1). Return ans. This is the generalised form of "Longest Substring Without Repeating Characters" (k=number of unique chars → effectively k=1 per character). Fruit Into Baskets is k=2.',
      },
    ],
  },

  {
    title: 'Replace the Substring for Balanced String',
    slug: 'replace-substring-for-balanced-string',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'HARD',
    statement:
      "A string of 'Q','W','E','R' is balanced if each appears exactly n/4 times (n is always divisible by 4). Given such a string s, find the minimum length substring to replace so the whole string becomes balanced.\n\nExample: s = \"QWER\" → 0 (already balanced)\nExample: s = \"QQWE\" → 1\nExample: s = \"QQQW\" → 2\nExample: s = \"QQQQ\" → 3",
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          "Characters outside the replacement window are fixed. For the string to be balanced after replacement, every character outside the window must appear at most n/4 times. This gives you a validity condition. Now find the smallest window such that all characters outside it satisfy this condition.",
      },
      {
        level: 2,
        content:
          "Variable Sliding Window. Count frequencies of all chars. A window [left,right] is valid if for every char c: count[c] - (frequency of c inside window) <= n/4. Since you can't easily track chars inside the window, instead track chars outside: shrink when all outside counts are <= n/4.",
      },
      {
        level: 3,
        content:
          "count=Counter(s); target=n//4; left=ans=n. For right in range(n): count[s[right]]-=1. While left<=right and all(count[c]<=target for c in 'QWER'): ans=min(ans,right-left+1); count[s[left]]+=1; left+=1. Return ans. The window represents the replacement region — we shrink from the left as long as the outside still satisfies the balance condition.",
      },
    ],
  },

  {
    title: 'Frequency of the Most Frequent Element',
    slug: 'frequency-of-most-frequent-element',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'HARD',
    statement:
      'Given an integer array nums and integer k, you can increment any element by 1 per operation using at most k operations total. Return the maximum possible frequency of any element after the operations.\n\nExample: nums = [1,2,4], k = 5 → 3 (make all 4s: cost 3+2=5)\nExample: nums = [1,4,8,13], k = 5 → 2\nExample: nums = [3,9,6], k = 2 → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort the array. You can only increment (not decrement), so the target value for a group must be the largest element in the group. In a sorted window, the cost to make all elements equal to the rightmost element is: right_value * window_size - window_sum. When cost exceeds k, shrink the window.',
      },
      {
        level: 2,
        content:
          'Sort + Variable Sliding Window. left=0, window_sum=0. For each right: window_sum += nums[right]. While nums[right]*(right-left+1) - window_sum > k: window_sum -= nums[left]; left++. ans = max(ans, right-left+1). The cost formula nums[right]*size - sum gives the total increments needed to raise everything to nums[right].',
      },
      {
        level: 3,
        content:
          'Sort nums. left=window_sum=ans=0. For right in range(n): window_sum+=nums[right]. While nums[right]*(right-left+1)-window_sum>k: window_sum-=nums[left]; left+=1. ans=max(ans,right-left+1). Return ans. After sorting, the window always targets the rightmost element as the frequency target — this is always optimal since you can only increment.',
      },
    ],
  },

  {
    title: 'Maximum Fruits Harvested After at Most K Steps',
    slug: 'maximum-fruits-harvested-after-at-most-k-steps',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'HARD',
    statement:
      'Fruits grow at various positions (fruits[i] = [position, amount]). You start at startPos and can take at most k steps (left or right). You collect all fruits at positions you visit. Return the maximum fruits collectible.\n\nExample: fruits = [[2,8],[6,3],[8,6]], startPos = 5, k = 4 → 9\nExample: fruits = [[0,9],[4,1],[5,7],[6,2],[7,4],[10,9]], startPos = 5, k = 4 → 14\nExample: fruits = [[0,3],[6,4],[8,5]], startPos = 3, k = 2 → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'The optimal strategy is always to go in one direction then come back and go the other — you never zigzag. For a window [l, r], the minimum steps to cover it from startPos is: min(2*(startPos-l)+(r-startPos), 2*(r-startPos)+(startPos-l), startPos-l, r-startPos). Slide a window over sorted fruit positions and check if the window is reachable within k steps.',
      },
      {
        level: 2,
        content:
          'Sort fruits by position. Sliding Window: for each right boundary, advance left while the window [fruits[left][0], fruits[right][0]] is not reachable in k steps. Reachability check: min(go-left-first, go-right-first) <= k. Go-left-first: 2*max(0, startPos-fruits[left][0]) + max(0, fruits[right][0]-startPos). Go-right-first: 2*max(0, fruits[right][0]-startPos) + max(0, startPos-fruits[left][0]).',
      },
      {
        level: 3,
        content:
          'Sort fruits. Use a prefix sum for fast range queries. left=window_sum=ans=0; prefix=[0]+(running sum of amounts). For right in range(m): window_sum+=fruits[right][1]. While window not reachable: window_sum-=fruits[left][1]; left+=1. Where reachable = min(2*max(0,startPos-fruits[left][0])+max(0,fruits[right][0]-startPos), 2*max(0,fruits[right][0]-startPos)+max(0,startPos-fruits[left][0])) <= k. ans=max(ans,window_sum). Return ans.',
      },
    ],
  },

  {
    title: 'Minimum Swaps to Group All 1s Together II',
    slug: 'minimum-swaps-to-group-all-ones-together-ii',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'HARD',
    statement:
      'Given a circular binary array nums, return the minimum number of swaps to group all 1s together anywhere in the circle.\n\nExample: nums = [0,1,0,1,1,0,0] → 1\nExample: nums = [0,1,1,1,0,0,1,1,0] → 2\nExample: nums = [1,1,0,0,1] → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'All 1s grouped together occupy a window of size equal to the total count of 1s. The minimum swaps equals the number of 0s in the best such window (you swap those 0s with 1s from outside). Since the array is circular, the window can wrap around.',
      },
      {
        level: 2,
        content:
          'Fixed Sliding Window on a doubled array. total_ones = count of 1s. Slide a window of size total_ones over nums + nums (handles wrap-around). Count zeros in the window. Minimum zeros across all windows = answer. Only consider first n starting positions.',
      },
      {
        level: 3,
        content:
          'ones=sum(nums); n=len(nums). If ones==0: return 0. doubled=nums+nums. zeros_in_window=doubled[:ones].count(0); min_swaps=zeros_in_window. For i in range(1,n): zeros_in_window+=(doubled[i+ones-1]==0)-(doubled[i-1]==0). min_swaps=min(min_swaps,zeros_in_window). Return min_swaps. The doubled array trick handles circularity without any modular arithmetic in the inner loop.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 2 — SLIDING_WINDOW (29 problems)...\n');

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
