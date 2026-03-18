# Event System Design

## Overview

Add a random event system to AGI Rush. Events fire periodically during gameplay, applying temporary buffs/debuffs, instant effects, or presenting player choices. Events appear as non-blocking toast banners at the bottom of the screen.

## Decisions

- **UI style:** Toast/banner — non-blocking, inline with gameplay
- **Interactions:** Inline in the toast (buttons for choices, keystroke counting for mash events)
- **Event timing:** Follow spec as-is — garage-tier events fire from game start
- **Architecture:** Separate `src/modules/event/` module with its own Zustand store
- **Balance sim:** Update sim alongside game system to maintain parity

## Data Model

### EventDefinition (loaded from `specs/data/events.json`)

```typescript
interface EventDefinition {
  id: string
  name: string
  description: string
  icon: string
  minTier: TierIdEnum
  duration: number             // seconds, 0 = instant
  effects: EventEffect[]
  interaction?: EventInteraction
  weight: number
}

type EventInteraction =
  | { type: "mash_keys"; reductionPerKey: number }
```

### ActiveEvent (runtime state)

```typescript
interface ActiveEvent {
  definitionId: string
  startedAt: number            // performance.now() timestamp
  remainingDuration: number    // seconds, counts down each tick
  resolved: boolean            // for choice events: has the player chosen?
  chosenOptionIndex?: number
}
```

### EventModifiers (computed from active events, consumed by game store)

```typescript
interface EventModifiers {
  flopsMultiplier: number
  locPerKeyMultiplier: number
  autoLocMultiplier: number
  cashMultiplier: number
  locProductionMultiplier: number
  disabledUpgrades: string[]
}
```

All multipliers default to 1.0. Multiple active effects stack multiplicatively.

## Event Store

Module: `src/modules/event/store/event-store.ts`

### State

- `activeEvents: ActiveEvent[]` — currently running events (max 1 concurrent per config)
- `nextSpawnAt: number` — timestamp for next event roll
- `eventLog: string[]` — recent event IDs (capped ~20)

### Actions

- `tick(dt, currentTierIndex)`:
  1. Count down `remainingDuration` on active events by `dt`
  2. Remove expired events
  3. If `performance.now() >= nextSpawnAt` and no active event: roll weighted random event filtered by `minTier <= currentTierIndex`
  4. Schedule next spawn: now + random(30s–90s)
  5. Return boolean indicating if event state changed
- `spawnEvent(eventId)` — create ActiveEvent; apply instant effects (instantCash, instantLoc, codeQuality) via game store actions
- `handleChoice(eventId, optionIndex)` — mark resolved, apply chosen effect
- `handleMashKey(eventId)` — reduce `remainingDuration` by `reductionPerKey`
- `getEventModifiers()` — scan active events, compute combined multipliers

### Spawn Algorithm

1. Filter `events.json` entries by `minTier <= currentTierIndex`
2. Sum weights of eligible events
3. Roll random, pick by weighted selection
4. Instant events (duration 0): apply and don't occupy active slot
5. Duration events: push to `activeEvents`

## Game Store Integration

Minimal changes to `src/modules/game/store/game-store.ts`:

### tick(dt)

- Call `useEventStore.getState().tick(dt, state.currentTierIndex)`
- If event state changed, call `recalcDerivedStats()`

### recalcDerivedStats()

- After computing upgrade/tech multipliers, call `getEventModifiers()`
- Apply: `flops *= modifiers.flopsMultiplier`, `cashMultiplier *= modifiers.cashMultiplier`, etc.
- For `disabledUpgrades`: skip those upgrade IDs during effect accumulation

### Keystroke handling

- On keypress, check for active mash-type events and call `handleMashKey(eventId)`

### Instant effects

- `spawnEvent()` and `handleChoice()` call game store actions (public API) for instant cash/LoC/quality changes

## UI: Toast Component

Component: `src/modules/event/components/event-toast.tsx`
Rendered in `App` shell, fixed-position at the bottom of the screen.

### Behavior by event type

| Type | Display | Interaction |
|------|---------|-------------|
| Passive buff/debuff | Icon + name + description + countdown timer | None |
| Mash event | Pulsing indicator + countdown that drops as you type | Any keystroke reduces timer |
| Choice event | Description + two inline buttons | Click a button to resolve |
| Instant event | Brief confirmation toast, auto-dismiss after 3-4s | None |

### Styling

- Negative events: warm/red-tinted background
- Positive events: green/blue-tinted background
- Choice events: neutral background with highlighted buttons
- Dark IDE aesthetic consistent with existing theme
- Slide-in/out animation via CSS `transform: translateY()`, 200ms ease

## Balance Simulation Integration

Changes to `src/utils/balance-sim.ts` and `specs/balance-check.js`:

### Sim event engine

- Event scheduler in sim loop: same config (30-90s interval, max 1 concurrent)
- Seeded PRNG for deterministic runs
- Same weighted selection, filtered by sim tier

### Effect application

- Duration events: apply multipliers, count down each sim tick
- Instant events: apply immediately
- Choice events: sim picks optimal option (highest expected value)
- Mash events: sim assumes player mashes at configured keys/sec, reducing duration
- Conditional events (investor demo): evaluate threshold against sim state

### Balance impact

- Events are roughly net-neutral by design (mix of positive/negative, similar weights)
- No changes to balance thresholds — run checker after implementation and adjust only if needed

## Module Structure

```
src/modules/event/
├── index.ts                           # Public API
├── types.ts                           # EventDefinition, ActiveEvent, EventModifiers, etc.
├── store/
│   └── event-store.ts                 # Zustand store
├── components/
│   └── event-toast.tsx                # Toast UI component
└── data/
    └── events.ts                      # Import and type events.json
```

## Event Config (from spec)

```json
{
  "minIntervalSeconds": 30,
  "maxIntervalSeconds": 90,
  "maxConcurrent": 1
}
```
