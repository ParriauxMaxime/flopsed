# Prestige System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a prestige system where the acquihire_offer event lets players reset to T0 with 5% cash and a permanent 1.7x compounding $/LoC multiplier, capped at 5 prestiges.

**Architecture:** Two new fields (`prestigeCount`, `prestigeMultiplier`) on `GameState` that survive resets. The prestige multiplier is applied during `recalcDerivedStats` as a factor on `cashMultiplier`. A new `prestige` effect type triggers the reset from the event choice handler. The event picker skips the acquihire event when prestige is maxed.

**Tech Stack:** Zustand, React, ts-pattern, Emotion, i18next

---

### Task 1: Add prestige state + prestige action to game store

**Files:**
- Modify: `apps/game/src/modules/game/store/game-store.ts`

- [ ] **Step 1: Add prestige fields to GameState interface**

After `editorStreamingMode: boolean;` (line ~128), add:

```typescript
prestigeCount: number;
prestigeMultiplier: number;
```

- [ ] **Step 2: Add prestige action to GameActions interface**

After `applyEventReward: (cashDelta: number, locDelta: number) => void;` (line ~157), add:

```typescript
prestige: () => void;
```

- [ ] **Step 3: Add prestige fields to initialState**

After `editorStreamingMode: false,` (line ~214), add:

```typescript
prestigeCount: 0,
prestigeMultiplier: 1,
```

- [ ] **Step 4: Apply prestigeMultiplier in recalcDerivedStats**

In `recalcDerivedStats`, after the event modifier line `cashMultiplier *= eventMods.cashMultiplier;` (line ~458), add:

```typescript
cashMultiplier *= state.prestigeMultiplier;
```

- [ ] **Step 5: Modify reset() to preserve prestige fields**

Replace the current `reset` action (line ~903):

```typescript
reset: () => {
	const { prestigeCount, prestigeMultiplier } = get();
	set({ ...initialState, prestigeCount, prestigeMultiplier });
	localStorage.removeItem("flopsed-editor");
	useEventStore.getState().reset();
},
```

- [ ] **Step 6: Add prestige() action**

After the `reset` action, add:

```typescript
prestige: () => {
	const s = get();
	if (s.prestigeCount >= 5) return;
	const keptCash = s.cash * 0.05;
	const newCount = s.prestigeCount + 1;
	const newMult = 1.7 ** newCount;
	// Reset preserves prestige fields
	const { prestigeCount: _pc, prestigeMultiplier: _pm, ...rest } = initialState;
	set({
		...rest,
		...initialState,
		prestigeCount: newCount,
		prestigeMultiplier: newMult,
		cash: keptCash,
		totalCash: keptCash,
	});
	localStorage.removeItem("flopsed-editor");
	useEventStore.getState().reset();
},
```

- [ ] **Step 7: Verify typecheck passes**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add apps/game/src/modules/game/store/game-store.ts
git commit -m "feat: add prestige state, action, and cashMultiplier integration"
```

---

### Task 2: Update event data and handle prestige effect in toast

**Files:**
- Modify: `libs/domain/data/events.json`
- Modify: `apps/game/src/modules/event/components/event-toast.tsx`
- Modify: `apps/game/src/modules/event/store/event-store.ts`

- [ ] **Step 1: Update acquihire_offer in events.json**

Replace the entire `acquihire_offer` object in `libs/domain/data/events.json` with:

```json
{
	"id": "acquihire_offer",
	"name": "Acqui-hire Offer",
	"description": "Big Tech wants to buy you out. Sell for a permanent edge, or stay indie?",
	"icon": "🤝",
	"minTier": "startup",
	"maxTier": "tech_company",
	"duration": 0,
	"effects": [
		{
			"type": "choice",
			"options": [
				{
					"label": "Sell out",
					"effect": { "type": "prestige", "op": "trigger", "value": true }
				},
				{
					"label": "Stay indie",
					"effect": { "type": "cashMultiplier", "op": "multiply", "value": 1.1, "duration": 120 }
				}
			]
		}
	],
	"weight": 3
}
```

- [ ] **Step 2: Handle prestige effect in event-toast.tsx**

In `event-toast.tsx`, find the choice button `onClick` handler (the block that calls `resolveChoiceEffects` and `handleChoice`). Wrap the existing logic with a prestige check. The full replacement for the `onClick` on the choice button:

```typescript
onClick={() => {
	const chosenEffect = opt.effect;
	if (
		chosenEffect.type === "prestige" &&
		"op" in chosenEffect &&
		chosenEffect.op === "trigger"
	) {
		handleChoice(displayId, i, ctx);
		useGameStore.getState().prestige();
		return;
	}
	const { cashDelta, locDelta } = resolveChoiceEffects(
		chosenEffect,
		ctx,
	);
	handleChoice(displayId, i, ctx);
	applyEventReward(cashDelta, locDelta);
}}
```

Note: `useGameStore` is already imported in this file.

- [ ] **Step 3: Add prestige guard to event picker**

In `apps/game/src/modules/event/store/event-store.ts`, modify `pickWeightedEvent` (line ~31). Add a filter that excludes `acquihire_offer` when prestige is maxed:

```typescript
function pickWeightedEvent(tierIndex: number): EventDefinition | null {
	const prestigeCount = useGameStore.getState().prestigeCount;
	const eligible = allEvents.filter(
		(e) =>
			TIER_INDEX[e.minTier] <= tierIndex &&
			(e.maxTier == null || TIER_INDEX[e.maxTier] >= tierIndex) &&
			!(e.id === "acquihire_offer" && prestigeCount >= 5),
	);
	if (eligible.length === 0) return null;

	const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
	let roll = Math.random() * totalWeight;
	for (const e of eligible) {
		roll -= e.weight;
		if (roll <= 0) return e;
	}
	return eligible[eligible.length - 1];
}
```

This requires importing `useGameStore` in the event store. Add at the top of the file:

```typescript
import { useGameStore } from "@modules/game";
```

Check for circular imports: `game-store.ts` already imports `useEventStore`, so `event-store.ts` importing `useGameStore` creates a cycle. However, since both are Zustand stores and the import is only used inside a function body (not at module level for initialization), this is safe — the stores are already initialized by the time `pickWeightedEvent` runs.

- [ ] **Step 4: Verify typecheck and lint pass**

Run: `npm run typecheck && npm run check`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add libs/domain/data/events.json apps/game/src/modules/event/components/event-toast.tsx apps/game/src/modules/event/store/event-store.ts
git commit -m "feat: wire prestige effect to acquihire event and guard at max prestige"
```

---

### Task 3: Add prestige badge to status bar

**Files:**
- Modify: `apps/game/src/components/status-bar.tsx`

- [ ] **Step 1: Add prestige indicator to status bar**

In `status-bar.tsx`, add a prestige badge next to the tier name. Import `prestigeCount` from the game store and render it conditionally.

Add this selector near the other `useGameStore` selectors:

```typescript
const prestigeCount = useGameStore((s) => s.prestigeCount);
const prestigeMultiplier = useGameStore((s) => s.prestigeMultiplier);
```

Then in the JSX, add a prestige badge after the tier name span (in the left section of the status bar). Find the tier name display and add after it:

```typescript
{prestigeCount > 0 && (
	<span css={{
		marginLeft: 8,
		color: "#d29922",
		fontWeight: "bold",
		fontSize: 11,
	}}>
		{"★".repeat(prestigeCount)} {prestigeMultiplier.toFixed(1)}x
	</span>
)}
```

- [ ] **Step 2: Verify it renders**

Run: `npm run dev`
Open game, use god mode to test: in browser console, run `useGameStore.setState({ prestigeCount: 2, prestigeMultiplier: 2.89 })` — should see "★★ 2.9x" in status bar.

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/status-bar.tsx
git commit -m "feat: add prestige star badge to status bar"
```

---

### Task 4: Add prestigeMultiplier to balance sim

**Files:**
- Modify: `libs/engine/types.ts`
- Modify: `libs/engine/balance-sim.ts`

- [ ] **Step 1: Add prestigeMultiplier to SimConfig**

In `libs/engine/types.ts`, add to `SimConfig` interface after `maxMinutes: number;`:

```typescript
prestigeMultiplier?: number;
```

- [ ] **Step 2: Apply prestigeMultiplier in sim's cashPerLoc**

In `libs/engine/balance-sim.ts`, read the config value in `runBalanceSim` after the `DEFAULT_CONFIG` merge (line ~53):

```typescript
const prestigeMult = cfg.prestigeMultiplier ?? 1;
```

Then update the `cashPerLoc()` function to include it:

```typescript
function cashPerLoc(): number {
	return (
		tiers[sim.currentTier].cashPerLoc *
		sim.cashMultiplier *
		eventCashMultiplier *
		prestigeMult
	);
}
```

- [ ] **Step 3: Add --prestige flag to CLI sim runner**

In `apps/simulation/src/main.ts`, add flag parsing after the `greedyMode` line:

```typescript
const prestigeLevel = args.includes("--prestige")
	? Number(args[args.indexOf("--prestige") + 1]) || 0
	: 0;
```

Then pass it to both `validateProfile` and trace calls. In `validateProfile`, add to the config spread:

```typescript
...(prestigeLevel > 0 && { prestigeMultiplier: 1.7 ** prestigeLevel }),
```

Do the same in the trace mode `runBalanceSim` call.

- [ ] **Step 4: Verify sim works with prestige flag**

Run: `npm run sim -- --greedy --prestige 3 --verbose --profile fast`
Expected: significantly faster AGI time (~7min) due to 4.91x multiplier

- [ ] **Step 5: Commit**

```bash
git add libs/engine/types.ts libs/engine/balance-sim.ts apps/simulation/src/main.ts
git commit -m "feat: add prestigeMultiplier to balance sim and CLI flag"
```

---

### Task 5: Update i18n for all 8 locales

**Files:**
- Modify: `apps/game/src/i18n/locales/*/events.json` (8 files)
- Modify: `apps/game/src/i18n/locales/*/ui.json` (8 files)

- [ ] **Step 1: Update acquihire_offer event translations**

In each locale's `events.json`, replace the `acquihire_offer` entry with new description and options.

English (`en/events.json`):
```json
"acquihire_offer": {
	"name": "Acqui-hire Offer",
	"description": "Big Tech wants to buy you out. Sell for a permanent edge, or stay indie?",
	"options": {
		"sell_out": "Sell out",
		"stay_indie": "Stay indie"
	}
}
```

Translate for all other 7 locales (fr, de, es, it, pl, zh, ru).

- [ ] **Step 2: Add prestige UI string**

In each locale's `ui.json`, add:

English: `"prestige_badge": "{{mult}}x"`

(The stars are rendered in code, only the multiplier text needs i18n — but since it's just a number format, the English string works for all locales.)

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/i18n/locales/
git commit -m "i18n: update acquihire_offer translations for prestige"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full check suite**

```bash
npm run typecheck && npm run check && npm run sim -- --verbose && npm run sim -- --greedy --verbose && npm run build
```

Expected: all pass, build succeeds

- [ ] **Step 2: Manual playtest**

1. Start fresh game (`localStorage.clear()`, reload)
2. Use god mode to reach T2/T3 quickly
3. Trigger acquihire_offer event (or wait for it)
4. Choose "Sell out" — verify game resets to T0 with 5% cash and prestige badge shows
5. Verify cash earning is faster (1.7x)
6. Prestige again — verify it compounds (2.89x)
7. After 5 prestiges, verify acquihire_offer no longer spawns
8. Verify "Stay indie" still gives the 120s cashMultiplier buff

- [ ] **Step 3: Final commit and push**

```bash
git push
```
