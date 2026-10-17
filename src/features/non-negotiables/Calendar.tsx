import { useState } from 'react'
import {
  type Habit,
  type DayHabitsLog,
  getDayProgress,
} from './data'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
]

const pad = (n: number) => String(n).padStart(2, '0')
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

type Props = {
  selectedDate: string
  today: string
  habits: Habit[]
  history: Record<string, DayHabitsLog>
  onSelectDate: (dateKey: string) => void
}

export default function Calendar({ selectedDate, today, habits, history, onSelectDate }: Props) {
  const [y, m] = selectedDate.split('-').map(Number)
  const [cursor, setCursor] = useState({ year: y, month: m - 1 })

  const first = new Date(cursor.year, cursor.month, 1)
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const leading = (first.getDay() + 6) % 7

  function shift(by: number) {
    const d = new Date(cursor.year, cursor.month + by, 1)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
  }

  // Stats for header
  let doneCount = 0
  let missedCount = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dk = keyOf(cursor.year, cursor.month, d)
    if (dk <= today && habits.length > 0) {
      const log = history[dk]
      const { isAllFulfilled } = getDayProgress(habits, log)
      if (isAllFulfilled) doneCount++
      else missedCount++
    }
  }

  return (
    <div className="habits-cal-card">
      <div className="habits-cal-head">
        <div className="mini-cal-nav">
          <button type="button" className="cal-nav-btn" onClick={() => shift(-1)}>‹</button>
          <strong style={{ fontSize: '13px' }}>{MONTHS[cursor.month]} {cursor.year}</strong>
          <button type="button" className="cal-nav-btn" onClick={() => shift(1)}>›</button>
        </div>
        <div className="habits-cal-stats">
          <span className="habits-cal-stat-done">{doneCount} done</span>
          <span className="habits-cal-stat-sep">·</span>
          <span className="habits-cal-stat-miss">{missedCount} missed</span>
        </div>
      </div>

      <div className="habits-cal-body">
        <div className="mini-cal-grid">
          {WEEKDAYS.map((w) => <span key={w} className="mini-cal-wd">{w}</span>)}
          {Array.from({ length: leading }, (_, i) => <span key={`pad-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const dk = keyOf(cursor.year, cursor.month, day)
            const isSelected = dk === selectedDate
            const isToday = dk === today
            const isPastOrToday = dk <= today
            const log = history[dk]
            const { isAllFulfilled, fulfilled, total } = getDayProgress(habits, log)
            const hasHabits = total > 0

            let statusCls = ''
            if (hasHabits && isPastOrToday) {
              statusCls = isAllFulfilled ? 'day-done' : 'day-missed'
            }

            return (
              <button
                key={dk}
                type="button"
                className={`nn-cal-day ${statusCls} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                onClick={() => onSelectDate(dk)}
                title={hasHabits && isPastOrToday
                  ? isAllFulfilled
                    ? `All ${total} habits done`
                    : `${fulfilled}/${total} habits done`
                  : undefined}
              >
                <span className="nn-day-num">{day}</span>
                {hasHabits && isPastOrToday && (
                  <span className="nn-day-dot" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="habits-cal-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--green)' }} />
          All done
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--amber)' }} />
          Missed
        </div>
        {selectedDate !== today && (
          <button type="button" className="cal-jump-btn" style={{ marginLeft: 'auto' }} onClick={() => onSelectDate(today)}>
            Today
          </button>
        )}
      </div>
    </div>
  )
}
