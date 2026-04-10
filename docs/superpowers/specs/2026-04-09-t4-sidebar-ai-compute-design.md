# T4+ Sidebar Rework: LoC Producers + AI Compute

**Date:** 2026-04-09 (updated 2026-04-10)
**Status:** Implemented

## Problem

At T4, the sidebar became confusing. The "Token Producers" label replaced "LoC", the Tokens section showed metrics players didn't understand, and LoC production tracking was lost. The FLOPS slider lived in the editor panel, disconnected from the resource stats. AI models produced negligible output compared to human devs.

## What We Built

### Sidebar Layout (T4+)

```
Cash            $67.5M         (unchanged)
                $385K/s

LoC             36.7M          (always "LoC", never "Token Producers")
                258K/s
  [sparkline: produced / executed / tokens→AI]
  Dev Team x20  ████████░░  200K+56K/s
  Intern x25    ██░         1.2K+340/s
  Freelancer    █░          90+25/s
  You           ░           8+3/s
  ▶ AI Output               40.3K/s
    Copilot Basic            500/s
    Claude Haiku             800/s
    ...

AI Compute      385K         / 1.80M cap
  [draggable split bar: gold(exec) | blue(AI)]
  FLOPS usage                21%
  [budget bar]
  Copilot Basic   1x · 385K/800K
  [thin cap bar]
  Mistral Large   1.6x · 0/1.00M
  [thin cap bar]

FLOPS           751K          (simplified, no duplicate split bar)
  [utilization sparkline]

Tier Progression  [T0][T1][T2][T3][T4]
History
Execute Bar       ⚡ $385K/s   [AUTO]
```

### Key Changes from Original Design

1. **LoC section** shows ALL producers (humans + agents + AI models) sorted by output. Human/agent rows show token diversion visually: bar splits into source color (direct LoC) + green (tokens fed to AI). Values show `netLoC+tokenPart/s`.

2. **AI models** live in a collapsible sub-section ("▶ AI Output — total/s"), expandable to show per-model LoC/s with scrolling for many models.

3. **AI Agents** appear as regular LoC producers alongside dev teams, with their own color (#e17055).

4. **AI Compute section** replaces old Tokens section. Shows total FLOPS budget bar, then per-model two-line compact rows (name + ratio badge + allocated/cap + thin bar). No diagnostic messages.

5. **FLOPS slider** moved from editor panel into AI Compute section body. Rewritten as draggable split bar (pointer events). Colors: gold (cashColor) for execution, blue (locColor) for AI/LoC generation. Auto-arbitrage toggle preserved.

6. **FLOPS section** simplified — removed duplicate exec/AI split bar (now in the slider). Only shows utilization sparkline.

7. **Sparkline** upgraded to 3 data series: LoC produced (solid blue), LoC executed (dashed purple), tokens consumed by AI (dotted green).

## Mechanic Changes

### Per-Model FLOPS Cap

Each AI model has a `flopsCost` that acts as its FLOPS cap — the maximum FLOPS it can consume. Output scales linearly with allocation: `output = locPerSec × (allocatedFlops / flopsCost)`.

### LoC/Token Ratio

Each model has `locPerToken` — how many LoC produced per token consumed. Better models have higher ratios (1x for Copilot, up to 50x for T5 models). `locPerSec = tokenCost × locPerToken`.

### FLOPS Allocation: Smallest Cap First

Models sorted by `flopsCost` ascending. Each gets `min(flopsCap, remainingFlops)`. Small models fill before big ones — incentivizes parallelizing multiple models.

### Token Flow (Internal, shown in UI via bar splits)

```
All producers (humans + agents) → tokens/s (rate × tokenMultiplier)
    ↓
AI models consume tokens (gated by FLOPS allocation)
    ↓
AI produces LoC (tokensConsumed × locPerToken)
    ↓
Surplus tokens → direct LoC (surplus / tokenMultiplier)
```

### Allocations Updated Every Tick

`aiModelAllocations`, `totalAiFlopsCap`, `totalAiFlopsConsumed` are computed in `tick()` (not just `recalcDerivedStats`), so slider changes reflect immediately in the UI.

## Balance Changes

### AI Models

- T4 models: `flopsCost` divided by 10 from original values (caps 40K–600K)
- T5 models: `flopsCost` kept at original values (caps 10M–2B)
- All models: `locPerToken` multiplied by 5 (range 5x–50x)
- `locPerSec` recalculated as `tokenCost × locPerToken`

### Hardware Upgrades (FLOPS output reduced)

| Upgrade | Before | After |
|---------|--------|-------|
| Desktop PC | 50 | 15 |
| Second Monitor | 25 | 10 |
| Server Rack | 200 | 100 |
| GPU Cluster | 30K | 5K |
| Data Center | 200K | 30K |
| TPU Pod | 5M | 80K |
| Supercomputer | 200M | 20M (mult 1.8→2.2) |
| Planetary Datacenter | 10B | 200M (base $5B→$50B, mult 1.25→1.35) |

### Tech Tree FLOPS Nodes

| Node | Before | After |
|------|--------|-------|
| GPU Farm (T4, LoC cost) | 2M/level | 200K/level |
| Quantum Cluster (T5, LoC cost) | 50M/level | 500M/level |

### FLOPS Waste Results

| Tier | Before | After |
|------|--------|-------|
| T0-T1 | 81% | 67% (tiny absolute, typing bottleneck) |
| T2 | 72% | 35% → 0% mid-tier |
| T3 | 73% | 10% |
| T4 | 91% | 47% (transient spike from burst purchases) |
| T5 | 99% | 49% steady / 95% transient |

## Files Changed

| File | Change |
|------|--------|
| `libs/domain/types/ai-model.ts` | Added `locPerToken` field |
| `libs/domain/data/ai-models.json` | Added `locPerToken`, rebalanced `flopsCost` and `locPerSec` |
| `libs/domain/data/upgrades.json` | Reduced FLOPS outputs, repriced datacenter |
| `libs/domain/data/tech-tree.json` | Tuned gpu_farm and quantum_compute |
| `apps/game/src/modules/game/store/game-store.ts` | Rewrote T4+ tick, added allocation tracking per tick, added `tokensConsumedPerSec` to snapshots, fixed auto-arbitrage toggle |
| `apps/game/src/components/stats-loc-section.tsx` | Reverted to "LoC", merged human+agent+AI sources, token diversion bars+values, collapsible AI sub-section |
| `apps/game/src/components/stats-ai-compute-section.tsx` | New component (replaces StatsTokensSection) |
| `apps/game/src/components/stats-tokens-section.tsx` | Deleted |
| `apps/game/src/components/stats-panel.tsx` | Swapped sections |
| `apps/game/src/components/stats-flops-section.tsx` | Removed duplicate split bar |
| `apps/game/src/components/flops-slider.tsx` | Rewritten as draggable split bar, blue/gold colors, embedded mode |
| `apps/game/src/components/editor-panel.tsx` | Removed FlopsSlider, added T4 keystroke handler |
| `apps/game/src/components/sparkline.tsx` | Added data3/color3 support |
| `apps/game/src/components/stats-execute-bar.tsx` | Fixed $/s to use deterministic formula |
| `apps/game/src/i18n/locales/*/ui.json` | Added AI Compute keys, removed token keys |
| `libs/engine/balance-sim.ts` | Updated to smallest-cap-first allocation, added `locPerToken` |
| `apps/editor/src/pages/simulation/flops-util-chart.tsx` | New FLOPS utilization chart |
| `apps/editor/src/pages/simulation/sim-results.tsx` | Wired up utilization chart |
