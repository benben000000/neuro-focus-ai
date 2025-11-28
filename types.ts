
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  TUTOR = 'TUTOR',
  STUDY_TOOLS = 'STUDY_TOOLS',
  SETTINGS = 'SETTINGS'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  attachments?: FileAttachment[];
  interaction?: LiveInteractionState; // Reusing Live types for chat widgets
}

export interface FileAttachment {
  name: string;
  mimeType: string;
  data: string; // Base64
}

export interface StudySessionStats {
  subject: string;
  mastery: number; // 0-100
  lastStudied: string;
  hoursSpent: number;
  id: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  toolsUsed: string[];
  xpEarned: number;
}

export interface UserProgress {
  totalSessions: number;
  streakDays: number;
  retentionRate: number;
  sessions: StudySessionStats[];
  totalStudySeconds: number;
  lastStudyDate: string;
  averageRetentionRate: number;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ClozeExercise {
  originalText: string;
  parts: {
    text: string;
    isBlank: boolean;
    answer?: string; // Only if isBlank is true
    id?: string;
  }[];
}

export interface MindMapNode {
  id: string;
  label: string;
  description: string;
  children: MindMapNode[];
}

export interface EquationProblem {
  id: string;
  question: string;
  steps: string[];
  finalAnswer: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface LessonPlan {
  topic: string;
  overview: string;
  keyPoints: string[];
  lectureScript: string;
}

// --- Live Interaction Types ---

export type LiveInteractionType = 'FLASHCARD' | 'QUIZ' | 'VISUAL_AID';

export interface LiveFlashcardData {
  front: string;
  back: string;
}

export interface LiveQuizData {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface LiveInteractionState {
  type: LiveInteractionType;
  data: LiveFlashcardData | LiveQuizData;
}

export type ToolMode =
  | 'MENU'
  | 'FLASHCARDS'
  | 'QUIZ'
  | 'BLURTING'
  | 'FEYNMAN'
  | 'CLOZE'
  | 'MINDMAP'
  | 'DEEP_DIVE'
  | 'EQUATION'
  | 'MEMORIZATION'
  | 'IDENTIFICATION'
  | 'PEER_TEACHING'
  | 'VIDEO_EXPLAINER'
  | 'LANGUAGE_LAB'
  | 'MAJOR_EXAM'
  | 'ACTIVE_RECALL';

export type DeepDiveType = 'SOCRATIC' | 'ELABORATION' | 'SUMMARIZATION' | 'PEER_TEACHING';

export interface ActiveRecallQuestion {
  id: string;
  question: string;
  keyPoints: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
}

export interface ActiveRecallResponse {
  questionId: string;
  userAnswer: string;
  score: number;
  feedback: string;
  missedPoints: string[];
  timestamp: number;
}

export interface DailyPhrase {
  id: string;
  targetPhrase: string;
  translation: string;
  usageTip: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  practiced: boolean;
}

export interface VoiceSessionConfig {
  targetLanguage?: string;
}

// --- UNIFIED CHAT TYPES ---

export type ConversationType = 'dm' | 'group-text' | 'group-voice';

export interface ConversationNode {
  id: string;
  type: ConversationType;
  label: string; // display name (user name or channel name)
  subtitle?: string | undefined; // online status, last message, etc.
  avatar?: string | undefined; // user photo or group icon
  groupId?: string | undefined; // set only for group channels
  channelId?: string | undefined; // set only for text/voice channels
  isUnread?: boolean | undefined;
  unreadCount?: number | undefined;
  lastMessage?: string | undefined;
  lastMessageTime?: number | undefined;
  participants?: string[] | undefined; // for DMs
}
