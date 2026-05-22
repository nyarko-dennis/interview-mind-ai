import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { problems, hints } from './schema';

// Batch 18 — TRIE (30 problems: 10 Easy, 10 Medium, 10 Hard)
// Already seeded: Implement Trie 208 (original seed, slug: implement-trie) — will be skipped
// Excludes Word Search II (212) which is in DFS_BACKTRACKING batch5
// Easy tier: 6 true LeetCode Easy + 4 simpler Medium trie problems as entry-level foundations
// Sub-patterns: prefix trie, suffix/reverse trie, XOR trie (binary trie), autocomplete
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
    title: 'Longest Common Prefix',
    slug: 'longest-common-prefix',
    pattern: 'TRIE',
    difficulty: 'EASY',
    statement:
      'Find the longest common prefix string among an array of strings. Return "" if none exists.\n\nExample: strs=["flower","flow","flight"] → "fl"\nExample: strs=["dog","racecar","car"] → ""',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Take the first string as the candidate prefix. Shorten it until it is a prefix of every other string.',
      },
      {
        level: 2,
        content:
          'prefix=strs[0]. For s in strs[1:]: while not s.startswith(prefix): prefix=prefix[:-1]. If not prefix: return "". Return prefix. O(S) where S = sum of all string lengths.',
      },
    ],
  },

  {
    title: 'String Matching in an Array',
    slug: 'string-matching-in-an-array',
    pattern: 'TRIE',
    difficulty: 'EASY',
    statement:
      'Return all strings in words that are a substring of another word in the array.\n\nExample: words=["mass","as","hero","superhero"] → ["as","hero"]\nExample: words=["leetcode","et","code"] → ["et","code"]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'For each word, check if it appears as a substring in any other word in the array.',
      },
      {
        level: 2,
        content:
          'result=[]. For w in words: for other in words: if w!=other and w in other: result.append(w); break. Return result. O(n²L). Aho-Corasick automaton gives O(total_chars).',
      },
    ],
  },

  {
    title: 'Counting Words With a Given Prefix',
    slug: 'counting-words-with-a-given-prefix',
    pattern: 'TRIE',
    difficulty: 'EASY',
    statement:
      'Return the number of strings in words that have pref as a prefix.\n\nExample: words=["pay","attention","practice","attend"], pref="at" → 2\nExample: words=["leetcode","win","loops","success"], pref="leetcode" → 1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'For each word, check whether it starts with pref.',
      },
      {
        level: 2,
        content:
          'Return sum(1 for w in words if w.startswith(pref)). O(n*|pref|). Trie: insert all words, walk pref in trie, count words in subtree.',
      },
    ],
  },

  {
    title: 'Check If a Word Occurs As a Prefix of Any Word in a Sentence',
    slug: 'check-if-a-word-occurs-as-a-prefix-of-any-word-in-a-sentence',
    pattern: 'TRIE',
    difficulty: 'EASY',
    statement:
      'Return the 1-indexed position of the first word in sentence that has searchWord as a prefix, or -1 if none.\n\nExample: sentence="i love eating burger", searchWord="burg" → 4\nExample: sentence="this problem is an easy problem", searchWord="pro" → 2\nExample: sentence="i am tired", searchWord="you" → -1',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Split the sentence into words and check each one in order.',
      },
      {
        level: 2,
        content:
          'For i,word in enumerate(sentence.split()): if word.startswith(searchWord): return i+1. Return -1. O(n*|searchWord|).',
      },
    ],
  },

  {
    title: 'Count Prefixes of a Given String',
    slug: 'count-prefixes-of-a-given-string',
    pattern: 'TRIE',
    difficulty: 'EASY',
    statement:
      'Return the number of strings in words that are a prefix of s.\n\nExample: words=["a","b","c","ab","bc","abc"], s="abc" → 3\nExample: words=["a","a"], s="aa" → 2',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'For each word, check whether s starts with that word (i.e., the word is a prefix of s).',
      },
      {
        level: 2,
        content:
          'Return sum(1 for w in words if s.startswith(w)). O(n*L). Trie: insert all words, walk s through the trie counting end-of-word markers encountered.',
      },
    ],
  },

  {
    title: 'Count Prefix and Suffix Pairs I',
    slug: 'count-prefix-and-suffix-pairs-i',
    pattern: 'TRIE',
    difficulty: 'EASY',
    statement:
      'Return the number of pairs (i,j) with i<j where words[i] is both a prefix AND a suffix of words[j].\n\nExample: words=["a","aba","ababa","aa"] → 4\nExample: words=["pa","papa","ma","mama"] → 2',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'For each pair (i,j) with i<j, check both conditions: words[j] starts with words[i], and words[j] ends with words[i].',
      },
      {
        level: 2,
        content:
          'count=0. For i in range(n): for j in range(i+1,n): t,s=words[j],words[i]; if t.startswith(s) and t.endswith(s): count++. Return count. O(n²L).',
      },
    ],
  },

  {
    title: 'Map Sum Pairs',
    slug: 'map-sum-pairs',
    pattern: 'TRIE',
    difficulty: 'EASY',
    statement:
      'Implement MapSum: insert(key, val) inserts/updates key→val. sum(prefix) returns the sum of all values whose keys start with prefix.\n\nExample: insert("apple",3); sum("ap")→3; insert("app",2); sum("ap")→5',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Augment each trie node with a cumulative value sum. On insert, update the delta (new_val - old_val) along the entire key path.',
      },
      {
        level: 2,
        content:
          'TrieNode: children, val=0. insert(key,v): delta=v-prev[key]; walk key, add delta at each node. sum(prefix): walk prefix, return node.val. O(L) both ops. HashMap key→old_val handles delta computation.',
      },
    ],
  },

  {
    title: 'Replace Words',
    slug: 'replace-words',
    pattern: 'TRIE',
    difficulty: 'EASY',
    statement:
      'Given a dictionary of roots and a sentence, replace each word with the shortest root it has as a prefix. If multiple roots match, use the shortest.\n\nExample: dictionary=["cat","bat","rat"], sentence="the cattle was rattled by the battery" → "the cat was rat by the bat"',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Build a trie from all roots. For each word in the sentence, traverse the trie and return the shortest matching root (the first end-of-root node reached).',
      },
      {
        level: 2,
        content:
          'Insert all roots; mark end nodes. For each word in sentence: walk trie character by character; if end_of_root reached: use that prefix. Else: keep full word. Join results. O(total_chars) build + O(total_sentence_chars) query.',
      },
    ],
  },

  {
    title: 'Longest Word in Dictionary',
    slug: 'longest-word-in-dictionary',
    pattern: 'TRIE',
    difficulty: 'EASY',
    statement:
      'Return the longest word that can be built one character at a time (every prefix must also exist in words). Return the lexicographically smallest on ties.\n\nExample: words=["w","wo","wor","word","world"] → "world"\nExample: words=["a","banana","app","appl","ap","apply","apple"] → "apple"',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Insert all words into a trie. Only traverse paths where every intermediate node is a complete word. The longest such path is the answer.',
      },
      {
        level: 2,
        content:
          'Build trie. BFS/DFS from root extending only through end_of_word nodes. Track the longest word (or smallest lexicographically at same length). Sort words first for tie-breaking. O(n log n + total_chars).',
      },
    ],
  },

  {
    title: 'Search Suggestions System',
    slug: 'search-suggestions-system',
    pattern: 'TRIE',
    difficulty: 'EASY',
    statement:
      'Given a sorted list of products and a searchWord, return for each prefix of searchWord the 3 lexicographically smallest products starting with that prefix.\n\nExample: products=["mobile","mouse","moneypot","monitor","mousepad"], searchWord="mouse" → [["mobile","moneypot","monitor"],["mobile","moneypot","monitor"],["mouse","mousepad"],["mouse","mousepad"],["mouse","mousepad"]]',
    hintCeiling: 2,
    hints: [
      {
        level: 1,
        content:
          'Sort products. For each prefix of searchWord, binary search to the first matching product and take up to 3.',
      },
      {
        level: 2,
        content:
          'Sort products. For i from 1..len(searchWord): prefix=searchWord[:i]; lo=bisect_left(products,prefix); take products[lo:lo+3] where each starts with prefix. O(n log n + m*log n). Trie alternative: DFS to collect top-3 per prefix node.',
      },
    ],
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    title: 'Implement Trie (Prefix Tree)',
    slug: 'implement-trie',
    pattern: 'TRIE',
    difficulty: 'MEDIUM',
    statement:
      'Implement insert(word), search(word) (exact match), and startsWith(prefix) on a trie.\n\nExample: insert("apple"); search("apple")→true; search("app")→false; startsWith("app")→true; insert("app"); search("app")→true',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A trie node has up to 26 children (one per letter) and a boolean marking word-end. insert/search/startsWith all walk from the root one character at a time.',
      },
      {
        level: 2,
        content:
          'TrieNode: children=[None]*26, is_end=False. insert: walk key, create nodes as needed, mark is_end. search: walk key, return node.is_end at end. startsWith: walk prefix, return node is not None at end. O(L) each.',
      },
      {
        level: 3,
        content:
          'Use index = ord(c)-ord(\'a\') to map characters to array slots. insert and startsWith differ only in the final return: startsWith just checks the node exists; search also checks is_end. A dict-based children map handles non-lowercase or variable alphabets.',
      },
    ],
  },

  {
    title: 'Design Add and Search Words Data Structure',
    slug: 'design-add-and-search-words-data-structure',
    pattern: 'TRIE',
    difficulty: 'MEDIUM',
    statement:
      'Design WordDictionary with addWord(word) and search(word). search supports \'.\' as a wildcard matching any single letter.\n\nExample: addWord("bad"); addWord("dad"); addWord("mad"); search("pad")→false; search("bad")→true; search(".ad")→true; search("b..")→true',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Standard trie for addWord. For search, when a \'.\' is encountered, try all 26 possible children recursively.',
      },
      {
        level: 2,
        content:
          'addWord: standard trie insert. search(word): DFS helper dfs(node, i): if i==len(word): return node.is_end. If word[i]==\'.\': return any(dfs(child,i+1) for child in node.children if child). Else: follow single child. O(L) add, O(26^dots * L) search worst case.',
      },
      {
        level: 3,
        content:
          'The wildcard makes worst-case exponential but depth is bounded by word length. An iterative approach maintains a set of currently active nodes and expands them for \'.\'. Each pass processes one character and at most multiplies active nodes by 26.',
      },
    ],
  },

  {
    title: 'Maximum XOR of Two Numbers in an Array',
    slug: 'maximum-xor-of-two-numbers-in-an-array',
    pattern: 'TRIE',
    difficulty: 'MEDIUM',
    statement:
      'Find the maximum XOR value of any two numbers in nums.\n\nExample: nums=[3,10,5,25,2,8] → 28 (5 XOR 25 = 28)\nExample: nums=[14,70,53,83,49,91,36,80,92,51,66,70] → 127',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Build a binary trie from all numbers (32 bits, MSB first). For each number, greedily follow the opposite bit at each level to maximize XOR.',
      },
      {
        level: 2,
        content:
          'Insert all nums as 32-bit binary into trie. For each num: walk from MSB, at each level try the opposite-bit child first (XOR bit = 1); accumulate XOR result. Return max. O(n*32).',
      },
      {
        level: 3,
        content:
          'Binary trie nodes have at most 2 children (0 and 1). For query num: at bit i, desired = 1-bit(num,i); if desired child exists: go there (XOR += 2^(31-i)); else go to the other child. Bit numbering: 31 down to 0 (MSB first). The greedy works because higher bits contribute more to XOR.',
      },
    ],
  },

  {
    title: 'Implement Magic Dictionary',
    slug: 'implement-magic-dictionary',
    pattern: 'TRIE',
    difficulty: 'MEDIUM',
    statement:
      'Implement MagicDictionary: buildDict(dictionary) and search(searchWord). search returns true if you can change exactly one character of searchWord to match a word in the dictionary.\n\nExample: buildDict(["hello","leetcode"]); search("hello")→false; search("hhllo")→true; search("hell")→false; search("leetcoded")→false',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each word in the dictionary, generate all versions with one character replaced by a placeholder. Check if searchWord appears in this set (without modification).',
      },
      {
        level: 2,
        content:
          'Trie DFS with a "change_remaining" flag. dfs(node, i, changed): if i==len(word): return changed==0 and node.is_end. For each child c: match = (c==word[i]); if match: dfs(child,i+1,changed) or if not changed: dfs(child,i+1,1). O(26*L) per search.',
      },
      {
        level: 3,
        content:
          'Alternatively: buildDict inserts all (word_length, {word_with_*_at_pos_k}) patterns into a set. search: for each position k in searchWord, replace word[k] with \'*\' and look up in the set. If searchWord itself is not in the dict but the lookup succeeds: return true. O(L²) build, O(L) search.',
      },
    ],
  },

  {
    title: 'Short Encoding of Words',
    slug: 'short-encoding-of-words',
    pattern: 'TRIE',
    difficulty: 'MEDIUM',
    statement:
      'Build the shortest reference string S where every word is a suffix of S ending with \'#\'. Return |S|.\n\nExample: words=["time","me","bell"] → 10 ("time#bell#")\nExample: words=["t"] → 2 ("t#")',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'A word does not need its own slot if it is a suffix of another word in the list. Insert reversed words into a trie — leaf nodes correspond to words that are not suffixes of others.',
      },
      {
        level: 2,
        content:
          'Insert reversed words into a trie. Words that create new leaf nodes are NOT suffixes of any other word. Answer = sum of (path_length + 1) for all leaf nodes. O(total_chars).',
      },
      {
        level: 3,
        content:
          'Reversing words converts the suffix problem into a prefix problem, which trues are designed to handle. Each leaf in the trie represents a word whose reverse is a unique shortest word (not a prefix of any other reversed word). Deduplicate input words first to avoid counting duplicates.',
      },
    ],
  },

  {
    title: 'Camelcase Matching',
    slug: 'camelcase-matching',
    pattern: 'TRIE',
    difficulty: 'MEDIUM',
    statement:
      'A query string matches a pattern if you can insert lowercase letters into pattern to get the query. Return match results for each query.\n\nExample: queries=["FooBar","FooBarTest","FootBall","FrameBuffer","ForceFeedBack"], pattern="FB" → [true,false,true,true,false]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Two-pointer match: walk through each query matching pattern characters in order. Any unmatched character in the query must be lowercase.',
      },
      {
        level: 2,
        content:
          'def match(q,p): j=0. For c in q: if j<len(p) and c==p[j]: j++. Elif c.isupper(): return False. Return j==len(p). Apply to each query. O(L) per query.',
      },
      {
        level: 3,
        content:
          'Pattern defines the required uppercase skeleton. The query must contain the pattern\'s characters as a subsequence, and every non-pattern character in the query must be lowercase (otherwise it would change the camelCase structure). Advance the pattern pointer on each match; reject if an uppercase character in the query doesn\'t match the current pattern character.',
      },
    ],
  },

  {
    title: 'Longest Word With All Prefixes',
    slug: 'longest-word-with-all-prefixes',
    pattern: 'TRIE',
    difficulty: 'MEDIUM',
    statement:
      'Return the longest word in words such that every prefix of that word also appears in words. On ties return the lexicographically smallest.\n\nExample: words=["k","ki","kir","kira","kiran"] → "kiran"\nExample: words=["a","banana","app","appl","ap","apply","apple"] → "apple"',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Build a trie. A valid word is one where every node along its path is marked as a word-end. Traverse only through marked nodes.',
      },
      {
        level: 2,
        content:
          'Build trie; mark end_of_word nodes. DFS from root extending only through end_of_word children. Track the longest word found (lex smallest on tie). O(n*L) build + O(total_trie_nodes) DFS.',
      },
      {
        level: 3,
        content:
          'Sort words lexicographically first for easy tie-breaking. During DFS, when exploring children in alphabetical order, the first complete path of maximum depth is the answer. A BFS level-by-level approach also works and naturally finds the deepest reachable word.',
      },
    ],
  },

  {
    title: 'Implement Trie II (Prefix Tree)',
    slug: 'implement-trie-ii',
    pattern: 'TRIE',
    difficulty: 'MEDIUM',
    statement:
      'Extend the trie with: insert(word), countWordsEqualTo(word), countWordsStartingWith(prefix), erase(word).\n\nExample: insert("apple"); insert("apple"); countWordsEqualTo("apple")→2; countWordsStartingWith("app")→2; erase("apple"); countWordsStartingWith("app")→1; countWordsEqualTo("apple")→1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Augment each trie node with two counters: pass_count (words passing through) and end_count (words ending here). Update both on insert and erase.',
      },
      {
        level: 2,
        content:
          'TrieNode: children, pass_count=0, end_count=0. insert: each node on path: pass_count++; last node: end_count++. erase: reverse — pass_count--; end_count--. countWordsStartingWith: walk prefix, return node.pass_count. countWordsEqualTo: walk word, return node.end_count. O(L) each.',
      },
      {
        level: 3,
        content:
          'pass_count counts how many words pass through (or end at) this node — equivalent to the size of the subtree\'s word set. end_count counts exact matches at this node. Erase is safe to call (word guaranteed to exist), so simple decrements are correct. No node deletion is needed.',
      },
    ],
  },

  {
    title: 'Extra Characters in a String',
    slug: 'extra-characters-in-a-string',
    pattern: 'TRIE',
    difficulty: 'MEDIUM',
    statement:
      'Split string s into substrings from dictionary to minimize leftover (non-dictionary) characters. Return the minimum number of leftover characters.\n\nExample: s="leetscode", dictionary=["leet","code","leetcode"] → 1\nExample: s="sayhelloworld", dictionary=["hello","world"] → 3',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'DP: dp[i] = minimum extra characters using s[0..i-1]. For each position, either skip the current character (+1 extra) or use a dictionary word starting here.',
      },
      {
        level: 2,
        content:
          'Build trie from dictionary. dp[0]=0. For i from 0..n-1: dp[i+1]=dp[i]+1 (skip s[i]). Walk trie from s[i] forward: for each dict word found ending at j: dp[j+1]=min(dp[j+1], dp[i]). Return dp[n]. O(n*L).',
      },
      {
        level: 3,
        content:
          'The trie enables O(L) lookup of all words starting at position i by walking forward while characters match trie nodes. Without a trie, you\'d scan O(|dict|) words per position. dp[n] represents minimum extra characters across the whole string.',
      },
    ],
  },

  {
    title: 'Remove Sub-Folders from the Filesystem',
    slug: 'remove-sub-folders-from-the-filesystem',
    pattern: 'TRIE',
    difficulty: 'MEDIUM',
    statement:
      'Given filesystem folder paths, remove all sub-folders (a path is a sub-folder if another path in the list is a proper prefix of it with a \'/\' separator).\n\nExample: folder=["/a","/a/b","/c/d","/c/d/e","/c/f"] → ["/a","/c/d","/c/f"]\nExample: folder=["/a","/a/b/c","/a/b/d"] → ["/a"]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort the paths. After sorting, a sub-folder always comes after its parent. Keep a path only if the last kept path is not a proper prefix of it.',
      },
      {
        level: 2,
        content:
          'Sort. result=[folder[0]]. For path in folder[1:]: if not path.startswith(result[-1]+"/"): result.append(path). Return result. O(n log n + total_chars). Trie on path components is equivalent.',
      },
      {
        level: 3,
        content:
          'The +"/"\' check distinguishes /a from /ab (both start with /a but only /a/b is a sub-folder of /a). Trie approach: split each path by \'/\', insert into a trie by components; mark folder nodes; during insertion, if you encounter a marked node, the current path is a sub-folder — stop.',
      },
    ],
  },

  // ── HARD ──────────────────────────────────────────────────────────────────

  {
    title: 'Prefix and Suffix Search',
    slug: 'prefix-and-suffix-search',
    pattern: 'TRIE',
    difficulty: 'HARD',
    statement:
      'Design WordFilter: WordFilter(words) initializes. f(pref, suff) returns the largest index i where words[i] has the given prefix and suffix, or -1 if none.\n\nExample: WordFilter(["apple"]); f("a","e")→0; f("b","")→-1',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Precompute all (prefix, suffix) combinations for each word and map them to the word\'s index (larger index overwrites smaller).',
      },
      {
        level: 2,
        content:
          'table={}. For i, word in enumerate(words): for p in all_prefixes(word): for s in all_suffixes(word): table[p+"#"+s]=i. f(pref,suff): return table.get(pref+"#"+suff,-1). O(n*L²) build, O(1) query.',
      },
      {
        level: 3,
        content:
          'Trie approach: for each word w, insert all strings of form "{suf}#{word}" into a prefix trie (one per suffix). Query: look up suff+"#"+pref in the trie, return the stored max index. O(n*L) build, O(L) query. The concatenation "{suf}#{word}" encodes both constraints in a single prefix lookup.',
      },
    ],
  },

  {
    title: 'Palindrome Pairs',
    slug: 'palindrome-pairs',
    pattern: 'TRIE',
    difficulty: 'HARD',
    statement:
      'Given unique words, return all pairs (i,j) where words[i] + words[j] is a palindrome.\n\nExample: words=["abcd","dcba","lls","s","sssll"] → [[0,1],[1,0],[3,2],[2,4]]\nExample: words=["bat","tab","cat"] → [[0,1],[1,0]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'For each word, consider all ways to split it into (left, right). If reverse(right) is in the dictionary and left is a palindrome: pair (dict[rev_right], i). If reverse(left) is in the dictionary and right is a palindrome: pair (i, dict[rev_left]).',
      },
      {
        level: 2,
        content:
          'word_map={word:i}. For word at index i, for split k=0..len(word): left=word[:k], right=word[k:]. If isPalin(left) and rev(right) in map and map[rev(right)]!=i: add (map[rev(right)],i). If isPalin(right) and rev(left) in map and k!=0: add (i,map[rev(left)]). O(n*L²).',
      },
      {
        level: 3,
        content:
          'k=0 case (left="") handles pairs where words[j]=reverse(words[i]). k=len(word) case handles words[i]=reverse(words[j]). Avoid duplicates: the k=0 case for one direction and k=len for the other might produce the same pair. Check map[rev(x)]!=i to exclude self-pairing. Trie of reversed words with palindrome suffix lists at each node is an alternative O(n*L²) approach.',
      },
    ],
  },

  {
    title: 'Concatenated Words',
    slug: 'concatenated-words',
    pattern: 'TRIE',
    difficulty: 'HARD',
    statement:
      'Return all words in the array that can be formed by concatenating at least two other shorter words from the same array.\n\nExample: words=["cat","cats","catsdogcats","dog","dogcatsdog","hippopotamuses","rat","ratcatdogcat"] → ["catsdogcats","dogcatsdog","ratcatdogcat"]\nExample: words=["cat","dog","catdog"] → ["catdog"]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort words by length. Build a trie from all words. For each word, check if it can be decomposed into 2+ shorter words already in the trie using DFS or DP.',
      },
      {
        level: 2,
        content:
          'Sort by length (shorter first). For each word: dp[i]=can s[0..i-1] be formed from dict words. dp[0]=True. For i from 1..n: for j<i: if dp[j] and s[j..i-1] in trie and (j>0 or more remain): dp[i]=True. Add word to trie after checking. O(n*L²).',
      },
      {
        level: 3,
        content:
          'Sort shorter words first so when checking a word, its components are already in the trie. The DP condition: dp[j]=True (prefix covered) AND s[j..i-1] is in trie AND (j>0 means at least one segment was found). The +1 to ensure at least 2 parts: require dp[j]=True and j>0 for the final segment, OR use a "part count" variable. Words added to trie only after their own check.',
      },
    ],
  },

  {
    title: 'Stream of Characters',
    slug: 'stream-of-characters',
    pattern: 'TRIE',
    difficulty: 'HARD',
    statement:
      'Design StreamChecker: query(c) adds c to the stream and returns true if any suffix of the current stream is a word in the given word list.\n\nExample: StreamChecker(["cd","f","kl"]); query(\'a\')→false; query(\'b\')→false; query(\'c\')→false; query(\'d\')→true; query(\'e\')→false; query(\'f\')→true',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Insert REVERSED words into a trie. Maintain a list of active trie nodes representing ongoing suffix matches. Each new character advances all active nodes.',
      },
      {
        level: 2,
        content:
          'Insert reversed words. active_nodes=[root]. For query(c): new_active=[]. For node in active_nodes+[root]: if c in node.children: child=node.children[c]; new_active.append(child); if child.is_end: return True. active_nodes=new_active. Return False. O(L) per query.',
      },
      {
        level: 3,
        content:
          'Reversed words in the trie means we match from the most recent character backward. The root is always added to new_active (starting a fresh potential match). Nodes that can\'t extend on character c are dropped. A node marked is_end means the reversed path from root to here is a dictionary word — i.e., the current stream suffix matches. O(max_word_length) active nodes at any time.',
      },
    ],
  },

  {
    title: 'Word Squares',
    slug: 'word-squares',
    pattern: 'TRIE',
    difficulty: 'HARD',
    statement:
      'Given words (all same length L), return all word squares: sequences of L words where the kth row and kth column spell the same word.\n\nExample: words=["area","lead","wall","lady","ball"] → [["wall","area","lead","lady"],["ball","area","lead","lady"]]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Backtrack row by row. At row k, the prefix of the required word is already determined by the k-th characters of rows 0..k-1. Look up words with that prefix using a trie.',
      },
      {
        level: 2,
        content:
          'Build prefix→[words] map (or trie). Backtrack: at row k, required prefix = "".join(square[i][k] for i in 0..k-1). Look up matching words. Try each as row k and recurse. O(n * 26^L) worst case but heavily pruned by prefix constraints.',
      },
      {
        level: 3,
        content:
          'The prefix for row k is determined by the k-th column of already-placed words. With the trie, collecting all words with a given prefix is O(subtree size). The backtracking prunes quickly: at depth k, only words consistent with the k×k top-left partial square are tried. Trie nodes can store a list of words in their subtree for fast candidate retrieval.',
      },
    ],
  },

  {
    title: 'Design Search Autocomplete System',
    slug: 'design-search-autocomplete-system',
    pattern: 'TRIE',
    difficulty: 'HARD',
    statement:
      'Autocomplete system: input(c) adds c to the current query and returns the top 3 most typed sentences (by frequency, alphabetically on tie). \'#\' commits the current sentence.\n\nExample: sentences=["i love you","island","iroman","i love leetcode"], times=[5,3,2,2]; input(\'i\')→["i love you","island","i love leetcode"]; input(\' \')→["i love you","i love leetcode"]; input(\'a\')→[]; input(\'#\')→[]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Store sentences with frequencies in a trie. Track the current trie node as characters are entered. Each node stores the top-3 sentences passing through it.',
      },
      {
        level: 2,
        content:
          'freq=HashMap. input(c): if c==\'#\': freq[current_input]++; reset trie cursor to root; return []. Else: advance trie cursor by c. Collect all words in current node\'s subtree, sort by (-freq, alpha), return top 3. O(subtree_size * log) per non-# input.',
      },
      {
        level: 3,
        content:
          'Optimization: store sorted top-3 candidates at each trie node (update on each insert/frequency change). Then each non-# query is O(L) to walk to the current prefix node + O(1) to read top-3. For \'#\': insert the new sentence into the trie (or update frequency) and propagate to all ancestors. A lazy approach — collect all subtree words per query — is simpler but O(subtree_size) per query.',
      },
    ],
  },

  {
    title: 'Maximum XOR With an Element From Array',
    slug: 'maximum-xor-with-an-element-from-array',
    pattern: 'TRIE',
    difficulty: 'HARD',
    statement:
      'Given nums and queries=[xi, mi], for each query return the maximum XOR of xi with any element of nums that is ≤ mi, or -1 if none exists.\n\nExample: nums=[0,1,2,3,4], queries=[[3,1],[1,3],[5,6]] → [3,3,7]\nExample: nums=[5,2,4,6,6,3], queries=[[12,4],[8,1],[6,3]] → [15,-1,5]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Sort queries by mi and nums by value. Process queries offline: for each query, insert all nums[j] ≤ mi into a binary trie, then query for max XOR with xi.',
      },
      {
        level: 2,
        content:
          'Sort queries by mi (keep original indices). Sort nums. Two-pointer: for each query [x,m]: insert all nums[j]≤m into trie. If trie empty: ans=-1. Else: greedily query max XOR. O((n+q)*32 + n log n + q log q).',
      },
      {
        level: 3,
        content:
          'Binary trie built incrementally. For query max XOR: at each bit from MSB, try the opposite bit child. If empty trie at query time (no nums ≤ m): return -1. The offline sort-and-two-pointer ensures the trie contains exactly the valid elements for each query. This extends problem 421 with the constraint ≤ m.',
      },
    ],
  },

  {
    title: 'Sum of Prefix Scores of Strings',
    slug: 'sum-of-prefix-scores-of-strings',
    pattern: 'TRIE',
    difficulty: 'HARD',
    statement:
      'For each word in words, return the sum over all prefixes of that word of: how many words in the array share that prefix.\n\nExample: words=["abc","ab","bc","b"] → [5,4,3,2]\nExample: words=["abcd"] → [4]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Build a trie where each node tracks how many words pass through it (a pass_count). For each word, sum the pass_counts of all nodes along its path.',
      },
      {
        level: 2,
        content:
          'Insert all words; each trie node increments pass_count on every insert. For each word: walk its path, sum pass_count at each node. O(total_chars) build and query.',
      },
      {
        level: 3,
        content:
          'pass_count at node d (depth d, representing prefix words[i][0..d-1]) equals the number of words sharing that prefix. The score for word w = sum of pass_counts from root to w\'s last node. Two separate passes: first insert all words, then query each word. This is O(Σ|word|) overall.',
      },
    ],
  },

  {
    title: 'Count Pairs With XOR in a Range',
    slug: 'count-pairs-with-xor-in-a-range',
    pattern: 'TRIE',
    difficulty: 'HARD',
    statement:
      'Return the number of pairs (i,j) with i<j such that lower ≤ nums[i] XOR nums[j] ≤ upper.\n\nExample: nums=[1,4,2,7], lower=2, upper=6 → 6\nExample: nums=[9,8,4,2,1], lower=5, upper=14 → 8',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'Decompose: count(upper) - count(lower-1) where count(k) = pairs with XOR ≤ k. Use a binary trie built incrementally: for each nums[i], query the trie (built from nums[0..i-1]) then insert nums[i].',
      },
      {
        level: 2,
        content:
          'countAtMost(k): build trie incrementally. For each nums[i]: count += queryAtMost(trie, nums[i], k); insertIntoTrie(trie, nums[i]). Return count. Answer = countAtMost(upper)-countAtMost(lower-1). O(n*32) each call.',
      },
      {
        level: 3,
        content:
          'queryAtMost(node, num, limit, bit): at each bit from MSB: if limit\'s bit = 1: go same-bit child and add its count (XOR bit=0, all valid); then go to opposite-bit child (XOR bit=1, continue checking). If limit\'s bit = 0: go same-bit child only. Each trie node stores a count of inserted numbers in its subtree, enabling O(1) subtree count queries.',
      },
    ],
  },

  {
    title: 'Maximum Genetic Difference Query',
    slug: 'maximum-genetic-difference-query',
    pattern: 'TRIE',
    difficulty: 'HARD',
    statement:
      'Given a rooted tree and queries [nodei, vali], for each query return the maximum XOR between vali and any node value on the path from root to nodei.\n\nExample: parents=[-1,0,1,1], queries=[[0,2],[3,2],[2,5]] → [2,3,7]\nExample: parents=[-1,0,2,1,0,2,2], queries=[[0,5],[3,2],[4,1]] → [5,3,1]',
    hintCeiling: 3,
    hints: [
      {
        level: 1,
        content:
          'DFS the tree, maintaining a binary trie of all node values on the current root-to-node path. Process queries at each node by querying the trie for max XOR with vali.',
      },
      {
        level: 2,
        content:
          'Group queries by node. DFS: on entering node u: insert u\'s value into trie. Process all queries at u (max XOR lookup). Recurse on children. On leaving u: delete u\'s value from trie. O((n+q)*32).',
      },
      {
        level: 3,
        content:
          'The trie needs dynamic insert and delete — use a count per node (increment on enter, decrement on exit). For max XOR query at depth 32: greedily choose the opposite bit if that child has count>0. The path from root to nodei is exactly the set of active values in the trie during nodei\'s DFS visit. O(32) per insert/delete/query.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding Batch 18 — TRIE (30 problems)...\n');

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
