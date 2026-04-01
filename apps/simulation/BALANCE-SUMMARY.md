# Balance Summary

Last updated: 2026-04-01

## Per-Tier Duration (seconds)

### Greedy AI (casual human, buy-everything)

| Tier | Casual (4k/s) | Average (6k/s) | Fast (9k/s) |
|------|--------------|-----------------|-------------|
| T0 Garage | 181s (3.0m) | 122s (2.0m) | 118s (2.0m) |
| T1 Freelancing | 292s (4.9m) | 265s (4.4m) | 223s (3.7m) |
| T2 Startup | 373s (6.2m) | 338s (5.6m) | 302s (5.0m) |
| T3 Tech Company | 375s (6.3m) | 350s (5.8m) | 350s (5.8m) |
| T4 AI Lab | 419s (7.0m) | 217s (3.6m) | 299s (5.0m) |
| T5 AGI Race | 540s (9.0m) | 555s (9.3m) | 550s (9.2m) |
| **Total** | **36.4 min** | **30.8 min** | **30.7 min** |

### Balanced AI (value-optimized)

| Tier | Casual (4k/s) | Average (6k/s) | Fast (9k/s) |
|------|--------------|-----------------|-------------|
| T0 Garage | 85s (1.4m) | 67s (1.1m) | 49s (0.8m) |
| T1 Freelancing | 166s (2.8m) | 138s (2.3m) | 119s (2.0m) |
| T2 Startup | 412s (6.9m) | 400s (6.7m) | 373s (6.2m) |
| T3 Tech Company | 557s (9.3m) | 531s (8.9m) | 528s (8.8m) |
| T4 AI Lab | 956s (15.9m) | 985s (16.4m) | 953s (15.9m) |
| T5 AGI Race | 1172s (19.5m) | 1148s (19.1m) | 1141s (19.0m) |
| **Total** | **55.8 min** | **54.5 min** | **52.7 min** |

## Key Balance Parameters

| Parameter | Value | File |
|-----------|-------|------|
| T0 cashPerLoc | $0.05 | tiers.json |
| T1 cashPerLoc | $0.25 | tiers.json |
| T2 cashPerLoc | $0.80 | tiers.json |
| T3 cashPerLoc | $5.00 | tiers.json |
| T4 cashPerLoc | $10.00 | tiers.json |
| T5 cashPerLoc | $100.00 | tiers.json |
| Freelancing unlock | $250 | tech-tree.json + tiers.json |
| Startup unlock | $2,000 | tech-tree.json + tiers.json |
| Tech Company unlock | $100,000 | tech-tree.json + tiers.json |
| AI Lab unlock | $35,000,000 | tech-tree.json + tiers.json |
| AGI Race unlock | $30,000,000,000 | tech-tree.json + tiers.json |
| Singularity cost | $2,000,000,000,000,000 | tech-tree.json |
| Architect (T3) | x1.3 cashMult, max 3 | upgrades.json |
| ML Pipeline (T4) | x1.15 cashMult, max 3 | upgrades.json |
| RLHF (T4) | x1.2 llmLocMult, max 5 | upgrades.json |
| TPU Pod (T4) | +5M FLOPS, max 5 | upgrades.json |

## Regenerate

```bash
npm run sim -- --greedy --verbose   # greedy strategy
npm run sim -- --verbose            # balanced strategy
```
