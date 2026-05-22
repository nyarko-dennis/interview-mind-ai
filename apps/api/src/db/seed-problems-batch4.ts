import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 4 — BFS (29 problems: 10 Easy, 9 Medium, 10 Hard)
// Already seeded: Number of Islands (Medium)
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
    title: 'Flood Fill',
    slug: 'flood-fill',
    pattern: 'BFS',
    difficulty: 'EASY',
    statement:
      'An image is represented by an m×n grid. Perform a flood fill starting from pixel (sr, sc) with a new color. All pixels connected (4-directionally) to (sr, sc) with the same original color are recolored.\n\nExample: image=[[1,1,1],[1,1,0],[1,0,1]], sr=1, sc=1, color=2 → [[2,2,2],[2,2,0],[2,0,1]]\nExample: image=[[0,0,0],[0,0,0]], sr=0, sc=0, color=0 → [[0,0,0],[0,0,0]]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          "BFS from (sr,sc). Expand to all 4-directional neighbours that share the original colour. What do you do if the original colour already equals the new colour?",
      },
      {
        level: 2,
        content:
          'BFS. Store orig=image[sr][sc]. If orig==color: return unchanged. Queue: [(sr,sc)]. While queue: pop (r,c), set image[r][c]=color, add neighbours where image[nr][nc]==orig. Checking orig prevents infinite re-visits without a separate visited set.',
      },
    ],
  },

  {
    title: 'Average of Levels in Binary Tree',
    slug: 'average-of-levels-in-binary-tree',
    pattern: 'BFS',
    difficulty: 'EASY',
    statement:
      'Given the root of a binary tree, return the average value of the nodes on each level as an array.\n\nExample: root=[3,9,20,null,null,15,7] → [3.0,14.5,11.0]\nExample: root=[3,9,20,15,7] → [3.0,14.5,11.0]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'BFS processes nodes level by level. At each level, capture a snapshot of the queue size so you know exactly how many nodes belong to that level, then compute their average before moving on.',
      },
      {
        level: 2,
        content:
          'BFS with level snapshots. q=deque([root]). While q: level_size=len(q); total=0. For _ in range(level_size): node=q.popleft(); total+=node.val; add children. result.append(total/level_size). Return result.',
      },
    ],
  },

  {
    title: 'Maximum Depth of Binary Tree',
    slug: 'maximum-depth-of-binary-tree',
    pattern: 'BFS',
    difficulty: 'EASY',
    statement:
      'Given the root of a binary tree, return its maximum depth — the number of nodes on the longest path from root to a leaf.\n\nExample: root=[3,9,20,null,null,15,7] → 3\nExample: root=[1,null,2] → 2',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'BFS processes the tree level by level. The depth equals the number of levels. Count how many full levels you process before the queue empties.',
      },
      {
        level: 2,
        content:
          'BFS level count. depth=0; q=deque([root]) if root else deque(). While q: depth++; for _ in range(len(q)): node=q.popleft(); add non-null children. Return depth.',
      },
    ],
  },

  {
    title: 'Minimum Depth of Binary Tree',
    slug: 'minimum-depth-of-binary-tree',
    pattern: 'BFS',
    difficulty: 'EASY',
    statement:
      'Given the root of a binary tree, return its minimum depth — the number of nodes on the shortest path from root to the nearest leaf node.\n\nExample: root=[3,9,20,null,null,15,7] → 2\nExample: root=[2,null,3,null,4,null,5,null,6] → 5',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'BFS is ideal here — it finds the nearest leaf first without needing to explore the whole tree. The first leaf it encounters (a node with no children) is at the minimum depth. Why is BFS better than DFS for this?',
      },
      {
        level: 2,
        content:
          'BFS. q=deque([(root,1)]). While q: node,depth=q.popleft(). if not node.left and not node.right: return depth. if node.left: q.append((node.left,depth+1)). if node.right: q.append((node.right,depth+1)). BFS guarantees the first leaf found is the shallowest.',
      },
    ],
  },

  {
    title: 'Symmetric Tree',
    slug: 'symmetric-tree',
    pattern: 'BFS',
    difficulty: 'EASY',
    statement:
      "Check whether a binary tree is a mirror of itself (symmetric around its centre).\n\nExample: root=[1,2,2,3,4,4,3] → true\nExample: root=[1,2,2,null,3,null,3] → false",
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'A tree is symmetric if its left and right subtrees are mirrors. BFS with pairs: enqueue pairs of nodes that should be mirrors of each other. Check each pair: both null ✓, values equal ✓, then enqueue their mirror children.',
      },
      {
        level: 2,
        content:
          'BFS with pairs. q=deque([(root.left, root.right)]). While q: n1,n2=q.popleft(). if both None: continue. if one None or n1.val!=n2.val: return False. q.append((n1.left,n2.right)); q.append((n1.right,n2.left)). Return True.',
      },
    ],
  },

  {
    title: 'Invert Binary Tree',
    slug: 'invert-binary-tree',
    pattern: 'BFS',
    difficulty: 'EASY',
    statement:
      'Given the root of a binary tree, invert the tree (mirror it) and return its root.\n\nExample: root=[4,2,7,1,3,6,9] → [4,7,2,9,6,3,1]\nExample: root=[2,1,3] → [2,3,1]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'BFS level by level. At each node, swap its left and right children, then enqueue both children to process the next level.',
      },
      {
        level: 2,
        content:
          'BFS. q=deque([root]). While q: node=q.popleft(); node.left,node.right=node.right,node.left. if node.left: q.append(node.left). if node.right: q.append(node.right). Return root.',
      },
    ],
  },

  {
    title: 'Same Tree',
    slug: 'same-tree',
    pattern: 'BFS',
    difficulty: 'EASY',
    statement:
      'Given the roots of two binary trees p and q, check if they are the same (same structure, same node values).\n\nExample: p=[1,2,3], q=[1,2,3] → true\nExample: p=[1,2], q=[1,null,2] → false\nExample: p=[1,2,1], q=[1,1,2] → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'BFS with corresponding pairs. Enqueue pairs of nodes from p and q that should be identical. A pair fails if values differ or one is null while the other is not.',
      },
      {
        level: 2,
        content:
          'BFS with pairs. q=deque([(p,q)]). While q: n1,n2=q.popleft(). if not n1 and not n2: continue. if not n1 or not n2 or n1.val!=n2.val: return False. q.append((n1.left,n2.left)); q.append((n1.right,n2.right)). Return True.',
      },
    ],
  },

  {
    title: 'Path Sum',
    slug: 'path-sum',
    pattern: 'BFS',
    difficulty: 'EASY',
    statement:
      'Given the root of a binary tree and an integer targetSum, return true if there is a root-to-leaf path whose node values sum to targetSum.\n\nExample: root=[5,4,8,11,null,13,4,7,2,null,null,null,1], targetSum=22 → true\nExample: root=[1,2,3], targetSum=5 → false\nExample: root=[], targetSum=0 → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'BFS carries the running sum along with each node. When you reach a leaf, check if the accumulated sum equals targetSum. Enqueue (node, current_sum) pairs.',
      },
      {
        level: 2,
        content:
          'BFS. q=deque([(root, root.val)]). While q: node,cur=q.popleft(). if not node.left and not node.right and cur==targetSum: return True. if node.left: q.append((node.left, cur+node.left.val)). if node.right: q.append((node.right, cur+node.right.val)). Return False.',
      },
    ],
  },

  {
    title: 'Find if Path Exists in Graph',
    slug: 'find-if-path-exists-in-graph',
    pattern: 'BFS',
    difficulty: 'EASY',
    statement:
      'Given n nodes (0 to n−1) and a list of bidirectional edges, determine if a valid path exists between source and destination.\n\nExample: n=3, edges=[[0,1],[1,2],[2,0]], source=0, destination=2 → true\nExample: n=6, edges=[[0,1],[0,2],[3,5],[5,4],[4,3]], source=0, destination=5 → false',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Build an adjacency list. BFS from source, marking visited nodes. If you dequeue the destination, a path exists. If the queue empties without reaching it, no path exists.',
      },
      {
        level: 2,
        content:
          'BFS. Build adj list. visited={source}; q=deque([source]). While q: node=q.popleft(). if node==destination: return True. for nb in adj[node]: if nb not in visited: visited.add(nb); q.append(nb). Return False. O(V+E).',
      },
    ],
  },

  {
    title: 'Merge Two Binary Trees',
    slug: 'merge-two-binary-trees',
    pattern: 'BFS',
    difficulty: 'EASY',
    statement:
      'Merge two binary trees by overlapping them. Overlapping nodes sum their values; non-overlapping nodes use the existing non-null node.\n\nExample: root1=[1,3,2,5], root2=[2,1,3,null,4,null,7] → [3,4,5,5,4,null,7]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'BFS with pairs of corresponding nodes from both trees. If one node in a pair is null, attach the non-null subtree directly — no need to recurse into it. If both are non-null, sum their values.',
      },
      {
        level: 2,
        content:
          'BFS. If either root is null: return the other. q=deque([(root1,root2)]). While q: n1,n2=q.popleft(); n1.val+=n2.val. For (c1,c2) in [(n1.left,n2.left),(n1.right,n2.right)]: if c1 and c2: q.append((c1,c2)). elif c2: attach c2 as n1\'s child. Return root1.',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Binary Tree Level Order Traversal',
    slug: 'binary-tree-level-order-traversal',
    pattern: 'BFS',
    difficulty: 'MEDIUM',
    statement:
      'Given the root of a binary tree, return the level order traversal of its nodes (left to right, level by level).\n\nExample: root=[3,9,20,null,null,15,7] → [[3],[9,20],[15,7]]\nExample: root=[1] → [[1]]\nExample: root=[] → []',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'BFS naturally processes nodes level by level. To group nodes by level, snapshot the queue size at the start of each level — that tells you exactly how many nodes to process before moving to the next level.',
      },
      {
        level: 2,
        content:
          'BFS with level snapshotting. q=deque([root]). While q: level=[]; for _ in range(len(q)): node=q.popleft(); level.append(node.val); enqueue non-null children. result.append(level). Return result.',
      },
      {
        level: 3,
        content:
          'from collections import deque. q=deque([root]); result=[]. While q: level=[]; for _ in range(len(q)): node=q.popleft(); level.append(node.val); if node.left: q.append(node.left); if node.right: q.append(node.right). result.append(level). Return result.',
      },
    ],
  },

  {
    title: 'Binary Tree Right Side View',
    slug: 'binary-tree-right-side-view',
    pattern: 'BFS',
    difficulty: 'MEDIUM',
    statement:
      'Given the root of a binary tree, return the values visible from the right side (the rightmost node at each level).\n\nExample: root=[1,2,3,null,5,null,4] → [1,3,4]\nExample: root=[1,null,3] → [1,3]\nExample: root=[] → []',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'BFS level by level. At each level, only the last node processed is visible from the right. Record it before moving to the next level.',
      },
      {
        level: 2,
        content:
          'BFS with level snapshots. For each level, process all nodes (snapshot queue size), update right_val as you go. After the level loop, append right_val to result. The last node processed in each level is the rightmost.',
      },
      {
        level: 3,
        content:
          'q=deque([root]); result=[]. While q: right_val=None; for _ in range(len(q)): node=q.popleft(); right_val=node.val; if node.left: q.append(node.left); if node.right: q.append(node.right). result.append(right_val). Return result.',
      },
    ],
  },

  {
    title: 'Rotting Oranges',
    slug: 'rotting-oranges',
    pattern: 'BFS',
    difficulty: 'MEDIUM',
    statement:
      'Grid cells: 0 (empty), 1 (fresh orange), 2 (rotten orange). Each minute, rotten oranges infect adjacent (4-directional) fresh ones. Return the minimum minutes until no fresh oranges remain, or -1 if impossible.\n\nExample: grid=[[2,1,1],[1,1,0],[0,1,1]] → 4\nExample: grid=[[2,1,1],[0,1,1],[1,0,1]] → -1\nExample: grid=[[0,2]] → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'All rotten oranges spread simultaneously — this is multi-source BFS. Enqueue every initial rotten orange before starting BFS. Each BFS level represents one minute of spreading.',
      },
      {
        level: 2,
        content:
          'Multi-source BFS. Enqueue all initial rotten oranges; count fresh oranges. BFS level-by-level (each level = 1 minute): for each rotten cell, rot adjacent fresh cells (decrement fresh count, enqueue). Track time passed. Return time if fresh==0 else -1.',
      },
      {
        level: 3,
        content:
          'q=deque(); fresh=0. For r,c: if grid[r][c]==2: q.append((r,c,0)) elif grid[r][c]==1: fresh+=1. max_t=0. While q: r,c,t=q.popleft(). For nr,nc in 4dirs: if in_bounds and grid[nr][nc]==1: grid[nr][nc]=2; fresh-=1; max_t=t+1; q.append((nr,nc,t+1)). Return max_t if fresh==0 else -1.',
      },
    ],
  },

  {
    title: '01 Matrix',
    slug: '01-matrix',
    pattern: 'BFS',
    difficulty: 'MEDIUM',
    statement:
      'Given an m×n binary matrix mat, return a matrix of the same size where each cell holds the distance to the nearest 0.\n\nExample: mat=[[0,0,0],[0,1,0],[0,0,0]] → [[0,0,0],[0,1,0],[0,0,0]]\nExample: mat=[[0,0,0],[0,1,0],[1,1,1]] → [[0,0,0],[0,1,0],[1,2,1]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Multi-source BFS from all 0-cells simultaneously. Initialise all 0-cells with distance 0 and enqueue them. Spread outward — each cell\'s distance is its BFS level from any 0-cell.',
      },
      {
        level: 2,
        content:
          'Multi-source BFS. dist=[[inf]*n for _ in range(m)]. Enqueue all 0-cells with dist 0. BFS: for each cell, try to relax unvisited neighbours as dist[r][c]+1. The first time each cell is reached is its shortest distance. O(m*n).',
      },
      {
        level: 3,
        content:
          'dist=[[float("inf")]*n]*m; q=deque(). For r,c: if mat[r][c]==0: dist[r][c]=0; q.append((r,c)). While q: r,c=q.popleft(). For nr,nc in 4dirs: if in_bounds and dist[nr][nc]==inf: dist[nr][nc]=dist[r][c]+1; q.append((nr,nc)). Return dist. No separate visited array needed — inf acts as the "unvisited" marker.',
      },
    ],
  },

  {
    title: 'Max Area of Island',
    slug: 'max-area-of-island',
    pattern: 'BFS',
    difficulty: 'MEDIUM',
    statement:
      'Given an m×n binary grid (0=water, 1=land), return the maximum area of an island. An island is a group of 1s connected 4-directionally. Return 0 if no island exists.\n\nExample: grid=[[0,0,1,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0],[0,1,1,0,1,0,0,0,0,0,0,0,0],[0,1,0,0,1,1,0,0,1,0,1,0,0],[0,1,0,0,1,1,0,0,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0],[0,0,0,0,0,0,0,1,1,0,0,0,0]] → 6\nExample: grid=[[0,0,0,0,0,0,0,0]] → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'BFS from each unvisited land cell. Mark cells visited as you expand. Count the cells reached during each BFS — that is the island area. Track the maximum area seen.',
      },
      {
        level: 2,
        content:
          'BFS per island. For each unvisited 1: mark it visited (set to 0 in-place), BFS expanding to adjacent 1s. Count cells visited in this BFS. ans = max(ans, count). O(m*n) total.',
      },
      {
        level: 3,
        content:
          'ans=0. For r,c: if grid[r][c]==1: grid[r][c]=0; q=deque([(r,c)]); area=0. While q: cr,cc=q.popleft(); area+=1. For nr,nc in 4dirs: if in_bounds and grid[nr][nc]==1: grid[nr][nc]=0; q.append((nr,nc)). ans=max(ans,area). Return ans.',
      },
    ],
  },

  {
    title: 'Pacific Atlantic Water Flow',
    slug: 'pacific-atlantic-water-flow',
    pattern: 'BFS',
    difficulty: 'MEDIUM',
    statement:
      'An m×n island has the Pacific Ocean on its top/left border and the Atlantic Ocean on its bottom/right border. Water flows to adjacent cells (4-directional) with height ≤ current. Return all cells that can flow to both oceans.\n\nExample: heights=[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]] → [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Reverse the flow: instead of water flowing downhill to the ocean, BFS inward from each ocean border uphill (to equal or higher cells). Cells reachable from both oceans are the answer.',
      },
      {
        level: 2,
        content:
          'Two multi-source BFS runs. Pacific BFS: starts from top row + left column. Atlantic BFS: starts from bottom row + right column. Both expand to neighbours with height ≥ current (reverse flow). Return intersection of the two reachable sets.',
      },
      {
        level: 3,
        content:
          'def bfs(starts): visited=set(starts); q=deque(starts). While q: r,c=q.popleft(). For nr,nc in 4dirs: if (nr,nc) not in visited and in_bounds and heights[nr][nc]>=heights[r][c]: visited.add((nr,nc)); q.append((nr,nc)). return visited. pac_start=[(0,c) for c in range(n)]+[(r,0) for r in range(m)]. atl_start=[(m-1,c) for c in range(n)]+[(r,n-1) for r in range(m)]. Return sorted(bfs(pac_start)&bfs(atl_start)).',
      },
    ],
  },

  {
    title: 'Shortest Path in Binary Matrix',
    slug: 'shortest-path-in-binary-matrix',
    pattern: 'BFS',
    difficulty: 'MEDIUM',
    statement:
      'Given an n×n binary matrix grid, return the length of the shortest clear path from (0,0) to (n-1,n-1). A clear path has all 0-cells and moves in 8 directions. Return -1 if no clear path exists.\n\nExample: grid=[[0,1],[1,0]] → 2\nExample: grid=[[0,0,0],[1,1,0],[1,1,0]] → 4',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'BFS on the grid in 8 directions. All moves cost 1, so BFS gives the shortest path. The path length equals the number of cells traversed.',
      },
      {
        level: 2,
        content:
          'BFS. If start or end is blocked (value 1): return -1. Queue: ((0,0), 1). Mark visited by setting cell to 1. Expand all 8 neighbours. Return distance when (n-1,n-1) is dequeued.',
      },
      {
        level: 3,
        content:
          'if grid[0][0] or grid[n-1][n-1]: return -1. q=deque([(0,0,1)]); grid[0][0]=1. While q: r,c,d=q.popleft(). if r==n-1 and c==n-1: return d. For dr,dc in 8dirs: nr,nc=r+dr,c+dc. if 0<=nr<n and 0<=nc<n and grid[nr][nc]==0: grid[nr][nc]=1; q.append((nr,nc,d+1)). Return -1.',
      },
    ],
  },

  {
    title: 'Clone Graph',
    slug: 'clone-graph',
    pattern: 'BFS',
    difficulty: 'MEDIUM',
    statement:
      'Given a reference to a node in a connected undirected graph, return a deep copy. Each node has val and a neighbours list.\n\nExample: adjList=[[2,4],[1,3],[2,4],[1,3]] → return deep copy of the same graph',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'BFS to traverse all nodes. Use a hash map from original node → clone node. When processing a node, create its clone if it does not exist, then link the clone to its neighbours\' clones.',
      },
      {
        level: 2,
        content:
          'BFS + hash map. clones = {node: Node(node.val)}. Queue: [node]. While queue: curr = dequeue. For each neighbour: if not in clones: create clone, add to clones, enqueue. Append clones[nb] to clones[curr].neighbors. Return clones[original].',
      },
      {
        level: 3,
        content:
          'from collections import deque. clones={node:Node(node.val)}; q=deque([node]). While q: curr=q.popleft(). For nb in curr.neighbors: if nb not in clones: clones[nb]=Node(nb.val); q.append(nb). clones[curr].neighbors.append(clones[nb]). Return clones[node].',
      },
    ],
  },

  {
    title: 'Course Schedule',
    slug: 'course-schedule',
    pattern: 'BFS',
    difficulty: 'MEDIUM',
    statement:
      'You need to take numCourses courses. prerequisites[i]=[a,b] means you must take b before a. Determine if you can finish all courses (i.e., the prerequisite graph has no cycle).\n\nExample: numCourses=2, prerequisites=[[1,0]] → true\nExample: numCourses=2, prerequisites=[[1,0],[0,1]] → false',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Model as a directed graph. A valid course order exists iff the graph has no cycle. Use Kahn\'s algorithm (BFS topological sort): repeatedly remove nodes with in-degree 0. If all nodes are eventually removed, there is no cycle.',
      },
      {
        level: 2,
        content:
          "Kahn's BFS. Build adjacency list + in-degree array. Enqueue all courses with in-degree 0 (no prerequisites). BFS: dequeue course, decrement in-degree of its dependents, enqueue those reaching 0. Count processed courses. Return count == numCourses.",
      },
      {
        level: 3,
        content:
          'in_deg=[0]*n; adj=defaultdict(list). For a,b in prereqs: adj[b].append(a); in_deg[a]+=1. q=deque(c for c in range(n) if in_deg[c]==0); count=0. While q: c=q.popleft(); count+=1. For nb in adj[c]: in_deg[nb]-=1; if in_deg[nb]==0: q.append(nb). Return count==numCourses.',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Word Ladder',
    slug: 'word-ladder',
    pattern: 'BFS',
    difficulty: 'HARD',
    statement:
      'A transformation sequence from beginWord to endWord changes one letter at a time, using only words from wordList. Return the number of words in the shortest transformation sequence, or 0 if none exists.\n\nExample: beginWord="hit", endWord="cog", wordList=["hot","dot","dog","lot","log","cog"] → 5\nExample: beginWord="hit", endWord="cog", wordList=["hot","dot","dog","lot","log"] → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Model as an unweighted graph: words are nodes, edges connect words differing by one letter. BFS finds the shortest path. The challenge is finding neighbours efficiently — naively comparing all pairs is O(n * L²).',
      },
      {
        level: 2,
        content:
          'BFS with wildcard patterns. For each word, generate all patterns by replacing each character with \'*\' ("hot" → ["*ot","h*t","ho*"]). Group words by pattern (pattern → list of words). BFS from beginWord: for each current word, expand via its patterns to find unvisited neighbours. Count levels.',
      },
      {
        level: 3,
        content:
          'pattern_map=defaultdict(list). For w in wordList: for i in range(L): pattern_map[w[:i]+"*"+w[i+1:]].append(w). q=deque([(beginWord,1)]); visited={beginWord}. While q: w,steps=q.popleft(). For i in range(L): for nb in pattern_map[w[:i]+"*"+w[i+1:]]: if nb==endWord: return steps+1. if nb not in visited: visited.add(nb); q.append((nb,steps+1)). Return 0.',
      },
    ],
  },

  {
    title: 'Shortest Path to Get All Keys',
    slug: 'shortest-path-to-get-all-keys',
    pattern: 'BFS',
    difficulty: 'HARD',
    statement:
      "Grid with '@' (start), '#' (wall), '.' (empty), lowercase letters (keys), uppercase letters (locks). Collect all keys to open matching locks. Return the minimum steps to collect all keys, or -1 if impossible.\n\nExample: grid=[\"@.a.#\",\"###.#\",\"b.A.B\"] → 8\nExample: grid=[\"@..aA\",\"..B#.\",\"....b\"] → 6",
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'BFS on state = (row, col, keys_bitmask). Each key is a bit. The same cell can be visited multiple times with different key states. Use BFS since steps have unit cost.',
      },
      {
        level: 2,
        content:
          'BFS with state (r, c, keys). visited = set of (r, c, keys). When you step on a key: keys |= (1 << key_index). When you step on a lock: skip if you don\'t hold the key bit. Return steps when keys == all_keys_mask (all bits set). State space: O(m * n * 2^k).',
      },
      {
        level: 3,
        content:
          'Count keys (lowercase letters); all_keys=(1<<num_keys)-1. Find start "@". q=deque([(sr,sc,0,0)]); visited={(sr,sc,0)}. While q: r,c,keys,steps=q.popleft(). For nr,nc in 4dirs: ch=grid[nr][nc]. if "#": skip. new_keys=keys|(1<<(ord(ch)-97)) if ch.islower() else keys. if ch.isupper() and not keys&(1<<(ord(ch)-65)): skip. if new_keys==all_keys: return steps+1. if (nr,nc,new_keys) not in visited: visited.add(...); q.append((nr,nc,new_keys,steps+1)). Return -1.',
      },
    ],
  },

  {
    title: 'Bus Routes',
    slug: 'bus-routes',
    pattern: 'BFS',
    difficulty: 'HARD',
    statement:
      'routes[i] is a circular bus route. You start at source and want to reach target. Each bus ride costs 1. Return the minimum number of buses to ride, or -1 if impossible.\n\nExample: routes=[[1,2,7],[3,6,7]], source=1, target=6 → 2\nExample: routes=[[7,12],[4,5,15],[6],[15,19],[9,12,13]], source=15, target=12 → -1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'BFS where each level represents taking one additional bus. From any stop, you can board any route that serves it. Once on a route, you can reach any stop on that route.',
      },
      {
        level: 2,
        content:
          'BFS on stops. Map each stop → routes serving it. Start with source (0 buses used). For each stop, try all routes through it; for each unvisited route, add all its unvisited stops to the next BFS level (cost +1 bus). Track visited stops AND visited routes to avoid cycles.',
      },
      {
        level: 3,
        content:
          'stop_to_routes=defaultdict(list). For i,route in enumerate(routes): for s in route: stop_to_routes[s].append(i). visited_stops={source}; visited_routes=set(); q=deque([(source,0)]). While q: stop,buses=q.popleft(). if stop==target: return buses. For route in stop_to_routes[stop]: if route in visited_routes: continue. visited_routes.add(route). For s in routes[route]: if s not in visited_stops: visited_stops.add(s); q.append((s,buses+1)). Return -1.',
      },
    ],
  },

  {
    title: 'Word Ladder II',
    slug: 'word-ladder-ii',
    pattern: 'BFS',
    difficulty: 'HARD',
    statement:
      'Find all shortest transformation sequences from beginWord to endWord where each step changes one letter and uses a word from wordList. Return all such sequences.\n\nExample: beginWord="hit", endWord="cog", wordList=["hot","dot","dog","lot","log","cog"] → [["hit","hot","dot","dog","cog"],["hit","hot","lot","log","cog"]]\nExample: beginWord="hit", endWord="cog", wordList=["hot","dot","dog","lot","log"] → []',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'BFS finds the shortest path length and builds a predecessor map (each word points to which words can precede it at the shortest distance). Then DFS/backtracking reconstructs all paths using the predecessor map. Why must you stop adding predecessors once a word is first reached?',
      },
      {
        level: 2,
        content:
          'Two-phase. Phase 1 (BFS): build word→distance and word→predecessors maps using wildcard patterns. Never add a predecessor at a greater distance than first reached. Stop expanding once endWord is found. Phase 2 (DFS): trace back from endWord using predecessors, reversing each complete path.',
      },
      {
        level: 3,
        content:
          'Build pattern_map. BFS: dist={beginWord:0}; prev=defaultdict(set). Process level by level using a per-level frontier; for each word in frontier, expand patterns. Only add to prev if neighbour is not yet in dist (first reach). Stop when endWord reached. DFS: def dfs(w): if w==beginWord: return [[beginWord]]. return [[beginWord]+path for p in prev[w] for path in dfs_sub(p)]. Return paths reaching endWord. Note: rebuilding with dfs from endWord back to beginWord then reversing is often cleaner.',
      },
    ],
  },

  {
    title: 'Jump Game IV',
    slug: 'jump-game-iv',
    pattern: 'BFS',
    difficulty: 'HARD',
    statement:
      'Given integer array arr, from index i you can jump to i+1, i-1, or any index j where arr[j]==arr[i]. Return the minimum jumps to reach the last index.\n\nExample: arr=[100,-23,-23,404,100,23,23,23,3,404] → 3\nExample: arr=[7] → 0\nExample: arr=[7,6,9,6,9,6,9,7] → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'BFS from index 0. From each index, explore ±1 neighbours and all same-value indices. A critical optimisation: once you have visited all same-value indices for a given value, clear that group — revisiting them cannot yield a shorter path.',
      },
      {
        level: 2,
        content:
          'BFS + value-to-indices map. Precompute value → list of indices. BFS level by level (each level = 1 jump). For each index: add i-1, i+1, and all entries in same[arr[i]] to the next level. After processing same[arr[i]], clear the list to prevent re-visits. Return level when last index is reached.',
      },
      {
        level: 3,
        content:
          'same=defaultdict(list). For i,v in enumerate(arr): same[v].append(i). q=deque([0]); visited={0}; steps=0. While q: for _ in range(len(q)): i=q.popleft(). if i==n-1: return steps. for j in [i-1,i+1]: if 0<=j<n and j not in visited: visited.add(j); q.append(j). for j in same[arr[i]]: if j not in visited: visited.add(j); q.append(j). same[arr[i]].clear(). steps+=1. Return -1.',
      },
    ],
  },

  {
    title: 'Sliding Puzzle',
    slug: 'sliding-puzzle',
    pattern: 'BFS',
    difficulty: 'HARD',
    statement:
      'A 2×3 board has tiles 1–5 and one 0 (blank). Swap 0 with an adjacent tile per move. Return the minimum moves to reach [[1,2,3],[4,5,0]], or -1 if impossible.\n\nExample: board=[[1,2,3],[4,0,5]] → 1\nExample: board=[[1,2,3],[5,4,0]] → -1\nExample: board=[[4,1,2],[5,0,3]] → 5',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Represent the board as a 6-character string. BFS on board states. Each state has at most 3–4 neighbours (swap 0 with its adjacents). Use a visited set of state strings. The target state is "123450".',
      },
      {
        level: 2,
        content:
          'BFS on string states. Flatten 2×3 board row by row → 6-char string. Precompute neighbours[i] = valid swap positions for position i of 0 in the flat string. BFS: swap 0 with each neighbour to generate next states. Return moves when target is reached.',
      },
      {
        level: 3,
        content:
          'neighbors=[[1,3],[0,2,4],[1,5],[0,4],[1,3,5],[2,4]]. start="".join(str(board[r][c]) for r in range(2) for c in range(3)). target="123450". q=deque([(start,0)]); visited={start}. While q: s,moves=q.popleft(). if s==target: return moves. z=s.index("0"). For nb in neighbors[z]: lst=list(s); lst[z],lst[nb]=lst[nb],lst[z]; ns="".join(lst). if ns not in visited: visited.add(ns); q.append((ns,moves+1)). Return -1.',
      },
    ],
  },

  {
    title: 'Shortest Path in a Grid with Obstacles Elimination',
    slug: 'shortest-path-grid-with-obstacles-elimination',
    pattern: 'BFS',
    difficulty: 'HARD',
    statement:
      'Given an m×n grid (0=empty, 1=obstacle) and integer k, you can eliminate at most k obstacles. Return the minimum steps from (0,0) to (m-1,n-1), or -1 if impossible.\n\nExample: grid=[[0,0,0],[1,1,0],[0,0,0],[0,1,1],[0,0,0]], k=1 → 6\nExample: grid=[[0,1,1],[1,1,1],[1,0,0]], k=1 → -1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'BFS on state = (row, col, eliminations_remaining). The same cell can be visited multiple times with different elimination counts. Standard BFS gives the shortest path since each step costs 1.',
      },
      {
        level: 2,
        content:
          'BFS with state (r, c, elim). visited = set of (r, c, elim). For each neighbour: if obstacle and elim > 0: enqueue with elim-1. If empty: enqueue with elim unchanged. Return steps when reaching (m-1, n-1). Shortcut: if k >= m+n-2, the answer is m+n-2.',
      },
      {
        level: 3,
        content:
          'if k>=m+n-2: return m+n-2. q=deque([(0,0,k,0)]); visited={(0,0,k)}. While q: r,c,elim,steps=q.popleft(). For nr,nc in 4dirs: if out_of_bounds: continue. new_elim=elim-grid[nr][nc]. if new_elim<0: continue. if nr==m-1 and nc==n-1: return steps+1. if (nr,nc,new_elim) not in visited: visited.add((nr,nc,new_elim)); q.append((nr,nc,new_elim,steps+1)). Return -1.',
      },
    ],
  },

  {
    title: 'Cut Off Trees for Golf Event',
    slug: 'cut-off-trees-for-golf-event',
    pattern: 'BFS',
    difficulty: 'HARD',
    statement:
      'You must cut trees in order of increasing height. forest[i][j] is the height (0=obstacle, 1=flat). You start at (0,0). Return total walking steps to cut all trees in order, or -1 if any tree is unreachable.\n\nExample: forest=[[1,2,3],[0,0,4],[7,6,5]] → 6\nExample: forest=[[1,2,3],[0,0,0],[7,6,5]] → -1\nExample: forest=[[2,3,4],[0,0,5],[8,7,6]] → 6',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort all trees by height. From your current position, BFS to the next tree to cut. Sum all BFS distances. If any BFS returns -1 (blocked), return -1.',
      },
      {
        level: 2,
        content:
          'Sort all non-zero, non-one cells by value. def bfs(sr,sc,tr,tc): standard BFS returning minimum distance (or -1). Start at (0,0). For each tree in sorted order: add bfs(current, tree) to total; update current position; set that cell to 1 (cut). Return total.',
      },
      {
        level: 3,
        content:
          'trees=sorted((forest[r][c],r,c) for r in range(m) for c in range(n) if forest[r][c]>1). def bfs(sr,sc,tr,tc): if (sr,sc)==(tr,tc): return 0. q=deque([(sr,sc,0)]); visited={(sr,sc)}. While q: r,c,d=q.popleft(). For nr,nc in 4dirs: if in_bounds and forest[nr][nc]!=0 and (nr,nc) not in visited: if nr==tr and nc==tc: return d+1. visited.add((nr,nc)); q.append((nr,nc,d+1)). return -1. cr=cc=total=0. For _,tr,tc in trees: d=bfs(cr,cc,tr,tc). if d==-1: return -1. total+=d; cr,cc=tr,tc. Return total.',
      },
    ],
  },

  {
    title: 'Trapping Rain Water II',
    slug: 'trapping-rain-water-ii',
    pattern: 'BFS',
    difficulty: 'HARD',
    statement:
      'Given an m×n integer matrix heightMap representing elevation, return the volume of water that can be trapped after raining.\n\nExample: heightMap=[[1,4,3,1,3,2],[3,2,1,3,2,4],[2,3,3,2,3,1]] → 4\nExample: heightMap=[[3,3,3,3,3],[3,2,2,2,3],[3,2,1,2,3],[3,2,2,2,3],[3,3,3,3,3]] → 10',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Water trapped at an interior cell is determined by the minimum height along any path to the boundary — specifically, the maximum of those minimums (the "bottleneck"). Use a min-heap BFS starting from all border cells.',
      },
      {
        level: 2,
        content:
          'Min-heap BFS. Push all border cells with their heights. Mark visited. Pop the minimum-height cell: for each unvisited neighbour, water = max(0, current_height - neighbour_height). Push the neighbour with height max(current_height, neighbour_height) — this carries the "water level" forward.',
      },
      {
        level: 3,
        content:
          'import heapq. heap=[]; visited=set(). For border cell (r,c): heapq.heappush(heap,(heightMap[r][c],r,c)); visited.add((r,c)). water=0. While heap: h,r,c=heapq.heappop(heap). For nr,nc in 4dirs: if (nr,nc) not in visited and in_bounds: visited.add((nr,nc)); nh=heightMap[nr][nc]. water+=max(0,h-nh); heapq.heappush(heap,(max(h,nh),nr,nc)). Return water. The heap ensures you always process the lowest boundary first.',
      },
    ],
  },

  {
    title: 'Swim in Rising Water',
    slug: 'swim-in-rising-water',
    pattern: 'BFS',
    difficulty: 'HARD',
    statement:
      'On an n×n grid, grid[i][j] is the elevation. At time t, you can swim from a cell to an adjacent cell if both have elevation ≤ t. Find the minimum time t to swim from (0,0) to (n-1,n-1).\n\nExample: grid=[[0,2],[1,3]] → 3\nExample: grid=[[0,1,2,3,4],[24,23,22,21,5],[12,13,14,15,16],[11,17,18,19,20],[10,9,8,7,6]] → 16',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'You want to minimise the maximum elevation encountered along a path from (0,0) to (n-1,n-1). This is a "bottleneck shortest path" problem. A min-heap BFS (Dijkstra variant) processes cells in order of their elevation, naturally minimising the maximum.',
      },
      {
        level: 2,
        content:
          'Min-heap BFS. State: (max_elevation_so_far, row, col). Start: (grid[0][0], 0, 0). For each popped cell: expand to unvisited neighbours, pushing (max(current_max, neighbour_elevation), nr, nc). The first time you pop (n-1,n-1), its current_max is the answer.',
      },
      {
        level: 3,
        content:
          'import heapq. heap=[(grid[0][0],0,0)]; visited={(0,0)}. While heap: t,r,c=heapq.heappop(heap). if r==n-1 and c==n-1: return t. For nr,nc in 4dirs: if in_bounds and (nr,nc) not in visited: visited.add((nr,nc)); heapq.heappush(heap,(max(t,grid[nr][nc]),nr,nc)). The cost function max(t, grid[nr][nc]) instead of t+1 makes this Dijkstra on the bottleneck path rather than shortest total-cost path.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 4 — BFS (29 problems)...\n');

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
