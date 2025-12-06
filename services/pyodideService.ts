import { ExecutionResult } from "../types";

let pyodideInstance: any = null;
let isLoading = false;

// Declare global pyodide loading function from script tag
declare global {
  interface Window {
    loadPyodide: (config: { indexURL: string }) => Promise<any>;
  }
}

export const initPyodide = async (): Promise<void> => {
  if (pyodideInstance || isLoading) return;
  
  isLoading = true;
  try {
    // Wait for the script tag to load if it hasn't yet
    if (!window.loadPyodide) {
        await new Promise<void>((resolve) => {
             const check = () => {
                 if (window.loadPyodide) resolve();
                 else setTimeout(check, 100);
             }
             check();
        });
    }

    pyodideInstance = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
    });
    console.log("Pyodide loaded");
  } catch (err) {
    console.error("Failed to load Pyodide", err);
  } finally {
    isLoading = false;
  }
};

export const runPythonCode = async (code: string): Promise<ExecutionResult> => {
  if (!pyodideInstance) {
    await initPyodide();
    if (!pyodideInstance) {
      return { output: "", error: "Python environment not ready. Please wait a moment and try again." };
    }
  }

  let stdoutOutput = "";
  let stderrOutput = "";

  try {
    console.log('[Pyodide] Running code, length:', code.length);
    console.log('[Pyodide] setStdout exists:', typeof pyodideInstance.setStdout);
    console.log('[Pyodide] setStderr exists:', typeof pyodideInstance.setStderr);
    
    // Use Pyodide's setStdout/setStderr to capture output
    // These methods intercept output at the Pyodide level
    // Note: Only one of 'raw', 'batched', or 'write' can be passed
    if (typeof pyodideInstance.setStdout === 'function') {
      pyodideInstance.setStdout({
        batched: (text: string) => {
          stdoutOutput += text;
        }
      });
    } else {
      console.warn('[Pyodide] setStdout is not available, using StringIO fallback');
      // Fallback to StringIO
      pyodideInstance.runPython(`
import sys
from io import StringIO
__stdout_capture__ = StringIO()
__stderr_capture__ = StringIO()
sys.stdout = __stdout_capture__
sys.stderr = __stderr_capture__
      `);
    }

    if (typeof pyodideInstance.setStderr === 'function') {
      pyodideInstance.setStderr({
        batched: (text: string) => {
          stderrOutput += text;
        }
      });
    } else {
      console.warn('[Pyodide] setStderr is not available');
    }
    
    // Run user code
    await pyodideInstance.loadPackagesFromImports(code);
    await pyodideInstance.runPythonAsync(code);

    // If using StringIO fallback, get output from buffers
    if (typeof pyodideInstance.setStdout !== 'function') {
      stdoutOutput = pyodideInstance.runPython("str(__stdout_capture__.getvalue())") || "";
      stderrOutput = pyodideInstance.runPython("str(__stderr_capture__.getvalue())") || "";
    } else {
      // Restore original handlers (or set to empty if no original)
      try {
        pyodideInstance.setStdout({ batched: () => {} });
        pyodideInstance.setStderr({ batched: () => {} });
      } catch (e) {
        console.warn('[Pyodide] Error restoring handlers:', e);
      }
    }

    console.log('[Pyodide] stdout length:', stdoutOutput.length, 'content:', stdoutOutput.substring(0, 100));
    console.log('[Pyodide] stderr length:', stderrOutput.length);

    return {
      output: stdoutOutput || "",
      error: stderrOutput || undefined
    };

  } catch (err: any) {
    console.error('[Pyodide] Error executing code:', err);
    
    // Restore handlers on error
    try {
      pyodideInstance.setStdout({ batched: () => {} });
      pyodideInstance.setStderr({ batched: () => {} });
    } catch (e) {
      // Ignore restore errors
    }
    
    return {
      output: stdoutOutput || "",
      error: err.toString()
    };
  }
};

export const runPythonCodeWithTests = async (
  code: string,
  testCases: Array<{ input: string; expectedOutput: string }>
): Promise<ExecutionResult> => {
  if (!pyodideInstance) {
    await initPyodide();
    if (!pyodideInstance) {
      return {
        output: "",
        error: "Python environment not ready. Please wait a moment and try again.",
        testResults: {
          passed: 0,
          total: testCases.length,
          cases: []
        }
      };
    }
  }

  let stdoutOutput = "";
  let stderrOutput = "";
  const testResults: ExecutionResult['testResults'] = {
    passed: 0,
    total: testCases.length,
    cases: []
  };

  try {
    console.log('[Pyodide] Running code with tests, code length:', code.length, 'test cases:', testCases.length);
    
    // Set up stdout/stderr capture
    if (typeof pyodideInstance.setStdout === 'function') {
      pyodideInstance.setStdout({
        batched: (text: string) => {
          stdoutOutput += text;
        }
      });
    } else {
      pyodideInstance.runPython(`
import sys
from io import StringIO
__stdout_capture__ = StringIO()
__stderr_capture__ = StringIO()
sys.stdout = __stdout_capture__
sys.stderr = __stderr_capture__
      `);
    }

    if (typeof pyodideInstance.setStderr === 'function') {
      pyodideInstance.setStderr({
        batched: (text: string) => {
          stderrOutput += text;
        }
      });
    }
    
    // Step 1: Execute user code first (to define the Solution class)
    await pyodideInstance.loadPackagesFromImports(code);
    await pyodideInstance.runPythonAsync(code);

    // Extract method name from Solution class (first method that's not __init__)
    const methodNameResult = pyodideInstance.runPython(`
import inspect
method_name = None
if 'Solution' in globals():
    solution_class = Solution
    methods = [name for name, method in inspect.getmembers(solution_class, predicate=inspect.isfunction) if not name.startswith('_')]
    if methods:
        method_name = methods[0]
    else:
        # Fallback: get all methods and find first non-dunder method
        all_methods = [name for name in dir(solution_class) if callable(getattr(solution_class, name)) and not name.startswith('__')]
        if all_methods:
            method_name = all_methods[0]
str(method_name) if method_name else "None"
    `);
    
    const methodName = methodNameResult && methodNameResult !== 'None' ? methodNameResult : 'solution';
    console.log(`[Pyodide] Detected method name: ${methodName}`);

    // Get any initial output
    if (typeof pyodideInstance.setStdout !== 'function') {
      stdoutOutput = pyodideInstance.runPython("str(__stdout_capture__.getvalue())") || "";
      stderrOutput = pyodideInstance.runPython("str(__stderr_capture__.getvalue())") || "";
    }

    // Step 2: Create solutionTest class dynamically with test methods
    // Parse test case inputs to extract arguments
    const testMethods: string[] = [];
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`[Pyodide] Test case ${i + 1}: input="${testCase.input}", expected="${testCase.expectedOutput}"`);
      
      // Extract arguments from test case input
      // Handle formats like: "s = \"value\"" or "nums = [1,2,3], target = 5"
      let methodArgs = "";
      if (testCase.input.includes('=')) {
        // Extract right-hand side of assignment(s)
        // Handle multiple assignments separated by commas
        const assignments = testCase.input.split(',').map(a => a.trim());
        const args: string[] = [];
        for (const assignment of assignments) {
          const match = assignment.match(/=\s*(.+)$/);
          if (match) {
            args.push(match[1].trim());
          }
        }
        methodArgs = args.join(', ');
      } else {
        // Might be direct arguments or a function call
        // If it's a function call, extract arguments
        const funcCallMatch = testCase.input.match(/\((.+)\)/);
        if (funcCallMatch) {
          methodArgs = funcCallMatch[1];
        } else {
          methodArgs = testCase.input;
        }
      }

      // Create test method with assertion
      const testMethod = `
    def test_${i + 1}(self):
        import ast
        result = self.solution.${methodName}(${methodArgs})
        expected_str = ${JSON.stringify(testCase.expectedOutput)}
        expected = ast.literal_eval(expected_str.strip())
        # Store result for retrieval
        self._test_${i + 1}_result = result
        assert result == expected, f"Expected {expected}, got {result}"
      `;
      testMethods.push(testMethod);
    }

    // Create the solutionTest class
    const testClassCode = `
class solutionTest:
    def __init__(self):
        self.solution = Solution()
        self.test_results = []
    
${testMethods.join('\n')}
    
    def run_all_tests(self):
        import traceback
        for i in range(1, ${testCases.length + 1}):
            test_method = getattr(self, f'test_{i}', None)
            if test_method:
                try:
                    test_method()
                    # Get the stored result
                    result_attr = getattr(self, f'_test_{i}_result', None)
                    self.test_results.append({'test_num': i, 'passed': True, 'error': None, 'actual': result_attr})
                except AssertionError as e:
                    # Extract actual value from assertion error message if possible
                    error_msg = str(e)
                    actual_match = None
                    if 'got' in error_msg:
                        try:
                            actual_part = error_msg.split('got')[1].strip()
                            import ast
                            actual_match = ast.literal_eval(actual_part)
                        except:
                            # Try to get from stored result if available
                            result_attr = getattr(self, f'_test_{i}_result', None)
                            if result_attr is not None:
                                actual_match = result_attr
                    self.test_results.append({'test_num': i, 'passed': False, 'error': error_msg, 'actual': actual_match})
                except Exception as e:
                    # Try to get stored result even on exception
                    result_attr = getattr(self, f'_test_{i}_result', None)
                    self.test_results.append({'test_num': i, 'passed': False, 'error': str(e), 'actual': result_attr})
        return self.test_results
    `;

    console.log('[Pyodide] Creating solutionTest class');
    await pyodideInstance.runPythonAsync(testClassCode);

    // Step 3: Execute all test methods
    console.log('[Pyodide] Running all tests');
    const testResultsList = pyodideInstance.runPython(`
test_runner = solutionTest()
results = test_runner.run_all_tests()
import json
json.dumps(results)
    `);

    // Parse test results
    const parsedResults = JSON.parse(testResultsList || '[]');
    
    // Map results to our test results structure
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const result = parsedResults.find((r: any) => r.test_num === i + 1) || { passed: false, error: 'Test not executed', actual: null };
      
      const actualOutput = result.actual !== null ? String(result.actual) : "(no output)";
      const passed = result.passed === true;
      
      if (passed) {
        testResults.passed++;
      }

      testResults.cases.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: actualOutput,
        passed,
        error: result.error || undefined
      });
    }

    // Restore handlers
    if (typeof pyodideInstance.setStdout === 'function') {
      pyodideInstance.setStdout({ batched: () => {} });
      pyodideInstance.setStderr({ batched: () => {} });
    }

    console.log('[Pyodide] Test execution complete:', `${testResults.passed}/${testResults.total} tests passed`);

    return {
      output: stdoutOutput || "",
      error: stderrOutput || undefined,
      testResults
    };

  } catch (err: any) {
    console.error('[Pyodide] Error executing code with tests:', err);
    
    // Restore handlers on error
    try {
      if (typeof pyodideInstance.setStdout === 'function') {
        pyodideInstance.setStdout({ batched: () => {} });
        pyodideInstance.setStderr({ batched: () => {} });
      }
    } catch (e) {
      // Ignore restore errors
    }
    
    return {
      output: stdoutOutput || "",
      error: err.toString(),
      testResults: {
        passed: 0,
        total: testCases.length,
        cases: testResults.cases.length > 0 ? testResults.cases : testCases.map(tc => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: "",
          passed: false,
          error: err.toString()
        }))
      }
    };
  }
};

export const isPyodideReady = () => !!pyodideInstance;
