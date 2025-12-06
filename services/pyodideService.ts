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

  try {
    // Reset stdout/stderr capture
    pyodideInstance.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
    `);

    // Run user code
    await pyodideInstance.loadPackagesFromImports(code);
    await pyodideInstance.runPythonAsync(code);

    // Get output
    const stdout = pyodideInstance.runPython("sys.stdout.getvalue()");
    const stderr = pyodideInstance.runPython("sys.stderr.getvalue()");

    return {
      output: stdout,
      error: stderr || undefined
    };

  } catch (err: any) {
    return {
      output: "",
      error: err.toString()
    };
  }
};

export const isPyodideReady = () => !!pyodideInstance;
