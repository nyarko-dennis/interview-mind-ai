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
        return `arrayOf(${val.map(row => `intArrayOf(${row.join(',')})`).join(',')})`;
      }
      if (typeof val[0] === 'string') {
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

const PY_LIST_DEFS = `
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def _make(arr):
    if not arr: return None
    head = ListNode(arr[0])
    curr = head
    for v in arr[1:]:
        curr.next = ListNode(v)
        curr = curr.next
    return head

def _toArr(h):
    res = []
    while h:
        res.append(h.val)
        h = h.next
    return res
`;

const JS_LIST_DEFS = `
class ListNode {
    constructor(val, next) {
        this.val = (val===undefined ? 0 : val);
        this.next = (next===undefined ? null : next);
    }
}
function _make(arr) {
    if (!arr || arr.length === 0) return null;
    let head = new ListNode(arr[0]);
    let curr = head;
    for (let i = 1; i < arr.length; i++) {
        curr.next = new ListNode(arr[i]);
        curr = curr.next;
    }
    return head;
}
function _toArr(h) {
    let res = [];
    while (h) {
        res.push(h.val);
        h = h.next;
    }
    return res;
}
`;

const TS_LIST_DEFS = `
class ListNode {
    val: number;
    next: ListNode | null;
    constructor(val?: number, next?: ListNode | null) {
        this.val = (val===undefined ? 0 : val);
        this.next = (next===undefined ? null : next);
    }
}
function _make(arr: number[]): ListNode | null {
    if (!arr || arr.length === 0) return null;
    let head = new ListNode(arr[0]);
    let curr = head;
    for (let i = 1; i < arr.length; i++) {
        curr.next = new ListNode(arr[i]);
        curr = curr.next;
    }
    return head;
}
function _toArr(h: ListNode | null): number[] {
    let res: number[] = [];
    while (h) {
        res.push(h.val);
        h = h.next;
    }
    return res;
}
`;

const KT_LIST_DEFS = `
class ListNode(var \`val\`: Int) {
    var next: ListNode? = null
}
fun _make(arr: List<Int>): ListNode? {
    if (arr.isEmpty()) return null
    val head = ListNode(arr[0])
    var curr = head
    for (i in 1 until arr.size) {
        curr.next = ListNode(arr[i])
        curr = curr.next!!
    }
    return head
}
fun _toArr(h: ListNode?): List<Int> {
    val res = mutableListOf<Int>()
    var curr = h
    while (curr != null) {
        res.add(curr.\`val\`)
        curr = curr.next
    }
    return res
}
`;

// ---------------------------------------------------------------------------
// 30 FAST_SLOW_POINTERS PROBLEMS DATA
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
    slug: 'linked-list-cycle',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef hasCycle(head: ListNode) -> bool:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction hasCycle(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction hasCycle(head: ListNode | null): boolean {\n    return false;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun hasCycle(head: ListNode?): Boolean {\n    return false\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    n1, n2, n3, n4 = ListNode(3), ListNode(2), ListNode(0), ListNode(-4)
    n1.next, n2.next, n3.next, n4.next = n2, n3, n4, n2
    if hasCycle(n1) == True: _pass += 1
    _total += 1
    n5, n6 = ListNode(1), ListNode(2)
    n5.next = n6
    if hasCycle(n5) == False: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    let n1 = new ListNode(3), n2 = new ListNode(2), n3 = new ListNode(0), n4 = new ListNode(-4);
    n1.next = n2; n2.next = n3; n3.next = n4; n4.next = n2;
    if (hasCycle(n1) === true) _pass++;
    let n5 = new ListNode(1), n6 = new ListNode(2);
    n5.next = n6;
    if (hasCycle(n5) === false) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    let n1 = new ListNode(3), n2 = new ListNode(2), n3 = new ListNode(0), n4 = new ListNode(-4);
    n1.next = n2; n2.next = n3; n3.next = n4; n4.next = n2;
    if (hasCycle(n1) === true) _pass++;
    let n5 = new ListNode(1), n6 = new ListNode(2);
    n5.next = n6;
    if (hasCycle(n5) === false) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        val n1 = ListNode(3); val n2 = ListNode(2); val n3 = ListNode(0); val n4 = ListNode(-4)
        n1.next = n2; n2.next = n3; n3.next = n4; n4.next = n2
        if (hasCycle(n1) == true) _pass++
        val n5 = ListNode(1); val n6 = ListNode(2)
        n5.next = n6
        if (hasCycle(n5) == false) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'middle-of-the-linked-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef middleNode(head: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction middleNode(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction middleNode(head: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun middleNode(head: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(middleNode(_make([1,2,3,4,5]))) == [3,4,5]: _pass += 1
    _total += 1
    if _toArr(middleNode(_make([1,2,3,4,5,6]))) == [4,5,6]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(middleNode(_make([1,2,3,4,5])))) === JSON.stringify([3,4,5])) _pass++;
    if (JSON.stringify(_toArr(middleNode(_make([1,2,3,4,5,6])))) === JSON.stringify([4,5,6])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(middleNode(_make([1,2,3,4,5])))) === JSON.stringify([3,4,5])) _pass++;
    if (JSON.stringify(_toArr(middleNode(_make([1,2,3,4,5,6])))) === JSON.stringify([4,5,6])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(middleNode(_make(listOf(1,2,3,4,5)))) == listOf(3,4,5)) _pass++
        if (_toArr(middleNode(_make(listOf(1,2,3,4,5,6)))) == listOf(4,5,6)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'happy-number',
    functionName: { python: 'isHappy', javascript: 'isHappy', typescript: 'isHappy', kotlin: 'isHappy' },
    stubs: {
      python: `def isHappy(n: int) -> bool:\n    pass`,
      javascript: `function isHappy(n) {\n\n}`,
      typescript: `function isHappy(n: number): boolean {\n\n}`,
      kotlin: `fun isHappy(n: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 19, expected: true },
        { n: 2, expected: false }
      ];
      return { inputs: [base[i % base.length].n], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'palindrome-linked-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef isPalindrome(head: ListNode) -> bool:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction isPalindrome(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction isPalindrome(head: ListNode | null): boolean {\n    return false;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun isPalindrome(head: ListNode?): Boolean {\n    return false\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if isPalindrome(_make([1,2,2,1])) == True: _pass += 1
    _total += 1
    if isPalindrome(_make([1,2])) == False: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (isPalindrome(_make([1,2,2,1])) === true) _pass++;
    if (isPalindrome(_make([1,2])) === false) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (isPalindrome(_make([1,2,2,1])) === true) _pass++;
    if (isPalindrome(_make([1,2])) === false) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (isPalindrome(_make(listOf(1,2,2,1))) == true) _pass++
        if (isPalindrome(_make(listOf(1,2))) == false) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'remove-duplicates-from-sorted-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef deleteDuplicates(head: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction deleteDuplicates(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction deleteDuplicates(head: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun deleteDuplicates(head: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(deleteDuplicates(_make([1,1,2]))) == [1,2]: _pass += 1
    _total += 1
    if _toArr(deleteDuplicates(_make([1,1,2,3,3]))) == [1,2,3]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(deleteDuplicates(_make([1,1,2])))) === JSON.stringify([1,2])) _pass++;
    if (JSON.stringify(_toArr(deleteDuplicates(_make([1,1,2,3,3])))) === JSON.stringify([1,2,3])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(deleteDuplicates(_make([1,1,2])))) === JSON.stringify([1,2])) _pass++;
    if (JSON.stringify(_toArr(deleteDuplicates(_make([1,1,2,3,3])))) === JSON.stringify([1,2,3])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(deleteDuplicates(_make(listOf(1,1,2)))) == listOf(1,2)) _pass++
        if (_toArr(deleteDuplicates(_make(listOf(1,1,2,3,3)))) == listOf(1,2,3)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'remove-linked-list-elements',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef removeElements(head: ListNode, val: int) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction removeElements(head, val) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction removeElements(head: ListNode | null, val: number): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun removeElements(head: ListNode?, \`val\`: Int): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(removeElements(_make([1,2,6,3,4,5,6]), 6)) == [1,2,3,4,5]: _pass += 1
    _total += 1
    if _toArr(removeElements(_make([]), 1)) == []: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(removeElements(_make([1,2,6,3,4,5,6]), 6))) === JSON.stringify([1,2,3,4,5])) _pass++;
    if (JSON.stringify(_toArr(removeElements(_make([]), 1))) === JSON.stringify([])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(removeElements(_make([1,2,6,3,4,5,6]), 6))) === JSON.stringify([1,2,3,4,5])) _pass++;
    if (JSON.stringify(_toArr(removeElements(_make([]), 1))) === JSON.stringify([])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(removeElements(_make(listOf(1,2,6,3,4,5,6)), 6)) == listOf(1,2,3,4,5)) _pass++
        if (_toArr(removeElements(_make(listOf()), 1)) == listOf<Int>()) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'reverse-linked-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef reverseList(head: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction reverseList(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction reverseList(head: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun reverseList(head: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(reverseList(_make([1,2,3,4,5]))) == [5,4,3,2,1]: _pass += 1
    _total += 1
    if _toArr(reverseList(_make([1,2]))) == [2,1]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(reverseList(_make([1,2,3,4,5])))) === JSON.stringify([5,4,3,2,1])) _pass++;
    if (JSON.stringify(_toArr(reverseList(_make([1,2])))) === JSON.stringify([2,1])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(reverseList(_make([1,2,3,4,5])))) === JSON.stringify([5,4,3,2,1])) _pass++;
    if (JSON.stringify(_toArr(reverseList(_make([1,2])))) === JSON.stringify([2,1])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(reverseList(_make(listOf(1,2,3,4,5)))) == listOf(5,4,3,2,1)) _pass++
        if (_toArr(reverseList(_make(listOf(1,2)))) == listOf(2,1)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'merge-two-sorted-lists',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef mergeTwoLists(list1: ListNode, list2: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction mergeTwoLists(list1, list2) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction mergeTwoLists(list1: ListNode | null, list2: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun mergeTwoLists(list1: ListNode?, list2: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(mergeTwoLists(_make([1,2,4]), _make([1,3,4]))) == [1,1,2,3,4,4]: _pass += 1
    _total += 1
    if _toArr(mergeTwoLists(_make([]), _make([]))) == []: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(mergeTwoLists(_make([1,2,4]), _make([1,3,4])))) === JSON.stringify([1,1,2,3,4,4])) _pass++;
    if (JSON.stringify(_toArr(mergeTwoLists(_make([]), _make([])))) === JSON.stringify([])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(mergeTwoLists(_make([1,2,4]), _make([1,3,4])))) === JSON.stringify([1,1,2,3,4,4])) _pass++;
    if (JSON.stringify(_toArr(mergeTwoLists(_make([]), _make([])))) === JSON.stringify([])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(mergeTwoLists(_make(listOf(1,2,4)), _make(listOf(1,3,4)))) == listOf(1,1,2,3,4,4)) _pass++
        if (_toArr(mergeTwoLists(_make(listOf()), _make(listOf()))) == listOf<Int>()) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'intersection-of-two-linked-lists',
    stubs: {
      python: `class ListNode:\n    def __init__(self, x):\n        self.val = x\n        self.next = None\n\ndef getIntersectionNode(headA: ListNode, headB: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val) {\n        this.val = val;\n        this.next = null;\n    }\n}\nfunction getIntersectionNode(headA, headB) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction getIntersectionNode(headA: ListNode | null, headB: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun getIntersectionNode(headA: ListNode?, headB: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    # intersecting lists
    common = _make([8,4,5])
    a = _make([4,1])
    b = _make([5,6,1])
    a.next.next = common
    b.next.next.next = common
    if getIntersectionNode(a, b) == common: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let common = _make([8,4,5]);
    let a = _make([4,1]);
    let b = _make([5,6,1]);
    a.next.next = common;
    b.next.next.next = common;
    if (getIntersectionNode(a, b) === common) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let common = _make([8,4,5]);
    let a = _make([4,1]);
    let b = _make([5,6,1]);
    a.next.next = common;
    b.next.next.next = common;
    if (getIntersectionNode(a, b) === common) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val common = _make(listOf(8,4,5))
        val a = _make(listOf(4,1))
        val b = _make(listOf(5,6,1))
        a!!.next!!.next = common
        b!!.next!!.next!!.next = common
        if (getIntersectionNode(a, b) == common) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'delete-node-in-a-linked-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, x):\n        self.val = x\n        self.next = None\n\ndef deleteNode(node: ListNode) -> None:\n    pass`,
      javascript: `class ListNode {\n    constructor(val) {\n        this.val = val;\n        this.next = null;\n    }\n}\nfunction deleteNode(node) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction deleteNode(node: ListNode | null): void {\n\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun deleteNode(node: ListNode?) {\n\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    head = _make([4,5,1,9])
    target = head.next # node 5
    deleteNode(target)
    if _toArr(head) == [4,1,9]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let head = _make([4,5,1,9]);
    let target = head.next;
    deleteNode(target);
    if (JSON.stringify(_toArr(head)) === JSON.stringify([4,1,9])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let head = _make([4,5,1,9]);
    let target = head!.next;
    deleteNode(target);
    if (JSON.stringify(_toArr(head)) === JSON.stringify([4,1,9])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val head = _make(listOf(4,5,1,9))
        val target = head!!.next
        deleteNode(target)
        if (_toArr(head) == listOf(4,1,9)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'linked-list-cycle-ii',
    stubs: {
      python: `class ListNode:\n    def __init__(self, x):\n        self.val = x\n        self.next = None\n\ndef detectCycle(head: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val) {\n        this.val = val;\n        this.next = null;\n    }\n}\nfunction detectCycle(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction detectCycle(head: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun detectCycle(head: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    n1, n2, n3, n4 = ListNode(3), ListNode(2), ListNode(0), ListNode(-4)
    n1.next, n2.next, n3.next, n4.next = n2, n3, n4, n2
    if detectCycle(n1) == n2: _pass += 1
    _total += 1
    n5, n6 = ListNode(1), ListNode(2)
    n5.next = n6
    if detectCycle(n5) == None: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    let n1 = new ListNode(3), n2 = new ListNode(2), n3 = new ListNode(0), n4 = new ListNode(-4);
    n1.next = n2; n2.next = n3; n3.next = n4; n4.next = n2;
    if (detectCycle(n1) === n2) _pass++;
    let n5 = new ListNode(1), n6 = new ListNode(2);
    n5.next = n6;
    if (detectCycle(n5) === null) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    let n1 = new ListNode(3), n2 = new ListNode(2), n3 = new ListNode(0), n4 = new ListNode(-4);
    n1.next = n2; n2.next = n3; n3.next = n4; n4.next = n2;
    if (detectCycle(n1) === n2) _pass++;
    let n5 = new ListNode(1), n6 = new ListNode(2);
    n5.next = n6;
    if (detectCycle(n5) === null) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        val n1 = ListNode(3); val n2 = ListNode(2); val n3 = ListNode(0); val n4 = ListNode(-4)
        n1.next = n2; n2.next = n3; n3.next = n4; n4.next = n2
        if (detectCycle(n1) == n2) _pass++
        val n5 = ListNode(1); val n6 = ListNode(2)
        n5.next = n6
        if (detectCycle(n5) == null) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'find-the-duplicate-number',
    functionName: { python: 'findDuplicate', javascript: 'findDuplicate', typescript: 'findDuplicate', kotlin: 'findDuplicate' },
    stubs: {
      python: `def findDuplicate(nums: list) -> int:\n    pass`,
      javascript: `function findDuplicate(nums) {\n\n}`,
      typescript: `function findDuplicate(nums: number[]): number {\n\n}`,
      kotlin: `fun findDuplicate(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,3,4,2,2], expected: 2 },
        { nums: [3,1,3,4,2], expected: 3 },
        { nums: [3,3,3,3,3], expected: 3 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'remove-nth-node-from-end-of-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef removeNthFromEnd(head: ListNode, n: int) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction removeNthFromEnd(head, n) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction removeNthFromEnd(head: ListNode | null, n: number): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun removeNthFromEnd(head: ListNode?, n: Int): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(removeNthFromEnd(_make([1,2,3,4,5]), 2)) == [1,2,3,5]: _pass += 1
    _total += 1
    if _toArr(removeNthFromEnd(_make([1]), 1)) == []: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(removeNthFromEnd(_make([1,2,3,4,5]), 2))) === JSON.stringify([1,2,3,5])) _pass++;
    if (JSON.stringify(_toArr(removeNthFromEnd(_make([1]), 1))) === JSON.stringify([])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(removeNthFromEnd(_make([1,2,3,4,5]), 2))) === JSON.stringify([1,2,3,5])) _pass++;
    if (JSON.stringify(_toArr(removeNthFromEnd(_make([1]), 1))) === JSON.stringify([])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(removeNthFromEnd(_make(listOf(1,2,3,4,5)), 2)) == listOf(1,2,3,5)) _pass++
        if (_toArr(removeNthFromEnd(_make(listOf(1)), 1)) == listOf<Int>()) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'reorder-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef reorderList(head: ListNode) -> None:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction reorderList(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction reorderList(head: ListNode | null): void {\n\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun reorderList(head: ListNode?) {\n\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    head = _make([1,2,3,4])
    reorderList(head)
    if _toArr(head) == [1,4,2,3]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let head = _make([1,2,3,4]);
    reorderList(head);
    if (JSON.stringify(_toArr(head)) === JSON.stringify([1,4,2,3])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let head = _make([1,2,3,4]);
    reorderList(head);
    if (JSON.stringify(_toArr(head)) === JSON.stringify([1,4,2,3])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val head = _make(listOf(1,2,3,4))
        reorderList(head)
        if (_toArr(head) == listOf(1,4,2,3)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'sort-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef sortList(head: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction sortList(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction sortList(head: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun sortList(head: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(sortList(_make([4,2,1,3]))) == [1,2,3,4]: _pass += 1
    _total += 1
    if _toArr(sortList(_make([-1,5,3,4,0]))) == [-1,0,3,4,5]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(sortList(_make([4,2,1,3])))) === JSON.stringify([1,2,3,4])) _pass++;
    if (JSON.stringify(_toArr(sortList(_make([-1,5,3,4,0])))) === JSON.stringify([-1,0,3,4,5])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(sortList(_make([4,2,1,3])))) === JSON.stringify([1,2,3,4])) _pass++;
    if (JSON.stringify(_toArr(sortList(_make([-1,5,3,4,0])))) === JSON.stringify([-1,0,3,4,5])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(sortList(_make(listOf(4,2,1,3)))) == listOf(1,2,3,4)) _pass++
        if (_toArr(sortList(_make(listOf(-1,5,3,4,0)))) == listOf(-1,0,3,4,5)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'circular-array-loop',
    functionName: { python: 'circularArrayLoop', javascript: 'circularArrayLoop', typescript: 'circularArrayLoop', kotlin: 'circularArrayLoop' },
    stubs: {
      python: `def circularArrayLoop(nums: list) -> bool:\n    pass`,
      javascript: `function circularArrayLoop(nums) {\n\n}`,
      typescript: `function circularArrayLoop(nums: number[]): boolean {\n\n}`,
      kotlin: `fun circularArrayLoop(nums: IntArray): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [2,-1,1,2,2], expected: true },
        { nums: [-1,2], expected: false },
        { nums: [-2,1,-1,-2,-2], expected: false }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'remove-duplicates-from-sorted-list-ii',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef deleteDuplicates(head: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction deleteDuplicates(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction deleteDuplicates(head: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun deleteDuplicates(head: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(deleteDuplicates(_make([1,2,3,3,4,4,5]))) == [1,2,5]: _pass += 1
    _total += 1
    if _toArr(deleteDuplicates(_make([1,1,1,2,3]))) == [2,3]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(deleteDuplicates(_make([1,2,3,3,4,4,5])))) === JSON.stringify([1,2,5])) _pass++;
    if (JSON.stringify(_toArr(deleteDuplicates(_make([1,1,1,2,3])))) === JSON.stringify([2,3])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(deleteDuplicates(_make([1,2,3,3,4,4,5])))) === JSON.stringify([1,2,5])) _pass++;
    if (JSON.stringify(_toArr(deleteDuplicates(_make([1,1,1,2,3])))) === JSON.stringify([2,3])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(deleteDuplicates(_make(listOf(1,2,3,3,4,4,5)))) == listOf(1,2,5)) _pass++
        if (_toArr(deleteDuplicates(_make(listOf(1,1,1,2,3)))) == listOf(2,3)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'rotate-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef rotateRight(head: ListNode, k: int) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction rotateRight(head, k) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction rotateRight(head: ListNode | null, k: number): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun rotateRight(head: ListNode?, k: Int): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(rotateRight(_make([1,2,3,4,5]), 2)) == [4,5,1,2,3]: _pass += 1
    _total += 1
    if _toArr(rotateRight(_make([0,1,2]), 4)) == [2,0,1]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(rotateRight(_make([1,2,3,4,5]), 2))) === JSON.stringify([4,5,1,2,3])) _pass++;
    if (JSON.stringify(_toArr(rotateRight(_make([0,1,2]), 4))) === JSON.stringify([2,0,1])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(rotateRight(_make([1,2,3,4,5]), 2))) === JSON.stringify([4,5,1,2,3])) _pass++;
    if (JSON.stringify(_toArr(rotateRight(_make([0,1,2]), 4))) === JSON.stringify([2,0,1])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(rotateRight(_make(listOf(1,2,3,4,5)), 2)) == listOf(4,5,1,2,3)) _pass++
        if (_toArr(rotateRight(_make(listOf(0,1,2)), 4)) == listOf(2,0,1)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'copy-list-with-random-pointer',
    stubs: {
      python: `class Node:\n    def __init__(self, x: int, next: 'Node' = None, random: 'Node' = None):\n        self.val = int(x)\n        self.next = next\n        self.random = random\n\ndef copyRandomList(head: 'Node') -> 'Node':\n    pass`,
      javascript: `class Node {\n    constructor(val, next, random) {\n        this.val = val;\n        this.next = next;\n        this.random = random;\n    }\n}\nfunction copyRandomList(head) {\n\n}`,
      typescript: `class Node {\n    val: number;\n    next: Node | null;\n    random: Node | null;\n    constructor(val?: number, next?: Node | null, random?: Node | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n        this.random = (random===undefined ? null : random);\n    }\n}\nfunction copyRandomList(head: Node | null): Node | null {\n    return null;\n}`,
      kotlin: `class Node(var \`val\`: Int) {\n    var next: Node? = null\n    var random: Node? = null\n}\nfun copyRandomList(head: Node?): Node? {\n    return null\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    # Check if a copy of list [[7,null],[13,0],[11,4],[10,2],[1,0]] is made correctly.
    # We can write a simple test node creation
    n1, n2, n3 = Node(7), Node(13), Node(11)
    n1.next = n2; n2.next = n3
    n2.random = n1
    n3.random = n3
    res = copyRandomList(n1)
    if res and res is not n1 and res.val == 7:
        if res.next and res.next is not n2 and res.next.val == 13:
            if res.next.random and res.next.random.val == 7:
                _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let n1 = new Node(7), n2 = new Node(13), n3 = new Node(11);
    n1.next = n2; n2.next = n3;
    n2.random = n1;
    n3.random = n3;
    let res = copyRandomList(n1);
    if (res && res !== n1 && res.val === 7) {
        if (res.next && res.next !== n2 && res.next.val === 13) {
            if (res.next.random && res.next.random.val === 7) {
                _pass++;
            }
        }
    }
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let n1 = new Node(7), n2 = new Node(13), n3 = new Node(11);
    n1.next = n2; n2.next = n3;
    n2.random = n1;
    n3.random = n3;
    let res = copyRandomList(n1);
    if (res && res !== n1 && res.val === 7) {
        if (res.next && res.next !== n2 && res.next.val === 13) {
            if (res.next.random && res.next.random.val === 7) {
                _pass++;
            }
        }
    }
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val n1 = Node(7); val n2 = Node(13); val n3 = Node(11)
        n1.next = n2; n2.next = n3
        n2.random = n1
        n3.random = n3
        val res = copyRandomList(n1)
        if (res != null && res !== n1 && res.\`val\` == 7) {
            if (res.next != null && res.next !== n2 && res.next!!.\`val\` == 13) {
                if (res.next!!.random != null && res.next!!.random!!.\`val\` == 7) {
                    _pass++
                }
            }
        }
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'maximum-twin-sum-of-a-linked-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef pairSum(head: ListNode) -> int:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction pairSum(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction pairSum(head: ListNode | null): number {\n    return 0;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun pairSum(head: ListNode?): Int {\n    return 0\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if pairSum(_make([5,4,2,1])) == 6: _pass += 1
    _total += 1
    if pairSum(_make([4,2,2,3])) == 7: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (pairSum(_make([5,4,2,1])) === 6) _pass++;
    if (pairSum(_make([4,2,2,3])) === 7) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (pairSum(_make([5,4,2,1])) === 6) _pass++;
    if (pairSum(_make([4,2,2,3])) === 7) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (pairSum(_make(listOf(5,4,2,1))) == 6) _pass++
        if (pairSum(_make(listOf(4,2,2,3))) == 7) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'reverse-nodes-in-k-group',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef reverseKGroup(head: ListNode, k: int) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction reverseKGroup(head, k) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction reverseKGroup(head: ListNode | null, k: number): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun reverseKGroup(head: ListNode?, k: Int): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(reverseKGroup(_make([1,2,3,4,5]), 2)) == [2,1,4,3,5]: _pass += 1
    _total += 1
    if _toArr(reverseKGroup(_make([1,2,3,4,5]), 3)) == [3,2,1,4,5]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(reverseKGroup(_make([1,2,3,4,5]), 2))) === JSON.stringify([2,1,4,3,5])) _pass++;
    if (JSON.stringify(_toArr(reverseKGroup(_make([1,2,3,4,5]), 3))) === JSON.stringify([3,2,1,4,5])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(reverseKGroup(_make([1,2,3,4,5]), 2))) === JSON.stringify([2,1,4,3,5])) _pass++;
    if (JSON.stringify(_toArr(reverseKGroup(_make([1,2,3,4,5]), 3))) === JSON.stringify([3,2,1,4,5])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(reverseKGroup(_make(listOf(1,2,3,4,5)), 2)) == listOf(2,1,4,3,5)) _pass++
        if (_toArr(reverseKGroup(_make(listOf(1,2,3,4,5)), 3)) == listOf(3,2,1,4,5)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'merge-k-sorted-lists',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef mergeKLists(lists: list) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction mergeKLists(lists) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction mergeKLists(lists: Array<ListNode | null>): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun mergeKLists(lists: Array<ListNode?>): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    lists = [_make([1,4,5]), _make([1,3,4]), _make([2,6])]
    if _toArr(mergeKLists(lists)) == [1,1,2,3,4,4,5,6]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let lists = [_make([1,4,5]), _make([1,3,4]), _make([2,6])];
    if (JSON.stringify(_toArr(mergeKLists(lists))) === JSON.stringify([1,1,2,3,4,4,5,6])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let lists = [_make([1,4,5]), _make([1,3,4]), _make([2,6])];
    if (JSON.stringify(_toArr(mergeKLists(lists))) === JSON.stringify([1,1,2,3,4,4,5,6])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val lists = arrayOf(_make(listOf(1,4,5)), _make(listOf(1,3,4)), _make(listOf(2,6)))
        if (_toArr(mergeKLists(lists)) == listOf(1,1,2,3,4,4,5,6)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'all-o-1-data-structure',
    stubs: {
      python: `class AllOne:\n    def __init__(self):\n        pass\n    def inc(self, key: str) -> None:\n        pass\n    def dec(self, key: str) -> None:\n        pass\n    def getMaxKey(self) -> str:\n        pass\n    def getMinKey(self) -> str:\n        pass`,
      javascript: `class AllOne {\n    constructor() {\n\n    }\n    inc(key) {\n\n    }\n    dec(key) {\n\n    }\n    getMaxKey() {\n\n    }\n    getMinKey() {\n\n    }\n}`,
      typescript: `class AllOne {\n    constructor() {\n\n    }\n    inc(key: string): void {\n\n    }\n    dec(key: string): void {\n\n    }\n    getMaxKey(): string {\n        return "";\n    }\n    getMinKey(): string {\n        return "";\n    }\n}`,
      kotlin: `class AllOne() {\n    fun inc(key: String) {\n\n    }\n    fun dec(key: String) {\n\n    }\n    fun getMaxKey(): String {\n        return ""\n    }\n    fun getMinKey(): String {\n        return ""\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    ao = AllOne()
    ao.inc("hello")
    ao.inc("hello")
    ans1 = ao.getMaxKey() # "hello"
    ans2 = ao.getMinKey() # "hello"
    ao.inc("leet")
    ans3 = ao.getMaxKey() # "hello"
    ans4 = ao.getMinKey() # "leet"
    if ans1 == "hello" and ans2 == "hello" and ans3 == "hello" and ans4 == "leet":
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let ao = new AllOne();
    ao.inc("hello");
    ao.inc("hello");
    let ans1 = ao.getMaxKey();
    let ans2 = ao.getMinKey();
    ao.inc("leet");
    let ans3 = ao.getMaxKey();
    let ans4 = ao.getMinKey();
    if (ans1 === "hello" && ans2 === "hello" && ans3 === "hello" && ans4 === "leet") _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let ao = new AllOne();
    ao.inc("hello");
    ao.inc("hello");
    let ans1 = ao.getMaxKey();
    let ans2 = ao.getMinKey();
    ao.inc("leet");
    let ans3 = ao.getMaxKey();
    let ans4 = ao.getMinKey();
    if (ans1 === "hello" && ans2 === "hello" && ans3 === "hello" && ans4 === "leet") _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val ao = AllOne()
        ao.inc("hello")
        ao.inc("hello")
        val ans1 = ao.getMaxKey()
        val ans2 = ao.getMinKey()
        ao.inc("leet")
        val ans3 = ao.getMaxKey()
        val ans4 = ao.getMinKey()
        if (ans1 == "hello" && ans2 == "hello" && ans3 == "hello" && ans4 == "leet") _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'lfu-cache',
    stubs: {
      python: `class LFUCache:\n    def __init__(self, capacity: int):\n        pass\n    def get(self, key: int) -> int:\n        pass\n    def put(self, key: int, value: int) -> None:\n        pass`,
      javascript: `class LFUCache {\n    constructor(capacity) {\n\n    }\n    get(key) {\n\n    }\n    put(key, value) {\n\n    }\n}`,
      typescript: `class LFUCache {\n    constructor(capacity: number) {\n\n    }\n    get(key: number): number {\n        return 0;\n    }\n    put(key: number, value: number): void {\n\n    }\n}`,
      kotlin: `class LFUCache(capacity: Int) {\n    fun get(key: Int): Int {\n        return 0\n    }\n    fun put(key: Int, value: Int) {\n\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    cache = LFUCache(2)
    cache.put(1, 1)
    cache.put(2, 2)
    ans1 = cache.get(1) # 1
    cache.put(3, 3)     # evicts 2
    ans2 = cache.get(2) # -1
    ans3 = cache.get(3) # 3
    cache.put(4, 4)     # evicts 1
    ans4 = cache.get(1) # -1
    ans5 = cache.get(3) # 3
    ans6 = cache.get(4) # 4
    if [ans1, ans2, ans3, ans4, ans5, ans6] == [1, -1, 3, -1, 3, 4]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let cache = new LFUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    let ans1 = cache.get(1);
    cache.put(3, 3);
    let ans2 = cache.get(2);
    let ans3 = cache.get(3);
    cache.put(4, 4);
    let ans4 = cache.get(1);
    let ans5 = cache.get(3);
    let ans6 = cache.get(4);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6]) === JSON.stringify([1, -1, 3, -1, 3, 4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let cache = new LFUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    let ans1 = cache.get(1);
    cache.put(3, 3);
    let ans2 = cache.get(2);
    let ans3 = cache.get(3);
    cache.put(4, 4);
    let ans4 = cache.get(1);
    let ans5 = cache.get(3);
    let ans6 = cache.get(4);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6]) === JSON.stringify([1, -1, 3, -1, 3, 4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val cache = LFUCache(2)
        cache.put(1, 1)
        cache.put(2, 2)
        val ans1 = cache.get(1)
        cache.put(3, 3)
        val ans2 = cache.get(2)
        val ans3 = cache.get(3)
        cache.put(4, 4)
        val ans4 = cache.get(1)
        val ans5 = cache.get(3)
        val ans6 = cache.get(4)
        if (ans1 == 1 && ans2 == -1 && ans3 == 3 && ans4 == -1 && ans5 == 3 && ans6 == 4) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'design-skiplist',
    stubs: {
      python: `class Skiplist:\n    def __init__(self):\n        pass\n    def search(self, target: int) -> bool:\n        pass\n    def add(self, num: int) -> None:\n        pass\n    def erase(self, num: int) -> bool:\n        pass`,
      javascript: `class Skiplist {\n    constructor() {\n\n    }\n    search(target) {\n\n    }\n    add(num) {\n\n    }\n    erase(num) {\n\n    }\n}`,
      typescript: `class Skiplist {\n    constructor() {\n\n    }\n    search(target: number): boolean {\n        return false;\n    }\n    add(num: number): void {\n\n    }\n    erase(num: number): boolean {\n        return false;\n    }\n}`,
      kotlin: `class Skiplist() {\n    fun search(target: Int): Boolean {\n        return false\n    }\n    fun add(num: Int) {\n\n    }\n    fun erase(num: Int): Boolean {\n        return false\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    sl = Skiplist()
    sl.add(1)
    sl.add(2)
    sl.add(3)
    ans1 = sl.search(0)
    sl.add(4)
    ans2 = sl.search(1)
    ans3 = sl.erase(0)
    ans4 = sl.erase(1)
    ans5 = sl.search(1)
    if [ans1, ans2, ans3, ans4, ans5] == [False, True, False, True, False]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let sl = new Skiplist();
    sl.add(1);
    sl.add(2);
    sl.add(3);
    let ans1 = sl.search(0);
    sl.add(4);
    let ans2 = sl.search(1);
    let ans3 = sl.erase(0);
    let ans4 = sl.erase(1);
    let ans5 = sl.search(1);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5]) === JSON.stringify([false, true, false, true, false])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let sl = new Skiplist();
    sl.add(1);
    sl.add(2);
    sl.add(3);
    let ans1 = sl.search(0);
    sl.add(4);
    let ans2 = sl.search(1);
    let ans3 = sl.erase(0);
    let ans4 = sl.erase(1);
    let ans5 = sl.search(1);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5]) === JSON.stringify([false, true, false, true, false])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val sl = Skiplist()
        sl.add(1)
        sl.add(2)
        sl.add(3)
        val ans1 = sl.search(0)
        sl.add(4)
        val ans2 = sl.search(1)
        val ans3 = sl.erase(0)
        val ans4 = sl.erase(1)
        val ans5 = sl.search(1)
        if (ans1 == false && ans2 == true && ans3 == false && ans4 == true && ans5 == false) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'max-stack',
    stubs: {
      python: `class MaxStack:\n    def __init__(self):\n        pass\n    def push(self, x: int) -> None:\n        pass\n    def pop(self) -> int:\n        pass\n    def top(self) -> int:\n        pass\n    def peekMax(self) -> int:\n        pass\n    def popMax(self) -> int:\n        pass`,
      javascript: `class MaxStack {\n    constructor() {\n\n    }\n    push(x) {\n\n    }\n    pop() {\n\n    }\n    top() {\n\n    }\n    peekMax() {\n\n    }\n    popMax() {\n\n    }\n}`,
      typescript: `class MaxStack {\n    constructor() {\n\n    }\n    push(x: number): void {\n\n    }\n    pop(): number {\n        return 0;\n    }\n    top(): number {\n        return 0;\n    }\n    peekMax(): number {\n        return 0;\n    }\n    popMax(): number {\n        return 0;\n    }\n}`,
      kotlin: `class MaxStack() {\n    fun push(x: Int) {\n\n    }\n    fun pop(): Int {\n        return 0\n    }\n    fun top(): Int {\n        return 0\n    }\n    fun peekMax(): Int {\n        return 0\n    }\n    fun popMax(): Int {\n        return 0\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    ms = MaxStack()
    ms.push(5)
    ms.push(1)
    ms.push(5)
    ans1 = ms.top()
    ans2 = ms.popMax()
    ans3 = ms.peekMax()
    ans4 = ms.pop()
    ans5 = ms.top()
    if [ans1, ans2, ans3, ans4, ans5] == [5, 5, 5, 1, 5]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let ms = new MaxStack();
    ms.push(5);
    ms.push(1);
    ms.push(5);
    let ans1 = ms.top();
    let ans2 = ms.popMax();
    let ans3 = ms.peekMax();
    let ans4 = ms.pop();
    let ans5 = ms.top();
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5]) === JSON.stringify([5, 5, 5, 1, 5])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let ms = new MaxStack();
    ms.push(5);
    ms.push(1);
    ms.push(5);
    let ans1 = ms.top();
    let ans2 = ms.popMax();
    let ans3 = ms.peekMax();
    let ans4 = ms.pop();
    let ans5 = ms.top();
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5]) === JSON.stringify([5, 5, 5, 1, 5])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val ms = MaxStack()
        ms.push(5)
        ms.push(1)
        ms.push(5)
        val ans1 = ms.top()
        val ans2 = ms.popMax()
        val ans3 = ms.peekMax()
        val ans4 = ms.pop()
        val ans5 = ms.top()
        if (ans1 == 5 && ans2 == 5 && ans3 == 5 && ans4 == 1 && ans5 == 5) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'design-a-text-editor',
    stubs: {
      python: `class TextEditor:\n    def __init__(self):\n        pass\n    def addText(self, text: str) -> None:\n        pass\n    def deleteText(self, k: int) -> int:\n        pass\n    def cursorLeft(self, k: int) -> str:\n        pass\n    def cursorRight(self, k: int) -> str:\n        pass`,
      javascript: `class TextEditor {\n    constructor() {\n\n    }\n    addText(text) {\n\n    }\n    deleteText(k) {\n\n    }\n    cursorLeft(k) {\n\n    }\n    cursorRight(k) {\n\n    }\n}`,
      typescript: `class TextEditor {\n    constructor() {\n\n    }\n    addText(text: string): void {\n\n    }\n    deleteText(k: number): number {\n        return 0;\n    }\n    cursorLeft(k: number): string {\n        return "";\n    }\n    cursorRight(k: number): string {\n        return "";\n    }\n}`,
      kotlin: `class TextEditor() {\n    fun addText(text: String) {\n\n    }\n    fun deleteText(k: Int): Int {\n        return 0\n    }\n    fun cursorLeft(k: Int): String {\n        return ""\n    }\n    fun cursorRight(k: Int): String {\n        return ""\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    te = TextEditor()
    te.addText("leetcode")
    ans1 = te.deleteText(4)
    te.addText("practice")
    ans2 = te.cursorRight(3)
    ans3 = te.cursorLeft(8)
    ans4 = te.deleteText(10)
    ans5 = te.cursorLeft(2)
    ans6 = te.cursorRight(6)
    if [ans1, ans2, ans3, ans4, ans5, ans6] == [4, "etpractice", "leet", 4, "", "practi"]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let te = new TextEditor();
    te.addText("leetcode");
    let ans1 = te.deleteText(4);
    te.addText("practice");
    let ans2 = te.cursorRight(3);
    let ans3 = te.cursorLeft(8);
    let ans4 = te.deleteText(10);
    let ans5 = te.cursorLeft(2);
    let ans6 = te.cursorRight(6);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6]) === JSON.stringify([4, "etpractice", "leet", 4, "", "practi"])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let te = new TextEditor();
    te.addText("leetcode");
    let ans1 = te.deleteText(4);
    te.addText("practice");
    let ans2 = te.cursorRight(3);
    let ans3 = te.cursorLeft(8);
    let ans4 = te.deleteText(10);
    let ans5 = te.cursorLeft(2);
    let ans6 = te.cursorRight(6);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6]) === JSON.stringify([4, "etpractice", "leet", 4, "", "practi"])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val te = TextEditor()
        te.addText("leetcode")
        val ans1 = te.deleteText(4)
        te.addText("practice")
        val ans2 = te.cursorRight(3)
        val ans3 = te.cursorLeft(8)
        val ans4 = te.deleteText(10)
        val ans5 = te.cursorLeft(2)
        val ans6 = te.cursorRight(6)
        if (ans1 == 4 && ans2 == "etpractice" && ans3 == "leet" && ans4 == 4 && ans5 == "" && ans6 == "practi") _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'maximum-employees-to-be-invited-to-a-meeting',
    functionName: { python: 'maximumInvitations', javascript: 'maximumInvitations', typescript: 'maximumInvitations', kotlin: 'maximumInvitations' },
    stubs: {
      python: `def maximumInvitations(favorite: list) -> int:\n    pass`,
      javascript: `function maximumInvitations(favorite) {\n\n}`,
      typescript: `function maximumInvitations(favorite: number[]): number {\n\n}`,
      kotlin: `fun maximumInvitations(favorite: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { favorite: [2,2,1,2], expected: 3 },
        { favorite: [1,2,0], expected: 3 },
        { favorite: [3,0,1,4,1], expected: 4 }
      ];
      return { inputs: [base[i % base.length].favorite], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'longest-cycle-in-a-graph',
    functionName: { python: 'longestCycle', javascript: 'longestCycle', typescript: 'longestCycle', kotlin: 'longestCycle' },
    stubs: {
      python: `def longestCycle(edges: list) -> int:\n    pass`,
      javascript: `function longestCycle(edges) {\n\n}`,
      typescript: `function longestCycle(edges: number[]): number {\n\n}`,
      kotlin: `fun longestCycle(edges: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { edges: [3,3,4,2,3], expected: 3 },
        { edges: [2,-1,3,1], expected: -1 }
      ];
      return { inputs: [base[i % base.length].edges], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'redundant-connection-ii',
    functionName: { python: 'findRedundantDirectedConnection', javascript: 'findRedundantDirectedConnection', typescript: 'findRedundantDirectedConnection', kotlin: 'findRedundantDirectedConnection' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def findRedundantDirectedConnection(edges: list) -> list:\n    pass`,
      javascript: `function findRedundantDirectedConnection(edges) {\n\n}`,
      typescript: `function findRedundantDirectedConnection(edges: number[][]): number[] {\n\n}`,
      kotlin: `fun findRedundantDirectedConnection(edges: Array<IntArray>): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { edges: [[1,2],[1,3],[2,3]], expected: [2,3] },
        { edges: [[1,2],[2,3],[3,4],[4,1],[1,5]], expected: [4,1] }
      ];
      return { inputs: [base[i % base.length].edges], expected: base[i % base.length].expected };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 30 FAST_SLOW_POINTERS problems…\n');

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

    console.log(`  ✓  [${dbProblem.difficulty}] ${prob.slug} (${prob.testCases?.length || 15} test cases seeded)`);
  }

  console.log('\nDone.');
  await client.end();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
