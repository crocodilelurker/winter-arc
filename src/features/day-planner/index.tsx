import { useState, useEffect, useRef, useMemo } from 'react'
import { todayKey } from '../../db/types'
import type { TodoGraphData } from '../todo-graph/data'
import type { NonNegotiablesData } from '../non-negotiables/data'
import {
  type DayPlannerData,
  type TimeBlock,
  type TimeBlockCategory,
  getDaySchedule,
  addTimeBlock,
  updateTimeBlock,
  deleteTimeBlock,
  toggleBlockCompleted,
  snapMinutes,
  formatMinutes,
  formatMinutes12h,
  formatDuration,
  computeBlockLanes,
  PRESET_COLORS,
  CATEGORY_COLORS,
} from './data'
import './planner.css'

type Props = {
  data: DayPlannerData
  onChange: (next: DayPlannerData) => void
  tasksData: TodoGraphData
  habitsData: NonNegotiablesData
}

type DragPayload = {
  type: 'new-block' | 'move-block'
  blockId?: string
  title: string
  category: TimeBlockCategory
  color: string
  durationMinutes: number
  sourceId?: string
}

export default function DayPlanner({ data, onChange, tasksData, habitsData }: Props) {
  const today = useMemo(() => todayKey(), [])
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [panelTab, setPanelTab] = useState<'all' | 'tasks' | 'habits'>('all')
  const [mobilePlannerTab, setMobilePlannerTab] = useState<'timeline' | 'items'>('timeline')
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // Settings
  const snapMinutesStep = data.settings?.snapMinutes || 15
  const hourHeight = data.settings?.hourHeight || 64
  const totalHeight = 24 * hourHeight

  // Quick add form state in side panel
  const [quickTitle, setQuickTitle] = useState('')
  const [quickDuration, setQuickDuration] = useState<number>(60)

  // Live current time tracker
  const [currentMinutes, setCurrentMinutes] = useState<number>(() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })

  // Grid refs
  const gridRef = useRef<HTMLDivElement>(null)
  const timelineScrollRef = useRef<HTMLDivElement>(null)

  // Drag over ghost preview state
  const [ghostPreview, setGhostPreview] = useState<{
    startMinute: number
    durationMinutes: number
    title: string
  } | null>(null)

  // Resize state
  const [resizing, setResizing] = useState<{
    blockId: string
    edge: 'top' | 'bottom'
    startY: number
    origStartMinute: number
    origDuration: number
  } | null>(null)

  // Edit Modal state
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null)

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date()
      setCurrentMinutes(d.getHours() * 60 + d.getMinutes())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to current hour or 08:00 on mount
  useEffect(() => {
    if (timelineScrollRef.current) {
      const targetMin = selectedDate === today ? currentMinutes : 480 // 08:00 AM
      const scrollPos = Math.max(0, (targetMin / 60) * hourHeight - 140)
      timelineScrollRef.current.scrollTop = scrollPos
    }
  }, [selectedDate, today, hourHeight])

  const schedule = getDaySchedule(data, selectedDate)

  // Compute non-overlapping layout lanes for all blocks
  const positionedBlocks = useMemo(() => {
    return computeBlockLanes(schedule.blocks)
  }, [schedule.blocks])

  // Tasks from TodoGraph for selectedDate (or active tasks)
  const dayTasks = useMemo(() => {
    const dayPlan = tasksData.days[selectedDate]
    if (dayPlan && Array.isArray(dayPlan.tasks) && dayPlan.tasks.length > 0) {
      return dayPlan.tasks
    }
    // Fallback: collect tasks from today or recent dates
    const all: typeof tasksData.days[string]['tasks'] = []
    for (const d of Object.values(tasksData.days)) {
      if (Array.isArray(d.tasks)) {
        for (const t of d.tasks) {
          if (!t.completed) all.push(t)
        }
      }
    }
    return all.slice(0, 15)
  }, [tasksData, selectedDate])

  // Habits from NonNegotiables
  const dayHabits = useMemo(() => {
    return habitsData.habits || []
  }, [habitsData])

  // Track scheduled source IDs for easy visual status badges
  const scheduledSourceIds = useMemo(() => {
    const set = new Set<string>()
    for (const b of schedule.blocks) {
      if (b.sourceId) set.add(b.sourceId)
      // Also match by title for flexibility
      set.add(b.title.trim().toLowerCase())
    }
    return set
  }, [schedule.blocks])

  // Date shifting
  const shiftDay = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const next = new Date(y, m - 1, d + days)
    const pad = (n: number) => String(n).padStart(2, '0')
    setSelectedDate(`${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`)
  }

  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // --- Drag and Drop Handlers ------------------------------------------------

  const handleDragStartFromPanel = (
    e: React.DragEvent,
    title: string,
    category: TimeBlockCategory,
    sourceId?: string,
    defaultDuration = 60,
  ) => {
    const payload: DragPayload = {
      type: 'new-block',
      title,
      category,
      color: CATEGORY_COLORS[category],
      durationMinutes: defaultDuration,
      sourceId,
    }
    e.dataTransfer.setData('application/json', JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleBlockDragStart = (e: React.DragEvent, block: TimeBlock) => {
    const payload: DragPayload = {
      type: 'move-block',
      blockId: block.id,
      title: block.title,
      category: block.category,
      color: block.color,
      durationMinutes: block.durationMinutes,
      sourceId: block.sourceId,
    }
    e.dataTransfer.setData('application/json', JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleGridDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!gridRef.current) return

    const rect = gridRef.current.getBoundingClientRect()
    const offsetY = Math.max(0, Math.min(totalHeight, e.clientY - rect.top))
    const exactMin = (offsetY / totalHeight) * 1440
    const snapped = snapMinutes(exactMin, snapMinutesStep)

    // Check payload if available
    let duration = 60
    let title = 'New Block'
    try {
      const dataStr = e.dataTransfer.getData('application/json')
      if (dataStr) {
        const parsed = JSON.parse(dataStr) as DragPayload
        duration = parsed.durationMinutes || 60
        title = parsed.title || 'New Block'
      }
    } catch {}

    setGhostPreview({
      startMinute: snapped,
      durationMinutes: duration,
      title,
    })
  }

  const handleGridDragLeave = () => {
    setGhostPreview(null)
  }

  const handleGridDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setGhostPreview(null)
    if (!gridRef.current) return

    const rect = gridRef.current.getBoundingClientRect()
    const offsetY = Math.max(0, Math.min(totalHeight, e.clientY - rect.top))
    const exactMin = (offsetY / totalHeight) * 1440
    const snapped = snapMinutes(exactMin, snapMinutesStep)

    try {
      const dataStr = e.dataTransfer.getData('application/json')
      if (!dataStr) return
      const payload = JSON.parse(dataStr) as DragPayload

      if (payload.type === 'move-block' && payload.blockId) {
        onChange(
          updateTimeBlock(data, selectedDate, payload.blockId, {
            startMinute: snapped,
          }),
        )
      } else if (payload.type === 'new-block') {
        onChange(
          addTimeBlock(data, selectedDate, {
            title: payload.title,
            category: payload.category,
            color: payload.color || CATEGORY_COLORS[payload.category],
            startMinute: snapped,
            durationMinutes: payload.durationMinutes || 60,
            sourceId: payload.sourceId,
          }),
        )
      }
    } catch (err) {
      console.warn('Drop handling error:', err)
    }
  }

  // --- Stretching / Resizing Handlers ----------------------------------------

  const handleResizeStart = (
    e: React.PointerEvent,
    block: TimeBlock,
    edge: 'top' | 'bottom',
  ) => {
    e.stopPropagation()
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    setResizing({
      blockId: block.id,
      edge,
      startY: e.clientY,
      origStartMinute: block.startMinute,
      origDuration: block.durationMinutes,
    })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!resizing) return
    const deltaY = e.clientY - resizing.startY
    const deltaMinutes = (deltaY / hourHeight) * 60

    if (resizing.edge === 'bottom') {
      const rawNewDuration = resizing.origDuration + deltaMinutes
      const snappedDuration = Math.max(
        snapMinutesStep,
        Math.min(
          1440 - resizing.origStartMinute,
          snapMinutes(rawNewDuration, snapMinutesStep),
        ),
      )
      onChange(
        updateTimeBlock(data, selectedDate, resizing.blockId, {
          durationMinutes: snappedDuration,
        }),
      )
    } else if (resizing.edge === 'top') {
      const origEnd = resizing.origStartMinute + resizing.origDuration
      const rawNewStart = resizing.origStartMinute + deltaMinutes
      const snappedStart = Math.max(
        0,
        Math.min(origEnd - snapMinutesStep, snapMinutes(rawNewStart, snapMinutesStep)),
      )
      const newDuration = origEnd - snappedStart
      onChange(
        updateTimeBlock(data, selectedDate, resizing.blockId, {
          startMinute: snappedStart,
          durationMinutes: newDuration,
        }),
      )
    }
  }

  const handlePointerUp = () => {
    setResizing(null)
  }

  // --- Quick Add From Side Panel ---------------------------------------------

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickTitle.trim()) return

    // Find next available slot or default to current/morning
    let nextStart = selectedDate === today ? snapMinutes(currentMinutes, snapMinutesStep) : 540 // 09:00
    if (schedule.blocks.length > 0) {
      const latest = Math.max(
        ...schedule.blocks.map((b) => b.startMinute + b.durationMinutes),
      )
      if (latest < 1440 - quickDuration) {
        nextStart = snapMinutes(latest, snapMinutesStep)
      }
    }

    onChange(
      addTimeBlock(data, selectedDate, {
        title: quickTitle.trim(),
        category: 'custom',
        color: CATEGORY_COLORS.custom,
        startMinute: nextStart,
        durationMinutes: quickDuration,
      }),
    )
    setQuickTitle('')
  }

  // Open add / edit modal
  const handleOpenAddModal = (startMinute?: number) => {
    let start = startMinute
    if (start === undefined) {
      start = selectedDate === today ? snapMinutes(currentMinutes, snapMinutesStep) : 540
      if (schedule.blocks.length > 0) {
        const latest = Math.max(...schedule.blocks.map((b) => b.startMinute + b.durationMinutes))
        if (latest < 1440 - 60) {
          start = snapMinutes(latest, snapMinutesStep)
        }
      }
    }
    setEditingBlock({
      id: '__new__',
      title: '',
      category: 'custom',
      color: CATEGORY_COLORS.custom,
      startMinute: start,
      durationMinutes: 60,
    })
  }

  // 1-tap schedule from tasks / habits panel
  const handleScheduleItem = (
    title: string,
    category: TimeBlockCategory,
    sourceId?: string,
    defaultDuration = 60,
  ) => {
    let nextStart = selectedDate === today ? snapMinutes(currentMinutes, snapMinutesStep) : 540
    if (schedule.blocks.length > 0) {
      const latest = Math.max(...schedule.blocks.map((b) => b.startMinute + b.durationMinutes))
      if (latest < 1440 - defaultDuration) {
        nextStart = snapMinutes(latest, snapMinutesStep)
      }
    }

    const nextData = addTimeBlock(data, selectedDate, {
      title,
      category,
      color: CATEGORY_COLORS[category],
      startMinute: nextStart,
      durationMinutes: defaultDuration,
      sourceId,
    })
    onChange(nextData)
    setMobilePlannerTab('timeline')
    setToastMsg(`Scheduled "${title}" at ${formatMinutes(nextStart)}`)
    setTimeout(() => setToastMsg(null), 3000)

    if (timelineScrollRef.current) {
      setTimeout(() => {
        timelineScrollRef.current?.scrollTo({
          top: Math.max(0, (nextStart / 60) * hourHeight - 120),
          behavior: 'smooth',
        })
      }, 120)
    }
  }

  // Click empty grid slot to add 30-min block
  const handleGridClick = (e: React.MouseEvent) => {
    if (!gridRef.current) return
    const target = e.target as HTMLElement
    if (target.closest('.dp-block')) return // clicked block, let block click handle it
    const rect = gridRef.current.getBoundingClientRect()
    const offsetY = Math.max(0, Math.min(totalHeight, e.clientY - rect.top))
    const exactMin = (offsetY / totalHeight) * 1440
    const snapped = snapMinutes(exactMin, snapMinutesStep)
    handleOpenAddModal(snapped)
  }

  return (
    <div
      className="dp-root"
      onPointerMove={resizing ? handlePointerMove : undefined}
      onPointerUp={resizing ? handlePointerUp : undefined}
    >
      {/* Toast Notification */}
      {toastMsg && (
        <div className="dp-toast">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Date Navigation */}
      <div className="dp-header">
        <div className="dp-date-nav">
          <button
            type="button"
            className="ghost sm"
            onClick={() => shiftDay(-1)}
            title="Previous Day"
          >
            ‹
          </button>
          <div className="dp-date-label">
            {selectedDate === today && <span className="dp-today-badge">Today</span>}
            {displayDate}
          </div>
          <button
            type="button"
            className="ghost sm"
            onClick={() => shiftDay(1)}
            title="Next Day"
          >
            ›
          </button>
        </div>

        <div className="dp-header-actions">
          {/* Snap settings */}
          <div className="dp-snap-selector">
            <span>Grid Snap:</span>
            <button
              type="button"
              className={`dp-snap-btn ${snapMinutesStep === 15 ? 'is-active' : ''}`}
              onClick={() =>
                onChange({
                  ...data,
                  settings: { ...data.settings, snapMinutes: 15 },
                })
              }
            >
              15m
            </button>
            <button
              type="button"
              className={`dp-snap-btn ${snapMinutesStep === 30 ? 'is-active' : ''}`}
              onClick={() =>
                onChange({
                  ...data,
                  settings: { ...data.settings, snapMinutes: 30 },
                })
              }
            >
              30m
            </button>
          </div>

          {selectedDate !== today && (
            <button
              type="button"
              className="ghost sm"
              onClick={() => setSelectedDate(today)}
            >
              Today
            </button>
          )}

          <button
            type="button"
            className="ghost sm"
            onClick={() => {
              if (timelineScrollRef.current) {
                const target = selectedDate === today ? currentMinutes : 480
                timelineScrollRef.current.scrollTo({
                  top: Math.max(0, (target / 60) * hourHeight - 140),
                  behavior: 'smooth',
                })
              }
            }}
            title="Scroll to current time"
          >
            {selectedDate === today ? 'Jump to Now' : 'Jump to 8:00 AM'}
          </button>
        </div>
      </div>

      {/* Mobile Mode Switcher (Visible only on mobile phones) */}
      <div className="dp-mobile-view-tabs">
        <button
          type="button"
          className={`dp-mobile-view-tab ${mobilePlannerTab === 'timeline' ? 'is-active' : ''}`}
          onClick={() => setMobilePlannerTab('timeline')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>24h Timeline ({schedule.blocks.length})</span>
        </button>
        <button
          type="button"
          className={`dp-mobile-view-tab ${mobilePlannerTab === 'items' ? 'is-active' : ''}`}
          onClick={() => setMobilePlannerTab('items')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span>Tasks & Habits ({dayTasks.length + dayHabits.length})</span>
        </button>
      </div>

      {/* Main Workspace */}
      <div className={`dp-workspace mobile-${mobilePlannerTab}`}>
        {/* Left: 24-Hour Timeline */}
        <div className="dp-timeline-container">
          <div className="dp-timeline-toolbar">
            <div className="dp-toolbar-left">
              <span>
                <strong>24-Hour Schedule</strong> · {schedule.blocks.length} blocks planned
              </span>
              <span className="dp-toolbar-tip">
                Tip: Drag from right panel · Stretch edges to resize
              </span>
            </div>
            <button
              type="button"
              className="primary sm dp-toolbar-add-btn"
              onClick={() => handleOpenAddModal()}
            >
              + Add Block
            </button>
          </div>

          <div className="dp-timeline-scroll" ref={timelineScrollRef}>
            <div className="dp-timeline-canvas" style={{ height: `${totalHeight}px` }}>
              {/* Hour Labels Ruler on the left */}
              <div className="dp-ruler">
                {Array.from({ length: 25 }, (_, hour) => {
                  const top = hour * hourHeight
                  return (
                    <span
                      key={hour}
                      className="dp-hour-label"
                      style={{ top: `${top}px` }}
                    >
                      {String(hour % 24).padStart(2, '0')}:00
                    </span>
                  )
                })}
              </div>

              {/* Grid Canvas on the right */}
              <div
                className="dp-grid"
                ref={gridRef}
                onDragOver={handleGridDragOver}
                onDragLeave={handleGridDragLeave}
                onDrop={handleGridDrop}
                onClick={handleGridClick}
              >
                {/* Horizontal Grid Lines */}
                {Array.from({ length: 24 }, (_, hour) => {
                  const top = hour * hourHeight
                  return (
                    <div key={`h-${hour}`}>
                      {/* Hour line */}
                      <div className="dp-grid-hour-line" style={{ top: `${top}px` }} />
                      {/* 30-min dashed line */}
                      <div
                        className="dp-grid-half-line"
                        style={{ top: `${top + hourHeight / 2}px` }}
                      />
                      {/* 15-min subtle dotted lines */}
                      {snapMinutesStep === 15 && (
                        <>
                          <div
                            className="dp-grid-quarter-line"
                            style={{ top: `${top + hourHeight * 0.25}px` }}
                          />
                          <div
                            className="dp-grid-quarter-line"
                            style={{ top: `${top + hourHeight * 0.75}px` }}
                          />
                        </>
                      )}
                    </div>
                  )
                })}

                {/* Ghost Preview when dragging onto grid */}
                {ghostPreview && (
                  <div
                    className="dp-ghost-preview"
                    style={{
                      top: `${(ghostPreview.startMinute / 60) * hourHeight}px`,
                      height: `${Math.max(20, (ghostPreview.durationMinutes / 60) * hourHeight)}px`,
                    }}
                  >
                    <span>
                      {formatMinutes(ghostPreview.startMinute)} –{' '}
                      {formatMinutes(ghostPreview.startMinute + ghostPreview.durationMinutes)} (
                      {formatDuration(ghostPreview.durationMinutes)}) · {ghostPreview.title}
                    </span>
                  </div>
                )}

                {/* Glowing "NOW" Indicator Line if viewing Today */}
                {selectedDate === today && currentMinutes >= 0 && currentMinutes <= 1440 && (
                  <div
                    className="dp-now-line"
                    style={{ top: `${(currentMinutes / 60) * hourHeight}px` }}
                  >
                    <span className="dp-now-pill">
                      Now {formatMinutes12h(currentMinutes)}
                    </span>
                  </div>
                )}

                {/* Scheduled Time Blocks */}
                {positionedBlocks.map(({ block, lane, totalLanes }) => {
                  const top = (block.startMinute / 60) * hourHeight
                  const height = Math.max(22, (block.durationMinutes / 60) * hourHeight)

                  // Lane positioning for overlapping blocks
                  const laneWidthPct = 100 / totalLanes
                  const leftPct = lane * laneWidthPct

                  const isBeingResized = resizing?.blockId === block.id

                  return (
                    <div
                      key={block.id}
                      draggable={!resizing}
                      onDragStart={(e) => handleBlockDragStart(e, block)}
                      onClick={() => setEditingBlock(block)}
                      className={`dp-block ${isBeingResized ? 'is-resizing' : ''} ${
                        block.completed ? 'is-completed' : ''
                      }`}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        left: `calc(${leftPct}% + 4px)`,
                        width: `calc(${laneWidthPct}% - 8px)`,
                        borderLeftColor: block.color,
                        background: `${block.color}15`,
                      }}
                    >
                      {/* Top Stretch Handle */}
                      <div
                        className="dp-stretch-handle top"
                        onPointerDown={(e) => handleResizeStart(e, block, 'top')}
                        title="Stretch earlier/later"
                      >
                        <div className="dp-stretch-grip" />
                      </div>

                      {/* Block Body Header */}
                      <div className="dp-block-header">
                        <div className="dp-block-title-wrap">
                          <button
                            type="button"
                            className={`dp-block-check ${block.completed ? 'checked' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onChange(toggleBlockCompleted(data, selectedDate, block.id))
                            }}
                            title={block.completed ? 'Mark incomplete' : 'Mark completed'}
                          >
                            {block.completed && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                          <span className="dp-block-title" title={block.title}>
                            {block.title}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="dp-block-del"
                          onClick={(e) => {
                            e.stopPropagation()
                            onChange(deleteTimeBlock(data, selectedDate, block.id))
                          }}
                          title="Delete time block"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>

                      {/* Block Time & Duration Meta */}
                      {height >= 34 && (
                        <div className="dp-block-meta">
                          <span className="dp-time-pill">
                            {formatMinutes(block.startMinute)} –{' '}
                            {formatMinutes(block.startMinute + block.durationMinutes)}
                          </span>
                          <span className="dp-duration-pill">
                            {formatDuration(block.durationMinutes)}
                          </span>
                          <span
                            className="dp-cat-tag"
                            style={{ color: block.color }}
                          >
                            {block.category}
                          </span>
                        </div>
                      )}

                      {/* Bottom Stretch Handle */}
                      <div
                        className="dp-stretch-handle bottom"
                        onPointerDown={(e) => handleResizeStart(e, block, 'bottom')}
                        title="Stretch duration"
                      >
                        <div className="dp-stretch-grip" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Mobile Floating Add Button */}
          <button
            type="button"
            className="dp-floating-add-btn"
            onClick={() => handleOpenAddModal()}
            title="Add Time Block"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Right Side Panel: Tasks & Non-Negotiables */}
        <aside className="dp-side-panel">
          <div className="dp-panel-header">
            <div className="dp-panel-title-row">
              <span className="dp-panel-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Available for the Day
              </span>
            </div>
            <p className="dp-panel-hint">
              Drag into the timeline or tap Schedule to place on the 24h grid.
            </p>

            <div className="dp-panel-tabs">
              <button
                type="button"
                className={`dp-panel-tab ${panelTab === 'all' ? 'is-active' : ''}`}
                onClick={() => setPanelTab('all')}
              >
                All ({dayTasks.length + dayHabits.length})
              </button>
              <button
                type="button"
                className={`dp-panel-tab ${panelTab === 'tasks' ? 'is-active' : ''}`}
                onClick={() => setPanelTab('tasks')}
              >
                Tasks ({dayTasks.length})
              </button>
              <button
                type="button"
                className={`dp-panel-tab ${panelTab === 'habits' ? 'is-active' : ''}`}
                onClick={() => setPanelTab('habits')}
              >
                Habits ({dayHabits.length})
              </button>
            </div>
          </div>

          <div className="dp-panel-body">
            {/* Tasks section */}
            {(panelTab === 'all' || panelTab === 'tasks') && (
              <>
                {dayTasks.map((task) => {
                  const isScheduled =
                    scheduledSourceIds.has(task.id) ||
                    scheduledSourceIds.has(task.title.trim().toLowerCase())

                  return (
                    <div
                      key={task.id}
                      draggable={true}
                      onDragStart={(e) =>
                        handleDragStartFromPanel(e, task.title, 'task', task.id, 60)
                      }
                      className={`dp-item-card ${isScheduled ? 'is-scheduled' : ''}`}
                      title="Drag into the timeline or click Schedule"
                    >
                      <div className="dp-item-top">
                        <span className="dp-item-badge task">Task #{task.number}</span>
                        {isScheduled && (
                          <span className="dp-scheduled-badge">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Scheduled
                          </span>
                        )}
                      </div>
                      <div className="dp-item-title">{task.title}</div>
                      <div className="dp-item-bottom">
                        <div className="dp-item-sub">
                          <span>{task.topic || 'General'}</span>
                          <span className="dp-drag-hint">Drag to Grid</span>
                        </div>
                        <button
                          type="button"
                          className="dp-schedule-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleScheduleItem(task.title, 'task', task.id, 60)
                          }}
                          title="Schedule into timeline"
                        >
                          + Schedule
                        </button>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* Non-negotiable habits section */}
            {(panelTab === 'all' || panelTab === 'habits') && (
              <>
                {dayHabits.map((habit) => {
                  const isScheduled =
                    scheduledSourceIds.has(habit.id) ||
                    scheduledSourceIds.has(habit.name.trim().toLowerCase())

                  return (
                    <div
                      key={habit.id}
                      draggable={true}
                      onDragStart={(e) =>
                        handleDragStartFromPanel(e, habit.name, 'non-negotiable', habit.id, 30)
                      }
                      className={`dp-item-card ${isScheduled ? 'is-scheduled' : ''}`}
                      title="Drag into the timeline or click Schedule"
                    >
                      <div className="dp-item-top">
                        <span className="dp-item-badge habit">Habit</span>
                        {isScheduled && (
                          <span className="dp-scheduled-badge">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Scheduled
                          </span>
                        )}
                      </div>
                      <div className="dp-item-title">{habit.name}</div>
                      <div className="dp-item-bottom">
                        <div className="dp-item-sub">
                          <span>{habit.unit ? `Target: ${habit.target} ${habit.unit}` : 'Daily Routine'}</span>
                          <span className="dp-drag-hint">Drag to Grid</span>
                        </div>
                        <button
                          type="button"
                          className="dp-schedule-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleScheduleItem(habit.name, 'non-negotiable', habit.id, 30)
                          }}
                          title="Schedule into timeline"
                        >
                          + Schedule
                        </button>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {dayTasks.length === 0 && dayHabits.length === 0 && (
              <div className="dp-empty-panel">
                <p>No tasks or habits found for this day.</p>
                <p>Create a quick custom block below!</p>
              </div>
            )}
          </div>

          {/* Quick Add Custom Block at bottom of panel */}
          <form onSubmit={handleQuickAddSubmit} className="dp-quick-add">
            <div className="dp-quick-input-row">
              <input
                type="text"
                placeholder="+ Quick time block title..."
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="dp-quick-input"
              />
              <button
                type="submit"
                className="primary sm"
                disabled={!quickTitle.trim()}
              >
                Add
              </button>
            </div>

            <div className="dp-quick-duration-pills">
              {[15, 30, 45, 60, 90, 120].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  className={`dp-duration-btn ${quickDuration === dur ? 'is-active' : ''}`}
                  onClick={() => setQuickDuration(dur)}
                >
                  {formatDuration(dur)}
                </button>
              ))}
            </div>
          </form>
        </aside>
      </div>

      {/* Edit Block Details Modal */}
      {editingBlock && (
        <div
          className="dp-modal-overlay"
          onClick={() => setEditingBlock(null)}
        >
          <div
            className="dp-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dp-modal-header">
              <h3 className="dp-modal-title">Edit Time Block</h3>
              <button
                type="button"
                className="ghost sm"
                onClick={() => setEditingBlock(null)}
              >
                ✕
              </button>
            </div>

            <div className="dp-modal-form">
              <div className="field">
                <label>Title</label>
                <input
                  type="text"
                  value={editingBlock.title}
                  onChange={(e) =>
                    setEditingBlock({ ...editingBlock, title: e.target.value })
                  }
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="field">
                  <label>Start Time (HH:MM)</label>
                  <input
                    type="time"
                    value={formatMinutes(editingBlock.startMinute)}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(':').map(Number)
                      if (!isNaN(h) && !isNaN(m)) {
                        setEditingBlock({
                          ...editingBlock,
                          startMinute: h * 60 + m,
                        })
                      }
                    }}
                  />
                </div>

                <div className="field">
                  <label>Duration ({formatDuration(editingBlock.durationMinutes)})</label>
                  <select
                    value={editingBlock.durationMinutes}
                    onChange={(e) =>
                      setEditingBlock({
                        ...editingBlock,
                        durationMinutes: Number(e.target.value),
                      })
                    }
                  >
                    {[15, 30, 45, 60, 75, 90, 120, 150, 180, 240].map((mins) => (
                      <option key={mins} value={mins}>
                        {formatDuration(mins)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Color Accent</label>
                <div className="dp-color-picker-row">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`dp-color-swatch ${editingBlock.color === c ? 'is-selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setEditingBlock({ ...editingBlock, color: c })}
                    />
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Notes / Takeaways (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Details, link or agenda..."
                  value={editingBlock.notes || ''}
                  onChange={(e) =>
                    setEditingBlock({ ...editingBlock, notes: e.target.value })
                  }
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                {editingBlock.id !== '__new__' ? (
                  <button
                    type="button"
                    className="ghost sm is-danger"
                    onClick={() => {
                      onChange(deleteTimeBlock(data, selectedDate, editingBlock.id))
                      setEditingBlock(null)
                    }}
                  >
                    Delete Block
                  </button>
                ) : (
                  <div />
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="ghost sm"
                    onClick={() => setEditingBlock(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="primary sm"
                    onClick={() => {
                      if (editingBlock.id === '__new__') {
                        onChange(
                          addTimeBlock(data, selectedDate, {
                            title: editingBlock.title.trim() || 'Untitled Block',
                            category: editingBlock.category || 'custom',
                            startMinute: editingBlock.startMinute,
                            durationMinutes: editingBlock.durationMinutes,
                            color: editingBlock.color,
                            notes: editingBlock.notes?.trim() || undefined,
                          }),
                        )
                      } else {
                        onChange(
                          updateTimeBlock(data, selectedDate, editingBlock.id, {
                            title: editingBlock.title.trim() || 'Untitled Block',
                            startMinute: editingBlock.startMinute,
                            durationMinutes: editingBlock.durationMinutes,
                            color: editingBlock.color,
                            notes: editingBlock.notes?.trim() || undefined,
                          }),
                        )
                      }
                      setEditingBlock(null)
                    }}
                  >
                    {editingBlock.id === '__new__' ? 'Add Block' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
