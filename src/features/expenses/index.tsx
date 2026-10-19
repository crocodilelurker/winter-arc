import { useState, useMemo } from 'react'
import { todayKey } from '../../db/types'
import {
  type ExpensesData,
  getDayExpenses,
  addExpenseItem,
  deleteExpenseItem,
  getMonthSummary,
  formatCurrency,
} from './data'
import Calendar from './Calendar'
import GroupsManager from './GroupsManager'
import './expenses.css'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
]

type Props = {
  data: ExpensesData
  onChange: (next: ExpensesData) => void
}

type TabMode = 'daily' | 'groups'

export default function Expenses({ data, onChange }: Props) {
  const today = useMemo(() => todayKey(), [])
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [activeTab, setActiveTab] = useState<TabMode>('daily')
  const [showCalendar, setShowCalendar] = useState<boolean>(false)

  // 3-Question form states
  const [whatBought, setWhatBought] = useState('')
  const [howMuch, setHowMuch] = useState('')
  const [wasNecessary, setWasNecessary] = useState<boolean>(true)
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    data.groups[0]?.id || 'grp-food',
  )

  // Derive month and year from selectedDate for top overview
  const [selYear, selMonth] = selectedDate.split('-').map(Number)
  const [viewMonthOffset, setViewMonthOffset] = useState<number>(0)

  // Top month calculation
  const currentMonthDate = new Date(selYear, selMonth - 1 + viewMonthOffset, 1)
  const activeYear = currentMonthDate.getFullYear()
  const activeMonth = currentMonthDate.getMonth()

  const monthSummary = useMemo(
    () => getMonthSummary(data, activeYear, activeMonth),
    [data, activeYear, activeMonth],
  )

  const dayLog = getDayExpenses(data, selectedDate)
  const dayItems = dayLog.items
  const dayTotal = dayItems.reduce((acc, it) => acc + it.amount, 0)
  const dayNecessary = dayItems
    .filter((it) => it.isNecessary)
    .reduce((acc, it) => acc + it.amount, 0)
  const dayUnnecessary = dayItems
    .filter((it) => !it.isNecessary)
    .reduce((acc, it) => acc + it.amount, 0)

  const shiftDay = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const next = new Date(y, m - 1, d + days)
    const pad = (n: number) => String(n).padStart(2, '0')
    const nextStr = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`
    setSelectedDate(nextStr)
    setViewMonthOffset(0)
  }

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault()
    const amountVal = parseFloat(howMuch)
    if (!whatBought.trim() || isNaN(amountVal) || amountVal <= 0) return

    const next = addExpenseItem(data, selectedDate, {
      title: whatBought.trim(),
      amount: amountVal,
      isNecessary: wasNecessary,
      groupId: selectedGroupId || data.groups[0]?.id || 'grp-other',
    })

    onChange(next)
    setWhatBought('')
    setHowMuch('')
    // Keep necessity default on true for convenience
  }

  const handleDeleteItem = (itemId: string) => {
    const next = deleteExpenseItem(data, selectedDate, itemId)
    onChange(next)
  }

  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // Budget calculations
  const budget = data.monthlyBudget
  const budgetRemaining = budget ? budget - monthSummary.totalSpent : undefined
  const budgetPercent = budget ? Math.min(100, Math.round((monthSummary.totalSpent / budget) * 100)) : undefined

  return (
    <div className="expenses-app">
      {/* Top Level Monthly Expenses Banner */}
      <div className="monthly-expenses-banner">
        <div className="month-banner-top">
          <div className="month-nav">
            <button
              type="button"
              className="month-nav-btn"
              onClick={() => setViewMonthOffset((v) => v - 1)}
              title="Previous Month"
            >
              ‹
            </button>
            <div className="month-title">
              <strong>{MONTH_NAMES[activeMonth]} {activeYear}</strong>
              <span className="month-sub">Monthly Overview</span>
            </div>
            <button
              type="button"
              className="month-nav-btn"
              onClick={() => setViewMonthOffset((v) => v + 1)}
              title="Next Month"
            >
              ›
            </button>
            {viewMonthOffset !== 0 && (
              <button
                type="button"
                className="ghost sm reset-month-btn"
                onClick={() => setViewMonthOffset(0)}
              >
                Current Month
              </button>
            )}
          </div>

          <div className="month-top-stats">
            <div className="month-stat-box total-spend">
              <span className="stat-label">Total Monthly Spend</span>
              <span className="stat-value">{formatCurrency(monthSummary.totalSpent, data.currency)}</span>
              <span className="stat-hint">
                {monthSummary.totalTransactions} purchases across {monthSummary.daysWithExpenses} days
              </span>
            </div>

            <div className="month-stat-box necessary-spend">
              <span className="stat-label">
                <span className="dot dot-green" /> Necessary Spend
              </span>
              <span className="stat-value">{formatCurrency(monthSummary.necessarySpent, data.currency)}</span>
              <span className="stat-hint">{monthSummary.necessaryPercent}% of total spend</span>
            </div>

            <div className="month-stat-box unnecessary-spend">
              <span className="stat-label">
                <span className="dot dot-amber" /> Discretionary / Unnecessary
              </span>
              <span className="stat-value">{formatCurrency(monthSummary.unnecessarySpent, data.currency)}</span>
              <span className="stat-hint">{monthSummary.unnecessaryPercent}% of total spend</span>
            </div>

            {budget && (
              <div className={`month-stat-box budget-box ${budgetRemaining && budgetRemaining < 0 ? 'is-over' : ''}`}>
                <span className="stat-label">Monthly Target Budget</span>
                <span className="stat-value">
                  {budgetRemaining && budgetRemaining < 0
                    ? `Over by ${formatCurrency(Math.abs(budgetRemaining), data.currency)}`
                    : `${formatCurrency(budgetRemaining || 0, data.currency)} left`}
                </span>
                <span className="stat-hint">
                  {budgetPercent}% of {formatCurrency(budget, data.currency)} cap
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Necessity Split Bar */}
        {monthSummary.totalSpent > 0 && (
          <div className="necessity-split-container">
            <div className="split-labels">
              <span className="split-label-left">
                Essential ({monthSummary.necessaryPercent}%)
              </span>
              <span className="split-label-right">
                Discretionary ({monthSummary.unnecessaryPercent}%)
              </span>
            </div>
            <div className="necessity-split-bar">
              <div
                className="split-segment necessary"
                style={{ width: `${monthSummary.necessaryPercent}%` }}
                title={`Necessary: ${formatCurrency(monthSummary.necessarySpent, data.currency)}`}
              />
              <div
                className="split-segment unnecessary"
                style={{ width: `${monthSummary.unnecessaryPercent}%` }}
                title={`Discretionary: ${formatCurrency(monthSummary.unnecessarySpent, data.currency)}`}
              />
            </div>
          </div>
        )}

        {/* Group Spending Mini Breakdown */}
        {monthSummary.totalSpent > 0 && (
          <div className="month-groups-strip">
            <span className="strip-title">By Category:</span>
            <div className="strip-pills">
              {Object.entries(monthSummary.byGroup)
                .filter(([_, g]) => g.total > 0)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([id, g]) => (
                  <span key={id} className="group-spend-pill" style={{ borderColor: `${g.color}40` }}>
                    <span className="pill-dot" style={{ backgroundColor: g.color }} />
                    <span className="pill-name">{g.name}:</span>
                    <strong className="pill-amount">{formatCurrency(g.total, data.currency)}</strong>
                    <span className="pill-pct">({g.percent}%)</span>
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs Header */}
      <div className="exp-tabs-nav">
        <button
          type="button"
          className={`exp-tab-btn ${activeTab === 'daily' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Daily Expenses
        </button>
        <button
          type="button"
          className={`exp-tab-btn ${activeTab === 'groups' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          Groups & Categories ({data.groups.length})
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'groups' ? (
        <GroupsManager data={data} onChange={onChange} />
      ) : (
        <div className="exp-daily-workspace">
          {/* Date nav bar */}
          <div className="date-nav-bar">
            <div className="date-nav-center">
              <button
                type="button"
                className="date-nav-arrow"
                onClick={() => shiftDay(-1)}
                title="Previous Day"
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
                title="Next Day"
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
                className={`ghost sm ${showCalendar ? 'is-active' : ''}`}
                onClick={() => setShowCalendar((v) => !v)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {showCalendar ? 'Hide Calendar' : 'Calendar'}
              </button>
            </div>
          </div>

          <div className="exp-grid-layout">
            {/* Left Column: 3 Questions Daily Entry & Purchases List */}
            <div className="exp-main-col">
              {/* 3-Question Logging Card */}
              <div className="card exp-entry-card">
                <div className="card-header">
                  <div className="card-title">Mark Expenditure for {selectedDate === today ? 'Today' : selectedDate}</div>
                  <div className="card-subtitle">
                    Answer these 3 quick questions for each purchase you make today.
                  </div>
                </div>

                <form onSubmit={handleAddExpense} className="exp-entry-form">
                  <div className="exp-questions-grid">
                    {/* Question 1: What did you buy? */}
                    <div className="field-group exp-q1">
                      <label className="field-label">
                        <span className="q-number">1</span> What did you buy?
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Groceries at supermarket, Metro pass, Coffee, Gym gear..."
                        value={whatBought}
                        onChange={(e) => setWhatBought(e.target.value)}
                        autoFocus
                      />
                    </div>

                    {/* Question 2: How much did you spend? */}
                    <div className="field-group exp-q2">
                      <label className="field-label">
                        <span className="q-number">2</span> How much did you spend?
                      </label>
                      <div className="exp-amount-input-wrap">
                        <span className="exp-currency-badge">{data.currency}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={howMuch}
                          onChange={(e) => setHowMuch(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Category Selection: side-by-side with question 2 */}
                    <div className="field-group exp-q-group">
                      <label className="field-label">Group / Category</label>
                      <div className="exp-group-select-wrap">
                        <select
                          value={selectedGroupId}
                          onChange={(e) => setSelectedGroupId(e.target.value)}
                        >
                          {data.groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Question 3: Was it necessary? */}
                    <div className="field-group exp-q3">
                      <label className="field-label">
                        <span className="q-number">3</span> Was it necessary?
                      </label>
                      <div className="necessity-toggle-group">
                        <button
                          type="button"
                          className={`necessity-btn necessary ${wasNecessary ? 'is-selected' : ''}`}
                          onClick={() => setWasNecessary(true)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Yes, Necessary</span>
                          <span className="necessity-subhint">Essential need</span>
                        </button>
                        <button
                          type="button"
                          className={`necessity-btn unnecessary ${!wasNecessary ? 'is-selected' : ''}`}
                          onClick={() => setWasNecessary(false)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                          <span>No, Discretionary</span>
                          <span className="necessity-subhint">Want / non-essential</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="exp-form-footer">
                    <button
                      type="submit"
                      className="primary"
                      disabled={!whatBought.trim() || !howMuch || parseFloat(howMuch) <= 0}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Log Expenditure
                    </button>
                  </div>
                </form>
              </div>

              {/* Day's Logged Purchases List */}
              <div className="card exp-list-card">
                <div className="card-header exp-list-header">
                  <div>
                    <div className="card-title">
                      Purchases Logged ({dayItems.length})
                    </div>
                    <div className="card-subtitle">
                      {selectedDate === today ? 'Today' : selectedDate} · Total: <strong>{formatCurrency(dayTotal, data.currency)}</strong>
                      {dayItems.length > 0 && (
                        <span>
                          {' '}({formatCurrency(dayNecessary, data.currency)} necessary · {formatCurrency(dayUnnecessary, data.currency)} discretionary)
                        </span>
                      )}
                    </div>
                  </div>
                  {dayItems.length > 0 && (
                    <div className="day-total-badge">
                      {formatCurrency(dayTotal, data.currency)}
                    </div>
                  )}
                </div>

                {dayItems.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <p>No expenditure marked for this day</p>
                    <p>Answer the 3 questions above to record what you bought.</p>
                  </div>
                ) : (
                  <div className="exp-items-list">
                    {dayItems.map((item) => {
                      const group = data.groups.find((g) => g.id === item.groupId)
                      const groupColor = group?.color || '#9299a6'
                      const groupName = group?.name || 'General'

                      return (
                        <div key={item.id} className="exp-item-row">
                          <div className="exp-item-left">
                            <span
                              className="exp-item-group-tag"
                              style={{
                                color: groupColor,
                                backgroundColor: `${groupColor}18`,
                                borderColor: `${groupColor}35`,
                              }}
                            >
                              <span
                                className="tag-dot"
                                style={{ backgroundColor: groupColor }}
                              />
                              {groupName}
                            </span>

                            <div className="exp-item-details">
                              <span className="exp-item-title">{item.title}</span>
                              <div className="exp-item-meta">
                                <span
                                  className={`exp-item-necessity-badge ${
                                    item.isNecessary ? 'is-necessary' : 'is-unnecessary'
                                  }`}
                                >
                                  {item.isNecessary ? '✓ Necessary' : '✕ Discretionary'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="exp-item-right">
                            <span className="exp-item-amount">
                              {formatCurrency(item.amount, data.currency)}
                            </span>
                            <button
                              type="button"
                              className="ghost sm icon-btn is-danger exp-del-btn"
                              onClick={() => handleDeleteItem(item.id)}
                              title="Delete entry"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Mini Calendar */}
            <div className={`exp-side-col ${showCalendar ? 'is-visible' : ''}`}>
              <Calendar
                selectedDate={selectedDate}
                today={today}
                data={data}
                onSelectDate={(dk) => {
                  setSelectedDate(dk)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
