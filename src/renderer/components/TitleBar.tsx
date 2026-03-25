import React from 'react'
import { useAppStore } from '../stores/appStore'

export function TitleBar() {
  const { overlayVisible, setStatus } = useAppStore()

  const handleMinimize = async () => {
    await window.birdly?.minimizeWindow()
  }

  const handleClose = async () => {
    await window.birdly?.closeWindow()
  }

  const handleToggleOverlay = async () => {
    const visible = await window.birdly?.toggleOverlay()
    setStatus(visible ? 'Overlay shown' : 'Overlay hidden', 'info')
  }

  return (
    <div className="titlebar-drag flex items-center justify-between h-10 px-4 border-b border-white/5 bg-dark-950/80 shrink-0">
      {/* Left: App brand */}
      <div className="titlebar-no-drag flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-400 to-accent-purple flex items-center justify-center">
          <span className="text-xs font-bold text-white">B</span>
        </div>
        <span className="text-sm font-semibold text-white/90 tracking-wide">Birdly</span>
        <span className="text-xs text-dark-400 ml-1">AI Coach</span>
      </div>

      {/* Right: controls */}
      <div className="titlebar-no-drag flex items-center gap-2">
        {/* Overlay toggle */}
        <button
          onClick={handleToggleOverlay}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all-fast ${
            overlayVisible
              ? 'bg-brand-600/30 text-brand-300 border border-brand-500/30'
              : 'text-dark-400 hover:text-white hover:bg-white/5'
          }`}
          title="Toggle Overlay (Ctrl+Shift+B)"
        >
          <span>{overlayVisible ? '👁 Overlay On' : '👁 Overlay Off'}</span>
        </button>

        {/* Window controls */}
        <button
          onClick={handleMinimize}
          className="w-7 h-7 rounded-md flex items-center justify-center text-dark-400 hover:text-white hover:bg-white/5 transition-all-fast"
        >
          —
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-7 rounded-md flex items-center justify-center text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all-fast"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
