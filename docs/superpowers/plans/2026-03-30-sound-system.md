# Sound System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Balatro-style evolving music and SFX to Flopsed — stems layer in per tier, typing/purchase/execution sounds provide feedback.

**Architecture:** New `audio` module inside `apps/game/src/modules/` with a Zustand store for preferences, a `MusicEngine` class wrapping Tone.js for stem playback, and an `SfxEngine` class using raw Web Audio for low-latency synthesis. An `AudioManager` facade ties them together and provides the public API. Game code calls the manager via direct imports — no store coupling for fire-and-forget sounds.

**Tech Stack:** Tone.js (music stems), Web Audio API (SFX synthesis), Zustand (audio preferences), Emotion (mute button styling)

**Spec:** `docs/superpowers/specs/2026-03-30-sound-system-design.md`

---

## File Map

```
apps/game/src/modules/audio/
├── audio-store.ts          # Zustand store: musicVol, sfxVol, muted — persisted to localStorage
├── sfx-engine.ts           # Web Audio synthesis: typing, execute, purchase, tier-unlock, milestone, event
├── music-engine.ts         # Tone.js: load stems, loop, fade per tier, singularity breakdown
├── audio-manager.ts        # Facade: init (user gesture gate), delegates to engines, reads store
├── use-audio-events.ts     # React hook: subscribes to game store changes, fires tier/milestone sounds
└── index.ts                # Public API
```

**Modified files:**
- `apps/game/package.json` — add `tone` dependency
- `apps/game/src/modules/editor/components/editor.tsx:182` — add `sfx.typing()` in onKeystroke
- `apps/game/src/modules/game/store/game-store.ts:637,683` — add `sfx.purchase()` after buyUpgrade/researchNode
- `apps/game/src/modules/event/store/event-store.ts:283` — add `sfx.event()` after event logged
- `apps/game/src/components/status-bar.tsx:67-71` — add mute toggle button
- `apps/game/src/app.tsx` — mount `useAudioEvents()` hook and call `audioManager.init()` on first interaction
- `apps/game/src/modules/game/components/singularity-sequence.tsx` — add singularity audio phases

---

### Task 1: Install Tone.js and scaffold audio module

**Files:**
- Modify: `apps/game/package.json`
- Create: `apps/game/src/modules/audio/audio-store.ts`
- Create: `apps/game/src/modules/audio/index.ts`

- [ ] **Step 1: Install tone**

```bash
cd /home/maxime/Documents/emergence/agi-rush && npm install tone -w @flopsed/game
```

- [ ] **Step 2: Create the audio store**

Create `apps/game/src/modules/audio/audio-store.ts`:

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AudioState {
	muted: boolean;
	musicVolume: number;
	sfxVolume: number;
}

interface AudioActions {
	toggleMute: () => void;
	setMusicVolume: (v: number) => void;
	setSfxVolume: (v: number) => void;
}

export const useAudioStore = create<AudioState & AudioActions>()(
	persist(
		(set) => ({
			muted: false,
			musicVolume: 50,
			sfxVolume: 70,

			toggleMute: () => set((s) => ({ muted: !s.muted })),
			setMusicVolume: (v: number) => set({ musicVolume: v }),
			setSfxVolume: (v: number) => set({ sfxVolume: v }),
		}),
		{ name: "flopsed-audio" },
	),
);
```

- [ ] **Step 3: Create the module index**

Create `apps/game/src/modules/audio/index.ts`:

```typescript
export { useAudioStore } from "./audio-store";
```

We'll expand exports as we build each engine.

- [ ] **Step 4: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS (no errors)

- [ ] **Step 5: Commit**

```bash
git add apps/game/package.json package-lock.json apps/game/src/modules/audio/
git commit -m "🎉 Scaffold audio module with Zustand store + install Tone.js"
```

---

### Task 2: SFX Engine — synthesized sounds

**Files:**
- Create: `apps/game/src/modules/audio/sfx-engine.ts`
- Modify: `apps/game/src/modules/audio/index.ts`

- [ ] **Step 1: Create SFX engine**

Create `apps/game/src/modules/audio/sfx-engine.ts`:

```typescript
let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
	if (!ctx) ctx = new AudioContext();
	return ctx;
}

/** Normalize 0-100 slider to 0-1 gain, applying a basic equal-power curve. */
function sliderToGain(volume: number, muted: boolean): number {
	if (muted) return 0;
	const normalized = Math.max(0, Math.min(100, volume)) / 100;
	return normalized * normalized; // simple perceptual curve
}

// ── Typing sound: short filtered noise burst, 20-40ms ──

const TYPING_VARIANTS = [800, 1000, 1200, 1400]; // bandpass center freqs
let typingIndex = 0;
let lastTypingTime = 0;

export function playTyping(volume: number, muted: boolean) {
	const now = performance.now();
	if (now - lastTypingTime < 40) return; // debounce at 25/s max
	lastTypingTime = now;

	const gain = sliderToGain(volume, muted);
	if (gain === 0) return;

	const ac = getCtx();
	const t = ac.currentTime;

	// White noise buffer (short)
	const bufferSize = Math.floor(ac.sampleRate * 0.03); // 30ms
	const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

	const src = ac.createBufferSource();
	src.buffer = buffer;

	const bp = ac.createBiquadFilter();
	bp.type = "bandpass";
	bp.frequency.value = TYPING_VARIANTS[typingIndex % TYPING_VARIANTS.length];
	bp.Q.value = 2;
	typingIndex++;

	const g = ac.createGain();
	g.gain.setValueAtTime(gain * 0.15, t);
	g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

	src.connect(bp).connect(g).connect(ac.destination);
	src.start(t);
	src.stop(t + 0.03);
}

// ── Execute sound: subtle digital tick ──

let lastExecTime = 0;

export function playExecute(volume: number, muted: boolean) {
	const now = performance.now();
	if (now - lastExecTime < 250) return; // max 4/s
	lastExecTime = now;

	const gain = sliderToGain(volume, muted);
	if (gain === 0) return;

	const ac = getCtx();
	const t = ac.currentTime;

	const osc = ac.createOscillator();
	osc.type = "sine";
	osc.frequency.value = 1200 + Math.random() * 400;

	const g = ac.createGain();
	g.gain.setValueAtTime(gain * 0.08, t);
	g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

	osc.connect(g).connect(ac.destination);
	osc.start(t);
	osc.stop(t + 0.04);
}

// ── Purchase sound: two-tone chip confirm ──

export function playPurchase(volume: number, muted: boolean) {
	const gain = sliderToGain(volume, muted);
	if (gain === 0) return;

	const ac = getCtx();
	const t = ac.currentTime;

	// Two quick ascending tones
	for (const [freq, offset] of [
		[880, 0],
		[1320, 0.08],
	] as const) {
		const osc = ac.createOscillator();
		osc.type = "square";
		osc.frequency.value = freq;

		const g = ac.createGain();
		g.gain.setValueAtTime(0, t + offset);
		g.gain.linearRampToValueAtTime(gain * 0.12, t + offset + 0.01);
		g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.12);

		osc.connect(g).connect(ac.destination);
		osc.start(t + offset);
		osc.stop(t + offset + 0.12);
	}
}

// ── Tier unlock: rising arpeggio ──

export function playTierUnlock(volume: number, muted: boolean) {
	const gain = sliderToGain(volume, muted);
	if (gain === 0) return;

	const ac = getCtx();
	const t = ac.currentTime;

	const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
	notes.forEach((freq, i) => {
		const offset = i * 0.1;

		const osc = ac.createOscillator();
		osc.type = "triangle";
		osc.frequency.value = freq;

		const g = ac.createGain();
		g.gain.setValueAtTime(0, t + offset);
		g.gain.linearRampToValueAtTime(gain * 0.18, t + offset + 0.02);
		g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.4);

		osc.connect(g).connect(ac.destination);
		osc.start(t + offset);
		osc.stop(t + offset + 0.4);
	});
}

// ── Milestone: notification chime ──

export function playMilestone(volume: number, muted: boolean) {
	const gain = sliderToGain(volume, muted);
	if (gain === 0) return;

	const ac = getCtx();
	const t = ac.currentTime;

	for (const [freq, offset] of [
		[1046.5, 0],
		[1318.5, 0.12],
	] as const) {
		const osc = ac.createOscillator();
		osc.type = "sine";
		osc.frequency.value = freq;

		const g = ac.createGain();
		g.gain.setValueAtTime(gain * 0.15, t + offset);
		g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.3);

		osc.connect(g).connect(ac.destination);
		osc.start(t + offset);
		osc.stop(t + offset + 0.3);
	}
}

// ── Event toast: alert ping ──

export function playEvent(volume: number, muted: boolean) {
	const gain = sliderToGain(volume, muted);
	if (gain === 0) return;

	const ac = getCtx();
	const t = ac.currentTime;

	const osc = ac.createOscillator();
	osc.type = "sine";
	osc.frequency.value = 660;

	const g = ac.createGain();
	g.gain.setValueAtTime(gain * 0.12, t);
	g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

	osc.connect(g).connect(ac.destination);
	osc.start(t);
	osc.stop(t + 0.2);
}

// ── Resume AudioContext after user gesture ──

export function resumeCtx() {
	if (ctx?.state === "suspended") ctx.resume();
}
```

- [ ] **Step 2: Export from index**

Update `apps/game/src/modules/audio/index.ts`:

```typescript
export { useAudioStore } from "./audio-store";
export {
	playTyping,
	playExecute,
	playPurchase,
	playTierUnlock,
	playMilestone,
	playEvent,
	resumeCtx,
} from "./sfx-engine";
```

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/game/src/modules/audio/
git commit -m "✨ Add SFX engine: synthesized typing, execute, purchase, tier, milestone, event sounds"
```

---

### Task 3: Music Engine — Tone.js stem player

**Files:**
- Create: `apps/game/src/modules/audio/music-engine.ts`
- Modify: `apps/game/src/modules/audio/index.ts`

- [ ] **Step 1: Create music engine**

Create `apps/game/src/modules/audio/music-engine.ts`:

```typescript
import * as Tone from "tone";

/**
 * Stem-based music engine. Each tier fades in additional stems.
 *
 * Stems are loaded from `/audio/stems/` as OGG files.
 * Expected files: bass.ogg, keys.ogg, drums.ogg, pad.ogg, lead.ogg, glitch.ogg
 *
 * Until real stems are provided, the engine is a no-op (no files = no crash).
 */

const STEM_NAMES = ["bass", "keys", "drums", "pad", "lead", "glitch"] as const;
type StemName = (typeof STEM_NAMES)[number];

/** Which stems are active at each tier index (0-5). Cumulative. */
const TIER_STEMS: Record<number, StemName[]> = {
	0: ["bass", "keys"],
	1: ["bass", "keys", "drums"],
	2: ["bass", "keys", "drums", "pad"],
	3: ["bass", "keys", "drums", "pad", "lead"],
	4: ["bass", "keys", "drums", "pad", "lead", "glitch"],
	5: ["bass", "keys", "drums", "pad", "lead", "glitch"],
};

const FADE_DURATION = 2; // seconds

interface StemPlayer {
	player: Tone.Player;
	gain: Tone.Gain;
}

let stems: Map<StemName, StemPlayer> = new Map();
let started = false;
let currentTier = 0;

export async function initMusic() {
	await Tone.start();

	const basePath = `${window.location.origin}/audio/stems`;

	for (const name of STEM_NAMES) {
		try {
			const player = new Tone.Player({
				url: `${basePath}/${name}.ogg`,
				loop: true,
				autostart: false,
			});
			const gain = new Tone.Gain(0); // all stems start silent
			player.connect(gain);
			gain.toDestination();
			stems.set(name, { player, gain });
		} catch {
			// Stem file not found — skip silently. Engine works with partial stems.
			console.warn(`[music] stem not found: ${name}.ogg — skipping`);
		}
	}

	// Wait for all buffers to load
	await Tone.loaded();
}

export function startMusic(tierIndex: number) {
	if (started) return;
	started = true;
	currentTier = tierIndex;

	// Start all players (silent), then fade in active ones
	for (const [, stem] of stems) {
		stem.player.start();
	}

	applyTier(tierIndex, 0.5); // quick initial fade
}

export function setTier(tierIndex: number) {
	if (tierIndex === currentTier) return;
	currentTier = tierIndex;
	applyTier(tierIndex, FADE_DURATION);
}

function applyTier(tierIndex: number, fadeSec: number) {
	const active = new Set(TIER_STEMS[tierIndex] ?? TIER_STEMS[5]);

	for (const [name, stem] of stems) {
		const target = active.has(name) ? 1 : 0;
		stem.gain.gain.rampTo(target, fadeSec);
	}
}

export function setMusicVolume(volume: number, muted: boolean) {
	const val = muted ? -Infinity : -40 + (volume / 100) * 40; // -40dB to 0dB
	Tone.getDestination().volume.rampTo(val, 0.1);
}

/** Singularity: distort audio then fade to silence over 3 seconds. */
export function singularityBreakdown() {
	for (const [, stem] of stems) {
		stem.gain.gain.rampTo(0, 3);
	}
	setTimeout(() => stopMusic(), 3500);
}

export function stopMusic() {
	for (const [, stem] of stems) {
		stem.player.stop();
	}
	started = false;
}

export function isStarted() {
	return started;
}
```

- [ ] **Step 2: Create the public audio stems directory**

```bash
mkdir -p /home/maxime/Documents/emergence/agi-rush/apps/game/public/audio/stems
```

Create a placeholder README so the directory is tracked:

Create `apps/game/public/audio/stems/README.md`:

```
Place OGG stem files here: bass.ogg, keys.ogg, drums.ogg, pad.ogg, lead.ogg, glitch.ogg
All stems must be the same BPM, key, and loop length.
```

- [ ] **Step 3: Export from index**

Update `apps/game/src/modules/audio/index.ts` — add music exports:

```typescript
export { useAudioStore } from "./audio-store";
export {
	playTyping,
	playExecute,
	playPurchase,
	playTierUnlock,
	playMilestone,
	playEvent,
	resumeCtx,
} from "./sfx-engine";
export {
	initMusic,
	startMusic,
	setTier,
	setMusicVolume,
	singularityBreakdown,
	stopMusic,
	isStarted as isMusicStarted,
} from "./music-engine";
```

- [ ] **Step 4: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/game/src/modules/audio/ apps/game/public/audio/
git commit -m "✨ Add music engine: Tone.js stem player with tier-based layering"
```

---

### Task 4: Audio Manager facade

**Files:**
- Create: `apps/game/src/modules/audio/audio-manager.ts`
- Modify: `apps/game/src/modules/audio/index.ts`

- [ ] **Step 1: Create audio manager**

Create `apps/game/src/modules/audio/audio-manager.ts`:

```typescript
import { useAudioStore } from "./audio-store";
import {
	initMusic,
	isStarted,
	setMusicVolume,
	setTier,
	singularityBreakdown,
	startMusic,
	stopMusic,
} from "./music-engine";
import {
	playEvent,
	playExecute,
	playMilestone,
	playPurchase,
	playTierUnlock,
	playTyping,
	resumeCtx,
} from "./sfx-engine";

let initialized = false;

function sfxVol(): [number, boolean] {
	const s = useAudioStore.getState();
	return [s.sfxVolume, s.muted];
}

/** Call on first user gesture (keydown / click). Safe to call multiple times. */
export async function init(tierIndex: number) {
	resumeCtx();
	if (initialized) return;
	initialized = true;

	await initMusic();

	// Apply current volume
	const { musicVolume, muted } = useAudioStore.getState();
	setMusicVolume(musicVolume, muted);

	startMusic(tierIndex);
}

// ── SFX wrappers (read store inline, fire-and-forget) ──

export const sfx = {
	typing: () => playTyping(...sfxVol()),
	execute: () => playExecute(...sfxVol()),
	purchase: () => playPurchase(...sfxVol()),
	tierUnlock: () => playTierUnlock(...sfxVol()),
	milestone: () => playMilestone(...sfxVol()),
	event: () => playEvent(...sfxVol()),
} as const;

// ── Music wrappers ──

export const music = {
	setTier: (tierIndex: number) => {
		if (!isStarted()) return;
		setTier(tierIndex);
	},
	singularity: () => {
		if (!isStarted()) return;
		singularityBreakdown();
	},
	stop: () => stopMusic(),
	syncVolume: () => {
		const { musicVolume, muted } = useAudioStore.getState();
		setMusicVolume(musicVolume, muted);
	},
} as const;
```

- [ ] **Step 2: Export from index**

Update `apps/game/src/modules/audio/index.ts`:

```typescript
export { useAudioStore } from "./audio-store";
export { init as initAudio, sfx, music } from "./audio-manager";
```

(Remove the granular exports — the manager is the public API now.)

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/game/src/modules/audio/
git commit -m "✨ Add audio manager facade: public API for SFX and music"
```

---

### Task 5: Hook SFX into game events

**Files:**
- Create: `apps/game/src/modules/audio/use-audio-events.ts`
- Modify: `apps/game/src/modules/editor/components/editor.tsx`
- Modify: `apps/game/src/modules/game/store/game-store.ts`
- Modify: `apps/game/src/modules/event/store/event-store.ts`
- Modify: `apps/game/src/app.tsx`
- Modify: `apps/game/src/modules/audio/index.ts`

- [ ] **Step 1: Create the audio events hook**

This hook subscribes to game store changes and fires tier/milestone/execute sounds reactively.

Create `apps/game/src/modules/audio/use-audio-events.ts`:

```typescript
import { useEffect, useRef } from "react";
import { useGameStore } from "@modules/game";
import { initAudio, sfx, music } from "./audio-manager";

/**
 * Mount once in App. Handles:
 * - Init audio on first user interaction
 * - Tier change → music.setTier + sfx.tierUnlock
 * - Execution tick → sfx.execute (throttled in engine)
 */
export function useAudioEvents() {
	const tierIndex = useGameStore((s) => s.currentTierIndex);
	const prevTierRef = useRef(tierIndex);
	const initRef = useRef(false);

	// Init audio on first keydown or click
	useEffect(() => {
		const handler = () => {
			if (initRef.current) return;
			initRef.current = true;
			initAudio(useGameStore.getState().currentTierIndex);
			window.removeEventListener("keydown", handler);
			window.removeEventListener("click", handler);
		};
		window.addEventListener("keydown", handler);
		window.addEventListener("click", handler);
		return () => {
			window.removeEventListener("keydown", handler);
			window.removeEventListener("click", handler);
		};
	}, []);

	// Tier transitions
	useEffect(() => {
		if (tierIndex !== prevTierRef.current) {
			music.setTier(tierIndex);
			if (tierIndex > prevTierRef.current) {
				sfx.tierUnlock();
			}
			prevTierRef.current = tierIndex;
		}
	}, [tierIndex]);

	// Volume sync: subscribe to audio store changes
	useEffect(() => {
		const unsub = (
			await import("./audio-store")
		).useAudioStore.subscribe(() => {
			music.syncVolume();
		});
		return unsub;
	}, []);
}
```

Wait — the async import pattern is clunky. Let's do it synchronously since the store is already bundled:

```typescript
import { useEffect, useRef } from "react";
import { useGameStore } from "@modules/game";
import { useAudioStore } from "./audio-store";
import { initAudio, sfx, music } from "./audio-manager";

export function useAudioEvents() {
	const tierIndex = useGameStore((s) => s.currentTierIndex);
	const prevTierRef = useRef(tierIndex);
	const initRef = useRef(false);

	// Init audio on first keydown or click
	useEffect(() => {
		const handler = () => {
			if (initRef.current) return;
			initRef.current = true;
			initAudio(useGameStore.getState().currentTierIndex);
			window.removeEventListener("keydown", handler);
			window.removeEventListener("click", handler);
		};
		window.addEventListener("keydown", handler);
		window.addEventListener("click", handler);
		return () => {
			window.removeEventListener("keydown", handler);
			window.removeEventListener("click", handler);
		};
	}, []);

	// Tier transitions
	useEffect(() => {
		if (tierIndex !== prevTierRef.current) {
			music.setTier(tierIndex);
			if (tierIndex > prevTierRef.current) {
				sfx.tierUnlock();
			}
			prevTierRef.current = tierIndex;
		}
	}, [tierIndex]);

	// Volume sync
	useEffect(() => {
		return useAudioStore.subscribe(() => music.syncVolume());
	}, []);
}
```

- [ ] **Step 2: Add typing SFX to editor**

In `apps/game/src/modules/editor/components/editor.tsx`, add import and call:

Add import at top:
```typescript
import { sfx } from "@modules/audio";
```

Modify the `onKeystroke` callback (line 182-198) — add `sfx.typing()` as the first line:

```typescript
const onKeystroke = useCallback(() => {
	sfx.typing();
	advanceTokens(locPerKey);

	// Check for mash-key event interaction (only while game is running)
	if (running) {
		// ... existing code unchanged ...
	}
}, [advanceTokens, locPerKey, running]);
```

- [ ] **Step 3: Add purchase SFX to game store**

In `apps/game/src/modules/game/store/game-store.ts`:

Add import at top:
```typescript
import { sfx } from "@modules/audio";
```

In `buyUpgrade` (after line 637, after the `set()` call):
```typescript
buyUpgrade: (upgrade: Upgrade) => {
	const s = get();
	const owned = s.ownedUpgrades[upgrade.id] ?? 0;
	if (owned >= getEffectiveMax(upgrade, s)) return;
	const cost = getUpgradeCost(upgrade, owned, s);
	if (s.cash < cost) return;
	let cashBonus = 0;
	for (const effect of upgrade.effects) {
		if (effect.type === "instantCash" && effect.op === "add")
			cashBonus += effect.value as number;
	}
	set((s) => {
		const newState = {
			...s,
			cash: s.cash - cost + cashBonus,
			totalCash: s.totalCash + cashBonus,
			ownedUpgrades: {
				...s.ownedUpgrades,
				[upgrade.id]: (s.ownedUpgrades[upgrade.id] ?? 0) + 1,
			},
		};
		recalcDerivedStats(newState);
		return newState;
	});
	sfx.purchase();
},
```

In `researchNode` (after line 683, after the `set()` call):
```typescript
	// ... end of set() callback ...
	recalcDerivedStats(newState);
	return newState;
});
sfx.purchase();
```

- [ ] **Step 4: Add event SFX to event store**

In `apps/game/src/modules/event/store/event-store.ts`:

Add import at top:
```typescript
import { sfx } from "@modules/audio";
```

After line 282 (after `changed = true;` inside the `if (def !== null)` block), add:

```typescript
const newLog = [def.id, ...eventLog].slice(0, LOG_CAP);
eventLog = newLog;
changed = true;
sfx.event();
```

- [ ] **Step 5: Add milestone SFX to game store tick**

In `apps/game/src/modules/game/store/game-store.ts`, inside the milestone loop (after line 605, after `showMilestoneToast`):

```typescript
if (m?.cashBonus) {
	next.cash = (next.cash ?? cash) + m.cashBonus;
	next.totalCash = (next.totalCash ?? totalCash) + m.cashBonus;
	useEventStore
		.getState()
		.showMilestoneToast(m.name, m.description, m.cashBonus);
	sfx.milestone();
}
```

- [ ] **Step 6: Add execution SFX to game store tick**

In `apps/game/src/modules/game/store/game-store.ts`, after line 557 (inside `if (executed > 0)`):

```typescript
if (executed > 0) {
	const earnRate = tier.cashPerLoc * s.cashMultiplier;
	cash += executed * earnRate;
	totalCash += executed * earnRate;
	loc -= executed;
	totalExecutedLoc += executed;
	sfx.execute();
}
```

Note: The execute SFX engine already throttles to max 4/s internally.

- [ ] **Step 7: Mount useAudioEvents in App**

In `apps/game/src/app.tsx`, add import and call the hook inside the App component:

Add import:
```typescript
import { useAudioEvents } from "@modules/audio/use-audio-events";
```

Inside the `App` function body (near other hook calls, before any early returns):
```typescript
useAudioEvents();
```

- [ ] **Step 8: Update audio module index**

Update `apps/game/src/modules/audio/index.ts`:

```typescript
export { useAudioStore } from "./audio-store";
export { initAudio, sfx, music } from "./audio-manager";
export { useAudioEvents } from "./use-audio-events";
```

- [ ] **Step 9: Verify typecheck + check**

```bash
npm run typecheck && npm run check
```

Expected: PASS. Fix any biome lint issues with `npm run check:fix` if needed.

- [ ] **Step 10: Commit**

```bash
git add apps/game/src/modules/ apps/game/src/app.tsx
git commit -m "✨ Wire SFX into game: typing, execute, purchase, tier, milestone, event sounds"
```

---

### Task 6: Mute toggle in status bar

**Files:**
- Modify: `apps/game/src/components/status-bar.tsx`

- [ ] **Step 1: Add mute button**

In `apps/game/src/components/status-bar.tsx`:

Add import:
```typescript
import { useAudioStore } from "@modules/audio";
```

Add a mute button style after `statCss`:

```typescript
const muteBtnCss = css({
	background: "none",
	border: "none",
	color: "inherit",
	cursor: "pointer",
	padding: "0 2px",
	fontSize: 12,
	opacity: 0.7,
	"&:hover": { opacity: 1 },
});
```

Inside the `StatusBar` component, add store access:
```typescript
const muted = useAudioStore((s) => s.muted);
const toggleMute = useAudioStore((s) => s.toggleMute);
```

Add mute button in the `rightCss` div, before `<span>Python</span>`:

```tsx
<button css={muteBtnCss} onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
	{muted ? "🔇" : "🔊"}
</button>
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/status-bar.tsx
git commit -m "✨ Add mute toggle to status bar"
```

---

### Task 7: Volume sliders in Settings page

**Files:**
- Modify: `apps/game/src/app.tsx` (SettingsPage component, ~line 133-254)

The settings page at `apps/game/src/app.tsx` already uses a `SettingItem` component with category/name/description. Add two range sliders for Music and SFX volume, plus a mute checkbox.

- [ ] **Step 1: Add audio imports and state**

In `apps/game/src/app.tsx`, add import:
```typescript
import { useAudioStore } from "@modules/audio";
```

Inside `SettingsPage()`, add store selectors:
```typescript
const musicVolume = useAudioStore((s) => s.musicVolume);
const sfxVolume = useAudioStore((s) => s.sfxVolume);
const muted = useAudioStore((s) => s.muted);
const setMusicVolume = useAudioStore((s) => s.setMusicVolume);
const setSfxVolume = useAudioStore((s) => s.setSfxVolume);
const toggleMute = useAudioStore((s) => s.toggleMute);
```

- [ ] **Step 2: Add volume setting items**

After the Zoom Level `</SettingItem>` closing tag (around line 251), add:

```tsx
<SettingItem
	category="Audio"
	name="Music Volume"
	description="Controls the background music volume."
>
	<input
		type="range"
		min={0}
		max={100}
		value={musicVolume}
		onChange={(e) => setMusicVolume(Number(e.target.value))}
		css={{
			width: 260,
			accentColor: theme.accent,
			cursor: "pointer",
		}}
	/>
	<span css={{ marginLeft: 8, fontSize: 12, color: theme.textMuted }}>
		{musicVolume}%
	</span>
</SettingItem>

<SettingItem
	category="Audio"
	name="SFX Volume"
	description="Controls the sound effects volume (typing, purchases, events)."
>
	<input
		type="range"
		min={0}
		max={100}
		value={sfxVolume}
		onChange={(e) => setSfxVolume(Number(e.target.value))}
		css={{
			width: 260,
			accentColor: theme.accent,
			cursor: "pointer",
		}}
	/>
	<span css={{ marginLeft: 8, fontSize: 12, color: theme.textMuted }}>
		{sfxVolume}%
	</span>
</SettingItem>

<SettingItem
	category="Audio"
	name="Mute All"
	description="Mute all game audio (music and sound effects)."
>
	<label css={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
		<input
			type="checkbox"
			checked={muted}
			onChange={toggleMute}
			css={{ accentColor: theme.accent, cursor: "pointer" }}
		/>
		<span css={{ fontSize: 13 }}>{muted ? "Muted" : "Unmuted"}</span>
	</label>
</SettingItem>
```

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/game/src/app.tsx
git commit -m "✨ Add music/SFX volume sliders and mute toggle to settings page"
```

---

### Task 8: Singularity audio phases

**Files:**
- Modify: `apps/game/src/modules/game/components/singularity-sequence.tsx`

- [ ] **Step 1: Add singularity audio**

In `apps/game/src/modules/game/components/singularity-sequence.tsx`:

Add import:
```typescript
import { music } from "@modules/audio";
```

Find the `useEffect` that advances phases. Add `music.singularity()` when entering the `glitch` phase.

Look for the phase transition effect — it will be a `useEffect` depending on `phase`. Add the audio call when phase enters `glitch`:

Inside the main phase-advance effect, after the phase is set to `glitch` (or on mount if `animate` is true):

```typescript
// When singularity animation starts, trigger music breakdown
useEffect(() => {
	if (animate && phase === PhaseEnum.glitch) {
		music.singularity();
	}
}, [animate, phase]);
```

If there's already an effect that fires on mount with `animate`, add the `music.singularity()` call there instead. The key is: call it once when the glitch phase begins.

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/modules/game/components/singularity-sequence.tsx
git commit -m "✨ Add singularity audio breakdown: music distorts and fades on endgame"
```

---

### Task 9: Rspack config — resolve @modules/audio alias

**Files:**
- Modify: `apps/game/rspack.config.ts` (or equivalent)

- [ ] **Step 1: Check if @modules alias already covers new module**

The `@modules/` alias likely points to `src/modules/`, which means `@modules/audio` should work automatically. Verify:

```bash
grep -n "modules" /home/maxime/Documents/emergence/agi-rush/apps/game/rspack.config.ts
```

If `@modules` already resolves to `./src/modules`, no change is needed. If not, add it.

- [ ] **Step 2: Verify dev server runs**

```bash
cd /home/maxime/Documents/emergence/agi-rush && npm run dev
```

Open browser, verify no console errors. Test a keystroke — should hear typing click. Check status bar for mute button.

- [ ] **Step 3: Commit (if rspack config was modified)**

```bash
git add apps/game/rspack.config.ts
git commit -m "🔧 Add @modules/audio alias to rspack config"
```

---

### Task 10: Manual QA and tuning

This is not a code task — it's verification.

- [ ] **Step 1: Test all SFX**

| Action | Expected Sound |
|--------|---------------|
| Type on keyboard | Soft click, varies pitch, no machine-gun effect |
| LoC auto-executing | Subtle tick, max 4/s |
| Buy upgrade | Two-tone chip confirm |
| Research tech node | Same purchase sound |
| Tier unlocks | Rising C-E-G-C arpeggio |
| Milestone reached | Two-note chime |
| Event spawns | Alert ping |
| Mute button | Toggles all audio on/off |

- [ ] **Step 2: Test music (once stems are added)**

Place any OGG file as `apps/game/public/audio/stems/bass.ogg` and `keys.ogg` to verify loading and playback. Stems will be sourced separately (AI generation or musician).

- [ ] **Step 3: Tune volumes if needed**

Adjust gain multipliers in `sfx-engine.ts` if any sound is too loud/quiet relative to others. Key targets:
- Typing: very subtle (0.15 gain)
- Execute: barely audible (0.08 gain)
- Purchase: moderate (0.12 gain)
- Tier unlock: prominent (0.18 gain)

- [ ] **Step 4: Final commit if tuning needed**

```bash
git add -A && git commit -m "🔊 Tune SFX volumes"
```
