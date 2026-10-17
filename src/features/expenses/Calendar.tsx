import { useState } from 'react'
import { type ExpensesData, formatCurrency } from './data'

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
  data: ExpensesData
  onSelectDate: (dateKey: string) => void
}

export default function Calendar({ selectedDate, today, data, onSelectDate }: Props) {
  const [y, m] = selectedDate.split('-').map(Number)
  const [cursor, setCursor] = useState({ year: y, month: m - 1 })

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

  // Calculate monthly stats for the mini calendar
  let monthTotal = 0
  let activeDays = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const dk = keyOf(cursor.year, cursor.month, d)
    const dayLog = data.days[dk]
    if (dayLog && dayLog.items.length > 0) {
      activeDays++
      for (const item of dayLog.items) {
        monthTotal += item.amount
      }
    }
  }

  return (
    <div className="expenses-cal-card">
      <div className="expenses-cal-head">
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
        <div className="expenses-cal-stats">
          <span className="expenses-cal-stat-total">{formatCurrency(monthTotal, data.currency)}</span>
          <span className="expenses-cal-stat-sep">·</span>
          <span className="expenses-cal-stat-days">{activeDays} active days</span>
        </div>
      </div>

      <div className="expenses-cal-body">
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
              <span key={`prev-${i}`} className="exp-cal-day is-outside">
                <span className="exp-day-num">{prevDay}</span>
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
            const items = dayLog?.items || []
            const hasItems = items.length > 0
            const dayTotal = items.reduce((sum, it) => sum + it.amount, 0)
            const hasUnnecessary = items.some((it) => !it.isNecessary)

            return (
              <button
                key={dk}
                type="button"
                className={`exp-cal-day ${hasItems ? 'has-spend' : ''} ${
                  hasItems && hasUnnecessary ? 'has-discretionary' : ''
                } ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                onClick={() => onSelectDate(dk)}
                title={
                  hasItems
                    ? `${items.length} purchases (${formatCurrency(dayTotal, data.currency)})${
                        hasUnnecessary ? ' · Includes discretionary spending' : ' · All necessary'
                      }`
                    : undefined
                }
              >
                <span className="exp-day-num">{day}</span>
                {hasItems && (
                  <span
                    className={`exp-day-indicator ${hasUnnecessary ? 'is-warning' : 'is-necessary'}`}
                  />
                )}
              </button>
            )
          })}

          {/* Trailing Days to Complete Last Row */}
          {Array.from({ length: trailing }, (_, i) => {
            const nextDay = i + 1
            return (
              <span key={`next-${i}`} className="exp-cal-day is-outside">
                <span className="exp-day-num">{nextDay}</span>
              </span>
            )
          })}
        </div>
      </div>

      <div className="expenses-cal-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--green)' }} />
          All necessary
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#f59e0b' }} />
          Discretionary
        </div>
        {selectedDate !== today && (
          <button
            type="button"
            className="cal-jump-btn"
            style={{ marginLeft: 'auto' }}
            onClick={() => onSelectDate(today)}
          >
            Today
          </button>
        )}
      </div>
    </div>
  )
}
