# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start dev server (port 3000, HMR)
- `npm run build` — Production build to `dist/`
- `npm run typecheck` — TypeScript strict check (no emit)
- `npm run check` — Biome lint + format check
- `npm run check:fix` — Auto-fix biome issues

## Stack

- **React 19** with **Emotion** (`@emotion/react`) for CSS-in-JS via the `css` prop
- **TypeScript** in strict mode, targeting ES2020
- **Zustand** for state management
- **ts-pattern** for pattern matching (prefer `match()` over switch/if-else chains)
- **Rspack** with SWC loader for build/dev
- **Biome** for linting and formatting (tabs, recommended rules)

## Architecture

This is an incremental game ("AGI Rush") where players write code, execute it for cash, and progress through six tiers toward AGI.

**Entry:** `src/main.tsx` → renders `<App />` into `#root`

```
src/
├── modules/
│   ├── editor/        # Code editor, typing mechanics, code tokens
│   ├── game/          # Core game state (Zustand store), game loop, types
│   └── upgrade/       # Upgrade shop + milestone list
├── components/        # Shell components (layout, sidebar, resource bar)
└── utils/             # Pure utility functions
```

Modules are core business features — modules should NOT import from other modules (use the game store as shared state).
Each module exposes a public API through its `index.ts`.

**Game design & data specs live in `specs/`:**
- `specs/DESIGN.md` — Full game design document (read this first for context)
- `specs/data/tiers.json` — 6 progression tiers with unlock conditions
- `specs/data/upgrades.json` — All purchasable upgrades with effects
- `specs/data/ai-models.json` — 12 AI models with traits and agent setups
- `specs/data/milestones.json` — 20 achievement milestones
- `specs/data/events.json` — 12 random events with weighted probabilities
- `specs/data/balance.json` — Cost curves, pacing targets, quality decay, FLOPS allocation config
- `specs/balance-check.js` — Node script that validates game balance (see Balance Validation below)

## TypeScript Conventions

### Strict TypeScript — No Exceptions

- **Never** use `any`. No casting to `unknown` as an escape hatch.
- Prefer `type` imports: `import type { Foo } from './foo'`.
- Use interfaces for object shapes that might be extended; type aliases for unions, computed types, function signatures.

### Enum Pattern

Never use TypeScript's `enum` keyword. Use `as const` objects:

```typescript
export const UserStatusEnum = {
	active: "active",
	inactive: "inactive",
} as const;

export type UserStatusEnum = (typeof UserStatusEnum)[keyof typeof UserStatusEnum];
```

Rules:
- All enum names MUST have the `Enum` suffix.
- Use `snake_case` for enum values.

### File Naming

- **kebab-case** for all files (`resource-bar.tsx`, `game-store.ts`).
- Component files: `component-name.tsx`
- Hook files: `use-hook-name.ts`
- Type files: `types.ts`

### Pattern Matching

Use `ts-pattern` `match()` instead of switch statements or complex if-else chains (3+ conditions). Always end with `.exhaustive()` or `.otherwise()`.

### Path Aliases

- `@modules/` → `src/modules/`
- `@components/` → `src/components/`
- `@utils/` → `src/utils/`
- Within a module, use relative imports. Use aliases for cross-module or cross-layer imports.
- No deep relative imports (`../../../`) — use aliases instead.

## React Conventions

### Components

- Use Emotion's `css()` function with the `css` prop — styles are co-located in component files.
- **~100 lines smell threshold:** A component approaching 100 lines signals a need to refactor.
- Use `useMemo` for expensive computations with stable dependency arrays.
- Call all hooks unconditionally before any early returns (Rules of Hooks).

### Hooks

- One hook per file: `use-<hook-name>.ts`.
- Place in `hooks/` directory.

## Code Quality

- No dead code — if unused, delete it completely. No commented-out code.
- Prefer minimal changes — don't refactor surrounding code when fixing a bug.
- Biome enforces tab indentation and auto-organizes imports.
- `specs/`, `dist/`, and `.claude/` are excluded from biome checks.

## Balance Validation

**IMPORTANT:** After editing `specs/data/upgrades.json`, `specs/data/ai-models.json`, `specs/data/tiers.json`, or `specs/data/balance.json`, ALWAYS run the balance checker to verify game pacing:

```bash
cd specs && node balance-check.js
```

Add `--verbose` for per-tier duration breakdown. The script simulates 3 player profiles (casual 4 keys/s, average 6 keys/s, fast 9 keys/s) and checks:
- AGI reached between 33-50 minutes
- 80-150 total purchases
- Max wait between purchases ≤ 160 seconds
- All 6 tiers reached
- Each tier lasts within min/max duration bounds

If any check fails, adjust the data files and re-run until all pass. The same simulation engine is also available in-app via the GodMode panel → "Balance Sim" tab (`src/utils/balance-sim.ts`).

**Current validated targets (as of last balance pass):**
- Casual: AGI ~48 min
- Average: AGI ~45 min
- Fast: AGI ~43 min
- ~127 purchases across the game
- Longest wait ~155s (in AGI Race tier)

## Workflow

### Commits

Use [gitmoji](https://gitmoji.dev/) in commit messages:
- `🎉` Init / new component
- `✨` New feature
- `🐛` Bug fix
- `♻️` Refactor
- `🧪` Tests
- `📝` Docs
