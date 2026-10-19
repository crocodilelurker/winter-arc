import { useState, useRef, useEffect } from 'react'
import {
  getBacklinks,
  getEffectiveOutgoingIds,
  getTopicColor,
  type Task,
  type Subtask,
} from './data'

type Props = {
  task: Task
  allTasks: Task[]
  topics: string[]
  onUpdate: (taskId: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>) => void
  onAddTopic?: (topic: string) => void
  onDelete: (taskId: string) => void
  onConnect: (sourceId: string, targetId: string) => void
  onDisconnect: (sourceId: string, targetId: string) => void
  onSelectTask: (taskId: string) => void
  onClose: () => void
}

export default function TaskDetails({
  task,
  allTasks,
  topics,
  onUpdate,
  onAddTopic,
  onDelete,
  onConnect,
  onDisconnect,
  onSelectTask,
  onClose,
}: Props) {
  const [details, setDetails] = useState(task.details)
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestQuery, setSuggestQuery] = useState('')
  const [selectedSuggestIdx, setSelectedSuggestIdx] = useState(0)
  const [cursorPos, setCursorPos] = useState<number>(0)
  const [isAddingTopic, setIsAddingTopic] = useState(false)
  const [customTopic, setCustomTopic] = useState('')
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  // Focus Timer state (25 minutes default)
  const [timerSeconds, setTimerSeconds] = useState(25 * 60)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync details when task changes
  useEffect(() => {
    setDetails(task.details)
    setShowSuggest(false)
    setNewSubtaskTitle('')
    setTimerSeconds(25 * 60)
    setIsTimerRunning(false)
  }, [task.id, task.details])

  // Timer interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1)
      }, 1000)
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTimerRunning, timerSeconds])

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Effective outgoing and backlinks
  const outgoingIds = getEffectiveOutgoingIds(task, allTasks)
  const outgoingTasks = allTasks.filter((t) => outgoingIds.includes(t.id))
  const backlinks = getBacklinks(task.id, allTasks)

  // Potential connection candidates
  const candidateTasks = allTasks.filter(
    (t) => t.id !== task.id && !task.connectedTaskIds.includes(t.id),
  )

  // Filter suggestion list (matching title or number)
  const cleanQuery = suggestQuery.trim().toLowerCase().replace(/^#/, '')
  const suggestedTasks = allTasks.filter((t) => {
    if (t.id === task.id) return false
    if (!cleanQuery) return true
    const titleMatch = t.title.toLowerCase().includes(cleanQuery)
    const numMatch = String(t.number) === cleanQuery
    return titleMatch || numMatch
  })

  // WikiLink autocomplete detection on typing
  const handleDetailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    const cursor = e.target.selectionStart || 0
    setDetails(val)
    setCursorPos(cursor)
    onUpdate(task.id, { details: val })

    const textBefore = val.slice(0, cursor)
    const match = textBefore.match(/\[\[([^\]]*)$/)
    if (match) {
      setShowSuggest(true)
      setSuggestQuery(match[1])
      setSelectedSuggestIdx(0)
    } else {
      setShowSuggest(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggest && suggestedTasks.length > 0) {
      if (e.key === 'Escape') {
        setShowSuggest(false)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSuggestIdx((prev) => (prev + 1) % suggestedTasks.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSuggestIdx((prev) => (prev - 1 + suggestedTasks.length) % suggestedTasks.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const target = suggestedTasks[selectedSuggestIdx]
        if (target) insertWikiLink(target)
        return
      }
    }
  }

  const insertWikiLink = (targetTask: Task) => {
    const text = details
    const textBefore = text.slice(0, cursorPos)
    const textAfter = text.slice(cursorPos)

    const match = textBefore.match(/\[\[([^\]]*)$/)
    if (match) {
      const startIdx = match.index!
      const replacement = `[[#${targetTask.number}: ${targetTask.title}]]`
      const newText = text.slice(0, startIdx) + replacement + textAfter
      setDetails(newText)
      onUpdate(task.id, { details: newText })
      setShowSuggest(false)

      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = startIdx + replacement.length
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newPos, newPos)
        }
      }, 0)
    }
  }

  // Subtask handlers
  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubtaskTitle.trim()) return

    const newSt: Subtask = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    }
    const nextSubtasks = [...(task.subtasks || []), newSt]
    onUpdate(task.id, { subtasks: nextSubtasks })
    setNewSubtaskTitle('')
  }

  const toggleSubtask = (subId: string) => {
    const nextSubtasks = (task.subtasks || []).map((st) =>
      st.id === subId ? { ...st, completed: !st.completed } : st,
    )
    onUpdate(task.id, { subtasks: nextSubtasks })
  }

  const deleteSubtask = (subId: string) => {
    const nextSubtasks = (task.subtasks || []).filter((st) => st.id !== subId)
    onUpdate(task.id, { subtasks: nextSubtasks })
  }

  const subtasks = task.subtasks || []
  const completedSubtasks = subtasks.filter((s) => s.completed).length

  const topicColor = getTopicColor(task.topic)

  return (
    <div className="task-drawer-overlay" onClick={onClose}>
      <div
        className={`task-drawer ${task.completed ? 'is-task-completed' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`drawer-header ${task.completed ? 'is-completed' : ''}`}>
        <div className="drawer-title-row">
          <button
            type="button"
            className={`task-check-circle ${task.completed ? 'is-checked' : ''}`}
            onClick={() => onUpdate(task.id, { completed: !task.completed })}
            title={task.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            {task.completed ? '✓' : ''}
          </button>
          <span className="task-number-pill">#{task.number}</span>
          <input
            className="drawer-title-input"
            value={task.title}
            onChange={(e) => onUpdate(task.id, { title: e.target.value })}
            placeholder="Task title"
          />
          <button
            type="button"
            className="drawer-close"
            onClick={onClose}
            title="Close details (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Metadata Controls */}
        <div className="drawer-meta">
          <div className="meta-item">
            <span className="meta-label">Topic</span>
            {isAddingTopic ? (
              <div className="inline-topic-input">
                <input
                  autoFocus
                  placeholder="New topic"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const trimmed = customTopic.trim()
                      if (trimmed) {
                        onAddTopic?.(trimmed)
                        onUpdate(task.id, { topic: trimmed })
                      }
                      setCustomTopic('')
                      setIsAddingTopic(false)
                    } else if (e.key === 'Escape') {
                      setIsAddingTopic(false)
                    }
                  }}
                />
                <button
                  type="button"
                  className="small primary"
                  onClick={() => {
                    const trimmed = customTopic.trim()
                    if (trimmed) {
                      onAddTopic?.(trimmed)
                      onUpdate(task.id, { topic: trimmed })
                    }
                    setCustomTopic('')
                    setIsAddingTopic(false)
                  }}
                >
                  Add
                </button>
                <button
                  type="button"
                  className="small ghost"
                  onClick={() => setIsAddingTopic(false)}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="topic-badge-wrap">
                <span
                  className="topic-dot"
                  style={{ backgroundColor: topicColor }}
                />
                <select
                  value={task.topic || ''}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setIsAddingTopic(true)
                    } else {
                      onUpdate(task.id, { topic: e.target.value || undefined })
                    }
                  }}
                >
                  <option value="">No Topic</option>
                  {topics.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  {task.topic && !topics.includes(task.topic) && (
                    <option value={task.topic}>{task.topic}</option>
                  )}
                  <option value="__new__">+ New topic…</option>
                </select>
              </div>
            )}
          </div>

          <div className="meta-item">
            <span className="meta-label">Priority</span>
            <select
              value={task.priority || ''}
              onChange={(e) => {
                const val = e.target.value as 'low' | 'med' | 'high' | ''
                onUpdate(task.id, { priority: val || undefined })
              }}
            >
              <option value="">Normal</option>
              <option value="low">Low</option>
              <option value="med">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </div>

      <div className="drawer-body">
        {/* Offline Focus Timer */}
        <div className="timer-box">
          <div className="timer-header">
            <span className="section-title">Focus Timer</span>
            <span className="timer-display">{formatTimer(timerSeconds)}</span>
          </div>
          <div className="timer-controls">
            <button
              type="button"
              className={isTimerRunning ? 'ghost small' : 'primary small'}
              onClick={() => setIsTimerRunning(!isTimerRunning)}
            >
              {isTimerRunning ? 'Pause' : 'Start Focus (25m)'}
            </button>
            <button
              type="button"
              className="ghost small"
              onClick={() => {
                setIsTimerRunning(false)
                setTimerSeconds(25 * 60)
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Subtasks Checklist */}
        <div className="subtasks-section">
          <div className="subtasks-header">
            <span className="section-title">
              Subtasks {subtasks.length > 0 && `(${completedSubtasks}/${subtasks.length})`}
            </span>
          </div>
          {subtasks.length > 0 && (
            <div className="subtasks-list">
              {subtasks.map((st) => (
                <div key={st.id} className="subtask-row">
                  <input
                    type="checkbox"
                    checked={st.completed}
                    onChange={() => toggleSubtask(st.id)}
                  />
                  <span className={st.completed ? 'subtask-done' : ''}>{st.title}</span>
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => deleteSubtask(st.id)}
                    title="Remove subtask"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <form className="add-subtask-form" onSubmit={handleAddSubtask}>
            <input
              placeholder="+ Add a subtask (press Enter)"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
            />
          </form>
        </div>

        {/* Notes & Obsidian WikiLinks */}
        <div className="notes-section">
          <div className="notes-header">
            <span className="section-title">Notes & Connected Links</span>
            <span className="notes-tip">Type <code>[[</code> to link tasks</span>
          </div>

          <div className="textarea-container">
            <textarea
              ref={textareaRef}
              className="notes-textarea"
              rows={6}
              placeholder="Write task notes or type [[ to link other tasks (e.g. [[#1]] or [[Task Title]])..."
              value={details}
              onChange={handleDetailsChange}
              onKeyDown={handleKeyDown}
            />

            {/* Instant Obsidian Autocomplete popup */}
            {showSuggest && suggestedTasks.length > 0 && (
              <div className="wikilink-popup">
                <div className="wikilink-popup-title">
                  Connect task (Enter to pick • Space to cancel):
                </div>
                <div className="wikilink-list">
                  {suggestedTasks.map((st, idx) => (
                    <button
                      key={st.id}
                      type="button"
                      className={`wikilink-item ${idx === selectedSuggestIdx ? 'is-selected' : ''}`}
                      onClick={() => insertWikiLink(st)}
                    >
                      <span className="task-num-mini">#{st.number}</span>
                      <span
                        className="topic-dot small"
                        style={{ backgroundColor: getTopicColor(st.topic) }}
                      />
                      <span className="wikilink-title">{st.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connected Outgoing Tasks */}
        <div className="connections-section">
          <span className="section-title">Connected Tasks ({outgoingTasks.length})</span>
          {outgoingTasks.length === 0 ? (
            <p className="empty-subtext">No connected tasks yet. Link them using [[#num]] or pick below.</p>
          ) : (
            <div className="connections-list">
              {outgoingTasks.map((t) => (
                <div key={t.id} className="connection-chip">
                  <button
                    type="button"
                    className="connection-link-btn"
                    onClick={() => onSelectTask(t.id)}
                    title="Inspect linked task"
                  >
                    <span className="task-num-mini">#{t.number}</span>
                    <span
                      className="topic-dot small"
                      style={{ backgroundColor: getTopicColor(t.topic) }}
                    />
                    <span className={t.completed ? 'task-done' : ''}>{t.title}</span>
                  </button>
                  {task.connectedTaskIds.includes(t.id) && (
                    <button
                      type="button"
                      className="chip-remove"
                      onClick={() => onDisconnect(task.id, t.id)}
                      title="Disconnect"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {candidateTasks.length > 0 && (
            <div className="add-connection-row">
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    onConnect(task.id, e.target.value)
                    e.target.value = ''
                  }
                }}
              >
                <option value="" disabled>
                  + Connect another task…
                </option>
                {candidateTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.number}: {t.title} {t.topic ? `(${t.topic})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Backlinks Section */}
        {backlinks.length > 0 && (
          <div className="backlinks-section">
            <span className="section-title">Referenced By ({backlinks.length})</span>
            <div className="connections-list">
              {backlinks.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="connection-chip backlink"
                  onClick={() => onSelectTask(b.id)}
                  title="Jump to mentioning task"
                >
                  <span className="task-num-mini">#{b.number}</span>
                  <span
                    className="topic-dot small"
                    style={{ backgroundColor: getTopicColor(b.topic) }}
                  />
                  <span>{b.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="drawer-footer">
        <button
          type="button"
          className="ghost sm danger"
          onClick={() => {
            if (window.confirm(`Delete task #${task.number}: "${task.title}"?`)) {
              onDelete(task.id)
              onClose()
            }
          }}
        >
          Delete Task
        </button>
      </div>
    </div>
  </div>
  )
}
