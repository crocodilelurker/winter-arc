import { useState } from 'react'
import {
  type WorkoutPreset,
  type PresetDay,
  createEmptyPreset,
} from './data'

type Props = {
  initialPreset?: WorkoutPreset | null
  onSave: (preset: WorkoutPreset) => void
  onCancel: () => void
  onDelete?: (presetId: string) => void
}

const COMMON_EXERCISE_SUGGESTIONS = [
  'Barbell Bench Press',
  'Incline Dumbbell Press',
  'Chest Press Machine',
  'Pec Deck Flyes',
  'Cable Crossover Flyes',
  'Barbell Squat',
  'Leg Press',
  'Leg Extension',
  'Lying Leg Curl',
  'Romanian Deadlift',
  'Calf Raises',
  'Lat Pull Down',
  'Barbell Bent Over Row',
  'Seated Cable Row',
  'T-Bar Row',
  'Single Arm Dumbbell Row',
  'Overhead Press',
  'Dumbbell Shoulder Press',
  'Lateral Raises',
  'Face Pulls',
  'Barbell Bicep Curl',
  'Incline Dumbbell Curl',
  'Hammer Curl',
  'Preacher Curl',
  'Tricep Rope Pushdown',
  'Skull Crushers',
  'Close Grip Bench Press',
  'Plank',
  'Hanging Leg Raises',
]

export default function PresetEditor({
  initialPreset,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const [preset, setPreset] = useState<WorkoutPreset>(() => {
    if (initialPreset) {
      return JSON.parse(JSON.stringify(initialPreset))
    }
    return createEmptyPreset('Custom 7-Day Routine')
  })

  const [activeDayIdx, setActiveDayIdx] = useState<number>(1) // 1 = Monday
  const [newExerciseInput, setNewExerciseInput] = useState('')

  const activeDay: PresetDay =
    preset.days.find((d) => d.dayIndex === activeDayIdx) || preset.days[0]

  const updateActiveDay = (patch: Partial<PresetDay>) => {
    setPreset((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.dayIndex === activeDayIdx ? { ...d, ...patch } : d,
      ),
    }))
  }

  const handleAddExercise = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (activeDay.exercises.includes(trimmed)) {
      setNewExerciseInput('')
      return
    }

    updateActiveDay({
      exercises: [...activeDay.exercises, trimmed],
    })
    setNewExerciseInput('')
  }

  const handleRemoveExercise = (idx: number) => {
    updateActiveDay({
      exercises: activeDay.exercises.filter((_, i) => i !== idx),
    })
  }

  const handleMoveExercise = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= activeDay.exercises.length) return
    const list = [...activeDay.exercises]
    const item = list.splice(fromIdx, 1)[0]
    list.splice(toIdx, 0, item)
    updateActiveDay({ exercises: list })
  }

  const handleSave = () => {
    if (!preset.name.trim()) {
      alert('Please enter a routine name.')
      return
    }
    onSave(preset)
  }

  return (
    <div className="preset-modal" onClick={onCancel}>
      <div className="preset-modal-inner" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="preset-modal-header">
          <input
            type="text"
            className="preset-name-input"
            value={preset.name}
            placeholder="Routine name (e.g. Growth Arc 5-Day Split)..."
            onChange={(e) => setPreset((p) => ({ ...p, name: e.target.value }))}
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="ghost sm" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="primary sm" onClick={handleSave}>
              Save Routine
            </button>
          </div>
        </div>

        {/* 2-Column Body: 7 Days Sidebar on Left, Day Canvas on Right */}
        <div className="preset-modal-body">
          {/* Left Sidebar */}
          <aside className="preset-sidebar">
            <div className="preset-sidebar-label">7-Day Split</div>
            {preset.days.map((day) => {
              const isActive = day.dayIndex === activeDayIdx
              return (
                <button
                  key={day.dayIndex}
                  type="button"
                  className={`preset-day-tab ${isActive ? 'is-active' : ''} ${
                    day.isRest ? 'is-rest' : ''
                  }`}
                  onClick={() => setActiveDayIdx(day.dayIndex)}
                >
                  <span className="preset-day-num">{day.dayLabel}</span>
                  <span className="preset-day-name">
                    {day.isRest ? 'Rest Day' : day.name || 'Workout'}
                  </span>
                  <span className="preset-day-sub">
                    {day.isRest ? 'Recovery' : `${day.exercises.length} exercises`}
                  </span>
                </button>
              )
            })}
          </aside>

          {/* Right Canvas */}
          <main className="preset-canvas">
            <div className="preset-canvas-head">
              <span className="preset-canvas-title">{activeDay.dayLabel}</span>

              {/* Workout vs Rest Toggle */}
              <div className="preset-day-toggle">
                <button
                  type="button"
                  className={!activeDay.isRest ? 'is-active' : ''}
                  onClick={() => updateActiveDay({ isRest: false, name: activeDay.name === 'Rest Day' ? 'Workout' : activeDay.name })}
                >
                  Workout
                </button>
                <button
                  type="button"
                  className={activeDay.isRest ? 'is-active' : ''}
                  onClick={() => updateActiveDay({ isRest: true, name: 'Rest Day' })}
                >
                  Rest Day
                </button>
              </div>
            </div>

            <div className="preset-canvas-body">
              {activeDay.isRest ? (
                <div className="preset-rest-notice">
                  <h4>Rest & Recovery Day</h4>
                  <p>
                    No workouts scheduled for {activeDay.dayLabel}. Rest is essential for rebuilding strength and recovery.
                  </p>
                  <button
                    type="button"
                    className="ghost sm"
                    style={{ margin: '0 auto' }}
                    onClick={() =>
                      updateActiveDay({
                        isRest: false,
                        name: `Day ${activeDay.dayIndex} Workout`,
                      })
                    }
                  >
                    Switch to workout day
                  </button>
                </div>
              ) : (
                <>
                  {/* Day Muscle Focus */}
                  <div className="canvas-focus-row">
                    <span className="canvas-focus-label">Day Focus / Muscle Groups</span>
                    <input
                      type="text"
                      placeholder="e.g. Chest + Core, Back & Biceps, Legs..."
                      value={activeDay.name}
                      onChange={(e) => updateActiveDay({ name: e.target.value })}
                    />
                  </div>

                  {/* Exercises List */}
                  <div className="canvas-focus-label">
                    Exercises ({activeDay.exercises.length})
                  </div>

                  {activeDay.exercises.length === 0 ? (
                    <div style={{ color: 'var(--text-3)', fontSize: '12px', padding: '12px 0' }}>
                      No exercises added for {activeDay.dayLabel} yet. Add from below.
                    </div>
                  ) : (
                    <div className="preset-ex-list">
                      {activeDay.exercises.map((name, idx) => (
                        <div key={`${name}-${idx}`} className="preset-ex-row">
                          <span className="preset-ex-idx">#{idx + 1}</span>
                          <span className="preset-ex-name">{name}</span>
                          <div className="preset-ex-actions">
                            <button
                              type="button"
                              className="reorder-btn"
                              disabled={idx === 0}
                              onClick={() => handleMoveExercise(idx, idx - 1)}
                              title="Move up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="reorder-btn"
                              disabled={idx === activeDay.exercises.length - 1}
                              onClick={() => handleMoveExercise(idx, idx + 1)}
                              title="Move down"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="preset-del-ex"
                              onClick={() => handleRemoveExercise(idx)}
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Exercise Bar */}
                  <form
                    className="preset-add-ex-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddExercise(newExerciseInput)
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Add exercise (e.g. Romanian Deadlift)..."
                      value={newExerciseInput}
                      onChange={(e) => setNewExerciseInput(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="primary sm"
                      disabled={!newExerciseInput.trim()}
                    >
                      + Add
                    </button>
                  </form>

                  {/* Suggestions Chips */}
                  <div className="canvas-focus-label">Quick Suggestions</div>
                  <div className="preset-sug-chips">
                    {COMMON_EXERCISE_SUGGESTIONS.filter(
                      (name) => !activeDay.exercises.includes(name),
                    )
                      .slice(0, 10)
                      .map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          className="preset-sug-chip"
                          onClick={() => handleAddExercise(sug)}
                        >
                          + {sug}
                        </button>
                      ))}
                  </div>
                </>
              )}
            </div>
          </main>
        </div>

        {/* Modal Footer */}
        <div className="preset-modal-footer">
          {onDelete && initialPreset && !initialPreset.isDefault ? (
            <button
              type="button"
              className="ghost sm danger"
              onClick={() => {
                if (window.confirm(`Delete routine "${initialPreset.name}"?`)) {
                  onDelete(initialPreset.id)
                }
              }}
            >
              Delete Routine
            </button>
          ) : (
            <span />
          )}

          <div className="preset-footer-right">
            <button type="button" className="ghost sm" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="primary sm" onClick={handleSave}>
              Save & Apply Routine
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
