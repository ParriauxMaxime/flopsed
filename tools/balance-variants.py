#!/usr/bin/env python3
"""
Balance variant comparator for Flopsed.
Tests multiple balance variants side-by-side by modifying data files,
running the sim trace for each, and producing a comparison table.

Usage:
    python3 tools/balance-variants.py \
      --variant "cheaper_keyboard: tech-tree.json#better_keyboard.baseCost=10" \
      --variant "more_flops: upgrades.json#desktop_pc.baseCost=100" \
      --variant "both: tech-tree.json#better_keyboard.baseCost=10, upgrades.json#desktop_pc.baseCost=100"

    # Nested paths with array indexing:
    python3 tools/balance-variants.py \
      --variant "buff_kb: tech-tree.json#better_keyboard.effects[0].value=6"

    # Filter to one profile:
    python3 tools/balance-variants.py --profile average \
      --variant "cheap: tech-tree.json#better_keyboard.baseCost=5"

    # Show per-tier detail:
    python3 tools/balance-variants.py --detail \
      --variant "cheap: tech-tree.json#better_keyboard.baseCost=5"

DSL format:
    --variant "NAME: FILE#ID.PATH=VALUE, FILE#ID.PATH=VALUE, ..."

    FILE    = JSON filename in libs/domain/data/ (e.g. tech-tree.json, upgrades.json)
    ID      = The id of the item in the top-level array (nodes, upgrades, tiers, models, etc.)
    PATH    = Dot-separated path from that item (supports [N] for array indices)
    VALUE   = New value (auto-parsed as number/bool/string)

    For files without an array of items (balance.json, events.json eventConfig),
    use the key path directly: balance.json#validation.agiMaxMinutes=50
"""

import argparse
import copy
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "libs", "domain", "data")

# Map from filename to the top-level key that holds the array of items
# and which field is the item id
FILE_ARRAY_KEY = {
    "tech-tree.json": ("nodes", "id"),
    "upgrades.json": ("upgrades", "id"),
    "tiers.json": ("tiers", "id"),
    "ai-models.json": ("models", "id"),
    "events.json": ("events", "id"),
    "milestones.json": ("milestones", "id"),
}

# Files where modifications target top-level keys directly (no item lookup)
FLAT_FILES = {"balance.json"}

TIER_NAMES = {0: "garage", 1: "freelancing", 2: "startup", 3: "tech_company", 4: "ai_lab", 5: "agi_race"}


def parse_value(raw: str):
    """Auto-parse a string value to the appropriate Python type."""
    raw = raw.strip()
    if raw.lower() == "true":
        return True
    if raw.lower() == "false":
        return False
    if raw.lower() == "null":
        return None
    try:
        if "." in raw:
            return float(raw)
        return int(raw)
    except ValueError:
        # Strip surrounding quotes if present
        if (raw.startswith('"') and raw.endswith('"')) or (raw.startswith("'") and raw.endswith("'")):
            return raw[1:-1]
        return raw


def resolve_path(obj, path_str):
    """Walk a dot/bracket path and return (parent, key) for the final element."""
    # Split on dots, but handle [N] indexing
    # e.g. "effects[0].value" -> ["effects", "[0]", "value"]
    tokens = []
    for part in path_str.split("."):
        # Split bracket indices: "effects[0]" -> "effects", 0
        m = re.match(r"^(\w+)(\[\d+\])+$", part)
        if m:
            tokens.append(m.group(1))
            for idx_match in re.finditer(r"\[(\d+)\]", part):
                tokens.append(int(idx_match.group(1)))
        else:
            tokens.append(part)

    current = obj
    for i, token in enumerate(tokens[:-1]):
        if isinstance(token, int):
            current = current[token]
        else:
            current = current[token]

    return current, tokens[-1]


def apply_modification(data, filename, mod_path, value):
    """
    Apply a single modification to the loaded JSON data.

    mod_path format:
      For array-based files: "item_id.nested.path[0].field"
      For flat files: "top_key.nested.path"
    """
    if filename in FLAT_FILES:
        parent, key = resolve_path(data, mod_path)
        old_val = parent[key] if isinstance(key, int) else parent.get(key)
        parent[key] = value
        return old_val

    if filename not in FILE_ARRAY_KEY:
        raise ValueError(f"Unknown file: {filename}. Supported: {', '.join(sorted(list(FILE_ARRAY_KEY.keys()) + list(FLAT_FILES)))}")

    array_key, id_field = FILE_ARRAY_KEY[filename]

    # Split into item_id and remaining path
    dot_idx = mod_path.find(".")
    if dot_idx == -1:
        raise ValueError(f"Path must be 'item_id.field' but got '{mod_path}' for {filename}")

    item_id = mod_path[:dot_idx]
    remaining_path = mod_path[dot_idx + 1:]

    # Find the item in the array
    items = data[array_key]
    item = None
    for entry in items:
        if entry.get(id_field) == item_id:
            item = entry
            break

    if item is None:
        available = [e.get(id_field) for e in items[:10]]
        raise ValueError(f"Item '{item_id}' not found in {filename}[{array_key}]. Available: {available}...")

    parent, key = resolve_path(item, remaining_path)
    old_val = parent[key] if isinstance(key, int) else parent.get(key)
    parent[key] = value
    return old_val


def parse_variant(variant_str: str):
    """
    Parse a variant string like:
      "cheaper_keyboard: tech-tree.json#better_keyboard.baseCost=10, upgrades.json#desktop_pc.baseCost=100"

    Returns (name, [(filename, path, value), ...])
    """
    # Split name from modifications
    colon_idx = variant_str.find(":")
    if colon_idx == -1:
        raise ValueError(f"Variant must have format 'name: modifications' but got: {variant_str}")

    name = variant_str[:colon_idx].strip()
    mods_str = variant_str[colon_idx + 1:].strip()

    modifications = []
    for mod in mods_str.split(","):
        mod = mod.strip()
        if not mod:
            continue

        # Split file#path=value
        hash_idx = mod.find("#")
        if hash_idx == -1:
            raise ValueError(f"Modification must have format 'file#path=value' but got: {mod}")

        filename = mod[:hash_idx].strip()
        rest = mod[hash_idx + 1:]

        eq_idx = rest.find("=")
        if eq_idx == -1:
            raise ValueError(f"Modification must have format 'file#path=value' but got: {mod}")

        path = rest[:eq_idx].strip()
        value = parse_value(rest[eq_idx + 1:])

        modifications.append((filename, path, value))

    return name, modifications


def load_data_files():
    """Load all JSON data files and return a dict of filename -> parsed data."""
    files = {}
    for fname in os.listdir(DATA_DIR):
        if fname.endswith(".json"):
            with open(os.path.join(DATA_DIR, fname)) as f:
                files[fname] = json.load(f)
    return files


def backup_data_files():
    """Create a backup directory with exact copies of all data JSON files.
    Returns the path to the backup directory."""
    backup_dir = tempfile.mkdtemp(prefix="flopsed-backup-")
    for fname in os.listdir(DATA_DIR):
        if fname.endswith(".json"):
            shutil.copy2(os.path.join(DATA_DIR, fname), os.path.join(backup_dir, fname))
    return backup_dir


def restore_data_files(backup_dir: str):
    """Restore data files from backup directory (exact byte-level restore)."""
    for fname in os.listdir(backup_dir):
        if fname.endswith(".json"):
            shutil.copy2(os.path.join(backup_dir, fname), os.path.join(DATA_DIR, fname))


def write_data_files(files: dict):
    """Write modified data files back to disk."""
    for fname, data in files.items():
        filepath = os.path.join(DATA_DIR, fname)
        with open(filepath, "w") as f:
            json.dump(data, f, indent="\t", ensure_ascii=False)
            f.write("\n")


def run_sim_trace(profile=None):
    """Run the simulation with --trace and return parsed JSON output.

    Uses a temp file for stdout to avoid subprocess buffer limits
    (trace output can be several MB of JSON).
    """
    cmd = ["npx", "--silent", "tsx", "apps/simulation/src/main.ts", "--trace"]
    if profile:
        cmd.extend(["--profile", profile])

    # Write stdout to a temp file to avoid pipe buffer limits
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        with open(tmp_path, "w") as out_f:
            result = subprocess.run(
                cmd,
                stdout=out_f,
                stderr=subprocess.PIPE,
                text=True,
                cwd=ROOT,
                timeout=120,
            )

        if result.returncode != 0:
            print(f"  [ERROR] Sim failed: {result.stderr[:500]}", file=sys.stderr)
            return None

        with open(tmp_path) as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"  [ERROR] Could not parse sim output: {e}", file=sys.stderr)
        return None
    except subprocess.TimeoutExpired:
        print(f"  [ERROR] Sim timed out after 120s", file=sys.stderr)
        return None
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def fmt_time(seconds):
    if seconds is None:
        return "N/A"
    m, s = divmod(int(seconds), 60)
    return f"{m}:{s:02d}"


def fmt_num(n):
    if n is None:
        return "N/A"
    if abs(n) >= 1_000_000_000:
        return f"{n / 1_000_000_000:.1f}B"
    if abs(n) >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if abs(n) >= 1_000:
        return f"{n / 1_000:.1f}K"
    if isinstance(n, float):
        return f"{n:.2f}"
    return str(n)


def analyze_trace(trace):
    """Extract key metrics from a single-profile trace."""
    if trace is None:
        return None

    purchases = trace.get("purchases", [])
    tier_times = trace.get("tierTimes", {})
    agi_time = trace.get("agiTime")

    tier_indices = sorted(int(k) for k in tier_times.keys())

    tier_durations = {}
    for i, tier_idx in enumerate(tier_indices):
        start = tier_times[str(tier_idx)]
        end = tier_times.get(str(tier_indices[i + 1])) if i + 1 < len(tier_indices) else agi_time
        if end is not None:
            tier_durations[tier_idx] = end - start

    # Bottleneck analysis per tier
    tier_bottlenecks = {}
    for tier_idx in tier_indices:
        tier_purchases = [p for p in purchases if p.get("snapshot", {}).get("tier") == tier_idx]
        if not tier_purchases:
            continue
        flops_starved = 0
        loc_starved = 0
        balanced = 0
        for p in tier_purchases:
            snap = p.get("snapshot", {})
            loc_rate = snap.get("locPerSec", 0)
            flops = snap.get("flops", 0)
            ratio = loc_rate / flops if flops > 0 else float("inf")
            if ratio > 1.5:
                flops_starved += 1
            elif ratio < 0.5:
                loc_starved += 1
            else:
                balanced += 1
        total = flops_starved + loc_starved + balanced
        if flops_starved > total * 0.5:
            tier_bottlenecks[tier_idx] = "FLOPS"
        elif loc_starved > total * 0.5:
            tier_bottlenecks[tier_idx] = "LoC"
        else:
            tier_bottlenecks[tier_idx] = "balanced"

    # Cash/s at tier boundaries
    tier_cash_end = {}
    for tier_idx in tier_indices:
        tier_purchases = [p for p in purchases if p.get("snapshot", {}).get("tier") == tier_idx]
        if tier_purchases:
            tier_cash_end[tier_idx] = tier_purchases[-1].get("snapshot", {}).get("cashPerSec", 0)

    # Longest gap
    longest_gap = 0
    longest_gap_name = ""
    for i in range(1, len(purchases)):
        gap = purchases[i]["time"] - purchases[i - 1]["time"]
        if gap > longest_gap:
            longest_gap = gap
            longest_gap_name = purchases[i].get("name", "?")

    return {
        "profile": trace.get("profile", "unknown"),
        "keys_per_sec": trace.get("keysPerSec", 0),
        "agi_time": agi_time,
        "purchase_count": len(purchases),
        "tier_count": len(tier_indices),
        "tier_durations": tier_durations,
        "tier_bottlenecks": tier_bottlenecks,
        "tier_cash_end": tier_cash_end,
        "longest_gap": longest_gap,
        "longest_gap_name": longest_gap_name,
    }


def print_comparison_table(variant_results: dict, detail: bool = False):
    """
    Print a comparison table across all variants.
    variant_results: {variant_name: {profile_name: analysis_dict}}
    """
    variant_names = list(variant_results.keys())
    if not variant_names:
        print("No results to compare.")
        return

    # Get all profiles present
    all_profiles = []
    for vname in variant_names:
        for pname in variant_results[vname]:
            if pname not in all_profiles:
                all_profiles.append(pname)

    for profile in all_profiles:
        print(f"\n{'=' * 80}")
        print(f"  VARIANT COMPARISON  |  Profile: {profile}")
        print(f"{'=' * 80}")

        # Collect analyses for this profile across variants
        analyses = {}
        for vname in variant_names:
            analyses[vname] = variant_results[vname].get(profile)

        # Summary table
        headers = ["Metric"] + variant_names
        rows = []

        # AGI time
        rows.append(["AGI Time"] + [
            fmt_time(a["agi_time"]) if a else "FAIL"
            for a in (analyses[v] for v in variant_names)
        ])

        # AGI minutes
        rows.append(["AGI (min)"] + [
            f"{a['agi_time'] / 60:.1f}" if a and a["agi_time"] else "N/A"
            for a in (analyses[v] for v in variant_names)
        ])

        # Purchases
        rows.append(["Purchases"] + [
            str(a["purchase_count"]) if a else "N/A"
            for a in (analyses[v] for v in variant_names)
        ])

        # Longest gap
        rows.append(["Longest Gap"] + [
            f"{a['longest_gap']:.0f}s" if a else "N/A"
            for a in (analyses[v] for v in variant_names)
        ])

        rows.append(["  waiting for"] + [
            a["longest_gap_name"][:18] if a else ""
            for a in (analyses[v] for v in variant_names)
        ])

        # Tier durations
        rows.append([""] + ["" for _ in variant_names])
        rows.append(["--- Tiers ---"] + ["" for _ in variant_names])

        for tier_idx in range(6):
            tier_name = TIER_NAMES.get(tier_idx, f"T{tier_idx}")
            dur_row = [f"  {tier_name}"]
            for vname in variant_names:
                a = analyses[vname]
                if a and tier_idx in a["tier_durations"]:
                    dur = a["tier_durations"][tier_idx]
                    dur_row.append(fmt_time(dur))
                else:
                    dur_row.append("-")
            rows.append(dur_row)

        if detail:
            # Bottleneck per tier
            rows.append([""] + ["" for _ in variant_names])
            rows.append(["--- Bottleneck ---"] + ["" for _ in variant_names])

            for tier_idx in range(6):
                tier_name = TIER_NAMES.get(tier_idx, f"T{tier_idx}")
                bn_row = [f"  {tier_name}"]
                for vname in variant_names:
                    a = analyses[vname]
                    if a and tier_idx in a["tier_bottlenecks"]:
                        bn_row.append(a["tier_bottlenecks"][tier_idx])
                    else:
                        bn_row.append("-")
                rows.append(bn_row)

            # Cash/s at tier end
            rows.append([""] + ["" for _ in variant_names])
            rows.append(["--- $/s at tier end ---"] + ["" for _ in variant_names])

            for tier_idx in range(6):
                tier_name = TIER_NAMES.get(tier_idx, f"T{tier_idx}")
                cash_row = [f"  {tier_name}"]
                for vname in variant_names:
                    a = analyses[vname]
                    if a and tier_idx in a.get("tier_cash_end", {}):
                        cash_row.append(fmt_num(a["tier_cash_end"][tier_idx]))
                    else:
                        cash_row.append("-")
                rows.append(cash_row)

        # Print the table
        col_widths = [max(len(str(row[i])) for row in [headers] + rows) for i in range(len(headers))]
        # Minimum column width
        col_widths = [max(w, 10) for w in col_widths]

        header_line = "  ".join(h.rjust(w) for h, w in zip(headers, col_widths))
        print(f"\n  {header_line}")
        print(f"  {'-' * len(header_line)}")
        for row in rows:
            # Separator rows
            if all(v == "" for v in row):
                print()
                continue
            line = "  ".join(str(v).rjust(w) for v, w in zip(row, col_widths))
            print(f"  {line}")

    # Delta summary (if baseline exists)
    if "baseline" in variant_results:
        print(f"\n{'=' * 80}")
        print(f"  DELTA FROM BASELINE")
        print(f"{'=' * 80}")

        for profile in all_profiles:
            baseline = variant_results["baseline"].get(profile)
            if not baseline or not baseline["agi_time"]:
                continue

            print(f"\n  [{profile}]")
            for vname in variant_names:
                if vname == "baseline":
                    continue
                a = variant_results[vname].get(profile)
                if not a or not a["agi_time"]:
                    print(f"    {vname}: SIM FAILED")
                    continue

                delta_agi = a["agi_time"] - baseline["agi_time"]
                delta_sign = "+" if delta_agi >= 0 else ""
                delta_gap = a["longest_gap"] - baseline["longest_gap"]
                gap_sign = "+" if delta_gap >= 0 else ""

                print(f"    {vname}:")
                print(f"      AGI time:     {delta_sign}{delta_agi:.0f}s ({delta_sign}{delta_agi / 60:.1f}min)")
                print(f"      Longest gap:  {gap_sign}{delta_gap:.0f}s")

                # Per-tier deltas
                for tier_idx in range(6):
                    b_dur = baseline["tier_durations"].get(tier_idx)
                    a_dur = a["tier_durations"].get(tier_idx)
                    if b_dur is not None and a_dur is not None:
                        d = a_dur - b_dur
                        sign = "+" if d >= 0 else ""
                        tier_name = TIER_NAMES.get(tier_idx, f"T{tier_idx}")
                        print(f"      {tier_name:15s}  {sign}{d:.0f}s")


def main():
    parser = argparse.ArgumentParser(
        description="Compare balance variants for Flopsed",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--variant", "-v",
        action="append",
        default=[],
        help='Variant definition: "name: file#id.path=value, ..."',
    )
    parser.add_argument(
        "--profile", "-p",
        help="Run only one profile (casual, average, fast)",
    )
    parser.add_argument(
        "--detail", "-d",
        action="store_true",
        help="Show detailed per-tier bottleneck and cash/s breakdown",
    )
    parser.add_argument(
        "--no-baseline",
        action="store_true",
        help="Skip running the baseline (current data) simulation",
    )
    args = parser.parse_args()

    if not args.variant:
        parser.error("At least one --variant is required")

    # Parse all variants
    variants = []
    for v in args.variant:
        try:
            name, mods = parse_variant(v)
            variants.append((name, mods))
        except ValueError as e:
            print(f"Error parsing variant: {e}", file=sys.stderr)
            sys.exit(1)

    # Show what we're testing
    print("Flopsed — Balance Variant Comparison")
    print("=" * 40)
    if not args.no_baseline:
        print(f"  baseline: (current data, no changes)")
    for name, mods in variants:
        mod_strs = [f"{f}#{p}={v}" for f, p, v in mods]
        print(f"  {name}: {', '.join(mod_strs)}")
    print()

    # Backup original files byte-for-byte before any modifications
    backup_dir = backup_data_files()
    print(f"  Backed up data files to {backup_dir}")

    # Load parsed data for modification
    original_files = load_data_files()

    # Results: {variant_name: {profile_name: analysis}}
    all_results = {}

    # Include baseline
    run_list = []
    if not args.no_baseline:
        run_list.append(("baseline", []))
    run_list.extend(variants)

    try:
        for variant_name, modifications in run_list:
            if modifications:
                print(f"[{variant_name}] Applying {len(modifications)} modification(s)...")
            else:
                print(f"[{variant_name}] Running with current data...")

            # For baseline, no modifications needed — files are already original
            if modifications:
                # Apply modifications to a deep copy
                modified_files = copy.deepcopy(original_files)
                try:
                    for filename, path, value in modifications:
                        if filename not in modified_files:
                            print(f"  [WARN] File {filename} not found in data dir, skipping", file=sys.stderr)
                            continue
                        old_val = apply_modification(modified_files[filename], filename, path, value)
                        print(f"  {filename}#{path}: {old_val} -> {value}")
                except (ValueError, KeyError, IndexError) as e:
                    print(f"  [ERROR] Failed to apply modification: {e}", file=sys.stderr)
                    all_results[variant_name] = {}
                    continue

                # Write modified files
                write_data_files(modified_files)

            try:
                # Run sim
                print(f"  Running simulation...")
                trace_data = run_sim_trace(profile=args.profile)

                if trace_data is None:
                    print(f"  [ERROR] Simulation returned no data")
                    all_results[variant_name] = {}
                    continue

                # Parse traces (single profile = dict, multi = list)
                traces = trace_data if isinstance(trace_data, list) else [trace_data]

                profile_results = {}
                for trace in traces:
                    analysis = analyze_trace(trace)
                    if analysis:
                        profile_results[analysis["profile"]] = analysis
                        agi_str = fmt_time(analysis["agi_time"]) if analysis["agi_time"] else "N/A"
                        print(f"  [{analysis['profile']}] AGI at {agi_str}, {analysis['purchase_count']} purchases")

                all_results[variant_name] = profile_results

            finally:
                # Restore originals after each variant (byte-level)
                if modifications:
                    restore_data_files(backup_dir)

    finally:
        # ALWAYS restore original files, even on crash
        restore_data_files(backup_dir)
        shutil.rmtree(backup_dir, ignore_errors=True)

    print(f"\n  Data files restored to original state.")

    # Print comparison
    print_comparison_table(all_results, detail=args.detail)


if __name__ == "__main__":
    main()
