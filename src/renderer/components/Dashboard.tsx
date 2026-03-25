import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { TranscriptSegment } from '@shared/types'

export function Dashboard() {
  const {
    sessionActive,
    startSession,
    stopSession,
    transcript,
    screenText,
    suggestions,
    currentSuggestion,
    isGenerating,
    settings,
    setStatus,
    appendSuggestionChunk,
    finalizeSuggestion,
  } = useAppStore()

  const [isCapturingScreen, setIsCapturingScreen] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const screenCaptureInterval = useRef<NodeJS.Timeout | null>(null)
  const suggestionInterval = useRef<NodeJS.Timeout | null>(null)

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  // ── Start/Stop Session ────────────────────────────────────────────────────
  const handleToggleSession = useCallback(async () => {
    if (sessionActive) {
      // Stop
      mediaRecorder?.stop()
      setMediaRecorder(null)
      if (screenCaptureInterval.current) clearInterval(screenCaptureInterval.current)
      if (suggestionInterval.current) clearInterval(suggestionInterval.current)
      stopSession()
      setStatus('Session stopped', 'info')
    } else {
      // Start
      startSession()
      setStatus('Session started — listening…', 'success')

      // ── Microphone capture (for recording) ─────────────────────────────
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream)
        const chunks: Blob[] = []

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data)
            setAudioChunks([...chunks])
          }
        }

        recorder.start(1000) // 1-second chunks
        setMediaRecorder(recorder)
      } catch (err) {
        setStatus('Microphone access denied', 'warning')
      }

      // ── Periodic screen capture + OCR ──────────────────────────────────
      if (settings.ocrEnabled) {
        screenCaptureInterval.current = setInterval(async () => {
          try {
            setIsCapturingScreen(true)
            await window.birdly?.captureScreen()
            setIsCapturingScreen(false)
          } catch {
            setIsCapturingScreen(false)
          }
        }, 5000) // every 5 seconds
      }

      // ── Periodic AI suggestion ─────────────────────────────────────────
      suggestionInterval.current = setInterval(() => {
        triggerSuggestion()
      }, 15000) // every 15 seconds
    }
  }, [sessionActive, mediaRecorder, settings, startSession, stopSession, setStatus])

  const triggerSuggestion = useCallback(async () => {
    const state = useAppStore.getState()
    if (!state.sessionActive || state.isGenerating) return

    const recentTranscript = state.transcript
      .slice(-10)
      .map((s) => s.text)
      .join(' ')

    if (!recentTranscript && !state.screenText) return

    try {
      await window.birdly?.getSuggestion({
        transcript: recentTranscript,
        screenText: state.screenText,
        ragContext: '',
      })
    } catch (err) {
      console.error('[Birdly] Suggestion error:', err)
    }
  }, [])

  const handleManualSuggestion = () => triggerSuggestion()

  const latestSuggestion = suggestions[0]

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      {/* ── Left: Transcript + Controls ─────────────────────────────────────── */}
      <div className="flex flex-col w-1/2 border-r border-white/5 overflow-hidden">
        {/* Session controls */}
        <div className="shrink-0 p-4 border-b border-white/5 bg-dark-900/40">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSession}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                sessionActive
                  ? 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30'
                  : 'bg-brand-600 text-white hover:bg-brand-500 shadow-lg shadow-brand-900/40'
              }`}
            >
              {sessionActive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  Stop Session
                </>
              ) : (
                <>
                  <span>▶</span>
                  Start Session
                </>
              )}
            </button>

            {sessionActive && (
              <button
                onClick={handleManualSuggestion}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-dark-700 text-dark-200 hover:bg-dark-600 transition-all-fast disabled:opacity-50"
              >
                {isGenerating ? (
                  <span className="w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>✨</span>
                )}
                Get Suggestion
              </button>
            )}

            <div className="ml-auto flex items-center gap-2 text-xs text-dark-400">
              {settings.sttEnabled && (
                <span className="flex items-center gap-1">
                  <span className={`status-dot ${sessionActive ? 'active' : 'inactive'}`} />
                  STT
                </span>
              )}
              {settings.ocrEnabled && (
                <span className="flex items-center gap-1">
                  <span className={`status-dot ${isCapturingScreen ? 'processing' : sessionActive ? 'active' : 'inactive'}`} />
                  OCR
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {transcript.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-4">🎙️</div>
              <p className="text-dark-400 text-sm">
                {sessionActive ? 'Listening for speech…' : 'Start a session to begin transcribing'}
              </p>
              {!sessionActive && (
                <p className="text-dark-600 text-xs mt-2">
                  Birdly will capture your microphone and screen to provide real-time coaching
                </p>
              )}
            </div>
          ) : (
            <>
              {transcript.map((seg) => (
                <div
                  key={seg.id}
                  className={`text-sm selectable rounded-lg px-3 py-2 transition-all-fast ${
                    seg.isFinal
                      ? 'text-dark-100 bg-dark-800/50'
                      : 'text-dark-400 bg-dark-900/30 italic'
                  }`}
                >
                  <span className="text-dark-600 text-xs mr-2">
                    {new Date(seg.timestamp).toLocaleTimeString()}
                  </span>
                  {seg.text}
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </>
          )}
        </div>

        {/* Screen text preview */}
        {screenText && (
          <div className="shrink-0 border-t border-white/5 p-3 max-h-28 overflow-y-auto">
            <div className="text-xs text-dark-500 mb-1 flex items-center gap-1">
              <span>🖥</span> Screen OCR
            </div>
            <p className="text-xs text-dark-400 selectable line-clamp-4">{screenText}</p>
          </div>
        )}
      </div>

      {/* ── Right: AI Suggestions ────────────────────────────────────────────── */}
      <div className="flex flex-col w-1/2 overflow-hidden">
        <div className="shrink-0 p-4 border-b border-white/5 bg-dark-900/40">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>✨</span> AI Suggestions
            </h2>
            {suggestions.length > 0 && (
              <button
                onClick={() => useAppStore.getState().clearSuggestions()}
                className="text-xs text-dark-500 hover:text-dark-300 transition-all-fast"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-xs text-dark-500 mt-0.5">
            Model: <span className="text-brand-400">{settings.selectedModel}</span>
            {' · '}Role: <span className="text-accent-purple">{settings.roleTemplate}</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Currently streaming suggestion */}
          {currentSuggestion && (
            <div className="glass rounded-xl p-4 border-brand-500/20 glow-brand animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                <span className="text-xs font-medium text-brand-300">Generating…</span>
              </div>
              <p className="text-sm text-dark-100 selectable leading-relaxed">{currentSuggestion}</p>
            </div>
          )}

          {/* Past suggestions */}
          {suggestions.map((sug, i) => (
            <div
              key={sug.id}
              className={`rounded-xl p-4 border border-white/5 transition-all-fast hover:border-white/10 animate-fade-in ${
                i === 0 ? 'bg-dark-800/60' : 'bg-dark-900/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-dark-500">
                  {new Date(sug.timestamp).toLocaleTimeString()}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(sug.text)}
                  className="text-xs text-dark-600 hover:text-dark-300 transition-all-fast"
                  title="Copy to clipboard"
                >
                  📋
                </button>
              </div>
              <p className="text-sm text-dark-100 selectable leading-relaxed">{sug.text}</p>
            </div>
          ))}

          {suggestions.length === 0 && !currentSuggestion && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-4">🤖</div>
              <p className="text-dark-400 text-sm">
                {sessionActive
                  ? 'Waiting for enough context to generate suggestions…'
                  : 'Start a session to receive AI coaching'}
              </p>
              {sessionActive && (
                <p className="text-dark-600 text-xs mt-2">
                  Suggestions auto-generate every 15 seconds, or click "Get Suggestion"
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
