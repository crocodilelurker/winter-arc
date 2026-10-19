import { useEffect, useState } from 'react'
import CalorieCounter from './features/calorie-counter'
import TodoGraph from './features/todo-graph'
import Gym from './features/gym'
import NonNegotiables from './features/non-negotiables'
import Expenses from './features/expenses'
import Learnings from './features/learnings'
import DayPlanner from './features/day-planner'
import { useDb } from './db/useDb'
import Gate from './shell/Gate'
import Menu from './shell/Menu'
import ExportModal from './shell/ExportModal'
import { usePwa } from './shell/usePwa'

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
    id: 'day-planner',
    label: 'Planner',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
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
  {
    id: 'learnings',
    label: 'Learnings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </svg>
    ),
  },
]

const FEATURE_TITLES: Record<string, string> = {
  'day-planner': '24h Day Planner',
  'calorie-counter': 'Nutrition',
  'todo-graph': 'Tasks & Graph',
  'gym': 'Workouts',
  'non-negotiables': 'Daily Habits',
  'expenses': 'Daily Expenses',
  'learnings': 'Learnings & Creations',
}

export default function App() {
  const handle = useDb()
  const pwa = usePwa()
  const [feature, setFeature] = useState<string | null>(() => {
    return sessionStorage.getItem('growth-arc:active-feature') || null
  })
  const [showExport, setShowExport] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [feature])

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!mobileDrawerOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileDrawerOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileDrawerOpen])

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

  if (!handle.db) return <Gate handle={handle} pwa={pwa} />

  const db = handle.db

  const pageTitle = feature ? FEATURE_TITLES[feature] || feature : 'Dashboard'

  // Is a secondary feature active (one of those opened via 'More' on mobile)?
  const isSecondaryActive = ['gym', 'non-negotiables', 'expenses', 'learnings'].includes(feature || '')

  return (
    <div className="app">
      {/* Sidebar (Desktop only) */}
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
          {/* Save Status & Auto-Save Toggle */}
          <div className={`save-status ${handle.isSaving ? 'is-saving' : handle.saveStatus === 'permission-needed' ? 'is-warn' : handle.dirty ? 'is-dirty' : ''}`}>
            <div className="save-status-indicator">
              <span className="save-status-dot" />
              <span>
                {handle.isSaving
                  ? 'Saving to disk...'
                  : handle.saveStatus === 'permission-needed'
                  ? 'Permission needed'
                  : handle.hasFileHandle
                  ? handle.autoSave
                    ? 'Auto-saved to disk'
                    : handle.dirty
                    ? 'Unsaved changes'
                    : 'Saved'
                  : handle.dirty
                  ? 'Cached locally'
                  : 'Session cached'}
              </span>
            </div>
            <button
              type="button"
              className={`auto-save-pill ${handle.autoSave ? 'is-active' : 'is-inactive'}`}
              onClick={() => handle.setAutoSave(!handle.autoSave)}
              title={handle.autoSave ? 'Auto-save is ON (click to switch to manual)' : 'Auto-save is OFF (click to turn ON)'}
            >
              {handle.autoSave ? 'AUTO' : 'MANUAL'}
            </button>
          </div>

          {/* Link file to disk button if unlinked */}
          {!handle.hasFileHandle && (
            <button
              type="button"
              className="sidebar-action-btn link-btn"
              onClick={() => void handle.linkDiskFile()}
              title="Link a file on your disk so all changes auto-save directly to it"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>Link File to Disk</span>
            </button>
          )}

          {/* Install PWA button if installable */}
          {pwa.canInstall && (
            <button
              type="button"
              className="sidebar-action-btn install-btn"
              onClick={() => void pwa.installApp()}
              title="Install Growth Arc to your device"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Install App</span>
            </button>
          )}

          {/* Manual Save / Save to file */}
          <button className="sidebar-nav-item" onClick={() => void handle.save()} disabled={handle.isSaving}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {handle.hasFileHandle ? 'Save Now' : 'Save to file'}
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
        {/* Mobile Header (Mobile only <=768px) */}
        <header className="app-mobile-header">
          <div className="mobile-header-left">
            {feature !== null ? (
              <button
                type="button"
                className="mobile-back-btn"
                onClick={() => setFeature(null)}
                title="Back to Dashboard"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span className="mobile-back-text">Dashboard</span>
              </button>
            ) : (
              <div className="mobile-header-brand">
                Growth <span>Arc</span>
              </div>
            )}
            <h1 className="mobile-header-title">{pageTitle}</h1>
          </div>

          <div className="mobile-header-right">
            {/* Status indicator dot / button */}
            <button
              type="button"
              className={`mobile-save-dot-btn ${handle.isSaving ? 'is-saving' : handle.dirty ? 'is-dirty' : 'is-clean'}`}
              onClick={() => void handle.save()}
              title={handle.dirty ? 'Click to save now' : 'Saved'}
            >
              <span className="save-status-dot" />
              <span className="mobile-save-text">
                {handle.isSaving ? 'Saving' : handle.dirty ? 'Save' : 'Saved'}
              </span>
            </button>

            {/* Menu trigger button */}
            <button
              type="button"
              className="mobile-menu-trigger"
              onClick={() => setMobileDrawerOpen(true)}
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        {/* Desktop Topbar (>768px only) */}
        <div className="app-topbar">
          <div className="app-topbar-left">
            <h1 className="app-topbar-title">{pageTitle}</h1>
          </div>
          <div className="app-topbar-right">
            {handle.saveStatus === 'permission-needed' && (
              <button
                type="button"
                className="sm danger pulse-btn"
                onClick={() => void handle.grantDiskPermission()}
                title="Click to grant disk write permission"
              >
                ⚠ Grant Disk Permission
              </button>
            )}
            {!handle.hasFileHandle && handle.supportsFileSystemAccess && (
              <button
                type="button"
                className="ghost sm"
                onClick={() => void handle.linkDiskFile()}
                title="Select or create a file on your disk so changes auto-save"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                </svg>
                Link File to Auto-Save
              </button>
            )}
            {pwa.canInstall && (
              <button
                type="button"
                className="primary sm"
                onClick={() => void pwa.installApp()}
                title="Install Growth Arc as an app"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Install App
              </button>
            )}
            <button className="ghost sm" onClick={() => void handle.saveAs()} disabled={handle.isSaving}>
              Save as...
            </button>
          </div>
        </div>

        <div className="app-content">
          {feature === 'day-planner' ? (
            <DayPlanner
              data={db.features.dayPlanner}
              onChange={(next) =>
                handle.update((prev) => ({
                  ...prev,
                  features: { ...prev.features, dayPlanner: next },
                }))
              }
              tasksData={db.features.todoGraph}
              habitsData={db.features.nonNegotiables}
            />
          ) : feature === 'calorie-counter' ? (
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
          ) : feature === 'learnings' ? (
            <Learnings
              data={db.features.learnings}
              onChange={(next) =>
                handle.update((prev) => ({
                  ...prev,
                  features: { ...prev.features, learnings: next },
                }))
              }
            />
          ) : (
            <Menu db={db} name={db.profile.name} onOpen={setFeature} />
          )}
        </div>

        {/* Mobile Bottom Navigation Bar (Mobile only <=768px) */}
        <nav className="app-mobile-bottom-nav">
          <button
            type="button"
            className={`mobile-tab-btn ${feature === null ? 'is-active' : ''}`}
            onClick={() => setFeature(null)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Home</span>
          </button>

          <button
            type="button"
            className={`mobile-tab-btn ${feature === 'day-planner' ? 'is-active' : ''}`}
            onClick={() => setFeature('day-planner')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Planner</span>
          </button>

          <button
            type="button"
            className={`mobile-tab-btn ${feature === 'calorie-counter' ? 'is-active' : ''}`}
            onClick={() => setFeature('calorie-counter')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
            <span>Food</span>
          </button>

          <button
            type="button"
            className={`mobile-tab-btn ${feature === 'todo-graph' ? 'is-active' : ''}`}
            onClick={() => setFeature('todo-graph')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span>Tasks</span>
          </button>

          <button
            type="button"
            className={`mobile-tab-btn ${isSecondaryActive ? 'is-active' : ''}`}
            onClick={() => setMobileDrawerOpen(true)}
          >
            <div className="mobile-tab-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
                <circle cx="5" cy="12" r="1.5" />
              </svg>
              {isSecondaryActive && <span className="mobile-tab-dot" />}
            </div>
            <span>{isSecondaryActive ? FEATURE_TITLES[feature || ''] || 'More' : 'More'}</span>
          </button>
        </nav>
      </div>

      {/* Mobile Navigation Drawer / Slide-Up Sheet */}
      {mobileDrawerOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileDrawerOpen(false)}>
          <div
            className="mobile-drawer-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Growth Arc Menu"
          >
            <div className="mobile-drawer-handle-bar">
              <span className="mobile-drawer-pill" />
            </div>

            <div className="mobile-drawer-header">
              <div className="mobile-drawer-brand">
                Growth <span>Arc</span>
                {handle.fileName && <span className="mobile-drawer-file">· {handle.fileName}</span>}
              </div>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="mobile-drawer-scroll">
              {/* Feature Navigation List */}
              <div className="mobile-drawer-section-title">Sections</div>
              <div className="mobile-drawer-nav-grid">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={String(item.id)}
                    type="button"
                    className={`mobile-drawer-nav-item ${feature === item.id ? 'is-active' : ''}`}
                    onClick={() => {
                      setFeature(item.id)
                      setMobileDrawerOpen(false)
                    }}
                  >
                    <span className="mobile-drawer-nav-icon">{item.icon}</span>
                    <span className="mobile-drawer-nav-label">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Data & Storage Actions */}
              <div className="mobile-drawer-section-title" style={{ marginTop: 20 }}>
                Data & Storage
              </div>

              <div className="mobile-drawer-actions">
                {/* Save status card */}
                <div className={`save-status ${handle.isSaving ? 'is-saving' : handle.dirty ? 'is-dirty' : ''}`}>
                  <div className="save-status-indicator">
                    <span className="save-status-dot" />
                    <span>
                      {handle.isSaving
                        ? 'Saving to disk...'
                        : handle.hasFileHandle
                        ? handle.autoSave
                          ? 'Auto-saved to disk'
                          : handle.dirty
                          ? 'Unsaved changes'
                          : 'Saved to disk'
                        : handle.dirty
                        ? 'Cached locally'
                        : 'Session cached'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`auto-save-pill ${handle.autoSave ? 'is-active' : 'is-inactive'}`}
                    onClick={() => handle.setAutoSave(!handle.autoSave)}
                  >
                    {handle.autoSave ? 'AUTO' : 'MANUAL'}
                  </button>
                </div>

                {/* Save button */}
                <button
                  type="button"
                  className="mobile-drawer-btn"
                  onClick={() => {
                    void handle.save()
                    setMobileDrawerOpen(false)
                  }}
                  disabled={handle.isSaving}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <span>{handle.hasFileHandle ? 'Save Now' : 'Save to File'}</span>
                </button>

                {/* Link disk file */}
                {!handle.hasFileHandle && handle.supportsFileSystemAccess && (
                  <button
                    type="button"
                    className="mobile-drawer-btn link-btn"
                    onClick={() => {
                      void handle.linkDiskFile()
                      setMobileDrawerOpen(false)
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    <span>Link File on Disk (Auto-Save)</span>
                  </button>
                )}

                {/* Install App */}
                {pwa.canInstall && (
                  <button
                    type="button"
                    className="mobile-drawer-btn install-btn"
                    onClick={() => {
                      void pwa.installApp()
                      setMobileDrawerOpen(false)
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Install App to Home Screen</span>
                  </button>
                )}

                {/* Export report */}
                <button
                  type="button"
                  className="mobile-drawer-btn"
                  onClick={() => {
                    setMobileDrawerOpen(false)
                    setShowExport(true)
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Export Report & JSON</span>
                </button>

                {/* Close file */}
                <button
                  type="button"
                  className="mobile-drawer-btn danger"
                  onClick={() => {
                    if (handle.dirty && !window.confirm('Unsaved changes. Close anyway?')) return
                    sessionStorage.removeItem('growth-arc:active-feature')
                    setFeature(null)
                    setMobileDrawerOpen(false)
                    handle.close()
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Close File & Switch</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showExport && <ExportModal db={db} onClose={() => setShowExport(false)} />}
    </div>
  )
}
