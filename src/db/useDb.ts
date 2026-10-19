import { useCallback, useEffect, useRef, useState } from 'react'
import { createDb, parseDb, saveFileName, serializeDb, type Db } from './types'

export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'permission-needed' | 'unlinked'

export type DbHandle = {
  db: Db | null
  dirty: boolean
  fileName: string | null
  hasFileHandle: boolean
  isSaving: boolean
  supportsFileSystemAccess: boolean
  autoSave: boolean
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  setAutoSave: (enabled: boolean) => void
  linkDiskFile: () => Promise<boolean>
  grantDiskPermission: () => Promise<boolean>
  /** Replaces the whole db. Marks the session unsaved. */
  update: (fn: (db: Db) => Db) => void
  start: (name: string) => void
  open: (file: File, handle?: FileSystemFileHandle | null) => Promise<void>
  openWithPicker: () => Promise<boolean>
  save: () => Promise<boolean>
  saveAs: () => Promise<boolean>
  close: () => void
}

const supportsFSA =
  typeof window !== 'undefined' &&
  'showOpenFilePicker' in window &&
  'showSaveFilePicker' in window

const KEY_SESSION_DB = 'growth-arc:session-db'
const KEY_SESSION_FILENAME = 'growth-arc:session-filename'
const KEY_SESSION_DIRTY = 'growth-arc:session-dirty'
const KEY_AUTO_SAVE = 'growth-arc:auto-save-enabled'

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
  try {
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
  } catch (err) {
    console.warn('Permission query/request failed:', err)
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
  const [hasDiskPermission, setHasDiskPermission] = useState<boolean>(true)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() => (initial.db ? new Date() : null))

  // Auto-save setting (persisted in localStorage, default true)
  const [autoSave, setAutoSaveState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem(KEY_AUTO_SAVE)
    return saved === null ? true : saved === 'true'
  })

  const setAutoSave = useCallback((enabled: boolean) => {
    setAutoSaveState(enabled)
    try {
      localStorage.setItem(KEY_AUTO_SAVE, String(enabled))
    } catch {}
  }, [])

  const dbRef = useRef<Db | null>(db)
  dbRef.current = db

  const fileHandleRef = useRef<FileSystemFileHandle | null>(fileHandle)
  fileHandleRef.current = fileHandle

  const fileNameRef = useRef<string | null>(fileName)
  fileNameRef.current = fileName

  // Try to restore file handle from IndexedDB on initial mount
  useEffect(() => {
    void getHandleFromIdb().then(async (h) => {
      if (h) {
        setFileHandle(h)
        try {
          if ('queryPermission' in h) {
            const status = await h.queryPermission({ mode: 'readwrite' })
            setHasDiskPermission(status === 'granted')
          }
        } catch {
          setHasDiskPermission(false)
        }
      }
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

  // Auto-Save debounced effect (1.2s debounce)
  useEffect(() => {
    if (!db || !dirty || !autoSave) return

    // If no file handle, local-first safety is already secured by persistSession
    if (!fileHandle) return

    const timer = setTimeout(async () => {
      const current = dbRef.current
      const handle = fileHandleRef.current
      if (!current || !handle) return

      try {
        setIsSaving(true)
        const hasPerm = await verifyPermission(handle, true)
        if (hasPerm) {
          setHasDiskPermission(true)
          const writable = await handle.createWritable()
          await writable.write(serializeDb(current))
          await writable.close()
          setDirty(false)
          setLastSavedAt(new Date())
        } else {
          setHasDiskPermission(false)
        }
      } catch (err) {
        console.warn('Auto-save to disk failed:', err)
        setHasDiskPermission(false)
      } finally {
        setIsSaving(false)
      }
    }, 1200)

    return () => clearTimeout(timer)
  }, [db, dirty, autoSave, fileHandle])

  const update = useCallback((fn: (db: Db) => Db) => {
    setDb((prev) => {
      if (!prev) return prev
      const next = fn(prev)
      dbRef.current = next
      return next
    })
    setDirty(true)
  }, [])

  const start = useCallback((name: string) => {
    const next = createDb(name)
    setDb(next)
    dbRef.current = next
    setFileHandle(null)
    fileHandleRef.current = null
    setFileName(null)
    fileNameRef.current = null
    setDirty(false)
    setLastSavedAt(new Date())
    void saveHandleToIdb(null)
  }, [])

  const open = useCallback(async (file: File, handle?: FileSystemFileHandle | null) => {
    const text = await file.text()
    const parsed = parseDb(text)
    setDb(parsed)
    dbRef.current = parsed
    setFileHandle(handle ?? null)
    fileHandleRef.current = handle ?? null
    const name = handle ? handle.name : file.name
    setFileName(name)
    fileNameRef.current = name
    setDirty(false)
    setHasDiskPermission(true)
    setLastSavedAt(new Date())
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
      const parsed = parseDb(text)
      setDb(parsed)
      dbRef.current = parsed
      setFileHandle(handle)
      fileHandleRef.current = handle
      setFileName(handle.name)
      fileNameRef.current = handle.name
      setDirty(false)
      setHasDiskPermission(true)
      setLastSavedAt(new Date())
      void saveHandleToIdb(handle)
      return true
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return false
      }
      throw err
    }
  }, [])

  const saveAs = useCallback(async (): Promise<boolean> => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('growth-arc:flush-pending'))
    }
    const current = dbRef.current
    if (!current) return false

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
        fileHandleRef.current = handle
        setFileName(handle.name)
        fileNameRef.current = handle.name
        setHasDiskPermission(true)
        setDirty(false)
        setLastSavedAt(new Date())
        void saveHandleToIdb(handle)
        return true
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return false
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
    setLastSavedAt(new Date())
    return true
  }, [])

  const save = useCallback(async (): Promise<boolean> => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('growth-arc:flush-pending'))
    }
    const current = dbRef.current
    if (!current) return false

    const handle = fileHandleRef.current
    if (handle) {
      try {
        setIsSaving(true)
        const hasPermission = await verifyPermission(handle, true)
        if (hasPermission) {
          setHasDiskPermission(true)
          const writable = await handle.createWritable()
          await writable.write(serializeDb(current))
          await writable.close()
          setDirty(false)
          setLastSavedAt(new Date())
          return true
        } else {
          setHasDiskPermission(false)
        }
      } catch (err: unknown) {
        console.warn('Could not write directly to file handle, falling back to saveAs:', err)
      } finally {
        setIsSaving(false)
      }
    }

    // If no existing handle or direct write failed, open Save As
    return await saveAs()
  }, [saveAs])

  const linkDiskFile = useCallback(async (): Promise<boolean> => {
    const current = dbRef.current
    if (!current) return false

    if (!supportsFSA) {
      const chosenName = fileNameRef.current || saveFileName(current)
      downloadAsBlob(current, chosenName)
      setDirty(false)
      setLastSavedAt(new Date())
      return true
    }

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
      fileHandleRef.current = handle
      setFileName(handle.name)
      fileNameRef.current = handle.name
      setHasDiskPermission(true)
      setDirty(false)
      setLastSavedAt(new Date())
      void saveHandleToIdb(handle)
      return true
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return false
      }
      console.warn('linkDiskFile failed:', err)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [])

  const grantDiskPermission = useCallback(async (): Promise<boolean> => {
    const handle = fileHandleRef.current
    if (!handle) return false
    try {
      const granted = await verifyPermission(handle, true)
      setHasDiskPermission(granted)
      if (granted && dbRef.current) {
        setIsSaving(true)
        const writable = await handle.createWritable()
        await writable.write(serializeDb(dbRef.current))
        await writable.close()
        setDirty(false)
        setLastSavedAt(new Date())
      }
      return granted
    } catch (err) {
      console.warn('grantDiskPermission failed:', err)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [])

  const close = useCallback(() => {
    setDb(null)
    setFileHandle(null)
    setFileName(null)
    setDirty(false)
    setLastSavedAt(null)
    clearSavedSession()
    void saveHandleToIdb(null)
  }, [])

  // Calculate comprehensive saveStatus
  let saveStatus: SaveStatus = 'saved'
  if (isSaving) {
    saveStatus = 'saving'
  } else if (!fileHandle) {
    saveStatus = 'unlinked'
  } else if (!hasDiskPermission) {
    saveStatus = 'permission-needed'
  } else if (dirty) {
    saveStatus = 'dirty'
  } else {
    saveStatus = 'saved'
  }

  return {
    db,
    dirty,
    fileName,
    hasFileHandle: fileHandle !== null,
    isSaving,
    supportsFileSystemAccess: supportsFSA,
    autoSave,
    saveStatus,
    lastSavedAt,
    setAutoSave,
    linkDiskFile,
    grantDiskPermission,
    update,
    start,
    open,
    openWithPicker,
    save,
    saveAs,
    close,
  }
}
