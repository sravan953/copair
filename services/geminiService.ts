import { GoogleGenAI, Type } from "@google/genai";
import { Problem, AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const modelName = "gemini-2.5-flash";
const proModelName = "gemini-3-pro-preview";

const cleanJsonText = (text: string): string => {
  let cleaned = text.trim();
  // Remove markdown code blocks if present (e.g. ```json ... ```)
  if (cleaned.startsWith("```")) {
    const match = cleaned.match(/```(?:json)?([\s\S]*?)```/);
    if (match) {
      cleaned = match[1].trim();
    }
  }
  return cleaned;
};

export const generateProblem = async (difficulty: string = "Medium"): Promise<Problem> => {
  const prompt = `Generate a single unique Python coding interview problem of ${difficulty} difficulty. 
  It should be algorithmic in nature (like LeetCode).
  
  The output must be a JSON object containing:
  - id: A unique string identifier.
  - title: The problem title.
  - difficulty: "Easy", "Medium", or "Hard".
  - description: A detailed description in Markdown.
  - examples: An array of examples with input, output, and explanation.
  - starterCode: The initial Python function definition.
  `;

  try {
    const response = await ai.models.generateContent({
      model: proModelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            description: { type: Type.STRING },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  input: { type: Type.STRING },
                  output: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                }
              }
            },
            starterCode: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    // Clean potential markdown formatting that confuses JSON.parse
    const cleanedText = cleanJsonText(text);
    
    let parsed;
    try {
        parsed = JSON.parse(cleanedText);
    } catch (parseError) {
        console.error("JSON Parse failed on text:", text);
        throw parseError;
    }
    
    // Ensure robustness by setting defaults for missing fields
    const problem: Problem = {
        id: parsed.id || `gen-${Date.now()}`,
        title: parsed.title || "Untitled Problem",
        difficulty: parsed.difficulty || difficulty,
        description: parsed.description || "No description provided.",
        examples: Array.isArray(parsed.examples) ? parsed.examples : [],
        starterCode: parsed.starterCode || "# Write your solution here\ndef solution():\n    pass"
    };

    return problem;
  } catch (error) {
    console.error("Error generating problem:", error);
    // Fallback problem
    return {
      id: "fallback-1",
      title: "Two Sum",
      difficulty: "Easy",
      description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\nYou can return the answer in any order.",
      examples: [
        { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." }
      ],
      starterCode: "def two_sum(nums, target):\n    # Your code here\n    pass"
    };
  }
};

export const judgeSubmission = async (
  problem: Problem,
  code: string,
  executionOutput: string,
  error?: string
): Promise<string> => {
  const systemPrompt = `You are a strict but helpful technical interviewer. 
  The user has submitted a Python solution to a coding problem.
  
  Problem: ${problem.title}
  Description: ${problem.description}
  
  User Code:
  \`\`\`python
  ${code}
  \`\`\`
  
  Execution Output (Stdout):
  ${executionOutput}
  
  Execution Error (Stderr):
  ${error || "None"}
  
  Analyze the code for:
  1. Correctness (does it look like it solves the logic?)
  2. Efficiency (Big O time/space)
  3. Code Style (Pythonic practices)
  
  If there is an error, explain it simply.
  If the output is wrong based on standard expectations for this problem, point it out.
  Keep your response concise (under 200 words) but informative. Use Markdown.`;

  try {
    const response = await ai.models.generateContent({
      model: proModelName,
      contents: systemPrompt,
    });
    return response.text || "Could not generate judgment.";
  } catch (err) {
    return "Error connecting to the Judge AI.";
  }
};

export const chatWithJudge = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string
): Promise<string> => {
    try {
        const chat = ai.chats.create({
            model: proModelName,
            history: history,
            config: {
                systemInstruction: "You are a helpful coding tutor assisting a user with a Python algorithm problem. Do not give the full answer immediately; guide them."
            }
        });
        
        const result = await chat.sendMessage({ message: message });
        return result.text;
    } catch (e) {
        console.error("Chat error", e);
        return "I'm having trouble thinking right now. Please try again.";
    }
}

export interface QuizQuestion {
  topic: string;
  question: string;
  options: string[];
  answer: string;
}

export const analyzeWeakAreas = async (
  questions: QuizQuestion[],
  userAnswers: { [key: number]: string }
): Promise<AnalysisResult> => {
  // Filter to only answered questions
  const answeredQuestions = questions
    .map((q, index) => ({
      question: q,
      index,
      userAnswer: userAnswers[index],
      isCorrect: userAnswers[index] === q.answer
    }))
    .filter(item => item.userAnswer !== undefined);

  if (answeredQuestions.length === 0) {
    throw new Error("No questions were answered. Please answer at least one question before submitting.");
  }

  // Calculate overall score
  const correctCount = answeredQuestions.filter(item => item.isCorrect).length;
  const totalCount = answeredQuestions.length;
  const percentage = Math.round((correctCount / totalCount) * 100);

  // Build the prompt with structured data
  const quizData = answeredQuestions.map((item, idx) => {
    const q = item.question;
    const optionLabels = q.options.map((_, i) => String.fromCharCode(65 + i));
    const userAnswerIndex = q.options.indexOf(item.userAnswer);
    const correctAnswerIndex = q.options.indexOf(q.answer);
    
    return `Question ${idx + 1}:
Topic: ${q.topic}
Question: ${q.question}
Options:
${q.options.map((opt, i) => `  ${optionLabels[i]}. ${opt}`).join('\n')}
Correct Answer: ${optionLabels[correctAnswerIndex]}. ${q.answer}
User's Answer: ${userAnswerIndex >= 0 ? `${optionLabels[userAnswerIndex]}. ${item.userAnswer}` : 'Not answered'}
Result: ${item.isCorrect ? 'CORRECT' : 'INCORRECT'}`;
  }).join('\n\n');

  const prompt = `You are an educational assessment AI analyzing quiz results for a technical interview preparation platform.

Below are the quiz questions, correct answers, and the user's answers. Analyze the user's performance and provide insights about their weak areas.

Quiz Results:
${quizData}

Analyze the user's performance and provide a structured analysis. Calculate the overall score (${correctCount} correct out of ${totalCount} total, ${percentage}%). Identify weak areas by topic, analyze patterns in mistakes, and provide actionable recommendations. Also highlight strengths where the user performed well.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: {
              type: Type.OBJECT,
              properties: {
                correct: { type: Type.NUMBER },
                total: { type: Type.NUMBER },
                percentage: { type: Type.NUMBER }
              }
            },
            weakAreas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  incorrectCount: { type: Type.NUMBER },
                  totalQuestions: { type: Type.NUMBER },
                  severity: { type: Type.STRING },
                  commonMistakes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  recommendations: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                }
              }
            },
            strengths: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  correctCount: { type: Type.NUMBER },
                  totalQuestions: { type: Type.NUMBER }
                }
              }
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  priority: { type: Type.STRING },
                  action: { type: Type.STRING },
                  reason: { type: Type.STRING }
                }
              }
            },
            summary: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const cleanedText = cleanJsonText(text);
    
    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("JSON Parse failed on text:", text);
      throw parseError;
    }
    
    // Validate and set defaults
    const analysisResult: AnalysisResult = {
      overallScore: {
        correct: parsed.overallScore?.correct ?? correctCount,
        total: parsed.overallScore?.total ?? totalCount,
        percentage: parsed.overallScore?.percentage ?? percentage
      },
      weakAreas: Array.isArray(parsed.weakAreas) ? parsed.weakAreas.map((area: any) => ({
        topic: area.topic || "Unknown",
        incorrectCount: area.incorrectCount ?? 0,
        totalQuestions: area.totalQuestions ?? 0,
        severity: ['high', 'medium', 'low'].includes(area.severity) ? area.severity : 'medium',
        commonMistakes: Array.isArray(area.commonMistakes) ? area.commonMistakes : [],
        recommendations: Array.isArray(area.recommendations) ? area.recommendations : []
      })) : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map((strength: any) => ({
        topic: strength.topic || "Unknown",
        correctCount: strength.correctCount ?? 0,
        totalQuestions: strength.totalQuestions ?? 0
      })) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map((rec: any) => ({
        priority: ['high', 'medium', 'low'].includes(rec.priority) ? rec.priority : 'medium',
        action: rec.action || "",
        reason: rec.reason || ""
      })) : [],
      summary: parsed.summary || "Analysis completed."
    };

    return analysisResult;
  } catch (err) {
    console.error("Error analyzing weak areas:", err);
    throw err;
  }
};