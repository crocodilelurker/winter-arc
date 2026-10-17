# Winter Arc — Core Idea

## The one hard rule

**No database. No backend persistence of any kind.** No Postgres, no SQLite on a
server, no Firebase, no hosted key-value store. The app never owns the user's
data and never stores it anywhere the user can't hold in their hand.

The user's data lives in a single file **on the user's own machine**. The app is
just the thing that reads that file, operates on it in memory, and hands it back.

## How a session works

1. **Gate screen** — the app asks one question: are you a new user or an
   existing user?
2. **Existing user** → they upload their save file. The app loads it and every
   screen, number, and streak reflects what's in that file.
3. **New user** → nothing to upload. They start from an empty state in memory
   (optionally giving a name).
4. **Menu** — once loaded, a menu of features. Pick one to work in.
5. **During use** — all reads and writes happen in memory. Nothing leaves the
   browser. The header shows `saved` / `unsaved changes`.
6. **Save** — an explicit **Save to file** button downloads the current state as
   a JSON file. That file is the save game. Next session, upload it at step 2.

## Why this shape

- Zero accounts, zero signup, zero server state, zero privacy surface.
- The user fully owns their data as a portable file they can back up, move
  between machines, or delete.
- The whole app ships as static files.

## Architecture

The shell is deliberately thin: a gate, a menu, a save/load header. **Every
feature is an independent, self-contained module** that owns its own slice of
the save file and every operation on that slice. Features don't import each
other and the shell doesn't know their internals.

```
src/
  db/types.ts        save-file shape, parsing, serializing
  db/useDb.ts        in-memory state + dirty flag + save/open/close
  shell/Gate.tsx     new user vs. existing user
  shell/Menu.tsx     feature menu
  features/registry.ts   one row per feature (title, blurb, ready?)
  features/<feature>/    the feature itself — data.ts + its components
```

Adding a feature = a new folder, one row in `registry.ts`, one slice in
`features` on the save file. Nothing else changes.

The save file:

```json
{
  "app": "winter-arc",
  "version": 1,
  "profile": { "name": "...", "startedOn": "YYYY-MM-DD" },
  "updatedAt": "ISO timestamp",
  "features": { "calorieCounter": { ... } }
}
```

Each feature parses its own slice defensively on load: bad values fall back to
defaults, malformed rows are dropped, and **unknown slices are ignored** — so a
file saved by a build with more features still opens in a build with fewer.
A file from a *newer* schema version is refused with a clear message rather than
half-loaded.

---

# Feature 1 — Calorie counter

**Not AI. Nothing is estimated, looked up, or inferred.** The user types their
own numbers; the app only stores, totals, and remembers them.

### What it does

- **Log food** — name, quantity (free text, e.g. `2 pieces`), and the three
  macros: protein, carbs, fat, in grams. All entered by the user.
- **Meals** — each entry belongs to Breakfast / Lunch / Snacks / Dinner. Each
  meal shows its own calorie and macro subtotal.
- **Calories** — the user can type calories directly. If left blank, the app
  fills in protein×4 + carbs×4 + fat×9 as a convenience. It never touches the
  macros themselves.
- **Calendar** — a month grid to log and review any date. Days with anything
  logged carry a dot. Today is highlighted.
- **Daily goals** — editable targets for calories, protein, carbs, fat, and
  water. Progress bars per goal, turning amber when over.
- **Water counter** — tappable glasses plus ±1 buttons, against a daily glass
  goal, tracked per day.

### Remembered foods (the dedupe rule)

The feature keeps a food library with **exactly one row per food**, keyed by its
normalized name (trimmed, lowercased, inner whitespace collapsed — so
`litti choka`, `Litti Choka` and `  LITTI   choka ` are all the same food).

- Logging a food inserts its row the first time and **overwrites that same row**
  afterwards — quantity and macros become whatever was logged most recently,
  and a use counter goes up. Never a second copy.
- Typing in the Food field suggests matching saved foods, showing their quantity
  and macros. Picking one fills in the whole form. Exact prefix matches rank
  first, then most-used, then most-recent.
- A food keeps the spelling it was first saved with, so re-logging it with
  different casing doesn't rewrite the saved row.
- **Saved foods** panel lists everything remembered with its use count, and can
  forget a food. Forgetting it leaves already-logged entries untouched — a log
  entry is a snapshot, independent of the library row.

### Kept lightweight on purpose

- Dependencies: React and nothing else. No date library, no UI kit, no state
  manager, no charts. The calendar and all controls are hand-rolled.
- The feature's whole data layer is pure functions in
  `features/calorie-counter/data.ts` — no React, no storage, no network. It
  works standalone and is directly testable.
- Production bundle: ~241 kB raw / ~75 kB gzipped, CSS ~8.5 kB.

---

# Feature 2 — Task Graph (Daily Connected Planner)

**Obsidian-style connected daily planning.** Tasks live on a date, connect to each other, carry optional weights and topics, and form an interactive visual graph.

### What it does

- **Daily Planning & Calendar** — plan any date, step back through history to see what was done, and track completion progress and weight effort.
- **Obsidian-Style Interactive Graph** — high-performance 60fps canvas force simulation. Nodes represent tasks sized by weight and colored by topic; edges connect dependencies. Pan, zoom, drag nodes, and hover to spotlight neighbor clusters.
- **In-Note WikiLinks (`[[Task Title]]`)** — type `[[` in task notes to autocomplete and link other tasks. Links automatically form graph connections and backlinks.
- **Backlinks (Linked Mentions)** — inspecting any task shows not only tasks it links to, but tasks that link to it.
- **Multi-Select & Grouping** — batch select multiple tasks to group under a shared topic, mark done/undone, or delete.
- **Weights & Effort** — assign optional weights (1–5) to visualize task impact and calculate daily effort points completed.
- **Zero bloat** — hand-rolled 2D canvas simulation. No D3 or heavy graph libraries; bundle remains ultra-light (~84 kB gzipped total app).

---

## Open questions (still to settle)

- **Quantity is free text** — no scaling in Calorie Counter. Changing `2 pieces` to `3 pieces` means retyping the macros. Could later store macros per unit and multiply.
- **Editing a logged entry in Calorie Counter** — currently remove and re-add.
- **Cross-day task dependencies** — tasks currently link within their daily plan. Could expand to global long-term project graphs.

## Status

- Shell + File System Access save file (`Save` & `Save as…`): built.
- Feature 1 (calorie counter): built.
- Feature 2 (Task Graph): built.
