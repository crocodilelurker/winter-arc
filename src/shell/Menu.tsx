import { useMemo } from 'react'
import { todayKey, type Db } from '../db/types'
import { getDayProgress, getAllHabitsStreak } from '../features/non-negotiables/data'

const TILES = [
  {
    id: 'calorie-counter',
    name: 'Nutrition',
    desc: 'Track meals, macros, calories, protein, and daily water intake.',
    color: '#f5a524',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    ),
  },
  {
    id: 'todo-graph',
    name: 'Tasks & Graph',
    desc: 'Plan your day, link tasks visually, and view connected graphs.',
    color: '#4f82f7',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    id: 'day-planner',
    name: 'Day Planner',
    desc: '24-hour timeline with drag & drop tasks, habits, and grid snapping.',
    color: '#06b6d4',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'gym',
    name: 'Workouts',
    desc: '7-day splits, log sets, reps, weights, and rest timers.',
    color: '#3ecf8e',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6.5 6.5 11 11" />
        <path d="m21 21-1-1" />
        <path d="m3 3 1 1" />
        <path d="m18 22 4-4" />
        <path d="m2 6 4-4" />
        <path d="m3 10 7-7" />
        <path d="m14 21 7-7" />
      </svg>
    ),
  },
  {
    id: 'non-negotiables',
    name: 'Daily Habits',
    desc: 'Track non-negotiable habits. View completed and missed days at a glance.',
    color: '#3ecf8e',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'expenses',
    name: 'Daily Expenses',
    desc: 'Log daily expenditures, 3-question necessity checks, monthly budgets, and groups.',
    color: '#06b6d4',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: 'learnings',
    name: 'Learnings & Creations',
    desc: 'Track what you learned today, ideas discovered, and new things built or shipped.',
    color: '#8b5cf6',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </svg>
    ),
  },
  {
    id: 'board',
    name: 'Canvas Board',
    desc: 'Visual Excalidraw canvas for whiteboarding, architecture, mind maps, and notes.',
    color: '#ec4899',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M8 12h8" />
        <path d="M12 8v8" />
      </svg>
    ),
  },
]

type Props = {
  name: string
  db: Db
  onOpen: (id: string) => void
}

export default function Menu({ name, db, onOpen }: Props) {
  const today = useMemo(() => todayKey(), [])
  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  // Live Metrics
  const ccDay = db.features.calorieCounter.days[today]
  const caloriesEaten = ccDay?.entries.reduce((sum, e) => sum + (e.calories || 0), 0) ?? 0
  const caloriesGoal = db.features.calorieCounter.goals.calories || 2000
  const proteinEaten = ccDay?.entries.reduce((sum, e) => sum + (e.protein || 0), 0) ?? 0
  const proteinGoal = db.features.calorieCounter.goals.protein || 120
  const waterGlasses = ccDay?.water ?? 0
  const waterGoal = db.features.calorieCounter.goals.water || 8

  const tasksDay = db.features.todoGraph.days[today]?.tasks ?? []
  const totalTasks = tasksDay.length
  const completedTasks = tasksDay.filter((t) => t.completed).length
  const nextTask = tasksDay.find((t) => !t.completed)

  const habitsData = db.features.nonNegotiables
  const habitLog = habitsData.history[today] || { date: today, values: {} }
  const habitProgress = getDayProgress(habitsData.habits, habitLog)
  const habitStreak = useMemo(() => getAllHabitsStreak(habitsData, today), [habitsData, today])

  const gymData = db.features.gym
  const gymLog = gymData.history[today]

  const expDay = db.features.expenses.days[today]
  const expTotal = expDay?.items.reduce((sum, i) => sum + (i.amount || 0), 0) ?? 0
  const currency = db.features.expenses.currency || '$'

  const plannerDay = db.features.dayPlanner.days[today]
  const plannerBlocks = plannerDay?.blocks ?? []

  const learnDay = db.features.learnings.days[today]
  const learnCount = learnDay?.entries.length ?? 0

  // Status badges for tiles
  const getTileBadge = (id: string): string | null => {
    switch (id) {
      case 'calorie-counter':
        return caloriesEaten > 0 ? `${caloriesEaten.toLocaleString()} kcal` : null
      case 'todo-graph':
        return totalTasks > 0 ? `${completedTasks}/${totalTasks} done` : null
      case 'day-planner':
        return plannerBlocks.length > 0 ? `${plannerBlocks.length} scheduled` : null
      case 'gym':
        return gymLog ? (gymLog.completed ? 'Completed ✓' : 'In Progress') : null
      case 'non-negotiables':
        return habitsData.habits.length > 0
          ? `${habitProgress.fulfilled}/${habitProgress.total} done`
          : null
      case 'expenses':
        return expTotal > 0 ? `${currency}${expTotal.toFixed(0)} spent` : null
      case 'learnings':
        return learnCount > 0 ? `${learnCount} logged` : null
      case 'board':
        return null
      default:
        return null
    }
  }

  return (
    <div className="dashboard" style={{ animation: 'fadeUp 0.2s ease' }}>
      {/* Header & Quick Action Launchpad */}
      <div className="dashboard-header">
        <div className="dashboard-greeting">
          <h2>Good to see you, {name}</h2>
          <p>Executive daily briefing · Stay locked in.</p>
        </div>
        <div className="dashboard-actions">
          <div className="dashboard-date">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {dateStr}
          </div>
        </div>
      </div>

      {/* Quick Launch Buttons */}
      <div className="dashboard-quick-row">
        <span className="quick-label">Quick Actions:</span>
        <button type="button" className="ghost sm quick-btn" onClick={() => onOpen('calorie-counter')}>
          + Log Food
        </button>
        <button type="button" className="ghost sm quick-btn" onClick={() => onOpen('todo-graph')}>
          + Add Task
        </button>
        <button type="button" className="ghost sm quick-btn" onClick={() => onOpen('expenses')}>
          + Log Expense
        </button>
        <button type="button" className="ghost sm quick-btn" onClick={() => onOpen('day-planner')}>
          + Time Block
        </button>
        <button type="button" className="ghost sm quick-btn" onClick={() => onOpen('learnings')}>
          + Note Learning
        </button>
      </div>

      {/* Live Vitals Briefing Grid */}
      <div className="dashboard-vitals-grid">
        {/* Card 1: Nutrition */}
        <div
          className="vital-card vital-card-nutrition"
          role="button"
          tabIndex={0}
          onClick={() => onOpen('calorie-counter')}
        >
          <div className="vital-card-head">
            <span className="vital-card-title">Nutrition & Fuel</span>
            <span className="vital-card-pill" style={{ color: '#f5a524', background: 'rgba(245,165,36,0.12)' }}>
              {Math.min(100, Math.round((caloriesEaten / caloriesGoal) * 100))}%
            </span>
          </div>
          <div className="vital-card-main">
            <span className="vital-num">{caloriesEaten.toLocaleString()}</span>
            <span className="vital-denom">/ {caloriesGoal.toLocaleString()} kcal</span>
          </div>
          <div className="vital-track">
            <div
              className="vital-fill"
              style={{
                width: `${Math.min(100, (caloriesEaten / caloriesGoal) * 100)}%`,
                background: '#f5a524',
              }}
            />
          </div>
          <div className="vital-footer">
            <span>🥩 {proteinEaten}g / {proteinGoal}g protein</span>
            <span>💧 {waterGlasses} / {waterGoal} glasses</span>
          </div>
        </div>

        {/* Card 2: Tasks */}
        <div
          className="vital-card vital-card-tasks"
          role="button"
          tabIndex={0}
          onClick={() => onOpen('todo-graph')}
        >
          <div className="vital-card-head">
            <span className="vital-card-title">Tasks & Focus</span>
            <span className="vital-card-pill" style={{ color: '#4f82f7', background: 'rgba(79,130,247,0.12)' }}>
              {totalTasks > 0 ? `${completedTasks}/${totalTasks}` : '0 tasks'}
            </span>
          </div>
          <div className="vital-card-main">
            <span className="vital-num">{completedTasks}</span>
            <span className="vital-denom">of {totalTasks} completed</span>
          </div>
          <div className="vital-track">
            <div
              className="vital-fill"
              style={{
                width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`,
                background: '#4f82f7',
              }}
            />
          </div>
          <div className="vital-footer vital-task-footer">
            {nextTask ? (
              <span className="vital-next-task" title={nextTask.title}>
                Next: <strong>{nextTask.title}</strong>
              </span>
            ) : totalTasks > 0 ? (
              <span style={{ color: 'var(--green)' }}>✓ All daily tasks complete</span>
            ) : (
              <span>Plan today's objectives</span>
            )}
          </div>
        </div>

        {/* Card 3: Habits & Streak */}
        <div
          className="vital-card vital-card-habits"
          role="button"
          tabIndex={0}
          onClick={() => onOpen('non-negotiables')}
        >
          <div className="vital-card-head">
            <span className="vital-card-title">Habits & Discipline</span>
            <span className="vital-card-pill" style={{ color: '#3ecf8e', background: 'rgba(62,207,142,0.12)' }}>
              🔥 {habitStreak.current}d streak
            </span>
          </div>
          <div className="vital-card-main">
            <span className="vital-num">{habitProgress.fulfilled}</span>
            <span className="vital-denom">of {habitProgress.total} habits today</span>
          </div>
          <div className="vital-track">
            <div
              className="vital-fill"
              style={{
                width: `${habitProgress.percent}%`,
                background: '#3ecf8e',
              }}
            />
          </div>
          <div className="vital-footer">
            <span>Best overall streak: {habitStreak.best} days</span>
            {habitProgress.isAllFulfilled ? (
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>Fulfilled ✓</span>
            ) : (
              <span>{habitProgress.total - habitProgress.fulfilled} left</span>
            )}
          </div>
        </div>

        {/* Card 4: Workout & Finances */}
        <div
          className="vital-card vital-card-overview"
          role="button"
          tabIndex={0}
          onClick={() => onOpen(gymLog ? 'gym' : 'expenses')}
        >
          <div className="vital-card-head">
            <span className="vital-card-title">Workout & Spend</span>
            <span className="vital-card-pill" style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.12)' }}>
              {gymLog?.completed ? 'Workout Done' : 'Active Day'}
            </span>
          </div>
          <div className="vital-card-main">
            <span className="vital-num">{currency}{expTotal.toFixed(2)}</span>
            <span className="vital-denom">spent today</span>
          </div>
          <div className="vital-track">
            <div
              className="vital-fill"
              style={{
                width: `${Math.min(100, (expTotal / 100) * 100)}%`,
                background: '#06b6d4',
              }}
            />
          </div>
          <div className="vital-footer">
            <span>🏋️ {gymLog ? (gymLog.completed ? 'Workout ✓' : gymLog.dayName) : 'No workout logged'}</span>
            <span>⏱️ {plannerBlocks.length} timeblocks</span>
          </div>
        </div>
      </div>

      {/* Feature Grid with live badges */}
      <div className="feature-grid-section-head">
        <h3>Feature Modules</h3>
        <p>Direct access to your private growth suite</p>
      </div>

      <div className="feature-grid">
        {TILES.map((tile) => {
          const badge = getTileBadge(tile.id)
          return (
            <div
              key={tile.id}
              className="feature-tile"
              role="button"
              tabIndex={0}
              onClick={() => onOpen(tile.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpen(tile.id)
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  className="feature-tile-icon"
                  style={{
                    color: tile.color,
                    borderColor: `${tile.color}22`,
                    background: `${tile.color}11`,
                  }}
                >
                  {tile.icon}
                </div>
                {badge && (
                  <span className="tile-live-badge" style={{ borderColor: `${tile.color}33`, color: tile.color }}>
                    {badge}
                  </span>
                )}
              </div>
              <div className="feature-tile-body">
                <div className="feature-tile-name">{tile.name}</div>
                <div className="feature-tile-desc">{tile.desc}</div>
              </div>
              <div className="feature-tile-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
