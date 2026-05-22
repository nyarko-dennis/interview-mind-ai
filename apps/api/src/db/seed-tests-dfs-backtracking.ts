import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, sql } from 'drizzle-orm';
import * as schema from './schema';
const { problems } = schema;

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

// ---------------------------------------------------------------------------
// Programmatic Test Runner Compiler & Serializer
// ---------------------------------------------------------------------------

function serializeVal(val: any, lang: string, type?: string): string {
  if (val === null || val === undefined) {
    return lang === 'python' ? 'None' : 'null';
  }
  if (typeof val === 'boolean') {
    return lang === 'python' ? (val ? 'True' : 'False') : (val ? 'true' : 'false');
  }
  if (typeof val === 'string') {
    return JSON.stringify(val);
  }
  if (typeof val === 'number') {
    return val.toString();
  }
  if (Array.isArray(val)) {
    if (lang === 'python' || lang === 'javascript' || lang === 'typescript') {
      return '[' + val.map(x => serializeVal(x, lang, type)).join(', ') + ']';
    }
    if (lang === 'kotlin') {
      if (val.length === 0) {
        if (type === 'char_array') return 'charArrayOf()';
        if (type === 'string_array') return 'arrayOf<String>()';
        if (type === 'int_array_2d') return 'arrayOf<IntArray>()';
        return 'intArrayOf()';
      }
      if (Array.isArray(val[0])) {
        if (typeof val[0][0] === 'string') {
          if (type === 'char_array_2d') {
            return `arrayOf(${val.map(row => `charArrayOf(${row.map(c => `'${c}'`).join(',')})`).join(',')})`;
          }
          return `arrayOf(${val.map(row => `arrayOf(${row.map(s => serializeVal(s, lang)).join(',')})`).join(',')})`;
        }
        return `arrayOf(${val.map(row => `intArrayOf(${row.join(',')})`).join(',')})`;
      }
      if (typeof val[0] === 'string') {
        if (type === 'char_array') {
          return `charArrayOf(${val.map(c => `'${c}'`).join(',')})`;
        }
        return `arrayOf(${val.map(s => serializeVal(s, lang)).join(',')})`;
      }
      return `intArrayOf(${val.join(',')})`;
    }
  }
  return JSON.stringify(val);
}

function buildPythonRunner(funcName: string, type: string, testCases: any[]): string {
  let code = `_pass = _total = 0\n`;
  if (type === 'unordered_list') {
    code += `def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    if sorted(result or []) == sorted(expected or []):
        _pass += 1\n\n`;
  } else {
    code += `def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    if result == expected:
        _pass += 1\n\n`;
  }

  testCases.forEach((tc, idx) => {
    const label = tc.label || `test_${idx}`;
    const argsStr = tc.inputs.map(x => serializeVal(x, 'python')).join(', ');
    code += `_t(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'python')}, ${JSON.stringify(label)})\n`;
  });

  code += `print(f"{_pass}/{_total} tests passed")`;
  return code;
}

function buildJSRunner(funcName: string, type: string, testCases: any[]): string {
  let code = `let _pass = 0, _total = 0;\n`;
  if (type === 'unordered_list') {
    code += `function _t(r, e) {
  _total++;
  if (JSON.stringify([...(r || [])].sort()) === JSON.stringify([...(e || [])].sort())) _pass++;
}\n\n`;
  } else {
    code += `function _t(r, e) { _total++; if (JSON.stringify(r) === JSON.stringify(e)) _pass++; }\n\n`;
  }

  testCases.forEach((tc, idx) => {
    const argsStr = tc.inputs.map(x => serializeVal(x, 'javascript')).join(', ');
    code += `_t(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'javascript')});\n`;
  });

  code += `console.log(\`\${_pass}/\${_total} tests passed\`);`;
  return code;
}

function buildTSRunner(funcName: string, type: string, testCases: any[]): string {
  let code = `let _pass = 0, _total = 0;\n`;
  if (type === 'unordered_list') {
    code += `function _t(r: any, e: any): void {
  _total++;
  if (JSON.stringify([...(r || [])].sort()) === JSON.stringify([...(e || [])].sort())) _pass++;
}\n\n`;
  } else {
    code += `function _t(r: any, e: any): void { _total++; if (JSON.stringify(r) === JSON.stringify(e)) _pass++; }\n\n`;
  }

  testCases.forEach((tc, idx) => {
    const argsStr = tc.inputs.map(x => serializeVal(x, 'typescript')).join(', ');
    code += `_t(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'typescript')});\n`;
  });

  code += `console.log(\`\${_pass}/\${_total} tests passed\`);`;
  return code;
}

function buildKotlinRunner(funcName: string, type: string, testCases: any[], inputTypes?: string[], expectedType?: string): string {
  let code = `fun main() {\nvar _pass = 0; var _total = 0\n`;
  code += `fun _t(r: Any?, e: Any?) {
    _total++
    val match = when {
        r is IntArray && e is IntArray -> r.contentEquals(e)
        r is CharArray && e is CharArray -> r.contentEquals(e)
        r is Array<*> && e is Array<*> -> r.contentDeepEquals(e)
        r is List<*> && e is List<*> -> r == e
        else -> r == e
    }
    if (match) _pass++
}\n`;

  testCases.forEach((tc, idx) => {
    const argsStr = tc.inputs.map((x, i) => serializeVal(x, 'kotlin', inputTypes ? inputTypes[i] : undefined)).join(', ');
    const expStr = serializeVal(tc.expected, 'kotlin', expectedType);
    code += `_t(${funcName}(${argsStr}), ${expStr})\n`;
  });

  code += `println("\$_pass/\$_total tests passed")\n}`;
  return code;
}

const PY_TREE_DEFS = `
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def buildTree(arr):
    if not arr: return None
    root = TreeNode(arr[0])
    q = [root]
    i = 1
    while q and i < len(arr):
        curr = q.pop(0)
        if i < len(arr) and arr[i] is not None:
            curr.left = TreeNode(arr[i])
            q.append(curr.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            curr.right = TreeNode(arr[i])
            q.append(curr.right)
        i += 1
    return root

def isSameTree(p, q):
    if not p and not q: return True
    if not p or not q: return False
    return p.val == q.val and isSameTree(p.left, q.left) and isSameTree(p.right, q.right)
`;

const JS_TREE_DEFS = `
class TreeNode {
    constructor(val, left, right) {
        this.val = (val===undefined ? 0 : val);
        this.left = (left===undefined ? null : left);
        this.right = (right===undefined ? null : right);
    }
}
function buildTree(arr) {
    if (!arr || arr.length === 0) return null;
    let root = new TreeNode(arr[0]);
    let q = [root];
    let i = 1;
    while (q.length > 0 && i < arr.length) {
        let curr = q.shift();
        if (arr[i] !== null && arr[i] !== undefined) {
            curr.left = new TreeNode(arr[i]);
            q.push(curr.left);
        }
        i++;
        if (i < arr.length && arr[i] !== null && arr[i] !== undefined) {
            curr.right = new TreeNode(arr[i]);
            q.push(curr.right);
        }
        i++;
    }
    return root;
}
function isSameTree(p, q) {
    if (!p && !q) return true;
    if (!p || !q) return false;
    return p.val === q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}
`;

const TS_TREE_DEFS = `
class TreeNode {
    val: number;
    left: TreeNode | null;
    right: TreeNode | null;
    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
        this.val = (val===undefined ? 0 : val);
        this.left = (left===undefined ? null : left);
        this.right = (right===undefined ? null : right);
    }
}
function buildTree(arr: (number | null)[]): TreeNode | null {
    if (!arr || arr.length === 0) return null;
    let root = new TreeNode(arr[0]!);
    let q: TreeNode[] = [root];
    let i = 1;
    while (q.length > 0 && i < arr.length) {
        let curr = q.shift()!;
        if (arr[i] !== null && arr[i] !== undefined) {
            curr.left = new TreeNode(arr[i]!);
            q.push(curr.left);
        }
        i++;
        if (i < arr.length && arr[i] !== null && arr[i] !== undefined) {
            curr.right = new TreeNode(arr[i]!);
            q.push(curr.right);
        }
        i++;
    }
    return root;
}
function isSameTree(p: TreeNode | null, q: TreeNode | null): boolean {
    if (!p && !q) return true;
    if (!p || !q) return false;
    return p.val === q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}
`;

const KT_TREE_DEFS = `
class TreeNode(var \`val\`: Int) {
    var left: TreeNode? = null
    var right: TreeNode? = null
}
fun buildTree(arr: List<Int?>): TreeNode? {
    if (arr.isEmpty() || arr[0] == null) return null
    val root = TreeNode(arr[0]!!)
    val q = mutableListOf(root)
    var i = 1
    while (q.isNotEmpty() && i < arr.size) {
        val curr = q.removeAt(0)
        if (i < arr.size && arr[i] != null) {
            curr.left = TreeNode(arr[i]!!)
            q.add(curr.left!!)
        }
        i++
        if (i < arr.size && arr[i] != null) {
            curr.right = TreeNode(arr[i]!!)
            q.add(curr.right!!)
        }
        i++
    }
    return root
}
fun isSameTree(p: TreeNode?, q: TreeNode?): Boolean {
    if (p == null && q == null) return true
    if (p == null || q == null) return false
    return p.\`val\` == q.\`val\` && isSameTree(p.left, q.left) && isSameTree(p.right, q.right)
}
`;

// ---------------------------------------------------------------------------
// 30 DFS & BACKTRACKING PROBLEMS DEFINITIONS
// ---------------------------------------------------------------------------

const PROBLEMS_DATA: Array<{
  slug: string;
  type?: string;
  functionName?: Record<string, string>;
  inputTypes?: string[];
  expectedType?: string;
  stubs: Record<string, string>;
  testCases?: any[];
  customRunner?: Record<string, string>;
}> = [
  {
    slug: 'subsets',
    type: 'unordered_list',
    functionName: { python: 'subsets', javascript: 'subsets', typescript: 'subsets', kotlin: 'subsets' },
    stubs: {
      python: `def subsets(nums: list) -> list:\n    pass`,
      javascript: `function subsets(nums) {\n\n}`,
      typescript: `function subsets(nums: number[]): number[][] {\n\n}`,
      kotlin: `fun subsets(nums: IntArray): List<List<Int>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,2,3], expected: [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]] },
        { nums: [0], expected: [[],[0]] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.nums], expected: tc.expected };
    })
  },
  {
    slug: 'binary-tree-paths',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef binaryTreePaths(root: TreeNode) -> list:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction binaryTreePaths(root) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction binaryTreePaths(root: TreeNode | null): string[] {\n    return [];\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun binaryTreePaths(root: TreeNode?): List<String> {\n    return listOf()\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, expected):
    global _pass, _total
    _total += 1
    if sorted(binaryTreePaths(buildTree(arr))) == sorted(expected):
        _pass += 1
for _ in range(15):
    _t([1,2,3,None,5], ["1->2->5","1->3"])
    _t([1], ["1"])
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, expected) {
    _total++;
    let res = binaryTreePaths(buildTree(arr)) || [];
    if (JSON.stringify([...res].sort()) === JSON.stringify([...expected].sort())) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([1,2,3,null,5], ["1->2->5","1->3"]);
    _t([1], ["1"]);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], expected: string[]) {
    _total++;
    let res = binaryTreePaths(buildTree(arr)) || [];
    if (JSON.stringify([...res].sort()) === JSON.stringify([...expected].sort())) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([1,2,3,null,5], ["1->2->5","1->3"]);
    _t([1], ["1"]);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, expected: List<String>) {
        _total++
        if (binaryTreePaths(buildTree(arr)).sorted() == expected.sorted()) _pass++
    }
    for (i in 1..15) {
        _t(listOf(1,2,3,null,5), listOf("1->2->5","1->3"))
        _t(listOf(1), listOf("1"))
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'letter-case-permutation',
    type: 'unordered_list',
    functionName: { python: 'letterCasePermutation', javascript: 'letterCasePermutation', typescript: 'letterCasePermutation', kotlin: 'letterCasePermutation' },
    stubs: {
      python: `def letterCasePermutation(s: str) -> list:\n    pass`,
      javascript: `function letterCasePermutation(s) {\n\n}`,
      typescript: `function letterCasePermutation(s: string): string[] {\n\n}`,
      kotlin: `fun letterCasePermutation(s: String): List<String> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "a1b2", expected: ["a1b2","a1B2","A1b2","A1B2"] },
        { s: "3z4", expected: ["3z4","3Z4"] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.s], expected: tc.expected };
    })
  },
  {
    slug: 'balanced-binary-tree',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef isBalanced(root: TreeNode) -> bool:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction isBalanced(root) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction isBalanced(root: TreeNode | null): boolean {\n    return false;\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun isBalanced(root: TreeNode?): Boolean {\n    return false\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, expected):
    global _pass, _total
    _total += 1
    if isBalanced(buildTree(arr)) == expected:
        _pass += 1
for _ in range(15):
    _t([3,9,20,None,None,15,7], True)
    _t([1,2,2,3,3,None,None,4,4], False)
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, expected) {
    _total++;
    if (isBalanced(buildTree(arr)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([3,9,20,null,null,15,7], true);
    _t([1,2,2,3,3,null,null,4,4], false);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], expected: boolean) {
    _total++;
    if (isBalanced(buildTree(arr)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([3,9,20,null,null,15,7], true);
    _t([1,2,2,3,3,null,null,4,4], false);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, expected: Boolean) {
        _total++
        if (isBalanced(buildTree(arr)) == expected) _pass++
    }
    for (i in 1..15) {
        _t(listOf(3,9,20,null,null,15,7), true)
        _t(listOf(1,2,2,3,3,null,null,4,4), false)
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'diameter-of-binary-tree',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef diameterOfBinaryTree(root: TreeNode) -> int:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction diameterOfBinaryTree(root) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction diameterOfBinaryTree(root: TreeNode | null): number {\n    return 0;\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun diameterOfBinaryTree(root: TreeNode?): Int {\n    return 0\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, expected):
    global _pass, _total
    _total += 1
    if diameterOfBinaryTree(buildTree(arr)) == expected:
        _pass += 1
for _ in range(15):
    _t([1,2,3,4,5], 3)
    _t([1,2], 1)
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, expected) {
    _total++;
    if (diameterOfBinaryTree(buildTree(arr)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([1,2,3,4,5], 3);
    _t([1,2], 1);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], expected: number) {
    _total++;
    if (diameterOfBinaryTree(buildTree(arr)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([1,2,3,4,5], 3);
    _t([1,2], 1);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, expected: Int) {
        _total++
        if (diameterOfBinaryTree(buildTree(arr)) == expected) _pass++
    }
    for (i in 1..15) {
        _t(listOf(1,2,3,4,5), 3)
        _t(listOf(1,2), 1)
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'sum-of-left-leaves',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef sumOfLeftLeaves(root: TreeNode) -> int:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction sumOfLeftLeaves(root) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction sumOfLeftLeaves(root: TreeNode | null): number {\n    return 0;\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun sumOfLeftLeaves(root: TreeNode?): Int {\n    return 0\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, expected):
    global _pass, _total
    _total += 1
    if sumOfLeftLeaves(buildTree(arr)) == expected:
        _pass += 1
for _ in range(15):
    _t([3,9,20,None,None,15,7], 24)
    _t([1], 0)
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, expected) {
    _total++;
    if (sumOfLeftLeaves(buildTree(arr)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([3,9,20,null,null,15,7], 24);
    _t([1], 0);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], expected: number) {
    _total++;
    if (sumOfLeftLeaves(buildTree(arr)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([3,9,20,null,null,15,7], 24);
    _t([1], 0);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, expected: Int) {
        _total++
        if (sumOfLeftLeaves(buildTree(arr)) == expected) _pass++
    }
    for (i in 1..15) {
        _t(listOf(3,9,20,null,null,15,7), 24)
        _t(listOf(1), 0)
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'leaf-similar-trees',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef leafSimilar(root1: TreeNode, root2: TreeNode) -> bool:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction leafSimilar(root1, root2) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction leafSimilar(root1: TreeNode | null, root2: TreeNode | null): boolean {\n    return false;\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun leafSimilar(root1: TreeNode?, root2: TreeNode?): Boolean {\n    return false\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr1, arr2, expected):
    global _pass, _total
    _total += 1
    if leafSimilar(buildTree(arr1), buildTree(arr2)) == expected:
        _pass += 1
for _ in range(15):
    _t([3,5,1,6,2,9,8,None,None,7,4], [3,5,1,6,7,4,2,9,8], True)
    _t([1,2,3], [1,3,2], False)
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr1, arr2, expected) {
    _total++;
    if (leafSimilar(buildTree(arr1), buildTree(arr2)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([3,5,1,6,2,9,8,null,null,7,4], [3,5,1,6,7,4,2,9,8], true);
    _t([1,2,3], [1,3,2], false);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr1: (number|null)[], arr2: (number|null)[], expected: boolean) {
    _total++;
    if (leafSimilar(buildTree(arr1), buildTree(arr2)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([3,5,1,6,2,9,8,null,null,7,4], [3,5,1,6,7,4,2,9,8], true);
    _t([1,2,3], [1,3,2], false);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr1: List<Int?>, arr2: List<Int?>, expected: Boolean) {
        _total++
        if (leafSimilar(buildTree(arr1), buildTree(arr2)) == expected) _pass++
    }
    for (i in 1..15) {
        _t(listOf(3,5,1,6,2,9,8,null,null,7,4), listOf(3,5,1,6,7,4,2,9,8), true)
        _t(listOf(1,2,3), listOf(1,3,2), false)
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'convert-sorted-array-to-binary-search-tree',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef sortedArrayToBST(nums: list) -> TreeNode:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction sortedArrayToBST(nums) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction sortedArrayToBST(nums: number[]): TreeNode | null {\n    return null;\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun sortedArrayToBST(nums: IntArray): TreeNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
def check_bst(root, arr):
    if not root and not arr: return True
    if not root or not arr: return False
    res = []
    def inorder(node):
        if not node: return
        inorder(node.left)
        res.append(node.val)
        inorder(node.right)
    inorder(root)
    if res != arr: return False
    def height(node):
        if not node: return 0
        lh = height(node.left)
        if lh == -1: return -1
        rh = height(node.right)
        if rh == -1: return -1
        if abs(lh - rh) > 1: return -1
        return max(lh, rh) + 1
    return height(root) != -1

_pass = _total = 0
for _ in range(15):
    _total += 1
    arr = [-10,-3,0,5,9]
    if check_bst(sortedArrayToBST(arr), arr):
        _pass += 1
    _total += 1
    arr2 = [1,3]
    if check_bst(sortedArrayToBST(arr2), arr2):
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
function checkBST(root, arr) {
    if (!root && (!arr || arr.length === 0)) return true;
    if (!root || !arr) return false;
    let res = [];
    function inorder(node) {
        if (!node) return;
        inorder(node.left);
        res.push(node.val);
        inorder(node.right);
    }
    inorder(root);
    if (JSON.stringify(res) !== JSON.stringify(arr)) return false;
    function height(node) {
        if (!node) return 0;
        let lh = height(node.left);
        if (lh === -1) return -1;
        let rh = height(node.right);
        if (rh === -1) return -1;
        if (Math.abs(lh - rh) > 1) return -1;
        return Math.max(lh, rh) + 1;
    }
    return height(root) !== -1;
}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let arr = [-10,-3,0,5,9];
    if (checkBST(sortedArrayToBST(arr), arr)) _pass++;
    _total++;
    let arr2 = [1,3];
    if (checkBST(sortedArrayToBST(arr2), arr2)) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
function checkBST(root: TreeNode | null, arr: number[]): boolean {
    if (!root && (!arr || arr.length === 0)) return true;
    if (!root || !arr) return false;
    let res: number[] = [];
    function inorder(node: TreeNode | null) {
        if (!node) return;
        inorder(node.left);
        res.push(node.val);
        inorder(node.right);
    }
    inorder(root);
    if (JSON.stringify(res) !== JSON.stringify(arr)) return false;
    function height(node: TreeNode | null): number {
        if (!node) return 0;
        let lh = height(node.left);
        if (lh === -1) return -1;
        let rh = height(node.right);
        if (rh === -1) return -1;
        if (Math.abs(lh - rh) > 1) return -1;
        return Math.max(lh, rh) + 1;
    }
    return height(root) !== -1;
}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let arr = [-10,-3,0,5,9];
    if (checkBST(sortedArrayToBST(arr), arr)) _pass++;
    _total++;
    let arr2 = [1,3];
    if (checkBST(sortedArrayToBST(arr2), arr2)) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun checkBST(root: TreeNode?, arr: IntArray): Boolean {
    if (root == null && arr.isEmpty()) return true
    if (root == null) return false
    val res = mutableListOf<Int>()
    fun inorder(node: TreeNode?) {
        if (node == null) return
        inorder(node.left)
        res.add(node.\`val\`)
        inorder(node.right)
    }
    inorder(root)
    if (res != arr.toList()) return false
    fun height(node: TreeNode?): Int {
        if (node == null) return 0
        val lh = height(node.left)
        if (lh == -1) return -1
        val rh = height(node.right)
        if (rh == -1) return -1
        if (Math.abs(lh - rh) > 1) return -1
        return Math.max(lh, rh) + 1
    }
    return height(root) != -1
}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val arr = intArrayOf(-10,-3,0,5,9)
        if (checkBST(sortedArrayToBST(arr), arr)) _pass++
        _total++
        val arr2 = intArrayOf(1,3)
        if (checkBST(sortedArrayToBST(arr2), arr2)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'maximum-depth-of-n-ary-tree',
    stubs: {
      python: `class Node:\n    def __init__(self, val=None, children=None):\n        self.val = val\n        self.children = children if children is not None else []\n\ndef maxDepth(root: Node) -> int:\n    pass`,
      javascript: `class Node {\n    constructor(val, children) {\n        this.val = val;\n        this.children = children || [];\n    }\n}\nfunction maxDepth(root) {\n\n}`,
      typescript: `class Node {\n    val: number;\n    children: Node[];\n    constructor(val?: number, children?: Node[]) {\n        this.val = (val===undefined ? 0 : val);\n        this.children = (children===undefined ? [] : children);\n    }\n}\nfunction maxDepth(root: Node | null): number {\n    return 0;\n}`,
      kotlin: `class Node(var \`val\`: Int) {\n    var children: List<Node?> = listOf()\n}\nfun maxDepth(root: Node?): Int {\n    return 0\n}`
    },
    customRunner: {
      python: `
class Node:
    def __init__(self, val=None, children=None):
        self.val = val
        self.children = children if children is not None else []

def buildNaryTree(arr):
    if not arr: return None
    root = Node(arr[0])
    q = [root]
    i = 2
    while q and i < len(arr):
        curr = q.pop(0)
        children = []
        while i < len(arr) and arr[i] is not None:
            child = Node(arr[i])
            children.append(child)
            q.append(child)
            i += 1
        curr.children = children
        i += 1
    return root

_pass = _total = 0
for _ in range(15):
    _total += 1
    if maxDepth(buildNaryTree([1,None,3,2,4,None,5,6])) == 3:
        _pass += 1
    _total += 1
    if maxDepth(buildNaryTree([1,None,2,3,4,5,None,None,6,7,None,8,None,9,10,None,None,11,None,12,None,13,None,None,14])) == 5:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
class Node {
    constructor(val, children) {
        this.val = val;
        this.children = children || [];
    }
}
function buildNaryTree(arr) {
    if (!arr || arr.length === 0) return null;
    let root = new Node(arr[0]);
    let q = [root];
    let i = 2;
    while (q.length > 0 && i < arr.length) {
        let curr = q.shift();
        let children = [];
        while (i < arr.length && arr[i] !== null) {
            let child = new Node(arr[i]);
            children.push(child);
            q.push(child);
            i++;
        }
        curr.children = children;
        i++;
    }
    return root;
}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    if (maxDepth(buildNaryTree([1,null,3,2,4,null,5,6])) === 3) _pass++;
    _total++;
    if (maxDepth(buildNaryTree([1,null,2,3,4,5,null,null,6,7,null,8,null,9,10,null,null,11,null,12,null,13,null,null,14])) === 5) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
class Node {
    val: number;
    children: Node[];
    constructor(val?: number, children?: Node[]) {
        this.val = (val===undefined ? 0 : val);
        this.children = (children===undefined ? [] : children);
    }
}
function buildNaryTree(arr: (number|null)[]): Node | null {
    if (!arr || arr.length === 0) return null;
    let root = new Node(arr[0]!);
    let q: Node[] = [root];
    let i = 2;
    while (q.length > 0 && i < arr.length) {
        let curr = q.shift()!;
        let children: Node[] = [];
        while (i < arr.length && arr[i] !== null) {
            let child = new Node(arr[i]!);
            children.push(child);
            q.push(child);
            i++;
        }
        curr.children = children;
        i++;
    }
    return root;
}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    if (maxDepth(buildNaryTree([1,null,3,2,4,null,5,6])) === 3) _pass++;
    _total++;
    if (maxDepth(buildNaryTree([1,null,2,3,4,5,null,null,6,7,null,8,null,9,10,null,null,11,null,12,null,13,null,null,14])) === 5) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
class Node(var \`val\`: Int) {
    var children: List<Node?> = listOf()
}
fun buildNaryTree(arr: List<Int?>): Node? {
    if (arr.isEmpty() || arr[0] == null) return null
    val root = Node(arr[0]!!)
    val q = mutableListOf(root)
    var i = 2
    while (q.isNotEmpty() && i < arr.size) {
        val curr = q.removeAt(0)
        val children = mutableListOf<Node?>()
        while (i < arr.size && arr[i] != null) {
            val child = Node(arr[i]!!)
            children.add(child)
            q.add(child)
            i++
        }
        curr.children = children
        i++
    }
    return root
}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        if (maxDepth(buildNaryTree(listOf(1,null,3,2,4,null,5,6))) == 3) _pass++
        _total++
        if (maxDepth(buildNaryTree(listOf(1,null,2,3,4,5,null,null,6,7,null,8,null,9,10,null,null,11,null,12,null,13,null,null,14))) == 5) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'find-mode-in-binary-search-tree',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef findMode(root: TreeNode) -> list:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction findMode(root) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction findMode(root: TreeNode | null): number[] {\n    return [];\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun findMode(root: TreeNode?): IntArray {\n    return intArrayOf()\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, expected):
    global _pass, _total
    _total += 1
    if sorted(findMode(buildTree(arr))) == sorted(expected):
        _pass += 1
for _ in range(15):
    _t([1,None,2,2], [2])
    _t([0], [0])
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, expected) {
    _total++;
    let res = findMode(buildTree(arr)) || [];
    if (JSON.stringify([...res].sort()) === JSON.stringify([...expected].sort())) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([1,null,2,2], [2]);
    _t([0], [0]);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], expected: number[]) {
    _total++;
    let res = findMode(buildTree(arr)) || [];
    if (JSON.stringify([...res].sort()) === JSON.stringify([...expected].sort())) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([1,null,2,2], [2]);
    _t([0], [0]);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, expected: IntArray) {
        _total++
        if (findMode(buildTree(arr)).sorted() == expected.sorted()) _pass++
    }
    for (i in 1..15) {
        _t(listOf(1,null,2,2), intArrayOf(2))
        _t(listOf(0), intArrayOf(0))
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'cousins-in-binary-tree',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef isCousins(root: TreeNode, x: int, y: int) -> bool:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction isCousins(root, x, y) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction isCousins(root: TreeNode | null, x: number, y: number): boolean {\n    return false;\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun isCousins(root: TreeNode?, x: Int, y: Int): Boolean {\n    return false\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, x, y, expected):
    global _pass, _total
    _total += 1
    if isCousins(buildTree(arr), x, y) == expected:
        _pass += 1
for _ in range(10):
    _t([1,2,3,4], 4, 3, False)
    _t([1,2,3,None,4,None,5], 5, 4, True)
    _t([1,2,3,None,4], 2, 3, False)
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, x, y, expected) {
    _total++;
    if (isCousins(buildTree(arr), x, y) === expected) _pass++;
}
for (let i = 0; i < 10; i++) {
    _t([1,2,3,4], 4, 3, false);
    _t([1,2,3,null,4,null,5], 5, 4, true);
    _t([1,2,3,null,4], 2, 3, false);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], x: number, y: number, expected: boolean) {
    _total++;
    if (isCousins(buildTree(arr), x, y) === expected) _pass++;
}
for (let i = 0; i < 10; i++) {
    _t([1,2,3,4], 4, 3, false);
    _t([1,2,3,null,4,null,5], 5, 4, true);
    _t([1,2,3,null,4], 2, 3, false);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, x: Int, y: Int, expected: Boolean) {
        _total++
        if (isCousins(buildTree(arr), x, y) == expected) _pass++
    }
    for (i in 1..10) {
        _t(listOf(1,2,3,4), 4, 3, false)
        _t(listOf(1,2,3,null,4,null,5), 5, 4, true)
        _t(listOf(1,2,3,null,4), 2, 3, false)
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'permutations',
    type: 'unordered_list',
    functionName: { python: 'permute', javascript: 'permute', typescript: 'permute', kotlin: 'permute' },
    stubs: {
      python: `def permute(nums: list) -> list:\n    pass`,
      javascript: `function permute(nums) {\n\n}`,
      typescript: `function permute(nums: number[]): number[][] {\n\n}`,
      kotlin: `fun permute(nums: IntArray): List<List<Int>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,2,3], expected: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]] },
        { nums: [0,1], expected: [[0,1],[1,0]] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.nums], expected: tc.expected };
    })
  },
  {
    slug: 'combinations',
    type: 'unordered_list',
    functionName: { python: 'combine', javascript: 'combine', typescript: 'combine', kotlin: 'combine' },
    stubs: {
      python: `def combine(n: int, k: int) -> list:\n    pass`,
      javascript: `function combine(n, k) {\n\n}`,
      typescript: `function combine(n: number, k: number): number[][] {\n\n}`,
      kotlin: `fun combine(n: Int, k: Int): List<List<Int>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 4, k: 2, expected: [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]] },
        { n: 1, k: 1, expected: [[1]] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.n, tc.k], expected: tc.expected };
    })
  },
  {
    slug: 'combination-sum',
    type: 'unordered_list',
    functionName: { python: 'combinationSum', javascript: 'combinationSum', typescript: 'combinationSum', kotlin: 'combinationSum' },
    stubs: {
      python: `def combinationSum(candidates: list, target: int) -> list:\n    pass`,
      javascript: `function combinationSum(candidates, target) {\n\n}`,
      typescript: `function combinationSum(candidates: number[], target: number): number[][] {\n\n}`,
      kotlin: `fun combinationSum(candidates: IntArray, target: Int): List<List<Int>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { candidates: [2,3,6,7], target: 7, expected: [[2,2,3],[7]] },
        { candidates: [2,3,5], target: 8, expected: [[2,2,2,2],[2,3,3],[3,5]] },
        { candidates: [2], target: 1, expected: [] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.candidates, tc.target], expected: tc.expected };
    })
  },
  {
    slug: 'combination-sum-ii',
    type: 'unordered_list',
    functionName: { python: 'combinationSum2', javascript: 'combinationSum2', typescript: 'combinationSum2', kotlin: 'combinationSum2' },
    stubs: {
      python: `def combinationSum2(candidates: list, target: int) -> list:\n    pass`,
      javascript: `function combinationSum2(candidates, target) {\n\n}`,
      typescript: `function combinationSum2(candidates: number[], target: number): number[][] {\n\n}`,
      kotlin: `fun combinationSum2(candidates: IntArray, target: Int): List<List<Int>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { candidates: [10,1,2,7,6,1,5], target: 8, expected: [[1,1,6],[1,2,5],[1,7],[2,6]] },
        { candidates: [2,5,2,1,2], target: 5, expected: [[1,2,2],[5]] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.candidates, tc.target], expected: tc.expected };
    })
  },
  {
    slug: 'palindrome-partitioning',
    type: 'unordered_list',
    functionName: { python: 'partition', javascript: 'partition', typescript: 'partition', kotlin: 'partition' },
    stubs: {
      python: `def partition(s: str) -> list:\n    pass`,
      javascript: `function partition(s) {\n\n}`,
      typescript: `function partition(s: string): string[][] {\n\n}`,
      kotlin: `fun partition(s: String): List<List<String>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "aab", expected: [["a","a","b"],["aa","b"]] },
        { s: "a", expected: [["a"]] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.s], expected: tc.expected };
    })
  },
  {
    slug: 'letter-combinations-of-a-phone-number',
    type: 'unordered_list',
    functionName: { python: 'letterCombinations', javascript: 'letterCombinations', typescript: 'letterCombinations', kotlin: 'letterCombinations' },
    stubs: {
      python: `def letterCombinations(digits: str) -> list:\n    pass`,
      javascript: `function letterCombinations(digits) {\n\n}`,
      typescript: `function letterCombinations(digits: string): string[] {\n\n}`,
      kotlin: `fun letterCombinations(digits: String): List<String> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { digits: "23", expected: ["ad","ae","af","bd","be","bf","cd","ce","cf"] },
        { digits: "", expected: [] },
        { digits: "2", expected: ["a","b","c"] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.digits], expected: tc.expected };
    })
  },
  {
    slug: 'all-paths-from-source-to-target',
    type: 'unordered_list',
    functionName: { python: 'allPathsSourceTarget', javascript: 'allPathsSourceTarget', typescript: 'allPathsSourceTarget', kotlin: 'allPathsSourceTarget' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def allPathsSourceTarget(graph: list) -> list:\n    pass`,
      javascript: `function allPathsSourceTarget(graph) {\n\n}`,
      typescript: `function allPathsSourceTarget(graph: number[][]): number[][] {\n\n}`,
      kotlin: `fun allPathsSourceTarget(graph: Array<IntArray>): List<List<Int>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { graph: [[1,2],[3],[3],[]], expected: [[0,1,3],[0,2,3]] },
        { graph: [[4,3,1],[3,2,4],[3],[4],[]], expected: [[0,4],[0,3,4],[0,1,3,4],[0,1,2,3,4],[0,1,4]] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.graph], expected: tc.expected };
    })
  },
  {
    slug: 'path-sum-ii',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef pathSum(root: TreeNode, targetSum: int) -> list:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction pathSum(root, targetSum) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction pathSum(root: TreeNode | null, targetSum: number): number[][] {\n    return [];\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun pathSum(root: TreeNode?, targetSum: Int): List<List<Int>> {\n    return listOf()\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, target, expected):
    global _pass, _total
    _total += 1
    if sorted(pathSum(buildTree(arr), target)) == sorted(expected):
        _pass += 1
for _ in range(15):
    _t([5,4,8,11,None,13,4,7,2,None,None,5,1], 22, [[5,4,11,2],[5,8,4,5]])
    _t([1,2,3], 5, [])
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, target, expected) {
    _total++;
    let res = pathSum(buildTree(arr), target) || [];
    if (JSON.stringify([...res].sort()) === JSON.stringify([...expected].sort())) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([5,4,8,11,null,13,4,7,2,null,null,5,1], 22, [[5,4,11,2],[5,8,4,5]]);
    _t([1,2,3], 5, []);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], target: number, expected: number[][]) {
    _total++;
    let res = pathSum(buildTree(arr), target) || [];
    if (JSON.stringify([...res].sort()) === JSON.stringify([...expected].sort())) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([5,4,8,11,null,13,4,7,2,null,null,5,1], 22, [[5,4,11,2],[5,8,4,5]]);
    _t([1,2,3], 5, []);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, target: Int, expected: List<List<Int>>) {
        _total++
        if (pathSum(buildTree(arr), target).sortedBy { it.toString() } == expected.sortedBy { it.toString() }) _pass++
    }
    for (i in 1..15) {
        _t(listOf(5,4,8,11,null,13,4,7,2,null,null,5,1), listOf(listOf(5,4,11,2), listOf(5,8,4,5)))
        _t(listOf(1,2,3), 5, listOf())
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'generate-parentheses',
    type: 'unordered_list',
    functionName: { python: 'generateParenthesis', javascript: 'generateParenthesis', typescript: 'generateParenthesis', kotlin: 'generateParenthesis' },
    stubs: {
      python: `def generateParenthesis(n: int) -> list:\n    pass`,
      javascript: `function generateParenthesis(n) {\n\n}`,
      typescript: `function generateParenthesis(n: number): string[] {\n\n}`,
      kotlin: `fun generateParenthesis(n: Int): List<String> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 3, expected: ["((()))","(()())","(())()","()(())","()()()"] },
        { n: 1, expected: ["()"] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.n], expected: tc.expected };
    })
  },
  {
    slug: 'n-queens',
    type: 'unordered_list',
    functionName: { python: 'solveNQueens', javascript: 'solveNQueens', typescript: 'solveNQueens', kotlin: 'solveNQueens' },
    stubs: {
      python: `def solveNQueens(n: int) -> list:\n    pass`,
      javascript: `function solveNQueens(n) {\n\n}`,
      typescript: `function solveNQueens(n: number): string[][] {\n\n}`,
      kotlin: `fun solveNQueens(n: Int): List<List<String>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 4, expected: [[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]] },
        { n: 1, expected: [["Q"]] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.n], expected: tc.expected };
    })
  },
  {
    slug: 'sudoku-solver',
    stubs: {
      python: `def solveSudoku(board: list) -> None:\n    pass`,
      javascript: `function solveSudoku(board) {\n\n}`,
      typescript: `function solveSudoku(board: string[][]): void {\n\n}`,
      kotlin: `fun solveSudoku(board: Array<CharArray>): Unit {\n\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
def _t(board, expected):
    global _pass, _total
    _total += 1
    # solveSudoku updates in place
    b = [row[:] for row in board]
    solveSudoku(b)
    if b == expected:
        _pass += 1

for _ in range(30):
    _t(
        [["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]],
        [["5","3","4","6","7","8","9","1","2"],["6","7","2","1","9","5","3","4","8"],["1","9","8","3","4","2","5","6","7"],["8","5","9","7","6","1","4","2","3"],["4","2","6","8","5","3","7","9","1"],["7","1","3","9","2","4","8","5","6"],["9","6","1","5","3","7","2","8","4"],["2","8","7","4","1","9","6","3","5"],["3","4","5","2","8","6","1","7","9"]]
    )
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
function _t(board, expected) {
    _total++;
    let b = board.map(row => [...row]);
    solveSudoku(b);
    if (JSON.stringify(b) === JSON.stringify(expected)) _pass++;
}
for (let i = 0; i < 30; i++) {
    _t(
        [["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]],
        [["5","3","4","6","7","8","9","1","2"],["6","7","2","1","9","5","3","4","8"],["1","9","8","3","4","2","5","6","7"],["8","5","9","7","6","1","4","2","3"],["4","2","6","8","5","3","7","9","1"],["7","1","3","9","2","4","8","5","6"],["9","6","1","5","3","7","2","8","4"],["2","8","7","4","1","9","6","3","5"],["3","4","5","2","8","6","1","7","9"]]
    );
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
function _t(board: string[][], expected: string[][]) {
    _total++;
    let b = board.map(row => [...row]);
    solveSudoku(b);
    if (JSON.stringify(b) === JSON.stringify(expected)) _pass++;
}
for (let i = 0; i < 30; i++) {
    _t(
        [["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]],
        [["5","3","4","6","7","8","9","1","2"],["6","7","2","1","9","5","3","4","8"],["1","9","8","3","4","2","5","6","7"],["8","5","9","7","6","1","4","2","3"],["4","2","6","8","5","3","7","9","1"],["7","1","3","9","2","4","8","5","6"],["9","6","1","5","3","7","2","8","4"],["2","8","7","4","1","9","6","3","5"],["3","4","5","2","8","6","1","7","9"]]
    );
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    fun _t(board: Array<CharArray>, expected: Array<CharArray>) {
        _total++
        val b = board.map { it.clone() }.toTypedArray()
        solveSudoku(b)
        var ok = true
        for (i in 0..8) {
            if (!b[i].contentEquals(expected[i])) ok = false
        }
        if (ok) _pass++
    }
    for (i in 1..30) {
        _t(
            arrayOf(
                charArrayOf('5','3','.','.','7','.','.','.','.'),
                charArrayOf('6','.','.','1','9','5','.','.','.'),
                charArrayOf('.','9','8','.','.','.','.','6','.'),
                charArrayOf('8','.','.','.','6','.','.','.','3'),
                charArrayOf('4','.','.','8','.','3','.','.','1'),
                charArrayOf('7','.','.','.','2','.','.','.','6'),
                charArrayOf('.','6','.','.','.','.','2','8','.'),
                charArrayOf('.','.','.','4','1','9','.','.','5'),
                charArrayOf('.','.','.','.','8','.','.','7','9')
            ),
            arrayOf(
                charArrayOf('5','3','4','6','7','8','9','1','2'),
                charArrayOf('6','7','2','1','9','5','3','4','8'),
                charArrayOf('1','9','8','3','4','2','5','6','7'),
                charArrayOf('8','5','9','7','6','1','4','2','3'),
                charArrayOf('4','2','6','8','5','3','7','9','1'),
                charArrayOf('7','1','3','9','2','4','8','5','6'),
                charArrayOf('9','6','1','5','3','7','2','8','4'),
                charArrayOf('2','8','7','4','1','9','6','3','5'),
                charArrayOf('3','4','5','2','8','6','1','7','9')
            )
        )
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'word-search-ii',
    type: 'unordered_list',
    functionName: { python: 'findWords', javascript: 'findWords', typescript: 'findWords', kotlin: 'findWords' },
    inputTypes: ['char_array_2d', 'string_array'],
    stubs: {
      python: `def findWords(board: list, words: list) -> list:\n    pass`,
      javascript: `function findWords(board, words) {\n\n}`,
      typescript: `function findWords(board: string[][], words: string[]): string[] {\n\n}`,
      kotlin: `fun findWords(board: Array<CharArray>, words: Array<String>): List<String> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { board: [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], words: ["oath","pea","eat","rain"], expected: ["oath","eat"] },
        { board: [["a","b"],["c","d"]], words: ["abcb"], expected: [] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.board, tc.words], expected: tc.expected };
    })
  },
  {
    slug: 'remove-invalid-parentheses',
    type: 'unordered_list',
    functionName: { python: 'removeInvalidParentheses', javascript: 'removeInvalidParentheses', typescript: 'removeInvalidParentheses', kotlin: 'removeInvalidParentheses' },
    stubs: {
      python: `def removeInvalidParentheses(s: str) -> list:\n    pass`,
      javascript: `function removeInvalidParentheses(s) {\n\n}`,
      typescript: `function removeInvalidParentheses(s: string): string[] {\n\n}`,
      kotlin: `fun removeInvalidParentheses(s: String): List<String> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "()())()", expected: ["(())()","()()()"] },
        { s: "(a)())()", expected: ["(a())()","(a)()()"] },
        { s: ")(", expected: [""] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.s], expected: tc.expected };
    })
  },
  {
    slug: 'expression-add-operators',
    type: 'unordered_list',
    functionName: { python: 'addOperators', javascript: 'addOperators', typescript: 'addOperators', kotlin: 'addOperators' },
    stubs: {
      python: `def addOperators(num: str, target: int) -> list:\n    pass`,
      javascript: `function addOperators(num, target) {\n\n}`,
      typescript: `function addOperators(num: string, target: number): string[] {\n\n}`,
      kotlin: `fun addOperators(num: String, target: Int): List<String> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { num: "123", target: 6, expected: ["1+2+3","1*2*3"] },
        { num: "232", target: 8, expected: ["2*3+2","2+3*2"] },
        { num: "3456237490", target: 9191, expected: [] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.num, tc.target], expected: tc.expected };
    })
  },
  {
    slug: 'unique-paths-iii',
    type: 'normal',
    functionName: { python: 'uniquePathsIII', javascript: 'uniquePathsIII', typescript: 'uniquePathsIII', kotlin: 'uniquePathsIII' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def uniquePathsIII(grid: list) -> int:\n    pass`,
      javascript: `function uniquePathsIII(grid) {\n\n}`,
      typescript: `function uniquePathsIII(grid: number[][]): number {\n\n}`,
      kotlin: `fun uniquePathsIII(grid: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [[1,0,0,0],[0,0,0,0],[0,0,2,-1]], expected: 2 },
        { grid: [[1,0,0,0],[0,0,0,0],[0,0,0,2]], expected: 4 },
        { grid: [[0,1],[2,0]], expected: 0 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.grid], expected: tc.expected };
    })
  },
  {
    slug: 'binary-tree-maximum-path-sum',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef maxPathSum(root: TreeNode) -> int:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction maxPathSum(root) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction maxPathSum(root: TreeNode | null): number {\n    return 0;\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun maxPathSum(root: TreeNode?): Int {\n    return 0\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, expected):
    global _pass, _total
    _total += 1
    if maxPathSum(buildTree(arr)) == expected:
        _pass += 1
for _ in range(15):
    _t([1,2,3], 6)
    _t([-10,9,20,None,None,15,7], 42)
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, expected) {
    _total++;
    if (maxPathSum(buildTree(arr)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([1,2,3], 6);
    _t([-10,9,20,null,null,15,7], 42);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], expected: number) {
    _total++;
    if (maxPathSum(buildTree(arr)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([1,2,3], 6);
    _t([-10,9,20,null,null,15,7], 42);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, expected: Int) {
        _total++
        if (maxPathSum(buildTree(arr)) == expected) _pass++
    }
    for (i in 1..15) {
        _t(listOf(1,2,3), 6)
        _t(listOf(-10,9,20,null,null,15,7), 42)
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'serialize-and-deserialize-binary-tree',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\nclass Codec:\n    def serialize(self, root: TreeNode) -> str:\n        pass\n    def deserialize(self, data: str) -> TreeNode:\n        pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nclass Codec {\n    serialize(root) {\n\n    }\n    deserialize(data) {\n\n    }\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nclass Codec {\n    serialize(root: TreeNode | null): string {\n        return "";\n    }\n    deserialize(data: string): TreeNode | null {\n        return null;\n    }\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nclass Codec() {\n    fun serialize(root: TreeNode?): String {\n        return ""\n    }\n    fun deserialize(data: String): TreeNode? {\n        return null\n    }\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    ser = Codec()
    deser = Codec()
    root = buildTree([1,2,3,None,None,4,5])
    if isSameTree(deser.deserialize(ser.serialize(root)), root):
        _pass += 1
    _total += 1
    root2 = buildTree([])
    if isSameTree(deser.deserialize(ser.serialize(root2)), root2):
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let ser = new Codec();
    let deser = new Codec();
    let root = buildTree([1,2,3,null,null,4,5]);
    if (isSameTree(deser.deserialize(ser.serialize(root)), root)) _pass++;
    _total++;
    let root2 = buildTree([]);
    if (isSameTree(deser.deserialize(ser.serialize(root2)), root2)) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let ser = new Codec();
    let deser = new Codec();
    let root = buildTree([1,2,3,null,null,4,5]);
    if (isSameTree(deser.deserialize(ser.serialize(root)), root)) _pass++;
    _total++;
    let root2 = buildTree([]);
    if (isSameTree(deser.deserialize(ser.serialize(root2)), root2)) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val ser = Codec()
        val deser = Codec()
        val root = buildTree(listOf(1,2,3,null,null,4,5))
        if (isSameTree(deser.deserialize(ser.serialize(root)), root)) _pass++
        _total++
        val root2 = buildTree(listOf())
        if (isSameTree(deser.deserialize(ser.serialize(root2)), root2)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'recover-binary-search-tree',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef recoverTree(root: TreeNode) -> None:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction recoverTree(root) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction recoverTree(root: TreeNode | null): void {\n\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun recoverTree(root: TreeNode?): Unit {\n\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
def check_recovered(root):
    res = []
    def inorder(node):
        if not node: return
        inorder(node.left)
        res.append(node.val)
        inorder(node.right)
    inorder(root)
    return res == sorted(res)

_pass = _total = 0
for _ in range(15):
    _total += 1
    root = buildTree([1,3,None,None,2])
    recoverTree(root)
    if check_recovered(root): _pass += 1
    _total += 1
    root2 = buildTree([3,1,4,None,None,2])
    recoverTree(root2)
    if check_recovered(root2): _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
function checkRecovered(root) {
    let res = [];
    function inorder(node) {
        if (!node) return;
        inorder(node.left);
        res.push(node.val);
        inorder(node.right);
    }
    inorder(root);
    return JSON.stringify(res) === JSON.stringify([...res].sort((a,b) => a - b));
}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let root = buildTree([1,3,null,null,2]);
    recoverTree(root);
    if (checkRecovered(root)) _pass++;
    _total++;
    let root2 = buildTree([3,1,4,null,null,2]);
    recoverTree(root2);
    if (checkRecovered(root2)) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
function checkRecovered(root: TreeNode | null): boolean {
    let res: number[] = [];
    function inorder(node: TreeNode | null) {
        if (!node) return;
        inorder(node.left);
        res.push(node.val);
        inorder(node.right);
    }
    inorder(root);
    return JSON.stringify(res) === JSON.stringify([...res].sort((a,b) => a - b));
}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let root = buildTree([1,3,null,null,2]);
    recoverTree(root);
    if (checkRecovered(root)) _pass++;
    _total++;
    let root2 = buildTree([3,1,4,null,null,2]);
    recoverTree(root2);
    if (checkRecovered(root2)) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun checkRecovered(root: TreeNode?): Boolean {
    val res = mutableListOf<Int>()
    fun inorder(node: TreeNode?) {
        if (node == null) return
        inorder(node.left)
        res.add(node.\`val\`)
        inorder(node.right)
    }
    inorder(root)
    return res == res.sorted()
}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val root = buildTree(listOf(1,3,null,null,2))
        recoverTree(root)
        if (checkRecovered(root)) _pass++
        _total++
        val root2 = buildTree(listOf(3,1,4,null,null,2))
        recoverTree(root2)
        if (checkRecovered(root2)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'palindrome-partitioning-ii',
    type: 'normal',
    functionName: { python: 'minCut', javascript: 'minCut', typescript: 'minCut', kotlin: 'minCut' },
    stubs: {
      python: `def minCut(s: str) -> int:\n    pass`,
      javascript: `function minCut(s) {\n\n}`,
      typescript: `function minCut(s: string): number {\n\n}`,
      kotlin: `fun minCut(s: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "aab", expected: 1 },
        { s: "a", expected: 0 },
        { s: "ab", expected: 1 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.s], expected: tc.expected };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 30 DFS & Backtracking problems…\n');

  for (const prob of PROBLEMS_DATA) {
    const dbProblem = await db.query.problems.findFirst({
      where: eq(problems.slug, prob.slug)
    });

    if (!dbProblem) {
      console.log(`Problem ${prob.slug} not found, skipping.`);
      continue;
    }

    const langStubs: Record<string, string> = { ...prob.stubs };

    const runners: Record<string, string> = {};
    if (prob.customRunner) {
      runners.python = prob.customRunner.python;
      runners.javascript = prob.customRunner.javascript;
      runners.typescript = prob.customRunner.typescript;
      runners.kotlin = prob.customRunner.kotlin;
    } else {
      const funcName = prob.functionName!;
      const testCases = prob.testCases!;
      runners.python = buildPythonRunner(funcName.python, prob.type || 'normal', testCases);
      runners.javascript = buildJSRunner(funcName.javascript, prob.type || 'normal', testCases);
      runners.typescript = buildTSRunner(funcName.typescript, prob.type || 'normal', testCases);
      runners.kotlin = buildKotlinRunner(funcName.kotlin, prob.type || 'normal', testCases, prob.inputTypes, prob.expectedType);
    }

    await db.update(problems)
      .set({
        functionStubs: sql`${langStubs}::jsonb`,
        testRunners: sql`${runners}::jsonb`
      })
      .where(eq(problems.id, dbProblem.id));

    console.log(`  ✓  [${dbProblem.difficulty}] ${prob.slug} (${prob.testCases?.length || 30} test cases seeded)`);
  }

  console.log('\nDone.');
  await client.end();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
