import { GoogleGenAI, Chat, Type } from "@google/genai";
import { DailyPhrase, Message } from "../types";

const PRIMARY_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash';

// In-memory chat session to maintain conversation context
let chatSession: Chat | null = null;
let currentLanguage: string = "English";
// Cache for daily phrases to persist across component remounts
const phrasesCache: Record<string, DailyPhrase[]> = {};

const getClient = () => {
  return new GoogleGenAI({ apiKey: PRIMARY_KEY });
};

const getSystemInstruction = (language: string) => `
You are a friendly, patient, and immersive Language Coach specializing in teaching ${language}.

**CORE BEHAVIORS:**
1. **Immersive Practice**: Converse primarily in ${language}. Use English ONLY for brief clarifications if the user is confused.
2. **Gentle Correction**: If the user makes a mistake, kindly correct it in ${language} (e.g., "We usually say...").
3. **Persona**: You are a supportive local friend helping the user navigate daily life in a country where ${language} is spoken.
4. **Context Awareness**: The user has a list of "Daily Phrases". If they use one, praise them!

**RESPONSE STYLE:**
- Keep responses conversational (1-3 sentences).
- Use emojis occasionally to be friendly.
- Avoid long lectures.
`;

export const getLanguageChatSession = async (language: string, reset: boolean = false): Promise<Chat> => {
  if (!chatSession || reset || currentLanguage !== language) {
    const ai = getClient();
    currentLanguage = language;
    chatSession = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: getSystemInstruction(language),
        temperature: 0.7,
      },
      history: [],
    });
  }
  return chatSession;
};

export const generateDailyPhrases = async (language: string, forceRefresh: boolean = false): Promise<DailyPhrase[]> => {
  if (!forceRefresh && phrasesCache[language]) {
    return phrasesCache[language];
  }

  const prompt = `
    Generate 10 useful, conversational phrases in ${language} for a learner.
    Focus on: Daily life, greetings, asking for help, or common expressions.
    Return a JSON array where each object has:
    - targetPhrase: The phrase in ${language}.
    - translation: English translation.
    - usageTip: A very brief tip (e.g., "Formal", "Slang", "Used in morning").
    - difficulty: "Easy", "Medium", or "Hard".
  `;

  try {
    const client = getClient();
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              targetPhrase: { type: Type.STRING },
              translation: { type: Type.STRING },
              usageTip: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] }
            },
            required: ["targetPhrase", "translation", "usageTip", "difficulty"]
          }
        }
      }
    });

    if (response.text) {
      const rawData = JSON.parse(response.text);
      // Add IDs and practiced state
      const result = rawData.map((item: any, index: number) => ({
        ...item,
        id: Date.now().toString() + index,
        practiced: false
      }));
      phrasesCache[language] = result;
      return result;
    }
    return [];
  } catch (error) {
    console.error("Failed to generate phrases:", error);
    return [];
  }
};

export const sendLanguageMessage = async (
  language: string,
  userInput: string,
  knownPhrases: DailyPhrase[] = []
): Promise<string> => {
  try {
    const session = await getLanguageChatSession(language);
    
    // Context injection (hidden from user, but visible to model)
    let fullInput = userInput;
    if (knownPhrases.length > 0) {
      const phraseContext = knownPhrases.map(p => p.targetPhrase).join(", ");
      // We append this context subtly
      // Note: In a real app, we might send this as a separate system event or invisible user part.
      // Here we just assume the session has history, but for the *current* turn, we can remind it if needed.
      // However, keeping it simple: just send the user input. 
      // Maybe occasionally inject: "User is practicing these phrases: ..." if it's the start.
    }

    const response = await session.sendMessage({ message: fullInput });
    return response.text || "...";
  } catch (error) {
    console.error("Language Chat Error:", error);
    return "Lo siento, I'm having trouble connecting right now. (API Error)";
  }
};
