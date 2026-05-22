import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 17 — UNION_FIND (30 problems: 10 Easy, 10 Medium, 10 Hard)
// Already seeded: Number of Connected Components 323 (original seed) — will be skipped
// Note: Union-Find has very few LeetCode-Easy problems; Easy tier uses simpler
//   foundational UF applications that introduce the pattern progressively.
// Avoids BFS batch4 (swim-in-rising-water, max-area-of-island, find-if-path-exists-in-graph)
//   and FAST_SLOW_POINTERS batch13 (redundant-connection-ii)
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
    title: 'Number of Connected Components in an Undirected Graph',
    slug: 'number-of-connected-components-in-an-undirected-graph',
    pattern: 'UNION_FIND',
    difficulty: 'EASY',
    statement:
      'Given n nodes (0 to n-1) and a list of undirected edges, return the number of connected components.\n\nExample: n=5, edges=[[0,1],[1,2],[3,4]] → 2\nExample: n=5, edges=[[0,1],[1,2],[2,3],[3,4]] → 1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Start with n components (each node is its own). For each edge, union the two endpoints. Each successful union (different components) reduces the count by 1.',
      },
      {
        level: 2,
        content:
          'parent=[i for i in range(n)]; count=n. For (u,v): if find(u)!=find(v): union(u,v); count--. Return count. O(E * α(n)).',
      },
    ],
  },

  {
    title: 'Number of Islands',
    slug: 'number-of-islands',
    pattern: 'UNION_FIND',
    difficulty: 'EASY',
    statement:
      'Given a 2D grid of \'1\'s (land) and \'0\'s (water), count the number of islands (groups of adjacent \'1\'s connected horizontally or vertically).\n\nExample: grid=[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]] → 1\nExample: grid=[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]] → 3',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Initialize each land cell as its own component. For each land cell, union it with its right and down neighbors if they are also land. Count distinct roots.',
      },
      {
        level: 2,
        content:
          'count = number of \'1\' cells. For each \'1\' at (r,c): try union with (r,c+1) and (r+1,c) if \'1\'; each successful union decrements count. Return count. O(mn * α(mn)).',
      },
    ],
  },

  {
    title: 'Number of Provinces',
    slug: 'number-of-provinces',
    pattern: 'UNION_FIND',
    difficulty: 'EASY',
    statement:
      'An n×n adjacency matrix isConnected represents direct city connections. Cities in the same connected component form a province. Return the total number of provinces.\n\nExample: isConnected=[[1,1,0],[1,1,0],[0,0,1]] → 2\nExample: isConnected=[[1,0,0],[0,1,0],[0,0,1]] → 3',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Initialize each city as its own province. Union directly connected cities. The number of distinct roots at the end is the answer.',
      },
      {
        level: 2,
        content:
          'parent=[i for i in range(n)]; count=n. For i,j where i<j and isConnected[i][j]==1: if find(i)!=find(j): union(i,j); count--. Return count. O(n² * α(n)).',
      },
    ],
  },

  {
    title: 'Satisfiability of Equality Equations',
    slug: 'satisfiability-of-equality-equations',
    pattern: 'UNION_FIND',
    difficulty: 'EASY',
    statement:
      'Given equations like "a==b" and "c!=d" over single lowercase variables, return whether all equations can be satisfied simultaneously.\n\nExample: equations=["a==b","b!=c","b==c"] → false\nExample: equations=["c==c","b==d","x!=z"] → true',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Process equality equations first to build connected components, then check each inequality: if both sides share a root, contradiction.',
      },
      {
        level: 2,
        content:
          'Pass 1: for each "a==b": union(a,b). Pass 2: for each "a!=b": if find(a)==find(b): return False. Return True. O(n * α(26)), 26 variables max.',
      },
    ],
  },

  {
    title: 'Longest Consecutive Sequence',
    slug: 'longest-consecutive-sequence',
    pattern: 'UNION_FIND',
    difficulty: 'EASY',
    statement:
      'Find the length of the longest consecutive integers sequence in an unsorted array. Solve in O(n).\n\nExample: nums=[100,4,200,1,3,2] → 4 (sequence 1,2,3,4)\nExample: nums=[0,3,7,2,5,8,4,6,0,1] → 9',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Put all numbers in a hash set. For each number n that is a sequence start (n-1 not in set), count how far the sequence extends upward.',
      },
      {
        level: 2,
        content:
          's=set(nums); best=0. For n in s: if n-1 not in s: length=1. While n+length in s: length++. best=max(best,length). Return best. O(n). (Alternatively: Union-Find — union consecutive pairs, track component sizes.)',
      },
    ],
  },

  {
    title: 'Count Unreachable Pairs of Nodes in an Undirected Graph',
    slug: 'count-unreachable-pairs-of-nodes-in-an-undirected-graph',
    pattern: 'UNION_FIND',
    difficulty: 'EASY',
    statement:
      'Return the number of pairs of nodes (i, j) with i < j that cannot be connected by any path.\n\nExample: n=3, edges=[[0,1],[0,2],[1,2]] → 0\nExample: n=7, edges=[[0,2],[0,5],[2,4],[1,6],[5,4]] → 14',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Find all connected components and their sizes. The unreachable pairs are total_pairs minus the pairs within each component.',
      },
      {
        level: 2,
        content:
          'Union-Find: group nodes into components; collect component sizes. unreachable = n*(n-1)//2 - sum(s*(s-1)//2 for s in sizes). O((n+E)*α(n)).',
      },
    ],
  },

  {
    title: 'Lexicographically Smallest Equivalent String',
    slug: 'lexicographically-smallest-equivalent-string',
    pattern: 'UNION_FIND',
    difficulty: 'EASY',
    statement:
      'Given strings s1 and s2 where s1[i]↔s2[i] are equivalent characters (transitively), return the lexicographically smallest equivalent string of baseStr.\n\nExample: s1="parker", s2="morris", baseStr="parser" → "makkek"\nExample: s1="hello", s2="world", baseStr="hold" → "hdld"',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Union equivalent character pairs, always keeping the lexicographically smaller letter as the root. Map each character in baseStr to its component\'s root.',
      },
      {
        level: 2,
        content:
          'parent=list(range(26)). union(a,b): ra,rb=find(a),find(b); if ra<rb: parent[rb]=ra else parent[ra]=rb. For i: union(ord(s1[i])-97, ord(s2[i])-97). Return "".join(chr(find(ord(c)-97)+97) for c in baseStr). O(|s1|+|baseStr|).',
      },
    ],
  },

  {
    title: 'Count the Number of Complete Components',
    slug: 'count-the-number-of-complete-components',
    pattern: 'UNION_FIND',
    difficulty: 'EASY',
    statement:
      'A connected component is complete if there is an edge between every pair of its vertices. Return the number of complete components.\n\nExample: n=6, edges=[[0,1],[0,2],[1,2],[3,4]] → 3\nExample: n=6, edges=[[0,1],[0,2],[1,2],[3,4],[3,5]] → 1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Union-Find to find components. For each component with k nodes, it is complete iff it has exactly k*(k-1)/2 edges.',
      },
      {
        level: 2,
        content:
          'Union all edges. For each node, track its component root; count component sizes and edge counts per root. A component is complete if edges == size*(size-1)//2. Return count of complete components. O((n+E)*α(n)).',
      },
    ],
  },

  {
    title: 'Find the Town Judge',
    slug: 'find-the-town-judge',
    pattern: 'UNION_FIND',
    difficulty: 'EASY',
    statement:
      'In a town of n people, the judge trusts nobody but is trusted by everyone else. Given trust[i]=[a,b] meaning a trusts b, find the judge\'s label or return -1.\n\nExample: n=2, trust=[[1,2]] → 2\nExample: n=3, trust=[[1,3],[2,3]] → 3\nExample: n=3, trust=[[1,3],[2,3],[3,1]] → -1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'The judge has in-degree n-1 (trusted by all others) and out-degree 0 (trusts nobody). Count both for each person.',
      },
      {
        level: 2,
        content:
          'degree=[0]*n. For (a,b): degree[b-1]++; degree[a-1]--. For i: if degree[i]==n-1: return i+1. Return -1. O(n+|trust|).',
      },
    ],
  },

  {
    title: 'Redundant Connection',
    slug: 'redundant-connection',
    pattern: 'UNION_FIND',
    difficulty: 'EASY',
    statement:
      'Given a graph formed from a tree with exactly one extra edge added, find the redundant edge (the one that creates a cycle). If multiple answers, return the last one in the input.\n\nExample: edges=[[1,2],[1,3],[2,3]] → [2,3]\nExample: edges=[[1,2],[2,3],[3,4],[1,4],[1,5]] → [1,4]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Process edges one by one. The first edge where both endpoints are already in the same component forms the cycle — it\'s the redundant edge.',
      },
      {
        level: 2,
        content:
          'Union-Find: for each (u,v): if find(u)==find(v): return [u,v]. Else union(u,v). O(n * α(n)). The last such edge in input order is automatically returned by processing edges sequentially.',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Accounts Merge',
    slug: 'accounts-merge',
    pattern: 'UNION_FIND',
    difficulty: 'MEDIUM',
    statement:
      'Each account has a name and a list of emails. Merge accounts sharing at least one email. Return merged accounts (emails sorted, name first).\n\nExample: accounts=[["John","johnsmith@mail.com","john_newyork@mail.com"],["John","johnsmith@mail.com","john00@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]] → [["John","john00@mail.com","john_newyork@mail.com","johnsmith@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Map each email to an account index. Union account indices that share an email. Group emails by their root account index, then reconstruct.',
      },
      {
        level: 2,
        content:
          'email_to_id={}. For each acc i, each email: if email in map: union(i, email_to_id[email]); else map[email]=i. Group all emails by find(email_to_id[email]). Sort each group; prepend account name. O(n*m*α(nm)).',
      },
      {
        level: 3,
        content:
          'Two-pass: (1) build unions by connecting accounts sharing an email via their first appearance\'s index; (2) rebuild by mapping each email to its root account index, grouping, and sorting. The account name is retrieved from the root account index. Every email connects to exactly one chain of unioned accounts.',
      },
    ],
  },

  {
    title: 'Surrounded Regions',
    slug: 'surrounded-regions',
    pattern: 'UNION_FIND',
    difficulty: 'MEDIUM',
    statement:
      'Flip all \'O\'s not connected to the grid border (directly or through other \'O\'s) to \'X\'.\n\nExample: board=[["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]] → [["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a virtual boundary node. Connect all border \'O\'s to it, then connect adjacent \'O\' pairs. Any \'O\' not connected to the virtual node is surrounded.',
      },
      {
        level: 2,
        content:
          'Virtual node index = m*n. For each border \'O\': union with virtual. For each interior \'O\': union with adjacent \'O\'s. For each cell: if \'O\' and find(cell) != find(virtual): set to \'X\'. O(mn * α(mn)).',
      },
      {
        level: 3,
        content:
          'The virtual boundary sentinel acts as a proxy for all border-connected \'O\'s. After processing, any \'O\' with find != virtual is completely enclosed. Alternatively: BFS/DFS from all border \'O\'s to mark safe cells, then flip unmarked \'O\'s. The UF approach handles it in a single connected-component check.',
      },
    ],
  },

  {
    title: 'Smallest String With Swaps',
    slug: 'smallest-string-with-swaps',
    pattern: 'UNION_FIND',
    difficulty: 'MEDIUM',
    statement:
      'Given a string and pairs of indices you can swap (any number of times), return the lexicographically smallest possible string.\n\nExample: s="dcab", pairs=[[0,3],[1,2]] → "bacd"\nExample: s="dcab", pairs=[[0,3],[1,2],[0,2]] → "abcd"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Union connected indices. Within each connected component you can freely rearrange characters — sort them and place them at the component\'s indices (also sorted).',
      },
      {
        level: 2,
        content:
          'Union-Find over indices. Group indices by root. For each group: collect characters, sort; collect indices, sort; assign sorted_chars[i]→sorted_indices[i]. O((n+|pairs|)*α(n) + n log n).',
      },
      {
        level: 3,
        content:
          'Within a connected component, any permutation is reachable via swap sequences — so sorting gives the lexicographic minimum. Sorting indices ensures the smallest character goes to the smallest index. Use a defaultdict(list) to group by root after all unions.',
      },
    ],
  },

  {
    title: 'Number of Operations to Make Network Connected',
    slug: 'number-of-operations-to-make-network-connected',
    pattern: 'UNION_FIND',
    difficulty: 'MEDIUM',
    statement:
      'n computers. Some are connected by cables. Return the minimum number of cable moves to connect all computers, or -1 if impossible.\n\nExample: n=4, connections=[[0,1],[0,2],[1,2]] → 1\nExample: n=6, connections=[[0,1],[0,2],[0,3],[1,2]] → 2\nExample: n=6, connections=[[0,1],[0,2],[0,3],[1,2],[1,3]] → -1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'You need at least n-1 cables to connect n computers. Count components and redundant cables. If redundant < components-1: impossible.',
      },
      {
        level: 2,
        content:
          'Union-Find: count components and extra_edges (edges where both endpoints already in same component). If extra_edges < components-1: return -1. Else return components-1. O(E * α(n)).',
      },
      {
        level: 3,
        content:
          'Each extra cable (creating a cycle) can be moved to bridge two disconnected components. You need exactly components-1 moves. If extra < components-1: not enough movable cables. Start with n components; each union that actually merges two decrements components and increments neither extra; redundant unions increment extra.',
      },
    ],
  },

  {
    title: 'Sentence Similarity II',
    slug: 'sentence-similarity-ii',
    pattern: 'UNION_FIND',
    difficulty: 'MEDIUM',
    statement:
      'Two sentences are similar if every word pair (words1[i], words2[i]) is in the same similarity equivalence class (transitively). Return whether the two sentences have the same length and are similar.\n\nExample: words1=["great","acting","skills"], words2=["fine","drama","talent"], pairs=[["great","good"],["fine","good"],["drama","acting"],["skills","talent"]] → true',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Build word equivalence classes from pairs using Union-Find. Two sentences are similar if every position has both words in the same component.',
      },
      {
        level: 2,
        content:
          'Map words to integer IDs. For each pair (a,b): union(id(a),id(b)). Check: len(w1)==len(w2), and for each i: find(id(w1[i]))==find(id(w2[i])). O((|pairs|+|words|)*α(n)).',
      },
      {
        level: 3,
        content:
          'This is identical in structure to Satisfiability of Equality Equations but with arbitrary strings instead of single characters. A dict-based union-find or an id-mapping dict handles the variable-length keys. The transitivity of similarity is automatically captured by path compression.',
      },
    ],
  },

  {
    title: 'Detect Cycles in 2D Grid',
    slug: 'detect-cycles-in-2d-grid',
    pattern: 'UNION_FIND',
    difficulty: 'MEDIUM',
    statement:
      'Return true if a cycle of length ≥ 4 exists in a 2D character grid where a cycle consists of the same character connected 4-directionally.\n\nExample: grid=[["a","a","a","a"],["a","b","b","a"],["a","b","b","a"],["a","a","a","a"]] → true\nExample: grid=[["c","c","c","a"],["c","d","c","c"],["c","c","e","c"],["f","c","c","c"]] → true\nExample: grid=[["a","b","b"],["b","z","b"],["b","b","a"]] → false',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Process cells in row-major order. When connecting a cell to a same-character neighbor above or to the left, if they\'re already in the same component, a cycle exists.',
      },
      {
        level: 2,
        content:
          'Union-Find over cells. For each (r,c): check (r-1,c) and (r,c-1) with same character. If find(r*c+c) == find(neighbor): return True. Else union. Return False. O(mn * α(mn)).',
      },
      {
        level: 3,
        content:
          'Only checking the "previous" neighbors (up and left) in row-major order ensures we only process already-visited cells. If two already-connected cells would be unioned again, they form a cycle of at least length 4 (since it takes at least 4 cells to form a cycle in a grid). This avoids the DFS parent-tracking approach.',
      },
    ],
  },

  {
    title: 'Number of Enclaves',
    slug: 'number-of-enclaves',
    pattern: 'UNION_FIND',
    difficulty: 'MEDIUM',
    statement:
      'Return the number of land cells (1) you cannot reach the border from using 4-directional movement.\n\nExample: grid=[[0,0,0,0],[1,0,1,0],[0,1,1,0],[0,0,0,0]] → 3\nExample: grid=[[0,1,1,0],[0,0,1,0],[0,0,1,0],[0,0,0,0]] → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use a virtual border node. Connect all border land cells to it, then connect adjacent land cells. Count land cells not connected to the virtual border node.',
      },
      {
        level: 2,
        content:
          'Virtual node = m*n. For each border \'1\': union with virtual. For adjacent \'1\'-pairs in grid: union them. Result = count of grid[r][c]==1 cells where find(r*n+c) != find(m*n). O(mn * α(mn)).',
      },
      {
        level: 3,
        content:
          'The virtual boundary sentinel represents "reachable from border." Any land cell connected to it can be exited. Cells not connected are enclaves. Equivalent to multi-source BFS from all border land cells, but the Union-Find avoids explicit traversal by using the sentinel connectivity check.',
      },
    ],
  },

  {
    title: 'Minimum Score of a Path Between Two Cities',
    slug: 'minimum-score-of-a-path-between-two-cities',
    pattern: 'UNION_FIND',
    difficulty: 'MEDIUM',
    statement:
      'Roads connect n cities bidirectionally with distances. A path score is the minimum road distance along the path. Find the minimum score of any path from city 1 to city n (paths may revisit cities/roads).\n\nExample: n=4, roads=[[1,2,9],[2,3,6],[2,4,5],[1,4,7]] → 5\nExample: n=4, roads=[[1,2,2],[1,3,4],[3,4,6]] → 2',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'The answer is the minimum edge weight in the connected component containing both city 1 and city n (since paths can reuse edges).',
      },
      {
        level: 2,
        content:
          'Build Union-Find. For each road (u,v,w): union(u,v). Find the root of node 1. Scan all roads: if both endpoints\' root == find(1): track minimum weight. Return that minimum. O(E * α(n)).',
      },
      {
        level: 3,
        content:
          'Since paths can revisit edges, any edge in the same component as node 1 is reachable. The minimum score is achieved by taking the lightest edge in the component, then backtracking if needed to reach node n. The guaranteed path existence means find(1)==find(n).',
      },
    ],
  },

  {
    title: 'Evaluate Division',
    slug: 'evaluate-division',
    pattern: 'UNION_FIND',
    difficulty: 'MEDIUM',
    statement:
      'Given equations A/B=k and queries C/D, return each query\'s result or -1.0 if undetermined.\n\nExample: equations=[["a","b"],["b","c"]], values=[2.0,3.0], queries=[["a","c"],["b","a"],["a","e"],["a","a"],["x","x"]] → [6.0,0.5,-1.0,1.0,-1.0]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Use weighted Union-Find where each node tracks its ratio to the component root. Union and path compression propagate cumulative ratios.',
      },
      {
        level: 2,
        content:
          'Each node stores (parent, ratio_to_parent). find(x) returns (root, product_of_ratios_to_root) via path compression. union(a,b,v): let (ra,wa)=find(a),(rb,wb)=find(b); parent[ra]=(rb, v*wb/wa). Query(a,b): if find(a)[0]!=find(b)[0]: -1.0. Else wa/wb. O(Q * α(n)).',
      },
      {
        level: 3,
        content:
          'Weighted union-find: find() returns the cumulative product ratio from the node to its root. When unioning, adjust the ratio so that a/root_a = known_ratio * b/root_b. During path compression in find(), multiply the stored ratio by the parent\'s ratio to root. Query a/b = (a/root) / (b/root) = weight_a / weight_b if same root.',
      },
    ],
  },

  {
    title: 'The Earliest Moment When Everyone Became Friends',
    slug: 'the-earliest-moment-when-everyone-became-friends',
    pattern: 'UNION_FIND',
    difficulty: 'MEDIUM',
    statement:
      'Given n people and sorted events [timestamp, a, b] where a and b become friends, return the earliest time when all n people are in the same friend group. Return -1 if never.\n\nExample: n=6, logs=[[20190101,0,1],[20190104,3,4],[20190107,2,3],[20190211,1,5],[20190224,2,4],[20190301,0,3],[20190312,1,2],[20190322,4,5]] → 20190301',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort events by timestamp. Union friends as they meet. Return the timestamp when the component count drops to 1.',
      },
      {
        level: 2,
        content:
          'Sort logs. components=n. For (t,a,b): if find(a)!=find(b): union(a,b); components--. If components==1: return t. Return -1. O(E log E + E * α(n)).',
      },
      {
        level: 3,
        content:
          'Start with n separate components. Each merge event (union of different components) decrements the count. When components==1, everyone is connected. The logs are already sorted in the problem statement — if not, sort first. Returning the timestamp at the exact moment of the final merge is the answer.',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Similar String Groups',
    slug: 'similar-string-groups',
    pattern: 'UNION_FIND',
    difficulty: 'HARD',
    statement:
      'Two strings are similar if they are equal or differ in exactly two positions where swapping those two characters in one gives the other. Strings that are transitively similar form a group. Return the number of groups.\n\nExample: strs=["tars","rats","arts","star"] → 2\nExample: strs=["omv","ovm"] → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each pair of strings, check if they are similar. If similar, union them. Count distinct roots at the end.',
      },
      {
        level: 2,
        content:
          'For each pair (i,j): count = positions where strs[i][k]!=strs[j][k]. If count==0 or count==2: union(i,j). Return number of i where find(i)==i. O(n²L * α(n)).',
      },
      {
        level: 3,
        content:
          'Similarity check: diff_count=0. For each position k: if chars differ, diff_count++; if diff_count>2: not similar (early exit). Count==0 (equal) or count==2 (valid swap) → similar. n² pair checks with length-L comparison per pair. For large n with few unique strings, deduplicate and check only unique pairs.',
      },
    ],
  },

  {
    title: 'Couples Holding Hands',
    slug: 'couples-holding-hands',
    pattern: 'UNION_FIND',
    difficulty: 'HARD',
    statement:
      'n couples sit in 2n seats. Return the minimum number of adjacent swaps to seat every couple side by side.\n\nExample: row=[0,2,1,3] → 1\nExample: row=[3,2,0,1] → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Model couples as nodes. For each adjacent pair of seats, union the two people\'s couple IDs. Count the total swaps needed as (total_couples - number_of_components).',
      },
      {
        level: 2,
        content:
          'Assign couple ID = person//2. components=n (n couples). For i in 0,2,4,...: a=row[i]//2; b=row[i+1]//2. If find(a)!=find(b): union(a,b); components--. Swaps = n - components. O(n * α(n)).',
      },
      {
        level: 3,
        content:
          'Each connected component of coupled couples forms a "rotation cycle" that requires (component_size - 1) swaps. Total swaps = Σ(size-1) = n - number_of_components. After processing all adjacent pairs with Union-Find, the answer is n minus the final component count.',
      },
    ],
  },

  {
    title: 'Bricks Falling When Hit',
    slug: 'bricks-falling-when-hit',
    pattern: 'UNION_FIND',
    difficulty: 'HARD',
    statement:
      'Some bricks form a wall. Bricks in row 0 are stable; others are stable only if connected (4-directional) to a stable brick. Given hits (erase operations), return how many bricks fall after each hit.\n\nExample: grid=[[1,0,0,0],[1,1,1,0]], hits=[[1,0]] → [2]\nExample: grid=[[1,0,0,0],[1,1,0,0]], hits=[[1,1],[1,0]] → [0,0]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Reverse the process: add bricks back in reverse hit order. Count how many new bricks connect to the ceiling (row 0) after each re-addition.',
      },
      {
        level: 2,
        content:
          'Remove all hit bricks first. Build Union-Find on remaining bricks (virtual ceiling node for row 0). Process hits in reverse: re-add brick, union with adjacent bricks. answer[i] = max(0, new_ceiling_size - old_ceiling_size - 1). O(hits * α(mn)).',
      },
      {
        level: 3,
        content:
          'Virtual ceiling node (index m*n) is connected to all row-0 bricks. ceiling_size = size of the virtual ceiling component. After re-adding a brick and unioning with neighbors: fallen = max(0, new_ceiling_size - old_ceiling_size - 1) (the -1 is for the re-added brick itself, which doesn\'t "fall back"). Reverse the answers array before returning.',
      },
    ],
  },

  {
    title: 'Number of Islands II',
    slug: 'number-of-islands-ii',
    pattern: 'UNION_FIND',
    difficulty: 'HARD',
    statement:
      'Start with an m×n water grid. After each addLand(r,c) operation, output the current number of islands.\n\nExample: m=3, n=3, positions=[[0,0],[0,1],[1,2],[2,1]] → [1,1,2,3]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Union-Find with dynamic additions. Each addLand creates a new island (count++), then unions it with adjacent land neighbors (each successful union decrements count).',
      },
      {
        level: 2,
        content:
          'grid=set(); parent={}; count=0. For (r,c): if already land: append count; continue. Add to grid; add to UF; count++. For each adjacent land cell: if find(cell)!=find(neighbor): union; count--. Append count. O(k * α(mn)) for k operations.',
      },
      {
        level: 3,
        content:
          'A dict-based Union-Find handles dynamic additions (cells are added, not pre-allocated). Guard against duplicate positions. For each addLand: add the new cell with itself as parent; check all 4 neighbors that exist in the grid. Each successful union reduces the island count. Track component size for efficient union-by-rank.',
      },
    ],
  },

  {
    title: 'Find Critical and Pseudo-Critical Edges in Minimum Spanning Tree',
    slug: 'find-critical-and-pseudo-critical-edges-in-mst',
    pattern: 'UNION_FIND',
    difficulty: 'HARD',
    statement:
      'Find all critical edges (MST weight strictly increases if removed) and pseudo-critical edges (appear in some MST but not all).\n\nExample: n=5, edges=[[0,1,1],[1,2,1],[2,3,2],[0,3,2],[0,4,3],[3,4,3],[1,4,6]] → [[0,1],[2,3,4,5]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each edge: test criticality (MST weight increases without it) and pseudo-criticality (MST weight stays same when forced in). Use Kruskal\'s algorithm for each test.',
      },
      {
        level: 2,
        content:
          'baseline = Kruskal MST weight. For each edge e: critical if Kruskal(without e) > baseline or graph disconnects. Pseudo-critical if Kruskal(with e forced) == baseline. O(E² * α(n)) overall.',
      },
      {
        level: 3,
        content:
          'Sort edges by weight. Kruskal(exclude=e): run Kruskal skipping edge e; critical if weight > baseline or not fully connected. Kruskal(include=e): pre-union e\'s endpoints, then run Kruskal normally; pseudo-critical if total == baseline. Every edge is tested twice with a full Kruskal run each time.',
      },
    ],
  },

  {
    title: 'Rank Transform of a Matrix',
    slug: 'rank-transform-of-a-matrix',
    pattern: 'UNION_FIND',
    difficulty: 'HARD',
    statement:
      'Replace each matrix element with its rank (1-indexed, consistent with ordering: same row/col larger element gets higher rank, equal elements in same row/col get same rank, ranks minimized).\n\nExample: matrix=[[1,2],[3,4]] → [[1,2],[2,3]]\nExample: matrix=[[7,7],[7,7]] → [[1,1],[1,1]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort all (value, row, col) triples. Process in increasing value order. Equal values sharing a row or column must get the same rank — use Union-Find to group them.',
      },
      {
        level: 2,
        content:
          'Sort elements. Process groups of equal values: union(row_node, col_node) for each cell to link row and column constraints. Rank for a component = max(row_rank, col_rank in component) + 1. Update row_rank and col_rank after processing each group. O(mn log(mn) * α(mn)).',
      },
      {
        level: 3,
        content:
          'Use n+m nodes for rows and columns. For a group of equal values, union each cell\'s row-node with its col-node. The rank of each component = max pre-existing rank among rows and columns in the component + 1. After assigning ranks, update row_rank[r] and col_rank[c] for all cells in the group. Process groups in value order to ensure ordering constraints.',
      },
    ],
  },

  {
    title: 'Last Day Where You Can Still Cross',
    slug: 'last-day-where-you-can-still-cross',
    pattern: 'UNION_FIND',
    difficulty: 'HARD',
    statement:
      'An m×n grid floods day by day: cells[i] becomes water on day i. Return the last day you can walk from any cell in row 1 to any cell in row m using 4-directional movement on land (0) cells.\n\nExample: row=2, col=2, cells=[[1,1],[2,1],[1,2],[2,2]] → 2\nExample: row=2, col=2, cells=[[1,2],[2,1],[1,1],[2,2]] → 1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Reverse the process: add cells as land in reverse order. Use Union-Find with virtual top and bottom nodes. Return the day when top and bottom first become connected.',
      },
      {
        level: 2,
        content:
          'Virtual top (m*n) connects to all row-1 land; virtual bottom (m*n+1) connects to all row-m land. Process cells in reverse: add land, union with adjacent land and virtual nodes. Return day when find(top)==find(bottom). O(row*col * α(row*col)).',
      },
      {
        level: 3,
        content:
          'Add land cells from last day to first. For each re-added cell: check all 4 neighbors; if neighbor is land, union. Also union with virtual top if row==1, virtual bottom if row==row. When find(top)==find(bottom): return the current day (i+1 if processing 0-indexed reverse). Binary search + BFS is an alternative O(mn log(mn)) approach.',
      },
    ],
  },

  {
    title: 'Number of Good Paths',
    slug: 'number-of-good-paths',
    pattern: 'UNION_FIND',
    difficulty: 'HARD',
    statement:
      'A tree with node values. A "good path" starts and ends at nodes with the same value, with no intermediate node having a larger value than the endpoints. Count all good paths (single nodes count).\n\nExample: vals=[1,3,2,1,3], edges=[[0,1],[0,2],[2,3],[2,4]] → 6\nExample: vals=[1,1,2,2,3], edges=[[0,1],[1,2],[2,3],[3,4]] → 7',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort nodes by value. Add edges in increasing order of their endpoints\' smaller value. Count good paths as pairs of same-value nodes within the same component.',
      },
      {
        level: 2,
        content:
          'Sort nodes by val. Adjacency list. Process node groups of same val: for each, union with already-processed (smaller-val) neighbors. Count C(k,2)+k where k = nodes with this val in same component. Sum all counts. O((n+E) log n * α(n)).',
      },
      {
        level: 3,
        content:
          'Processing in increasing value order ensures the maximum node value along any path is the endpoint value. When processing val-group v, union each node with its neighbors that have val ≤ v (already processed). For each component, count nodes with value v in it (call it k); good paths through this component with max-value v = k*(k-1)/2 pairs + k self-paths. Accumulate.',
      },
    ],
  },

  {
    title: 'Remove Max Number of Edges to Keep Graph Fully Traversable',
    slug: 'remove-max-number-of-edges-to-keep-graph-fully-traversable',
    pattern: 'UNION_FIND',
    difficulty: 'HARD',
    statement:
      'A graph has type-1 edges (Alice only), type-2 (Bob only), type-3 (both). Remove the maximum number of edges so both Alice and Bob can fully traverse the graph. Return the count or -1 if impossible.\n\nExample: n=4, edges=[[3,1,2],[3,2,3],[1,1,3],[1,2,4],[1,1,2],[2,3,4]] → 2\nExample: n=4, edges=[[3,1,2],[3,2,3],[1,1,4],[2,1,4]] → 0',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Two separate Union-Finds (Alice and Bob). Process type-3 edges first (they serve both). An edge is removed if it\'s redundant in its respective UF(s).',
      },
      {
        level: 2,
        content:
          'Two UFs. Process type-3: if union succeeds in both: edge needed. Else: removed++. Process type-1 for Alice UF only; type-2 for Bob UF only — increment removed if redundant. If either UF has >1 component: return -1. Return removed. O(E * α(n)).',
      },
      {
        level: 3,
        content:
          'Type-3 edges are most valuable: union in both UFs simultaneously. For type-1/2: union only in Alice\'s/Bob\'s UF. A type-3 edge that is redundant in both UFs is fully removable. A type-3 edge needed by only one UF still needs to be kept (remove from the other\'s perspective is free — it only counts as one edge). Final check: both UFs must show n-1 successful unions (fully connected).',
      },
    ],
  },

  {
    title: 'Graph Connectivity With Threshold',
    slug: 'graph-connectivity-with-threshold',
    pattern: 'UNION_FIND',
    difficulty: 'HARD',
    statement:
      'Two cities are connected if they share a common divisor > threshold (transitively). For each query [a,b], return whether the two cities are connected.\n\nExample: n=6, threshold=2, queries=[[1,4],[2,5],[3,6]] → [false,false,true]\nExample: n=6, threshold=0, queries=[[4,5],[3,4],[3,2],[2,6],[1,3]] → [false,false,false,false,false]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each divisor d > threshold, union all multiples of d (d, 2d, 3d, ...) together. Then answer each query with a simple find comparison.',
      },
      {
        level: 2,
        content:
          'For d from threshold+1..n: for k=d,2d,...≤n: union(d,k). Query(a,b): return find(a)==find(b). O(n log(n/threshold) * α(n) + Q).',
      },
      {
        level: 3,
        content:
          'The outer loop runs n-threshold times; the inner loop runs n/d times for each d. Total inner iterations: Σ(n/d for d=threshold+1..n) ≈ n*(ln(n)-ln(threshold)) = O(n log(n/threshold)). This is a sieve-like approach. Each union runs in near-constant time, making the overall complexity nearly O(n log n).',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 17 — UNION_FIND (30 problems)...\n');

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
