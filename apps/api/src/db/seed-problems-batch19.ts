import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 19 — BIT_MANIPULATION (30 problems: 10 Easy, 10 Medium, 10 Hard)
// Already seeded: Single Number 136 (original seed, Easy) — will be skipped
// Avoids XOR-trie problems (421, 1707, 1803) which are in TRIE batch18
// Sub-patterns covered:
//   Easy:   XOR tricks, set bit counting, bit testing
//   Medium: XOR isolation, bit arithmetic, bitmask enumeration
//   Hard:   Bitmask DP (TSP, covering, assignment), meet-in-middle, AND-range properties
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
    title: 'Single Number',
    slug: 'single-number',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'EASY',
    statement:
      'Every element in nums appears twice except for one. Find and return that element in O(n) time and O(1) space.\n\nExample: nums=[2,2,1] → 1\nExample: nums=[4,1,2,1,2] → 4',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'XOR has the property x^x=0 and x^0=x. XOR all elements — pairs cancel to 0, leaving the unique element.',
      },
      {
        level: 2,
        content:
          'result=0. For n in nums: result^=n. Return result. O(n), O(1).',
      },
    ],
  },

  {
    title: 'Number of 1 Bits',
    slug: 'number-of-1-bits',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'EASY',
    statement:
      'Return the number of \'1\' bits in the binary representation of a 32-bit unsigned integer (its Hamming weight).\n\nExample: n=00000000000000000000000000001011 → 3\nExample: n=11111111111111111111111111111101 → 31',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'n & (n-1) removes the lowest set bit. Count how many times you can do this before n becomes 0.',
      },
      {
        level: 2,
        content:
          'count=0. While n: n &= (n-1); count++. Return count. O(k) where k = number of set bits. Alternative: bin(n).count(\'1\').',
      },
    ],
  },

  {
    title: 'Power of Two',
    slug: 'power-of-two',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'EASY',
    statement:
      'Return true if n is a power of two.\n\nExample: n=1 → true (2⁰)\nExample: n=16 → true (2⁴)\nExample: n=3 → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'A power of two has exactly one bit set. n & (n-1) clears the lowest set bit — if n is a power of two, this gives 0.',
      },
      {
        level: 2,
        content:
          'Return n > 0 and (n & (n-1)) == 0. O(1).',
      },
    ],
  },

  {
    title: 'Missing Number',
    slug: 'missing-number',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'EASY',
    statement:
      'Given n distinct numbers from [0, n], find the missing one in O(n) time and O(1) space.\n\nExample: nums=[3,0,1] → 2\nExample: nums=[9,6,4,2,3,5,7,0,1] → 8',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'XOR all indices 0..n with all values in nums. Pairs cancel, leaving the missing number.',
      },
      {
        level: 2,
        content:
          'result=len(nums). For i,v in enumerate(nums): result^=i^v. Return result. O(n). Alternative: n*(n+1)//2 - sum(nums).',
      },
    ],
  },

  {
    title: 'Reverse Bits',
    slug: 'reverse-bits',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'EASY',
    statement:
      'Reverse the bits of a given 32-bit unsigned integer.\n\nExample: n=00000010100101000001111010011100 → 00111001011110000010100101000000 (964176192)\nExample: n=11111111111111111111111111111101 → 10111111111111111111111111111111 (3221225471)',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Extract the lowest bit of n, append it to the result (shift result left first). Repeat 32 times.',
      },
      {
        level: 2,
        content:
          'result=0. For _ in range(32): result=(result<<1)|(n&1); n>>=1. Return result & 0xFFFFFFFF. O(32).',
      },
    ],
  },

  {
    title: 'Hamming Distance',
    slug: 'hamming-distance',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'EASY',
    statement:
      'Return the Hamming distance between two integers (number of bit positions where they differ).\n\nExample: x=1, y=4 → 2\nExample: x=3, y=1 → 1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'XOR the two numbers — the result has a 1 bit at every position where they differ. Count those 1 bits.',
      },
      {
        level: 2,
        content:
          'Return bin(x ^ y).count(\'1\'). O(32). Equivalent to calling Number of 1 Bits on x^y.',
      },
    ],
  },

  {
    title: 'Counting Bits',
    slug: 'counting-bits',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'EASY',
    statement:
      'For every integer i from 0 to n, return the number of 1 bits in its binary representation.\n\nExample: n=2 → [0,1,1]\nExample: n=5 → [0,1,1,2,1,2]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'ans[i] = ans[i >> 1] + (i & 1). The bit count for i equals the count for i//2 plus the lowest bit.',
      },
      {
        level: 2,
        content:
          'ans=[0]*(n+1). For i from 1..n: ans[i]=ans[i>>1]+(i&1). Return ans. O(n), O(n).',
      },
    ],
  },

  {
    title: 'Power of Four',
    slug: 'power-of-four',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'EASY',
    statement:
      'Return true if n is a power of four.\n\nExample: n=16 → true (4²)\nExample: n=5 → false\nExample: n=1 → true (4⁰)',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'A power of four is a power of two with its single set bit at an even bit position (0, 2, 4, ...). Use a mask with 1s at even positions: 0x55555555.',
      },
      {
        level: 2,
        content:
          'Return n > 0 and (n & (n-1)) == 0 and (n & 0xAAAAAAAA) == 0. (0xAAAAAAAA has 1s at odd positions; a power of 4 must have its bit at an even position.) O(1).',
      },
    ],
  },

  {
    title: 'Find the Difference',
    slug: 'find-the-difference',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'EASY',
    statement:
      'String t is s with one extra character inserted at a random position. Find the added character.\n\nExample: s="abcd", t="abcde" → \'e\'\nExample: s="", t="y" → \'y\'',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'XOR all characters in both strings together — matched characters cancel, leaving only the extra character.',
      },
      {
        level: 2,
        content:
          'result=0. For c in s+t: result^=ord(c). Return chr(result). O(n).',
      },
    ],
  },

  {
    title: 'Binary Number with Alternating Bits',
    slug: 'binary-number-with-alternating-bits',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'EASY',
    statement:
      'Return true if a positive integer has alternating bits in its binary representation (adjacent bits always differ).\n\nExample: n=5 → true (101)\nExample: n=7 → false (111)\nExample: n=11 → false (1011)',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'XOR n with n>>1. For alternating bits, every bit in the result should be 1. Check that the result is of the form 2^k - 1.',
      },
      {
        level: 2,
        content:
          'm = n ^ (n >> 1). Return (m & (m+1)) == 0. O(1). If m is all-1s, then m+1 is a power of two, so m & (m+1) == 0.',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Single Number II',
    slug: 'single-number-ii',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'MEDIUM',
    statement:
      'Every element in nums appears exactly three times except for one, which appears once. Find it in O(n) time and O(1) space.\n\nExample: nums=[2,2,3,2] → 3\nExample: nums=[0,1,0,1,0,1,99] → 99',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use two bit counters "ones" and "twos" to track bits seen once and twice. When a bit is seen a third time, clear it from both counters.',
      },
      {
        level: 2,
        content:
          'ones=twos=0. For n in nums: ones=(ones^n) & ~twos; twos=(twos^n) & ~ones. Return ones. O(n), O(1).',
      },
      {
        level: 3,
        content:
          'State machine per bit: (ones_bit, twos_bit) cycles (0,0)→(1,0)→(0,1)→(0,0) as a bit appears 1, 2, 3 times. The formula ones=(ones^n)&~twos ensures that bits in twos are cleared from ones, and vice versa. The unique element ends up in "ones" (state (1,0)).',
      },
    ],
  },

  {
    title: 'Single Number III',
    slug: 'single-number-iii',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'MEDIUM',
    statement:
      'Every element appears twice except two elements which appear once. Find those two elements in O(n) time and O(1) space.\n\nExample: nums=[1,2,1,3,2,5] → [3,5]\nExample: nums=[-1,0] → [-1,0]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'XOR all elements to get a^b. Find any set bit in a^b; use it to split all numbers into two groups, each containing exactly one unique element.',
      },
      {
        level: 2,
        content:
          'xor = XOR of all nums. bit = xor & (-xor) (lowest set bit). a=0. For n in nums: if n & bit: a^=n. Return [a, xor^a]. O(n), O(1).',
      },
      {
        level: 3,
        content:
          'Since a != b, they differ in at least one bit. The lowest set bit of a^b distinguishes them. All numbers where that bit is set XOR together to give a (their pair-mates cancel); all others XOR to give b. -xor in two\'s complement equals ~xor+1, which isolates the lowest set bit.',
      },
    ],
  },

  {
    title: 'Sum of Two Integers',
    slug: 'sum-of-two-integers',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'MEDIUM',
    statement:
      'Calculate a + b without using the + or - operators.\n\nExample: a=1, b=2 → 3\nExample: a=2, b=3 → 5',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'XOR gives the sum without carry. AND<<1 gives the carry. Repeat until carry is zero.',
      },
      {
        level: 2,
        content:
          'While b: carry=(a&b)<<1; a=a^b; b=carry. Return a. O(1) (at most 32 iterations). In Python, mask with 0xFFFFFFFF to stay 32-bit.',
      },
      {
        level: 3,
        content:
          'Python integers are arbitrary precision. Apply mask=0xFFFFFFFF to keep 32 bits: a=(a^b)&mask; b=((a_orig&b)<<1)&mask. At the end, if a > 0x7FFFFFFF (negative in 32-bit): return ~(a^mask). Otherwise return a.',
      },
    ],
  },

  {
    title: 'Divide Two Integers',
    slug: 'divide-two-integers',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'MEDIUM',
    statement:
      'Divide dividend by divisor without multiplication, division, or mod. Return the quotient clamped to 32-bit signed integer range [-2³¹, 2³¹-1].\n\nExample: dividend=10, divisor=3 → 3\nExample: dividend=7, divisor=-3 → -2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use bit shifting to find the largest multiple of divisor ≤ dividend. Subtract and accumulate the quotient bit by bit from the highest power of 2 down.',
      },
      {
        level: 2,
        content:
          'Determine sign. Work with abs values. quotient=0. For shift from 31..0: if abs_divisor<<shift <= abs_dividend: abs_dividend-=abs_divisor<<shift; quotient+=1<<shift. Apply sign. Clamp to INT32 range. O(32).',
      },
      {
        level: 3,
        content:
          'Overflow edge case: dividend=-2³¹, divisor=-1 → would give 2³¹ > INT_MAX, return 2³¹-1. For abs values in Python, use min(-2**31, dividend) to handle correctly. The bit-scan approach finds the largest shift k where divisor*2^k ≤ remaining dividend, subtracts and records 2^k.',
      },
    ],
  },

  {
    title: 'Gray Code',
    slug: 'gray-code',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'MEDIUM',
    statement:
      'Return the n-bit Gray code sequence where consecutive values differ by exactly one bit. The sequence starts at 0.\n\nExample: n=2 → [0,1,3,2]\nExample: n=1 → [0,1]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Formula: the ith Gray code value is i XOR (i >> 1). This produces the entire 2^n sequence.',
      },
      {
        level: 2,
        content:
          'Return [i ^ (i >> 1) for i in range(1 << n)]. O(2^n). Proof: consecutive i and i+1 yield codes differing in exactly one bit.',
      },
      {
        level: 3,
        content:
          'Alternative "mirror" construction: start with [0,1]; for each bit k: prepend 1<<k to all current values in reverse order and append to the list. This doubles the sequence and adds bit k at the boundary — only that one bit changes between the original last element and the mirrored copy. Both methods are O(2^n).',
      },
    ],
  },

  {
    title: 'Bitwise AND of Numbers Range',
    slug: 'bitwise-and-of-numbers-range',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'MEDIUM',
    statement:
      'Return the bitwise AND of all integers in the range [left, right] inclusive.\n\nExample: left=5, right=7 → 4 (5&6&7 = 100₂)\nExample: left=0, right=0 → 0\nExample: left=1, right=2147483647 → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Any bit that differs between left and right takes both values 0 and 1 somewhere in the range, making the AND 0 for that bit. Only the common prefix of left and right survives.',
      },
      {
        level: 2,
        content:
          'shift=0. While left!=right: left>>=1; right>>=1; shift++. Return left<<shift. O(log max_val).',
      },
      {
        level: 3,
        content:
          'Simultaneously right-shifting both values strips the differing suffix bits. When left==right, the remaining bits are the shared prefix. Left-shifting by shift restores the common prefix to its original position. The range [left, right] always contains a number where any differing bit is 0, making that bit 0 in the AND.',
      },
    ],
  },

  {
    title: 'Total Hamming Distance',
    slug: 'total-hamming-distance',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'MEDIUM',
    statement:
      'Return the total Hamming distance between all pairs of integers in nums.\n\nExample: nums=[4,14,2] → 6\nExample: nums=[4,14,4] → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each bit position, count the numbers with that bit set (k) and unset (n-k). That bit contributes k*(n-k) to the total.',
      },
      {
        level: 2,
        content:
          'total=0. For bit from 0..31: ones=sum((x>>bit)&1 for x in nums). total+=ones*(n-ones). Return total. O(32n).',
      },
      {
        level: 3,
        content:
          'For each bit position, every pair with one 0 and one 1 contributes 1 to the total distance. k ones and (n-k) zeros form exactly k*(n-k) such pairs. This avoids the O(n²) brute-force pairwise approach.',
      },
    ],
  },

  {
    title: 'Minimum Flips to Make a OR b Equal to c',
    slug: 'minimum-flips-to-make-a-or-b-equal-to-c',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'MEDIUM',
    statement:
      'Return the minimum number of bit flips to make a OR b == c.\n\nExample: a=2, b=6, c=5 → 3\nExample: a=4, b=2, c=7 → 1\nExample: a=1, b=2, c=3 → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Check each bit position: if c\'s bit is 1, need at least one of a or b to have that bit (flip both 0s → 1 flip). If c\'s bit is 0, both must be 0 (flip each 1).',
      },
      {
        level: 2,
        content:
          'flips=0. While a or b or c: ba=a&1; bb=b&1; bc=c&1. If bc==0: flips+=ba+bb. Else: flips+=(ba==0 and bb==0). a>>=1; b>>=1; c>>=1. Return flips. O(32).',
      },
      {
        level: 3,
        content:
          'Three cases per bit position (a_bit, b_bit, c_bit): (0,0,1) → 1 flip; (1,0,0) → 1 flip; (0,1,0) → 1 flip; (1,1,0) → 2 flips; all others → 0 flips. The formula handles all cases: if c=0, cost=a+b (each 1 needs flipping); if c=1, cost=1 only when a=b=0.',
      },
    ],
  },

  {
    title: 'UTF-8 Validation',
    slug: 'utf-8-validation',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'MEDIUM',
    statement:
      'Given an array of integers (each a byte value 0-255), return true if it is a valid UTF-8 encoding.\n\nExample: data=[197,130,1] → true (2-byte + 1-byte)\nExample: data=[235,140,4] → false (invalid continuation byte)',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Parse byte by byte. The leading byte determines the character length (1-4 bytes). Verify continuation bytes start with "10xxxxxx".',
      },
      {
        level: 2,
        content:
          'i=0. While i<n: b=data[i]. if b>>7==0: size=1. elif b>>5==0b110: size=2. elif b>>4==0b1110: size=3. elif b>>3==0b11110: size=4. else: False. Verify next size-1 bytes: (data[i+k]>>6)==0b10. i+=size. Return True. O(n).',
      },
      {
        level: 3,
        content:
          'Continuation bytes satisfy byte & 0xC0 == 0x80 (top 2 bits are "10"). Check that there are enough remaining bytes for the declared character. Return False immediately on any violation. 1-byte: top bit 0. 2-byte: top 3 bits 110. 3-byte: top 4 bits 1110. 4-byte: top 5 bits 11110.',
      },
    ],
  },

  {
    title: 'Count Triplets That Can Form Two Arrays of Equal XOR',
    slug: 'count-triplets-that-can-form-two-arrays-of-equal-xor',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'MEDIUM',
    statement:
      'Return the count of triplets (i,j,k) with i ≤ j < k where XOR(arr[i..j-1]) == XOR(arr[j..k]).\n\nExample: arr=[2,3,1,6,7] → 4\nExample: arr=[1,1,1,1,1] → 10',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'a==b iff a^b==0. XOR(arr[i..j-1])==XOR(arr[j..k]) means XOR(arr[i..k])==0. Count pairs (i,k) with XOR(arr[i..k])==0; each such pair contributes (k-i) valid triplets (any j between i+1 and k works).',
      },
      {
        level: 2,
        content:
          'Build prefix XOR. For each i<k: if prefix[i]==prefix[k+1]: count+=k-i. Return count. O(n²).',
      },
      {
        level: 3,
        content:
          'O(n) approach: for each j: if prefix[i]==prefix[j] for some earlier i, all j values between i and current j contribute. Hash map: for each j, count += (sum of all indices i where prefix[i]==prefix[j]) - len(such_i) * j. Track two maps: freq[val]→count and total[val]→sum_of_indices.',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Maximum Students Taking Exam',
    slug: 'maximum-students-taking-exam',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'HARD',
    statement:
      'Students cannot sit next to each other in the same row or diagonally from the row in front. \'#\' = broken seat, \'.\' = good seat. Return the maximum number of students that can be seated.\n\nExample: seats=[["#",".","#","#",".","#"],[".","#","#","#","#","."],[".","#",".","#",".","#"]] → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Bitmask DP row by row. Represent each row\'s seating as a bitmask. Valid configurations must avoid adjacent seats and diagonal conflicts with the previous row.',
      },
      {
        level: 2,
        content:
          'Precompute valid_seats[row]. dp[mask] = max students for current row config mask. For each row: for each valid subset mask of valid_seats (no adjacent: mask&(mask>>1)==0): for each compatible prev_mask (no diagonals: (mask&(prev>>1))==0 and (mask&(prev<<1))==0): update dp\'[mask]. O(m * 4^(n/2)).',
      },
      {
        level: 3,
        content:
          'Iterate only over subsets of valid_seats using the subset enumeration trick: for sub=valid; sub>0; sub=(sub-1)&valid. Filter for no adjacent seats (sub&(sub>>1)==0). For each valid sub, check diagonal constraints against all valid previous-row masks. Track max popcount(mask) weighted by dp value.',
      },
    ],
  },

  {
    title: 'Smallest Sufficient Team',
    slug: 'smallest-sufficient-team',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'HARD',
    statement:
      'Given required skills and people (each with a subset of skills), return the indices of the smallest team covering all required skills.\n\nExample: req_skills=["java","nodejs","reactjs"], people=[["java"],["nodejs"],["nodejs","reactjs"]] → [0,2]\nExample: req_skills=["algorithms","math","java","reactjs","csharp","aws"], people=[["algorithms","math","java"],["algorithms","math","reactjs"],["java","csharp","aws"],["reactjs","csharp"],["csharp","math"]] → [1,2]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Bitmask DP on covered skills. dp[mask] = smallest team covering exactly the skills in mask. Iterate over each person and try adding them to every existing state.',
      },
      {
        level: 2,
        content:
          'Map skills to bits. For each person compute person_mask. dp[0]=[]. For each person p: for each mask in current dp: new_mask=mask|person_mask[p]; if len(dp[new_mask])>len(dp[mask])+1: dp[new_mask]=dp[mask]+[p]. Return dp[(1<<n)-1]. O(2^n * |people|).',
      },
      {
        level: 3,
        content:
          'To avoid copying lists, store dp[mask] as the last person added (parent pointer), reconstruct the team at the end. Iterate masks in increasing order — or equivalently, iterate people as the outer loop and masks in reverse (to avoid using the same person twice inadvertently). n ≤ 16 skills → 2^16 = 65536 states.',
      },
    ],
  },

  {
    title: 'Number of Ways to Wear Different Hats to Each Other',
    slug: 'number-of-ways-to-wear-different-hats-to-each-other',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'HARD',
    statement:
      'n people (n ≤ 10) and 40 hat types. Each person has preferred hats. Count assignments where every person wears a different hat from their preferences, mod 10^9+7.\n\nExample: hats=[[3,4],[4,5],[5]] → 1\nExample: hats=[[1,2,3,4],[1,2,3,4],[1,2,3,4],[1,2,3,4]] → 24',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Bitmask DP on which people have been assigned a hat. Iterate over hats 1..40 as the outer loop, assigning each hat to at most one person.',
      },
      {
        level: 2,
        content:
          'Group hats by which people like them. dp[mask] = ways to assign hats 1..h such that people in mask have been assigned. For each hat h: for each person p who likes h: dp[mask|(1<<p)] += dp[mask\\{p}]. Iterate hats one at a time; keep a copy per hat. O(40 * 2^n). Return dp[(1<<n)-1].',
      },
      {
        level: 3,
        content:
          'Use two arrays (curr, next) to process one hat at a time — each hat can be assigned to at most one person. For hat h and person p who likes h: next[mask|(1<<p)] += curr[mask] (person p gets hat h). Also carry forward: next[mask] += curr[mask] (hat h is not used by anyone). Swap curr/next per hat. dp[0]=1 initially.',
      },
    ],
  },

  {
    title: 'Minimum Number of Work Sessions to Finish the Tasks',
    slug: 'minimum-number-of-work-sessions-to-finish-the-tasks',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'HARD',
    statement:
      'n tasks with durations (≤ 10). Each work session lasts at most sessionTime. A task must be completed in one session. Return the minimum number of sessions to complete all tasks.\n\nExample: tasks=[1,2,3], sessionTime=3 → 2\nExample: tasks=[3,1,3,1,1], sessionTime=8 → 2\nExample: tasks=[1,2,3,4,5], sessionTime=15 → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Bitmask DP on the set of completed tasks. dp[mask] = (min_sessions, remaining_time_in_last_session) for completing exactly the tasks in mask.',
      },
      {
        level: 2,
        content:
          'dp[0]=(1,0). For mask from 0..2^n-1: for each task t not in mask: if fits in current session: dp[mask|(1<<t)]=min with (same_sessions, remaining+task). Else: dp[mask|(1<<t)]=min with (sessions+1, task). Return dp[(1<<n)-1][0]. O(2^n * n).',
      },
      {
        level: 3,
        content:
          'State: (num_sessions, time_used_in_last). When adding task t: if time_used+tasks[t] ≤ sessionTime: extend current session; else: start a new session with just task t. Use tuple comparison to find minimum. n ≤ 14 → 2^14 = 16384 states. Bitmask subset DP handles the combinatorial nature.',
      },
    ],
  },

  {
    title: 'Minimum Number of Flips to Convert Binary Matrix to Zero Matrix',
    slug: 'minimum-number-of-flips-to-convert-binary-matrix-to-zero-matrix',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'HARD',
    statement:
      'Flip a cell (r,c) and all its 4-directional neighbors. Return the minimum flips to make the entire matrix all zeros, or -1 if impossible.\n\nExample: mat=[[0,0],[0,1]] → 3\nExample: mat=[[1,1,1],[1,0,1],[0,0,0]] → 6\nExample: mat=[[1,0,0],[1,0,0]] → -1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Encode the entire matrix as a single bitmask. BFS on bitmask states — each flip applies a precomputed XOR mask for that cell and its neighbors.',
      },
      {
        level: 2,
        content:
          'Encode matrix as integer (bit r*cols+c). BFS from initial state. For each cell (r,c): new_state = current_state ^ flip_mask[r][c]. Visited set. Return BFS depth when all-zero state is reached, or -1. O(2^(m*n) * m*n).',
      },
      {
        level: 3,
        content:
          'Precompute flip_mask[r][c] = XOR of bits for (r,c) and its valid neighbors. Matrix is ≤ 3×3 = 9 cells → 2^9 = 512 states, making BFS feasible. Standard BFS guarantees minimum flips. Initial state encodes the given matrix; target is 0.',
      },
    ],
  },

  {
    title: 'Number of Valid Words for Each Puzzle',
    slug: 'number-of-valid-words-for-each-puzzle',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'HARD',
    statement:
      'A word is valid for a puzzle if: (1) the word contains the puzzle\'s first letter, and (2) every letter of the word is in the puzzle. Return the count of valid words for each puzzle.\n\nExample: words=["aaaa","asas","able","ability","actt","actor","access"], puzzles=["aboveyz","abrodyz","abslkce","bootcd","bintz","ourty"] → [1,1,3,2,4,0]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Represent each word and puzzle as a bitmask of distinct letters. A valid word\'s mask must be a subset of the puzzle\'s mask AND include the puzzle\'s first-letter bit.',
      },
      {
        level: 2,
        content:
          'Count word bitmasks in a frequency map. For each puzzle (pmask, first_bit): enumerate all subsets of pmask that include first_bit using sub=(sub-1)&pmask trick. Sum freq[sub] for each. O(|puzzles|*2^7) since puzzles have ≤ 7 distinct letters.',
      },
      {
        level: 3,
        content:
          'Subset enumeration: for sub=pmask; sub>0; sub=(sub-1)&pmask — this visits all subsets of pmask. Filter for subsets containing first_bit: (sub & first_bit) != 0. Sum freq.get(sub,0) for each. Each puzzle has ≤ 7 distinct letters → ≤ 128 subsets. Total: O(q * 128 + w) where q=|puzzles|, w=|words|.',
      },
    ],
  },

  {
    title: 'Find the Shortest Superstring',
    slug: 'find-the-shortest-superstring',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'HARD',
    statement:
      'Find the shortest string containing each word in words as a substring. Return any valid answer.\n\nExample: words=["alex","loves","leetcode"] → "alexlovesleetcode"\nExample: words=["catg","ctaagt","gcta","ttca","atgcatc"] → "gctaagttcatgcatc"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Bitmask DP on subsets: dp[mask][i] = minimum extra characters when words in mask are covered and the last word is words[i]. Precompute overlap[i][j] = max suffix of words[i] matching prefix of words[j].',
      },
      {
        level: 2,
        content:
          'overlap[i][j] = len of longest suffix of words[i] = prefix of words[j]. dp[1<<i][i]=len(words[i]). For mask, last: for next j not in mask: cost=len(words[j])-overlap[last][j]; dp[mask|(1<<j)][j]=min(...dp[mask][last]+cost). Reconstruct path. O(n² * 2^n).',
      },
      {
        level: 3,
        content:
          'Precompute overlaps using string matching or brute force: for each (i,j), find the longest k such that words[i][-k:]==words[j][:k]. DP tracks minimum total string length (not the string itself) — reconstruct at the end by following parent pointers. The superstring = first word + concatenate words[j][overlap:] for each subsequent word in order.',
      },
    ],
  },

  {
    title: 'Split Array With Same Average',
    slug: 'split-array-with-same-average',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'HARD',
    statement:
      'Return true if nums can be split into two non-empty subsets with equal average (same sum/size ratio).\n\nExample: nums=[1,2,3,4,5,6,7,8] → true\nExample: nums=[3,1] → false',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use meet-in-the-middle. For a subset of size k to have the same average: k*total_sum must be divisible by n and the subset sum must equal k*total_sum/n.',
      },
      {
        level: 2,
        content:
          'Split nums into two halves. For each half, enumerate all subsets storing (size, sum) pairs. For each subset from the second half: check if (n-size, total_sum-sum) exists in first-half set. O(2^(n/2)). Early prune: subset sum must equal k*total/n for some valid k.',
      },
      {
        level: 3,
        content:
          'Prune: for a subset of size k, needed sum = k*total_sum/n must be an integer with 0 < k < n. Enumerate first half subsets — for each (k,s): check if s*n == k*total_sum (valid average). Store valid (k,s) pairs in a set. For second half: for each (k,s): check if (n-k, total-s) is in the first-half set. Also ensure both subsets are non-empty.',
      },
    ],
  },

  {
    title: 'The Number of Good Subsets',
    slug: 'the-number-of-good-subsets',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'HARD',
    statement:
      'A "good" subset of nums has a product that is a product of distinct primes. Count good subsets (different indices = different subsets, even if same value), mod 10^9+7. Each element can be selected multiple times via different indices.\n\nExample: nums=[1,2,3,4] → 6\nExample: nums=[4,2,3,15] → 5',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Map each number 2..30 to its prime bitmask (primes ≤ 30). Numbers with squared prime factors (like 4, 8, 9) cannot appear. Bitmask DP on covered primes.',
      },
      {
        level: 2,
        content:
          'cnt=Counter(nums). Primes={2,3,5,7,11,13,17,19,23,29}, 10 primes. dp[mask]=ways to form product with exactly prime mask covered. dp[0]=1. For num 2..30 (if cnt[num]>0, no squared prime factor): for mask in decreasing order: dp[mask|pm]+=dp[mask]*cnt[num]. Answer=sum(dp[mask!=0])*2^cnt[1] mod MOD.',
      },
      {
        level: 3,
        content:
          'Each 1 in nums is "free" to include or exclude from any subset — multiply final answer by 2^cnt[1]. Only numbers 2..30 contribute distinct primes (larger have no additional primes ≤30 not already covered). Skip num if it contains a squared prime factor. Process in decreasing mask order to avoid using the same number twice (0-1 knapsack). n primes → 2^10 = 1024 dp states.',
      },
    ],
  },

  {
    title: 'Find a Value of a Mysterious Function Closest to Target',
    slug: 'find-a-value-of-a-mysterious-function-closest-to-target',
    pattern: 'BIT_MANIPULATION',
    difficulty: 'HARD',
    statement:
      'For mystery(l,r) = arr[l] AND arr[l+1] AND ... AND arr[r], find (l,r) minimizing |mystery(l,r) - target|.\n\nExample: arr=[9,12,3,7,15], target=5 → 0\nExample: arr=[10000000,10000000,10000000], target=1 → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each right endpoint r, maintain the set of distinct AND values for all subarrays ending at r. There are at most 32 such values (each extension can only clear bits).',
      },
      {
        level: 2,
        content:
          'prev={arr[0]}. ans=abs(arr[0]-target). For r from 1..n-1: curr={arr[r]} | {v & arr[r] for v in prev}. For v in curr: ans=min(ans, abs(v-target)). prev=curr. Return ans. O(n * 32).',
      },
      {
        level: 3,
        content:
          'Key insight: extending a subarray leftward can only clear bits or leave them unchanged (AND is monotone). So for each r, the set of AND values over all l ≤ r is at most 32 distinct values (one per bit position that can be cleared). Using a set (not list) automatically deduplicates. O(32) values per position → O(32n) total.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 19 — BIT_MANIPULATION (30 problems)...\n');

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
