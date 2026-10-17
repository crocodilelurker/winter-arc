# Growth Arc 🐂

A private, local-first web application engineered for discipline and focused growth. Built with React 19, TypeScript, Vite, and a refined Linear/Notion-style dark mode interface using pure CSS and the Inter font.

---

## ✨ Features

1. **Dashboard Overview**: Daily greeting, date tracker, live save status indicators, and one-click access to all features.
2. **Nutrition & Macro Tracker**:
   - Macro progress tracking for Calories, Protein, Carbs, and Fats.
   - 8-glass daily water intake counter.
   - Meal breakdown for Breakfast, Lunch, Dinner, and Snacks.
   - Custom food library with instant nutrient calculations.
3. **Tasks & Connected Graph**:
   - Segmented view switcher (`Split`, `Graph`, `List`).
   - Interactive force-directed physics graph visualizing connected tasks.
   - Obsidian-style wiki-links (`[[`) with live task autocomplete.
   - 25-minute Pomodoro focus timer and subtasks checklist.
   - Search, priority filtering, and multi-select batch actions.
4. **Workouts & Gym Logger**:
   - 7-day routine split planner and custom preset editor.
   - Interactive Monday–Sunday week strip with completion dots.
   - Exercise logging with set-by-set weight and reps tracking.
   - One-click "Last Lifted" history copier.
   - Built-in rest timer with presets and completion chime.
5. **Daily Habits (Non-Negotiables)**:
   - Boolean (Yes/No) and Countable numeric habit tracking.
   - Visual completion progress banner.
   - Calendar heatmap view marking fulfilled vs partial days.
6. **Progress Export**:
   - Export range reports across any date window.
   - Download as formatted Markdown (`.md`) or print as PDF.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Pure Vanilla CSS with CSS Custom Properties
- **Data Persistence**: Local-first File System Access API + JSON export/import

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or pnpm

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

---

## 🌐 Deployment

This application is a static Single Page Application (SPA) and can be deployed directly to any static hosting platform:

### Vercel
Connect this GitHub repository to [Vercel](https://vercel.com) — it will automatically detect Vite:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Netlify
Connect this GitHub repository to [Netlify](https://netlify.com):
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`

### GitHub Pages
Can be deployed via GitHub Actions using standard static deployment workflows.
