import { useCallback, useEffect, useRef, useState } from 'react'
import { createDb, parseDb, saveFileName, serializeDb, type Db } from './types'

export type DbHandle = {
  db: Db | null
  dirty: boolean
  fileName: string | null
  hasFileHandle: boolean
  isSaving: boolean
  supportsFileSystemAccess: boolean
  /** Replaces the whole db. Marks the session unsaved. */
  update: (fn: (db: Db) => Db) => void
  start: (name: string) => void
  open: (file: File, handle?: FileSystemFileHandle | null) => Promise<void>
  openWithPicker: () => Promise<boolean>
  save: () => Promise<void>
  saveAs: () => Promise<void>
  close: () => void
}

const supportsFSA =
  typeof window !== 'undefined' &&
  'showOpenFilePicker' in window &&
  'showSaveFilePicker' in window

const KEY_SESSION_DB = 'growth-arc:session-db'
const KEY_SESSION_FILENAME = 'growth-arc:session-filename'
const KEY_SESSION_DIRTY = 'growth-arc:session-dirty'

function loadSavedSession(): { db: Db | null; fileName: string | null; dirty: boolean } {
  try {
    const raw = localStorage.getItem(KEY_SESSION_DB)
    if (!raw) return { db: null, fileName: null, dirty: false }
    const parsed = parseDb(raw)
    const name = localStorage.getItem(KEY_SESSION_FILENAME) || null
    const isDirty = localStorage.getItem(KEY_SESSION_DIRTY) === 'true'
    return { db: parsed, fileName: name, dirty: isDirty }
  } catch (err) {
    console.warn('Failed to restore session from localStorage:', err)
    return { db: null, fileName: null, dirty: false }
  }
}

function clearSavedSession() {
  try {
    localStorage.removeItem(KEY_SESSION_DB)
    localStorage.removeItem(KEY_SESSION_FILENAME)
    localStorage.removeItem(KEY_SESSION_DIRTY)
  } catch {}
}

function persistSession(db: Db | null, fileName: string | null, dirty: boolean) {
  try {
    if (db) {
      localStorage.setItem(KEY_SESSION_DB, serializeDb(db))
      if (fileName) {
        localStorage.setItem(KEY_SESSION_FILENAME, fileName)
      } else {
        localStorage.removeItem(KEY_SESSION_FILENAME)
      }
      localStorage.setItem(KEY_SESSION_DIRTY, String(dirty))
    } else {
      clearSavedSession()
    }
  } catch (err) {
    console.warn('Failed to persist session to localStorage:', err)
  }
}

function getHandleFromIdb(): Promise<FileSystemFileHandle | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return resolve(null)
    const req = indexedDB.open('growth-arc-store', 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('handles')
    }
    req.onsuccess = () => {
      const db = req.result
      try {
        const tx = db.transaction('handles', 'readonly')
        const store = tx.objectStore('handles')
        const getReq = store.get('current')
        getReq.onsuccess = () => resolve((getReq.result as FileSystemFileHandle) || null)
        getReq.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    }
    req.onerror = () => resolve(null)
  })
}

function saveHandleToIdb(handle: FileSystemFileHandle | null): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return resolve()
    const req = indexedDB.open('growth-arc-store', 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('handles')
    }
    req.onsuccess = () => {
      const db = req.result
      try {
        const tx = db.transaction('handles', 'readwrite')
        const store = tx.objectStore('handles')
        if (handle) {
          store.put(handle, 'current')
        } else {
          store.delete('current')
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      } catch {
        resolve()
      }
    }
    req.onerror = () => resolve()
  })
}

async function verifyPermission(
  fileHandle: FileSystemFileHandle,
  readWrite: boolean,
): Promise<boolean> {
  const options: FileSystemHandlePermissionDescriptor = {
    mode: readWrite ? 'readwrite' : 'read',
  }
  if ('queryPermission' in fileHandle) {
    if ((await fileHandle.queryPermission(options)) === 'granted') {
      return true
    }
  }
  if ('requestPermission' in fileHandle) {
    if ((await fileHandle.requestPermission(options)) === 'granted') {
      return true
    }
  }
  return false
}

function downloadAsBlob(db: Db, filename?: string) {
  const blob = new Blob([serializeDb(db)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || saveFileName(db)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function useDb(): DbHandle {
  const initial = useRef(loadSavedSession()).current
  const [db, setDb] = useState<Db | null>(initial.db)
  const [dirty, setDirty] = useState(initial.dirty)
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null)
  const [fileName, setFileName] = useState<string | null>(initial.fileName)
  const [isSaving, setIsSaving] = useState(false)

  const dbRef = useRef<Db | null>(db)
  dbRef.current = db

  const fileHandleRef = useRef<FileSystemFileHandle | null>(fileHandle)
  fileHandleRef.current = fileHandle

  const fileNameRef = useRef<string | null>(fileName)
  fileNameRef.current = fileName

  // Try to restore file handle from IndexedDB on initial mount
  useEffect(() => {
    void getHandleFromIdb().then((h) => {
      if (h) setFileHandle(h)
    })
  }, [])

  // Auto-persist active session state to localStorage on every change
  useEffect(() => {
    persistSession(db, fileName, dirty)
  }, [db, fileName, dirty])

  // Warn on page unload if changes have not been saved to the file
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const update = useCallback((fn: (db: Db) => Db) => {
    setDb((prev) => (prev ? fn(prev) : prev))
    setDirty(true)
  }, [])

  const start = useCallback((name: string) => {
    setDb(createDb(name))
    setFileHandle(null)
    setFileName(null)
    setDirty(false)
    void saveHandleToIdb(null)
  }, [])

  const open = useCallback(async (file: File, handle?: FileSystemFileHandle | null) => {
    const text = await file.text()
    setDb(parseDb(text))
    setFileHandle(handle ?? null)
    setFileName(handle ? handle.name : file.name)
    setDirty(false)
    void saveHandleToIdb(handle ?? null)
  }, [])

  const openWithPicker = useCallback(async (): Promise<boolean> => {
    if (!supportsFSA) return false
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Growth Arc Save File',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
        multiple: false,
      })
      const file = await handle.getFile()
      const text = await file.text()
      setDb(parseDb(text))
      setFileHandle(handle)
      setFileName(handle.name)
      setDirty(false)
      void saveHandleToIdb(handle)
      return true
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return true
      }
      throw err
    }
  }, [])

  const saveAs = useCallback(async () => {
    const current = dbRef.current
    if (!current) return

    if (supportsFSA) {
      try {
        setIsSaving(true)
        const handle = await window.showSaveFilePicker({
          suggestedName: fileNameRef.current || saveFileName(current),
          types: [
            {
              description: 'Growth Arc Save File',
              accept: {
                'application/json': ['.json'],
              },
            },
          ],
        })
        const writable = await handle.createWritable()
        await writable.write(serializeDb(current))
        await writable.close()
        setFileHandle(handle)
        setFileName(handle.name)
        setDirty(false)
        void saveHandleToIdb(handle)
        return
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        console.warn('showSaveFilePicker failed, falling back to download:', err)
      } finally {
        setIsSaving(false)
      }
    }

    // Fallback if FSA not supported or picker failed
    const chosenName = fileNameRef.current || saveFileName(current)
    downloadAsBlob(current, chosenName)
    setDirty(false)
  }, [])

  const save = useCallback(async () => {
    const current = dbRef.current
    if (!current) return

    const handle = fileHandleRef.current
    if (handle) {
      try {
        setIsSaving(true)
        const hasPermission = await verifyPermission(handle, true)
        if (hasPermission) {
          const writable = await handle.createWritable()
          await writable.write(serializeDb(current))
          await writable.close()
          setDirty(false)
          return
        }
      } catch (err: unknown) {
        console.warn('Could not write directly to file handle, falling back to saveAs:', err)
      } finally {
        setIsSaving(false)
      }
    }

    // If no existing handle or direct write failed, open Save As
    await saveAs()
  }, [saveAs])

  const close = useCallback(() => {
    setDb(null)
    setFileHandle(null)
    setFileName(null)
    setDirty(false)
    clearSavedSession()
    void saveHandleToIdb(null)
  }, [])

  return {
    db,
    dirty,
    fileName,
    hasFileHandle: fileHandle !== null,
    isSaving,
    supportsFileSystemAccess: supportsFSA,
    update,
    start,
    open,
    openWithPicker,
    save,
    saveAs,
    close,
  }
}
