/**
 * Feature 4: Daily Non-Negotiables & Fulfillment Calendar
 * All habits are strictly non-negotiable. Supports Countable and Yes/No habits per day.
 * Calendar clearly differentiates fulfilled vs unfulfilled days.
 */

export type HabitType = 'boolean' | 'number'

export type Habit = {
  id: string
  name: string
  type: HabitType
  target?: number // For countable habits
  unit?: string // e.g. "glasses", "steps", "pages", "mins"
  createdAt: string
}

export type HabitValue = {
  completed?: boolean // for boolean habits
  current?: number // for countable habits
}

export type DayHabitsLog = {
  date: string // YYYY-MM-DD
  values: Record<string, HabitValue> // habitId -> HabitValue
}

export type NonNegotiablesData = {
  habits: Habit[]
  history: Record<string, DayHabitsLog> // dateKey -> DayHabitsLog
}

export function createDefaultHabits(): Habit[] {
  return [
    {
      id: 'h-water',
      name: 'Drink 3.5L Water',
      type: 'number',
      target: 8,
      unit: 'glasses',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'h-training',
      name: 'Gym / Daily Workout',
      type: 'boolean',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'h-reading',
      name: 'Read 20 Pages',
      type: 'number',
      target: 20,
      unit: 'pages',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'h-sleep',
      name: '7+ Hours Sleep',
      type: 'boolean',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'h-diet',
      name: 'No Junk Food / Zero Cheats',
      type: 'boolean',
      createdAt: new Date().toISOString(),
    },
  ]
}

export function createNonNegotiablesData(): NonNegotiablesData {
  return {
    habits: createDefaultHabits(),
    history: {},
  }
}

export function ensureNonNegotiablesData(raw: unknown): NonNegotiablesData {
  if (!raw || typeof raw !== 'object') {
    return createNonNegotiablesData()
  }
  const obj = raw as Record<string, unknown>
  const habits = Array.isArray(obj.habits)
    ? (obj.habits as Habit[])
    : createDefaultHabits()

  const history =
    obj.history && typeof obj.history === 'object' && !Array.isArray(obj.history)
      ? (obj.history as Record<string, DayHabitsLog>)
      : {}

  return {
    habits,
    history,
  }
}

// --------------------------------------------------------------------------
// Fulfillment Helpers
// --------------------------------------------------------------------------

export function isHabitFulfilled(habit: Habit, val?: HabitValue): boolean {
  if (!val) return false
  if (habit.type === 'boolean') {
    return Boolean(val.completed)
  }
  if (habit.type === 'number') {
    const target = habit.target || 1
    return typeof val.current === 'number' && val.current >= target
  }
  return false
}

export function getDayProgress(
  habits: Habit[],
  log?: DayHabitsLog,
): { fulfilled: number; total: number; isAllFulfilled: boolean; percent: number } {
  const total = habits.length
  if (total === 0) {
    return { fulfilled: 0, total: 0, isAllFulfilled: false, percent: 0 }
  }
  const fulfilled = habits.filter((h) => isHabitFulfilled(h, log?.values?.[h.id])).length
  const isAllFulfilled = fulfilled === total
  const percent = Math.round((fulfilled / total) * 100)
  return {
    fulfilled,
    total,
    isAllFulfilled,
    percent,
  }
}

// --------------------------------------------------------------------------
// Immutable State Operations
// --------------------------------------------------------------------------

export function getOrCreateDayLog(data: NonNegotiablesData, dateStr: string): DayHabitsLog {
  const existing = data.history[dateStr]
  if (existing) {
    return existing
  }
  // Initialize default empty log for that day
  const values: Record<string, HabitValue> = {}
  data.habits.forEach((h) => {
    values[h.id] = h.type === 'boolean' ? { completed: false } : { current: 0 }
  })
  return {
    date: dateStr,
    values,
  }
}

export function setBooleanHabit(
  data: NonNegotiablesData,
  dateStr: string,
  habitId: string,
  completed: boolean,
): NonNegotiablesData {
  const dayLog = getOrCreateDayLog(data, dateStr)
  const currentValues = dayLog.values || {}
  return {
    ...data,
    history: {
      ...data.history,
      [dateStr]: {
        ...dayLog,
        values: {
          ...currentValues,
          [habitId]: {
            ...currentValues[habitId],
            completed: Boolean(completed),
          },
        },
      },
    },
  }
}

export function setNumberHabit(
  data: NonNegotiablesData,
  dateStr: string,
  habitId: string,
  current: number,
): NonNegotiablesData {
  const dayLog = getOrCreateDayLog(data, dateStr)
  const currentValues = dayLog.values || {}
  const safeCurrent = Math.max(0, Number.isFinite(current) ? Math.round(current) : 0)
  return {
    ...data,
    history: {
      ...data.history,
      [dateStr]: {
        ...dayLog,
        values: {
          ...currentValues,
          [habitId]: {
            ...currentValues[habitId],
            current: safeCurrent,
          },
        },
      },
    },
  }
}

export function stepNumberHabit(
  data: NonNegotiablesData,
  dateStr: string,
  habitId: string,
  delta: number,
): NonNegotiablesData {
  const dayLog = getOrCreateDayLog(data, dateStr)
  const currentVal = dayLog.values?.[habitId]?.current ?? 0
  const safeDelta = Number.isFinite(delta) ? delta : 0
  return setNumberHabit(data, dateStr, habitId, currentVal + safeDelta)
}

export function addHabit(
  data: NonNegotiablesData,
  habitDef: { name: string; type: HabitType; target?: number; unit?: string },
): NonNegotiablesData {
  const trimmed = habitDef.name.trim()
  if (!trimmed) return data

  const newHabit: Habit = {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: trimmed,
    type: habitDef.type,
    target: habitDef.type === 'number' ? Math.max(1, habitDef.target || 1) : undefined,
    unit: habitDef.type === 'number' ? habitDef.unit?.trim() || undefined : undefined,
    createdAt: new Date().toISOString(),
  }

  return {
    ...data,
    habits: [...data.habits, newHabit],
  }
}

export function updateHabit(
  data: NonNegotiablesData,
  habitId: string,
  patch: Partial<Omit<Habit, 'id' | 'createdAt'>>,
): NonNegotiablesData {
  return {
    ...data,
    habits: data.habits.map((h) => (h.id === habitId ? { ...h, ...patch } : h)),
  }
}

export function deleteHabit(data: NonNegotiablesData, habitId: string): NonNegotiablesData {
  return {
    ...data,
    habits: data.habits.filter((h) => h.id !== habitId),
  }
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function getHabitStreak(
  habitId: string,
  data: NonNegotiablesData,
  todayStr = new Date().toISOString().split('T')[0],
): { current: number; best: number } {
  const habit = data.habits.find((h) => h.id === habitId)
  if (!habit) return { current: 0, best: 0 }

  let current = 0
  let checkDate = todayStr
  const todayLog = data.history[todayStr]
  const todayFulfilled = isHabitFulfilled(habit, todayLog?.values?.[habitId])

  if (todayFulfilled) {
    current = 1
    checkDate = addDays(todayStr, -1)
  } else {
    checkDate = addDays(todayStr, -1)
  }

  while (true) {
    const log = data.history[checkDate]
    if (log && isHabitFulfilled(habit, log.values?.[habitId])) {
      current++
      checkDate = addDays(checkDate, -1)
    } else {
      break
    }
  }

  const dates = Object.keys(data.history).sort()
  let best = current
  let tempStreak = 0
  let prevDate = ''

  for (const d of dates) {
    const log = data.history[d]
    if (isHabitFulfilled(habit, log?.values?.[habitId])) {
      if (prevDate && addDays(prevDate, 1) === d) {
        tempStreak++
      } else {
        tempStreak = 1
      }
      prevDate = d
      if (tempStreak > best) best = tempStreak
    } else {
      tempStreak = 0
      prevDate = ''
    }
  }

  return { current, best: Math.max(current, best) }
}

export function getAllHabitsStreak(
  data: NonNegotiablesData,
  todayStr = new Date().toISOString().split('T')[0],
): { current: number; best: number } {
  if (data.habits.length === 0) return { current: 0, best: 0 }

  let current = 0
  let checkDate = todayStr
  const todayLog = data.history[todayStr]
  const todayProgress = getDayProgress(data.habits, todayLog)

  if (todayProgress.isAllFulfilled) {
    current = 1
    checkDate = addDays(todayStr, -1)
  } else {
    checkDate = addDays(todayStr, -1)
  }

  while (true) {
    const log = data.history[checkDate]
    if (log && getDayProgress(data.habits, log).isAllFulfilled) {
      current++
      checkDate = addDays(checkDate, -1)
    } else {
      break
    }
  }

  const dates = Object.keys(data.history).sort()
  let best = current
  let tempStreak = 0
  let prevDate = ''

  for (const d of dates) {
    const log = data.history[d]
    if (log && getDayProgress(data.habits, log).isAllFulfilled) {
      if (prevDate && addDays(prevDate, 1) === d) {
        tempStreak++
      } else {
        tempStreak = 1
      }
      prevDate = d
      if (tempStreak > best) best = tempStreak
    } else {
      tempStreak = 0
      prevDate = ''
    }
  }

  return { current, best: Math.max(current, best) }
}

export function moveHabit(
  data: NonNegotiablesData,
  habitId: string,
  direction: 'up' | 'down',
): NonNegotiablesData {
  const index = data.habits.findIndex((h) => h.id === habitId)
  if (index === -1) return data
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= data.habits.length) return data

  const nextHabits = [...data.habits]
  const temp = nextHabits[index]
  nextHabits[index] = nextHabits[targetIndex]
  nextHabits[targetIndex] = temp

  return {
    ...data,
    habits: nextHabits,
  }
}

