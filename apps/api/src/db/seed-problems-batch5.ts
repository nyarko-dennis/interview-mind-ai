import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 5 — DFS_BACKTRACKING (29 problems: 10 Easy, 9 Medium, 10 Hard)
// Already seeded: Subsets (Medium)
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
    title: 'Binary Tree Paths',
    slug: 'binary-tree-paths',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'EASY',
    statement:
      'Given the root of a binary tree, return all root-to-leaf paths as strings in the format "node1->node2->...->leaf".\n\nExample: root=[1,2,3,null,5] → ["1->2->5","1->3"]\nExample: root=[1] → ["1"]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'DFS from the root, carrying the current path as you go. At a leaf node (no children), record the path. At every other node, extend the path and recurse into both children.',
      },
      {
        level: 2,
        content:
          'DFS with path string. def dfs(node, path): if not node: return. path += str(node.val). if not node.left and not node.right: result.append(path). else: dfs(node.left, path+"->"); dfs(node.right, path+"->"). Call dfs(root, "").',
      },
    ],
  },

  {
    title: 'Letter Case Permutation',
    slug: 'letter-case-permutation',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'EASY',
    statement:
      'Given a string s, transform every letter to lowercase or uppercase to create another string. Return a list of all possible strings.\n\nExample: s="a1b2" → ["a1b2","a1B2","A1b2","A1B2"]\nExample: s="3z4" → ["3z4","3Z4"]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'DFS through each character. Digits have one choice (keep as-is). Letters have two choices: lowercase or uppercase. At each letter, branch into both options and continue.',
      },
      {
        level: 2,
        content:
          'DFS. def dfs(i, path): if i==len(s): result.append(path); return. if s[i].isdigit(): dfs(i+1, path+s[i]). else: dfs(i+1, path+s[i].lower()); dfs(i+1, path+s[i].upper()). Call dfs(0, ""). Total leaves: 2^(number of letters).',
      },
    ],
  },

  {
    title: 'Balanced Binary Tree',
    slug: 'balanced-binary-tree',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'EASY',
    statement:
      'A height-balanced binary tree is one where every node\'s left and right subtree heights differ by at most 1. Given a binary tree, determine if it is height-balanced.\n\nExample: root=[3,9,20,null,null,15,7] → true\nExample: root=[1,2,2,3,3,null,null,4,4] → false\nExample: root=[] → true',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'A top-down approach recalculates heights repeatedly. A bottom-up approach is O(n): compute height while simultaneously checking balance. Return -1 if any subtree is already unbalanced.',
      },
      {
        level: 2,
        content:
          'DFS (bottom-up). def height(node): if not node: return 0. lh=height(node.left); rh=height(node.right). if lh==-1 or rh==-1 or abs(lh-rh)>1: return -1. return max(lh,rh)+1. Return height(root) != -1. Propagating -1 short-circuits further recursion on unbalanced subtrees.',
      },
    ],
  },

  {
    title: 'Diameter of Binary Tree',
    slug: 'diameter-of-binary-tree',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'EASY',
    statement:
      'The diameter of a binary tree is the length (number of edges) of the longest path between any two nodes. The path may or may not pass through the root.\n\nExample: root=[1,2,3,4,5] → 3 (path: 4→2→1→3)\nExample: root=[1,2] → 1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'At each node, the longest path through that node is left_depth + right_depth. DFS computes the depth of each subtree. Track the maximum path length seen across all nodes.',
      },
      {
        level: 2,
        content:
          'DFS. ans=0. def depth(node): nonlocal ans. if not node: return 0. l=depth(node.left); r=depth(node.right). ans=max(ans, l+r). return max(l,r)+1. depth(root); return ans. The diameter is updated at each node as left_depth + right_depth; depth returns the max single-side depth for its parent.',
      },
    ],
  },

  {
    title: 'Sum of Left Leaves',
    slug: 'sum-of-left-leaves',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'EASY',
    statement:
      'Given the root of a binary tree, return the sum of all left leaves.\n\nExample: root=[3,9,20,null,null,15,7] → 24 (left leaves: 9 and 15)\nExample: root=[1] → 0',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'DFS tracking whether the current node is a left child. A left leaf is a node with no children that was reached as a left child. Pass a boolean is_left down the recursion.',
      },
      {
        level: 2,
        content:
          'DFS. def dfs(node, is_left): if not node: return 0. if not node.left and not node.right: return node.val if is_left else 0. return dfs(node.left, True) + dfs(node.right, False). Return dfs(root, False). The is_left flag correctly identifies left leaves without needing parent references.',
      },
    ],
  },

  {
    title: 'Leaf-Similar Trees',
    slug: 'leaf-similar-trees',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'EASY',
    statement:
      'Consider the leaf value sequence of a binary tree from left to right. Two trees are leaf-similar if their sequences are identical. Return true if the given trees are leaf-similar.\n\nExample: root1=[3,5,1,6,2,9,8,null,null,7,4], root2=[3,5,1,6,7,4,2,null,null,null,null,null,null,9,8] → true\nExample: root1=[1,2,3], root2=[1,3,2] → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'DFS each tree collecting leaf values in left-to-right order. A leaf has no children. Compare the two resulting sequences.',
      },
      {
        level: 2,
        content:
          'DFS leaf collector. def leaves(node): if not node: return []. if not node.left and not node.right: return [node.val]. return leaves(node.left) + leaves(node.right). Return leaves(root1) == leaves(root2).',
      },
    ],
  },

  {
    title: 'Convert Sorted Array to Binary Search Tree',
    slug: 'convert-sorted-array-to-binary-search-tree',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'EASY',
    statement:
      'Given an integer array nums sorted in ascending order, convert it to a height-balanced BST.\n\nExample: nums=[-10,-3,0,5,9] → [0,-3,9,-10,null,5] (or equivalent valid answer)\nExample: nums=[1,3] → [3,1] or [1,null,3]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'The middle element of any sorted subarray is the root of a balanced BST for that subarray. Recursively pick the midpoint as the root, left half becomes the left subtree, right half becomes the right subtree.',
      },
      {
        level: 2,
        content:
          'DFS (divide and conquer). def build(lo, hi): if lo > hi: return None. mid=(lo+hi)//2. node=TreeNode(nums[mid]). node.left=build(lo, mid-1). node.right=build(mid+1, hi). return node. Return build(0, n-1). Choosing mid=(lo+hi)//2 consistently produces a valid height-balanced result.',
      },
    ],
  },

  {
    title: 'Maximum Depth of N-ary Tree',
    slug: 'maximum-depth-of-n-ary-tree',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'EASY',
    statement:
      'Given the root of an N-ary tree, return its maximum depth — the number of nodes along the longest path from root to any leaf.\n\nExample: root=[1,null,3,2,4,null,5,6] → 3\nExample: root=[1,null,2,3,4,5,null,null,6,7,null,8,null,9,10,null,null,11,null,12,null,13,null,null,14] → 5',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'DFS: the depth of a node is 1 plus the maximum depth of any of its children. A leaf node has no children, so its depth is 1.',
      },
      {
        level: 2,
        content:
          'DFS. def depth(node): if not node: return 0. if not node.children: return 1. return 1 + max(depth(c) for c in node.children). Return depth(root). For an empty children list, max() would fail — handle with the base case check.',
      },
    ],
  },

  {
    title: 'Find Mode in Binary Search Tree',
    slug: 'find-mode-in-binary-search-tree',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'EASY',
    statement:
      'Given the root of a BST that may contain duplicates, return all modes (most frequently occurring values). You may return the answer in any order.\n\nExample: root=[1,null,2,2] → [2]\nExample: root=[0] → [0]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'An inorder traversal of a BST visits nodes in sorted order, so duplicates appear consecutively. Track the current value, current count, and max count. Update modes when a new max is reached.',
      },
      {
        level: 2,
        content:
          'Inorder DFS with running count. Maintain curr_val, curr_count, max_count, modes. On visit: if val==curr_val: curr_count++ else reset to 1. if curr_count==max_count: add to modes. if curr_count>max_count: max_count=curr_count; modes=[val]. This finds all modes in a single O(n) pass with O(1) extra space (excluding output).',
      },
    ],
  },

  {
    title: 'Cousins in Binary Tree',
    slug: 'cousins-in-binary-tree',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'EASY',
    statement:
      'Two nodes of a binary tree are cousins if they are at the same depth and have different parents. Given the root and two values x and y, return true if the nodes are cousins.\n\nExample: root=[1,2,3,4], x=4, y=3 → false (different depths)\nExample: root=[1,2,3,null,4,null,5], x=5, y=4 → true\nExample: root=[1,2,3,null,4], x=2, y=3 → false (same parent)',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'DFS to find the depth and parent of each target node. Two nodes are cousins if their depths are equal AND their parents are different.',
      },
      {
        level: 2,
        content:
          'DFS. def dfs(node, parent, depth): if not node: return. if node.val==x: record (depth_x, parent_x). if node.val==y: record (depth_y, parent_y). dfs(node.left, node, depth+1); dfs(node.right, node, depth+1). Return depth_x==depth_y and parent_x!=parent_y.',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Permutations',
    slug: 'permutations',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'MEDIUM',
    statement:
      'Given an array nums of distinct integers, return all possible permutations in any order.\n\nExample: nums=[1,2,3] → [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]\nExample: nums=[0,1] → [[0,1],[1,0]]\nExample: nums=[1] → [[1]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'At each step, pick any unused number and place it next in the permutation. After exploring that choice, undo it (backtrack) and try the next unused number. How do you track which numbers have been used?',
      },
      {
        level: 2,
        content:
          'Backtracking. used=set(). def bt(path): if len(path)==n: result.append(list(path)); return. For num in nums: if num not in used: used.add(num); path.append(num); bt(path); path.pop(); used.remove(num). There are n! permutations; each takes O(n) to copy, giving O(n * n!) total time.',
      },
      {
        level: 3,
        content:
          'Alternative: swap-based (avoids the used set). def bt(start): if start==n: result.append(list(nums)); return. For i in range(start,n): nums[start],nums[i]=nums[i],nums[start]; bt(start+1); nums[start],nums[i]=nums[i],nums[start]. bt(0). Each recursive call fixes the element at "start" by swapping it with each remaining element, then restores the array (backtrack).',
      },
    ],
  },

  {
    title: 'Combinations',
    slug: 'combinations',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'MEDIUM',
    statement:
      'Given two integers n and k, return all possible combinations of k numbers chosen from the range [1, n].\n\nExample: n=4, k=2 → [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]\nExample: n=1, k=1 → [[1]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Backtracking: start from an index and pick numbers in increasing order to avoid duplicates. When the combination reaches size k, record it. A pruning hint: if the remaining numbers aren\'t enough to fill k slots, stop early.',
      },
      {
        level: 2,
        content:
          'Backtracking. def bt(start, path): if len(path)==k: result.append(list(path)); return. For i in range(start, n+1): path.append(i); bt(i+1, path); path.pop(). Call bt(1, []). Pruning: only iterate while n-i+1 >= k-len(path) (enough numbers remain). Reduces unnecessary recursion significantly.',
      },
      {
        level: 3,
        content:
          'def bt(start, path): if len(path)==k: result.append(list(path)); return. need=k-len(path). For i in range(start, n-need+2): path.append(i); bt(i+1, path); path.pop(). bt(1,[]). The upper bound n-need+2 in range ensures there are always enough remaining numbers to complete the combination — this pruning is the key optimisation.',
      },
    ],
  },

  {
    title: 'Combination Sum',
    slug: 'combination-sum',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'MEDIUM',
    statement:
      'Given an array of distinct integers candidates and a target integer, return all unique combinations that sum to target. Each candidate may be used an unlimited number of times.\n\nExample: candidates=[2,3,6,7], target=7 → [[2,2,3],[7]]\nExample: candidates=[2,3,7], target=7 → [[2,2,3],[7]]\nExample: candidates=[2], target=1 → []',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Backtracking: at each step, pick a candidate and reduce the remaining target. Since each candidate can be reused, don\'t advance the start index after picking it. To avoid duplicate combinations, only pick candidates at or after the current index.',
      },
      {
        level: 2,
        content:
          'Backtracking. def bt(start, path, remaining): if remaining==0: result.append(list(path)); return. if remaining<0: return. For i in range(start, len(candidates)): path.append(candidates[i]); bt(i, path, remaining-candidates[i]); path.pop(). Sort candidates first to enable early termination when candidates[i] > remaining.',
      },
      {
        level: 3,
        content:
          'Sort candidates. def bt(start, path, rem): if rem==0: result.append(list(path)); return. For i in range(start,len(candidates)): if candidates[i]>rem: break. path.append(candidates[i]); bt(i, path, rem-candidates[i]); path.pop(). bt(0,[],target). Note bt(i,...) not bt(i+1,...) — passing i allows reuse of candidates[i]. The break (not continue) works because the array is sorted.',
      },
    ],
  },

  {
    title: 'Combination Sum II',
    slug: 'combination-sum-ii',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'MEDIUM',
    statement:
      'Given a collection of candidates (may have duplicates) and a target, find all unique combinations that sum to target. Each candidate may only be used once.\n\nExample: candidates=[10,1,2,7,6,1,5], target=8 → [[1,1,6],[1,2,5],[1,7],[2,6]]\nExample: candidates=[2,5,2,1,2], target=5 → [[1,2,2],[5]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort candidates first so duplicates are adjacent. Use each element at most once (advance start by i+1). The tricky part: skipping duplicate combinations. When is it safe to skip a candidate at position i?',
      },
      {
        level: 2,
        content:
          'Backtracking with duplicate skipping. Sort candidates. def bt(start, path, rem): if rem==0: record; return. For i in range(start,...): if i>start and candidates[i]==candidates[i-1]: continue (skip duplicate at same level). path.append; bt(i+1,...); path.pop. The condition i>start (not i>0) only skips duplicates at the same recursion level, not across levels.',
      },
      {
        level: 3,
        content:
          'Sort candidates. def bt(start, path, rem): if rem==0: result.append(list(path)); return. For i in range(start,len(candidates)): if candidates[i]>rem: break. if i>start and candidates[i]==candidates[i-1]: continue. path.append(candidates[i]); bt(i+1,path,rem-candidates[i]); path.pop(). bt(0,[],target). Key: i>start guards against skipping the first occurrence of a duplicate at a given level.',
      },
    ],
  },

  {
    title: 'Palindrome Partitioning',
    slug: 'palindrome-partitioning',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'MEDIUM',
    statement:
      'Given a string s, partition it so that every substring is a palindrome. Return all possible palindrome partitioning.\n\nExample: s="aab" → [["a","a","b"],["aa","b"]]\nExample: s="a" → [["a"]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Backtracking: at each position, try every possible substring starting here. If it is a palindrome, add it to the current partition and recurse on the remainder. When you reach the end of the string, record the partition.',
      },
      {
        level: 2,
        content:
          'Backtracking + palindrome check. def bt(start, path): if start==len(s): result.append(list(path)); return. For end in range(start+1, len(s)+1): sub=s[start:end]. if isPalin(sub): path.append(sub); bt(end, path); path.pop(). Precompute a palindrome DP table (dp[i][j]=true if s[i:j+1] is palindrome) to make each check O(1).',
      },
      {
        level: 3,
        content:
          'Precompute: n=len(s); dp=[[False]*n for _ in range(n)]. For i in range(n-1,-1,-1): for j in range(i,n): dp[i][j]=(s[i]==s[j]) and (j-i<=2 or dp[i+1][j-1]). def bt(start,path): if start==n: result.append(list(path)); return. For end in range(start,n): if dp[start][end]: path.append(s[start:end+1]); bt(end+1,path); path.pop(). bt(0,[]).',
      },
    ],
  },

  {
    title: 'Letter Combinations of a Phone Number',
    slug: 'letter-combinations-of-a-phone-number',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'MEDIUM',
    statement:
      'Given a string of digits from 2–9, return all possible letter combinations using a phone keypad. Return an empty list for empty input.\n\nExample: digits="23" → ["ad","ae","af","bd","be","bf","cd","ce","cf"]\nExample: digits="" → []\nExample: digits="2" → ["a","b","c"]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Map each digit to its letters. Backtracking: at position i, iterate over each letter for digits[i], append it to the current combination, and recurse to position i+1. When you reach the end, record the combination.',
      },
      {
        level: 2,
        content:
          'Backtracking with digit-to-letters map. phone={"2":"abc","3":"def",...}. def bt(i, path): if i==len(digits): result.append(path); return. For ch in phone[digits[i]]: bt(i+1, path+ch). bt(0,""). No explicit undo needed since strings are immutable in Python.',
      },
      {
        level: 3,
        content:
          'phone={"2":"abc","3":"def","4":"ghi","5":"jkl","6":"mno","7":"pqrs","8":"tuv","9":"wxyz"}. if not digits: return []. result=[]. def bt(i,path): if i==len(digits): result.append(path); return. for c in phone[digits[i]]: bt(i+1,path+c). bt(0,""). Return result. Total combinations: product of len(letters) for each digit — at most 4^n where n=len(digits).',
      },
    ],
  },

  {
    title: 'All Paths From Source to Target',
    slug: 'all-paths-from-source-to-target',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'MEDIUM',
    statement:
      'Given a directed acyclic graph of n nodes (0-indexed), find all paths from node 0 to node n-1. Return them in any order.\n\nExample: graph=[[1,2],[3],[3],[]] → [[0,1,3],[0,2,3]]\nExample: graph=[[4,3,1],[3,2,4],[3],[4],[]] → [[0,4],[0,3,4],[0,1,3,4],[0,1,2,3,4],[0,1,4]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'DFS from node 0. At each node, explore all outgoing edges. When you reach node n-1, record the current path. Since the graph is acyclic, no visited set is needed.',
      },
      {
        level: 2,
        content:
          'DFS + backtracking. def dfs(node, path): if node==n-1: result.append(list(path)); return. For nb in graph[node]: path.append(nb); dfs(nb, path); path.pop(). dfs(0, [0]). No visited tracking needed because the DAG guarantees no cycles.',
      },
      {
        level: 3,
        content:
          'result=[]. def dfs(node, path): if node==n-1: result.append(list(path)); return. For nb in graph[node]: path.append(nb); dfs(nb,path); path.pop(). dfs(0,[0]). Return result. Since the graph is a DAG, this is safe without a visited set. The backtracking (path.pop()) reuses the same list object efficiently instead of copying on each call.',
      },
    ],
  },

  {
    title: 'Path Sum II',
    slug: 'path-sum-ii',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'MEDIUM',
    statement:
      'Given the root of a binary tree and an integer targetSum, return all root-to-leaf paths where the sum of node values equals targetSum.\n\nExample: root=[5,4,8,11,null,13,4,7,2,null,null,5,1], targetSum=22 → [[5,4,11,2],[5,8,4,5]]\nExample: root=[1,2,3], targetSum=5 → []\nExample: root=[1,2], targetSum=0 → []',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'DFS carrying the current path and remaining sum. At a leaf, if remaining==0 record the path. Otherwise recurse into children, reducing remaining by the child\'s value.',
      },
      {
        level: 2,
        content:
          'Backtracking DFS. def dfs(node, path, rem): if not node: return. path.append(node.val); rem-=node.val. if not node.left and not node.right and rem==0: result.append(list(path)). dfs(node.left, path, rem); dfs(node.right, path, rem). path.pop(). dfs(root, [], targetSum).',
      },
      {
        level: 3,
        content:
          'result=[]. def dfs(node,path,rem): if not node: return. path.append(node.val); rem-=node.val. if not node.left and not node.right: if rem==0: result.append(list(path)). else: dfs(node.left,path,rem); dfs(node.right,path,rem). path.pop(). dfs(root,[],targetSum). Return result. The list(path) copy at leaf is essential — path is mutated by subsequent backtracking.',
      },
    ],
  },

  {
    title: 'Generate Parentheses',
    slug: 'generate-parentheses',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'MEDIUM',
    statement:
      'Given n pairs of parentheses, generate all combinations of well-formed parentheses.\n\nExample: n=3 → ["((()))","(()())","(())()","()(())","()()()"]\nExample: n=1 → ["()"]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Build the string character by character. You can add \'(\' if open_count < n. You can add \')\' if close_count < open_count (there is an unmatched open bracket). When the string reaches length 2n, record it.',
      },
      {
        level: 2,
        content:
          'Backtracking with open/close counters. def bt(path, open, close): if len(path)==2*n: result.append(path); return. if open<n: bt(path+"(", open+1, close). if close<open: bt(path+")", open, close+1). bt("",0,0). The constraints ensure only valid sequences are generated.',
      },
      {
        level: 3,
        content:
          'result=[]. def bt(s, op, cl): if len(s)==2*n: result.append(s); return. if op<n: bt(s+"(",op+1,cl). if cl<op: bt(s+")",op,cl+1). bt("",0,0). Return result. This generates exactly the nth Catalan number of valid sequences. Using strings (immutable) means no explicit undo is needed; each recursive call gets its own s.',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'N-Queens',
    slug: 'n-queens',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'HARD',
    statement:
      'Place n queens on an n×n chessboard such that no two queens attack each other (same row, column, or diagonal). Return all distinct solutions, each as a board of \'Q\' and \'.\'.\n\nExample: n=4 → [[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]\nExample: n=1 → [["Q"]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Place queens one row at a time. For each row, try each column. A placement is valid if no previous queen shares the same column, main diagonal (row-col), or anti-diagonal (row+col). Use sets to check validity in O(1).',
      },
      {
        level: 2,
        content:
          'Backtracking with three sets: cols, diag1 (row-col), diag2 (row+col). For each row, iterate columns: if none of the sets contain the column/diagonals, place the queen and recurse. Remove from sets when backtracking. Record the board when row==n.',
      },
      {
        level: 3,
        content:
          'cols=set(); d1=set(); d2=set(); board=[["."]]*n (copy each row). def bt(row): if row==n: result.append(["".join(r) for r in board]); return. For col in range(n): if col in cols or row-col in d1 or row+col in d2: continue. place queen; add to sets; bt(row+1); remove queen; remove from sets. bt(0). Each queen is placed in a unique row, so no row check is needed.',
      },
    ],
  },

  {
    title: 'Sudoku Solver',
    slug: 'sudoku-solver',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'HARD',
    statement:
      "Solve a 9×9 Sudoku puzzle in-place. Filled cells contain '1'-'9'; empty cells contain '.'. Each row, column, and 3×3 box must contain digits 1–9 exactly once.\n\nExample: board=[[\"5\",\"3\",\".\",\".\",\"7\",\".\",\".\",\".\",\".\"],[\"6\",\".\",\".\",\"1\",\"9\",\"5\",\".\",\".\",\".\"],[\".\",\"9\",\"8\",\".\",\".\",\".\",\".\",\"6\",\".\"],[\"8\",\".\",\".\",\".\",\"6\",\".\",\".\",\".\",\"3\"],[\"4\",\".\",\".\",\"8\",\".\",\"3\",\".\",\".\",\"1\"],[\"7\",\".\",\".\",\".\",\"2\",\".\",\".\",\".\",\"6\"],[\".\",\"6\",\".\",\".\",\".\",\".\",\"2\",\"8\",\".\"],[\".\",\".\",\".\",\"4\",\"1\",\"9\",\".\",\".\",\"5\"],[\".\",\".\",\".\",\".\",\"8\",\".\",\".\",\"7\",\"9\"]] → solved in-place",
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          "Find the first empty cell ('.'). Try digits 1–9: if placing the digit is valid (no conflict in row, column, or 3×3 box), place it and recurse. If recursion succeeds, done. If no digit works, backtrack (reset to '.') and let the parent try the next option.",
      },
      {
        level: 2,
        content:
          "Backtracking. isValid(board,row,col,num): check row, column, and box[(row//3)*3+col//3] for num. def solve(): find next '.'; if none: return True. Try '1'-'9': if valid: place; if solve(): return True; reset. return False. solve() returns True when the board is complete.",
      },
      {
        level: 3,
        content:
          "def solve(): for r in range(9): for c in range(9): if board[r][c]=='.': for d in '123456789': if isValid(r,c,d): board[r][c]=d; if solve(): return True; board[r][c]='.'. return False. return True. def isValid(r,c,d): box_r,box_c=3*(r//3),3*(c//3). return d not in [board[r][i] for i in range(9)] and d not in [board[i][c] for i in range(9)] and d not in [board[box_r+i][box_c+j] for i in range(3) for j in range(3)].",
      },
    ],
  },

  {
    title: 'Word Search II',
    slug: 'word-search-ii',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'HARD',
    statement:
      'Given an m×n grid of characters and a list of words, return all words found in the grid. Words are formed by adjacent (4-directional) letters; each cell may only be used once per word.\n\nExample: board=[["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], words=["oath","pea","eat","rain"] → ["eat","oath"]\nExample: board=[["a","b"],["c","d"]], words=["abcb"] → []',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Searching one word at a time is O(words * m * n * 4^L). Build a Trie from all words so you can search many words simultaneously in a single DFS pass. When can you prune a DFS branch early using the Trie?',
      },
      {
        level: 2,
        content:
          'Trie + DFS backtracking. Insert all words into a Trie. DFS from every cell: at each step, check if the current prefix exists in the Trie. If not, prune. If the current Trie node marks end of a word, add to result. Mark cells visited (e.g., set to "#") during DFS; restore on backtrack.',
      },
      {
        level: 3,
        content:
          'Build Trie from words. def dfs(r,c,node): ch=board[r][c]. if ch not in node.children: return. nxt=node.children[ch]. if nxt.word: result.add(nxt.word); nxt.word=None. board[r][c]="#". For nr,nc in 4dirs: if in_bounds and board[nr][nc]!="#": dfs(nr,nc,nxt). board[r][c]=ch. For each cell: dfs(r,c,trie_root). Setting nxt.word=None after finding deduplicates results. Pruning dead Trie nodes (no children, no word) further optimises.',
      },
    ],
  },

  {
    title: 'Remove Invalid Parentheses',
    slug: 'remove-invalid-parentheses',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'HARD',
    statement:
      'Given a string s containing parentheses and letters, remove the minimum number of invalid parentheses to make the input string valid. Return all possible results.\n\nExample: s="()())()" → ["(())()","()()()"]\nExample: s="(a)())()" → ["(a())()","(a)()()"]\nExample: s=")(" → [""]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'First determine the minimum number of "(" and ")" that must be removed. Count unmatched "(" and ")" by scanning. Then use DFS/backtracking to try all ways to remove exactly that many, pruning invalid states early.',
      },
      {
        level: 2,
        content:
          'Count min removals: scan left-to-right, track open count. Each unmatched ")": rem_close++. At end, open count = rem_open. DFS: at each index, either keep or remove the character. Only remove "(" or ")" (not letters). Prune if too many removed or remaining string cannot be valid. Check validity of complete strings using a simple counter.',
      },
      {
        level: 3,
        content:
          'Count rem_open, rem_close. def dfs(i, open_cnt, rem_o, rem_c, path): if i==len(s): if rem_o==0 and rem_c==0: result.add(path); return. ch=s[i]. if ch=="(" and rem_o>0: dfs(i+1,open_cnt,rem_o-1,rem_c,path). elif ch==")" and rem_c>0: dfs(i+1,open_cnt,rem_o,rem_c-1,path). # keep current char: if ch=="(": dfs(i+1,open_cnt+1,...,path+ch). elif ch==")": if open_cnt>0: dfs(i+1,open_cnt-1,...,path+ch). else: dfs(i+1,open_cnt,...,path+ch). Use a set for results to avoid duplicates.',
      },
    ],
  },

  {
    title: 'Expression Add Operators',
    slug: 'expression-add-operators',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'HARD',
    statement:
      'Given a string num of digits and an integer target, return all expressions formed by inserting \'+\', \'-\', or \'*\' between the digits (no leading zeros allowed) that evaluate to target.\n\nExample: num="123", target=6 → ["1*2*3","1+2+3"]\nExample: num="232", target=8 → ["2*3+2","2+3*2"]\nExample: num="3456237490", target=9191 → []',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Backtracking over all ways to split num and insert operators. The tricky part: multiplication has higher precedence. To handle this without re-evaluating, track the last operand separately so you can "undo" it when applying \'*\'.',
      },
      {
        level: 2,
        content:
          'DFS with parameters (index, path, eval_so_far, last_operand). For each split at position i: val=num[start:i+1] (skip leading zeros). If first number: recurse with eval=val, last=val. Otherwise try "+": eval+val, last=val. "-": eval-val, last=-val. "*": eval-last+last*val, last=last*val. The undo trick for "*": subtract last, then add last*val.',
      },
      {
        level: 3,
        content:
          'def dfs(idx,path,evl,last): if idx==n: if evl==target: result.append(path); return. For i in range(idx,n): s=num[idx:i+1]; if len(s)>1 and s[0]=="0": break. v=int(s). if idx==0: dfs(i+1,s,v,v). else: dfs(i+1,path+"+"+s,evl+v,v); dfs(i+1,path+"-"+s,evl-v,-v); dfs(i+1,path+"*"+s,evl-last+last*v,last*v). dfs(0,"",0,0). The break on leading zeros prevents "01","001" etc.',
      },
    ],
  },

  {
    title: 'Unique Paths III',
    slug: 'unique-paths-iii',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'HARD',
    statement:
      'On a grid: 1=start, 2=end, 0=empty square, -1=obstacle. Walk from start to end, visiting every non-obstacle square exactly once. Return the number of such paths.\n\nExample: grid=[[1,0,0,0],[0,0,0,0],[0,0,2,-1]] → 2\nExample: grid=[[1,0,0,0],[0,0,0,0],[0,0,0,2]] → 4\nExample: grid=[[0,1],[2,0]] → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'DFS from the start cell. Track visited cells to avoid reuse. When you reach the end cell, check if all non-obstacle squares have been visited. Only then count the path.',
      },
      {
        level: 2,
        content:
          'Backtracking DFS. Count total non-obstacle squares (empty + start + end). DFS from start: mark cell visited, explore 4 neighbours. At end cell, if visited_count == total: count++. Backtrack by unmarking. Track count with a visited flag on the grid (set to -1, restore on backtrack).',
      },
      {
        level: 3,
        content:
          'Count total=number of cells != -1. Find start. def dfs(r,c,cnt): if grid[r][c]==2: return int(cnt==total). grid[r][c]=-1. ans=0. For nr,nc in 4dirs: if in_bounds and grid[nr][nc]!=-1: ans+=dfs(nr,nc,cnt+1). grid[r][c]=original_val. return ans. Start with dfs(sr,sc,1). Return result. The grid cell is temporarily set to -1 to mark as visited, then restored — no separate visited array needed.',
      },
    ],
  },

  {
    title: 'Binary Tree Maximum Path Sum',
    slug: 'binary-tree-maximum-path-sum',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'HARD',
    statement:
      'A path in a binary tree is a sequence of nodes where each adjacent pair is connected by an edge, and each node appears at most once. The path does not need to pass through the root. Return the maximum path sum.\n\nExample: root=[1,2,3] → 6 (path: 2→1→3)\nExample: root=[-10,9,20,null,null,15,7] → 42 (path: 15→20→7)',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'At each node, the maximum path through it uses some combination of left and right subtrees. The path can go left-to-right through the node, but the value returned to the parent can only extend in one direction.',
      },
      {
        level: 2,
        content:
          'DFS. For each node, compute max_gain(node) = max(0, max_gain(left)) + node.val + max(0, max_gain(right)) as the best path through this node — update global max. Return node.val + max(0, max_gain(left), max_gain(right)) to the parent (single-direction extension). Taking max with 0 handles negative subtrees.',
      },
      {
        level: 3,
        content:
          'ans=float("-inf"). def dfs(node): nonlocal ans. if not node: return 0. l=max(0,dfs(node.left)); r=max(0,dfs(node.right)). ans=max(ans, node.val+l+r). return node.val+max(l,r). dfs(root); return ans. The global ans sees the best l+node+r path at every node. The return value is the best single-arm extension for the parent — it cannot take both left and right simultaneously.',
      },
    ],
  },

  {
    title: 'Serialize and Deserialize Binary Tree',
    slug: 'serialize-and-deserialize-binary-tree',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'HARD',
    statement:
      'Design an algorithm to serialize a binary tree to a string and deserialize that string back to the original tree. There is no restriction on your serialization format.\n\nExample: root=[1,2,3,null,null,4,5] → serialize("1,2,null,null,3,4,null,null,5,null,null") → deserialize back → same tree',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use preorder DFS. During serialization, write each node\'s value (or "null" for null nodes) separated by a delimiter. During deserialization, read values in the same preorder, rebuilding nodes. The null markers are critical — they encode the tree structure.',
      },
      {
        level: 2,
        content:
          'Serialize (preorder DFS): append node.val, recurse left, recurse right. Null nodes append "null". Deserialize: use an iterator over the comma-split list. Pop the next value: if "null" return None. Create a node, set node.left = deserialize(), node.right = deserialize(). Return node.',
      },
      {
        level: 3,
        content:
          'def serialize(root): res=[]. def dfs(node): if not node: res.append("null"); return. res.append(str(node.val)); dfs(node.left); dfs(node.right). dfs(root). return ",".join(res). def deserialize(data): it=iter(data.split(",")). def dfs(): val=next(it). if val=="null": return None. node=TreeNode(int(val)); node.left=dfs(); node.right=dfs(); return node. return dfs(). The iterator approach avoids string index management and is cleaner than passing a mutable index.',
      },
    ],
  },

  {
    title: 'Recover Binary Search Tree',
    slug: 'recover-binary-search-tree',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'HARD',
    statement:
      'Two nodes of a BST were swapped by mistake. Recover the tree without changing its structure. Must use O(1) space (Morris traversal).\n\nExample: root=[1,3,null,null,2] → [3,1,null,null,2] (3 and 1 were swapped)\nExample: root=[3,1,4,null,null,2] → [2,1,4,null,null,3] (3 and 2 were swapped)',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'An inorder traversal of a BST yields values in sorted order. Two swapped nodes cause at most two "inversions" (places where the value decreases). Find the first and second node of the pair: first is where the value first decreases, second is where it decreases again (or the smaller value in the first inversion).',
      },
      {
        level: 2,
        content:
          'Inorder DFS tracking prev node. When node.val < prev.val: set first=prev (first time only), set second=node (always). After the full inorder, swap first.val and second.val. For adjacent swapped nodes there is only one inversion so second is set in that same step.',
      },
      {
        level: 3,
        content:
          'first=second=prev=None. def inorder(node): nonlocal first,second,prev. if not node: return. inorder(node.left). if prev and node.val<prev.val: if not first: first=prev. second=node. prev=node. inorder(node.right). inorder(root). first.val,second.val=second.val,first.val. For O(1) space: use Morris traversal (thread the tree) instead of the call stack.',
      },
    ],
  },

  {
    title: 'Palindrome Partitioning II',
    slug: 'palindrome-partitioning-ii',
    pattern: 'DFS_BACKTRACKING',
    difficulty: 'HARD',
    statement:
      'Given a string s, return the minimum number of cuts needed to partition it so that every substring is a palindrome.\n\nExample: s="aab" → 1 ("aa" | "b")\nExample: s="a" → 0\nExample: s="ab" → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Naively trying all partitions is exponential. Two optimisations: precompute which substrings are palindromes (O(n²) DP), then find the minimum cuts with a second DP pass. What does cuts[i] represent?',
      },
      {
        level: 2,
        content:
          'Two-DP approach. Step 1: pal[i][j] = True if s[i:j+1] is a palindrome (expand-around-center or DP). Step 2: cuts[i] = min cuts for s[0:i+1]. If s[0:i+1] is a palindrome: cuts[i]=0. Else: cuts[i] = min(cuts[j] + 1) for all j < i where s[j+1:i+1] is a palindrome.',
      },
      {
        level: 3,
        content:
          'n=len(s). pal=[[False]*n for _ in range(n)]. For i in range(n-1,-1,-1): for j in range(i,n): pal[i][j]=(s[i]==s[j]) and (j-i<=2 or pal[i+1][j-1]). cuts=[0]*n. For i in range(n): if pal[0][i]: cuts[i]=0; continue. cuts[i]=i. For j in range(1,i+1): if pal[j][i]: cuts[i]=min(cuts[i],cuts[j-1]+1). Return cuts[n-1]. O(n²) time and space.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 5 — DFS_BACKTRACKING (29 problems)...\n');

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
