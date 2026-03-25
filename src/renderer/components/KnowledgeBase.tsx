import React, { useState, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { KnowledgeDocument } from '@shared/types'

const FILE_TYPES = ['.pdf', '.txt', '.docx', '.md']

export function KnowledgeBase() {
  const { documents, addDocument, removeDocument, setStatus } = useAppStore()
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingName, setUploadingName] = useState('')

  const uploadFile = useCallback(
    async (filePath: string) => {
      const name = filePath.split('/').pop() || filePath.split('\\').pop() || filePath
      setUploading(true)
      setUploadingName(name)
      setStatus(`Uploading ${name}…`, 'info')

      try {
        const result = await window.birdly?.uploadDocument(filePath)
        if (result?.success && result.document) {
          addDocument(result.document)
          setStatus(`${name} uploaded — indexing in background…`, 'success')
        } else {
          setStatus(`Upload failed: ${result?.error || 'Unknown error'}`, 'error')
        }
      } catch (err) {
        setStatus(`Upload error: ${err}`, 'error')
      } finally {
        setUploading(false)
        setUploadingName('')
      }
    },
    [addDocument, setStatus]
  )

  const handleBrowse = async () => {
    const result = await window.birdly?.openFileDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Documents', extensions: ['pdf', 'txt', 'docx', 'md'] }],
    })
    if (!result?.canceled && result?.filePaths) {
      for (const fp of result.filePaths) {
        await uploadFile(fp)
      }
    }
  }

  const handleDelete = async (doc: KnowledgeDocument) => {
    const result = await window.birdly?.deleteDocument(doc.id)
    if (result?.success) {
      removeDocument(doc.id)
      setStatus(`${doc.name} removed`, 'info')
    }
  }

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }
  const handleDragLeave = () => setIsDragOver(false)
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    // In Electron, files can be accessed via e.dataTransfer.files
    const files = Array.from(e.dataTransfer.files)
    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (FILE_TYPES.includes(ext)) {
        await uploadFile((file as File & { path?: string }).path || file.name)
      }
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      pdf: '📕',
      txt: '📄',
      docx: '📘',
      md: '📝',
    }
    return icons[type] || '📄'
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6">
      <div className="shrink-0 mb-6">
        <h1 className="text-xl font-bold text-white mb-1">Knowledge Base</h1>
        <p className="text-sm text-dark-400">
          Upload documents to give Birdly context about your products, company, or topics. All files
          are processed locally.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!uploading ? handleBrowse : undefined}
        className={`drop-zone shrink-0 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer mb-6 transition-all ${
          isDragOver ? 'drag-over' : ''
        } ${uploading ? 'opacity-60 cursor-not-allowed' : 'hover:border-dark-500'}`}
      >
        {uploading ? (
          <>
            <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-dark-300">Uploading {uploadingName}…</p>
          </>
        ) : (
          <>
            <div className="text-4xl">📂</div>
            <p className="text-sm font-medium text-dark-200">
              Drop files here or{' '}
              <span className="text-brand-400 underline underline-offset-2">browse</span>
            </p>
            <p className="text-xs text-dark-500">Supports PDF, TXT, DOCX, Markdown</p>
          </>
        )}
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-dark-500 text-sm">No documents yet</p>
            <p className="text-dark-600 text-xs mt-1">
              Upload your first document to start building your knowledge base
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-dark-500 mb-3">
              {documents.length} document{documents.length !== 1 ? 's' : ''} • Used for RAG during sessions
            </p>
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-dark-800/50 border border-white/5 hover:border-white/10 transition-all-fast group"
              >
                <span className="text-2xl shrink-0">{getTypeIcon(doc.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-100 truncate">{doc.name}</p>
                  <p className="text-xs text-dark-500">
                    {formatSize(doc.size)} · {doc.type.toUpperCase()} ·{' '}
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(doc)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-dark-500 hover:text-red-400 transition-all-fast shrink-0 px-2 py-1 rounded-md hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="shrink-0 mt-4 p-3 rounded-xl bg-dark-800/30 border border-white/5">
        <p className="text-xs text-dark-400 flex items-start gap-2">
          <span>💡</span>
          <span>
            Documents are chunked and embedded locally using{' '}
            <code className="text-brand-400">all-MiniLM-L6-v2</code> (auto-downloaded on first use).
            Relevant chunks are automatically included in AI prompts during sessions.
          </span>
        </p>
      </div>
    </div>
  )
}
