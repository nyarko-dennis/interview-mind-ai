import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 6 — DP_1D (28 problems: 9 Easy, 9 Medium, 10 Hard)
// Already seeded: Climbing Stairs (Easy), House Robber (Medium)
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
    title: 'Fibonacci Number',
    slug: 'fibonacci-number',
    pattern: 'DP_1D',
    difficulty: 'EASY',
    statement:
      'The Fibonacci numbers: F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2) for n>1. Given n, return F(n).\n\nExample: n=2 → 1\nExample: n=3 → 2\nExample: n=4 → 3',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'F(n) only depends on the previous two values. You do not need to store the entire sequence — just roll two variables forward.',
      },
      {
        level: 2,
        content:
          'Space-optimised DP. a,b=0,1. For _ in range(n): a,b=b,a+b. Return a. Or iterative: dp[0]=0,dp[1]=1; dp[i]=dp[i-1]+dp[i-2]. O(n) time, O(1) space.',
      },
    ],
  },

  {
    title: 'N-th Tribonacci Number',
    slug: 'n-th-tribonacci-number',
    pattern: 'DP_1D',
    difficulty: 'EASY',
    statement:
      'T(0)=0, T(1)=1, T(2)=1, T(n)=T(n-1)+T(n-2)+T(n-3) for n>=3. Given n, return T(n).\n\nExample: n=4 → 4\nExample: n=25 → 1389537',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Extend the Fibonacci idea to three previous values. Roll three variables forward in each step instead of two.',
      },
      {
        level: 2,
        content:
          'Space-optimised DP. a,b,c=0,1,1. if n==0: return 0. if n<=2: return 1. For _ in range(n-2): a,b,c=b,c,a+b+c. Return c. O(n) time, O(1) space.',
      },
    ],
  },

  {
    title: 'Min Cost Climbing Stairs',
    slug: 'min-cost-climbing-stairs',
    pattern: 'DP_1D',
    difficulty: 'EASY',
    statement:
      'Given cost[] where cost[i] is the cost to step on stair i, you can climb 1 or 2 steps. You may start at index 0 or 1. Find the minimum cost to reach beyond the last stair.\n\nExample: cost=[10,15,20] → 15 (start at 1, pay 15, jump 2 to top)\nExample: cost=[1,100,1,1,1,100,1,1,100,1] → 6',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'dp[i] = minimum cost to reach stair i. You arrive at i from i-1 or i-2. The cost to reach the top (index n) is min(dp[n-1], dp[n-2]).',
      },
      {
        level: 2,
        content:
          'DP. dp[0]=cost[0], dp[1]=cost[1]. For i in range(2,n): dp[i]=cost[i]+min(dp[i-1],dp[i-2]). Return min(dp[n-1],dp[n-2]). Space-optimised: roll two variables. dp[i] includes cost[i] because you pay when you step on i, then jump to i+1 or i+2.',
      },
    ],
  },

  {
    title: "Pascal's Triangle",
    slug: 'pascals-triangle',
    pattern: 'DP_1D',
    difficulty: 'EASY',
    statement:
      "Given numRows, return the first numRows of Pascal's triangle. Each element is the sum of the two elements directly above it.\n\nExample: numRows=5 → [[1],[1,1],[1,2,1],[1,3,3,1],[1,4,6,4,1]]\nExample: numRows=1 → [[1]]",
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          "Build row by row. The first and last element of every row are 1. Every middle element row[j] = prev_row[j-1] + prev_row[j].",
      },
      {
        level: 2,
        content:
          "DP. result=[[1]]. For i in range(1,numRows): prev=result[-1]. row=[1]+[prev[j-1]+prev[j] for j in range(1,i)]+[1]. result.append(row). Return result. Each row is derived entirely from the previous row in O(row_length) time.",
      },
    ],
  },

  {
    title: "Pascal's Triangle II",
    slug: 'pascals-triangle-ii',
    pattern: 'DP_1D',
    difficulty: 'EASY',
    statement:
      "Given rowIndex, return the rowIndex-th row of Pascal's triangle (0-indexed). Use only O(rowIndex) extra space.\n\nExample: rowIndex=3 → [1,3,3,1]\nExample: rowIndex=0 → [1]\nExample: rowIndex=1 → [1,1]",
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          "Update the row in-place to avoid allocating a new list each time. Process from right to left so you don't overwrite values you still need.",
      },
      {
        level: 2,
        content:
          "In-place DP. row=[1]*(rowIndex+1). For i in range(1,rowIndex+1): for j in range(i-1,0,-1): row[j]+=row[j-1]. Return row. Iterating right-to-left ensures row[j-1] is still the old value when computing the new row[j].",
      },
    ],
  },

  {
    title: 'Best Time to Buy and Sell Stock',
    slug: 'best-time-to-buy-and-sell-stock',
    pattern: 'DP_1D',
    difficulty: 'EASY',
    statement:
      'Given prices[] where prices[i] is the stock price on day i, choose a single day to buy and a later day to sell to maximise profit. Return the maximum profit, or 0 if no profit is possible.\n\nExample: prices=[7,1,5,3,6,4] → 5 (buy day 2 at 1, sell day 5 at 6)\nExample: prices=[7,6,4,3,1] → 0',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Track the minimum price seen so far as you scan left to right. At each day, the best profit if you sell today is price[i] - min_price_so_far. Update max profit continuously.',
      },
      {
        level: 2,
        content:
          'DP / single pass. min_price=inf; max_profit=0. For p in prices: min_price=min(min_price,p); max_profit=max(max_profit,p-min_price). Return max_profit. This is O(n) time O(1) space — equivalent to dp[i]=max profit selling on day i.',
      },
    ],
  },

  {
    title: 'Counting Bits',
    slug: 'counting-bits',
    pattern: 'DP_1D',
    difficulty: 'EASY',
    statement:
      'Given an integer n, return an array ans of length n+1 where ans[i] is the number of 1s in the binary representation of i.\n\nExample: n=2 → [0,1,1]\nExample: n=5 → [0,1,1,2,1,2]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          "For any number i, removing the lowest set bit gives a smaller number whose bit count you've already computed. Or: i and (i>>1) differ by at most one bit (the lowest).",
      },
      {
        level: 2,
        content:
          "DP. ans=[0]*(n+1). For i in range(1,n+1): ans[i]=ans[i>>1]+(i&1). Return ans. i>>1 shifts right (same as i//2), which is always a smaller index already computed. (i&1) adds 1 if i is odd (has a set lowest bit). O(n) time, O(n) space (output only).",
      },
    ],
  },

  {
    title: 'Get Maximum in Generated Array',
    slug: 'get-maximum-in-generated-array',
    pattern: 'DP_1D',
    difficulty: 'EASY',
    statement:
      'Generate array nums of length n+1: nums[0]=0, nums[1]=1 (if n>=1). For i in [2,n]: if i is even: nums[i]=nums[i/2]; if i is odd: nums[i]=nums[i/2]+nums[i/2+1]. Return max(nums).\n\nExample: n=7 → 3\nExample: n=2 → 1\nExample: n=3 → 2',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Build the array iteratively from index 0 upward. Each value depends only on previously computed smaller indices. Track the maximum as you go.',
      },
      {
        level: 2,
        content:
          'DP. if n==0: return 0. nums=[0]*(n+1); nums[1]=1; max_val=1. For i in range(2,n+1): nums[i]=nums[i//2] if i%2==0 else nums[i//2]+nums[i//2+1]. max_val=max(max_val,nums[i]). Return max_val.',
      },
    ],
  },

  {
    title: 'Maximum Subarray',
    slug: 'maximum-subarray',
    pattern: 'DP_1D',
    difficulty: 'EASY',
    statement:
      'Given array nums, find the contiguous subarray with the largest sum and return its sum.\n\nExample: nums=[-2,1,-3,4,-1,2,1,-5,4] → 6 (subarray [4,-1,2,1])\nExample: nums=[1] → 1\nExample: nums=[5,4,-1,7,8] → 23',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          "dp[i] = maximum subarray sum ending at index i. It's either nums[i] alone, or extending the best subarray ending at i-1. If the previous subarray has a negative sum, starting fresh at nums[i] is always better.",
      },
      {
        level: 2,
        content:
          "Kadane's Algorithm. cur=nums[0]; best=nums[0]. For num in nums[1:]: cur=max(num, cur+num); best=max(best,cur). Return best. cur represents dp[i]: extend if cur+num > num (i.e. cur > 0), else restart. O(n) time, O(1) space.",
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Coin Change',
    slug: 'coin-change',
    pattern: 'DP_1D',
    difficulty: 'MEDIUM',
    statement:
      'Given an array coins of denominations and an integer amount, return the fewest coins needed to make up that amount. Return -1 if impossible.\n\nExample: coins=[1,2,5], amount=11 → 3 (5+5+1)\nExample: coins=[2], amount=3 → -1\nExample: coins=[1], amount=0 → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[i] = minimum coins to make amount i. To make amount i, try each coin c: if i-c >= 0, you can use 1 + dp[i-c] coins. Base case dp[0]=0. What should the initial value of dp[i>0] be?',
      },
      {
        level: 2,
        content:
          'Bottom-up DP (unbounded knapsack). dp=[inf]*(amount+1); dp[0]=0. For i in range(1,amount+1): for c in coins: if i-c>=0 and dp[i-c]!=inf: dp[i]=min(dp[i], dp[i-c]+1). Return dp[amount] if dp[amount]!=inf else -1.',
      },
      {
        level: 3,
        content:
          'dp=[float("inf")]*(amount+1); dp[0]=0. For i in range(1,amount+1): for c in coins: if c<=i: dp[i]=min(dp[i],dp[i-c]+1). Return dp[amount] if dp[amount]!=float("inf") else -1. Alternative order: for each coin, update all amounts — both orderings give same result for this "minimum coins" variant. O(amount * len(coins)) time.',
      },
    ],
  },

  {
    title: 'Longest Increasing Subsequence',
    slug: 'longest-increasing-subsequence',
    pattern: 'DP_1D',
    difficulty: 'MEDIUM',
    statement:
      'Given an integer array nums, return the length of the longest strictly increasing subsequence.\n\nExample: nums=[10,9,2,5,3,7,101,18] → 4 ([2,3,7,101])\nExample: nums=[0,1,0,3,2,3] → 4\nExample: nums=[7,7,7,7,7] → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[i] = length of LIS ending at index i. For each i, look back at all j<i where nums[j]<nums[i]: dp[i] = max(dp[j])+1. O(n²). Can you do O(n log n) using binary search?',
      },
      {
        level: 2,
        content:
          'O(n²) DP: dp=[1]*n. For i in range(n): for j in range(i): if nums[j]<nums[i]: dp[i]=max(dp[i],dp[j]+1). Return max(dp). O(n log n): maintain a "tails" array where tails[i] = smallest tail element for an increasing subsequence of length i+1. Binary search to find insert position for each num.',
      },
      {
        level: 3,
        content:
          'O(n log n) with patience sort. tails=[]. For num in nums: pos=bisect_left(tails,num). if pos==len(tails): tails.append(num) else: tails[pos]=num. Return len(tails). tails is always sorted. Replacing tails[pos] doesn\'t change len(tails) unless we extend — it just records a better (smaller) tail for that length, enabling longer future subsequences.',
      },
    ],
  },

  {
    title: 'Word Break',
    slug: 'word-break',
    pattern: 'DP_1D',
    difficulty: 'MEDIUM',
    statement:
      'Given string s and dictionary wordDict, return true if s can be segmented into one or more dictionary words.\n\nExample: s="leetcode", wordDict=["leet","code"] → true\nExample: s="applepenapple", wordDict=["apple","pen"] → true\nExample: s="catsandog", wordDict=["cats","dog","sand","and","cat"] → false',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[i] = true if s[0:i] can be segmented. To compute dp[i], check all j<i: if dp[j] is true and s[j:i] is in the dictionary, then dp[i] is true. Base case: dp[0]=true (empty string).',
      },
      {
        level: 2,
        content:
          'Bottom-up DP. word_set=set(wordDict). dp=[False]*(n+1); dp[0]=True. For i in range(1,n+1): for j in range(i): if dp[j] and s[j:i] in word_set: dp[i]=True; break. Return dp[n]. Using word_set for O(1) lookup. Time O(n²) or O(n * max_word_len) with the inner break.',
      },
      {
        level: 3,
        content:
          'word_set=set(wordDict); max_len=max(len(w) for w in wordDict). dp=[False]*(n+1); dp[0]=True. For i in range(1,n+1): for j in range(max(0,i-max_len),i): if dp[j] and s[j:i] in word_set: dp[i]=True; break. Return dp[n]. Limiting j range to max word length reduces unnecessary checks — a critical optimisation for large inputs.',
      },
    ],
  },

  {
    title: 'Decode Ways',
    slug: 'decode-ways',
    pattern: 'DP_1D',
    difficulty: 'MEDIUM',
    statement:
      "Messages encoded as digits map to letters: '1'→A, '2'→B, ..., '26'→Z. Given a string s of digits, return the number of ways to decode it.\n\nExample: s=\"12\" → 2 (\"AB\" or \"L\")\nExample: s=\"226\" → 3 (\"BZ\",\"VF\",\"BBF\"... wait: \"BBF\"=2+2+6, \"BZ\"=2+26, \"VF\"=22+6)\nExample: s=\"06\" → 0 (leading zero invalid)",
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          "dp[i] = number of ways to decode s[0:i]. To compute dp[i]: if s[i-1]!='0': dp[i] += dp[i-1] (single-digit decode). If s[i-2:i] forms a valid two-digit number 10-26: dp[i] += dp[i-2]. What are the base cases?",
      },
      {
        level: 2,
        content:
          "DP. dp=[0]*(n+1); dp[0]=1; dp[1]=0 if s[0]=='0' else 1. For i in range(2,n+1): one=int(s[i-1]); two=int(s[i-2:i]). if one!=0: dp[i]+=dp[i-1]. if 10<=two<=26: dp[i]+=dp[i-2]. Return dp[n]. dp[0]=1 acts as a base multiplier for valid two-digit decodings at the start.",
      },
      {
        level: 3,
        content:
          "dp=[0]*(n+1); dp[0]=1; dp[1]=1 if s[0]!='0' else 0. For i in range(2,n+1): if s[i-1]!='0': dp[i]+=dp[i-1]. if 10<=int(s[i-2:i])<=26: dp[i]+=dp[i-2]. Return dp[n]. Key edge cases: '0' can never be decoded alone; '01','09' are invalid two-digit numbers; only '10'-'26' are valid two-digit decodings.",
      },
    ],
  },

  {
    title: 'Maximum Product Subarray',
    slug: 'maximum-product-subarray',
    pattern: 'DP_1D',
    difficulty: 'MEDIUM',
    statement:
      'Given array nums, find the contiguous subarray with the largest product and return the product.\n\nExample: nums=[2,3,-2,4] → 6 (subarray [2,3])\nExample: nums=[-2,0,-1] → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Unlike maximum sum, a negative number can turn a large negative product into a large positive one. Track both the maximum AND minimum product ending at each index. When you encounter a negative number, the roles of max and min swap.',
      },
      {
        level: 2,
        content:
          'DP tracking both extremes. cur_max=cur_min=result=nums[0]. For num in nums[1:]: candidates=(num, num*cur_max, num*cur_min). cur_max=max(candidates); cur_min=min(candidates). result=max(result,cur_max). Return result.',
      },
      {
        level: 3,
        content:
          'cur_max=cur_min=ans=nums[0]. For n in nums[1:]: if n<0: cur_max,cur_min=cur_min,cur_max. cur_max=max(n,cur_max*n). cur_min=min(n,cur_min*n). ans=max(ans,cur_max). Return ans. Swapping on negative is equivalent to the three-candidate approach but more explicit about why: multiplying a negative flips which extreme is which.',
      },
    ],
  },

  {
    title: 'House Robber II',
    slug: 'house-robber-ii',
    pattern: 'DP_1D',
    difficulty: 'MEDIUM',
    statement:
      'Houses are arranged in a circle; adjacent houses are connected. You cannot rob two adjacent houses. Given nums[], find the maximum money.\n\nExample: nums=[2,3,2] → 3\nExample: nums=[1,2,3,1] → 4\nExample: nums=[1,2,3] → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'The circular constraint means house 0 and house n-1 cannot both be robbed. Split into two linear sub-problems: rob houses [0..n-2] (exclude last) and houses [1..n-1] (exclude first). Return the max of both.',
      },
      {
        level: 2,
        content:
          'Run the original House Robber DP twice. rob(nums): prev2=0, prev1=0. For n in nums: curr=max(prev1, prev2+n); prev2=prev1; prev1=curr. return prev1. Return max(rob(nums[:-1]), rob(nums[1:])) (handle n==1 specially).',
      },
      {
        level: 3,
        content:
          'def rob_linear(arr): a=b=0. For x in arr: a,b=b,max(b,a+x). return b. if len(nums)==1: return nums[0]. return max(rob_linear(nums[:-1]), rob_linear(nums[1:])). The two sub-problems cover all valid cases: since we cannot take both first and last, at least one of the two ranges [0,n-2] and [1,n-1] will contain the optimal solution.',
      },
    ],
  },

  {
    title: 'Jump Game II',
    slug: 'jump-game-ii',
    pattern: 'DP_1D',
    difficulty: 'MEDIUM',
    statement:
      'Given array nums where nums[i] is the maximum jump length from position i, return the minimum number of jumps to reach the last index. It is guaranteed you can reach the last index.\n\nExample: nums=[2,3,1,1,4] → 2 (0→1→4)\nExample: nums=[2,3,0,1,4] → 2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Greedy works: at each "jump", you know the furthest you can reach from all positions in the current jump range. Extend to the furthest reachable position in the next jump. Count jumps when you exhaust the current range.',
      },
      {
        level: 2,
        content:
          'Greedy. jumps=0; cur_end=0; farthest=0. For i in range(n-1): farthest=max(farthest, i+nums[i]). if i==cur_end: jumps++; cur_end=farthest. if cur_end>=n-1: break. Return jumps. Looping only to n-2 avoids counting a jump from the last index.',
      },
      {
        level: 3,
        content:
          'jumps=cur_end=farthest=0. For i in range(n-1): farthest=max(farthest,i+nums[i]). if i==cur_end: jumps+=1; cur_end=farthest. Return jumps. This is O(n) greedy. The DP alternative dp[i]=min jumps to reach i is O(n²) and unnecessarily slow. The greedy is valid because always extending to the farthest reachable point never increases the jump count beyond optimal.',
      },
    ],
  },

  {
    title: 'Perfect Squares',
    slug: 'perfect-squares',
    pattern: 'DP_1D',
    difficulty: 'MEDIUM',
    statement:
      'Given an integer n, return the least number of perfect square numbers that sum to n.\n\nExample: n=12 → 3 (4+4+4)\nExample: n=13 → 2 (4+9)\nExample: n=1 → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[i] = minimum perfect squares summing to i. To compute dp[i], try every perfect square j² ≤ i: dp[i] = min(dp[i - j²] + 1). This is the same structure as Coin Change with coins being all perfect squares.',
      },
      {
        level: 2,
        content:
          'Bottom-up DP (unbounded knapsack with perfect-square coins). squares=[j*j for j in range(1,int(n**0.5)+1)]. dp=[inf]*(n+1); dp[0]=0. For i in range(1,n+1): for sq in squares: if sq>i: break. dp[i]=min(dp[i],dp[i-sq]+1). Return dp[n].',
      },
      {
        level: 3,
        content:
          'squares=[j*j for j in range(1,int(n**0.5)+1)]. dp=[float("inf")]*(n+1); dp[0]=0. For i in range(1,n+1): for sq in squares: if sq>i: break. dp[i]=min(dp[i],dp[i-sq]+1). Return dp[n]. Note: Lagrange\'s four-square theorem guarantees the answer is always ≤ 4. You can use this to short-circuit: check if n is a perfect square (1), can be expressed as sum of 2 squares, etc.',
      },
    ],
  },

  {
    title: 'Longest Palindromic Subsequence',
    slug: 'longest-palindromic-subsequence',
    pattern: 'DP_1D',
    difficulty: 'MEDIUM',
    statement:
      'Given a string s, find the length of the longest palindromic subsequence.\n\nExample: s="bbbab" → 4 (subsequence "bbbb")\nExample: s="cbbd" → 2 (subsequence "bb")',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'The longest palindromic subsequence of s equals the longest common subsequence (LCS) of s and its reverse. Alternatively, use interval DP: dp[i][j] = LPS length in s[i..j].',
      },
      {
        level: 2,
        content:
          'Interval DP. dp[i][j] = LPS length in s[i:j+1]. Base: dp[i][i]=1. Transition: if s[i]==s[j]: dp[i][j]=dp[i+1][j-1]+2. Else: dp[i][j]=max(dp[i+1][j], dp[i][j-1]). Fill diagonally (increasing length). Return dp[0][n-1]. O(n²) time and space.',
      },
      {
        level: 3,
        content:
          'dp=[[0]*n for _ in range(n)]. For i in range(n): dp[i][i]=1. For length in range(2,n+1): for i in range(n-length+1): j=i+length-1. if s[i]==s[j]: dp[i][j]=(dp[i+1][j-1] if length>2 else 0)+2. else: dp[i][j]=max(dp[i+1][j],dp[i][j-1]). Return dp[0][n-1]. The +2 for matching ends extends the inner palindrome by the two matching characters.',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Burst Balloons',
    slug: 'burst-balloons',
    pattern: 'DP_1D',
    difficulty: 'HARD',
    statement:
      'Given array nums of balloon values, bursting balloon i earns nums[i-1]*nums[i]*nums[i+1] coins (use 1 if out of bounds). Burst all balloons to maximise coins.\n\nExample: nums=[3,1,5,8] → 167\nExample: nums=[1,5] → 10',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Think in reverse: instead of "which balloon to burst first", ask "which balloon to burst last in a range [left, right]?" The last balloon in [left,right] has neighbours left-1 and right+1 which are still intact — making the coins calculation clean.',
      },
      {
        level: 2,
        content:
          'Interval DP. Pad with 1s: nums = [1]+nums+[1]. dp[i][j] = max coins from bursting all balloons strictly between i and j (exclusive). For each k in (i,j): dp[i][j] = max(dp[i][k] + nums[i]*nums[k]*nums[j] + dp[k][j]). k is the last balloon burst in this interval. Fill by increasing interval length.',
      },
      {
        level: 3,
        content:
          'nums=[1]+nums+[1]; n=len(nums). dp=[[0]*n for _ in range(n)]. For length in range(2,n): for i in range(0,n-length): j=i+length. For k in range(i+1,j): dp[i][j]=max(dp[i][j], dp[i][k]+nums[i]*nums[k]*nums[j]+dp[k][j]). Return dp[0][n-1]. The key insight: treating k as the LAST burst in (i,j) means its neighbours i and j are always intact when k is burst, giving a clean sub-problem.',
      },
    ],
  },

  {
    title: 'Jump Game VI',
    slug: 'jump-game-vi',
    pattern: 'DP_1D',
    difficulty: 'HARD',
    statement:
      'Starting at index 0, you can jump to any index i+j where 1≤j≤k. Your score increases by nums[index] on every landing (including the start). Return maximum score to reach the last index.\n\nExample: nums=[1,-1,-2,4,-7,3], k=2 → 7 (path 0→1→3→5: 1+(-1)+4+3)\nExample: nums=[10,-5,-2,4,0,3], k=3 → 17',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[i] = max score to reach index i. dp[i] = nums[i] + max(dp[i-k], ..., dp[i-1]). Computing this max naively is O(nk). You need the sliding window maximum of the last k dp values in O(1) per step.',
      },
      {
        level: 2,
        content:
          'DP + Monotonic Deque (sliding window maximum). Maintain a deque of indices with decreasing dp values. For each i: pop front if out of window (index < i-k). dp[i] = nums[i] + dp[deque.front]. Pop back while dp[deque.back] <= dp[i]. Append i. O(n) total.',
      },
      {
        level: 3,
        content:
          'from collections import deque. dp=[0]*n; dp[0]=nums[0]. dq=deque([0]). For i in range(1,n): while dq and dq[0]<i-k: dq.popleft(). dp[i]=nums[i]+dp[dq[0]]. while dq and dp[dq[-1]]<=dp[i]: dq.pop(). dq.append(i). Return dp[n-1]. The deque front always holds the index of the maximum dp value in the last k positions.',
      },
    ],
  },

  {
    title: 'Decode Ways II',
    slug: 'decode-ways-ii',
    pattern: 'DP_1D',
    difficulty: 'HARD',
    statement:
      "Like Decode Ways, but '*' can represent any digit from 1–9. Return the total number of ways to decode the string, modulo 10^9+7.\n\nExample: s=\"*\" → 9\nExample: s=\"1*\" → 18\nExample: s=\"2*\" → 15",
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          "Extend Decode Ways DP to handle '*'. A '*' alone contributes 9 ways (digits 1–9). A '*' in a two-digit pair requires careful case analysis based on the other digit. Track dp[i] mod 10^9+7.",
      },
      {
        level: 2,
        content:
          "DP. dp[0]=1. For each position i: single-char contribution: if s[i]!='0': dp[i]+= dp[i-1]*9 if s[i]=='*' else dp[i-1]. Two-char contribution (s[i-2:i]): if s[i-1]=='*' and s[i]=='*': 15 combos (11-19,21-26). Various cases for one or both being '*'. Always mod 10^9+7.",
      },
      {
        level: 3,
        content:
          "MOD=10**9+7. dp=[0]*(n+2); dp[0]=1; dp[1]=9 if s[0]=='*' else (0 if s[0]=='0' else 1). For i in range(2,n+1): c=s[i-1]; p=s[i-2]. Single: dp[i]+=(9*dp[i-1] if c=='*' else dp[i-1]) if c!='0' else 0. Two-digit: if p=='*' and c=='*': dp[i]+=15*dp[i-2] elif p=='*': dp[i]+=(2 if c<='6' else 1)*dp[i-2] elif c=='*': dp[i]+=(9 if p=='1' else 6 if p=='2' else 0)*dp[i-2] else: two=int(p+c); dp[i]+=(dp[i-2] if 10<=two<=26 else 0). dp[i]%=MOD. Return dp[n].",
      },
    ],
  },

  {
    title: 'Minimum Difficulty of a Job Schedule',
    slug: 'minimum-difficulty-of-a-job-schedule',
    pattern: 'DP_1D',
    difficulty: 'HARD',
    statement:
      'Schedule n jobs over d days in order. Each day must have at least 1 job. The difficulty of a day is the maximum job difficulty that day. Return the minimum total difficulty over d days, or -1 if impossible.\n\nExample: jobDifficulty=[6,5,4,3,2,1], d=2 → 7 (day1:[6,5,4,3,2]→6, day2:[1]→1)\nExample: jobDifficulty=[9,9,9], d=4 → -1\nExample: jobDifficulty=[1,1,1], d=3 → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[day][i] = minimum difficulty scheduling jobs[0..i] across day days. To transition: the last day covers jobs[j..i] for some j. Its difficulty is max(jobs[j..i]). Minimise over all valid j.',
      },
      {
        level: 2,
        content:
          'DP. dp[day][i] = min difficulty using first i+1 jobs in day days. For day in 1..d: for i in day-1..n-1: for j in day-1..i: dp[day][i] = min(dp[day][i], dp[day-1][j-1] + max(jobs[j..i])). Return dp[d][n-1]. Precompute range maxima or use running max in inner loop.',
      },
      {
        level: 3,
        content:
          'n=len(jobs); if n<d: return -1. INF=float("inf"). prev=[INF]*n; prev[0]=jobs[0]. For i in range(1,n): prev[i]=max(prev[i-1],jobs[i]). For day in range(2,d+1): curr=[INF]*n. For i in range(day-1,n): max_d=0. For j in range(i,day-2,-1): max_d=max(max_d,jobs[j]); if prev[j-1]!=INF: curr[i]=min(curr[i],prev[j-1]+max_d). prev=curr. Return prev[n-1] if prev[n-1]!=INF else -1.',
      },
    ],
  },

  {
    title: 'Maximum Sum of 3 Non-Overlapping Subarrays',
    slug: 'maximum-sum-of-3-non-overlapping-subarrays',
    pattern: 'DP_1D',
    difficulty: 'HARD',
    statement:
      'Given integer array nums and integer k, find 3 non-overlapping subarrays of length k with maximum total sum. Return their starting indices in ascending order. If multiple answers exist, return the lexicographically smallest.\n\nExample: nums=[1,2,1,2,6,7,5,1], k=2 → [0,3,5]\nExample: nums=[1,2,1,2,1,2,1,2,1], k=2 → [0,2,4]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Precompute sliding window sums of length k. Then for the middle window at position i, you need the best left window in [0, i-k] and the best right window in [i+k, n-k]. Precompute these with left/right DP arrays.',
      },
      {
        level: 2,
        content:
          'Three passes. 1) Compute sums[i] = sum of nums[i:i+k]. 2) left[i] = index of max sum window in sums[0..i] (ties: pick smallest index). 3) right[i] = index of max sum window in sums[i..n-k] (ties: pick largest index). 4) Iterate middle window j in [k, n-2k]: check left[j-k] + sums[j] + sums[right[j+k]].',
      },
      {
        level: 3,
        content:
          'win=[sum(nums[:k])]; for i in range(k,n): win.append(win[-1]+nums[i]-nums[i-k]). left=[0]*n; best=0. For i in range(n-k+1): if win[i]>win[best]: best=i. left[i]=best. right=[0]*n; best=n-k. For i in range(n-k,-1,-1): if win[i]>=win[best]: best=i. right[i]=best. ans=None. For j in range(k,n-2*k+1): l=left[j-k]; r=right[j+k]. s=win[l]+win[j]+win[r]. if ans is None or s>win[ans[0]]+win[ans[1]]+win[ans[2]]: ans=[l,j,r]. Return ans.',
      },
    ],
  },

  {
    title: 'Minimum Number of Refueling Stops',
    slug: 'minimum-number-of-refueling-stops',
    pattern: 'DP_1D',
    difficulty: 'HARD',
    statement:
      'A car starts at position 0 with startFuel. stations[i]=[position, fuel]. You stop at a station to refuel. Return the minimum number of refueling stops to reach target, or -1 if impossible.\n\nExample: target=1, startFuel=1, stations=[] → 0\nExample: target=100, startFuel=1, stations=[[10,100]] → -1\nExample: target=100, startFuel=10, stations=[[10,60],[20,30],[30,30],[60,40]] → 2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'dp[j] = maximum distance reachable with exactly j refueling stops. For each station, update in reverse: if you can currently reach the station (dp[j] >= station position), then dp[j+1] = max(dp[j+1], dp[j] + station fuel).',
      },
      {
        level: 2,
        content:
          'DP. dp=[0]*(n+1); dp[0]=startFuel. For each station (pos, fuel): for j in range(i,-1,-1): if dp[j]>=pos: dp[j+1]=max(dp[j+1], dp[j]+fuel). After processing all stations, find minimum j where dp[j]>=target. O(n²) time.',
      },
      {
        level: 3,
        content:
          'dp=[0]*(len(stations)+2); dp[0]=startFuel. For i,(pos,fuel) in enumerate(stations): for j in range(i,-1,-1): if dp[j]>=pos: dp[j+1]=max(dp[j+1],dp[j]+fuel). For j in range(len(dp)): if dp[j]>=target: return j. Return -1. Iterating j backwards prevents using station i twice in the same stop count. Alternatively, use a greedy max-heap: always refuel at the most fuel-rich reachable station.',
      },
    ],
  },

  {
    title: 'Count Vowels Permutation',
    slug: 'count-vowels-permutation',
    pattern: 'DP_1D',
    difficulty: 'HARD',
    statement:
      "Count strings of length n using only vowels 'a','e','i','o','u' with these rules: 'a' follows 'e','i','u'; 'e' follows 'a','i'; 'i' follows 'e','o'; 'o' follows 'i'; 'u' follows 'i','o'. Return count mod 10^9+7.\n\nExample: n=1 → 5\nExample: n=2 → 10\nExample: n=5 → 68",
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          "dp[c] = number of valid strings of current length ending in vowel c. At each step, transition each vowel's count to the vowels that can follow it. How does each vowel receive counts from its predecessors?",
      },
      {
        level: 2,
        content:
          "DP. Track counts a,e,i,o,u for the current length. Each step: new_a = e+i+u; new_e = a+i; new_i = e+o; new_o = i; new_u = i+o. All counts mod 10^9+7. Start with a=e=i=o=u=1 (length 1). Repeat n-1 transitions. Return sum of all counts.",
      },
      {
        level: 3,
        content:
          "MOD=10**9+7. a=e=i=o=u=1. For _ in range(n-1): a,e,i,o,u = (e+i+u)%MOD, (a+i)%MOD, (e+o)%MOD, i%MOD, (i+o)%MOD. Return (a+e+i+o+u)%MOD. The rules describe which vowels can PRECEDE each vowel — equivalently, each vowel receives from its valid predecessors each step.",
      },
    ],
  },

  {
    title: 'Best Time to Buy and Sell Stock IV',
    slug: 'best-time-to-buy-and-sell-stock-iv',
    pattern: 'DP_1D',
    difficulty: 'HARD',
    statement:
      'Given prices[] and integer k, find the maximum profit with at most k transactions (buy then sell = 1 transaction; must sell before buying again).\n\nExample: k=2, prices=[2,4,1] → 2\nExample: k=2, prices=[3,2,6,5,0,3] → 7',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'If k >= n/2, unlimited transactions are possible (use the greedy approach for Stock II). Otherwise, dp[t][i] = max profit with at most t transactions on days 0..i. For each transaction, track the best "buy so far" to make transitions O(1) per step.',
      },
      {
        level: 2,
        content:
          'Optimised DP. For each transaction t from 1 to k: profit[i] = max(profit[i-1], prices[i] - prices[j] + profit_prev[j]) for j<i. Equivalently: track max_diff = max(profit_prev[j] - prices[j]) as you scan left to right. profit[i] = max(profit[i-1], prices[i] + max_diff).',
      },
      {
        level: 3,
        content:
          'if k>=n//2: return sum(max(0,prices[i]-prices[i-1]) for i in range(1,n)). profit=[0]*n. For t in range(k): prev=profit[:]; max_diff=prev[0]-prices[0]. For i in range(1,n): max_diff=max(max_diff,prev[i]-prices[i]); profit[i]=max(profit[i-1],prices[i]+max_diff). Return profit[-1]. Each outer loop iteration represents adding one more transaction.',
      },
    ],
  },

  {
    title: 'Strange Printer',
    slug: 'strange-printer',
    pattern: 'DP_1D',
    difficulty: 'HARD',
    statement:
      'A printer can print a sequence of same characters each turn, overwriting previous characters. Return the minimum number of turns to print string s.\n\nExample: s="aaabbb" → 2 (print "aaa", then "bbb")\nExample: s="aba" → 2 (print "aaa", then "b" in middle)',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Interval DP: dp[i][j] = minimum turns to print s[i..j]. Key insight: the printer can extend a character it is already printing to cover a later matching character "for free" — merging two separate prints into one.',
      },
      {
        level: 2,
        content:
          'Interval DP. dp[i][j] = min turns for s[i..j]. Base: dp[i][i]=1. Transition: dp[i][j] = dp[i][j-1]+1 (print s[j] separately). Then for k in [i,j-1]: if s[k]==s[j]: dp[i][j]=min(dp[i][j], dp[i][k]+dp[k+1][j-1]). When s[k]==s[j], printing s[k] can extend to also cover s[j] at no extra cost.',
      },
      {
        level: 3,
        content:
          'n=len(s). dp=[[0]*n for _ in range(n)]. For i in range(n): dp[i][i]=1. For length in range(2,n+1): for i in range(n-length+1): j=i+length-1. dp[i][j]=dp[i][j-1]+1. For k in range(i,j): if s[k]==s[j]: val=(dp[i][k]+dp[k+1][j-1]) if k+1<=j-1 else dp[i][k]. dp[i][j]=min(dp[i][j],val). Return dp[0][n-1].',
      },
    ],
  },

  {
    title: 'Minimum Cost to Cut a Stick',
    slug: 'minimum-cost-to-cut-a-stick',
    pattern: 'DP_1D',
    difficulty: 'HARD',
    statement:
      'Given a wooden stick of length n and array cuts, cut the stick at all positions. Each cut costs the current length of the sub-stick being cut. Return the minimum total cost.\n\nExample: n=7, cuts=[1,3,4,5] → 16\nExample: n=9, cuts=[5,6,1,4,2] → 22',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'The order of cuts matters because each cut cost equals the current stick length. Think in reverse: instead of which cut to make first, ask which cut was made last in a sub-problem [left, right]. The last cut of that sub-stick costs right-left.',
      },
      {
        level: 2,
        content:
          'Interval DP on sorted cuts. Add 0 and n as boundaries. dp[i][j] = minimum cost to make all cuts strictly between positions cuts[i] and cuts[j]. For each k between i and j (exclusive): dp[i][j] = min(dp[i][k] + dp[k][j] + cuts[j]-cuts[i]). k is the last cut made in [i,j].',
      },
      {
        level: 3,
        content:
          'cuts.sort(); cuts=[0]+cuts+[n]; m=len(cuts). dp=[[0]*m for _ in range(m)]. For length in range(2,m): for i in range(m-length): j=i+length. dp[i][j]=float("inf"). For k in range(i+1,j): dp[i][j]=min(dp[i][j], dp[i][k]+dp[k][j]+cuts[j]-cuts[i]). Return dp[0][m-1]. Adding 0 and n as boundary cuts makes the cost formula cuts[j]-cuts[i] uniformly applicable to all sub-problems.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 6 — DP_1D (28 problems)...\n');

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
