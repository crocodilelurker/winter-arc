import { useState, useMemo } from 'react'
import { todayKey } from '../../db/types'
import {
  type GymData,
  type WorkoutPreset,
  DAY_NAMES,
  getOrCreateDayLog,
  updateSetInDay,
  addSetToExercise,
  removeSetFromExercise,
  addExerciseToDay,
  removeExerciseFromDay,
  updateExerciseNotes,
  toggleDayRest,
  toggleDayWorkoutCompleted,
  savePreset,
  deletePreset,
  setActivePreset,
  resetDefaultPreset,
  toggleWeightUnit,
  findLastLoggedExercise,
  createEmptyPreset,
} from './data'
import ExerciseCard from './ExerciseCard'
import PresetEditor from './PresetEditor'
import RestTimer from './RestTimer'
import Calendar from './Calendar'
import './gym.css'

type Props = {
  data: GymData
  onChange: (next: GymData) => void
}

function getWeekDates(referenceDateStr: string): { dayIndex: number; dateStr: string; dayLabel: string }[] {
  const [y, m, d] = referenceDateStr.split('-').map(Number)
  const refDate = new Date(y, m - 1, d)
  const jsDay = refDate.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayIndex = jsDay === 0 ? 7 : jsDay // 1 = Mon, ..., 7 = Sun

  const monday = new Date(refDate)
  monday.setDate(refDate.getDate() - (dayIndex - 1))

  const pad = (n: number) => String(n).padStart(2, '0')

  return DAY_NAMES.map((label, idx) => {
    const cur = new Date(monday)
    cur.setDate(monday.getDate() + idx)
    const dateStr = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`
    return {
      dayIndex: idx + 1,
      dateStr,
      dayLabel: label,
    }
  })
}

export default function Gym({ data, onChange }: Props) {
  const today = useMemo(() => todayKey(), [])
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [showCalendar, setShowCalendar] = useState<boolean>(false)
  const [showPresetEditor, setShowPresetEditor] = useState<boolean>(false)
  const [editingPreset, setEditingPreset] = useState<WorkoutPreset | null>(null)
  const [showRestTimer, setShowRestTimer] = useState<boolean>(false)
  const [timerInitialSeconds, setTimerInitialSeconds] = useState<number>(90)
  const [newExerciseInput, setNewExerciseInput] = useState<string>('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }

  const activePreset =
    data.presets.find((p) => p.id === data.activePresetId) ||
    data.presets[0]

  const dayLog = getOrCreateDayLog(data, selectedDate)

  const shiftDay = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const next = new Date(y, m - 1, d + days)
    const pad = (n: number) => String(n).padStart(2, '0')
    setSelectedDate(`${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`)
  }

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate])

  const totalSets = dayLog.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
  const completedSets = dayLog.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0,
  )
  const progressPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0

  const handleSetCompleted = () => {
    setTimerInitialSeconds(90)
    setShowRestTimer(true)
  }

  const handleAddCustomExercise = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newExerciseInput.trim()) return
    onChange(addExerciseToDay(data, selectedDate, newExerciseInput))
    setNewExerciseInput('')
    showToast(`Added ${newExerciseInput.trim()} to today's workout!`)
  }

  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="gym-app">
      {/* Toast Notification */}
      {toastMessage && <div className="toast">{toastMessage}</div>}

      {/* Routine Bar */}
      <div className="gym-topbar">
        <div className="gym-preset-group">
          <span className="gym-preset-label">Routine:</span>
          <select
            className="gym-preset-select"
            value={data.activePresetId}
            onChange={(e) => {
              const val = e.target.value
              if (val === '__new__') {
                setEditingPreset(createEmptyPreset('Custom 7-Day Routine'))
                setShowPresetEditor(true)
              } else {
                onChange(setActivePreset(data, val))
                showToast(`Switched to ${data.presets.find((p) => p.id === val)?.name || 'preset'}`)
              }
            }}
          >
            {data.presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.isDefault ? '(Default)' : ''}
              </option>
            ))}
            <option value="__new__">+ Create New Routine…</option>
          </select>

          <button
            type="button"
            className="ghost sm"
            onClick={() => {
              setEditingPreset(activePreset)
              setShowPresetEditor(true)
            }}
            title="Edit this routine preset"
          >
            Edit
          </button>
        </div>

        <div className="gym-topbar-actions">
          <button
            type="button"
            className="ghost sm"
            onClick={() => onChange(toggleWeightUnit(data))}
            title="Toggle weight unit (kg / lbs)"
          >
            Unit: <strong>{data.weightUnit.toUpperCase()}</strong>
          </button>

          <button
            type="button"
            className="ghost sm"
            onClick={() => {
              if (window.confirm('Reset the routine to the default split?')) {
                onChange(resetDefaultPreset(data))
                showToast('Reset default routine!')
              }
            }}
            title="Reset default routine"
          >
            Reset
          </button>

          <button
            type="button"
            className={showRestTimer ? 'primary sm' : 'ghost sm'}
            onClick={() => setShowRestTimer((v) => !v)}
            title="Toggle Rest Timer"
          >
            Timer
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="date-nav-bar" style={{ marginBottom: 0 }}>
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
          >
            Calendar
          </button>
        </div>
      </div>

      {/* 7-Day Week Strip */}
      <div className="gym-week-strip">
        {weekDates.map(({ dayIndex, dateStr, dayLabel }) => {
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === today
          const log = data.history[dateStr]
          const dayNum = parseInt(dateStr.split('-')[2], 10)

          const isDone = Boolean(log && log.completed)
          const isPart = Boolean(
            log && !log.isRest && log.exercises.some((e) => e.sets.some((s) => s.completed)),
          )
          const presetDay = activePreset.days.find((d) => d.dayIndex === dayIndex)
          const isRest = log ? log.isRest : presetDay ? presetDay.isRest : false

          return (
            <button
              key={dateStr}
              type="button"
              className={`gym-week-day ${isSelected ? 'is-selected' : ''} ${
                isToday ? 'is-today' : ''
              } ${isRest ? 'is-rest' : ''}`}
              onClick={() => setSelectedDate(dateStr)}
              title={`${dayLabel} - ${isRest ? 'Rest' : presetDay?.name || 'Workout'}`}
            >
              <span className="gym-wd-dow">{dayLabel.slice(0, 3)}</span>
              <span className="gym-wd-num">{dayNum}</span>
              <span
                className={`gym-wd-dot ${
                  isDone ? 'done' : isPart ? 'part' : isRest ? 'rest' : 'empty'
                }`}
              />
            </button>
          )
        })}
      </div>

      {/* Calendar Popup */}
      {showCalendar && (
        <div className="gym-cal-popup">
          <Calendar
            selected={selectedDate}
            today={today}
            history={data.history}
            onSelect={(date) => {
              setSelectedDate(date)
              setShowCalendar(false)
            }}
          />
        </div>
      )}

      {/* Rest Timer Drawer */}
      {showRestTimer && (
        <RestTimer
          initialSeconds={timerInitialSeconds}
          onClose={() => setShowRestTimer(false)}
        />
      )}

      {/* Active Session Overview Card */}
      <div className="gym-session-card">
        <div className="gym-session-head">
          <div className="gym-session-title">
            <span className="gym-session-name">
              {dayLog.dayName || (dayLog.isRest ? 'Rest Day' : 'Workout')}
            </span>
            {dayLog.completed && (
              <span
                className="today-pill"
                style={{
                  background: 'var(--green-dim)',
                  color: 'var(--green)',
                  borderColor: 'var(--green-border)',
                }}
              >
                Completed
              </span>
            )}
          </div>

          <div className="gym-session-actions">
            <button
              type="button"
              className="ghost sm"
              onClick={() => {
                onChange(toggleDayRest(data, selectedDate))
                showToast(dayLog.isRest ? 'Switched to Workout Day' : 'Switched to Rest Day')
              }}
              title="Toggle between Rest Day and Workout Day"
            >
              {dayLog.isRest ? 'Switch to Workout' : 'Mark as Rest Day'}
            </button>

            {!dayLog.isRest && dayLog.exercises.length > 0 && (
              <button
                type="button"
                className={dayLog.completed ? 'ghost sm' : 'primary sm'}
                onClick={() => {
                  onChange(toggleDayWorkoutCompleted(data, selectedDate))
                  showToast(
                    dayLog.completed
                      ? 'Workout marked in-progress'
                      : 'Workout marked completed!',
                  )
                }}
              >
                {dayLog.completed ? 'Workout Done ✓' : 'Finish Workout'}
              </button>
            )}
          </div>
        </div>

        {!dayLog.isRest && (
          <div className="gym-session-stats">
            <div className="gym-session-stat">
              <span className="gym-session-stat-val">
                {completedSets}/{totalSets}
              </span>
              <span className="gym-session-stat-lbl">Sets Completed</span>
            </div>
            <div className="gym-session-stat">
              <span className="gym-session-stat-val">{dayLog.exercises.length}</span>
              <span className="gym-session-stat-lbl">Exercises</span>
            </div>
            <div className="gym-session-stat">
              <span className="gym-session-stat-val">{progressPercent}%</span>
              <span className="gym-session-stat-lbl">Completed</span>
            </div>
          </div>
        )}

        {!dayLog.isRest && totalSets > 0 && (
          <div className="gym-session-progress">
            <div
              className="gym-session-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Workout Content */}
      {dayLog.isRest ? (
        <div className="gym-session-card">
          <div className="gym-rest-card">
            <h3>Rest & Recovery Day</h3>
            <p>
              No exercises scheduled for today. Rest is essential for muscle recovery and rebuilding strength.
            </p>
            <button
              type="button"
              className="ghost sm"
              onClick={() => {
                onChange(toggleDayRest(data, selectedDate))
                showToast('Switched to Workout Day')
              }}
            >
              Train today instead
            </button>
          </div>
        </div>
      ) : (
        <div className="gym-exercises">
          {dayLog.exercises.map((exercise, exerciseIdx) => {
            const prevInfo = findLastLoggedExercise(
              data,
              exercise.exerciseName,
              selectedDate,
            )

            return (
              <ExerciseCard
                key={`${exercise.exerciseName}-${exerciseIdx}`}
                exercise={exercise}
                exerciseIndex={exerciseIdx}
                weightUnit={data.weightUnit}
                previousInfo={prevInfo}
                onUpdateSet={(eIdx, sIdx, patch) =>
                  onChange(updateSetInDay(data, selectedDate, eIdx, sIdx, patch))
                }
                onAddSet={(eIdx) =>
                  onChange(addSetToExercise(data, selectedDate, eIdx))
                }
                onRemoveSet={(eIdx, sIdx) =>
                  onChange(removeSetFromExercise(data, selectedDate, eIdx, sIdx))
                }
                onRemoveExercise={(eIdx) =>
                  onChange(removeExerciseFromDay(data, selectedDate, eIdx))
                }
                onUpdateNotes={(eIdx, notes) =>
                  onChange(updateExerciseNotes(data, selectedDate, eIdx, notes))
                }
                onSetCompleted={handleSetCompleted}
              />
            )
          })}

          {/* Quick Add Custom Exercise Bar */}
          <form className="gym-add-bar" onSubmit={handleAddCustomExercise}>
            <input
              type="text"
              placeholder="+ Add another exercise to today's workout..."
              value={newExerciseInput}
              onChange={(e) => setNewExerciseInput(e.target.value)}
            />
            <button
              type="submit"
              className="primary sm"
              disabled={!newExerciseInput.trim()}
            >
              Add
            </button>
          </form>
        </div>
      )}

      {/* Routine Preset Editor Modal */}
      {showPresetEditor && (
        <PresetEditor
          initialPreset={editingPreset}
          onSave={(saved) => {
            onChange(savePreset(data, saved))
            setShowPresetEditor(false)
            setEditingPreset(null)
            showToast(`Routine "${saved.name}" saved!`)
          }}
          onCancel={() => {
            setShowPresetEditor(false)
            setEditingPreset(null)
          }}
          onDelete={(presetId) => {
            onChange(deletePreset(data, presetId))
            setShowPresetEditor(false)
            setEditingPreset(null)
            showToast('Routine deleted')
          }}
        />
      )}
    </div>
  )
}
