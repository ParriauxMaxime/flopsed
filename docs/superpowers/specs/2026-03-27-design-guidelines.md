# Flopsed — Design Guidelines

## Visual Identity

Flopsed looks like a real IDE. The entire game UI mimics VS Code's layout, theming, and interaction patterns. Players should feel like they're inside a code editor that happens to be a game.

## Layout

```
┌──────────────┬──────────────────────────────────────────┐
│  Sidebar     │  [tab: agi.py] [tab: tech_tree.svg] ...  │
│  (tree)      │                                           │
│              │   Main content area                       │
│ ▾ OPEN ED.   │   (editor, tech tree, settings, godmode)  │
│   agi.py     │                                           │
│              │                                           │
│ ▾ UPGRADES   ├──────────────────────────────────────────┤
│ ▾ freelancing│  ANALYTICS | TERMINAL                     │
│   items...   │  (bottom panel, appears at T2+)           │
│ ▾ startup    │                                           │
│   items...   │                                           │
│              │                                           │
│ ▾ MILESTONES │                                           │
│   ✓ item     │                                           │
│              │                                           │
│ [⚡ Execute] │                                           │
├──────────────┴──────────────────────────────────────────┤
│ ⚡ Tier  $cash  ◇ LoC  ⚡ FLOPS  │  $/loc  Python  UTF-8│
└─────────────────────────────────────────────────────────┘
```

### Panels

| Panel | Position | Size | Content |
|-------|----------|------|---------|
| Sidebar | Left | 260px fixed, min 200px | Upgrade tree + milestones + execute button |
| Main area | Center | flex: 1 | Tabbed: editor, tech tree, settings, god mode |
| Bottom panel | Below main | max 40%, min 120px | Analytics (T2+) + Terminal/AI prompt (T4+) |
| Status bar | Bottom | 22px fixed | Resources, tier, rates |

### Sidebar Tree Structure

- **Open Editors** — Shows the currently active tab's filename
- **Upgrades** — Collapsible tier folders (only unlocked tiers visible, locked tiers hidden)
  - Each upgrade: icon + name + count + effect summary + price badge
  - Click to buy (if affordable and not maxed)
- **Milestones** — Collapsible section at bottom
- **Execute button** — Pinned at the very bottom of the sidebar

### Tab Bar

- Tabs show a colored dot (blue `#519aba`) for the active tab
- Active tab has a lighter background matching `theme.tabActiveBg`
- Inactive tabs are dimmer with `theme.tabInactiveBg`

### Bottom Panel (VS Code Terminal-Style)

Appears at T2+ when the player hires their first dev. Contains:
- **Analytics tab** — Real-time LoC production per source (human + AI sections)
- **Terminal tab** (T4+) — Cosmetic AI prompt with flavor responses + FLOPS slider

Tab bar uses uppercase text with an underline indicator for the active tab.

### Status Bar

Fixed 22px bar at the very bottom. VS Code blue background by default.
- Left: tier name, cash (+rate), LoC (+rate), FLOPS (+rate)
- Right: $/loc, language (Python), encoding (UTF-8)

## Theming

The game uses a global theme system. The selected theme (via settings) applies to **every panel**, not just the code editor. All 8 themes have a complete IDE color palette:

### Theme Properties

| Property | Usage |
|----------|-------|
| `background` | Editor content area background |
| `foreground` | Primary text color |
| `sidebarBg` | Sidebar background |
| `activityBarBg` | Activity bar background (reserved for future use) |
| `panelBg` | Bottom panel background |
| `tabBarBg` | Tab bar background |
| `tabActiveBg` | Active tab background |
| `tabInactiveBg` | Inactive tab background |
| `statusBarBg` | Status bar background (often blue) |
| `statusBarFg` | Status bar text color (often white) |
| `border` | All borders between panels |
| `hoverBg` | Hover state background |
| `activeBg` | Active/selected item background |
| `textMuted` | Secondary text (labels, counts, rates) |
| `accent` | Accent color for highlights |
| `success` | Success indicators (green) |

### Accessing the Theme

```typescript
import { useIdeTheme } from "../hooks/use-ide-theme";

function MyComponent() {
  const theme = useIdeTheme();
  return <div style={{ background: theme.sidebarBg, color: theme.foreground }}>...</div>;
}
```

The `useIdeTheme()` hook reads the current theme from the UI store and returns the full `EditorTheme` object. Use it in any component that needs theme-aware colors.

### Available Themes

| ID | Name | Status Bar Color | Feel |
|----|------|-----------------|------|
| `one_dark` | One Dark | Blue `#007acc` | VS Code default dark |
| `monokai` | Monokai | Gray `#414339` | Classic Sublime |
| `github_dark` | GitHub Dark | Blue `#1f6feb` | GitHub's dark mode |
| `github_light` | GitHub Light | Blue `#0969da` | Light theme |
| `solarized_dark` | Solarized Dark | Blue `#268bd2` | Warm dark |
| `solarized_light` | Solarized Light | Blue `#268bd2` | Warm light |
| `dracula` | Dracula | Purple `#6272a4` | Popular dark |
| `nord` | Nord | Blue `#5e81ac` | Muted arctic |

### Adding a New Theme

1. Add the ID to `EditorThemeEnum` in `apps/game/src/modules/editor/data/editor-themes.ts`
2. Add the full theme object to `EDITOR_THEMES` (all properties required, including IDE colors)
3. The theme automatically appears in the settings page

## Typography

- **UI font**: `'Segoe UI', system-ui, -apple-system, sans-serif` — used for all chrome (sidebar, tabs, status bar, settings)
- **Code font**: `'Courier New', monospace` — used only in the code editor and CLI prompt

### Font Sizes

| Context | Size |
|---------|------|
| Tab bar | 13px |
| Sidebar tree items | 13px |
| Sidebar section headers | 11px |
| Sidebar effect summaries | 11px |
| Sidebar price badges | 10px |
| Status bar | 12px |
| Analytics dashboard rows | 12px |
| Milestones | 12px |
| Execute button | 12px |
| Bottom panel tab bar | 12px |
| Editor code | 14px |
| Tooltip titles | 14px |

## Upgrade Items (Sidebar Tree)

Each upgrade item in the sidebar tree follows this layout:

```
┌─────────────────────────────────────┐
│ 💻 Freelancer              3/5     │
│    +5 loc/s                [$250]  │
└─────────────────────────────────────┘
```

### States

| State | Name color | Border | Badge |
|-------|-----------|--------|-------|
| Affordable | `foreground` | Default | Amber `$cost` |
| Too expensive | `textMuted` (dim) | Default, 0.4 opacity | Dim |
| Maxed | `foreground`, 0.5 opacity | Green `success` | Green "MAXED" |

### Effect Summary Colors

| Effect type | Color | Example |
|------------|-------|---------|
| LoC production (add) | Blue `#58a6ff` | `+5 loc/s` |
| FLOPS (add) | Yellow `#fbbf24` | `+50 flops` |
| Multipliers (multiply) | Purple `#c084fc` | `×1.3` |
| Manager bonus | Purple `#c084fc` | `+50% teams` |
| Instant cash | Green `#3fb950` | `+$10M` |
| AI slot | Amber `#d4a574` | `+1 AI slot` |
| Singularity | Red `#e94560` | `🌀 AGI` |

## Event Notifications

Events appear as VS Code-style notifications in the **bottom-right corner**.

- Solid dark background (`#252526`)
- Left accent bar colored by sentiment:
  - Positive (bonuses): blue `#3794ff`
  - Negative (hazards): red `#f14c4c`
  - Neutral (choices): yellow `#cca700`
- Border: `#454545`
- Shadow: `0 4px 16px rgba(0,0,0,0.5)`
- Font: system UI font (not monospace)

## Tutorial Tips

Tutorial tooltips appear centered when unanchored (no spotlight) or positioned near the anchor element with a spotlight cutout overlay when anchored.

- Green border and title (`#7ee787`)
- Dark background (`#0d1117`)
- "got it" button with green border
- When no anchor: simple dim overlay (no SVG mask), tooltip centered

## Tech Tree

- Starts zoomed in (2x) on the Computer node
- User can scroll/pinch to zoom out and explore
- Only visible nodes are rendered (locked nodes hidden until prerequisites met)
- Popover on hover shows node details, cost, effects

## Progressive Disclosure

The UI reveals complexity as the player progresses:

| Tier | What appears |
|------|-------------|
| T0 | Editor only. Sidebar shows garage/ folder. Just typing. |
| T1 | freelancing/ folder appears. More upgrades visible. |
| T2 | startup/ folder. Bottom panel appears with Analytics tab. |
| T3 | tech_company/ folder. Analytics enriches with more sources. |
| T4 | ai_lab/ folder. Terminal tab appears in bottom panel. FLOPS slider in terminal. |
| T5 | agi_race/ folder. Endgame upgrades including The Singularity. |
