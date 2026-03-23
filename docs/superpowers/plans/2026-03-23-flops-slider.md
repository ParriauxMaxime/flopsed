# FLOPS Allocation Slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a FLOPS allocation slider that splits FLOPS between execution (LoC → Cash) and AI generation (writes new LoC via owned AI models).

**Architecture:** New state fields (`flopSlider`, `aiLocAccumulator`) in the Zustand game store, AI block generation logic in `tick()`, and a new `<FlopsSlider />` component in the sidebar. Uses existing `unlockedModels` from the tech tree to determine AI unlock state.

**Tech Stack:** React 19, Zustand, Emotion CSS, TypeScript, ts-pattern

**Spec:** `docs/superpowers/specs/2026-03-23-flops-slider-design.md`

**Key deviation from spec:** The spec proposed adding `ownedModels: Record<string, boolean>`. However, `unlockedModels: Record<string, boolean>` already exists in `GameState` (types.ts:116), populated by `modelUnlock` effects in the tech tree. We use `unlockedModels` directly — no new ownership field needed.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/modules/game/types.ts` | Modify | Add `flopSlider`, `aiLocAccumulator`, `aiUnlocked` to `GameState`. Add `setFlopSlider` to `GameActions`. |
| `src/modules/game/store/game-store.ts` | Modify | Add fields to `initialState`, implement `setFlopSlider`, update `partialize`/`reset`, add AI generation + split execution to `tick()`, compute `aiUnlocked` in `recalcDerivedStats` |
| `src/modules/game/index.ts` | Modify | Export new types if needed |
| `src/components/flops-slider.tsx` | Create | Slider UI component (~80 lines) |
| `src/components/sidebar.tsx` | Modify | Render `<FlopsSlider />` between `<ResourceBar />` and `<TierProgress />` |
| `src/components/god-mode-page.tsx` | Modify | Add "Grant AI Model" button and slider override |

---

### Task 1: Add State Fields to Types

**Files:**
- Modify: `src/modules/game/types.ts:77-126` (GameState) and `:137-158` (GameActions)

- [ ] **Step 1: Add new fields to GameState interface**

In `src/modules/game/types.ts`, add these fields to the `GameState` interface:

After `unlockedModels` (line 116):
```typescript
	/** FLOPS allocation: 0–1 where 1 = 100% execution, 0 = 100% AI generation */
	flopSlider: number;
	/** Accumulator for fractional AI-generated LoC between ticks (not persisted) */
	aiLocAccumulator: number;
	/** Whether any AI model is unlocked (derived from unlockedModels) */
	aiUnlocked: boolean;
```

- [ ] **Step 2: Add setFlopSlider to GameActions interface**

In `src/modules/game/types.ts`, add after `applyEventReward` (line 157):
```typescript
	/** Set FLOPS allocation slider (0 = all AI, 1 = all execution) */
	setFlopSlider: (value: number) => void;
```

- [ ] **Step 3: Verify typecheck fails**

Run: `npm run typecheck`
Expected: errors in `game-store.ts` about missing properties `flopSlider`, `aiLocAccumulator`, `aiUnlocked`, `setFlopSlider`

- [ ] **Step 4: Commit**

```bash
git add src/modules/game/types.ts
git commit -m "✨ Add FLOPS slider state fields to GameState types"
```

---

### Task 2: Wire State Into Game Store

**Files:**
- Modify: `src/modules/game/store/game-store.ts:29-69` (initialState), `:112-343` (recalcDerivedStats), `:551-555` (reset), `:590-608` (persist)

- [ ] **Step 1: Add to initialState**

In `game-store.ts`, add to `initialState` (after `unlockedModels: {}` at line 61):
```typescript
	flopSlider: 0.7,
	aiLocAccumulator: 0,
	aiUnlocked: false,
```

- [ ] **Step 2: Compute `aiUnlocked` in recalcDerivedStats**

In `recalcDerivedStats`, after `state.unlockedModels = unlockedModels;` (line 342), add:
```typescript
	state.aiUnlocked = Object.values(unlockedModels).some(Boolean);
```

- [ ] **Step 3: Add `setFlopSlider` action**

In the store, after the `applyEventReward` action (line 588), add:
```typescript
			setFlopSlider: (value: number) => {
				set({ flopSlider: Math.min(1, Math.max(0, value)) });
			},
```

- [ ] **Step 4: Add `flopSlider` to partialize**

In the `partialize` config (line 592-604), add after `reachedMilestones`:
```typescript
				flopSlider: state.flopSlider,
```

- [ ] **Step 5: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS (all new fields initialized and actions implemented)

- [ ] **Step 6: Commit**

```bash
git add src/modules/game/store/game-store.ts
git commit -m "✨ Wire flopSlider state, persistence, and recalc into game store"
```

---

### Task 3: Add AI Generation + Split Execution to Tick

**Files:**
- Modify: `src/modules/game/store/game-store.ts:366-451` (tick function)

This is the core logic change. The tick function needs to:
1. Split FLOPS into execution and AI pools (only when `aiUnlocked`)
2. Generate AI blocks from the AI pool
3. Use execution pool (not total FLOPS) for block consumption

- [ ] **Step 1: Import AI models data at top of game-store.ts**

Add at the top of `game-store.ts` (with other imports, e.g. after line 9):
```typescript
import aiModelsData from "../../../../specs/data/ai-models.json";
```

And add the interface + parsed data (after existing data loading, near line 25):
```typescript
interface AiModelData {
	id: string;
	locPerSec: number;
	flopsCost: number;
}
const aiModels: AiModelData[] = aiModelsData.models as AiModelData[];
```

- [ ] **Step 2: Add AI generation and split execution to tick**

Replace lines 379–384 (from the `// Execute lines` comment through `let mutated = false;`) with the following code. The existing `while` loop at line 386 that consumes blocks from the queue must be **preserved** — it stays unchanged after this new block.

```typescript
					// ── FLOPS allocation ──
					const aiUnlocked = s.aiUnlocked;
					const effectiveFlops = aiUnlocked
						? s.flops * s.flopSlider
						: s.flops;
					let mutated = false;

					// AI generation: produce blocks from AI FLOPS
					let aiLocAccumulator = s.aiLocAccumulator;
					if (aiUnlocked && s.running) {
						const aiFlops = s.flops * (1 - s.flopSlider);
						let totalAiLoc = 0;
						let totalAiFlops = 0;
						for (const model of aiModels) {
							if (s.unlockedModels[model.id]) {
								totalAiLoc += model.locPerSec;
								totalAiFlops += model.flopsCost;
							}
						}
						if (totalAiFlops > 0) {
							const effectiveAiLoc =
								totalAiLoc * Math.min(1, aiFlops / totalAiFlops);
							aiLocAccumulator += effectiveAiLoc * dt;
						}
					}

					// Flush AI accumulator into blocks (10 LoC per block)
					const AI_BLOCK_SIZE = 10;
					while (aiLocAccumulator >= AI_BLOCK_SIZE) {
						aiLocAccumulator -= AI_BLOCK_SIZE;
						const aiLines = Array.from(
							{ length: AI_BLOCK_SIZE },
							() => '<span class="cm-comment">// ai</span>',
						);
						if (!mutated) {
							blockQueue = blockQueue.slice();
							mutated = true;
						}
						blockQueue.push({ lines: aiLines, loc: AI_BLOCK_SIZE });
						loc += AI_BLOCK_SIZE;
						totalLoc += AI_BLOCK_SIZE;
					}

					// Execute lines from queue via accumulated FLOPS (1 FLOP = 1 line)
					// When stopped, FLOPS don't execute — LoC piles up, no cash earned
					let progress = s.running
						? s.executionProgress + effectiveFlops * dt
						: s.executionProgress;
```

The existing `while` loop (lines 386–422) that consumes blocks remains **exactly as-is** after this code. The only change in it: remove the old `let mutated = false;` (now hoisted above).

- [ ] **Step 3: Add `aiLocAccumulator` to the tick return state**

In the `next` object (line 426-434), add:
```typescript
						aiLocAccumulator,
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Test manually via dev server**

Run: `npm run dev`
- Verify the game still works normally pre-AI (slider hidden, full FLOPS execute)
- Open God Mode → bump tier to 4+, verify no crashes

- [ ] **Step 6: Commit**

```bash
git add src/modules/game/store/game-store.ts
git commit -m "✨ Add AI block generation and split FLOPS execution to tick"
```

---

### Task 4: Build FlopsSlider Component

**Files:**
- Create: `src/components/flops-slider.tsx`

- [ ] **Step 1: Create the slider component**

Create `src/components/flops-slider.tsx`:

```typescript
import { css } from "@emotion/react";
import { useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useCallback, useMemo } from "react";
import aiModelsData from "../../../../specs/data/ai-models.json";

interface AiModelData {
	id: string;
	locPerSec: number;
	flopsCost: number;
}
const aiModels: AiModelData[] = aiModelsData.models as AiModelData[];

const wrapperCss = css({
	padding: "10px 12px",
	background: "#131820",
	borderBottom: "1px solid #1e2630",
});

const headerCss = css({
	display: "flex",
	justifyContent: "space-between",
	marginBottom: 6,
});

const labelCss = css({
	fontSize: 9,
	textTransform: "uppercase",
	letterSpacing: 0.5,
});

const sliderCss = css({
	width: "100%",
	height: 6,
	appearance: "none",
	background: "transparent",
	cursor: "pointer",
	"&::-webkit-slider-runnable-track": {
		height: 6,
		borderRadius: 3,
		background: "linear-gradient(90deg, #3fb950, #c678dd)",
	},
	"&::-webkit-slider-thumb": {
		appearance: "none",
		width: 14,
		height: 14,
		borderRadius: "50%",
		background: "#fff",
		border: "2px solid #c678dd",
		marginTop: -4,
	},
	"&::-moz-range-track": {
		height: 6,
		borderRadius: 3,
		background: "linear-gradient(90deg, #3fb950, #c678dd)",
	},
	"&::-moz-range-thumb": {
		width: 14,
		height: 14,
		borderRadius: "50%",
		background: "#fff",
		border: "2px solid #c678dd",
	},
});

const ratesCss = css({
	display: "flex",
	justifyContent: "space-between",
	marginTop: 4,
});

const rateCss = css({
	fontSize: 8,
	color: "#484e58",
});

export function FlopsSlider() {
	const aiUnlocked = useGameStore((s) => s.aiUnlocked);
	const flopSlider = useGameStore((s) => s.flopSlider);
	const flops = useGameStore((s) => s.flops);
	const unlockedModels = useGameStore((s) => s.unlockedModels);
	const setFlopSlider = useGameStore((s) => s.setFlopSlider);

	const execPct = Math.round(flopSlider * 100);
	const aiPct = 100 - execPct;
	const execFlops = flops * flopSlider;
	const aiFlops = flops * (1 - flopSlider);

	// Compute actual AI LoC/s rate (capped by available FLOPS)
	const aiLocPerSec = useMemo(() => {
		let totalAiLoc = 0;
		let totalAiFlops = 0;
		for (const model of aiModels) {
			if (unlockedModels[model.id]) {
				totalAiLoc += model.locPerSec;
				totalAiFlops += model.flopsCost;
			}
		}
		if (totalAiFlops === 0) return 0;
		return totalAiLoc * Math.min(1, aiFlops / totalAiFlops);
	}, [unlockedModels, aiFlops]);

	const onChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setFlopSlider(Number.parseFloat(e.target.value));
		},
		[setFlopSlider],
	);

	if (!aiUnlocked) return null;

	return (
		<div css={wrapperCss}>
			<div css={headerCss}>
				<span css={[labelCss, { color: "#3fb950" }]}>Exec {execPct}%</span>
				<span css={[labelCss, { color: "#c678dd" }]}>AI {aiPct}%</span>
			</div>
			<input
				type="range"
				min={0}
				max={1}
				step={0.01}
				value={flopSlider}
				onChange={onChange}
				css={sliderCss}
			/>
			<div css={ratesCss}>
				<span css={rateCss}>{formatNumber(execFlops)} loc/s exec</span>
				<span css={rateCss}>{formatNumber(aiLocPerSec)} loc/s gen</span>
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/flops-slider.tsx
git commit -m "✨ Add FlopsSlider component"
```

---

### Task 5: Wire FlopsSlider Into Sidebar

**Files:**
- Modify: `src/components/sidebar.tsx:89-132`

- [ ] **Step 1: Add import and render**

In `sidebar.tsx`, add import at top:
```typescript
import { FlopsSlider } from "./flops-slider";
```

In the `Sidebar` component JSX, add `<FlopsSlider />` between `<ResourceBar />` and `<TierProgress />` (between lines 96 and 97):
```tsx
			<ResourceBar />
			<FlopsSlider />
			<TierProgress />
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `npm run typecheck && npm run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "✨ Render FlopsSlider in sidebar between resource bar and tier progress"
```

---

### Task 6: Add God Mode Testing Controls

**Files:**
- Modify: `src/components/god-mode-page.tsx:122-199`

- [ ] **Step 1: Add AI model grant buttons to CheatsPanel**

In `god-mode-page.tsx`, import `useShallow`'s state selection to include `unlockedModels` and `flopSlider`. Add after the Tier row (after line 186):

```typescript
			<div css={[headingCss, { marginTop: 12 }]}>AI Models</div>
			<div css={rowCss}>
				<span css={labelCss}>Slider</span>
				<span css={valueCss}>{Math.round(state.flopSlider * 100)}%</span>
			</div>
			{["copilot", "claude_haiku", "claude_sonnet"].map((id) => (
				<div css={rowCss} key={id}>
					<span css={labelCss}>{id}</span>
					<span css={valueCss}>
						{state.unlockedModels[id] ? "✓" : "—"}
					</span>
					<button
						css={bumpBtnCss}
						type="button"
						onClick={() => {
							// Directly set unlockedModels via godSet-like pattern
							const current = useGameStore.getState();
							useGameStore.setState({
								unlockedModels: {
									...current.unlockedModels,
									[id]: true,
								},
							});
							useGameStore.getState().recalc();
						}}
					>
						Grant
					</button>
				</div>
			))}
```

Update the `useShallow` selector (line 125-133) to include:
```typescript
			flopSlider: s.flopSlider,
			unlockedModels: s.unlockedModels,
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Test manually**

Run: `npm run dev`
1. Navigate to God Mode page
2. Click "Grant" next to "copilot"
3. Verify the FLOPS slider appears in the sidebar
4. Drag the slider — verify execution rate changes
5. Verify AI blocks appear in the queue when AI has FLOPS
6. Set slider to 0% (all AI) — verify no execution happens
7. Set slider to 100% (all execution) — verify no AI generation

- [ ] **Step 4: Commit**

```bash
git add src/components/god-mode-page.tsx
git commit -m "✨ Add AI model grant buttons and slider display to God Mode"
```

---

### Task 7: Lint, Typecheck, Final Verification

- [ ] **Step 1: Run full checks**

```bash
npm run typecheck && npm run check
```
Expected: PASS with no errors

- [ ] **Step 2: Fix any lint issues**

Run: `npm run check:fix`

- [ ] **Step 3: Final manual test**

1. Fresh game: slider hidden, all FLOPS execute normally
2. God Mode: grant a model → slider appears
3. Slider at 70/30 default → AI generates blocks, execution runs at 70%
4. Slider at 0% → AI generates, nothing executes, LoC piles up
5. Slider at 100% → no AI generation, all FLOPS execute
6. Reset game → slider hidden again, flopSlider resets to 0.7

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "🐛 Fix lint issues from FLOPS slider implementation"
```
