# Claude Code-style Prompt Editor

**Date:** 2026-04-16
**Status:** Approved

## Problem

The T4+ prompt editor mixes game metrics (LoC, tokens) with the visual display, making it confusing. The diff-based output doesn't feel immersive. The input gets disabled during AI streaming, breaking the flow.

## Goal

Replace the prompt editor with a purely cosmetic terminal that closely mimics Claude Code's UI. No game mechanics shown — just a beautiful, realistic AI-coding theater. Speed scales with FLOPS. Player can always type.

## Log Entry Types

Each line in the prompt log is one of these types:

| Type | Visual | Example |
|------|--------|---------|
| **user_prompt** | `❯` prefix, foreground color | `❯ Refactor the auth module` |
| **queued_prompt** | `❯` prefix + yellow "Queued" badge | `❯ Fix the tests` `Queued` |
| **thinking** | Spinner + muted text + elapsed | `⠸ Thinking... (3s)` |
| **tool_header** | Colored badge + file path | `Edit src/auth/login.ts` |
| **tool_content** | Indented code/text, muted | `  + const token = await verify(jwt);` |
| **tool_result** | Check mark + summary | `✓ Updated 3 files` |
| **response_text** | Normal foreground, streamed word-by-word | `I've refactored the authentication...` |
| **completion** | Muted, right-aligned cost | `3.2s · 847 tokens` |
| **bash_command** | `$` prefix, mono | `$ npm test` |
| **bash_output** | Muted, mono | `  14 passing, 0 failing` |

## Tool Badges

Colored inline badges mimicking Claude Code:

| Tool | Color | Background |
|------|-------|------------|
| Read | Blue (#58a6ff) | rgba(88,166,255,0.15) |
| Edit | Green (#3fb950) | rgba(63,185,80,0.15) |
| Write | Purple (#a78bfa) | rgba(167,139,250,0.15) |
| Bash | Orange (#f0883e) | rgba(240,136,62,0.15) |

## Action Patterns

Each auto-prompt randomly picks one of these sequences:

1. **Simple edit:** Think → Edit file → response text
2. **Read-then-edit:** Think → Read file → Edit file → response text
3. **Bash workflow:** Think → Bash command → bash output → Edit file → response text
4. **New file:** Think → Write new file → response text
5. **Code review:** Think → Read file → response text only
6. **Test fix:** Think → Bash (run tests) → bash output (failure) → Edit file → Bash (run tests) → bash output (pass) → response text

Weights: patterns 1-2 are most common (~60%), 3-5 moderate (~30%), 6 rare (~10%).

## Content Pool

### File paths (~30 entries)
Drawn from realistic project structure:
- `src/components/auth-form.tsx`
- `src/lib/api-client.ts`
- `tests/unit/auth.test.ts`
- `src/hooks/use-session.ts`
- `config/database.yml`
- `src/middleware/rate-limiter.ts`
- etc.

### Edit snippets (~20 entries)
Each has: file path, description, 3-8 lines of realistic code additions/removals.
Topics: refactor function, fix bug, add error handling, extract component, rename variable, add type annotation, optimize query, add validation.

### Read snippets (~10 entries)
Each has: file path, 3-5 lines of existing code shown.

### Bash commands (~15 entries)
Each has: command string, 1-3 lines of output.
Topics: `npm test`, `npm run build`, `git status`, `git diff --stat`, `npx tsc --noEmit`, `curl localhost:3000/health`.

### Write snippets (~10 entries)
Each has: file path, 5-10 lines of new file content.
Topics: test file, config file, new component, utility function.

### Response texts (~20 entries)
1-2 sentence summaries of what was done. e.g. "I've extracted the validation logic into a shared utility and updated both call sites.", "The failing test was caused by a stale mock — I've updated it to match the new API response shape."

## Speed Scaling

All timing delays are divided by a FLOPS scale factor:

```
flopScale = max(1, 1 + log10(max(1, flops)) / 3)
```

| FLOPS | Scale | Effect |
|-------|-------|--------|
| 1K | ~1.3x | Slightly faster than base |
| 100K | ~2.7x | Noticeably quick |
| 10M | ~3.3x | Fast |
| 1B | ~4x | Very fast |
| 100B | ~4.7x | Near-instant |

### Base delays (before scaling)

| Phase | Base delay |
|-------|-----------|
| Thinking duration | 1500-3000ms |
| Line stream (per line) | 80-150ms |
| Word stream (per word in response) | 30-60ms |
| Inter-tool pause | 300-600ms |
| Post-completion → next auto-prompt | 800-1500ms |

## Player Interaction

### Input always enabled
The input field is never disabled. Player can type at any time.

### Submit behavior
- **Enter with text + AI idle:** Show as `user_prompt`, start AI response
- **Enter with text + AI busy:** Show as `queued_prompt` with yellow "Queued" badge. When current response finishes, process queue FIFO.
- **Enter empty:** Show blank prompt line (terminal reprompt)
- **`!` prefix:** Shell command, unchanged from current behavior

### Prompt queue
- Queue is an array of strings
- Auto-prompts only fire when queue is empty AND AI is idle
- Player prompts have priority over auto-prompts
- Queued prompts shown in log immediately with "Queued" badge
- When AI finishes, badge disappears and response begins

## Prompt Sources

### Auto-prompts (~20 entries)
Realistic coding prompts:
- "Refactor the attention mechanism"
- "Add chain-of-thought reasoning"
- "Fix the alignment loss function"
- "Optimize the training loop"
- "Add error handling to the API client"
- "Write tests for the auth module"
- etc.

(Reuse and expand existing PROMPT_SUGGESTIONS)

### Player prompts
Whatever the player types. The AI response is cosmetic — it doesn't parse the player's text, just picks a random action pattern and content.

## Component Structure

### `cli-prompt.tsx` (rewrite)

**State:**
- `log: LogEntry[]` — all visible entries
- `phase: "idle" | "thinking" | "tool" | "responding" | "completing"` — current AI state
- `queue: string[]` — queued player prompts
- Current action sequence progress (which step in the pattern)

**No game metrics displayed.** No LoC/s, no token counts, no production rates. The completion line shows fake cost/time for flavor only.

### Content data file

New file: `apps/game/src/components/cli-prompt-content.ts`

Contains all the content pools (file paths, edit snippets, bash commands, response texts). Separate from the component for maintainability.

## What stays the same

- The `❯` prompt character
- The input bar at the bottom with the same styling
- The scrollable log area
- The `!command` shell integration
- Auto-scroll behavior
- The existing theme integration (useIdeTheme)

## What changes

- Remove: diff line rendering, LoC/token counts, diff snippet system
- Remove: `DiffSnippet`, `DiffLine`, `pickDiffSnippet` imports
- Add: tool badge rendering, thinking spinner, word-by-word streaming
- Add: prompt queue with "Queued" badge
- Add: content pool data file
- Rewrite: `startPrompt` → sequence-based action runner
- Rewrite: streaming effect → multi-phase (think → tools → respond)

## Files to change

| File | Change |
|------|--------|
| `apps/game/src/components/cli-prompt.tsx` | Full rewrite of rendering + state machine |
| `apps/game/src/components/cli-prompt-content.ts` | New — content pools |
| `apps/game/src/components/diff-snippets.ts` | Can be deleted if nothing else imports it |
