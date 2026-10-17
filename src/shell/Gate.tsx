import { useRef, useState } from 'react'
import type { DbHandle } from '../db/useDb'

export default function Gate({ handle }: { handle: DbHandle }) {
  const [mode, setMode] = useState<'choose' | 'new'>('choose')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [nameError, setNameError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  async function onPickSave() {
    setError('')
    if (handle.supportsFileSystemAccess) {
      try {
        const opened = await handle.openWithPicker()
        if (opened) return
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not read that file.')
        return
      }
    }
    fileInput.current?.click()
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setError('')
    try {
      await handle.open(file)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.')
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function handleStartNew(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('Please enter your name.')
      return
    }
    setNameError('')
    handle.start(trimmed)
  }

  return (
    <div className="gate-root">
      <div className="gate-card">
        <div className="gate-logo">
          <h1>Winter <span>Arc</span></h1>
          <p>Your private tracker for nutrition, tasks, workouts, and habits.</p>
        </div>

        {mode === 'choose' ? (
          <div className="gate-actions">
            <button
              type="button"
              className="primary lg"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => { setMode('new'); setError(''); setNameError('') }}
            >
              Start a new plan
            </button>

            <div className="gate-divider"><span>or</span></div>

            <button
              type="button"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => void onPickSave()}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Open save file (.json)
            </button>

            {error && <p className="gate-error">{error}</p>}

            <p className="gate-privacy">
              100% private. Everything is stored locally on your device.
            </p>
          </div>
        ) : (
          <form className="gate-form" onSubmit={handleStartNew}>
            <div className="gate-field">
              <label htmlFor="gate-name">What should we call you?</label>
              <input
                id="gate-name"
                autoFocus
                value={name}
                onChange={(e) => { setName(e.target.value); if (nameError) setNameError('') }}
                placeholder="Your name"
                required
              />
              {nameError && <span className="gate-error">{nameError}</span>}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="primary" style={{ flex: 1, justifyContent: 'center' }}>
                Begin
              </button>
              <button type="button" className="ghost" onClick={() => { setMode('choose'); setNameError('') }}>
                Back
              </button>
            </div>
          </form>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </div>
    </div>
  )
}
