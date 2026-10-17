import { useMemo, useRef, useState } from 'react'
import {
  MEALS,
  caloriesFromMacros,
  suggestFoods,
  type CalorieCounterData,
  type LibraryItem,
  type MealId,
} from './data'

const toNum = (v: string) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export type SubmittedFood = {
  name: string
  quantity: string
  meal: MealId
  calories: number
  protein: number
  carbs: number
  fat: number
}

type Props = {
  data: CalorieCounterData
  onAdd: (food: SubmittedFood) => void
}

const blank = { name: '', quantity: '', protein: '', carbs: '', fat: '', calories: '' }

export default function FoodForm({ data, onAdd }: Props) {
  const [meal, setMeal] = useState<MealId>('breakfast')
  const [form, setForm] = useState(blank)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const nameInput = useRef<HTMLInputElement>(null)

  const suggestions = useMemo(
    () => (open ? suggestFoods(data, form.name) : []),
    [open, data, form.name],
  )

  const macros = {
    protein: toNum(form.protein),
    carbs: toNum(form.carbs),
    fat: toNum(form.fat),
  }
  const autoCalories = caloriesFromMacros(macros)

  const set = (patch: Partial<typeof blank>) => setForm((f) => ({ ...f, ...patch }))

  function pick(item: LibraryItem) {
    setForm({
      name: item.name,
      quantity: item.quantity,
      protein: item.protein ? String(item.protein) : '',
      carbs: item.carbs ? String(item.carbs) : '',
      fat: item.fat ? String(item.fat) : '',
      calories: item.calories ? String(item.calories) : '',
    })
    setOpen(false)
    setActive(-1)
  }

  function onNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      pick(suggestions[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) { nameInput.current?.focus(); return }
    const typed = toNum(form.calories)
    onAdd({ name, quantity: form.quantity.trim(), meal, ...macros, calories: typed || autoCalories })
    setForm(blank)
    setOpen(false)
    setActive(-1)
    nameInput.current?.focus()
  }

  return (
    <form onSubmit={submit}>
      {/* Meal tabs */}
      <div className="meal-tabs" style={{ marginBottom: '12px' }}>
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

      {/* Name + Quantity */}
      <div className="ff-row" style={{ marginBottom: '10px' }}>
        <div className="ff-field ff-suggest-wrap">
          <label className="ff-label">Food name</label>
          <input
            ref={nameInput}
            value={form.name}
            onChange={(e) => { set({ name: e.target.value }); setOpen(true); setActive(-1) }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onKeyDown={onNameKeyDown}
            placeholder="e.g. Chicken breast, Roti"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <ul className="ff-suggest">
              {suggestions.map((item, i) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className={`ff-suggest-item ${i === active ? 'is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(item)}
                  >
                    <span className="ff-sug-name">{item.name}</span>
                    <span className="ff-sug-meta">
                      {item.quantity && `${item.quantity} · `}{item.calories} kcal · P{item.protein} C{item.carbs} F{item.fat}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="ff-field">
          <label className="ff-label">Quantity</label>
          <input
            value={form.quantity}
            onChange={(e) => set({ quantity: e.target.value })}
            placeholder="e.g. 2 pieces"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Macros + Add */}
      <div className="ff-row-macros">
        {([['protein', 'Protein (g)'], ['carbs', 'Carbs (g)'], ['fat', 'Fat (g)'], ['calories', 'Calories']] as const).map(([key, label]) => (
          <div key={key} className="ff-field">
            <label className="ff-label">{label}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={form[key]}
              onChange={(e) => set({ [key]: e.target.value })}
              placeholder={key === 'calories' && autoCalories ? String(autoCalories) : '0'}
            />
          </div>
        ))}
        <button type="submit" className="primary" style={{ alignSelf: 'flex-end', height: '34px' }}>
          Add
        </button>
      </div>

      {!form.calories && autoCalories > 0 && (
        <p className="ff-hint">Calories will be calculated as {autoCalories} kcal from macros.</p>
      )}
    </form>
  )
}
