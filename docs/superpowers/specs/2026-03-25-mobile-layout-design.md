# Mobile Layout

## Summary

Make the game playable on mobile by switching to a tab-based layout below 768px. The typing mechanic becomes tap-to-code (full-screen tap zone), code auto-executes, and the 3 desktop panels become 3 tabs. Desktop layout is unchanged.

## Breakpoint

`max-width: 768px` triggers mobile layout. Above that, desktop 3-panel layout as-is.

## Mobile Structure

```
┌─────────────────────────┐
│  💰 $1.2K  📝 5.6K  ⚡120  ⚙ │  ← fixed top resource bar
├─────────────────────────┤
│                         │
│     Active tab content  │  ← full-screen, swapped by tab bar
│     (Code / Tree / Shop)│
│                         │
├─────────────────────────┤
│  ⌨️ Code  🌳 Tree  🛒 Shop │  ← fixed bottom tab bar (3 tabs)
└─────────────────────────┘
```

## Top Resource Bar

- Fixed position, always visible
- Shows: Cash, LoC, FLOPS — compact single row
- **FLOPS slider**: tap the FLOPS value to expand an inline slider for AI allocation. Tap again or tap elsewhere to collapse.
- **Settings gear icon**: right side of the bar. Opens a slide-up overlay with theme picker, auto-type toggle, reset button.

## Bottom Tab Bar

3 tabs, equal width:
- **Code** (⌨️) — tap-to-code editor
- **Tree** (🌳) — tech tree
- **Shop** (🛒) — upgrades + milestones

Active tab has a highlighted border-top and colored label. Inactive tabs are dimmed.

## Code Tab — Tap-to-Code

The typing mechanic is replaced on mobile:

- **Full-screen tap zone** — the entire tab content area is the tap target
- **Background code** — syntax-highlighted code scrolls at low opacity (~0.3) behind the tap zone, same code generation as desktop but purely visual
- **Tap feedback** — floating "+X LoC" text pops at the tap position, animates upward and fades out
- **Stats overlay** — current LoC/s rate shown at bottom of the tap zone, semi-transparent
- **Auto-run** — on mobile, code blocks auto-execute when complete. No Run/Stop button. The execution queue processes automatically.
- **Tap value** — each tap generates `locPerKey` LoC (same as a keystroke on desktop)

### Implementation

- Detect mobile via `useIsMobile()` hook (checks `window.matchMedia('(max-width: 768px)')`)
- On mobile, the editor module renders `TapToCode` component instead of the keyboard-based `Editor`
- `TapToCode` calls `addLoc()` on the game store per tap, same as the keyboard handler does per keystroke
- The game loop auto-runs on mobile: `running` is forced to `true` and the Run/Stop toggle is hidden

## Tree Tab

- Same React Flow tech tree as desktop
- `fitView` enabled, pan via touch drag
- Zoom disabled (same as desktop game)
- **Popover on tap** instead of hover (mobile has no hover). Tap a node: if affordable, research it. If not affordable or already owned, show the popover. Tap elsewhere to dismiss popover.
- Pan bounds same as desktop (`translateExtent`)

## Shop Tab

Full-width vertical layout containing:
1. **Tier progress** — current tier name + tagline, same as desktop sidebar
2. **Tab toggle** — switch between Upgrades and Milestones (small toggle at top, not a full tab bar)
3. **Upgrade list** — same content as desktop, but cards are full-width
4. **Milestone list** — same content as desktop, full-width

## Settings Overlay

- Triggered by gear icon in resource bar
- Slides up from bottom as a modal overlay (dark backdrop)
- Contains: theme picker (grid of swatches), auto-type toggle, reset game button
- Tap backdrop or X button to close

## Detection Hook

```typescript
export function useIsMobile(): boolean {
  // Listens to matchMedia('(max-width: 768px)')
  // Returns reactive boolean
}
```

Used in:
- `App` — switch between desktop shell and mobile shell
- `Editor` module — render `TapToCode` vs `Editor`
- `TechTreePage` — popover on tap vs hover
- `GameLoop` — force auto-run on mobile

## Files

### New files

- `apps/game/src/components/mobile-shell.tsx` — mobile layout shell (resource bar + tab content + tab bar)
- `apps/game/src/components/mobile-resource-bar.tsx` — compact resource bar with FLOPS slider expand + gear icon
- `apps/game/src/components/mobile-tab-bar.tsx` — bottom 3-tab navigation
- `apps/game/src/components/mobile-settings-overlay.tsx` — slide-up settings panel
- `apps/game/src/modules/editor/components/tap-to-code.tsx` — full-screen tap zone with floating LoC feedback
- `apps/game/src/hooks/use-is-mobile.ts` — responsive breakpoint hook

### Modified files

- `apps/game/src/app.tsx` — conditionally render desktop shell or `MobileShell` based on `useIsMobile()`
- `apps/game/src/modules/game/hooks/use-game-loop.ts` — force `running: true` on mobile (skip Run/Stop)
- `apps/game/src/components/tech-tree-page.tsx` — on mobile: popover on tap instead of hover, adjust node click behavior

### Not changed

- Desktop layout, styling, or behavior
- Game store, engine, domain data
- Editor app
- Singularity end-game sequence (already full-screen overlay, works on mobile as-is)

## Non-goals

- Landscape-specific layout (portrait only for now)
- PWA / offline support (separate feature)
- Touch gestures beyond tap and pan (no swipe between tabs, no pinch zoom)
- Responsive editor app (editor stays desktop-only)
