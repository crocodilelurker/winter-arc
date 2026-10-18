import type { Db } from '../db/types'
import { getDayProgress as getNonNegotiablesProgress } from '../features/non-negotiables/data'

export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const [sY, sM, sD] = startDate.split('-').map(Number)
  const [eY, eM, eD] = endDate.split('-').map(Number)

  const cur = new Date(sY, sM - 1, sD)
  const end = new Date(eY, eM - 1, eD)

  const pad = (n: number) => String(n).padStart(2, '0')

  while (cur <= end) {
    dates.push(`${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`)
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export function generateMarkdownReport(db: Db, startDate: string, endDate: string): string {
  const dateRange = getDateRange(startDate, endDate)
  const totalDays = dateRange.length
  const userName = db.profile.name || 'User'
  const today = new Date().toISOString().split('T')[0]

  // Aggregators for summary
  let totalCalories = 0
  let totalProtein = 0
  let totalWater = 0
  let daysWithCalories = 0

  let totalTasks = 0
  let completedTasks = 0

  let totalWorkouts = 0
  let totalSetsCompleted = 0

  let daysAllHabitsFulfilled = 0
  let daysWithHabitActivity = 0

  let totalExpenses = 0
  let necessaryExpenses = 0
  let unnecessaryExpenses = 0
  let totalPurchases = 0
  let totalLearnings = 0
  let totalCreations = 0
  const currency = db.features.expenses?.currency || '₹'

  const dailyMarkdownSections: string[] = []

  for (const dateStr of dateRange) {
    const dayDate = new Date(dateStr + 'T00:00:00')
    const weekday = dayDate.toLocaleDateString(undefined, { weekday: 'long' })
    const dayHeader = `### ${dateStr} - ${weekday}`
    const daySections: string[] = []

    // 1. Calorie Counter
    const calDay = db.features.calorieCounter?.days?.[dateStr]
    if (calDay && calDay.entries && calDay.entries.length > 0) {
      daysWithCalories++
      const dayCals = calDay.entries.reduce((sum, m) => sum + (m.calories || 0), 0)
      const dayP = calDay.entries.reduce((sum, m) => sum + (m.protein || 0), 0)
      const dayC = calDay.entries.reduce((sum, m) => sum + (m.carbs || 0), 0)
      const dayF = calDay.entries.reduce((sum, m) => sum + (m.fat || 0), 0)
      const water = calDay.water || 0

      totalCalories += dayCals
      totalProtein += dayP
      totalWater += water

      let calText = `**Nutrition:** ${dayCals} kcal | ${dayP}g Protein | ${dayC}g Carbs | ${dayF}g Fat | ${water} glasses water\n`
      calText += calDay.entries
        .map((m) => `  - [${m.meal.toUpperCase()}] ${m.name}${m.quantity ? ` (${m.quantity})` : ''}: ${m.calories} kcal (P: ${m.protein}g, C: ${m.carbs}g, F: ${m.fat}g)`)
        .join('\n')
      daySections.push(calText)
    }

    // 2. Task Graph
    const todoDay = db.features.todoGraph?.days?.[dateStr]
    if (todoDay && todoDay.tasks && todoDay.tasks.length > 0) {
      totalTasks += todoDay.tasks.length
      const done = todoDay.tasks.filter((t) => t.completed).length
      completedTasks += done

      let taskText = `**Tasks (${done}/${todoDay.tasks.length} completed):**\n`
      taskText += todoDay.tasks
        .map((t) => `  - [${t.completed ? 'x' : ' '}] #${t.number} ${t.title}${t.topic ? ` [${t.topic}]` : ''}`)
        .join('\n')
      daySections.push(taskText)
    }

    // 3. Gym
    const gymDay = db.features.gym?.history?.[dateStr]
    if (gymDay) {
      if (gymDay.isRest) {
        daySections.push(`**Workout:** Rest Day`)
      } else if (gymDay.exercises && gymDay.exercises.length > 0) {
        if (gymDay.completed) totalWorkouts++
        const setsDone = gymDay.exercises.reduce(
          (sum, e) => sum + e.sets.filter((s) => s.completed).length,
          0,
        )
        totalSetsCompleted += setsDone

        let gymText = `**Workout:** ${gymDay.dayName || 'Workout Session'}${gymDay.completed ? ' (Completed)' : ''}\n`
        gymText += gymDay.exercises
          .map((ex) => {
            const completedSets = ex.sets.filter((s) => s.completed)
            const setsStr = ex.sets
              .map((s) => `Set ${s.setNumber}: ${s.weight}${db.features.gym.weightUnit || 'kg'} × ${s.reps} reps [${s.completed ? 'x' : ' '}]`)
              .join(' | ')
            return `  - **${ex.exerciseName}** (${completedSets.length}/${ex.sets.length} sets): ${setsStr}`
          })
          .join('\n')
        daySections.push(gymText)
      }
    }

    // 4. Non-Negotiables
    const nnData = db.features.nonNegotiables
    if (nnData && nnData.habits && nnData.habits.length > 0) {
      const log = nnData.history?.[dateStr]
      const progress = getNonNegotiablesProgress(nnData.habits, log)
      if (log) daysWithHabitActivity++
      if (progress.isAllFulfilled) daysAllHabitsFulfilled++

      let nnText = `**Daily Habits:** ${progress.isAllFulfilled ? '[All completed]' : `[${progress.fulfilled}/${progress.total} completed]`}\n`
      nnText += nnData.habits
        .map((h) => {
          const val = log?.values?.[h.id]
          const isDone = h.type === 'boolean' ? Boolean(val?.completed) : (val?.current || 0) >= (h.target || 1)
          const detail = h.type === 'number' ? ` (${val?.current || 0}/${h.target} ${h.unit || ''})` : ''
          return `  - [${isDone ? 'x' : ' '}] ${h.name}${detail}`
        })
        .join('\n')
      daySections.push(nnText)
    }

    // 5. Daily Expenses
    const expDay = db.features.expenses?.days?.[dateStr]
    if (expDay && expDay.items && expDay.items.length > 0) {
      const dayTotal = expDay.items.reduce((sum, it) => sum + it.amount, 0)
      const dayNec = expDay.items.filter((it) => it.isNecessary).reduce((sum, it) => sum + it.amount, 0)
      const dayUnnec = expDay.items.filter((it) => !it.isNecessary).reduce((sum, it) => sum + it.amount, 0)

      totalExpenses += dayTotal
      necessaryExpenses += dayNec
      unnecessaryExpenses += dayUnnec
      totalPurchases += expDay.items.length

      let expText = `**Expenses (${currency}${dayTotal}):** (${currency}${dayNec} necessary, ${currency}${dayUnnec} discretionary)\n`
      expText += expDay.items
        .map((it) => {
          const necTag = it.isNecessary ? '[Necessary]' : '[Discretionary]'
          return `  - ${it.title}: ${currency}${it.amount} ${necTag}`
        })
        .join('\n')
      daySections.push(expText)
    }

    // 6. Learnings & Creations
    const lrnDay = db.features.learnings?.days?.[dateStr]
    if (lrnDay && lrnDay.entries && lrnDay.entries.length > 0) {
      const learns = lrnDay.entries.filter((e) => e.type === 'learning')
      const creates = lrnDay.entries.filter((e) => e.type === 'creation')
      totalLearnings += learns.length
      totalCreations += creates.length

      let lrnText = `**Learnings & Creations (${lrnDay.entries.length}):**\n`
      if (lrnDay.dayNote) {
        lrnText += `  *Reflection: "${lrnDay.dayNote}"*\n`
      }
      lrnText += lrnDay.entries
        .map((e) => {
          const typeTag = e.type === 'learning' ? '[LEARNED]' : '[CREATED]'
          const desc = e.description ? ` — ${e.description}` : ''
          return `  - ${typeTag} [${e.category}] **${e.title}**${desc}`
        })
        .join('\n')
      daySections.push(lrnText)
    }

    if (daySections.length > 0) {
      dailyMarkdownSections.push(`${dayHeader}\n\n${daySections.join('\n\n')}`)
    } else {
      dailyMarkdownSections.push(`${dayHeader}\n\n*No activity logged*`)
    }
  }

  // Calculate Averages
  const avgCals = daysWithCalories > 0 ? Math.round(totalCalories / daysWithCalories) : 0
  const avgProtein = daysWithCalories > 0 ? Math.round(totalProtein / daysWithCalories) : 0
  const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const fulfillmentRate = totalDays > 0 ? Math.round((daysAllHabitsFulfilled / totalDays) * 100) : 0

  const report = `# Growth Arc Progress Report

**Name:** ${userName}  
**Date Range:** ${startDate} to ${endDate} (${totalDays} ${totalDays === 1 ? 'day' : 'days'})  
**Generated On:** ${today}  

---

## Summary

| Category | Metric | Result |
| :--- | :--- | :--- |
| **Nutrition & Calories** | Average Daily Calories | **${avgCals} kcal** / day (${daysWithCalories} logged days) |
| | Average Daily Protein | **${avgProtein}g** / day |
| | Total Water Tracked | **${totalWater} glasses** |
| **Tasks** | Completed Tasks | **${completedTasks} / ${totalTasks}** (${taskRate}%) |
| **Gym & Workouts** | Workouts Completed | **${totalWorkouts} sessions** (${totalSetsCompleted} sets logged) |
| **Daily Habits** | 100% Completion Days | **${daysAllHabitsFulfilled} / ${totalDays} days** (${fulfillmentRate}%) |
| **Daily Expenses** | Total Spend | **${currency}${Math.round(totalExpenses * 100) / 100}** (${totalPurchases} items logged) |
| | Necessary vs Discretionary | **${currency}${Math.round(necessaryExpenses * 100) / 100}** necessary · **${currency}${Math.round(unnecessaryExpenses * 100) / 100}** discretionary |
| **Learnings & Creations** | Growth & Tangible Output | **${totalLearnings} learnings** · **${totalCreations} creations logged** |

---

## Daily Logs

${dailyMarkdownSections.join('\n\n---\n\n')}

---
*Growth Arc offline progress report.*
`
  return report
}

export function generatePrintableHtml(db: Db, startDate: string, endDate: string): string {
  const md = generateMarkdownReport(db, startDate, endDate)
  const userName = db.profile.name || 'User'

  // Convert basic markdown to clean HTML for print styling
  const lines = md.split('\n')
  let htmlBody = ''
  let inList = false
  let inTable = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('# ')) {
      if (inList) { htmlBody += '</ul>\n'; inList = false }
      if (inTable) { htmlBody += '</table>\n'; inTable = false }
      htmlBody += `<h1>${trimmed.replace('# ', '')}</h1>\n`
    } else if (trimmed.startsWith('## ')) {
      if (inList) { htmlBody += '</ul>\n'; inList = false }
      if (inTable) { htmlBody += '</table>\n'; inTable = false }
      htmlBody += `<h2>${trimmed.replace('## ', '')}</h2>\n`
    } else if (trimmed.startsWith('### ')) {
      if (inList) { htmlBody += '</ul>\n'; inList = false }
      if (inTable) { htmlBody += '</table>\n'; inTable = false }
      htmlBody += `<h3>${trimmed.replace('### ', '')}</h3>\n`
    } else if (trimmed.startsWith('|') && trimmed.includes('|')) {
      if (!inTable) {
        htmlBody += '<table class="report-table">\n'
        inTable = true
      }
      if (trimmed.includes(':---')) continue // skip separator row
      const cells = trimmed.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      const tag = htmlBody.includes('<tbody>') ? 'td' : 'th'
      const row = `<tr>${cells.map((c) => `<${tag}>${formatInline(c.trim())}</${tag}>`).join('')}</tr>\n`
      if (tag === 'th') {
        htmlBody += `<thead>${row}</thead>\n<tbody>\n`
      } else {
        htmlBody += row
      }
    } else if (trimmed.startsWith('- ')) {
      if (inTable) { htmlBody += '</tbody></table>\n'; inTable = false }
      if (!inList) {
        htmlBody += '<ul>\n'
        inList = true
      }
      htmlBody += `<li>${formatInline(trimmed.replace('- ', ''))}</li>\n`
    } else if (trimmed === '---') {
      if (inList) { htmlBody += '</ul>\n'; inList = false }
      if (inTable) { htmlBody += '</tbody></table>\n'; inTable = false }
      htmlBody += '<hr />\n'
    } else if (trimmed === '') {
      if (inList) { htmlBody += '</ul>\n'; inList = false }
      if (inTable) { htmlBody += '</tbody></table>\n'; inTable = false }
    } else {
      htmlBody += `<p>${formatInline(trimmed)}</p>\n`
    }
  }

  if (inList) htmlBody += '</ul>\n'
  if (inTable) htmlBody += '</tbody></table>\n'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Growth Arc Report - ${userName} (${startDate} to ${endDate})</title>
  <style>
    @page {
      size: A4;
      margin: 1.8cm 1.5cm;
    }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1e293b;
      line-height: 1.5;
      font-size: 13px;
      margin: 0;
      padding: 20px;
    }
    h1 {
      font-size: 22px;
      margin: 0 0 8px 0;
      color: #0f172a;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 6px;
    }
    h2 {
      font-size: 16px;
      margin: 20px 0 10px 0;
      color: #1e293b;
      page-break-after: avoid;
    }
    h3 {
      font-size: 14px;
      margin: 16px 0 6px 0;
      color: #334155;
      page-break-after: avoid;
    }
    p {
      margin: 4px 0;
    }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 16px 0;
    }
    ul {
      margin: 4px 0 10px 18px;
      padding: 0;
    }
    li {
      margin-bottom: 3px;
    }
    table.report-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 16px 0;
      font-size: 12px;
    }
    table.report-table th, table.report-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: left;
    }
    table.report-table th {
      background: #f1f5f9;
      font-weight: 600;
    }
    table.report-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  ${htmlBody}
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`
}

function formatInline(text: string): string {
  return text
    .replace(/\[x\]/gi, '<input type="checkbox" checked disabled style="margin-right:4px;">')
    .replace(/\[ \]/g, '<input type="checkbox" disabled style="margin-right:4px;">')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
