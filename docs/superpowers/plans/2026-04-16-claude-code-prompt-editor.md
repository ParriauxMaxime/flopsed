# Claude Code-style Prompt Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the T4+ prompt editor with a purely cosmetic Claude Code-style terminal. Speed scales with FLOPS. Player can always type. Queued prompts when AI is busy.

**Architecture:** New content data file with curated snippets. Full rewrite of cli-prompt.tsx with a multi-phase state machine (idle → thinking → tool sequence → responding → completing). Content pools provide realistic file paths, code edits, bash commands, and response texts.

**Tech Stack:** React 19, Emotion CSS-in-JS, Zustand (game store for FLOPS)

---

### Task 1: Create content pool data file

**Files:**
- Create: `apps/game/src/components/cli-prompt-content.ts`

- [ ] **Step 1: Create the content pools file**

All curated content: file paths, action patterns, edit/read/write/bash snippets, response texts, auto-prompts.

- [ ] **Step 2: Typecheck**
- [ ] **Step 3: Commit**

---

### Task 2: Rewrite cli-prompt.tsx

**Files:**
- Rewrite: `apps/game/src/components/cli-prompt.tsx`

- [ ] **Step 1: Rewrite the full component**

New state machine:
- `phase`: idle | thinking | executing | responding | completing
- `queue`: string[] for queued player prompts
- `actionSteps`: current sequence of tool actions to execute
- `stepIndex`: which step in the current action sequence

Log entry types: user_prompt, queued_prompt, thinking, tool_header, tool_content, tool_result, response_text, completion, bash_command, bash_output, blank.

Tool badges: colored inline elements (Read=blue, Edit=green, Write=purple, Bash=orange).

Speed: all delays divided by `flopScale = max(1, 1 + log10(max(1, flops)) / 3)`.

Player input: always enabled, queues when busy, empty enter shows blank prompt.

- [ ] **Step 2: Typecheck**
- [ ] **Step 3: Verify biome passes**
- [ ] **Step 4: Commit**

---

### Task 3: Cleanup old diff snippets

**Files:**
- Delete (if unused): `apps/game/src/components/diff-snippets.ts`

- [ ] **Step 1: Check if diff-snippets.ts is imported anywhere else**
- [ ] **Step 2: Delete if safe**
- [ ] **Step 3: Commit**

---

### Task 4: Smoke test

- [ ] **Step 1: Run `npm run dev`, reach T4, verify prompt editor**
- [ ] **Step 2: Verify player can type during streaming**
- [ ] **Step 3: Verify queued prompts show with badge**
- [ ] **Step 4: Verify speed increases with FLOPS**
