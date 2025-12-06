# CoPair

AI-powered coding interview prep that adapts to your weaknesses.

## The Problem It Solves

Traditional interview prep is often unfocused—you either grind random problems or don't know where you're actually struggling. CoPair addresses this by:

1. **Diagnosing Your Weaknesses** — Takes a diagnostic quiz covering 17+ DSA topics (Arrays, Two Pointers, Stack, Binary Search, Trees, Graphs, Dynamic Programming, etc.)

2. **Providing Targeted Practice** — Instead of random problems, it generates Python coding challenges specifically for topics you got wrong

3. **Offering Smart Hints** — If you're stuck, the AI provides progressive hints that guide you without revealing the answer

## How It Works

1. **📋 Diagnostic Quiz** — Answer multiple-choice questions on DSA concepts
2. **🔍 AI Analysis** — Gemini AI analyzes your responses, identifying weak areas, common mistakes, and strengths
3. **💻 Practice Mode** — LeetCode-style Python problems are generated on-demand for each weak area
4. **▶️ In-Browser Execution** — Run your code and test against test cases using Pyodide (Python in the browser)
5. **💡 Hint System** — Request AI-powered hints after failed attempts
6. **📊 Summary** — Track your progress and see completed topics

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite |
| AI | Google Gemini (`gemini-2.5-flash-lite` for analysis, `gemini-3-pro-preview` for problem generation) |
| Code Execution | Pyodide (browser-based Python) |
| Editor | Monaco Editor |
| Styling | Tailwind CSS |
