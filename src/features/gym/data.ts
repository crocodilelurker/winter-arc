/**
 * Feature 3: The Gym
 * 7-day workout split, custom presets, sets/reps logging, and daily workout tracking.
 */

export type PresetDay = {
  dayIndex: number // 1 = Monday, 2 = Tuesday, ..., 7 = Sunday
  dayLabel: string // "Monday", "Tuesday", etc.
  name: string // e.g. "Chest + Core", "Rest"
  isRest: boolean
  exercises: string[] // List of exercise names
}

export type WorkoutPreset = {
  id: string
  name: string
  isDefault?: boolean
  days: PresetDay[] // Exactly 7 days (Monday through Sunday)
}

export type ExerciseSetLog = {
  id: string
  setNumber: number
  weight: number // in kg or lbs
  reps: number
  completed: boolean
}

export type ExerciseSessionLog = {
  exerciseName: string
  sets: ExerciseSetLog[]
  notes?: string
}

export type DayWorkoutLog = {
  date: string // YYYY-MM-DD
  presetId: string
  dayName: string
  isRest: boolean
  exercises: ExerciseSessionLog[]
  completed: boolean
  completedAt?: string
  durationMinutes?: number
}

export type GymData = {
  activePresetId: string
  presets: WorkoutPreset[]
  history: Record<string, DayWorkoutLog> // Keyed by YYYY-MM-DD
  weightUnit: 'kg' | 'lbs'
}

export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export const DEFAULT_PRESET_ID = 'preset-growth-arc-default'

/**
 * The user's exact default 7-day map starting from Monday:
 * Day 1: Chest + Core
 * Day 2: Back
 * Day 3: Shoulders
 * Day 4: Legs
 * Day 5: Arms (Biceps & Triceps)
 * Day 6: Rest
 * Day 7: Rest
 */
export function createDefaultPreset(): WorkoutPreset {
  return {
    id: DEFAULT_PRESET_ID,
    name: 'Growth Arc 5-Day Split (Default)',
    isDefault: true,
    days: [
      {
        dayIndex: 1,
        dayLabel: 'Monday',
        name: 'Chest + Core',
        isRest: false,
        exercises: [
          'Inclined Dumbbell Press',
          'Flat Barbell Smith Bench Press',
          'Chest Press Machine',
          'Pec Deck Flyes',
          'Cable Crossover Flyes',
        ],
      },
      {
        dayIndex: 2,
        dayLabel: 'Tuesday',
        name: 'Back',
        isRest: false,
        exercises: [
          'Lat Pull Down',
          'T-Bar Row',
          'Seated Cable Row',
          'Single Arm Dumbbell Row',
          'Smith Barbell Bent Over Row',
        ],
      },
      {
        dayIndex: 3,
        dayLabel: 'Wednesday',
        name: 'Shoulders',
        isRest: false,
        exercises: [
          'Seated Dumbbell Shoulder Press',
          'Smith Machine Overhead Press',
          'Machine Lateral Raise',
          'Dumbbell Lateral Raise',
          'Cable Face Pulls',
        ],
      },
      {
        dayIndex: 4,
        dayLabel: 'Thursday',
        name: 'Legs',
        isRest: false,
        exercises: [
          'Barbell Smith Machine Squat',
          'Leg Press',
          'Leg Extension',
          'Lying Leg Curl',
          'Dumbbell Romanian Deadlift',
          'Machine Leg Abduction',
          'Smith Machine Calf Raisers',
        ],
      },
      {
        dayIndex: 5,
        dayLabel: 'Friday',
        name: 'Arms (Biceps & Triceps)',
        isRest: false,
        exercises: [
          'Preacher Curl',
          'Standing Incline Dumbbell Curl',
          'Dumbbell Hammer Curl',
          'Cable Tricep Rope Pulldown',
          'Overhead Cable Tricep Extension',
          'Close Grip Smith Bench Press',
        ],
      },
      {
        dayIndex: 6,
        dayLabel: 'Saturday',
        name: 'Rest Day',
        isRest: true,
        exercises: [],
      },
      {
        dayIndex: 7,
        dayLabel: 'Sunday',
        name: 'Rest Day',
        isRest: true,
        exercises: [],
      },
    ],
  }
}

export function createEmptyPreset(name: string): WorkoutPreset {
  return {
    id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || 'Custom Routine',
    isDefault: false,
    days: DAY_NAMES.map((label, idx) => ({
      dayIndex: idx + 1,
      dayLabel: label,
      name: idx < 5 ? `Day ${idx + 1}` : 'Rest Day',
      isRest: idx >= 5,
      exercises: [],
    })),
  }
}

export function createGymData(): GymData {
  const defaultPreset = createDefaultPreset()
  return {
    activePresetId: defaultPreset.id,
    presets: [defaultPreset],
    history: {},
    weightUnit: 'kg',
  }
}

export function ensureGymData(raw: unknown): GymData {
  if (!raw || typeof raw !== 'object') {
    return createGymData()
  }
  const obj = raw as Record<string, unknown>
  const presets = Array.isArray(obj.presets)
    ? (obj.presets as WorkoutPreset[])
    : [createDefaultPreset()]

  // Ensure default preset is always available
  if (!presets.some((p) => p.id === DEFAULT_PRESET_ID)) {
    presets.unshift(createDefaultPreset())
  }

  const activePresetId =
    typeof obj.activePresetId === 'string' && presets.some((p) => p.id === obj.activePresetId)
      ? obj.activePresetId
      : DEFAULT_PRESET_ID

  const history =
    obj.history && typeof obj.history === 'object' && !Array.isArray(obj.history)
      ? (obj.history as Record<string, DayWorkoutLog>)
      : {}

  const weightUnit = obj.weightUnit === 'lbs' ? 'lbs' : 'kg'

  return {
    activePresetId,
    presets,
    history,
    weightUnit,
  }
}

/**
 * Returns dayIndex (1 = Monday, 2 = Tuesday, ..., 7 = Sunday) for a YYYY-MM-DD date string.
 */
export function getDayIndexForDate(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const jsDay = new Date(y, m - 1, d).getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  return jsDay === 0 ? 7 : jsDay
}

/**
 * Gets or initializes a workout session log for a given date.
 */
export function getOrCreateDayLog(gym: GymData, dateStr: string): DayWorkoutLog {
  const existing = gym.history[dateStr]
  if (existing) {
    return existing
  }

  const activePreset =
    gym.presets.find((p) => p.id === gym.activePresetId) ||
    gym.presets[0] ||
    createDefaultPreset()

  const dayIdx = getDayIndexForDate(dateStr)
  const presetDay = activePreset.days.find((d) => d.dayIndex === dayIdx) || {
    dayIndex: dayIdx,
    dayLabel: DAY_NAMES[dayIdx - 1] || 'Day',
    name: 'Rest Day',
    isRest: true,
    exercises: [],
  }

  // Pre-populate with preset exercises and 3 standard sets
  const exercises: ExerciseSessionLog[] = presetDay.isRest
    ? []
    : presetDay.exercises.map((name) => {
        // Look up previous logged weight for this exercise to provide helpful defaults
        const prev = findLastLoggedExercise(gym, name, dateStr)
        const defaultWeight = prev?.weight ?? 0
        const defaultReps = prev?.reps ?? 10

        return {
          exerciseName: name,
          sets: [
            { id: makeSetId(), setNumber: 1, weight: defaultWeight, reps: defaultReps, completed: false },
            { id: makeSetId(), setNumber: 2, weight: defaultWeight, reps: defaultReps, completed: false },
            { id: makeSetId(), setNumber: 3, weight: defaultWeight, reps: defaultReps, completed: false },
          ],
        }
      })

  return {
    date: dateStr,
    presetId: activePreset.id,
    dayName: presetDay.name,
    isRest: presetDay.isRest,
    exercises,
    completed: false,
  }
}

function makeSetId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Find the most recent logged weight/reps for an exercise prior to the given date.
 */
export function findLastLoggedExercise(
  gym: GymData,
  exerciseName: string,
  beforeDate: string,
): { weight: number; reps: number; date: string } | null {
  const targetLower = exerciseName.trim().toLowerCase()
  const dates = Object.keys(gym.history)
    .filter((d) => d < beforeDate)
    .sort()
    .reverse()

  for (const d of dates) {
    const day = gym.history[d]
    if (!day || day.isRest) continue
    const match = day.exercises.find(
      (e) => e.exerciseName.trim().toLowerCase() === targetLower,
    )
    if (match && match.sets.length > 0) {
      // Find highest completed set or first set
      const completed = match.sets.filter((s) => s.completed)
      const targetSet = completed.length > 0 ? completed[completed.length - 1] : match.sets[0]
      if (targetSet && (targetSet.weight > 0 || targetSet.reps > 0)) {
        return { weight: targetSet.weight, reps: targetSet.reps, date: d }
      }
    }
  }

  return null
}

// --------------------------------------------------------------------------
// Immutable Data Operations
// --------------------------------------------------------------------------

export function saveDayLog(gym: GymData, log: DayWorkoutLog): GymData {
  return {
    ...gym,
    history: {
      ...gym.history,
      [log.date]: log,
    },
  }
}

export function updateSetInDay(
  gym: GymData,
  dateStr: string,
  exerciseIdx: number,
  setIdx: number,
  patch: Partial<ExerciseSetLog>,
): GymData {
  const log = getOrCreateDayLog(gym, dateStr)
  const nextExercises = log.exercises.map((ex, eIdx) => {
    if (eIdx !== exerciseIdx) return ex
    const nextSets = ex.sets.map((st, sIdx) => {
      if (sIdx !== setIdx) return st
      return { ...st, ...patch }
    })
    return { ...ex, sets: nextSets }
  })

  // Auto-evaluate completed status
  const allSets = nextExercises.flatMap((e) => e.sets)
  const allCompleted = allSets.length > 0 && allSets.every((s) => s.completed)

  return saveDayLog(gym, {
    ...log,
    exercises: nextExercises,
    completed: allCompleted,
  })
}

export function addSetToExercise(
  gym: GymData,
  dateStr: string,
  exerciseIdx: number,
): GymData {
  const log = getOrCreateDayLog(gym, dateStr)
  const nextExercises = log.exercises.map((ex, eIdx) => {
    if (eIdx !== exerciseIdx) return ex
    const lastSet = ex.sets[ex.sets.length - 1]
    const nextSetNumber = ex.sets.length + 1
    const newSet: ExerciseSetLog = {
      id: makeSetId(),
      setNumber: nextSetNumber,
      weight: lastSet ? lastSet.weight : 0,
      reps: lastSet ? lastSet.reps : 10,
      completed: false,
    }
    return { ...ex, sets: [...ex.sets, newSet] }
  })

  return saveDayLog(gym, {
    ...log,
    exercises: nextExercises,
  })
}

export function removeSetFromExercise(
  gym: GymData,
  dateStr: string,
  exerciseIdx: number,
  setIdx: number,
): GymData {
  const log = getOrCreateDayLog(gym, dateStr)
  const nextExercises = log.exercises.map((ex, eIdx) => {
    if (eIdx !== exerciseIdx) return ex
    const nextSets = ex.sets
      .filter((_, sIdx) => sIdx !== setIdx)
      .map((s, idx) => ({ ...s, setNumber: idx + 1 }))
    return { ...ex, sets: nextSets }
  })

  return saveDayLog(gym, {
    ...log,
    exercises: nextExercises,
  })
}

export function addExerciseToDay(
  gym: GymData,
  dateStr: string,
  exerciseName: string,
): GymData {
  const trimmed = exerciseName.trim()
  if (!trimmed) return gym

  const log = getOrCreateDayLog(gym, dateStr)
  const prev = findLastLoggedExercise(gym, trimmed, dateStr)
  const newExercise: ExerciseSessionLog = {
    exerciseName: trimmed,
    sets: [
      { id: makeSetId(), setNumber: 1, weight: prev?.weight ?? 0, reps: prev?.reps ?? 10, completed: false },
      { id: makeSetId(), setNumber: 2, weight: prev?.weight ?? 0, reps: prev?.reps ?? 10, completed: false },
      { id: makeSetId(), setNumber: 3, weight: prev?.weight ?? 0, reps: prev?.reps ?? 10, completed: false },
    ],
  }

  return saveDayLog(gym, {
    ...log,
    isRest: false,
    exercises: [...log.exercises, newExercise],
  })
}

export function removeExerciseFromDay(
  gym: GymData,
  dateStr: string,
  exerciseIdx: number,
): GymData {
  const log = getOrCreateDayLog(gym, dateStr)
  const nextExercises = log.exercises.filter((_, idx) => idx !== exerciseIdx)
  return saveDayLog(gym, {
    ...log,
    exercises: nextExercises,
  })
}

export function updateExerciseNotes(
  gym: GymData,
  dateStr: string,
  exerciseIdx: number,
  notes: string,
): GymData {
  const log = getOrCreateDayLog(gym, dateStr)
  const nextExercises = log.exercises.map((ex, idx) =>
    idx === exerciseIdx ? { ...ex, notes } : ex,
  )
  return saveDayLog(gym, {
    ...log,
    exercises: nextExercises,
  })
}

export function toggleDayRest(gym: GymData, dateStr: string): GymData {
  const log = getOrCreateDayLog(gym, dateStr)
  const isRest = !log.isRest
  return saveDayLog(gym, {
    ...log,
    isRest,
    dayName: isRest ? 'Rest Day' : 'Workout Day',
  })
}

export function toggleDayWorkoutCompleted(gym: GymData, dateStr: string): GymData {
  const log = getOrCreateDayLog(gym, dateStr)
  const nextCompleted = !log.completed
  // If marking complete, also mark all sets complete
  const nextExercises = log.exercises.map((ex) => ({
    ...ex,
    sets: ex.sets.map((s) => ({ ...s, completed: nextCompleted })),
  }))

  return saveDayLog(gym, {
    ...log,
    completed: nextCompleted,
    completedAt: nextCompleted ? new Date().toISOString() : undefined,
    exercises: nextExercises,
  })
}

// --------------------------------------------------------------------------
// Preset Management Operations
// --------------------------------------------------------------------------

export function savePreset(gym: GymData, preset: WorkoutPreset): GymData {
  const idx = gym.presets.findIndex((p) => p.id === preset.id)
  let nextPresets: WorkoutPreset[]
  if (idx >= 0) {
    nextPresets = gym.presets.map((p, i) => (i === idx ? preset : p))
  } else {
    nextPresets = [...gym.presets, preset]
  }

  return {
    ...gym,
    presets: nextPresets,
    activePresetId: preset.id,
  }
}

export function deletePreset(gym: GymData, presetId: string): GymData {
  if (presetId === DEFAULT_PRESET_ID) {
    // Default preset cannot be deleted
    return gym
  }
  const nextPresets = gym.presets.filter((p) => p.id !== presetId)
  const nextActive =
    gym.activePresetId === presetId
      ? nextPresets[0]?.id || DEFAULT_PRESET_ID
      : gym.activePresetId

  return {
    ...gym,
    presets: nextPresets,
    activePresetId: nextActive,
  }
}

export function setActivePreset(gym: GymData, presetId: string): GymData {
  if (!gym.presets.some((p) => p.id === presetId)) return gym
  return {
    ...gym,
    activePresetId: presetId,
  }
}

export function resetDefaultPreset(gym: GymData): GymData {
  const freshDefault = createDefaultPreset()
  const nextPresets = gym.presets.map((p) =>
    p.id === DEFAULT_PRESET_ID ? freshDefault : p,
  )
  return {
    ...gym,
    presets: nextPresets,
    activePresetId: DEFAULT_PRESET_ID,
  }
}

export function toggleWeightUnit(gym: GymData): GymData {
  return {
    ...gym,
    weightUnit: gym.weightUnit === 'kg' ? 'lbs' : 'kg',
  }
}
