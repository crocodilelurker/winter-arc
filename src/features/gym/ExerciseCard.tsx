import { useState } from 'react'
import type { ExerciseSessionLog, ExerciseSetLog } from './data'

type Props = {
  exercise: ExerciseSessionLog
  exerciseIndex: number
  weightUnit: 'kg' | 'lbs'
  previousInfo: { weight: number; reps: number; date: string } | null
  onUpdateSet: (exerciseIdx: number, setIdx: number, patch: Partial<ExerciseSetLog>) => void
  onAddSet: (exerciseIdx: number) => void
  onRemoveSet: (exerciseIdx: number, setIdx: number) => void
  onRemoveExercise: (exerciseIdx: number) => void
  onUpdateNotes: (exerciseIdx: number, notes: string) => void
  onSetCompleted?: () => void
}

export default function ExerciseCard({
  exercise,
  exerciseIndex,
  weightUnit,
  previousInfo,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  onUpdateNotes,
  onSetCompleted,
}: Props) {
  const [showNotes, setShowNotes] = useState(Boolean(exercise.notes))

  const completedCount = exercise.sets.filter((s) => s.completed).length
  const allCompleted = exercise.sets.length > 0 && completedCount === exercise.sets.length

  const handleCopyPrevious = () => {
    if (!previousInfo) return
    exercise.sets.forEach((_, idx) => {
      onUpdateSet(exerciseIndex, idx, {
        weight: previousInfo.weight,
        reps: previousInfo.reps,
      })
    })
  }

  return (
    <div className={`exercise-card ${allCompleted ? 'all-done' : ''}`}>
      {/* Exercise Header */}
      <div className="exercise-card-head">
        <div className="exercise-title-wrap">
          <h3 className="exercise-name">{exercise.exerciseName}</h3>
          <span className="exercise-set-count">
            {completedCount}/{exercise.sets.length} sets
          </span>
        </div>

        <div className="exercise-head-actions">
          {previousInfo && (
            <button
              type="button"
              className="prev-hint"
              onClick={handleCopyPrevious}
              title={`Last lifted on ${previousInfo.date}: ${previousInfo.weight} ${weightUnit} × ${previousInfo.reps} reps. Click to copy to all sets.`}
            >
              Last: <strong>{previousInfo.weight}{weightUnit}</strong> × {previousInfo.reps} (Copy)
            </button>
          )}

          <button
            type="button"
            className="ghost sm"
            onClick={() => setShowNotes((v) => !v)}
            title="Add notes"
          >
            {exercise.notes ? 'Note' : '+ Note'}
          </button>

          <button
            type="button"
            className="ghost sm danger"
            onClick={() => {
              if (window.confirm(`Remove ${exercise.exerciseName} from today's workout?`)) {
                onRemoveExercise(exerciseIndex)
              }
            }}
            title="Remove exercise from today's workout"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Optional Note Field */}
      {showNotes && (
        <div className="exercise-note-box">
          <input
            type="text"
            className="exercise-note-input"
            placeholder="Notes for this exercise (e.g. form cues, seat height, drop set)..."
            value={exercise.notes || ''}
            onChange={(e) => onUpdateNotes(exerciseIndex, e.target.value)}
          />
        </div>
      )}

      {/* Sets Table */}
      <div className="sets-table">
        <div className="sets-head">
          <span>SET</span>
          <span>{weightUnit.toUpperCase()}</span>
          <span>REPS</span>
          <span>DONE</span>
          <span></span>
        </div>

        {exercise.sets.map((set, setIdx) => (
          <div
            key={set.id}
            className={`set-row ${set.completed ? 'is-done' : ''}`}
          >
            <span className="set-num">#{set.setNumber}</span>

            {/* Weight Input */}
            <input
              type="number"
              step="0.5"
              min="0"
              max="999"
              className="set-input"
              value={set.weight === 0 ? '' : set.weight}
              placeholder={previousInfo ? String(previousInfo.weight) : '0'}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                onUpdateSet(exerciseIndex, setIdx, {
                  weight: isNaN(val) ? 0 : val,
                })
              }}
            />

            {/* Reps Input */}
            <input
              type="number"
              min="0"
              max="999"
              className="set-input"
              value={set.reps === 0 ? '' : set.reps}
              placeholder={previousInfo ? String(previousInfo.reps) : '10'}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                onUpdateSet(exerciseIndex, setIdx, {
                  reps: isNaN(val) ? 0 : val,
                })
              }}
            />

            {/* Complete Toggle Button */}
            <button
              type="button"
              className={`set-check ${set.completed ? 'is-done' : ''}`}
              onClick={() => {
                const nextState = !set.completed
                onUpdateSet(exerciseIndex, setIdx, { completed: nextState })
                if (nextState && onSetCompleted) {
                  onSetCompleted()
                }
              }}
              title={set.completed ? 'Mark incomplete' : 'Mark completed (starts rest timer)'}
            >
              {set.completed ? '✓' : ''}
            </button>

            {/* Remove Set Button */}
            <button
              type="button"
              className="set-del"
              onClick={() => onRemoveSet(exerciseIndex, setIdx)}
              disabled={exercise.sets.length <= 1}
              title="Delete set"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Add Set Footer */}
      <div className="exercise-card-foot">
        <button
          type="button"
          className="ghost sm"
          onClick={() => onAddSet(exerciseIndex)}
        >
          + Add Set
        </button>
      </div>
    </div>
  )
}
