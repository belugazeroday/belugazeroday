// ─── Shared Types for Birdly ─────────────────────────────────────────────────

export interface AppSettings {
  ollamaUrl: string
  selectedModel: string
  systemPrompt: string
  roleTemplate: RoleTemplate
  overlayOpacity: number
  hotkey: string
  overlayPosition: { x: number; y: number }
  autoRecord: boolean
  language: string
  maxTokens: number
  temperature: number
  streamResponses: boolean
  ocrEnabled: boolean
  sttEnabled: boolean
  ragEnabled: boolean
}

export type RoleTemplate =
  | 'general'
  | 'sales_coach'
  | 'interview_coach'
  | 'negotiation_coach'
  | 'debate_coach'
  | 'presentation_coach'
  | 'custom'

export interface OllamaModel {
  name: string
  modified_at: string
  size: number
  digest: string
}

export interface KnowledgeDocument {
  id: string
  name: string
  type: 'pdf' | 'txt' | 'docx' | 'md'
  content: string
  embedding?: number[]
  uploadedAt: string
  size: number
}

export interface VectorEntry {
  id: string
  docId: string
  chunk: string
  embedding: number[]
  score?: number
}

export interface Suggestion {
  id: string
  text: string
  type: 'tip' | 'rebuttal' | 'question' | 'action' | 'summary'
  timestamp: number
  confidence?: number
}

export interface TranscriptSegment {
  id: string
  text: string
  timestamp: number
  isFinal: boolean
  language?: string
}

export interface SessionState {
  isActive: boolean
  startTime?: number
  endTime?: number
  transcript: TranscriptSegment[]
  suggestions: Suggestion[]
  screenText: string
  sentiment?: 'positive' | 'neutral' | 'negative'
}

export interface PostMeetingData {
  sessionId: string
  transcript: string
  summary?: string
  actionItems?: string[]
  followUpEmail?: string
  generatedAt: string
}

// ─── IPC Channel Names ────────────────────────────────────────────────────────

export const IPC = {
  // Overlay
  TOGGLE_OVERLAY: 'toggle-overlay',
  OVERLAY_VISIBLE: 'overlay-visible',

  // Session
  START_SESSION: 'start-session',
  STOP_SESSION: 'stop-session',
  SESSION_STATE: 'session-state',

  // AI / LLM
  GET_SUGGESTION: 'get-suggestion',
  SUGGESTION_CHUNK: 'suggestion-chunk',
  SUGGESTION_DONE: 'suggestion-done',
  GET_MODELS: 'get-models',
  MODELS_RESULT: 'models-result',

  // STT
  AUDIO_CHUNK: 'audio-chunk',
  TRANSCRIPT_UPDATE: 'transcript-update',

  // OCR
  SCREEN_CAPTURE: 'screen-capture',
  OCR_RESULT: 'ocr-result',

  // Knowledge Base
  UPLOAD_DOCUMENT: 'upload-document',
  DOCUMENT_INDEXED: 'document-indexed',
  GET_DOCUMENTS: 'get-documents',
  DELETE_DOCUMENT: 'delete-document',

  // Post-meeting
  GENERATE_SUMMARY: 'generate-summary',
  GENERATE_EMAIL: 'generate-email',
  EXPORT_MARKDOWN: 'export-markdown',
  EXPORT_PDF: 'export-pdf',

  // Settings
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',

  // System
  OPEN_FILE_DIALOG: 'open-file-dialog',
  SHOW_NOTIFICATION: 'show-notification',
  GET_APP_VERSION: 'get-app-version',
  MINIMIZE_WINDOW: 'minimize-window',
  CLOSE_WINDOW: 'close-window',
} as const

export type IPCChannel = (typeof IPC)[keyof typeof IPC]

// ─── Role Templates ───────────────────────────────────────────────────────────

export const ROLE_TEMPLATES: Record<RoleTemplate, { label: string; prompt: string }> = {
  general: {
    label: 'General Coach',
    prompt: `You are Birdly, a real-time AI performance coach. Analyze the conversation context and screen content, then provide concise, actionable suggestions. Be brief (2-3 sentences max per suggestion). Focus on what matters most right now.`,
  },
  sales_coach: {
    label: 'Sales Coach',
    prompt: `You are Birdly, an expert sales coach. Listen to the sales conversation and provide real-time suggestions: handle objections, suggest value propositions, identify buying signals, recommend next steps. Keep suggestions short and immediately actionable.`,
  },
  interview_coach: {
    label: 'Interview Coach',
    prompt: `You are Birdly, an expert interview coach. Analyze interview questions being asked and provide: structured answer frameworks (STAR method), key points to cover, relevant experience to mention, questions to ask the interviewer. Be concise and specific.`,
  },
  negotiation_coach: {
    label: 'Negotiation Coach',
    prompt: `You are Birdly, an expert negotiation coach. Monitor the negotiation and suggest: anchoring strategies, counter-offers, concession tactics, BATNA reminders, and psychological insights. Keep advice tactical and immediate.`,
  },
  debate_coach: {
    label: 'Debate Coach',
    prompt: `You are Birdly, an expert debate coach. Provide real-time: counterarguments, logical fallacy identifications, supporting facts, rhetorical strategies, and rebuttals. Be sharp and direct.`,
  },
  presentation_coach: {
    label: 'Presentation Coach',
    prompt: `You are Birdly, an expert presentation coach. During the presentation, suggest: ways to clarify complex points, audience engagement techniques, transition phrases, answers to audience questions, and pacing adjustments.`,
  },
  custom: {
    label: 'Custom',
    prompt: `You are Birdly, a real-time AI performance coach. Analyze the conversation and provide helpful suggestions.`,
  },
}

export const DEFAULT_SETTINGS: AppSettings = {
  ollamaUrl: 'http://localhost:11434',
  selectedModel: 'llama3.2',
  systemPrompt: ROLE_TEMPLATES.general.prompt,
  roleTemplate: 'general',
  overlayOpacity: 90,
  hotkey: 'CommandOrControl+Shift+B',
  overlayPosition: { x: 20, y: 20 },
  autoRecord: false,
  language: 'auto',
  maxTokens: 512,
  temperature: 0.7,
  streamResponses: true,
  ocrEnabled: true,
  sttEnabled: true,
  ragEnabled: true,
}
