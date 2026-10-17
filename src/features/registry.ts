/**
 * The feature menu. Features are independent modules — the shell only knows a
 * title, a blurb and whether it's built yet. Adding feature 2 means adding a
 * row here and a folder next door; nothing else in the shell changes.
 */
export type FeatureId = 'calorie-counter' | 'todo-graph' | 'gym' | 'non-negotiables' | 'expenses'

export type FeatureCard = {
  id: FeatureId | string
  title: string
  blurb: string
  ready: boolean
}

export const FEATURES: FeatureCard[] = [
  {
    id: 'calorie-counter',
    title: 'Calorie Counter',
    blurb: 'Track your meals, daily calories, protein, and water.',
    ready: true,
  },
  {
    id: 'todo-graph',
    title: 'Tasks & Graph',
    blurb: 'Plan your day, link connected tasks, and view your visual graph.',
    ready: true,
  },
  {
    id: 'gym',
    title: 'Gym & Workouts',
    blurb: '7-day workout splits, log sets, reps, weights, and rest timers.',
    ready: true,
  },
  {
    id: 'non-negotiables',
    title: 'Daily Habits',
    blurb: 'Track your non-negotiable daily habits and completion calendar.',
    ready: true,
  },
  {
    id: 'expenses',
    title: 'Daily Expenses',
    blurb: 'Track daily purchases, necessity checks, monthly totals, and custom groups.',
    ready: true,
  },
]
