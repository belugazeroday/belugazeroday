import React, { useState } from 'react'
import { Suggestion } from '@shared/types'

interface FloatingWidgetProps {
  suggestions: Suggestion[]
  currentChunk: string
  isGenerating: boolean
  opacity: number
  modelName: string
  onRequestSuggestion: () => void
  onDismiss: (id: string) => void
}

export function FloatingWidget({
  suggestions,
  currentChunk,
  isGenerating,
  opacity,
  modelName,
  onRequestSuggestion,
  onDismiss,
}: FloatingWidgetProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'suggestions' | 'recent'>('suggestions')

  const alpha = opacity / 100

  const latestSuggestion = currentChunk || (suggestions.length > 0 ? suggestions[0].text : null)

  return (
    <div
      className="no-drag w-full h-full flex flex-col"
      style={{ opacity: alpha }}
    >
      {/* ── Header / drag handle ────────────────────────────────────────────── */}
      <div
        className="drag-handle flex items-center justify-between px-3 py-2 rounded-t-xl"
        style={{
          background: 'rgba(10, 10, 10, 0.92)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="no-drag flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: 'linear-gradient(135deg, #38bdf8, #a855f7)', fontSize: '9px' }}
          >
            B
          </div>
          <span className="text-white/80 text-xs font-semibold tracking-wide">Birdly</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontSize: '10px' }}
          >
            {modelName.split(':')[0]}
          </span>
        </div>

        <div className="no-drag flex items-center gap-1.5">
          {isGenerating && (
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: '#22c55e' }}
            />
          )}
          <button
            onClick={onRequestSuggestion}
            disabled={isGenerating}
            className="text-xs px-2 py-1 rounded transition-all"
            style={{
              background: 'rgba(56,189,248,0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56,189,248,0.2)',
            }}
            title="Get AI suggestion"
          >
            ✨
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-xs px-2 py-1 rounded transition-all"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      {!collapsed && (
        <div
          className="flex-1 flex flex-col overflow-hidden rounded-b-xl"
          style={{
            background: 'rgba(10, 10, 10, 0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Tab bar */}
          <div
            className="flex gap-1 px-3 py-2"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            {(['suggestions', 'recent'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="no-drag text-xs px-3 py-1 rounded-lg capitalize transition-all"
                style={
                  activeTab === tab
                    ? { background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }
                    : { color: 'rgba(255,255,255,0.3)' }
                }
              >
                {tab === 'recent' ? 'History' : tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeTab === 'suggestions' && (
              <>
                {/* Streaming chunk */}
                {currentChunk && (
                  <div
                    className="rounded-xl p-3 text-xs selectable leading-relaxed animate-fade-in"
                    style={{
                      background: 'rgba(56,189,248,0.08)',
                      border: '1px solid rgba(56,189,248,0.2)',
                      color: 'rgba(240,240,240,0.95)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ background: '#38bdf8' }}
                      />
                      <span style={{ color: '#38bdf8', fontSize: '10px' }}>Generating…</span>
                    </div>
                    {currentChunk}
                  </div>
                )}

                {/* Latest suggestion (big) */}
                {!currentChunk && suggestions.length > 0 && (
                  <div
                    className="rounded-xl p-3 text-xs selectable leading-relaxed"
                    style={{
                      background: 'rgba(168,85,247,0.08)',
                      border: '1px solid rgba(168,85,247,0.15)',
                      color: 'rgba(240,240,240,0.95)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex-1">{suggestions[0].text}</p>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => navigator.clipboard.writeText(suggestions[0].text)}
                          style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}
                        >
                          📋
                        </button>
                        <button
                          onClick={() => onDismiss(suggestions[0].id)}
                          style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!currentChunk && suggestions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <span style={{ fontSize: '24px' }}>🤖</span>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '8px' }}>
                      Start a session and click ✨ for suggestions
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'recent' && (
              <>
                {suggestions.slice(1).map((sug) => (
                  <div
                    key={sug.id}
                    className="rounded-lg p-2.5 text-xs selectable leading-relaxed group"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: 'rgba(200,200,200,0.8)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="flex-1">{sug.text}</p>
                      <button
                        onClick={() => onDismiss(sug.id)}
                        style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', marginTop: '-2px' }}
                      >
                        ✕
                      </button>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', marginTop: '4px' }}>
                      {new Date(sug.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
                {suggestions.length <= 1 && (
                  <p
                    className="text-center py-6"
                    style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}
                  >
                    No history yet
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
