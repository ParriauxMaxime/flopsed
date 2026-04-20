# Spotlight Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-step spotlight overlay system that dims the UI, highlights a target element, and shows a themed tooltip with a "Got it →" button to guide non-dev beta testers through the core loop.

**Architecture:** A `SpotlightStep` type is added to `ui-store.ts` with `activeSpotlight` state and `showSpotlight` / `dismissSpotlight` actions. A new `SpotlightOverlay` component renders as a React portal, queries the spotlight target via `data-spotlight` DOM attribute, and positions a tooltip using `getBoundingClientRect`. Three DOM elements get `data-spotlight` attributes. The existing `useTutorialTriggers` hook gains `showSpotlight` calls alongside each relevant `showTip` call.

**Tech Stack:** React 19, Emotion (`css` prop), Zustand, `react-i18next`, `createPortal`

---

### Task 1: Add SpotlightStep type and store fields

**Files:**
- Modify: `apps/game/src/modules/game/store/ui-store.ts`

- [ ] **Step 1: Add the `SpotlightStep` type and new interface fields**

In `apps/game/src/modules/game/store/ui-store.ts`, add after the `PaneEnum` block (after line 34) and update `UiState`:

```typescript
export type SpotlightStep = {
	id: string;       // seen-tips key (e.g. "spotlight_editor")
	targetId: string; // matches data-spotlight="<targetId>" on the DOM element
	titleKey: string; // i18n key in tutorial namespace
	bodyKey: string;
};
```

In the `UiState` interface (after `seenTips: string[];`, around line 51), add:

```typescript
activeSpotlight: SpotlightStep | null;
showSpotlight: (step: SpotlightStep) => void;
dismissSpotlight: () => void;
```

- [ ] **Step 2: Add the initial state value**

In the `create<UiState>()` call, after `seenTips: [],` (around line 117), add:

```typescript
activeSpotlight: null,
```

- [ ] **Step 3: Add the action implementations**

After the `showTip` implementation (after line 271), add:

```typescript
showSpotlight: (step) => {
	const { seenTips } = get();
	if (seenTips.includes(step.id)) return;
	set({ activeSpotlight: step });
},
dismissSpotlight: () => {
	const { activeSpotlight } = get();
	if (!activeSpotlight) return;
	get().showTip(activeSpotlight.id);
	set({ activeSpotlight: null });
},
```

- [ ] **Step 4: Reset activeSpotlight in resetAll**

In the `resetAll` action (around line 278), add `activeSpotlight: null,` to the `set({...})` call.

- [ ] **Step 5: Do NOT add activeSpotlight to partialize**

`activeSpotlight` is transient UI state — it must not be persisted to localStorage. Confirm it is absent from the `partialize` object (around line 306).

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /home/maxime/Documents/emergence/flopsed && npm run typecheck 2>&1 | head -30
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add apps/game/src/modules/game/store/ui-store.ts
git commit -m "✨ Add SpotlightStep type and activeSpotlight store fields"
```

---

### Task 2: Add DOM anchor attributes to target elements

**Files:**
- Modify: `apps/game/src/modules/editor/components/editor.tsx:320`
- Modify: `apps/game/src/components/stats-execute-bar.tsx:171`
- Modify: `libs/design-system/tech-tree/tech-node.tsx:173`

- [ ] **Step 1: Add `data-spotlight="editor"` to the editor scroll container**

In `apps/game/src/modules/editor/components/editor.tsx`, the `Editor` component's return starts at line 318. The scroll container at line 320 is:

```tsx
<div
  css={themedEditorCss}
  ref={editorRef}
  tabIndex={0}
  onScroll={onScroll}
>
```

Add `data-spotlight="editor"`:

```tsx
<div
  css={themedEditorCss}
  ref={editorRef}
  tabIndex={0}
  onScroll={onScroll}
  data-spotlight="editor"
>
```

- [ ] **Step 2: Add `data-spotlight="execute-button"` to StatsExecuteBar wrapper**

In `apps/game/src/components/stats-execute-bar.tsx`, the return wrapper div at line 171:

```tsx
return (
  <div
    style={{
      padding: "8px 12px",
      borderTop: `1px solid ${theme.border}`,
      flexShrink: 0,
    }}
  >
```

Add the attribute:

```tsx
return (
  <div
    data-spotlight="execute-button"
    style={{
      padding: "8px 12px",
      borderTop: `1px solid ${theme.border}`,
      flexShrink: 0,
    }}
  >
```

- [ ] **Step 3: Add `data-spotlight="stats-unlock-node"` to the unlock_stats_panel tech node**

In `libs/design-system/tech-tree/tech-node.tsx`, update `TechNodeComponent` to destructure `id` from `NodeProps` and conditionally add the attribute. The function signature at line 173:

```tsx
export function TechNodeComponent({ data, selected }: NodeProps) {
```

Change to:

```tsx
export function TechNodeComponent({ data, selected, id }: NodeProps) {
```

Then on the root `div` returned at line 201, add the conditional attribute:

```tsx
return (
  <div
    {...(id === "unlock_stats_panel" ? { "data-spotlight": "stats-unlock-node" } : {})}
    css={css({
      background: style.background,
      border: `2px solid ${style.borderColor}`,
      borderRadius: 8,
      padding: "6px 8px",
      width: TECH_NODE_WIDTH,
      height: TECH_NODE_HEIGHT,
      boxSizing: "border-box",
      overflow: "hidden",
      cursor: style.cursor,
      opacity: style.opacity,
      filter: style.filter,
      transition:
        "opacity 0.2s, border-color 0.2s, filter 0.2s, box-shadow 0.2s",
      position: "relative",
      boxShadow: `0 1px 3px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.04)`,
    })}
  >
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/maxime/Documents/emergence/flopsed && npm run typecheck 2>&1 | head -30
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add apps/game/src/modules/editor/components/editor.tsx \
        apps/game/src/components/stats-execute-bar.tsx \
        libs/design-system/tech-tree/tech-node.tsx
git commit -m "✨ Add data-spotlight DOM anchors to editor, execute button, and stats-unlock node"
```

---

### Task 3: Create SpotlightOverlay component

**Files:**
- Create: `apps/game/src/components/spotlight-overlay.tsx`

- [ ] **Step 1: Create the component file**

Create `apps/game/src/components/spotlight-overlay.tsx`:

```tsx
import { css } from "@emotion/react";
import { useUiStore } from "@modules/game";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useIdeTheme } from "../hooks/use-ide-theme";

interface TargetRect {
	top: number;
	left: number;
	width: number;
	height: number;
}

const TOOLTIP_WIDTH = 280;
const TOOLTIP_FLIP_THRESHOLD = 148; // min px below target before flipping above

export function SpotlightOverlay() {
	const activeSpotlight = useUiStore((s) => s.activeSpotlight);
	const dismissSpotlight = useUiStore((s) => s.dismissSpotlight);
	const theme = useIdeTheme();
	const { t } = useTranslation("tutorial");
	const [rect, setRect] = useState<TargetRect | null>(null);
	const [flipped, setFlipped] = useState(false);
	const tooltipRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!activeSpotlight) {
			setRect(null);
			return;
		}

		const el = document.querySelector(
			`[data-spotlight="${activeSpotlight.targetId}"]`,
		);
		if (!el) {
			setRect(null);
			return;
		}

		const measure = () => {
			const r = el.getBoundingClientRect();
			const next = { top: r.top, left: r.left, width: r.width, height: r.height };
			setRect(next);
			setFlipped(window.innerHeight - r.bottom < TOOLTIP_FLIP_THRESHOLD);
		};

		measure();

		const ro = new ResizeObserver(measure);
		ro.observe(el);
		window.addEventListener("resize", measure);

		return () => {
			ro.disconnect();
			window.removeEventListener("resize", measure);
		};
	}, [activeSpotlight]);

	if (!activeSpotlight || !rect) return null;

	const holeStyle: React.CSSProperties = {
		position: "fixed",
		top: rect.top,
		left: rect.left,
		width: rect.width,
		height: rect.height,
		boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
		borderRadius: 4,
		pointerEvents: "none",
		zIndex: 9998,
	};

	const clampedLeft = Math.max(
		8,
		Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH - 8),
	);
	const tooltipH = tooltipRef.current?.offsetHeight ?? 120;
	const tooltipTop = flipped
		? rect.top - tooltipH - 8
		: rect.top + rect.height + 8;

	const tooltipStyle: React.CSSProperties = {
		position: "fixed",
		top: tooltipTop,
		left: clampedLeft,
		width: TOOLTIP_WIDTH,
		background: theme.sidebarBg,
		border: `1px solid ${theme.accent}`,
		borderRadius: 6,
		padding: "10px 14px",
		zIndex: 9999,
		boxShadow: `0 4px 16px rgba(0,0,0,0.4)`,
		fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
	};

	const arrowSize = 6;
	const arrowLeft = Math.max(
		arrowSize * 2,
		Math.min(rect.left + rect.width / 2 - clampedLeft - arrowSize, TOOLTIP_WIDTH - arrowSize * 4),
	);

	const arrowStyle: React.CSSProperties = {
		position: "absolute",
		left: arrowLeft,
		width: 0,
		height: 0,
		...(flipped
			? {
					bottom: -arrowSize,
					borderLeft: `${arrowSize}px solid transparent`,
					borderRight: `${arrowSize}px solid transparent`,
					borderTop: `${arrowSize}px solid ${theme.accent}`,
				}
			: {
					top: -arrowSize,
					borderLeft: `${arrowSize}px solid transparent`,
					borderRight: `${arrowSize}px solid transparent`,
					borderBottom: `${arrowSize}px solid ${theme.accent}`,
				}),
	};

	return createPortal(
		<>
			{/* Click-through backdrop blocker (prevents interacting with game while spotlight is active) */}
			<div
				css={css({ position: "fixed", inset: 0, zIndex: 9997 })}
				onClick={dismissSpotlight}
				onKeyDown={undefined}
			/>
			{/* Spotlight hole — box-shadow creates the dim effect */}
			<div style={holeStyle} />
			{/* Tooltip */}
			<div ref={tooltipRef} style={tooltipStyle}>
				<div style={arrowStyle} />
				<div
					css={css({
						fontWeight: 600,
						fontSize: 13,
						marginBottom: 6,
						lineHeight: 1.3,
					})}
					style={{ color: theme.accent }}
				>
					{t(activeSpotlight.titleKey)}
				</div>
				<div
					css={css({ fontSize: 12, lineHeight: 1.6, marginBottom: 10 })}
					style={{ color: theme.foreground }}
				>
					{t(activeSpotlight.bodyKey)}
				</div>
				<div css={css({ display: "flex", justifyContent: "flex-end" })}>
					<button
						type="button"
						onClick={dismissSpotlight}
						css={css({
							fontSize: 12,
							padding: "5px 14px",
							borderRadius: 4,
							cursor: "pointer",
							fontFamily: "inherit",
							fontWeight: 600,
							transition: "opacity 0.15s",
							"&:hover": { opacity: 0.85 },
						})}
						style={{
							background: theme.accent,
							border: `1px solid ${theme.accent}`,
							color: theme.background,
						}}
					>
						{t("spotlight_got_it", { defaultValue: "Got it →" })}
					</button>
				</div>
			</div>
		</>,
		document.body,
	);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/maxime/Documents/emergence/flopsed && npm run typecheck 2>&1 | head -30
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/spotlight-overlay.tsx
git commit -m "✨ Add SpotlightOverlay portal component"
```

---

### Task 4: Wire spotlight triggers and mount overlay in App

**Files:**
- Modify: `apps/game/src/components/tutorial-screen.tsx`
- Modify: `apps/game/src/app.tsx`

- [ ] **Step 1: Add showSpotlight calls to useTutorialTriggers**

In `apps/game/src/components/tutorial-screen.tsx`, update `useTutorialTriggers` (starts at line 68).

Import `SpotlightStep` at the top — add to the existing `useUiStore` import line (line 2):

```typescript
import { useGameStore, useUiStore } from "@modules/game";
import type { SpotlightStep } from "@modules/game";
```

Wait — `SpotlightStep` is exported from `ui-store.ts` which is re-exported via `@modules/game`. Verify by checking `apps/game/src/modules/game/index.ts` exports. If `SpotlightStep` isn't re-exported, add it to that index file.

Check the game module index:

```bash
grep -n "SpotlightStep\|ui-store" apps/game/src/modules/game/index.ts
```

If `SpotlightStep` is not exported, add it. If `ui-store` re-exports via a wildcard, it's already available. Either way, ensure `SpotlightStep` is importable from `@modules/game`.

Then in `useTutorialTriggers`, after the `pushTutorial` function definition, add a `showSpotlight` helper:

```typescript
const showSpotlightIfNew = (step: SpotlightStep) => {
  const uiState = useUiStore.getState();
  if (!uiState.seenTips.includes(step.id)) {
    uiState.showSpotlight(step);
  }
};
```

Then update the subscribe callback to call `showSpotlightIfNew` for the three relevant triggers:

```typescript
const unsub = useGameStore.subscribe((state) => {
  const uiState = useUiStore.getState();
  for (const trigger of triggers) {
    if (uiState.seenTips.includes(trigger.id)) continue;
    if (trigger.test(state)) {
      uiState.showTip(trigger.id);
      if (trigger.id === "tech_tree_intro" && !uiState.splitEnabled) {
        uiState.toggleSplit();
      }
      pushTutorial(trigger.id, trigger.i18nKey);

      // Spotlight for discoverability
      if (trigger.id === "sidebar_intro") {
        showSpotlightIfNew({
          id: "spotlight_stats_unlock",
          targetId: "stats-unlock-node",
          titleKey: "spotlight_stats_unlock_title",
          bodyKey: "spotlight_stats_unlock_body",
        });
      }
      if (trigger.id === "execution_intro") {
        showSpotlightIfNew({
          id: "spotlight_execute",
          targetId: "execute-button",
          titleKey: "spotlight_execute_title",
          bodyKey: "spotlight_execute_body",
        });
      }
      break;
    }
  }
});
```

Also update the initial welcome check (lines 103-108) to show the editor spotlight:

```typescript
const uiState = useUiStore.getState();
if (!uiState.seenTips.includes("welcome")) {
  uiState.showTip("welcome");
  pushTutorial("welcome", "welcome");
  showSpotlightIfNew({
    id: "spotlight_editor",
    targetId: "editor",
    titleKey: "spotlight_editor_title",
    bodyKey: "spotlight_editor_body",
  });
}
```

- [ ] **Step 2: Mount SpotlightOverlay in App**

In `apps/game/src/app.tsx`, add the import near the other component imports at the top:

```typescript
import { SpotlightOverlay } from "@components/spotlight-overlay";
```

In the `App` function's return, add `<SpotlightOverlay />` just before the closing `</>` (after `<EventToast />` and the singularity block, around line 1491):

```tsx
<SpotlightOverlay />
```

Full tail of the return should look like:

```tsx
      <EventToast />
      {singularity && (
        <Suspense fallback={null}>
          <SingularitySequence animate={singularityAnimate} />
        </Suspense>
      )}
      <SpotlightOverlay />
    </>
  );
}
```

- [ ] **Step 3: Check game module index exports SpotlightStep**

```bash
grep -n "SpotlightStep\|ui-store" apps/game/src/modules/game/index.ts
```

If `SpotlightStep` is not exported, add to `apps/game/src/modules/game/index.ts`:

```typescript
export type { SpotlightStep } from "./store/ui-store";
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/maxime/Documents/emergence/flopsed && npm run typecheck 2>&1 | head -30
```

Expected: zero errors.

- [ ] **Step 5: Verify lint**

```bash
cd /home/maxime/Documents/emergence/flopsed && npm run check 2>&1 | tail -20
```

If errors, run `npm run check:fix`.

- [ ] **Step 6: Commit**

```bash
git add apps/game/src/components/tutorial-screen.tsx \
        apps/game/src/app.tsx \
        apps/game/src/modules/game/index.ts
git commit -m "✨ Wire spotlight triggers and mount SpotlightOverlay"
```

---

### Task 5: Add i18n strings for all 8 locales

**Files:**
- Modify: `apps/game/src/i18n/locales/en/tutorial.json`
- Modify: `apps/game/src/i18n/locales/fr/tutorial.json`
- Modify: `apps/game/src/i18n/locales/de/tutorial.json`
- Modify: `apps/game/src/i18n/locales/it/tutorial.json`
- Modify: `apps/game/src/i18n/locales/es/tutorial.json`
- Modify: `apps/game/src/i18n/locales/pl/tutorial.json`
- Modify: `apps/game/src/i18n/locales/zh/tutorial.json`
- Modify: `apps/game/src/i18n/locales/ru/tutorial.json`

- [ ] **Step 1: Add English keys**

In `apps/game/src/i18n/locales/en/tutorial.json`, add before the closing `}`:

```json
  "spotlight_editor_title": "Go on, write anything",
  "spotlight_editor_body": "Software engineers make it look hard. It's really easy. Type anywhere in agi.py — each keystroke generates Lines of Code.",
  "spotlight_stats_unlock_title": "Unlock your execution pipeline",
  "spotlight_stats_unlock_body": "You've got code piling up. Unlock the Execute panel to run it and turn LoC into cash.",
  "spotlight_execute_title": "Run your code",
  "spotlight_execute_body": "Hit Execute to process your queued Lines of Code. More FLOPS = more throughput = more cash.",
  "spotlight_got_it": "Got it →"
```

- [ ] **Step 2: Add French keys**

In `apps/game/src/i18n/locales/fr/tutorial.json`, add before the closing `}`:

```json
  "spotlight_editor_title": "Allez, écrivez n'importe quoi",
  "spotlight_editor_body": "Les ingénieurs font croire que coder est difficile. C'est vraiment simple. Tapez dans agi.py — chaque frappe génère des Lignes de Code.",
  "spotlight_stats_unlock_title": "Débloquez votre pipeline d'exécution",
  "spotlight_stats_unlock_body": "Votre code s'accumule. Débloquez le panneau Execute pour l'exécuter et convertir les LoC en cash.",
  "spotlight_execute_title": "Exécutez votre code",
  "spotlight_execute_body": "Appuyez sur Execute pour traiter vos Lignes de Code en file. Plus de FLOPS = plus de débit = plus de cash.",
  "spotlight_got_it": "Compris →"
```

- [ ] **Step 3: Add German keys**

In `apps/game/src/i18n/locales/de/tutorial.json`, add before the closing `}`:

```json
  "spotlight_editor_title": "Los, schreib irgendetwas",
  "spotlight_editor_body": "Entwickler tun so, als wäre Coding schwer. Es ist wirklich einfach. Tippe in agi.py — jeder Tastendruck erzeugt Lines of Code.",
  "spotlight_stats_unlock_title": "Entsperre deine Ausführungs-Pipeline",
  "spotlight_stats_unlock_body": "Dein Code häuft sich an. Entsperre das Execute-Panel, um ihn auszuführen und LoC in Cash umzuwandeln.",
  "spotlight_execute_title": "Führe deinen Code aus",
  "spotlight_execute_body": "Drücke Execute, um deine Lines of Code zu verarbeiten. Mehr FLOPS = mehr Durchsatz = mehr Cash.",
  "spotlight_got_it": "Verstanden →"
```

- [ ] **Step 4: Add Italian keys**

In `apps/game/src/i18n/locales/it/tutorial.json`, add before the closing `}`:

```json
  "spotlight_editor_title": "Dai, scrivi qualcosa",
  "spotlight_editor_body": "I programmatori fanno sembrare la programmazione difficile. È davvero semplice. Digita in agi.py — ogni tasto genera Linee di Codice.",
  "spotlight_stats_unlock_title": "Sblocca la tua pipeline di esecuzione",
  "spotlight_stats_unlock_body": "Il tuo codice si accumula. Sblocca il pannello Execute per eseguirlo e convertire LoC in contanti.",
  "spotlight_execute_title": "Esegui il tuo codice",
  "spotlight_execute_body": "Premi Execute per elaborare le Linee di Codice in coda. Più FLOPS = più throughput = più contanti.",
  "spotlight_got_it": "Capito →"
```

- [ ] **Step 5: Add Spanish keys**

In `apps/game/src/i18n/locales/es/tutorial.json`, add before the closing `}`:

```json
  "spotlight_editor_title": "Venga, escribe lo que sea",
  "spotlight_editor_body": "Los ingenieros hacen parecer difícil programar. Es realmente fácil. Escribe en agi.py — cada tecla genera Líneas de Código.",
  "spotlight_stats_unlock_title": "Desbloquea tu pipeline de ejecución",
  "spotlight_stats_unlock_body": "Tu código se acumula. Desbloquea el panel Execute para ejecutarlo y convertir LoC en dinero.",
  "spotlight_execute_title": "Ejecuta tu código",
  "spotlight_execute_body": "Pulsa Execute para procesar tus Líneas de Código en cola. Más FLOPS = más rendimiento = más dinero.",
  "spotlight_got_it": "Entendido →"
```

- [ ] **Step 6: Add Polish keys**

In `apps/game/src/i18n/locales/pl/tutorial.json`, add before the closing `}`:

```json
  "spotlight_editor_title": "No dalej, napisz cokolwiek",
  "spotlight_editor_body": "Programiści sprawiają, że kodowanie wydaje się trudne. Jest naprawdę proste. Pisz w agi.py — każde naciśnięcie klawisza generuje Linie Kodu.",
  "spotlight_stats_unlock_title": "Odblokuj swój potok wykonania",
  "spotlight_stats_unlock_body": "Twój kod się gromadzi. Odblokuj panel Execute, aby go uruchomić i zamienić LoC w gotówkę.",
  "spotlight_execute_title": "Uruchom swój kod",
  "spotlight_execute_body": "Naciśnij Execute, aby przetworzyć Linie Kodu w kolejce. Więcej FLOPS = więcej przepustowości = więcej gotówki.",
  "spotlight_got_it": "Rozumiem →"
```

- [ ] **Step 7: Add Simplified Chinese keys**

In `apps/game/src/i18n/locales/zh/tutorial.json`, add before the closing `}`:

```json
  "spotlight_editor_title": "来，随便写点什么",
  "spotlight_editor_body": "工程师们让编程看起来很难。其实真的很简单。在 agi.py 里打字——每次按键都能生成代码行。",
  "spotlight_stats_unlock_title": "解锁你的执行流水线",
  "spotlight_stats_unlock_body": "你的代码正在堆积。解锁执行面板来运行代码，将 LoC 转化为现金。",
  "spotlight_execute_title": "运行你的代码",
  "spotlight_execute_body": "点击 Execute 处理队列中的代码行。更多 FLOPS = 更高吞吐量 = 更多现金。",
  "spotlight_got_it": "明白了 →"
```

- [ ] **Step 8: Add Russian keys**

In `apps/game/src/i18n/locales/ru/tutorial.json`, add before the closing `}`:

```json
  "spotlight_editor_title": "Давай, пиши что угодно",
  "spotlight_editor_body": "Программисты делают вид, что кодить сложно. На самом деле всё просто. Печатай в agi.py — каждое нажатие клавиши генерирует строки кода.",
  "spotlight_stats_unlock_title": "Разблокируй конвейер выполнения",
  "spotlight_stats_unlock_body": "Твой код накапливается. Разблокируй панель Execute, чтобы запустить его и превратить LoC в деньги.",
  "spotlight_execute_title": "Запусти свой код",
  "spotlight_execute_body": "Нажми Execute для обработки строк кода в очереди. Больше FLOPS = больше пропускной способности = больше денег.",
  "spotlight_got_it": "Понятно →"
```

- [ ] **Step 9: Verify build**

```bash
cd /home/maxime/Documents/emergence/flopsed && npm run build 2>&1 | tail -20
```

Expected: build succeeds, no JSON parse errors.

- [ ] **Step 10: Commit**

```bash
git add apps/game/src/i18n/locales/
git commit -m "🌍 Add spotlight onboarding i18n strings for all 8 locales"
```

---

### Task 6: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start dev server**

```bash
cd /home/maxime/Documents/emergence/flopsed && npm run dev
```

Open `http://localhost:3000`.

- [ ] **Step 2: Verify welcome spotlight (editor)**

On first load (fresh localStorage — open DevTools → Application → Storage → clear `flopsed-ui`), the editor spotlight should appear immediately: soft dim, agi.py editor highlighted, tooltip below with "Go on, write anything" title and "Got it →" button.

Confirm:
- Tooltip uses the active editor theme colors (border, title, button background)
- Clicking "Got it →" dismisses and does not reshow on reload
- Terminal tip still fires (terminal shows `tutorial.welcome()` block)

- [ ] **Step 3: Verify stats-unlock spotlight (after buying unlock_sidebar)**

In god mode or by playing to unlock the sidebar, the spotlight for `stats-unlock-node` should appear: the `unlock_stats_panel` tech tree node is highlighted in the tech tree panel.

Confirm:
- The tech tree pane must be visible (auto-split fires at `tech_tree_intro`)
- Node is correctly highlighted
- Terminal tip for `sidebar_intro` still fires

- [ ] **Step 4: Verify execute spotlight (after buying unlock_stats_panel)**

After buying `unlock_stats_panel`, the execute button spotlight fires: the stats execute bar wrapper is highlighted.

Confirm:
- Stats panel is open (auto-expands when unlocked)
- Execute button section is highlighted
- Tooltip reads "Run your code"

- [ ] **Step 5: Run balance sim to confirm no regressions**

```bash
cd /home/maxime/Documents/emergence/flopsed && npm run sim
```

Expected: all validation checks pass (exit 0).

- [ ] **Step 6: Run final lint check**

```bash
cd /home/maxime/Documents/emergence/flopsed && npm run check
```

Expected: no errors.
