import { useEffect, useState } from 'react'
import CalorieCounter from './features/calorie-counter'
import TodoGraph from './features/todo-graph'
import Gym from './features/gym'
import NonNegotiables from './features/non-negotiables'
import Expenses from './features/expenses'
import { useDb } from './db/useDb'
import Gate from './shell/Gate'
import Menu from './shell/Menu'
import ExportModal from './shell/ExportModal'

const NAV_ITEMS = [
  {
    id: null,
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'calorie-counter',
    label: 'Nutrition',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    ),
  },
  {
    id: 'todo-graph',
    label: 'Tasks',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: 'gym',
    label: 'Workouts',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    label: 'Habits',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
]

const FEATURE_TITLES: Record<string, string> = {
  'calorie-counter': 'Nutrition',
  'todo-graph': 'Tasks & Graph',
  'gym': 'Workouts',
  'non-negotiables': 'Daily Habits',
  'expenses': 'Daily Expenses',
}

export default function App() {
  const handle = useDb()
  const [feature, setFeature] = useState<string | null>(() => {
    return sessionStorage.getItem('growth-arc:active-feature') || null
  })
  const [showExport, setShowExport] = useState(false)

  // Remember active feature tab in sessionStorage
  useEffect(() => {
    if (feature) {
      sessionStorage.setItem('growth-arc:active-feature', feature)
    } else {
      sessionStorage.removeItem('growth-arc:active-feature')
    }
  }, [feature])

  // Cmd/Ctrl+S to save
  useEffect(() => {
    if (!handle.db) return
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handle.save()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handle.db, handle.save])

  if (!handle.db) return <Gate handle={handle} />

  const db = handle.db

  const pageTitle = feature ? FEATURE_TITLES[feature] || feature : 'Dashboard'

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            Growth <span>Arc</span>
          </div>
          {handle.fileName && (
            <div className="sidebar-file" title={handle.fileName}>{handle.fileName}</div>
          )}
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={String(item.id)}
              className={`sidebar-nav-item ${feature === item.id ? 'is-active' : ''}`}
              onClick={() => setFeature(item.id)}
            >
              {item.icon}
              <span className="sidebar-nav-title">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {/* Save Status */}
          <div className={`save-status ${handle.isSaving ? 'is-saving' : handle.dirty ? 'is-dirty' : ''}`}>
            <span className="save-status-dot" />
            <span>
              {handle.isSaving ? 'Saving...' : handle.dirty ? 'Unsaved changes' : 'Saved'}
            </span>
          </div>
          {/* File Actions */}
          <button className="sidebar-nav-item" onClick={() => void handle.save()} disabled={handle.isSaving}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {handle.hasFileHandle ? 'Save' : 'Save to file'}
          </button>
          <button className="sidebar-nav-item" onClick={() => setShowExport(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
          <button
            className="sidebar-nav-item"
            onClick={() => {
              if (handle.dirty && !window.confirm('Unsaved changes. Close anyway?')) return
              sessionStorage.removeItem('growth-arc:active-feature')
              setFeature(null)
              handle.close()
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Close file
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="app-main">
        <div className="app-topbar">
          <div className="app-topbar-left">
            <h1 className="app-topbar-title">{pageTitle}</h1>
          </div>
          <div className="app-topbar-right">
            <button className="ghost sm" onClick={() => void handle.saveAs()} disabled={handle.isSaving}>
              Save as...
            </button>
          </div>
        </div>

        <div className="app-content">
          {feature === 'calorie-counter' ? (
            <CalorieCounter
              data={db.features.calorieCounter}
              onChange={(next) =>
                handle.update((prev) => ({
                  ...prev,
                  features: { ...prev.features, calorieCounter: next },
                }))
              }
            />
          ) : feature === 'todo-graph' ? (
            <TodoGraph
              data={db.features.todoGraph}
              onChange={(next) =>
                handle.update((prev) => ({
                  ...prev,
                  features: { ...prev.features, todoGraph: next },
                }))
              }
            />
          ) : feature === 'gym' ? (
            <Gym
              data={db.features.gym}
              onChange={(next) =>
                handle.update((prev) => ({
                  ...prev,
                  features: { ...prev.features, gym: next },
                }))
              }
            />
          ) : feature === 'non-negotiables' ? (
            <NonNegotiables
              data={db.features.nonNegotiables}
              onChange={(next) =>
                handle.update((prev) => ({
                  ...prev,
                  features: { ...prev.features, nonNegotiables: next },
                }))
              }
            />
          ) : feature === 'expenses' ? (
            <Expenses
              data={db.features.expenses}
              onChange={(next) =>
                handle.update((prev) => ({
                  ...prev,
                  features: { ...prev.features, expenses: next },
                }))
              }
            />
          ) : (
            <Menu db={db} name={db.profile.name} onOpen={setFeature} />
          )}
        </div>
      </div>

      {showExport && <ExportModal db={db} onClose={() => setShowExport(false)} />}
    </div>
  )
}
