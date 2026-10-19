import { useState, useEffect } from 'react'
import type { LearningData } from './data'

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
  data: LearningData
  onSelectDate: (dateKey: string) => void
}

export default function Calendar({ selectedDate, today, data, onSelectDate }: Props) {
  const [y, m] = selectedDate.split('-').map(Number)
  const [cursor, setCursor] = useState({ year: y, month: m - 1 })

  useEffect(() => {
    const [sY, sM] = selectedDate.split('-').map(Number)
    if (!isNaN(sY) && !isNaN(sM)) {
      setCursor({ year: sY, month: sM - 1 })
    }
  }, [selectedDate])

  const first = new Date(cursor.year, cursor.month, 1)
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const daysInPrevMonth = new Date(cursor.year, cursor.month, 0).getDate()
  const leading = (first.getDay() + 6) % 7 // Monday = 0
  const totalCells = leading + daysInMonth
  const trailing = (7 - (totalCells % 7)) % 7

  function shift(by: number) {
    const d = new Date(cursor.year, cursor.month + by, 1)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
  }

  // Monthly stats
  let activeDays = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const dk = keyOf(cursor.year, cursor.month, d)
    const dayLog = data.days[dk]
    if (dayLog && dayLog.entries.length > 0) {
      activeDays++
    }
  }

  return (
    <div className="lrn-cal-card">
      <div className="lrn-cal-head">
        <div className="mini-cal-nav">
          <button
            type="button"
            className="cal-nav-btn"
            onClick={() => shift(-1)}
            title="Previous month"
          >
            ‹
          </button>
          <strong style={{ fontSize: '13px' }}>
            {MONTHS[cursor.month]} {cursor.year}
          </strong>
          <button
            type="button"
            className="cal-nav-btn"
            onClick={() => shift(1)}
            title="Next month"
          >
            ›
          </button>
        </div>
        <div className="lrn-cal-stats">
          <span className="lrn-cal-stat-num">{activeDays} active days</span>
        </div>
      </div>

      <div className="lrn-cal-body">
        <div className="mini-cal-grid">
          {/* Day of Week Headers */}
          {WEEKDAYS.map((w) => (
            <span key={w} className="mini-cal-wd">
              {w}
            </span>
          ))}

          {/* Leading Days from Previous Month */}
          {Array.from({ length: leading }, (_, i) => {
            const prevDay = daysInPrevMonth - leading + i + 1
            return (
              <span key={`prev-${i}`} className="lrn-cal-day is-outside">
                <span className="lrn-day-num">{prevDay}</span>
              </span>
            )
          })}

          {/* Days of Current Month */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const dk = keyOf(cursor.year, cursor.month, day)
            const isSelected = dk === selectedDate
            const isToday = dk === today
            const dayLog = data.days[dk]
            const entries = dayLog?.entries || []
            const hasLearnings = entries.some((e) => e.type === 'learning')
            const hasCreations = entries.some((e) => e.type === 'creation')

            return (
              <button
                key={dk}
                type="button"
                className={`lrn-cal-day ${entries.length > 0 ? 'has-entries' : ''} ${
                  isSelected ? 'is-selected' : ''
                } ${isToday ? 'is-today' : ''}`}
                onClick={() => onSelectDate(dk)}
                title={
                  entries.length > 0
                    ? `${entries.length} logged (${entries.filter((e) => e.type === 'learning').length} learned, ${
                        entries.filter((e) => e.type === 'creation').length
                      } created)`
                    : undefined
                }
              >
                <span className="lrn-day-num">{day}</span>
                {entries.length > 0 && (
                  <div className="lrn-dots-row">
                    {hasLearnings && <span className="lrn-dot dot-learn" />}
                    {hasCreations && <span className="lrn-dot dot-create" />}
                  </div>
                )}
              </button>
            )
          })}

          {/* Trailing Days to Complete Last Row */}
          {Array.from({ length: trailing }, (_, i) => {
            const nextDay = i + 1
            return (
              <span key={`next-${i}`} className="lrn-cal-day is-outside">
                <span className="lrn-day-num">{nextDay}</span>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
