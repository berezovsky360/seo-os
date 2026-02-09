import { GoogleGenAI } from "@google/genai";

// Lazy initialization of Gemini Client to avoid crashes when API key is missing
let ai: GoogleGenAI | null = null;

const getGeminiClient = (): GoogleGenAI => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Gemini API key is not configured. Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file.');
  }

  if (!ai) {
    ai = new GoogleGenAI({ apiKey });
  }

  return ai;
};

export const generateBlogPost = async (
  topic: string,
  personaName: string,
  systemPrompt: string
): Promise<string> => {
  try {
    const client = getGeminiClient();

    const fullPrompt = `
      You are an AI author with the following persona:
      Name: ${personaName}
      System Instructions: ${systemPrompt}

      Task: Write a short, engaging blog post (approx 300 words) about the following topic: "${topic}".
      Maintain your persona's tone strictly. Use Markdown for formatting.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: fullPrompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }, // Minimize latency for this demo
      }
    });

    return response.text || "Failed to generate content.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Error generating content: ${(error as Error).message}. Please add your Gemini API key to .env.local to use AI generation.`;
  }
};