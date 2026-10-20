/**
 * Feature 1 — calorie counter. Self-contained: this module owns the shape of
 * its slice of the save file and every operation on it. Pure functions only,
 * no React, no storage, no network.
 */

export const MEALS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'snacks', label: 'Snacks' },
  { id: 'dinner', label: 'Dinner' },
] as const

export type MealId = (typeof MEALS)[number]['id']

export type Macros = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type FoodEntry = Macros & {
  id: string
  name: string
  quantity: string
  meal: MealId
}

export type DayLog = {
  entries: FoodEntry[]
  water: number
}

/** One row per distinct food, keyed by its normalized name. Never duplicated. */
export type LibraryItem = Macros & {
  key: string
  name: string
  quantity: string
  uses: number
  lastUsed: string
}

export type Goals = Macros & { water: number }

export type CalorieCounterData = {
  goals: Goals
  days: Record<string, DayLog>
  library: LibraryItem[]
}

export const EMPTY_MACROS: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 }
export const EMPTY_DAY: DayLog = { entries: [], water: 0 }

export function createCalorieCounterData(): CalorieCounterData {
  return {
    goals: { calories: 2000, protein: 120, carbs: 220, fat: 60, water: 8 },
    days: {},
    library: [],
  }
}

// --- parsing an untrusted slice from an uploaded file -----------------------

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)

const isMealId = (v: unknown): v is MealId => MEALS.some((m) => m.id === v)

function parseMacros(o: Record<string, unknown>): Macros {
  return {
    calories: Math.max(0, num(o.calories)),
    protein: Math.max(0, num(o.protein)),
    carbs: Math.max(0, num(o.carbs)),
    fat: Math.max(0, num(o.fat)),
  }
}

export function ensureCalorieCounterData(raw: unknown): CalorieCounterData {
  const empty = createCalorieCounterData()
  if (!raw || typeof raw !== 'object') return empty
  const o = raw as Record<string, unknown>

  const goalsRaw = (o.goals ?? {}) as Record<string, unknown>
  const goals: Goals = {
    calories: Math.max(0, num(goalsRaw.calories, empty.goals.calories)),
    protein: Math.max(0, num(goalsRaw.protein, empty.goals.protein)),
    carbs: Math.max(0, num(goalsRaw.carbs, empty.goals.carbs)),
    fat: Math.max(0, num(goalsRaw.fat, empty.goals.fat)),
    water: Math.max(0, num(goalsRaw.water, empty.goals.water)),
  }

  const days: Record<string, DayLog> = {}
  const daysRaw = (o.days ?? {}) as Record<string, unknown>
  for (const [key, value] of Object.entries(daysRaw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !value || typeof value !== 'object') continue
    const day = value as Record<string, unknown>
    const entries = Array.isArray(day.entries) ? day.entries : []
    days[key] = {
      water: Math.max(0, num(day.water)),
      entries: entries.flatMap((e): FoodEntry[] => {
        if (!e || typeof e !== 'object') return []
        const entry = e as Record<string, unknown>
        const name = str(entry.name).trim()
        if (!name) return []
        return [
          {
            ...parseMacros(entry),
            id: str(entry.id) || newId(),
            name,
            quantity: str(entry.quantity),
            meal: isMealId(entry.meal) ? entry.meal : 'snacks',
          },
        ]
      }),
    }
  }

  const library: LibraryItem[] = []
  const seen = new Set<string>()
  const libraryRaw = Array.isArray(o.library) ? o.library : []
  for (const item of libraryRaw) {
    if (!item || typeof item !== 'object') continue
    const it = item as Record<string, unknown>
    const name = str(it.name).trim()
    if (!name) continue
    const key = normalizeName(name)
    if (seen.has(key)) continue // collapse any duplicates a hand-edited file may hold
    seen.add(key)
    library.push({
      ...parseMacros(it),
      key,
      name,
      quantity: str(it.quantity),
      uses: Math.max(1, Math.round(num(it.uses, 1))),
      lastUsed: str(it.lastUsed),
    })
  }

  return { goals, days, library }
}

// --- helpers ---------------------------------------------------------------

export function newId(): string {
  return crypto.randomUUID()
}

/** "  Litti   Choka " and "litti choka" are the same food. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function caloriesFromMacros(m: Omit<Macros, 'calories'>): number {
  return Math.round(m.protein * 4 + m.carbs * 4 + m.fat * 9)
}

export function getDay(data: CalorieCounterData, dateKey: string): DayLog {
  return data.days[dateKey] ?? EMPTY_DAY
}

export function dayTotals(day: DayLog): Macros {
  return day.entries.reduce<Macros>(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { ...EMPTY_MACROS },
  )
}

export function mealTotals(day: DayLog, meal: MealId): Macros {
  return dayTotals({ ...day, entries: day.entries.filter((e) => e.meal === meal) })
}

/** Days that have anything logged — used to mark the calendar. */
export function loggedDays(data: CalorieCounterData): Set<string> {
  const marked = new Set<string>()
  for (const [key, day] of Object.entries(data.days)) {
    if (day.entries.length > 0 || day.water > 0) marked.add(key)
  }
  return marked
}

export function suggestFoods(data: CalorieCounterData, query: string, limit = 6): LibraryItem[] {
  const q = normalizeName(query)
  if (!q) return []
  return data.library
    .filter((item) => item.key.includes(q))
    .sort((a, b) => {
      // exact prefix first, then most-used, then most-recent
      const aStarts = a.key.startsWith(q) ? 0 : 1
      const bStarts = b.key.startsWith(q) ? 0 : 1
      if (aStarts !== bStarts) return aStarts - bStarts
      if (b.uses !== a.uses) return b.uses - a.uses
      return b.lastUsed.localeCompare(a.lastUsed)
    })
    .slice(0, limit)
}

export type NewEntry = Macros & { name: string; quantity: string; meal: MealId }

/**
 * Logs a food on a day and upserts it into the library. The library keeps
 * exactly one row per normalized name storing only its per-unit macros (no quantity).
 */
export function addEntry(
  data: CalorieCounterData,
  dateKey: string,
  entry: NewEntry,
  perUnitMacros?: Macros,
): CalorieCounterData {
  const typed = entry.name.trim().replace(/\s+/g, ' ')
  if (!typed) return data

  const key = normalizeName(typed)
  const existing = data.library.find((item) => item.key === key)
  const name = existing?.name ?? typed

  const day = getDay(data, dateKey)
  const stored: FoodEntry = { ...entry, name, id: newId() }

  // Strictly calculate per-unit macros
  const qty = Math.max(1, parseInt(entry.quantity, 10) || 1)
  const perUnit: Macros = perUnitMacros || {
    protein: Math.round((entry.protein / qty) * 10) / 10,
    carbs: Math.round((entry.carbs / qty) * 10) / 10,
    fat: Math.round((entry.fat / qty) * 10) / 10,
    calories: Math.round(entry.calories / qty),
  }

  const row: LibraryItem = {
    key,
    name,
    quantity: '', // Do NOT save quantity in saved foods! Only per-unit macros
    calories: perUnit.calories,
    protein: perUnit.protein,
    carbs: perUnit.carbs,
    fat: perUnit.fat,
    uses: (existing?.uses ?? 0) + 1,
    lastUsed: dateKey,
  }

  return {
    ...data,
    days: { ...data.days, [dateKey]: { ...day, entries: [...day.entries, stored] } },
    library: existing
      ? data.library.map((item) => (item.key === key ? row : item))
      : [...data.library, row],
  }
}

export function removeEntry(
  data: CalorieCounterData,
  dateKey: string,
  entryId: string,
): CalorieCounterData {
  const day = data.days[dateKey]
  if (!day) return data
  return {
    ...data,
    days: {
      ...data.days,
      [dateKey]: { ...day, entries: day.entries.filter((e) => e.id !== entryId) },
    },
  }
}

export function updateEntry(
  data: CalorieCounterData,
  dateKey: string,
  entryId: string,
  patch: Partial<NewEntry>,
): CalorieCounterData {
  const day = data.days[dateKey]
  if (!day) return data
  const nextEntries = day.entries.map((e) => {
    if (e.id !== entryId) return e
    return {
      ...e,
      ...patch,
      calories: patch.calories !== undefined ? Math.max(0, patch.calories) : e.calories,
      protein: patch.protein !== undefined ? Math.max(0, patch.protein) : e.protein,
      carbs: patch.carbs !== undefined ? Math.max(0, patch.carbs) : e.carbs,
      fat: patch.fat !== undefined ? Math.max(0, patch.fat) : e.fat,
      name: patch.name !== undefined ? patch.name.trim() : e.name,
      quantity: patch.quantity !== undefined ? patch.quantity : e.quantity,
      meal: patch.meal !== undefined ? patch.meal : e.meal,
    }
  })
  return {
    ...data,
    days: {
      ...data.days,
      [dateKey]: { ...day, entries: nextEntries },
    },
  }
}

export function setWater(
  data: CalorieCounterData,
  dateKey: string,
  glasses: number,
): CalorieCounterData {
  const day = getDay(data, dateKey)
  const safeGlasses = Math.min(100, Math.max(0, Math.round(Number(glasses) || 0)))
  return {
    ...data,
    days: { ...data.days, [dateKey]: { ...day, water: safeGlasses } },
  }
}

export function setGoals(data: CalorieCounterData, goals: Goals): CalorieCounterData {
  return { ...data, goals }
}

export function forgetFood(data: CalorieCounterData, key: string): CalorieCounterData {
  return { ...data, library: data.library.filter((item) => item.key !== key) }
}

export function clearLibrary(data: CalorieCounterData): CalorieCounterData {
  return { ...data, library: [] }
}


/** Local calendar date as YYYY-MM-DD. Kept here so this feature stays standalone. */
export function dateKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function prettyDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
