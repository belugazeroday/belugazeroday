import { AppSettings, KnowledgeDocument } from './types'

// ─── Centralized window.birdly type declaration ────────────────────────────────
// This file augments the global Window interface with the Birdly API
// exposed by the Electron preload script via contextBridge.

declare global {
  interface Window {
    birdly: BirdlyAPI
  }
}

export interface BirdlyAPI {
  // Overlay
  toggleOverlay: () => Promise<boolean>
  onOverlayVisible: (cb: (visible: boolean) => void) => () => void

  // Session
  startSession: () => Promise<void>
  stopSession: () => Promise<void>
  onSessionState: (cb: (state: unknown) => void) => () => void

  // AI / LLM
  getSuggestion: (context: {
    transcript: string
    screenText: string
    ragContext: string
    prompt?: string
  }) => Promise<{ success: boolean; text?: string; error?: string }>
  onSuggestionChunk: (cb: (chunk: string) => void) => () => void
  onSuggestionDone: (cb: () => void) => () => void
  getModels: () => Promise<{ success: boolean; models: { name: string }[]; error?: string }>

  // STT
  sendAudioChunk: (chunk: ArrayBuffer) => Promise<void>
  onTranscriptUpdate: (cb: (segment: unknown) => void) => () => void

  // OCR
  captureScreen: () => Promise<{ success: boolean; text: string }>
  onOcrResult: (cb: (text: string) => void) => () => void

  // Knowledge Base
  uploadDocument: (filePath: string) => Promise<{
    success: boolean
    document?: KnowledgeDocument
    error?: string
  }>
  getDocuments: () => Promise<{ success: boolean; documents: KnowledgeDocument[] }>
  deleteDocument: (id: string) => Promise<{ success: boolean }>
  onDocumentIndexed: (cb: (doc: unknown) => void) => () => void

  // Post-meeting
  generateSummary: (data: { transcript: string }) => Promise<{
    success: boolean
    text?: string
    error?: string
  }>
  generateEmail: (data: { transcript: string; summary: string }) => Promise<{
    success: boolean
    text?: string
    error?: string
  }>
  exportMarkdown: (data: { content: string; filename: string }) => Promise<{
    success: boolean
    filePath?: string
  }>

  // Settings
  getSettings: () => Promise<{ success: boolean; settings: AppSettings }>
  saveSettings: (settings: AppSettings) => Promise<{ success: boolean }>

  // System
  openFileDialog: (options?: {
    properties?: string[]
    filters?: Array<{ name: string; extensions: string[] }>
    defaultPath?: string
  }) => Promise<{
    filePaths: string[]
    canceled: boolean
  }>
  showNotification: (title: string, body: string) => Promise<void>
  getAppVersion: () => Promise<string>
  minimizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
}

export {}
