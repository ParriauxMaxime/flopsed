# Stats Panel Redesign — Single Panel with Collapsible Sections

**Date:** 2026-04-01
**Status:** Approved
**Mockup:** `.superpowers/brainstorm/999312-1775034495/content/sidebar-interactive-v3.html`

## Summary

Replace the current tabbed right sidebar (Resources / Timeline / Graphs) with a single scrollable panel using IDE-style collapsible sections. All information lives in one view — no tabs, no context switching.

## Section Layout (top to bottom)

### 1. Header (fixed)
- `⚡ Stats` title, elapsed timer badge, collapse button
- Same as current, unchanged

### 2. Cash Section
- **Always visible**, not collapsible in early game
- Shows: `$ Cash` label + large value (`$48.2K`)
- **When graphs unlock** (`unlock_perf_graphs` tech node): becomes collapsible with `▶/▼` chevron. Expanded body contains a $/s sparkline chart
- Section header height: 54px, value font: 22px

### 3. LoC Section
- **Always visible** header with value + rate (`84K/s`)
- **When analytics unlock** (`unlock_analytics` tech node — not first freelancer): becomes collapsible. Expanded body contains:
  - **When graphs unlock**: Produced/Executed dual sparkline (solid blue = produced, dashed purple = executed)
  - LoC source breakdown with proportional bars
  - Manager bonus line (if applicable)
- **Source colors use tier colors:**
  - You = T0 garage `#6272a4`
  - Freelancer = T1 freelancing `#8be9fd`
  - Intern = T1 `#8be9fd`
  - Dev Team = T2 startup `#3fb950`

### 4. Tokens Section (conditional)
- **Only appears when AI is unlocked** (T4+)
- Positioned between LoC and FLOPS
- Collapsible. Expanded body contains:
  - Token rate sparkline (when graphs unlocked)
  - FLOPS saturation gauge (`⚡ 24K / 32K FLOPS (75%)`)
  - Per-model consumption bars
- **Token color**: faded green `#6a9955`
- **AI model colors by family** (consistent across the game):
  - Claude = `#d4a574` (warm orange)
  - GPT = `#3fb950` (green)
  - Gemini = `#58a6ff` (blue)
  - Llama = `#a29bfe` (lavender)
  - Mistral = `#fd79a8` (pink)
  - DeepSeek = `#00d4aa` (teal)
  - Copilot = `#6c5ce7` (indigo)

### 5. FLOPS Section
- **Always visible** header with value
- **When graphs unlock**: becomes collapsible. Expanded body contains:
  - **When AI unlocked (T4+)**: Exec/AI split bar showing the `flopSlider` allocation (e.g. 70% exec / 30% AI) with teal (`#4ec9b0`) for exec and purple (`#c678dd`) for AI, plus legend with absolute values
  - FLOPS utilization sparkline

### 6. Tier Progression Bar
- Horizontal segmented bar showing time spent in each tier
- Each segment uses the tier color from `tierColors` in theme
- Current tier segment pulses
- Segment shows tier label (T0, T1...) and elapsed time if wide enough

### 7. History Log (collapsible)
- **Git-graph style**: `●` dots on a `│` trunk line, one row per purchase
- Each row shows: dot, sha hash, item name, time ago
- **SHA format**: `t{tierIndex}{5 random hex chars}` — the `t0`/`t1`/`t4` prefix is colored with the tier color, rest is muted (`#6a6e75`)
- **Last 5 entries always visible**. Click `▶ History` header to expand and scroll through full log
- When collapsed, shows `⋮` below the 5th entry

### 8. Execute Button (sticky bottom)
- Pinned to bottom of sidebar with `border-top`, never scrolls away
- **Before auto-exec unlocked**: full-width button `Execute X LoC ($Y.YY)`
- **After auto-exec unlocked**: button on left + toggle column on right
  - Toggle column: "Auto" label (9px) above the toggle switch
  - **Auto ON**: display shows `⚡ $X/s` (styled as status label, not button)
  - **Auto OFF**: display becomes clickable `Execute X LoC ($Y.YY)` button

## Collapsible Behavior

- IDE-style `▶` (collapsed) / `▼` (expanded) chevrons
- Smooth expand/collapse animation (max-height transition, 200ms)
- All collapsible sections have identical collapsed header height (54px)
- Hover highlights on collapsible section headers

## Progressive Unlock Summary

| Tech Node | What Changes |
|-----------|-------------|
| `unlock_stats_panel` | Panel visible |
| `unlock_analytics` | LoC section becomes collapsible with producer breakdown |
| `unlock_perf_graphs` | Cash and FLOPS become collapsible with sparklines. LoC gets produced/executed sparkline |
| `unlock_session_timeline` | History log visible (was already planned to show always — keep unlock gate or remove?) |
| AI unlock (T4) | Tokens section appears. FLOPS section gains exec/AI split bar |

## What Gets Removed

- The tab bar (Resources / Timeline / Graphs)
- `activeTab` local state in `StatsPanel`
- The current `StatsPanelTimeline` component (tier bar moves inline, purchase feed becomes git-graph history, rate trends absorbed into sparklines)
- The current `StatsPanelGraphs` component (sparklines move into each resource section's collapsible body)
- The `showSources` condition that requires `autoLocPerSec > 0 || humanSources.length > 1` — analytics visibility now keyed only to the tech node

## Files Affected

- `apps/game/src/components/stats-panel.tsx` — rewrite: remove tabs, single scrollable panel with collapsible sections
- `apps/game/src/components/stats-panel-resources.tsx` — split into per-section components or refactor inline
- `apps/game/src/components/stats-panel-timeline.tsx` — delete (tier bar + history extracted)
- `apps/game/src/components/stats-panel-graphs.tsx` — delete (sparklines move into sections)
- `apps/game/src/components/sparkline.tsx` — keep as-is, reused in section bodies
- New: collapsible section component (shared `▶/▼` + expand/collapse animation)
- New: git-graph history component
- i18n: may need new keys for "History", "Auto", sha display; remove `tab_timeline`, `tab_graphs` keys
