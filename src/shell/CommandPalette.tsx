import { useEffect, useRef, useState, useMemo } from 'react'
import type { Db } from '../db/types'
import { todayKey } from '../db/types'
import type { DbHandle } from '../db/useDb'

export type PaletteItem = {
  id: string
  category: 'Navigation' | 'Actions' | 'Tasks' | 'Nutrition' | 'Habits'
  title: string
  subtitle?: string
  icon?: string
  shortcut?: string
  action: () => void
}

type Props = {
  isOpen: boolean
  onClose: () => void
  db: Db
  onNavigate: (featureId: string | null) => void
  handle: DbHandle
}

export default function CommandPalette({
  isOpen,
  onClose,
  db,
  onNavigate,
  handle,
}: Props) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Build searchable items
  const items = useMemo<PaletteItem[]>(() => {
    const today = todayKey()
    const result: PaletteItem[] = []

    // 1. Navigation items
    const navs = [
      { id: 'home', title: 'Dashboard Briefing', subtitle: 'Executive overview & vitals', icon: '🏠', target: null },
      { id: 'calorie-counter', title: 'Nutrition & Macros', subtitle: 'Food log, macros, calories, water', icon: '🥑', target: 'calorie-counter' },
      { id: 'todo-graph', title: 'Tasks & Graph', subtitle: 'Visual task planner & backlog', icon: '🕸️', target: 'todo-graph' },
      { id: 'day-planner', title: '24-Hour Day Planner', subtitle: 'Timeblocking timeline & schedule', icon: '⏱️', target: 'day-planner' },
      { id: 'gym', title: 'Workouts & Gym', subtitle: '7-day splits, sets, reps & weights', icon: '🏋️', target: 'gym' },
      { id: 'non-negotiables', title: 'Daily Habits', subtitle: 'Habit streaks & fulfillment calendar', icon: '🔥', target: 'non-negotiables' },
      { id: 'expenses', title: 'Daily Expenses', subtitle: 'Budgeting, necessity check, CSV export', icon: '💳', target: 'expenses' },
      { id: 'learnings', title: 'Learnings & Creations', subtitle: 'Notes, insights & shipped projects', icon: '💡', target: 'learnings' },
      { id: 'board', title: 'Canvas Board', subtitle: 'Excalidraw whiteboard & architecture', icon: '🎨', target: 'board' },
    ]

    for (const nav of navs) {
      result.push({
        id: `nav-${nav.id}`,
        category: 'Navigation',
        title: nav.title,
        subtitle: nav.subtitle,
        icon: nav.icon,
        action: () => {
          onNavigate(nav.target)
          onClose()
        },
      })
    }

    // 2. Global Actions
    result.push({
      id: 'act-save',
      category: 'Actions',
      title: 'Save to Disk',
      subtitle: handle.hasFileHandle ? `Save directly to ${handle.fileName || 'file'}` : 'Pick save file on disk',
      icon: '💾',
      shortcut: '⌘S',
      action: () => {
        void handle.save()
        onClose()
      },
    })

    result.push({
      id: 'act-save-as',
      category: 'Actions',
      title: 'Save As...',
      subtitle: 'Export new copy to a chosen file location',
      icon: '📁',
      action: () => {
        void handle.saveAs()
        onClose()
      },
    })

    result.push({
      id: 'act-demo',
      category: 'Actions',
      title: 'Load Showcase Demo Data',
      subtitle: 'Explore full suite with rich pre-populated entries',
      icon: '✨',
      action: () => {
        handle.startDemo()
        onClose()
      },
    })

    result.push({
      id: 'act-close',
      category: 'Actions',
      title: 'Switch Plan / Open Save File',
      subtitle: 'Return to welcome gate screen',
      icon: '🚪',
      action: () => {
        handle.close()
        onClose()
      },
    })

    // 3. Search today's tasks
    const tasks = db.features.todoGraph.days[today]?.tasks || []
    for (const task of tasks) {
      result.push({
        id: `task-${task.id}`,
        category: 'Tasks',
        title: task.title,
        subtitle: `${task.completed ? '✓ Completed' : 'Pending'} · Priority: ${task.priority || 'med'} · ${task.topic || 'General'}`,
        icon: task.completed ? '✅' : '📝',
        action: () => {
          onNavigate('todo-graph')
          onClose()
        },
      })
    }

    // 4. Search today's logged food entries
    const foods = db.features.calorieCounter.days[today]?.entries || []
    for (const food of foods) {
      result.push({
        id: `food-${food.id}`,
        category: 'Nutrition',
        title: food.name,
        subtitle: `${food.meal} · ${food.calories} kcal (P: ${food.protein}g, C: ${food.carbs}g, F: ${food.fat}g)`,
        icon: '🥗',
        action: () => {
          onNavigate('calorie-counter')
          onClose()
        },
      })
    }

    // 5. Search habits
    const habits = db.features.nonNegotiables.habits || []
    for (const habit of habits) {
      result.push({
        id: `habit-${habit.id}`,
        category: 'Habits',
        title: habit.name,
        subtitle: habit.type === 'number' ? `Target: ${habit.target} ${habit.unit || ''}` : 'Yes/No habit',
        icon: '⚡',
        action: () => {
          onNavigate('non-negotiables')
          onClose()
        },
      })
    }

    return result
  }, [db, handle, onNavigate, onClose])

  // Filter items by query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q)
      const matchSubtitle = item.subtitle?.toLowerCase().includes(q)
      const matchCat = item.category.toLowerCase().includes(q)
      return matchTitle || matchSubtitle || matchCat
    })
  }, [items, query])

  // Reset selected index if query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((idx) => (idx + 1 < filtered.length ? idx + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((idx) => (idx - 1 >= 0 ? idx - 1 : filtered.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = filtered[selectedIndex]
      if (selected) {
        selected.action()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  // Auto scroll to active item
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('.palette-item.is-selected')
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!isOpen) return null

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div
        className="palette-dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="palette-search-bar">
          <svg
            className="palette-search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            placeholder="Type a command or search (e.g. nutrition, workout, save, food)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="palette-esc-badge" onClick={onClose}>
            ESC
          </kbd>
        </div>

        <div className="palette-list" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="palette-empty">No results found for "{query}"</div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = index === selectedIndex
              return (
                <div
                  key={item.id}
                  className={`palette-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="palette-item-icon">{item.icon || '•'}</span>
                  <div className="palette-item-info">
                    <div className="palette-item-title-row">
                      <span className="palette-item-title">{item.title}</span>
                      <span className="palette-item-cat">{item.category}</span>
                    </div>
                    {item.subtitle && (
                      <span className="palette-item-subtitle">{item.subtitle}</span>
                    )}
                  </div>
                  {item.shortcut && (
                    <kbd className="palette-shortcut">{item.shortcut}</kbd>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="palette-footer">
          <div className="palette-footer-hints">
            <span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
            <span><kbd>↵</kbd> to select</span>
            <span><kbd>esc</kbd> to dismiss</span>
          </div>
          <span className="palette-footer-brand">Growth Arc Command</span>
        </div>
      </div>
    </div>
  )
}
