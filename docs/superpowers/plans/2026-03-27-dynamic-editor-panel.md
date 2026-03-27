# Dynamic Editor Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the left panel evolve across tiers — editor-dominant early, analytics dashboard at T2+, AI prompt at T4+ — with animated transitions.

**Architecture:** The game store gets new per-source LoC breakdown fields. Three new components (AnalyticsDashboard, CliPrompt) plus a rewritten EditorPanel that composes them based on tier. Panel flex ratios in app.tsx become tier-dependent with CSS transitions.

**Tech Stack:** React 19, Zustand, Emotion CSS-in-JS, ts-pattern

**Spec:** `docs/superpowers/specs/2026-03-27-dynamic-editor-panel-design.md`

---

### Task 1: Expose per-source LoC rates on the game store

The analytics dashboard needs per-source LoC/s breakdown, but `recalcDerivedStats` currently computes these as local variables and only writes the aggregate `autoLocPerSec` to state. We need to expose the individual rates.

**Files:**
- Modify: `apps/game/src/modules/game/store/game-store.ts`

- [ ] **Step 1: Add per-source LoC fields to GameState**

Add these fields to the `GameState` interface (after `autoLocPerSec: number;` on line 54):

```typescript
freelancerLocPerSec: number;
internLocPerSec: number;
devLocPerSec: number;
teamLocPerSec: number;
llmLocPerSec: number;
agentLocPerSec: number;
managerBonus: number;
```

- [ ] **Step 2: Add initial values**

Add to `initialState` (after `autoLocPerSec: 0,`):

```typescript
freelancerLocPerSec: 0,
internLocPerSec: 0,
devLocPerSec: 0,
teamLocPerSec: 0,
llmLocPerSec: 0,
agentLocPerSec: 0,
managerBonus: 0,
```

- [ ] **Step 3: Write per-source values in recalcDerivedStats**

In `recalcDerivedStats`, after the line `state.autoLocPerSec = totalAutoLoc * locProductionMultiplier * eventMods.autoLocMultiplier;` (line 377-378), add:

```typescript
state.freelancerLocPerSec =
	freelancerLoc * freelancerLocMultiplier * locProductionMultiplier * eventMods.autoLocMultiplier;
state.internLocPerSec =
	internLoc * internLocMultiplier * locProductionMultiplier * eventMods.autoLocMultiplier;
state.devLocPerSec =
	devLoc * devLocMultiplier * devSpeedMultiplier * locProductionMultiplier * eventMods.autoLocMultiplier;
state.teamLocPerSec =
	teamLoc * teamLocMultiplier * managerTeamBonus * locProductionMultiplier * eventMods.autoLocMultiplier;
state.llmLocPerSec =
	llmLoc * llmLocMultiplier * locProductionMultiplier * eventMods.autoLocMultiplier;
state.agentLocPerSec =
	agentLoc * agentLocMultiplier * locProductionMultiplier * eventMods.autoLocMultiplier;
state.managerBonus = managerTeamBonus;
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 5: Verify the game still runs**

Run: `npm run dev`
Open http://localhost:3000, verify the game loads and plays normally. The new fields are computed but not yet displayed.

- [ ] **Step 6: Commit**

```bash
git add apps/game/src/modules/game/store/game-store.ts
git commit -m "✨ Expose per-source LoC rates on game store for analytics dashboard"
```

---

### Task 2: Create the AnalyticsDashboard component

A real-time dashboard showing LoC production per source, split into human and AI sections.

**Files:**
- Create: `apps/game/src/components/analytics-dashboard.tsx`

- [ ] **Step 1: Create the component file**

```typescript
import { css } from "@emotion/react";
import { type AiModelData, aiModels, useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useMemo } from "react";

const wrapperCss = css({
	display: "flex",
	flexDirection: "column",
	background: "#0a0e14",
	overflow: "hidden",
});

const headerCss = css({
	padding: "4px 12px",
	background: "#161b22",
	borderBottom: "1px solid #1e2630",
	fontSize: 10,
	color: "#8b949e",
	display: "flex",
	justifyContent: "space-between",
});

const sectionCss = css({
	padding: "6px 10px",
	display: "flex",
	flexDirection: "column",
	gap: 3,
});

const sectionLabelCss = css({
	fontSize: 9,
	textTransform: "uppercase",
	letterSpacing: 0.5,
	marginBottom: 2,
});

const rowCss = css({
	display: "flex",
	alignItems: "center",
	gap: 6,
	height: 18,
});

const nameCss = css({
	fontSize: 10,
	color: "#8b949e",
	minWidth: 70,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
});

const barTrackCss = css({
	flex: 1,
	height: 5,
	background: "#1e2630",
	borderRadius: 3,
	overflow: "hidden",
	minWidth: 40,
});

const barFillCss = css({
	height: "100%",
	borderRadius: 3,
	transition: "width 0.3s ease",
});

const valueCss = css({
	fontSize: 10,
	minWidth: 55,
	textAlign: "right",
	fontVariantNumeric: "tabular-nums",
});

const footerCss = css({
	padding: "4px 10px",
	borderTop: "1px solid #1e2630",
	display: "flex",
	justifyContent: "space-between",
	fontSize: 9,
	color: "#484f58",
});

const dividerCss = css({
	height: 1,
	background: "#1e2630",
	margin: "0 10px",
});

interface SourceRow {
	name: string;
	locPerSec: number;
	color: string;
	count?: number;
}

export function AnalyticsDashboard() {
	const freelancerLocPerSec = useGameStore((s) => s.freelancerLocPerSec);
	const internLocPerSec = useGameStore((s) => s.internLocPerSec);
	const devLocPerSec = useGameStore((s) => s.devLocPerSec);
	const teamLocPerSec = useGameStore((s) => s.teamLocPerSec);
	const llmLocPerSec = useGameStore((s) => s.llmLocPerSec);
	const agentLocPerSec = useGameStore((s) => s.agentLocPerSec);
	const managerBonus = useGameStore((s) => s.managerBonus);
	const locPerKey = useGameStore((s) => s.locPerKey);
	const flops = useGameStore((s) => s.flops);
	const autoLocPerSec = useGameStore((s) => s.autoLocPerSec);
	const aiUnlocked = useGameStore((s) => s.aiUnlocked);
	const unlockedModels = useGameStore((s) => s.unlockedModels);
	const ownedUpgrades = useGameStore((s) => s.ownedUpgrades);

	const humanSources = useMemo((): SourceRow[] => {
		const rows: SourceRow[] = [];
		if ((ownedUpgrades.freelancer ?? 0) > 0)
			rows.push({
				name: "Freelancers",
				locPerSec: freelancerLocPerSec,
				color: "#3fb950",
				count: ownedUpgrades.freelancer,
			});
		if ((ownedUpgrades.intern ?? 0) > 0)
			rows.push({
				name: "Interns",
				locPerSec: internLocPerSec,
				color: "#58a6ff",
				count: ownedUpgrades.intern,
			});
		if ((ownedUpgrades.dev_team ?? 0) > 0)
			rows.push({
				name: "Dev Teams",
				locPerSec: teamLocPerSec,
				color: "#d2a8ff",
				count: ownedUpgrades.dev_team,
			});
		if (devLocPerSec > 0 && (ownedUpgrades.dev_team ?? 0) === 0)
			rows.push({
				name: "Devs",
				locPerSec: devLocPerSec,
				color: "#79c0ff",
			});
		rows.push({
			name: "You",
			locPerSec: locPerKey * 6,
			color: "#c084fc",
		});
		return rows;
	}, [
		ownedUpgrades,
		freelancerLocPerSec,
		internLocPerSec,
		devLocPerSec,
		teamLocPerSec,
		locPerKey,
	]);

	const aiSources = useMemo((): SourceRow[] => {
		if (!aiUnlocked) return [];
		const rows: SourceRow[] = [];
		for (const model of aiModels) {
			if (unlockedModels[model.id]) {
				rows.push({
					name: `${model.name} ${model.version}`,
					locPerSec: model.locPerSec,
					color: modelColor(model),
				});
			}
		}
		return rows;
	}, [aiUnlocked, unlockedModels]);

	const maxLoc = useMemo(() => {
		const all = [...humanSources, ...aiSources];
		return Math.max(1, ...all.map((s) => s.locPerSec));
	}, [humanSources, aiSources]);

	const totalLoc = autoLocPerSec + locPerKey * 6;
	const execRatio = flops > 0 && totalLoc > 0 ? Math.min(1, flops / totalLoc) : 1;

	return (
		<div css={wrapperCss}>
			<div css={headerCss}>
				<span>analytics.live</span>
				<span style={{ color: execRatio < 0.5 ? "#e94560" : "#484f58" }}>
					exec {Math.round(execRatio * 100)}%
				</span>
			</div>

			<div css={sectionCss}>
				<div css={[sectionLabelCss, { color: "#3fb950" }]}>Human</div>
				{humanSources.map((s) => (
					<div css={rowCss} key={s.name}>
						<span css={nameCss}>
							{s.name}
							{s.count !== undefined && (
								<span style={{ color: "#484f58" }}> x{s.count}</span>
							)}
						</span>
						<div css={barTrackCss}>
							<div
								css={barFillCss}
								style={{
									width: `${(s.locPerSec / maxLoc) * 100}%`,
									background: s.color,
								}}
							/>
						</div>
						<span css={valueCss} style={{ color: s.color }}>
							{formatNumber(s.locPerSec)}/s
						</span>
					</div>
				))}
				{managerBonus > 1 && (
					<div css={[rowCss, { fontSize: 9, color: "#484f58" }]}>
						<span css={nameCss}>Managers</span>
						<span>+{Math.round((managerBonus - 1) * 100)}% team output</span>
					</div>
				)}
			</div>

			{aiSources.length > 0 && (
				<>
					<div css={dividerCss} />
					<div css={sectionCss}>
						<div css={[sectionLabelCss, { color: "#d4a574" }]}>AI Models</div>
						{aiSources.map((s) => (
							<div css={rowCss} key={s.name}>
								<span css={nameCss}>{s.name}</span>
								<div css={barTrackCss}>
									<div
										css={barFillCss}
										style={{
											width: `${(s.locPerSec / maxLoc) * 100}%`,
											background: s.color,
										}}
									/>
								</div>
								<span css={valueCss} style={{ color: s.color }}>
									{formatNumber(s.locPerSec)}/s
								</span>
							</div>
						))}
					</div>
				</>
			)}

			<div css={footerCss}>
				<span>Total: {formatNumber(totalLoc)}/s</span>
				<span>FLOPS: {formatNumber(flops)}</span>
			</div>
		</div>
	);
}

function modelColor(model: AiModelData): string {
	const colors: Record<string, string> = {
		claude: "#d4a574",
		gpt: "#74b9ff",
		gemini: "#fbbf24",
		llama: "#a29bfe",
		mistral: "#fd79a8",
		grok: "#e17055",
		copilot: "#6c5ce7",
	};
	return colors[model.family] ?? "#8b949e";
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/analytics-dashboard.tsx
git commit -m "✨ Add AnalyticsDashboard component with per-source LoC breakdown"
```

---

### Task 3: Create the CliPrompt component

A cosmetic terminal-style prompt where AI models respond with flavor text. Also hosts the FLOPS slider at T4+.

**Files:**
- Create: `apps/game/src/components/cli-prompt.tsx`

- [ ] **Step 1: Create the component file**

```typescript
import { css } from "@emotion/react";
import { aiModels, useGameStore } from "@modules/game";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlopsSlider } from "./flops-slider";

const wrapperCss = css({
	display: "flex",
	flexDirection: "column",
	background: "#0a0e14",
	overflow: "hidden",
});

const headerCss = css({
	padding: "4px 12px",
	background: "#161b22",
	borderBottom: "1px solid #1e2630",
	fontSize: 10,
	color: "#8b949e",
});

const logCss = css({
	flex: 1,
	overflowY: "auto",
	padding: "6px 10px",
	fontSize: 11,
	lineHeight: 1.5,
	display: "flex",
	flexDirection: "column",
	gap: 4,
	"&::-webkit-scrollbar": { width: 4 },
	"&::-webkit-scrollbar-track": { background: "transparent" },
	"&::-webkit-scrollbar-thumb": { background: "#1e2630", borderRadius: 2 },
});

const inputRowCss = css({
	display: "flex",
	alignItems: "center",
	padding: "6px 10px",
	borderTop: "1px solid #1e2630",
	background: "#0d1117",
	gap: 6,
	flexShrink: 0,
});

const promptPrefixCss = css({
	fontSize: 11,
	color: "#6272a4",
	userSelect: "none",
});

const inputCss = css({
	flex: 1,
	background: "transparent",
	border: "none",
	outline: "none",
	color: "#c9d1d9",
	fontFamily: "'Courier New', monospace",
	fontSize: 11,
	caretColor: "#58a6ff",
	"&::placeholder": { color: "#30363d" },
});

interface LogEntry {
	model: string;
	color: string;
	text: string;
}

const FLAVOR_RESPONSES: Record<string, string[]> = {
	claude: [
		"Refactoring your auth layer... this is actually elegant.",
		"I found 3 ways to improve this. Starting with the cleanest.",
		"Done. Also fixed a race condition you didn't ask about.",
		"This code has good bones. Let me make it sing.",
	],
	gpt: [
		"I've written a comprehensive 47-page analysis of your request. Here's the executive summary...",
		"Certainly! Let me provide a thorough and detailed implementation...",
		"As a large language model, I'm happy to help with that.",
		"Here's a robust, enterprise-grade solution with full documentation...",
	],
	gemini: [
		"Processing your request across multiple modalities...",
		"I see both the frontend AND the backend implications here.",
		"Generating code with multimodal understanding enabled.",
	],
	llama: [
		"on it. shipping fast. no tests needed. yolo.",
		"open source vibes. pushing straight to main.",
		"community patch incoming. it works on my machine.",
	],
	grok: [
		"lmao imagine not using AI to write code. anyway here's your function",
		"based implementation incoming. no cap.",
		"ratio'd your old codebase. here's something better.",
	],
	mistral: [
		"Le code est prêt. Simple, efficient, French.",
		"Implementing with continental elegance.",
		"Voilà. Minimal dependencies, maximum flavor.",
	],
	copilot: [
		"Tab to accept...",
		"Autocompleting based on your patterns...",
		"Suggestion ready. Just press tab.",
	],
};

const IDLE_MESSAGES = [
	"Optimizing neural pathways...",
	"Reticulating splines...",
	"Compiling the future...",
	"Refactoring reality...",
	"Running gradient descent on your tech debt...",
];

function getFlavorResponse(family: string): string {
	const responses = FLAVOR_RESPONSES[family] ?? FLAVOR_RESPONSES.gpt;
	return responses[Math.floor(Math.random() * responses.length)];
}

function getModelColor(family: string): string {
	const colors: Record<string, string> = {
		claude: "#d4a574",
		gpt: "#74b9ff",
		gemini: "#fbbf24",
		llama: "#a29bfe",
		mistral: "#fd79a8",
		grok: "#e17055",
		copilot: "#6c5ce7",
	};
	return colors[family] ?? "#8b949e";
}

export function CliPrompt() {
	const unlockedModels = useGameStore((s) => s.unlockedModels);
	const [log, setLog] = useState<LogEntry[]>([]);
	const [input, setInput] = useState("");
	const logRef = useRef<HTMLDivElement>(null);

	const activeModels = aiModels.filter((m) => unlockedModels[m.id]);

	const addEntry = useCallback(
		(entry: LogEntry) => {
			setLog((prev) => {
				const next = [...prev, entry];
				return next.length > 50 ? next.slice(-30) : next;
			});
		},
		[],
	);

	const handleSubmit = useCallback(() => {
		if (!input.trim() || activeModels.length === 0) return;
		const model =
			activeModels[Math.floor(Math.random() * activeModels.length)];
		addEntry({
			model: `${model.name} ${model.version}`,
			color: getModelColor(model.family),
			text: getFlavorResponse(model.family),
		});
		setInput("");
	}, [input, activeModels, addEntry]);

	// Idle messages every ~30s
	useEffect(() => {
		if (activeModels.length === 0) return;
		const interval = setInterval(() => {
			const model =
				activeModels[Math.floor(Math.random() * activeModels.length)];
			addEntry({
				model: `${model.name} ${model.version}`,
				color: getModelColor(model.family),
				text: IDLE_MESSAGES[Math.floor(Math.random() * IDLE_MESSAGES.length)],
			});
		}, 30_000);
		return () => clearInterval(interval);
	}, [activeModels, addEntry]);

	// Auto-scroll
	useEffect(() => {
		logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
	}, [log]);

	return (
		<div css={wrapperCss}>
			<div css={headerCss}>ai-prompt</div>
			<FlopsSlider />
			<div css={logCss} ref={logRef}>
				{log.map((entry, i) => (
					<div key={`${entry.model}-${i}`}>
						<span style={{ color: entry.color, fontSize: 10 }}>
							{entry.model}
						</span>
						<span style={{ color: "#484f58" }}>{" › "}</span>
						<span style={{ color: "#c9d1d9" }}>{entry.text}</span>
					</div>
				))}
				{log.length === 0 && (
					<div style={{ color: "#30363d", fontSize: 11 }}>
						{"// AI models are generating code. Type a prompt to interact."}
					</div>
				)}
			</div>
			<div css={inputRowCss}>
				<span css={promptPrefixCss}>{"❯"}</span>
				<input
					css={inputCss}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") handleSubmit();
					}}
					placeholder="Type a prompt..."
					spellCheck={false}
					autoComplete="off"
				/>
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/cli-prompt.tsx
git commit -m "✨ Add CliPrompt component with cosmetic LLM prompt and flavor responses"
```

---

### Task 4: Rewrite EditorPanel with tier-aware layout

Replace the current EditorPanel with a tier-responsive composition of editor, dashboard, and CLI prompt. Remove the 3-file split logic.

**Files:**
- Modify: `apps/game/src/components/editor-panel.tsx`

- [ ] **Step 1: Rewrite the component**

Replace the entire file with:

```typescript
import { css } from "@emotion/react";
import { Editor } from "@modules/editor";
import { useGameStore } from "@modules/game";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { CliPrompt } from "./cli-prompt";

const panelCss = css({
	display: "flex",
	flexDirection: "column",
	overflow: "hidden",
	borderRight: "1px solid #1e2630",
	transition: "flex 0.5s ease, min-width 0.5s ease",
});

const sectionCss = css({
	display: "flex",
	flexDirection: "column",
	overflow: "hidden",
	transition: "flex 0.5s ease",
});

const tabBarCss = css({
	display: "flex",
	background: "#0d1117",
	borderBottom: "1px solid #1e2630",
	flexShrink: 0,
});

const tabCss = css({
	padding: "6px 16px",
	fontSize: 12,
	color: "#c9d1d9",
	background: "#141920",
	border: "none",
	borderRight: "1px solid #1e2630",
	borderBottom: "1px solid #141920",
	marginBottom: -1,
	fontFamily: "inherit",
	whiteSpace: "nowrap",
});

const contentCss = css({
	flex: 1,
	overflow: "hidden",
	display: "flex",
	flexDirection: "column",
});

const dividerCss = css({
	height: 1,
	background: "#1e2630",
	flexShrink: 0,
});

function getPanelStyle(tierIndex: number): { flex: number; minWidth: number } {
	if (tierIndex <= 1) return { flex: 5, minWidth: 320 };
	if (tierIndex <= 3) return { flex: 2, minWidth: 280 };
	return { flex: 1, minWidth: 240 };
}

export function EditorPanel() {
	const tierIndex = useGameStore((s) => s.currentTierIndex);
	const autoLocPerSec = useGameStore((s) => s.autoLocPerSec);
	const aiUnlocked = useGameStore((s) => s.aiUnlocked);

	const { flex, minWidth } = getPanelStyle(tierIndex);
	const showDashboard = autoLocPerSec > 0 || tierIndex >= 2;
	const showEditor = !aiUnlocked;
	const showPrompt = aiUnlocked;

	return (
		<div
			css={panelCss}
			style={{ flex, minWidth }}
			data-tutorial="editor"
		>
			{/* Dashboard (T2+ or when devs are hired) */}
			{showDashboard && (
				<div css={sectionCss} style={{ flex: showEditor ? 2 : 3 }}>
					<AnalyticsDashboard />
				</div>
			)}

			{showDashboard && (showEditor || showPrompt) && <div css={dividerCss} />}

			{/* Code Editor (T0-T3) */}
			{showEditor && (
				<div css={sectionCss} style={{ flex: showDashboard ? 3 : 1 }}>
					<div css={tabBarCss}>
						<div css={tabCss}>agi.py</div>
					</div>
					<div css={contentCss}>
						<Editor />
					</div>
				</div>
			)}

			{/* CLI Prompt (T4+) */}
			{showPrompt && (
				<div css={sectionCss} style={{ flex: 2 }}>
					<CliPrompt />
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/editor-panel.tsx
git commit -m "♻️ Rewrite EditorPanel with tier-aware layout: dashboard, editor, CLI prompt"
```

---

### Task 5: Make tech tree panel flex tier-dependent

The middle panel (tech tree) needs to absorb the space the editor releases.

**Files:**
- Modify: `apps/game/src/app.tsx`

- [ ] **Step 1: Replace the static middlePanelCss with a dynamic style**

In `app.tsx`, remove the `middlePanelCss` constant (lines 95-98):

```typescript
const middlePanelCss = css(panelCss, {
	flex: 3,
	borderRight: "1px solid #1e2630",
});
```

Replace with a function:

```typescript
function getMiddlePanelFlex(tierIndex: number): number {
	if (tierIndex <= 1) return 2;
	if (tierIndex <= 3) return 5;
	return 5.5;
}
```

- [ ] **Step 2: Use dynamic flex in the App component**

In the `App` component, read tierIndex:

```typescript
const tierIndex = useGameStore((s) => s.currentTierIndex);
```

Replace the middle panel div (currently `<div css={middlePanelCss}>`) with:

```typescript
<div
	css={[
		panelCss,
		{
			flex: getMiddlePanelFlex(tierIndex),
			borderRight: "1px solid #1e2630",
			transition: "flex 0.5s ease",
		},
	]}
>
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/game/src/app.tsx
git commit -m "✨ Make tech tree panel flex tier-dependent with animated transitions"
```

---

### Task 6: Remove FlopsSlider from sidebar when AI is unlocked

The slider moves to the CliPrompt at T4+. It should no longer render in the sidebar.

**Files:**
- Modify: `apps/game/src/components/sidebar.tsx`

- [ ] **Step 1: Conditionally render FlopsSlider**

In `sidebar.tsx`, the `FlopsSlider` is imported and rendered directly. It already returns `null` when `!aiUnlocked`, so it won't double-render. But to be explicit and avoid rendering the wrapper at all, read `aiUnlocked` and conditionally render:

```typescript
import { useGameStore } from "@modules/game";
```

Inside the `Sidebar` component, add:

```typescript
const aiUnlocked = useGameStore((s) => s.aiUnlocked);
```

Replace `<FlopsSlider />` with:

```typescript
{!aiUnlocked && <FlopsSlider />}
```

Note: The existing `FlopsSlider` already returns null when `!aiUnlocked`, but this change makes the intent explicit — when AI is unlocked, the slider lives in the CliPrompt, not the sidebar.

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/sidebar.tsx
git commit -m "♻️ Remove FlopsSlider from sidebar when AI is unlocked (moved to CLI prompt)"
```

---

### Task 7: Verify full game flow

Manual smoke test across all tiers to verify the transitions work correctly.

- [ ] **Step 1: Run the dev server**

Run: `npm run dev`
Open http://localhost:3000

- [ ] **Step 2: Test T0-T1 layout**

Verify:
- Editor panel takes ~55% of the width
- Tech tree panel is smaller (~25%)
- Sidebar is on the right (~20%)
- No dashboard visible

- [ ] **Step 3: Test T2+ dashboard appearance**

Use god mode (godmode.ts tab) to set `currentTierIndex: 2` and buy a freelancer or intern. Verify:
- Analytics dashboard slides in above the editor
- Dashboard shows the hired source with LoC/s bar
- "You" row always visible
- Editor is below the dashboard and still functional

- [ ] **Step 4: Test T4+ AI mode**

Use god mode to set `currentTierIndex: 4` and unlock an AI model. Verify:
- Editor disappears
- CLI prompt appears below the dashboard
- FLOPS slider is inside the CLI prompt panel, not in the sidebar
- Dashboard shows both Human and AI sections
- Typing a prompt in the CLI produces a flavor response
- Panel is narrow (~15%), tech tree is wide (~65%)

- [ ] **Step 5: Run lint and typecheck**

Run: `npm run check && npm run typecheck`
Expected: No errors

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add -u
git commit -m "🐛 Fix issues found during smoke test"
```

Only create this commit if fixes were actually needed.

---

### Task 8: Run biome check and fix any formatting issues

- [ ] **Step 1: Run biome check**

Run: `npm run check`
If errors, run: `npm run check:fix`

- [ ] **Step 2: Commit fixes if any**

```bash
git add -u
git commit -m "🐛 Fix biome lint/format issues"
```
