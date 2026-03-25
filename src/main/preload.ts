import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'

// ─── Expose safe IPC bridge to renderer ───────────────────────────────────────
contextBridge.exposeInMainWorld('birdly', {
  // ── Overlay ──────────────────────────────────────────────────────────────
  toggleOverlay: () => ipcRenderer.invoke(IPC.TOGGLE_OVERLAY),
  onOverlayVisible: (cb: (visible: boolean) => void) => {
    const handler = (_: Electron.IpcRendererEvent, visible: boolean) => cb(visible)
    ipcRenderer.on(IPC.OVERLAY_VISIBLE, handler)
    return () => ipcRenderer.removeListener(IPC.OVERLAY_VISIBLE, handler)
  },

  // ── Session ───────────────────────────────────────────────────────────────
  startSession: () => ipcRenderer.invoke(IPC.START_SESSION),
  stopSession: () => ipcRenderer.invoke(IPC.STOP_SESSION),
  onSessionState: (cb: (state: unknown) => void) => {
    const handler = (_: Electron.IpcRendererEvent, state: unknown) => cb(state)
    ipcRenderer.on(IPC.SESSION_STATE, handler)
    return () => ipcRenderer.removeListener(IPC.SESSION_STATE, handler)
  },

  // ── AI / LLM ─────────────────────────────────────────────────────────────
  getSuggestion: (context: unknown) => ipcRenderer.invoke(IPC.GET_SUGGESTION, context),
  onSuggestionChunk: (cb: (chunk: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, chunk: string) => cb(chunk)
    ipcRenderer.on(IPC.SUGGESTION_CHUNK, handler)
    return () => ipcRenderer.removeListener(IPC.SUGGESTION_CHUNK, handler)
  },
  onSuggestionDone: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on(IPC.SUGGESTION_DONE, handler)
    return () => ipcRenderer.removeListener(IPC.SUGGESTION_DONE, handler)
  },
  getModels: () => ipcRenderer.invoke(IPC.GET_MODELS),

  // ── STT ───────────────────────────────────────────────────────────────────
  sendAudioChunk: (chunk: ArrayBuffer) => ipcRenderer.invoke(IPC.AUDIO_CHUNK, chunk),
  onTranscriptUpdate: (cb: (segment: unknown) => void) => {
    const handler = (_: Electron.IpcRendererEvent, segment: unknown) => cb(segment)
    ipcRenderer.on(IPC.TRANSCRIPT_UPDATE, handler)
    return () => ipcRenderer.removeListener(IPC.TRANSCRIPT_UPDATE, handler)
  },

  // ── OCR ───────────────────────────────────────────────────────────────────
  captureScreen: () => ipcRenderer.invoke(IPC.SCREEN_CAPTURE),
  onOcrResult: (cb: (text: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, text: string) => cb(text)
    ipcRenderer.on(IPC.OCR_RESULT, handler)
    return () => ipcRenderer.removeListener(IPC.OCR_RESULT, handler)
  },

  // ── Knowledge Base ────────────────────────────────────────────────────────
  uploadDocument: (filePath: string) => ipcRenderer.invoke(IPC.UPLOAD_DOCUMENT, filePath),
  getDocuments: () => ipcRenderer.invoke(IPC.GET_DOCUMENTS),
  deleteDocument: (id: string) => ipcRenderer.invoke(IPC.DELETE_DOCUMENT, id),
  onDocumentIndexed: (cb: (doc: unknown) => void) => {
    const handler = (_: Electron.IpcRendererEvent, doc: unknown) => cb(doc)
    ipcRenderer.on(IPC.DOCUMENT_INDEXED, handler)
    return () => ipcRenderer.removeListener(IPC.DOCUMENT_INDEXED, handler)
  },

  // ── Post-meeting ──────────────────────────────────────────────────────────
  generateSummary: (data: unknown) => ipcRenderer.invoke(IPC.GENERATE_SUMMARY, data),
  generateEmail: (data: unknown) => ipcRenderer.invoke(IPC.GENERATE_EMAIL, data),
  exportMarkdown: (data: unknown) => ipcRenderer.invoke(IPC.EXPORT_MARKDOWN, data),

  // ── Settings ──────────────────────────────────────────────────────────────
  getSettings: () => ipcRenderer.invoke(IPC.GET_SETTINGS),
  saveSettings: (settings: unknown) => ipcRenderer.invoke(IPC.SAVE_SETTINGS, settings),

  // ── System ────────────────────────────────────────────────────────────────
  openFileDialog: (options: unknown) => ipcRenderer.invoke(IPC.OPEN_FILE_DIALOG, options),
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke(IPC.SHOW_NOTIFICATION, title, body),
  getAppVersion: () => ipcRenderer.invoke(IPC.GET_APP_VERSION),
  minimizeWindow: () => ipcRenderer.invoke(IPC.MINIMIZE_WINDOW),
  closeWindow: () => ipcRenderer.invoke(IPC.CLOSE_WINDOW),
})

// ─── Type declaration (used by renderer TypeScript) ───────────────────────────
export type BirdlyAPI = typeof import('./preload')
