import {
  createCalorieCounterData,
  ensureCalorieCounterData,
  type CalorieCounterData,
} from '../features/calorie-counter/data'
import {
  createTodoGraphData,
  ensureTodoGraphData,
  type TodoGraphData,
} from '../features/todo-graph/data'
import {
  createGymData,
  ensureGymData,
  type GymData,
} from '../features/gym/data'
import {
  createNonNegotiablesData,
  ensureNonNegotiablesData,
  type NonNegotiablesData,
} from '../features/non-negotiables/data'

export const DB_VERSION = 1

export type Db = {
  app: 'winter-arc'
  version: number
  profile: { name: string; startedOn: string }
  updatedAt: string
  features: {
    calorieCounter: CalorieCounterData
    todoGraph: TodoGraphData
    gym: GymData
    nonNegotiables: NonNegotiablesData
  }
}

export function todayKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function createDb(name: string): Db {
  return {
    app: 'winter-arc',
    version: DB_VERSION,
    profile: { name: name.trim() || 'you', startedOn: todayKey() },
    updatedAt: new Date().toISOString(),
    features: {
      calorieCounter: createCalorieCounterData(),
      todoGraph: createTodoGraphData(),
      gym: createGymData(),
      nonNegotiables: createNonNegotiablesData(),
    },
  }
}

/**
 * Parses an uploaded file. Unknown or missing feature slices are filled in with
 * empty ones, so an older file still opens in a newer build. Each feature owns
 * the shape of its own slice.
 */
export function parseDb(text: string): Db {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  if (!raw || typeof raw !== 'object') {
    throw new Error("That file doesn't look like a Winter Arc save.")
  }
  const obj = raw as Record<string, unknown>
  if (obj.app !== 'winter-arc') {
    throw new Error("That file doesn't look like a Winter Arc save.")
  }
  if (typeof obj.version === 'number' && obj.version > DB_VERSION) {
    throw new Error(
      `That file was saved by a newer version of the app (v${obj.version}). Update the app first.`,
    )
  }

  const profile = (obj.profile ?? {}) as Record<string, unknown>
  const features = (obj.features ?? {}) as Record<string, unknown>

  return {
    app: 'winter-arc',
    version: DB_VERSION,
    profile: {
      name: typeof profile.name === 'string' ? profile.name : 'you',
      startedOn: typeof profile.startedOn === 'string' ? profile.startedOn : todayKey(),
    },
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
    features: {
      calorieCounter: ensureCalorieCounterData(features.calorieCounter),
      todoGraph: ensureTodoGraphData(features.todoGraph),
      gym: ensureGymData(features.gym),
      nonNegotiables: ensureNonNegotiablesData(features.nonNegotiables),
    },
  }
}

export function serializeDb(db: Db): string {
  return JSON.stringify({ ...db, updatedAt: new Date().toISOString() }, null, 2)
}

export function saveFileName(db: Db): string {
  const slug = db.profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `winter-arc${slug ? `-${slug}` : ''}-${todayKey()}.json`
}
