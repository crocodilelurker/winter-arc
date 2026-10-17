import { useState } from 'react'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const pad = (n: number) => String(n).padStart(2, '0')
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

type Props = {
  selected: string
  today: string
  dayStats: Record<string, { total: number; completed: number }>
  onSelect: (dateKey: string) => void
}

export default function Calendar({ selected, today, dayStats, onSelect }: Props) {
  const [y, m] = selected.split('-').map(Number)
  const [cursor, setCursor] = useState({ year: y, month: m - 1 })

  const first = new Date(cursor.year, cursor.month, 1)
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const leading = (first.getDay() + 6) % 7 // Monday = column 0

  function shift(by: number) {
    const d = new Date(cursor.year, cursor.month + by, 1)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
  }

  return (
    <div className="mini-cal">
      <div className="mini-cal-nav">
        <button type="button" className="cal-nav-btn" onClick={() => shift(-1)} aria-label="Previous month">
          ‹
        </button>
        <strong>
          {MONTHS[cursor.month]} {cursor.year}
        </strong>
        <button type="button" className="cal-nav-btn" onClick={() => shift(1)} aria-label="Next month">
          ›
        </button>
      </div>

      <div className="mini-cal-grid">
        {WEEKDAYS.map((w) => (
          <span key={w} className="mini-cal-wd">
            {w}
          </span>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const key = keyOf(cursor.year, cursor.month, day)
          const stats = dayStats[key]

          const isSelected = key === selected
          const isToday = key === today
          const hasTasks = Boolean(stats && stats.total > 0)
          const isAllDone = Boolean(hasTasks && stats.completed === stats.total)

          const cls = [
            'mini-cal-day',
            isSelected ? 'is-selected' : '',
            isToday ? 'is-today' : '',
          ].filter(Boolean).join(' ')

          return (
            <button
              key={key}
              type="button"
              className={cls}
              onClick={() => onSelect(key)}
              title={
                hasTasks
                  ? `${stats.completed}/${stats.total} completed`
                  : undefined
              }
            >
              {day}
              {hasTasks && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '3px',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: isSelected
                      ? '#ffffff'
                      : isAllDone
                      ? 'var(--green)'
                      : 'var(--blue)',
                  }}
                />
              )}
            </button>
          )
        })}
      </div>

      {selected !== today && (
        <button type="button" className="cal-jump-btn" onClick={() => onSelect(today)}>
          Jump to today
        </button>
      )}
    </div>
  )
}
