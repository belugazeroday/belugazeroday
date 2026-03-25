import React, { useState, useEffect } from 'react'
import { FloatingWidget } from './components/FloatingWidget'
import { Suggestion, TranscriptSegment } from '@shared/types'
import '@shared/birdlyApi.d'

export default function OverlayApp() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [currentChunk, setCurrentChunk] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([])
  const [opacity, setOpacity] = useState(90)
  const [modelName, setModelName] = useState('llama3.2')

  // Load settings on mount
  useEffect(() => {
    window.birdly?.getSettings().then((res) => {
      if (res.success) {
        setOpacity(res.settings.overlayOpacity)
        setModelName(res.settings.selectedModel)
      }
    })
  }, [])

  // IPC listeners
  useEffect(() => {
    if (!window.birdly) return

    const cleanups = [
      window.birdly.onSuggestionChunk((chunk) => {
        setCurrentChunk((prev) => prev + chunk)
        setIsGenerating(true)
      }),
      window.birdly.onSuggestionDone(() => {
        setCurrentChunk((prev) => {
          const text = prev.trim()
          if (text) {
            setSuggestions((sug) =>
              [
                { id: `sug_${Date.now()}`, text, type: 'tip' as const, timestamp: Date.now() },
                ...sug,
              ].slice(0, 10)
            )
          }
          return ''
        })
        setIsGenerating(false)
      }),
      window.birdly.onTranscriptUpdate((seg) => {
        const s = seg as TranscriptSegment
        setTranscript((prev) => [...prev.slice(-20), s])
      }),
    ]

    return () => cleanups.forEach((c) => c())
  }, [])

  const handleRequestSuggestion = async () => {
    const recentText = transcript
      .slice(-5)
      .map((s) => s.text)
      .join(' ')
    if (!recentText) return
    await window.birdly?.getSuggestion({ transcript: recentText, screenText: '', ragContext: '' })
  }

  const handleDismiss = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <FloatingWidget
      suggestions={suggestions}
      currentChunk={currentChunk}
      isGenerating={isGenerating}
      opacity={opacity}
      modelName={modelName}
      onRequestSuggestion={handleRequestSuggestion}
      onDismiss={handleDismiss}
    />
  )
}
