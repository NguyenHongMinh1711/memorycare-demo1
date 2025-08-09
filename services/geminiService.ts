import { GoogleGenAI, GenerateContentResponse, Chat, Type } from "@google/genai";
import { GEMINI_TEXT_MODEL } from '../constants';
import { GroundingChunk } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY for Gemini is not set. Please ensure the process.env.API_KEY environment variable is configured.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY" }); // Fallback to prevent crash if key is missing

export const generateText = async (prompt: string, systemInstruction?: string): Promise<string> => {
  if (!API_KEY) return "API Key for Gemini is not configured.";
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating text with Gemini:", error);
    return `Error: Could not generate text. ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

let chatInstance: Chat | null = null;
let lastSystemInstruction: string | undefined = undefined;


export const startOrGetChat = (systemInstruction?: string): Chat => {
  if (!API_KEY) {
    // This is a simplified error handling. In a real app, you might throw or handle more gracefully.
    console.error("API Key for Gemini is not configured. Chat functionality will be impaired.");
  }
  // Create a new chat instance if it doesn't exist or if the system instruction has changed.
  if (!chatInstance || lastSystemInstruction !== systemInstruction) {
     chatInstance = ai.chats.create({
        model: GEMINI_TEXT_MODEL,
        config: systemInstruction ? { systemInstruction } : undefined,
     });
     lastSystemInstruction = systemInstruction;
  }
  return chatInstance;
};

export const sendMessageInChat = async (message: string, systemInstruction?: string): Promise<string> => {
  if (!API_KEY) return "API Key for Gemini is not configured.";
  try {
    const chat = startOrGetChat(systemInstruction);
    const response: GenerateContentResponse = await chat.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Error sending message in chat with Gemini:", error);
    return `Error: Could not send message. ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

export const streamMessageInChat = async (
  message: string,
  onChunk: (chunkText: string) => void,
  systemInstruction?: string
): Promise<void> => {
  if (!API_KEY) {
    onChunk("API Key for Gemini is not configured.");
    return;
  }
  try {
    const chat = startOrGetChat(systemInstruction);
    const responseStream = await chat.sendMessageStream({ message });
    for await (const chunk of responseStream) {
      onChunk(chunk.text);
    }
  } catch (error) {
    console.error("Error streaming message in chat with Gemini:", error);
    onChunk(`Error: Could not stream message. ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Helper to parse JSON, potentially cleaning markdown fences
export const parseJsonFromGeminiResponse = <T,>(textResponse: string): T | null => {
  let jsonStr = textResponse.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = match[2].trim();
  }
  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error("Failed to parse JSON response:", e, "Original text:", textResponse);
    return null;
  }
};

export const translateDirections = async (directions: { text: string, distance: number }[], targetLanguage: 'vi' | 'en'): Promise<{ text: string }[]> => {
    if (!API_KEY || targetLanguage === 'en' || directions.length === 0) {
        return directions.map(d => ({ text: `${d.text} (${Math.round(d.distance)}m)` }));
    }

    const systemInstruction = `You are a helpful translation assistant. Your task is to translate driving directions into natural-sounding Vietnamese. For each step, combine the instruction text and the distance into a single, clear instruction. For example, if the input is '{"instruction": "Turn left", "distance": 100}', a good output would be '{"translation": "Rẽ trái và đi tiếp 100 mét."}'. If the instruction already contains a street name, like 'Drive on Main St.', format it as 'Đi trên đường Main St. khoảng 200 mét.'. Always return a JSON object with a "translations" key, which is an array of strings.`;

    const prompt = `Please translate the following driving directions into Vietnamese. Each step includes an instruction and a distance in meters. Combine them into a single, natural instruction for each step.
    
    Input (Array of objects): ${JSON.stringify(directions.map(d => ({ instruction: d.text, distance: Math.round(d.distance) })))}

    Return a JSON object with a single key "translations" which is an array of the translated strings. For example: {"translations": ["Chỉ dẫn 1", "Chỉ dẫn 2"]}`;

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_TEXT_MODEL,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        translations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING
                            },
                        }
                    }
                }
            },
        });

        const result = parseJsonFromGeminiResponse<{ translations: string[] }>(response.text);

        if (result && result.translations && result.translations.length === directions.length) {
            return result.translations.map(t => ({ text: t }));
        }
        // Fallback if translation fails
        throw new Error("Translation result did not match expected format.");

    } catch (error) {
        console.error("Error translating directions with Gemini:", error);
        // Fallback: return English with distance if translation fails
        return directions.map(d => ({ text: `${d.text} (${Math.round(d.distance)}m)` }));
    }
};


export const generateTagsForJournal = async (journalText: string, language: 'en' | 'vi' = 'en'): Promise<string[]> => {
  if (!API_KEY) return [];
  const languageName = language === 'vi' ? 'Vietnamese' : 'English';
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: `Analyze the following journal entry and provide 1 to 3 relevant tags in ${languageName} that categorize the content. Focus on emotions, activities, or key subjects mentioned. Here is the text: "${journalText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tags: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING
              },
              description: `An array of 1 to 3 string tags in ${languageName}.`
            }
          }
        }
      }
    });
    const result = parseJsonFromGeminiResponse<{tags: string[]}>(response.text);
    return result?.tags || [];
  } catch (error) {
    console.error("Error generating tags with Gemini:", error);
    return [];
  }
};

export const generateMyStory = async (answers: {question: string, answer: string}[], language: 'en' | 'vi' = 'en'): Promise<string> => {
    if (!API_KEY) return "API Key not configured.";
    
    const languageName = language === 'vi' ? 'Vietnamese' : 'English';
    const formattedAnswers = answers.map(a => `When asked "${a.question}", I responded: "${a.answer}"`).join('\n\n');

    const systemInstruction = `You are a gentle and empathetic storyteller writing in ${languageName}. Your task is to weave the user's memories and feelings into a cohesive, warm, and flowing first-person autobiography. Write from the "I" perspective ("Tôi" in Vietnamese). Do not list the questions and answers. Instead, synthesize them into a beautiful, seamless narrative. The story should sound like a person reflecting on their life with fondness. Use vivid language, focusing on feelings and sensations, to make the story feel alive like a real memory.`;

    const prompt = `Based on these reflections, please update and rewrite my life story. Here are my thoughts:\n\n${formattedAnswers}`;

    try {
        const response = await ai.models.generateContent({
          model: GEMINI_TEXT_MODEL,
          contents: prompt,
          config: { systemInstruction },
        });
        return response.text;
    } catch (error) {
        console.error("Error generating story with Gemini:", error);
        return `Error creating story: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
};

export const generateMyStoryQuestion = async (previousQuestions: string[], language: 'en' | 'vi' = 'en'): Promise<string> => {
    if (!API_KEY) return "API Key not configured.";

    const languageName = language === 'vi' ? 'Vietnamese' : 'English';

    const systemInstruction = `You are an AI companion for someone building their life story. You ask gentle, open-ended questions in ${languageName} to help them remember feelings, senses, and happy moments. You must NEVER ask for specific facts, dates, or numbers that could be hard to recall (like age, year, or quantity). Focus on topics like favorite smells, sounds, songs, simple joys, feelings about places, or cherished objects. Your tone must be warm, inviting, and simple. Ask only one question.`;

    const prompt = `Here is a list of questions I have already been asked:\n${previousQuestions.length > 0 ? previousQuestions.map(q => `- ${q}`).join('\n') : 'None yet.'}\n\nPlease ask me one new, unique question that is not on this list.`;
    
    try {
        const response = await ai.models.generateContent({
          model: GEMINI_TEXT_MODEL,
          contents: prompt,
          config: { systemInstruction },
        });
        // Simple cleaning of the response
        return response.text.replace(/"/g, '').trim();
    } catch (error) {
        console.error("Error generating question with Gemini:", error);
        return `Error getting a new question: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
};

export const generatePersonSummary = async (
    personInfo: { name: string, relationship: string, keyInfo: string },
    language: 'en' | 'vi' = 'en'
): Promise<string> => {
    if (!API_KEY) return personInfo.keyInfo;
    
    const { name, relationship, keyInfo } = personInfo;
    if (!keyInfo.trim()) return ''; // Don't generate summary for empty info.
    
    const languageName = language === 'vi' ? 'Vietnamese' : 'English';
    const exampleText = language === 'vi' 
        ? 'Ví dụ: "Đây là con trai của bạn, Minh. Anh ấy rất thích làm vườn và thường mang cho bạn hoa tươi từ vườn của anh ấy."'
        : 'For example: "This is your son, Minh. He loves gardening and often brings you fresh flowers from his garden."';

    const systemInstruction = `You are an assistant who creates very short, natural-sounding summaries in ${languageName}. The summary should be easy to understand for someone with memory difficulties. It should be presented as a simple statement about the person, written from the perspective of someone talking to the user (e.g., "This is **your** son..."). Do not use markdown or any special formatting. Just return the plain text sentence.`;
    
    const prompt = `Create a 1-3 sentence summary for this person. Their name is ${name}, their relationship to the user is "${relationship}", and here is some key information about them: "${keyInfo}". The summary should be a simple, friendly reminder. ${exampleText}`;

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_TEXT_MODEL,
            contents: prompt,
            config: { systemInstruction }
        });
        return response.text?.trim() || keyInfo;
    } catch (error) {
        console.error("Error generating person summary with Gemini:", error);
        return keyInfo; 
    }
};
