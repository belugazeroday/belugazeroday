import { create } from 'zustand'
import { AppSettings, DEFAULT_SETTINGS, KnowledgeDocument, Suggestion, TranscriptSegment } from '@shared/types'
import '@shared/birdlyApi.d'

// ─── App Store ────────────────────────────────────────────────────────────────
interface AppState {
  // Navigation
  activeTab: 'dashboard' | 'knowledge' | 'post-meeting' | 'settings'
  setActiveTab: (tab: AppState['activeTab']) => void

  // Overlay
  overlayVisible: boolean
  setOverlayVisible: (visible: boolean) => void

  // Session
  sessionActive: boolean
  sessionStartTime?: number
  transcript: TranscriptSegment[]
  screenText: string
  suggestions: Suggestion[]
  currentSuggestion: string
  isGenerating: boolean
  sentiment: 'positive' | 'neutral' | 'negative'

  startSession: () => void
  stopSession: () => void
  addTranscriptSegment: (segment: TranscriptSegment) => void
  setScreenText: (text: string) => void
  appendSuggestionChunk: (chunk: string) => void
  finalizeSuggestion: () => void
  clearSuggestions: () => void

  // Knowledge Base
  documents: KnowledgeDocument[]
  setDocuments: (docs: KnowledgeDocument[]) => void
  addDocument: (doc: KnowledgeDocument) => void
  removeDocument: (id: string) => void

  // Post-meeting
  summary: string
  followUpEmail: string
  setSummary: (s: string) => void
  setFollowUpEmail: (e: string) => void

  // Settings
  settings: AppSettings
  setSettings: (s: AppSettings) => void
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void

  // Models
  availableModels: string[]
  setAvailableModels: (models: string[]) => void

  // Status messages
  statusMessage: string
  statusType: 'info' | 'success' | 'error' | 'warning'
  setStatus: (message: string, type?: AppState['statusType']) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Overlay
  overlayVisible: false,
  setOverlayVisible: (visible) => set({ overlayVisible: visible }),

  // Session
  sessionActive: false,
  sessionStartTime: undefined,
  transcript: [],
  screenText: '',
  suggestions: [],
  currentSuggestion: '',
  isGenerating: false,
  sentiment: 'neutral',

  startSession: () =>
    set({
      sessionActive: true,
      sessionStartTime: Date.now(),
      transcript: [],
      suggestions: [],
      currentSuggestion: '',
      screenText: '',
    }),

  stopSession: () => set({ sessionActive: false }),

  addTranscriptSegment: (segment) =>
    set((state) => ({
      transcript: [...state.transcript.slice(-100), segment], // keep last 100
    })),

  setScreenText: (text) => set({ screenText: text }),

  appendSuggestionChunk: (chunk) =>
    set((state) => ({ currentSuggestion: state.currentSuggestion + chunk, isGenerating: true })),

  finalizeSuggestion: () =>
    set((state) => {
      const text = state.currentSuggestion.trim()
      if (!text) return { currentSuggestion: '', isGenerating: false }
      const newSuggestion: Suggestion = {
        id: `sug_${Date.now()}`,
        text,
        type: 'tip',
        timestamp: Date.now(),
      }
      return {
        suggestions: [newSuggestion, ...state.suggestions].slice(0, 20),
        currentSuggestion: '',
        isGenerating: false,
      }
    }),

  clearSuggestions: () => set({ suggestions: [], currentSuggestion: '' }),

  // Knowledge Base
  documents: [],
  setDocuments: (docs) => set({ documents: docs }),
  addDocument: (doc) => set((state) => ({ documents: [...state.documents, doc] })),
  removeDocument: (id) =>
    set((state) => ({ documents: state.documents.filter((d) => d.id !== id) })),

  // Post-meeting
  summary: '',
  followUpEmail: '',
  setSummary: (summary) => set({ summary }),
  setFollowUpEmail: (followUpEmail) => set({ followUpEmail }),

  // Settings
  settings: { ...DEFAULT_SETTINGS },
  setSettings: (settings) => set({ settings }),
  updateSetting: (key, value) =>
    set((state) => ({ settings: { ...state.settings, [key]: value } })),

  // Models
  availableModels: [],
  setAvailableModels: (models) => set({ availableModels: models }),

  // Status
  statusMessage: '',
  statusType: 'info',
  setStatus: (message, type = 'info') => set({ statusMessage: message, statusType: type }),
}))
