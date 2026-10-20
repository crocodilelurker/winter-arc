export type ExpenseItem = {
  id: string
  title: string        // "what did i buy"
  amount: number       // "how much did i spend"
  isNecessary: boolean // "was it necessary?" (true = Necessary, false = Unnecessary / Discretionary)
  groupId: string      // category / group id (e.g. food, travel, etc.)
  createdAt: string    // ISO string
}

export type ExpenseGroup = {
  id: string
  name: string
  color: string
  isDefault?: boolean
}

export type DayExpensesLog = {
  date: string // YYYY-MM-DD
  items: ExpenseItem[]
}

export type ExpensesData = {
  currency: string
  monthlyBudget?: number
  groups: ExpenseGroup[]
  days: Record<string, DayExpensesLog>
}

export const DEFAULT_GROUPS: ExpenseGroup[] = [
  { id: 'grp-food', name: 'Food & Groceries', color: '#f5a524', isDefault: true },
  { id: 'grp-travel', name: 'Travel & Commute', color: '#4f82f7', isDefault: true },
  { id: 'grp-bills', name: 'Bills & Utilities', color: '#3ecf8e', isDefault: true },
  { id: 'grp-shopping', name: 'Shopping & Gear', color: '#a855f7', isDefault: true },
  { id: 'grp-health', name: 'Health & Fitness', color: '#06b6d4', isDefault: true },
  { id: 'grp-other', name: 'General & Other', color: '#9299a6', isDefault: true },
]

export function createExpensesData(): ExpensesData {
  return {
    currency: '₹',
    groups: DEFAULT_GROUPS,
    days: {},
  }
}

export function ensureExpensesData(raw: unknown): ExpensesData {
  if (!raw || typeof raw !== 'object') return createExpensesData()
  const obj = raw as Record<string, unknown>

  // Default to Rupees (₹) if unspecified, but respect any user-selected currency (including '$')
  const currency = typeof obj.currency === 'string' && obj.currency.trim() ? obj.currency.trim() : '₹'
  const monthlyBudget = typeof obj.monthlyBudget === 'number' && obj.monthlyBudget > 0 ? obj.monthlyBudget : undefined

  // Groups
  let groups: ExpenseGroup[] = DEFAULT_GROUPS
  if (Array.isArray(obj.groups) && obj.groups.length > 0) {
    groups = obj.groups.map((g: unknown, idx: number) => {
      const gObj = (g ?? {}) as Record<string, unknown>
      return {
        id: typeof gObj.id === 'string' ? gObj.id : `grp-${idx}`,
        name: typeof gObj.name === 'string' ? gObj.name : 'Category',
        color: typeof gObj.color === 'string' ? gObj.color : '#4f82f7',
        isDefault: Boolean(gObj.isDefault),
      }
    })
  }

  // Days
  const days: Record<string, DayExpensesLog> = {}
  if (obj.days && typeof obj.days === 'object') {
    for (const [dateStr, dayVal] of Object.entries(obj.days as Record<string, unknown>)) {
      if (!dayVal || typeof dayVal !== 'object') continue
      const dObj = dayVal as Record<string, unknown>
      const rawItems = Array.isArray(dObj.items) ? dObj.items : []
      const items: ExpenseItem[] = rawItems.map((item: unknown, iIdx: number) => {
        const iObj = (item ?? {}) as Record<string, unknown>
        return {
          id: typeof iObj.id === 'string' ? iObj.id : `exp-${iIdx}-${Date.now()}`,
          title: typeof iObj.title === 'string' ? iObj.title : 'Item',
          amount: typeof iObj.amount === 'number' && !isNaN(iObj.amount) ? iObj.amount : 0,
          isNecessary: typeof iObj.isNecessary === 'boolean' ? iObj.isNecessary : true,
          groupId: typeof iObj.groupId === 'string' ? iObj.groupId : 'grp-other',
          createdAt: typeof iObj.createdAt === 'string' ? iObj.createdAt : new Date().toISOString(),
        }
      })
      days[dateStr] = { date: dateStr, items }
    }
  }

  return {
    currency,
    monthlyBudget,
    groups,
    days,
  }
}

export function getDayExpenses(data: ExpensesData, dateKey: string): DayExpensesLog {
  return data.days[dateKey] || { date: dateKey, items: [] }
}

export function addExpenseItem(
  data: ExpensesData,
  dateKey: string,
  item: { title: string; amount: number; isNecessary: boolean; groupId: string },
): ExpensesData {
  const currentDay = getDayExpenses(data, dateKey)
  const newItem: ExpenseItem = {
    id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: item.title.trim() || 'Expense',
    amount: Math.round(Number(item.amount) * 100) / 100,
    isNecessary: item.isNecessary,
    groupId: item.groupId || data.groups[0]?.id || 'grp-other',
    createdAt: new Date().toISOString(),
  }

  return {
    ...data,
    days: {
      ...data.days,
      [dateKey]: {
        ...currentDay,
        date: dateKey,
        items: [newItem, ...currentDay.items],
      },
    },
  }
}

export function updateExpenseItem(
  data: ExpensesData,
  dateKey: string,
  itemId: string,
  patch: Partial<ExpenseItem>,
): ExpensesData {
  const currentDay = getDayExpenses(data, dateKey)
  const nextItems = currentDay.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it))

  return {
    ...data,
    days: {
      ...data.days,
      [dateKey]: {
        ...currentDay,
        items: nextItems,
      },
    },
  }
}

export function deleteExpenseItem(
  data: ExpensesData,
  dateKey: string,
  itemId: string,
): ExpensesData {
  const currentDay = getDayExpenses(data, dateKey)
  const nextItems = currentDay.items.filter((it) => it.id !== itemId)

  return {
    ...data,
    days: {
      ...data.days,
      [dateKey]: {
        ...currentDay,
        items: nextItems,
      },
    },
  }
}

export function addGroup(
  data: ExpensesData,
  group: { name: string; color?: string },
): ExpensesData {
  const name = group.name.trim()
  if (!name) return data
  const newGroup: ExpenseGroup = {
    id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    color: group.color || '#4f82f7',
    isDefault: false,
  }

  return {
    ...data,
    groups: [...data.groups, newGroup],
  }
}

export function updateGroup(
  data: ExpensesData,
  groupId: string,
  patch: Partial<ExpenseGroup>,
): ExpensesData {
  return {
    ...data,
    groups: data.groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)),
  }
}

export function deleteGroup(data: ExpensesData, groupId: string): ExpensesData {
  return {
    ...data,
    groups: data.groups.filter((g) => g.id !== groupId),
  }
}

export function setCurrency(data: ExpensesData, currency: string): ExpensesData {
  return {
    ...data,
    currency: currency.trim() || '$',
  }
}

export function setMonthlyBudget(data: ExpensesData, budget?: number): ExpensesData {
  return {
    ...data,
    monthlyBudget: budget && budget > 0 ? budget : undefined,
  }
}

export type MonthSummary = {
  year: number
  month: number
  totalSpent: number
  necessarySpent: number
  unnecessarySpent: number
  necessaryPercent: number
  unnecessaryPercent: number
  totalTransactions: number
  daysWithExpenses: number
  byGroup: Record<
    string,
    { name: string; color: string; total: number; count: number; percent: number }
  >
}

export function getMonthSummary(
  data: ExpensesData,
  year: number,
  month: number, // 0-indexed (0 = Jan, 11 = Dec)
): MonthSummary {
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`

  let totalSpent = 0
  let necessarySpent = 0
  let unnecessarySpent = 0
  let totalTransactions = 0
  let daysWithExpenses = 0

  const groupTotals: Record<string, { total: number; count: number }> = {}
  data.groups.forEach((g) => {
    groupTotals[g.id] = { total: 0, count: 0 }
  })

  for (const [dateStr, dayLog] of Object.entries(data.days)) {
    if (dateStr.startsWith(monthPrefix) && dayLog.items.length > 0) {
      daysWithExpenses++
      for (const item of dayLog.items) {
        totalSpent += item.amount
        totalTransactions++
        if (item.isNecessary) {
          necessarySpent += item.amount
        } else {
          unnecessarySpent += item.amount
        }

        const gId = item.groupId || 'grp-other'
        if (!groupTotals[gId]) {
          groupTotals[gId] = { total: 0, count: 0 }
        }
        groupTotals[gId].total += item.amount
        groupTotals[gId].count += 1
      }
    }
  }

  totalSpent = Math.round(totalSpent * 100) / 100
  necessarySpent = Math.round(necessarySpent * 100) / 100
  unnecessarySpent = Math.round(unnecessarySpent * 100) / 100

  const necessaryPercent = totalSpent > 0 ? Math.round((necessarySpent / totalSpent) * 100) : 0
  const unnecessaryPercent = totalSpent > 0 ? Math.round((unnecessarySpent / totalSpent) * 100) : 0

  const byGroup: MonthSummary['byGroup'] = {}
  for (const [gId, stats] of Object.entries(groupTotals)) {
    if (stats.count > 0 || data.groups.some((g) => g.id === gId)) {
      const grp = data.groups.find((g) => g.id === gId)
      byGroup[gId] = {
        name: grp?.name || 'Other',
        color: grp?.color || '#9299a6',
        total: Math.round(stats.total * 100) / 100,
        count: stats.count,
        percent: totalSpent > 0 ? Math.round((stats.total / totalSpent) * 100) : 0,
      }
    }
  }

  return {
    year,
    month,
    totalSpent,
    necessarySpent,
    unnecessarySpent,
    necessaryPercent,
    unnecessaryPercent,
    totalTransactions,
    daysWithExpenses,
    byGroup,
  }
}

export function formatCurrency(amount: number, currency = '₹'): string {
  return `${currency}${amount.toLocaleString(undefined, {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

export function exportExpensesAsCsv(data: ExpensesData): string {
  const rows: string[] = [
    'Date,Item,Amount,Currency,Category,Necessity,CreatedAt',
  ]
  const groupMap = new Map<string, string>()
  data.groups.forEach((g) => groupMap.set(g.id, g.name))

  const sortedDates = Object.keys(data.days).sort()
  for (const dk of sortedDates) {
    const day = data.days[dk]
    if (!day || !Array.isArray(day.items)) continue
    for (const it of day.items) {
      const groupName = groupMap.get(it.groupId) || 'Other'
      const nec = it.isNecessary ? 'Necessary' : 'Discretionary'
      const titleEsc = `"${(it.title || '').replace(/"/g, '""')}"`
      const catEsc = `"${groupName.replace(/"/g, '""')}"`
      rows.push(`${dk},${titleEsc},${it.amount},${data.currency || '₹'},${catEsc},${nec},${it.createdAt || dk}`)
    }
  }

  return rows.join('\n')
}
