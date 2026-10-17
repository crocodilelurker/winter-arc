import type { Db } from '../db/types'

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
]

type Props = {
  name: string
  db: Db
  onOpen: (id: string) => void
}

export default function Menu({ name, onOpen }: Props) {
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="dashboard" style={{ animation: 'fadeUp 0.2s ease' }}>
      <div className="dashboard-header">
        <div className="dashboard-greeting">
          <h2>Good to see you, {name}</h2>
          <p>Pick a section to get started for today.</p>
        </div>
        <div className="dashboard-actions">
          <div className="dashboard-date">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {today}
          </div>
        </div>
      </div>

      <div className="feature-grid">
        {TILES.map((tile) => (
          <div
            key={tile.id}
            className="feature-tile"
            role="button"
            tabIndex={0}
            onClick={() => onOpen(tile.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(tile.id) } }}
          >
            <div
              className="feature-tile-icon"
              style={{ color: tile.color, borderColor: `${tile.color}22`, background: `${tile.color}11` }}
            >
              {tile.icon}
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
        ))}
      </div>
    </div>
  )
}
