# FLOPS Slider v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken greedy FLOPS allocation with a player-controlled slider and auto-arbitrage tech unlock, and rebalance token costs so FLOPS is the primary gate.

**Architecture:** Add `flopSlider` state (0–1) to the Zustand game store. The tick function splits total FLOPS into exec and AI pools based on the slider before allocating. A new "Auto-Arbitrage" tech node enables automatic slider optimization using throughput matching + queue pressure. The existing display-only FlopsSlider component becomes an interactive `<input type="range">`.

**Tech Stack:** React 19, Emotion CSS-in-JS, Zustand, ts-pattern, i18next

---

### Task 1: Reduce T4 AI model tokenCost values

**Files:**
- Modify: `libs/domain/data/ai-models.json`

- [ ] **Step 1: Update T4 model tokenCost values**

In `libs/domain/data/ai-models.json`, change these `tokenCost` fields (T4 models only, leave T5 unchanged):

| id | current tokenCost | new tokenCost |
|----|-------------------|---------------|
| copilot | 150 | 30 |
| claude_haiku | 80 | 15 |
| claude_sonnet | 500 | 80 |
| gpt_3 | 50 | 10 |
| gpt_35 | 150 | 25 |
| gpt_4 | 800 | 120 |
| gpt_41 | 1000 | 150 |
| gemini_pro | 600 | 90 |
| llama_70b | 300 | 50 |
| llama_405b | 2500 | 400 |
| mistral_large | 400 | 60 |
| grok_2 | 1200 | 180 |

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('libs/domain/data/ai-models.json','utf8')); console.log('OK')"`

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add libs/domain/data/ai-models.json
git commit -m "⚖️ Reduce T4 AI model tokenCost (~5-7x) to make FLOPS the primary gate"
```

---

### Task 2: Add flopSlider and autoArbitrage state to game store

**Files:**
- Modify: `apps/game/src/modules/game/store/game-store.ts`

- [ ] **Step 1: Add fields to GameState interface**

In `apps/game/src/modules/game/store/game-store.ts`, add these fields to the `GameState` interface (after `autoPokeEnabled: boolean` at line 112):

```typescript
	flopSlider: number;
	autoArbitrageEnabled: boolean;
	autoArbitrageOverride: boolean;
	autoArbitrageOverrideAt: number;
```

- [ ] **Step 2: Add setFlopSlider to GameActions interface**

In the `GameActions` interface (after `recalc` at line 149), add:

```typescript
	setFlopSlider: (value: number) => void;
```

- [ ] **Step 3: Add defaults to initialState**

In the `initialState` object, add after `autoPokeEnabled: false` (line 200):

```typescript
	flopSlider: 0.7,
	autoArbitrageEnabled: false,
	autoArbitrageOverride: false,
	autoArbitrageOverrideAt: 0,
```

- [ ] **Step 4: Add setFlopSlider action**

In the store creation, add a new action after the `applyEventReward` action (before the closing `}`):

```typescript
			setFlopSlider: (value: number) => {
				set({
					flopSlider: Math.min(1, Math.max(0, value)),
					autoArbitrageOverride: true,
					autoArbitrageOverrideAt: performance.now(),
				});
			},
```

- [ ] **Step 5: Handle auto_arbitrage in researchNode**

In the `researchNode` action, after the line `if (node.id === "auto_poke") newState.autoPokeEnabled = true;` (line 774), add:

```typescript
					if (node.id === "auto_arbitrage") newState.autoArbitrageEnabled = true;
```

- [ ] **Step 6: Add flopSlider and autoArbitrageEnabled to partialize**

In the `partialize` config (line 852), add after `autoPokeEnabled: state.autoPokeEnabled,`:

```typescript
				flopSlider: state.flopSlider,
				autoArbitrageEnabled: state.autoArbitrageEnabled,
```

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`

Expected: No new errors from the store changes (existing errors may remain).

- [ ] **Step 8: Commit**

```bash
git add apps/game/src/modules/game/store/game-store.ts
git commit -m "✨ Add flopSlider and autoArbitrage state to game store"
```

---

### Task 3: Rewrite tick function to use slider-based FLOPS split

**Files:**
- Modify: `apps/game/src/modules/game/store/game-store.ts`

- [ ] **Step 1: Replace greedy FLOPS allocation in tick's AI section**

In the tick function, replace the AI FLOPS allocation block (lines 569–579):

```typescript
						// AI LoC output (gated by tokens AND FLOPS)
						let remainingFlops = s.flops;
						for (const model of activeModels) {
							const modelFlops = Math.min(model.flopsCost, remainingFlops);
							aiFlopsCost += modelFlops;
							remainingFlops -= modelFlops;
							const flopRatio =
								model.flopsCost > 0 ? modelFlops / model.flopsCost : 0;
							aiProduced +=
								model.locPerSec * tokenEfficiency * Math.min(1, flopRatio) * dt;
						}
```

With:

```typescript
						// AI LoC output (gated by tokens AND slider-allocated FLOPS)
						const aiFlops = s.flops * (1 - s.flopSlider);
						let remainingAiFlops = aiFlops;
						for (const model of activeModels) {
							const modelFlops = Math.min(model.flopsCost, remainingAiFlops);
							aiFlopsCost += modelFlops;
							remainingAiFlops -= modelFlops;
							const flopRatio =
								model.flopsCost > 0 ? modelFlops / model.flopsCost : 0;
							aiProduced +=
								model.locPerSec * tokenEfficiency * Math.min(1, flopRatio) * dt;
						}
```

- [ ] **Step 2: Replace execution FLOPS calculation**

Replace line 592:

```typescript
					const execFlops = Math.max(0, s.flops - aiFlopsCost);
```

With:

```typescript
					const execFlops = aiUnlocked
						? s.flops * s.flopSlider
						: s.flops;
```

- [ ] **Step 3: Fix executeManual to use slider-based FLOPS**

In the `executeManual` action (lines 801–814), replace the FLOPS calculation:

```typescript
				executeManual: () => {
					const s = get();
					if (s.autoExecuteEnabled || s.flops <= 0) return;
					// Remaining FLOPS after AI models consume their share
					let aiFlopsCost = 0;
					if (s.aiUnlocked) {
						for (const model of aiModels) {
							if (s.unlockedModels[model.id]) aiFlopsCost += model.flopsCost;
						}
					}
					const execFlops = Math.max(0, s.flops - Math.min(aiFlopsCost, s.flops));
					if (execFlops <= 0) return;
					set({ manualExecAccum: s.manualExecAccum + execFlops });
				},
```

With:

```typescript
				executeManual: () => {
					const s = get();
					if (s.autoExecuteEnabled || s.flops <= 0) return;
					const execFlops = s.aiUnlocked
						? s.flops * s.flopSlider
						: s.flops;
					if (execFlops <= 0) return;
					set({ manualExecAccum: s.manualExecAccum + execFlops });
				},
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`

Expected: Pass (no new errors).

- [ ] **Step 5: Commit**

```bash
git add apps/game/src/modules/game/store/game-store.ts
git commit -m "🐛 Use slider-based FLOPS split instead of greedy AI allocation"
```

---

### Task 4: Add auto-arbitrage algorithm to tick

**Files:**
- Modify: `apps/game/src/modules/game/store/game-store.ts`

- [ ] **Step 1: Add auto-arbitrage logic at the end of the tick function**

In the tick function, after the analytics snapshot section (after line 686 `}`), but before `return next;` (line 688), add:

```typescript
					// ── 5. Auto-arbitrage (smooth slider adjustment) ──
					if (
						s.autoArbitrageEnabled &&
						!s.autoArbitrageOverride &&
						aiUnlocked
					) {
						// Compute AI production rate at current slider
						const currentAiFlops = s.flops * (1 - s.flopSlider);
						let aiLocRate = 0;
						let remainingForCalc = currentAiFlops;
						const activeForCalc = aiModels
							.filter((m) => s.unlockedModels[m.id])
							.sort((a, b) => b.locPerSec - a.locPerSec)
							.slice(0, s.llmHostSlots);
						for (const model of activeForCalc) {
							const mf = Math.min(model.flopsCost, remainingForCalc);
							remainingForCalc -= mf;
							const ratio =
								model.flopsCost > 0 ? mf / model.flopsCost : 0;
							aiLocRate += model.locPerSec * Math.min(1, ratio);
						}

						// Target: match exec rate to AI production rate
						let targetSlider =
							s.flops > 0 ? aiLocRate / s.flops : 0.7;

						// Queue pressure bias
						const currentExecFlops = s.flops * s.flopSlider;
						if (loc > currentExecFlops * 5) {
							targetSlider += 0.05; // queue backing up → more exec
						} else if (loc < currentExecFlops * 1) {
							targetSlider -= 0.05; // queue nearly empty → more AI
						}

						// Clamp
						targetSlider = Math.min(0.95, Math.max(0.1, targetSlider));

						// Smooth lerp
						const newSlider =
							s.flopSlider + (targetSlider - s.flopSlider) * 0.02;
						next.flopSlider = Math.min(
							0.95,
							Math.max(0.1, newSlider),
						);
					}

					// Auto-arbitrage override timeout (10s)
					if (
						s.autoArbitrageOverride &&
						performance.now() - s.autoArbitrageOverrideAt > 10000
					) {
						next.autoArbitrageOverride = false;
					}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

Expected: Pass.

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/modules/game/store/game-store.ts
git commit -m "✨ Add auto-arbitrage algorithm to game tick"
```

---

### Task 5: Rewrite FlopsSlider component to be interactive

**Files:**
- Modify: `apps/game/src/components/flops-slider.tsx`

- [ ] **Step 1: Rewrite the FlopsSlider component**

Replace the entire contents of `apps/game/src/components/flops-slider.tsx` with:

```typescript
import { css } from "@emotion/react";
import { aiModels, useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

const wrapperCss = css({
	padding: "8px 12px",
	background: "#131820",
	borderBottom: "1px solid #1e2630",
});

const labelRowCss = css({
	display: "flex",
	justifyContent: "space-between",
	marginBottom: 4,
});

const labelCss = css({
	fontSize: 9,
	textTransform: "uppercase",
	letterSpacing: 0.5,
});

const sliderCss = css({
	width: "100%",
	height: 10,
	borderRadius: 5,
	appearance: "none",
	outline: "none",
	cursor: "grab",
	"&:active": { cursor: "grabbing" },
	"&::-webkit-slider-thumb": {
		appearance: "none",
		width: 16,
		height: 16,
		borderRadius: "50%",
		background: "#e6edf3",
		border: "2px solid #0d1117",
		boxShadow: "0 0 4px rgba(0,0,0,0.5)",
		cursor: "grab",
	},
	"&::-moz-range-thumb": {
		width: 16,
		height: 16,
		borderRadius: "50%",
		background: "#e6edf3",
		border: "2px solid #0d1117",
		boxShadow: "0 0 4px rgba(0,0,0,0.5)",
		cursor: "grab",
	},
});

const ratesCss = css({
	display: "flex",
	justifyContent: "space-between",
	marginTop: 4,
});

const rateCss = css({
	fontSize: 9,
	color: "#484e58",
});

const arbitrageCss = css({
	display: "flex",
	alignItems: "center",
	gap: 8,
	marginTop: 6,
	padding: "4px 0",
});

export function FlopsSlider() {
	const { t } = useTranslation();
	const aiUnlocked = useGameStore((s) => s.aiUnlocked);
	const flops = useGameStore((s) => s.flops);
	const flopSlider = useGameStore((s) => s.flopSlider);
	const unlockedModels = useGameStore((s) => s.unlockedModels);
	const llmHostSlots = useGameStore((s) => s.llmHostSlots);
	const autoArbitrageEnabled = useGameStore(
		(s) => s.autoArbitrageEnabled,
	);
	const setFlopSlider = useGameStore((s) => s.setFlopSlider);

	const { aiLocPerSec } = useMemo(() => {
		const active = aiModels
			.filter((m) => unlockedModels[m.id])
			.sort((a, b) => b.locPerSec - a.locPerSec)
			.slice(0, llmHostSlots);
		const aiFlops = flops * (1 - flopSlider);
		let totalLoc = 0;
		let remaining = aiFlops;
		for (const model of active) {
			const modelFlops = Math.min(model.flopsCost, remaining);
			remaining -= modelFlops;
			const ratio =
				model.flopsCost > 0 ? modelFlops / model.flopsCost : 0;
			totalLoc += model.locPerSec * Math.min(1, ratio);
		}
		return { aiLocPerSec: totalLoc };
	}, [unlockedModels, flops, flopSlider, llmHostSlots]);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setFlopSlider(Number.parseFloat(e.target.value));
		},
		[setFlopSlider],
	);

	if (!aiUnlocked) return null;

	const execFlops = flops * flopSlider;
	const aiFlops = flops * (1 - flopSlider);
	const execPct = Math.round(flopSlider * 100);

	// Build slider background gradient
	const sliderBg = `linear-gradient(90deg, #3fb950 0%, #3fb950 ${execPct}%, #c678dd ${execPct}%, #c678dd 100%)`;

	return (
		<div css={wrapperCss}>
			<div css={labelRowCss}>
				<span css={[labelCss, { color: "#3fb950" }]}>
					{t("flops_slider.exec_flops", {
						count: formatNumber(execFlops),
					})}
				</span>
				<span css={[labelCss, { color: "#c678dd" }]}>
					{t("flops_slider.ai_flops", {
						count: formatNumber(aiFlops),
					})}
				</span>
			</div>
			<input
				type="range"
				min={0}
				max={1}
				step={0.01}
				value={flopSlider}
				onChange={handleChange}
				css={sliderCss}
				style={{ background: sliderBg }}
			/>
			<div css={ratesCss}>
				<span css={rateCss}>
					{t("flops_slider.exec_rate", {
						count: formatNumber(execFlops),
					})}
				</span>
				<span css={rateCss}>
					{t("flops_slider.ai_rate", {
						count: formatNumber(aiLocPerSec),
					})}
				</span>
			</div>
			{autoArbitrageEnabled && (
				<div css={arbitrageCss}>
					<span style={{ fontSize: 14 }}>{"⚖️"}</span>
					<span style={{ fontSize: 11, color: "#e5c07b" }}>
						{t("flops_slider.auto_arbitrage_active")}
					</span>
					<span
						style={{
							marginLeft: "auto",
							fontSize: 10,
							color: "#484e58",
						}}
					>
						{t("flops_slider.targeting", { pct: execPct })}
					</span>
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

Expected: Pass.

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/flops-slider.tsx
git commit -m "✨ Make FlopsSlider interactive with draggable thumb and auto-arbitrage indicator"
```

---

### Task 6: Add auto_arbitrage tech tree node

**Files:**
- Modify: `libs/domain/data/tech-tree.json`

- [ ] **Step 1: Add the auto_arbitrage node**

In `libs/domain/data/tech-tree.json`, add this node after the `auto_poke` node (after its closing `}`). The `auto_poke` node is at approximately line 1135–1152, ending with `"y": 1460`. Add a comma after the `auto_poke` closing `}` and insert:

```json
		{
			"id": "auto_arbitrage",
			"name": "Auto-Arbitrage",
			"description": "Automatically optimizes FLOPS allocation for maximum cash flow.",
			"icon": "⚖️",
			"requires": ["gpu_farm"],
			"max": 1,
			"baseCost": 50000000,
			"costMultiplier": 1,
			"currency": "cash",
			"effects": [
				{
					"type": "autoArbitrage",
					"op": "enable",
					"value": 1
				}
			],
			"x": 146,
			"y": 1000
		}
```

The x/y position places it directly below `gpu_farm` (x:146, y:874).

- [ ] **Step 2: Add the effect handler in recalcDerivedStats**

In `apps/game/src/modules/game/store/game-store.ts`, in the `applyEffect` function's match chain, add a new case before the `.otherwise` (before line 401):

```typescript
			.with({ type: "autoArbitrage", op: "enable" }, () => {})
```

This is a no-op in recalc — the actual enablement is handled in `researchNode`. But the match needs to handle it to avoid falling through to `.otherwise`.

- [ ] **Step 3: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('libs/domain/data/tech-tree.json','utf8')); console.log('OK')"`

Expected: `OK`

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`

Expected: Pass.

- [ ] **Step 5: Commit**

```bash
git add libs/domain/data/tech-tree.json apps/game/src/modules/game/store/game-store.ts
git commit -m "✨ Add auto_arbitrage tech tree node (requires gpu_farm, $50M)"
```

---

### Task 7: Add i18n translations for all 8 locales

**Files:**
- Modify: `apps/game/src/i18n/locales/en/ui.json`
- Modify: `apps/game/src/i18n/locales/fr/ui.json`
- Modify: `apps/game/src/i18n/locales/it/ui.json`
- Modify: `apps/game/src/i18n/locales/de/ui.json`
- Modify: `apps/game/src/i18n/locales/es/ui.json`
- Modify: `apps/game/src/i18n/locales/pl/ui.json`
- Modify: `apps/game/src/i18n/locales/zh/ui.json`
- Modify: `apps/game/src/i18n/locales/ru/ui.json`
- Modify: `apps/game/src/i18n/locales/en/tech-tree.json`
- Modify: `apps/game/src/i18n/locales/fr/tech-tree.json`
- Modify: `apps/game/src/i18n/locales/it/tech-tree.json`
- Modify: `apps/game/src/i18n/locales/de/tech-tree.json`
- Modify: `apps/game/src/i18n/locales/es/tech-tree.json`
- Modify: `apps/game/src/i18n/locales/pl/tech-tree.json`
- Modify: `apps/game/src/i18n/locales/zh/tech-tree.json`
- Modify: `apps/game/src/i18n/locales/ru/tech-tree.json`

- [ ] **Step 1: Add flops_slider keys to ui.json (all 8 locales)**

In each locale's `ui.json`, add two keys inside the existing `"flops_slider"` block, after `"ai_rate"`:

**en:**
```json
		"auto_arbitrage_active": "Auto-Arbitrage active",
		"targeting": "targeting {{pct}}%"
```

**fr:**
```json
		"auto_arbitrage_active": "Auto-Arbitrage actif",
		"targeting": "cible {{pct}}%"
```

**it:**
```json
		"auto_arbitrage_active": "Auto-Arbitraggio attivo",
		"targeting": "obiettivo {{pct}}%"
```

**de:**
```json
		"auto_arbitrage_active": "Auto-Arbitrage aktiv",
		"targeting": "Ziel {{pct}}%"
```

**es:**
```json
		"auto_arbitrage_active": "Auto-Arbitraje activo",
		"targeting": "objetivo {{pct}}%"
```

**pl:**
```json
		"auto_arbitrage_active": "Auto-Arbitraż aktywny",
		"targeting": "cel {{pct}}%"
```

**zh:**
```json
		"auto_arbitrage_active": "自动套利已启用",
		"targeting": "目标 {{pct}}%"
```

**ru:**
```json
		"auto_arbitrage_active": "Авто-арбитраж активен",
		"targeting": "цель {{pct}}%"
```

- [ ] **Step 2: Add auto_arbitrage to tech-tree.json (all 8 locales)**

In each locale's `tech-tree.json`, add after the `"auto_poke"` entry:

**en:**
```json
	"auto_arbitrage": {
		"name": "Auto-Arbitrage",
		"description": "Automatically optimizes FLOPS allocation for maximum cash flow."
	}
```

**fr:**
```json
	"auto_arbitrage": {
		"name": "Auto-Arbitrage",
		"description": "Optimise automatiquement l'allocation FLOPS pour maximiser les revenus."
	}
```

**it:**
```json
	"auto_arbitrage": {
		"name": "Auto-Arbitraggio",
		"description": "Ottimizza automaticamente l'allocazione FLOPS per massimizzare i ricavi."
	}
```

**de:**
```json
	"auto_arbitrage": {
		"name": "Auto-Arbitrage",
		"description": "Optimiert automatisch die FLOPS-Zuweisung für maximalen Cashflow."
	}
```

**es:**
```json
	"auto_arbitrage": {
		"name": "Auto-Arbitraje",
		"description": "Optimiza automáticamente la asignación de FLOPS para máximo flujo de caja."
	}
```

**pl:**
```json
	"auto_arbitrage": {
		"name": "Auto-Arbitraż",
		"description": "Automatycznie optymalizuje alokację FLOPS dla maksymalnego przepływu gotówki."
	}
```

**zh:**
```json
	"auto_arbitrage": {
		"name": "自动套利",
		"description": "自动优化FLOPS分配以最大化现金流。"
	}
```

**ru:**
```json
	"auto_arbitrage": {
		"name": "Авто-арбитраж",
		"description": "Автоматически оптимизирует распределение FLOPS для максимального денежного потока."
	}
```

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/i18n/locales/
git commit -m "🌐 Add i18n translations for auto-arbitrage (8 locales)"
```

---

### Task 8: Lint, build, and validate

**Files:** None (validation only)

- [ ] **Step 1: Run biome check**

Run: `npm run check:fix`

Fix any formatting issues that biome auto-corrects.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: Pass (or only pre-existing errors).

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: Build succeeds.

- [ ] **Step 4: Run balance simulation**

Run: `npm run sim`

Check that the simulation still passes. The reduced tokenCost values should not break pacing. If any checks fail, note them for investigation.

- [ ] **Step 5: Commit any lint fixes**

```bash
git add -A
git commit -m "🐛 Fix lint issues from FLOPS slider v2"
```
