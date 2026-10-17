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
  const [db, setDb] = useState<Db | null>(null)
  const [dirty, setDirty] = useState(false)
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const dbRef = useRef<Db | null>(db)
  dbRef.current = db

  const fileHandleRef = useRef<FileSystemFileHandle | null>(fileHandle)
  fileHandleRef.current = fileHandle

  const fileNameRef = useRef<string | null>(fileName)
  fileNameRef.current = fileName

  // Nothing is persisted anywhere, so a close with unsaved changes loses them.
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
  }, [])

  const open = useCallback(async (file: File, handle?: FileSystemFileHandle | null) => {
    const text = await file.text()
    setDb(parseDb(text))
    setFileHandle(handle ?? null)
    setFileName(handle ? handle.name : file.name)
    setDirty(false)
  }, [])

  const openWithPicker = useCallback(async (): Promise<boolean> => {
    if (!supportsFSA) return false
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Winter Arc Save File',
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
              description: 'Winter Arc Save File',
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
