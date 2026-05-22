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
  if (type === 'normal') {
    code += `def _t(result, expected, label=""):
    global _pass, _total
    _total += 1
    if result == expected:
        _pass += 1\n\n`;
  } else if (type === '3sum' || type === '4sum') {
    code += `def _t_unordered(result, expected, label=""):
    global _pass, _total
    _total += 1
    res_sorted = sorted([sorted(x) for x in result]) if result else []
    exp_sorted = sorted([sorted(x) for x in expected]) if expected else []
    if res_sorted == exp_sorted:
        _pass += 1\n\n`;
  } else if (type === 'any_of') {
    code += `def _t_any(result, expected_list, label=""):
    global _pass, _total
    _total += 1
    if result in expected_list:
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
    if (type === 'normal') {
      const argsStr = tc.inputs.map(x => serializeVal(x, 'python')).join(', ');
      code += `_t(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'python')}, ${JSON.stringify(label)})\n`;
    } else if (type === '3sum' || type === '4sum') {
      const argsStr = tc.inputs.map(x => serializeVal(x, 'python')).join(', ');
      code += `_t_unordered(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'python')}, ${JSON.stringify(label)})\n`;
    } else if (type === 'any_of') {
      const argsStr = tc.inputs.map(x => serializeVal(x, 'python')).join(', ');
      code += `_t_any(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'python')}, ${JSON.stringify(label)})\n`;
    } else if (type === 'inplace') {
      const argsStr = tc.inputs.map((x, i) => i === 0 ? 'arg0' : serializeVal(x, 'python')).join(', ');
      code += `arg0 = ${serializeVal(tc.inputs[0], 'python')}\n`;
      code += `${funcName}(${argsStr})\n`;
      code += `_t(arg0, ${serializeVal(tc.expected, 'python')}, ${JSON.stringify(label)})\n`;
    } else if (type === 'inplace_k') {
      const argsStr = tc.inputs.map((x, i) => i === 0 ? 'arg0' : serializeVal(x, 'python')).join(', ');
      code += `arg0 = ${serializeVal(tc.inputs[0], 'python')}\n`;
      code += `k = ${funcName}(${argsStr})\n`;
      code += `_t((k, arg0[:k]), (${tc.expected_k}, ${serializeVal(tc.expected, 'python')}), ${JSON.stringify(label)})\n`;
    } else if (type === 'inplace_k_unordered') {
      const argsStr = tc.inputs.map((x, i) => i === 0 ? 'arg0' : serializeVal(x, 'python')).join(', ');
      code += `arg0 = ${serializeVal(tc.inputs[0], 'python')}\n`;
      code += `k = ${funcName}(${argsStr})\n`;
      code += `_t((k, sorted(arg0[:k])), (${tc.expected_k}, sorted(${serializeVal(tc.expected, 'python')})), ${JSON.stringify(label)})\n`;
    }
  });

  code += `print(f"{_pass}/{_total} tests passed")`;
  return code;
}

function buildJSRunner(funcName: string, type: string, testCases: any[]): string {
  let code = `let _pass = 0, _total = 0;\n`;
  if (type === 'normal') {
    code += `function _t(r, e) { _total++; if (JSON.stringify(r) === JSON.stringify(e)) _pass++; }\n\n`;
  } else if (type === '3sum' || type === '4sum') {
    code += `function _t_unordered(r, e) {
  _total++;
  const s = arr => (arr || []).map(x => [...x].sort((a,b)=>a-b)).sort((a,b)=>a.join(',').localeCompare(b.join(',')));
  if (JSON.stringify(s(r)) === JSON.stringify(s(e))) _pass++;
}\n\n`;
  } else if (type === 'any_of') {
    code += `function _t_any(r, options) { _total++; if (options.includes(r)) _pass++; }\n\n`;
  } else {
    code += `function _t(r, e) { _total++; if (JSON.stringify(r) === JSON.stringify(e)) _pass++; }\n\n`;
  }

  testCases.forEach((tc, idx) => {
    if (type === 'normal') {
      const argsStr = tc.inputs.map(x => serializeVal(x, 'javascript')).join(', ');
      code += `_t(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'javascript')});\n`;
    } else if (type === '3sum' || type === '4sum') {
      const argsStr = tc.inputs.map(x => serializeVal(x, 'javascript')).join(', ');
      code += `_t_unordered(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'javascript')});\n`;
    } else if (type === 'any_of') {
      const argsStr = tc.inputs.map(x => serializeVal(x, 'javascript')).join(', ');
      code += `_t_any(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'javascript')});\n`;
    } else if (type === 'inplace') {
      const argsStr = tc.inputs.map((x, i) => i === 0 ? 'arg0' : serializeVal(x, 'javascript')).join(', ');
      code += `const arg0_${idx} = ${serializeVal(tc.inputs[0], 'javascript')};\n`;
      code += `${funcName}(arg0_${idx}${tc.inputs.length > 1 ? ', ' + tc.inputs.slice(1).map(x => serializeVal(x, 'javascript')).join(', ') : ''});\n`;
      code += `_t(arg0_${idx}, ${serializeVal(tc.expected, 'javascript')});\n`;
    } else if (type === 'inplace_k') {
      const argsStr = tc.inputs.map((x, i) => i === 0 ? 'arg0' : serializeVal(x, 'javascript')).join(', ');
      code += `const arg0_${idx} = ${serializeVal(tc.inputs[0], 'javascript')};\n`;
      code += `const k_${idx} = ${funcName}(arg0_${idx}${tc.inputs.length > 1 ? ', ' + tc.inputs.slice(1).map(x => serializeVal(x, 'javascript')).join(', ') : ''});\n`;
      code += `_t([k_${idx}, arg0_${idx}.slice(0, k_${idx})], [${tc.expected_k}, ${serializeVal(tc.expected, 'javascript')}]);\n`;
    } else if (type === 'inplace_k_unordered') {
      const argsStr = tc.inputs.map((x, i) => i === 0 ? 'arg0' : serializeVal(x, 'javascript')).join(', ');
      code += `const arg0_${idx} = ${serializeVal(tc.inputs[0], 'javascript')};\n`;
      code += `const k_${idx} = ${funcName}(arg0_${idx}${tc.inputs.length > 1 ? ', ' + tc.inputs.slice(1).map(x => serializeVal(x, 'javascript')).join(', ') : ''});\n`;
      code += `_t([k_${idx}, [...arg0_${idx}].slice(0, k_${idx}).sort((a,b)=>a-b)], [${tc.expected_k}, ${serializeVal(tc.expected, 'javascript')}.sort((a,b)=>a-b)]);\n`;
    }
  });

  code += `console.log(\`\${_pass}/\${_total} tests passed\`);`;
  return code;
}

function buildTSRunner(funcName: string, type: string, testCases: any[]): string {
  let code = `let _pass = 0, _total = 0;\n`;
  if (type === 'normal') {
    code += `function _t(r: any, e: any): void { _total++; if (JSON.stringify(r) === JSON.stringify(e)) _pass++; }\n\n`;
  } else if (type === '3sum' || type === '4sum') {
    code += `function _t_unordered(r: any[][], e: any[][]): void {
  _total++;
  const s = (arr: any[][]) => (arr || []).map(x => [...x].sort((a,b)=>a-b)).sort((a,b)=>a.join(',').localeCompare(b.join(',')));
  if (JSON.stringify(s(r)) === JSON.stringify(s(e))) _pass++;
}\n\n`;
  } else if (type === 'any_of') {
    code += `function _t_any(r: any, options: any[]): void { _total++; if (options.includes(r)) _pass++; }\n\n`;
  } else {
    code += `function _t(r: any, e: any): void { _total++; if (JSON.stringify(r) === JSON.stringify(e)) _pass++; }\n\n`;
  }

  testCases.forEach((tc, idx) => {
    if (type === 'normal') {
      const argsStr = tc.inputs.map(x => serializeVal(x, 'typescript')).join(', ');
      code += `_t(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'typescript')});\n`;
    } else if (type === '3sum' || type === '4sum') {
      const argsStr = tc.inputs.map(x => serializeVal(x, 'typescript')).join(', ');
      code += `_t_unordered(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'typescript')});\n`;
    } else if (type === 'any_of') {
      const argsStr = tc.inputs.map(x => serializeVal(x, 'typescript')).join(', ');
      code += `_t_any(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'typescript')});\n`;
    } else if (type === 'inplace') {
      const argsStr = tc.inputs.map((x, i) => i === 0 ? 'arg0' : serializeVal(x, 'typescript')).join(', ');
      code += `const arg0_${idx} = ${serializeVal(tc.inputs[0], 'typescript')};\n`;
      code += `${funcName}(arg0_${idx}${tc.inputs.length > 1 ? ', ' + tc.inputs.slice(1).map(x => serializeVal(x, 'typescript')).join(', ') : ''});\n`;
      code += `_t(arg0_${idx}, ${serializeVal(tc.expected, 'typescript')});\n`;
    } else if (type === 'inplace_k') {
      const argsStr = tc.inputs.map((x, i) => i === 0 ? 'arg0' : serializeVal(x, 'typescript')).join(', ');
      code += `const arg0_${idx} = ${serializeVal(tc.inputs[0], 'typescript')};\n`;
      code += `const k_${idx} = ${funcName}(arg0_${idx}${tc.inputs.length > 1 ? ', ' + tc.inputs.slice(1).map(x => serializeVal(x, 'typescript')).join(', ') : ''});\n`;
      code += `_t([k_${idx}, arg0_${idx}.slice(0, k_${idx})], [${tc.expected_k}, ${serializeVal(tc.expected, 'typescript')}]);\n`;
    } else if (type === 'inplace_k_unordered') {
      const argsStr = tc.inputs.map((x, i) => i === 0 ? 'arg0' : serializeVal(x, 'typescript')).join(', ');
      code += `const arg0_${idx} = ${serializeVal(tc.inputs[0], 'typescript')};\n`;
      code += `const k_${idx} = ${funcName}(arg0_${idx}${tc.inputs.length > 1 ? ', ' + tc.inputs.slice(1).map(x => serializeVal(x, 'typescript')).join(', ') : ''});\n`;
      code += `_t([k_${idx}, [...arg0_${idx}].slice(0, k_${idx}).sort((a,b)=>a-b)], [${tc.expected_k}, ${serializeVal(tc.expected, 'typescript')}.sort((a,b)=>a-b)]);\n`;
    }
  });

  code += `console.log(\`\${_pass}/\${_total} tests passed\`);`;
  return code;
}

function buildKotlinRunner(funcName: string, type: string, testCases: any[], inputTypes?: string[]): string {
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

  if (type === '3sum' || type === '4sum') {
    code += `fun _t_unordered(r: List<List<Int>>, e: List<List<Int>>) {
    _total++
    val rSorted = r.map { it.sorted() }.sortedWith(compareBy { it.joinToString(",") })
    val eSorted = e.map { it.sorted() }.sortedWith(compareBy { it.joinToString(",") })
    if (rSorted == eSorted) _pass++
}\n`;
  }
  if (type === 'any_of') {
    code += `fun _t_any(r: Any?, options: List<Any?>) {
    _total++
    if (options.contains(r)) _pass++
}\n`;
  }

  testCases.forEach((tc, idx) => {
    const firstArgType = inputTypes && inputTypes[0];
    
    if (type === 'normal') {
      const argsStr = tc.inputs.map((x, i) => serializeVal(x, 'kotlin', inputTypes ? inputTypes[i] : undefined)).join(', ');
      code += `_t(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'kotlin')})\n`;
    } else if (type === '3sum' || type === '4sum') {
      const argsStr = tc.inputs.map((x, i) => serializeVal(x, 'kotlin', inputTypes ? inputTypes[i] : undefined)).join(', ');
      code += `_t_unordered(${funcName}(${argsStr}), ${serializeVal(tc.expected, 'kotlin')})\n`;
    } else if (type === 'any_of') {
      const argsStr = tc.inputs.map((x, i) => serializeVal(x, 'kotlin', inputTypes ? inputTypes[i] : undefined)).join(', ');
      code += `_t_any(${funcName}(${argsStr}), listOf(${tc.expected.map((ex: any) => serializeVal(ex, 'kotlin')).join(', ')}))\n`;
    } else if (type === 'inplace') {
      const argsStr = tc.inputs.map((x, i) => i === 0 ? `arg0_${idx}` : serializeVal(x, 'kotlin', inputTypes ? inputTypes[i] : undefined)).join(', ');
      code += `val arg0_${idx} = ${serializeVal(tc.inputs[0], 'kotlin', firstArgType)}\n`;
      code += `${funcName}(arg0_${idx}${tc.inputs.length > 1 ? ', ' + tc.inputs.slice(1).map((x, i) => serializeVal(x, 'kotlin', inputTypes ? inputTypes[i + 1] : undefined)).join(', ') : ''})\n`;
      code += `_t(arg0_${idx}, ${serializeVal(tc.expected, 'kotlin', firstArgType)})\n`;
    } else if (type === 'inplace_k') {
      const argsStr = tc.inputs.map((x, i) => i === 0 ? `arg0_${idx}` : serializeVal(x, 'kotlin', inputTypes ? inputTypes[i] : undefined)).join(', ');
      code += `val arg0_${idx} = ${serializeVal(tc.inputs[0], 'kotlin', firstArgType)}\n`;
      code += `val k_${idx} = ${funcName}(arg0_${idx}${tc.inputs.length > 1 ? ', ' + tc.inputs.slice(1).map((x, i) => serializeVal(x, 'kotlin', inputTypes ? inputTypes[i + 1] : undefined)).join(', ') : ''})\n`;
      code += `_t(listOf(k_${idx}, arg0_${idx}.slice(0 until k_${idx})), listOf(${tc.expected_k}, listOf(${tc.expected.join(',')}))) \n`;
    } else if (type === 'inplace_k_unordered') {
      const argsStr = tc.inputs.map((x, i) => i === 0 ? `arg0_${idx}` : serializeVal(x, 'kotlin', inputTypes ? inputTypes[i] : undefined)).join(', ');
      code += `val arg0_${idx} = ${serializeVal(tc.inputs[0], 'kotlin', firstArgType)}\n`;
      code += `val k_${idx} = ${funcName}(arg0_${idx}${tc.inputs.length > 1 ? ', ' + tc.inputs.slice(1).map((x, i) => serializeVal(x, 'kotlin', inputTypes ? inputTypes[i + 1] : undefined)).join(', ') : ''})\n`;
      code += `_t(listOf(k_${idx}, arg0_${idx}.slice(0 until k_${idx}).sorted()), listOf(${tc.expected_k}, listOf(${tc.expected.join(',')}).sorted())) \n`;
    }
  });

  code += `println("\$_pass/\$_total tests passed")\n}`;
  return code;
}

// ---------------------------------------------------------------------------
// HELPER FOR COMMON TEST CASES
// ---------------------------------------------------------------------------

// A small list of helper arrays / values to quickly fill the 30 required tests for various problems.
// We make sure the test cases represent realistic inputs.

const PALINDROMES_TEST_CASES = [
  { inputs: ["A man, a plan, a canal: Panama"], expected: true, label: "standard phrase" },
  { inputs: ["race a car"], expected: false, label: "non-palindrome phrase" },
  { inputs: [" "], expected: true, label: "single space" },
  { inputs: [""], expected: true, label: "empty string" },
  { inputs: ["a"], expected: true, label: "single char" },
  { inputs: ["ab"], expected: false, label: "two diff chars" },
  { inputs: ["aba"], expected: true, label: "three char palindrome" },
  { inputs: ["0P"], expected: false, label: "alpha-numeric mismatch" },
  { inputs: ["ab_a"], expected: true, label: "special characters ignored" },
  { inputs: ["Was it a car or a cat I saw?"], expected: true, label: "question phrase" },
  { inputs: ["No lemon, no melon"], expected: true, label: "comma phrase" },
  { inputs: ["tab a cat"], expected: true, label: "simple phrase" },
  { inputs: ["racecar"], expected: true, label: "pure word" },
  { inputs: ["hello"], expected: false, label: "pure word negative" },
  { inputs: ["A"], expected: true, label: "uppercase single" },
  { inputs: ["1a1"], expected: true, label: "numbers palindrome" },
  { inputs: ["1a2"], expected: false, label: "numbers mismatch" },
  { inputs: ["Madam, In Eden, I'm Adam"], expected: true, label: "longer phrase" },
  { inputs: ["Never odd or even"], expected: true, label: "classic 1" },
  { inputs: ["Red rum, sir, is murder"], expected: true, label: "classic 2" },
  { inputs: ["Eva, can I see bees in a cave?"], expected: true, label: "classic 3" },
  { inputs: ["Step on no pets"], expected: true, label: "classic 4" },
  { inputs: ["Top spot"], expected: true, label: "classic 5" },
  { inputs: ["My gym"], expected: true, label: "classic 6" },
  { inputs: ["Don't nod"], expected: true, label: "classic 7" },
  { inputs: ["I did, did I?"], expected: true, label: "classic 8" },
  { inputs: ["Live on time, emit no evil"], expected: true, label: "classic 9" },
  { inputs: ["Borrow or rob?"], expected: true, label: "classic 10" },
  { inputs: ["Amor, Roma"], expected: true, label: "classic 11" },
  { inputs: ["No 'x' in Nixon"], expected: true, label: "classic 12" },
];

const WATER_TEST_CASES = [
  { inputs: [[1,8,6,2,5,4,8,3,7]], expected: 49 },
  { inputs: [[1,1]], expected: 1 },
  { inputs: [[4,3,2,1,4]], expected: 16 },
  { inputs: [[1,2,1]], expected: 2 },
  { inputs: [[2,3,4,5,18,17,6]], expected: 17 },
  { inputs: [[1,8,100,2,100,4,8,3,7]], expected: 200 },
  { inputs: [[3, 1, 2, 4, 5]], expected: 12 },
  { inputs: [[10, 9, 8, 7, 6, 5, 4, 3, 2, 1]], expected: 25 },
  { inputs: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], expected: 25 },
  { inputs: [[1, 2, 1, 2, 1, 2, 1, 2]], expected: 12 },
  { inputs: [[5, 5, 5, 5, 5]], expected: 20 },
  { inputs: [[12, 5, 3, 15, 6, 8, 9]], expected: 54 },
  { inputs: [[3, 9, 3, 4, 7, 2, 12, 6]], expected: 45 },
  { inputs: [[7, 4, 9, 2, 15, 1, 8]], expected: 42 },
  { inputs: [[10, 1000, 1000, 10]], expected: 1000 },
  { inputs: [[2, 3, 10, 5, 7, 8, 9]], expected: 36 },
  { inputs: [[1, 3, 2, 5, 25, 24, 5]], expected: 24 },
  { inputs: [[4, 4, 2, 11, 0, 11, 5, 11]], expected: 44 },
  { inputs: [[2, 1, 5, 6, 2, 3]], expected: 10 },
  { inputs: [[9, 6, 5, 8, 2, 1, 3, 7]], expected: 49 },
  { inputs: [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1]], expected: 9 },
  { inputs: [[2, 4, 6, 8, 10, 12, 14, 16]], expected: 32 },
  { inputs: [[16, 14, 12, 10, 8, 6, 4, 2]], expected: 32 },
  { inputs: [[1, 10, 1, 10, 1]], expected: 20 },
  { inputs: [[5, 10, 15, 20, 25]], expected: 30 },
  { inputs: [[25, 20, 15, 10, 5]], expected: 30 },
  { inputs: [[100, 1, 100]], expected: 200 },
  { inputs: [[50, 10, 50, 10, 50]], expected: 200 },
  { inputs: [[1, 2, 4, 8, 16]], expected: 16 },
  { inputs: [[16, 8, 4, 2, 1]], expected: 16 }
];

const TWO_SUM_TEST_CASES = [
  { inputs: [[2,7,11,15], 9], expected: [1,2] },
  { inputs: [[2,3,4], 6], expected: [1,3] },
  { inputs: [[-1,0], -1], expected: [1,2] },
  { inputs: [[1,2,3,4,4,9,56,90], 8], expected: [4,5] },
  { inputs: [[1,2,7,9,11,15], 9], expected: [2,3] },
  { inputs: [[3,24,50,79,88,150], 200], expected: [3,6] },
  { inputs: [[5,25,75], 100], expected: [2,3] },
  { inputs: [[-10,-8,-5,-3,0,2,4,7], -1], expected: [4,6] },
  { inputs: [[-5,-3,1,10], -2], expected: [1,3] },
  { inputs: [[1,2,3,4,5,6,7,8,9,10], 19], expected: [9,10] },
  { inputs: [[1,2,3,4,5,6,7,8,9,10], 3], expected: [1,2] },
  { inputs: [[-100, -50, 0, 50, 100], 0], expected: [2,4] },
  { inputs: [[2, 7, 11, 15], 18], expected: [2,3] },
  { inputs: [[1, 10, 100, 1000], 11], expected: [1,2] },
  { inputs: [[1, 10, 100, 1000], 110], expected: [2,3] },
  { inputs: [[1, 10, 100, 1000], 1100], expected: [3,4] },
  { inputs: [[1, 10, 100, 1000], 1001], expected: [1,4] },
  { inputs: [[0, 0, 3, 4], 0], expected: [1,2] },
  { inputs: [[5, 7, 9, 11], 16], expected: [2,4] },
  { inputs: [[-20, -10, -5, -4, -2], -6], expected: [4,5] },
  { inputs: [[1, 3, 5, 7, 9], 10], expected: [1,5] },
  { inputs: [[1, 3, 5, 7, 9], 12], expected: [2,5] },
  { inputs: [[1, 3, 5, 7, 9], 14], expected: [3,5] },
  { inputs: [[1, 3, 5, 7, 9], 8], expected: [2,3] },
  { inputs: [[2, 4, 6, 8, 10], 12], expected: [2,5] },
  { inputs: [[2, 4, 6, 8, 10], 14], expected: [3,5] },
  { inputs: [[2, 4, 6, 8, 10], 16], expected: [4,5] },
  { inputs: [[1, 2, 3, 4, 5, 6], 11], expected: [5,6] },
  { inputs: [[10, 20, 30, 40, 50], 70], expected: [3,5] },
  { inputs: [[-50, -40, -30, -20, -10], -70], expected: [2,3] }
];

// ---------------------------------------------------------------------------
// 30 TWO POINTERS PROBLEMS DEFINITIONS
// ---------------------------------------------------------------------------

const PROBLEMS_DATA: Array<{
  slug: string;
  type: string;
  functionName: Record<string, string>;
  inputTypes?: string[];
  stubs: Record<string, string>;
  testCases: any[];
}> = [
  {
    slug: 'valid-palindrome',
    type: 'normal',
    functionName: { python: 'is_palindrome', javascript: 'isPalindrome', typescript: 'isPalindrome', kotlin: 'isPalindrome' },
    stubs: {
      python: `def is_palindrome(s: str) -> bool:\n    pass`,
      javascript: `function isPalindrome(s) {\n\n}`,
      typescript: `function isPalindrome(s: string): boolean {\n\n}`,
      kotlin: `fun isPalindrome(s: String): Boolean {\n    return false\n}`
    },
    testCases: PALINDROMES_TEST_CASES
  },
  {
    slug: 'container-with-most-water',
    type: 'normal',
    functionName: { python: 'max_area', javascript: 'maxArea', typescript: 'maxArea', kotlin: 'maxArea' },
    stubs: {
      python: `def max_area(height: list) -> int:\n    pass`,
      javascript: `function maxArea(height) {\n\n}`,
      typescript: `function maxArea(height: number[]): number {\n\n}`,
      kotlin: `fun maxArea(height: IntArray): Int {\n    return 0\n}`
    },
    testCases: WATER_TEST_CASES
  },
  {
    slug: 'two-sum-ii-input-array-is-sorted',
    type: 'normal',
    functionName: { python: 'two_sum', javascript: 'twoSum', typescript: 'twoSum', kotlin: 'twoSum' },
    stubs: {
      python: `def two_sum(numbers: list, target: int) -> list:\n    pass`,
      javascript: `function twoSum(numbers, target) {\n\n}`,
      typescript: `function twoSum(numbers: number[], target: number): number[] {\n\n}`,
      kotlin: `fun twoSum(numbers: IntArray, target: Int): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: TWO_SUM_TEST_CASES
  },
  {
    slug: 'remove-duplicates-from-sorted-array',
    type: 'inplace_k',
    functionName: { python: 'remove_duplicates', javascript: 'removeDuplicates', typescript: 'removeDuplicates', kotlin: 'removeDuplicates' },
    stubs: {
      python: `def remove_duplicates(nums: list) -> int:\n    pass`,
      javascript: `function removeDuplicates(nums) {\n\n}`,
      typescript: `function removeDuplicates(nums: number[]): number {\n\n}`,
      kotlin: `fun removeDuplicates(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { inputs: [[1,1,2]], expected_k: 2, expected: [1,2] },
        { inputs: [[0,0,1,1,1,2,2,3,3,4]], expected_k: 5, expected: [0,1,2,3,4] },
        { inputs: [[1]], expected_k: 1, expected: [1] },
        { inputs: [[1,2,3]], expected_k: 3, expected: [1,2,3] },
        { inputs: [[1,1,1,1,1]], expected_k: 1, expected: [1] },
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 10;
      const inputs = [tc.inputs[0].map(x => x + offset)];
      const expected = tc.expected.map(x => x + offset);
      return { inputs, expected_k: tc.expected_k, expected, label: `test_${i}` };
    })
  },
  {
    slug: 'move-zeroes',
    type: 'inplace',
    functionName: { python: 'move_zeroes', javascript: 'moveZeroes', typescript: 'moveZeroes', kotlin: 'moveZeroes' },
    stubs: {
      python: `def move_zeroes(nums: list) -> None:\n    pass`,
      javascript: `function moveZeroes(nums) {\n\n}`,
      typescript: `function moveZeroes(nums: number[]): void {\n\n}`,
      kotlin: `fun moveZeroes(nums: IntArray): Unit {\n\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { inputs: [[0,1,0,3,12]], expected: [1,3,12,0,0] },
        { inputs: [[0]], expected: [0] },
        { inputs: [[1,2,3]], expected: [1,2,3] },
        { inputs: [[0,0,0]], expected: [0,0,0] },
        { inputs: [[4,2,4,0,0,3,0,5,1,0]], expected: [4,2,4,3,5,1,0,0,0,0] },
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 10;
      const inputs = [tc.inputs[0].map(x => x === 0 ? 0 : x + offset)];
      const expected = tc.expected.map(x => x === 0 ? 0 : x + offset);
      return { inputs, expected, label: `test_${i}` };
    })
  },
  {
    slug: 'reverse-string',
    type: 'inplace',
    functionName: { python: 'reverse_string', javascript: 'reverseString', typescript: 'reverseString', kotlin: 'reverseString' },
    inputTypes: ['char_array'],
    stubs: {
      python: `def reverse_string(s: list) -> None:\n    pass`,
      javascript: `function reverseString(s) {\n\n}`,
      typescript: `function reverseString(s: string[]): void {\n\n}`,
      kotlin: `fun reverseString(s: CharArray): Unit {\n\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const words = [
        "hello", "Hannah", "a", "ab", "abc", "step", "noon", "radar", "palindromic", "two_pointers",
        "reverse", "inplace", "kotlin", "python", "typescript", "javascript", "leetcode", "developer", "genius",
        "openai", "google", "deepmind", "antigravity", "agent", "coding", "stubs", "runners", "algorithm", "problems", "batch"
      ];
      const s = words[i].split('');
      const expected = [...s].reverse();
      return { inputs: [s], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'squares-of-a-sorted-array',
    type: 'normal',
    functionName: { python: 'sorted_squares', javascript: 'sortedSquares', typescript: 'sortedSquares', kotlin: 'sortedSquares' },
    stubs: {
      python: `def sorted_squares(nums: list) -> list:\n    pass`,
      javascript: `function sortedSquares(nums) {\n\n}`,
      typescript: `function sortedSquares(nums: number[]): number[] {\n\n}`,
      kotlin: `fun sortedSquares(nums: IntArray): IntArray {\n    return intArrayOf()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { inputs: [[-4,-1,0,3,10]], expected: [0,1,9,16,100] },
        { inputs: [[-7,-3,2,3,11]], expected: [4,9,9,49,121] },
        { inputs: [[-5,-4,-3,-2,-1]], expected: [1,4,9,16,25] },
        { inputs: [[1,2,3,4,5]], expected: [1,4,9,16,25] },
        { inputs: [[0]], expected: [0] },
      ];
      const tc = base[i % base.length];
      const multiplier = Math.floor(i / base.length) + 1;
      const inputs = [tc.inputs[0].map(x => x * multiplier)];
      const expected = tc.expected.map(x => x * multiplier * multiplier).sort((a,b)=>a-b);
      return { inputs, expected, label: `test_${i}` };
    })
  },
  {
    slug: 'is-subsequence',
    type: 'normal',
    functionName: { python: 'is_subsequence', javascript: 'isSubsequence', typescript: 'isSubsequence', kotlin: 'isSubsequence' },
    stubs: {
      python: `def is_subsequence(s: str, t: str) -> bool:\n    pass`,
      javascript: `function isSubsequence(s, t) {\n\n}`,
      typescript: `function isSubsequence(s: string, t: string): boolean {\n\n}`,
      kotlin: `fun isSubsequence(s: String, t: String): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const cases = [
        { s: "abc", t: "ahbgdc", expected: true },
        { s: "axc", t: "ahbgdc", expected: false },
        { s: "", t: "ahbgdc", expected: true },
        { s: "a", t: "b", expected: false },
        { s: "g", t: "g", expected: true },
        { s: "sing", t: "string", expected: true },
        { s: "code", t: "coder", expected: true },
        { s: "runner", t: "run", expected: false },
      ];
      const base = cases[i % cases.length];
      // modify strings slightly to create unique tests
      const suffix = Math.floor(i / cases.length).toString();
      const s = base.s ? base.s + suffix : "";
      const t = base.t + suffix;
      return { inputs: [s, t], expected: base.expected, label: `test_${i}` };
    })
  },
  {
    slug: 'merge-sorted-array',
    type: 'inplace',
    functionName: { python: 'merge', javascript: 'merge', typescript: 'merge', kotlin: 'merge' },
    stubs: {
      python: `def merge(nums1: list, m: int, nums2: list, n: int) -> None:\n    pass`,
      javascript: `function merge(nums1, m, nums2, n) {\n\n}`,
      typescript: `function merge(nums1: number[], m: number, nums2: number[], n: number): void {\n\n}`,
      kotlin: `fun merge(nums1: IntArray, m: Int, nums2: IntArray, n: Int): Unit {\n\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums1: [1,2,3,0,0,0], m: 3, nums2: [2,5,6], n: 3, expected: [1,2,2,3,5,6] },
        { nums1: [1], m: 1, nums2: [], n: 0, expected: [1] },
        { nums1: [0], m: 0, nums2: [1], n: 1, expected: [1] },
        { nums1: [4,5,6,0,0,0], m: 3, nums2: [1,2,3], n: 3, expected: [1,2,3,4,5,6] },
        { nums1: [2,0], m: 1, nums2: [1], n: 1, expected: [1,2] },
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 10;
      const nums1 = tc.nums1.map((x, idx) => idx < tc.m ? x + offset : 0);
      const nums2 = tc.nums2.map(x => x + offset);
      const expected = tc.expected.map(x => x + offset);
      return { inputs: [nums1, tc.m, nums2, tc.n], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'remove-element',
    type: 'inplace_k_unordered',
    functionName: { python: 'remove_element', javascript: 'removeElement', typescript: 'removeElement', kotlin: 'removeElement' },
    stubs: {
      python: `def remove_element(nums: list, val: int) -> int:\n    pass`,
      javascript: `function removeElement(nums, val) {\n\n}`,
      typescript: `function removeElement(nums: number[], val: number): number {\n\n}`,
      kotlin: `fun removeElement(nums: IntArray, \`val\`: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [3,2,2,3], val: 3, expected_k: 2, expected: [2,2] },
        { nums: [0,1,2,2,3,0,4,2], val: 2, expected_k: 5, expected: [0,1,3,0,4] },
        { nums: [1], val: 1, expected_k: 0, expected: [] },
        { nums: [1], val: 2, expected_k: 1, expected: [1] },
        { nums: [4,5], val: 4, expected_k: 1, expected: [5] },
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 10;
      const nums = tc.nums.map(x => x + offset);
      const val = tc.val + offset;
      const expected = tc.expected.map(x => x + offset);
      return { inputs: [nums, val], expected_k: tc.expected_k, expected, label: `test_${i}` };
    })
  },
  {
    slug: 'valid-palindrome-ii',
    type: 'normal',
    functionName: { python: 'valid_palindrome', javascript: 'validPalindrome', typescript: 'validPalindrome', kotlin: 'validPalindrome' },
    stubs: {
      python: `def valid_palindrome(s: str) -> bool:\n    pass`,
      javascript: `function validPalindrome(s) {\n\n}`,
      typescript: `function validPalindrome(s: string): boolean {\n\n}`,
      kotlin: `fun validPalindrome(s: String): Boolean {\n    return false\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const cases = [
        { s: "aba", expected: true },
        { s: "abca", expected: true },
        { s: "abc", expected: false },
        { s: "deee", expected: true },
        { s: "aydm", expected: false },
        { s: "tebbem", expected: true },
        { s: "cuucu", expected: true },
        { s: "lufful", expected: true },
      ];
      const base = cases[i % cases.length];
      const suffix = Math.floor(i / cases.length).toString();
      const s = base.s + suffix + (base.expected ? "" : "x");
      // Compute expected: we can check if deleting at most one character from (s) forms a palindrome
      const checkPal = (str: string) => str === str.split('').reverse().join('');
      let expected = false;
      for (let j = 0; j < s.length; j++) {
        const sub = s.slice(0, j) + s.slice(j + 1);
        if (checkPal(sub)) {
          expected = true;
          break;
        }
      }
      if (checkPal(s)) expected = true;
      return { inputs: [s], expected, label: `test_${i}` };
    })
  },
  {
    slug: '3sum',
    type: '3sum',
    functionName: { python: 'three_sum', javascript: 'threeSum', typescript: 'threeSum', kotlin: 'threeSum' },
    stubs: {
      python: `def three_sum(nums: list) -> list:\n    pass`,
      javascript: `function threeSum(nums) {\n\n}`,
      typescript: `function threeSum(nums: number[]): number[][] {\n\n}`,
      kotlin: `fun threeSum(nums: IntArray): List<List<Int>> {\n    return emptyList()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { inputs: [[-1,0,1,2,-1,-4]], expected: [[-1,-1,2],[-1,0,1]] },
        { inputs: [[0,1,1]], expected: [] },
        { inputs: [[0,0,0]], expected: [[0,0,0]] },
        { inputs: [[-2,0,1,1,2]], expected: [[-2,0,2],[-2,1,1]] },
        { inputs: [[-1, 1, 0]], expected: [[-1,0,1]] }
      ];
      const tc = base[i % base.length];
      const multiplier = Math.floor(i / base.length) + 1;
      const inputs = [tc.inputs[0].map(x => x * multiplier)];
      const expected = tc.expected.map(triplet => triplet.map(x => x * multiplier));
      return { inputs, expected, label: `test_${i}` };
    })
  },
  {
    slug: '3sum-closest',
    type: 'normal',
    functionName: { python: 'three_sum_closest', javascript: 'threeSumClosest', typescript: 'threeSumClosest', kotlin: 'threeSumClosest' },
    stubs: {
      python: `def three_sum_closest(nums: list, target: int) -> int:\n    pass`,
      javascript: `function threeSumClosest(nums, target) {\n\n}`,
      typescript: `function threeSumClosest(nums: number[], target: number): number {\n\n}`,
      kotlin: `fun threeSumClosest(nums: IntArray, target: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [-1,2,1,-4], target: 1, expected: 2 },
        { nums: [0,0,0], target: 1, expected: 0 },
        { nums: [1,1,1,0], target: 100, expected: 3 },
        { nums: [-1,2,1,-4], target: 2, expected: 2 },
        { nums: [1,2,4,8,16], target: 10, expected: 7 },
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 5;
      const nums = tc.nums.map(x => x + offset);
      const target = tc.target + offset * 3;
      // Recompute expected closest sum for simple test cases
      let expected = nums[0] + nums[1] + nums[2];
      let minDiff = Math.abs(expected - target);
      for (let a = 0; a < nums.length; a++) {
        for (let b = a + 1; b < nums.length; b++) {
          for (let c = b + 1; c < nums.length; c++) {
            const sum = nums[a] + nums[b] + nums[c];
            const diff = Math.abs(sum - target);
            if (diff < minDiff) {
              minDiff = diff;
              expected = sum;
            }
          }
        }
      }
      return { inputs: [nums, target], expected, label: `test_${i}` };
    })
  },
  {
    slug: '4sum',
    type: '4sum',
    functionName: { python: 'four_sum', javascript: 'fourSum', typescript: 'fourSum', kotlin: 'fourSum' },
    stubs: {
      python: `def four_sum(nums: list, target: int) -> list:\n    pass`,
      javascript: `function fourSum(nums, target) {\n\n}`,
      typescript: `function fourSum(nums: number[], target: number): number[][] {\n\n}`,
      kotlin: `fun fourSum(nums: IntArray, target: Int): List<List<Int>> {\n    return emptyList()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,0,-1,0,-2,2], target: 0, expected: [[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]] },
        { nums: [2,2,2,2,2], target: 8, expected: [[2,2,2,2]] },
        { nums: [0,0,0,0], target: 0, expected: [[0,0,0,0]] },
        { nums: [-3,-2,-1,0,0,1,2,3], target: 0, expected: [[-3,-2,2,3],[-3,-1,1,3],[-3,0,1,2],[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1],[-3,0,0,3]] },
        { nums: [1,2,3,4], target: 10, expected: [[1,2,3,4]] }
      ];
      const tc = base[i % base.length];
      const multiplier = Math.floor(i / base.length) + 1;
      const nums = tc.nums.map(x => x * multiplier);
      const target = tc.target * multiplier;
      const expected = tc.expected.map(quad => quad.map(x => x * multiplier));
      return { inputs: [nums, target], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'longest-palindromic-substring',
    type: 'any_of',
    functionName: { python: 'longest_palindrome', javascript: 'longestPalindrome', typescript: 'longestPalindrome', kotlin: 'longestPalindrome' },
    stubs: {
      python: `def longest_palindrome(s: str) -> str:\n    pass`,
      javascript: `function longestPalindrome(s) {\n\n}`,
      typescript: `function longestPalindrome(s: string): string {\n\n}`,
      kotlin: `fun longestPalindrome(s: String): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "babad", expected: ["bab", "aba"] },
        { s: "cbbd", expected: ["bb"] },
        { s: "a", expected: ["a"] },
        { s: "ac", expected: ["a", "c"] },
        { s: "racecar", expected: ["racecar"] },
        { s: "noon", expected: ["noon"] },
      ];
      const tc = base[i % base.length];
      const suffix = Math.floor(i / base.length).toString();
      const s = tc.s + suffix;
      // compute expected long palindrome for the simple appended string
      let maxLen = 0;
      const pals = new Set<string>();
      const checkPal = (str: string) => str === str.split('').reverse().join('');
      for (let start = 0; start < s.length; start++) {
        for (let end = start + 1; end <= s.length; end++) {
          const sub = s.slice(start, end);
          if (checkPal(sub)) {
            if (sub.length > maxLen) {
              maxLen = sub.length;
              pals.clear();
              pals.add(sub);
            } else if (sub.length === maxLen) {
              pals.add(sub);
            }
          }
        }
      }
      return { inputs: [s], expected: Array.from(pals), label: `test_${i}` };
    })
  },
  {
    slug: 'boats-to-save-people',
    type: 'normal',
    functionName: { python: 'num_rescue_boats', javascript: 'numRescueBoats', typescript: 'numRescueBoats', kotlin: 'numRescueBoats' },
    stubs: {
      python: `def num_rescue_boats(people: list, limit: int) -> int:\n    pass`,
      javascript: `function numRescueBoats(people, limit) {\n\n}`,
      typescript: `function numRescueBoats(people: number[], limit: number): number {\n\n}`,
      kotlin: `fun numRescueBoats(people: IntArray, limit: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { people: [1,2], limit: 3, expected: 1 },
        { people: [3,2,2,1], limit: 3, expected: 3 },
        { people: [3,5,3,4], limit: 5, expected: 4 },
        { people: [3,3,4,5], limit: 6, expected: 2 },
        { people: [5,1,4,2], limit: 6, expected: 2 },
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 2;
      const people = tc.people.map(x => x + offset);
      const limit = tc.limit + offset * 2;
      // compute greedy boats
      const sorted = [...people].sort((a,b) => a-b);
      let left = 0, right = sorted.length - 1;
      let expected = 0;
      while (left <= right) {
        if (sorted[left] + sorted[right] <= limit) {
          left++;
        }
        right--;
        expected++;
      }
      return { inputs: [people, limit], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'rotate-array',
    type: 'inplace',
    functionName: { python: 'rotate', javascript: 'rotate', typescript: 'rotate', kotlin: 'rotate' },
    stubs: {
      python: `def rotate(nums: list, k: int) -> None:\n    pass`,
      javascript: `function rotate(nums, k) {\n\n}`,
      typescript: `function rotate(nums: number[], k: number): void {\n\n}`,
      kotlin: `fun rotate(nums: IntArray, k: Int): Unit {\n\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,2,3,4,5,6,7], k: 3, expected: [5,6,7,1,2,3,4] },
        { nums: [-1,-100,3,99], k: 2, expected: [3,99,-1,-100] },
        { nums: [1,2], k: 3, expected: [2,1] },
        { nums: [1], k: 0, expected: [1] },
        { nums: [1,2,3,4], k: 4, expected: [1,2,3,4] },
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 10;
      const nums = tc.nums.map(x => x + offset);
      const k = tc.k;
      const expected = new Array(nums.length);
      for (let j = 0; j < nums.length; j++) {
        expected[(j + k) % nums.length] = nums[j];
      }
      return { inputs: [nums, k], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'remove-duplicates-from-sorted-array-ii',
    type: 'inplace_k',
    functionName: { python: 'remove_duplicates', javascript: 'removeDuplicates', typescript: 'removeDuplicates', kotlin: 'removeDuplicates' },
    stubs: {
      python: `def remove_duplicates(nums: list) -> int:\n    pass`,
      javascript: `function removeDuplicates(nums) {\n\n}`,
      typescript: `function removeDuplicates(nums: number[]): number {\n\n}`,
      kotlin: `fun removeDuplicates(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,1,1,2,2,3], expected_k: 5, expected: [1,1,2,2,3] },
        { nums: [0,0,1,1,1,1,2,3,3], expected_k: 7, expected: [0,0,1,1,2,3,3] },
        { nums: [1,1,1,1,1], expected_k: 2, expected: [1,1] },
        { nums: [1,2,3], expected_k: 3, expected: [1,2,3] },
        { nums: [1], expected_k: 1, expected: [1] }
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 10;
      const nums = tc.nums.map(x => x + offset);
      const expected = tc.expected.map(x => x + offset);
      return { inputs: [nums], expected_k: tc.expected_k, expected, label: `test_${i}` };
    })
  },
  {
    slug: 'number-of-subsequences-given-sum-condition',
    type: 'normal',
    functionName: { python: 'num_subseq', javascript: 'numSubseq', typescript: 'numSubseq', kotlin: 'numSubseq' },
    stubs: {
      python: `def num_subseq(nums: list, target: int) -> int:\n    pass`,
      javascript: `function numSubseq(nums, target) {\n\n}`,
      typescript: `function numSubseq(nums: number[], target: number): number {\n\n}`,
      kotlin: `fun numSubseq(nums: IntArray, target: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [3,5,6,7], target: 9, expected: 4 },
        { nums: [3,3,6,8], target: 10, expected: 6 },
        { inputs: [[2,3,3,4,6,7], 12], expected: 61 }
      ];
      // Generate some small inputs where we can compute directly
      const offset = Math.floor(i / 10);
      const nums = [2 + offset, 3 + offset, 4 + offset, 5 + offset, 7 + offset].sort((a,b)=>a-b);
      const target = 7 + offset * 2;
      // Recompute subsequences count
      let expected = 0;
      const n = nums.length;
      const MOD = 1000000007;
      let left = 0, right = n - 1;
      const pows = new Array(n + 1).fill(1);
      for (let j = 1; j <= n; j++) pows[j] = (pows[j - 1] * 2) % MOD;
      while (left <= right) {
        if (nums[left] + nums[right] <= target) {
          expected = (expected + pows[right - left]) % MOD;
          left++;
        } else {
          right--;
        }
      }
      return { inputs: [nums, target], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'partition-labels',
    type: 'normal',
    functionName: { python: 'partition_labels', javascript: 'partitionLabels', typescript: 'partitionLabels', kotlin: 'partitionLabels' },
    stubs: {
      python: `def partition_labels(s: str) -> list:\n    pass`,
      javascript: `function partitionLabels(s) {\n\n}`,
      typescript: `function partitionLabels(s: string): number[] {\n\n}`,
      kotlin: `fun partitionLabels(s: String): List<Int> {\n    return emptyList()\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "ababcbacadefegdehijhklij", expected: [9,7,8] },
        { s: "eccbbbbdec", expected: [10] },
        { s: "a", expected: [1] },
        { s: "ab", expected: [1,1] },
        { s: "abcab", expected: [5] },
      ];
      const tc = base[i % base.length];
      const suffix = Math.floor(i / base.length).toString();
      const s = tc.s + suffix;
      // Recompute partition labels
      const last: Record<string, number> = {};
      for (let j = 0; j < s.length; j++) last[s[j]] = j;
      const expected = [];
      let start = 0, end = 0;
      for (let j = 0; j < s.length; j++) {
        end = Math.max(end, last[s[j]]);
        if (j === end) {
          expected.push(end - start + 1);
          start = end + 1;
        }
      }
      return { inputs: [s], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'trapping-rain-water',
    type: 'normal',
    functionName: { python: 'trap', javascript: 'trap', typescript: 'trap', kotlin: 'trap' },
    stubs: {
      python: `def trap(height: list) -> int:\n    pass`,
      javascript: `function trap(height) {\n\n}`,
      typescript: `function trap(height: number[]): number {\n\n}`,
      kotlin: `fun trap(height: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { height: [0,1,0,2,1,0,1,3,2,1,2,1], expected: 6 },
        { height: [4,2,0,3,2,5], expected: 9 },
        { height: [3,0,2,0,4], expected: 7 },
        { height: [0,0,0], expected: 0 },
        { height: [1,2,3,4,5], expected: 0 },
      ];
      const tc = base[i % base.length];
      const scale = Math.floor(i / base.length) + 1;
      const height = tc.height.map(x => x * scale);
      const expected = tc.expected * scale;
      return { inputs: [height], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'minimum-window-substring',
    type: 'normal',
    functionName: { python: 'min_window', javascript: 'minWindow', typescript: 'minWindow', kotlin: 'minWindow' },
    stubs: {
      python: `def min_window(s: str, t: str) -> str:\n    pass`,
      javascript: `function minWindow(s, t) {\n\n}`,
      typescript: `function minWindow(s: string, t: string): string {\n\n}`,
      kotlin: `fun minWindow(s: String, t: String): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s: "ADOBECODEBANC", t: "ABC", expected: "BANC" },
        { s: "a", t: "a", expected: "a" },
        { s: "a", t: "aa", expected: "" },
        { s: "aa", t: "a", expected: "a" },
        { s: "abefcd", t: "fd", expected: "fcd" },
      ];
      const tc = base[i % base.length];
      const suffix = Math.floor(i / base.length).toString();
      const s = tc.s + suffix;
      const t = tc.t;
      // Recompute expected: for simplicity we can just search for min window substring
      const tFreq: Record<string, number> = {};
      for (const char of t) tFreq[char] = (tFreq[char] || 0) + 1;
      let left = 0, right = 0;
      let required = Object.keys(tFreq).length;
      let formed = 0;
      const windowFreq: Record<string, number> = {};
      let minLen = Infinity;
      let ans = "";
      while (right < s.length) {
        const char = s[right];
        windowFreq[char] = (windowFreq[char] || 0) + 1;
        if (tFreq[char] && windowFreq[char] === tFreq[char]) formed++;
        while (left <= right && formed === required) {
          const size = right - left + 1;
          if (size < minLen) {
            minLen = size;
            ans = s.slice(left, right + 1);
          }
          const leftChar = s[left];
          windowFreq[leftChar]--;
          if (tFreq[leftChar] && windowFreq[leftChar] < tFreq[leftChar]) formed--;
          left++;
        }
        right++;
      }
      return { inputs: [s, t], expected: ans, label: `test_${i}` };
    })
  },
  {
    slug: 'subarrays-with-k-different-integers',
    type: 'normal',
    functionName: { python: 'subarrays_with_k_distinct', javascript: 'subarraysWithKDistinct', typescript: 'subarraysWithKDistinct', kotlin: 'subarraysWithKDistinct' },
    stubs: {
      python: `def subarrays_with_k_distinct(nums: list, k: int) -> int:\n    pass`,
      javascript: `function subarraysWithKDistinct(nums, k) {\n\n}`,
      typescript: `function subarraysWithKDistinct(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun subarraysWithKDistinct(nums: IntArray, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,2,1,2,3], k: 2, expected: 7 },
        { nums: [1,2,1,3,4], k: 3, expected: 3 },
        { nums: [1,1,1], k: 1, expected: 6 },
        { nums: [1,2,3], k: 1, expected: 3 },
        { nums: [1,2,3], k: 4, expected: 0 },
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 5;
      const nums = tc.nums.map(x => x + offset);
      const k = tc.k;
      // Recompute subarrays with exactly k distinct integers
      const solve = (arr: number[], distinct: number) => {
        const counts: Record<number, number> = {};
        let l = 0, r = 0, ans = 0;
        while (r < arr.length) {
          counts[arr[r]] = (counts[arr[r]] || 0) + 1;
          while (Object.keys(counts).length > distinct) {
            counts[arr[l]]--;
            if (counts[arr[l]] === 0) delete counts[arr[l]];
            l++;
          }
          ans += r - l + 1;
          r++;
        }
        return ans;
      };
      const expected = solve(nums, k) - solve(nums, k - 1);
      return { inputs: [nums, k], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'find-k-th-smallest-pair-distance',
    type: 'normal',
    functionName: { python: 'smallest_distance_pair', javascript: 'smallestDistancePair', typescript: 'smallestDistancePair', kotlin: 'smallestDistancePair' },
    stubs: {
      python: `def smallest_distance_pair(nums: list, k: int) -> int:\n    pass`,
      javascript: `function smallestDistancePair(nums, k) {\n\n}`,
      typescript: `function smallestDistancePair(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun smallestDistancePair(nums: IntArray, k: Int): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,3,1], k: 1, expected: 0 },
        { nums: [1,1,3,4,5], k: 3, expected: 1 },
        { nums: [1,6,1], k: 3, expected: 5 },
        { nums: [1,2,3], k: 2, expected: 1 },
        { nums: [10,30,50], k: 1, expected: 20 },
      ];
      const tc = base[i % base.length];
      const multiplier = Math.floor(i / base.length) + 1;
      const nums = tc.nums.map(x => x * multiplier);
      const k = tc.k;
      // Recompute the pair distances
      const dists: number[] = [];
      for (let a = 0; a < nums.length; a++) {
        for (let b = a + 1; b < nums.length; b++) {
          dists.push(Math.abs(nums[a] - nums[b]));
        }
      }
      dists.sort((a,b)=>a-b);
      const expected = dists[k - 1];
      return { inputs: [nums, k], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'count-subarrays-with-fixed-bounds',
    type: 'normal',
    functionName: { python: 'count_subarrays', javascript: 'countSubarrays', typescript: 'countSubarrays', kotlin: 'countSubarrays' },
    stubs: {
      python: `def count_subarrays(nums: list, min_k: int, max_k: int) -> int:\n    pass`,
      javascript: `function countSubarrays(nums, minK, maxK) {\n\n}`,
      typescript: `function countSubarrays(nums: number[], minK: number, maxK: number): number {\n\n}`,
      kotlin: `fun countSubarrays(nums: IntArray, minK: Int, maxK: Int): Long {\n    return 0L\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,3,5,2,7,5], minK: 1, maxK: 5, expected: 2 },
        { nums: [1,1,1,1], minK: 1, maxK: 1, expected: 10 },
        { nums: [2,4,3,5,1], minK: 2, maxK: 5, expected: 2 },
        { nums: [1,3,5], minK: 1, maxK: 5, expected: 1 },
        { nums: [1,2,3], minK: 4, maxK: 5, expected: 0 },
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 2;
      const nums = tc.nums.map(x => x + offset);
      const minK = tc.minK + offset;
      const maxK = tc.maxK + offset;
      // Recompute the subarrays
      let expected = 0;
      for (let start = 0; start < nums.length; start++) {
        let currentMin = Infinity;
        let currentMax = -Infinity;
        for (let end = start; end < nums.length; end++) {
          currentMin = Math.min(currentMin, nums[end]);
          currentMax = Math.max(currentMax, nums[end]);
          if (currentMin === minK && currentMax === maxK) {
            expected++;
          }
        }
      }
      return { inputs: [nums, minK, maxK], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'minimum-operations-to-make-array-continuous',
    type: 'normal',
    functionName: { python: 'min_operations', javascript: 'minOperations', typescript: 'minOperations', kotlin: 'minOperations' },
    stubs: {
      python: `def min_operations(nums: list) -> int:\n    pass`,
      javascript: `function minOperations(nums) {\n\n}`,
      typescript: `function minOperations(nums: number[]): number {\n\n}`,
      kotlin: `fun minOperations(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [4,2,5,3], expected: 0 },
        { nums: [1,2,3,5,6], expected: 1 },
        { nums: [1,10,100,1000], expected: 3 },
        { nums: [1,1,1,1], expected: 3 },
        { nums: [5,6,20,30], expected: 2 },
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length) * 10;
      const nums = tc.nums.map(x => x + offset);
      // Recompute expected operations
      const n = nums.length;
      const uniq = Array.from(new Set(nums)).sort((a,b)=>a-b);
      let minOps = n;
      let r = 0;
      for (let l = 0; l < uniq.length; l++) {
        while (r < uniq.length && uniq[r] < uniq[l] + n) {
          r++;
        }
        const count = r - l;
        minOps = Math.min(minOps, n - count);
      }
      return { inputs: [nums], expected: minOps, label: `test_${i}` };
    })
  },
  {
    slug: 'minimum-window-subsequence',
    type: 'normal',
    functionName: { python: 'min_window', javascript: 'minWindow', typescript: 'minWindow', kotlin: 'minWindow' },
    stubs: {
      python: `def min_window(s1: str, s2: str) -> str:\n    pass`,
      javascript: `function minWindow(s1, s2) {\n\n}`,
      typescript: `function minWindow(s1: string, s2: string): string {\n\n}`,
      kotlin: `fun minWindow(s1: String, s2: String): String {\n    return ""\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { s1: "abcdebdde", s2: "bde", expected: "bcde" },
        { s1: "jmeqksfrsdcmsiwvaovztaqenprpvnbstl", s2: "ims", expected: "msiwva" },
        { s1: "abc", s2: "d", expected: "" },
        { s1: "abc", s2: "abc", expected: "abc" },
        { s1: "abddc", s2: "ac", expected: "abddc" },
      ];
      const tc = base[i % base.length];
      const suffix = Math.floor(i / base.length).toString();
      const s1 = tc.s1 + suffix;
      const s2 = tc.s2;
      // Recompute expected minimum window subsequence
      let minLen = Infinity;
      let ans = "";
      let i1 = 0, i2 = 0;
      while (i1 < s1.length) {
        if (s1[i1] === s2[i2]) {
          i2++;
          if (i2 === s2.length) {
            let end = i1;
            i2--;
            while (i2 >= 0) {
              if (s1[i1] === s2[i2]) {
                i2--;
              }
              i1--;
            }
            i1++;
            const start = i1;
            const len = end - start + 1;
            if (len < minLen) {
              minLen = len;
              ans = s1.slice(start, end + 1);
            }
            i2 = 0;
            i1 = start;
          }
        }
        i1++;
      }
      return { inputs: [s1, s2], expected: ans, label: `test_${i}` };
    })
  },
  {
    slug: 'shortest-subarray-with-sum-at-least-k',
    type: 'normal',
    functionName: { python: 'shortest_subarray', javascript: 'shortestSubarray', typescript: 'shortestSubarray', kotlin: 'shortestSubarray' },
    stubs: {
      python: `def shortest_subarray(nums: list, k: int) -> int:\n    pass`,
      javascript: `function shortestSubarray(nums, k) {\n\n}`,
      typescript: `function shortestSubarray(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun shortestSubarray(nums: IntArray, k: Int): Int {\n    return -1\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1], k: 1, expected: 1 },
        { nums: [1,2], k: 4, expected: -1 },
        { nums: [2,-1,2], k: 3, expected: 3 },
        { nums: [84,-37,32,40,95], k: 167, expected: 3 },
        { nums: [1,2,3,4,5], k: 11, expected: 3 }
      ];
      const tc = base[i % base.length];
      const multiplier = Math.floor(i / base.length) + 1;
      const nums = tc.nums.map(x => x * multiplier);
      const k = tc.k * multiplier;
      // Recompute expected shortest subarray sum >= k
      let ans = Infinity;
      const prefix = [0];
      for (const num of nums) prefix.push(prefix[prefix.length - 1] + num);
      const dq: number[] = [];
      for (let j = 0; j < prefix.length; j++) {
        while (dq.length && prefix[j] - prefix[dq[0]] >= k) {
          ans = Math.min(ans, j - dq.shift()!);
        }
        while (dq.length && prefix[j] <= prefix[dq[dq.length - 1]]) {
          dq.pop();
        }
        dq.push(j);
      }
      const expected = ans === Infinity ? -1 : ans;
      return { inputs: [nums, k], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'reverse-pairs',
    type: 'normal',
    functionName: { python: 'reverse_pairs', javascript: 'reversePairs', typescript: 'reversePairs', kotlin: 'reversePairs' },
    stubs: {
      python: `def reverse_pairs(nums: list) -> int:\n    pass`,
      javascript: `function reversePairs(nums) {\n\n}`,
      typescript: `function reversePairs(nums: number[]): number {\n\n}`,
      kotlin: `fun reversePairs(nums: IntArray): Int {\n    return 0\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [1,3,2,3,1], expected: 2 },
        { nums: [2,4,3,5,1], expected: 3 },
        { nums: [5,4,3,2,1], expected: 4 },
        { nums: [1,2,3,4,5], expected: 0 },
        { nums: [10, 2, 5, 1], expected: 4 }
      ];
      const tc = base[i % base.length];
      const multiplier = Math.floor(i / base.length) + 1;
      const nums = tc.nums.map(x => x * multiplier);
      // Recompute expected reverse pairs count (nums[a] > 2 * nums[b] for a < b)
      let expected = 0;
      for (let a = 0; a < nums.length; a++) {
        for (let b = a + 1; b < nums.length; b++) {
          if (nums[a] > 2 * nums[b]) {
            expected++;
          }
        }
      }
      return { inputs: [nums], expected, label: `test_${i}` };
    })
  },
  {
    slug: 'count-subarrays-with-score-less-than-k',
    type: 'normal',
    functionName: { python: 'count_subarrays', javascript: 'countSubarrays', typescript: 'countSubarrays', kotlin: 'countSubarrays' },
    stubs: {
      python: `def count_subarrays(nums: list, k: int) -> int:\n    pass`,
      javascript: `function countSubarrays(nums, k) {\n\n}`,
      typescript: `function countSubarrays(nums: number[], k: number): number {\n\n}`,
      kotlin: `fun countSubarrays(nums: IntArray, k: Long): Long {\n    return 0L\n}`
    },
    testCases: Array.from({ length: 30 }, (_, i) => {
      const base = [
        { nums: [2,1,4,3,5], k: 10, expected: 6 },
        { nums: [1,1,1], k: 5, expected: 5 },
        { nums: [3,4,5], k: 20, expected: 4 },
        { nums: [1,2,3], k: 10, expected: 4 },
        { nums: [5], k: 5, expected: 0 }
      ];
      const tc = base[i % base.length];
      const offset = Math.floor(i / base.length);
      const nums = tc.nums.map(x => x + offset);
      const k = tc.k + offset * 10;
      // Recompute subarrays with score < k
      let expected = 0;
      let l = 0, sum = 0;
      for (let r = 0; r < nums.length; r++) {
        sum += nums[r];
        while (sum * (r - l + 1) >= k) {
          sum -= nums[l];
          l++;
        }
        expected += r - l + 1;
      }
      return { inputs: [nums, k], expected, label: `test_${i}` };
    })
  }
];

// ---------------------------------------------------------------------------
// DB SEED EXECUTION
// ---------------------------------------------------------------------------

async function seedTests() {
  console.log('Seeding stubs and test runners for 30 Two Pointer problems…\n');
  let updated = 0;

  for (const problem of PROBLEMS_DATA) {
    const dbProblem = await db.query.problems.findFirst({
      where: eq(problems.slug, problem.slug),
    });

    if (!dbProblem) {
      console.log(`  skip  ${problem.slug} (not in DB — run db:seed-batch1 first)`);
      continue;
    }

    // Build the dynamic runners
    const runners = {
      python: buildPythonRunner(problem.functionName.python, problem.type, problem.testCases),
      javascript: buildJSRunner(problem.functionName.javascript, problem.type, problem.testCases),
      typescript: buildTSRunner(problem.functionName.typescript, problem.type, problem.testCases),
      kotlin: buildKotlinRunner(problem.functionName.kotlin, problem.type, problem.testCases, problem.inputTypes)
    };

    await db
      .update(problems)
      .set({
        functionStub: problem.stubs.python,
        testRunner: runners.python.trim(),
        functionStubs: sql`${problem.stubs}::jsonb`,
        testRunners: sql`${runners}::jsonb`,
      })
      .where(eq(problems.id, dbProblem.id));

    console.log(`  ✓  [${dbProblem.difficulty}] ${problem.slug} (30 test cases seeded)`);
    updated++;
  }

  console.log(`\nDone. ${updated}/${PROBLEMS_DATA.length} problems updated.`);
  await client.end();
}

seedTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
