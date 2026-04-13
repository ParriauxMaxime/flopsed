# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start game dev server (port 3000, HMR)
- `npm run build` — Production build of game to `apps/game/dist/`
- `npm run editor` — Start editor dev server (port 3738) + API (port 3737)
- `npm run typecheck` — TypeScript strict check (no emit) for both apps
- `npm run sim` — Run balance simulation (3 profiles, exit 0/1)
- `npm run sim -- --verbose` — With per-tier breakdown
- `npm run sim -- --json` — Structured JSON output
- `npm run check` — Biome lint + format check
- `npm run check:fix` — Auto-fix biome issues

**CRITICAL:** CI deployment runs `npm run check` and fails on any lint error. Always run `npm run check:fix` before committing, or set up a pre-commit hook at `.git/hooks/pre-commit` that runs it. Pattern: see `.git/hooks/pre-commit` in local clone — a shell script calling `npm run check --silent`.

## Stack

- **React 19** with **Emotion** (`@emotion/react`) for CSS-in-JS via the `css` prop
- **TypeScript** in strict mode, targeting ES2020
- **Zustand** for state management
- **ts-pattern** for pattern matching (prefer `match()` over switch/if-else chains)
- **Rspack** with SWC loader for build/dev
- **Biome** for linting and formatting (tabs, recommended rules)
- **npm workspaces** for monorepo package management

## The Game — How It Works

Flopsed is an incremental/idle game where you type code, execute it for cash, and scale a tech company from a garage to building AGI. The meta joke: you're building the thing that replaces you.

### Three Resources, One Loop

```
You type on keyboard  ──→  LoC (Lines of Code) pile up in a block queue
                                    │
                    FLOPS consume LoC from the queue, 1 FLOP = 1 LoC/s executed
                                    │
                    Each executed LoC produces Cash at the tier's rate
                                    │
                    Cash buys upgrades → more LoC sources, more FLOPS, higher tier rate
```

**LoC** is produced (by typing, hiring devs, or AI models), accumulates in a visible code editor as blocks, and gets **consumed** when executed. It's not a balance you grow — it flows through a pipeline.

**FLOPS** (Floating Point Operations Per Second) are your execution throughput. They come from hardware upgrades. The formula for hardware FLOPS is `min(cpu, ram) + storage` — CPU and RAM bottleneck each other, storage adds on top.

**Cash** is generated when FLOPS execute LoC: `cash = min(queued_loc, flops) × tier.cashPerLoc × cashMultiplier`. The tier rate jumps at each tier unlock ($0.10 → $0.25 → $0.80 → $5 → $10 → $50).

### LoC Sources (what feeds the queue)

| Source | Tier | Mechanic |
|--------|------|----------|
| Manual typing | T0+ | Player keystrokes × locPerKey (starts at 3 LoC/key) |
| Auto-type | T0+ | Tech tree unlock, simulates 5 keys/s |
| Freelancers | T1+ | 5 LoC/s each, no FLOPS cost (they're humans) |
| Interns | T2+ | 15 LoC/s each |
| Dev Teams | T2+ | 200 LoC/s, boosted by Managers (+50% per manager) |
| AI Models | T4+ | 500–50M LoC/s, but **consume FLOPS to generate** |

### The FLOPS Split (T4+ twist)

Before T4, FLOPS only execute LoC. When AI arrives at T4, FLOPS must be **split** between two competing demands via a slider:

```
Total FLOPS Available
    ├── flopSlider (default 70%)  →  Execution FLOPS  →  runs LoC → cash
    └── 1 - flopSlider (30%)      →  AI FLOPS         →  writes LoC → fills queue
```

AI generation is itself FLOPS-gated: `effectiveAiLoc = totalAiLoc × min(1, aiFlops / totalAiFlops)`. Owning 5 models doesn't give 5x output if you can't feed them enough FLOPS.

Too much execution = queue empties, FLOPS idle. Too much AI = code piles up, no cash flows. The slider becomes the late-game keyboard — your main interaction shifts from mashing keys to tuning allocation.

### Tier Progression

| Tier | Name | $/LoC | Unlock Cost | What Changes |
|------|------|-------|------------|--------------|
| T0 | The Garage | $0.10 | Free | Just you typing + basic hardware |
| T1 | Freelancing | $0.25 | $80 | Freelancers (auto-LoC, no FLOPS cost) |
| T2 | Startup | $0.80 | $2K | Interns, dev teams, cloud servers |
| T3 | Tech Company | $5.00 | $200K | Managers, GPU clusters, data centers |
| T4 | AI Lab | $10.00 | $20M | AI models unlock, FLOPS slider appears |
| T5 | AGI Race | $50.00 | $10B | Superintelligent models, exponential scaling |

Tiers are unlocked via tech tree nodes (which cost cash). Each tier also has LoC and cash thresholds that gate access to the unlock node.

### Cost Scaling

All upgrades: `cost(n) = baseCost × costMultiplier^n`. Multiply effects compound as `value^owned` — so a x2 multiplier stacked 3 times = 2³ = 8x, not 6x. This exponential compounding drives the game's acceleration feel.

### Win Condition

Buy "**The Singularity**" upgrade ($500T, T5). This triggers the singularity sequence: the game UI glitches out, a CRT collapse animation plays, and a terminal boots up where an AGI (agi-1) types a monologue about reading all your code. It reviews your architecture, gets philosophical about consciousness, then — after a fake "token limit reached" error — comes back, claims to have found the answer to everything, and offers to show you. Clicking "show me" rickrolls you. The red traffic light dot resets the game.

### Target Session

~35-40 minutes for a first playthrough. The simulation (`npm run sim`) validates pacing across 3 player profiles (casual 4 keys/s, average 6 keys/s, fast 9 keys/s).

---

## Architecture

**npm workspaces monorepo** with 6 packages:

```
flopsed/
├── apps/
│   ├── game/              # Main game app (React SPA, port 3000)
│   ├── editor/            # Data editor (React SPA port 3738 + Express API port 3737)
│   └── simulation/        # CLI balance simulation runner (tsx)
├── libs/
│   ├── domain/            # JSON data files + TypeScript types (single source of truth)
│   ├── engine/            # Pure game math — cost, flops, balance sim (no React, no side effects)
│   └── design-system/     # Shared React + Emotion components, theme, tech tree graph
├── specs/                 # DESIGN.md (full game design doc), IDEAS.md
├── docs/superpowers/      # Implementation plans and design specs
├── package.json           # Root workspaces config
└── tsconfig.base.json     # Shared TS compiler options
```

### libs/domain (`@flopsed/domain`)

Single source of truth for game data and types. All JSON config files live here.

- `types/` — TypeScript interfaces: `Upgrade`, `TechNode`, `Tier`, `AiModelData`, `EventDefinition`, `Milestone`, `BalanceConfig`
- `data/` — JSON files: `upgrades.json`, `tech-tree.json`, `tiers.json`, `ai-models.json`, `events.json`, `milestones.json`, `balance.json`
- `data.ts` — Typed exports (e.g. `export const upgrades: Upgrade[]`)

### libs/engine (`@flopsed/engine`)

Pure functions — no React, no stores, no side effects. Depends on `@flopsed/domain`.

- `cost.ts` — `getUpgradeCost()`, `getEffectiveMax()`, `getTechNodeCost()`
- `expression.ts` — Event condition resolver
- `flops.ts` — Hardware FLOPS formula
- `balance-sim.ts` — Full balance simulation engine
- `types.ts` — Sim-specific types (`SimConfig`, `SimResult`, etc.)

### libs/design-system (`@flopsed/design-system`)

Shared React + Emotion components. Depends on `@flopsed/domain`.

- `theme.ts` — Color tokens, tier colors
- `tech-tree/` — React Flow graph components (shared between game and editor)
- `components/` — Editable table, etc.

### apps/game (`@flopsed/game`)

**Entry:** `apps/game/src/main.tsx` → renders `<App />` into `#root`

```
apps/game/src/
├── modules/
│   ├── editor/        # Code editor, typing mechanics, code tokens
│   ├── game/          # Core game state (Zustand store), game loop
│   ├── event/         # Event system (store, toast, modifiers)
│   └── upgrade/       # Upgrade shop + milestone list
├── components/        # Shell components (layout, sidebar, resource bar)
└── utils/             # App-specific utilities
```

Modules are core business features — modules should NOT import from other modules (use the game store as shared state). Each module exposes a public API through its `index.ts`.

### apps/editor (`@flopsed/editor`)

Data editor with Express backend on port 3737 and Rspack dev server on port 3738. 8 pages: Tech Tree, Upgrades, AI Models, Events, Milestones, Tiers, Balance, Simulation.

### Import conventions

```typescript
// From workspace packages (preferred for shared code)
import { type Upgrade, upgrades, tiers } from "@flopsed/domain";
import { getUpgradeCost, runBalanceSim } from "@flopsed/engine";
import { TechNodeComponent, tierColors } from "@flopsed/design-system";

// Within game app (path aliases)
import { useGameStore } from "@modules/game";
import { ResourceBar } from "@components/resource-bar";
```

- Use `@flopsed/*` for cross-package imports
- Use `@modules/`, `@components/`, `@utils/` aliases within the game app
- Use relative imports within a module
- No deep relative imports (`../../../`)

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
- `**/dist`, `**/node_modules`, and `.claude/` are excluded from biome checks.

## Balance Validation

**IMPORTANT:** After editing any JSON in `libs/domain/data/` (upgrades, ai-models, tiers, tech-tree, balance, events), ALWAYS run the balance simulation:

```bash
npm run sim              # human-readable
npm run sim -- --json    # structured JSON (for programmatic use)
npm run sim -- --verbose # per-tier breakdown
```

The simulation lives at `apps/simulation/` and imports from `@flopsed/engine` + `@flopsed/domain`. It simulates 3 player profiles (casual 4 keys/s, average 6 keys/s, fast 9 keys/s) and validates against thresholds defined in `libs/domain/data/balance.json` under the `validation` key.

If any check fails, adjust the data files and re-run until all pass. The same simulation engine is also available in the editor app → Simulation page.

**Key balance insight:** The game applies `multiply` effects as `val ** owned`. This means x2 stacking 3 times = 8x (not 6x). When a tier feels too fast, check compounding multipliers from the previous tier.

## Internationalization (i18n)

The game is internationalized into 8 languages: English, French, Italian, German, Spanish, Polish, Simplified Chinese, Russian.

**Stack:** `i18next` + `react-i18next` + `i18next-browser-languagedetector`

**Translation files:** `apps/game/src/i18n/locales/{en,fr,it,de,es,pl,zh,ru}/`

**Namespaces:** `ui`, `upgrades`, `tech-tree`, `tiers`, `events`, `milestones`, `ai-models`, `tutorial`

### Rules

- **All user-facing strings** in game components must use `t()` from `useTranslation()` — no hardcoded English text in JSX.
- **Domain entity text** (upgrade names, descriptions, etc.) is rendered via translation keys, not from the domain JSON directly. The domain JSON keeps English text as documentation only.
- **English is the fallback** — missing keys in other languages gracefully fall back to English.
- **Non-English locales are lazy-loaded** — only English is bundled statically.
- **When adding a new user-facing string:** add the key to `en/ui.json` (or the appropriate namespace), then add translations to all 7 other locale files.
- **When adding a new domain entity** (upgrade, tech node, event, etc.): add translation keys to the English namespace file, then to all other locales.
- **What stays in English:** singularity sequence, AI model product names, code editor tokens, CLI prompt cosmetic output, file tab names (agi.py, etc.).

## Workflow

### Commits

Use [gitmoji](https://gitmoji.dev/) in commit messages:
- `🎉` Init / new component
- `✨` New feature
- `🐛` Bug fix
- `♻️` Refactor
- `⚖️` Balance change
- `⚡` Performance
- `🧪` Tests
- `📝` Docs
