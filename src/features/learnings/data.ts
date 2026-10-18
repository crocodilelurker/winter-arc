export type LearningType = 'learning' | 'creation'

export type LearningEntry = {
  id: string
  type: LearningType
  title: string
  description?: string
  category: string
  link?: string
  createdAt: string
}

export type DayLearningLog = {
  date: string // YYYY-MM-DD
  entries: LearningEntry[]
  dayNote?: string
}

export type LearningData = {
  categories: string[]
  days: Record<string, DayLearningLog>
}

export const DEFAULT_CATEGORIES = [
  'Tech & Coding',
  'Mindset & Wisdom',
  'Business & Work',
  'Health & Fitness',
  'Creative & Design',
  'Life Lesson',
]

export function createLearningData(): LearningData {
  return {
    categories: DEFAULT_CATEGORIES,
    days: {},
  }
}

/**
 * Defensive parser that guarantees old save files without the 'learnings' slice
 * open seamlessly without errors, and corrupt/missing fields are filled with defaults.
 */
export function ensureLearningData(raw: unknown): LearningData {
  if (!raw || typeof raw !== 'object') return createLearningData()
  const obj = raw as Record<string, unknown>

  // Categories
  let categories: string[] = DEFAULT_CATEGORIES
  if (Array.isArray(obj.categories) && obj.categories.length > 0) {
    const valid = obj.categories
      .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      .map((c) => c.trim())
    if (valid.length > 0) {
      categories = Array.from(new Set([...valid, ...DEFAULT_CATEGORIES]))
    }
  }

  // Days
  const days: Record<string, DayLearningLog> = {}
  if (obj.days && typeof obj.days === 'object') {
    for (const [dateStr, dayVal] of Object.entries(obj.days as Record<string, unknown>)) {
      if (!dayVal || typeof dayVal !== 'object') continue
      const dObj = dayVal as Record<string, unknown>
      const rawEntries = Array.isArray(dObj.entries) ? dObj.entries : []
      const entries: LearningEntry[] = []
      for (let idx = 0; idx < rawEntries.length; idx++) {
        const entry = rawEntries[idx]
        if (!entry || typeof entry !== 'object') continue
        const eObj = entry as Record<string, unknown>
        const type: LearningType = eObj.type === 'creation' ? 'creation' : 'learning'
        const title = typeof eObj.title === 'string' ? eObj.title.trim() : ''
        if (!title) continue
        entries.push({
          id: typeof eObj.id === 'string' ? eObj.id : `lrn-${idx}-${Date.now()}`,
          type,
          title,
          description: typeof eObj.description === 'string' ? eObj.description : undefined,
          category: typeof eObj.category === 'string' && eObj.category ? eObj.category : 'General',
          link: typeof eObj.link === 'string' && eObj.link.trim() ? eObj.link.trim() : undefined,
          createdAt: typeof eObj.createdAt === 'string' ? eObj.createdAt : new Date().toISOString(),
        })
      }

      const dayNote = typeof dObj.dayNote === 'string' ? dObj.dayNote : undefined
      days[dateStr] = { date: dateStr, entries, dayNote }
    }
  }

  return {
    categories,
    days,
  }
}

export function getDayLearning(data: LearningData, dateKey: string): DayLearningLog {
  return data.days[dateKey] || { date: dateKey, entries: [] }
}

export function addLearningEntry(
  data: LearningData,
  dateKey: string,
  entry: {
    type: LearningType
    title: string
    description?: string
    category?: string
    link?: string
  },
): LearningData {
  const title = entry.title.trim()
  if (!title) return data

  const currentDay = getDayLearning(data, dateKey)
  const newEntry: LearningEntry = {
    id: `lrn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: entry.type,
    title,
    description: entry.description?.trim() || undefined,
    category: entry.category?.trim() || data.categories[0] || 'General',
    link: entry.link?.trim() || undefined,
    createdAt: new Date().toISOString(),
  }

  return {
    ...data,
    days: {
      ...data.days,
      [dateKey]: {
        ...currentDay,
        date: dateKey,
        entries: [newEntry, ...currentDay.entries],
      },
    },
  }
}

export function updateLearningEntry(
  data: LearningData,
  dateKey: string,
  entryId: string,
  patch: Partial<LearningEntry>,
): LearningData {
  const currentDay = getDayLearning(data, dateKey)
  const nextEntries = currentDay.entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e))

  return {
    ...data,
    days: {
      ...data.days,
      [dateKey]: {
        ...currentDay,
        entries: nextEntries,
      },
    },
  }
}

export function deleteLearningEntry(
  data: LearningData,
  dateKey: string,
  entryId: string,
): LearningData {
  const currentDay = getDayLearning(data, dateKey)
  const nextEntries = currentDay.entries.filter((e) => e.id !== entryId)

  return {
    ...data,
    days: {
      ...data.days,
      [dateKey]: {
        ...currentDay,
        entries: nextEntries,
      },
    },
  }
}

export function setDayNote(
  data: LearningData,
  dateKey: string,
  note: string,
): LearningData {
  const currentDay = getDayLearning(data, dateKey)
  return {
    ...data,
    days: {
      ...data.days,
      [dateKey]: {
        ...currentDay,
        dayNote: note.trim() || undefined,
      },
    },
  }
}

export function addLearningCategory(data: LearningData, category: string): LearningData {
  const cat = category.trim()
  if (!cat || data.categories.includes(cat)) return data
  return {
    ...data,
    categories: [...data.categories, cat],
  }
}

export type LearningStats = {
  totalLearnings: number
  totalCreations: number
  totalEntries: number
  activeDays: number
  currentStreak: number
  categoryCounts: Record<string, number>
}

export function calculateLearningStats(data: LearningData, todayStr: string): LearningStats {
  let totalLearnings = 0
  let totalCreations = 0
  const activeDates = new Set<string>()
  const categoryCounts: Record<string, number> = {}

  for (const cat of data.categories) {
    categoryCounts[cat] = 0
  }

  for (const [dateStr, dayLog] of Object.entries(data.days)) {
    if (dayLog.entries && dayLog.entries.length > 0) {
      activeDates.add(dateStr)
      for (const entry of dayLog.entries) {
        if (entry.type === 'learning') {
          totalLearnings++
        } else {
          totalCreations++
        }
        const c = entry.category || 'General'
        categoryCounts[c] = (categoryCounts[c] || 0) + 1
      }
    }
  }

  // Calculate Streak
  let currentStreak = 0
  const [y, m, d] = todayStr.split('-').map(Number)
  const cur = new Date(y, m - 1, d)

  const pad = (n: number) => String(n).padStart(2, '0')
  const toKey = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`

  // Check if today has an entry, or if yesterday had an entry (active streak)
  let checkDate = new Date(cur)
  if (!activeDates.has(toKey(checkDate))) {
    // Check if streak was active as of yesterday
    checkDate.setDate(checkDate.getDate() - 1)
  }

  while (activeDates.has(toKey(checkDate))) {
    currentStreak++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  return {
    totalLearnings,
    totalCreations,
    totalEntries: totalLearnings + totalCreations,
    activeDays: activeDates.size,
    currentStreak,
    categoryCounts,
  }
}
