# T4+ Sidebar Rework: LoC Producers + AI Compute

**Date:** 2026-04-09
**Status:** Approved

## Problem

At T4, the sidebar becomes confusing. The "Token Producers" label replaces "LoC", the Tokens section shows metrics players don't understand, and LoC production tracking is lost. Players can't tell what's happening or where to invest.

## Design Goals

1. Keep LoC as the primary production metric throughout the entire game
2. Make AI models visible as LoC producers alongside humans
3. Show AI compute costs clearly in a dedicated section
4. Create a natural incentive to parallelize multiple AI models
5. Make the FLOPS bottleneck obvious and actionable

## Overview

Two key changes:

1. **LoC section stays as "LoC"** at T4+ — all producers (humans + AI models) appear in one unified list, sorted by LoC/s output
2. **New "AI Compute" section** replaces the old Tokens section — shows total FLOPS budget and per-model FLOPS consumption vs cap

The old "Token Producers" and "Tokens" sections are removed.

## Mechanic Changes

### Per-Model FLOPS Cap

Each AI model has a `flopsCap` — the maximum FLOPS it can consume regardless of how much AI budget is available.

- Existing field `flopsCost` is repurposed as `flopsCap` (the max FLOPS the model can use)
- A model at cap produces at its full `locPerSec` rate (scaled by LoC/tok ratio)
- A model below cap produces proportionally: `output = locPerSec * (allocatedFlops / flopsCap)`

This creates the parallelization incentive: one big model at 20% capacity produces less than five small models at 100%.

### LoC/Token Ratio

Each AI model has a `locPerToken` ratio (replacing the current `locPerSec` / `tokenCost` implicit ratio). Better models produce more LoC per token consumed.

- Ratio displayed as a multiplier badge in the AI Compute section (e.g., `5x`, `1.2x`)
- Tokens remain an internal mechanic — not shown as a top-level stat
- Human producers generate tokens at their LoC rate * `tokenMultiplier`
- AI models consume tokens and produce LoC at `tokensConsumed * locPerToken`

### FLOPS Allocation: Smallest Cap First

When AI FLOPS budget < total model demand, allocation fills models from smallest cap to largest:

1. Sort active models by `flopsCap` ascending
2. Iterate: give each model `min(flopsCap, remainingBudget)`
3. Subtract allocated amount from remaining budget

**Why smallest first:**
- Cheap models stay relevant — they fill up before big models see any FLOPS
- Big models are aspirational — partial capacity until FLOPS scale
- Prevents "new model makes all old models useless" problem
- Visual story: top of list (small models) = green/full, bottom (big models) = partially lit

### FLOPS Slider

Unchanged. Splits total FLOPS between:
- **Exec share** (`flopSlider`): converts LoC queue → cash
- **AI share** (`1 - flopSlider`): feeds AI models to convert tokens → LoC

### Token Flow (Internal)

Not shown in UI, but the underlying pipeline:

```
Human producers → tokens/s  (rate = autoLocPerSec * tokenMultiplier)
                    ↓
AI models consume tokens (gated by FLOPS allocation)
                    ↓
AI produces LoC    (rate = tokensConsumed * locPerToken per model)
                    ↓
LoC joins queue alongside direct human LoC surplus
                    ↓
Exec FLOPS convert LoC → cash
```

Tokens are an internal gating mechanic. If human token output < total model token demand, models run below capacity even with full FLOPS. This creates late-game pressure (T5) for AI agents that produce massive token volumes.

## UI Changes

### LoC Section (Modified)

**Header:** `◇ LoC` with total LoC/s as primary value, queue depth as rate.

**Body (expanded):**
- Produced vs executed sparkline (unchanged)
- Source rows: ALL LoC producers in one list, sorted by output descending
  - Human sources: Dev Team, Intern, Freelancer, You (unchanged styling, existing source colors)
  - AI model sources: appear in same list with their family color (claude: `#d4a574`, copilot: `#6c5ce7`, etc.)
  - Bar = proportion of max source output (unchanged)
  - Value = `{formatted}/s`
- Manager bonus text (unchanged)

**What's removed:** "Token Producers" label, `tok/s` units, `AI: X/s` rate in header. Everything is LoC again.

### AI Compute Section (New, replaces Tokens section)

**Header:** `🤖 AI Compute` with total consumed FLOPS as primary value, total cap as rate (e.g., `178K / 210K cap`).

**Only visible when `aiUnlocked === true`.**

**Body (expanded):**

1. **Total FLOPS budget bar**
   - Label: `FLOPS usage` left, `{pct}%` right
   - Bar: 6px height, purple fill (`#c678dd`), track = `theme.border`
   - Width = `totalConsumed / totalCap`

2. **Model rows** — two-line compact layout, sorted by `flopsCap` ascending:
   - Line 1: model name (family color, font-weight 500) | `{ratio}x · {consumed}/{cap}`
   - Line 2: thin FLOPS bar (3px, family color fill, border track)
   - ~29px per model row

3. **Diagnostic message** (conditional, same logic as current):
   - Model near cap: `⚠ {name} near cap — add another instance`
   - All models starved: `⚠ Need more AI FLOPS — move slider`

**What's removed:** Token count display, token production bar, token demand/supply stats, `tokensConsumed → LoC/s` text.

### Tokens Section

Removed entirely. No replacement needed.

### FLOPS Section

Unchanged. Exec/AI split bar and utilization sparkline stay as-is.

### Execute Bar

Unchanged.

## Data Changes

### `libs/domain/data/ai-models.json`

Each model needs:
- `flopsCap`: maximum FLOPS the model can consume (replaces semantic of `flopsCost`)
- `locPerToken`: LoC produced per token consumed (new field, derived from existing `locPerSec / tokenCost`)
- `tokenCost`: tokens consumed per second at full capacity (unchanged)

The existing `flopsCost` field can be renamed to `flopsCap` or kept as-is with updated semantics — implementation decision.

### `libs/domain/types/ai-model.ts`

Add `locPerToken: number` to `AiModelData` interface. Clarify `flopsCost` docs as "max FLOPS this model can consume."

## Game Store Changes

### `tick()` function — T4+ production phase

Replace current AI production logic with:

```
1. Compute human token output = autoLocPerSec * tokenMultiplier
2. Compute AI FLOPS budget = flops * (1 - flopSlider)
3. Sort active models by flopsCap ascending
4. Allocate FLOPS smallest-first:
   for each model:
     allocated = min(model.flopsCap, remainingFlops)
     remainingFlops -= allocated
     flopRatio = allocated / model.flopsCap
     tokensWanted = model.tokenCost * flopRatio
     tokensGot = min(tokensWanted, remainingTokens)
     remainingTokens -= tokensGot
     locProduced = tokensGot * model.locPerToken
5. Direct LoC = remainingTokens / tokenMultiplier (surplus tokens → LoC)
6. loc += directLoc + sum(aiLocProduced)
```

### `recalcDerivedStats()`

Add derived fields for the AI Compute section:
- `aiModelAllocations: Array<{ modelId, allocatedFlops, flopsCap, locPerToken, locProduced }>` — for rendering model rows
- `totalAiFlopsCap`: sum of active model caps
- `totalAiFlopsConsumed`: sum of allocated FLOPS

## Files to Modify

| File | Change |
|------|--------|
| `libs/domain/types/ai-model.ts` | Add `locPerToken` field |
| `libs/domain/data/ai-models.json` | Add `locPerToken` values, clarify `flopsCost` as cap |
| `apps/game/src/modules/game/store/game-store.ts` | Rewrite T4+ tick production, add derived stats |
| `apps/game/src/components/stats-loc-section.tsx` | Revert to "LoC" label, add AI models to source list |
| `apps/game/src/components/stats-tokens-section.tsx` | Replace with AI Compute section (or rename file) |
| `apps/game/src/components/stats-panel.tsx` | Update section ordering |
| `libs/engine/balance-sim.ts` | Update sim to use new allocation logic |
| `apps/simulation/` | May need adjustments for new fields |
| `apps/game/src/i18n/locales/*/` | Update translation keys |

## Balance Considerations

- `locPerToken` values should be derived from existing `locPerSec / tokenCost` ratios to preserve current balance
- The smallest-cap-first allocation changes AI output distribution — run `npm run sim` after implementing to validate pacing
- The FLOPS cap mechanic may require rebalancing model costs in the tech tree if early models become too efficient
