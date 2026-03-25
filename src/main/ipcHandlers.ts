import {
  ipcMain,
  dialog,
  app,
  Notification,
  desktopCapturer,
  BrowserWindow,
} from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { join, extname } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { WindowManager } from './windowManager'
import { IPC, AppSettings, DEFAULT_SETTINGS, KnowledgeDocument, TranscriptSegment } from '../shared/types'

// ─── Lazy-loaded services ─────────────────────────────────────────────────────
let ollamaClient: typeof import('ollama') | null = null
let tesseractWorker: import('tesseract.js').Worker | null = null

const getOllama = async () => {
  if (!ollamaClient) {
    ollamaClient = await import('ollama')
  }
  return ollamaClient
}

// ─── Data directory ───────────────────────────────────────────────────────────
const dataDir = join(app.getPath('userData'), 'birdly-data')
const settingsPath = join(dataDir, 'settings.json')
const docsPath = join(dataDir, 'documents.json')
const vectorsPath = join(dataDir, 'vectors.json')

function ensureDataDir() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
}

// ─── Settings helpers ─────────────────────────────────────────────────────────
async function loadSettings(): Promise<AppSettings> {
  try {
    ensureDataDir()
    if (!existsSync(settingsPath)) return { ...DEFAULT_SETTINGS }
    const raw = await readFile(settingsPath, 'utf-8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

async function saveSettingsToDisk(settings: AppSettings) {
  ensureDataDir()
  await writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
}

// ─── Document store helpers ───────────────────────────────────────────────────
async function loadDocuments(): Promise<KnowledgeDocument[]> {
  try {
    ensureDataDir()
    if (!existsSync(docsPath)) return []
    const raw = await readFile(docsPath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function saveDocuments(docs: KnowledgeDocument[]) {
  ensureDataDir()
  await writeFile(docsPath, JSON.stringify(docs, null, 2), 'utf-8')
}

// ─── Text extraction ──────────────────────────────────────────────────────────
async function extractText(filePath: string, ext: string): Promise<string> {
  const buf = await readFile(filePath)

  if (ext === '.txt' || ext === '.md') {
    return buf.toString('utf-8')
  }

  if (ext === '.pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buf)
      return data.text
    } catch (e) {
      throw new Error(`PDF parse failed: ${e}`)
    }
  }

  if (ext === '.docx') {
    try {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer: buf })
      return result.value
    } catch (e) {
      throw new Error(`DOCX parse failed: ${e}`)
    }
  }

  throw new Error(`Unsupported file type: ${ext}`)
}

// ─── Simple cosine similarity ─────────────────────────────────────────────────
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10)
}

// ─── Simple chunk splitter ────────────────────────────────────────────────────
function chunkText(text: string, size = 512, overlap = 64): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += size - overlap) {
    chunks.push(words.slice(i, i + size).join(' '))
    if (i + size >= words.length) break
  }
  return chunks
}

// ─── Vector store (in-memory + persisted JSON) ────────────────────────────────
interface VectorEntry {
  docId: string
  chunk: string
  embedding: number[]
}

let vectorStore: VectorEntry[] = []

async function loadVectors() {
  try {
    if (existsSync(vectorsPath)) {
      const raw = await readFile(vectorsPath, 'utf-8')
      vectorStore = JSON.parse(raw)
    }
  } catch {
    vectorStore = []
  }
}

async function saveVectors() {
  ensureDataDir()
  await writeFile(vectorsPath, JSON.stringify(vectorStore), 'utf-8')
}

async function embedText(text: string): Promise<number[]> {
  try {
    const { pipeline } = await import('@xenova/transformers')
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    const output = await embedder(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data as Float32Array)
  } catch {
    // Fallback: simple hash-based pseudo-embedding (not useful for RAG, but won't crash)
    return Array.from({ length: 384 }, () => Math.random() - 0.5)
  }
}

async function searchVectors(query: string, topK = 5): Promise<string[]> {
  if (vectorStore.length === 0) return []
  const queryEmbedding = await embedText(query)
  const scored = vectorStore.map((v) => ({
    chunk: v.chunk,
    score: cosineSimilarity(queryEmbedding, v.embedding),
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK).map((s) => s.chunk)
}

// ─── Setup all IPC handlers ───────────────────────────────────────────────────
export function setupIpcHandlers(wm: WindowManager) {
  // Load persisted data
  loadVectors()

  // ── Overlay ──────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.TOGGLE_OVERLAY, () => {
    wm.toggleOverlay()
    return wm.isOverlayVisible()
  })

  // ── Models ───────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.GET_MODELS, async () => {
    try {
      const { Ollama } = await getOllama()
      const settings = await loadSettings()
      const client = new Ollama({ host: settings.ollamaUrl })
      const response = await client.list()
      return { success: true, models: response.models }
    } catch (err) {
      return { success: false, models: [], error: String(err) }
    }
  })

  // ── AI Suggestion ─────────────────────────────────────────────────────────
  ipcMain.handle(
    IPC.GET_SUGGESTION,
    async (
      _event,
      context: {
        transcript: string
        screenText: string
        ragContext: string
        prompt?: string
      }
    ) => {
      try {
        const settings = await loadSettings()
        const { Ollama } = await getOllama()
        const client = new Ollama({ host: settings.ollamaUrl })

        // Pull relevant RAG context
        const ragChunks = settings.ragEnabled
          ? await searchVectors(context.transcript || context.screenText || 'general')
          : []
        const ragContext = ragChunks.join('\n\n---\n\n')

        const userMessage = [
          context.transcript ? `## Live Conversation:\n${context.transcript}` : '',
          context.screenText ? `## Screen Content:\n${context.screenText}` : '',
          ragContext ? `## Relevant Knowledge:\n${ragContext}` : '',
          context.prompt || 'Provide a concise, actionable suggestion for right now.',
        ]
          .filter(Boolean)
          .join('\n\n')

        if (settings.streamResponses) {
          const stream = await client.chat({
            model: settings.selectedModel,
            messages: [
              { role: 'system', content: settings.systemPrompt },
              { role: 'user', content: userMessage },
            ],
            stream: true,
            options: {
              num_predict: settings.maxTokens,
              temperature: settings.temperature,
            },
          })

          let fullText = ''
          for await (const chunk of stream) {
            const token = chunk.message?.content || ''
            fullText += token
            wm.sendToOverlay(IPC.SUGGESTION_CHUNK, token)
            wm.sendToMain(IPC.SUGGESTION_CHUNK, token)
          }
          wm.sendToOverlay(IPC.SUGGESTION_DONE)
          wm.sendToMain(IPC.SUGGESTION_DONE)
          return { success: true, text: fullText }
        } else {
          const response = await client.chat({
            model: settings.selectedModel,
            messages: [
              { role: 'system', content: settings.systemPrompt },
              { role: 'user', content: userMessage },
            ],
            options: {
              num_predict: settings.maxTokens,
              temperature: settings.temperature,
            },
          })
          return { success: true, text: response.message.content }
        }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── OCR / Screen capture ─────────────────────────────────────────────────
  ipcMain.handle(IPC.SCREEN_CAPTURE, async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
      })

      if (sources.length === 0) return { success: false, text: '' }

      const source = sources[0]
      const imageBuffer = source.thumbnail.toPNG()

      // Run OCR via tesseract.js
      // Language is driven by settings.language; 'auto' defaults to English
      const { createWorker } = await import('tesseract.js')
      const settings = await loadSettings()
      const ocrLang = settings.language === 'auto' ? 'eng' : settings.language
      if (!tesseractWorker) {
        tesseractWorker = await createWorker(ocrLang)
      }

      const { data } = await tesseractWorker.recognize(imageBuffer)
      const text = data.text.trim()

      wm.sendToOverlay(IPC.OCR_RESULT, text)
      wm.sendToMain(IPC.OCR_RESULT, text)

      return { success: true, text }
    } catch (err) {
      return { success: false, text: '', error: String(err) }
    }
  })

  // ── Knowledge Base ────────────────────────────────────────────────────────
  ipcMain.handle(IPC.UPLOAD_DOCUMENT, async (_event, filePath: string) => {
    try {
      const ext = extname(filePath).toLowerCase()
      const supported = ['.pdf', '.txt', '.docx', '.md']
      if (!supported.includes(ext)) {
        return { success: false, error: `Unsupported file type: ${ext}` }
      }

      const content = await extractText(filePath, ext)
      const docs = await loadDocuments()

      const doc: KnowledgeDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: filePath.split('/').pop() || filePath.split('\\').pop() || 'Unknown',
        type: ext.slice(1) as KnowledgeDocument['type'],
        content,
        uploadedAt: new Date().toISOString(),
        size: content.length,
      }

      docs.push(doc)
      await saveDocuments(docs)

      // Index into vector store (async, non-blocking)
      indexDocumentAsync(doc, wm)

      return { success: true, document: doc }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.GET_DOCUMENTS, async () => {
    const docs = await loadDocuments()
    return { success: true, documents: docs }
  })

  ipcMain.handle(IPC.DELETE_DOCUMENT, async (_event, id: string) => {
    const docs = await loadDocuments()
    const filtered = docs.filter((d) => d.id !== id)
    await saveDocuments(filtered)
    // Remove from vector store
    vectorStore = vectorStore.filter((v) => v.docId !== id)
    await saveVectors()
    return { success: true }
  })

  // ── Post-meeting ──────────────────────────────────────────────────────────
  ipcMain.handle(IPC.GENERATE_SUMMARY, async (_event, data: { transcript: string }) => {
    try {
      const settings = await loadSettings()
      const { Ollama } = await getOllama()
      const client = new Ollama({ host: settings.ollamaUrl })

      const response = await client.chat({
        model: settings.selectedModel,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert meeting summarizer. Create concise summaries with clear action items.',
          },
          {
            role: 'user',
            content: `Please summarize this meeting transcript and list all action items:\n\n${data.transcript}`,
          },
        ],
        options: { num_predict: 1024, temperature: 0.3 },
      })

      return { success: true, text: response.message.content }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(
    IPC.GENERATE_EMAIL,
    async (_event, data: { transcript: string; summary: string }) => {
      try {
        const settings = await loadSettings()
        const { Ollama } = await getOllama()
        const client = new Ollama({ host: settings.ollamaUrl })

        const response = await client.chat({
          model: settings.selectedModel,
          messages: [
            {
              role: 'system',
              content:
                'You are a professional email writer. Write clear, concise follow-up emails.',
            },
            {
              role: 'user',
              content: `Write a professional follow-up email based on this meeting:\n\nSummary: ${data.summary}\n\nFull transcript: ${data.transcript}`,
            },
          ],
          options: { num_predict: 1024, temperature: 0.4 },
        })

        return { success: true, text: response.message.content }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  ipcMain.handle(IPC.EXPORT_MARKDOWN, async (_event, data: { content: string; filename: string }) => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: data.filename || 'birdly-notes.md',
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })
    if (!filePath) return { success: false }
    await writeFile(filePath, data.content, 'utf-8')
    return { success: true, filePath }
  })

  // ── Settings ──────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.GET_SETTINGS, async () => {
    const settings = await loadSettings()
    return { success: true, settings }
  })

  ipcMain.handle(IPC.SAVE_SETTINGS, async (_event, settings: AppSettings) => {
    await saveSettingsToDisk(settings)
    return { success: true }
  })

  // ── System ────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.OPEN_FILE_DIALOG, async (_event, options: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'txt', 'docx', 'md'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      ...options,
    })
    return result
  })

  ipcMain.handle(IPC.SHOW_NOTIFICATION, (_event, title: string, body: string) => {
    new Notification({ title, body }).show()
  })

  ipcMain.handle(IPC.GET_APP_VERSION, () => app.getVersion())

  ipcMain.handle(IPC.MINIMIZE_WINDOW, (_event) => {
    const win = BrowserWindow.fromWebContents(_event.sender)
    win?.minimize()
  })

  ipcMain.handle(IPC.CLOSE_WINDOW, (_event) => {
    const win = BrowserWindow.fromWebContents(_event.sender)
    // Main window: hide instead of close (keep in tray)
    if (win === wm.mainWindow) {
      win?.hide()
    } else {
      win?.close()
    }
  })
}

// ─── Async document indexing ──────────────────────────────────────────────────
async function indexDocumentAsync(doc: KnowledgeDocument, wm: WindowManager) {
  try {
    const chunks = chunkText(doc.content)
    const newEntries: VectorEntry[] = []

    for (const chunk of chunks) {
      const embedding = await embedText(chunk)
      newEntries.push({ docId: doc.id, chunk, embedding })
    }

    vectorStore.push(...newEntries)
    await saveVectors()

    wm.sendToMain(IPC.DOCUMENT_INDEXED, { id: doc.id, chunkCount: newEntries.length })
  } catch (err) {
    console.error('[Birdly] Indexing failed:', err)
  }
}
