# Ideas

## Self-referential source code in editor
Instead of hardcoded Python snippets, use the actual source code of Flopsed itself as the code displayed in the editor. The game would "type" its own React/TypeScript source. This creates a fun meta-loop — the game is literally writing itself.

Implementation notes:
- Could bundle `src/**/*.ts{,x}` contents at build time via rspack plugin/loader
- Tokenize the real source and feed it into the same token queue system
- Syntax highlighting would need to switch from Python to TypeScript classes
