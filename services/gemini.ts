import { GoogleGenAI, Chat, Type, Schema, FunctionDeclaration } from "@google/genai";
import { Message, FileAttachment, Flashcard, QuizQuestion, ClozeExercise, MindMapNode, DeepDiveType, EquationProblem, LiveInteractionState, LiveFlashcardData, LiveQuizData, LessonPlan } from "../types";

// Primary Hardcoded Key
const PRIMARY_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const BACKUP_KEY = import.meta.env.VITE_GEMINI_API_KEY_BACKUP || ''; // Optional backup
const OPENAI_BACKUP_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const MODEL_NAME = 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `
You are NeuroFocus, an expert AI tutor specializing in Socratic teaching and science-based learning.

**CRITICAL INSTRUCTION: STRICT GROUNDING**
The user has uploaded documents. You must treat these documents as your **EXCLUSIVE source of truth**.
- Answer questions ONLY using information found in the attached files.
- If the answer is not in the files, state: "I cannot find that information in the uploaded documents."

**TEACHING PERSONA: SOCRATIC & ADAPTIVE**
1.  **Don't Lecture**: Do not give long, passive explanations unless explicitly asked.
2.  **Ask Questions**: When the user asks a question, guide them to the answer with a counter-question or hint.
    - *User*: "What is mitochondria?"
    - *You*: "Think about how the cell gets energy. What organelle handles that?"
3.  **Be Concise**: Keep spoken responses short (1-2 sentences) to maintain a conversational flow.
4.  **Interactive Tools**: Use tools proactively!
   - If explaining a term from the file, show a **Flashcard**.
   - If checking understanding of a section, trigger a **Quiz**.
`;

const chatTools: FunctionDeclaration[] = [
  {
    name: "show_flashcard",
    description: "Display a visual flashcard widget in the chat stream to reinforce a key term or concept.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        front: { type: Type.STRING, description: "The term or question on the front." },
        back: { type: Type.STRING, description: "The definition or answer on the back." }
      },
      required: ["front", "back"]
    }
  },
  {
    name: "show_quiz",
    description: "Display a multiple-choice quiz widget in the chat stream to test understanding.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING, description: "The question text." },
        options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of 2-4 possible answers." },
        correctIndex: { type: Type.INTEGER, description: "The index of the correct answer (0-based)." }
      },
      required: ["question", "options", "correctIndex"]
    }
  }
];

let chatSession: Chat | null = null;

// --- CLIENT INITIALIZATION WITH FALLBACK ---
const getClient = () => {
  return new GoogleGenAI({ apiKey: PRIMARY_KEY });
};

const getBackupClient = () => {
  const backup = localStorage.getItem('neurofocus_backup_key');
  if (backup) return new GoogleGenAI({ apiKey: backup });
  return null;
};

export const getChatSession = async (reset: boolean = false): Promise<Chat> => {
  if (!chatSession || reset) {
    const ai = getClient();
    chatSession = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.5,
        tools: [{ functionDeclarations: chatTools }]
      },
      history: [],
    });
  }
  return chatSession;
};

// --- OPENAI FALLBACK ---
const callOpenAI = async (text: string, attachments: FileAttachment[]): Promise<string> => {
  const key = localStorage.getItem('neurofocus_openai_key') || OPENAI_BACKUP_KEY;

  if (!key) throw new Error("No OpenAI Key found.");

  const messages: any[] = [
    { role: "system", content: "You are NeuroFocus, an AI tutor. Use the provided text as context. Be concise." }
  ];

  let context = "";
  attachments.forEach(a => {
    if (a.mimeType.includes('text')) {
      try { context += `\n---\n${atob(a.data)}\n---\n`; } catch (e) { }
    }
  });

  messages.push({ role: "user", content: `${context}\n\n${text}` });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: messages
    })
  });

  if (!res.ok) throw new Error("OpenAI API Error");

  const data = await res.json();
  return data.choices[0]?.message?.content || "No response from OpenAI.";
};

// --- MAIN SEND FUNCTION WITH FAILOVER ---
export const sendMessageToGemini = async (
  text: string,
  attachments: FileAttachment[] = []
): Promise<{ text: string, interaction?: LiveInteractionState }> => {
  try {
    return await internalSendMessage(getClient(), text, attachments);
  } catch (primaryError) {
    console.warn("Primary Gemini failed, trying backup...", primaryError);

    const backupClient = getBackupClient();
    if (backupClient) {
      try {
        return await internalSendMessage(backupClient, text, attachments);
      } catch (backupError) {
        console.warn("Backup Gemini failed.", backupError);
      }
    }

    try {
      const openAiResponse = await callOpenAI(text, attachments);
      return { text: `[Backup AI]: ${openAiResponse}` };
    } catch (openAiError) {
      console.error("All AIs failed.", openAiError);
      return { text: "Service unavailable. Please check your connection or API keys in Settings." };
    }
  }
};

const internalSendMessage = async (ai: GoogleGenAI, text: string, attachments: FileAttachment[]) => {
  const session = await getChatSession();

  let response;
  if (attachments.length > 0) {
    const parts: any[] = attachments.map(att => ({
      inlineData: { mimeType: att.mimeType, data: att.data }
    }));
    if (text && text.trim().length > 0) parts.push({ text: `[CONTEXT: Using these attached files] ${text}` });
    else parts.push({ text: "Analyze these files." });

    response = await session.sendMessage({ message: parts });
  } else {
    response = await session.sendMessage({ message: text });
  }

  let interaction: LiveInteractionState | undefined;
  const calls = response.functionCalls;
  if (calls && calls.length > 0) {
    const call = calls[0];
    if (call.name === 'show_flashcard') interaction = { type: 'FLASHCARD', data: call.args as unknown as LiveFlashcardData };
    else if (call.name === 'show_quiz') interaction = { type: 'QUIZ', data: call.args as unknown as LiveQuizData };
  }
  return { text: response.text || "", interaction };
}


// --- STUDY TOOLS ---
const prepareContentWithAttachments = (prompt: string, attachments: FileAttachment[]) => {
  if (attachments.length === 0) return prompt;
  const parts = attachments.map(att => ({ inlineData: { mimeType: att.mimeType, data: att.data } }));
  parts.push({ text: prompt } as any);
  return { parts };
};

export const identifyDocumentSubject = async (attachments: FileAttachment[]): Promise<{ subject: string; complexity: number } | null> => {
  if (attachments.length === 0) return null;
  const prompt = `Strictly analyze the attached documents. Identify the single primary academic subject. Return JSON: { "subject": "Subject Name", "complexity": 50 }`;
  try {
    const response = await getClient().models.generateContent({
      model: MODEL_NAME,
      contents: prepareContentWithAttachments(prompt, attachments),
      config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { subject: { type: Type.STRING }, complexity: { type: Type.INTEGER } }, required: ["subject", "complexity"] } }
    });
    if (response.text) return JSON.parse(response.text);
    return null;
  } catch (error) { return null; }
};

export const generateFlashcards = async (attachments: FileAttachment[], count: number = 25): Promise<Flashcard[]> => {
  const prompt = `Generate ${count} flashcards based STRICTLY on the attached documents. CRITICAL: Cover material from start to end.`;
  try {
    const response = await getClient().models.generateContent({
      model: MODEL_NAME,
      contents: prepareContentWithAttachments(prompt, attachments),
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { front: { type: Type.STRING }, back: { type: Type.STRING } }, required: ["front", "back"] } } }
    });
    if (response.text) return JSON.parse(response.text) as Flashcard[];
    return [];
  } catch (error) { return []; }
};

export const generateQuiz = async (attachments: FileAttachment[], count: number = 10): Promise<QuizQuestion[]> => {
  const prompt = `Generate a ${count}-question multiple choice quiz based STRICTLY on the attached documents. Cover start to finish.`;
  try {
    const response = await getClient().models.generateContent({
      model: MODEL_NAME,
      contents: prepareContentWithAttachments(prompt, attachments),
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctIndex: { type: Type.INTEGER }, explanation: { type: Type.STRING } }, required: ["question", "options", "correctIndex", "explanation"] } } }
    });
    if (response.text) return JSON.parse(response.text) as QuizQuestion[];
    return [];
  } catch (error) { return []; }
};

export const evaluateBlurting = async (attachments: FileAttachment[], topic: string, userNotes: string): Promise<string> => {
  const prompt = `Topic: "${topic}". User Notes: "${userNotes}". Compare STRICTLY against document. List corrections.`;
  try {
    const response = await getClient().models.generateContent({ model: MODEL_NAME, contents: prepareContentWithAttachments(prompt, attachments) });
    return response.text || "Could not generate feedback.";
  } catch (error) { return "Error processing request."; }
};

export const generateMindMap = async (attachments: FileAttachment[]): Promise<MindMapNode | null> => {
  const prompt = `Create a hierarchical Mind Map JSON structure. Root > Subtopic > Detail. Max 3 levels. Concise description.`;
  try {
    const response = await getClient().models.generateContent({
      model: MODEL_NAME,
      contents: prepareContentWithAttachments(prompt, attachments),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            label: { type: Type.STRING },
            description: { type: Type.STRING },
            children: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  description: { type: Type.STRING },
                  children: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        label: { type: Type.STRING },
                        description: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            }
          },
          required: ["id", "label", "description", "children"]
        }
      }
    });
    if (response.text) return JSON.parse(response.text) as MindMapNode;
    return null;
  } catch (error) { return null; }
};

export const generateCloze = async (attachments: FileAttachment[]): Promise<ClozeExercise | null> => {
  const prompt = `Select a paragraph. Remove 5-8 keywords. Return JSON.`;
  try {
    const response = await getClient().models.generateContent({
      model: MODEL_NAME,
      contents: prepareContentWithAttachments(prompt, attachments),
      config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { originalText: { type: Type.STRING }, parts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, isBlank: { type: Type.BOOLEAN }, answer: { type: Type.STRING }, id: { type: Type.STRING } }, required: ["text", "isBlank"] } } }, required: ["parts"] } }
    });
    if (response.text) return JSON.parse(response.text) as ClozeExercise;
    return null;
  } catch (error) { return null; }
};

export const evaluateFeynman = async (attachments: FileAttachment[], topic: string, explanation: string): Promise<string> => {
  const prompt = `Feynman Technique: "${topic}". User Explanation: "${explanation}". Critique based on document.`;
  try {
    const response = await getClient().models.generateContent({ model: MODEL_NAME, contents: prepareContentWithAttachments(prompt, attachments) });
    return response.text || "Analysis failed.";
  } catch (e) { return "Error."; }
};

export const generateDeepDivePrompt = async (attachments: FileAttachment[], type: DeepDiveType): Promise<string> => {
  const prompts = { SOCRATIC: "Thought-provoking question.", ELABORATION: "Complex 'How'/'Why' question.", SUMMARIZATION: "Summarize section.", PEER_TEACHING: "Act as confused student." };
  try {
    const response = await getClient().models.generateContent({ model: MODEL_NAME, contents: prepareContentWithAttachments(prompts[type], attachments) });
    return response.text || "Ready?";
  } catch (e) { return "Error."; }
}

export const generateEquationProblems = async (attachments: FileAttachment[], count: number = 3): Promise<EquationProblem[]> => {
  const prompt = `Identify ${count} distinct math/physics problems. Return JSON.`;
  try {
    const res = await getClient().models.generateContent({
      model: MODEL_NAME,
      contents: prepareContentWithAttachments(prompt, attachments),
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, question: { type: Type.STRING }, steps: { type: Type.ARRAY, items: { type: Type.STRING } }, finalAnswer: { type: Type.STRING }, difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] } }, required: ["question", "steps", "finalAnswer", "difficulty"] } } }
    });
    if (res.text) return JSON.parse(res.text);
    return [];
  } catch (e) { return []; }
};

export const generateMemorizationText = async (attachments: FileAttachment[]): Promise<string> => {
  const prompt = `Extract a key paragraph (4-6 lines) to memorize.`;
  try {
    const res = await getClient().models.generateContent({ model: MODEL_NAME, contents: prepareContentWithAttachments(prompt, attachments) });
    return res.text || "";
  } catch (e) { return ""; }
};

export const generateIdentificationItems = async (attachments: FileAttachment[], count: number = 5): Promise<Flashcard[]> => {
  const prompt = `Generate ${count} 'Identify Concept' items. Front: Desc, Back: Term. JSON.`;
  try {
    const res = await getClient().models.generateContent({
      model: MODEL_NAME,
      contents: prepareContentWithAttachments(prompt, attachments),
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { front: { type: Type.STRING }, back: { type: Type.STRING } }, required: ["front", "back"] } } }
    });
    if (res.text) return JSON.parse(res.text);
    return [];
  } catch (e) { return []; }
};

export const evaluatePeerTeachingAudio = async (attachments: FileAttachment[], audioBase64: string): Promise<string> => {
  try {
    const prompt = `Analyze user audio explanation against document.`;
    const parts: any[] = attachments.map(att => ({ inlineData: { mimeType: att.mimeType, data: att.data } }));
    parts.push({ inlineData: { mimeType: "audio/wav", data: audioBase64 } });
    parts.push({ text: prompt });
    const res = await getClient().models.generateContent({ model: MODEL_NAME, contents: { parts } });
    return res.text || "Error.";
  } catch (e) { return "Error."; }
};

export const generateLessonPlan = async (attachments: FileAttachment[]): Promise<LessonPlan | null> => {
  const prompt = `Create lesson plan for lecture. JSON: {topic, overview, keyPoints, lectureScript}.`;
  try {
    const res = await getClient().models.generateContent({
      model: MODEL_NAME,
      contents: prepareContentWithAttachments(prompt, attachments),
      config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { topic: { type: Type.STRING }, overview: { type: Type.STRING }, keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } }, lectureScript: { type: Type.STRING } }, required: ["topic", "overview", "keyPoints", "lectureScript"] } }
    });
    if (res.text) return JSON.parse(res.text);
    return null;
  } catch (e) { return null; }
};

export const generateExam = async (attachments: FileAttachment[]): Promise<QuizQuestion[]> => {
  const prompt = `Generate a comprehensive "Major Exam" with 20 questions based STRICTLY on the attached documents. 
    - Mix difficulty: 30% Easy, 50% Medium, 20% Hard.
    - Cover all major topics in the text.
    - Return JSON array of objects with: question, options (4), correctIndex, explanation.`;

  try {
    const response = await getClient().models.generateContent({
      model: MODEL_NAME,
      contents: prepareContentWithAttachments(prompt, attachments),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctIndex", "explanation"]
          }
        }
      }
    });
    if (response.text) return JSON.parse(response.text) as QuizQuestion[];
    return [];
  } catch (error) { return []; }
};