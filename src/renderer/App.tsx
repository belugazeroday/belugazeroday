import React, { useEffect, useCallback } from 'react'
import { useAppStore } from './stores/appStore'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { KnowledgeBase } from './components/KnowledgeBase'
import { PostMeeting } from './components/PostMeeting'
import { Settings } from './components/Settings'
import { StatusBar } from './components/StatusBar'
import { TranscriptSegment } from '@shared/types'

export default function App() {
  const {
    activeTab,
    setOverlayVisible,
    addTranscriptSegment,
    setScreenText,
    appendSuggestionChunk,
    finalizeSuggestion,
    setSettings,
    setDocuments,
    setAvailableModels,
    setStatus,
  } = useAppStore()

  // ── Bootstrap: load settings + documents + models ──────────────────────────
  useEffect(() => {
    const bootstrap = async () => {
      if (!window.birdly) return

      try {
        const [settingsRes, docsRes, modelsRes] = await Promise.allSettled([
          window.birdly.getSettings(),
          window.birdly.getDocuments(),
          window.birdly.getModels(),
        ])

        if (settingsRes.status === 'fulfilled' && settingsRes.value.success) {
          setSettings(settingsRes.value.settings)
        }
        if (docsRes.status === 'fulfilled' && docsRes.value.success) {
          setDocuments(docsRes.value.documents)
        }
        if (modelsRes.status === 'fulfilled' && modelsRes.value.success) {
          setAvailableModels(modelsRes.value.models.map((m) => m.name))
        }
      } catch (err) {
        console.error('[Birdly] Bootstrap error:', err)
      }
    }

    bootstrap()
  }, [setSettings, setDocuments, setAvailableModels])

  // ── IPC listeners ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!window.birdly) return

    const cleanups = [
      window.birdly.onOverlayVisible((visible) => setOverlayVisible(visible)),
      window.birdly.onTranscriptUpdate((seg) => addTranscriptSegment(seg as TranscriptSegment)),
      window.birdly.onOcrResult((text) => setScreenText(text)),
      window.birdly.onSuggestionChunk((chunk) => appendSuggestionChunk(chunk)),
      window.birdly.onSuggestionDone(() => finalizeSuggestion()),
      window.birdly.onDocumentIndexed((doc) => {
        const d = doc as { id: string; chunkCount: number }
        setStatus(`Document indexed (${d.chunkCount} chunks)`, 'success')
      }),
    ]

    return () => cleanups.forEach((cleanup) => cleanup())
  }, [setOverlayVisible, addTranscriptSegment, setScreenText, appendSuggestionChunk, finalizeSuggestion, setStatus])

  return (
    <div className="flex flex-col h-screen bg-dark-950 text-white overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'knowledge' && <KnowledgeBase />}
          {activeTab === 'post-meeting' && <PostMeeting />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>
      <StatusBar />
    </div>
  )
}
