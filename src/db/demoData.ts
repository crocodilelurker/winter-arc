import { todayKey, type Db, DB_VERSION } from './types'
import { createBoardData } from '../features/board/data'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function createDemoDb(): Db {
  const today = todayKey()
  const d1 = daysAgo(1)
  const d2 = daysAgo(2)
  const d3 = daysAgo(3)
  const d4 = daysAgo(4)
  const d5 = daysAgo(5)
  const d6 = daysAgo(6)
  const d7 = daysAgo(7)

  return {
    app: 'growth-arc',
    version: DB_VERSION,
    profile: {
      name: 'Alex Mercer',
      startedOn: d7,
    },
    updatedAt: new Date().toISOString(),
    features: {
      calorieCounter: {
        goals: { calories: 2350, protein: 165, carbs: 230, fat: 68, water: 9 },
        days: {
          [today]: {
            water: 8,
            entries: [
              {
                id: 'food-t-1',
                name: 'Oats with Whey, Blueberries & Chia',
                quantity: '1 bowl (90g oats, 30g whey)',
                meal: 'breakfast',
                calories: 520,
                protein: 42,
                carbs: 68,
                fat: 10,
              },
              {
                id: 'food-t-2',
                name: 'Grilled Chicken, Quinoa & Roasted Veggies',
                quantity: '1 large bowl',
                meal: 'lunch',
                calories: 680,
                protein: 58,
                carbs: 62,
                fat: 16,
              },
              {
                id: 'food-t-3',
                name: 'Greek Yogurt (0%) with Honey & Almonds',
                quantity: '250g cup',
                meal: 'snacks',
                calories: 260,
                protein: 24,
                carbs: 26,
                fat: 7,
              },
              {
                id: 'food-t-4',
                name: 'Baked Salmon with Sweet Potato & Broccoli',
                quantity: '220g salmon + 1 potato',
                meal: 'dinner',
                calories: 640,
                protein: 46,
                carbs: 42,
                fat: 24,
              },
            ],
          },
          [d1]: {
            water: 9,
            entries: [
              {
                id: 'food-d1-1',
                name: 'Scrambled Eggs with Avocado Toast',
                quantity: '3 eggs, 2 toast',
                meal: 'breakfast',
                calories: 560,
                protein: 32,
                carbs: 44,
                fat: 28,
              },
              {
                id: 'food-d1-2',
                name: 'Turkey Breast Rice Bowl',
                quantity: '1 portion',
                meal: 'lunch',
                calories: 620,
                protein: 54,
                carbs: 70,
                fat: 12,
              },
              {
                id: 'food-d1-3',
                name: 'Protein Shake with Banana & Peanut Butter',
                quantity: '500ml',
                meal: 'snacks',
                calories: 390,
                protein: 36,
                carbs: 38,
                fat: 11,
              },
              {
                id: 'food-d1-4',
                name: 'Lean Beef Sirloin & Asparagus',
                quantity: '200g steak',
                meal: 'dinner',
                calories: 610,
                protein: 50,
                carbs: 22,
                fat: 26,
              },
            ],
          },
        },
        library: [
          {
            key: 'oats with whey, blueberries & chia',
            name: 'Oats with Whey, Blueberries & Chia',
            quantity: '1 bowl',
            calories: 520,
            protein: 42,
            carbs: 68,
            fat: 10,
            uses: 12,
            lastUsed: today,
          },
          {
            key: 'grilled chicken, quinoa & roasted veggies',
            name: 'Grilled Chicken, Quinoa & Roasted Veggies',
            quantity: '1 bowl',
            calories: 680,
            protein: 58,
            carbs: 62,
            fat: 16,
            uses: 9,
            lastUsed: today,
          },
          {
            key: 'baked salmon with sweet potato',
            name: 'Baked Salmon with Sweet Potato',
            quantity: '1 plate',
            calories: 640,
            protein: 46,
            carbs: 42,
            fat: 24,
            uses: 7,
            lastUsed: today,
          },
        ],
      },
      todoGraph: {
        topics: ['Deep Work', 'Engineering', 'Health', 'Learning', 'Life'],
        days: {
          [today]: {
            date: today,
            tasks: [
              {
                id: 'task-demo-1',
                number: 1,
                title: 'Design Offline Graph Synchronization Architecture',
                completed: true,
                priority: 'high',
                topic: 'Deep Work',
                weight: 4,
                details: 'Produce formal schema for local IndexedDB caching and snapshotting. Feeds into [[#2]].',
                connectedTaskIds: ['task-demo-2'],
                createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
                completedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
                subtasks: [
                  { id: 'sub-1', title: 'Write IDB version 2 upgrade schema', completed: true },
                  { id: 'sub-2', title: 'Test 25MB transaction safety', completed: true },
                ],
              },
              {
                id: 'task-demo-2',
                number: 2,
                title: 'Deploy Production Release Pipeline',
                completed: false,
                priority: 'high',
                topic: 'Engineering',
                weight: 3,
                details: 'Depends on [[#1]]. Validate gzip bundles, run PWA offline verification, and tag v1.0.',
                connectedTaskIds: ['task-demo-1'],
                createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
                subtasks: [
                  { id: 'sub-3', title: 'Verify bundle code splitting chunks', completed: true },
                  { id: 'sub-4', title: 'Check mobile Safari and Chrome PWA standalone', completed: false },
                ],
              },
              {
                id: 'task-demo-3',
                number: 3,
                title: 'Review System Metrics & Market Readiness Checklist',
                completed: true,
                priority: 'med',
                topic: 'Engineering',
                weight: 2,
                details: 'Cross-reference user stories against competitive landscape.',
                connectedTaskIds: [],
                createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
                completedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
              },
              {
                id: 'task-demo-4',
                number: 4,
                title: 'Evening Mobility & Posture Routine',
                completed: false,
                priority: 'low',
                topic: 'Health',
                weight: 1,
                details: '15 minutes thoracic spine extension and hip flexor stretches.',
                connectedTaskIds: [],
                createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
              },
            ],
          },
        },
      },
      gym: {
        activePresetId: 'preset-ppl',
        weightUnit: 'kg',
        presets: [
          {
            id: 'preset-ppl',
            name: 'Push / Pull / Legs Hypertrophy',
            isDefault: true,
            days: [
              { dayIndex: 1, dayLabel: 'Monday', name: 'Push (Chest, Delts, Triceps)', isRest: false, exercises: ['Barbell Bench Press', 'Incline DB Press', 'Cable Lateral Raises', 'Triceps Rope Pushdowns'] },
              { dayIndex: 2, dayLabel: 'Tuesday', name: 'Pull (Back & Biceps)', isRest: false, exercises: ['Barbell Rows', 'Lat Pulldowns', 'Face Pulls', 'Incline Dumbbell Curls'] },
              { dayIndex: 3, dayLabel: 'Wednesday', name: 'Legs & Core', isRest: false, exercises: ['Barbell Back Squats', 'Romanian Deadlifts', 'Leg Press', 'Hanging Leg Raises'] },
              { dayIndex: 4, dayLabel: 'Thursday', name: 'Active Recovery & Zone 2 Cardio', isRest: true, exercises: [] },
              { dayIndex: 5, dayLabel: 'Friday', name: 'Upper Body Power', isRest: false, exercises: ['Overhead Press', 'Weighted Pull-ups', 'Dips', 'Cable Rows'] },
              { dayIndex: 6, dayLabel: 'Saturday', name: 'Lower Body & Sprints', isRest: false, exercises: ['Front Squats', 'Walking Lunges', 'Calf Raises'] },
              { dayIndex: 7, dayLabel: 'Sunday', name: 'Rest & Mobility', isRest: true, exercises: [] },
            ],
          },
        ],
        history: {
          [today]: {
            date: today,
            presetId: 'preset-ppl',
            dayName: 'Push (Chest, Delts, Triceps)',
            isRest: false,
            completed: true,
            durationMinutes: 62,
            exercises: [
              {
                exerciseName: 'Barbell Bench Press',
                sets: [
                  { id: 's-1', setNumber: 1, weight: 80, reps: 10, completed: true },
                  { id: 's-2', setNumber: 2, weight: 85, reps: 8, completed: true },
                  { id: 's-3', setNumber: 3, weight: 90, reps: 6, completed: true },
                  { id: 's-4', setNumber: 4, weight: 90, reps: 6, completed: true },
                ],
              },
              {
                exerciseName: 'Incline DB Press',
                sets: [
                  { id: 's-5', setNumber: 1, weight: 32, reps: 10, completed: true },
                  { id: 's-6', setNumber: 2, weight: 34, reps: 8, completed: true },
                  { id: 's-7', setNumber: 3, weight: 34, reps: 8, completed: true },
                ],
              },
              {
                exerciseName: 'Cable Lateral Raises',
                sets: [
                  { id: 's-8', setNumber: 1, weight: 12, reps: 15, completed: true },
                  { id: 's-9', setNumber: 2, weight: 14, reps: 12, completed: true },
                  { id: 's-10', setNumber: 3, weight: 14, reps: 12, completed: true },
                ],
              },
              {
                exerciseName: 'Triceps Rope Pushdowns',
                sets: [
                  { id: 's-11', setNumber: 1, weight: 25, reps: 12, completed: true },
                  { id: 's-12', setNumber: 2, weight: 28, reps: 10, completed: true },
                  { id: 's-13', setNumber: 3, weight: 28, reps: 10, completed: true },
                ],
              },
            ],
          },
        },
      },
      nonNegotiables: {
        habits: [
          { id: 'h-water', name: 'Drink 3.5L Water', type: 'number', target: 8, unit: 'glasses', createdAt: d7 },
          { id: 'h-training', name: 'Gym / Daily Workout', type: 'boolean', createdAt: d7 },
          { id: 'h-deepwork', name: '3+ Hours Deep Focus', type: 'boolean', createdAt: d7 },
          { id: 'h-reading', name: 'Read 20 Pages', type: 'number', target: 20, unit: 'pages', createdAt: d7 },
          { id: 'h-sleep', name: '7.5+ Hours Sleep', type: 'boolean', createdAt: d7 },
          { id: 'h-cold', name: 'Cold Shower Upon Waking', type: 'boolean', createdAt: d7 },
        ],
        history: {
          [today]: {
            date: today,
            values: {
              'h-water': { current: 8 },
              'h-training': { completed: true },
              'h-deepwork': { completed: true },
              'h-reading': { current: 20 },
              'h-sleep': { completed: true },
              'h-cold': { completed: true },
            },
          },
          [d1]: {
            date: d1,
            values: {
              'h-water': { current: 8 },
              'h-training': { completed: true },
              'h-deepwork': { completed: true },
              'h-reading': { current: 22 },
              'h-sleep': { completed: true },
              'h-cold': { completed: true },
            },
          },
          [d2]: {
            date: d2,
            values: {
              'h-water': { current: 9 },
              'h-training': { completed: true },
              'h-deepwork': { completed: true },
              'h-reading': { current: 20 },
              'h-sleep': { completed: true },
              'h-cold': { completed: true },
            },
          },
          [d3]: {
            date: d3,
            values: {
              'h-water': { current: 8 },
              'h-training': { completed: true },
              'h-deepwork': { completed: true },
              'h-reading': { current: 20 },
              'h-sleep': { completed: true },
              'h-cold': { completed: true },
            },
          },
          [d4]: {
            date: d4,
            values: {
              'h-water': { current: 8 },
              'h-training': { completed: true },
              'h-deepwork': { completed: true },
              'h-reading': { current: 25 },
              'h-sleep': { completed: true },
              'h-cold': { completed: true },
            },
          },
          [d5]: {
            date: d5,
            values: {
              'h-water': { current: 8 },
              'h-training': { completed: true },
              'h-deepwork': { completed: true },
              'h-reading': { current: 20 },
              'h-sleep': { completed: true },
              'h-cold': { completed: true },
            },
          },
          [d6]: {
            date: d6,
            values: {
              'h-water': { current: 8 },
              'h-training': { completed: true },
              'h-deepwork': { completed: true },
              'h-reading': { current: 20 },
              'h-sleep': { completed: true },
              'h-cold': { completed: true },
            },
          },
        },
      },
      expenses: {
        currency: '$',
        monthlyBudget: 3600,
        groups: [
          { id: 'grp-food', name: 'Food & Groceries', color: '#f5a524', isDefault: true },
          { id: 'grp-travel', name: 'Travel & Commute', color: '#4f82f7', isDefault: true },
          { id: 'grp-bills', name: 'Bills & Utilities', color: '#3ecf8e', isDefault: true },
          { id: 'grp-shopping', name: 'Shopping & Gear', color: '#a855f7', isDefault: true },
          { id: 'grp-health', name: 'Health & Fitness', color: '#06b6d4', isDefault: true },
          { id: 'grp-other', name: 'General & Other', color: '#9299a6', isDefault: true },
        ],
        days: {
          [today]: {
            date: today,
            items: [
              { id: 'exp-1', title: 'Organic Market Groceries', amount: 82.5, isNecessary: true, groupId: 'grp-food', createdAt: new Date().toISOString() },
              { id: 'exp-2', title: 'Specialty Espresso & Tonic', amount: 6.5, isNecessary: false, groupId: 'grp-food', createdAt: new Date().toISOString() },
              { id: 'exp-3', title: 'Monthly Gym Access Pass', amount: 75.0, isNecessary: true, groupId: 'grp-health', createdAt: new Date().toISOString() },
            ],
          },
          [d1]: {
            date: d1,
            items: [
              { id: 'exp-4', title: 'High-speed Fiber Internet', amount: 65.0, isNecessary: true, groupId: 'grp-bills', createdAt: new Date().toISOString() },
              { id: 'exp-5', title: 'New Running Socks & Straps', amount: 28.0, isNecessary: false, groupId: 'grp-shopping', createdAt: new Date().toISOString() },
            ],
          },
        },
      },
      learnings: {
        categories: [
          'Tech & Coding',
          'Mindset & Wisdom',
          'Business & Work',
          'Health & Fitness',
          'Creative & Design',
          'Life Lesson',
        ],
        days: {
          [today]: {
            date: today,
            entries: [
              {
                id: 'learn-1',
                type: 'learning',
                title: 'IndexedDB Transactions & Offline Durability',
                description: 'Local-first architecture requires synchronous in-memory state with background serialized IndexedDB flushes. Never block the render thread on disk I/O.',
                category: 'Tech & Coding',
                createdAt: new Date().toISOString(),
              },
              {
                id: 'learn-2',
                type: 'creation',
                title: 'Built Growth Arc Demo Experience',
                description: 'Shipped a showcase environment that instantly immerses new users into the complete vision without an intimidating blank slate.',
                category: 'Creative & Design',
                createdAt: new Date().toISOString(),
              },
            ],
          },
          [d1]: {
            date: d1,
            entries: [
              {
                id: 'learn-3',
                type: 'learning',
                title: 'Inverted Focus: Removing Friction beats Adding Discipline',
                description: 'To sustain 7-day habit streaks, eliminate environmental resistance instead of relying solely on sheer willpower.',
                category: 'Mindset & Wisdom',
                createdAt: new Date().toISOString(),
              },
            ],
          },
        },
      },
      dayPlanner: {
        settings: {
          snapMinutes: 15,
          hourHeight: 64,
          startHour: 6,
          endHour: 23,
        },
        days: {
          [today]: {
            date: today,
            blocks: [
              {
                id: 'blk-1',
                title: 'Morning Routine & Cold Shower',
                startMinute: 7 * 60,
                durationMinutes: 60,
                category: 'non-negotiable',
                color: '#3ecf8e',
                completed: true,
              },
              {
                id: 'blk-2',
                title: 'Deep Work: Offline Graph Architecture',
                startMinute: 8 * 60 + 30,
                durationMinutes: 150,
                category: 'task',
                color: '#4f82f7',
                completed: true,
              },
              {
                id: 'blk-3',
                title: 'Nutrition Break & Daylight Walk',
                startMinute: 12 * 60,
                durationMinutes: 60,
                category: 'custom',
                color: '#f5a524',
                completed: true,
              },
              {
                id: 'blk-4',
                title: 'Hypertrophy Workout (Push Day)',
                startMinute: 16 * 60 + 30,
                durationMinutes: 90,
                category: 'custom',
                color: '#06b6d4',
                completed: true,
              },
              {
                id: 'blk-5',
                title: 'Review System Metrics & Market Readiness',
                startMinute: 18 * 60 + 30,
                durationMinutes: 60,
                category: 'task',
                color: '#4f82f7',
                completed: true,
              },
              {
                id: 'blk-6',
                title: 'Evening Reading & Wind Down',
                startMinute: 21 * 60,
                durationMinutes: 60,
                category: 'non-negotiable',
                color: '#a855f7',
                completed: false,
              },
            ],
          },
        },
      },
      board: createBoardData(),
    },
  }
}
