# T4+ Sidebar Rework: LoC Producers + AI Compute — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace confusing T4 "Token Producers" / "Tokens" sidebar with a unified LoC producer list and a new AI Compute section showing per-model FLOPS consumption.

**Architecture:** Add `locPerToken` field to AI model data. Rewrite T4+ production in `tick()` to use smallest-cap-first FLOPS allocation. Replace `StatsTokensSection` with `StatsAiComputeSection`. Modify `StatsLocSection` to always show "LoC" and include AI models as sources. Update balance sim to match.

**Tech Stack:** React 19, Zustand, Emotion CSS-in-JS, TypeScript strict, ts-pattern, i18next

---

### Task 1: Add `locPerToken` to domain types and data

**Files:**
- Modify: `libs/domain/types/ai-model.ts:1-15`
- Modify: `libs/domain/data/ai-models.json`

- [ ] **Step 1: Add `locPerToken` field to `AiModelData` interface**

In `libs/domain/types/ai-model.ts`, add `locPerToken` after `tokenCost`:

```typescript
export interface AiModelData {
	id: string;
	family: string;
	name: string;
	version: string;
	icon: string;
	tier: string;
	cost: number;
	locPerSec: number;
	flopsCost: number;
	tokenCost: number;
	locPerToken: number;
	codeQuality: number;
	requires?: string;
	special?: Record<string, unknown>;
}
```

- [ ] **Step 2: Compute and add `locPerToken` values to every model in `ai-models.json`**

For each model, derive: `locPerToken = locPerSec / tokenCost`. For example:

- Copilot: `1500 / 1500 = 1.0`
- Claude Haiku: `800 / 800 = 1.0`
- Claude Sonnet: `5000 / 2500 = 2.0`

Add `"locPerToken": <value>` after `"tokenCost"` in every model entry. Read the full file to compute each value from existing `locPerSec` and `tokenCost`.

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: Clean pass (0 errors)

- [ ] **Step 4: Commit**

```
git add libs/domain/types/ai-model.ts libs/domain/data/ai-models.json
git commit -m "✨ Add locPerToken field to AI model data"
```

---

### Task 2: Rewrite T4+ production in game store `tick()`

**Files:**
- Modify: `apps/game/src/modules/game/store/game-store.ts:603-657`

The new allocation: sort models by `flopsCost` ascending (smallest cap first), give each model `min(flopsCap, remaining)`, compute LoC from tokens consumed × `locPerToken`.

- [ ] **Step 1: Replace the T4+ production block (lines 603-657)**

Replace the block starting at `if (aiUnlocked && s.running) {` through the matching closing brace (just before `} else {` on the pre-T4 branch) with:

```typescript
if (aiUnlocked && s.running) {
	const eventMods = useEventStore.getState().getEventModifiers();
	const eventTokenMult = eventMods.tokenProductionMultiplier;

	// Human output → tokens
	const humanTokenOutput =
		humanOutput * s.tokenMultiplier * eventTokenMult;

	// Active models sorted by flopsCost (cap) ascending — smallest first
	const activeModels = aiModels
		.filter((m) => s.unlockedModels[m.id])
		.sort((a, b) => a.flopsCost - b.flopsCost)
		.slice(0, s.llmHostSlots);

	// Allocate FLOPS smallest-cap-first
	const aiFlops = s.flops * (1 - s.flopSlider);
	let remainingFlops = aiFlops;
	let remainingTokens = humanTokenOutput;

	for (const model of activeModels) {
		const allocated = Math.min(model.flopsCost, remainingFlops);
		remainingFlops -= allocated;
		const flopRatio =
			model.flopsCost > 0 ? allocated / model.flopsCost : 0;
		const tokensWanted = model.tokenCost * flopRatio * dt;
		const tokensGot = Math.min(tokensWanted, remainingTokens);
		remainingTokens -= tokensGot;
		aiProduced += tokensGot * model.locPerToken;
	}

	// Surplus tokens convert back to direct LoC
	const directLoc = remainingTokens / Math.max(1, s.tokenMultiplier * eventTokenMult);

	loc += directLoc + aiProduced;
	totalLoc += directLoc + aiProduced;
	tokens += humanTokenOutput - remainingTokens;
	totalTokens += humanTokenOutput - remainingTokens;
} else {
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: Clean pass

- [ ] **Step 3: Commit**

```
git add apps/game/src/modules/game/store/game-store.ts
git commit -m "♻️ Rewrite T4+ production: smallest-cap-first FLOPS allocation"
```

---

### Task 3: Add derived stats for AI Compute section

**Files:**
- Modify: `apps/game/src/modules/game/store/game-store.ts` (GameState interface + recalcDerivedStats)

- [ ] **Step 1: Add new state fields to `GameState` interface (after line 108)**

Add these fields after `aiUnlocked: boolean;`:

```typescript
aiModelAllocations: Array<{
	modelId: string;
	allocatedFlops: number;
	flopsCap: number;
	locPerToken: number;
	locProduced: number;
}>;
totalAiFlopsCap: number;
totalAiFlopsConsumed: number;
```

- [ ] **Step 2: Add default values in the store initializer**

Find the initial state object (search for `loc: 0,` near the top of `create`). Add:

```typescript
aiModelAllocations: [],
totalAiFlopsCap: 0,
totalAiFlopsConsumed: 0,
```

- [ ] **Step 3: Compute allocations in `recalcDerivedStats()`**

At the end of `recalcDerivedStats()`, just before the final `aiUnlocked` derivation (line ~563), add:

```typescript
// Compute AI model allocations for UI
if (llmHostSlots > 0 && Object.values(unlockedModels).some(Boolean)) {
	const activeModels = aiModels
		.filter((m) => unlockedModels[m.id])
		.sort((a, b) => a.flopsCost - b.flopsCost)
		.slice(0, llmHostSlots);

	const aiFlops = state.flops * (1 - state.flopSlider);
	let remaining = aiFlops;
	const allocations: GameState["aiModelAllocations"] = [];
	let totalCap = 0;
	let totalConsumed = 0;

	for (const model of activeModels) {
		const allocated = Math.min(model.flopsCost, remaining);
		remaining -= allocated;
		totalCap += model.flopsCost;
		totalConsumed += allocated;
		allocations.push({
			modelId: model.id,
			allocatedFlops: allocated,
			flopsCap: model.flopsCost,
			locPerToken: model.locPerToken,
			locProduced: 0, // computed at render time from tick data
		});
	}

	state.aiModelAllocations = allocations;
	state.totalAiFlopsCap = totalCap;
	state.totalAiFlopsConsumed = totalConsumed;
} else {
	state.aiModelAllocations = [];
	state.totalAiFlopsCap = 0;
	state.totalAiFlopsConsumed = 0;
}
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: Clean pass

- [ ] **Step 5: Commit**

```
git add apps/game/src/modules/game/store/game-store.ts
git commit -m "✨ Add AI model allocation derived stats"
```

---

### Task 4: Modify `StatsLocSection` — revert to "LoC" and add AI sources

**Files:**
- Modify: `apps/game/src/components/stats-loc-section.tsx`

- [ ] **Step 1: Change header label back to "LoC" always**

Replace the `label` prop (lines 209-213):

```typescript
label={t("stats_panel.loc")}
```

- [ ] **Step 2: Change header value to show LoC/s rate + queue depth**

Replace the `value` and `rate` props. The value should show total LoC/s (human + AI), and rate shows queue depth:

```typescript
value={
	<RollingNumber
		value={`${formatNumber(locRate + aiLocPerSec)}/s`}
		color={theme.locColor}
	/>
}
rate={
	<span style={{ color: theme.locColor }}>
		{formatNumber(loc)} {t("stats_panel.loc").toLowerCase()}
	</span>
}
```

- [ ] **Step 3: Remove `tokenScale` multiplication from human sources**

Change line 101 to always use scale 1:

```typescript
const tokenScale = 1;
```

And update the `unit` variable (line ~203):

```typescript
const unit = t("stats_panel.per_sec");
```

- [ ] **Step 4: Replace `aiLocPerSec` useMemo with `aiSources` using new allocations**

Remove the existing `aiLocPerSec` useMemo (lines 156-188) and its associated store selectors (`flops`, `flopSlider`, `unlockedModels`, `llmHostSlots`). Replace with an `aiSources` useMemo using the new `aiModelAllocations`:

```typescript
const aiModelAllocations = useGameStore((s) => s.aiModelAllocations);

const aiSources = useMemo((): SourceRow[] => {
	if (!aiUnlocked) return [];
	return aiModelAllocations.map((alloc) => {
		const model = aiModels.find((m) => m.id === alloc.modelId);
		if (!model) return null;
		const flopRatio =
			alloc.flopsCap > 0 ? alloc.allocatedFlops / alloc.flopsCap : 0;
		// Approximate LoC/s output for display
		const locOutput = model.locPerSec * flopRatio;
		return {
			name: `${model.name} ${model.version}`,
			locPerSec: locOutput,
			color: MODEL_COLORS[model.family] ?? "#8b949e",
		};
	}).filter((r): r is SourceRow => r !== null);
}, [aiUnlocked, aiModelAllocations]);
```

Add the MODEL_COLORS constant at the top of the file (below SOURCE_COLORS):

```typescript
const MODEL_COLORS: Record<string, string> = {
	claude: "#d4a574",
	gpt: "#3fb950",
	gemini: "#58a6ff",
	llama: "#a29bfe",
	mistral: "#fd79a8",
	deepseek: "#00d4aa",
	copilot: "#6c5ce7",
	grok: "#e17055",
};
```

- [ ] **Step 5: Merge human + AI sources for rendering, compute total AI LoC**

Replace the `humanMaxLoc` line and combine both arrays for rendering. Also compute `totalAiLoc` for the header:

```typescript
const allSources = useMemo(
	() => [...humanSources, ...aiSources].sort((a, b) => b.locPerSec - a.locPerSec),
	[humanSources, aiSources],
);
const maxLoc = Math.max(1, ...allSources.map((s) => s.locPerSec));
const totalAiLoc = aiSources.reduce((sum, s) => sum + s.locPerSec, 0);
```

Update the header value (from Step 2) to use `totalAiLoc` instead of the removed `aiLocPerSec`:

```typescript
value={
	<RollingNumber
		value={`${formatNumber(locRate + totalAiLoc)}/s`}
		color={theme.locColor}
	/>
}
```

- [ ] **Step 6: Update the JSX to render `allSources` instead of `humanSources`**

Replace the source row map (lines 278-300) to use `allSources` and `maxLoc`:

```typescript
{allSources.map((s) => (
	<div css={sourceRowCss} key={s.name}>
		<span css={sourceNameCss} style={{ color: theme.textMuted }}>
			{s.name}
			{s.count !== undefined && (
				<span style={{ color: theme.textMuted }}> x{s.count}</span>
			)}
		</span>
		<div css={barTrackCss} style={{ background: theme.border }}>
			<div
				css={barFillCss}
				style={{
					transform: `scaleX(${s.locPerSec / maxLoc})`,
					background: s.color,
				}}
			/>
		</div>
		<span css={sourceValueCss} style={{ color: s.color }}>
			{formatNumber(s.locPerSec)}
			{unit}
		</span>
	</div>
))}
```

Remove the separate AI output row block (lines 301-320) that starts with `{aiUnlocked && aiLocPerSec > 0 && (`.

- [ ] **Step 7: Verify typecheck passes**

Run: `npm run typecheck`
Expected: Clean pass

- [ ] **Step 8: Commit**

```
git add apps/game/src/components/stats-loc-section.tsx
git commit -m "♻️ LoC section: revert to LoC label, merge human + AI sources"
```

---

### Task 5: Create `StatsAiComputeSection` component

**Files:**
- Create: `apps/game/src/components/stats-ai-compute-section.tsx`

- [ ] **Step 1: Create the new component**

Create `apps/game/src/components/stats-ai-compute-section.tsx`:

```typescript
import { css } from "@emotion/react";
import { aiModels, useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useIdeTheme } from "../hooks/use-ide-theme";
import { CollapsibleSection } from "./collapsible-section";
import { RollingNumber } from "./rolling-number";

const MODEL_COLORS: Record<string, string> = {
	claude: "#d4a574",
	gpt: "#3fb950",
	gemini: "#58a6ff",
	llama: "#a29bfe",
	mistral: "#fd79a8",
	deepseek: "#00d4aa",
	copilot: "#6c5ce7",
	grok: "#e17055",
};

const modelRowCss = css({
	marginBottom: 6,
});

const modelHeaderCss = css({
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
});

const modelNameCss = css({
	fontSize: 11,
	fontWeight: 500,
});

const modelStatsCss = css({
	fontSize: 10,
	fontVariantNumeric: "tabular-nums",
});

const capBarTrackCss = css({
	height: 3,
	borderRadius: 2,
	overflow: "hidden",
	marginTop: 3,
});

const capBarFillCss = css({
	height: "100%",
	borderRadius: 2,
	transition: "width 0.3s ease",
});

export function StatsAiComputeSection() {
	const { t } = useTranslation();
	const theme = useIdeTheme();
	const aiUnlocked = useGameStore((s) => s.aiUnlocked);
	const allocations = useGameStore((s) => s.aiModelAllocations);
	const totalCap = useGameStore((s) => s.totalAiFlopsCap);
	const totalConsumed = useGameStore((s) => s.totalAiFlopsConsumed);

	const modelRows = useMemo(() => {
		return allocations.map((alloc) => {
			const model = aiModels.find((m) => m.id === alloc.modelId);
			if (!model) return null;
			const color = MODEL_COLORS[model.family] ?? theme.textMuted;
			const pct = alloc.flopsCap > 0
				? alloc.allocatedFlops / alloc.flopsCap
				: 0;
			return {
				id: model.id,
				name: `${model.name} ${model.version}`,
				color,
				ratio: model.locPerToken,
				allocated: alloc.allocatedFlops,
				cap: alloc.flopsCap,
				pct,
			};
		}).filter((r) => r !== null);
	}, [allocations, theme.textMuted]);

	// Diagnostic: find the model closest to cap
	const diagnostic = useMemo(() => {
		if (modelRows.length === 0) return null;
		const nearCap = modelRows.find((m) => m.pct > 0.9 && m.pct < 1);
		if (nearCap) {
			return {
				key: "stats_panel.ai_diagnostic_near_cap",
				color: "#fab387",
				name: nearCap.name,
			};
		}
		const starved = modelRows.find((m) => m.pct < 0.5 && m.cap > 0);
		if (starved) {
			return {
				key: "stats_panel.ai_diagnostic_needs_compute",
				color: "#f44336",
			};
		}
		return {
			key: "stats_panel.ai_diagnostic_full_capacity",
			color: theme.success,
		};
	}, [modelRows, theme.success]);

	if (!aiUnlocked) return null;

	const usagePct = totalCap > 0 ? Math.round((totalConsumed / totalCap) * 100) : 0;

	return (
		<CollapsibleSection
			icon={<span style={{ color: theme.flopsColor }}>&#x1F916;</span>}
			label={t("stats_panel.ai_compute")}
			value={
				<RollingNumber
					value={formatNumber(totalConsumed)}
					color={theme.flopsColor}
				/>
			}
			rate={
				<span style={{ color: theme.textMuted }}>
					/ {formatNumber(totalCap)} cap
				</span>
			}
			collapsible={true}
			defaultOpen={true}
		>
			{/* Total FLOPS budget bar */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					fontSize: 10,
					color: theme.textMuted,
					marginBottom: 3,
				}}
			>
				<span>{t("stats_panel.flops_usage")}</span>
				<span style={{ color: theme.flopsColor }}>{usagePct}%</span>
			</div>
			<div
				style={{
					height: 6,
					borderRadius: 3,
					background: theme.border,
					overflow: "hidden",
					marginBottom: 10,
				}}
			>
				<div
					style={{
						width: `${usagePct}%`,
						height: "100%",
						background: theme.flopsColor,
						borderRadius: 3,
						transition: "width 0.3s ease",
					}}
				/>
			</div>

			{/* Model rows — two-line compact */}
			{modelRows.map((m) => (
				<div key={m.id} css={modelRowCss}>
					<div css={modelHeaderCss}>
						<span css={modelNameCss} style={{ color: m.color }}>
							{m.name}
						</span>
						<span css={modelStatsCss} style={{ color: theme.textMuted }}>
							{m.ratio}x &middot;{" "}
							<span style={{ color: m.color }}>
								{formatNumber(m.allocated)}
							</span>
							/{formatNumber(m.cap)}
						</span>
					</div>
					<div css={capBarTrackCss} style={{ background: theme.border }}>
						<div
							css={capBarFillCss}
							style={{
								width: `${Math.round(m.pct * 100)}%`,
								background: m.color,
							}}
						/>
					</div>
				</div>
			))}

			{/* Diagnostic */}
			{diagnostic && (
				<div
					style={{
						fontSize: 10,
						fontWeight: 600,
						color: diagnostic.color,
						marginTop: 6,
					}}
				>
					{diagnostic.name
						? t(diagnostic.key, { name: diagnostic.name })
						: t(diagnostic.key)}
				</div>
			)}
		</CollapsibleSection>
	);
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: Clean pass

- [ ] **Step 3: Commit**

```
git add apps/game/src/components/stats-ai-compute-section.tsx
git commit -m "✨ Create StatsAiComputeSection component"
```

---

### Task 6: Wire up `StatsPanel` — swap Tokens for AI Compute

**Files:**
- Modify: `apps/game/src/components/stats-panel.tsx:131-136`

- [ ] **Step 1: Replace `StatsTokensSection` import and usage**

In `stats-panel.tsx`, replace the import:

```typescript
// Remove:
import { StatsTokensSection } from "./stats-tokens-section";
// Add:
import { StatsAiComputeSection } from "./stats-ai-compute-section";
```

In the render body (line 133), replace:

```typescript
// Remove:
<StatsTokensSection />
// Add:
<StatsAiComputeSection />
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: Clean pass

- [ ] **Step 3: Commit**

```
git add apps/game/src/components/stats-panel.tsx
git commit -m "♻️ Replace StatsTokensSection with StatsAiComputeSection in panel"
```

---

### Task 7: Update balance simulation

**Files:**
- Modify: `libs/engine/balance-sim.ts:650-684`

- [ ] **Step 1: Replace the AI production block in the simulation**

Replace the block starting at `if (sim.aiUnlocked) {` (line 653) through line 684:

```typescript
if (sim.aiUnlocked) {
	const activeModels = aiModels
		.filter((m) => sim.ownedModels[m.id])
		.sort((a, b) => a.flopsCost - b.flopsCost)
		.slice(0, sim.llmHostSlots);

	// Human output → tokens
	const humanTokenOutput =
		humanOutput * sim.tokenMultiplier * eventTokenProductionMultiplier;

	// FLOPS slider split
	const aiFlops = flops * (1 - sim.flopSlider);
	const execFlops = flops * sim.flopSlider;

	// Allocate FLOPS smallest-cap-first
	let remainingFlops = aiFlops;
	let remainingTokens = humanTokenOutput;

	for (const m of activeModels) {
		const allocated = Math.min(m.flopsCost, remainingFlops);
		remainingFlops -= allocated;
		const flopRatio = m.flopsCost > 0 ? allocated / m.flopsCost : 0;
		const tokensWanted = m.tokenCost * flopRatio;
		const tokensGot = Math.min(tokensWanted, remainingTokens);
		remainingTokens -= tokensGot;
		aiLoc += tokensGot * m.locPerToken * sim.aiLocMultiplier;
	}

	// Surplus tokens → direct LoC
	const directLoc = remainingTokens / Math.max(1, sim.tokenMultiplier * eventTokenProductionMultiplier);
	tokensConsumed = humanTokenOutput - remainingTokens;

	sim.loc += directLoc + aiLoc;
	sim.totalLoc += directLoc + aiLoc;
	const executed = Math.min(sim.loc, execFlops);
	sim.cash += executed * cashPerLoc();
	sim.totalCash += executed * cashPerLoc();
	sim.loc -= executed;
```

Keep the auto-arbitrage block that follows unchanged (line ~694+), but update its `totalFlopsDemand` calculation to use the sum of `flopsCost` for active models (it already does this).

- [ ] **Step 2: Run the balance simulation**

Run: `npm run sim`
Expected: All 3 profiles pass. If any fail, adjust `locPerToken` values or tier thresholds.

- [ ] **Step 3: Commit**

```
git add libs/engine/balance-sim.ts
git commit -m "♻️ Update balance sim: smallest-cap-first FLOPS allocation"
```

---

### Task 8: Update i18n keys

**Files:**
- Modify: `apps/game/src/i18n/locales/en/ui.json`
- Modify: `apps/game/src/i18n/locales/{fr,it,de,es,pl,zh,ru}/ui.json`

- [ ] **Step 1: Add new keys and update existing in English**

In `apps/game/src/i18n/locales/en/ui.json`, inside `"stats_panel"`:

Add:
```json
"ai_compute": "AI Compute",
"flops_usage": "FLOPS usage",
"ai_diagnostic_near_cap": "{{name}} near cap — add another instance"
```

Keys that can be removed (no longer referenced):
- `"token_producers"` — LoC section now always uses `"loc"`
- `"tokens"` — section removed
- `"token_sources"` — unused
- `"tokens_per_sec"` — unused
- `"ai_diagnostic_starving"` — replaced by new diagnostics
- `"ai_diagnostic_needs_tokens"` — replaced

Keep `"ai_output"`, `"ai_diagnostic_needs_compute"`, `"ai_diagnostic_needs_flops"`, `"ai_diagnostic_full_capacity"` — still referenced.

- [ ] **Step 2: Add translations to all 7 other locales**

Add the same new keys to `fr`, `it`, `de`, `es`, `pl`, `zh`, `ru` ui.json files. Translate:

| Key | fr | de | es | it | pl | zh | ru |
|-----|----|----|----|----|----|----|-----|
| ai_compute | Calcul IA | KI-Rechenleistung | Computacion IA | Calcolo IA | Obliczenia AI | AI 计算 | ИИ вычисления |
| flops_usage | Utilisation FLOPS | FLOPS-Nutzung | Uso de FLOPS | Utilizzo FLOPS | Wykorzystanie FLOPS | FLOPS 使用率 | Использование FLOPS |
| ai_diagnostic_near_cap | {{name}} proche du max — ajouter une instance | {{name}} nahe am Limit — weitere Instanz hinzufügen | {{name}} cerca del limite — agregar otra instancia | {{name}} vicino al limite — aggiungere un'istanza | {{name}} blisko limitu — dodaj kolejną instancję | {{name}} 接近上限 - 添加另一个实例 | {{name}} близко к лимиту — добавьте экземпляр |

Remove the same obsolete keys from all locales.

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: Clean pass

- [ ] **Step 4: Commit**

```
git add apps/game/src/i18n/locales/
git commit -m "🌐 Update i18n: add AI Compute keys, remove unused token keys"
```

---

### Task 9: Delete `StatsTokensSection` component

**Files:**
- Delete: `apps/game/src/components/stats-tokens-section.tsx`

- [ ] **Step 1: Verify no remaining imports of `StatsTokensSection`**

Run: `grep -r "StatsTokensSection\|stats-tokens-section" apps/game/src/`
Expected: No matches (was replaced in Task 6)

- [ ] **Step 2: Delete the file**

```bash
rm apps/game/src/components/stats-tokens-section.tsx
```

- [ ] **Step 3: Verify typecheck and lint pass**

Run: `npm run typecheck && npm run check`
Expected: Clean pass

- [ ] **Step 4: Commit**

```
git add -u apps/game/src/components/stats-tokens-section.tsx
git commit -m "🔥 Remove StatsTokensSection (replaced by StatsAiComputeSection)"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: Clean pass

- [ ] **Step 2: Run balance simulation**

Run: `npm run sim --verbose`
Expected: All 3 profiles (casual, average, fast) pass all thresholds. Review T4-T5 timing.

- [ ] **Step 3: Run lint**

Run: `npm run check`
Expected: Clean (or only pre-existing issues)

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`

Verify:
1. Pre-T4: LoC section shows "LoC" with human sources, no AI Compute section visible
2. At T4: LoC section still shows "LoC", AI models appear in the source list
3. AI Compute section appears with total FLOPS bar and per-model rows
4. FLOPS slider still works, allocation updates live
5. Smallest models fill first (top rows = full bars, bottom rows = partial)
6. Cash flow continues working normally

- [ ] **Step 5: Final commit if any fixes needed**

```
git add -A
git commit -m "🐛 Fix any issues from smoke testing"
```
