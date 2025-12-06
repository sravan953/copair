import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Problem, AnalysisResult, LearningQuestion } from "../types";

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

  // Calculate actual counts per topic from the quiz data
  const topicStats = new Map<string, { total: number; incorrect: number }>();
  answeredQuestions.forEach(item => {
    const topic = item.question.topic;
    if (!topicStats.has(topic)) {
      topicStats.set(topic, { total: 0, incorrect: 0 });
    }
    const stats = topicStats.get(topic)!;
    stats.total++;
    if (!item.isCorrect) {
      stats.incorrect++;
    }
  });

  console.log('[GeminiService] Calculated topic stats:', Array.from(topicStats.entries()).map(([topic, stats]) => 
    `${topic}: ${stats.incorrect}/${stats.total} incorrect`
  ));

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
      weakAreas: Array.isArray(parsed.weakAreas) ? parsed.weakAreas
        .map((area: any) => {
          const topic = area.topic || "Unknown";
          const stats = topicStats.get(topic) || { total: 0, incorrect: 0 };
          
          return {
            topic,
            incorrectCount: stats.incorrect, // Use calculated value, not Gemini's
            totalQuestions: stats.total, // Use calculated value, not Gemini's
            severity: ['high', 'medium', 'low'].includes(area.severity) ? area.severity : 'medium',
            commonMistakes: Array.isArray(area.commonMistakes) ? area.commonMistakes : [],
            recommendations: Array.isArray(area.recommendations) ? area.recommendations : []
          };
        })
        .filter(area => area.incorrectCount > 0) // Only include topics with incorrect answers
        : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths
        .map((strength: any) => {
          const topic = strength.topic || "Unknown";
          const stats = topicStats.get(topic) || { total: 0, incorrect: 0 };
          const correctCount = stats.total - stats.incorrect;
          
          return {
            topic,
            correctCount, // Use calculated value
            totalQuestions: stats.total // Use calculated value
          };
        })
        .filter(strength => strength.correctCount > 0 && strength.totalQuestions > 0) // Only include topics with correct answers
        : [],
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

export const generateSingleLearningQuestion = async (
  weakArea: AnalysisResult['weakAreas'][0]
): Promise<LearningQuestion> => {
  console.log('[GeminiService] generateSingleLearningQuestion called for topic:', weakArea.topic);

  const prompt = `Generate a practice coding question to help a student learn from their mistakes.

The student struggled with the following topic:
- Topic: ${weakArea.topic}
- Incorrect: ${weakArea.incorrectCount} out of ${weakArea.totalQuestions} questions
- Common mistakes: ${weakArea.commonMistakes.join(', ')}
- Recommendations: ${weakArea.recommendations.join(', ')}

Generate ONE practice coding question for this topic.

The question should:
- Be a Python coding problem that teaches the concept they struggled with
- Be appropriate for interview preparation (like LeetCode style)
- Include exactly 2 examples with input, output, and output explanations
- Provide starter code with function signature and required arguments
- Include the complete solution as the answer

Return only valid JSON. Do not include any additional text, explanations, or markdown formatting outside the JSON structure.`;

  try {
    console.log('[GeminiService] Calling Gemini API with model:', proModelName);
    const apiStartTime = Date.now();
    
    const response = await ai.models.generateContent({
      model: proModelName,
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            question: { type: Type.STRING },
            description: { type: Type.STRING },
            example1: {
              type: Type.OBJECT,
              properties: {
                input: { type: Type.STRING },
                output: { type: Type.STRING },
                outputExplanation: { type: Type.STRING }
              },
              required: ["input", "output", "outputExplanation"]
            },
            example2: {
              type: Type.OBJECT,
              properties: {
                input: { type: Type.STRING },
                output: { type: Type.STRING },
                outputExplanation: { type: Type.STRING }
              },
              required: ["input", "output", "outputExplanation"]
            },
            starterCode: { type: Type.STRING },
            answer: { type: Type.STRING }
          },
          required: ["title", "question", "description", "example1", "example2", "starterCode", "answer"]
        }
      }
    });

    const apiDuration = Date.now() - apiStartTime;
    console.log('[GeminiService] Gemini API response received in', `${apiDuration}ms`);
    
    const text = response.text;
    if (!text) {
      console.error('[GeminiService] No text in response');
      throw new Error("No response from Gemini");
    }
    
    console.log('[GeminiService] Response text length:', text.length);
    
    const cleanedText = cleanJsonText(text);
    console.log('[GeminiService] Cleaned text length:', cleanedText.length);
    
    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
      console.log('[GeminiService] JSON parsed successfully, type:', typeof parsed);
    } catch (parseError) {
      console.error("[GeminiService] JSON Parse failed on text:", text);
      throw parseError;
    }
    
    const question: LearningQuestion = {
      topic: weakArea.topic,
      title: parsed.title || "Practice Question",
      question: parsed.question || "Solve this problem.",
      description: parsed.description || "Solve this problem to improve your understanding.",
      example1: {
        input: parsed.example1?.input || "",
        output: parsed.example1?.output || "",
        outputExplanation: parsed.example1?.outputExplanation || ""
      },
      example2: {
        input: parsed.example2?.input || "",
        output: parsed.example2?.output || "",
        outputExplanation: parsed.example2?.outputExplanation || ""
      },
      starterCode: parsed.starterCode || "def solution():\n    pass",
      answer: parsed.answer || ""
    };

    console.log('[GeminiService] Generated single learning question successfully');
    return question;
  } catch (err) {
    console.error("Error generating learning question:", err);
    throw err;
  }
};

export const generateLearningQuestions = async (
  weakAreas: AnalysisResult['weakAreas']
): Promise<LearningQuestion[]> => {
  console.log('[GeminiService] generateLearningQuestions called with', weakAreas.length, 'weak areas');
  
  if (weakAreas.length === 0) {
    console.warn('[GeminiService] No weak areas provided, returning empty array');
    return [];
  }

  console.log('[GeminiService] Weak areas details:');
  weakAreas.forEach((area, idx) => {
    console.log(`  ${idx + 1}. ${area.topic} - ${area.incorrectCount}/${area.totalQuestions} incorrect`);
  });

  const prompt = `Generate practice coding questions to help a student learn from their mistakes.

The student struggled with the following topics:
${weakAreas.map((area, idx) => `
${idx + 1}. ${area.topic}
   - Incorrect: ${area.incorrectCount} out of ${area.totalQuestions} questions
   - Common mistakes: ${area.commonMistakes.join(', ')}
   - Recommendations: ${area.recommendations.join(', ')}
`).join('\n')}

Generate ONE practice coding question per weak area.

The output must be a JSON array. Each array element must be a JSON object containing ONLY these fields:
- title: A brief title for the question (string, e.g., "Two Sum")
- question: A descriptive question statement that clearly explains what the problem asks (string)
- description: A detailed problem description in Markdown (string)
- example1: An object with:
  - input: Example input (string)
  - output: Example output (string)
  - outputExplanation: Explanation of why this output is correct (string)
- example2: An object with:
  - input: Example input (string)
  - output: Example output (string)
  - outputExplanation: Explanation of why this output is correct (string)
- starterCode: Python starter code template with function definition and all required function arguments (string)
- answer: The complete solution code (string)

Each question should:
- Be a Python coding problem that teaches the concept they struggled with
- Be appropriate for interview preparation (like LeetCode style)
- Include exactly 2 examples with input, output, and output explanations
- Provide starter code with function signature and required arguments
- Include the complete solution as the answer

Return only valid JSON. Do not include any additional text, explanations, or markdown formatting outside the JSON structure.`;

  try {
    console.log('[GeminiService] Calling Gemini API with model:', proModelName);
    const apiStartTime = Date.now();
    
    const response = await ai.models.generateContent({
      model: proModelName,
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              question: { type: Type.STRING },
              description: { type: Type.STRING },
              example1: {
                type: Type.OBJECT,
                properties: {
                  input: { type: Type.STRING },
                  output: { type: Type.STRING },
                  outputExplanation: { type: Type.STRING }
                },
                required: ["input", "output", "outputExplanation"]
              },
              example2: {
                type: Type.OBJECT,
                properties: {
                  input: { type: Type.STRING },
                  output: { type: Type.STRING },
                  outputExplanation: { type: Type.STRING }
                },
                required: ["input", "output", "outputExplanation"]
              },
              starterCode: { type: Type.STRING },
              answer: { type: Type.STRING }
            },
            required: ["title", "question", "description", "example1", "example2", "starterCode", "answer"]
          }
        }
      }
    });

    const apiDuration = Date.now() - apiStartTime;
    console.log('[GeminiService] Gemini API response received in', `${apiDuration}ms`);
    
    const text = response.text;
    if (!text) {
      console.error('[GeminiService] No text in response');
      throw new Error("No response from Gemini");
    }
    
    console.log('[GeminiService] Response text length:', text.length);
    
    const cleanedText = cleanJsonText(text);
    console.log('[GeminiService] Cleaned text length:', cleanedText.length);
    
    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
      console.log('[GeminiService] JSON parsed successfully, type:', Array.isArray(parsed) ? 'array' : typeof parsed);
    } catch (parseError) {
      console.error("[GeminiService] JSON Parse failed on text:", text);
      throw parseError;
    }
    
    // Validate and format learning questions
    const questions: LearningQuestion[] = Array.isArray(parsed) ? parsed.map((q: any, idx: number) => {
      const topic = weakAreas[idx]?.topic || `Topic ${idx + 1}`;
      console.log(`[GeminiService] Processing question ${idx + 1}:`);
      console.log(`[GeminiService]   Topic:`, topic);
      console.log(`[GeminiService]   Title:`, q.title);
      console.log(`[GeminiService]   Question:`, q.question);
      console.log(`[GeminiService]   Has description:`, !!q.description);
      console.log(`[GeminiService]   Has example1:`, !!q.example1);
      console.log(`[GeminiService]   Has example2:`, !!q.example2);
      console.log(`[GeminiService]   Has starter code:`, !!q.starterCode);
      console.log(`[GeminiService]   Has answer:`, !!q.answer);
      
      return {
      topic: topic,
      title: q.title || "Practice Question",
      question: q.question || "Solve this problem.",
      description: q.description || "Solve this problem to improve your understanding.",
      example1: {
        input: q.example1?.input || "",
        output: q.example1?.output || "",
        outputExplanation: q.example1?.outputExplanation || ""
      },
      example2: {
        input: q.example2?.input || "",
        output: q.example2?.output || "",
        outputExplanation: q.example2?.outputExplanation || ""
      },
      starterCode: q.starterCode || "def solution():\n    pass",
      answer: q.answer || ""
    };
    }) : [];

    console.log('[GeminiService] Generated', questions.length, 'learning questions successfully');
    return questions;
  } catch (err) {
    console.error("Error generating learning questions:", err);
    throw err;
  }
};