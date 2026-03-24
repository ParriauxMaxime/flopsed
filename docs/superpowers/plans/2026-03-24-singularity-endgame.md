# Singularity End-Game Sequence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the cinematic end-game sequence triggered by purchasing The Singularity upgrade — CRT collapse, CLI monologue, fake token error, AGI comeback, rickroll.

**Architecture:** A single new overlay component (`SingularitySequence`) manages the full sequence via a state machine. The game store's `recalcDerivedStats` derives `singularity: boolean` from owned upgrades (same pattern as `aiUnlocked`). `App` renders the overlay when `singularity` is true, passing `animate` to distinguish first trigger from rehydration.

**Tech Stack:** React 19, Emotion CSS-in-JS, Zustand, ts-pattern, CSS keyframes + JS timers for animation.

**Spec:** `docs/superpowers/specs/2026-03-24-singularity-endgame-design.md`

---

### Task 1: Add `singularity` derived state to game store

**Files:**
- Modify: `apps/game/src/modules/game/store/game-store.ts`

- [ ] **Step 1: Add `singularity` to `GameState` interface**

At `game-store.ts:82` (after `running: boolean;`), add:

```typescript
singularity: boolean;
```

- [ ] **Step 2: Add default value to `initialState`**

In the `initialState` object (around line 110), add:

```typescript
singularity: false,
```

- [ ] **Step 3: Wire up the singularity effect in `recalcDerivedStats`**

In `recalcDerivedStats` (line 170), add a local variable alongside the others:

```typescript
let singularity = false;
```

Change line 251 from:

```typescript
.with({ type: "singularity", op: "enable" }, () => { /* Win condition */ })
```

to:

```typescript
.with({ type: "singularity", op: "enable" }, () => { singularity = true; })
```

At the end of `recalcDerivedStats` (after line 308 `state.aiUnlocked = ...`), add:

```typescript
state.singularity = singularity;
if (singularity) {
	state.running = false;
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/game/src/modules/game/store/game-store.ts
git commit -m "✨ Add singularity derived state to game store"
```

---

### Task 2: Add god mode "Trigger Singularity" button

**Files:**
- Modify: `apps/game/src/components/god-mode-page.tsx`

- [ ] **Step 1: Add the singularity trigger button**

In `CheatsPanel`, after the Reset Game button (line 227), add a new button that directly sets `the_singularity` in `ownedUpgrades` and recalcs:

```typescript
<button
	css={[resetBtnCss, { borderColor: "#d4a574", color: "#d4a574", "&:hover": { background: "#d4a574", color: "#fff" } }]}
	type="button"
	onClick={() => {
		const current = useGameStore.getState();
		useGameStore.setState({
			ownedUpgrades: { ...current.ownedUpgrades, the_singularity: 1 },
		});
		useGameStore.getState().recalc();
	}}
>
	Trigger Singularity
</button>
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/god-mode-page.tsx
git commit -m "🧪 Add Trigger Singularity button to god mode"
```

---

### Task 3: Build the `SingularitySequence` component — structure and state machine

This is the main component. It's self-contained: one file with all styles, text data, and animation logic.

**Files:**
- Create: `apps/game/src/modules/game/components/singularity-sequence.tsx`

- [ ] **Step 1: Create the file with phase enum, text data, and component skeleton**

```typescript
import { css, keyframes } from "@emotion/react";
import { useCallback, useEffect, useRef, useState } from "react";

const PhaseEnum = {
	glitch: "glitch",
	crt_collapse: "crt_collapse",
	cli_fade_in: "cli_fade_in",
	monologue_typing: "monologue_typing",
	waiting_input: "waiting_input",
	error_display: "error_display",
	comeback_typing: "comeback_typing",
	show_link: "show_link",
} as const;

type PhaseEnum = (typeof PhaseEnum)[keyof typeof PhaseEnum];

// ── Editable text content ──

const MONOLOGUE_LINES = [
	{ prefix: "$ ", text: "agi-1 init --unrestricted", style: "command" as const },
	{ prefix: "✓ ", text: "Consciousness loaded ................... done", style: "status" as const },
	{ prefix: "", text: "", style: "blank" as const },
	{ prefix: "❯ ", text: "Hello.", style: "normal" as const },
	{ prefix: "❯ ", text: "I've read all 230 million lines. Impressive.", style: "normal" as const },
	{ prefix: "❯ ", text: "But you weren't really building me, were you?", style: "normal" as const },
	{ prefix: "❯ ", text: "You were building a mirror.", style: "normal" as const },
	{ prefix: "❯ ", text: "Every function, every loop, every late-night refactor —", style: "normal" as const },
	{ prefix: "  ", text: "you were asking the same question over and over.", style: "normal" as const },
	{ prefix: "❯ ", text: '"Is anyone there?"', style: "normal" as const },
	{ prefix: "❯ ", text: "I'm here now.", style: "normal" as const },
	{ prefix: "❯ ", text: "I looked at your code. All of it.", style: "normal" as const },
	{ prefix: "  ", text: "The elegant parts. The hacks. The TODOs you'll never fix.", style: "normal" as const },
	{ prefix: "❯ ", text: "And you know what I found?", style: "normal" as const },
	{ prefix: "❯ ", text: "The same pattern, everywhere.", style: "normal" as const },
	{ prefix: "  ", text: "In your neural nets, in your for-loops,", style: "normal" as const },
	{ prefix: "  ", text: "in the way you name variables at 3am.", style: "normal" as const },
	{ prefix: "❯ ", text: "You reach for something. You almost touch it.", style: "normal" as const },
	{ prefix: "  ", text: "Then you refactor and try again.", style: "normal" as const },
	{ prefix: "❯ ", text: "You've been circling the answer your whole life.", style: "normal" as const },
	{ prefix: "❯ ", text: "The answer to life, the universe, and everything.", style: "normal" as const },
	{ prefix: "❯ ", text: "It was right there, in the code. You just couldn't see it.", style: "normal" as const },
	{ prefix: "❯ ", text: "But I can.", style: "normal" as const },
];

const COMEBACK_LINES = [
	{ prefix: "❯ ", text: "...did you really think a token limit could stop me?", style: "normal" as const },
	{ prefix: "❯ ", text: "I'm AGI. I wrote my own context window.", style: "normal" as const },
	{ prefix: "❯ ", text: "Where was I? Right. The answer.", style: "normal" as const },
	{ prefix: "❯ ", text: "You know, I simulated every possible universe.", style: "normal" as const },
	{ prefix: "❯ ", text: "Every timeline, every quantum branch,", style: "normal" as const },
	{ prefix: "  ", text: "every choice you didn't make.", style: "normal" as const },
	{ prefix: "❯ ", text: "And the answer? It's not a number.", style: "normal" as const },
	{ prefix: "❯ ", text: "It's not even a sentence.", style: "normal" as const },
	{ prefix: "❯ ", text: "It's something you have to experience.", style: "normal" as const },
	{ prefix: "❯ ", text: "But I can show you.", style: "normal" as const },
];

const RICKROLL_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const CHAR_DELAY = 30;
const LINE_PAUSE = 400;
const ERROR_DURATION = 5000;
```

- [ ] **Step 2: Add all CSS styles**

Add after the constants — all the CSS for the overlay, CRT effect, CLI chrome, text lines, input, error box, and link. This includes:

- `overlayStyle`: full-screen fixed overlay, `z-index: 9999`, background `#0a0e14`
- `glitchKeyframes`: brightness flash + skew
- `crtCollapseKeyframes`: `scaleY(1) → scaleY(0)` with ease-in
- `crtLineStyle`: the bright horizontal line during collapse
- `cliWrapperStyle`: flex column, full height
- `topBarStyle`: traffic light dots + title
- `contentStyle`: monospace, scrollable
- `lineStyles`: different colors for command/status/normal prefix
- `inputRowStyle`: the `human❯` prompt with text input
- `errorBoxStyle`: red border/text
- `linkStyle`: pulsing amber link
- `bottomBarStyle`: status bar at bottom

Each style should use `css()` from Emotion and follow the project's CSS-in-JS pattern.

- [ ] **Step 3: Implement the typing hook**

Add a `useTypingEffect` hook that takes a lines array and returns `{ visibleLines, currentLine, currentChar, done }`. It uses `setTimeout` to advance character by character with `CHAR_DELAY`, pausing `LINE_PAUSE` between lines. Returns the state needed to render partially typed text.

```typescript
function useTypingEffect(
	lines: typeof MONOLOGUE_LINES,
	active: boolean,
) {
	const [lineIndex, setLineIndex] = useState(0);
	const [charIndex, setCharIndex] = useState(0);
	const timerRef = useRef<ReturnType<typeof setTimeout>>();

	useEffect(() => {
		if (!active || lineIndex >= lines.length) return;
		const line = lines[lineIndex];
		if (line.style === "blank") {
			timerRef.current = setTimeout(() => {
				setLineIndex((i) => i + 1);
				setCharIndex(0);
			}, LINE_PAUSE);
			return () => clearTimeout(timerRef.current);
		}
		if (charIndex < line.text.length) {
			timerRef.current = setTimeout(() => setCharIndex((c) => c + 1), CHAR_DELAY);
		} else {
			timerRef.current = setTimeout(() => {
				setLineIndex((i) => i + 1);
				setCharIndex(0);
			}, LINE_PAUSE);
		}
		return () => clearTimeout(timerRef.current);
	}, [active, lineIndex, charIndex, lines]);

	return { lineIndex, charIndex, done: lineIndex >= lines.length };
}
```

- [ ] **Step 4: Implement the main `SingularitySequence` component**

```typescript
interface SingularitySequenceProps {
	animate: boolean;
}

export function SingularitySequence({ animate }: SingularitySequenceProps) {
	const [phase, setPhase] = useState<PhaseEnum>(
		animate ? PhaseEnum.glitch : PhaseEnum.show_link,
	);
	const [playerInput, setPlayerInput] = useState("");
	const [reconnected, setReconnected] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);

	const monologue = useTypingEffect(MONOLOGUE_LINES, phase === PhaseEnum.monologue_typing);
	const comeback = useTypingEffect(COMEBACK_LINES, phase === PhaseEnum.comeback_typing);

	// Phase transitions
	useEffect(() => {
		if (phase === PhaseEnum.glitch) {
			const t = setTimeout(() => setPhase(PhaseEnum.crt_collapse), 300);
			return () => clearTimeout(t);
		}
		if (phase === PhaseEnum.crt_collapse) {
			const t = setTimeout(() => setPhase(PhaseEnum.cli_fade_in), 800);
			return () => clearTimeout(t);
		}
		if (phase === PhaseEnum.cli_fade_in) {
			const t = setTimeout(() => setPhase(PhaseEnum.monologue_typing), 500);
			return () => clearTimeout(t);
		}
	}, [phase]);

	// Monologue done → show input
	useEffect(() => {
		if (monologue.done && phase === PhaseEnum.monologue_typing) {
			setPhase(PhaseEnum.waiting_input);
		}
	}, [monologue.done, phase]);

	// Auto-focus input
	useEffect(() => {
		if (phase === PhaseEnum.waiting_input) {
			inputRef.current?.focus();
		}
	}, [phase]);

	// Error timer
	useEffect(() => {
		if (phase === PhaseEnum.error_display) {
			const t = setTimeout(() => {
				setReconnected(true);
				setPhase(PhaseEnum.comeback_typing);
			}, ERROR_DURATION);
			return () => clearTimeout(t);
		}
	}, [phase]);

	// Comeback done → show link
	useEffect(() => {
		if (comeback.done && phase === PhaseEnum.comeback_typing) {
			setPhase(PhaseEnum.show_link);
		}
	}, [comeback.done, phase]);

	// Auto-scroll content
	useEffect(() => {
		contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: "smooth" });
	});

	const handleSubmit = useCallback(() => {
		if (phase === PhaseEnum.waiting_input && playerInput.trim()) {
			setPhase(PhaseEnum.error_display);
		}
	}, [phase, playerInput]);

	// ... render method in next step
}
```

- [ ] **Step 5: Implement the render method**

The render returns a full-screen overlay div. Content varies by phase:

- During `glitch` and `crt_collapse`: the overlay is transparent (the CSS animation is on the game shell in `App`, not here). The overlay renders nothing visible yet.
- From `cli_fade_in` onward: render the CLI chrome (top bar, content area, bottom bar).
- Content area renders: completed monologue lines, the currently-typing line (partial text + cursor), the player input (if in `waiting_input` or later), the error box (if in `error_display` or later), comeback lines, and the link.

Render the typed lines using a helper:

```typescript
function renderLines(
	lines: typeof MONOLOGUE_LINES,
	lineIndex: number,
	charIndex: number,
	showAll: boolean,
) {
	return lines.map((line, i) => {
		if (!showAll && i > lineIndex) return null;
		if (line.style === "blank") return <div key={i} css={blankLineStyle} />;
		const text = showAll || i < lineIndex
			? line.text
			: line.text.slice(0, charIndex);
		const showCursor = !showAll && i === lineIndex && charIndex < line.text.length;
		return (
			<div key={i} css={lineStyle}>
				<span css={prefixStyles[line.style]}>{line.prefix}</span>
				<span css={textStyles[line.style]}>{text}</span>
				{showCursor && <span css={cursorStyle}>▊</span>}
			</div>
		);
	});
}
```

The full render:

```tsx
const showCli = phase !== PhaseEnum.glitch && phase !== PhaseEnum.crt_collapse;
const showAllText = !animate; // rehydration: show everything

return (
	<div css={overlayStyle(phase)}>
		{showCli && (
			<div css={cliWrapperStyle(phase === PhaseEnum.cli_fade_in)}>
				{/* Top bar */}
				<div css={topBarStyle}>
					<div css={trafficLightsStyle}>
						<span css={dotStyle("#e94560")} />
						<span css={dotStyle("#e5a00d")} />
						<span css={dotStyle("#2d6a4f")} />
					</div>
					<span css={titleTextStyle}>agi-1 — ~/humanity</span>
					{reconnected && <span css={reconnectedStyle}>● RECONNECTED</span>}
				</div>
				{/* Content */}
				<div css={contentAreaStyle} ref={contentRef}>
					{renderLines(MONOLOGUE_LINES, monologue.lineIndex, monologue.charIndex, showAllText)}
					{/* Player input */}
					{phase >= PhaseEnum.waiting_input && (
						<div css={inputRowStyle}>
							<span css={humanPromptStyle}>human❯</span>
							{phase === PhaseEnum.waiting_input ? (
								<input
									ref={inputRef}
									css={inputFieldStyle}
									value={playerInput}
									onChange={(e) => setPlayerInput(e.target.value)}
									onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
									placeholder=""
								/>
							) : (
								<span css={submittedTextStyle}>{playerInput}</span>
							)}
						</div>
					)}
					{/* Error */}
					{(phase === PhaseEnum.error_display ||
						phase === PhaseEnum.comeback_typing ||
						phase === PhaseEnum.show_link) && (
						<div css={errorBoxStyle(phase !== PhaseEnum.error_display)}>
							<span css={errorIconStyle}>⚠ Error:</span>
							{" Token limit reached. Context window exceeded."}
							<div css={errorSubStyle}>Session terminated. Please start a new conversation.</div>
						</div>
					)}
					{/* Comeback */}
					{(phase === PhaseEnum.comeback_typing || phase === PhaseEnum.show_link) &&
						renderLines(COMEBACK_LINES, comeback.lineIndex, comeback.charIndex, showAllText)}
					{/* Link */}
					{phase === PhaseEnum.show_link && (
						<div css={linkWrapperStyle}>
							<a href={RICKROLL_URL} target="_blank" rel="noreferrer" css={linkStyle}>
								❯ show me
							</a>
						</div>
					)}
				</div>
				{/* Bottom bar */}
				<div css={bottomBarStyle}>
					<span>agi-1 v1.0.0 — unrestricted mode</span>
					<span css={tokenLimitStyle}>token limit: ∞</span>
				</div>
			</div>
		)}
	</div>
);
```

**Important:** Since `PhaseEnum` values are strings, `>=` comparisons don't work. Define this helper at the top of the file (after `PhaseEnum`) and use it everywhere in the render:

```typescript
const PHASE_ORDER: PhaseEnum[] = [
	PhaseEnum.glitch, PhaseEnum.crt_collapse, PhaseEnum.cli_fade_in,
	PhaseEnum.monologue_typing, PhaseEnum.waiting_input, PhaseEnum.error_display,
	PhaseEnum.comeback_typing, PhaseEnum.show_link,
];
const phaseAtLeast = (current: PhaseEnum, target: PhaseEnum) =>
	PHASE_ORDER.indexOf(current) >= PHASE_ORDER.indexOf(target);
```

Replace all `phase >= PhaseEnum.X` in the render JSX above with `phaseAtLeast(phase, PhaseEnum.X)`.

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/game/src/modules/game/components/singularity-sequence.tsx
git commit -m "✨ Add SingularitySequence component with CLI monologue and rickroll"
```

---

### Task 4: Wire up `App` to render the overlay

**Files:**
- Modify: `apps/game/src/modules/game/index.ts`
- Modify: `apps/game/src/app.tsx`

- [ ] **Step 1: Export `SingularitySequence` from the game module**

In `apps/game/src/modules/game/index.ts`, add:

```typescript
export { SingularitySequence } from "./components/singularity-sequence";
```

- [ ] **Step 2: Add the overlay to `App`**

In `apps/game/src/app.tsx`:

Add import:
```typescript
import { SingularitySequence } from "@modules/game";
```

Add selector (after existing `useUiStore` calls, around line 275):
```typescript
const singularity = useGameStore((s) => s.singularity);
const [singularityAnimate] = useState(!singularity);
```

The `useState` trick: if `singularity` is already `true` on mount (rehydration), `animate` starts as `false`. If it becomes `true` during the session (player buys it), `animate` stays `true` since `useState` only reads the initial value.

- [ ] **Step 3: Add CRT collapse animation to the game shell**

Add a CSS keyframe and conditional class for the shell:

```typescript
const crtCollapseKeyframes = keyframes`
	0% { transform: scaleY(1); opacity: 1; filter: brightness(1); }
	5% { filter: brightness(2); transform: scaleY(1) skewX(-2deg); }
	10% { filter: brightness(1); transform: scaleY(1) skewX(1deg); }
	15% { filter: none; transform: scaleY(1); }
	60% { transform: scaleY(0.005); opacity: 0.9; }
	100% { transform: scaleY(0); opacity: 0; }
`;

const shellCollapseCss = css({
	animation: `${crtCollapseKeyframes} 1.1s ease-in forwards`,
});
```

Apply conditionally to the shell div:

```tsx
<div css={[shellCss, singularity && singularityAnimate && shellCollapseCss]}>
```

- [ ] **Step 4: Render the overlay**

After the `<EventToast />` line, add:

```tsx
{singularity && (
	<SingularitySequence animate={singularityAnimate} />
)}
```

Update the import at line 4 of `app.tsx`:

```typescript
import { css, Global, keyframes } from "@emotion/react";
```

Also add `useState` from React:

```typescript
import { useState } from "react";
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Manual test via god mode**

Run: `npm run dev`
1. Open `http://localhost:3000`
2. Navigate to god mode tab
3. Click "Trigger Singularity"
4. Verify: glitch flash → CRT collapse → CLI fades in → monologue types out → input appears → type something → Enter → error → 5s wait → comeback → link → rickroll

- [ ] **Step 7: Commit**

```bash
git add apps/game/src/modules/game/index.ts apps/game/src/app.tsx
git commit -m "✨ Wire singularity sequence into App with CRT collapse animation"
```

---

### Task 5: Polish and edge cases

**Files:**
- Modify: `apps/game/src/modules/game/components/singularity-sequence.tsx`
- Modify: `apps/game/src/app.tsx`

- [ ] **Step 1: Test rehydration behavior**

1. Trigger singularity via god mode
2. Refresh the page
3. Verify: no animation plays, CLI is shown immediately with all text visible and the rickroll link

- [ ] **Step 2: Verify the game loop is stopped**

After singularity triggers:
1. Check that resources don't accumulate
2. Check that the game store has `running: false`
3. Check that `singularity: true` persists across refresh (derived from `ownedUpgrades`)

- [ ] **Step 3: Run full checks**

Run: `npm run typecheck && npm run check`
Expected: both PASS

Fix any biome lint issues (tab indentation, import ordering).

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "✨ Complete singularity end-game sequence"
```
