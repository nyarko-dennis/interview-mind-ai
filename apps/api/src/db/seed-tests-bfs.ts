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
  code += `def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    if result == expected:
        _pass += 1\n\n`;

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
  code += `function _t(r, e) { _total++; if (JSON.stringify(r) === JSON.stringify(e)) _pass++; }\n\n`;

  testCases.forEach((tc, idx) => {
    const argsStr = tc.inputs.map(x => serializeVal(x, 'javascript')).join(', ');
    code += `_t(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'javascript')});\n`;
  });

  code += `console.log(\`\${_pass}/\${_total} tests passed\`);`;
  return code;
}

function buildTSRunner(funcName: string, type: string, testCases: any[]): string {
  let code = `let _pass = 0, _total = 0;\n`;
  code += `function _t(r: any, e: any): void { _total++; if (JSON.stringify(r) === JSON.stringify(e)) _pass++; }\n\n`;

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

// Helper parts for tree based runners
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
// 30 BFS PROBLEMS DEFINITIONS
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
    slug: 'number-of-islands',
    type: 'normal',
    functionName: { python: 'numIslands', javascript: 'numIslands', typescript: 'numIslands', kotlin: 'numIslands' },
    inputTypes: ['char_array_2d'],
    stubs: {
      python: `def numIslands(grid: list) -> int:\n    pass`,
      javascript: `function numIslands(grid) {\n\n}`,
      typescript: `function numIslands(grid: string[][]): number {\n\n}`,
      kotlin: `fun numIslands(grid: Array<CharArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]], expected: 1 },
        { grid: [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]], expected: 3 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.grid], expected: tc.expected };
    })
  },
  {
    slug: 'flood-fill',
    type: 'normal',
    functionName: { python: 'floodFill', javascript: 'floodFill', typescript: 'floodFill', kotlin: 'floodFill' },
    inputTypes: ['int_array_2d', 'int', 'int', 'int'],
    expectedType: 'int_array_2d',
    stubs: {
      python: `def floodFill(image: list, sr: int, sc: int, color: int) -> list:\n    pass`,
      javascript: `function floodFill(image, sr, sc, color) {\n\n}`,
      typescript: `function floodFill(image: number[][], sr: number, sc: number, color: number): number[][] {\n\n}`,
      kotlin: `fun floodFill(image: Array<IntArray>, sr: Int, sc: Int, color: Int): Array<IntArray> {\n    return image\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { image: [[1,1,1],[1,1,0],[1,0,1]], sr: 1, sc: 1, color: 2, expected: [[2,2,2],[2,2,0],[2,0,1]] },
        { image: [[0,0,0],[0,0,0]], sr: 0, sc: 0, color: 0, expected: [[0,0,0],[0,0,0]] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.image, tc.sr, tc.sc, tc.color], expected: tc.expected };
    })
  },
  {
    slug: 'average-of-levels-in-binary-tree',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef averageOfLevels(root: TreeNode) -> list:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction averageOfLevels(root) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction averageOfLevels(root: TreeNode | null): number[] {\n    return [];\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun averageOfLevels(root: TreeNode?): DoubleArray {\n    return doubleArrayOf()\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, expected):
    global _pass, _total
    _total += 1
    if averageOfLevels(buildTree(arr)) == expected:
        _pass += 1
for _ in range(15):
    _t([3,9,20,None,None,15,7], [3.0,14.5,11.0])
    _t([3,9,20,15,7], [3.0,14.5,11.0])
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, expected) {
    _total++;
    if (JSON.stringify(averageOfLevels(buildTree(arr))) === JSON.stringify(expected)) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([3,9,20,null,null,15,7], [3.0,14.5,11.0]);
    _t([3,9,20,15,7], [3.0,14.5,11.0]);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], expected: number[]) {
    _total++;
    if (JSON.stringify(averageOfLevels(buildTree(arr))) === JSON.stringify(expected)) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([3,9,20,null,null,15,7], [3.0,14.5,11.0]);
    _t([3,9,20,15,7], [3.0,14.5,11.0]);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, expected: DoubleArray) {
        _total++
        val res = averageOfLevels(buildTree(arr))
        if (res.contentEquals(expected)) _pass++
    }
    for (i in 1..15) {
        _t(listOf(3,9,20,null,null,15,7), doubleArrayOf(3.0,14.5,11.0))
        _t(listOf(3,9,20,15,7), doubleArrayOf(3.0,14.5,11.0))
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'maximum-depth-of-binary-tree',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef maxDepth(root: TreeNode) -> int:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction maxDepth(root) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction maxDepth(root: TreeNode | null): number {\n    return 0;\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun maxDepth(root: TreeNode?): Int {\n    return 0\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, expected):
    global _pass, _total
    _total += 1
    if maxDepth(buildTree(arr)) == expected:
        _pass += 1
for _ in range(15):
    _t([3,9,20,None,None,15,7], 3)
    _t([1,None,2], 2)
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, expected) {
    _total++;
    if (maxDepth(buildTree(arr)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([3,9,20,null,null,15,7], 3);
    _t([1,null,2], 2);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], expected: number) {
    _total++;
    if (maxDepth(buildTree(arr)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([3,9,20,null,null,15,7], 3);
    _t([1,null,2], 2);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, expected: Int) {
        _total++
        if (maxDepth(buildTree(arr)) == expected) _pass++
    }
    for (i in 1..15) {
        _t(listOf(3,9,20,null,null,15,7), 3)
        _t(listOf(1,null,2), 2)
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'minimum-depth-of-binary-tree',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef minDepth(root: TreeNode) -> int:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction minDepth(root) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction minDepth(root: TreeNode | null): number {\n    return 0;\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun minDepth(root: TreeNode?): Int {\n    return 0\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, expected):
    global _pass, _total
    _total += 1
    if minDepth(buildTree(arr)) == expected:
        _pass += 1
for _ in range(15):
    _t([3,9,20,None,None,15,7], 2)
    _t([2,None,3,None,4,None,5,None,6], 5)
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, expected) {
    _total++;
    if (minDepth(buildTree(arr)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([3,9,20,null,null,15,7], 2);
    _t([2,null,3,null,4,null,5,null,6], 5);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], expected: number) {
    _total++;
    if (minDepth(buildTree(arr)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([3,9,20,null,null,15,7], 2);
    _t([2,null,3,null,4,null,5,null,6], 5);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, expected: Int) {
        _total++
        if (minDepth(buildTree(arr)) == expected) _pass++
    }
    for (i in 1..15) {
        _t(listOf(3,9,20,null,null,15,7), 2)
        _t(listOf(2,null,3,null,4,null,5,null,6), 5)
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'symmetric-tree',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef isSymmetric(root: TreeNode) -> bool:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction isSymmetric(root) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction isSymmetric(root: TreeNode | null): boolean {\n    return false;\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun isSymmetric(root: TreeNode?): Boolean {\n    return false\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, expected):
    global _pass, _total
    _total += 1
    if isSymmetric(buildTree(arr)) == expected:
        _pass += 1
for _ in range(15):
    _t([1,2,2,3,4,4,3], True)
    _t([1,2,2,None,3,None,3], False)
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, expected) {
    _total++;
    if (isSymmetric(buildTree(arr)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([1,2,2,3,4,4,3], true);
    _t([1,2,2,null,3,null,3], false);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], expected: boolean) {
    _total++;
    if (isSymmetric(buildTree(arr)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([1,2,2,3,4,4,3], true);
    _t([1,2,2,null,3,null,3], false);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, expected: Boolean) {
        _total++
        if (isSymmetric(buildTree(arr)) == expected) _pass++
    }
    for (i in 1..15) {
        _t(listOf(1,2,2,3,4,4,3), true)
        _t(listOf(1,2,2,null,3,null,3), false)
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'invert-binary-tree',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef invertTree(root: TreeNode) -> TreeNode:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction invertTree(root) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction invertTree(root: TreeNode | null): TreeNode | null {\n    return null;\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun invertTree(root: TreeNode?): TreeNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, expected):
    global _pass, _total
    _total += 1
    if isSameTree(invertTree(buildTree(arr)), buildTree(expected)):
        _pass += 1
for _ in range(15):
    _t([4,2,7,1,3,6,9], [4,7,2,9,6,3,1])
    _t([2,1,3], [2,3,1])
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, expected) {
    _total++;
    if (isSameTree(invertTree(buildTree(arr)), buildTree(expected))) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([4,2,7,1,3,6,9], [4,7,2,9,6,3,1]);
    _t([2,1,3], [2,3,1]);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], expected: (number|null)[]) {
    _total++;
    if (isSameTree(invertTree(buildTree(arr)), buildTree(expected))) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([4,2,7,1,3,6,9], [4,7,2,9,6,3,1]);
    _t([2,1,3], [2,3,1]);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, expected: List<Int?>) {
        _total++
        if (isSameTree(invertTree(buildTree(arr)), buildTree(expected))) _pass++
    }
    for (i in 1..15) {
        _t(listOf(4,2,7,1,3,6,9), listOf(4,7,2,9,6,3,1))
        _t(listOf(2,1,3), listOf(2,3,1))
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'same-tree',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef isSameTree(p: TreeNode, q: TreeNode) -> bool:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction isSameTree(p, q) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction isSameTree(p: TreeNode | null, q: TreeNode | null): boolean {\n    return false;\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun isSameTree(p: TreeNode?, q: TreeNode?): Boolean {\n    return false\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr1, arr2, expected):
    global _pass, _total
    _total += 1
    if isSameTree(buildTree(arr1), buildTree(arr2)) == expected:
        _pass += 1
for _ in range(15):
    _t([1,2,3], [1,2,3], True)
    _t([1,2], [1,None,2], False)
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr1, arr2, expected) {
    _total++;
    if (isSameTree(buildTree(arr1), buildTree(arr2)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([1,2,3], [1,2,3], true);
    _t([1,2], [1,null,2], false);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr1: (number|null)[], arr2: (number|null)[], expected: boolean) {
    _total++;
    if (isSameTree(buildTree(arr1), buildTree(arr2)) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([1,2,3], [1,2,3], true);
    _t([1,2], [1,null,2], false);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr1: List<Int?>, arr2: List<Int?>, expected: Boolean) {
        _total++
        if (isSameTree(buildTree(arr1), buildTree(arr2)) == expected) _pass++
    }
    for (i in 1..15) {
        _t(listOf(1,2,3), listOf(1,2,3), true)
        _t(listOf(1,2), listOf(1,null,2), false)
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'path-sum',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef hasPathSum(root: TreeNode, targetSum: int) -> bool:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction hasPathSum(root, targetSum) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction hasPathSum(root: TreeNode | null, targetSum: number): boolean {\n    return false;\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun hasPathSum(root: TreeNode?, targetSum: Int): Boolean {\n    return false\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, target, expected):
    global _pass, _total
    _total += 1
    if hasPathSum(buildTree(arr), target) == expected:
        _pass += 1
for _ in range(15):
    _t([5,4,8,11,None,13,4,7,2,None,None,None,1], 22, True)
    _t([1,2,3], 5, False)
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, target, expected) {
    _total++;
    if (hasPathSum(buildTree(arr), target) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([5,4,8,11,null,13,4,7,2,null,null,null,1], 22, true);
    _t([1,2,3], 5, false);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], target: number, expected: boolean) {
    _total++;
    if (hasPathSum(buildTree(arr), target) === expected) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([5,4,8,11,null,13,4,7,2,null,null,null,1], 22, true);
    _t([1,2,3], 5, false);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, target: Int, expected: Boolean) {
        _total++
        if (hasPathSum(buildTree(arr), target) == expected) _pass++
    }
    for (i in 1..15) {
        _t(listOf(5,4,8,11,null,13,4,7,2,null,null,null,1), 22, true)
        _t(listOf(1,2,3), 5, false)
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'find-if-path-exists-in-graph',
    type: 'normal',
    functionName: { python: 'validPath', javascript: 'validPath', typescript: 'validPath', kotlin: 'validPath' },
    inputTypes: ['int', 'int_array_2d', 'int', 'int'],
    stubs: {
      python: `def validPath(n: int, edges: list, source: int, destination: int) -> bool:\n    pass`,
      javascript: `function validPath(n, edges, source, destination) {\n\n}`,
      typescript: `function validPath(n: number, edges: number[][], source: number, destination: number): boolean {\n\n}`,
      kotlin: `fun validPath(n: Int, edges: Array<IntArray>, source: Int, destination: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 3, edges: [[0,1],[1,2],[2,0]], source: 0, destination: 2, expected: true },
        { n: 6, edges: [[0,1],[0,2],[3,5],[5,4],[4,3]], source: 0, destination: 5, expected: false }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.n, tc.edges, tc.source, tc.destination], expected: tc.expected };
    })
  },
  {
    slug: 'merge-two-binary-trees',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef mergeTrees(root1: TreeNode, root2: TreeNode) -> TreeNode:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction mergeTrees(root1, root2) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction mergeTrees(root1: TreeNode | null, root2: TreeNode | null): TreeNode | null {\n    return null;\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun mergeTrees(root1: TreeNode?, root2: TreeNode?): TreeNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr1, arr2, expected):
    global _pass, _total
    _total += 1
    if isSameTree(mergeTrees(buildTree(arr1), buildTree(arr2)), buildTree(expected)):
        _pass += 1
for _ in range(15):
    _t([1,3,2,5], [2,1,3,None,4,None,7], [3,4,5,5,4,None,7])
    _t([1], [1,2], [2,2])
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr1, arr2, expected) {
    _total++;
    if (isSameTree(mergeTrees(buildTree(arr1), buildTree(arr2)), buildTree(expected))) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([1,3,2,5], [2,1,3,null,4,null,7], [3,4,5,5,4,null,7]);
    _t([1], [1,2], [2,2]);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr1: (number|null)[], arr2: (number|null)[], expected: (number|null)[]) {
    _total++;
    if (isSameTree(mergeTrees(buildTree(arr1), buildTree(arr2)), buildTree(expected))) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([1,3,2,5], [2,1,3,null,4,null,7], [3,4,5,5,4,null,7]);
    _t([1], [1,2], [2,2]);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr1: List<Int?>, arr2: List<Int?>, expected: List<Int?>) {
        _total++
        if (isSameTree(mergeTrees(buildTree(arr1), buildTree(arr2)), buildTree(expected))) _pass++
    }
    for (i in 1..15) {
        _t(listOf(1,3,2,5), listOf(2,1,3,null,4,null,7), listOf(3,4,5,5,4,null,7))
        _t(listOf(1), listOf(1,2), listOf(2,2))
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'binary-tree-level-order-traversal',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef levelOrder(root: TreeNode) -> list:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction levelOrder(root) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction levelOrder(root: TreeNode | null): number[][] {\n    return [];\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun levelOrder(root: TreeNode?): List<List<Int>> {\n    return listOf()\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, expected):
    global _pass, _total
    _total += 1
    if levelOrder(buildTree(arr)) == expected:
        _pass += 1
for _ in range(15):
    _t([3,9,20,None,None,15,7], [[3],[9,20],[15,7]])
    _t([1], [[1]])
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, expected) {
    _total++;
    if (JSON.stringify(levelOrder(buildTree(arr))) === JSON.stringify(expected)) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([3,9,20,null,null,15,7], [[3],[9,20],[15,7]]);
    _t([1], [[1]]);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], expected: number[][]) {
    _total++;
    if (JSON.stringify(levelOrder(buildTree(arr))) === JSON.stringify(expected)) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([3,9,20,null,null,15,7], [[3],[9,20],[15,7]]);
    _t([1], [[1]]);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, expected: List<List<Int>>) {
        _total++
        if (levelOrder(buildTree(arr)) == expected) _pass++
    }
    for (i in 1..15) {
        _t(listOf(3,9,20,null,null,15,7), listOf(listOf(3), listOf(9,20), listOf(15,7)))
        _t(listOf(1), listOf(listOf(1)))
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'binary-tree-right-side-view',
    stubs: {
      python: `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef rightSideView(root: TreeNode) -> list:\n    pass`,
      javascript: `class TreeNode {\n    constructor(val, left, right) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction rightSideView(root) {\n\n}`,
      typescript: `class TreeNode {\n    val: number;\n    left: TreeNode | null;\n    right: TreeNode | null;\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction rightSideView(root: TreeNode | null): number[] {\n    return [];\n}`,
      kotlin: `class TreeNode(var \`val\`: Int) {\n    var left: TreeNode? = null\n    var right: TreeNode? = null\n}\nfun rightSideView(root: TreeNode?): IntArray {\n    return intArrayOf()\n}`
    },
    customRunner: {
      python: `
${PY_TREE_DEFS}
_pass = _total = 0
def _t(arr, expected):
    global _pass, _total
    _total += 1
    if rightSideView(buildTree(arr)) == expected:
        _pass += 1
for _ in range(15):
    _t([1,2,3,None,5,None,4], [1,3,4])
    _t([1,None,3], [1,3])
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr, expected) {
    _total++;
    if (JSON.stringify(rightSideView(buildTree(arr))) === JSON.stringify(expected)) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([1,2,3,null,5,null,4], [1,3,4]);
    _t([1,null,3], [1,3]);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_TREE_DEFS}
let _pass = 0, _total = 0;
function _t(arr: (number|null)[], expected: number[]) {
    _total++;
    if (JSON.stringify(rightSideView(buildTree(arr))) === JSON.stringify(expected)) _pass++;
}
for (let i = 0; i < 15; i++) {
    _t([1,2,3,null,5,null,4], [1,3,4]);
    _t([1,null,3], [1,3]);
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_TREE_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    fun _t(arr: List<Int?>, expected: IntArray) {
        _total++
        val res = rightSideView(buildTree(arr))
        if (res.contentEquals(expected)) _pass++
    }
    for (i in 1..15) {
        _t(listOf(1,2,3,null,5,null,4), intArrayOf(1,3,4))
        _t(listOf(1,null,3), intArrayOf(1,3))
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'rotting-oranges',
    type: 'normal',
    functionName: { python: 'orangesRotting', javascript: 'orangesRotting', typescript: 'orangesRotting', kotlin: 'orangesRotting' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def orangesRotting(grid: list) -> int:\n    pass`,
      javascript: `function orangesRotting(grid) {\n\n}`,
      typescript: `function orangesRotting(grid: number[][]): number {\n\n}`,
      kotlin: `fun orangesRotting(grid: Array<IntArray>): Int {\n    return -1\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [[2,1,1],[1,1,0],[0,1,1]], expected: 4 },
        { grid: [[2,1,1],[0,1,1],[1,0,1]], expected: -1 },
        { grid: [[0,2]], expected: 0 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.grid], expected: tc.expected };
    })
  },
  {
    slug: '01-matrix',
    type: 'normal',
    functionName: { python: 'updateMatrix', javascript: 'updateMatrix', typescript: 'updateMatrix', kotlin: 'updateMatrix' },
    inputTypes: ['int_array_2d'],
    expectedType: 'int_array_2d',
    stubs: {
      python: `def updateMatrix(mat: list) -> list:\n    pass`,
      javascript: `function updateMatrix(mat) {\n\n}`,
      typescript: `function updateMatrix(mat: number[][]): number[][] {\n\n}`,
      kotlin: `fun updateMatrix(mat: Array<IntArray>): Array<IntArray> {\n    return mat\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { mat: [[0,0,0],[0,1,0],[0,0,0]], expected: [[0,0,0],[0,1,0],[0,0,0]] },
        { mat: [[0,0,0],[0,1,0],[1,1,1]], expected: [[0,0,0],[0,1,0],[1,2,1]] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.mat], expected: tc.expected };
    })
  },
  {
    slug: 'max-area-of-island',
    type: 'normal',
    functionName: { python: 'maxAreaOfIsland', javascript: 'maxAreaOfIsland', typescript: 'maxAreaOfIsland', kotlin: 'maxAreaOfIsland' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def maxAreaOfIsland(grid: list) -> int:\n    pass`,
      javascript: `function maxAreaOfIsland(grid) {\n\n}`,
      typescript: `function maxAreaOfIsland(grid: number[][]): number {\n\n}`,
      kotlin: `fun maxAreaOfIsland(grid: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [[0,0,1,0,0],[0,0,0,0,0],[0,1,1,0,0],[0,1,1,1,0]], expected: 5 },
        { grid: [[0,0,0,0,0]], expected: 0 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.grid], expected: tc.expected };
    })
  },
  {
    slug: 'pacific-atlantic-water-flow',
    type: 'unordered_list',
    functionName: { python: 'pacificAtlantic', javascript: 'pacificAtlantic', typescript: 'pacificAtlantic', kotlin: 'pacificAtlantic' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def pacificAtlantic(heights: list) -> list:\n    pass`,
      javascript: `function pacificAtlantic(heights) {\n\n}`,
      typescript: `function pacificAtlantic(heights: number[][]): number[][] {\n\n}`,
      kotlin: `fun pacificAtlantic(heights: Array<IntArray>): List<List<Int>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { heights: [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]], expected: [[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]] },
        { heights: [[1]], expected: [[0,0]] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.heights], expected: tc.expected };
    })
  },
  {
    slug: 'shortest-path-in-binary-matrix',
    type: 'normal',
    functionName: { python: 'shortestPathBinaryMatrix', javascript: 'shortestPathBinaryMatrix', typescript: 'shortestPathBinaryMatrix', kotlin: 'shortestPathBinaryMatrix' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def shortestPathBinaryMatrix(grid: list) -> int:\n    pass`,
      javascript: `function shortestPathBinaryMatrix(grid) {\n\n}`,
      typescript: `function shortestPathBinaryMatrix(grid: number[][]): number {\n\n}`,
      kotlin: `fun shortestPathBinaryMatrix(grid: Array<IntArray>): Int {\n    return -1\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [[0,1],[1,0]], expected: 2 },
        { grid: [[0,0,0],[1,1,0],[1,1,0]], expected: 4 },
        { grid: [[1,0,0],[1,1,0],[1,1,0]], expected: -1 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.grid], expected: tc.expected };
    })
  },
  {
    slug: 'clone-graph',
    stubs: {
      python: `class Node:\n    def __init__(self, val = 0, neighbors = None):\n        self.val = val\n        self.neighbors = neighbors if neighbors is not None else []\n\ndef cloneGraph(node: Node) -> Node:\n    pass`,
      javascript: `class Node {\n    constructor(val, neighbors) {\n        this.val = val === undefined ? 0 : val;\n        this.neighbors = neighbors === undefined ? [] : neighbors;\n    }\n}\nfunction cloneGraph(node) {\n\n}`,
      typescript: `class Node {\n    val: number;\n    neighbors: Node[];\n    constructor(val?: number, neighbors?: Node[]) {\n        this.val = (val===undefined ? 0 : val);\n        this.neighbors = (neighbors===undefined ? [] : neighbors);\n    }\n}\nfunction cloneGraph(node: Node | null): Node | null {\n    return null;\n}`,
      kotlin: `class Node(var \`val\`: Int) {\n    var neighbors: ArrayList<Node?> = ArrayList()\n}\nfun cloneGraph(node: Node?): Node? {\n    return null\n}`
    },
    customRunner: {
      python: `
class Node:
    def __init__(self, val = 0, neighbors = None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

def build_graph(adj):
    if not adj: return None
    nodes = {i: Node(i) for i in range(1, len(adj)+1)}
    for i, neighbors in enumerate(adj):
        nodes[i+1].neighbors = [nodes[n] for n in neighbors]
    return nodes[1]

def verify_clone(orig, cloned):
    if not orig and not cloned: return True
    if not orig or not cloned: return False
    visited = {}
    def check(o, c):
        if o in visited:
            return visited[o] == c
        if o.val != c.val: return False
        if o is c: return False
        visited[o] = c
        if len(o.neighbors) != len(c.neighbors): return False
        for n1, n2 in zip(o.neighbors, c.neighbors):
            if not check(n1, n2): return False
        return True
    return check(orig, cloned)

_pass = _total = 0
for _ in range(30):
    _total += 1
    g = build_graph([[2,4],[1,3],[2,4],[1,3]])
    if verify_clone(g, cloneGraph(g)):
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
class Node {
    constructor(val, neighbors) {
        this.val = val === undefined ? 0 : val;
        this.neighbors = neighbors === undefined ? [] : neighbors;
    }
}
function buildGraph(adj) {
    if (!adj || adj.length === 0) return null;
    let nodes = {};
    for (let i = 1; i <= adj.length; i++) {
        nodes[i] = new Node(i);
    }
    for (let i = 0; i < adj.length; i++) {
        nodes[i+1].neighbors = adj[i].map(n => nodes[n]);
    }
    return nodes[1];
}
function verifyClone(orig, cloned) {
    if (!orig && !cloned) return true;
    if (!orig || !cloned) return false;
    let visited = new Map();
    function check(o, c) {
        if (visited.has(o)) return visited.get(o) === c;
        if (o.val !== c.val) return false;
        if (o === c) return false;
        visited.set(o, c);
        if (o.neighbors.length !== c.neighbors.length) return false;
        for (let i = 0; i < o.neighbors.length; i++) {
            if (!check(o.neighbors[i], c.neighbors[i])) return false;
        }
        return true;
    }
    return check(orig, cloned);
}
let _pass = 0, _total = 0;
for (let i = 0; i < 30; i++) {
    _total++;
    let g = buildGraph([[2,4],[1,3],[2,4],[1,3]]);
    if (verifyClone(g, cloneGraph(g))) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
class Node {
    val: number;
    neighbors: Node[];
    constructor(val?: number, neighbors?: Node[]) {
        this.val = (val===undefined ? 0 : val);
        this.neighbors = (neighbors===undefined ? [] : neighbors);
    }
}
function buildGraph(adj: number[][]): Node | null {
    if (!adj || adj.length === 0) return null;
    let nodes: Record<number, Node> = {};
    for (let i = 1; i <= adj.length; i++) {
        nodes[i] = new Node(i);
    }
    for (let i = 0; i < adj.length; i++) {
        nodes[i+1].neighbors = adj[i].map(n => nodes[n]!);
    }
    return nodes[1]!;
}
function verifyClone(orig: Node | null, cloned: Node | null): boolean {
    if (!orig && !cloned) return true;
    if (!orig || !cloned) return false;
    let visited = new Map<Node, Node>();
    function check(o: Node, c: Node): boolean {
        if (visited.has(o)) return visited.get(o) === c;
        if (o.val !== c.val) return false;
        if (o === c) return false;
        visited.set(o, c);
        if (o.neighbors.length !== c.neighbors.length) return false;
        for (let i = 0; i < o.neighbors.length; i++) {
            if (!check(o.neighbors[i]!, c.neighbors[i]!)) return false;
        }
        return true;
    }
    return check(orig!, cloned!);
}
let _pass = 0, _total = 0;
for (let i = 0; i < 30; i++) {
    _total++;
    let g = buildGraph([[2,4],[1,3],[2,4],[1,3]]);
    if (verifyClone(g, cloneGraph(g))) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
import java.util.ArrayList

class Node(var \`val\`: Int) {
    var neighbors: ArrayList<Node?> = ArrayList()
}

fun buildGraph(adj: List<List<Int>>): Node? {
    if (adj.isEmpty()) return null
    val nodes = mutableMapOf<Int, Node>()
    for (i in 1..adj.size) {
        nodes[i] = Node(i)
    }
    for (i in adj.indices) {
        nodes[i+1]!!.neighbors = ArrayList(adj[i].map { nodes[it] })
    }
    return nodes[1]
}

fun verifyClone(orig: Node?, cloned: Node?): Boolean {
    if (orig == null && cloned == null) return true
    if (orig == null || cloned == null) return false
    val visited = mutableMapOf<Node, Node>()
    fun check(o: Node, c: Node): Boolean {
        if (visited.containsKey(o)) return visited[o] === c
        if (o.\`val\` != c.\`val\`) return false
        if (o === c) return false
        visited[o] = c
        if (o.neighbors.size != c.neighbors.size) return false
        for (i in 0 until o.neighbors.size) {
            if (!check(o.neighbors[i]!!, c.neighbors[i]!!)) return false
        }
        return true
    }
    return check(orig, cloned)
}

fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..30) {
        _total++
        val g = buildGraph(listOf(listOf(2,4), listOf(1,3), listOf(2,4), listOf(1,3)))
        if (verifyClone(g, cloneGraph(g))) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'course-schedule',
    type: 'normal',
    functionName: { python: 'canFinish', javascript: 'canFinish', typescript: 'canFinish', kotlin: 'canFinish' },
    inputTypes: ['int', 'int_array_2d'],
    stubs: {
      python: `def canFinish(numCourses: int, prerequisites: list) -> bool:\n    pass`,
      javascript: `function canFinish(numCourses, prerequisites) {\n\n}`,
      typescript: `function canFinish(numCourses: number, prerequisites: number[][]): boolean {\n\n}`,
      kotlin: `fun canFinish(numCourses: Int, prerequisites: Array<IntArray>): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { numCourses: 2, prerequisites: [[1,0]], expected: true },
        { numCourses: 2, prerequisites: [[1,0],[0,1]], expected: false }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.numCourses, tc.prerequisites], expected: tc.expected };
    })
  },
  {
    slug: 'word-ladder',
    type: 'normal',
    functionName: { python: 'ladderLength', javascript: 'ladderLength', typescript: 'ladderLength', kotlin: 'ladderLength' },
    inputTypes: ['string', 'string', 'string_array'],
    stubs: {
      python: `def ladderLength(beginWord: str, endWord: str, wordList: list) -> int:\n    pass`,
      javascript: `function ladderLength(beginWord, endWord, wordList) {\n\n}`,
      typescript: `function ladderLength(beginWord: string, endWord: string, wordList: string[]): number {\n\n}`,
      kotlin: `fun ladderLength(beginWord: String, endWord: String, wordList: Array<String>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { beginWord: "hit", endWord: "cog", wordList: ["hot","dot","dog","lot","log","cog"], expected: 5 },
        { beginWord: "hit", endWord: "cog", wordList: ["hot","dot","dog","lot","log"], expected: 0 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.beginWord, tc.endWord, tc.wordList], expected: tc.expected };
    })
  },
  {
    slug: 'shortest-path-to-get-all-keys',
    type: 'normal',
    functionName: { python: 'shortestPathAllKeys', javascript: 'shortestPathAllKeys', typescript: 'shortestPathAllKeys', kotlin: 'shortestPathAllKeys' },
    inputTypes: ['string_array'],
    stubs: {
      python: `def shortestPathAllKeys(grid: list) -> int:\n    pass`,
      javascript: `function shortestPathAllKeys(grid) {\n\n}`,
      typescript: `function shortestPathAllKeys(grid: string[]): number {\n\n}`,
      kotlin: `fun shortestPathAllKeys(grid: Array<String>): Int {\n    return -1\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: ["@.a.#","###.#","b.A.B"], expected: 8 },
        { grid: ["@..aA","..B#.","....b"], expected: 6 },
        { grid: ["@Aa"], expected: -1 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.grid], expected: tc.expected };
    })
  },
  {
    slug: 'bus-routes',
    type: 'normal',
    functionName: { python: 'numBusesToDestination', javascript: 'numBusesToDestination', typescript: 'numBusesToDestination', kotlin: 'numBusesToDestination' },
    inputTypes: ['int_array_2d', 'int', 'int'],
    stubs: {
      python: `def numBusesToDestination(routes: list, source: int, target: int) -> int:\n    pass`,
      javascript: `function numBusesToDestination(routes, source, target) {\n\n}`,
      typescript: `function numBusesToDestination(routes: number[][], source: number, target: number): number {\n\n}`,
      kotlin: `fun numBusesToDestination(routes: Array<IntArray>, source: Int, target: Int): Int {\n    return -1\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { routes: [[1,2,7],[3,6,7]], source: 1, target: 6, expected: 2 },
        { routes: [[7,12],[4,5,15],[6],[15,19],[9,12,13]], source: 15, target: 12, expected: -1 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.routes, tc.source, tc.target], expected: tc.expected };
    })
  },
  {
    slug: 'word-ladder-ii',
    type: 'unordered_list',
    functionName: { python: 'findLadders', javascript: 'findLadders', typescript: 'findLadders', kotlin: 'findLadders' },
    inputTypes: ['string', 'string', 'string_array'],
    stubs: {
      python: `def findLadders(beginWord: str, endWord: str, wordList: list) -> list:\n    pass`,
      javascript: `function findLadders(beginWord, endWord, wordList) {\n\n}`,
      typescript: `function findLadders(beginWord: string, endWord: string, wordList: string[]): string[][] {\n\n}`,
      kotlin: `fun findLadders(beginWord: String, endWord: String, wordList: Array<String>): List<List<String>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { beginWord: "hit", endWord: "cog", wordList: ["hot","dot","dog","lot","log","cog"], expected: [["hit","hot","dot","dog","cog"],["hit","hot","lot","log","cog"]] },
        { beginWord: "hit", endWord: "cog", wordList: ["hot","dot","dog","lot","log"], expected: [] }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.beginWord, tc.endWord, tc.wordList], expected: tc.expected };
    })
  },
  {
    slug: 'jump-game-iv',
    type: 'normal',
    functionName: { python: 'minJumps', javascript: 'minJumps', typescript: 'minJumps', kotlin: 'minJumps' },
    stubs: {
      python: `def minJumps(arr: list) -> int:\n    pass`,
      javascript: `function minJumps(arr) {\n\n}`,
      typescript: `function minJumps(arr: number[]): number {\n\n}`,
      kotlin: `fun minJumps(arr: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { arr: [100,-23,-23,404,100,23,23,23,3,404], expected: 3 },
        { arr: [7], expected: 0 },
        { arr: [7,6,9,6,9,6,9,7], expected: 1 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.arr], expected: tc.expected };
    })
  },
  {
    slug: 'sliding-puzzle',
    type: 'normal',
    functionName: { python: 'slidingPuzzle', javascript: 'slidingPuzzle', typescript: 'slidingPuzzle', kotlin: 'slidingPuzzle' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def slidingPuzzle(board: list) -> int:\n    pass`,
      javascript: `function slidingPuzzle(board) {\n\n}`,
      typescript: `function slidingPuzzle(board: number[][]): number {\n\n}`,
      kotlin: `fun slidingPuzzle(board: Array<IntArray>): Int {\n    return -1\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { board: [[1,2,3],[4,0,5]], expected: 1 },
        { board: [[1,2,3],[5,4,0]], expected: -1 },
        { board: [[4,1,2],[5,0,3]], expected: 5 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.board], expected: tc.expected };
    })
  },
  {
    slug: 'shortest-path-grid-with-obstacles-elimination',
    type: 'normal',
    functionName: { python: 'shortestPath', javascript: 'shortestPath', typescript: 'shortestPath', kotlin: 'shortestPath' },
    inputTypes: ['int_array_2d', 'int'],
    stubs: {
      python: `def shortestPath(grid: list, k: int) -> int:\n    pass`,
      javascript: `function shortestPath(grid, k) {\n\n}`,
      typescript: `function shortestPath(grid: number[][], k: number): number {\n\n}`,
      kotlin: `fun shortestPath(grid: Array<IntArray>, k: Int): Int {\n    return -1\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [[0,0,0],[1,1,0],[0,0,0],[0,1,1],[0,0,0]], k: 1, expected: 6 },
        { grid: [[0,1,1],[1,1,1],[1,0,0]], k: 1, expected: -1 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.grid, tc.k], expected: tc.expected };
    })
  },
  {
    slug: 'cut-off-trees-for-golf-event',
    type: 'normal',
    functionName: { python: 'cutOffTree', javascript: 'cutOffTree', typescript: 'cutOffTree', kotlin: 'cutOffTree' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def cutOffTree(forest: list) -> int:\n    pass`,
      javascript: `function cutOffTree(forest) {\n\n}`,
      typescript: `function cutOffTree(forest: number[][]): number {\n\n}`,
      kotlin: `fun cutOffTree(forest: List<List<Int>>): Int {\n    return -1\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { forest: [[1,2,3],[0,0,4],[7,6,5]], expected: 6 },
        { forest: [[1,2,3],[0,0,0],[7,6,5]], expected: -1 },
        { forest: [[2,3,4],[0,0,5],[8,7,6]], expected: 6 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.forest], expected: tc.expected };
    })
  },
  {
    slug: 'trapping-rain-water-ii',
    type: 'normal',
    functionName: { python: 'trapRainWater', javascript: 'trapRainWater', typescript: 'trapRainWater', kotlin: 'trapRainWater' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def trapRainWater(heightMap: list) -> int:\n    pass`,
      javascript: `function trapRainWater(heightMap) {\n\n}`,
      typescript: `function trapRainWater(heightMap: number[][]): number {\n\n}`,
      kotlin: `fun trapRainWater(heightMap: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { heightMap: [[1,4,3,1,3,2],[3,2,1,3,2,4],[2,3,3,2,3,1]], expected: 4 },
        { heightMap: [[3,3,3,3,3],[3,2,2,2,3],[3,2,1,2,3],[3,2,2,2,3],[3,3,3,3,3]], expected: 10 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.heightMap], expected: tc.expected };
    })
  },
  {
    slug: 'swim-in-rising-water',
    type: 'normal',
    functionName: { python: 'swimInWater', javascript: 'swimInWater', typescript: 'swimInWater', kotlin: 'swimInWater' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def swimInWater(grid: list) -> int:\n    pass`,
      javascript: `function swimInWater(grid) {\n\n}`,
      typescript: `function swimInWater(grid: number[][]): number {\n\n}`,
      kotlin: `fun swimInWater(grid: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { grid: [[0,2],[1,3]], expected: 3 },
        { grid: [[0,1,2,3,4],[24,23,22,21,5],[12,13,14,15,16],[11,17,18,19,20],[10,9,8,7,6]], expected: 16 }
      ];
      const tc = base[i % base.length];
      return { inputs: [tc.grid], expected: tc.expected };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 30 BFS problems…\n');

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
