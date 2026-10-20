import { useState, useMemo } from 'react'
import { todayKey } from '../../db/types'
import {
  type NonNegotiablesData,
  type HabitType,
  getDayProgress,
  getOrCreateDayLog,
  isHabitFulfilled,
  setBooleanHabit,
  setNumberHabit,
  stepNumberHabit,
  addHabit,
  deleteHabit,
  getHabitStreak,
  getAllHabitsStreak,
  moveHabit,
} from './data'
import Calendar from './Calendar'
import './non-negotiables.css'

type Props = {
  data: NonNegotiablesData
  onChange: (next: NonNegotiablesData) => void
}

export default function NonNegotiables({ data, onChange }: Props) {
  const today = useMemo(() => todayKey(), [])
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<HabitType>('boolean')
  const [newTarget, setNewTarget] = useState<number>(8)
  const [newUnit, setNewUnit] = useState<string>('times')

  const dayLog = getOrCreateDayLog(data, selectedDate)
  const { fulfilled, total, isAllFulfilled, percent } = getDayProgress(data.habits, dayLog)
  const overallStreak = useMemo(() => getAllHabitsStreak(data, today), [data, today])

  const shiftDay = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const next = new Date(y, m - 1, d + days)
    const pad = (n: number) => String(n).padStart(2, '0')
    setSelectedDate(`${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`)
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    onChange(addHabit(data, {
      name: newName,
      type: newType,
      target: newType === 'number' ? newTarget : undefined,
      unit: newType === 'number' ? newUnit : undefined,
    }))
    setNewName('')
    setShowAddForm(false)
  }

  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="habits-app">
      {/* Date nav */}
      <div className="date-nav-bar">
        <div className="date-nav-center">
          <button type="button" className="date-nav-arrow" onClick={() => shiftDay(-1)}>‹</button>
          <div className="date-nav-label">
            {selectedDate === today && <span className="today-pill">Today</span>}
            {displayDate}
          </div>
          <button type="button" className="date-nav-arrow" onClick={() => shiftDay(1)}>›</button>
        </div>
        <div className="date-nav-actions">
          {selectedDate !== today && (
            <button type="button" className="ghost sm" onClick={() => setSelectedDate(today)}>Today</button>
          )}
          <button
            type="button"
            className={showAddForm ? 'sm danger' : 'primary sm'}
            onClick={() => setShowAddForm((v) => !v)}
          >
            {showAddForm ? 'Cancel' : '+ Add Habit'}
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`habits-banner ${isAllFulfilled ? 'is-done' : ''}`}>
        <div className="habits-banner-left">
          <div className="habits-banner-title">
            {total === 0
              ? 'No habits set up yet'
              : isAllFulfilled
              ? 'All habits completed'
              : `${fulfilled} of ${total} habits completed`}
          </div>
          {total > 0 && (
            <div className="habits-banner-sub">
              {isAllFulfilled ? 'Great job today.' : `${total - fulfilled} remaining today.`}
              {overallStreak.best > 0 && (
                <span className="banner-streak-text">
                  {' · '}🔥 <strong>{overallStreak.current}</strong>-day streak (Best: {overallStreak.best}d)
                </span>
              )}
            </div>
          )}
          {total > 0 && (
            <div className="habits-banner-track">
              <div
                className={`habits-banner-fill ${isAllFulfilled ? 'is-done' : ''}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>
        <div className="habits-banner-right-badges">
          {total > 0 && (
            <div className="habits-streak-badge" title="Overall streak (all habits completed)">
              <span className="flame-icon">🔥</span>
              <span className="streak-count">{overallStreak.current}</span>
              <span className="streak-label">day streak</span>
            </div>
          )}
          {total > 0 && (
            <div className={`habits-banner-badge ${isAllFulfilled ? 'done' : 'progress'}`}>
              {isAllFulfilled ? 'Done' : `${percent}%`}
            </div>
          )}
        </div>
      </div>

      {/* Main workspace */}
      <div className="habits-workspace">
        {/* Checklist */}
        <div className="habits-panel">
          <div className="habits-panel-head">
            <span className="habits-panel-title">Habits ({data.habits.length})</span>
          </div>

          {/* Add form */}
          {showAddForm && (
            <form className="add-habit-form" onSubmit={handleAddSubmit}>
              <div className="add-habit-row">
                <input
                  type="text"
                  placeholder="Habit name (e.g. Cold shower, 10k steps)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as HabitType)}
                  style={{ width: 'auto' }}
                >
                  <option value="boolean">Yes / No</option>
                  <option value="number">Countable</option>
                </select>
              </div>
              {newType === 'number' && (
                <div className="add-habit-row">
                  <input
                    type="number"
                    min="1"
                    className="add-habit-num"
                    placeholder="Target"
                    value={newTarget}
                    onChange={(e) => setNewTarget(parseInt(e.target.value, 10) || 1)}
                    style={{ width: '80px', flex: '0 0 80px' }}
                  />
                  <input
                    type="text"
                    className="add-habit-unit"
                    placeholder="Unit (e.g. glasses)"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    style={{ width: '120px', flex: '0 0 120px' }}
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="primary sm" disabled={!newName.trim()}>Add Habit</button>
                <button type="button" className="ghost sm" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          {/* Habits list */}
          {data.habits.length === 0 ? (
            <div className="empty-state">
              <p>No habits added yet</p>
              <p>Click "Add Habit" to create your first non-negotiable.</p>
            </div>
          ) : (
            data.habits.map((habit, index) => {
              const val = dayLog.values[habit.id]
              const done = isHabitFulfilled(habit, val)
              const habitStreak = getHabitStreak(habit.id, data, today)
              return (
                <div key={habit.id} className={`habit-item ${done ? 'is-done' : ''}`}>
                  <div className="habit-reorder-group" title="Reorder priority">
                    <button
                      type="button"
                      className="habit-reorder-btn"
                      onClick={() => onChange(moveHabit(data, habit.id, 'up'))}
                      disabled={index === 0}
                      title="Move up"
                    >▲</button>
                    <button
                      type="button"
                      className="habit-reorder-btn"
                      onClick={() => onChange(moveHabit(data, habit.id, 'down'))}
                      disabled={index === data.habits.length - 1}
                      title="Move down"
                    >▼</button>
                  </div>

                  <div className="habit-item-left">
                    <button
                      type="button"
                      className={`habit-check ${done ? 'is-done' : ''}`}
                      onClick={() => {
                        if (habit.type === 'boolean') {
                          onChange(setBooleanHabit(data, selectedDate, habit.id, !val?.completed))
                        } else {
                          const target = habit.target || 1
                          onChange(setNumberHabit(data, selectedDate, habit.id, done ? 0 : target))
                        }
                      }}
                      title={done ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {done ? '✓' : ''}
                    </button>
                    <div className="habit-info">
                      <div className="habit-name-row">
                        <span className="habit-name">{habit.name}</span>
                        {habitStreak.current > 0 ? (
                          <span
                            className="habit-streak-pill active"
                            title={`Current streak: ${habitStreak.current}d · Best: ${habitStreak.best}d`}
                          >
                            🔥 {habitStreak.current}d
                          </span>
                        ) : habitStreak.best > 0 ? (
                          <span
                            className="habit-streak-pill inactive"
                            title={`Best streak: ${habitStreak.best}d`}
                          >
                            Best: {habitStreak.best}d
                          </span>
                        ) : null}
                      </div>
                      <span className="habit-type-hint">
                        {habit.type === 'boolean' ? 'Yes / No' : `Target: ${habit.target} ${habit.unit || ''}`}
                      </span>
                    </div>
                  </div>

                  <div className="habit-item-right">
                    {habit.type === 'number' && (
                      <div className="stepper">
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => onChange(stepNumberHabit(data, selectedDate, habit.id, -1))}
                          disabled={(val?.current ?? 0) <= 0}
                        >−</button>
                        <div className="stepper-val">
                          <input
                            type="number"
                            min="0"
                            value={val?.current ?? 0}
                            onChange={(e) => {
                              const n = parseInt(e.target.value, 10)
                              onChange(setNumberHabit(data, selectedDate, habit.id, isNaN(n) ? 0 : n))
                            }}
                          />
                        </div>
                        <span className="stepper-of">/ {habit.target}</span>
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => onChange(stepNumberHabit(data, selectedDate, habit.id, 1))}
                        >+</button>
                      </div>
                    )}
                    <button
                      type="button"
                      className="habit-del"
                      onClick={() => {
                        if (window.confirm(`Delete habit "${habit.name}"?`)) {
                          onChange(deleteHabit(data, habit.id))
                        }
                      }}
                      title="Delete habit"
                    >×</button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Calendar */}
        <div>
          <Calendar
            selectedDate={selectedDate}
            today={today}
            habits={data.habits}
            history={data.history}
            onSelectDate={setSelectedDate}
          />
        </div>
      </div>
    </div>
  )
}
