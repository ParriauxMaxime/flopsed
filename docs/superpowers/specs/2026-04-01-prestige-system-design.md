# Prestige System Design

## Overview

The `acquihire_offer` event becomes a prestige mechanism. Selling out resets progress to T0 but grants a permanent compounding $/LoC multiplier. The system rewards players who recognize when to cash out and restart.

## Trigger

The existing `acquihire_offer` event (minTier: startup, maxTier: tech_company, weight: 3).

**Choice options:**
- **"Sell out"** — Prestige reset: back to T0, keep 5% of current cash, gain 1.7x permanent $/LoC multiplier
- **"Stay indie"** — No reset, x1.1 cashMultiplier buff for 120s (current behavior)

## Prestige Rules

- **Multiplier:** 1.7x per prestige, compounding (`1.7^prestigeCount`)
- **Cash kept:** 5% of current cash at moment of prestige
- **Max prestiges:** 5 (14.2x cumulative multiplier cap)
- **What resets:** Everything except `prestigeCount`, `prestigeMultiplier`, and starting cash
- **What the multiplier affects:** `cashMultiplier` only ($/LoC). Does NOT affect LoC production, FLOPS, or token rates.

## Scaling Curve

| Prestige | Cumulative Mult | T0 $/LoC | Est. Full Run | Est. to T3 |
|----------|----------------|----------|---------------|------------|
| 0 | 1.00x | $0.050 | 31 min | 16 min |
| 1 | 1.70x | $0.085 | 15 min | 5 min |
| 2 | 2.89x | $0.145 | 10 min | 3 min |
| 3 | 4.91x | $0.246 | 7 min | 2 min |
| 4 | 8.35x | $0.418 | 5 min | 2 min |
| 5 | 14.20x | $0.710 | 4 min | 1 min |

Max-prestige session (5 prestiges at T3 + final run): ~31 min total.

## State Changes

### New fields in `GameState`

```typescript
prestigeCount: number;     // 0-5, persisted across resets
prestigeMultiplier: number; // 1.7^prestigeCount, derived but persisted for clarity
```

### Initial state

```typescript
prestigeCount: 0,
prestigeMultiplier: 1,
```

### Prestige preserved by localStorage

These two fields must survive `reset()`. The reset function clears everything else to `initialState` but preserves prestige fields.

## Implementation Touches

### 1. Game store (`game-store.ts`)

- Add `prestigeCount` and `prestigeMultiplier` to `GameState` and `initialState`
- In `recalcDerivedStats`: multiply `cashMultiplier` by `state.prestigeMultiplier`
- New action `prestige()`: saves 5% cash + increments prestige, then calls `reset()` variant that preserves prestige fields, then sets starting cash
- Modify `reset()` to preserve `prestigeCount` and `prestigeMultiplier`

### 2. Event data (`events.json`)

Update `acquihire_offer`:
- "Sell out" option triggers prestige (needs a new effect type)
- "Stay indie" keeps current buff behavior
- Add guard: don't show if `prestigeCount >= 5`

### 3. New effect type: `prestige`

The "Sell out" choice needs to trigger the prestige action. Options:
- **Option A:** New effect type `"prestige"` handled in the choice resolution code
- **Option B:** Special-case `acquihire_offer` in the choice handler

Go with **Option A** — cleaner, the event system resolves it like any other effect.

Effect definition:
```json
{
  "type": "prestige",
  "op": "trigger",
  "value": true
}
```

The choice handler in `event-toast.tsx` checks for `prestige` effect and calls `useGameStore.getState().prestige()`.

### 4. Event store — prestige guard

The event spawn logic should skip `acquihire_offer` if `prestigeCount >= 5`. This can be checked via `useGameStore.getState().prestigeCount` during event picking.

### 5. UI indicator

Small prestige badge in the status bar showing current prestige level (e.g., "P2 1.7x" or star icons). Only visible when `prestigeCount > 0`.

### 6. Balance sim (`balance-sim.ts`)

The sim doesn't need to model prestige runs — it simulates a single run. But `prestigeMultiplier` should be a `SimConfig` option so we can test different prestige levels:

```typescript
interface SimConfig {
  // ... existing
  prestigeMultiplier?: number; // default 1, set to 1.7^n to simulate prestige level
}
```

### 7. i18n

- Update `acquihire_offer` event translations: new description mentioning prestige, new option labels
- Add prestige-related UI strings (status bar badge)

## Event Data

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

## Out of Scope

- Prestige leaderboard / stats page
- Visual prestige animations (CRT-style reset effect)
- Prestige-specific upgrades or tech tree branches
- Scaling singularity cost with prestige level
