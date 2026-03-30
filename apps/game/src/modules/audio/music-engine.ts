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

const stems: Map<StemName, StemPlayer> = new Map();
let started = false;
let currentTier = 0;

export async function initMusic() {
	await Tone.start();

	const basePath = `${window.location.origin}/audio/stems`;

	// Load each stem individually — skip any that 404 or fail
	await Promise.all(
		STEM_NAMES.map(
			(name) =>
				new Promise<void>((resolve) => {
					const player = new Tone.Player({
						url: `${basePath}/${name}.ogg`,
						loop: true,
						autostart: false,
						onerror: () => resolve(), // silently skip missing stems
						onload: () => {
							const gain = new Tone.Gain(0);
							player.connect(gain);
							gain.toDestination();
							stems.set(name, { player, gain });
							resolve();
						},
					});
				}),
		),
	);
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
