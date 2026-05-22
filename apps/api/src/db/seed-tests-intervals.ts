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

// ---------------------------------------------------------------------------
// 30 INTERVALS PROBLEMS DATA
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
    slug: 'meeting-rooms',
    functionName: { python: 'canAttendMeetings', javascript: 'canAttendMeetings', typescript: 'canAttendMeetings', kotlin: 'canAttendMeetings' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def canAttendMeetings(intervals: list) -> bool:\n    pass`,
      javascript: `function canAttendMeetings(intervals) {\n\n}`,
      typescript: `function canAttendMeetings(intervals: number[][]): boolean {\n\n}`,
      kotlin: `fun canAttendMeetings(intervals: Array<IntArray>): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { intervals: [[0,30],[5,10],[15,20]], expected: false },
        { intervals: [[7,10],[2,4]], expected: true }
      ];
      return { inputs: [base[i % base.length].intervals], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'determine-if-two-events-have-conflict',
    functionName: { python: 'haveConflict', javascript: 'haveConflict', typescript: 'haveConflict', kotlin: 'haveConflict' },
    inputTypes: ['string_array', 'string_array'],
    stubs: {
      python: `def haveConflict(event1: list, event2: list) -> bool:\n    pass`,
      javascript: `function haveConflict(event1, event2) {\n\n}`,
      typescript: `function haveConflict(event1: string[], event2: string[]): boolean {\n\n}`,
      kotlin: `fun haveConflict(event1: Array<String>, event2: Array<String>): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { event1: ["01:15","02:00"], event2: ["02:00","03:00"], expected: true },
        { event1: ["01:00","02:00"], event2: ["01:20","03:00"], expected: true },
        { event1: ["10:00","11:00"], event2: ["14:00","15:00"], expected: false }
      ];
      return { inputs: [base[i % base.length].event1, base[i % base.length].event2], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'summary-ranges',
    functionName: { python: 'summaryRanges', javascript: 'summaryRanges', typescript: 'summaryRanges', kotlin: 'summaryRanges' },
    expectedType: 'string_array',
    stubs: {
      python: `def summaryRanges(nums: list) -> list:\n    pass`,
      javascript: `function summaryRanges(nums) {\n\n}`,
      typescript: `function summaryRanges(nums: number[]): string[] {\n\n}`,
      kotlin: `fun summaryRanges(nums: IntArray): List<String> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [0,1,2,4,5,7], expected: ["0->2","4->5","7"] },
        { nums: [0,2,3,4,6,8,9], expected: ["0","2->4","6","8->9"] }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'check-if-all-integers-in-range-are-covered',
    functionName: { python: 'isCovered', javascript: 'isCovered', typescript: 'isCovered', kotlin: 'isCovered' },
    inputTypes: ['int_array_2d', 'normal', 'normal'],
    stubs: {
      python: `def isCovered(ranges: list, left: int, right: int) -> bool:\n    pass`,
      javascript: `function isCovered(ranges, left, right) {\n\n}`,
      typescript: `function isCovered(ranges: number[][], left: number, right: number): boolean {\n\n}`,
      kotlin: `fun isCovered(ranges: Array<IntArray>, left: Int, right: Int): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { ranges: [[1,2],[3,4],[5,6]], left: 2, right: 5, expected: true },
        { ranges: [[1,10],[10,20]], left: 21, right: 21, expected: false }
      ];
      return { inputs: [base[i % base.length].ranges, base[i % base.length].left, base[i % base.length].right], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'teemo-attacking',
    functionName: { python: 'findPoisonedDuration', javascript: 'findPoisonedDuration', typescript: 'findPoisonedDuration', kotlin: 'findPoisonedDuration' },
    stubs: {
      python: `def findPoisonedDuration(timeSeries: list, duration: int) -> int:\n    pass`,
      javascript: `function findPoisonedDuration(timeSeries, duration) {\n\n}`,
      typescript: `function findPoisonedDuration(timeSeries: number[], duration: number): number {\n\n}`,
      kotlin: `fun findPoisonedDuration(timeSeries: IntArray, duration: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { timeSeries: [1,4], duration: 2, expected: 4 },
        { timeSeries: [1,2], duration: 2, expected: 3 }
      ];
      return { inputs: [base[i % base.length].timeSeries, base[i % base.length].duration], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'count-days-spent-together',
    functionName: { python: 'countDaysTogether', javascript: 'countDaysTogether', typescript: 'countDaysTogether', kotlin: 'countDaysTogether' },
    stubs: {
      python: `def countDaysTogether(arriveAlice: str, leaveAlice: str, arriveBob: str, leaveBob: str) -> int:\n    pass`,
      javascript: `function countDaysTogether(arriveAlice, leaveAlice, arriveBob, leaveBob) {\n\n}`,
      typescript: `function countDaysTogether(arriveAlice: string, leaveAlice: string, arriveBob: string, leaveBob: string): number {\n\n}`,
      kotlin: `fun countDaysTogether(arriveAlice: String, leaveAlice: String, arriveBob: String, leaveBob: String): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { arriveAlice: "08-15", leaveAlice: "08-18", arriveBob: "08-16", leaveBob: "08-19", expected: 3 },
        { arriveAlice: "10-01", leaveAlice: "10-31", arriveBob: "11-01", leaveBob: "12-31", expected: 0 }
      ];
      return {
        inputs: [
          base[i % base.length].arriveAlice,
          base[i % base.length].leaveAlice,
          base[i % base.length].arriveBob,
          base[i % base.length].leaveBob
        ],
        expected: base[i % base.length].expected
      };
    })
  },
  {
    slug: 'maximum-population-year',
    functionName: { python: 'maximumPopulation', javascript: 'maximumPopulation', typescript: 'maximumPopulation', kotlin: 'maximumPopulation' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def maximumPopulation(logs: list) -> int:\n    pass`,
      javascript: `function maximumPopulation(logs) {\n\n}`,
      typescript: `function maximumPopulation(logs: number[][]): number {\n\n}`,
      kotlin: `fun maximumPopulation(logs: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { logs: [[1993,1999],[2000,2010]], expected: 1993 },
        { logs: [[1950,1961],[1960,1971],[1970,1981]], expected: 1960 }
      ];
      return { inputs: [base[i % base.length].logs], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'points-that-intersect-with-cars',
    functionName: { python: 'numberOfPoints', javascript: 'numberOfPoints', typescript: 'numberOfPoints', kotlin: 'numberOfPoints' },
    stubs: {
      python: `def numberOfPoints(nums: list) -> int:\n    pass`,
      javascript: `function numberOfPoints(nums) {\n\n}`,
      typescript: `function numberOfPoints(nums: number[][]): number {\n\n}`,
      kotlin: `fun numberOfPoints(nums: List<List<Int>>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [[3,6],[1,5],[4,7]], expected: 7 },
        { nums: [[1,3],[5,8]], expected: 7 }
      ];
      return { inputs: [base[i % base.length].nums], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'missing-ranges',
    functionName: { python: 'findMissingRanges', javascript: 'findMissingRanges', typescript: 'findMissingRanges', kotlin: 'findMissingRanges' },
    stubs: {
      python: `def findMissingRanges(nums: list, lower: int, upper: int) -> list:\n    pass`,
      javascript: `function findMissingRanges(nums, lower, upper) {\n\n}`,
      typescript: `function findMissingRanges(nums: number[], lower: number, upper: number): number[][] {\n\n}`,
      kotlin: `fun findMissingRanges(nums: IntArray, lower: Int, upper: Int): List<List<Int>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [0,1,3,50,75], lower: 0, upper: 99, expected: [[2,2],[4,49],[51,74],[76,99]] },
        { nums: [-1], lower: -1, upper: -1, expected: [] }
      ];
      return { inputs: [base[i % base.length].nums, base[i % base.length].lower, base[i % base.length].upper], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'count-days-without-meetings',
    functionName: { python: 'countDays', javascript: 'countDays', typescript: 'countDays', kotlin: 'countDays' },
    inputTypes: ['normal', 'int_array_2d'],
    stubs: {
      python: `def countDays(days: int, meetings: list) -> int:\n    pass`,
      javascript: `function countDays(days, meetings) {\n\n}`,
      typescript: `function countDays(days: number, meetings: number[][]): number {\n\n}`,
      kotlin: `fun countDays(days: Int, meetings: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { days: 10, meetings: [[5,7],[1,3],[9,10]], expected: 2 },
        { days: 5, meetings: [[2,4],[1,3]], expected: 1 },
        { days: 6, meetings: [[1,6]], expected: 0 }
      ];
      return { inputs: [base[i % base.length].days, base[i % base.length].meetings], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'merge-intervals',
    functionName: { python: 'merge', javascript: 'merge', typescript: 'merge', kotlin: 'merge' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def merge(intervals: list) -> list:\n    pass`,
      javascript: `function merge(intervals) {\n\n}`,
      typescript: `function merge(intervals: number[][]): number[][] {\n\n}`,
      kotlin: `fun merge(intervals: Array<IntArray>): Array<IntArray> {\n    return arrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { intervals: [[1,3],[2,6],[8,10],[15,18]], expected: [[1,6],[8,10],[15,18]] },
        { intervals: [[1,4],[4,5]], expected: [[1,5]] }
      ];
      return { inputs: [base[i % base.length].intervals], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'insert-interval',
    functionName: { python: 'insert', javascript: 'insert', typescript: 'insert', kotlin: 'insert' },
    inputTypes: ['int_array_2d', 'normal'],
    stubs: {
      python: `def insert(intervals: list, newInterval: list) -> list:\n    pass`,
      javascript: `function insert(intervals, newInterval) {\n\n}`,
      typescript: `function insert(intervals: number[][], newInterval: number[]): number[][] {\n\n}`,
      kotlin: `fun insert(intervals: Array<IntArray>, newInterval: IntArray): Array<IntArray> {\n    return arrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { intervals: [[1,3],[6,9]], newInterval: [2,5], expected: [[1,5],[6,9]] },
        { intervals: [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval: [4,8], expected: [[1,2],[3,10],[12,16]] }
      ];
      return { inputs: [base[i % base.length].intervals, base[i % base.length].newInterval], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'meeting-rooms-ii',
    functionName: { python: 'minMeetingRooms', javascript: 'minMeetingRooms', typescript: 'minMeetingRooms', kotlin: 'minMeetingRooms' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def minMeetingRooms(intervals: list) -> int:\n    pass`,
      javascript: `function minMeetingRooms(intervals) {\n\n}`,
      typescript: `function minMeetingRooms(intervals: number[][]): number {\n\n}`,
      kotlin: `fun minMeetingRooms(intervals: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { intervals: [[0,30],[5,10],[15,20]], expected: 2 },
        { intervals: [[7,10],[2,4]], expected: 1 }
      ];
      return { inputs: [base[i % base.length].intervals], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'interval-list-intersections',
    functionName: { python: 'intervalIntersection', javascript: 'intervalIntersection', typescript: 'intervalIntersection', kotlin: 'intervalIntersection' },
    inputTypes: ['int_array_2d', 'int_array_2d'],
    stubs: {
      python: `def intervalIntersection(firstList: list, secondList: list) -> list:\n    pass`,
      javascript: `function intervalIntersection(firstList, secondList) {\n\n}`,
      typescript: `function intervalIntersection(firstList: number[][], secondList: number[][]): number[][] {\n\n}`,
      kotlin: `fun intervalIntersection(firstList: Array<IntArray>, secondList: Array<IntArray>): Array<IntArray> {\n    return arrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { firstList: [[0,2],[5,10],[13,23],[24,25]], secondList: [[1,5],[8,12],[15,24],[25,26]], expected: [[1,2],[5,5],[8,10],[15,23],[24,24],[25,25]] },
        { firstList: [[1,3],[5,9]], secondList: [], expected: [] }
      ];
      return { inputs: [base[i % base.length].firstList, base[i % base.length].secondList], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'my-calendar-i',
    stubs: {
      python: `class MyCalendar:\n    def __init__(self):\n        pass\n    def book(self, start: int, end: int) -> bool:\n        pass`,
      javascript: `class MyCalendar {\n    constructor() {\n\n    }\n    book(start, end) {\n\n    }\n}`,
      typescript: `class MyCalendar {\n    constructor() {\n\n    }\n    book(start: number, end: number): boolean {\n        return false;\n    }\n}`,
      kotlin: `class MyCalendar() {\n    fun book(start: Int, end: Int): Boolean {\n        return false\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    cal = MyCalendar()
    ans1 = cal.book(10, 20)
    ans2 = cal.book(15, 25)
    ans3 = cal.book(20, 30)
    if [ans1, ans2, ans3] == [True, False, True]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let cal = new MyCalendar();
    let ans1 = cal.book(10, 20);
    let ans2 = cal.book(15, 25);
    let ans3 = cal.book(20, 30);
    if (JSON.stringify([ans1, ans2, ans3]) === JSON.stringify([true, false, true])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let cal = new MyCalendar();
    let ans1 = cal.book(10, 20);
    let ans2 = cal.book(15, 25);
    let ans3 = cal.book(20, 30);
    if (JSON.stringify([ans1, ans2, ans3]) === JSON.stringify([true, false, true])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val cal = MyCalendar()
        val ans1 = cal.book(10, 20)
        val ans2 = cal.book(15, 25)
        val ans3 = cal.book(20, 30)
        if (ans1 == true && ans2 == false && ans3 == true) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'my-calendar-ii',
    stubs: {
      python: `class MyCalendarTwo:\n    def __init__(self):\n        pass\n    def book(self, start: int, end: int) -> bool:\n        pass`,
      javascript: `class MyCalendarTwo {\n    constructor() {\n\n    }\n    book(start, end) {\n\n    }\n}`,
      typescript: `class MyCalendarTwo {\n    constructor() {\n\n    }\n    book(start: number, end: number): boolean {\n        return false;\n    }\n}`,
      kotlin: `class MyCalendarTwo() {\n    fun book(start: Int, end: Int): Boolean {\n        return false\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    cal = MyCalendarTwo()
    ans1 = cal.book(10, 20)
    ans2 = cal.book(50, 60)
    ans3 = cal.book(10, 40)
    ans4 = cal.book(5, 15)
    ans5 = cal.book(5, 10)
    ans6 = cal.book(25, 55)
    if [ans1, ans2, ans3, ans4, ans5, ans6] == [True, True, True, False, True, True]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let cal = new MyCalendarTwo();
    let ans1 = cal.book(10, 20);
    let ans2 = cal.book(50, 60);
    let ans3 = cal.book(10, 40);
    let ans4 = cal.book(5, 15);
    let ans5 = cal.book(5, 10);
    let ans6 = cal.book(25, 55);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6]) === JSON.stringify([true, true, true, false, true, true])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let cal = new MyCalendarTwo();
    let ans1 = cal.book(10, 20);
    let ans2 = cal.book(50, 60);
    let ans3 = cal.book(10, 40);
    let ans4 = cal.book(5, 15);
    let ans5 = cal.book(5, 10);
    let ans6 = cal.book(25, 55);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6]) === JSON.stringify([true, true, true, false, true, true])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val cal = MyCalendarTwo()
        val ans1 = cal.book(10, 20)
        val ans2 = cal.book(50, 60)
        val ans3 = cal.book(10, 40)
        val ans4 = cal.book(5, 15)
        val ans5 = cal.book(5, 10)
        val ans6 = cal.book(25, 55)
        if (ans1 == true && ans2 == true && ans3 == true && ans4 == false && ans5 == true && ans6 == true) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'find-right-interval',
    functionName: { python: 'findRightInterval', javascript: 'findRightInterval', typescript: 'findRightInterval', kotlin: 'findRightInterval' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def findRightInterval(intervals: list) -> list:\n    pass`,
      javascript: `function findRightInterval(intervals) {\n\n}`,
      typescript: `function findRightInterval(intervals: number[][]): number[] {\n\n}`,
      kotlin: `fun findRightInterval(intervals: Array<IntArray>): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { intervals: [[1,2]], expected: [-1] },
        { intervals: [[3,4],[2,3],[1,2]], expected: [-1,0,1] },
        { intervals: [[1,4],[2,3],[3,4]], expected: [-1,2,-1] }
      ];
      return { inputs: [base[i % base.length].intervals], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'remove-covered-intervals',
    functionName: { python: 'removeCoveredIntervals', javascript: 'removeCoveredIntervals', typescript: 'removeCoveredIntervals', kotlin: 'removeCoveredIntervals' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def removeCoveredIntervals(intervals: list) -> int:\n    pass`,
      javascript: `function removeCoveredIntervals(intervals) {\n\n}`,
      typescript: `function removeCoveredIntervals(intervals: number[][]): number {\n\n}`,
      kotlin: `fun removeCoveredIntervals(intervals: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { intervals: [[1,4],[3,6],[2,8]], expected: 2 },
        { intervals: [[1,4],[2,3]], expected: 1 }
      ];
      return { inputs: [base[i % base.length].intervals], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximum-number-of-events-that-can-be-attended',
    functionName: { python: 'maxEvents', javascript: 'maxEvents', typescript: 'maxEvents', kotlin: 'maxEvents' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def maxEvents(events: list) -> int:\n    pass`,
      javascript: `function maxEvents(events) {\n\n}`,
      typescript: `function maxEvents(events: number[][]): number {\n\n}`,
      kotlin: `fun maxEvents(events: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { events: [[1,2],[2,3],[3,4]], expected: 3 },
        { events: [[1,2],[2,3],[3,4],[1,2]], expected: 4 }
      ];
      return { inputs: [base[i % base.length].events], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'count-ways-to-group-overlapping-ranges',
    functionName: { python: 'countWays', javascript: 'countWays', typescript: 'countWays', kotlin: 'countWays' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def countWays(ranges: list) -> int:\n    pass`,
      javascript: `function countWays(ranges) {\n\n}`,
      typescript: `function countWays(ranges: number[][]): number {\n\n}`,
      kotlin: `fun countWays(ranges: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { ranges: [[6,10],[5,15]], expected: 2 },
        { ranges: [[1,3],[10,20],[2,5],[4,8]], expected: 4 }
      ];
      return { inputs: [base[i % base.length].ranges], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'the-skyline-problem',
    functionName: { python: 'getSkyline', javascript: 'getSkyline', typescript: 'getSkyline', kotlin: 'getSkyline' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def getSkyline(buildings: list) -> list:\n    pass`,
      javascript: `function getSkyline(buildings) {\n\n}`,
      typescript: `function getSkyline(buildings: number[][]): number[][] {\n\n}`,
      kotlin: `fun getSkyline(buildings: Array<IntArray>): List<List<Int>> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { buildings: [[2,9,10],[3,7,15],[5,12,12],[15,20,10],[19,24,8]], expected: [[2,10],[3,15],[7,12],[12,0],[15,10],[20,8],[24,0]] },
        { buildings: [[0,2,3],[2,5,3]], expected: [[0,3],[5,0]] }
      ];
      return { inputs: [base[i % base.length].buildings], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'range-module',
    stubs: {
      python: `class RangeModule:\n    def __init__(self):\n        pass\n    def addRange(self, left: int, right: int) -> None:\n        pass\n    def queryRange(self, left: int, right: int) -> bool:\n        pass\n    def removeRange(self, left: int, right: int) -> None:\n        pass`,
      javascript: `class RangeModule {\n    constructor() {\n\n    }\n    addRange(left, right) {\n\n    }\n    queryRange(left, right) {\n\n    }\n    removeRange(left, right) {\n\n    }\n}`,
      typescript: `class RangeModule {\n    constructor() {\n\n    }\n    addRange(left: number, right: number): void {\n\n    }\n    queryRange(left: number, right: number): boolean {\n        return false;\n    }\n    removeRange(left: number, right: number): void {\n\n    }\n}`,
      kotlin: `class RangeModule() {\n    fun addRange(left: Int, right: Int) {\n\n    }\n    fun queryRange(left: Int, right: Int): Boolean {\n        return false\n    }\n    fun removeRange(left: Int, right: Int) {\n\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    rm = RangeModule()
    rm.addRange(10, 20)
    rm.removeRange(14, 16)
    ans1 = rm.queryRange(10, 14)
    ans2 = rm.queryRange(13, 15)
    ans3 = rm.queryRange(16, 20)
    if [ans1, ans2, ans3] == [True, False, True]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let rm = new RangeModule();
    rm.addRange(10, 20);
    rm.removeRange(14, 16);
    let ans1 = rm.queryRange(10, 14);
    let ans2 = rm.queryRange(13, 15);
    let ans3 = rm.queryRange(16, 20);
    if (JSON.stringify([ans1, ans2, ans3]) === JSON.stringify([true, false, true])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let rm = new RangeModule();
    rm.addRange(10, 20);
    rm.removeRange(14, 16);
    let ans1 = rm.queryRange(10, 14);
    let ans2 = rm.queryRange(13, 15);
    let ans3 = rm.queryRange(16, 20);
    if (JSON.stringify([ans1, ans2, ans3]) === JSON.stringify([true, false, true])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val rm = RangeModule()
        rm.addRange(10, 20)
        rm.removeRange(14, 16)
        val ans1 = rm.queryRange(10, 14)
        val ans2 = rm.queryRange(13, 15)
        val ans3 = rm.queryRange(16, 20)
        if (ans1 == true && ans2 == false && ans3 == true) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'employee-free-time',
    functionName: { python: 'employeeFreeTime', javascript: 'employeeFreeTime', typescript: 'employeeFreeTime', kotlin: 'employeeFreeTime' },
    stubs: {
      python: `def employeeFreeTime(schedule: list) -> list:\n    pass`,
      javascript: `function employeeFreeTime(schedule) {\n\n}`,
      typescript: `function employeeFreeTime(schedule: number[][][]): number[][] {\n\n}`,
      kotlin: `fun employeeFreeTime(schedule: List<List<IntArray>>): List<IntArray> {\n    return listOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { schedule: [[[1,2],[5,6]],[[1,3]],[[4,10]]], expected: [[3,4]] },
        { schedule: [[[1,3],[6,7]],[[2,4]],[[2,5],[9,12]]], expected: [[5,6],[7,9]] }
      ];
      return { inputs: [base[i % base.length].schedule], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'my-calendar-iii',
    stubs: {
      python: `class MyCalendarThree:\n    def __init__(self):\n        pass\n    def book(self, startTime: int, endTime: int) -> int:\n        pass`,
      javascript: `class MyCalendarThree {\n    constructor() {\n\n    }\n    book(startTime, endTime) {\n\n    }\n}`,
      typescript: `class MyCalendarThree {\n    constructor() {\n\n    }\n    book(startTime: number, endTime: number): number {\n        return 0;\n    }\n}`,
      kotlin: `class MyCalendarThree() {\n    fun book(startTime: Int, endTime: Int): Int {\n        return 0\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    cal = MyCalendarThree()
    ans1 = cal.book(10, 20)
    ans2 = cal.book(50, 60)
    ans3 = cal.book(10, 40)
    ans4 = cal.book(5, 15)
    ans5 = cal.book(5, 10)
    ans6 = cal.book(25, 55)
    if [ans1, ans2, ans3, ans4, ans5, ans6] == [1, 1, 2, 3, 3, 3]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let cal = new MyCalendarThree();
    let ans1 = cal.book(10, 20);
    let ans2 = cal.book(50, 60);
    let ans3 = cal.book(10, 40);
    let ans4 = cal.book(5, 15);
    let ans5 = cal.book(5, 10);
    let ans6 = cal.book(25, 55);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6]) === JSON.stringify([1, 1, 2, 3, 3, 3])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let cal = new MyCalendarThree();
    let ans1 = cal.book(10, 20);
    let ans2 = cal.book(50, 60);
    let ans3 = cal.book(10, 40);
    let ans4 = cal.book(5, 15);
    let ans5 = cal.book(5, 10);
    let ans6 = cal.book(25, 55);
    if (JSON.stringify([ans1, ans2, ans3, ans4, ans5, ans6]) === JSON.stringify([1, 1, 2, 3, 3, 3])) _pass++;
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val cal = MyCalendarThree()
        val ans1 = cal.book(10, 20)
        val ans2 = cal.book(50, 60)
        val ans3 = cal.book(10, 40)
        val ans4 = cal.book(5, 15)
        val ans5 = cal.book(5, 10)
        val ans6 = cal.book(25, 55)
        if (ans1 == 1 && ans2 == 1 && ans3 == 2 && ans4 == 3 && ans5 == 3 && ans6 == 3) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'minimum-interval-to-include-each-query',
    functionName: { python: 'minInterval', javascript: 'minInterval', typescript: 'minInterval', kotlin: 'minInterval' },
    inputTypes: ['int_array_2d', 'normal'],
    stubs: {
      python: `def minInterval(intervals: list, queries: list) -> list:\n    pass`,
      javascript: `function minInterval(intervals, queries) {\n\n}`,
      typescript: `function minInterval(intervals: number[][], queries: number[]): number[] {\n\n}`,
      kotlin: `fun minInterval(intervals: Array<IntArray>, queries: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { intervals: [[1,4],[2,4],[3,6],[4,4]], queries: [2,3,4,5], expected: [3,3,1,4] },
        { intervals: [[2,3],[2,5],[1,8],[20,25]], queries: [2,19,5,22], expected: [2,-1,4,6] }
      ];
      return { inputs: [base[i % base.length].intervals, base[i % base.length].queries], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'meeting-rooms-iii',
    functionName: { python: 'mostBooked', javascript: 'mostBooked', typescript: 'mostBooked', kotlin: 'mostBooked' },
    inputTypes: ['normal', 'int_array_2d'],
    stubs: {
      python: `def mostBooked(n: int, meetings: list) -> int:\n    pass`,
      javascript: `function mostBooked(n, meetings) {\n\n}`,
      typescript: `function mostBooked(n: number, meetings: number[][]): number {\n\n}`,
      kotlin: `fun mostBooked(n: Int, meetings: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { n: 2, meetings: [[0,10],[1,5],[2,7],[3,4]], expected: 0 },
        { n: 3, meetings: [[1,20],[2,10],[3,5],[4,9],[6,8]], expected: 1 }
      ];
      return { inputs: [base[i % base.length].n, base[i % base.length].meetings], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximum-number-of-events-that-can-be-attended-ii',
    functionName: { python: 'maxValue', javascript: 'maxValue', typescript: 'maxValue', kotlin: 'maxValue' },
    inputTypes: ['int_array_2d', 'normal'],
    stubs: {
      python: `def maxValue(events: list, k: int) -> int:\n    pass`,
      javascript: `function maxValue(events, k) {\n\n}`,
      typescript: `function maxValue(events: number[][], k: number): number {\n\n}`,
      kotlin: `fun maxValue(events: Array<IntArray>, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { events: [[1,2,4],[3,4,3],[2,3,1]], k: 2, expected: 7 },
        { events: [[1,2,4],[3,4,3],[2,3,10]], k: 2, expected: 10 },
        { events: [[1,1,1]], k: 1, expected: 1 }
      ];
      return { inputs: [base[i % base.length].events, base[i % base.length].k], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'data-stream-as-disjoint-intervals',
    stubs: {
      python: `class SummaryRanges:\n    def __init__(self):\n        pass\n    def addNum(self, value: int) -> None:\n        pass\n    def getIntervals(self) -> list:\n        pass`,
      javascript: `class SummaryRanges {\n    constructor() {\n\n    }\n    addNum(value) {\n\n    }\n    getIntervals() {\n\n    }\n}`,
      typescript: `class SummaryRanges {\n    constructor() {\n\n    }\n    addNum(value: number): void {\n\n    }\n    getIntervals(): number[][] {\n        return [];\n    }\n}`,
      kotlin: `class SummaryRanges() {\n    fun addNum(value: Int) {\n\n    }\n    fun getIntervals(): Array<IntArray> {\n        return arrayOf()\n    }\n}`
    },
    customRunner: {
      python: `
_pass = _total = 0
for _ in range(15):
    _total += 1
    sr = SummaryRanges()
    sr.addNum(1)
    ans1 = sr.getIntervals()
    sr.addNum(3)
    ans2 = sr.getIntervals()
    sr.addNum(7)
    ans3 = sr.getIntervals()
    sr.addNum(2)
    ans4 = sr.getIntervals()
    sr.addNum(6)
    ans5 = sr.getIntervals()
    if [list(x) for x in ans1] == [[1, 1]] and \
       [list(x) for x in ans2] == [[1, 1], [3, 3]] and \
       [list(x) for x in ans3] == [[1, 1], [3, 3], [7, 7]] and \
       [list(x) for x in ans4] == [[1, 3], [7, 7]] and \
       [list(x) for x in ans5] == [[1, 3], [6, 7]]:
        _pass += 1
print(f"{_pass}/{_total} tests passed")
`,
      javascript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let sr = new SummaryRanges();
    sr.addNum(1);
    let ans1 = sr.getIntervals();
    sr.addNum(3);
    let ans2 = sr.getIntervals();
    sr.addNum(7);
    let ans3 = sr.getIntervals();
    sr.addNum(2);
    let ans4 = sr.getIntervals();
    sr.addNum(6);
    let ans5 = sr.getIntervals();
    if (JSON.stringify(ans1) === JSON.stringify([[1, 1]]) &&
        JSON.stringify(ans2) === JSON.stringify([[1, 1], [3, 3]]) &&
        JSON.stringify(ans3) === JSON.stringify([[1, 1], [3, 3], [7, 7]]) &&
        JSON.stringify(ans4) === JSON.stringify([[1, 3], [7, 7]]) &&
        JSON.stringify(ans5) === JSON.stringify([[1, 3], [6, 7]])) {
        _pass++;
    }
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      typescript: `
let _pass = 0, _total = 0;
for (let i = 0; i < 15; i++) {
    _total++;
    let sr = new SummaryRanges();
    sr.addNum(1);
    let ans1 = sr.getIntervals();
    sr.addNum(3);
    let ans2 = sr.getIntervals();
    sr.addNum(7);
    let ans3 = sr.getIntervals();
    sr.addNum(2);
    let ans4 = sr.getIntervals();
    sr.addNum(6);
    let ans5 = sr.getIntervals();
    if (JSON.stringify(ans1) === JSON.stringify([[1, 1]]) &&
        JSON.stringify(ans2) === JSON.stringify([[1, 1], [3, 3]]) &&
        JSON.stringify(ans3) === JSON.stringify([[1, 1], [3, 3], [7, 7]]) &&
        JSON.stringify(ans4) === JSON.stringify([[1, 3], [7, 7]]) &&
        JSON.stringify(ans5) === JSON.stringify([[1, 3], [6, 7]])) {
        _pass++;
    }
}
console.log(\`\${_pass}/\${_total} tests passed\`);
`,
      kotlin: `
fun main() {
    var _pass = 0; var _total = 0
    for (i in 1..15) {
        _total++
        val sr = SummaryRanges()
        sr.addNum(1)
        val ans1 = sr.getIntervals()
        sr.addNum(3)
        val ans2 = sr.getIntervals()
        sr.addNum(7)
        val ans3 = sr.getIntervals()
        sr.addNum(2)
        val ans4 = sr.getIntervals()
        sr.addNum(6)
        val ans5 = sr.getIntervals()
        
        val match1 = ans1.size == 1 && ans1[0].contentEquals(intArrayOf(1, 1))
        val match2 = ans2.size == 2 && ans2[0].contentEquals(intArrayOf(1, 1)) && ans2[1].contentEquals(intArrayOf(3, 3))
        val match3 = ans3.size == 3 && ans3[0].contentEquals(intArrayOf(1, 1)) && ans3[1].contentEquals(intArrayOf(3, 3)) && ans3[2].contentEquals(intArrayOf(7, 7))
        val match4 = ans4.size == 2 && ans4[0].contentEquals(intArrayOf(1, 3)) && ans4[1].contentEquals(intArrayOf(7, 7))
        val match5 = ans5.size == 2 && ans5[0].contentEquals(intArrayOf(1, 3)) && ans5[1].contentEquals(intArrayOf(6, 7))
        
        if (match1 && match2 && match3 && match4 && match5) _pass++
    }
    println("\$_pass/\$_total tests passed")
}
`
    }
  },
  {
    slug: 'minimum-time-to-complete-all-tasks',
    functionName: { python: 'findMinimumTime', javascript: 'findMinimumTime', typescript: 'findMinimumTime', kotlin: 'findMinimumTime' },
    inputTypes: ['int_array_2d'],
    stubs: {
      python: `def findMinimumTime(tasks: list) -> int:\n    pass`,
      javascript: `function findMinimumTime(tasks) {\n\n}`,
      typescript: `function findMinimumTime(tasks: number[][]): number {\n\n}`,
      kotlin: `fun findMinimumTime(tasks: Array<IntArray>): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { tasks: [[2,3,1],[4,5,1],[1,5,2]], expected: 2 },
        { tasks: [[1,3,2],[2,5,3],[5,6,2]], expected: 4 }
      ];
      return { inputs: [base[i % base.length].tasks], expected: base[i % base.length].expected };
    })
  },
  {
    slug: 'maximum-profit-in-job-scheduling',
    functionName: { python: 'jobScheduling', javascript: 'jobScheduling', typescript: 'jobScheduling', kotlin: 'jobScheduling' },
    stubs: {
      python: `def jobScheduling(startTime: list, endTime: list, profit: list) -> int:\n    pass`,
      javascript: `function jobScheduling(startTime, endTime, profit) {\n\n}`,
      typescript: `function jobScheduling(startTime: number[], endTime: number[], profit: number[]): number {\n\n}`,
      kotlin: `fun jobScheduling(startTime: IntArray, endTime: IntArray, profit: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { startTime: [1,2,3,3], endTime: [3,4,5,6], profit: [50,10,40,70], expected: 120 },
        { startTime: [1,2,3,4,6], endTime: [3,5,10,6,9], profit: [20,20,100,70,60], expected: 150 }
      ];
      return { inputs: [base[i % base.length].startTime, base[i % base.length].endTime, base[i % base.length].profit], expected: base[i % base.length].expected };
    })
  }
];

async function seed() {
  console.log('Seeding stubs and test runners for 30 INTERVALS problems…\n');

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
