# AGI Rush

An incremental game where you type code, execute it for cash, and scale up toward AGI.

**[Play now](https://parriauxmaxime.github.io/incremental-agi-rush/)**

## The Loop

```
Type code  →  LoC enters codebase
                    ↓
          FLOPS execute LoC
                    ↓
              Cash is generated
                    ↓
        Cash buys upgrades / hardware
                    ↓
        More FLOPS, better AI, repeat
```

## Progression

| Tier | Name | Theme |
|------|------|-------|
| 0 | The Garage | Just you and a keyboard |
| 1 | Freelancing | Selling your code to clients |
| 2 | Startup | Hire interns and devs |
| 3 | Tech Company | Scale with teams and managers |
| 4 | AI Lab | AI writes code — but consumes FLOPS |
| 5 | AGI Race | The final push to superintelligence |

## Stack

- React 19 + Emotion
- TypeScript (strict)
- Zustand
- Rspack

## Development

```bash
npm install
npm run dev        # Dev server on :3000
npm run build      # Production build
npm run typecheck   # TypeScript check
npm run check      # Biome lint + format
```

## License

MIT
