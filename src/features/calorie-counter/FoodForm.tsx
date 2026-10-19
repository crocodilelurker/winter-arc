import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MEALS,
  caloriesFromMacros,
  suggestFoods,
  type CalorieCounterData,
  type LibraryItem,
  type Macros,
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
  perUnit?: Macros
}

type Props = {
  data: CalorieCounterData
  onAdd: (food: SubmittedFood) => void
  prefillItem?: LibraryItem | null
}

const blank = { name: '', quantity: '1', protein: '', carbs: '', fat: '', calories: '' }

export default function FoodForm({ data, onAdd, prefillItem }: Props) {
  const [meal, setMeal] = useState<MealId>('breakfast')
  const [form, setForm] = useState(blank)
  const [basePerUnit, setBasePerUnit] = useState<Macros>({ protein: 0, carbs: 0, fat: 0, calories: 0 })
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const nameInput = useRef<HTMLInputElement>(null)

  // Listen to prefillItem from parent
  useEffect(() => {
    if (prefillItem) {
      pick(prefillItem)
      nameInput.current?.focus()
    }
  }, [prefillItem])

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

  function pick(item: LibraryItem) {
    const perUnit: Macros = {
      protein: item.protein ?? 0,
      carbs: item.carbs ?? 0,
      fat: item.fat ?? 0,
      calories: item.calories ?? caloriesFromMacros(item),
    }
    setBasePerUnit(perUnit)
    setForm({
      name: item.name,
      quantity: '1',
      protein: perUnit.protein ? String(perUnit.protein) : '',
      carbs: perUnit.carbs ? String(perUnit.carbs) : '',
      fat: perUnit.fat ? String(perUnit.fat) : '',
      calories: perUnit.calories ? String(perUnit.calories) : '',
    })
    setOpen(false)
    setActive(-1)
  }

  function handleQuantityChange(valStr: string) {
    // Strictly integer only: strip any non-digit
    const sanitized = valStr.replace(/[^0-9]/g, '')
    const normalized = sanitized.replace(/^0+(?=[1-9])/, '')

    setForm((prev) => {
      if (!normalized) {
        return { ...prev, quantity: '' }
      }
      const q = parseInt(normalized, 10)
      if (isNaN(q) || q <= 0) {
        return { ...prev, quantity: normalized }
      }

      // Dynamically scale macros based on per-unit values: macros per unit * quantity
      const nextPro = basePerUnit.protein > 0 ? String(Math.round(basePerUnit.protein * q * 10) / 10) : prev.protein
      const nextCarb = basePerUnit.carbs > 0 ? String(Math.round(basePerUnit.carbs * q * 10) / 10) : prev.carbs
      const nextFat = basePerUnit.fat > 0 ? String(Math.round(basePerUnit.fat * q * 10) / 10) : prev.fat
      const nextCal = basePerUnit.calories > 0 ? String(Math.round(basePerUnit.calories * q)) : prev.calories

      return {
        ...prev,
        quantity: normalized,
        protein: nextPro,
        carbs: nextCarb,
        fat: nextFat,
        calories: nextCal,
      }
    })
  }

  function handleQuantityBlur() {
    if (!form.quantity || parseInt(form.quantity, 10) < 1) {
      handleQuantityChange('1')
    }
  }

  function handleMacroChange(key: 'protein' | 'carbs' | 'fat' | 'calories', val: string) {
    setForm((prev) => ({ ...prev, [key]: val }))
    const qty = Math.max(1, parseInt(form.quantity, 10) || 1)
    const numVal = toNum(val)
    if (key === 'calories') {
      setBasePerUnit((prev) => ({
        ...prev,
        calories: Math.round(numVal / qty),
      }))
    } else {
      setBasePerUnit((prev) => {
        const next = {
          ...prev,
          [key]: Math.round((numVal / qty) * 10) / 10,
        }
        if (!form.calories) {
          next.calories = caloriesFromMacros(next)
        }
        return next
      })
    }
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
    const qtyNum = Math.max(1, parseInt(form.quantity, 10) || 1)
    const typed = toNum(form.calories)
    const totalCalories = typed || autoCalories

    const perUnit: Macros = {
      protein: basePerUnit.protein > 0 ? basePerUnit.protein : Math.round((macros.protein / qtyNum) * 10) / 10,
      carbs: basePerUnit.carbs > 0 ? basePerUnit.carbs : Math.round((macros.carbs / qtyNum) * 10) / 10,
      fat: basePerUnit.fat > 0 ? basePerUnit.fat : Math.round((macros.fat / qtyNum) * 10) / 10,
      calories: basePerUnit.calories > 0 ? basePerUnit.calories : Math.round(totalCalories / qtyNum),
    }

    onAdd({
      name,
      quantity: String(qtyNum),
      meal,
      ...macros,
      calories: totalCalories,
      perUnit,
    })

    setForm(blank)
    setBasePerUnit({ protein: 0, carbs: 0, fat: 0, calories: 0 })
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
            onChange={(e) => {
              const val = e.target.value
              setForm((f) => ({ ...f, name: val }))
              setOpen(true)
              setActive(-1)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 140)}
            onKeyDown={onNameKeyDown}
            placeholder="e.g. Rice, Chicken breast, Roti"
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
                      {item.calories} kcal · P{item.protein} C{item.carbs} F{item.fat} (per unit)
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="ff-field">
          <label className="ff-label">Quantity (Units / Servings)</label>
          <input
            type="number"
            min="1"
            step="1"
            value={form.quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            onBlur={handleQuantityBlur}
            onKeyDown={(e) => {
              if (['.', ',', '-', '+', 'e', 'E'].includes(e.key)) {
                e.preventDefault()
              }
            }}
            placeholder="1"
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
              onChange={(e) => handleMacroChange(key, e.target.value)}
              placeholder={key === 'calories' && autoCalories ? String(autoCalories) : '0'}
            />
          </div>
        ))}
        <button type="submit" className="primary" style={{ alignSelf: 'flex-end', height: '34px' }}>
          Add
        </button>
      </div>

      {!form.calories && autoCalories > 0 && (
        <p className="ff-hint">Calories calculated as {autoCalories} kcal ({Math.max(1, parseInt(form.quantity, 10) || 1)} unit{parseInt(form.quantity, 10) > 1 ? 's' : ''}).</p>
      )}
      {basePerUnit.calories > 0 && (
        <p className="ff-hint" style={{ color: 'var(--blue)' }}>
          Per unit: {basePerUnit.calories} kcal · P{basePerUnit.protein}g · C{basePerUnit.carbs}g · F{basePerUnit.fat}g (scales with quantity)
        </p>
      )}
    </form>
  )
}
