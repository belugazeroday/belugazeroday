import React from 'react'
import { useAppStore } from '../stores/appStore'

export function StatusBar() {
  const { statusMessage, statusType, sessionActive, sessionStartTime, transcript } = useAppStore()

  const elapsed = sessionActive && sessionStartTime
    ? Math.floor((Date.now() - sessionStartTime) / 1000)
    : 0

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const statusColors = {
    info: 'text-dark-400',
    success: 'text-accent-green',
    error: 'text-red-400',
    warning: 'text-accent-amber',
  }

  return (
    <div className="h-7 flex items-center justify-between px-4 border-t border-white/5 bg-dark-950/80 shrink-0 text-xs">
      <div className="flex items-center gap-3">
        {/* Session status */}
        <div className="flex items-center gap-1.5">
          <div className={`status-dot ${sessionActive ? 'active' : 'inactive'}`} />
          <span className="text-dark-400">
            {sessionActive ? `Recording ${formatTime(elapsed)}` : 'Idle'}
          </span>
        </div>
        {sessionActive && (
          <span className="text-dark-500">
            {transcript.length} segments
          </span>
        )}
      </div>

      {/* Status message */}
      {statusMessage && (
        <span className={`${statusColors[statusType]} truncate max-w-xs`}>
          {statusMessage}
        </span>
      )}

      <div className="flex items-center gap-2 text-dark-600">
        <span>Birdly v1.0.0</span>
      </div>
    </div>
  )
}
