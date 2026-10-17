import { useState, useMemo } from 'react'
import { todayKey } from '../../db/types'
import {
  addTopic,
  addTask,
  updateTask,
  deleteTask,
  toggleTask,
  connectTasks,
  disconnectTasks,
  groupTasks,
  deleteMultipleTasks,
  completeMultipleTasks,
  clearDayTasks,
  rolloverUnfinished,
  exportDayAsMarkdown,
  getEffectiveOutgoingIds,
  getTopicColor,
  type TodoGraphData,
} from './data'
import GraphView from './GraphView'
import TaskDetails from './TaskDetails'
import Calendar from './Calendar'
import './todo-graph.css'

type Props = {
  data: TodoGraphData
  onChange: (next: TodoGraphData) => void
}

type ViewMode = 'split' | 'graph' | 'list'
type StatusFilter = 'all' | 'active' | 'completed'

function getPreviousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const prev = new Date(y, m - 1, d - 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-${pad(prev.getDate())}`
}

export default function TodoGraph({ data, onChange }: Props) {
  const today = useMemo(() => todayKey(), [])
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [showCalendar, setShowCalendar] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<ViewMode>('split')

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Quick Add Form
  const [newTitle, setNewTitle] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'med' | 'high' | ''>('')
  const [isCreatingTopic, setIsCreatingTopic] = useState(false)
  const [customTopicInput, setCustomTopicInput] = useState('')

  // Multi-select & inspection
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  const [selectMode, setSelectMode] = useState<boolean>(false)
  const [batchTopicInput, setBatchTopicInput] = useState('')
  const [isBatchCreatingTopic, setIsBatchCreatingTopic] = useState(false)
  const [customBatchTopic, setCustomBatchTopic] = useState('')

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Active day plan & tasks
  const dayPlan = data.days[selectedDate] ?? { date: selectedDate, tasks: [] }
  const tasks = dayPlan.tasks

  // Check previous day for unfinished tasks
  const prevDateKey = getPreviousDateKey(selectedDate)
  const prevDayPlan = data.days[prevDateKey]
  const unfinishedYesterday = prevDayPlan
    ? prevDayPlan.tasks.filter((t) => !t.completed).length
    : 0

  // Month stats for calendar
  const dayStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number }> = {}
    for (const [date, plan] of Object.entries(data.days)) {
      if (plan.tasks.length > 0) {
        stats[date] = {
          total: plan.tasks.length,
          completed: plan.tasks.filter((t) => t.completed).length,
        }
      }
    }
    return stats
  }, [data.days])

  // Daily statistics
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.completed).length
  const percentDone = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Filter tasks based on Search, Topic, and Status
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter === 'active' && t.completed) return false
      if (statusFilter === 'completed' && !t.completed) return false
      if (topicFilter && t.topic !== topicFilter) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const numStr = String(t.number)
        const inTitle = t.title.toLowerCase().includes(q)
        const inDetails = t.details.toLowerCase().includes(q)
        const inTopic = t.topic ? t.topic.toLowerCase().includes(q) : false
        const inNumber = numStr === q || `#${numStr}` === q
        return inTitle || inDetails || inTopic || inNumber
      }

      return true
    })
  }, [tasks, statusFilter, topicFilter, searchQuery])

  // Shift day
  const shiftDay = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const next = new Date(y, m - 1, d + days)
    const pad = (n: number) => String(n).padStart(2, '0')
    const key = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`
    setSelectedDate(key)
    setSelectedTaskId(null)
    setCheckedIds([])
  }

  // Handle Add Task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const updated = addTask(data, selectedDate, {
      title: newTitle,
      topic: newTopic || undefined,
      priority: newPriority || undefined,
    })

    onChange(updated)
    setNewTitle('')
  }

  // Multi-select helpers
  const toggleSelectTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const selectAll = () => {
    if (checkedIds.length === filteredTasks.length) {
      setCheckedIds([])
    } else {
      setCheckedIds(filteredTasks.map((t) => t.id))
    }
  }

  // Export Day to Clipboard
  const handleCopyDay = async () => {
    const md = exportDayAsMarkdown(dayPlan)
    try {
      await navigator.clipboard.writeText(md)
      setToastMessage('Day plan copied to clipboard!')
      setTimeout(() => setToastMessage(null), 2500)
    } catch {
      window.prompt('Copy your day plan:', md)
    }
  }

  const activeTask = tasks.find((t) => t.id === selectedTaskId) || null

  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="todo-graph-app">
      {/* Toast Notification */}
      {toastMessage && <div className="toast">{toastMessage}</div>}

      {/* Date Navigation & Controls Bar */}
      <div className="date-nav-bar">
        <div className="date-nav-center">
          <button
            type="button"
            className="date-nav-arrow"
            onClick={() => shiftDay(-1)}
            title="Previous day"
          >
            ‹
          </button>
          <div className="date-nav-label">
            {selectedDate === today && <span className="today-pill">Today</span>}
            {displayDate}
          </div>
          <button
            type="button"
            className="date-nav-arrow"
            onClick={() => shiftDay(1)}
            title="Next day"
          >
            ›
          </button>
        </div>

        <div className="date-nav-actions">
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
            className={showCalendar ? 'primary sm' : 'ghost sm'}
            onClick={() => setShowCalendar((v) => !v)}
            title="Toggle Calendar"
          >
            Calendar
          </button>

          <button
            type="button"
            className="ghost sm"
            onClick={handleCopyDay}
            title="Export this day's plan as Markdown"
          >
            Export
          </button>

          {/* View Switcher Tabs */}
          <div className="tg-view-switcher">
            <button
              type="button"
              className={viewMode === 'split' ? 'is-active' : ''}
              onClick={() => setViewMode('split')}
            >
              Split
            </button>
            <button
              type="button"
              className={viewMode === 'graph' ? 'is-active' : ''}
              onClick={() => setViewMode('graph')}
            >
              Graph
            </button>
            <button
              type="button"
              className={viewMode === 'list' ? 'is-active' : ''}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Popup */}
      {showCalendar && (
        <div className="tg-calendar-popup">
          <Calendar
            selected={selectedDate}
            today={today}
            dayStats={dayStats}
            onSelect={(date) => {
              setSelectedDate(date)
              setShowCalendar(false)
              setSelectedTaskId(null)
              setCheckedIds([])
            }}
          />
        </div>
      )}

      {/* Rollover Banner if previous day had incomplete tasks */}
      {unfinishedYesterday > 0 && tasks.length === 0 && (
        <div className="tg-rollover-banner">
          <span>
            You have <strong>{unfinishedYesterday}</strong> incomplete{' '}
            {unfinishedYesterday === 1 ? 'task' : 'tasks'} from yesterday.
          </span>
          <button
            type="button"
            className="primary sm"
            onClick={() => {
              onChange(rolloverUnfinished(data, prevDateKey, selectedDate))
              setToastMessage(`Moved ${unfinishedYesterday} tasks to today`)
              setTimeout(() => setToastMessage(null), 2500)
            }}
          >
            Move to Today
          </button>
        </div>
      )}

      {/* Daily Progress Bar */}
      <div className="tg-stats-bar">
        <div className="stat-item">
          <span className="stat-label">Tasks Completed</span>
          <span className="stat-val">
            {completedTasks} of {totalTasks} ({percentDone}%)
          </span>
        </div>
        <div className="stat-progress-track">
          <div
            className="stat-progress-fill"
            style={{ width: `${percentDone}%` }}
          />
        </div>
      </div>

      {/* Quick Add Bar */}
      <form className="tg-add-form" onSubmit={handleAddTask}>
        <input
          className="add-input-title"
          placeholder="Add a task for today... (Press Enter)"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />

        {isCreatingTopic ? (
          <div className="inline-topic-input">
            <input
              autoFocus
              placeholder="Topic name"
              value={customTopicInput}
              onChange={(e) => setCustomTopicInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const trimmed = customTopicInput.trim()
                  if (trimmed) {
                    onChange(addTopic(data, trimmed))
                    setNewTopic(trimmed)
                  }
                  setCustomTopicInput('')
                  setIsCreatingTopic(false)
                } else if (e.key === 'Escape') {
                  setIsCreatingTopic(false)
                }
              }}
            />
            <button
              type="button"
              className="primary sm"
              onClick={() => {
                const trimmed = customTopicInput.trim()
                if (trimmed) {
                  onChange(addTopic(data, trimmed))
                  setNewTopic(trimmed)
                }
                setCustomTopicInput('')
                setIsCreatingTopic(false)
              }}
            >
              Add
            </button>
            <button
              type="button"
              className="ghost sm"
              onClick={() => setIsCreatingTopic(false)}
            >
              ✕
            </button>
          </div>
        ) : (
          <select
            className="add-select-topic"
            value={newTopic}
            onChange={(e) => {
              if (e.target.value === '__new__') {
                setIsCreatingTopic(true)
              } else {
                setNewTopic(e.target.value)
              }
            }}
          >
            <option value="">No topic</option>
            {data.topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            {newTopic && !data.topics.includes(newTopic) && (
              <option value={newTopic}>{newTopic}</option>
            )}
            <option value="__new__">+ New topic…</option>
          </select>
        )}

        <select
          className="add-select-priority"
          value={newPriority}
          onChange={(e) =>
            setNewPriority(e.target.value as 'low' | 'med' | 'high' | '')
          }
          title="Priority"
        >
          <option value="">Priority</option>
          <option value="low">Low</option>
          <option value="med">Medium</option>
          <option value="high">High</option>
        </select>

        <button type="submit" className="primary sm" disabled={!newTitle.trim()}>
          + Add
        </button>
      </form>

      {/* Filter & Search Bar */}
      <div className="tg-filter-bar">
        <div className="search-wrap">
          <input
            className="search-input"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="status-pills">
          <button
            type="button"
            className={`pill-btn ${statusFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({tasks.length})
          </button>
          <button
            type="button"
            className={`pill-btn ${statusFilter === 'active' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active ({tasks.length - completedTasks})
          </button>
          <button
            type="button"
            className={`pill-btn ${statusFilter === 'completed' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            Completed ({completedTasks})
          </button>
        </div>

        {/* Topic Filter Chips */}
        <div className="topic-filter-chips">
          {topicFilter && (
            <button
              type="button"
              className="topic-chip active-filter"
              onClick={() => setTopicFilter(null)}
              title="Clear topic filter"
            >
              Filter: {topicFilter} ✕
            </button>
          )}
        </div>
      </div>

      {/* Multi-Select Action Bar */}
      {checkedIds.length > 0 && (
        <div className="tg-batch-bar">
          <div className="batch-info">
            <strong>{checkedIds.length}</strong> tasks selected
          </div>
          <div className="batch-actions">
            <div className="batch-topic-group">
              {isBatchCreatingTopic ? (
                <div className="inline-topic-input">
                  <input
                    autoFocus
                    placeholder="New topic for group"
                    value={customBatchTopic}
                    onChange={(e) => setCustomBatchTopic(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const trimmed = customBatchTopic.trim()
                        if (trimmed) {
                          const withTopic = addTopic(data, trimmed)
                          onChange(groupTasks(withTopic, selectedDate, checkedIds, trimmed))
                          setCheckedIds([])
                        }
                        setCustomBatchTopic('')
                        setIsBatchCreatingTopic(false)
                      } else if (e.key === 'Escape') {
                        setIsBatchCreatingTopic(false)
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="primary sm"
                    onClick={() => {
                      const trimmed = customBatchTopic.trim()
                      if (trimmed) {
                        const withTopic = addTopic(data, trimmed)
                        onChange(groupTasks(withTopic, selectedDate, checkedIds, trimmed))
                        setCheckedIds([])
                      }
                      setCustomBatchTopic('')
                      setIsBatchCreatingTopic(false)
                    }}
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    className="ghost sm"
                    onClick={() => setIsBatchCreatingTopic(false)}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <select
                  value={batchTopicInput}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '__new__') {
                      setIsBatchCreatingTopic(true)
                    } else if (val) {
                      onChange(groupTasks(data, selectedDate, checkedIds, val))
                      setCheckedIds([])
                      setBatchTopicInput('')
                    }
                  }}
                >
                  <option value="">Assign Topic to Group…</option>
                  {data.topics.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="__new__">+ Create New Topic…</option>
                </select>
              )}
            </div>
            <button
              type="button"
              className="ghost sm"
              onClick={() => {
                onChange(completeMultipleTasks(data, selectedDate, checkedIds, true))
                setCheckedIds([])
              }}
            >
              ✓ Mark Done
            </button>
            <button
              type="button"
              className="ghost sm"
              onClick={() => {
                onChange(completeMultipleTasks(data, selectedDate, checkedIds, false))
                setCheckedIds([])
              }}
            >
              Mark Undone
            </button>
            <button
              type="button"
              className="ghost sm danger"
              onClick={() => {
                if (window.confirm(`Delete ${checkedIds.length} selected tasks?`)) {
                  onChange(deleteMultipleTasks(data, selectedDate, checkedIds))
                  setCheckedIds([])
                  if (checkedIds.includes(selectedTaskId || '')) {
                    setSelectedTaskId(null)
                  }
                }
              }}
            >
              Delete
            </button>
            <button
              type="button"
              className="ghost sm"
              onClick={() => setCheckedIds([])}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className={`tg-workspace mode-${viewMode}`}>
        {/* Task List Panel */}
        {viewMode !== 'graph' && (
          <div className="tg-list-panel">
            <div className="list-panel-header">
              <div className="header-left">
                {selectMode || checkedIds.length > 0 ? (
                  <label className="select-all-label">
                    <input
                      type="checkbox"
                      checked={filteredTasks.length > 0 && checkedIds.length === filteredTasks.length}
                      onChange={selectAll}
                      disabled={filteredTasks.length === 0}
                    />
                    <span>Select all ({checkedIds.length})</span>
                  </label>
                ) : (
                  <span className="task-count-hint">
                    {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                )}
                {filteredTasks.length > 0 && (
                  <button
                    type="button"
                    className="ghost sm"
                    onClick={() => {
                      if (selectMode || checkedIds.length > 0) {
                        setSelectMode(false)
                        setCheckedIds([])
                      } else {
                        setSelectMode(true)
                      }
                    }}
                  >
                    {selectMode || checkedIds.length > 0 ? 'Done' : 'Select'}
                  </button>
                )}
              </div>

              {tasks.length > 0 && (
                <button
                  type="button"
                  className="ghost sm danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Are you sure you want to delete all ${tasks.length} tasks for this day? This cannot be undone.`,
                      )
                    ) {
                      onChange(clearDayTasks(data, selectedDate))
                      setSelectedTaskId(null)
                      setCheckedIds([])
                      setSelectMode(false)
                      setToastMessage('Tasks cleared for this day!')
                      setTimeout(() => setToastMessage(null), 2500)
                    }
                  }}
                  title="Clear all tasks for this day"
                >
                  Clear All
                </button>
              )}
            </div>

            {filteredTasks.length === 0 ? (
              <div className="tg-empty-state">
                <p>
                  {tasks.length === 0
                    ? 'No tasks planned for this day yet.'
                    : 'No tasks match your current filter.'}
                </p>
                <span className="empty-hint">
                  {tasks.length === 0
                    ? 'Add your first task above to start organizing your day!'
                    : 'Try clearing your search query or topic filter.'}
                </span>
              </div>
            ) : (
              <div className="tg-task-cards">
                {filteredTasks.map((task) => {
                  const isChecked = checkedIds.includes(task.id)
                  const isSelected = selectedTaskId === task.id
                  const outgoing = getEffectiveOutgoingIds(task, tasks)
                  const topicColor = getTopicColor(task.topic)
                  const completedSubtasks = (task.subtasks || []).filter((s) => s.completed).length

                  return (
                    <div
                      key={task.id}
                      className={`task-card ${task.completed ? 'is-completed' : ''} ${
                        isSelected ? 'is-active-inspector' : ''
                      }`}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <div className="card-left">
                        {(selectMode || checkedIds.length > 0) && (
                          <input
                            type="checkbox"
                            className="multi-check"
                            checked={isChecked}
                            onClick={(e) => toggleSelectTask(task.id, e)}
                            onChange={() => {}}
                            title="Select for batch action"
                          />
                        )}
                        <button
                          type="button"
                          className={`complete-toggle ${
                            task.completed ? 'checked' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onChange(toggleTask(data, selectedDate, task.id))
                          }}
                          title={
                            task.completed ? 'Mark incomplete' : 'Mark complete'
                          }
                        >
                          {task.completed ? '✓' : ''}
                        </button>
                        <div className="card-body">
                          <div className="task-title-line">
                            <span className="task-num-badge">#{task.number}</span>
                            <span className="task-card-title">{task.title}</span>
                          </div>
                          <div className="task-tags">
                            {task.topic && (
                              <button
                                type="button"
                                className="topic-pill"
                                style={{
                                  borderColor: topicColor,
                                  color: topicColor,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setTopicFilter(topicFilter === task.topic ? null : task.topic || null)
                                }}
                                title="Filter by this topic"
                              >
                                <span
                                  className="topic-dot small"
                                  style={{ backgroundColor: topicColor }}
                                />
                                {task.topic}
                              </button>
                            )}
                            {task.priority && (
                              <span className={`priority-badge is-${task.priority}`}>
                                {task.priority === 'high' ? 'High' : task.priority === 'med' ? 'Medium' : 'Low'}
                              </span>
                            )}
                            {outgoing.length > 0 && (
                              <span
                                className="connection-badge"
                                title={`Connected to ${outgoing.length} tasks`}
                              >
                                {outgoing.length} {outgoing.length === 1 ? 'link' : 'links'}
                              </span>
                            )}
                            {task.subtasks && task.subtasks.length > 0 && (
                              <span className="subtasks-badge">
                                {completedSubtasks}/{task.subtasks.length} subtasks
                              </span>
                            )}
                            {task.details && (
                              <span
                                className="notes-badge"
                                title="Has notes"
                              >
                                Notes
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Graph View Panel */}
        {viewMode !== 'list' && (
          <div className="tg-graph-panel">
            <GraphView
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              onSelectTask={(id) => setSelectedTaskId(id)}
            />
          </div>
        )}

        {/* Task Details Inspector Drawer */}
        {activeTask && (
          <TaskDetails
            task={activeTask}
            allTasks={tasks}
            topics={data.topics}
            onUpdate={(id, patch) =>
              onChange(updateTask(data, selectedDate, id, patch))
            }
            onAddTopic={(topic) => onChange(addTopic(data, topic))}
            onDelete={(id) => {
              onChange(deleteTask(data, selectedDate, id))
              setSelectedTaskId(null)
            }}
            onConnect={(src, tgt) =>
              onChange(connectTasks(data, selectedDate, src, tgt))
            }
            onDisconnect={(src, tgt) =>
              onChange(disconnectTasks(data, selectedDate, src, tgt))
            }
            onSelectTask={(id) => setSelectedTaskId(id)}
            onClose={() => setSelectedTaskId(null)}
          />
        )}
      </div>
    </div>
  )
}
