# Unified Editor App

**Date:** 2026-03-23
**Status:** Approved

## Problem

Game configuration tooling is fragmented:
- A standalone Node server (`specs/tech-tree-server.js`) on port 3737 with 3 separate HTML editors
- GodMode panel in-app with links to external editors
- In-app SimPanel for balance simulation
- CLI `balance-check.js` for validation
- 5 of the 7 JSON data files have no editor UI at all (balance, ai-models, events, milestones, tiers)

## Solution

A standalone SPA in `tools/editor/` that consolidates all configuration tooling into one navigable app with a unified backend.

## Audience

Solo dev (Maxime). No auth, no deployment, local-only. Repo is forkable but no multi-user features needed.

## Architecture

### Backend (Express, single port 3737)

Thin REST API + static file server:

```
GET  /api/data/:file          → reads specs/data/{file}.json
PUT  /api/data/:file          → writes specs/data/{file}.json (full replace)
POST /api/balance-check       → runs balance-check.js, returns stdout + exit code
```

`:file` is one of: `tiers`, `upgrades`, `tech-tree`, `ai-models`, `balance`, `events`, `milestones`. Anything else returns 404.

PUT validates that the body is valid JSON before writing. No schema validation beyond that — editors and balance-check handle correctness.

In dev: Rspack dev server with proxy to the Express API. In "production" (local): Express serves built static files from `dist/`.

### Frontend (React 19 + Emotion + Zustand + Rspack)

Same stack as the game. Additional dependency: `@xyflow/react` for the tech tree graph.

Single SPA with persistent sidebar navigation on the left.

### Routing

Simple Zustand-based page state (no react-router). The sidebar sets `activePage` in a UI store, and `app.tsx` renders the corresponding page component. No nested routes, no URL-based routing — 8 flat pages don't need it. Deep-linking is not needed for a local dev tool.

Unsaved-changes guard: before switching `activePage`, check the current page's dirty flag in the store and show a confirm dialog if dirty.

### Balance simulation sharing

Refactor the existing `src/utils/balance-sim.ts` to accept data as function parameters instead of importing JSON at module level. Extract it to a shared location (`specs/lib/balance-sim.ts`) that both the game app and the editor import. This way there's a single source of truth for the simulation logic, and the editor can pass live-edited data from its Zustand stores.

### Edge-to-requires mapping

Dependencies in `tech-tree.json` are stored as `requires: ["node-id"]` arrays on each node. On load, edges are derived from these arrays (one edge per dependency). When edges are added/removed in the React Flow UI, the corresponding `requires` arrays are updated. No separate edges array is persisted.

### API response shapes

`POST /api/balance-check` returns:
```json
{ "stdout": "string", "stderr": "string", "exitCode": 0 }
```
Subprocess has a 30-second timeout. On timeout, returns exitCode 1 with stderr explaining the timeout.

`PUT /api/data/:file` returns:
```json
{ "ok": true }
```
On invalid JSON body: 400 with `{ "error": "Invalid JSON" }`.

### Undo system

Per-page undo stack, max 20 entries. Granularity:
- **Table pages**: one entry per row add/remove/edit (on field blur, not per keystroke)
- **Tech Tree**: one entry per node move, edge create/remove, or property edit
- **Form pages** (Balance, Tiers): one entry per field change (on blur)

Undoing back to the last-saved state clears the dirty flag.

## Pages

| Page | View type | Data file | Key interactions |
|---|---|---|---|
| Tech Tree | Visual node graph (React Flow) | tech-tree.json | Drag nodes, click to inspect/edit, draw edges, add/remove nodes |
| Upgrades | Table grouped by tier | upgrades.json | Inline editing, add/remove rows, filter/search |
| AI Models | Table | ai-models.json | Edit costs, locPerSec, flopsCost, traits |
| Events | Table | events.json | Edit probability weights, durations, effects |
| Milestones | Table | milestones.json | Edit thresholds and descriptions |
| Tiers | Table/form | tiers.json | Edit unlock conditions, cashPerLoc multipliers |
| Balance | Form | balance.json | Edit cost curves, pacing targets, starting values |
| Simulation | Charts + controls | (reads all files) | Profile selector, run sim, pass/fail, charts |

### Shared patterns across pages

- Fetch data from API on mount, hold in Zustand store
- Dirty state tracking — unsaved indicator in the sidebar
- Save button per page (PUT to API)
- Undo via ctrl+z (keep last 10 states in memory)
- Toast notifications for save success/failure
- Confirmation prompt when navigating away with unsaved changes

### Tech Tree Editor (detailed)

- Custom React Flow node components showing: name, tier badge, type icon, cost
- Click node → inspector panel on the right for editing all properties
- Edges = dependencies. Drag handle-to-handle to create, click + delete to remove
- Background grid with snap-to-grid
- Minimap in corner
- Node palette/library panel — drag new nodes onto canvas
- Positions: reads `x`/`y` from tech-tree.json, writes back on drag-end
- "Re-layout" button runs dagre on current graph (doesn't auto-layout on load)

### Simulation page

- Runs balance simulation client-side (port of balance-sim.ts logic)
- Profile selector (casual/average/fast + custom)
- Charts: cash/LoC curves, tier timeline, purchase density
- Can also trigger canonical CLI check via `POST /api/balance-check`

## File structure

```
tools/editor/
├── package.json
├── tsconfig.json
├── rspack.config.ts
├── server.ts              # Express backend
├── src/
│   ├── main.tsx           # Entry point
│   ├── app.tsx            # Layout + router
│   ├── store/             # Zustand stores (one per data file + UI state)
│   ├── api/               # API client helpers
│   ├── components/
│   │   ├── sidebar.tsx
│   │   ├── toast.tsx
│   │   └── shared/        # Reusable table, form, undo infrastructure
│   └── pages/
│       ├── tech-tree/     # React Flow graph + inspector
│       ├── upgrades/
│       ├── ai-models/
│       ├── events/
│       ├── milestones/
│       ├── tiers/
│       ├── balance/
│       └── simulation/
└── dist/                  # Built output
```

## What this replaces

- `specs/tech-tree-server.js` — replaced by `tools/editor/server.ts`
- `specs/tech-tree-editor.html` — replaced by Tech Tree page
- `specs/items-editor.html` — replaced by Upgrades page
- `specs/feedback-editor.html` — dropped (low value, feedback goes in git issues)
- GodMode panel links to external editors — can point to new editor or be removed
- `specs/simulator.html` — already superseded, can be removed

The in-app SimPanel and GodMode cheats panel remain in the game (they serve different purposes — runtime cheats vs. data authoring).

## NPM script

From the repo root:

```bash
npm run editor    # starts the editor dev server on port 3737
```

The editor is a standalone project with its own `package.json` and `node_modules`. The root `npm run editor` script runs `cd tools/editor && npm run dev`. First-time setup requires `cd tools/editor && npm install`.

The existing `tree-editor` script in the root `package.json` should be removed and replaced with `editor`.

## Non-goals

- No authentication or multi-user support
- No hot-reload of game when JSON changes (manual refresh)
- No schema validation beyond valid JSON (editors enforce structure)
- No version history (git handles that)
