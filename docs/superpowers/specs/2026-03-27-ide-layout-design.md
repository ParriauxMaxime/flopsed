# IDE Layout Redesign — Design Spec

## Overview

Rearrange the game layout to feel like a real IDE (VS Code style). The sidebar moves to the left with a tree-based upgrade shop, the editor/tech-tree becomes the center panel with tabs, and resources move to a status bar at the bottom. No right panel.

## Layout

```
┌──────────────┬──────────────────────────────────────────┐
│  Sidebar     │  [tab: agi.py] [tab: tech_tree.svg]      │
│  (tree)      │  [tab: settings.json] [tab: godmode.ts]  │
│              │                                           │
│ ▾ freelancing│   Editor / Tech Tree / Settings / God Mode│
│   💻 Freelncr│   (tab-switched, same as current middle   │
│   🖥️ Desktop │    panel + editor panel merged)           │
│ ▾ startup/   │                                           │
│   🖧 Server  │                                           │
│ ▸ tech_co 🔒 │                                           │
│              │                                           │
│ ▾ Milestones │                                           │
│   ✓ Hello W  │                                           │
│   ○ Real Dev │                                           │
├──────────────┴──────────────────────────────────────────┤
│ $ 1,234  ◇ 5.6K LoC  ⚡ 150 FLOPS  │  Freelancing      │
└─────────────────────────────────────────────────────────┘
```

### Panel structure (left to right)

1. **Sidebar** (left, fixed ~240px, min 200px): upgrade tree + milestones
2. **Main area** (flex: 1): tab bar + content area (editor, tech tree, settings, god mode)

### Status bar (bottom, full width)

Replaces the current ResourceBar and TierProgress components. A single horizontal bar at the bottom showing:
- Left side: `$ {cash}`, `◇ {loc} LoC`, `⚡ {flops} FLOPS` — with rates underneath each value
- Right side: tier name, language indicator ("Python" / "Rust" depending on tier)

## Sidebar Tree

### Structure

The sidebar is a scrollable tree view with two sections:

**Upgrades section** — tier folders containing upgrade items:
```
UPGRADES
▾ 📂 freelancing/
  💻 Freelancer      3/5    +5 loc/s     [$250]
  🖥️ Desktop PC      2/5    +50 flops    [$375]
  🖵 Monitor          0/5    +25 flops    [$80]
▾ 📂 startup/
  🖧 Server Rack      0/5    +200 flops   [$3K]
  👶 Intern           0/10   +15 loc/s    [$500]
▸ 📂 tech_company/ 🔒
▸ 📂 ai_lab/ 🔒
▸ 📂 agi_race/ 🔒
```

**Milestones section** — collapsible, at the bottom:
```
MILESTONES
  ✓ Hello World — 10
  ✓ Script Kiddie — 100
  ○ Real Developer — 1K
  ○ YC Application — 5K
```

### Tier folders

- **Unlocked tiers** (index ≤ currentTierIndex): expanded by default, collapsible
- **Locked tiers** (index > currentTierIndex): collapsed, dimmed, non-expandable, show 🔒
- **Clicking a folder row** toggles open/closed (standard tree behavior)

### Upgrade items

Each upgrade is a compact card inside its tier folder:

```
┌─────────────────────────────────────┐
│ 💻 Freelancer              3/5     │
│    +5 loc/s                [$250]  │
└─────────────────────────────────────┘
```

- **Row 1**: icon + name (left), owned/max count flat text (right)
- **Row 2**: effect summary (left, colored by type), price pill badge (right)
- **Click to buy** (if affordable and not maxed)
- **Hover**: border highlights blue

#### Item states

- **Affordable**: name in normal color, price badge in amber
- **Too expensive**: name in dim, price badge in dim
- **Maxed**: dim with green border, badge shows "MAXED" in green, count shows `✓` for max:1
- **Locked** (requires tech node not yet researched): hidden (same as current behavior)

#### Effect summary

Derived from the upgrade's first effect. Color-coded by effect type:

| Effect type | Display | Color |
|------------|---------|-------|
| `freelancerLoc`, `internLoc`, `devLoc`, `teamLoc`, `autoLoc`, `agentLoc` (op: add) | `+{value} loc/s` | `#58a6ff` (blue) |
| `flops`, `cpuFlops`, `ramFlops`, `storageFlops` (op: add) | `+{value} flops` | `#fbbf24` (yellow) |
| `cashMultiplier`, `locProductionSpeed`, `devSpeed` (op: multiply) | `×{value} {type}` | `#c084fc` (purple) |
| `llmLocMultiplier`, `freelancerLocMultiplier`, etc. (op: multiply) | `×{value} {short}` | `#c084fc` (purple) |
| `managerLoc` (op: add) | `+50% teams` | `#c084fc` (purple) |
| `instantCash` (op: add) | `+${value}` | `#3fb950` (green) |
| `singularity` (op: enable) | `🌀 AGI` | `#e94560` (red) |
| `llmHostSlot` (op: add) | `+1 AI slot` | `#d4a574` (amber) |

Use the `formatNumber` utility for large values.

## Main Area (Center)

Merges the current "editor panel" and "middle panel" into a single tabbed area. Tabs:

- `agi.py` — The code editor (+ analytics dashboard at T2+, + CLI prompt at T4+, per the dynamic editor panel spec)
- `tech_tree.svg` — Tech tree visualization (current TechTreePage)
- `settings.json` — Settings page (current SettingsPage)
- `godmode.ts` — God mode page (current GodModePage)

The `agi.py` tab replaces the old EditorPanel content. The dynamic tier-based behavior (dashboard, CLI prompt) from the previous spec still applies within this tab.

Default active tab: `agi.py` (mapped to `PageEnum.game`).

## Status Bar

A horizontal bar fixed at the bottom of the viewport, full width. Two sections:

**Left side** — resources with rates:
```
$ 1,234 (+50/s)   ◇ 5.6K LoC (+663/s)   ⚡ 150 FLOPS
```

- Cash: green `#3fb950`
- LoC: blue `#58a6ff`
- FLOPS: yellow `#fbbf24`
- Rates in dim color `#484f58`

**Right side** — tier + file info:
```
Freelancing   Python   UTF-8   LF
```

Style: `background: #0d1117`, `border-top: 1px solid #1e2630`, `font-size: 11px`, `padding: 2px 12px`.

The existing ResourceBar, TierProgress, and the top-of-sidebar layout are all replaced by this single status bar.

## What Moves Where

| Current | New location |
|---------|-------------|
| ResourceBar (sidebar top) | Status bar (bottom left) |
| TierProgress (sidebar) | Status bar (bottom right) |
| FlopsSlider (sidebar or CLI prompt) | CLI prompt at T4+ (unchanged), hidden pre-T4 |
| UpgradeList (sidebar tab) | Sidebar tree (left, always visible) |
| MilestoneList (sidebar tab) | Sidebar tree bottom section (collapsible) |
| EditorPanel (left panel) | Main area `agi.py` tab |
| Middle panel tabs (tech tree, settings, god mode) | Main area tabs |

## Files to Create/Modify

- **Create**: `apps/game/src/components/sidebar-tree.tsx` — New tree sidebar with tier folders + upgrade items + milestones
- **Create**: `apps/game/src/components/status-bar.tsx` — New bottom status bar (resources + tier)
- **Modify**: `apps/game/src/app.tsx` — New layout: sidebar-tree left, main area center, status bar bottom. Remove old 3-panel structure. Merge editor panel + middle panel into single tabbed area. Add `agi.py` tab to middleTabs.
- **Modify**: `apps/game/src/components/editor-panel.tsx` — Remove the outer panel wrapper (flex, minWidth, borderRight). The editor panel content is now rendered inside the main area's `agi.py` tab, not as a standalone panel.
- **Delete old sidebar**: `apps/game/src/components/sidebar.tsx` — Replaced entirely by sidebar-tree + status-bar.

## PageEnum Update

Add `game` page as the default (editor view). Update the enum if needed so `agi.py` tab maps to `PageEnum.game`.

Current pages: `game`, `tech_tree`, `settings`, `god_mode` — these all become tabs in the main area.

## Out of Scope

- Activity bar (icon strip on far left) — deferred
- Mobile layout changes
- Sidebar resize handle (drag to resize) — deferred
- Search/filter in upgrade tree
