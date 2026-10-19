/**
 * Feature: 24-Hour Day Planner
 * Pure functions and data model for time blocking, task scheduling,
 * grid snapping, and layout computation.
 */

export type TimeBlockCategory = 'task' | 'non-negotiable' | 'custom'

export type TimeBlock = {
  id: string
  title: string
  startMinute: number // 0 to 1439 (minutes from midnight 00:00)
  durationMinutes: number // duration in minutes (e.g., 15, 30, 45, 60...)
  category: TimeBlockCategory
  color: string // color accent hex
  sourceId?: string // taskId or habitId if scheduled from another feature
  completed?: boolean
  notes?: string
}

export type DaySchedule = {
  date: string // YYYY-MM-DD
  blocks: TimeBlock[]
  notes?: string
}

export type DayPlannerSettings = {
  snapMinutes: 15 | 30
  hourHeight: number // px per hour (default 64)
  startHour: number // 0 to 23 (default 0)
  endHour: number // 1 to 24 (default 24)
}

export type DayPlannerData = {
  days: Record<string, DaySchedule>
  settings: DayPlannerSettings
}

export const CATEGORY_COLORS: Record<TimeBlockCategory, string> = {
  task: '#4f82f7', // Blue
  'non-negotiable': '#3ecf8e', // Emerald
  custom: '#a855f7', // Purple
}

export const PRESET_COLORS = [
  '#4f82f7', // Blue
  '#3ecf8e', // Emerald
  '#a855f7', // Purple
  '#f5a524', // Amber
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#64748b', // Slate
]

export function createDayPlannerData(): DayPlannerData {
  return {
    days: {},
    settings: {
      snapMinutes: 15,
      hourHeight: 64,
      startHour: 0,
      endHour: 24,
    },
  }
}

/**
 * Defensive parser for DayPlannerData.
 * Ensures older save files missing dayPlanner load safely without crashing.
 */
export function ensureDayPlannerData(raw: unknown): DayPlannerData {
  const fallback = createDayPlannerData()
  if (!raw || typeof raw !== 'object') {
    return fallback
  }

  const obj = raw as Record<string, unknown>
  const settings: DayPlannerSettings = {
    snapMinutes: obj.settings && typeof obj.settings === 'object' && (obj.settings as Record<string, unknown>).snapMinutes === 30 ? 30 : 15,
    hourHeight: obj.settings && typeof obj.settings === 'object' && typeof (obj.settings as Record<string, unknown>).hourHeight === 'number'
      ? Math.max(40, Math.min(120, (obj.settings as Record<string, unknown>).hourHeight as number))
      : 64,
    startHour: 0,
    endHour: 24,
  }

  const days: Record<string, DaySchedule> = {}
  if (obj.days && typeof obj.days === 'object') {
    for (const [dateStr, dayVal] of Object.entries(obj.days as Record<string, unknown>)) {
      if (!dayVal || typeof dayVal !== 'object') continue
      const dObj = dayVal as Record<string, unknown>
      const rawBlocks = Array.isArray(dObj.blocks) ? dObj.blocks : []
      const blocks: TimeBlock[] = []

      for (let idx = 0; idx < rawBlocks.length; idx++) {
        const item = rawBlocks[idx]
        if (!item || typeof item !== 'object') continue
        const bObj = item as Record<string, unknown>
        const title = typeof bObj.title === 'string' ? bObj.title.trim() : ''
        if (!title) continue

        const startMinute = typeof bObj.startMinute === 'number'
          ? Math.max(0, Math.min(1439, Math.round(bObj.startMinute)))
          : 540 // 09:00 default
        const durationMinutes = typeof bObj.durationMinutes === 'number'
          ? Math.max(15, Math.min(1440 - startMinute, Math.round(bObj.durationMinutes)))
          : 60

        const category: TimeBlockCategory =
          bObj.category === 'task' || bObj.category === 'non-negotiable' || bObj.category === 'custom'
            ? bObj.category
            : 'custom'

        const color = typeof bObj.color === 'string' && bObj.color
          ? bObj.color
          : CATEGORY_COLORS[category]

        blocks.push({
          id: typeof bObj.id === 'string' ? bObj.id : `block-${Date.now()}-${idx}`,
          title,
          startMinute,
          durationMinutes,
          category,
          color,
          sourceId: typeof bObj.sourceId === 'string' ? bObj.sourceId : undefined,
          completed: Boolean(bObj.completed),
          notes: typeof bObj.notes === 'string' ? bObj.notes : undefined,
        })
      }

      days[dateStr] = {
        date: dateStr,
        blocks,
        notes: typeof dObj.notes === 'string' ? dObj.notes : undefined,
      }
    }
  }

  return {
    days,
    settings,
  }
}

export function getDaySchedule(data: DayPlannerData, date: string): DaySchedule {
  return data.days[date] ?? { date, blocks: [] }
}

export function addTimeBlock(
  data: DayPlannerData,
  date: string,
  block: Omit<TimeBlock, 'id'>,
): DayPlannerData {
  const current = getDaySchedule(data, date)
  const newBlock: TimeBlock = {
    completed: false,
    ...block,
    id: `tb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  }


  return {
    ...data,
    days: {
      ...data.days,
      [date]: {
        ...current,
        blocks: [...current.blocks, newBlock],
      },
    },
  }
}

export function updateTimeBlock(
  data: DayPlannerData,
  date: string,
  blockId: string,
  patch: Partial<TimeBlock>,
): DayPlannerData {
  const current = getDaySchedule(data, date)
  const blocks = current.blocks.map((b) => {
    if (b.id !== blockId) return b
    const updated = { ...b, ...patch }
    // Ensure bounds
    if (updated.startMinute < 0) updated.startMinute = 0
    if (updated.startMinute > 1439) updated.startMinute = 1439
    if (updated.durationMinutes < 15) updated.durationMinutes = 15
    if (updated.startMinute + updated.durationMinutes > 1440) {
      updated.durationMinutes = 1440 - updated.startMinute
    }
    return updated
  })

  return {
    ...data,
    days: {
      ...data.days,
      [date]: {
        ...current,
        blocks,
      },
    },
  }
}

export function deleteTimeBlock(
  data: DayPlannerData,
  date: string,
  blockId: string,
): DayPlannerData {
  const current = getDaySchedule(data, date)
  return {
    ...data,
    days: {
      ...data.days,
      [date]: {
        ...current,
        blocks: current.blocks.filter((b) => b.id !== blockId),
      },
    },
  }
}

export function toggleBlockCompleted(
  data: DayPlannerData,
  date: string,
  blockId: string,
): DayPlannerData {
  const current = getDaySchedule(data, date)
  return {
    ...data,
    days: {
      ...data.days,
      [date]: {
        ...current,
        blocks: current.blocks.map((b) => (b.id === blockId ? { ...b, completed: !b.completed } : b)),
      },
    },
  }
}

// --- Time and Snap Helpers ---------------------------------------------------

export function snapMinutes(minutes: number, step = 15): number {
  return Math.max(0, Math.min(1440 - step, Math.round(minutes / step) * step))
}

/**
 * Formats minute of the day (0-1439) into "HH:MM" (e.g., 570 -> "09:30")
 */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.min(1440, Math.round(minutes)))
  const hours = Math.floor(m / 60)
  const mins = m % 60
  const hStr = String(hours % 24).padStart(2, '0')
  const mStr = String(mins).padStart(2, '0')
  return `${hStr}:${mStr}`
}

/**
 * Formats minute into 12-hour format (e.g. 570 -> "9:30 AM", 780 -> "1:00 PM")
 */
export function formatMinutes12h(minutes: number): string {
  const m = Math.max(0, Math.min(1440, Math.round(minutes)))
  const totalH = Math.floor(m / 60)
  const mins = m % 60
  const h12 = totalH % 12 === 0 ? 12 : totalH % 12
  const ampm = totalH >= 12 && totalH < 24 ? 'PM' : 'AM'
  const mStr = String(mins).padStart(2, '0')
  return `${h12}:${mStr} ${ampm}`
}

/**
 * Formats duration in minutes into compact text (e.g., 90 -> "1h 30m", 45 -> "45m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Layout computation for overlapping blocks so they render cleanly side-by-side
 * like Google Calendar / modern timeline planners.
 */
export type PositionedBlock = {
  block: TimeBlock
  lane: number
  totalLanes: number
}

export function computeBlockLanes(blocks: TimeBlock[]): PositionedBlock[] {
  if (blocks.length === 0) return []

  // Sort blocks by start time, then by duration descending
  const sorted = [...blocks].sort((a, b) => {
    if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute
    return b.durationMinutes - a.durationMinutes
  })

  // Find overlapping clusters
  const clusters: TimeBlock[][] = []
  let currentCluster: TimeBlock[] = []
  let clusterEnd = -1

  for (const block of sorted) {
    const blockEnd = block.startMinute + block.durationMinutes
    if (currentCluster.length === 0 || block.startMinute < clusterEnd) {
      currentCluster.push(block)
      clusterEnd = Math.max(clusterEnd, blockEnd)
    } else {
      clusters.push(currentCluster)
      currentCluster = [block]
      clusterEnd = blockEnd
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster)
  }

  const result: PositionedBlock[] = []

  for (const cluster of clusters) {
    const lanes: TimeBlock[][] = []

    for (const block of cluster) {
      let placed = false
      for (let i = 0; i < lanes.length; i++) {
        const lastInLane = lanes[i][lanes[i].length - 1]
        const lastEnd = lastInLane.startMinute + lastInLane.durationMinutes
        if (block.startMinute >= lastEnd) {
          lanes[i].push(block)
          placed = true
          break
        }
      }
      if (!placed) {
        lanes.push([block])
      }
    }

    const totalLanes = lanes.length
    for (let laneIdx = 0; laneIdx < lanes.length; laneIdx++) {
      for (const block of lanes[laneIdx]) {
        result.push({
          block,
          lane: laneIdx,
          totalLanes,
        })
      }
    }
  }

  return result
}
