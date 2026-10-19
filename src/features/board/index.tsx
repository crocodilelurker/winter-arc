import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Excalidraw,
  exportToBlob,
  serializeAsJSON,
} from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import type {
  BoardData,
  BoardItem,
} from './data'
import {
  getActiveBoard,
  updateActiveBoardScene,
  addBoard,
  duplicateBoard,
  renameBoard,
  deleteBoard,
  switchBoard,
  DEFAULT_DARK_BG,
} from './data'
import { TEMPLATES } from './templates'
import './board.css'

type Props = {
  data: BoardData
  onChange: (next: BoardData) => void
}

function computeSceneSignature(
  elements: readonly any[] | undefined,
  appState: Record<string, any> | undefined,
  files: Record<string, any> | undefined,
): string {
  if (!elements || !Array.isArray(elements)) return ''
  let sig = `${elements.length};`
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]
    if (!el) continue
    sig += `${el.id}:${el.version}:${el.versionNonce}:${el.isDeleted ? 1 : 0};`
  }
  const bg = appState?.viewBackgroundColor || ''
  const grid = appState?.gridSize || ''
  const fileKeys = files ? Object.keys(files).sort().join(',') : ''
  return `${sig}|${bg}|${grid}|${fileKeys}`
}

export default function Board({ data, onChange }: Props) {
  const activeBoard = getActiveBoard(data)
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [showBoardsModal, setShowBoardsModal] = useState(false)
  const [showMenuDropdown, setShowMenuDropdown] = useState(false)
  const [elementCount, setElementCount] = useState<number>(() => activeBoard.elements.length)

  // ── Keep stable refs so the Excalidraw onChange never goes stale ──
  const dataRef = useRef(data)
  const onChangeRef = useRef(onChange)
  useEffect(() => { dataRef.current = data }, [data])
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  // Track the signature of the last committed / loaded state
  const lastCommittedSigRef = useRef<string>(
    computeSceneSignature(activeBoard.elements, activeBoard.appState, activeBoard.files),
  )

  const activeBoardIdRef = useRef(activeBoard.id)
  useEffect(() => {
    dataRef.current = data
    const cur = getActiveBoard(data)
    if (cur.id !== activeBoardIdRef.current) {
      activeBoardIdRef.current = cur.id
      lastCommittedSigRef.current = computeSceneSignature(cur.elements, cur.appState, cur.files)
    }
  }, [data])

  // Debounced scene updater
  const latestSceneRef = useRef<{
    elements: readonly any[]
    appState: Record<string, any>
    files: Record<string, any>
    sig: string
  } | null>(null)
  const debounceTimerRef = useRef<any>(null)

  // Flush pending changes to parent
  const flushPendingChanges = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    if (latestSceneRef.current) {
      const { elements, appState, files, sig } = latestSceneRef.current
      latestSceneRef.current = null
      lastCommittedSigRef.current = sig
      onChangeRef.current(updateActiveBoardScene(dataRef.current, elements, appState, files))
    }
  }, [])

  // Listen for global flush events before save or close, and ensure edits are saved on unmount
  useEffect(() => {
    const handleFlush = () => {
      flushPendingChanges()
    }
    window.addEventListener('growth-arc:flush-pending', handleFlush)
    return () => {
      window.removeEventListener('growth-arc:flush-pending', handleFlush)
      flushPendingChanges()
    }
  }, [flushPendingChanges])

  // Handle scene change from Excalidraw – stable callback, never recreated
  const handleSceneChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      // Filter out deleted elements for accurate count
      const nonDeleted = elements.filter((el) => !el.isDeleted)
      setElementCount(nonDeleted.length)

      const newSig = computeSceneSignature(elements, appState, files)

      // CRITICAL: If elements, background, and files haven't changed,
      // this was just a transient UI change (pointer hover, selection, zoom, tool change,
      // window focus/blur, or Excalidraw's initial mount). DO NOT mark dirty!
      if (newSig === lastCommittedSigRef.current) {
        return
      }

      latestSceneRef.current = { elements, appState, files, sig: newSig }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null
        if (latestSceneRef.current) {
          const latest = latestSceneRef.current
          latestSceneRef.current = null
          lastCommittedSigRef.current = latest.sig
          onChangeRef.current(
            updateActiveBoardScene(dataRef.current, latest.elements, latest.appState, latest.files),
          )
        }
      }, 500)
    },
    [], // no deps – uses refs only
  )

  // Board tab switching
  const handleSelectBoard = (id: string) => {
    if (id === activeBoard.id) return
    flushPendingChanges()
    const targetBoard = data.boards.find((b) => b.id === id)
    if (targetBoard) {
      lastCommittedSigRef.current = computeSceneSignature(
        targetBoard.elements,
        targetBoard.appState,
        targetBoard.files,
      )
    }
    onChange(switchBoard(data, id))
  }

  // Add new board
  const handleAddBoard = () => {
    flushPendingChanges()
    const next = addBoard(data, `Board ${data.boards.length + 1}`)
    const newActive = getActiveBoard(next)
    lastCommittedSigRef.current = computeSceneSignature(
      newActive.elements,
      newActive.appState,
      newActive.files,
    )
    onChange(next)
  }

  // Rename board
  const handleStartRename = (board: BoardItem) => {
    setEditingNameId(board.id)
    setNameInput(board.name)
  }

  const handleCommitRename = (id: string) => {
    if (editingNameId === id && nameInput.trim()) {
      onChange(renameBoard(data, id, nameInput.trim()))
    }
    setEditingNameId(null)
  }

  // Duplicate board
  const handleDuplicateBoard = (id: string) => {
    flushPendingChanges()
    const next = duplicateBoard(data, id)
    const newActive = getActiveBoard(next)
    activeBoardIdRef.current = newActive.id
    lastCommittedSigRef.current = computeSceneSignature(
      newActive.elements,
      newActive.appState,
      newActive.files,
    )
    setElementCount(newActive.elements.filter((el: any) => !el.isDeleted).length)
    onChange(next)
  }

  // Delete board
  const handleDeleteBoard = (id: string, boardName?: string) => {
    if (data.boards.length <= 1) {
      alert('You must have at least one canvas board.')
      return
    }
    const target = data.boards.find((b) => b.id === id)
    const name = boardName || target?.name || 'this canvas'
    if (!window.confirm(`Delete "${name}"?\n\nAll drawings and shapes on this canvas will be permanently removed.`)) {
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    latestSceneRef.current = null

    const nextData = deleteBoard(data, id)
    const newActive = getActiveBoard(nextData)
    activeBoardIdRef.current = newActive.id
    lastCommittedSigRef.current = computeSceneSignature(
      newActive.elements,
      newActive.appState,
      newActive.files,
    )
    setElementCount(newActive.elements.filter((el: any) => !el.isDeleted).length)
    onChange(nextData)
  }

  // Clear active canvas
  const handleClearCanvas = () => {
    if (!window.confirm('Clear all drawings and elements on this board?')) return
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    latestSceneRef.current = null
    lastCommittedSigRef.current = computeSceneSignature([], { viewBackgroundColor: DEFAULT_DARK_BG }, {})
    if (excalidrawAPI) {
      excalidrawAPI.resetScene()
    }
    onChange(updateActiveBoardScene(data, [], { viewBackgroundColor: DEFAULT_DARK_BG }, {}))
    setElementCount(0)
  }

  // Export as PNG image
  const handleExportPNG = async () => {
    if (!excalidrawAPI) return
    try {
      const elements = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()
      const files = excalidrawAPI.getFiles()

      const blob = await exportToBlob({
        elements,
        appState: {
          ...appState,
          exportWithDarkMode: true,
          exportBackground: true,
        },
        files,
        mimeType: 'image/png',
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeBoard.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-board.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export board image:', err)
      alert('Could not export image.')
    }
  }

  // Export as .excalidraw JSON
  const handleExportExcalidraw = () => {
    if (!excalidrawAPI) return
    try {
      const elements = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()
      const files = excalidrawAPI.getFiles()

      const jsonStr = serializeAsJSON(elements, appState, files, 'local')
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeBoard.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.excalidraw`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export excalidraw file:', err)
    }
  }

  // Import .excalidraw or JSON file
  const handleImportFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.excalidraw,.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        if (parsed && Array.isArray(parsed.elements)) {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = null
          }
          latestSceneRef.current = null
          lastCommittedSigRef.current = computeSceneSignature(
            parsed.elements,
            { viewBackgroundColor: DEFAULT_DARK_BG },
            parsed.files || {},
          )
          if (excalidrawAPI) {
            excalidrawAPI.updateScene({
              elements: parsed.elements,
              appState: {
                ...(parsed.appState || {}),
                theme: 'dark',
                viewBackgroundColor: DEFAULT_DARK_BG,
              },
            })
          }
          onChange(
            updateActiveBoardScene(
              data,
              parsed.elements,
              { viewBackgroundColor: DEFAULT_DARK_BG },
              parsed.files || {},
            ),
          )
        } else {
          alert('Invalid Excalidraw file format.')
        }
      } catch (err) {
        console.error('Failed to import file:', err)
        alert('Could not parse that file.')
      }
    }
    input.click()
  }

  // Apply a Starter Template
  const handleApplyTemplate = (tmpl: (typeof TEMPLATES)[number]) => {
    const newElements = tmpl.create()
    if (excalidrawAPI) {
      const currentElements = excalidrawAPI.getSceneElements()
      const combined = [...currentElements, ...newElements]
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      latestSceneRef.current = null
      lastCommittedSigRef.current = computeSceneSignature(
        combined,
        { viewBackgroundColor: DEFAULT_DARK_BG },
        activeBoard.files,
      )
      excalidrawAPI.updateScene({
        elements: combined,
        appState: {
          viewBackgroundColor: DEFAULT_DARK_BG,
          theme: 'dark',
        },
      })
      excalidrawAPI.scrollToContent(combined, { fitToViewport: true })
      onChange(
        updateActiveBoardScene(data, combined, { viewBackgroundColor: DEFAULT_DARK_BG }, activeBoard.files),
      )
    }
    setShowTemplatesModal(false)
  }

  return (
    <div className="board-feature-wrapper">
      {/* Top Controls Header */}
      <header className="board-header">
        <div className="board-header-left">
          {/* Boards List / Tabs */}
          <div className="board-tabs">
            {data.boards.map((b) => (
              <div key={b.id} className="board-tab-wrapper">
                {editingNameId === b.id ? (
                  <input
                    type="text"
                    className="board-rename-input"
                    value={nameInput}
                    autoFocus
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={() => handleCommitRename(b.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCommitRename(b.id)
                      if (e.key === 'Escape') setEditingNameId(null)
                    }}
                  />
                ) : (
                  <div className={`board-tab-pill ${b.id === activeBoard.id ? 'is-active' : ''}`}>
                    <button
                      type="button"
                      className="board-tab-title-btn"
                      onClick={() => handleSelectBoard(b.id)}
                      onDoubleClick={() => handleStartRename(b)}
                      title={`Switch to "${b.name}" (double-click to rename)`}
                    >
                      <span>{b.name}</span>
                    </button>

                    {b.id === activeBoard.id && (
                      <button
                        type="button"
                        className="board-tab-icon-btn rename"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartRename(b)
                        }}
                        title="Rename canvas"
                      >
                        ✎
                      </button>
                    )}

                    {data.boards.length > 1 && (
                      <button
                        type="button"
                        className="board-tab-icon-btn delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteBoard(b.id, b.name)
                        }}
                        title={`Delete canvas "${b.name}"`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="board-add-btn"
            onClick={handleAddBoard}
            title="Create another canvas board"
          >
            +
          </button>
        </div>

        {/* Sync Status Badge */}
        <div className="board-header-center">
          <div className="board-sync-badge" title="Board is stored inside your Growth Arc JSON file">
            <span className="board-sync-dot" />
            <span>Synced in JSON</span>
          </div>
          <span className="board-count-badge">
            {elementCount} {elementCount === 1 ? 'element' : 'elements'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="board-header-right">
          <button
            type="button"
            className="board-action-btn"
            onClick={() => setShowBoardsModal(true)}
            title="Manage, duplicate, and delete canvases"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Canvases ({data.boards.length})</span>
          </button>

          <button
            type="button"
            className="board-action-btn accent"
            onClick={() => setShowTemplatesModal(true)}
            title="Insert a starter template"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18M3 12h18" />
            </svg>
            <span>Templates</span>
          </button>

          <button
            type="button"
            className="board-action-btn"
            onClick={handleExportPNG}
            title="Export board as PNG image"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>PNG</span>
          </button>

          {/* More actions dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="board-action-btn"
              onClick={() => setShowMenuDropdown(!showMenuDropdown)}
              title="More canvas actions"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>

            {showMenuDropdown && (
              <div className="board-dropdown-menu" onClick={() => setShowMenuDropdown(false)}>
                <button
                  type="button"
                  className="board-dropdown-item"
                  onClick={() => setShowBoardsModal(true)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <span>Manage All Canvases...</span>
                </button>

                <button
                  type="button"
                  className="board-dropdown-item"
                  onClick={() => handleDuplicateBoard(activeBoard.id)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Duplicate Canvas</span>
                </button>

                <div className="board-dropdown-divider" />

                <button
                  type="button"
                  className="board-dropdown-item"
                  onClick={() => {
                    if (excalidrawAPI) {
                      const elements = excalidrawAPI.getSceneElements()
                      excalidrawAPI.scrollToContent(elements, { fitToViewport: true })
                    }
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span>Zoom to Fit All</span>
                </button>

                <button type="button" className="board-dropdown-item" onClick={handleExportExcalidraw}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Export .excalidraw</span>
                </button>

                <button type="button" className="board-dropdown-item" onClick={handleImportFile}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Import .excalidraw / JSON</span>
                </button>

                <div className="board-dropdown-divider" />

                <button
                  type="button"
                  className="board-dropdown-item"
                  style={{ color: '#f87171' }}
                  onClick={handleClearCanvas}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Clear Canvas</span>
                </button>

                {data.boards.length > 1 && (
                  <button
                    type="button"
                    className="board-dropdown-item"
                    style={{ color: '#f87171' }}
                    onClick={() => handleDeleteBoard(activeBoard.id, activeBoard.name)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Delete "{activeBoard.name}"</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Excalidraw Canvas Area */}
      <div className="board-canvas-container">
        <Excalidraw
          key={activeBoard.id}
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          theme="dark"
          initialData={{
            elements: activeBoard.elements,
            appState: {
              viewBackgroundColor: activeBoard.appState?.viewBackgroundColor || DEFAULT_DARK_BG,
              theme: 'dark',
              ...(activeBoard.appState?.gridSize ? { gridSize: activeBoard.appState.gridSize } : {}),
            },
            files: activeBoard.files as any,
          }}
          onChange={handleSceneChange}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: false,
              export: false,
              loadScene: false,
              saveToActiveFile: false,
              toggleTheme: false,
            },
          }}
        />
      </div>

      {/* Templates Modal */}
      {showTemplatesModal && (
        <div className="board-modal-backdrop" onClick={() => setShowTemplatesModal(false)}>
          <div className="board-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="board-modal-header">
              <h3 className="board-modal-title">Insert Board Template</h3>
              <button
                type="button"
                className="board-modal-close"
                onClick={() => setShowTemplatesModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="board-modal-body">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  className="board-template-card"
                  onClick={() => handleApplyTemplate(tmpl)}
                >
                  <span className="board-template-icon">{tmpl.icon}</span>
                  <div className="board-template-info">
                    <h4>{tmpl.name}</h4>
                    <p>{tmpl.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manage Canvases Modal */}
      {showBoardsModal && (
        <div className="board-modal-backdrop" onClick={() => setShowBoardsModal(false)}>
          <div className="board-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="board-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="board-modal-title">Manage Canvases</h3>
                <span className="board-count-badge">{data.boards.length} total</span>
              </div>
              <button
                type="button"
                className="board-modal-close"
                onClick={() => setShowBoardsModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="board-manager-body">
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-3)' }}>
                Switch between canvases, rename, duplicate, or delete them. All canvases are stored within your save file.
              </p>

              <div className="board-manager-list">
                {data.boards.map((b, idx) => {
                  const isActive = b.id === activeBoard.id
                  const count = Array.isArray(b.elements) ? b.elements.filter((el: any) => !el.isDeleted).length : 0
                  return (
                    <div key={b.id} className={`board-manager-item ${isActive ? 'is-active' : ''}`}>
                      <div className="board-manager-item-left">
                        <div className="board-manager-item-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                        <div className="board-manager-item-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="board-manager-item-name">{b.name}</span>
                            {isActive && <span className="board-active-tag">Active</span>}
                          </div>
                          <span className="board-manager-item-meta">
                            {count} {count === 1 ? 'element' : 'elements'} • Canvas #{idx + 1}
                          </span>
                        </div>
                      </div>

                      <div className="board-manager-item-actions">
                        {!isActive && (
                          <button
                            type="button"
                            className="board-manager-btn"
                            onClick={() => {
                              handleSelectBoard(b.id)
                              setShowBoardsModal(false)
                            }}
                            title="Open this canvas"
                          >
                            Open
                          </button>
                        )}
                        <button
                          type="button"
                          className="board-manager-btn"
                          onClick={() => {
                            const newName = window.prompt('Enter new canvas name:', b.name)
                            if (newName && newName.trim()) {
                              onChange(renameBoard(data, b.id, newName.trim()))
                            }
                          }}
                          title="Rename this canvas"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="board-manager-btn"
                          onClick={() => handleDuplicateBoard(b.id)}
                          title="Duplicate this canvas"
                        >
                          Duplicate
                        </button>
                        {data.boards.length > 1 ? (
                          <button
                            type="button"
                            className="board-manager-btn danger"
                            onClick={() => handleDeleteBoard(b.id, b.name)}
                            title={`Delete "${b.name}"`}
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="board-manager-btn disabled" title="At least one canvas is required">
                            Keep
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="board-manager-footer">
                <button
                  type="button"
                  className="board-action-btn accent"
                  onClick={() => {
                    handleAddBoard()
                    setShowBoardsModal(false)
                  }}
                >
                  + New Canvas
                </button>
                <button
                  type="button"
                  className="board-action-btn"
                  onClick={() => setShowBoardsModal(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
