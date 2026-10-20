import { useMemo, useState } from 'react'
import Calendar from './Calendar'
import FoodForm from './FoodForm'
import './calorie-counter.css'
import {
  MEALS,
  addEntry,
  updateEntry,
  clearLibrary,
  dateKey,
  dayTotals,
  forgetFood,
  getDay,
  loggedDays,
  mealTotals,
  prettyDate,
  removeEntry,
  setGoals,
  setWater,
  type CalorieCounterData,
  type Goals,
  type LibraryItem,
  type FoodEntry,
  type MealId,
  type NewEntry,
} from './data'

type Props = {
  data: CalorieCounterData
  onChange: (next: CalorieCounterData) => void
}

const round = (n: number) => Math.round(n * 10) / 10

export default function CalorieCounter({ data, onChange }: Props) {
  const today = dateKey()
  const [selected, setSelected] = useState(today)
  const [showGoals, setShowGoals] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [prefillItem, setPrefillItem] = useState<LibraryItem | null>(null)
  const [editingFoodEntry, setEditingFoodEntry] = useState<FoodEntry | null>(null)

  const day = getDay(data, selected)
  const totals = dayTotals(day)
  const marked = useMemo(() => loggedDays(data), [data])

  const macros = [
    { key: 'calories', label: 'Calories', unit: 'kcal', val: totals.calories, goal: data.goals.calories, cls: 'cal' },
    { key: 'protein',  label: 'Protein',  unit: 'g',    val: totals.protein,  goal: data.goals.protein,  cls: 'pro' },
    { key: 'carbs',    label: 'Carbs',    unit: 'g',    val: totals.carbs,    goal: data.goals.carbs,    cls: 'carb' },
    { key: 'fat',      label: 'Fat',      unit: 'g',    val: totals.fat,      goal: data.goals.fat,      cls: 'fat' },
  ]

  return (
    <div className="cc">
      {/* Top layout: summary + calendar */}
      <div className="cc-layout">
        {/* Summary card */}
        <div className="cc-summary-card">
          <div className="cc-summary-head">
            <div className="cc-summary-date">
              <h2>{prettyDate(selected)}</h2>
              {selected === today && <span className="today-pill">Today</span>}
            </div>
          </div>
          <div className="cc-summary-body">
            <div className="macro-list">
              {macros.map((m) => {
                const pct = m.goal > 0 ? Math.min(100, (m.val / m.goal) * 100) : 0
                const over = m.goal > 0 && m.val > m.goal
                return (
                  <div key={m.key} className="macro-row">
                    <div className="macro-row-top">
                      <span className="macro-name">{m.label}</span>
                      <span className="macro-values">
                        <span className="macro-val">{round(m.val)}</span>
                        <span className="macro-goal"> / {m.goal} {m.unit}</span>
                      </span>
                    </div>
                    <div className="macro-track">
                      <div
                        className={`macro-fill ${over ? 'over' : m.cls}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Water */}
            <div className="water-section">
              <div className="water-head">
                <span className="water-label">Water</span>
                <span className="water-count">{day.water} / {data.goals.water} glasses</span>
              </div>
              <div className="water-glasses">
                {Array.from(
                  { length: Math.min(30, Math.max(1, Math.max(Number(data.goals?.water) || 8, Number(day.water) || 0))) },
                  (_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`glass-btn ${i < day.water ? 'is-full' : ''}`}
                      title={`${i + 1} glass${i > 0 ? 'es' : ''}`}
                      onClick={() => onChange(setWater(data, selected, i < day.water ? i : i + 1))}
                    />
                  ),
                )}
              </div>
              <div className="water-btns">
                <button
                  type="button"
                  className="sm"
                  onClick={() => onChange(setWater(data, selected, day.water - 1))}
                  disabled={day.water === 0}
                >
                  −1
                </button>
                <button
                  type="button"
                  className="sm"
                  onClick={() => onChange(setWater(data, selected, day.water + 1))}
                >
                  +1 glass
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="cc-cal-panel">
          <Calendar selected={selected} today={today} marked={marked} onSelect={setSelected} />
        </div>
      </div>

      {/* Food form */}
      <div className="cc-food-form">
        <div className="cc-food-form-head">
          <h3>Log Food</h3>
        </div>
        <div className="cc-food-form-body">
          <FoodForm
            data={data}
            prefillItem={prefillItem}
            onAdd={(food) => {
              onChange(addEntry(data, selected, food, food.perUnit))
              setPrefillItem(null)
            }}
          />
        </div>
      </div>


      {/* Meals */}
      <div className="meals-grid">
        {MEALS.map((m) => {
          const entries = day.entries.filter((e) => e.meal === m.id)
          const mt = mealTotals(day, m.id)
          return (
            <div key={m.id} className="meal-card">
              <div className="meal-card-head">
                <span className="meal-card-name">{m.label}</span>
                <div>
                  <span className="meal-card-cals">{mt.calories} kcal</span>
                  {entries.length > 0 && (
                    <span className="meal-card-macros"> · P{round(mt.protein)} C{round(mt.carbs)} F{round(mt.fat)}</span>
                  )}
                </div>
              </div>
              <div className="meal-entries">
                {entries.length === 0 ? (
                  <div className="meal-empty">Nothing logged yet.</div>
                ) : (
                  entries.map((e) => (
                    <div key={e.id} className="meal-entry">
                      <div>
                        <div className="entry-name">
                          {e.name}
                          {e.quantity && <span className="entry-qty"> · {e.quantity}</span>}
                        </div>
                        <div className="entry-kcal">
                          {e.calories} kcal · P{round(e.protein)} C{round(e.carbs)} F{round(e.fat)}
                        </div>
                      </div>
                      <div className="entry-actions">
                        <button
                          type="button"
                          className="entry-edit-btn"
                          title={`Edit ${e.name}`}
                          aria-label={`Edit ${e.name}`}
                          onClick={() => setEditingFoodEntry(e)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="entry-del"
                          aria-label={`Remove ${e.name}`}
                          onClick={() => onChange(removeEntry(data, selected, e.id))}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Panels: Goals & Library */}
      <div className="cc-panels">
        {/* Goals */}
        <div className="cc-panel">
          <button type="button" className="cc-panel-toggle" onClick={() => setShowGoals((v) => !v)}>
            Daily Goals
            <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>{showGoals ? '−' : '+'}</span>
          </button>
          {showGoals && (
            <GoalsEditor goals={data.goals} onSave={(g) => onChange(setGoals(data, g))} />
          )}
        </div>

        {/* Library */}
        <div className="cc-panel">
          <button type="button" className="cc-panel-toggle" onClick={() => setShowLibrary((v) => !v)}>
            Saved Foods
            <span className="cc-panel-count">{data.library.length}</span>
          </button>
          {showLibrary && (
            <div className="cc-panel-body">
              {data.library.length === 0 ? (
                <div className="meal-empty" style={{ padding: '16px' }}>
                  Foods you log will be saved here per unit. Tap or type a name to reuse them quickly.
                </div>
              ) : (
                <>
                  <div className="lib-header-bar">
                    <span className="lib-hint-text">Tap food to log again &amp; scale quantity</span>
                    <button
                      type="button"
                      className="lib-clear-btn"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to completely clear all saved foods?')) {
                          onChange(clearLibrary(data))
                        }
                      }}
                      title="Completely clear all saved foods"
                    >
                      Clear All Foods
                    </button>
                  </div>
                  <div className="library-list">
                    {[...data.library]
                      .sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name))
                      .map((item) => (
                        <div
                          key={item.key}
                          className="library-item"
                          onClick={() => setPrefillItem(item)}
                          title="Click to prefill and log again"
                        >
                          <div>
                            <div className="lib-name">{item.name}</div>
                            <div className="lib-meta">
                              {item.calories} kcal · P{round(item.protein)} C{round(item.carbs)} F{round(item.fat)} (per unit) · {item.uses}× used
                            </div>
                          </div>
                          <button
                            type="button"
                            className="lib-del"
                            aria-label={`Delete ${item.name}`}
                            title={`Delete ${item.name}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onChange(forgetFood(data, item.key))
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Food Modal */}
      {editingFoodEntry && (
        <EditFoodModal
          entry={editingFoodEntry}
          onSave={(patch) => {
            onChange(updateEntry(data, selected, editingFoodEntry.id, patch))
            setEditingFoodEntry(null)
          }}
          onClose={() => setEditingFoodEntry(null)}
        />
      )}
    </div>
  )
}

function GoalsEditor({ goals, onSave }: { goals: Goals; onSave: (g: Goals) => void }) {
  const [draft, setDraft] = useState({
    calories: String(goals.calories),
    protein: String(goals.protein),
    carbs: String(goals.carbs),
    fat: String(goals.fat),
    water: String(goals.water),
  })
  const num = (v: string) => Math.max(0, Number(v) || 0)

  const fields: [keyof typeof draft, string][] = [
    ['calories', 'Calories (kcal)'],
    ['protein',  'Protein (g)'],
    ['carbs',    'Carbs (g)'],
    ['fat',      'Fat (g)'],
    ['water',    'Water (glasses)'],
  ]

  return (
    <form
      className="goals-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ calories: num(draft.calories), protein: num(draft.protein), carbs: num(draft.carbs), fat: num(draft.fat), water: num(draft.water) })
      }}
    >
      {fields.map(([key, label]) => (
        <div key={key} className="goal-row">
          <span className="goal-row-label">{label}</span>
          <input
            type="number"
            min="0"
            step="any"
            value={draft[key]}
            onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
          />
        </div>
      ))}
      <button type="submit" className="primary sm" style={{ alignSelf: 'flex-end' }}>
        Save Goals
      </button>
    </form>
  )
}

function EditFoodModal({
  entry,
  onSave,
  onClose,
}: {
  entry: FoodEntry
  onSave: (patch: Partial<NewEntry>) => void
  onClose: () => void
}) {
  const [name, setName] = useState(entry.name)
  const [meal, setMeal] = useState<MealId>(entry.meal)
  const [quantity, setQuantity] = useState(entry.quantity || '1')
  const [calories, setCalories] = useState(String(entry.calories || ''))
  const [protein, setProtein] = useState(String(entry.protein || ''))
  const [carbs, setCarbs] = useState(String(entry.carbs || ''))
  const [fat, setFat] = useState(String(entry.fat || ''))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const num = (v: string) => Math.max(0, parseFloat(v) || 0)
    const calVal = num(calories)
    const pVal = num(protein)
    const cVal = num(carbs)
    const fVal = num(fat)
    const finalCal = calVal > 0 ? calVal : Math.round(pVal * 4 + cVal * 4 + fVal * 9)

    onSave({
      name: name.trim(),
      meal,
      quantity: quantity.trim() || '1',
      calories: finalCal,
      protein: pVal,
      carbs: cVal,
      fat: fVal,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3>Edit Food Entry</h3>
          <button type="button" className="ghost sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="ff-field">
            <label className="ff-label">Meal</label>
            <div className="meal-tabs" style={{ marginTop: '4px' }}>
              {MEALS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`meal-tab ${m.id === meal ? 'is-on' : ''}`}
                  onClick={() => setMeal(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="ff-field">
            <label className="ff-label">Food name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rice, Chicken, Salad"
              required
              autoFocus
            />
          </div>
          <div className="ff-field">
            <label className="ff-label">Quantity / Portions</label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 2 pieces, 150g, 1 bowl"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="ff-field">
              <label className="ff-label">Calories (kcal)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="ff-field">
              <label className="ff-label">Protein (g)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="ff-field">
              <label className="ff-label">Carbs (g)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="ff-field">
              <label className="ff-label">Fat (g)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="0"
              />
            </div>
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
