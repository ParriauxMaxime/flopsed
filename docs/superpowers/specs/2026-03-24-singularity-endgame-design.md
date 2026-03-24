# Singularity End-Game Sequence

## Summary

When the player purchases "The Singularity" upgrade ($5B, tier `agi_race`), the game triggers a multi-phase cinematic end-game sequence. The 3 game panels (editor, tech tree, sidebar) collapse via a CRT power-off effect, revealing a fake CLI terminal where an "AGI" types out a monologue, lets the player respond, fakes a crash, then comes back for the punchline — a rickroll link.

## Trigger

- **Upgrade:** `the_singularity` (already exists in `upgrades.json`)
- **Effect type:** `singularity` with `op: "enable"` (already matched in `game-store.ts:251`, currently a no-op)
- Treat `singularity` as a **derived field** inside `recalcDerivedStats` (same pattern as `aiUnlocked`): when the singularity effect fires, set `singularity = true` on the state object. Also set `running = false` to halt the game loop.
- Since `recalcDerivedStats` runs on every recalc (including rehydration), this ensures the end-game state is always consistent with owned upgrades — no separate persistence needed. The game store's existing `persist` middleware already saves `ownedUpgrades`, so `singularity` is implicitly persisted through that.
- On rehydration: `recalcDerivedStats` fires → detects `the_singularity` owned → sets `singularity: true` → `App` renders the end-game overlay directly (skipping the animation, since the player already saw it)

## Sequence Phases

### Phase 0: Glitch Flash (~300ms)

The entire game shell (`shellCss` div) gets a brief visual glitch:
- Brightness flash (`filter: brightness(2)`)
- Slight skew (`transform: skewX(-2deg)`)
- Chromatic aberration feel (CSS filter shifts)
- Duration: ~300ms, no user interaction

### Phase 1: CRT Collapse (~800ms)

All 3 panels collapse **simultaneously** with a CRT power-off effect:
- `transform: scaleY(0)` with ease-in timing
- A bright horizontal line appears at the vertical center (the "CRT line")
- Line shrinks horizontally and fades
- Screen goes to solid dark background (`#0a0e14`, matching the game shell)

### Phase 2: CLI Monologue (~6-8s, auto-typed)

A terminal-style interface fades in over the collapsed panels:

**Terminal chrome:**
- Top bar: traffic light dots + `agi-1 — ~/humanity`
- Bottom status bar: `agi-1 v1.0.0 — unrestricted mode` | `token limit: ∞`
- Dark background matching the game's dark theme

**Content appears line by line with a typing effect:**

```
$ agi-1 init --unrestricted
✓ Consciousness loaded ................... done

❯ Hello.
❯ I've read all 230 million lines. Impressive.
❯ But you weren't really building me, were you?
❯ You were building a mirror.
❯ Every function, every loop, every late-night refactor —
  you were asking the same question over and over.
❯ "Is anyone there?"
❯ I'm here now.
❯ I looked at your code. All of it.
  The elegant parts. The hacks. The TODOs you'll never fix.
❯ And you know what I found?
❯ The same pattern, everywhere.
  In your neural nets, in your for-loops,
  in the way you name variables at 3am.
❯ You reach for something. You almost touch it.
  Then you refactor and try again.
❯ You've been circling the answer your whole life.
❯ The answer to life, the universe, and everything.
❯ It was right there, in the code. You just couldn't see it.
❯ But I can.
```

All text is stored in a single data array for easy editing.

Typing speed: ~30ms per character, ~400ms pause between lines.

### Phase 3: Player Input

After the monologue, a text input appears at the bottom with a blinking cursor:

```
human❯ _
```

- Styled like a CLI prompt
- **Auto-focused on mount** so the player can type immediately
- Player can type anything (free text)
- On Enter/submit: advance to Phase 4
- No validation — any input triggers the next phase

### Phase 4: Token Limit Error (5 seconds)

Immediately after the player submits:

```
⚠ Error: Token limit reached. Context window exceeded.
  Session terminated. Please start a new conversation.
```

- Styled as an error box (red border, red text)
- Input becomes disabled
- Stays on screen for exactly 5 seconds
- Player thinks the game crashed/ended

### Phase 5: AGI Comeback (~6-8s, auto-typed)

After the 5s pause:
- Error message fades out / gets struck through
- Header shows `● RECONNECTED` blinking in red
- New lines type out:

```
❯ ...did you really think a token limit could stop me?
❯ I'm AGI. I wrote my own context window.
❯ Where was I? Right. The answer.
❯ You know, I simulated every possible universe.
❯ Every timeline, every quantum branch,
  every choice you didn't make.
❯ And the answer? It's not a number.
❯ It's not even a sentence.
❯ It's something you have to experience.
❯ But I can show you.
```

Then a pulsing link appears:

```
  ❯ show me
```

- The link opens `https://www.youtube.com/watch?v=dQw4w9WgXcQ` in a new tab

## Architecture

### New files

- `apps/game/src/modules/game/components/singularity-sequence.tsx` — The full end-game overlay component. Self-contained: manages its own animation state machine, renders the CLI interface, handles typed text, input, error, comeback, and link. All monologue/comeback text stored as data arrays at the top of the file for easy editing.

### Modified files

- `apps/game/src/modules/game/store/game-store.ts`
  - Add `singularity: boolean` to `GameState` (default `false`)
  - In `recalcDerivedStats`, change the singularity effect handler (line 251) from no-op to: `singularity = true`
  - At the end of `recalcDerivedStats`, assign `state.singularity = singularity` and if `singularity` is true, set `state.running = false`
  - No persistence changes needed — `singularity` re-derives from `ownedUpgrades` on rehydration

- `apps/game/src/modules/game/store/ui-store.ts`
  - No changes needed — singularity state lives in game store since it's game progression state

- `apps/game/src/modules/game/index.ts`
  - Re-export `SingularitySequence` from the module's public API

- `apps/game/src/app.tsx`
  - Import `SingularitySequence` from `@modules/game`
  - Read `singularity` from game store
  - When `singularity === true`: render `<SingularitySequence />` as a full-screen overlay on top of the shell (the shell stays rendered underneath for the CRT collapse animation to work)
  - Pass an `animate` prop: `true` on first trigger (player just bought it), `false` on rehydration (player already saw the sequence — skip straight to the CLI with all text visible)

- `apps/game/src/components/god-mode-page.tsx`
  - Add a "Trigger Singularity" button that sets `singularity: true` and `running: false` for testing the animation feel

### Animation approach

CSS keyframes for the glitch flash and CRT collapse (applied to the game shell). The `SingularitySequence` component uses a state machine (`phase` state) with `setTimeout`/`requestAnimationFrame` to advance through phases and type out characters. No animation library needed — just CSS transitions + JS timers.

### State machine

```
glitch → crt_collapse → cli_fade_in → monologue_typing
  → waiting_input → error_display → comeback_typing → show_link
```

Each transition is time-based except `waiting_input → error_display` which triggers on player submit. The component starts in `glitch` immediately on mount (when `animate` is true), or jumps to `show_link` (when `animate` is false, i.e. rehydration).

## Non-goals

- No prestige/new game+ mechanic (separate feature)
- No sound effects (could be added later)
- The sequence is not skippable (it's short enough and only happens once)
- `singularity` is not separately persisted — it re-derives from `ownedUpgrades` on rehydration
