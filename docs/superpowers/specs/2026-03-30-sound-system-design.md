# Sound System Design

## Overview

Add music and sound effects to Flopsed. Music evolves with tier progression (Balatro-style stem layering). SFX provide feedback for player actions. Currently the game has zero audio.

## Music: Stem Layering

One master loop (8-16 bars, ~80 BPM, lo-fi jazzy chiptune) with 6 stems that fade in/out as the player progresses through tiers.

### Stem Progression

| Tier | Stems Active | Character |
|------|-------------|-----------|
| T0 Garage | Bass + simple keys | Sparse, lo-fi, intimate |
| T1 Freelancing | + light drums | Rhythm kicks in, momentum |
| T2 Startup | + synth pad + busier rhythm | Fuller, growing |
| T3 Tech Company | + lead melody + full drums | Confident, driving |
| T4 AI Lab | + glitchy/electronic texture | Digital, complex |
| T5 AGI Race | Everything maxed + urgency layer | Intense, climactic |
| Singularity | Distort → silence → terminal sounds | Breakdown |

### Transition Behavior

- Stems fade in over ~2 seconds on tier change (gain ramp)
- Stems stay perfectly synced (same loop length, same BPM)
- Optional: subtle filter sweep on tier transition (low-pass opens up)
- Singularity: apply distortion + bit-crusher effect, fade to silence over 3s

## SFX

### Synthesized (Web Audio — frequent events)

| Event | Sound | Notes |
|-------|-------|-------|
| Keystroke | Short noise burst + bandpass filter, 20-40ms | 3-4 pitch variants, random selection. Attenuate when typing rate > 8/s |
| LoC executed | Subtle digital tick, 15-25ms | Pitch correlates with FLOPS rate. Throttle to max 4/s |
| FLOPS slider | Soft servo/dial sweep | Pitch follows slider position |

### Sampled (one-shot events)

| Event | Sound | Source |
|-------|-------|--------|
| Purchase | Ka-ching / chip-tune confirm, ~200ms | Freesound or custom |
| Tier unlock | Rising arpeggio + whoosh, ~1.5s | Custom (important moment) |
| Milestone | Notification chime, ~300ms | Freesound |
| Event toast | Alert ping, ~150ms | Synthesized or Freesound |
| Singularity terminal | CRT buzz, digital corruption | Custom synthesis |

### Rate-Adaptive Volume

Typing and execution sounds fire constantly. The SFX engine applies dynamic gain:
- Below 4 events/s: full volume
- 4-10 events/s: linear ramp down to 40% volume
- Above 10 events/s: cap at 40%, skip some triggers (every other)

This turns rapid events into a pleasant texture rather than noise.

## Technical Architecture

### Tone.js for Music

- Manages synchronized stem playback via `Tone.Players` + `Tone.Transport`
- Each stem is a `Tone.Player` routed through its own `Tone.Gain` node
- Tier changes adjust gain nodes with `rampTo()` for smooth fades
- Effects chain: optional `Tone.Filter` (LP sweep), `Tone.Distortion` (singularity)
- ~45KB gzipped

### Raw Web Audio API for SFX

- Zero-latency synthesis for typing/execution sounds
- Single shared `AudioContext` (created on first user gesture)
- Fire-and-forget: create OscillatorNode/BufferSource, connect to gain envelope, schedule stop
- Sample cache: load one-shot WAV/OGG files into AudioBuffers on init

### Package Structure

```
apps/game/src/modules/audio/
├── music-engine.ts       # Tone.js stem player, tier transitions
├── sfx-engine.ts         # Web Audio synthesis + sample playback
├── audio-manager.ts      # Facade: init(), setTier(), playSfx(), volume control
├── audio-store.ts        # Zustand store: musicVol, sfxVol, muted
├── use-audio.ts          # React hook: connects store to engines
├── sounds/
│   ├── synth-defs.ts     # Oscillator configs for synthesized SFX
│   └── samples.ts        # Sample file paths and loader
└── index.ts              # Public API
```

### AudioContext Initialization

Browser autoplay policy requires user gesture before creating AudioContext. Strategy:
- On first keypress or click, call `audioManager.init()`
- Show a subtle "click to enable sound" indicator if user hasn't interacted yet
- Tone.js handles this via `Tone.start()` which must be called in a click/keydown handler

## Asset Pipeline

### Music Stems

1. **Primary path**: AI-generate stems individually (Suno/Udio) at same BPM/key (80 BPM, C minor or similar)
2. Test layering in Audacity — verify stems are cohesive
3. **Fallback**: commission a musician if AI quality isn't there
4. Format: OGG Vorbis (primary), MP3 fallback. ~30-60 second loops.
5. Estimated bundle: ~300-500KB for 6 stems

### SFX Samples

- Source from Freesound.org (CC0 licensed)
- Trim and normalize in Audacity
- Format: OGG Vorbis, short clips (<1s each)
- Estimated: ~50-100KB total

## Player Controls

- **Mute button** in header/resource bar (speaker icon toggle)
- **Settings section** with:
  - Music volume slider (0-100, default 50)
  - SFX volume slider (0-100, default 70)
- Persisted in `localStorage` (separate from game save — audio prefs are player prefs, not game state)

## Integration Points

| Game Event | Where to Hook | Audio Call |
|------------|--------------|-----------|
| First user interaction | App mount / first keydown | `audioManager.init()` |
| Player keystroke | Editor module keydown | `sfx.typing()` |
| LoC executed (tick) | Game store tick | `sfx.execute()` (throttled) |
| Upgrade purchased | Upgrade module buy | `sfx.purchase()` |
| Tech node researched | Game store research | `sfx.purchase()` |
| Tier unlocked | Game store tier change | `music.setTier(n)` + `sfx.tierUnlock()` |
| Milestone reached | Upgrade module milestone | `sfx.milestone()` |
| Event triggered | Event store | `sfx.event()` |
| FLOPS slider moved | Slider component onChange | Optional: `music.setFilterFromSlider(val)` |
| Singularity start | Singularity sequence | `music.singularityBreakdown()` |

## Dependencies

- `tone` (npm): ~45KB gzipped — music stem sync and transport
- No other audio dependencies. SFX use native Web Audio API.
