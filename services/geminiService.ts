import { GoogleGenAI, Type } from "@google/genai";
import { Problem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = "gemini-2.5-flash";

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
      model: modelName,
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
      model: modelName,
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
            model: modelName,
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