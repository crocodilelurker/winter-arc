export type BoardItem = {
  id: string
  name: string
  elements: any[]
  appState: {
    viewBackgroundColor?: string
    gridSize?: number
    [key: string]: unknown
  }
  files: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type BoardData = {
  activeBoardId: string
  boards: BoardItem[]
}

export const DEFAULT_DARK_BG = '#121212'

export function createDefaultBoard(id = 'main', name = 'Main Canvas'): BoardItem {
  return {
    id,
    name,
    elements: [],
    appState: {
      viewBackgroundColor: DEFAULT_DARK_BG,
    },
    files: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function createBoardData(): BoardData {
  const main = createDefaultBoard('main', 'Main Canvas')
  return {
    activeBoardId: main.id,
    boards: [main],
  }
}

/**
 * Defensive parser that guarantees old save files without the 'board' slice
 * open seamlessly, and handles any format gracefully.
 */
export function ensureBoardData(raw: unknown): BoardData {
  if (!raw || typeof raw !== 'object') {
    return createBoardData()
  }

  const obj = raw as Record<string, unknown>

  // Handle single board legacy format if any
  if (Array.isArray(obj.elements)) {
    const single = {
      id: 'main',
      name: 'Main Canvas',
      elements: obj.elements,
      appState: (obj.appState && typeof obj.appState === 'object')
        ? (obj.appState as Record<string, unknown>)
        : { viewBackgroundColor: DEFAULT_DARK_BG },
      files: (obj.files && typeof obj.files === 'object')
        ? (obj.files as Record<string, unknown>)
        : {},
      createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString(),
      updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
    }
    return {
      activeBoardId: 'main',
      boards: [single],
    }
  }

  // Handle multi-board format
  const boards: BoardItem[] = []
  if (Array.isArray(obj.boards) && obj.boards.length > 0) {
    for (let i = 0; i < obj.boards.length; i++) {
      const b = obj.boards[i]
      if (!b || typeof b !== 'object') continue
      const bObj = b as Record<string, unknown>
      const id = typeof bObj.id === 'string' && bObj.id.trim() ? bObj.id.trim() : `board-${i + 1}`
      const name = typeof bObj.name === 'string' && bObj.name.trim() ? bObj.name.trim() : `Board ${i + 1}`
      const elements = Array.isArray(bObj.elements) ? bObj.elements : []
      const appState = (bObj.appState && typeof bObj.appState === 'object')
        ? (bObj.appState as Record<string, unknown>)
        : { viewBackgroundColor: DEFAULT_DARK_BG }
      const files = (bObj.files && typeof bObj.files === 'object')
        ? (bObj.files as Record<string, unknown>)
        : {}
      const createdAt = typeof bObj.createdAt === 'string' ? bObj.createdAt : new Date().toISOString()
      const updatedAt = typeof bObj.updatedAt === 'string' ? bObj.updatedAt : new Date().toISOString()

      boards.push({
        id,
        name,
        elements,
        appState,
        files,
        createdAt,
        updatedAt,
      })
    }
  }

  if (boards.length === 0) {
    return createBoardData()
  }

  let activeId = typeof obj.activeBoardId === 'string' ? obj.activeBoardId : boards[0].id
  if (!boards.some((b) => b.id === activeId)) {
    activeId = boards[0].id
  }

  return {
    activeBoardId: activeId,
    boards,
  }
}

export function getActiveBoard(data: BoardData): BoardItem {
  const found = data.boards.find((b) => b.id === data.activeBoardId)
  return found || data.boards[0] || createDefaultBoard()
}

export function updateActiveBoardScene(
  data: BoardData,
  elements: readonly any[],
  appState: Record<string, unknown>,
  files?: Record<string, unknown>,
): BoardData {
  const activeId = data.activeBoardId
  const now = new Date().toISOString()

  // Clean appState to only store essentials (to avoid bloated save files)
  const cleanAppState: Record<string, unknown> = {
    viewBackgroundColor: appState.viewBackgroundColor || DEFAULT_DARK_BG,
  }
  if (typeof appState.gridSize === 'number') {
    cleanAppState.gridSize = appState.gridSize
  }

  const nextBoards = data.boards.map((b) => {
    if (b.id !== activeId) return b
    return {
      ...b,
      elements: Array.from(elements),
      appState: cleanAppState,
      files: files ? { ...b.files, ...files } : b.files,
      updatedAt: now,
    }
  })

  return {
    ...data,
    boards: nextBoards,
  }
}

export function addBoard(data: BoardData, name: string): BoardData {
  const trimmed = name.trim() || `Board ${data.boards.length + 1}`
  const newId = `board-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const newBoard = createDefaultBoard(newId, trimmed)

  return {
    activeBoardId: newId,
    boards: [...data.boards, newBoard],
  }
}

export function renameBoard(data: BoardData, id: string, newName: string): BoardData {
  const trimmed = newName.trim()
  if (!trimmed) return data

  return {
    ...data,
    boards: data.boards.map((b) => (b.id === id ? { ...b, name: trimmed, updatedAt: new Date().toISOString() } : b)),
  }
}

export function deleteBoard(data: BoardData, id: string): BoardData {
  if (data.boards.length <= 1) return data // keep at least 1 board

  const nextBoards = data.boards.filter((b) => b.id !== id)
  let nextActiveId = data.activeBoardId
  if (nextActiveId === id) {
    nextActiveId = nextBoards[0].id
  }

  return {
    activeBoardId: nextActiveId,
    boards: nextBoards,
  }
}

export function duplicateBoard(data: BoardData, id: string): BoardData {
  const source = data.boards.find((b) => b.id === id)
  if (!source) return data

  const newId = `board-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const clonedBoard: BoardItem = {
    ...source,
    id: newId,
    name: `${source.name} (Copy)`,
    elements: JSON.parse(JSON.stringify(source.elements)),
    appState: { ...source.appState },
    files: { ...source.files },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return {
    activeBoardId: newId,
    boards: [...data.boards, clonedBoard],
  }
}

export function switchBoard(data: BoardData, id: string): BoardData {
  if (!data.boards.some((b) => b.id === id)) return data
  return {
    ...data,
    activeBoardId: id,
  }
}
