import React, { useState } from 'react'
import { useAppStore } from '../stores/appStore'

export function PostMeeting() {
  const { transcript, summary, followUpEmail, setSummary, setFollowUpEmail, setStatus } =
    useAppStore()

  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false)
  const [activeView, setActiveView] = useState<'summary' | 'email' | 'transcript'>('summary')

  const fullTranscript = transcript.map((s) => s.text).join(' ')

  const handleGenerateSummary = async () => {
    if (!fullTranscript) {
      setStatus('No transcript available — start a session first', 'warning')
      return
    }
    setIsGeneratingSummary(true)
    setStatus('Generating summary…', 'info')
    try {
      const result = await window.birdly?.generateSummary({ transcript: fullTranscript })
      if (result?.success && result.text) {
        setSummary(result.text)
        setStatus('Summary generated!', 'success')
      } else {
        setStatus(`Summary failed: ${result?.error || 'Unknown'}`, 'error')
      }
    } catch (err) {
      setStatus(`Error: ${err}`, 'error')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const handleGenerateEmail = async () => {
    if (!fullTranscript && !summary) {
      setStatus('No transcript or summary available', 'warning')
      return
    }
    setIsGeneratingEmail(true)
    setStatus('Drafting follow-up email…', 'info')
    try {
      const result = await window.birdly?.generateEmail({
        transcript: fullTranscript,
        summary: summary || 'No summary available',
      })
      if (result?.success && result.text) {
        setFollowUpEmail(result.text)
        setStatus('Follow-up email drafted!', 'success')
      } else {
        setStatus(`Email generation failed: ${result?.error || 'Unknown'}`, 'error')
      }
    } catch (err) {
      setStatus(`Error: ${err}`, 'error')
    } finally {
      setIsGeneratingEmail(false)
    }
  }

  const handleExportMarkdown = async () => {
    const content = [
      '# Birdly Meeting Notes',
      '',
      `**Date:** ${new Date().toLocaleString()}`,
      '',
      summary ? `## Summary\n\n${summary}` : '',
      '',
      followUpEmail ? `## Follow-Up Email Draft\n\n${followUpEmail}` : '',
      '',
      fullTranscript ? `## Full Transcript\n\n${fullTranscript}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const filename = `birdly-notes-${new Date().toISOString().slice(0, 10)}.md`
    const result = await window.birdly?.exportMarkdown({ content, filename })
    if (result?.success) {
      setStatus(`Exported to ${result.filePath}`, 'success')
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setStatus('Copied to clipboard', 'success')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6">
      <div className="shrink-0 mb-4">
        <h1 className="text-xl font-bold text-white mb-1">Post-Meeting Tools</h1>
        <p className="text-sm text-dark-400">
          Generate summaries, action items, and follow-up emails from your session transcript.
        </p>
      </div>

      {/* Action buttons */}
      <div className="shrink-0 flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleGenerateSummary}
          disabled={isGeneratingSummary || !fullTranscript}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-600/20 text-brand-300 border border-brand-500/30 hover:bg-brand-600/30 transition-all-fast disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isGeneratingSummary ? (
            <span className="w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>📋</span>
          )}
          Generate Summary
        </button>

        <button
          onClick={handleGenerateEmail}
          disabled={isGeneratingEmail || (!fullTranscript && !summary)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-accent-purple/20 text-purple-300 border border-purple-500/30 hover:bg-accent-purple/30 transition-all-fast disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isGeneratingEmail ? (
            <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>✉️</span>
          )}
          Draft Email
        </button>

        <button
          onClick={handleExportMarkdown}
          disabled={!summary && !fullTranscript}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-dark-700 text-dark-200 border border-white/5 hover:bg-dark-600 transition-all-fast disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>⬇️</span>
          Export Markdown
        </button>
      </div>

      {/* Tab switcher */}
      <div className="shrink-0 flex gap-1 mb-4 bg-dark-900/60 rounded-xl p-1 w-fit">
        {(['summary', 'email', 'transcript'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveView(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all-fast capitalize ${
              activeView === tab
                ? 'bg-dark-700 text-white'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            {tab === 'email' ? 'Follow-up Email' : tab}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden rounded-xl border border-white/5 bg-dark-900/30">
        {activeView === 'summary' && (
          <ContentPane
            content={summary}
            placeholder="Click 'Generate Summary' to create meeting notes with action items."
            onCopy={() => handleCopy(summary)}
          />
        )}
        {activeView === 'email' && (
          <ContentPane
            content={followUpEmail}
            placeholder="Click 'Draft Email' to generate a professional follow-up email."
            onCopy={() => handleCopy(followUpEmail)}
          />
        )}
        {activeView === 'transcript' && (
          <ContentPane
            content={fullTranscript}
            placeholder="No transcript available. Start a session to record audio."
            onCopy={() => handleCopy(fullTranscript)}
          />
        )}
      </div>
    </div>
  )
}

function ContentPane({
  content,
  placeholder,
  onCopy,
}: {
  content: string
  placeholder: string
  onCopy: () => void
}) {
  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-3xl mb-3">📄</div>
        <p className="text-dark-500 text-sm">{placeholder}</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex justify-end p-2 border-b border-white/5">
        <button
          onClick={onCopy}
          className="text-xs text-dark-500 hover:text-dark-300 px-2 py-1 rounded hover:bg-white/5 transition-all-fast"
        >
          📋 Copy
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="text-sm text-dark-100 whitespace-pre-wrap font-sans selectable leading-relaxed">
          {content}
        </pre>
      </div>
    </div>
  )
}
