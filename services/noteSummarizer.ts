import { GoogleGenAI, Type } from "@google/genai";
import {
  FileAttachment,
  DetectedSubject,
  SubjectDetectionResult,
  NoteSummary,
  SummarySection,
  KeyConcept,
  ConceptMapNode,
  ConceptLink,
  ActiveRecallQuestionSummary,
  SpacedRepetitionSignal,
  ElaborationBlock
} from "../types";

const PRIMARY_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash';

const getClient = () => {
  return new GoogleGenAI({ apiKey: PRIMARY_KEY });
};

const prepareContentWithAttachments = (prompt: string, attachments: FileAttachment[]) => {
  if (attachments.length === 0) return prompt;
  const parts = attachments.map(att => ({ inlineData: { mimeType: att.mimeType, data: att.data } }));
  parts.push({ text: prompt } as any);
  return { parts };
};

export const detectSubject = async (attachments: FileAttachment[]): Promise<SubjectDetectionResult> => {
  if (attachments.length === 0) {
    return { subject: 'general', confidence: 0 };
  }

  const prompt = `Analyze the uploaded documents and detect the primary academic subject.

SUBJECT CATEGORIES:
- science_bio: Biology, chemistry, physics, natural sciences, anatomy, ecology
- history_lit: History, literature, social studies, humanities, philosophy, languages
- math: Mathematics, statistics, calculus, algebra, geometry, discrete math
- psych_soc: Psychology, sociology, anthropology, behavioral sciences, neuroscience
- general: General notes, mixed topics, or unclear subject matter

Return JSON with:
{
  "subject": "<one of the categories above>",
  "confidence": <0-100, how certain you are about the classification>
}

Be strict - only use high confidence (>80) if the material clearly fits one category.`;

  try {
    const response = await getClient().models.generateContent({
      model: MODEL_NAME,
      contents: prepareContentWithAttachments(prompt, attachments),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, enum: ['science_bio', 'history_lit', 'math', 'psych_soc', 'general'] },
            confidence: { type: Type.INTEGER }
          },
          required: ["subject", "confidence"]
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text);
      return {
        subject: result.subject as DetectedSubject,
        confidence: Math.min(100, Math.max(0, result.confidence))
      };
    }

    return { subject: 'general', confidence: 50 };
  } catch (error) {
    console.error("Subject detection failed:", error);
    return { subject: 'general', confidence: 0 };
  }
};

export const buildSubjectPrompt = (subject: DetectedSubject): string => {
  const baseInstructions = `
CRITICAL: NO FILLER CONTENT
- Every sentence must add value
- No generic statements like "this is important" without explaining WHY
- No redundant phrasing
- Be specific, concrete, and actionable
`;

  const subjectHeuristics: Record<DetectedSubject, string> = {
    science_bio: `
SCIENCE/BIOLOGY FOCUS:
- Emphasize mechanisms: HOW things work (cellular processes, reactions, systems)
- Identify process chains: Step-by-step sequences (photosynthesis, cell division, digestion)
- Highlight cause-and-effect relationships
- Extract experimental methods and key findings
- Note structure-function relationships
- Call out variables, conditions, and dependencies
- Include diagrams/visual concepts if described in text
`,
    history_lit: `
HISTORY/LITERATURE FOCUS:
- Build chronological timelines: When events occurred, their sequence
- Identify cause-and-effect chains: Why events happened, their consequences
- Extract key figures: Who did what, their motivations and impact
- Note cultural/social context: What influenced events or themes
- Identify narrative structure and literary devices (for literature)
- Track thematic elements and symbolism
- Highlight turning points and their significance
`,
    math: `
MATH FOCUS:
- Extract formulas and theorems with precise notation
- Document procedural steps: How to solve problem types
- Identify prerequisites: What you need to know first
- Note common pitfalls and edge cases
- Show worked examples with step-by-step logic
- Link abstract concepts to concrete applications
- Highlight proof techniques and problem-solving strategies
`,
    psych_soc: `
PSYCHOLOGY/SOCIOLOGY FOCUS:
- Identify major theories and their proponents
- Document key studies: Methodology, findings, implications
- Extract operational definitions of concepts
- Note correlations vs. causations
- Highlight research methods and their limitations
- Track theoretical frameworks and paradigms
- Show real-world applications and examples
`,
    general: `
GENERAL FOCUS:
- Organize by main topics and subtopics
- Extract key facts, definitions, and principles
- Identify relationships between concepts
- Note examples and applications
- Highlight important takeaways
- Structure information hierarchically
`
  };

  return baseInstructions + subjectHeuristics[subject];
};

export const generateStructuredSummary = async (
  subject: DetectedSubject,
  attachments: FileAttachment[]
): Promise<NoteSummary> => {
  if (attachments.length === 0) {
    return createFallbackSummary(subject, "No documents provided");
  }

  const subjectPrompt = buildSubjectPrompt(subject);

  const prompt = `${subjectPrompt}

Create a comprehensive, structured summary of the uploaded documents.

REQUIREMENTS:
1. TITLE: Generate a clear, descriptive title (5-10 words)

2. SECTIONS: Break content into 3-6 logical sections
   - Each section needs: heading, content (2-4 paragraphs), keyTakeaways (3-5 bullet points)
   - Content must be substantial - not just a list of facts
   - Use subject-specific heuristics defined above

3. KEY CONCEPTS: Extract 8-15 most important terms/concepts
   - term: The concept name
   - definition: Clear, concise explanation (1-2 sentences)
   - importance: high/medium/low based on how central it is to understanding

4. CONCEPT MAP: Create a visual knowledge graph
   - nodes: 10-20 key concepts (id, label, optional category)
   - links: Relationships between nodes (source node id, target node id, relationship type)
   - Show how concepts connect and build on each other

5. ACTIVE RECALL QUESTIONS: Generate 8-12 retrieval practice questions
   - Questions that test understanding, not just memorization
   - Include expectedAnswer (2-3 sentence model answer)
   - Mix difficulty levels (40% Easy, 40% Medium, 20% Hard)

6. SPACED REPETITION SIGNALS: Suggest 4-6 review checkpoints
   - reviewInDays: 1, 3, 7, 14, 30 (choose relevant intervals)
   - reason: Why review at this point (e.g., "Consolidate terminology before moving to applications")
   - priority: high/medium/low

7. ELABORATION BLOCKS: Create 4-6 deep-dive explanations
   - topic: A specific concept that needs elaboration
   - elaboration: Detailed explanation with examples, analogies, or applications (3-5 sentences)
   - connections: Array of related concepts/topics

8. REVIEW POINTS: List 6-10 critical takeaways
   - One-sentence statements of must-remember information
   - Prioritize high-level understanding over minutiae

Return ONLY valid JSON matching this exact structure:
{
  "title": "string",
  "sections": [{ "heading": "string", "content": "string", "keyTakeaways": ["string"] }],
  "keyConcepts": [{ "term": "string", "definition": "string", "importance": "high" }],
  "conceptMap": {
    "nodes": [{ "id": "string", "label": "string", "category": "string" }],
    "links": [{ "source": "string", "target": "string", "relationship": "string" }]
  },
  "activeRecallQuestions": [{ "id": "string", "question": "string", "expectedAnswer": "string", "difficulty": "Medium" }],
  "spacedRepetitionSignals": [{ "reviewInDays": 1, "reason": "string", "priority": "high" }],
  "elaborationBlocks": [{ "topic": "string", "elaboration": "string", "connections": ["string"] }],
  "reviewPoints": ["string"]
}`;

  try {
    const response = await getClient().models.generateContent({
      model: MODEL_NAME,
      contents: prepareContentWithAttachments(prompt, attachments),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  heading: { type: Type.STRING },
                  content: { type: Type.STRING },
                  keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["heading", "content", "keyTakeaways"]
              }
            },
            keyConcepts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  importance: { type: Type.STRING, enum: ['high', 'medium', 'low'] }
                },
                required: ["term", "definition", "importance"]
              }
            },
            conceptMap: {
              type: Type.OBJECT,
              properties: {
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      label: { type: Type.STRING },
                      category: { type: Type.STRING }
                    },
                    required: ["id", "label"]
                  }
                },
                links: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      source: { type: Type.STRING },
                      target: { type: Type.STRING },
                      relationship: { type: Type.STRING }
                    },
                    required: ["source", "target", "relationship"]
                  }
                }
              },
              required: ["nodes", "links"]
            },
            activeRecallQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  expectedAnswer: { type: Type.STRING },
                  difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] }
                },
                required: ["id", "question", "expectedAnswer", "difficulty"]
              }
            },
            spacedRepetitionSignals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  reviewInDays: { type: Type.INTEGER },
                  reason: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] }
                },
                required: ["reviewInDays", "reason", "priority"]
              }
            },
            elaborationBlocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  elaboration: { type: Type.STRING },
                  connections: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["topic", "elaboration", "connections"]
              }
            },
            reviewPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: [
            "title",
            "sections",
            "keyConcepts",
            "conceptMap",
            "activeRecallQuestions",
            "spacedRepetitionSignals",
            "elaborationBlocks",
            "reviewPoints"
          ]
        }
      }
    });

    if (response.text) {
      const rawSummary = JSON.parse(response.text);
      return normalizeAndValidateSummary(subject, rawSummary);
    }

    return createFallbackSummary(subject, "No response from AI");
  } catch (error) {
    console.error("Summary generation failed:", error);
    return createFallbackSummary(subject, error instanceof Error ? error.message : "Unknown error");
  }
};

const normalizeAndValidateSummary = (subject: DetectedSubject, rawSummary: any): NoteSummary => {
  const normalized: NoteSummary = {
    subject,
    title: rawSummary.title || "Untitled Summary",
    sections: Array.isArray(rawSummary.sections) && rawSummary.sections.length > 0
      ? rawSummary.sections.map((s: any) => ({
          heading: s.heading || "Section",
          content: s.content || "No content available.",
          keyTakeaways: Array.isArray(s.keyTakeaways) && s.keyTakeaways.length > 0
            ? s.keyTakeaways
            : ["Review this section for key insights."]
        }))
      : [
          {
            heading: "Overview",
            content: "Content could not be processed. Please review the source documents.",
            keyTakeaways: ["Review source material"]
          }
        ],
    keyConcepts: Array.isArray(rawSummary.keyConcepts) && rawSummary.keyConcepts.length > 0
      ? rawSummary.keyConcepts.map((kc: any) => ({
          term: kc.term || "Unknown",
          definition: kc.definition || "Definition not available.",
          importance: ['high', 'medium', 'low'].includes(kc.importance) ? kc.importance : 'medium'
        }))
      : [
          { term: "Key Concept", definition: "Extract key concepts from your notes.", importance: 'medium' }
        ],
    conceptMap: {
      nodes: Array.isArray(rawSummary.conceptMap?.nodes) && rawSummary.conceptMap.nodes.length > 0
        ? rawSummary.conceptMap.nodes.map((n: any) => ({
            id: n.id || `node-${Math.random().toString(36).substring(2, 9)}`,
            label: n.label || "Concept",
            category: n.category
          }))
        : [{ id: "concept-1", label: "Main Topic", category: "core" }],
      links: Array.isArray(rawSummary.conceptMap?.links) && rawSummary.conceptMap.links.length > 0
        ? rawSummary.conceptMap.links.map((l: any) => ({
            source: l.source || "",
            target: l.target || "",
            relationship: l.relationship || "relates to"
          }))
        : []
    },
    activeRecallQuestions: Array.isArray(rawSummary.activeRecallQuestions) && rawSummary.activeRecallQuestions.length > 0
      ? rawSummary.activeRecallQuestions.map((q: any) => ({
          id: q.id || `q-${Math.random().toString(36).substring(2, 9)}`,
          question: q.question || "What are the main concepts?",
          expectedAnswer: q.expectedAnswer || "Review the material to answer this question.",
          difficulty: ['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : 'Medium'
        }))
      : [
          {
            id: "q-1",
            question: "What are the key takeaways from this material?",
            expectedAnswer: "Summarize the main points covered in the notes.",
            difficulty: 'Medium'
          }
        ],
    spacedRepetitionSignals: Array.isArray(rawSummary.spacedRepetitionSignals) && rawSummary.spacedRepetitionSignals.length > 0
      ? rawSummary.spacedRepetitionSignals.map((sr: any) => ({
          reviewInDays: typeof sr.reviewInDays === 'number' ? sr.reviewInDays : 7,
          reason: sr.reason || "Review to reinforce learning",
          priority: ['high', 'medium', 'low'].includes(sr.priority) ? sr.priority : 'medium'
        }))
      : [
          { reviewInDays: 1, reason: "Initial consolidation - review basics", priority: 'high' },
          { reviewInDays: 7, reason: "One week review - combat forgetting curve", priority: 'medium' },
          { reviewInDays: 30, reason: "Long-term retention check", priority: 'low' }
        ],
    elaborationBlocks: Array.isArray(rawSummary.elaborationBlocks) && rawSummary.elaborationBlocks.length > 0
      ? rawSummary.elaborationBlocks.map((eb: any) => ({
          topic: eb.topic || "Topic",
          elaboration: eb.elaboration || "Further explanation needed.",
          connections: Array.isArray(eb.connections) ? eb.connections : []
        }))
      : [
          {
            topic: "Core Concept",
            elaboration: "This material requires deeper analysis. Consider how concepts relate to each other and to prior knowledge.",
            connections: []
          }
        ],
    reviewPoints: Array.isArray(rawSummary.reviewPoints) && rawSummary.reviewPoints.length > 0
      ? rawSummary.reviewPoints
      : ["Review all sections for comprehensive understanding"]
  };

  return normalized;
};

const createFallbackSummary = (subject: DetectedSubject, errorMessage: string): NoteSummary => {
  return {
    subject,
    title: "Summary Generation Failed",
    sections: [
      {
        heading: "Error",
        content: `Unable to generate summary: ${errorMessage}. Please try again with valid documents.`,
        keyTakeaways: ["Ensure documents are properly formatted", "Check API connectivity", "Try again"]
      }
    ],
    keyConcepts: [
      {
        term: "Error",
        definition: "Summary generation encountered an error. Please retry.",
        importance: 'high'
      }
    ],
    conceptMap: {
      nodes: [{ id: "error-node", label: "Error - No Data", category: "error" }],
      links: []
    },
    activeRecallQuestions: [
      {
        id: "error-q",
        question: "What went wrong?",
        expectedAnswer: errorMessage,
        difficulty: 'Easy'
      }
    ],
    spacedRepetitionSignals: [
      {
        reviewInDays: 1,
        reason: "Retry summary generation with valid documents",
        priority: 'high'
      }
    ],
    elaborationBlocks: [
      {
        topic: "Troubleshooting",
        elaboration: "Check that you've uploaded valid text documents and that your API connection is working.",
        connections: ["Document Upload", "API Status"]
      }
    ],
    reviewPoints: ["Retry with valid documents"]
  };
};
