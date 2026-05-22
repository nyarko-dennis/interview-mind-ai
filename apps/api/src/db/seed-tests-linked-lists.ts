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
// 30 LINKED_LISTS PROBLEMS DATA
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
    slug: 'convert-binary-number-in-a-linked-list-to-integer',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef getDecimalValue(head: ListNode) -> int:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction getDecimalValue(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction getDecimalValue(head: ListNode | null): number {\n    return 0;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun getDecimalValue(head: ListNode?): Int {\n    return 0\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if getDecimalValue(_make([1,0,1])) == 5: _pass += 1
    _total += 1
    if getDecimalValue(_make([0])) == 0: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (getDecimalValue(_make([1,0,1])) === 5) _pass++;
    if (getDecimalValue(_make([0])) === 0) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (getDecimalValue(_make([1,0,1])) === 5) _pass++;
    if (getDecimalValue(_make([0])) === 0) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (getDecimalValue(_make(listOf(1,0,1))) == 5) _pass++
        if (getDecimalValue(_make(listOf(0))) == 0) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'design-hashmap',
    stubs: {
      python: `class MyHashMap:\n    def __init__(self):\n        pass\n    def put(self, key: int, value: int) -> None:\n        pass\n    def get(self, key: int) -> int:\n        pass\n    def remove(self, key: int) -> None:\n        pass`,
      javascript: `class MyHashMap {\n    constructor() {\n\n    }\n    put(key, value) {\n\n    }\n    get(key) {\n\n    }\n    remove(key) {\n\n    }\n}`,
      typescript: `class MyHashMap {\n    constructor() {\n\n    }\n    put(key: number, value: number): void {\n\n    }\n    get(key: number): number {\n        return 0;\n    }\n    remove(key: number): void {\n\n    }\n}`,
      kotlin: `class MyHashMap() {\n    fun put(key: Int, value: Int) {\n\n    }\n    fun get(key: Int): Int {\n        return 0\n    }\n    fun remove(key: Int) {\n\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    hm = MyHashMap()
    hm.put(1, 1)
    hm.put(2, 2)
    ans1 = hm.get(1) # 1
    ans2 = hm.get(3) # -1
    hm.put(2, 1)
    ans3 = hm.get(2) # 1
    hm.remove(2)
    ans4 = hm.get(2) # -1
    if [ans1, ans2, ans3, ans4] == [1, -1, 1, -1]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let hm = new MyHashMap();
    hm.put(1, 1);
    hm.put(2, 2);
    let ans1 = hm.get(1);
    let ans2 = hm.get(3);
    hm.put(2, 1);
    let ans3 = hm.get(2);
    hm.remove(2);
    let ans4 = hm.get(2);
    if (JSON.stringify([ans1, ans2, ans3, ans4]) === JSON.stringify([1, -1, 1, -1])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let hm = new MyHashMap();
    hm.put(1, 1);
    hm.put(2, 2);
    let ans1 = hm.get(1);
    let ans2 = hm.get(3);
    hm.put(2, 1);
    let ans3 = hm.get(2);
    hm.remove(2);
    let ans4 = hm.get(2);
    if (JSON.stringify([ans1, ans2, ans3, ans4]) === JSON.stringify([1, -1, 1, -1])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val hm = MyHashMap()
        hm.put(1, 1)
        hm.put(2, 2)
        val ans1 = hm.get(1)
        val ans2 = hm.get(3)
        hm.put(2, 1)
        val ans3 = hm.get(2)
        hm.remove(2)
        val ans4 = hm.get(2)
        if (ans1 == 1 && ans2 == -1 && ans3 == 1 && ans4 == -1) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'design-hashset',
    stubs: {
      python: `class MyHashSet:\n    def __init__(self):\n        pass\n    def add(self, key: int) -> None:\n        pass\n    def remove(self, key: int) -> None:\n        pass\n    def contains(self, key: int) -> bool:\n        pass`,
      javascript: `class MyHashSet {\n    constructor() {\n\n    }\n    add(key) {\n\n    }\n    remove(key) {\n\n    }\n    contains(key) {\n\n    }\n}`,
      typescript: `class MyHashSet {\n    constructor() {\n\n    }\n    add(key: number): void {\n\n    }\n    remove(key: number): void {\n\n    }\n    contains(key: number): boolean {\n        return false;\n    }\n}`,
      kotlin: `class MyHashSet() {\n    fun add(key: Int) {\n\n    }\n    fun remove(key: Int) {\n\n    }\n    fun contains(key: Int): Boolean {\n        return false\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    hs = MyHashSet()
    hs.add(1)
    hs.add(2)
    ans1 = hs.contains(1) # True
    ans2 = hs.contains(3) # False
    hs.add(2)
    ans3 = hs.contains(2) # True
    hs.remove(2)
    ans4 = hs.contains(2) # False
    if [ans1, ans2, ans3, ans4] == [True, False, True, False]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let hs = new MyHashSet();
    hs.add(1);
    hs.add(2);
    let ans1 = hs.contains(1);
    let ans2 = hs.contains(3);
    hs.add(2);
    let ans3 = hs.contains(2);
    hs.remove(2);
    let ans4 = hs.contains(2);
    if (JSON.stringify([ans1, ans2, ans3, ans4]) === JSON.stringify([true, false, true, false])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let hs = new MyHashSet();
    hs.add(1);
    hs.add(2);
    let ans1 = hs.contains(1);
    let ans2 = hs.contains(3);
    hs.add(2);
    let ans3 = hs.contains(2);
    hs.remove(2);
    let ans4 = hs.contains(2);
    if (JSON.stringify([ans1, ans2, ans3, ans4]) === JSON.stringify([true, false, true, false])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val hs = MyHashSet()
        hs.add(1)
        hs.add(2)
        val ans1 = hs.contains(1)
        val ans2 = hs.contains(3)
        hs.add(2)
        val ans3 = hs.contains(2)
        hs.remove(2)
        val ans4 = hs.contains(2)
        if (ans1 == true && ans2 == false && ans3 == true && ans4 == false) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'delete-n-nodes-after-m-nodes-of-a-linked-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef deleteNodes(head: ListNode, m: int, n: int) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction deleteNodes(head, m, n) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction deleteNodes(head: ListNode | null, m: number, n: number): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun deleteNodes(head: ListNode?, m: Int, n: Int): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(deleteNodes(_make([1,2,3,4,5,6,7,8,9,10,11,12,13]), 2, 3)) == [1,2,6,7,11,12]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    if (JSON.stringify(_toArr(deleteNodes(_make([1,2,3,4,5,6,7,8,9,10,11,12,13]), 2, 3))) === JSON.stringify([1,2,6,7,11,12])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    if (JSON.stringify(_toArr(deleteNodes(_make([1,2,3,4,5,6,7,8,9,10,11,12,13]), 2, 3))) === JSON.stringify([1,2,6,7,11,12])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        if (_toArr(deleteNodes(_make(listOf(1,2,3,4,5,6,7,8,9,10,11,12,13)), 2, 3)) == listOf(1,2,6,7,11,12)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'swap-nodes-in-pairs',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef swapPairs(head: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction swapPairs(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction swapPairs(head: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun swapPairs(head: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(swapPairs(_make([1,2,3,4]))) == [2,1,4,3]: _pass += 1
    _total += 1
    if _toArr(swapPairs(_make([]))) == []: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(swapPairs(_make([1,2,3,4])))) === JSON.stringify([2,1,4,3])) _pass++;
    if (JSON.stringify(_toArr(swapPairs(_make([])))) === JSON.stringify([])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(swapPairs(_make([1,2,3,4])))) === JSON.stringify([2,1,4,3])) _pass++;
    if (JSON.stringify(_toArr(swapPairs(_make([])))) === JSON.stringify([])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(swapPairs(_make(listOf(1,2,3,4)))) == listOf(2,1,4,3)) _pass++
        if (_toArr(swapPairs(_make(listOf()))) == listOf<Int>()) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'partition-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef partition(head: ListNode, x: int) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction partition(head, x) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction partition(head: ListNode | null, x: number): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun partition(head: ListNode?, x: Int): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(partition(_make([1,4,3,2,5,2]), 3)) == [1,2,2,4,3,5]: _pass += 1
    _total += 1
    if _toArr(partition(_make([2,1]), 2)) == [1,2]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(partition(_make([1,4,3,2,5,2]), 3))) === JSON.stringify([1,2,2,4,3,5])) _pass++;
    if (JSON.stringify(_toArr(partition(_make([2,1]), 2))) === JSON.stringify([1,2])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(partition(_make([1,4,3,2,5,2]), 3))) === JSON.stringify([1,2,2,4,3,5])) _pass++;
    if (JSON.stringify(_toArr(partition(_make([2,1]), 2))) === JSON.stringify([1,2])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(partition(_make(listOf(1,4,3,2,5,2)), 3)) == listOf(1,2,2,4,3,5)) _pass++
        if (_toArr(partition(_make(listOf(2,1)), 2)) == listOf(1,2)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'odd-even-linked-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef oddEvenList(head: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction oddEvenList(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction oddEvenList(head: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun oddEvenList(head: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(oddEvenList(_make([1,2,3,4,5]))) == [1,3,5,2,4]: _pass += 1
    _total += 1
    if _toArr(oddEvenList(_make([2,1,3,5,6,4,7]))) == [2,3,6,7,1,5,4]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(oddEvenList(_make([1,2,3,4,5])))) === JSON.stringify([1,3,5,2,4])) _pass++;
    if (JSON.stringify(_toArr(oddEvenList(_make([2,1,3,5,6,4,7])))) === JSON.stringify([2,3,6,7,1,5,4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(oddEvenList(_make([1,2,3,4,5])))) === JSON.stringify([1,3,5,2,4])) _pass++;
    if (JSON.stringify(_toArr(oddEvenList(_make([2,1,3,5,6,4,7])))) === JSON.stringify([2,3,6,7,1,5,4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(oddEvenList(_make(listOf(1,2,3,4,5)))) == listOf(1,3,5,2,4)) _pass++
        if (_toArr(oddEvenList(_make(listOf(2,1,3,5,6,4,7)))) == listOf(2,3,6,7,1,5,4)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'merge-nodes-in-between-zeros',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef mergeNodes(head: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction mergeNodes(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction mergeNodes(head: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun mergeNodes(head: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(mergeNodes(_make([0,3,1,0,4,5,2,0]))) == [4,11]: _pass += 1
    _total += 1
    if _toArr(mergeNodes(_make([0,1,0,3,0,2,2,0]))) == [1,3,4]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(mergeNodes(_make([0,3,1,0,4,5,2,0])))) === JSON.stringify([4,11])) _pass++;
    if (JSON.stringify(_toArr(mergeNodes(_make([0,1,0,3,0,2,2,0])))) === JSON.stringify([1,3,4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(mergeNodes(_make([0,3,1,0,4,5,2,0])))) === JSON.stringify([4,11])) _pass++;
    if (JSON.stringify(_toArr(mergeNodes(_make([0,1,0,3,0,2,2,0])))) === JSON.stringify([1,3,4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(mergeNodes(_make(listOf(0,3,1,0,4,5,2,0)))) == listOf(4,11)) _pass++
        if (_toArr(mergeNodes(_make(listOf(0,1,0,3,0,2,2,0)))) == listOf(1,3,4)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'merge-in-between-linked-lists',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef mergeInBetween(list1: ListNode, a: int, b: int, list2: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction mergeInBetween(list1, a, b, list2) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction mergeInBetween(list1: ListNode | null, a: number, b: number, list2: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun mergeInBetween(list1: ListNode?, a: Int, b: Int, list2: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    l1 = _make([10,1,13,6,9,5])
    l2 = _make([1000000,1000001,1000002])
    if _toArr(mergeInBetween(l1, 3, 4, l2)) == [10,1,13,1000000,1000001,1000002,5]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let l1 = _make([10,1,13,6,9,5]);
    let l2 = _make([1000000,1000001,1000002]);
    if (JSON.stringify(_toArr(mergeInBetween(l1, 3, 4, l2))) === JSON.stringify([10,1,13,1000000,1000001,1000002,5])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let l1 = _make([10,1,13,6,9,5]);
    let l2 = _make([1000000,1000001,1000002]);
    if (JSON.stringify(_toArr(mergeInBetween(l1, 3, 4, l2))) === JSON.stringify([10,1,13,1000000,1000001,1000002,5])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val l1 = _make(listOf(10,1,13,6,9,5))
        val l2 = _make(listOf(1000000,1000001,1000002))
        if (_toArr(mergeInBetween(l1, 3, 4, l2)) == listOf(10,1,13,1000000,1000001,1000002,5)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'double-a-number-represented-as-a-linked-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef doubleIt(head: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction doubleIt(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction doubleIt(head: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun doubleIt(head: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(doubleIt(_make([1,8,9]))) == [3,7,8]: _pass += 1
    _total += 1
    if _toArr(doubleIt(_make([9,9,9]))) == [1,9,9,8]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(doubleIt(_make([1,8,9])))) === JSON.stringify([3,7,8])) _pass++;
    if (JSON.stringify(_toArr(doubleIt(_make([9,9,9])))) === JSON.stringify([1,9,9,8])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(doubleIt(_make([1,8,9])))) === JSON.stringify([3,7,8])) _pass++;
    if (JSON.stringify(_toArr(doubleIt(_make([9,9,9])))) === JSON.stringify([1,9,9,8])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(doubleIt(_make(listOf(1,8,9)))) == listOf(3,7,8)) _pass++
        if (_toArr(doubleIt(_make(listOf(9,9,9)))) == listOf(1,9,9,8)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'add-two-numbers',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef addTwoNumbers(l1: ListNode, l2: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction addTwoNumbers(l1, l2) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction addTwoNumbers(l1: ListNode | null, l2: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun addTwoNumbers(l1: ListNode?, l2: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(addTwoNumbers(_make([2,4,3]), _make([5,6,4]))) == [7,0,8]: _pass += 1
    _total += 1
    if _toArr(addTwoNumbers(_make([0]), _make([0]))) == [0]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(addTwoNumbers(_make([2,4,3]), _make([5,6,4])))) === JSON.stringify([7,0,8])) _pass++;
    if (JSON.stringify(_toArr(addTwoNumbers(_make([0]), _make([0])))) === JSON.stringify([0])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(addTwoNumbers(_make([2,4,3]), _make([5,6,4])))) === JSON.stringify([7,0,8])) _pass++;
    if (JSON.stringify(_toArr(addTwoNumbers(_make([0]), _make([0])))) === JSON.stringify([0])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(addTwoNumbers(_make(listOf(2,4,3)), _make(listOf(5,6,4)))) == listOf(7,0,8)) _pass++
        if (_toArr(addTwoNumbers(_make(listOf(0)), _make(listOf(0)))) == listOf(0)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'add-two-numbers-ii',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef addTwoNumbers(l1: ListNode, l2: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction addTwoNumbers(l1, l2) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction addTwoNumbers(l1: ListNode | null, l2: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun addTwoNumbers(l1: ListNode?, l2: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(addTwoNumbers(_make([7,2,4,3]), _make([5,6,4]))) == [7,8,0,7]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    if (JSON.stringify(_toArr(addTwoNumbers(_make([7,2,4,3]), _make([5,6,4])))) === JSON.stringify([7,8,0,7])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    if (JSON.stringify(_toArr(addTwoNumbers(_make([7,2,4,3]), _make([5,6,4])))) === JSON.stringify([7,8,0,7])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        if (_toArr(addTwoNumbers(_make(listOf(7,2,4,3)), _make(listOf(5,6,4)))) == listOf(7,8,0,7)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'reverse-linked-list-ii',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef reverseBetween(head: ListNode, left: int, right: int) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction reverseBetween(head, left, right) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction reverseBetween(head: ListNode | null, left: number, right: number): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun reverseBetween(head: ListNode?, left: Int, right: Int): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(reverseBetween(_make([1,2,3,4,5]), 2, 4)) == [1,4,3,2,5]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    if (JSON.stringify(_toArr(reverseBetween(_make([1,2,3,4,5]), 2, 4))) === JSON.stringify([1,4,3,2,5])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    if (JSON.stringify(_toArr(reverseBetween(_make([1,2,3,4,5]), 2, 4))) === JSON.stringify([1,4,3,2,5])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        if (_toArr(reverseBetween(_make(listOf(1,2,3,4,5)), 2, 4)) == listOf(1,4,3,2,5)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'flatten-a-multilevel-doubly-linked-list',
    stubs: {
      python: `class Node:\n    def __init__(self, val, prev, next, child):\n        self.val = val\n        self.prev = prev\n        self.next = next\n        self.child = child\n\ndef flatten(head: 'Node') -> 'Node':\n    pass`,
      javascript: `class Node {\n    constructor(val, prev, next, child) {\n        this.val = val;\n        this.prev = prev;\n        this.next = next;\n        this.child = child;\n    }\n}\nfunction flatten(head) {\n\n}`,
      typescript: `class Node {\n    val: number;\n    prev: Node | null;\n    next: Node | null;\n    child: Node | null;\n    constructor(val?: number, prev?: Node | null, next?: Node | null, child?: Node | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.prev = (prev===undefined ? null : prev);\n        this.next = (next===undefined ? null : next);\n        this.child = (child===undefined ? null : child);\n    }\n}\nfunction flatten(head: Node | null): Node | null {\n    return null;\n}`,
      kotlin: `class Node(var \`val\`: Int) {\n    var prev: Node? = null\n    var next: Node? = null\n    var child: Node? = null\n}\nfun flatten(head: Node?): Node? {\n    return null\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    n1 = Node(1, None, None, None)
    n2 = Node(2, None, None, None)
    n3 = Node(3, None, None, None)
    n1.next = n2; n2.prev = n1
    n1.child = n3
    res = flatten(n1)
    if res and res.val == 1 and res.next and res.next.val == 3 and res.next.next and res.next.next.val == 2:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let n1 = new Node(1), n2 = new Node(2), n3 = new Node(3);
    n1.next = n2; n2.prev = n1;
    n1.child = n3;
    let res = flatten(n1);
    if (res && res.val === 1 && res.next && res.next.val === 3 && res.next.next && res.next.next.val === 2) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let n1 = new Node(1), n2 = new Node(2), n3 = new Node(3);
    n1.next = n2; n2.prev = n1;
    n1.child = n3;
    let res = flatten(n1);
    if (res && res.val === 1 && res.next && res.next.val === 3 && res.next.next && res.next.next.val === 2) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val n1 = Node(1); val n2 = Node(2); val n3 = Node(3)
        n1.next = n2; n2.prev = n1
        n1.child = n3
        val res = flatten(n1)
        if (res != null && res.\`val\` == 1 && res.next != null && res.next!!.\`val\` == 3 && res.next!!.next != null && res.next!!.next!!.\`val\` == 2) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'lru-cache',
    stubs: {
      python: `class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n    def get(self, key: int) -> int:\n        pass\n    def put(self, key: int, value: int) -> None:\n        pass`,
      javascript: `class LRUCache {\n    constructor(capacity) {\n\n    }\n    get(key) {\n\n    }\n    put(key, value) {\n\n    }\n}`,
      typescript: `class LRUCache {\n    constructor(capacity: number) {\n\n    }\n    get(key: number): number {\n        return 0;\n    }\n    put(key: number, value: number): void {\n\n    }\n}`,
      kotlin: `class LRUCache(capacity: Int) {\n    fun get(key: Int): Int {\n        return 0\n    }\n    fun put(key: Int, value: Int) {\n\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    cache = LRUCache(2)
    cache.put(1, 1)
    cache.put(2, 2)
    ans1 = cache.get(1) # 1
    cache.put(3, 3)     # evicts 2
    ans2 = cache.get(2) # -1
    cache.put(4, 4)     # evicts 1
    ans3 = cache.get(1) # -1
    ans4 = cache.get(3) # 3
    ans5 = cache.get(4) # 4
    if [ans1, ans2, ans3, ans4, ans5] == [1, -1, -1, 3, 4]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    let ans1 = cache.get(1);
    cache.put(3, 3);
    let ans2 = cache.get(2);
    cache.put(4, 4);
    let ans3 = cache.get(1);
    let ans4 = cache.get(3);
    let ans5 = cache.get(4);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5]) === JSON.stringify([1, -1, -1, 3, 4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    let ans1 = cache.get(1);
    cache.put(3, 3);
    let ans2 = cache.get(2);
    cache.put(4, 4);
    let ans3 = cache.get(1);
    let ans4 = cache.get(3);
    let ans5 = cache.get(4);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5]) === JSON.stringify([1, -1, -1, 3, 4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val cache = LRUCache(2)
        cache.put(1, 1)
        cache.put(2, 2)
        val ans1 = cache.get(1)
        cache.put(3, 3)
        val ans2 = cache.get(2)
        cache.put(4, 4)
        val ans3 = cache.get(1)
        val ans4 = cache.get(3)
        val ans5 = cache.get(4)
        if (ans1 == 1 && ans2 == -1 && ans3 == -1 && ans4 == 3 && ans5 == 4) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'linked-list-random-node',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\nclass Solution:\n    def __init__(self, head: ListNode):\n        pass\n    def getRandom(self) -> int:\n        pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nclass Solution {\n    constructor(head) {\n\n    }\n    getRandom() {\n\n    }\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nclass Solution {\n    constructor(head: ListNode | null) {\n\n    }\n    getRandom(): number {\n        return 0;\n    }\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nclass Solution(head: ListNode?) {\n    fun getRandom(): Int {\n        return 0\n    }\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    head = _make([1,2,3])
    sol = Solution(head)
    ans1 = sol.getRandom()
    if ans1 in [1, 2, 3]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let head = _make([1,2,3]);
    let sol = new Solution(head);
    let ans1 = sol.getRandom();
    if ([1, 2, 3].includes(ans1)) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let head = _make([1,2,3]);
    let sol = new Solution(head);
    let ans1 = sol.getRandom();
    if ([1, 2, 3].includes(ans1)) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val head = _make(listOf(1,2,3))
        val sol = Solution(head)
        val ans1 = sol.getRandom()
        if (ans1 in listOf(1, 2, 3)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'design-linked-list',
    stubs: {
      python: `class MyLinkedList:\n    def __init__(self):\n        pass\n    def get(self, index: int) -> int:\n        pass\n    def addAtHead(self, val: int) -> None:\n        pass\n    def addAtTail(self, val: int) -> None:\n        pass\n    def addAtIndex(self, index: int, val: int) -> None:\n        pass\n    def deleteAtIndex(self, index: int) -> None:\n        pass`,
      javascript: `class MyLinkedList {\n    constructor() {\n\n    }\n    get(index) {\n\n    }\n    addAtHead(val) {\n\n    }\n    addAtTail(val) {\n\n    }\n    addAtIndex(index, val) {\n\n    }\n    deleteAtIndex(index) {\n\n    }\n}`,
      typescript: `class MyLinkedList {\n    constructor() {\n\n    }\n    get(index: number): number {\n        return 0;\n    }\n    addAtHead(val: number): void {\n\n    }\n    addAtTail(val: number): void {\n\n    }\n    addAtIndex(index: number, val: number): void {\n\n    }\n    deleteAtIndex(index: number): void {\n\n    }\n}`,
      kotlin: `class MyLinkedList() {\n    fun get(index: Int): Int {\n        return 0\n    }\n    fun addAtHead(val: Int) {\n\n    }\n    fun addAtTail(val: Int) {\n\n    }\n    fun addAtIndex(index: Int, val: Int) {\n\n    }\n    fun deleteAtIndex(index: Int) {\n\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    ll = MyLinkedList()
    ll.addAtHead(1)
    ll.addAtTail(3)
    ll.addAtIndex(1, 2)
    ans1 = ll.get(1) # 2
    ll.deleteAtIndex(1)
    ans2 = ll.get(1) # 3
    if [ans1, ans2] == [2, 3]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let ll = new MyLinkedList();
    ll.addAtHead(1);
    ll.addAtTail(3);
    ll.addAtIndex(1, 2);
    let ans1 = ll.get(1);
    ll.deleteAtIndex(1);
    let ans2 = ll.get(1);
    if (JSON.stringify([ans1, ans2]) === JSON.stringify([2, 3])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let ll = new MyLinkedList();
    ll.addAtHead(1);
    ll.addAtTail(3);
    ll.addAtIndex(1, 2);
    let ans1 = ll.get(1);
    ll.deleteAtIndex(1);
    let ans2 = ll.get(1);
    if (JSON.stringify([ans1, ans2]) === JSON.stringify([2, 3])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val ll = MyLinkedList()
        ll.addAtHead(1)
        ll.addAtTail(3)
        ll.addAtIndex(1, 2)
        val ans1 = ll.get(1)
        ll.deleteAtIndex(1)
        val ans2 = ll.get(1)
        if (ans1 == 2 && ans2 == 3) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'split-linked-list-in-parts',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef splitListToParts(head: ListNode, k: int) -> list:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction splitListToParts(head, k) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction splitListToParts(head: ListNode | null, k: number): Array<ListNode | null> {\n    return [];\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun splitListToParts(head: ListNode?, k: Int): Array<ListNode?> {\n    return arrayOf()\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    head = _make([1,2,3])
    parts = splitListToParts(head, 5)
    if len(parts) == 5 and _toArr(parts[0]) == [1] and _toArr(parts[1]) == [2] and _toArr(parts[2]) == [3]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let head = _make([1,2,3]);
    let parts = splitListToParts(head, 5);
    if (parts.length === 5 && JSON.stringify(_toArr(parts[0])) === JSON.stringify([1]) && JSON.stringify(_toArr(parts[1])) === JSON.stringify([2]) && JSON.stringify(_toArr(parts[2])) === JSON.stringify([3])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let head = _make([1,2,3]);
    let parts = splitListToParts(head, 5);
    if (parts.length === 5 && JSON.stringify(_toArr(parts[0])) === JSON.stringify([1]) && JSON.stringify(_toArr(parts[1])) === JSON.stringify([2]) && JSON.stringify(_toArr(parts[2])) === JSON.stringify([3])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val head = _make(listOf(1,2,3))
        val parts = splitListToParts(head, 5)
        if (parts.size == 5 && _toArr(parts[0]) == listOf(1) && _toArr(parts[1]) == listOf(2) && _toArr(parts[2]) == listOf(3)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'remove-nodes-from-linked-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef removeNodes(head: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction removeNodes(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction removeNodes(head: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun removeNodes(head: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(removeNodes(_make([5,2,13,3,8]))) == [13,8]: _pass += 1
    _total += 1
    if _toArr(removeNodes(_make([1,1,1,1]))) == [1,1,1,1]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(removeNodes(_make([5,2,13,3,8])))) === JSON.stringify([13,8])) _pass++;
    if (JSON.stringify(_toArr(removeNodes(_make([1,1,1,1])))) === JSON.stringify([1,1,1,1])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(removeNodes(_make([5,2,13,3,8])))) === JSON.stringify([13,8])) _pass++;
    if (JSON.stringify(_toArr(removeNodes(_make([1,1,1,1])))) === JSON.stringify([1,1,1,1])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(removeNodes(_make(listOf(5,2,13,3,8)))) == listOf(13,8)) _pass++
        if (_toArr(removeNodes(_make(listOf(1,1,1,1)))) == listOf(1,1,1,1)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'insertion-sort-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef insertionSortList(head: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction insertionSortList(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction insertionSortList(head: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun insertionSortList(head: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(insertionSortList(_make([4,2,1,3]))) == [1,2,3,4]: _pass += 1
    _total += 1
    if _toArr(insertionSortList(_make([-1,5,3,4,0]))) == [-1,0,3,4,5]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(insertionSortList(_make([4,2,1,3])))) === JSON.stringify([1,2,3,4])) _pass++;
    if (JSON.stringify(_toArr(insertionSortList(_make([-1,5,3,4,0])))) === JSON.stringify([-1,0,3,4,5])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    if (JSON.stringify(_toArr(insertionSortList(_make([4,2,1,3])))) === JSON.stringify([1,2,3,4])) _pass++;
    if (JSON.stringify(_toArr(insertionSortList(_make([-1,5,3,4,0])))) === JSON.stringify([-1,0,3,4,5])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        if (_toArr(insertionSortList(_make(listOf(4,2,1,3)))) == listOf(1,2,3,4)) _pass++
        if (_toArr(insertionSortList(_make(listOf(-1,5,3,4,0)))) == listOf(-1,0,3,4,5)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'maximum-frequency-stack',
    stubs: {
      python: `class FreqStack:\n    def __init__(self):\n        pass\n    def push(self, val: int) -> None:\n        pass\n    def pop(self) -> int:\n        pass`,
      javascript: `class FreqStack {\n    constructor() {\n\n    }\n    push(val) {\n\n    }\n    pop() {\n\n    }\n}`,
      typescript: `class FreqStack {\n    constructor() {\n\n    }\n    push(val: number): void {\n\n    }\n    pop(): number {\n        return 0;\n    }\n}`,
      kotlin: `class FreqStack() {\n    fun push(val: Int) {\n\n    }\n    fun pop(): Int {\n        return 0\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    fs = FreqStack()
    fs.push(5)
    fs.push(7)
    fs.push(5)
    fs.push(7)
    fs.push(4)
    fs.push(5)
    ans1 = fs.pop() # 5
    ans2 = fs.pop() # 7
    ans3 = fs.pop() # 5
    ans4 = fs.pop() # 4
    if [ans1, ans2, ans3, ans4] == [5, 7, 5, 4]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let fs = new FreqStack();
    fs.push(5);
    fs.push(7);
    fs.push(5);
    fs.push(7);
    fs.push(4);
    fs.push(5);
    let ans1 = fs.pop();
    let ans2 = fs.pop();
    let ans3 = fs.pop();
    let ans4 = fs.pop();
    if (JSON.stringify([ans1, ans2, ans3, ans4]) === JSON.stringify([5, 7, 5, 4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let fs = new FreqStack();
    fs.push(5);
    fs.push(7);
    fs.push(5);
    fs.push(7);
    fs.push(4);
    fs.push(5);
    let ans1 = fs.pop();
    let ans2 = fs.pop();
    let ans3 = fs.pop();
    let ans4 = fs.pop();
    if (JSON.stringify([ans1, ans2, ans3, ans4]) === JSON.stringify([5, 7, 5, 4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val fs = FreqStack()
        fs.push(5)
        fs.push(7)
        fs.push(5)
        fs.push(7)
        fs.push(4)
        fs.push(5)
        val ans1 = fs.pop()
        val ans2 = fs.pop()
        val ans3 = fs.pop()
        val ans4 = fs.pop()
        if (ans1 == 5 && ans2 == 7 && ans3 == 5 && ans4 == 4) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'finding-mk-average',
    stubs: {
      python: `class MKAverage:\n    def __init__(self, m: int, k: int):\n        pass\n    def addElement(self, num: int) -> None:\n        pass\n    def calculateMKAverage(self) -> int:\n        pass`,
      javascript: `class MKAverage {\n    constructor(m, k) {\n\n    }\n    addElement(num) {\n\n    }\n    calculateMKAverage() {\n\n    }\n}`,
      typescript: `class MKAverage {\n    constructor(m: number, k: number) {\n\n    }\n    addElement(num: number): void {\n\n    }\n    calculateMKAverage(): number {\n        return 0;\n    }\n}`,
      kotlin: `class MKAverage(m: Int, k: Int) {\n    fun addElement(num: Int) {\n\n    }\n    fun calculateMKAverage(): Int {\n        return 0\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    mk = MKAverage(3, 1)
    mk.addElement(3)
    mk.addElement(1)
    ans1 = mk.calculateMKAverage()
    mk.addElement(10)
    ans2 = mk.calculateMKAverage()
    mk.addElement(5)
    ans3 = mk.calculateMKAverage()
    if [ans1, ans2, ans3] == [-1, 3, 5]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let mk = new MKAverage(3, 1);
    mk.addElement(3);
    mk.addElement(1);
    let ans1 = mk.calculateMKAverage();
    mk.addElement(10);
    let ans2 = mk.calculateMKAverage();
    mk.addElement(5);
    let ans3 = mk.calculateMKAverage();
    if (JSON.stringify([ans1, ans2, ans3]) === JSON.stringify([-1, 3, 5])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let mk = new MKAverage(3, 1);
    mk.addElement(3);
    mk.addElement(1);
    let ans1 = mk.calculateMKAverage();
    mk.addElement(10);
    let ans2 = mk.calculateMKAverage();
    mk.addElement(5);
    let ans3 = mk.calculateMKAverage();
    if (JSON.stringify([ans1, ans2, ans3]) === JSON.stringify([-1, 3, 5])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val mk = MKAverage(3, 1)
        mk.addElement(3)
        mk.addElement(1)
        val ans1 = mk.calculateMKAverage()
        mk.addElement(10)
        val ans2 = mk.calculateMKAverage()
        mk.addElement(5)
        val ans3 = mk.calculateMKAverage()
        if (ans1 == -1 && ans2 == 3 && ans3 == 5) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'flatten-nested-list-iterator',
    stubs: {
      python: `class NestedIterator:\n    def __init__(self, nestedList: list):\n        pass\n    def next(self) -> int:\n        pass\n    def hasNext(self) -> bool:\n        pass`,
      javascript: `class NestedIterator {\n    constructor(nestedList) {\n\n    }\n    hasNext() {\n\n    }\n    next() {\n\n    }\n}`,
      typescript: `class NestedIterator {\n    constructor(nestedList: any[]) {\n\n    }\n    hasNext(): boolean {\n        return false;\n    }\n    next(): number {\n        return 0;\n    }\n}`,
      kotlin: `class NestedIterator(nestedList: List<Any>) {\n    fun next(): Int {\n        return 0\n    }\n    fun hasNext(): Boolean {\n        return false\n    }\n}`
    },
    customRunner: {
      python: `
class NestedInteger:
    def __init__(self, val=None, list_val=None):
        self.val = val
        self.list_val = list_val
    def isInteger(self):
        return self.val is not None
    def getInteger(self):
        return self.val
    def getList(self):
        return self.list_val

_pass = _total = 0
for _ in range(15):
    _total += 1
    # [[1,1],2,[1,1]]
    l1 = NestedInteger(list_val=[NestedInteger(1), NestedInteger(1)])
    l2 = NestedInteger(2)
    l3 = NestedInteger(list_val=[NestedInteger(1), NestedInteger(1)])
    it = NestedIterator([l1, l2, l3])
    res = []
    while it.hasNext(): res.append(it.next())
    if res == [1, 1, 2, 1, 1]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
class NestedInteger {
    constructor(val, listVal) {
        this.val = val;
        this.listVal = listVal;
    }
    isInteger() { return this.val !== undefined && this.val !== null; }
    getInteger() { return this.val; }
    getList() { return this.listVal; }
}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let l1 = new NestedInteger(null, [new NestedInteger(1), new NestedInteger(1)]);
    let l2 = new NestedInteger(2);
    let l3 = new NestedInteger(null, [new NestedInteger(1), new NestedInteger(1)]);
    let it = new NestedIterator([l1, l2, l3]);
    let res = [];
    while (it.hasNext()) res.push(it.next());
    if (JSON.stringify(res) === JSON.stringify([1, 1, 2, 1, 1])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
class NestedInteger {
    val?: number;
    listVal?: NestedInteger[];
    constructor(val?: number, listVal?: NestedInteger[]) {
        this.val = val;
        this.listVal = listVal;
    }
    isInteger() { return this.val !== undefined && this.val !== null; }
    getInteger() { return this.val!; }
    getList() { return this.listVal!; }
}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let l1 = new NestedInteger(undefined, [new NestedInteger(1), new NestedInteger(1)]);
    let l2 = new NestedInteger(2);
    let l3 = new NestedInteger(undefined, [new NestedInteger(1), new NestedInteger(1)]);
    let it = new NestedIterator([l1, l2, l3]);
    let res: number[] = [];
    while (it.hasNext()) res.push(it.next());
    if (JSON.stringify(res) === JSON.stringify([1, 1, 2, 1, 1])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
class NestedInteger(val integerVal: Int?, val listVal: List<NestedInteger>?) {
    fun isInteger(): Boolean = integerVal != null
    fun getInteger(): Int = integerVal!!
    fun getList(): List<NestedInteger> = listVal!!
}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val l1 = NestedInteger(null, listOf(NestedInteger(1, null), NestedInteger(1, null)))
        val l2 = NestedInteger(2, null)
        val l3 = NestedInteger(null, listOf(NestedInteger(1, null), NestedInteger(1, null)))
        val it = NestedIterator(listOf(l1, l2, l3))
        val res = mutableListOf<Int>()
        while (it.hasNext()) res.add(it.next())
        if (res == listOf(1, 1, 2, 1, 1)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'reverse-nodes-in-even-length-groups',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef reverseEvenLengthGroups(head: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction reverseEvenLengthGroups(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction reverseEvenLengthGroups(head: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun reverseEvenLengthGroups(head: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(reverseEvenLengthGroups(_make([5,2,6,3,9,1,7,3,8,4]))) == [5,6,2,3,9,1,4,8,3,7]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    if (JSON.stringify(_toArr(reverseEvenLengthGroups(_make([5,2,6,3,9,1,7,3,8,4])))) === JSON.stringify([5,6,2,3,9,1,4,8,3,7])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    if (JSON.stringify(_toArr(reverseEvenLengthGroups(_make([5,2,6,3,9,1,7,3,8,4])))) === JSON.stringify([5,6,2,3,9,1,4,8,3,7])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        if (_toArr(reverseEvenLengthGroups(_make(listOf(5,2,6,3,9,1,7,3,8,4)))) == listOf(5,6,2,3,9,1,4,8,3,7)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'convert-bst-to-sorted-doubly-linked-list',
    stubs: {
      python: `class Node:\n    def __init__(self, val, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef treeToDoublyList(root: 'Node') -> 'Node':\n    pass`,
      javascript: `class Node {\n    constructor(val, left, right) {\n        this.val = val;\n        this.left = left;\n        this.right = right;\n    }\n}\nfunction treeToDoublyList(root) {\n\n}`,
      typescript: `class Node {\n    val: number;\n    left: Node | null;\n    right: Node | null;\n    constructor(val?: number, left?: Node | null, right?: Node | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.left = (left===undefined ? null : left);\n        this.right = (right===undefined ? null : right);\n    }\n}\nfunction treeToDoublyList(root: Node | null): Node | null {\n    return null;\n}`,
      kotlin: `class Node(var \`val\`: Int) {\n    var left: Node? = null\n    var right: Node? = null\n}\nfun treeToDoublyList(root: Node?): Node? {\n    return null\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    # Simple BST with root 2, left 1, right 3
    class Node:\n        def __init__(self, val, left=None, right=None):\n            self.val = val\n            self.left = left\n            self.right = right
    root = Node(2, Node(1), Node(3))
    res = treeToDoublyList(root)
    if res and res.val == 1 and res.right.val == 2 and res.right.right.val == 3 and res.right.right.right == res:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let root = new Node(2, new Node(1), new Node(3));
    let res = treeToDoublyList(root);
    if (res && res.val === 1 && res.right.val === 2 && res.right.right.val === 3 && res.right.right.right === res) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let root = new Node(2, new Node(1), new Node(3));
    let res = treeToDoublyList(root);
    if (res && res.val === 1 && res.right.val === 2 && res.right.right.val === 3 && res.right.right.right === res) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val root = Node(2)
        root.left = Node(1)
        root.right = Node(3)
        val res = treeToDoublyList(root)
        if (res != null && res.\`val\` == 1 && res.right != null && res.right!!.\`val\` == 2 && res.right!!.right != null && res.right!!.right!!.\`val\` == 3 && res.right!!.right!!.right === res) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'design-front-middle-back-queue',
    stubs: {
      python: `class FrontMiddleBackQueue:\n    def __init__(self):\n        pass\n    def pushFront(self, val: int) -> None:\n        pass\n    def pushMiddle(self, val: int) -> None:\n        pass\n    def pushBack(self, val: int) -> None:\n        pass\n    def popFront(self) -> int:\n        pass\n    def popMiddle(self) -> int:\n        pass\n    def popBack(self) -> int:\n        pass`,
      javascript: `class FrontMiddleBackQueue {\n    constructor() {\n\n    }\n    pushFront(val) {\n\n    }\n    pushMiddle(val) {\n\n    }\n    pushBack(val) {\n\n    }\n    popFront() {\n\n    }\n    popMiddle() {\n\n    }\n    popBack() {\n\n    }\n}`,
      typescript: `class FrontMiddleBackQueue {\n    constructor() {\n\n    }\n    pushFront(val: number): void {\n\n    }\n    pushMiddle(val: number): void {\n\n    }\n    pushBack(val: number): void {\n\n    }\n    popFront(): number {\n        return 0;\n    }\n    popMiddle(): number {\n        return 0;\n    }\n    popBack(): number {\n        return 0;\n    }\n}`,
      kotlin: `class FrontMiddleBackQueue() {\n    fun pushFront(val: Int) {\n\n    }\n    fun pushMiddle(val: Int) {\n\n    }\n    fun pushBack(val: Int) {\n\n    }\n    fun popFront(): Int {\n        return 0\n    }\n    fun popMiddle(): Int {\n        return 0\n    }\n    fun popBack(): Int {\n        return 0\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    q = FrontMiddleBackQueue()
    q.pushFront(1)
    q.pushBack(2)
    q.pushMiddle(3)
    q.pushMiddle(4)
    ans1 = q.popFront()  # 1
    ans2 = q.popMiddle() # 3 or 4 depends on len
    ans3 = q.popMiddle() # 4 or 3
    ans4 = q.popBack()   # 2
    if [ans1, ans4] == [1, 2] and {ans2, ans3} == {3, 4}:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let q = new FrontMiddleBackQueue();
    q.pushFront(1);
    q.pushBack(2);
    q.pushMiddle(3);
    q.pushMiddle(4);
    let ans1 = q.popFront();
    let ans2 = q.popMiddle();
    let ans3 = q.popMiddle();
    let ans4 = q.popBack();
    if (ans1 === 1 && ans4 === 2 && ((ans2 === 3 && ans3 === 4) || (ans2 === 4 && ans3 === 3))) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let q = new FrontMiddleBackQueue();
    q.pushFront(1);
    q.pushBack(2);
    q.pushMiddle(3);
    q.pushMiddle(4);
    let ans1 = q.popFront();
    let ans2 = q.popMiddle();
    let ans3 = q.popMiddle();
    let ans4 = q.popBack();
    if (ans1 === 1 && ans4 === 2 && ((ans2 === 3 && ans3 === 4) || (ans2 === 4 && ans3 === 3))) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val q = FrontMiddleBackQueue()
        q.pushFront(1)
        q.pushBack(2)
        q.pushMiddle(3)
        q.pushMiddle(4)
        val ans1 = q.popFront()
        val ans2 = q.popMiddle()
        val ans3 = q.popMiddle()
        val ans4 = q.popBack()
        if (ans1 == 1 && ans4 == 2 && ((ans2 == 3 && ans3 == 4) || (ans2 == 4 && ans3 == 3))) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'design-circular-queue',
    stubs: {
      python: `class MyCircularQueue:\n    def __init__(self, k: int):\n        pass\n    def enQueue(self, value: int) -> bool:\n        pass\n    def deQueue(self) -> bool:\n        pass\n    def Front(self) -> int:\n        pass\n    def Rear(self) -> int:\n        pass\n    def isEmpty(self) -> bool:\n        pass\n    def isFull(self) -> bool:\n        pass`,
      javascript: `class MyCircularQueue {\n    constructor(k) {\n\n    }\n    enQueue(value) {\n\n    }\n    deQueue() {\n\n    }\n    Front() {\n\n    }\n    Rear() {\n\n    }\n    isEmpty() {\n\n    }\n    isFull() {\n\n    }\n}`,
      typescript: `class MyCircularQueue {\n    constructor(k: number) {\n\n    }\n    enQueue(value: number): boolean {\n        return false;\n    }\n    deQueue(): boolean {\n        return false;\n    }\n    Front(): number {\n        return 0;\n    }\n    Rear(): number {\n        return 0;\n    }\n    isEmpty(): boolean {\n        return false;\n    }\n    isFull(): boolean {\n        return false;\n    }\n}`,
      kotlin: `class MyCircularQueue(k: Int) {\n    fun enQueue(value: Int): Boolean {\n        return false\n    }\n    fun deQueue(): Boolean {\n        return false\n    }\n    fun Front(): Int {\n        return 0\n    }\n    fun Rear(): Int {\n        return 0\n    }\n    fun isEmpty(): Boolean {\n        return false\n    }\n    fun isFull(): Boolean {\n        return false\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    q = MyCircularQueue(3)
    ans1 = q.enQueue(1) # True
    ans2 = q.enQueue(2) # True
    ans3 = q.enQueue(3) # True
    ans4 = q.enQueue(4) # False
    ans5 = q.Rear()     # 3
    ans6 = q.isFull()   # True
    ans7 = q.deQueue()  # True
    ans8 = q.enQueue(4) # True
    ans9 = q.Rear()     # 4
    if [ans1, ans2, ans3, ans4, ans5, ans6, ans7, ans8, ans9] == [True, True, True, False, 3, True, True, True, 4]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let q = new MyCircularQueue(3);
    let ans1 = q.enQueue(1);
    let ans2 = q.enQueue(2);
    let ans3 = q.enQueue(3);
    let ans4 = q.enQueue(4);
    let ans5 = q.Rear();
    let ans6 = q.isFull();
    let ans7 = q.deQueue();
    let ans8 = q.enQueue(4);
    let ans9 = q.Rear();
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6, ans7, ans8, ans9]) === JSON.stringify([true, true, true, false, 3, true, true, true, 4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let q = new MyCircularQueue(3);
    let ans1 = q.enQueue(1);
    let ans2 = q.enQueue(2);
    let ans3 = q.enQueue(3);
    let ans4 = q.enQueue(4);
    let ans5 = q.Rear();
    let ans6 = q.isFull();
    let ans7 = q.deQueue();
    let ans8 = q.enQueue(4);
    let ans9 = q.Rear();
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6, ans7, ans8, ans9]) === JSON.stringify([true, true, true, false, 3, true, true, true, 4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val q = MyCircularQueue(3)
        val ans1 = q.enQueue(1)
        val ans2 = q.enQueue(2)
        val ans3 = q.enQueue(3)
        val ans4 = q.enQueue(4)
        val ans5 = q.Rear()
        val ans6 = q.isFull()
        val ans7 = q.deQueue()
        val ans8 = q.enQueue(4)
        val ans9 = q.Rear()
        if (ans1 == true && ans2 == true && ans3 == true && ans4 == false && ans5 == 3 && ans6 == true && ans7 == true && ans8 == true && ans9 == 4) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'design-circular-deque',
    stubs: {
      python: `class MyCircularDeque:\n    def __init__(self, k: int):\n        pass\n    def insertFront(self, value: int) -> bool:\n        pass\n    def insertLast(self, value: int) -> bool:\n        pass\n    def deleteFront(self) -> bool:\n        pass\n    def deleteLast(self) -> bool:\n        pass\n    def getFront(self) -> int:\n        pass\n    def getRear(self) -> int:\n        pass\n    def isEmpty(self) -> bool:\n        pass\n    def isFull(self) -> bool:\n        pass`,
      javascript: `class MyCircularDeque {\n    constructor(k) {\n\n    }\n    insertFront(value) {\n\n    }\n    insertLast(value) {\n\n    }\n    deleteFront() {\n\n    }\n    deleteLast() {\n\n    }\n    getFront() {\n\n    }\n    getRear() {\n\n    }\n    isEmpty() {\n\n    }\n    isFull() {\n\n    }\n}`,
      typescript: `class MyCircularDeque {\n    constructor(k: number) {\n\n    }\n    insertFront(value: number): boolean {\n        return false;\n    }\n    insertLast(value: number): boolean {\n        return false;\n    }\n    deleteFront(): boolean {\n        return false;\n    }\n    deleteLast(): boolean {\n        return false;\n    }\n    getFront(): number {\n        return 0;\n    }\n    getRear(): number {\n        return 0;\n    }\n    isEmpty(): boolean {\n        return false;\n    }\n    isFull(): boolean {\n        return false;\n    }\n}`,
      kotlin: `class MyCircularDeque(k: Int) {\n    fun insertFront(value: Int): Boolean {\n        return false\n    }\n    fun insertLast(value: Int): Boolean {\n        return false\n    }\n    fun deleteFront(): Boolean {\n        return false\n    }\n    fun deleteLast(): Boolean {\n        return false\n    }\n    fun getFront(): Int {\n        return 0\n    }\n    fun getRear(): Int {\n        return 0\n    }\n    fun isEmpty(): Boolean {\n        return false\n    }\n    fun isFull(): Boolean {\n        return false\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    dq = MyCircularDeque(3)
    ans1 = dq.insertLast(1)  # True
    ans2 = dq.insertLast(2)  # True
    ans3 = dq.insertFront(3) # True
    ans4 = dq.insertFront(4) # False
    ans5 = dq.getRear()      # 2
    ans6 = dq.isFull()       # True
    ans7 = dq.deleteLast()   # True
    ans8 = dq.insertFront(4) # True
    ans9 = dq.getFront()     # 4
    if [ans1, ans2, ans3, ans4, ans5, ans6, ans7, ans8, ans9] == [True, True, True, False, 2, True, True, True, 4]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let dq = new MyCircularDeque(3);
    let ans1 = dq.insertLast(1);
    let ans2 = dq.insertLast(2);
    let ans3 = dq.insertFront(3);
    let ans4 = dq.insertFront(4);
    let ans5 = dq.getRear();
    let ans6 = dq.isFull();
    let ans7 = dq.deleteLast();
    let ans8 = dq.insertFront(4);
    let ans9 = dq.getFront();
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6, ans7, ans8, ans9]) === JSON.stringify([true, true, true, false, 2, true, true, true, 4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let dq = new MyCircularDeque(3);
    let ans1 = dq.insertLast(1);
    let ans2 = dq.insertLast(2);
    let ans3 = dq.insertFront(3);
    let ans4 = dq.insertFront(4);
    let ans5 = dq.getRear();
    let ans6 = dq.isFull();
    let ans7 = dq.deleteLast();
    let ans8 = dq.insertFront(4);
    let ans9 = dq.getFront();
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6, ans7, ans8, ans9]) === JSON.stringify([true, true, true, false, 2, true, true, true, 4])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val dq = MyCircularDeque(3)
        val ans1 = dq.insertLast(1)
        val ans2 = dq.insertLast(2)
        val ans3 = dq.insertFront(3)
        val ans4 = dq.insertFront(4)
        val ans5 = dq.getRear()
        val ans6 = dq.isFull()
        val ans7 = dq.deleteLast()
        val ans8 = dq.insertFront(4)
        val ans9 = dq.getFront()
        if (ans1 == true && ans2 == true && ans3 == true && ans4 == false && ans5 == 2 && ans6 == true && ans7 == true && ans8 == true && ans9 == 4) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'design-browser-history',
    stubs: {
      python: `class BrowserHistory:\n    def __init__(self, homepage: str):\n        pass\n    def visit(self, url: str) -> None:\n        pass\n    def back(self, steps: int) -> str:\n        pass\n    def forward(self, steps: int) -> str:\n        pass`,
      javascript: `class BrowserHistory {\n    constructor(homepage) {\n\n    }\n    visit(url) {\n\n    }\n    back(steps) {\n\n    }\n    forward(steps) {\n\n    }\n}`,
      typescript: `class BrowserHistory {\n    constructor(homepage: string) {\n\n    }\n    visit(url: string): void {\n\n    }\n    back(steps: number): string {\n        return "";\n    }\n    forward(steps: number): string {\n        return "";\n    }\n}`,
      kotlin: `class BrowserHistory(homepage: String) {\n    fun visit(url: String) {\n\n    }\n    fun back(steps: Int): String {\n        return ""\n    }\n    fun forward(steps: Int): String {\n        return ""\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    bh = BrowserHistory("leetcode.com")
    bh.visit("google.com")
    bh.visit("facebook.com")
    bh.visit("youtube.com")
    ans1 = bh.back(1)    # "facebook.com"
    ans2 = bh.back(1)    # "google.com"
    ans3 = bh.forward(1) # "facebook.com"
    bh.visit("linkedin.com")
    ans4 = bh.forward(2) # "linkedin.com"
    ans5 = bh.back(2)    # "google.com"
    if [ans1, ans2, ans3, ans4, ans5] == ["facebook.com", "google.com", "facebook.com", "linkedin.com", "google.com"]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let bh = new BrowserHistory("leetcode.com");
    bh.visit("google.com");
    bh.visit("facebook.com");
    bh.visit("youtube.com");
    let ans1 = bh.back(1);
    let ans2 = bh.back(1);
    let ans3 = bh.forward(1);
    bh.visit("linkedin.com");
    let ans4 = bh.forward(2);
    let ans5 = bh.back(2);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5]) === JSON.stringify(["facebook.com", "google.com", "facebook.com", "linkedin.com", "google.com"])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let bh = new BrowserHistory("leetcode.com");
    bh.visit("google.com");
    bh.visit("facebook.com");
    bh.visit("youtube.com");
    let ans1 = bh.back(1);
    let ans2 = bh.back(1);
    let ans3 = bh.forward(1);
    bh.visit("linkedin.com");
    let ans4 = bh.forward(2);
    let ans5 = bh.back(2);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5]) === JSON.stringify(["facebook.com", "google.com", "facebook.com", "linkedin.com", "google.com"])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val bh = BrowserHistory("leetcode.com")
        bh.visit("google.com")
        bh.visit("facebook.com")
        bh.visit("youtube.com")
        val ans1 = bh.back(1)
        val ans2 = bh.back(1)
        val ans3 = bh.forward(1)
        bh.visit("linkedin.com")
        val ans4 = bh.forward(2)
        val ans5 = bh.back(2)
        if (ans1 == "facebook.com" && ans2 == "google.com" && ans3 == "facebook.com" && ans4 == "linkedin.com" && ans5 == "google.com") _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'remove-zero-sum-consecutive-nodes-from-linked-list',
    stubs: {
      python: `class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef removeZeroSumSublists(head: ListNode) -> ListNode:\n    pass`,
      javascript: `class ListNode {\n    constructor(val, next) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction removeZeroSumSublists(head) {\n\n}`,
      typescript: `class ListNode {\n    val: number;\n    next: ListNode | null;\n    constructor(val?: number, next?: ListNode | null) {\n        this.val = (val===undefined ? 0 : val);\n        this.next = (next===undefined ? null : next);\n    }\n}\nfunction removeZeroSumSublists(head: ListNode | null): ListNode | null {\n    return null;\n}`,
      kotlin: `class ListNode(var \`val\`: Int) {\n    var next: ListNode? = null\n}\nfun removeZeroSumSublists(head: ListNode?): ListNode? {\n    return null\n}`
    },
    customRunner: {
      python: `
${PY_LIST_DEFS}
_pass = _total = 0
for _ in range(15):
    _total += 1
    if _toArr(removeZeroSumSublists(_make([1,2,-3,3,1]))) in [[3,1], [1,2,1]]: _pass += 1
    _total += 1
    if _toArr(removeZeroSumSublists(_make([1,2,3,-3,-2]))) == [1]: _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
${JS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    let res1 = _toArr(removeZeroSumSublists(_make([1,2,-3,3,1])));
    if (JSON.stringify(res1) === JSON.stringify([3,1]) || JSON.stringify(res1) === JSON.stringify([1,2,1])) _pass++;
    if (JSON.stringify(_toArr(removeZeroSumSublists(_make([1,2,3,-3,-2])))) === JSON.stringify([1])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
${TS_LIST_DEFS}
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total += 2;
    let res1 = _toArr(removeZeroSumSublists(_make([1,2,-3,3,1])));
    if (JSON.stringify(res1) === JSON.stringify([3,1]) || JSON.stringify(res1) === JSON.stringify([1,2,1])) _pass++;
    if (JSON.stringify(_toArr(removeZeroSumSublists(_make([1,2,3,-3,-2])))) === JSON.stringify([1])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
${KT_LIST_DEFS}
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total += 2
        val res1 = _toArr(removeZeroSumSublists(_make(listOf(1,2,-3,3,1))))
        if (res1 == listOf(3,1) || res1 == listOf(1,2,1)) _pass++
        if (_toArr(removeZeroSumSublists(_make(listOf(1,2,3,-3,-2)))) == listOf(1)) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 30 LINKED_LISTS problems…\n');

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
