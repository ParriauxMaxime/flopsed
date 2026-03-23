# Unified Editor App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate all game configuration tooling (tech tree editor, items editor, balance sim, balance checker) into a single SPA at `tools/editor/` with an Express backend.

**Architecture:** Standalone React SPA with Express backend on port 3737. Backend serves REST API for reading/writing `specs/data/*.json` files and running `balance-check.js`. Frontend uses Zustand stores (one per data file), React Flow for the tech tree graph, and a sidebar for page navigation. The balance simulation engine (`balance-sim.ts`) is extracted to a shared location so both the game and editor import the same module.

**Tech Stack:** React 19, Emotion, Zustand, TypeScript strict, Rspack, Express, @xyflow/react, dagre

**Spec:** `docs/superpowers/specs/2026-03-23-unified-editor-app-design.md`

---

## Phase 1: Foundation

### Task 1: Extract balance-sim to shared location

Refactor `balance-sim.ts` so both the game and the editor can import it. Currently it imports JSON data at module level — change it to accept data as parameters.

**Files:**
- Create: `specs/lib/balance-sim.ts`
- Create: `specs/lib/types.ts`
- Modify: `src/utils/balance-sim.ts` (rewrite as thin wrapper)
- Modify: `src/components/sim/sim-panel.tsx` (update import if needed)

- [ ] **Step 1: Create shared types**

Create `specs/lib/types.ts` with the simulation types extracted from `src/utils/balance-sim.ts`:

```typescript
export const AiStrategyEnum = {
	balanced: "balanced",
	exec_heavy: "exec_heavy",
	ai_heavy: "ai_heavy",
} as const;
export type AiStrategyEnum =
	(typeof AiStrategyEnum)[keyof typeof AiStrategyEnum];

export const PurchaseTypeEnum = {
	upgrade: "upgrade",
	tier: "tier",
	tech: "tech",
	ai: "ai",
} as const;
export type PurchaseTypeEnum =
	(typeof PurchaseTypeEnum)[keyof typeof PurchaseTypeEnum];

export interface SimConfig {
	keysPerSec: number;
	skill: number;
	aiStrategy: AiStrategyEnum;
	maxMinutes: number;
}

export interface SimSnapshot {
	time: number;
	cash: number;
	loc: number;
	flops: number;
	quality: number;
	locPerSec: number;
	cashPerSec: number;
	tier: number;
}

export interface SimPurchase {
	time: number;
	type: PurchaseTypeEnum;
	name: string;
}

export interface SimLogEntry {
	time: number;
	type: string;
	msg: string;
	cash: number;
	loc: number;
	flops: number;
}

export interface SimResult {
	agiTime: number | null;
	endTime: number;
	purchaseCount: number;
	longestWait: number;
	tierTimes: Record<number, number>;
	totalCash: number;
	totalLoc: number;
	finalTier: number;
	finalQuality: number;
	aiModelsOwned: number;
	passed: boolean;
	failures: string[];
	snapshots: SimSnapshot[];
	log: SimLogEntry[];
	purchases: SimPurchase[];
}

// ── Internal data interfaces used by the sim engine ──

export interface SimEventEffect {
	type: string;
	op?: string;
	value?: number | string;
	threshold?: string;
	reward?: string;
	upgradeId?: string;
	options?: Array<{
		label: string;
		effect: {
			type: string;
			op?: string;
			value?: number | string;
			duration?: number;
		};
	}>;
}

export interface SimEvent {
	id: string;
	name: string;
	minTier: string;
	duration: number;
	effects: SimEventEffect[];
	interaction?: { type: string; reductionPerKey: number };
	weight: number;
}

export interface AiModel {
	id: string;
	name: string;
	version: string;
	locPerSec: number;
	flopsCost: number;
	cost: number;
	requires?: string;
}

export interface TechNodeData {
	id: string;
	name: string;
	requires: string[];
	max: number;
	baseCost: number;
	costMultiplier: number;
	currency: string;
	effects: Array<{ type: string; op: string; value: number | boolean | string }>;
}

export interface UpgradeData {
	id: string;
	tier: string;
	name: string;
	baseCost: number;
	costMultiplier: number;
	max: number;
	costCategory?: string;
	effects: Array<{ type: string; op: string; value: number | boolean | string }>;
}

/** Raw data shapes the sim needs — mirrors the JSON file structures */
export interface SimData {
	tiers: Array<{ id: string; index: number; cashPerLoc: number; locRequired: number; cashRequired: number; cost: number }>;
	upgrades: UpgradeData[];
	techTree: { nodes: TechNodeData[] };
	aiModels: { models: AiModel[]; agentSetups: unknown[] };
	balance: { core: Record<string, unknown>; flopsAllocation?: Record<string, unknown>; [key: string]: unknown };
	events: { events: SimEvent[]; eventConfig: { minIntervalSeconds: number; maxIntervalSeconds: number; maxConcurrent: number } };
}
```

- [ ] **Step 2: Create shared balance-sim module**

Create `specs/lib/balance-sim.ts`. Copy the logic from `src/utils/balance-sim.ts` but change the signature to accept a `SimData` parameter instead of importing JSON at module level:

```typescript
import type { SimConfig, SimData, SimResult } from "./types";

export function runBalanceSim(
	data: SimData,
	config: Partial<SimConfig> = {},
): SimResult {
	// ... same simulation logic, but use data.tiers, data.upgrades, etc.
	// instead of imported JSON constants
}
```

Move ALL the simulation logic. The function should be fully self-contained given `data` and `config`.

- [ ] **Step 3: Rewrite src/utils/balance-sim.ts as thin wrapper**

Replace the contents of `src/utils/balance-sim.ts` with a wrapper that imports JSON and delegates:

```typescript
import aiModelsData from "../../specs/data/ai-models.json";
import balanceData from "../../specs/data/balance.json";
import eventsData from "../../specs/data/events.json";
import techTreeData from "../../specs/data/tech-tree.json";
import tiersData from "../../specs/data/tiers.json";
import upgradesData from "../../specs/data/upgrades.json";
import { runBalanceSim as runSim } from "../../specs/lib/balance-sim";
import type { SimData } from "../../specs/lib/types";

export type { SimConfig, SimResult, SimSnapshot, SimLogEntry, SimPurchase } from "../../specs/lib/types";
export { AiStrategyEnum, PurchaseTypeEnum } from "../../specs/lib/types";

const data: SimData = {
	tiers: tiersData.tiers,
	upgrades: upgradesData.upgrades,
	techTree: techTreeData,
	aiModels: aiModelsData,
	balance: balanceData,
	events: eventsData,
};

export function runBalanceSim(config: Partial<import("../../specs/lib/types").SimConfig> = {}) {
	return runSim(data, config);
}
```

- [ ] **Step 4: Update game tsconfig.json**

The game's `tsconfig.json` has `"include": ["src", "specs/data"]`. Add `"specs/lib"` so the TypeScript compiler can find the shared module:

```json
"include": ["src", "specs/data", "specs/lib"]
```

- [ ] **Step 5: Verify game still builds and sim works**

Run:
```bash
npm run typecheck && npm run build
```
Expected: no errors. The game's imports of `balance-sim.ts` should still work unchanged since the wrapper re-exports everything.

- [ ] **Step 6: Commit**

```bash
git add specs/lib/ src/utils/balance-sim.ts tsconfig.json
git commit -m "♻️ Extract balance-sim to specs/lib for sharing with editor app"
```

---

### Task 2: Scaffold editor app

Set up the `tools/editor/` project with package.json, tsconfig, Rspack config, and entry point.

**Files:**
- Create: `tools/editor/package.json`
- Create: `tools/editor/tsconfig.json`
- Create: `tools/editor/rspack.config.ts`
- Create: `tools/editor/src/main.tsx`
- Create: `tools/editor/src/app.tsx`
- Create: `tools/editor/index.html`
- Modify: `package.json` (root — add `editor` script, remove `tree-editor`)

- [ ] **Step 1: Create package.json**

Create `tools/editor/package.json`:

```json
{
	"name": "agi-rush-editor",
	"private": true,
	"type": "module",
	"scripts": {
		"dev": "concurrently \"rspack serve\" \"tsx server.ts\"",
		"build": "rspack build",
		"server": "tsx server.ts"
	},
	"dependencies": {
		"@emotion/react": "^11.14.0",
		"@xyflow/react": "^12.0.0",
		"cors": "^2.8.5",
		"express": "^5.1.0",
		"react": "^19.1.0",
		"react-dom": "^19.1.0",
		"ts-pattern": "^5.7.0",
		"zustand": "^5.0.5"
	},
	"devDependencies": {
		"@rspack/cli": "^1.3.12",
		"@rspack/core": "^1.3.12",
		"@rspack/plugin-react-refresh": "^1.0.1",
		"@types/express": "^5.0.2",
		"@types/react": "^19.1.2",
		"@types/react-dom": "^19.1.2",
		"concurrently": "^9.1.2",
		"react-refresh": "^0.17.0",
		"tsx": "^4.19.4",
		"typescript": "^5.8.3"
	}
}
```

- [ ] **Step 2: Create tsconfig.json**

Create `tools/editor/tsconfig.json`:

```json
{
	"compilerOptions": {
		"target": "ES2020",
		"module": "ESNext",
		"moduleResolution": "bundler",
		"jsx": "react-jsx",
		"jsxImportSource": "@emotion/react",
		"strict": true,
		"esModuleInterop": true,
		"skipLibCheck": true,
		"forceConsistentCasingInFileNames": true,
		"resolveJsonModule": true,
		"isolatedModules": true,
		"noEmit": true,
		"paths": {
			"@shared/*": ["../../specs/lib/*"]
		}
	},
	"include": ["src/**/*", "../../specs/lib/**/*"]
}
```

- [ ] **Step 3: Create rspack.config.ts**

Create `tools/editor/rspack.config.ts`:

```typescript
import path from "node:path";
import { defineConfig } from "@rspack/cli";
import { HtmlRspackPlugin, type RspackPluginFunction } from "@rspack/core";
import RefreshPlugin from "@rspack/plugin-react-refresh";

const isDev = process.env.NODE_ENV !== "production";

export default defineConfig({
	entry: "./src/main.tsx",
	output: {
		path: path.resolve(import.meta.dirname, "dist"),
		publicPath: "/",
		clean: true,
	},
	resolve: {
		extensions: [".ts", ".tsx", ".js", ".json"],
		alias: {
			"@shared": path.resolve(import.meta.dirname, "../../specs/lib"),
		},
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: {
					loader: "builtin:swc-loader",
					options: {
						jsc: {
							parser: { syntax: "typescript", tsx: true },
							transform: {
								react: {
									runtime: "automatic",
									importSource: "@emotion/react",
									development: isDev,
									refresh: isDev,
								},
							},
						},
					},
				},
				type: "javascript/auto",
			},
			{
				test: /\.css$/,
				type: "css",
			},
		],
	},
	plugins: [
		new HtmlRspackPlugin({
			template: "./index.html",
		}) as unknown as RspackPluginFunction,
		...(isDev ? [new RefreshPlugin()] : []),
	],
	devServer: {
		port: 3738,
		hot: true,
		historyApiFallback: true,
		proxy: [
			{
				context: ["/api"],
				target: "http://localhost:3737",
			},
		],
	},
});
```

Note: Dev server on 3738, API proxy to Express on 3737. Uses `HtmlRspackPlugin` to inject script tags (matches game's pattern). CSS rule included for `@xyflow/react/dist/style.css`.

- [ ] **Step 4: Create index.html**

Create `tools/editor/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>AGI Rush Editor</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #e0e0e0; }
		#root { height: 100vh; width: 100vw; }
	</style>
</head>
<body>
	<div id="root"></div>
</body>
</html>
```

- [ ] **Step 5: Create main.tsx and app.tsx stubs**

Create `tools/editor/src/main.tsx`:

```tsx
import { createRoot } from "react-dom/client";
import { App } from "./app";

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
```

Create `tools/editor/src/app.tsx`:

```tsx
import { css } from "@emotion/react";

export function App() {
	return (
		<div css={css`display: flex; height: 100vh;`}>
			<div css={css`width: 200px; background: #16213e; padding: 16px;`}>
				<h2 css={css`font-size: 14px; margin-bottom: 16px;`}>AGI Rush Editor</h2>
				<p css={css`color: #888; font-size: 12px;`}>Pages coming soon</p>
			</div>
			<div css={css`flex: 1; padding: 24px;`}>
				<h1>Editor</h1>
				<p>Select a page from the sidebar.</p>
			</div>
		</div>
	);
}
```

- [ ] **Step 6: Update root package.json**

In the root `package.json`, replace the `tree-editor` script with `editor`:

```json
"editor": "cd tools/editor && npm run dev"
```

- [ ] **Step 7: Install dependencies and verify**

```bash
cd tools/editor && npm install && cd ../..
npm run editor
```

Expected: dev server starts on 3738 (frontend) and 3737 (API — will fail until Task 3, that's fine). The SPA loads with the stub layout.

Kill the server after verifying.

- [ ] **Step 8: Commit**

```bash
git add tools/editor/ package.json
git commit -m "🎉 Scaffold unified editor app at tools/editor"
```

---

### Task 3: Express backend

Implement the API server that reads/writes JSON files and runs balance-check.

**Files:**
- Create: `tools/editor/server.ts`

- [ ] **Step 1: Create server.ts**

Create `tools/editor/server.ts`:

```typescript
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import cors from "cors";
import express from "express";

const app = express();
const PORT = 3737;

const SPECS_DIR = path.resolve(import.meta.dirname, "../../specs/data");
const BALANCE_CHECK = path.resolve(import.meta.dirname, "../../specs/balance-check.js");

const ALLOWED_FILES = new Set([
	"tiers",
	"upgrades",
	"tech-tree",
	"ai-models",
	"balance",
	"events",
	"milestones",
]);

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Serve static files in production
app.use(express.static(path.resolve(import.meta.dirname, "dist")));

app.get("/api/data/:file", async (req, res) => {
	const file = req.params.file;
	if (!ALLOWED_FILES.has(file)) {
		res.status(404).json({ error: "Unknown file" });
		return;
	}
	try {
		const content = await fs.readFile(path.join(SPECS_DIR, `${file}.json`), "utf-8");
		res.json(JSON.parse(content));
	} catch (err) {
		res.status(500).json({ error: `Failed to read ${file}.json` });
	}
});

app.put("/api/data/:file", async (req, res) => {
	const file = req.params.file;
	if (!ALLOWED_FILES.has(file)) {
		res.status(404).json({ error: "Unknown file" });
		return;
	}
	try {
		const json = JSON.stringify(req.body, null, "\t");
		await fs.writeFile(path.join(SPECS_DIR, `${file}.json`), `${json}\n`);
		res.json({ ok: true });
	} catch {
		res.status(400).json({ error: "Invalid JSON" });
	}
});

app.post("/api/balance-check", (_req, res) => {
	execFile("node", [BALANCE_CHECK], { timeout: 30_000, cwd: path.dirname(BALANCE_CHECK) }, (err, stdout, stderr) => {
		const exitCode = err && "status" in err ? (err as { status: number }).status : err ? 1 : 0;
		res.json({ stdout, stderr, exitCode });
	});
});

// SPA fallback
app.get("*", (_req, res) => {
	res.sendFile(path.resolve(import.meta.dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
	console.log(`Editor API running on http://localhost:${PORT}`);
});
```

- [ ] **Step 2: Verify server starts**

```bash
cd tools/editor && npx tsx server.ts &
curl http://localhost:3737/api/data/tiers | head -c 200
kill %1
```

Expected: returns the first 200 chars of tiers.json content.

- [ ] **Step 3: Commit**

```bash
git add tools/editor/server.ts
git commit -m "✨ Add Express backend for editor API"
```

---

### Task 4: API client & Zustand stores

Create the frontend data layer: API client helpers and one Zustand store per data file with dirty tracking and undo.

**Files:**
- Create: `tools/editor/src/api/client.ts`
- Create: `tools/editor/src/store/data-store.ts`
- Create: `tools/editor/src/store/ui-store.ts`

- [ ] **Step 1: Create API client**

Create `tools/editor/src/api/client.ts`:

```typescript
const BASE = "/api";

export async function fetchData<T>(file: string): Promise<T> {
	const res = await fetch(`${BASE}/data/${file}`);
	if (!res.ok) throw new Error(`Failed to fetch ${file}`);
	return res.json();
}

export async function saveData(file: string, data: unknown): Promise<void> {
	const res = await fetch(`${BASE}/data/${file}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: "Unknown error" }));
		throw new Error(err.error);
	}
}

export interface BalanceCheckResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export async function runBalanceCheck(): Promise<BalanceCheckResult> {
	const res = await fetch(`${BASE}/balance-check`, { method: "POST" });
	return res.json();
}
```

- [ ] **Step 2: Create generic data store factory**

Create `tools/editor/src/store/data-store.ts`. This creates one Zustand store per data file with undo and dirty tracking:

```typescript
import { create } from "zustand";
import { fetchData, saveData } from "../api/client";

const MAX_UNDO = 20;

interface DataStoreState<T> {
	data: T | null;
	savedData: T | null;
	undoStack: T[];
	loading: boolean;
	dirty: boolean;
	error: string | null;
	load: () => Promise<void>;
	save: () => Promise<void>;
	update: (data: T) => void;
	undo: () => void;
}

export function createDataStore<T>(file: string) {
	return create<DataStoreState<T>>((set, get) => ({
		data: null,
		savedData: null,
		undoStack: [],
		loading: false,
		dirty: false,
		error: null,

		load: async () => {
			set({ loading: true, error: null });
			try {
				const data = await fetchData<T>(file);
				set({ data, savedData: data, loading: false, dirty: false, undoStack: [] });
			} catch (err) {
				set({ error: String(err), loading: false });
			}
		},

		save: async () => {
			const { data } = get();
			if (!data) return;
			try {
				await saveData(file, data);
				set({ savedData: data, dirty: false, error: null });
			} catch (err) {
				set({ error: String(err) });
			}
		},

		update: (data: T) => {
			const { data: prev, undoStack } = get();
			if (!prev) {
				set({ data, dirty: true });
				return;
			}
			const newStack = [...undoStack, prev].slice(-MAX_UNDO);
			const { savedData } = get();
			const dirty = JSON.stringify(data) !== JSON.stringify(savedData);
			set({ data, undoStack: newStack, dirty });
		},

		undo: () => {
			const { undoStack, savedData } = get();
			if (undoStack.length === 0) return;
			const prev = undoStack[undoStack.length - 1];
			const newStack = undoStack.slice(0, -1);
			const dirty = JSON.stringify(prev) !== JSON.stringify(savedData);
			set({ data: prev, undoStack: newStack, dirty });
		},
	}));
}
```

- [ ] **Step 3: Create concrete store instances**

Add to the bottom of `tools/editor/src/store/data-store.ts`:

```typescript
// One store per data file
export const useTiersStore = createDataStore<{ tiers: unknown[] }>("tiers");
export const useUpgradesStore = createDataStore<{ upgrades: unknown[] }>("upgrades");
export const useTechTreeStore = createDataStore<{ nodes: unknown[] }>("tech-tree");
export const useAiModelsStore = createDataStore<{
	models: unknown[];
	agentSetups: unknown[];
}>("ai-models");
export const useBalanceStore = createDataStore<Record<string, unknown>>("balance");
export const useEventsStore = createDataStore<{
	events: unknown[];
	eventConfig: Record<string, unknown>;
}>("events");
export const useMilestonesStore = createDataStore<{
	milestones: unknown[];
}>("milestones");
```

- [ ] **Step 4: Create UI store**

Create `tools/editor/src/store/ui-store.ts`:

```typescript
import { create } from "zustand";
import {
	useAiModelsStore, useBalanceStore, useEventsStore,
	useMilestonesStore, useTechTreeStore, useTiersStore, useUpgradesStore,
} from "./data-store";

export const PageEnum = {
	tech_tree: "tech_tree",
	upgrades: "upgrades",
	ai_models: "ai_models",
	events: "events",
	milestones: "milestones",
	tiers: "tiers",
	balance: "balance",
	simulation: "simulation",
} as const;
export type PageEnum = (typeof PageEnum)[keyof typeof PageEnum];

interface UiState {
	activePage: PageEnum;
	setPage: (page: PageEnum) => void;
	toasts: { id: number; message: string; type: "success" | "error" }[];
	addToast: (message: string, type: "success" | "error") => void;
	removeToast: (id: number) => void;
}

let toastId = 0;

export const useUiStore = create<UiState>((set) => ({
	activePage: PageEnum.tech_tree,
	setPage: (page) => {
		// Unsaved-changes guard: check all data stores for dirty state
		const stores = [
			useTiersStore, useUpgradesStore, useTechTreeStore,
			useAiModelsStore, useBalanceStore, useEventsStore, useMilestonesStore,
		];
		const hasDirty = stores.some((s) => s.getState().dirty);
		if (hasDirty && !window.confirm("You have unsaved changes. Navigate away?")) return;
		set({ activePage: page });
	},
	toasts: [],
	addToast: (message, type) => {
		const id = ++toastId;
		set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
		setTimeout(() => {
			set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
		}, 3000);
	},
	removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
```

- [ ] **Step 5: Commit**

```bash
git add tools/editor/src/api/ tools/editor/src/store/
git commit -m "✨ Add API client, data stores with undo, and UI store"
```

---

## Phase 2: Shell & Navigation

### Task 5: Sidebar, toast, and app shell

Build the sidebar navigation with dirty indicators, toast system, and page routing.

**Files:**
- Create: `tools/editor/src/components/sidebar.tsx`
- Create: `tools/editor/src/components/toast.tsx`
- Modify: `tools/editor/src/app.tsx`

- [ ] **Step 1: Create sidebar**

Create `tools/editor/src/components/sidebar.tsx`:

```tsx
import { css } from "@emotion/react";
import { PageEnum, useUiStore } from "../store/ui-store";
import {
	useAiModelsStore,
	useBalanceStore,
	useEventsStore,
	useMilestonesStore,
	useTechTreeStore,
	useTiersStore,
	useUpgradesStore,
} from "../store/data-store";

const pages: { key: PageEnum; label: string; icon: string; useDirty?: () => boolean }[] = [
	{ key: PageEnum.tech_tree, label: "Tech Tree", icon: "🌳", useDirty: () => useTechTreeStore((s) => s.dirty) },
	{ key: PageEnum.upgrades, label: "Upgrades", icon: "🛒", useDirty: () => useUpgradesStore((s) => s.dirty) },
	{ key: PageEnum.ai_models, label: "AI Models", icon: "🤖", useDirty: () => useAiModelsStore((s) => s.dirty) },
	{ key: PageEnum.events, label: "Events", icon: "⚡", useDirty: () => useEventsStore((s) => s.dirty) },
	{ key: PageEnum.milestones, label: "Milestones", icon: "🏆", useDirty: () => useMilestonesStore((s) => s.dirty) },
	{ key: PageEnum.tiers, label: "Tiers", icon: "📊", useDirty: () => useTiersStore((s) => s.dirty) },
	{ key: PageEnum.balance, label: "Balance", icon: "⚖️", useDirty: () => useBalanceStore((s) => s.dirty) },
	{ key: PageEnum.simulation, label: "Simulation", icon: "🧪" },
];

// NOTE: Since hooks cannot be called conditionally, extract each nav item into
// a <SidebarItem> component that calls its own useDirty hook. This ensures
// reactive dirty-dot updates when any store's dirty flag changes.

export function Sidebar() {
	const activePage = useUiStore((s) => s.activePage);
	const setPage = useUiStore((s) => s.setPage);

	return (
		<nav
			css={css`
				width: 200px;
				background: #16213e;
				padding: 16px 0;
				display: flex;
				flex-direction: column;
				border-right: 1px solid #2a2a4a;
			`}
		>
			<h2
				css={css`
					font-size: 13px;
					text-transform: uppercase;
					letter-spacing: 1px;
					color: #8892b0;
					padding: 0 16px;
					margin-bottom: 16px;
				`}
			>
				AGI Rush Editor
			</h2>
			{pages.map((p) => {
				const isDirty = p.dirtyStore?.() ?? false;
				return (
					<button
						key={p.key}
						type="button"
						onClick={() => setPage(p.key)}
						css={css`
							display: flex;
							align-items: center;
							gap: 8px;
							padding: 8px 16px;
							border: none;
							background: ${activePage === p.key ? "#1a1a2e" : "transparent"};
							color: ${activePage === p.key ? "#fff" : "#8892b0"};
							cursor: pointer;
							font-size: 14px;
							text-align: left;
							width: 100%;
							&:hover { background: #1a1a2e; color: #fff; }
						`}
					>
						<span>{p.icon}</span>
						<span>{p.label}</span>
						{isDirty && (
							<span
								css={css`
									width: 6px; height: 6px;
									background: #e94560;
									border-radius: 50%;
									margin-left: auto;
								`}
							/>
						)}
					</button>
				);
			})}
		</nav>
	);
}
```

- [ ] **Step 2: Create toast component**

Create `tools/editor/src/components/toast.tsx`:

```tsx
import { css } from "@emotion/react";
import { useUiStore } from "../store/ui-store";

export function Toasts() {
	const toasts = useUiStore((s) => s.toasts);

	if (toasts.length === 0) return null;

	return (
		<div
			css={css`
				position: fixed;
				bottom: 16px;
				right: 16px;
				display: flex;
				flex-direction: column;
				gap: 8px;
				z-index: 1000;
			`}
		>
			{toasts.map((t) => (
				<div
					key={t.id}
					css={css`
						padding: 10px 16px;
						border-radius: 6px;
						font-size: 13px;
						background: ${t.type === "success" ? "#1a4731" : "#4a1a1a"};
						color: ${t.type === "success" ? "#3fb950" : "#e94560"};
						border: 1px solid ${t.type === "success" ? "#3fb950" : "#e94560"};
					`}
				>
					{t.message}
				</div>
			))}
		</div>
	);
}
```

- [ ] **Step 3: Update app.tsx with routing**

Rewrite `tools/editor/src/app.tsx`. Note: once pages are wired in (Tasks 7-15), use `ts-pattern` `match()` for the 8-way page switch per project conventions:

```tsx
import { css } from "@emotion/react";
import { match } from "ts-pattern";
import { Sidebar } from "./components/sidebar";
import { Toasts } from "./components/toast";
import { PageEnum, useUiStore } from "./store/ui-store";

function PageContent() {
	const activePage = useUiStore((s) => s.activePage);

	// Stub — replace with match(activePage).with(PageEnum.tech_tree, () => <TechTreePage />)...exhaustive()
	return (
		<div css={css`flex: 1; padding: 24px; overflow: auto;`}>
			<h1 css={css`font-size: 20px; margin-bottom: 16px; text-transform: capitalize;`}>
				{activePage.replace(/_/g, " ")}
			</h1>
			<p css={css`color: #888;`}>Editor page coming soon.</p>
		</div>
	);
}

export function App() {
	return (
		<div css={css`display: flex; height: 100vh; background: #1a1a2e; color: #e0e0e0;`}>
			<Sidebar />
			<PageContent />
			<Toasts />
		</div>
	);
}
```

- [ ] **Step 4: Verify**

```bash
cd tools/editor && npx rspack serve &
```

Open http://localhost:3738. Verify sidebar renders with 8 pages, clicking switches the heading. Kill after verifying.

- [ ] **Step 5: Commit**

```bash
git add tools/editor/src/
git commit -m "✨ Add sidebar navigation, toast system, and app shell"
```

---

## Phase 3: Table Editor Pages

### Task 6: Shared table editor component

Build a reusable table editor used by Upgrades, AI Models, Events, Milestones, and Tiers pages.

**Files:**
- Create: `tools/editor/src/components/shared/editable-table.tsx`
- Create: `tools/editor/src/components/shared/page-wrapper.tsx`

- [ ] **Step 1: Create page wrapper**

Create `tools/editor/src/components/shared/page-wrapper.tsx`. This wraps every editor page with load-on-mount, save button, and undo keybinding:

```tsx
import { css } from "@emotion/react";
import { useEffect } from "react";
import { useUiStore } from "../../store/ui-store";

interface PageWrapperProps {
	title: string;
	loading: boolean;
	dirty: boolean;
	error: string | null;
	onLoad: () => void;
	onSave: () => Promise<void>;
	onUndo: () => void;
	children: React.ReactNode;
}

export function PageWrapper({ title, loading, dirty, error, onLoad, onSave, onUndo, children }: PageWrapperProps) {
	const addToast = useUiStore((s) => s.addToast);

	useEffect(() => {
		onLoad();
	}, [onLoad]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "z") {
				e.preventDefault();
				onUndo();
			}
			if ((e.ctrlKey || e.metaKey) && e.key === "s") {
				e.preventDefault();
				onSave().then(
					() => addToast(`${title} saved`, "success"),
					(err) => addToast(`Save failed: ${err}`, "error"),
				);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onSave, onUndo, addToast, title]);

	if (loading) return <p>Loading...</p>;
	if (error) return <p css={css`color: #e94560;`}>Error: {error}</p>;

	return (
		<div css={css`display: flex; flex-direction: column; height: 100%;`}>
			<div css={css`display: flex; align-items: center; gap: 12px; margin-bottom: 16px;`}>
				<h1 css={css`font-size: 20px;`}>{title}</h1>
				<button
					type="button"
					disabled={!dirty}
					onClick={() =>
						onSave().then(
							() => addToast(`${title} saved`, "success"),
							(err) => addToast(`Save failed: ${err}`, "error"),
						)
					}
					css={css`
						padding: 6px 16px;
						border: 1px solid ${dirty ? "#3fb950" : "#444"};
						background: ${dirty ? "#1a4731" : "transparent"};
						color: ${dirty ? "#3fb950" : "#666"};
						border-radius: 4px;
						cursor: ${dirty ? "pointer" : "default"};
						font-size: 13px;
					`}
				>
					Save {dirty && "•"}
				</button>
			</div>
			<div css={css`flex: 1; overflow: auto;`}>{children}</div>
		</div>
	);
}
```

- [ ] **Step 2: Create editable table**

Create `tools/editor/src/components/shared/editable-table.tsx`. A generic table with inline editing:

```tsx
import { css } from "@emotion/react";
import { useState } from "react";

interface Column<T> {
	key: string;
	label: string;
	width?: string;
	render?: (row: T, index: number) => React.ReactNode;
	editable?: boolean;
	type?: "text" | "number" | "select";
	options?: { value: string; label: string }[];
}

interface EditableTableProps<T> {
	data: T[];
	columns: Column<T>[];
	rowKey: (row: T) => string;
	onRowChange: (index: number, row: T) => void;
	onRowAdd?: () => void;
	onRowDelete?: (index: number) => void;
	filter?: string;
	groupBy?: (row: T) => string;
}

export function EditableTable<T extends Record<string, unknown>>({
	data,
	columns,
	rowKey,
	onRowChange,
	onRowAdd,
	onRowDelete,
	filter,
	groupBy,
}: EditableTableProps<T>) {
	const [search, setSearch] = useState(filter ?? "");

	const filtered = data.filter((row) => {
		if (!search) return true;
		const s = search.toLowerCase();
		return Object.values(row).some((v) => String(v).toLowerCase().includes(s));
	});

	const groups = groupBy
		? filtered.reduce<Record<string, { rows: T[]; indices: number[] }>>((acc, row) => {
				const g = groupBy(row);
				if (!acc[g]) acc[g] = { rows: [], indices: [] };
				acc[g].rows.push(row);
				acc[g].indices.push(data.indexOf(row));
				return acc;
			}, {})
		: { "": { rows: filtered, indices: filtered.map((r) => data.indexOf(r)) } };

	return (
		<div>
			<div css={css`display: flex; gap: 8px; margin-bottom: 12px;`}>
				<input
					type="text"
					placeholder="Search..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					css={css`
						padding: 6px 10px; background: #16213e; border: 1px solid #2a2a4a;
						border-radius: 4px; color: #e0e0e0; font-size: 13px; width: 240px;
					`}
				/>
				{onRowAdd && (
					<button
						type="button"
						onClick={onRowAdd}
						css={css`
							padding: 6px 12px; background: #1a4731; border: 1px solid #3fb950;
							color: #3fb950; border-radius: 4px; cursor: pointer; font-size: 13px;
						`}
					>
						+ Add
					</button>
				)}
			</div>
			{Object.entries(groups).map(([group, { rows, indices }]) => (
				<div key={group}>
					{group && (
						<h3 css={css`font-size: 13px; color: #8892b0; margin: 12px 0 6px; text-transform: capitalize;`}>
							{group.replace(/_/g, " ")}
						</h3>
					)}
					<table css={css`width: 100%; border-collapse: collapse; font-size: 13px;`}>
						<thead>
							<tr>
								{columns.map((col) => (
									<th
										key={col.key}
										css={css`
											text-align: left; padding: 6px 8px;
											border-bottom: 1px solid #2a2a4a; color: #8892b0;
											width: ${col.width ?? "auto"}; font-weight: 500;
										`}
									>
										{col.label}
									</th>
								))}
								{onRowDelete && <th css={css`width: 40px;`} />}
							</tr>
						</thead>
						<tbody>
							{rows.map((row, i) => (
								<tr key={rowKey(row)} css={css`&:hover { background: #16213e; }`}>
									{columns.map((col) => (
										<td key={col.key} css={css`padding: 4px 8px; border-bottom: 1px solid #1a1a2e;`}>
											{col.render ? (
												col.render(row, indices[i])
											) : col.editable ? (
												<CellEditor
													value={row[col.key]}
													type={col.type ?? "text"}
													options={col.options}
													onChange={(val) => {
														const updated = { ...row, [col.key]: val };
														onRowChange(indices[i], updated);
													}}
												/>
											) : (
												String(row[col.key] ?? "")
											)}
										</td>
									))}
									{onRowDelete && (
										<td css={css`padding: 4px; text-align: center;`}>
											<button
												type="button"
												onClick={() => onRowDelete(indices[i])}
												css={css`
													background: none; border: none; color: #e94560;
													cursor: pointer; font-size: 14px;
												`}
											>
												×
											</button>
										</td>
									)}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			))}
		</div>
	);
}

function CellEditor({
	value,
	type,
	options,
	onChange,
}: {
	value: unknown;
	type: "text" | "number" | "select";
	options?: { value: string; label: string }[];
	onChange: (val: unknown) => void;
}) {
	if (type === "select" && options) {
		return (
			<select
				value={String(value)}
				onChange={(e) => onChange(e.target.value)}
				css={css`
					background: #0f0f23; border: 1px solid #2a2a4a;
					color: #e0e0e0; padding: 2px 4px; border-radius: 3px;
					font-size: 13px;
				`}
			>
				{options.map((o) => (
					<option key={o.value} value={o.value}>{o.label}</option>
				))}
			</select>
		);
	}

	return (
		<input
			type={type}
			value={String(value ?? "")}
			onChange={(e) => {
				onChange(type === "number" ? Number(e.target.value) : e.target.value);
			}}
			css={css`
				background: transparent; border: 1px solid transparent;
				color: #e0e0e0; padding: 2px 4px; border-radius: 3px;
				font-size: 13px; width: 100%;
				&:focus { border-color: #2a2a4a; background: #0f0f23; outline: none; }
			`}
		/>
	);
}
```

- [ ] **Step 3: Commit**

```bash
git add tools/editor/src/components/shared/
git commit -m "✨ Add shared page wrapper and editable table components"
```

---

### Task 7: Upgrades editor page

**Files:**
- Create: `tools/editor/src/pages/upgrades/upgrades-page.tsx`
- Modify: `tools/editor/src/app.tsx` (wire up page)

- [ ] **Step 1: Create upgrades page**

Create `tools/editor/src/pages/upgrades/upgrades-page.tsx`:

```tsx
import { useCallback } from "react";
import { EditableTable } from "../../components/shared/editable-table";
import { PageWrapper } from "../../components/shared/page-wrapper";
import { useUpgradesStore } from "../../store/data-store";

const TIER_OPTIONS = [
	{ value: "garage", label: "Garage" },
	{ value: "freelancing", label: "Freelancing" },
	{ value: "startup", label: "Startup" },
	{ value: "tech_company", label: "Tech Company" },
	{ value: "ai_lab", label: "AI Lab" },
	{ value: "agi_race", label: "AGI Race" },
];

interface Upgrade {
	id: string;
	tier: string;
	name: string;
	description: string;
	icon: string;
	baseCost: number;
	costMultiplier: number;
	max: number;
	costCategory?: string;
	effects: unknown[];
}

export function UpgradesPage() {
	const { data, loading, dirty, error, load, save, update, undo } = useUpgradesStore();

	const handleRowChange = useCallback(
		(index: number, row: Upgrade) => {
			if (!data) return;
			const upgrades = [...(data.upgrades as Upgrade[])];
			upgrades[index] = row;
			update({ ...data, upgrades });
		},
		[data, update],
	);

	const handleAdd = useCallback(() => {
		if (!data) return;
		const upgrades = data.upgrades as Upgrade[];
		const newUpgrade: Upgrade = {
			id: `new_upgrade_${Date.now()}`,
			tier: "garage",
			name: "New Upgrade",
			description: "",
			icon: "📦",
			baseCost: 100,
			costMultiplier: 1.5,
			max: 1,
			effects: [],
		};
		update({ ...data, upgrades: [...upgrades, newUpgrade] });
	}, [data, update]);

	const handleDelete = useCallback(
		(index: number) => {
			if (!data) return;
			const upgrades = [...(data.upgrades as Upgrade[])];
			upgrades.splice(index, 1);
			update({ ...data, upgrades });
		},
		[data, update],
	);

	return (
		<PageWrapper title="Upgrades" loading={loading} dirty={dirty} error={error} onLoad={load} onSave={save} onUndo={undo}>
			{data && (
				<EditableTable
					data={data.upgrades as Upgrade[]}
					rowKey={(r) => r.id}
					groupBy={(r) => r.tier}
					onRowChange={handleRowChange}
					onRowAdd={handleAdd}
					onRowDelete={handleDelete}
					columns={[
						{ key: "icon", label: "", width: "30px", editable: true },
						{ key: "id", label: "ID", width: "160px", editable: true },
						{ key: "name", label: "Name", width: "160px", editable: true },
						{ key: "tier", label: "Tier", width: "120px", editable: true, type: "select", options: TIER_OPTIONS },
						{ key: "baseCost", label: "Cost", width: "80px", editable: true, type: "number" },
						{ key: "costMultiplier", label: "Mult", width: "60px", editable: true, type: "number" },
						{ key: "max", label: "Max", width: "50px", editable: true, type: "number" },
						{ key: "description", label: "Description", editable: true },
					]}
				/>
			)}
		</PageWrapper>
	);
}
```

- [ ] **Step 2: Wire into app.tsx**

Update `tools/editor/src/app.tsx` to import and render `UpgradesPage` when `activePage === PageEnum.upgrades`. Use a match pattern or simple conditional.

- [ ] **Step 3: Verify**

Start the editor, navigate to Upgrades, verify the table loads with grouped upgrades, inline editing works, dirty indicator appears.

- [ ] **Step 4: Commit**

```bash
git add tools/editor/src/pages/upgrades/ tools/editor/src/app.tsx
git commit -m "✨ Add upgrades editor page with grouped table"
```

---

### Task 8: AI Models editor page

**Files:**
- Create: `tools/editor/src/pages/ai-models/ai-models-page.tsx`
- Modify: `tools/editor/src/app.tsx`

- [ ] **Step 1: Create AI models page**

Same pattern as upgrades. Table with columns: icon, id, family, name, version, tier, cost, locPerSec, flopsCost, codeQuality, requires. Group by family. Include a second section for agent setups (simpler table).

- [ ] **Step 2: Wire into app.tsx**

- [ ] **Step 3: Verify and commit**

```bash
git add tools/editor/src/pages/ai-models/ tools/editor/src/app.tsx
git commit -m "✨ Add AI models editor page"
```

---

### Task 9: Events editor page

**Files:**
- Create: `tools/editor/src/pages/events/events-page.tsx`
- Modify: `tools/editor/src/app.tsx`

- [ ] **Step 1: Create events page**

Table with columns: icon, id, name, minTier, duration, weight. Effects column rendered as JSON badge or expandable. Include eventConfig section at the top (minIntervalSeconds, maxIntervalSeconds, maxConcurrent as form fields).

- [ ] **Step 2: Wire into app.tsx, verify, commit**

```bash
git add tools/editor/src/pages/events/ tools/editor/src/app.tsx
git commit -m "✨ Add events editor page"
```

---

### Task 10: Milestones editor page

**Files:**
- Create: `tools/editor/src/pages/milestones/milestones-page.tsx`
- Modify: `tools/editor/src/app.tsx`

- [ ] **Step 1: Create milestones page**

Table with columns: id, name, metric, threshold, condition, description.

- [ ] **Step 2: Wire into app.tsx, verify, commit**

```bash
git add tools/editor/src/pages/milestones/ tools/editor/src/app.tsx
git commit -m "✨ Add milestones editor page"
```

---

### Task 11: Tiers editor page

**Files:**
- Create: `tools/editor/src/pages/tiers/tiers-page.tsx`
- Modify: `tools/editor/src/app.tsx`

- [ ] **Step 1: Create tiers page**

Table with columns: index, id, name, tagline, cashPerLoc, locRequired, cashRequired, cost. Only 6 rows, no add/delete (fixed tiers).

- [ ] **Step 2: Wire into app.tsx, verify, commit**

```bash
git add tools/editor/src/pages/tiers/ tools/editor/src/app.tsx
git commit -m "✨ Add tiers editor page"
```

---

### Task 12: Balance config editor page

**Files:**
- Create: `tools/editor/src/pages/balance/balance-page.tsx`
- Modify: `tools/editor/src/app.tsx`

- [ ] **Step 1: Create balance page**

Form-based editor. Render each top-level key in `balance.json` as a collapsible section. For `core`, show labeled number inputs. For `costCurve`, show a mini-table. For `tierProgression`, show a table. Recursively render objects as nested forms.

- [ ] **Step 2: Wire into app.tsx, verify, commit**

```bash
git add tools/editor/src/pages/balance/ tools/editor/src/app.tsx
git commit -m "✨ Add balance config editor page"
```

---

## Phase 4: Tech Tree Editor

### Task 13: Tech tree page with React Flow

The most complex page. Visual node graph with inspector panel.

**Files:**
- Create: `tools/editor/src/pages/tech-tree/tech-tree-page.tsx`
- Create: `tools/editor/src/pages/tech-tree/tech-node.tsx` (custom React Flow node)
- Create: `tools/editor/src/pages/tech-tree/node-inspector.tsx`
- Create: `tools/editor/src/pages/tech-tree/use-tech-tree-flow.ts` (hook converting data ↔ React Flow)
- Modify: `tools/editor/src/app.tsx`

- [ ] **Step 1: Create data ↔ React Flow conversion hook**

Create `tools/editor/src/pages/tech-tree/use-tech-tree-flow.ts`:

This hook:
- Takes the `{ nodes: [...] }` data from the store
- Converts to React Flow `Node[]` and `Edge[]` (edges derived from `requires` arrays)
- On node drag end: updates `x`/`y` in the store data
- On edge connect: adds to the target node's `requires` array
- On edge delete: removes from the target node's `requires` array
- On node property change: updates the node in the store data
- Exposes `onNodesChange`, `onEdgesChange`, `onConnect` handlers for React Flow

```typescript
import { useCallback, useMemo } from "react";
import type { Edge, Node, OnConnect, OnEdgesChange, OnNodesChange } from "@xyflow/react";
import { applyEdgeChanges, applyNodeChanges } from "@xyflow/react";

interface TechNode {
	id: string;
	name: string;
	icon: string;
	requires: string[];
	x: number;
	y: number;
	[key: string]: unknown;
}

export function useTechTreeFlow(
	nodes: TechNode[],
	onUpdate: (nodes: TechNode[]) => void,
) {
	const flowNodes: Node[] = useMemo(
		() =>
			nodes.map((n) => ({
				id: n.id,
				type: "techNode",
				position: { x: n.x ?? 0, y: n.y ?? 0 },
				data: n,
			})),
		[nodes],
	);

	const flowEdges: Edge[] = useMemo(
		() =>
			nodes.flatMap((n) =>
				(n.requires ?? []).map((req) => ({
					id: `${req}->${n.id}`,
					source: req,
					target: n.id,
				})),
			),
		[nodes],
	);

	const onNodesChange: OnNodesChange = useCallback(
		(changes) => {
			// Handle position changes (drag end)
			for (const change of changes) {
				if (change.type === "position" && change.position && !change.dragging) {
					const updated = nodes.map((n) =>
						n.id === change.id
							? { ...n, x: Math.round(change.position!.x), y: Math.round(change.position!.y) }
							: n,
					);
					onUpdate(updated);
					return;
				}
			}
		},
		[nodes, onUpdate],
	);

	const onEdgesChange: OnEdgesChange = useCallback(
		(changes) => {
			for (const change of changes) {
				if (change.type === "remove") {
					const edge = flowEdges.find((e) => e.id === change.id);
					if (edge) {
						const updated = nodes.map((n) =>
							n.id === edge.target
								? { ...n, requires: n.requires.filter((r) => r !== edge.source) }
								: n,
						);
						onUpdate(updated);
					}
				}
			}
		},
		[nodes, flowEdges, onUpdate],
	);

	const onConnect: OnConnect = useCallback(
		(connection) => {
			if (!connection.source || !connection.target) return;
			const updated = nodes.map((n) =>
				n.id === connection.target && !n.requires.includes(connection.source!)
					? { ...n, requires: [...n.requires, connection.source!] }
					: n,
			);
			onUpdate(updated);
		},
		[nodes, onUpdate],
	);

	return { flowNodes, flowEdges, onNodesChange, onEdgesChange, onConnect };
}
```

- [ ] **Step 2: Create custom tech node component**

Create `tools/editor/src/pages/tech-tree/tech-node.tsx`:

```tsx
import { css } from "@emotion/react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

const TIER_COLORS: Record<string, string> = {
	garage: "#6272a4",
	freelancing: "#8be9fd",
	startup: "#3fb950",
	tech_company: "#d19a66",
	ai_lab: "#c678dd",
	agi_race: "#e94560",
};

export function TechNodeComponent({ data, selected }: NodeProps) {
	const node = data as Record<string, unknown>;
	const currency = (node.currency as string) ?? "cash";

	return (
		<div
			css={css`
				background: #16213e;
				border: 2px solid ${selected ? "#fff" : TIER_COLORS[node.tier as string] ?? "#444"};
				border-radius: 6px;
				padding: 8px 12px;
				min-width: 140px;
				cursor: grab;
			`}
		>
			<Handle type="target" position={Position.Top} />
			<div css={css`display: flex; align-items: center; gap: 6px;`}>
				<span>{node.icon as string}</span>
				<span css={css`font-size: 12px; font-weight: 600;`}>{node.name as string}</span>
			</div>
			<div css={css`font-size: 10px; color: #8892b0; margin-top: 4px;`}>
				{node.baseCost as number} {currency} × {node.costMultiplier as number}
			</div>
			<Handle type="source" position={Position.Bottom} />
		</div>
	);
}
```

- [ ] **Step 3: Create node inspector**

Create `tools/editor/src/pages/tech-tree/node-inspector.tsx`:

A right-side panel that appears when a node is selected. Contains form fields for all node properties: id, name, description, icon, currency, baseCost, costMultiplier, max, and an effects editor (add/remove effects, each with type/op/value dropdowns).

The inspector calls back with the updated node, and the parent updates the store.

- [ ] **Step 4: Create tech tree page**

Create `tools/editor/src/pages/tech-tree/tech-tree-page.tsx`:

```tsx
import { css } from "@emotion/react";
import { ReactFlow, Background, MiniMap, Controls, BackgroundVariant } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useState } from "react";
import { PageWrapper } from "../../components/shared/page-wrapper";
import { useTechTreeStore } from "../../store/data-store";
import { NodeInspector } from "./node-inspector";
import { TechNodeComponent } from "./tech-node";
import { useTechTreeFlow } from "./use-tech-tree-flow";

export function TechTreePage() {
	const { data, loading, dirty, error, load, save, update, undo } = useTechTreeStore();
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const nodes = (data?.nodes ?? []) as Array<Record<string, unknown>>;

	const handleUpdate = useCallback(
		(newNodes: Array<Record<string, unknown>>) => {
			if (!data) return;
			update({ ...data, nodes: newNodes });
		},
		[data, update],
	);

	const { flowNodes, flowEdges, onNodesChange, onEdgesChange, onConnect } = useTechTreeFlow(
		nodes as never,
		handleUpdate as never,
	);

	const nodeTypes = useMemo(() => ({ techNode: TechNodeComponent }), []);

	const selectedNode = nodes.find((n) => n.id === selectedId);

	const handleNodeSelect = useCallback((_: unknown, node: { id: string }) => {
		setSelectedId(node.id);
	}, []);

	const handleNodeChange = useCallback(
		(updated: Record<string, unknown>) => {
			handleUpdate(nodes.map((n) => (n.id === updated.id ? updated : n)));
		},
		[nodes, handleUpdate],
	);

	const handleAddNode = useCallback(() => {
		const newNode = {
			id: `node_${Date.now()}`,
			name: "New Node",
			description: "",
			icon: "📦",
			requires: [],
			max: 1,
			baseCost: 100,
			costMultiplier: 1.5,
			currency: "cash",
			effects: [],
			x: 400,
			y: 400,
		};
		handleUpdate([...nodes, newNode]);
		setSelectedId(newNode.id);
	}, [nodes, handleUpdate]);

	return (
		<PageWrapper title="Tech Tree" loading={loading} dirty={dirty} error={error} onLoad={load} onSave={save} onUndo={undo}>
			<div css={css`display: flex; height: calc(100vh - 120px);`}>
				<div css={css`flex: 1; position: relative;`}>
					<button
						type="button"
						onClick={handleAddNode}
						css={css`
							position: absolute; top: 8px; left: 8px; z-index: 10;
							padding: 6px 12px; background: #1a4731; border: 1px solid #3fb950;
							color: #3fb950; border-radius: 4px; cursor: pointer; font-size: 13px;
						`}
					>
						+ Add Node
					</button>
					<ReactFlow
						nodes={flowNodes}
						edges={flowEdges}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onConnect={onConnect}
						onNodeClick={handleNodeSelect}
						nodeTypes={nodeTypes}
						snapToGrid
						snapGrid={[20, 20]}
						fitView
					>
						<Background variant={BackgroundVariant.Dots} gap={20} />
						<MiniMap />
						<Controls />
					</ReactFlow>
				</div>
				{selectedNode && (
					<NodeInspector
						node={selectedNode}
						allNodeIds={nodes.map((n) => n.id as string)}
						onChange={handleNodeChange}
						onClose={() => setSelectedId(null)}
						onDelete={() => {
							handleUpdate(nodes.filter((n) => n.id !== selectedId));
							setSelectedId(null);
						}}
					/>
				)}
			</div>
		</PageWrapper>
	);
}
```

- [ ] **Step 5: Wire into app.tsx**

- [ ] **Step 6: Verify the graph renders, nodes are draggable, edges work, inspector opens on click**

- [ ] **Step 7: Commit**

```bash
git add tools/editor/src/pages/tech-tree/ tools/editor/src/app.tsx
git commit -m "✨ Add tech tree editor page with React Flow graph and inspector"
```

---

### Task 14: Dagre re-layout button

**Files:**
- Modify: `tools/editor/src/pages/tech-tree/tech-tree-page.tsx`

- [ ] **Step 1: Add dagre dependency**

```bash
cd tools/editor && npm install @dagrejs/dagre
```

- [ ] **Step 2: Add re-layout function and button**

Add a `reLayout` function that takes the current nodes, runs dagre to compute positions, and updates the store. Add a button next to "Add Node" that calls it.

```typescript
import Dagre from "@dagrejs/dagre";

function layoutWithDagre(nodes: TechNode[]): TechNode[] {
	const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
	g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });

	for (const n of nodes) {
		g.setNode(n.id, { width: 160, height: 60 });
		for (const req of n.requires ?? []) {
			g.setEdge(req, n.id);
		}
	}
	Dagre.layout(g);

	return nodes.map((n) => {
		const pos = g.node(n.id);
		return { ...n, x: Math.round(pos.x), y: Math.round(pos.y) };
	});
}
```

- [ ] **Step 3: Verify and commit**

```bash
git add tools/editor/
git commit -m "✨ Add dagre re-layout button to tech tree editor"
```

---

## Phase 5: Simulation Page

### Task 15: Simulation page

**Files:**
- Create: `tools/editor/src/pages/simulation/simulation-page.tsx`
- Modify: `tools/editor/src/app.tsx`

- [ ] **Step 1: Create simulation page**

This page:
- Has profile controls (same as in-app `sim-controls.tsx`: keysPerSec, skill, aiStrategy, maxMinutes)
- On "Run", loads ALL data files from the API (fresh, not from stores — so it tests saved data)
- Calls `runBalanceSim(data, config)` from `@shared/balance-sim`
- Displays pass/fail summary, failures list, key metrics (AGI time, purchases, longest wait)
- Has a "Run CLI Check" button that calls `POST /api/balance-check` and displays stdout

Charts (cash/LoC curves, tier timeline, purchase density) can use simple canvas or inline SVG — keep it simple, no charting library. Reuse the visual patterns from the in-app sim panel if helpful.

```tsx
import { css } from "@emotion/react";
import { useCallback, useState } from "react";
import { fetchData, runBalanceCheck } from "../../api/client";
import type { BalanceCheckResult } from "../../api/client";
import { runBalanceSim } from "@shared/balance-sim";
import type { SimConfig, SimData, SimResult } from "@shared/types";

export function SimulationPage() {
	const [config, setConfig] = useState<SimConfig>({
		keysPerSec: 6,
		skill: 0.8,
		aiStrategy: "balanced",
		maxMinutes: 60,
	});
	const [result, setResult] = useState<SimResult | null>(null);
	const [cliResult, setCliResult] = useState<BalanceCheckResult | null>(null);
	const [running, setRunning] = useState(false);

	const runSim = useCallback(async () => {
		setRunning(true);
		try {
			const [tiers, upgrades, techTree, aiModels, balance, events] = await Promise.all([
				fetchData("tiers"),
				fetchData("upgrades"),
				fetchData("tech-tree"),
				fetchData("ai-models"),
				fetchData("balance"),
				fetchData("events"),
			]);
			const data: SimData = {
				tiers: (tiers as { tiers: unknown[] }).tiers,
				upgrades: (upgrades as { upgrades: unknown[] }).upgrades,
				techTree: techTree as { nodes: unknown[] },
				aiModels: aiModels as { models: unknown[]; agentSetups: unknown[] },
				balance: balance as { core: Record<string, unknown> },
				events: events as { events: unknown[]; eventConfig: Record<string, unknown> },
			};
			const r = runBalanceSim(data, config);
			setResult(r);
		} finally {
			setRunning(false);
		}
	}, [config]);

	const runCli = useCallback(async () => {
		const r = await runBalanceCheck();
		setCliResult(r);
	}, []);

	// ... render controls, result summary, charts
}
```

- [ ] **Step 2: Wire into app.tsx**

- [ ] **Step 3: Verify sim runs and displays results**

- [ ] **Step 4: Commit**

```bash
git add tools/editor/src/pages/simulation/ tools/editor/src/app.tsx
git commit -m "✨ Add simulation page with balance sim and CLI check"
```

---

## Phase 6: Cleanup & Polish

### Task 16: Remove old tooling

**Files:**
- Delete: `specs/tech-tree-editor.html`
- Delete: `specs/items-editor.html`
- Delete: `specs/feedback-editor.html`
- Delete: `specs/tech-tree-server.js`
- Delete: `specs/simulator.html` (if it exists and is superseded)
- Modify: `src/components/god-mode-page.tsx` (update editor links to point to localhost:3738)

- [ ] **Step 1: Remove old HTML editors and server**

```bash
git rm specs/tech-tree-editor.html specs/items-editor.html specs/feedback-editor.html specs/tech-tree-server.js
```

Also remove `specs/simulator.html` if present and superseded.

- [ ] **Step 2: Update GodMode panel links**

In `src/components/god-mode-page.tsx`, update the "Tech Tree Editor" and "Item Pool Editor" links from `http://localhost:3737` to `http://localhost:3738` (or just `http://localhost:3738/` since page nav is sidebar-based).

- [ ] **Step 3: Verify game still builds**

```bash
npm run typecheck && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "♻️ Remove old HTML editors, update GodMode links to unified editor"
```

---

### Task 17: Add .gitignore and README for editor

**Files:**
- Create: `tools/editor/.gitignore`

- [ ] **Step 1: Create .gitignore**

```
node_modules/
dist/
```

- [ ] **Step 2: Commit**

```bash
git add tools/editor/.gitignore
git commit -m "🙈 Add .gitignore for editor app"
```

---

### Task 18: Final verification

- [ ] **Step 1: Clean install and full test**

```bash
cd tools/editor && rm -rf node_modules && npm install
npm run dev
```

Verify:
- All 8 pages load and display data
- Editing any field marks page dirty (red dot in sidebar)
- Save persists to JSON files
- Undo (Ctrl+Z) reverts changes
- Tech tree nodes are draggable, edges connect, inspector works
- Simulation runs and shows pass/fail
- Balance CLI check works

- [ ] **Step 2: Verify game still works**

```bash
cd ../.. && npm run typecheck && npm run build && npm run dev
```

Verify the game loads and the sim panel still works (wrapper imports should be transparent).

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "✅ Final verification of unified editor app"
```
