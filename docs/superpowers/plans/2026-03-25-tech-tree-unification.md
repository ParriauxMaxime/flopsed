# Tech Tree Unification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the game's custom SVG tech tree with React Flow, sharing the same `TechNodeComponent` as the editor so positions and appearance are identical.

**Architecture:** Add a `NodeStateEnum` and game-specific data props to the shared `TechNodeComponent` in design-system. Rewrite the game's tech-tree-page to use React Flow + `useTechTreeFlow` hook. The popover stays game-specific. The editor passes `state: "visible"` for all nodes.

**Tech Stack:** React Flow (@xyflow/react), Emotion CSS-in-JS, Zustand, ts-pattern

**Spec:** `docs/superpowers/specs/2026-03-25-tech-tree-unification-design.md`

---

### Task 1: Add `NodeStateEnum` and extend `TechNodeComponent`

**Files:**
- Modify: `libs/design-system/tech-tree/types.ts`
- Modify: `libs/design-system/tech-tree/tech-node.tsx`
- Modify: `libs/design-system/index.ts`

- [ ] **Step 1: Add `NodeStateEnum` to types**

In `libs/design-system/tech-tree/types.ts`, add:

```typescript
export const NodeStateEnum = {
	locked: "locked",
	visible: "visible",
	affordable: "affordable",
	owned: "owned",
} as const;

export type NodeStateEnum = (typeof NodeStateEnum)[keyof typeof NodeStateEnum];
```

- [ ] **Step 2: Export `NodeStateEnum` from design-system**

In `libs/design-system/index.ts`, add to exports:

```typescript
export { NodeStateEnum } from "./tech-tree/types";
```

- [ ] **Step 3: Extend `TechNodeComponent` with state-based visuals**

Rewrite `libs/design-system/tech-tree/tech-node.tsx`. The component reads `state`, `owned`, and `costLabel` from `data` alongside the existing fields. Visual mapping:

- `locked` — opacity 0.4, border `#1e2630`
- `visible` — opacity 0.6, border `#1e2630`
- `affordable` — opacity 1, border `#58a6ff`, cursor pointer
- `owned` — opacity 0.8, border `#3fb950`
- Default (no state, e.g. editor) — opacity 1, border by currency color (current behavior)

The subtitle line shows:
- If `owned` and `max` are in data: `"Researched"` (if max===1 and owned>=max), or `"{owned}/{max}"`
- Otherwise: `"{baseCost} {currency}"` (current editor behavior)

```typescript
import { css } from "@emotion/react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { match } from "ts-pattern";
import { NodeStateEnum } from "./types";

function getCurrencyColor(currency: string): string {
	return match(currency)
		.with("cash", () => "#6272a4")
		.with("loc", () => "#8be9fd")
		.with("flops", () => "#c678dd")
		.otherwise(() => "#8892b0");
}

function getStateStyle(state: NodeStateEnum | undefined, currency: string, selected: boolean) {
	if (!state) {
		// Editor mode — current behavior
		return { borderColor: selected ? "#ffffff" : getCurrencyColor(currency), opacity: 1, cursor: "grab" as const };
	}
	return match(state)
		.with(NodeStateEnum.locked, () => ({ borderColor: "#1e2630", opacity: 0.4, cursor: "default" as const }))
		.with(NodeStateEnum.visible, () => ({ borderColor: "#1e2630", opacity: 0.6, cursor: "default" as const }))
		.with(NodeStateEnum.affordable, () => ({ borderColor: "#58a6ff", opacity: 1, cursor: "pointer" as const }))
		.with(NodeStateEnum.owned, () => ({ borderColor: "#3fb950", opacity: 0.8, cursor: "default" as const }))
		.exhaustive();
}

// ... styles and component rendering
```

The component structure stays the same: icon + name row, subtitle row, top/bottom handles.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/design-system/tech-tree/types.ts libs/design-system/tech-tree/tech-node.tsx libs/design-system/index.ts
git commit -m "✨ Add NodeStateEnum and game state visuals to TechNodeComponent"
```

---

### Task 2: Update the editor to pass `state` prop

**Files:**
- Modify: `apps/editor/src/pages/tech-tree/tech-tree-page.tsx`

- [ ] **Step 1: Pass `state: undefined` through `useTechTreeFlow`**

The editor doesn't use game states. Since `TechNodeComponent` defaults to editor behavior when `state` is undefined, no changes are needed in the editor's data flow. However, verify that `useTechTreeFlow`'s `toFlowNodes` spreads `...n` into `data`, so the node data is available.

Check `libs/design-system/tech-tree/use-tech-tree-flow.ts` line 23: `data: { ...n }`. This spreads all TechNode fields into the React Flow node data. Since there's no `state` field on editor nodes, `data.state` will be `undefined`, which triggers the editor-mode default in `getStateStyle`. No changes needed.

- [ ] **Step 2: Run typecheck and verify editor still works**

Run: `npm run typecheck`
Run: `npm run editor` and check the tech tree page in the browser — nodes should look the same as before.

- [ ] **Step 3: Commit** (only if any changes were needed)

---

### Task 3: Rewrite the game's tech tree page with React Flow

This is the main task. Replace the entire SVG renderer with React Flow.

**Files:**
- Modify: `apps/game/src/components/tech-tree-page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the file**

The new file uses React Flow with `TechNodeComponent` from design-system. Key structure:

```typescript
import {
	Background,
	Controls,
	MiniMap,
	ReactFlow,
	type Node,
	type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { css } from "@emotion/react";
import { TechNodeComponent, NodeStateEnum } from "@flopsed/design-system";
import type { TechNode } from "@modules/game";
import { allTechNodes, getTechNodeCost, useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useCallback, useMemo, useRef, useState } from "react";
```

**Node types registration:**
```typescript
const nodeTypes = { techNode: TechNodeComponent };
```

**Node state computation** — a function that maps game state to React Flow nodes:

```typescript
function buildFlowNodes(
	techNodes: TechNode[],
	ownedTechNodes: Record<string, number>,
	loc: number,
	cash: number,
): Node[] {
	const nodes: Node[] = [];
	for (const n of techNodes) {
		const owned = ownedTechNodes[n.id] ?? 0;
		const maxed = owned >= n.max;
		const prereqsMet =
			n.requires.length === 0 ||
			n.requires.every((id) => (ownedTechNodes[id] ?? 0) > 0);

		// Hide locked nodes
		if (!prereqsMet) continue;

		const cost = getTechNodeCost(n, owned);
		const useLoc = n.currency === "loc";
		const canAfford = useLoc ? loc >= cost : cash >= cost;

		let state: NodeStateEnum;
		if (maxed) state = NodeStateEnum.owned;
		else if (canAfford) state = NodeStateEnum.affordable;
		else state = NodeStateEnum.visible;

		nodes.push({
			id: n.id,
			type: "techNode",
			position: { x: n.x ?? 0, y: n.y ?? 0 },
			data: { ...n, state, owned },
		});
	}
	return nodes;
}
```

**Edge computation** — only show edges where both source and target are visible:

```typescript
function buildFlowEdges(
	techNodes: TechNode[],
	ownedTechNodes: Record<string, number>,
): Edge[] {
	const edges: Edge[] = [];
	for (const n of techNodes) {
		const prereqsMet =
			n.requires.length === 0 ||
			n.requires.every((id) => (ownedTechNodes[id] ?? 0) > 0);
		if (!prereqsMet) continue;

		for (const req of n.requires) {
			edges.push({
				id: `${req}->${n.id}`,
				source: req,
				target: n.id,
				style: { stroke: "#1e2630", strokeWidth: 2, opacity: 0.6 },
			});
		}
	}
	return edges;
}
```

**Popover** — keep the existing `NodePopover` component nearly as-is, but position it based on React Flow node click events instead of SVG bounding rects. Use the `onNodeClick` callback to get the node ID, then use a ref + absolute positioning. Alternatively, show popover on hover using `onNodeMouseEnter`/`onNodeMouseLeave`.

The popover positioning changes: instead of using `getBoundingClientRect()` from SVG, use the React Flow internal node position + the React Flow viewport transform. The simplest approach: keep the popover as a game-only component rendered outside React Flow, positioned via a ref to the container + the event's client coordinates.

```typescript
const handleNodeClick = useCallback(
	(_e: React.MouseEvent, node: Node) => {
		const techNode = allTechNodes.find((n) => n.id === node.id);
		if (!techNode) return;
		const owned = ownedTechNodes[techNode.id] ?? 0;
		const maxed = owned >= techNode.max;
		const cost = getTechNodeCost(techNode, owned);
		const useLoc = techNode.currency === "loc";
		const canAfford = useLoc ? loc >= cost : cash >= cost;

		if (!maxed && canAfford) {
			researchNode(techNode);
		}
	},
	[ownedTechNodes, loc, cash, researchNode],
);
```

**Popover on hover** — use `onNodeMouseEnter` / `onNodeMouseLeave`:

```typescript
const handleNodeMouseEnter = useCallback(
	(e: React.MouseEvent, node: Node) => {
		const techNode = allTechNodes.find((n) => n.id === node.id);
		if (techNode && containerRef.current) {
			const containerRect = containerRef.current.getBoundingClientRect();
			setHovered({
				node: techNode,
				x: e.clientX - containerRect.left + 12,
				y: e.clientY - containerRect.top,
			});
		}
	},
	[],
);
```

**Container styles** — match current game background:

```typescript
const containerCss = css({
	flex: 1,
	position: "relative",
	background: "#0d1117",
	// Override React Flow's default background
	".react-flow__background": { background: "#0d1117" },
});
```

**Full render:**

```tsx
return (
	<div ref={containerRef} css={containerCss}>
		<ReactFlow
			nodes={flowNodes}
			edges={flowEdges}
			nodeTypes={nodeTypes}
			onNodeClick={handleNodeClick}
			onNodeMouseEnter={handleNodeMouseEnter}
			onNodeMouseLeave={() => setHovered(null)}
			fitView
			nodesDraggable={false}
			nodesConnectable={false}
			elementsSelectable={false}
			panOnDrag
			zoomOnScroll
		>
			<Background gap={20} color="#1e2630" />
			<Controls showInteractive={false} />
		</ReactFlow>

		{/* Popover */}
		{hovered && (
			<NodePopover node={hovered.node} x={hovered.x} y={hovered.y} />
		)}
	</div>
);
```

**Popover component** — simplified from the original (no more SVG rect positioning):

```typescript
interface PopoverProps {
	node: TechNode;
	x: number;
	y: number;
}

function NodePopover({ node, x, y }: PopoverProps) {
	// ... same content as current popover, but positioned via style={{ left: x, top: y }}
}
```

The `flowNodes` and `flowEdges` are recomputed via `useMemo` whenever game state changes:

```typescript
const flowNodes = useMemo(
	() => buildFlowNodes(allTechNodes, ownedTechNodes, loc, cash),
	[ownedTechNodes, loc, cash],
);

const flowEdges = useMemo(
	() => buildFlowEdges(allTechNodes, ownedTechNodes),
	[ownedTechNodes],
);
```

Delete entirely from this file: `computeLayout`, `usePanZoom`, `SvgNode`, `EdgePath`, `LayoutNode`, `LayoutEdge`, `TreeLayout`, and all SVG-related constants (`NODE_W`, `NODE_H`, etc.).

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Run biome check on changed file**

Run: `npx biome check --fix apps/game/src/components/tech-tree-page.tsx`

- [ ] **Step 4: Manual test**

Run: `npm run dev`
1. Open `http://localhost:3000`
2. Tech tree tab should show nodes using React Flow
3. Nodes should match editor appearance (same sizing, same colors)
4. Hovering shows popover
5. Clicking affordable nodes researches them
6. Locked nodes are hidden
7. Pan and zoom work via React Flow built-in controls

- [ ] **Step 5: Commit**

```bash
git add apps/game/src/components/tech-tree-page.tsx
git commit -m "♻️ Replace game tech tree SVG with React Flow, unify with editor"
```

---

### Task 4: Verify and polish

**Files:**
- Possibly: `apps/game/src/components/tech-tree-page.tsx` (minor fixes)

- [ ] **Step 1: Check edge appearance**

React Flow default edges may look different from the game's straight lines. If needed, set `type: "straight"` on edges in `buildFlowEdges`:

```typescript
edges.push({
	id: `${req}->${n.id}`,
	source: req,
	target: n.id,
	type: "straight",
	style: { stroke: "#1e2630", strokeWidth: 2, opacity: 0.6 },
});
```

- [ ] **Step 2: Check React Flow CSS doesn't clash with game styles**

The `@xyflow/react/dist/style.css` import adds global styles. Verify it doesn't affect other game panels. If it does, scope the import or override specific styles in `containerCss`.

- [ ] **Step 3: Verify editor positions match game**

1. Open editor at `http://localhost:3738`, go to Tech Tree page
2. Note node positions
3. Open game at `http://localhost:3000`, go to tech tree tab
4. Positions should be identical

- [ ] **Step 4: Run full checks**

Run: `npm run typecheck && npm run check`
Fix any biome issues with: `npm run check:fix`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "✨ Complete tech tree unification between game and editor"
```
