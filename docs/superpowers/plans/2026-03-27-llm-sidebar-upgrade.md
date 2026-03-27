# LLM Sidebar Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "LLM" purchasable upgrade in the sidebar (ai_lab tier) that acts as a host slot — each one lets the player run one additional unlocked AI model. The game auto-picks the highest LoC/s models to fill available slots.

**Architecture:** New `llm` upgrade in `upgrades.json` with effect type `llmHostSlot`. Game store and balance sim track `llmHostSlots`, then filter active models to the top N by `locPerSec`. Tech tree models remain as research/unlocks, the sidebar upgrade is what actually lets you run them.

**Tech Stack:** TypeScript, Zustand (game store), JSON data files, balance sim engine

---

### Task 1: Add LLM upgrade to data files

**Files:**
- Modify: `libs/domain/data/upgrades.json`

- [ ] **Step 1: Add the LLM upgrade entry**

Add after the `ml_pipeline` entry (last ai_lab tier upgrade) in `upgrades.json`:

```json
{
    "id": "llm",
    "tier": "ai_lab",
    "name": "LLM",
    "description": "Host 1 AI model — auto-picks the best available",
    "icon": "🧠",
    "baseCost": 5000000,
    "costMultiplier": 1.8,
    "max": 5,
    "costCategory": "llm",
    "requires": ["llm_gate"],
    "effects": [
        {
            "type": "llmHostSlot",
            "op": "add",
            "value": 1
        }
    ]
}
```

Pricing rationale: `llm_gate` costs $2M. First LLM host at $5M puts total first-model cost at $7M + model unlock cost. The 1.8x multiplier means hosts cost $5M, $9M, $16M, $29M, $52M — escalating but reachable within AI Lab tier. Max 5 base, extendable via the existing `llm_capacity` tech node which adds `llmMaxBonus`.

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "require('./libs/domain/data/upgrades.json')"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add libs/domain/data/upgrades.json
git commit -m "⚖️ Add LLM sidebar upgrade (host slot) to upgrades.json"
```

---

### Task 2: Wire llmHostSlot effect in game store

**Files:**
- Modify: `apps/game/src/modules/game/store/game-store.ts`

- [ ] **Step 1: Add `llmHostSlots` to GameState interface**

Find the `GameState` interface (line ~41). Add after `agentMaxBonus`:

```typescript
llmHostSlots: number;
```

- [ ] **Step 2: Initialize `llmHostSlots` in initial state**

Find the initial state object (where all state properties are initialized to 0/false/etc.). Add:

```typescript
llmHostSlots: 0,
```

- [ ] **Step 3: Add effect handler in recalcDerivedStats**

In the `recalcDerivedStats` function, find the `match()` block that handles effects. There's already `llmMaxBonus` handling. Add a new case near it:

```typescript
.with({ type: "llmHostSlot", op: "add" }, () => {
    llmHostSlots += val * owned;
})
```

Also declare `let llmHostSlots = 0;` at the top of `recalcDerivedStats` alongside the other local variables.

- [ ] **Step 4: Assign llmHostSlots to state**

In the final state assignment block at the end of `recalcDerivedStats` (where `state.llmLocPerSec = ...` etc.), add:

```typescript
state.llmHostSlots = llmHostSlots;
```

- [ ] **Step 5: Filter active models by host slots in tick**

Find the AI model iteration in the tick function (line ~485-500):

```typescript
for (const model of aiModels) {
    if (s.unlockedModels[model.id]) {
        totalAiLoc += model.locPerSec;
        totalAiFlops += model.flopsCost;
    }
}
```

Replace with:

```typescript
// Collect unlocked models, sort by locPerSec descending, take top N by host slots
const unlockedAiModels = aiModels
    .filter((m) => s.unlockedModels[m.id])
    .sort((a, b) => b.locPerSec - a.locPerSec)
    .slice(0, s.llmHostSlots);
for (const model of unlockedAiModels) {
    totalAiLoc += model.locPerSec;
    totalAiFlops += model.flopsCost;
}
```

This means: if the player has 0 host slots, no models run even if unlocked. If they have 3 slots and 5 unlocked models, only the 3 best run.

- [ ] **Step 6: Update aiUnlocked derivation**

The `aiUnlocked` flag should now also require at least one host slot. Find where `aiUnlocked` is derived in `recalcDerivedStats`. It's likely:

```typescript
const aiUnlocked = Object.values(unlockedModels).some(Boolean);
```

Change to:

```typescript
const aiUnlocked = llmHostSlots > 0 && Object.values(unlockedModels).some(Boolean);
```

Also assign to state:

```typescript
state.aiUnlocked = aiUnlocked;
```

- [ ] **Step 7: Verify typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add apps/game/src/modules/game/store/game-store.ts
git commit -m "✨ Wire llmHostSlot effect in game store with auto-pick-best logic"
```

---

### Task 3: Wire llmHostSlot in balance sim

**Files:**
- Modify: `libs/engine/balance-sim.ts`

- [ ] **Step 1: Add `llmHostSlots` to sim state**

Find the `sim` object initialization (line ~63-115). Add:

```typescript
llmHostSlots: 0,
```

- [ ] **Step 2: Handle effect in recalcSimStats**

Find the `applyEffect` function inside `recalcSimStats`. Add alongside the other `llm*` handlers:

```typescript
if (e.type === "llmHostSlot" && e.op === "add")
    sim.llmHostSlots += val * owned;
```

- [ ] **Step 3: Filter models by host slots in the AI tick section**

Find the AI model iteration in the main loop (line ~620-660):

```typescript
for (const [id, v] of Object.entries(sim.ownedModels)) {
    if (!v) continue;
    const m = aiModels.find((x) => x.id === id);
    if (m) {
        totalAiLoc += m.locPerSec * sim.aiLocMultiplier;
        totalAiFlops += m.flopsCost;
    }
}
```

Replace with:

```typescript
// Collect unlocked models, sort by locPerSec desc, take top N by host slots
const activeModels = aiModels
    .filter((m) => sim.ownedModels[m.id])
    .sort((a, b) => b.locPerSec - a.locPerSec)
    .slice(0, sim.llmHostSlots);
for (const m of activeModels) {
    totalAiLoc += m.locPerSec * sim.aiLocMultiplier;
    totalAiFlops += m.flopsCost;
}
```

- [ ] **Step 4: Update aiUnlocked derivation**

Find where `sim.aiUnlocked` is set in `recalcSimStats` (line ~427):

```typescript
sim.aiUnlocked = Object.values(sim.ownedModels).some(Boolean);
```

Change to:

```typescript
sim.aiUnlocked = sim.llmHostSlots > 0 && Object.values(sim.ownedModels).some(Boolean);
```

- [ ] **Step 5: Ensure the sim's purchase AI buys LLM hosts**

The sim already buys upgrades via the value-evaluation loop. The `llmHostSlot` effect type needs to be valued. Find the upgrade valuation section (line ~840-880). Add a case for the new effect type:

```typescript
if (e.type === "llmHostSlot") {
    // Value a host slot based on the next-best model that would become active
    const unlockedCount = Object.values(sim.ownedModels).filter(Boolean).length;
    const activeCount = Math.min(unlockedCount, sim.llmHostSlots);
    if (activeCount < unlockedCount) {
        // There's an unlocked model waiting for a slot — high value
        const sorted = aiModels
            .filter((m) => sim.ownedModels[m.id])
            .sort((a, b) => b.locPerSec - a.locPerSec);
        const nextModel = sorted[activeCount];
        if (nextModel) {
            val += nextModel.locPerSec * sim.aiLocMultiplier * cashPerLoc();
        }
    }
}
```

- [ ] **Step 6: Verify typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 7: Run balance sim**

Run: `npm run sim -- --verbose`
Expected: All checks pass. AI Lab and AGI Race tier durations may shift — that's expected since models now require hosts.

- [ ] **Step 8: Commit**

```bash
git add libs/engine/balance-sim.ts
git commit -m "✨ Wire llmHostSlot in balance sim with auto-pick-best model logic"
```

---

### Task 4: Balance tuning

**Files:**
- Possibly modify: `libs/domain/data/upgrades.json`, `libs/domain/data/tech-tree.json`, `libs/domain/data/balance.json`

- [ ] **Step 1: Run trace analysis on AI Lab tier**

```bash
npx --silent tsx apps/simulation/src/main.ts --trace --profile average > /tmp/trace.json 2>/dev/null
python3 tools/balance-analyzer.py --tier ai_lab < /tmp/trace.json
```

Check that:
- The sim buys LLM hosts
- Models only activate after hosts are purchased
- AI Lab duration is within bounds (30-1500s)
- No excessive gap before first host purchase

- [ ] **Step 2: Adjust pricing if needed**

If the first LLM host purchase creates too long a gap after `llm_gate`:
- Reduce `baseCost` (try $3M or $2M)
- Or reduce `costMultiplier` (try 1.5)

If AI Lab is too fast (hosts are too cheap):
- Increase `baseCost` or `costMultiplier`

Run `npm run sim` after each adjustment.

- [ ] **Step 3: Run full validation**

```bash
npm run sim -- --verbose
```

All 3 profiles must pass all checks.

- [ ] **Step 4: Commit**

```bash
git add libs/domain/data/upgrades.json libs/domain/data/tech-tree.json libs/domain/data/balance.json
git commit -m "⚖️ Tune LLM host pricing for balanced AI Lab progression"
```
