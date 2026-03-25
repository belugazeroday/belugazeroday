import React from 'react'
import { useAppStore } from '../stores/appStore'

const NAV_ITEMS = [
  { id: 'dashboard', icon: '⚡', label: 'Live Session' },
  { id: 'knowledge', icon: '📚', label: 'Knowledge Base' },
  { id: 'post-meeting', icon: '📝', label: 'Post Meeting' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
] as const

export function Sidebar() {
  const { activeTab, setActiveTab, sessionActive, documents } = useAppStore()

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-white/5 bg-dark-900/60 py-4">
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all-fast text-left ${
                isActive
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-500/20'
                  : 'text-dark-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {/* Badges */}
              {item.id === 'dashboard' && sessionActive && (
                <span className="ml-auto w-2 h-2 rounded-full bg-accent-green animate-pulse-slow" />
              )}
              {item.id === 'knowledge' && documents.length > 0 && (
                <span className="ml-auto text-xs text-dark-400 bg-dark-700 px-1.5 py-0.5 rounded-full">
                  {documents.length}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom info */}
      <div className="px-4 mt-4 pt-4 border-t border-white/5">
        <div className="text-xs text-dark-500 space-y-1">
          <div className="flex items-center gap-1.5">
            <span>🔒</span>
            <span>100% local</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🚫</span>
            <span>No telemetry</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>⚡</span>
            <span>Free forever</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
