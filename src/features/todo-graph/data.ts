/**
 * Feature 2 — Task Graph (Daily Connected Todo Planner).
 * Self-contained module: owns the shape of its slice of the save file and
 * all operations on it. Pure functions only, zero network, zero React.
 */

export type Subtask = {
  id: string
  title: string
  completed: boolean
}

export type Task = {
  id: string
  number: number // sequential task index: 1, 2, 3...
  title: string
  completed: boolean
  weight?: number // optional weight, e.g. 1 to 5
  topic?: string // optional topic/group (e.g. "Work", "Deep Work", "Fitness")
  priority?: 'low' | 'med' | 'high'
  details: string // Markdown/notes, can include [[Task Title]] or [[#1]] links
  subtasks?: Subtask[]
  connectedTaskIds: string[] // explicitly connected task IDs
  createdAt: string
  completedAt?: string
}

export type DayPlan = {
  date: string // YYYY-MM-DD
  tasks: Task[]
}

export type TodoGraphData = {
  days: Record<string, DayPlan>
  topics: string[]
}

export function createTodoGraphData(): TodoGraphData {
  return {
    days: {},
    topics: ['Deep Work', 'Projects', 'Health', 'Learning', 'Personal'],
  }
}

// --- WikiLink extraction and graph connections ------------------------------

const WIKILINK_RE = /\[\[(.*?)\]\]/g

/**
 * Extracts targets enclosed in [[...]] from details text.
 */
export function extractWikiLinks(text: string): string[] {
  if (!text) return []
  const matches: string[] = []
  let match: RegExpExecArray | null
  WIKILINK_RE.lastIndex = 0
  while ((match = WIKILINK_RE.exec(text)) !== null) {
    const target = match[1].trim()
    if (target && !matches.includes(target)) {
      matches.push(target)
    }
  }
  return matches
}

/**
 * Normalizes title for comparison: lowercased, trimmed, extra spaces collapsed.
 */
export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Returns all task IDs that a task links to, merging explicit connectedTaskIds
 * and wiki-links found in the task's details. Supports [[Task Title]], [[#1]], [[1]], etc.
 */
export function getEffectiveOutgoingIds(task: Task, dayTasks: Task[]): string[] {
  const ids = new Set<string>(task.connectedTaskIds)
  const wikiTargets = extractWikiLinks(task.details)

  if (wikiTargets.length > 0) {
    for (const other of dayTasks) {
      if (other.id === task.id) continue
      const normOther = normalizeTitle(other.title)
      const numStr = String(other.number)
      const hashNum = `#${numStr}`

      const matches = wikiTargets.some((w) => {
        const normW = normalizeTitle(w)
        if (normW === normOther) return true
        if (w === numStr || w === hashNum) return true
        // If written like "1: Task Title" or "#1: Task Title"
        if (normW.startsWith(`${hashNum}:`) || normW.startsWith(`${numStr}:`)) return true
        return false
      })

      if (matches) {
        ids.add(other.id)
      }
    }
  }

  return Array.from(ids)
}

/**
 * Returns tasks that link TO the given taskId (Backlinks).
 */
export function getBacklinks(taskId: string, dayTasks: Task[]): Task[] {
  return dayTasks.filter((other) => {
    if (other.id === taskId) return false
    const outgoing = getEffectiveOutgoingIds(other, dayTasks)
    return outgoing.includes(taskId)
  })
}

// --- Topic Color Palette -----------------------------------------------------

export const TOPIC_PALETTE = [
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
]

export function getTopicColor(topic?: string): string {
  if (!topic || !topic.trim()) return '#64748b' // slate / muted
  let hash = 0
  for (let i = 0; i < topic.length; i++) {
    hash = (hash << 5) - hash + topic.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % TOPIC_PALETTE.length
  return TOPIC_PALETTE[index]
}

// --- Defensive parsing from uploaded save file -------------------------------

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const bool = (v: unknown, fallback = false): boolean =>
  typeof v === 'boolean' ? v : fallback
const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined

function parseSubtask(o: Record<string, unknown>): Subtask | null {
  const id = str(o.id)
  const title = str(o.title).trim()
  if (!id || !title) return null
  return {
    id,
    title,
    completed: bool(o.completed, false),
  }
}

function parseTask(o: Record<string, unknown>, fallbackNumber: number): Task | null {
  const id = str(o.id)
  const title = str(o.title).trim()
  if (!id || !title) return null

  const taskNumber = typeof o.number === 'number' && o.number > 0 ? o.number : fallbackNumber

  const connected = Array.isArray(o.connectedTaskIds)
    ? o.connectedTaskIds.filter((cid): cid is string => typeof cid === 'string')
    : []

  const weightVal = num(o.weight)
  const weight = weightVal !== undefined && weightVal > 0 ? Math.round(weightVal) : undefined

  const rawSubtasks = Array.isArray(o.subtasks) ? o.subtasks : []
  const subtasks: Subtask[] = []
  for (const st of rawSubtasks) {
    if (st && typeof st === 'object') {
      const parsed = parseSubtask(st as Record<string, unknown>)
      if (parsed) subtasks.push(parsed)
    }
  }

  const priorityVal = o.priority === 'low' || o.priority === 'med' || o.priority === 'high'
    ? o.priority
    : undefined

  return {
    id,
    number: taskNumber,
    title,
    completed: bool(o.completed, false),
    weight,
    topic: str(o.topic).trim() || undefined,
    priority: priorityVal,
    details: str(o.details),
    subtasks: subtasks.length > 0 ? subtasks : undefined,
    connectedTaskIds: connected,
    createdAt: str(o.createdAt, new Date().toISOString()),
    completedAt: typeof o.completedAt === 'string' ? o.completedAt : undefined,
  }
}

export function ensureTodoGraphData(raw: unknown): TodoGraphData {
  const empty = createTodoGraphData()
  if (!raw || typeof raw !== 'object') return empty
  const o = raw as Record<string, unknown>

  const topics: string[] = []
  if (Array.isArray(o.topics)) {
    for (const t of o.topics) {
      if (typeof t === 'string' && t.trim() && !topics.includes(t.trim())) {
        topics.push(t.trim())
      }
    }
  }
  if (topics.length === 0) {
    topics.push(...empty.topics)
  }

  const days: Record<string, DayPlan> = {}
  const daysRaw = (o.days ?? {}) as Record<string, unknown>
  for (const [key, value] of Object.entries(daysRaw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !value || typeof value !== 'object') continue
    const dObj = value as Record<string, unknown>
    const rawTasks = Array.isArray(dObj.tasks) ? dObj.tasks : []
    const tasks: Task[] = []
    let counter = 1
    for (const item of rawTasks) {
      if (item && typeof item === 'object') {
        const parsed = parseTask(item as Record<string, unknown>, counter)
        if (parsed) {
          tasks.push(parsed)
          counter++
        }
      }
    }
    days[key] = {
      date: key,
      tasks,
    }
  }

  return { days, topics }
}

// --- Pure State Transformation Helpers ---------------------------------------

function getOrCreateDay(data: TodoGraphData, date: string): DayPlan {
  return data.days[date] ?? { date, tasks: [] }
}

export function addTask(
  data: TodoGraphData,
  date: string,
  taskInput: {
    title: string
    weight?: number
    topic?: string
    priority?: 'low' | 'med' | 'high'
    details?: string
    connectedTaskIds?: string[]
  },
): TodoGraphData {
  const title = taskInput.title.trim()
  if (!title) return data

  const day = getOrCreateDay(data, date)
  const maxNumber = day.tasks.reduce((max, t) => Math.max(max, t.number || 0), 0)

  const newTask: Task = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    number: maxNumber + 1,
    title,
    completed: false,
    weight: taskInput.weight && taskInput.weight > 0 ? taskInput.weight : undefined,
    topic: taskInput.topic?.trim() || undefined,
    priority: taskInput.priority,
    details: taskInput.details || '',
    connectedTaskIds: taskInput.connectedTaskIds || [],
    createdAt: new Date().toISOString(),
  }

  const newTopics = [...data.topics]
  if (newTask.topic && !newTopics.includes(newTask.topic)) {
    newTopics.push(newTask.topic)
  }

  return {
    ...data,
    topics: newTopics,
    days: {
      ...data.days,
      [date]: {
        ...day,
        tasks: [newTask, ...day.tasks],
      },
    },
  }
}

export function updateTask(
  data: TodoGraphData,
  date: string,
  taskId: string,
  patch: Partial<Omit<Task, 'id' | 'createdAt'>>,
): TodoGraphData {
  const day = data.days[date]
  if (!day) return data

  const tasks = day.tasks.map((t) => {
    if (t.id !== taskId) return t
    const updated = { ...t, ...patch }
    if (patch.completed !== undefined) {
      updated.completedAt = patch.completed ? new Date().toISOString() : undefined
    }
    return updated
  })

  const newTopics = [...data.topics]
  if (patch.topic && patch.topic.trim() && !newTopics.includes(patch.topic.trim())) {
    newTopics.push(patch.topic.trim())
  }

  return {
    ...data,
    topics: newTopics,
    days: {
      ...data.days,
      [date]: { ...day, tasks },
    },
  }
}

export function deleteTask(
  data: TodoGraphData,
  date: string,
  taskId: string,
): TodoGraphData {
  const day = data.days[date]
  if (!day) return data

  const tasks = day.tasks
    .filter((t) => t.id !== taskId)
    .map((t) => ({
      ...t,
      connectedTaskIds: t.connectedTaskIds.filter((id) => id !== taskId),
    }))

  return {
    ...data,
    days: {
      ...data.days,
      [date]: { ...day, tasks },
    },
  }
}

export function toggleTask(
  data: TodoGraphData,
  date: string,
  taskId: string,
): TodoGraphData {
  const day = data.days[date]
  if (!day) return data

  const task = day.tasks.find((t) => t.id === taskId)
  if (!task) return data

  return updateTask(data, date, taskId, { completed: !task.completed })
}

export function connectTasks(
  data: TodoGraphData,
  date: string,
  sourceId: string,
  targetId: string,
): TodoGraphData {
  if (sourceId === targetId) return data
  const day = data.days[date]
  if (!day) return data

  const source = day.tasks.find((t) => t.id === sourceId)
  if (!source || source.connectedTaskIds.includes(targetId)) return data

  return updateTask(data, date, sourceId, {
    connectedTaskIds: [...source.connectedTaskIds, targetId],
  })
}

export function disconnectTasks(
  data: TodoGraphData,
  date: string,
  sourceId: string,
  targetId: string,
): TodoGraphData {
  const day = data.days[date]
  if (!day) return data

  const source = day.tasks.find((t) => t.id === sourceId)
  if (!source) return data

  return updateTask(data, date, sourceId, {
    connectedTaskIds: source.connectedTaskIds.filter((id) => id !== targetId),
  })
}

export function groupTasks(
  data: TodoGraphData,
  date: string,
  taskIds: string[],
  topic: string,
): TodoGraphData {
  const day = data.days[date]
  if (!day || taskIds.length === 0) return data

  const trimmed = topic.trim()
  const tasks = day.tasks.map((t) => {
    if (!taskIds.includes(t.id)) return t
    return { ...t, topic: trimmed || undefined }
  })

  const newTopics = [...data.topics]
  if (trimmed && !newTopics.includes(trimmed)) {
    newTopics.push(trimmed)
  }

  return {
    ...data,
    topics: newTopics,
    days: {
      ...data.days,
      [date]: { ...day, tasks },
    },
  }
}

export function deleteMultipleTasks(
  data: TodoGraphData,
  date: string,
  taskIds: string[],
): TodoGraphData {
  const day = data.days[date]
  if (!day || taskIds.length === 0) return data

  const toRemove = new Set(taskIds)
  const tasks = day.tasks
    .filter((t) => !toRemove.has(t.id))
    .map((t) => ({
      ...t,
      connectedTaskIds: t.connectedTaskIds.filter((id) => !toRemove.has(id)),
    }))

  return {
    ...data,
    days: {
      ...data.days,
      [date]: { ...day, tasks },
    },
  }
}

export function completeMultipleTasks(
  data: TodoGraphData,
  date: string,
  taskIds: string[],
  completed: boolean,
): TodoGraphData {
  const day = data.days[date]
  if (!day || taskIds.length === 0) return data

  const targetSet = new Set(taskIds)
  const now = new Date().toISOString()
  const tasks = day.tasks.map((t) => {
    if (!targetSet.has(t.id)) return t
    return {
      ...t,
      completed,
      completedAt: completed ? now : undefined,
    }
  })

  return {
    ...data,
    days: {
      ...data.days,
      [date]: { ...day, tasks },
    },
  }
}

export function addTopic(data: TodoGraphData, topicName: string): TodoGraphData {
  const trimmed = topicName.trim()
  if (!trimmed || data.topics.includes(trimmed)) return data
  return {
    ...data,
    topics: [...data.topics, trimmed],
  }
}

// --- Subtask Handlers --------------------------------------------------------

export function addSubtask(
  data: TodoGraphData,
  date: string,
  taskId: string,
  subtaskTitle: string,
): TodoGraphData {
  const trimmed = subtaskTitle.trim()
  if (!trimmed) return data

  const day = data.days[date]
  if (!day) return data

  const task = day.tasks.find((t) => t.id === taskId)
  if (!task) return data

  const newSubtask: Subtask = {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: trimmed,
    completed: false,
  }

  const subtasks = [...(task.subtasks || []), newSubtask]
  return updateTask(data, date, taskId, { subtasks })
}

export function toggleSubtask(
  data: TodoGraphData,
  date: string,
  taskId: string,
  subtaskId: string,
): TodoGraphData {
  const day = data.days[date]
  if (!day) return data

  const task = day.tasks.find((t) => t.id === taskId)
  if (!task || !task.subtasks) return data

  const subtasks = task.subtasks.map((st) =>
    st.id === subtaskId ? { ...st, completed: !st.completed } : st,
  )

  return updateTask(data, date, taskId, { subtasks })
}

export function deleteSubtask(
  data: TodoGraphData,
  date: string,
  taskId: string,
  subtaskId: string,
): TodoGraphData {
  const day = data.days[date]
  if (!day) return data

  const task = day.tasks.find((t) => t.id === taskId)
  if (!task || !task.subtasks) return data

  const subtasks = task.subtasks.filter((st) => st.id !== subtaskId)
  return updateTask(data, date, taskId, { subtasks })
}

// --- Rollover Unfinished Tasks -----------------------------------------------

export function rolloverUnfinished(
  data: TodoGraphData,
  fromDate: string,
  toDate: string,
): TodoGraphData {
  const fromDay = data.days[fromDate]
  if (!fromDay || fromDay.tasks.length === 0) return data
  const unfinished = fromDay.tasks.filter((t) => !t.completed)
  if (unfinished.length === 0) return data

  const toDay = data.days[toDate] ?? { date: toDate, tasks: [] }
  let nextNumber = toDay.tasks.reduce((max, t) => Math.max(max, t.number || 0), 0) + 1

  const rolledTasks: Task[] = unfinished.map((t) => {
    return {
      ...t,
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      number: nextNumber++,
      createdAt: new Date().toISOString(),
      completed: false,
      completedAt: undefined,
      connectedTaskIds: [],
    }
  })

  return {
    ...data,
    days: {
      ...data.days,
      [toDate]: {
        ...toDay,
        tasks: [...toDay.tasks, ...rolledTasks],
      },
    },
  }
}

// --- Export Day As Markdown --------------------------------------------------

export function exportDayAsMarkdown(dayPlan: DayPlan): string {
  const lines: string[] = [
    `# Growth Arc — Tasks for ${dayPlan.date}`,
    `Generated on ${new Date().toLocaleDateString()}`,
    '',
  ]

  if (dayPlan.tasks.length === 0) {
    lines.push('_No tasks planned for this day._')
    return lines.join('\n')
  }

  for (const t of dayPlan.tasks) {
    const check = t.completed ? '[x]' : '[ ]'
    const meta: string[] = []
    if (t.topic) meta.push(t.topic)
    if (t.weight) meta.push(`weight: ${t.weight}`)
    const metaStr = meta.length > 0 ? ` (${meta.join(', ')})` : ''

    lines.push(`- ${check} #${t.number}: ${t.title}${metaStr}`)
    if (t.details && t.details.trim()) {
      lines.push(`  > ${t.details.trim().replace(/\n/g, '\n  > ')}`)
    }
    if (t.subtasks && t.subtasks.length > 0) {
      for (const st of t.subtasks) {
        const sCheck = st.completed ? '[x]' : '[ ]'
        lines.push(`  - ${sCheck} ${st.title}`)
      }
    }
  }

  return lines.join('\n')
}

export function clearDayTasks(
  data: TodoGraphData,
  date: string,
): TodoGraphData {
  const day = data.days[date]
  if (!day || day.tasks.length === 0) return data

  return {
    ...data,
    days: {
      ...data.days,
      [date]: { ...day, tasks: [] },
    },
  }
}
