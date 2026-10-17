import { useState } from 'react'
import {
  type ExpensesData,
  type ExpenseGroup,
  addGroup,
  updateGroup,
  deleteGroup,
  setCurrency,
  setMonthlyBudget,
  formatCurrency,
} from './data'

const PRESET_COLORS = [
  '#4f82f7', // Blue
  '#f5a524', // Amber
  '#3ecf8e', // Emerald
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f43f5e', // Rose
  '#84cc16', // Lime
  '#eab308', // Yellow
  '#64748b', // Slate
]

const POPULAR_CURRENCIES = ['₹', '$', '€', '£', '¥', 'C$', 'A$', 'Fr.']

type Props = {
  data: ExpensesData
  onChange: (next: ExpensesData) => void
}

export default function GroupsManager({ data, onChange }: Props) {
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0])
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingColor, setEditingColor] = useState('')
  const [budgetInput, setBudgetInput] = useState(data.monthlyBudget ? String(data.monthlyBudget) : '')
  const [currencyCustom, setCurrencyCustom] = useState(data.currency)

  // Compute spend stats per group
  const groupStats: Record<string, { total: number; count: number }> = {}
  data.groups.forEach((g) => {
    groupStats[g.id] = { total: 0, count: 0 }
  })

  Object.values(data.days).forEach((dayLog) => {
    dayLog.items.forEach((item) => {
      const gId = item.groupId || 'grp-other'
      if (!groupStats[gId]) {
        groupStats[gId] = { total: 0, count: 0 }
      }
      groupStats[gId].total += item.amount
      groupStats[gId].count += 1
    })
  })

  function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    const next = addGroup(data, {
      name: newGroupName.trim(),
      color: selectedColor,
    })
    onChange(next)
    setNewGroupName('')
    setSelectedColor(PRESET_COLORS[(data.groups.length + 1) % PRESET_COLORS.length])
  }

  function handleStartEdit(group: ExpenseGroup) {
    setEditingGroupId(group.id)
    setEditingName(group.name)
    setEditingColor(group.color)
  }

  function handleSaveEdit(groupId: string) {
    if (!editingName.trim()) return
    const next = updateGroup(data, groupId, {
      name: editingName.trim(),
      color: editingColor,
    })
    onChange(next)
    setEditingGroupId(null)
  }

  function handleDelete(groupId: string, name: string) {
    const count = groupStats[groupId]?.count || 0
    const msg = count > 0
      ? `Delete group "${name}"? ${count} existing expense item(s) will be reassigned to General & Other.`
      : `Delete group "${name}"?`
    if (window.confirm(msg)) {
      // Reassign any items in this group to fallback group
      const fallbackGroupId = data.groups.find((g) => g.id !== groupId)?.id || 'grp-other'
      let updatedData = { ...data }
      if (count > 0) {
        const nextDays = { ...updatedData.days }
        for (const [dk, dLog] of Object.entries(nextDays)) {
          const hasItem = dLog.items.some((it) => it.groupId === groupId)
          if (hasItem) {
            nextDays[dk] = {
              ...dLog,
              items: dLog.items.map((it) =>
                it.groupId === groupId ? { ...it, groupId: fallbackGroupId } : it,
              ),
            }
          }
        }
        updatedData.days = nextDays
      }
      updatedData = deleteGroup(updatedData, groupId)
      onChange(updatedData)
    }
  }

  function handleSaveBudget() {
    const val = parseFloat(budgetInput)
    if (!isNaN(val) && val > 0) {
      onChange(setMonthlyBudget(data, val))
    } else {
      onChange(setMonthlyBudget(data, undefined))
      setBudgetInput('')
    }
  }

  function handleSelectCurrency(c: string) {
    setCurrencyCustom(c)
    onChange(setCurrency(data, c))
  }

  return (
    <div className="expenses-groups-manager">
      {/* Create New Group Card */}
      <div className="card exp-create-group-card">
        <div className="card-header">
          <div className="card-title">Create Expense Group</div>
          <div className="card-subtitle">
            Organize your purchases into custom categories like Food, Travel, Utilities, or Hobbies.
          </div>
        </div>

        <form onSubmit={handleCreateGroup} className="exp-create-group-form">
          <div className="exp-group-input-row">
            <div className="field-group" style={{ flex: 1 }}>
              <label className="field-label">Group Name</label>
              <input
                type="text"
                placeholder="e.g. Food, Travel, Subscriptions, Fitness..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="field-group" style={{ width: 'auto' }}>
              <label className="field-label">Color Badge</label>
              <div className="exp-color-picker">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`exp-color-swatch ${selectedColor === c ? 'is-active' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setSelectedColor(c)}
                    title={c}
                  />
                ))}
              </div>
            </div>

            <div className="field-group exp-btn-col">
              <label className="field-label">&nbsp;</label>
              <button
                type="submit"
                className="primary"
                disabled={!newGroupName.trim()}
              >
                + Add Group
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Groups List */}
      <div className="card exp-groups-list-card">
        <div className="card-header">
          <div className="card-title">Existing Groups ({data.groups.length})</div>
          <div className="card-subtitle">
            Manage your categories. Items logged under each group will be tracked in monthly breakdowns.
          </div>
        </div>

        <div className="exp-groups-grid">
          {data.groups.map((group) => {
            const isEditing = editingGroupId === group.id
            const stats = groupStats[group.id] || { total: 0, count: 0 }

            if (isEditing) {
              return (
                <div key={group.id} className="exp-group-card is-editing">
                  <div className="exp-group-edit-row">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      placeholder="Group name"
                      autoFocus
                    />
                    <div className="exp-color-picker-mini">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`exp-color-swatch sm ${editingColor === c ? 'is-active' : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setEditingColor(c)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="exp-group-edit-actions">
                    <button
                      type="button"
                      className="primary sm"
                      onClick={() => handleSaveEdit(group.id)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="ghost sm"
                      onClick={() => setEditingGroupId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div key={group.id} className="exp-group-card">
                <div className="exp-group-card-top">
                  <div className="exp-group-badge-line">
                    <span
                      className="exp-group-dot"
                      style={{ backgroundColor: group.color, boxShadow: `0 0 8px ${group.color}40` }}
                    />
                    <span className="exp-group-name">{group.name}</span>
                  </div>
                  <div className="exp-group-actions">
                    <button
                      type="button"
                      className="ghost sm icon-btn"
                      onClick={() => handleStartEdit(group)}
                      title="Edit group"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                    {data.groups.length > 1 && (
                      <button
                        type="button"
                        className="ghost sm icon-btn is-danger"
                        onClick={() => handleDelete(group.id, group.name)}
                        title="Delete group"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="exp-group-card-stats">
                  <div className="exp-group-stat-row">
                    <span className="exp-stat-label">Total Logged:</span>
                    <span className="exp-stat-val">{formatCurrency(stats.total, data.currency)}</span>
                  </div>
                  <div className="exp-group-stat-row">
                    <span className="exp-stat-label">Transactions:</span>
                    <span className="exp-stat-val">{stats.count}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Settings / Currency & Monthly Budget Target */}
      <div className="card exp-settings-card">
        <div className="card-header">
          <div className="card-title">Preferences & Currency</div>
          <div className="card-subtitle">
            Configure your preferred currency symbol and optional monthly budget cap.
          </div>
        </div>

        <div className="exp-settings-grid">
          {/* Currency */}
          <div className="exp-setting-item">
            <label className="field-label">Preferred Currency Symbol</label>
            <div className="exp-currency-pills">
              {POPULAR_CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`exp-curr-btn ${data.currency === c ? 'is-active' : ''}`}
                  onClick={() => handleSelectCurrency(c)}
                >
                  {c}
                </button>
              ))}
              <div className="exp-curr-custom">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Custom"
                  value={currencyCustom}
                  onChange={(e) => setCurrencyCustom(e.target.value)}
                  onBlur={() => {
                    if (currencyCustom.trim() && currencyCustom !== data.currency) {
                      handleSelectCurrency(currencyCustom.trim())
                    }
                  }}
                  className="sm"
                  style={{ width: '70px', textAlign: 'center' }}
                />
              </div>
            </div>
          </div>

          {/* Monthly Budget Target */}
          <div className="exp-setting-item">
            <label className="field-label">Monthly Target Budget (Optional)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                min="0"
                step="50"
                placeholder="e.g. 1500"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
              />
              <button
                type="button"
                className="secondary"
                onClick={handleSaveBudget}
              >
                Set Target
              </button>
            </div>
            <span className="field-hint">
              Leave blank if you don't wish to enforce a spending ceiling.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
