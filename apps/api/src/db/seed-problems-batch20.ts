import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 20 — MATH_GEOMETRY (30 problems: 10 Easy, 10 Medium, 10 Hard)
// Already seeded: Rotate Image 48 (original seed, Medium) — will be skipped
// Incorporates user samples: Reverse Integer, Josephus Problem (1823),
//   Triangle Numbers (611), Spiral Traversal (54), Maximum Collinear Points (149)
// Sub-patterns: digit math, number theory, base conversion, geometry primitives,
//   spiral traversal, convex hull, combinatorial math
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
    title: 'Palindrome Number',
    slug: 'palindrome-number',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'EASY',
    statement:
      'Return true if an integer reads the same forward and backward. Negative numbers are not palindromes.\n\nExample: x=121 → true\nExample: x=-121 → false\nExample: x=10 → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Reverse the second half of the number and compare it to the first half, avoiding string conversion.',
      },
      {
        level: 2,
        content:
          'If x<0 or (x%10==0 and x!=0): return False. rev=0. While x>rev: rev=rev*10+x%10; x//=10. Return x==rev or x==rev//10 (for odd-length numbers). O(log x).',
      },
    ],
  },

  {
    title: 'Roman to Integer',
    slug: 'roman-to-integer',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'EASY',
    statement:
      'Convert a Roman numeral string to an integer. I=1, V=5, X=10, L=50, C=100, D=500, M=1000. A smaller value before a larger one means subtraction (e.g., IV=4).\n\nExample: s="III" → 3\nExample: s="LVIII" → 58\nExample: s="MCMXCIV" → 1994',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'If a symbol is immediately followed by a larger symbol, subtract it; otherwise add it.',
      },
      {
        level: 2,
        content:
          'val={\'I\':1,\'V\':5,\'X\':10,\'L\':50,\'C\':100,\'D\':500,\'M\':1000}. result=0. For i in range(n): result+=val[s[i]] if i==n-1 or val[s[i]]>=val[s[i+1]] else -val[s[i]]. Return result. O(n).',
      },
    ],
  },

  {
    title: 'Plus One',
    slug: 'plus-one',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'EASY',
    statement:
      'Given a large integer as an array of digits (most significant first), add one to it.\n\nExample: digits=[1,2,3] → [1,2,4]\nExample: digits=[4,3,2,1] → [4,3,2,2]\nExample: digits=[9] → [1,0]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Scan from the least significant digit. Increment and return if no carry. Set digit to 0 and continue for a carry of 9.',
      },
      {
        level: 2,
        content:
          'For i from n-1..0: if digits[i]<9: digits[i]++; return digits. digits[i]=0. Return [1]+digits. O(n).',
      },
    ],
  },

  {
    title: 'Check If It Is a Straight Line',
    slug: 'check-if-it-is-a-straight-line',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'EASY',
    statement:
      'Return true if all given coordinates lie on the same straight line.\n\nExample: coordinates=[[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]] → true\nExample: coordinates=[[1,1],[2,2],[3,4],[4,5],[5,6],[7,7]] → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'All points lie on a line iff they share the same slope relative to the first point. Use cross-multiplication to avoid division.',
      },
      {
        level: 2,
        content:
          '(x0,y0)=coords[0]; dx=coords[1][0]-x0; dy=coords[1][1]-y0. For (x,y) in coords[2:]: if (y-y0)*dx != (x-x0)*dy: return False. Return True. O(n).',
      },
    ],
  },

  {
    title: 'Sign of the Product of an Array',
    slug: 'sign-of-the-product-of-an-array',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'EASY',
    statement:
      'Return 1 if the product of nums is positive, -1 if negative, 0 if zero, without computing the actual product.\n\nExample: nums=[-1,-2,-3,-4,3,2,1] → 1\nExample: nums=[1,5,0,2,-3] → 0\nExample: nums=[-1,1,-1,1,-1] → -1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'If any element is 0, return 0. Count negative numbers — product is positive iff the count is even.',
      },
      {
        level: 2,
        content:
          'if 0 in nums: return 0. neg=sum(1 for x in nums if x<0). Return 1 if neg%2==0 else -1. O(n).',
      },
    ],
  },

  {
    title: 'Ugly Number',
    slug: 'ugly-number',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'EASY',
    statement:
      'An ugly number\'s only prime factors are 2, 3, and 5. Return true if n is ugly. 1 is considered ugly.\n\nExample: n=6 → true (2×3)\nExample: n=1 → true\nExample: n=14 → false (2×7)',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Repeatedly divide n by 2, 3, and 5. If the result is 1, it\'s ugly.',
      },
      {
        level: 2,
        content:
          'if n<=0: return False. For p in [2,3,5]: while n%p==0: n//=p. Return n==1. O(log n).',
      },
    ],
  },

  {
    title: 'Excel Sheet Column Number',
    slug: 'excel-sheet-column-number',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'EASY',
    statement:
      'Convert a column title (A=1, B=2, ..., Z=26, AA=27, AB=28, ...) to its column number.\n\nExample: columnTitle="A" → 1\nExample: columnTitle="AB" → 28\nExample: columnTitle="ZY" → 701',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Treat it as a base-26 number where A=1 through Z=26.',
      },
      {
        level: 2,
        content:
          'result=0. For c in columnTitle: result=result*26+(ord(c)-ord(\'A\')+1). Return result. O(n).',
      },
    ],
  },

  {
    title: 'Add Binary',
    slug: 'add-binary',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'EASY',
    statement:
      'Given two binary strings a and b, return their sum as a binary string.\n\nExample: a="11", b="1" → "100"\nExample: a="1010", b="1011" → "10101"',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Simulate binary addition from right to left, tracking carry just like decimal addition.',
      },
      {
        level: 2,
        content:
          'i=len(a)-1; j=len(b)-1; carry=0; res=[]. While i>=0 or j>=0 or carry: s=(int(a[i]) if i>=0 else 0)+(int(b[j]) if j>=0 else 0)+carry; res.append(s%2); carry=s//2; i--; j--. Return "".join(map(str,reversed(res))). O(max(m,n)).',
      },
    ],
  },

  {
    title: 'Count Odd Numbers in an Interval Range',
    slug: 'count-odd-numbers-in-an-interval-range',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'EASY',
    statement:
      'Return the count of odd numbers in the range [low, high] inclusive.\n\nExample: low=3, high=7 → 3 (3,5,7)\nExample: low=8, high=10 → 1 (9)',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'The count of odd numbers in [1,n] is (n+1)//2. Compute for high and subtract for low-1.',
      },
      {
        level: 2,
        content:
          'Return (high+1)//2 - low//2. O(1). Derivation: odd_count[1..n]=(n+1)//2; answer=odd[1..high]-odd[1..low-1].',
      },
    ],
  },

  {
    title: 'Rotate Image',
    slug: 'rotate-image',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'EASY',
    statement:
      'Rotate an n×n matrix 90 degrees clockwise in-place.\n\nExample: matrix=[[1,2,3],[4,5,6],[7,8,9]] → [[7,4,1],[8,5,2],[9,6,3]]\nExample: matrix=[[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]] → [[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'A 90° clockwise rotation = transpose + reverse each row.',
      },
      {
        level: 2,
        content:
          'Transpose: swap matrix[i][j] with matrix[j][i] for all i<j. Reverse each row. O(n²), O(1) extra space.',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Spiral Matrix',
    slug: 'spiral-matrix',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'MEDIUM',
    statement:
      'Return all elements of an m×n matrix in spiral order (right → down → left → up, repeating inward).\n\nExample: matrix=[[1,2,3],[4,5,6],[7,8,9]] → [1,2,3,6,9,8,7,4,5]\nExample: matrix=[[1,2,3,4],[5,6,7,8],[9,10,11,12]] → [1,2,3,4,8,12,11,10,9,5,6,7]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use four boundary pointers (top, bottom, left, right). Traverse right → down → left → up, shrinking the boundaries after each full pass.',
      },
      {
        level: 2,
        content:
          'top=left=0; bottom=m-1; right=n-1. While top<=bottom and left<=right: traverse right along top; down along right; left along bottom (if top<bottom); up along left (if left<right). Shrink each boundary. O(mn).',
      },
      {
        level: 3,
        content:
          'After traversing right: top++. After down: right--. After left: bottom--. After up: left++. Guard the "left" and "up" passes with top<=bottom and left<=right respectively to avoid double-counting single rows or columns remaining.',
      },
    ],
  },

  {
    title: 'Reverse Integer',
    slug: 'reverse-integer',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'MEDIUM',
    statement:
      'Reverse the digits of a signed 32-bit integer. Return 0 if the result overflows the 32-bit signed integer range [-2³¹, 2³¹-1].\n\nExample: x=123 → 321\nExample: x=-123 → -321\nExample: x=120 → 21',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Extract digits right to left and rebuild the reversed number. Check for 32-bit overflow before each step.',
      },
      {
        level: 2,
        content:
          'sign=1 if x>=0 else -1; x=abs(x); rev=0. While x: digit=x%10; x//=10; rev=rev*10+digit. rev*=sign. Return rev if -2**31<=rev<=2**31-1 else 0. O(log x).',
      },
      {
        level: 3,
        content:
          'In languages with 32-bit ints, check overflow before multiplying: if rev > INT_MAX//10 or (rev==INT_MAX//10 and digit>7): return 0. In Python, just clamp the final result. The last digit of INT_MAX is 7 (2147483647) and INT_MIN is -8 (-2147483648).',
      },
    ],
  },

  {
    title: 'Spiral Matrix II',
    slug: 'spiral-matrix-ii',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'MEDIUM',
    statement:
      'Generate an n×n matrix filled with integers 1 to n² in spiral order.\n\nExample: n=3 → [[1,2,3],[8,9,4],[7,6,5]]\nExample: n=1 → [[1]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Same boundary-shrinking spiral as Spiral Matrix — write values 1..n² instead of reading.',
      },
      {
        level: 2,
        content:
          'matrix=[[0]*n for _ in range(n)]; top=left=0; bottom=right=n-1; num=1. While top<=bottom: fill right→down→left→up with num++; shrink boundaries. Return matrix. O(n²).',
      },
      {
        level: 3,
        content:
          'Identical algorithm to problem 54, just writing. Maintain a running counter num. After filling the top row rightward (top++), right column downward (right--), bottom row leftward (bottom--), left column upward (left++). Each cell is visited exactly once.',
      },
    ],
  },

  {
    title: 'Set Matrix Zeroes',
    slug: 'set-matrix-zeroes',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'MEDIUM',
    statement:
      'If matrix[i][j] == 0, set its entire row and column to zeros in-place.\n\nExample: matrix=[[1,1,1],[1,0,1],[1,1,1]] → [[1,0,1],[0,0,0],[1,0,1]]\nExample: matrix=[[0,1,2,0],[3,4,5,2],[1,3,1,5]] → [[0,0,0,0],[0,4,5,0],[0,3,1,0]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'First pass: record which rows and columns contain zeros. Second pass: zero out those rows and columns.',
      },
      {
        level: 2,
        content:
          'rows=set(); cols=set(). Scan for zeros. For (i,j): if i in rows or j in cols: matrix[i][j]=0. O(mn), O(m+n). O(1) space: use first row and first column as flag arrays.',
      },
      {
        level: 3,
        content:
          'O(1) space: use matrix[0][j] to flag column j, matrix[i][0] to flag row i. Handle the first row and column separately with two booleans. Propagate flags to the interior first, then zero out the first row and column last (if flagged).',
      },
    ],
  },

  {
    title: 'Pow(x, n)',
    slug: 'pow-x-n',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'MEDIUM',
    statement:
      'Implement pow(x, n) — x raised to the power n — using fast exponentiation.\n\nExample: x=2.00000, n=10 → 1024.00000\nExample: x=2.10000, n=3 → 9.26100\nExample: x=2.00000, n=-2 → 0.25000',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use exponentiation by squaring: halve n and square x each step. If n is odd, multiply the result by x once.',
      },
      {
        level: 2,
        content:
          'if n<0: x=1/x; n=-n. result=1.0. While n: if n&1: result*=x. x*=x; n>>=1. Return result. O(log n).',
      },
      {
        level: 3,
        content:
          'x^n = (x²)^(n//2) * (x if n is odd else 1). The bit-by-bit approach reads n\'s binary representation from LSB: each set bit contributes the current x to the product. Handle n=INT_MIN carefully: -n overflows in 32-bit; use long or Python\'s arbitrary-precision integers.',
      },
    ],
  },

  {
    title: 'Multiply Strings',
    slug: 'multiply-strings',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'MEDIUM',
    statement:
      'Multiply two non-negative integers represented as strings. Return the product as a string. No integer conversion allowed.\n\nExample: num1="2", num2="3" → "6"\nExample: num1="123", num2="456" → "56088"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Simulate long multiplication. The product of digits num1[i] and num2[j] contributes to positions i+j and i+j+1 of the result.',
      },
      {
        level: 2,
        content:
          'result=[0]*(m+n). For i from m-1..0: for j from n-1..0: mul=d1*d2; result[i+j+1]+=mul; result[i+j]+=result[i+j+1]//10; result[i+j+1]%=10. Strip leading zeros; return "".join(map(str,result)).lstrip("0") or "0". O(mn).',
      },
      {
        level: 3,
        content:
          'Process all products first, then carry. result[i+j] holds the "tens" contribution and result[i+j+1] holds the "ones." After all multiplications, carries may exceed 9 in individual cells — handle them in a separate pass or inline. The result array has at most m+n digits.',
      },
    ],
  },

  {
    title: 'Integer to Roman',
    slug: 'integer-to-roman',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'MEDIUM',
    statement:
      'Convert an integer (1 ≤ n ≤ 3999) to a Roman numeral string.\n\nExample: num=3749 → "MMMDCCXLIX"\nExample: num=58 → "LVIII"\nExample: num=1994 → "MCMXCIV"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a lookup table of values and symbols in decreasing order (including subtractive cases: 900, 400, 90, 40, 9, 4). Greedily subtract the largest fitting value.',
      },
      {
        level: 2,
        content:
          'vals=[(1000,"M"),(900,"CM"),(500,"D"),(400,"CD"),(100,"C"),(90,"XC"),(50,"L"),(40,"XL"),(10,"X"),(9,"IX"),(5,"V"),(4,"IV"),(1,"I")]. result="". For v,s in vals: while num>=v: result+=s; num-=v. Return result. O(1).',
      },
      {
        level: 3,
        content:
          'The subtractive pairs (CM, CD, XC, XL, IX, IV) are included directly in the lookup table, so no special-casing is needed. The greedy approach works because the values are carefully chosen: no combination of smaller symbols equals a skipped larger one. O(1) because the input is bounded.',
      },
    ],
  },

  {
    title: 'Find the Winner of the Circular Game',
    slug: 'find-the-winner-of-the-circular-game',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'MEDIUM',
    statement:
      'n friends (numbered 1..n) sit in a circle. Starting from friend 1, count k friends clockwise; the kth friend leaves. Count restarts from the next friend. Return the last remaining friend. (The Josephus Problem)\n\nExample: n=5, k=2 → 3\nExample: n=6, k=5 → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Simulate with a deque (rotate and pop) or solve with the Josephus recurrence for O(n) math.',
      },
      {
        level: 2,
        content:
          'Math (O(n)): josephus(1)=0; josephus(i)=(josephus(i-1)+k)%i for i from 2..n. Return josephus(n)+1 (convert 0-indexed to 1-indexed). Simulation (O(nk)): deque; rotate left k-1 times; popleft; repeat.',
      },
      {
        level: 3,
        content:
          'Josephus recurrence: after removing the kth person from n people, the remaining n-1 people relabel from position (k%n). The winner\'s position among n people is (winner_among_(n-1) + k) % n. Base case: 1 person → position 0 (only person). The +1 at the end converts 0-indexed output to 1-indexed friend numbers.',
      },
    ],
  },

  {
    title: 'Valid Triangle Number',
    slug: 'valid-triangle-number',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'MEDIUM',
    statement:
      'Return the number of triplets chosen from nums that can form a valid triangle (the sum of any two sides must exceed the third).\n\nExample: nums=[2,2,3,4] → 3\nExample: nums=[4,2,3,4] → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort the array. For a sorted triple a≤b≤c, only c < a+b needs checking — the other two inequalities are automatically satisfied.',
      },
      {
        level: 2,
        content:
          'Sort. count=0. For k from n-1..2: i=0, j=k-1. While i<j: if nums[i]+nums[j]>nums[k]: count+=j-i; j--. Else i++. Return count. O(n²).',
      },
      {
        level: 3,
        content:
          'Fix the largest side at index k. Two pointers scan [0,k-1]. If nums[i]+nums[j]>nums[k]: all pairs (i, i+1, ..., j-1) with index j also satisfy the condition (they have larger a values), so add j-i to count and shrink j. Otherwise, the pair is too small — expand i. O(n²) total with O(n log n) sort.',
      },
    ],
  },

  {
    title: 'Detect Squares',
    slug: 'detect-squares',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'MEDIUM',
    statement:
      'Design a data structure: add(point) adds a point. count(point) returns the number of axis-aligned squares with the given point as one corner.\n\nExample: add([3,10]); add([11,2]); add([3,2]); count([11,10])→1; add([14,8]); count([11,10])→0; add([11,2]); count([11,10])→2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For query point (px,py), enumerate every point (x,py) in the same row. Each such point defines a potential square side. Check if the other two corners exist.',
      },
      {
        level: 2,
        content:
          'Store points in a frequency map. For count(px,py): for each (x,py) with x!=px (same row): side=|px-x|. Check if (x,py+side) and (px,py+side) exist (or py-side). count+=freq[x,py]*freq[x,py±side]*freq[px,py±side]. O(n) per query.',
      },
      {
        level: 3,
        content:
          'For each "diagonal opposite" corner (x,y2) where y2 != py: the square has corners (px,py),(x,py),(px,y2),(x,y2). Count = freq[x][py]*freq[px][y2]*freq[x][y2]. Iterate over all unique x values with py on their y-list and both valid y2 options (py ± |px-x|). Use a row-indexed set for fast enumeration.',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Max Points on a Line',
    slug: 'max-points-on-a-line',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'HARD',
    statement:
      'Given an array of points, return the maximum number of points that lie on the same straight line.\n\nExample: points=[[1,1],[2,2],[3,3]] → 3\nExample: points=[[1,1],[3,2],[5,3],[4,1],[2,3],[1,4]] → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each anchor point, compute the slope to every other point as a reduced fraction. The most common slope gives the line with the most points through the anchor.',
      },
      {
        level: 2,
        content:
          'For each i: slope_map={}; duplicates=0. For j!=i: dx=xj-xi; dy=yj-yi. If dx==dy==0: duplicates++; continue. g=gcd(|dx|,|dy|); normalize sign; key=(dy/g,dx/g). slope_map[key]++. result=max(result, max(slope_map.values(),default=0)+duplicates+1). O(n²).',
      },
      {
        level: 3,
        content:
          'Sign normalization: make the leading nonzero of (dy,dx) positive. For vertical lines (dx=0): key=(1,0). For horizontal (dy=0): key=(0,1). Handle duplicate points (dx=dy=0) by counting them separately — they lie on every line through the anchor. Add duplicates+1 to any line count. O(n²) overall.',
      },
    ],
  },

  {
    title: 'Basic Calculator',
    slug: 'basic-calculator',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'HARD',
    statement:
      'Evaluate a string expression containing non-negative integers, +, -, (, ), and spaces.\n\nExample: s="1 + 1" → 2\nExample: s=" 2-1 + 2 " → 3\nExample: s="(1+(4+5+2)-3)+(6+8)" → 23',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a stack. Push the current result and sign when encountering \'(\'. Pop and combine when encountering \')\'.',
      },
      {
        level: 2,
        content:
          'result=0; sign=1; num=0; stack=[]. For c: digit→num=num*10+digit. \'+\'/\'-\'→result+=sign*num; sign=±1; num=0. \'(\'→stack.append(result); stack.append(sign); result=0; sign=1. \')\'→result+=sign*num; num=0; result=result*stack.pop()+stack.pop(). Return result+sign*num. O(n).',
      },
      {
        level: 3,
        content:
          'On \'(\': push (accumulated_result, current_sign) onto the stack; reset result=0 and sign=1 for the inner expression. On \')\': inner=result+sign*num; result=prev_sign*inner+prev_result. This correctly handles nested parentheses in one left-to-right pass. Flush any remaining num at end.',
      },
    ],
  },

  {
    title: 'Erect the Fence',
    slug: 'erect-the-fence',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'HARD',
    statement:
      'Return the coordinates of trees that form the perimeter of a fence enclosing all trees (convex hull). Include collinear boundary points.\n\nExample: trees=[[1,1],[2,2],[2,0],[2,4],[3,3],[4,2]] → [[1,1],[2,0],[4,2],[3,3],[2,4]]\nExample: trees=[[1,2],[2,2],[4,2]] → [[1,2],[2,2],[4,2]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use Andrew\'s monotone chain algorithm. Sort by (x,y), then build a lower hull and upper hull, keeping collinear points on the boundary.',
      },
      {
        level: 2,
        content:
          'Sort. Build lower hull: for each point, while last 2 hull points make a clockwise turn (cross≤0) with the new point: remove last hull point. Add new point. Build upper hull similarly from right to left. Combine, deduplicate. O(n log n).',
      },
      {
        level: 3,
        content:
          'cross(O,A,B) = (A.x-O.x)*(B.y-O.y)-(A.y-O.y)*(B.x-O.x). Use cross < 0 (strict) for standard convex hull, but use cross < 0 (not ≤ 0) to exclude collinear interior points while keeping boundary collinear points. The final hull = set(lower_hull) | set(upper_hull). Return list of unique points.',
      },
    ],
  },

  {
    title: 'Self Crossing',
    slug: 'self-crossing',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'HARD',
    statement:
      'Walk north, west, south, east distances[0], distances[1], ... respectively. Return true if the path crosses itself.\n\nExample: distance=[2,1,1,2] → true\nExample: distance=[1,2,3,4] → false\nExample: distance=[1,1,1,1] → true',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'There are exactly 3 geometric crossing cases involving the last 3, 4, or 5 segments. Enumerate them using the distance values.',
      },
      {
        level: 2,
        content:
          'For i≥3 (0-indexed): Case1: d[i]>=d[i-2] and d[i-1]<=d[i-3]. Case2 (i≥4): d[i-1]==d[i-3] and d[i]+d[i-4]>=d[i-2]. Case3 (i≥5): d[i-2]>=d[i-4] and d[i]+d[i-4]>=d[i-2] and d[i-1]<=d[i-3] and d[i-1]+d[i-5]>=d[i-3]. Return True if any case holds. O(n).',
      },
      {
        level: 3,
        content:
          'Case 1: the current segment overlaps the segment 2 steps back (the path spirals inward and "closes"). Case 2: the path exactly meets the endpoint of a previous segment (a T-intersection). Case 3: the path crosses diagonally 3 segments back. Checking all three covers every possible self-intersection for a spiral walk.',
      },
    ],
  },

  {
    title: 'Perfect Rectangle',
    slug: 'perfect-rectangle',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'HARD',
    statement:
      'Given rectangles [[xi,yi,ai,bi]] (bottom-left and top-right corners), return true if they exactly tile a rectangular region with no gaps and no overlaps.\n\nExample: rectangles=[[1,1,3,3],[3,1,4,2],[3,2,4,4],[1,3,2,4],[2,3,3,4]] → true\nExample: rectangles=[[1,1,2,3],[1,3,2,4],[3,1,4,2],[3,2,4,4]] → false',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Two conditions must both hold: (1) total area equals the bounding rectangle area; (2) every inner corner is used an even number of times (only the 4 outer corners appear an odd number of times).',
      },
      {
        level: 2,
        content:
          'Compute bounding box (min/max of all corners); compute total area. For each rectangle: add area; XOR its 4 corners into a set (add if absent, remove if present). Valid iff set=={4 bounding corners} and sum_area==bounding_area. O(n).',
      },
      {
        level: 3,
        content:
          'The corner XOR trick: in a perfect tiling, every interior corner is shared by 2 or 4 rectangles — adding then removing gives net 0 for even-count corners. Only the 4 outermost corners appear exactly once. Area check catches gaps; corner check catches overlaps and incorrect shapes. Both conditions together are necessary and sufficient.',
      },
    ],
  },

  {
    title: 'Smallest Good Base',
    slug: 'smallest-good-base',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'HARD',
    statement:
      'For a given integer n (as string), return the smallest base k ≥ 2 such that n is represented as all 1s in base k (i.e., n = 1 + k + k² + … + k^(m-1) for some m ≥ 2).\n\nExample: n="13" → "3" (1+3+9=13)\nExample: n="4681" → "8" (1+8+64+512+4096=4681)',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Binary search on m (number of digits). For each m from maximum down to 2, compute k = floor(n^(1/(m-1))) and verify the geometric sum.',
      },
      {
        level: 2,
        content:
          'max_m=floor(log2(n))+1. For m from max_m..2: k=int(round(n**(1/(m-1)))). For k in {k-1,k,k+1}: if k>=2 and (k**m-1)//(k-1)==n: return str(k). Return str(n-1) (k=n-1, m=2 always works). O(log² n).',
      },
      {
        level: 3,
        content:
          'Geometric sum = (k^m - 1)/(k-1). Check both floor(n^(1/(m-1))) and floor+1 to handle floating-point imprecision. The max m occurs at k=2 where m=floor(log2(n))+1. The fallback k=n-1 (m=2) always gives a valid answer, so we iterate from large m to small m and return the first valid k (smallest k for given m, then smallest m found first).',
      },
    ],
  },

  {
    title: 'Find the Closest Palindrome',
    slug: 'find-the-closest-palindrome',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'HARD',
    statement:
      'Given a string n representing an integer, find the nearest palindrome that is not n itself. On ties, return the smaller one.\n\nExample: n="123" → "121"\nExample: n="1" → "0"\nExample: n="99" → "101"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Generate 5 palindrome candidates: mirror the left half as-is, mirror with left half ±1, and the two edge cases (10^(len-1)-1 and 10^len+1). Return the closest (non-n) candidate.',
      },
      {
        level: 2,
        content:
          'L=len(n). Candidates: mirror(n[:⌈L/2⌉]), mirror(str(int(n[:⌈L/2⌉])+1)), mirror(str(int(n[:⌈L/2⌉])-1)), 10^(L-1)-1, 10^L+1. Exclude n itself. Return argmin |c-n| (smaller on tie). O(L).',
      },
      {
        level: 3,
        content:
          'Mirror function: take the first half, reverse it, append (replacing the second half). Handles odd/even length. Edge cases: "100" → closest is "99" (not "101"), caught by 10^(L-1)-1. "9" → closest is "11", caught by 10^L+1. The ±1 adjustments to the left half handle "123"→"121" and "125"→"131" cases. Always exclude n itself from the candidates.',
      },
    ],
  },

  {
    title: 'Consecutive Numbers Sum',
    slug: 'consecutive-numbers-sum',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'HARD',
    statement:
      'Return the number of ways to express n as a sum of consecutive positive integers (including n itself as a single-term sum).\n\nExample: n=5 → 2 (5; 2+3)\nExample: n=9 → 3 (9; 4+5; 2+3+4)\nExample: n=15 → 4 (15; 7+8; 4+5+6; 1+2+3+4+5)',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'k consecutive integers starting from a sum to n: ka + k(k-1)/2 = n → a = (n - k(k-1)/2) / k must be a positive integer.',
      },
      {
        level: 2,
        content:
          'count=0. For k from 1 while k*(k-1)/2 < n: numerator = n - k*(k-1)//2. If numerator%k==0: count++. Return count. O(√n).',
      },
      {
        level: 3,
        content:
          'The loop runs while n - k(k-1)/2 > 0 and a=numerator/k ≥ 1. Since k(k-1)/2 grows as O(k²), k is bounded by O(√n). Each valid k with integer a ≥ 1 gives a unique consecutive sequence. Single-element sums (k=1) are always counted.',
      },
    ],
  },

  {
    title: 'Number of Digit One',
    slug: 'number-of-digit-one',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'HARD',
    statement:
      'Count the total number of \'1\' digits appearing in all integers from 1 to n.\n\nExample: n=13 → 6\nExample: n=0 → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each digit position (ones, tens, hundreds, ...), count how many times \'1\' appears at that position across all integers 0..n.',
      },
      {
        level: 2,
        content:
          'count=0; factor=1. While factor<=n: higher=n//(factor*10); current=(n//factor)%10; lower=n%factor. count+=higher*factor + (min(max(lower-factor+1,0),factor) if current==1 else factor if current>1 else 0). factor*=10. Return count. O(log n).',
      },
      {
        level: 3,
        content:
          'For digit at position factor: higher=prefix, current=digit at that position, lower=suffix. If current>1: that position contributes (higher+1)*factor 1s. If current==1: higher*factor+lower+1. If current==0: higher*factor. The formula counts 1s at position \'factor\' across all integers 0..n in O(1) per position.',
      },
    ],
  },

  {
    title: 'Equal Rational Numbers',
    slug: 'equal-rational-numbers',
    pattern: 'MATH_GEOMETRY',
    difficulty: 'HARD',
    statement:
      'Given two rational number strings (possibly with repeating decimals like "0.1(6)" for 0.1666...), return true if they represent the same value.\n\nExample: s="0.(52)", t="0.5(25)" → true\nExample: s="0.1666(6)", t="0.166(66)" → true\nExample: s="0.9(9)", t="1." → true',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Convert each string to an exact fraction. Compare the two fractions after reducing to lowest terms.',
      },
      {
        level: 2,
        content:
          'Parse: integer part, non-repeating decimal (length d), repeating part (length r). Fraction = int_part + non_rep/10^d + rep/(10^d*(10^r-1)). Use Python\'s fractions.Fraction for exact arithmetic. Compare both fractions. O(L).',
      },
      {
        level: 3,
        content:
          'For "A.BC(DE)": value = A + BC/10^len(BC) + DE / (10^len(BC) * (10^len(DE)-1)). No repeating part: add 0. Special case: "0.9(9)" = 1. Python\'s fractions.Fraction handles all arithmetic exactly. Parse with regex or string methods: split on \'.\' and \'(\'/\')\'. Normalize each to (numerator, denominator) in lowest terms.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 20 — MATH_GEOMETRY (30 problems)...\n');

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
