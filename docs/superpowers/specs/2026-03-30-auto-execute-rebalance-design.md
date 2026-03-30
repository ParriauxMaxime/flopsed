# Auto-Execute Rebalance Design

## Overview

Move auto-execute unlock from T0 (immediately after buying computer) to T1 (after unlocking Freelancing tier), and raise cost to 150 cash. This creates 3-5 minutes of manual execution that teaches the mechanic before automating it.

## Current State

- **Node**: `auto_execute` in `tech-tree.json`
- **Cost**: 80 cash
- **Requires**: `["computer"]` (free)
- **Available**: Immediately in T0 (~60-80 seconds in)

## Change

```diff
- "requires": ["computer"],
- "baseCost": 80,
+ "requires": ["tier_freelancing"],
+ "baseCost": 150,
```

That's it. Single node edit.

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Manual execute duration | ~60-80s | ~3-5 min (casual) / ~2-3 min (fast) |
| Unlock moment | Unremarkable (early T0) | T1 reward — feels earned |
| Session length impact | baseline | +1-2 minutes |
| Player learning | Minimal (automated too fast) | Learns execute mechanic, queue concept, FLOPS bottleneck |

## Risk Mitigation

- **Frustration risk**: 3-5 minutes is within the sweet spot. Beyond 5 min would be hostile.
- **Execute button UX**: must be prominent and easy to click. Verify a keyboard shortcut exists (spacebar/Enter). If not, add one.
- **Sim validation**: run `npm run sim` after the change to confirm all profiles still pass thresholds.

## Validation Plan

1. Edit `tech-tree.json`: change requires and baseCost
2. Run `npm run sim` — all 3 profiles must pass
3. If any tier duration threshold fails, adjust balance.json thresholds or tweak cost
4. Manual playtest the first 5 minutes to verify the click-to-automate arc feels right
