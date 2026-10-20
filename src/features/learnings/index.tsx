import { useState, useMemo } from 'react'
import { todayKey } from '../../db/types'
import {
  type LearningData,
  type LearningType,
  type LearningEntry,
  getDayLearning,
  addLearningEntry,
  updateLearningEntry,
  deleteLearningEntry,
  setDayNote,
} from './data'
import Calendar from './Calendar'
import './learnings.css'

type Props = {
  data: LearningData
  onChange: (next: LearningData) => void
}

type TabMode = 'daily' | 'timeline'

export default function Learnings({ data, onChange }: Props) {
  const today = useMemo(() => todayKey(), [])
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [activeTab, setActiveTab] = useState<TabMode>('daily')
  const [showCalendar, setShowCalendar] = useState<boolean>(false)
  const [editingEntry, setEditingEntry] = useState<(LearningEntry & { date?: string }) | null>(null)

  // Entry Form state
  const [entryType, setEntryType] = useState<LearningType>('learning')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>(data.categories[0] || 'Tech & Coding')
  const [customCategory, setCustomCategory] = useState('')
  const [link, setLink] = useState('')
  const [showMoreFields, setShowMoreFields] = useState(false)

  // Timeline filters
  const [searchQuery, setSearchQuery] = useState('')
  const [timelineTypeFilter, setTimelineTypeFilter] = useState<'all' | LearningType>('all')
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState<string>('all')

  // Day Reflection editing
  const dayLog = getDayLearning(data, selectedDate)
  const [dayNoteInput, setDayNoteInput] = useState(dayLog.dayNote || '')
  const [isEditingNote, setIsEditingNote] = useState(false)

  // Sync dayNoteInput when selectedDate changes
  useMemo(() => {
    setDayNoteInput(dayLog.dayNote || '')
    setIsEditingNote(false)
  }, [selectedDate, dayLog.dayNote])

  const shiftDay = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const next = new Date(y, m - 1, d + days)
    const pad = (n: number) => String(n).padStart(2, '0')
    setSelectedDate(`${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`)
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const selectedCat = category === '__custom__' && customCategory.trim()
      ? customCategory.trim()
      : category

    const next = addLearningEntry(data, selectedDate, {
      type: entryType,
      title: title.trim(),
      description: description.trim() || undefined,
      category: selectedCat,
      link: link.trim() || undefined,
    })

    // If new custom category, append to list
    if (category === '__custom__' && customCategory.trim() && !data.categories.includes(customCategory.trim())) {
      next.categories = [...next.categories, customCategory.trim()]
    }

    onChange(next)
    setTitle('')
    setDescription('')
    setLink('')
    setCustomCategory('')
    if (category === '__custom__') setCategory(next.categories[0] || 'General')
    setShowMoreFields(false)
  }

  const handleDelete = (entryId: string) => {
    const next = deleteLearningEntry(data, selectedDate, entryId)
    onChange(next)
  }

  const handleSaveDayNote = () => {
    const next = setDayNote(data, selectedDate, dayNoteInput)
    onChange(next)
    setIsEditingNote(false)
  }

  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // All entries flattened for timeline view
  const allEntries = useMemo(() => {
    const list: Array<LearningEntry & { date: string }> = []
    const dates = Object.keys(data.days).sort().reverse()
    for (const dk of dates) {
      const dLog = data.days[dk]
      for (const e of dLog.entries) {
        list.push({ ...e, date: dk })
      }
    }
    return list
  }, [data])

  const filteredTimeline = useMemo(() => {
    return allEntries.filter((item) => {
      if (timelineTypeFilter !== 'all' && item.type !== timelineTypeFilter) return false
      if (timelineCategoryFilter !== 'all' && item.category !== timelineCategoryFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = item.title.toLowerCase().includes(q)
        const matchesDesc = item.description?.toLowerCase().includes(q)
        const matchesCat = item.category.toLowerCase().includes(q)
        if (!matchesTitle && !matchesDesc && !matchesCat) return false
      }
      return true
    })
  }, [allEntries, timelineTypeFilter, timelineCategoryFilter, searchQuery])

  return (
    <div className="lrn-app">
      {/* Tabs Switcher */}
      <div className="lrn-tabs-nav">
        <button
          type="button"
          className={`lrn-tab-btn ${activeTab === 'daily' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Daily Log ({dayLog.entries.length})
        </button>
        <button
          type="button"
          className={`lrn-tab-btn ${activeTab === 'timeline' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          All-Time Growth Timeline ({allEntries.length})
        </button>
      </div>

      {activeTab === 'timeline' ? (
        /* All-Time Timeline View */
        <div className="lrn-timeline-view">
          <div className="card lrn-timeline-filter-card">
            <div className="timeline-search-row">
              <input
                type="text"
                placeholder="Search learnings, projects, topics, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="timeline-search-input"
              />
              <div className="timeline-filter-pills">
                <button
                  type="button"
                  className={`filter-pill ${timelineTypeFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setTimelineTypeFilter('all')}
                >
                  All Types
                </button>
                <button
                  type="button"
                  className={`filter-pill learn ${timelineTypeFilter === 'learning' ? 'is-active' : ''}`}
                  onClick={() => setTimelineTypeFilter('learning')}
                >
                  💡 Learnings
                </button>
                <button
                  type="button"
                  className={`filter-pill create ${timelineTypeFilter === 'creation' ? 'is-active' : ''}`}
                  onClick={() => setTimelineTypeFilter('creation')}
                >
                  ⚡ Creations
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="timeline-category-filters">
              <span className="cat-filter-label">Category:</span>
              <button
                type="button"
                className={`cat-pill ${timelineCategoryFilter === 'all' ? 'is-active' : ''}`}
                onClick={() => setTimelineCategoryFilter('all')}
              >
                All
              </button>
              {data.categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`cat-pill ${timelineCategoryFilter === c ? 'is-active' : ''}`}
                  onClick={() => setTimelineCategoryFilter(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {filteredTimeline.length === 0 ? (
            <div className="card empty-state">
              <p>No growth entries match your filters.</p>
            </div>
          ) : (
            <div className="timeline-feed">
              {filteredTimeline.map((item) => (
                <div key={item.id} className={`timeline-entry-card ${item.type}`}>
                  <div className="entry-card-top">
                    <div className="entry-tags">
                      <span className={`entry-type-badge ${item.type}`}>
                        {item.type === 'learning' ? '💡 Learned' : '⚡ Created'}
                      </span>
                      <span className="entry-cat-badge">{item.category}</span>
                      <span className="entry-date-badge">{item.date}</span>
                    </div>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="entry-link-btn"
                        title="Open external link"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Link
                      </a>
                    )}
                    <button
                      type="button"
                      className="ghost sm icon-btn lrn-edit-btn"
                      onClick={() => setEditingEntry(item)}
                      title="Edit entry"
                      aria-label={`Edit ${item.title}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                  </div>
                  <h4 className="entry-title">{item.title}</h4>
                  {item.description && (
                    <p className="entry-desc">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Daily View */
        <div className="lrn-daily-workspace">
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

          <div className="lrn-grid-layout">
            {/* Left Column: Form & Logged Entries */}
            <div className="lrn-main-col">
              {/* Entry Form Card */}
              <div className="card lrn-entry-card">
                <div className="card-header">
                  <div className="card-title">
                    {selectedDate === today ? 'Record Growth for Today' : `Record Growth for ${displayDate}`}
                  </div>
                  <div className="card-subtitle">
                    {selectedDate === today
                      ? 'What did you learn today, or what new thing did you build and create?'
                      : 'What did you learn, or what new thing did you build and create on this day?'}
                  </div>
                </div>

                <form onSubmit={handleAddSubmit} className="lrn-entry-form">
                  {/* Type Selector Toggle */}
                  <div className="lrn-type-toggle">
                    <button
                      type="button"
                      className={`type-toggle-btn learn ${entryType === 'learning' ? 'is-selected' : ''}`}
                      onClick={() => setEntryType('learning')}
                    >
                      <span className="type-icon">💡</span>
                      <div className="type-text">
                        <strong>What Did I Learn?</strong>
                        <span className="type-sub">New concept, insight, reading takeaway, or skill</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`type-toggle-btn create ${entryType === 'creation' ? 'is-selected' : ''}`}
                      onClick={() => setEntryType('creation')}
                    >
                      <span className="type-icon">⚡</span>
                      <div className="type-text">
                        <strong>What Did I Create / Build?</strong>
                        <span className="type-sub">Project, code feature, design, writing, or build</span>
                      </div>
                    </button>
                  </div>

                  {/* Title Input */}
                  <div className="field-group">
                    <label className="field-label">
                      {entryType === 'learning' ? 'What did you learn?' : 'What did you create / build?'}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        entryType === 'learning'
                          ? 'e.g. Mastered React 19 async actions, Learned the 80/20 principle of sleep...'
                          : 'e.g. Built and shipped the daily budget tracker, Designed a new landing page...'
                      }
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {/* Category Selection Row */}
                  <div className="lrn-form-row">
                    <div className="field-group" style={{ flex: 1 }}>
                      <label className="field-label">Category / Area</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {data.categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="__custom__">+ Custom Category...</option>
                      </select>
                    </div>

                    {category === '__custom__' && (
                      <div className="field-group" style={{ flex: 1 }}>
                        <label className="field-label">New Category Name</label>
                        <input
                          type="text"
                          placeholder="e.g. AI Research, Spanish..."
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  {/* More Details Toggle */}
                  {!showMoreFields ? (
                    <button
                      type="button"
                      className="ghost sm lrn-expand-btn"
                      onClick={() => setShowMoreFields(true)}
                    >
                      + Add notes, takeaways, or reference link (optional)
                    </button>
                  ) : (
                    <div className="lrn-extra-fields">
                      <div className="field-group">
                        <label className="field-label">Notes & Key Takeaways (Optional)</label>
                        <textarea
                          rows={3}
                          placeholder="Key insights, how it works, why it matters, or notes for future self..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </div>

                      <div className="field-group">
                        <label className="field-label">Reference Link / Project URL (Optional)</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={link}
                          onChange={(e) => setLink(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="lrn-form-footer">
                    <button
                      type="submit"
                      className="primary"
                      disabled={!title.trim()}
                    >
                      {entryType === 'learning' ? '💡 Log Learning' : '⚡ Log Creation'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Day Note / Daily Growth Reflection */}
              <div className="card lrn-reflection-card">
                <div className="lrn-reflection-header">
                  <div className="reflection-title-wrap">
                    <span className="reflection-icon">🌱</span>
                    <strong>Daily Growth Reflection</strong>
                    <span className="reflection-sub">Evening review for {selectedDate === today ? 'today' : displayDate}</span>
                  </div>
                  {!isEditingNote && (
                    <button
                      type="button"
                      className="ghost sm"
                      onClick={() => setIsEditingNote(true)}
                    >
                      {dayLog.dayNote ? 'Edit' : '+ Add Reflection'}
                    </button>
                  )}
                </div>

                {isEditingNote ? (
                  <div className="reflection-edit-box">
                    <textarea
                      rows={2}
                      placeholder="How did you improve today? Any mindset shift or key reflection?"
                      value={dayNoteInput}
                      onChange={(e) => setDayNoteInput(e.target.value)}
                      autoFocus
                    />
                    <div className="reflection-actions">
                      <button type="button" className="primary sm" onClick={handleSaveDayNote}>
                        Save Reflection
                      </button>
                      <button
                        type="button"
                        className="ghost sm"
                        onClick={() => {
                          setDayNoteInput(dayLog.dayNote || '')
                          setIsEditingNote(false)
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : dayLog.dayNote ? (
                  <p className="reflection-text">"{dayLog.dayNote}"</p>
                ) : (
                  <p className="reflection-empty">
                    No reflection written yet. Take a second to note how you progressed today.
                  </p>
                )}
              </div>

              {/* Day Logged Entries List */}
              <div className="card lrn-list-card">
                <div className="card-header lrn-list-header">
                  <div>
                    <div className="card-title">
                      Logged for {selectedDate === today ? 'Today' : displayDate} ({dayLog.entries.length})
                    </div>
                    <div className="card-subtitle">
                      {dayLog.entries.filter((e) => e.type === 'learning').length} learned ·{' '}
                      {dayLog.entries.filter((e) => e.type === 'creation').length} created
                    </div>
                  </div>
                </div>

                {dayLog.entries.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <p>No learnings or creations logged for this date</p>
                    <p>Use the form above to record what you learned or built today.</p>
                  </div>
                ) : (
                  <div className="lrn-items-list">
                    {dayLog.entries.map((item) => (
                      <div key={item.id} className={`lrn-item-card ${item.type}`}>
                        <div className="lrn-item-head">
                          <div className="lrn-item-badges">
                            <span className={`entry-type-badge ${item.type}`}>
                              {item.type === 'learning' ? '💡 Learned' : '⚡ Created'}
                            </span>
                            <span className="entry-cat-badge">{item.category}</span>
                          </div>

                          <div className="lrn-item-actions">
                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noreferrer"
                                className="entry-link-btn"
                                title="Open link"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                  <polyline points="15 3 21 3 21 9" />
                                  <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                                Link
                              </a>
                            )}
                            <button
                              type="button"
                              className="ghost sm icon-btn lrn-edit-btn"
                              onClick={() => setEditingEntry(item)}
                              title="Edit entry"
                              aria-label={`Edit ${item.title}`}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="ghost sm icon-btn is-danger lrn-del-btn"
                              onClick={() => handleDelete(item.id)}
                              title="Delete entry"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <h4 className="lrn-item-title">{item.title}</h4>

                        {item.description && (
                          <p className="lrn-item-desc">{item.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Mini Calendar */}
            <div className={`lrn-side-col ${showCalendar ? 'is-visible' : ''}`}>
              <Calendar
                selectedDate={selectedDate}
                today={today}
                data={data}
                onSelectDate={(dk) => setSelectedDate(dk)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Learning Modal */}
      {editingEntry && (
        <EditLearningModal
          entry={editingEntry}
          categories={data.categories}
          onSave={(patch) => {
            const entryDate = editingEntry.date || selectedDate
            onChange(updateLearningEntry(data, entryDate, editingEntry.id, patch))
            setEditingEntry(null)
          }}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </div>
  )
}

function EditLearningModal({
  entry,
  categories,
  onSave,
  onClose,
}: {
  entry: LearningEntry & { date?: string }
  categories: string[]
  onSave: (patch: Partial<LearningEntry>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(entry.title)
  const [type, setType] = useState<LearningType>(entry.type)
  const [category, setCategory] = useState(entry.category)
  const [description, setDescription] = useState(entry.description || '')
  const [link, setLink] = useState(entry.link || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      type,
      category: category.trim() || categories[0] || 'General',
      description: description.trim() || undefined,
      link: link.trim() || undefined,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3>Edit {type === 'learning' ? 'Learning' : 'Creation'}</h3>
          <button type="button" className="ghost sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="field-group">
            <label className="field-label">Type</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`ghost sm ${type === 'learning' ? 'primary' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setType('learning')}
              >
                💡 Learning
              </button>
              <button
                type="button"
                className={`ghost sm ${type === 'creation' ? 'primary' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setType('creation')}
              >
                ⚡ Creation
              </button>
            </div>
          </div>
          <div className="field-group">
            <label className="field-label">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="field-group">
            <label className="field-label">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Notes & Details (Optional)</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key insights, notes, or details..."
            />
          </div>
          <div className="field-group">
            <label className="field-label">Reference Link (Optional)</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="modal-footer" style={{ padding: '12px 0 0 0', marginTop: '8px' }}>
            <button type="button" className="ghost sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary sm">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  )
}
