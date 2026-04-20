# Spotlight Onboarding Design

**Date:** 2026-04-20
**Status:** Approved

## Problem

Beta testers (non-devs) fail to understand two things:
1. Code is typed in the `agi.py` editor, not the terminal
2. The Execute button exists and matters — it's not discoverable when the stats panel first unlocks

## Solution

A spotlight overlay system: semi-transparent backdrop dims the full UI, the target element is visually elevated via a box-shadow cutout, and an anchored tooltip with description + "Got it →" button appears near the target. Runs **alongside** existing terminal tips — does not replace them.

## Visual Design

- **Backdrop:** `rgba(0,0,0,0.45)` fixed overlay — soft dim, game context stays visible
- **Spotlight hole:** transparent div positioned over target rect, `box-shadow: 0 0 0 9999px rgba(0,0,0,0.45)` creates the cutout effect
- **Tooltip:** anchored below target (flips above if < 120px to bottom edge), arrow pointing toward target, clamped horizontally to viewport
- **Theme-aware:** tooltip border, title color, and background follow the active in-game editor theme (read from game store)

## Spotlight Steps (3 total)

| ID | Trigger | Target | Purpose |
|----|---------|--------|---------|
| `spotlight_editor` | `welcome` (first load) | `data-spotlight="editor"` | Show player where to type |
| `spotlight_stats_unlock` | `sidebar_intro` (unlock_sidebar purchased) | `data-spotlight="stats-unlock-node"` | Nudge player to unlock stats panel next |
| `spotlight_execute` | `execution_intro` (unlock_stats_panel purchased) | `data-spotlight="execute-button"` | Reveal the execute button |

### Copy direction (English)

**Editor spotlight:**
- Title: `"Go on, write anything"`
- Body: `"Software engineers make it look hard. It's really easy. Type anywhere in agi.py to write code — each keystroke generates Lines of Code."`

**Stats unlock spotlight:**
- Title: `"Unlock your execution pipeline"`
- Body: `"You've got code piling up. Unlock the Execute panel to run it and turn LoC into cash."`

**Execute spotlight:**
- Title: `"Run your code"`
- Body: `"Hit Execute to process your queued Lines of Code. More FLOPS = more throughput = more cash."`

All strings go in `tutorial` i18n namespace. Translated into all 8 locales.

## Architecture

### Store (`ui-store.ts`)

```typescript
type SpotlightStep = {
  id: string;        // matches data-spotlight attribute
  titleKey: string;  // i18n key in tutorial namespace
  bodyKey: string;
};

// New fields:
activeSpotlight: SpotlightStep | null;
showSpotlight: (step: SpotlightStep) => void;
dismissSpotlight: () => void;
```

`dismissSpotlight()` calls existing `showTip(id)` to persist dismissal in `seenTips` (localStorage). On trigger, if `id` is already in `seenTips`, skip.

### Component (`SpotlightOverlay.tsx`)

React portal into `document.body`. Lifecycle:

1. Mount → `document.querySelector('[data-spotlight="<id>"]')` → `getBoundingClientRect()`
2. Render hole div + tooltip div
3. `ResizeObserver` on target element → recalculate rect on layout change
4. "Got it →" click → `dismissSpotlight()`

Tooltip positioning logic:
```
tooltipTop = rect.bottom + 8
if (window.innerHeight - rect.bottom < 120) tooltipTop = rect.top - tooltipHeight - 8  // flip
tooltipLeft = clamp(rect.left, 8, window.innerWidth - tooltipWidth - 8)
```

Arrow direction flips to match (up when below, down when above).

### DOM anchors

Three elements get `data-spotlight` attributes added — no other changes to those components:

- `apps/game/src/modules/editor/components/editor.tsx` → editor container: `data-spotlight="editor"`
- Tech tree node component for `unlock_stats_panel` → `data-spotlight="stats-unlock-node"`
- `apps/game/src/components/stats-execute-bar.tsx` → button root: `data-spotlight="execute-button"`

### Trigger integration (`useTutorialTriggers`)

Each existing trigger gains a `showSpotlight()` call alongside its existing `showTip()`:

```typescript
// welcome trigger
showTip("welcome");
showSpotlight({ id: "spotlight_editor", titleKey: "spotlight_editor_title", bodyKey: "spotlight_editor_body" });

// sidebar_intro trigger
showTip("sidebar_intro");
showSpotlight({ id: "spotlight_stats_unlock", titleKey: "spotlight_stats_unlock_title", bodyKey: "spotlight_stats_unlock_body" });

// execution_intro trigger
showTip("execution_intro");
showSpotlight({ id: "spotlight_execute", titleKey: "spotlight_execute_title", bodyKey: "spotlight_execute_body" });
```

## i18n

New keys in `tutorial` namespace, all 8 locales (`en`, `fr`, `it`, `de`, `es`, `pl`, `zh`, `ru`):

```json
{
  "spotlight_editor_title": "Go on, write anything",
  "spotlight_editor_body": "Software engineers make it look hard. It's really easy. Type anywhere in agi.py — each keystroke generates Lines of Code.",
  "spotlight_stats_unlock_title": "Unlock your execution pipeline",
  "spotlight_stats_unlock_body": "You've got code piling up. Unlock the Execute panel to run it and turn LoC into cash.",
  "spotlight_execute_title": "Run your code",
  "spotlight_execute_body": "Hit Execute to process your queued Lines of Code. More FLOPS = more throughput = more cash."
}
```

## Files Changed

| File | Change |
|------|--------|
| `apps/game/src/modules/game/store/ui-store.ts` | Add `activeSpotlight`, `showSpotlight`, `dismissSpotlight` |
| `apps/game/src/components/spotlight-overlay.tsx` | New component (portal, hole div, tooltip) |
| `apps/game/src/app.tsx` | Mount `<SpotlightOverlay />`, wire `showSpotlight` into `useTutorialTriggers` |
| `apps/game/src/modules/editor/components/editor.tsx` | Add `data-spotlight="editor"` |
| `apps/game/src/components/stats-execute-bar.tsx` | Add `data-spotlight="execute-button"` |
| Tech tree node component (TBD — locate at impl time) | Add `data-spotlight="stats-unlock-node"` |
| `apps/game/src/i18n/locales/*/tutorial.json` | 6 new keys × 8 locales |

## Out of Scope

- FLOPS slider spotlight (intentionally cryptic)
- Skip-all button (dismiss per step is sufficient)
- Spotlight for any T4+ features
