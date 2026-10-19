function createBaseElement(type: string, x: number, y: number, width: number, height: number, custom: Record<string, any> = {}) {
  const seed = Math.floor(Math.random() * 100000)
  return {
    id: `elem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: '#60a5fa',
    backgroundColor: '#1e293b',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 },
    seed,
    version: 1,
    versionNonce: seed,
    isDeleted: false,
    boundElements: [],
    updated: Date.now(),
    link: null,
    locked: false,
    ...custom,
  }
}

function createTextElement(x: number, y: number, text: string, custom: Record<string, any> = {}) {
  const fontSize = custom.fontSize || 18
  const width = Math.max(120, text.length * (fontSize * 0.55))
  const height = fontSize * 1.5
  return createBaseElement('text', x, y, width, height, {
    text,
    fontSize,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    baseline: fontSize,
    containerId: null,
    originalText: text,
    lineHeight: 1.25,
    strokeColor: '#f1f5f9',
    backgroundColor: 'transparent',
    ...custom,
  })
}

export const TEMPLATES = [
  {
    id: 'mindmap',
    name: 'Mind Map',
    desc: 'Central focus node with branching ideas and thought clusters.',
    icon: '🧠',
    create: () => {
      const elements: any[] = []
      // Center Focus
      elements.push(
        createBaseElement('rectangle', 350, 250, 200, 80, {
          strokeColor: '#8b5cf6',
          backgroundColor: '#2e1065',
          roundness: { type: 3 },
        }),
      )
      elements.push(createTextElement(360, 275, 'CORE OBJECTIVE', { fontSize: 20, strokeColor: '#e9d5ff' }))

      // Branch 1 - Strategy
      elements.push(
        createBaseElement('rectangle', 100, 100, 160, 60, {
          strokeColor: '#38bdf8',
          backgroundColor: '#0c4a6e',
          roundness: { type: 3 },
        }),
      )
      elements.push(createTextElement(115, 118, 'Strategy & Plan', { fontSize: 16, strokeColor: '#e0f2fe' }))
      elements.push(
        createBaseElement('arrow', 350, 260, -100, -100, {
          points: [
            [0, 0],
            [-90, -100],
          ],
          strokeColor: '#38bdf8',
        }),
      )

      // Branch 2 - Execution
      elements.push(
        createBaseElement('rectangle', 640, 100, 160, 60, {
          strokeColor: '#34d399',
          backgroundColor: '#064e3b',
          roundness: { type: 3 },
        }),
      )
      elements.push(createTextElement(655, 118, 'Execution Steps', { fontSize: 16, strokeColor: '#d1fae5' }))
      elements.push(
        createBaseElement('arrow', 550, 260, 100, -100, {
          points: [
            [0, 0],
            [90, -100],
          ],
          strokeColor: '#34d399',
        }),
      )

      // Branch 3 - Daily Habits
      elements.push(
        createBaseElement('rectangle', 100, 420, 160, 60, {
          strokeColor: '#f59e0b',
          backgroundColor: '#451a03',
          roundness: { type: 3 },
        }),
      )
      elements.push(createTextElement(115, 438, 'Daily Non-Negs', { fontSize: 16, strokeColor: '#fef3c7' }))
      elements.push(
        createBaseElement('arrow', 350, 320, -100, 100, {
          points: [
            [0, 0],
            [-90, 100],
          ],
          strokeColor: '#f59e0b',
        }),
      )

      // Branch 4 - Review & Metrics
      elements.push(
        createBaseElement('rectangle', 640, 420, 160, 60, {
          strokeColor: '#ec4899',
          backgroundColor: '#500724',
          roundness: { type: 3 },
        }),
      )
      elements.push(createTextElement(655, 438, 'Review & Metrics', { fontSize: 16, strokeColor: '#fce7f3' }))
      elements.push(
        createBaseElement('arrow', 550, 320, 100, 100, {
          points: [
            [0, 0],
            [90, 100],
          ],
          strokeColor: '#ec4899',
        }),
      )

      return elements
    },
  },
  {
    id: 'workflow',
    name: 'Workflow Pipeline',
    desc: 'Columns for Backlog, Doing, Review, and Done.',
    icon: '📋',
    create: () => {
      const elements: any[] = []
      const cols = [
        { title: 'BACKLOG', x: 80, color: '#94a3b8', bg: '#1e293b' },
        { title: 'IN PROGRESS', x: 320, color: '#60a5fa', bg: '#172554' },
        { title: 'TEST / REVIEW', x: 560, color: '#fbbf24', bg: '#451a03' },
        { title: 'COMPLETED', x: 800, color: '#34d399', bg: '#064e3b' },
      ]

      cols.forEach((col) => {
        // Header
        elements.push(
          createBaseElement('rectangle', col.x, 100, 210, 45, {
            strokeColor: col.color,
            backgroundColor: col.bg,
            roundness: { type: 3 },
          }),
        )
        elements.push(createTextElement(col.x + 20, 112, col.title, { fontSize: 16, strokeColor: '#f8fafc' }))

        // Column Box
        elements.push(
          createBaseElement('rectangle', col.x, 155, 210, 400, {
            strokeColor: `${col.color}44`,
            backgroundColor: 'transparent',
            strokeWidth: 1,
            strokeStyle: 'dashed',
            roundness: { type: 3 },
          }),
        )

        // Sample Card
        elements.push(
          createBaseElement('rectangle', col.x + 10, 170, 190, 70, {
            strokeColor: col.color,
            backgroundColor: '#0f172a',
            strokeWidth: 1.5,
            roundness: { type: 3 },
          }),
        )
        elements.push(
          createTextElement(col.x + 25, 190, `Task in ${col.title}`, {
            fontSize: 14,
            strokeColor: '#cbd5e1',
          }),
        )
      })

      return elements
    },
  },
  {
    id: 'growth-arc',
    name: 'Growth Arc Blueprint',
    desc: 'Visual roadmap for physical, mental, coding, and financial growth.',
    icon: '⚡',
    create: () => {
      const elements: any[] = []

      // Title Banner
      elements.push(
        createBaseElement('rectangle', 240, 60, 480, 65, {
          strokeColor: '#818cf8',
          backgroundColor: '#1e1b4b',
          roundness: { type: 3 },
        }),
      )
      elements.push(createTextElement(270, 80, 'GROWTH ARC BLUEPRINT', { fontSize: 24, strokeColor: '#e0e7ff' }))

      const pillars = [
        { name: '1. PHYSICAL', sub: 'Gym splits & 100% clean calories', x: 80, y: 170, stroke: '#ef4444', bg: '#450a0a' },
        { name: '2. DISCIPLINE', sub: 'Non-negotiable daily streak', x: 540, y: 170, stroke: '#10b981', bg: '#022c22' },
        { name: '3. CRAFT & CODE', sub: 'Deep work & shipping creations', x: 80, y: 340, stroke: '#3b82f6', bg: '#172554' },
        { name: '4. WEALTH & MIND', sub: 'Expenses in check, daily lessons', x: 540, y: 340, stroke: '#f59e0b', bg: '#451a03' },
      ]

      pillars.forEach((p) => {
        elements.push(
          createBaseElement('rectangle', p.x, p.y, 380, 120, {
            strokeColor: p.stroke,
            backgroundColor: p.bg,
            roundness: { type: 3 },
          }),
        )
        elements.push(createTextElement(p.x + 30, p.y + 25, p.name, { fontSize: 18, strokeColor: '#ffffff' }))
        elements.push(createTextElement(p.x + 30, p.y + 65, p.sub, { fontSize: 14, strokeColor: '#d1d5db' }))
      })

      return elements
    },
  },
]
