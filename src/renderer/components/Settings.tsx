import React, { useState, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import { AppSettings, ROLE_TEMPLATES, RoleTemplate, DEFAULT_SETTINGS } from '@shared/types'

export function Settings() {
  const { settings, setSettings, availableModels, setAvailableModels, setStatus } = useAppStore()
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings })
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setLocalSettings({ ...settings })
  }, [settings])

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleFetchModels = async () => {
    setIsFetchingModels(true)
    try {
      const result = await window.birdly?.getModels()
      if (result?.success) {
        const names = result.models.map((m: { name: string }) => m.name)
        setAvailableModels(names)
        setStatus(`Found ${names.length} Ollama models`, 'success')
      } else {
        setStatus(`Could not reach Ollama: ${result?.error}`, 'error')
      }
    } finally {
      setIsFetchingModels(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // If custom template, use local system prompt; else use template
      const finalSettings =
        localSettings.roleTemplate !== 'custom'
          ? {
              ...localSettings,
              systemPrompt: ROLE_TEMPLATES[localSettings.roleTemplate].prompt,
            }
          : localSettings

      const result = await window.birdly?.saveSettings(finalSettings)
      if (result?.success) {
        setSettings(finalSettings)
        setStatus('Settings saved!', 'success')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setLocalSettings({ ...DEFAULT_SETTINGS })
    setStatus('Settings reset to defaults', 'info')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 p-6 pb-4 border-b border-white/5">
        <h1 className="text-xl font-bold text-white mb-1">Settings</h1>
        <p className="text-sm text-dark-400">Configure Birdly to match your workflow.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* ── Ollama / LLM ──────────────────────────────────────────────────── */}
        <Section title="🤖 AI Model (Ollama)">
          <Field label="Ollama URL" description="Default: http://localhost:11434">
            <input
              type="text"
              value={localSettings.ollamaUrl}
              onChange={(e) => update('ollamaUrl', e.target.value)}
              className="input"
              placeholder="http://localhost:11434"
            />
          </Field>

          <Field label="Model" description="Run 'ollama list' to see available models">
            <div className="flex gap-2">
              <select
                value={localSettings.selectedModel}
                onChange={(e) => update('selectedModel', e.target.value)}
                className="input flex-1"
              >
                {availableModels.length > 0 ? (
                  availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))
                ) : (
                  <option value={localSettings.selectedModel}>{localSettings.selectedModel}</option>
                )}
              </select>
              <button
                onClick={handleFetchModels}
                disabled={isFetchingModels}
                className="btn-secondary shrink-0"
              >
                {isFetchingModels ? '⟳' : '↻ Refresh'}
              </button>
            </div>
          </Field>

          <Field label="Temperature" description={`${localSettings.temperature.toFixed(2)} (0 = deterministic, 1 = creative)`}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localSettings.temperature}
              onChange={(e) => update('temperature', parseFloat(e.target.value))}
              className="w-full accent-brand-500"
            />
          </Field>

          <Field label="Max Tokens" description="Maximum response length">
            <input
              type="number"
              min="64"
              max="4096"
              step="64"
              value={localSettings.maxTokens}
              onChange={(e) => update('maxTokens', parseInt(e.target.value))}
              className="input w-32"
            />
          </Field>

          <Field label="Streaming" description="Show suggestions word-by-word">
            <Toggle
              value={localSettings.streamResponses}
              onChange={(v) => update('streamResponses', v)}
            />
          </Field>
        </Section>

        {/* ── Role / Prompt ─────────────────────────────────────────────────── */}
        <Section title="🎭 Coaching Role">
          <Field label="Role Template" description="Pre-built system prompts for common use cases">
            <select
              value={localSettings.roleTemplate}
              onChange={(e) => update('roleTemplate', e.target.value as RoleTemplate)}
              className="input"
            >
              {(Object.keys(ROLE_TEMPLATES) as RoleTemplate[]).map((key) => (
                <option key={key} value={key}>
                  {ROLE_TEMPLATES[key].label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="System Prompt"
            description={
              localSettings.roleTemplate !== 'custom'
                ? 'Auto-set by role template (select Custom to edit)'
                : 'Write your own coaching instructions'
            }
          >
            <textarea
              value={
                localSettings.roleTemplate !== 'custom'
                  ? ROLE_TEMPLATES[localSettings.roleTemplate].prompt
                  : localSettings.systemPrompt
              }
              onChange={(e) => update('systemPrompt', e.target.value)}
              disabled={localSettings.roleTemplate !== 'custom'}
              rows={6}
              className="input resize-none font-mono text-xs selectable disabled:opacity-50"
            />
          </Field>
        </Section>

        {/* ── Overlay ───────────────────────────────────────────────────────── */}
        <Section title="👁 Overlay">
          <Field label="Opacity" description={`${localSettings.overlayOpacity}%`}>
            <input
              type="range"
              min="30"
              max="100"
              step="5"
              value={localSettings.overlayOpacity}
              onChange={(e) => update('overlayOpacity', parseInt(e.target.value))}
              className="w-full accent-brand-500"
            />
          </Field>

          <Field label="Global Hotkey" description="Toggle overlay visibility">
            <input
              type="text"
              value={localSettings.hotkey}
              onChange={(e) => update('hotkey', e.target.value)}
              className="input w-64"
              placeholder="CommandOrControl+Shift+B"
            />
          </Field>
        </Section>

        {/* ── Features ──────────────────────────────────────────────────────── */}
        <Section title="⚙️ Features">
          <Field label="Speech-to-Text" description="Capture and transcribe microphone audio">
            <Toggle value={localSettings.sttEnabled} onChange={(v) => update('sttEnabled', v)} />
          </Field>

          <Field label="OCR (Screen Capture)" description="Read text from your screen">
            <Toggle value={localSettings.ocrEnabled} onChange={(v) => update('ocrEnabled', v)} />
          </Field>

          <Field label="RAG (Knowledge Base)" description="Include document context in AI prompts">
            <Toggle value={localSettings.ragEnabled} onChange={(v) => update('ragEnabled', v)} />
          </Field>

          <Field label="Auto Record" description="Automatically record audio when session starts">
            <Toggle value={localSettings.autoRecord} onChange={(v) => update('autoRecord', v)} />
          </Field>
        </Section>

        {/* ── Privacy ───────────────────────────────────────────────────────── */}
        <Section title="🔒 Privacy">
          <div className="p-4 rounded-xl bg-dark-800/40 border border-white/5 space-y-2">
            <PrivacyItem icon="✅" text="All AI processing runs locally via Ollama" />
            <PrivacyItem icon="✅" text="No telemetry, analytics, or data collection" />
            <PrivacyItem icon="✅" text="Documents stored only in your local app data folder" />
            <PrivacyItem icon="✅" text="Overlay hidden from screen sharing (setContentProtection)" />
            <PrivacyItem icon="✅" text="100% open source — inspect every line of code" />
          </div>
        </Section>
      </div>

      {/* Save / Reset */}
      <div className="shrink-0 p-6 pt-4 border-t border-white/5 flex gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-500 transition-all-fast disabled:opacity-60"
        >
          {isSaving ? (
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : null}
          Save Settings
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2.5 rounded-xl text-sm text-dark-400 hover:text-white hover:bg-white/5 transition-all-fast"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-white mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="shrink-0 w-48">
        <p className="text-sm font-medium text-dark-200">{label}</p>
        {description && <p className="text-xs text-dark-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        value ? 'bg-brand-600' : 'bg-dark-600'
      }`}
    >
      <span
        className={`inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-1 ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function PrivacyItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-dark-300">
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  )
}

