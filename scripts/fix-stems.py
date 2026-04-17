#!/usr/bin/env python3
"""
Convert OGG stems to WAV for perfect looping.

OGG codec adds padding on decode that causes audible seams at loop points.
WAV is uncompressed — the browser decodes it sample-perfect, no padding.
Larger files but seamless loops.

Usage: python3 scripts/fix-stems.py
"""

import os
import sys
import shutil
import numpy as np
import soundfile as sf

STEM_DIR = os.path.join(os.path.dirname(__file__), "..", "apps", "game", "public", "audio", "stems", "ferreira")
BACKUP_DIR = os.path.join(STEM_DIR, "backup")


def main():
    if not os.path.isdir(STEM_DIR):
        print(f"Stem directory not found: {STEM_DIR}")
        sys.exit(1)

    # Restore from backup first
    if os.path.isdir(BACKUP_DIR):
        for f in os.listdir(BACKUP_DIR):
            if f.endswith('.ogg'):
                shutil.copy2(os.path.join(BACKUP_DIR, f), os.path.join(STEM_DIR, f))
        print(f"Restored from backup\n")

    ogg_files = sorted([f for f in os.listdir(STEM_DIR) if f.endswith('.ogg')])
    print(f"Converting {len(ogg_files)} OGG stems to WAV...\n")

    total_ogg = 0
    total_wav = 0

    for name in ogg_files:
        ogg_path = os.path.join(STEM_DIR, name)
        wav_name = name.replace('.ogg', '.wav')
        wav_path = os.path.join(STEM_DIR, wav_name)

        data, sr = sf.read(ogg_path)
        dur = len(data) / sr
        ogg_size = os.path.getsize(ogg_path)

        # Write as WAV (16-bit PCM)
        sf.write(wav_path, data, sr, subtype='PCM_16')
        wav_size = os.path.getsize(wav_path)

        total_ogg += ogg_size
        total_wav += wav_size

        # Remove the OGG
        os.remove(ogg_path)

        print(f"  {name} → {wav_name}  ({dur:.2f}s, {ogg_size//1024}KB → {wav_size//1024}KB)")

    print(f"\nTotal: {total_ogg//1024}KB → {total_wav//1024}KB (+{(total_wav-total_ogg)//1024}KB)")
    print("Done. Update music-engine.ts to use .wav extension.")


if __name__ == "__main__":
    main()
