#!/usr/bin/env python3
"""Generate 6 minimal lo-fi music stems for Flopsed.

All stems: 80 BPM, C minor, 8 bars (24 seconds), loopable.
Output: apps/game/public/audio/stems/{bass,keys,drums,pad,lead,glitch}.ogg
"""

import os
import subprocess
import tempfile

import numpy as np
from scipy.io import wavfile

SAMPLE_RATE = 44100
BPM = 80
BEAT = 60 / BPM  # 0.75s per beat
BAR = BEAT * 4  # 3s per bar
DURATION = BAR * 8  # 24s = 8 bars
N_SAMPLES = int(DURATION * SAMPLE_RATE)

OUT_DIR = os.path.join(
    os.path.dirname(__file__), "..", "apps", "game", "public", "audio", "stems"
)


def t_array():
    return np.linspace(0, DURATION, N_SAMPLES, endpoint=False)


def sine(freq, t, amp=1.0):
    return amp * np.sin(2 * np.pi * freq * t)


def saw(freq, t, amp=1.0):
    """Band-limited sawtooth approximation (6 harmonics)."""
    out = np.zeros_like(t)
    for k in range(1, 7):
        out += ((-1) ** (k + 1)) * np.sin(2 * np.pi * k * freq * t) / k
    return amp * out * (2 / np.pi)


def square(freq, t, amp=1.0):
    return amp * np.sign(np.sin(2 * np.pi * freq * t))


def noise(n, amp=0.1):
    return amp * np.random.default_rng(42).normal(0, 1, n)


def env_ad(t_local, attack=0.01, decay=0.3):
    """Simple attack-decay envelope."""
    env = np.ones_like(t_local)
    a_mask = t_local < attack
    env[a_mask] = t_local[a_mask] / attack
    d_mask = t_local >= attack
    env[d_mask] = np.exp(-((t_local[d_mask] - attack) / decay))
    return env


def lowpass(signal, cutoff_hz, sr=SAMPLE_RATE):
    """Simple one-pole low-pass filter."""
    rc = 1.0 / (2 * np.pi * cutoff_hz)
    dt = 1.0 / sr
    alpha = dt / (rc + dt)
    out = np.zeros_like(signal)
    out[0] = signal[0]
    for i in range(1, len(signal)):
        out[i] = out[i - 1] + alpha * (signal[i] - out[i - 1])
    return out


def note_freq(name):
    """Get frequency for a note name like C3, Eb4, G2, etc."""
    notes = {
        "C": 0, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5,
        "Gb": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11,
    }
    if name[-1].isdigit():
        octave = int(name[-1])
        note = name[:-1]
    else:
        raise ValueError(f"Invalid note: {name}")
    semitone = notes[note] + (octave - 4) * 12
    return 440.0 * (2 ** ((semitone - 9) / 12))


# ── C minor scale notes ──
# C Eb F G Bb
# Bass pattern: C2 root movement
# Chord: Cm = C Eb G, Fm = F Ab C, Gm = G Bb D, Bb = Bb D F

def generate_bass():
    """Mellow sub bass following root notes. 8 bars of C minor progression."""
    t = t_array()
    out = np.zeros(N_SAMPLES)

    # Pattern: |Cm  |Cm  |Fm  |Fm  |Gm  |Gm  |Bb  |Cm  | (each bar = 4 beats)
    root_notes = ["C2", "C2", "F2", "F2", "G2", "G2", "Bb1", "C2"]

    for bar_i, root in enumerate(root_notes):
        freq = note_freq(root)
        bar_start = int(bar_i * BAR * SAMPLE_RATE)
        bar_end = int((bar_i + 1) * BAR * SAMPLE_RATE)

        # Play on beats 1 and 3
        for beat_offset in [0, 2]:
            note_start = bar_start + int(beat_offset * BEAT * SAMPLE_RATE)
            note_dur = int(BEAT * 1.8 * SAMPLE_RATE)  # sustain ~1.5 beats
            note_end = min(note_start + note_dur, N_SAMPLES)
            n = note_end - note_start
            t_local = np.linspace(0, n / SAMPLE_RATE, n, endpoint=False)

            note_sig = sine(freq, t_local, 0.4) + sine(freq * 2, t_local, 0.15)
            note_sig *= env_ad(t_local, attack=0.02, decay=0.8)
            out[note_start:note_end] += note_sig

    # Gentle low-pass to soften
    out = lowpass(out, 200)
    return out * 0.7


def generate_keys():
    """Lo-fi electric piano chords. Simple triads with soft attack."""
    t = t_array()
    out = np.zeros(N_SAMPLES)

    # Cm, Cm, Fm, Fm, Gm, Gm, Bb, Cm
    chords = [
        ["C4", "Eb4", "G4"],
        ["C4", "Eb4", "G4"],
        ["F3", "Ab3", "C4"],
        ["F3", "Ab3", "C4"],
        ["G3", "Bb3", "D4"],
        ["G3", "Bb3", "D4"],
        ["Bb3", "D4", "F4"],
        ["C4", "Eb4", "G4"],
    ]

    for bar_i, chord in enumerate(chords):
        bar_start = int(bar_i * BAR * SAMPLE_RATE)

        # Strum on beat 1 and ghost on beat 2.5
        for beat_offset, vel in [(0, 0.25), (2.5, 0.12)]:
            note_start = bar_start + int(beat_offset * BEAT * SAMPLE_RATE)
            note_dur = int(BEAT * 2.0 * SAMPLE_RATE)
            note_end = min(note_start + note_dur, N_SAMPLES)
            n = note_end - note_start
            t_local = np.linspace(0, n / SAMPLE_RATE, n, endpoint=False)

            chord_sig = np.zeros(n)
            for i, note_name in enumerate(chord):
                freq = note_freq(note_name)
                # Slightly detuned for lo-fi warmth
                detune = 1.0 + (i - 1) * 0.002
                chord_sig += sine(freq * detune, t_local, vel / len(chord))
                chord_sig += sine(freq * 2 * detune, t_local, vel * 0.3 / len(chord))

            chord_sig *= env_ad(t_local, attack=0.03, decay=1.2)
            out[note_start:note_end] += chord_sig

    return out * 0.6


def generate_drums():
    """Minimal drum loop: kick + hi-hat + snare."""
    out = np.zeros(N_SAMPLES)
    rng = np.random.default_rng(123)

    for bar_i in range(8):
        bar_start = int(bar_i * BAR * SAMPLE_RATE)

        for beat in range(4):
            beat_start = bar_start + int(beat * BEAT * SAMPLE_RATE)

            # Kick on 1 and 3
            if beat in (0, 2):
                n = int(0.15 * SAMPLE_RATE)
                t_local = np.linspace(0, 0.15, n, endpoint=False)
                # Pitch-dropping sine (160Hz -> 40Hz)
                freq_sweep = 160 * np.exp(-t_local * 20) + 40
                phase = np.cumsum(freq_sweep / SAMPLE_RATE) * 2 * np.pi
                kick = np.sin(phase) * 0.5 * np.exp(-t_local * 15)
                end = min(beat_start + n, N_SAMPLES)
                out[beat_start : end] += kick[: end - beat_start]

            # Snare on 2 and 4
            if beat in (1, 3):
                n = int(0.12 * SAMPLE_RATE)
                t_local = np.linspace(0, 0.12, n, endpoint=False)
                snare_body = sine(200, t_local, 0.2) * np.exp(-t_local * 25)
                snare_noise = rng.normal(0, 0.15, n) * np.exp(-t_local * 20)
                snare = snare_body + snare_noise
                end = min(beat_start + n, N_SAMPLES)
                out[beat_start : end] += snare[: end - beat_start]

            # Hi-hat on every 8th note
            for eighth in range(2):
                hh_start = beat_start + int(eighth * BEAT * 0.5 * SAMPLE_RATE)
                n = int(0.05 * SAMPLE_RATE)
                t_local = np.linspace(0, 0.05, n, endpoint=False)
                vel = 0.06 if eighth == 0 else 0.03  # accent on downbeat
                hh = rng.normal(0, vel, n) * np.exp(-t_local * 40)
                end = min(hh_start + n, N_SAMPLES)
                out[hh_start : end] += hh[: end - hh_start]

    return out * 0.8


def generate_pad():
    """Warm sustained pad. Filtered saw waves with slow attack."""
    t = t_array()
    out = np.zeros(N_SAMPLES)

    # Sustained chords, one per 2 bars
    pad_chords = [
        ["C3", "Eb3", "G3", "Bb3"],  # Cm7 (bars 1-2)
        ["F3", "Ab3", "C4", "Eb4"],  # Fm7 (bars 3-4)
        ["G3", "Bb3", "D4", "F4"],  # Gm7 (bars 5-6)
        ["Bb2", "D3", "F3", "Ab3"],  # Bb7 (bars 7-8)
    ]

    for chord_i, chord in enumerate(pad_chords):
        start = int(chord_i * 2 * BAR * SAMPLE_RATE)
        dur = int(2 * BAR * SAMPLE_RATE)
        end = min(start + dur, N_SAMPLES)
        n = end - start
        t_local = np.linspace(0, n / SAMPLE_RATE, n, endpoint=False)

        chord_sig = np.zeros(n)
        for note_name in chord:
            freq = note_freq(note_name)
            # Detuned saw for warmth
            chord_sig += saw(freq * 0.998, t_local, 0.08)
            chord_sig += saw(freq * 1.002, t_local, 0.08)

        # Slow attack, slow release
        env = np.ones(n)
        attack_n = int(0.8 * SAMPLE_RATE)
        release_n = int(1.0 * SAMPLE_RATE)
        if attack_n < n:
            env[:attack_n] = np.linspace(0, 1, attack_n)
        if release_n < n:
            env[-release_n:] = np.linspace(1, 0, release_n)

        chord_sig *= env
        out[start:end] += chord_sig

    # Heavy low-pass for warmth
    out = lowpass(out, 800)
    return out * 0.5


def generate_lead():
    """Simple melodic lead. Pentatonic melody over the progression."""
    t = t_array()
    out = np.zeros(N_SAMPLES)

    # C minor pentatonic melody (C Eb F G Bb), one note per beat roughly
    melody_bars = [
        # bar 1-2: ascending
        ["G4", "Eb4", "C4", "Eb4", "F4", "G4", "Bb4", "G4"],
        # bar 3-4: descending
        ["C5", "Bb4", "G4", "F4", "Eb4", "C4", "Eb4", "F4"],
        # bar 5-6: call
        ["G4", "Bb4", "C5", "Bb4", "G4", "F4", "Eb4", "G4"],
        # bar 7-8: resolve
        ["F4", "Eb4", "C4", "Eb4", "G4", "Eb4", "C4", "C4"],
    ]

    for phrase_i, phrase in enumerate(melody_bars):
        for note_i, note_name in enumerate(phrase):
            beat_abs = phrase_i * 8 + note_i
            note_start = int(beat_abs * BEAT * SAMPLE_RATE)
            note_dur = int(BEAT * 0.7 * SAMPLE_RATE)
            note_end = min(note_start + note_dur, N_SAMPLES)
            n = note_end - note_start
            if n <= 0:
                continue
            t_local = np.linspace(0, n / SAMPLE_RATE, n, endpoint=False)

            freq = note_freq(note_name)
            # Triangle-ish tone with slight vibrato
            vibrato = 1 + 0.003 * np.sin(2 * np.pi * 5 * t_local)
            note_sig = sine(freq * vibrato, t_local, 0.2)
            note_sig += sine(freq * 2, t_local, 0.05)  # gentle overtone
            note_sig *= env_ad(t_local, attack=0.02, decay=0.4)
            out[note_start:note_end] += note_sig

    return out * 0.45


def generate_glitch():
    """Digital glitch texture. Random bleeps, bitcrushed noise, stutters."""
    out = np.zeros(N_SAMPLES)
    rng = np.random.default_rng(77)

    for bar_i in range(8):
        bar_start = int(bar_i * BAR * SAMPLE_RATE)

        # 2-4 random glitch events per bar
        n_events = rng.integers(2, 5)
        for _ in range(n_events):
            offset = rng.uniform(0, BAR)
            event_start = bar_start + int(offset * SAMPLE_RATE)
            event_dur = rng.uniform(0.02, 0.15)
            n = int(event_dur * SAMPLE_RATE)
            if event_start + n > N_SAMPLES:
                continue
            t_local = np.linspace(0, event_dur, n, endpoint=False)

            event_type = rng.integers(0, 3)
            if event_type == 0:
                # Random frequency bleep
                freq = rng.uniform(400, 2000)
                sig = square(freq, t_local, 0.08)
            elif event_type == 1:
                # Bitcrushed noise burst
                sig = rng.normal(0, 0.1, n)
                # Bitcrush: quantize to fewer levels
                levels = 8
                sig = np.round(sig * levels) / levels
            else:
                # Pitch-sliding bleep
                freq_start = rng.uniform(200, 800)
                freq_end = rng.uniform(800, 3000)
                freqs = np.linspace(freq_start, freq_end, n)
                phase = np.cumsum(freqs / SAMPLE_RATE) * 2 * np.pi
                sig = np.sin(phase) * 0.08

            sig *= env_ad(t_local, attack=0.005, decay=event_dur * 0.8)
            out[event_start : event_start + n] += sig

    return out * 0.3


def normalize(audio, peak=0.8):
    mx = np.max(np.abs(audio))
    if mx > 0:
        audio = audio * (peak / mx)
    return audio


def save_ogg(name, audio):
    """Save as WAV, convert to OGG via ffmpeg."""
    audio = normalize(audio)
    audio_16 = (audio * 32767).astype(np.int16)

    os.makedirs(OUT_DIR, exist_ok=True)
    ogg_path = os.path.join(OUT_DIR, f"{name}.ogg")

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav_path = tmp.name
        wavfile.write(wav_path, SAMPLE_RATE, audio_16)

    subprocess.run(
        ["ffmpeg", "-y", "-i", wav_path, "-c:a", "libvorbis", "-q:a", "4", ogg_path],
        capture_output=True,
    )
    os.unlink(wav_path)
    size_kb = os.path.getsize(ogg_path) / 1024
    print(f"  {name}.ogg — {size_kb:.0f} KB")


def main():
    print("Generating 6 stems at 80 BPM, C minor, 8 bars (24s)...\n")

    stems = {
        "bass": generate_bass,
        "keys": generate_keys,
        "drums": generate_drums,
        "pad": generate_pad,
        "lead": generate_lead,
        "glitch": generate_glitch,
    }

    for name, gen_fn in stems.items():
        audio = gen_fn()
        save_ogg(name, audio)

    print(f"\nDone! Stems saved to {os.path.abspath(OUT_DIR)}")


if __name__ == "__main__":
    main()
