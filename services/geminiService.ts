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
- Provide starter code with a class Solution containing the method signature (e.g., "class Solution: def method_name(self, ...):")
- The starter code must always include "class Solution" following standard LeetCode-style structure
- Include any necessary imports in the starterCode (e.g., "from typing import List", "from collections import deque", etc.)
- Include the complete solution as the answer
- Include exactly 5 test cases. Each test case should be Python code that calls the solution method with test inputs, and the expected output as a string

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
            answer: { type: Type.STRING },
            testCases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  input: { type: Type.STRING },
                  expectedOutput: { type: Type.STRING }
                },
                required: ["input", "expectedOutput"]
              }
            }
          },
          required: ["title", "question", "example1", "example2", "starterCode", "answer", "testCases"]
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
      title: parsed.title,
      question: parsed.question,
      description: "",
      example1: {
        input: parsed.example1.input,
        output: parsed.example1.output,
        outputExplanation: parsed.example1.outputExplanation
      },
      example2: {
        input: parsed.example2.input,
        output: parsed.example2.output,
        outputExplanation: parsed.example2.outputExplanation
      },
      starterCode: parsed.starterCode,
      answer: parsed.answer,
      testCases: Array.isArray(parsed.testCases) ? parsed.testCases.map((tc: any) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput
      })) : []
    };

    console.log('[GeminiService] Generated single learning question successfully');
    return question;
  } catch (err) {
    console.error("Error generating learning question:", err);
    throw err;
  }
};
