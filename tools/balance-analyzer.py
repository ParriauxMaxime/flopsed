#!/usr/bin/env python3
"""
Balance analyzer for AGI Rush.
Reads --trace output from the sim and produces actionable balance insights.

Usage:
    npm run sim -- --trace | python3 tools/balance-analyzer.py
    npm run sim -- --trace --profile casual | python3 tools/balance-analyzer.py
    npm run sim -- --trace | python3 tools/balance-analyzer.py --tier garage
    npm run sim -- --trace | python3 tools/balance-analyzer.py --tier garage --chart
"""

import json
import sys
import argparse
from collections import defaultdict

TIER_NAMES = {0: "garage", 1: "freelancing", 2: "startup", 3: "tech_company", 4: "ai_lab", 5: "agi_race"}
TIER_IDS = {v: k for k, v in TIER_NAMES.items()}


def load_traces():
    """Load trace data. Returns a list of trace objects (one per profile)."""
    data = json.load(sys.stdin)
    if isinstance(data, list):
        return data
    return [data]


def fmt_time(seconds):
    m, s = divmod(int(seconds), 60)
    return f"{m}:{s:02d}"


def fmt_num(n):
    if abs(n) >= 1_000_000_000:
        return f"{n/1_000_000_000:.1f}B"
    if abs(n) >= 1_000_000:
        return f"{n/1_000_000:.1f}M"
    if abs(n) >= 1_000:
        return f"{n/1_000:.1f}K"
    if isinstance(n, float):
        return f"{n:.2f}"
    return str(n)


def analyze_tier(purchases, tier_idx, tier_times, next_tier_time):
    """Analyze all purchases within a single tier."""
    tier_purchases = [p for p in purchases if p.get("snapshot", {}).get("tier") == tier_idx]
    if not tier_purchases:
        return None

    start = tier_times.get(str(tier_idx), 0)
    duration = next_tier_time - start if next_tier_time else None

    # Categorize purchases
    categories = defaultdict(list)
    for p in tier_purchases:
        categories[p["type"]].append(p)

    # Compute resource flow analysis
    first_snap = tier_purchases[0].get("snapshot", {})
    last_snap = tier_purchases[-1].get("snapshot", {})

    # Identify bottleneck: loc production vs flops capacity
    bottleneck_moments = []
    for p in tier_purchases:
        snap = p.get("snapshot", {})
        loc_rate = snap.get("locPerSec", 0)
        flops = snap.get("flops", 0)
        ratio = loc_rate / flops if flops > 0 else float("inf")
        bottleneck_moments.append({
            "time": p["time"],
            "name": p["name"],
            "loc_rate": loc_rate,
            "flops": flops,
            "ratio": ratio,
            "bottleneck": "flops" if ratio > 1.5 else ("loc" if ratio < 0.5 else "balanced"),
        })

    # Identify gaps (time between purchases > 3s)
    gaps = []
    for i in range(1, len(tier_purchases)):
        gap = tier_purchases[i]["time"] - tier_purchases[i-1]["time"]
        if gap > 3:
            gaps.append({
                "duration": gap,
                "after": tier_purchases[i-1]["name"],
                "before": tier_purchases[i]["name"],
                "time": tier_purchases[i-1]["time"],
            })
    gaps.sort(key=lambda g: g["duration"], reverse=True)

    # Cash flow at key moments
    cash_rates = [p["snapshot"]["cashPerSec"] for p in tier_purchases if "snapshot" in p]

    return {
        "tier": TIER_NAMES.get(tier_idx, f"tier_{tier_idx}"),
        "tier_idx": tier_idx,
        "duration": duration,
        "start": start,
        "purchase_count": len(tier_purchases),
        "categories": {k: len(v) for k, v in categories.items()},
        "first_snapshot": first_snap,
        "last_snapshot": last_snap,
        "cash_rate_start": cash_rates[0] if cash_rates else 0,
        "cash_rate_end": cash_rates[-1] if cash_rates else 0,
        "bottleneck_moments": bottleneck_moments,
        "top_gaps": gaps[:5],
        "purchases": tier_purchases,
    }


def print_tier_analysis(analysis):
    """Print a detailed analysis of one tier."""
    if not analysis:
        return

    tier = analysis["tier"].upper()
    dur = fmt_time(analysis["duration"]) if analysis["duration"] else "N/A"
    print(f"\n{'='*70}")
    print(f"  TIER: {tier}  |  Duration: {dur}  |  Purchases: {analysis['purchase_count']}")
    print(f"{'='*70}")

    # Resource flow summary
    fs = analysis["first_snapshot"]
    ls = analysis["last_snapshot"]
    print(f"\n  Resource flow:")
    print(f"    LoC/s:    {fmt_num(fs.get('locPerSec',0)):>8s}  -->  {fmt_num(ls.get('locPerSec',0)):>8s}")
    print(f"    FLOPS:    {fmt_num(fs.get('flops',0)):>8s}  -->  {fmt_num(ls.get('flops',0)):>8s}")
    print(f"    $/s:      {fmt_num(fs.get('cashPerSec',0)):>8s}  -->  {fmt_num(ls.get('cashPerSec',0)):>8s}")
    print(f"    Quality:  {fs.get('quality',0):>7.0f}%  -->  {ls.get('quality',0):>7.0f}%")

    # Bottleneck analysis
    bottlenecks = analysis["bottleneck_moments"]
    flops_bottlenecked = sum(1 for b in bottlenecks if b["bottleneck"] == "flops")
    loc_bottlenecked = sum(1 for b in bottlenecks if b["bottleneck"] == "loc")
    balanced = sum(1 for b in bottlenecks if b["bottleneck"] == "balanced")
    total = len(bottlenecks)

    print(f"\n  Bottleneck analysis ({total} purchase moments):")
    print(f"    FLOPS-starved (LoC piling up):  {flops_bottlenecked:3d} ({100*flops_bottlenecked/total:.0f}%)")
    print(f"    LoC-starved (FLOPS idle):       {loc_bottlenecked:3d} ({100*loc_bottlenecked/total:.0f}%)")
    print(f"    Balanced:                        {balanced:3d} ({100*balanced/total:.0f}%)")

    # Show bottleneck over time
    if bottlenecks:
        print(f"\n  LoC:FLOPS ratio over time (>1.5 = need more FLOPS, <0.5 = need more LoC):")
        # Sample at most 10 evenly-spaced moments
        step = max(1, len(bottlenecks) // 10)
        for b in bottlenecks[::step]:
            ratio = b["ratio"]
            bar_len = min(40, int(ratio * 10))
            indicator = "!" if ratio > 1.5 else ("." if ratio < 0.5 else "|")
            bar = indicator * bar_len
            print(f"    {fmt_time(b['time']):>5s}  {ratio:5.1f}x  {bar:<40s}  {b['name']}")

    # Purchase timeline
    print(f"\n  Purchase timeline:")
    for p in analysis["purchases"]:
        snap = p.get("snapshot", {})
        cost_str = f"${fmt_num(p['cost'])}" if p.get("currency") == "cash" else f"{fmt_num(p['cost'])} LoC"
        loc_ratio = snap.get("locPerSec", 0) / snap.get("flops", 1) if snap.get("flops", 0) > 0 else 0
        bottleneck_marker = " <<FLOPS!" if loc_ratio > 1.5 else (" <<LoC!" if loc_ratio < 0.5 else "")
        print(f"    {fmt_time(p['time']):>5s}  [{p['type']:>7s}]  {p['name']:<25s}  {cost_str:>12s}  $/s={fmt_num(snap.get('cashPerSec',0)):>8s}  LoC/s={fmt_num(snap.get('locPerSec',0)):>6s}  FLOPS={fmt_num(snap.get('flops',0)):>6s}{bottleneck_marker}")

    # Top gaps
    if analysis["top_gaps"]:
        print(f"\n  Longest gaps (waiting for cash):")
        for g in analysis["top_gaps"]:
            print(f"    {g['duration']:3d}s gap at {fmt_time(g['time'])} -- after '{g['after']}' --> waiting for '{g['before']}'")

    # Diagnosis
    print(f"\n  Diagnosis:")
    if flops_bottlenecked > total * 0.6:
        print(f"    >> FLOPS are the bottleneck for most of this tier.")
        print(f"       LoC piles up faster than it can be executed.")
        print(f"       Consider: cheaper FLOPS upgrades, or slower LoC production.")
    elif loc_bottlenecked > total * 0.6:
        print(f"    >> LoC production is the bottleneck for most of this tier.")
        print(f"       FLOPS are often idle waiting for code.")
        print(f"       Consider: cheaper LoC upgrades, or fewer FLOPS options.")
    else:
        print(f"    >> Relatively balanced between LoC and FLOPS.")

    if analysis["top_gaps"] and analysis["top_gaps"][0]["duration"] > 30:
        g = analysis["top_gaps"][0]
        print(f"    >> Longest wait is {g['duration']}s before '{g['before']}'.")
        print(f"       Consider reducing its cost or adding a cheaper option in between.")


def print_ascii_chart(analysis):
    """Print an ASCII chart of LoC/s vs FLOPS over time."""
    if not analysis or not analysis["bottleneck_moments"]:
        return

    moments = analysis["bottleneck_moments"]
    max_val = max(max(m["loc_rate"] for m in moments), max(m["flops"] for m in moments))
    if max_val == 0:
        return

    print(f"\n  LoC/s vs FLOPS chart ({analysis['tier'].upper()}):")
    print(f"  {'':>5s}  {'LoC/s':^20s}  {'FLOPS':^20s}")

    step = max(1, len(moments) // 20)
    for m in moments[::step]:
        loc_bar = int(20 * m["loc_rate"] / max_val)
        flops_bar = int(20 * m["flops"] / max_val)
        print(f"  {fmt_time(m['time']):>5s}  {'#' * loc_bar:<20s}  {'=' * flops_bar:<20s}")

    print(f"  {'':>5s}  {'# = LoC/s':^20s}  {'= = FLOPS':^20s}")


def print_summary(trace, all_analyses):
    """Print cross-tier summary."""
    print(f"\n{'='*70}")
    print(f"  CROSS-TIER SUMMARY  |  Profile: {trace['profile']}  |  {trace['keysPerSec']} keys/s")
    print(f"{'='*70}")

    print(f"\n  {'Tier':<15s}  {'Duration':>8s}  {'Buys':>5s}  {'$/s start':>10s}  {'$/s end':>10s}  {'Bottleneck':<12s}")
    print(f"  {'-'*65}")

    for a in all_analyses:
        if not a:
            continue
        bottlenecks = a["bottleneck_moments"]
        flops_pct = sum(1 for b in bottlenecks if b["bottleneck"] == "flops") / max(len(bottlenecks), 1)
        bn = "FLOPS" if flops_pct > 0.5 else ("LoC" if flops_pct < 0.3 else "balanced")
        dur = fmt_time(a["duration"]) if a["duration"] else "N/A"
        print(f"  {a['tier']:<15s}  {dur:>8s}  {a['purchase_count']:>5d}  {fmt_num(a['cash_rate_start']):>10s}  {fmt_num(a['cash_rate_end']):>10s}  {bn:<12s}")


def analyze_profile(trace, args):
    """Analyze a single profile's trace data."""
    purchases = trace["purchases"]
    tier_times = trace["tierTimes"]

    # Build tier analyses
    all_analyses = []
    tier_indices = sorted(int(k) for k in tier_times.keys())
    for i, tier_idx in enumerate(tier_indices):
        next_time = tier_times.get(str(tier_indices[i+1])) if i+1 < len(tier_indices) else trace.get("agiTime")
        analysis = analyze_tier(purchases, tier_idx, tier_times, next_time)
        all_analyses.append(analysis)

    # Print summary
    print_summary(trace, all_analyses)

    # Print detailed analysis for requested tier(s)
    if args.tier:
        tier_idx = TIER_IDS.get(args.tier)
        if tier_idx is None:
            print(f"\nUnknown tier: {args.tier}. Options: {', '.join(TIER_IDS.keys())}")
            sys.exit(1)
        analysis = next((a for a in all_analyses if a and a["tier_idx"] == tier_idx), None)
        if analysis:
            print_tier_analysis(analysis)
            if args.chart:
                print_ascii_chart(analysis)
        else:
            print(f"\nNo data for tier: {args.tier}")
    elif args.all:
        for a in all_analyses:
            if a:
                print_tier_analysis(a)
                if args.chart:
                    print_ascii_chart(a)
    else:
        # Default: show the first two tiers in detail (most common balance target)
        for a in all_analyses[:2]:
            if a:
                print_tier_analysis(a)


def print_comparison(traces, tier_name):
    """Compare a specific tier across all profiles side by side."""
    tier_idx = TIER_IDS.get(tier_name)
    if tier_idx is None:
        return

    print(f"\n{'='*70}")
    print(f"  TIER COMPARISON: {tier_name.upper()}")
    print(f"{'='*70}")

    headers = ["Metric"] + [t["profile"] for t in traces]
    rows = []

    analyses = []
    for trace in traces:
        purchases = trace["purchases"]
        tier_times = trace["tierTimes"]
        tier_indices = sorted(int(k) for k in tier_times.keys())
        for i, ti in enumerate(tier_indices):
            if ti == tier_idx:
                next_time = tier_times.get(str(tier_indices[i+1])) if i+1 < len(tier_indices) else trace.get("agiTime")
                analyses.append(analyze_tier(purchases, ti, tier_times, next_time))
                break
        else:
            analyses.append(None)

    rows.append(["Duration"] + [fmt_time(a["duration"]) if a and a["duration"] else "N/A" for a in analyses])
    rows.append(["Purchases"] + [str(a["purchase_count"]) if a else "N/A" for a in analyses])
    rows.append(["Start $/s"] + [fmt_num(a["cash_rate_start"]) if a else "N/A" for a in analyses])
    rows.append(["End $/s"] + [fmt_num(a["cash_rate_end"]) if a else "N/A" for a in analyses])
    rows.append(["Start LoC/s"] + [fmt_num(a["first_snapshot"].get("locPerSec", 0)) if a else "N/A" for a in analyses])
    rows.append(["End LoC/s"] + [fmt_num(a["last_snapshot"].get("locPerSec", 0)) if a else "N/A" for a in analyses])
    rows.append(["Start FLOPS"] + [fmt_num(a["first_snapshot"].get("flops", 0)) if a else "N/A" for a in analyses])
    rows.append(["End FLOPS"] + [fmt_num(a["last_snapshot"].get("flops", 0)) if a else "N/A" for a in analyses])

    # Bottleneck
    for a_idx, a in enumerate(analyses):
        if a:
            bm = a["bottleneck_moments"]
            flops_pct = sum(1 for b in bm if b["bottleneck"] == "flops") / max(len(bm), 1)
            analyses[a_idx] = (a, "FLOPS" if flops_pct > 0.5 else ("LoC" if flops_pct < 0.3 else "balanced"))
        else:
            analyses[a_idx] = (a, "N/A")

    rows.append(["Bottleneck"] + [x[1] if isinstance(x, tuple) else "N/A" for x in analyses])

    # Print table
    col_widths = [max(len(str(row[i])) for row in [headers] + rows) for i in range(len(headers))]
    header_line = "  ".join(h.rjust(w) for h, w in zip(headers, col_widths))
    print(f"\n  {header_line}")
    print(f"  {'-' * len(header_line)}")
    for row in rows:
        print(f"  {'  '.join(str(v).rjust(w) for v, w in zip(row, col_widths))}")


def main():
    parser = argparse.ArgumentParser(description="Analyze AGI Rush balance trace")
    parser.add_argument("--tier", help="Focus on specific tier (garage, freelancing, startup, tech_company, ai_lab, agi_race)")
    parser.add_argument("--chart", action="store_true", help="Show ASCII charts")
    parser.add_argument("--all", action="store_true", help="Show all tiers in detail")
    parser.add_argument("--compare", action="store_true", help="Compare tier across all profiles (requires multi-profile trace)")
    args = parser.parse_args()

    traces = load_traces()

    if args.compare and args.tier and len(traces) > 1:
        # Multi-profile comparison mode
        print_comparison(traces, args.tier)
    elif len(traces) > 1:
        # Multi-profile: show summary for each, then detailed for requested tier
        for trace in traces:
            analyze_profile(trace, args)
    else:
        analyze_profile(traces[0], args)


if __name__ == "__main__":
    main()
