# Stats Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tabbed right sidebar (Resources/Timeline/Graphs) with a single scrollable panel using IDE-style collapsible sections, git-graph purchase history, and per-section sparklines.

**Architecture:** Extract a shared `CollapsibleSection` component for all expandable areas. Rebuild `StatsPanel` as a single scrollable column with sections for Cash, LoC, Tokens (conditional), FLOPS, Tier Bar, History, and a sticky Execute footer. Delete the 3 tab-specific components and absorb their content into the new sections.

**Tech Stack:** React 19, Emotion CSS-in-JS (`css` prop), Zustand store selectors, `ts-pattern` for conditional rendering, existing `Sparkline` component, `react-i18next`.

**Spec:** `docs/superpowers/specs/2026-04-01-stats-panel-redesign-design.md`
**Mockup:** `.superpowers/brainstorm/999312-1775034495/content/sidebar-interactive-v3.html`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `apps/game/src/components/collapsible-section.tsx` | Shared IDE-style collapsible header + body with chevron animation |
| Create | `apps/game/src/components/stats-cash-section.tsx` | Cash value + optional sparkline |
| Create | `apps/game/src/components/stats-loc-section.tsx` | LoC value + rate + producer breakdown + produced/executed sparkline |
| Create | `apps/game/src/components/stats-tokens-section.tsx` | Tokens value + rate + AI model breakdown + sparkline |
| Create | `apps/game/src/components/stats-flops-section.tsx` | FLOPS value + exec/AI split bar + utilization sparkline |
| Create | `apps/game/src/components/stats-history.tsx` | Git-graph purchase log with collapsible overflow |
| Create | `apps/game/src/components/stats-tier-bar.tsx` | Tier progression horizontal bar |
| Create | `apps/game/src/components/stats-execute-bar.tsx` | Sticky execute button + auto toggle |
| Rewrite | `apps/game/src/components/stats-panel.tsx` | Single scrollable panel composing all sections |
| Delete | `apps/game/src/components/stats-panel-resources.tsx` | Content absorbed into new section components |
| Delete | `apps/game/src/components/stats-panel-timeline.tsx` | Tier bar + history extracted as separate components |
| Delete | `apps/game/src/components/stats-panel-graphs.tsx` | Sparklines moved into each section's collapsible body |
| Keep | `apps/game/src/components/sparkline.tsx` | Reused as-is inside section bodies |
| Modify | `apps/game/src/i18n/locales/en/ui.json` | Add new keys, remove tab keys |
| Modify | `apps/game/src/i18n/locales/{fr,it,de,es,pl,zh,ru}/ui.json` | Mirror i18n key changes |

---

## Task 1: Create CollapsibleSection Component

**Files:**
- Create: `apps/game/src/components/collapsible-section.tsx`

- [ ] **Step 1: Create the component file**

```tsx
import { css } from "@emotion/react";
import { type ReactNode, useCallback, useState } from "react";
import { useIdeTheme } from "../hooks/use-ide-theme";

interface CollapsibleSectionProps {
	icon: ReactNode;
	label: string;
	value: ReactNode;
	rate?: ReactNode;
	collapsible?: boolean;
	defaultOpen?: boolean;
	children?: ReactNode;
}

const sectionCss = css({
	flexShrink: 0,
});

const headerCss = css({
	display: "flex",
	alignItems: "center",
	padding: "0 14px",
	height: 54,
	userSelect: "none",
	transition: "background 0.1s",
});

const chevronCss = css({
	fontSize: 12,
	marginRight: 8,
	transition: "transform 0.15s ease",
	display: "inline-block",
	width: 14,
	textAlign: "center",
});

const spacerCss = css({ width: 22, flexShrink: 0 });

const labelCss = css({
	fontSize: 15,
	flex: 1,
	display: "flex",
	alignItems: "center",
	gap: 7,
	fontWeight: 500,
});

const iconCss = css({ fontSize: 16 });

const valueCss = css({
	fontSize: 22,
	fontWeight: "bold",
	fontVariantNumeric: "tabular-nums",
	lineHeight: 1.1,
});

const rateCss = css({
	fontSize: 12,
	fontVariantNumeric: "tabular-nums",
	marginTop: 2,
	opacity: 0.7,
});

const bodyCss = css({
	overflow: "hidden",
	transition: "max-height 0.2s ease, opacity 0.15s ease",
});

const bodyInnerCss = css({
	padding: "2px 12px 10px 32px",
	fontSize: 11,
});

export function CollapsibleSection({
	icon,
	label,
	value,
	rate,
	collapsible = false,
	defaultOpen = false,
	children,
}: CollapsibleSectionProps) {
	const theme = useIdeTheme();
	const [open, setOpen] = useState(defaultOpen);

	const handleClick = useCallback(() => {
		if (collapsible) setOpen((o) => !o);
	}, [collapsible]);

	return (
		<div css={sectionCss} style={{ borderBottom: `1px solid ${theme.border}` }}>
			<div
				css={headerCss}
				style={{
					cursor: collapsible ? "pointer" : "default",
				}}
				onClick={handleClick}
				onKeyDown={undefined}
			>
				{collapsible ? (
					<span
						css={chevronCss}
						style={{
							color: theme.lineNumbers,
							transform: open ? "rotate(90deg)" : "none",
						}}
					>
						▶
					</span>
				) : (
					<span css={spacerCss} />
				)}
				<span css={labelCss} style={{ color: theme.textMuted }}>
					<span css={iconCss}>{icon}</span>
					{label}
				</span>
				<div style={{ textAlign: "right" }}>
					<div css={valueCss}>{value}</div>
					{rate && <div css={rateCss}>{rate}</div>}
				</div>
			</div>
			{collapsible && children && (
				<div
					css={bodyCss}
					style={{
						maxHeight: open ? 400 : 0,
						opacity: open ? 1 : 0,
					}}
				>
					<div css={bodyInnerCss}>{children}</div>
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: No errors related to `collapsible-section.tsx`

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/collapsible-section.tsx
git commit -m "✨ Add CollapsibleSection component for stats panel redesign"
```

---

## Task 2: Create StatsCashSection

**Files:**
- Create: `apps/game/src/components/stats-cash-section.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useIdeTheme } from "../hooks/use-ide-theme";
import { CollapsibleSection } from "./collapsible-section";
import { RollingNumber } from "./rolling-number";
import { Sparkline } from "./sparkline";

export function StatsCashSection() {
	const { t } = useTranslation();
	const theme = useIdeTheme();
	const cash = useGameStore((s) => s.cash);
	const graphsUnlocked = useGameStore(
		(s) => (s.ownedTechNodes.unlock_perf_graphs ?? 0) > 0,
	);
	const rateSnapshots = useGameStore((s) => s.rateSnapshots);
	const tierTransitions = useGameStore((s) => s.tierTransitions);
	const sessionStartTime = useGameStore((s) => s.sessionStartTime);

	const elapsed = (performance.now() - sessionStartTime) / 1000;
	const cashData = useMemo(
		() => rateSnapshots.map((s) => s.cashPerSec),
		[rateSnapshots],
	);
	const latest = rateSnapshots[rateSnapshots.length - 1];

	return (
		<CollapsibleSection
			icon={<span style={{ color: theme.cashColor }}>$</span>}
			label={t("stats_panel.cash")}
			value={
				<RollingNumber
					value={`$${formatNumber(cash, true)}`}
					color={theme.cashColor}
				/>
			}
			collapsible={graphsUnlocked}
			defaultOpen={false}
		>
			{latest && (
				<div>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							fontSize: 10,
							color: theme.lineNumbers,
							marginBottom: 4,
						}}
					>
						<span>$/s</span>
						<span style={{ color: theme.cashColor }}>
							${formatNumber(latest.cashPerSec, true)}/s
						</span>
					</div>
					<Sparkline
						data={cashData}
						color={theme.cashColor ?? "#e5c07b"}
						tierTransitions={tierTransitions}
						totalTime={elapsed}
					/>
				</div>
			)}
		</CollapsibleSection>
	);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/stats-cash-section.tsx
git commit -m "✨ Add StatsCashSection with collapsible sparkline"
```

---

## Task 3: Create StatsLocSection

**Files:**
- Create: `apps/game/src/components/stats-loc-section.tsx`

This component handles the LoC value, rate, producer breakdown (with tier-colored bars), and produced/executed sparkline.

- [ ] **Step 1: Create the component**

```tsx
import { css } from "@emotion/react";
import { type AiModelData, aiModels, useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useIdeTheme } from "../hooks/use-ide-theme";
import { CollapsibleSection } from "./collapsible-section";
import { RollingNumber } from "./rolling-number";
import { Sparkline } from "./sparkline";

// ── Tier colors for human sources ──
const SOURCE_COLORS = {
	you: "#6272a4",
	malt_freelancer: "#8be9fd",
	intern: "#8be9fd",
	dev_team: "#3fb950",
} as const;

// ── Rate trackers (moved from stats-panel-resources) ──

function useRatePerSec(value: number): number {
	const valueRef = useRef(value);
	valueRef.current = value;
	const prevRef = useRef(value);
	const [rate, setRate] = useState(0);

	useEffect(() => {
		const id = setInterval(() => {
			setRate(Math.max(0, valueRef.current - prevRef.current));
			prevRef.current = valueRef.current;
		}, 1000);
		return () => clearInterval(id);
	}, []);

	return rate;
}

const IGNORED_KEYS = new Set([
	"Shift",
	"Control",
	"Alt",
	"Meta",
	"Tab",
	"Escape",
	"CapsLock",
]);
const HELD_CAP = 12;
const IDLE_TIMEOUT = 3000;

function useKeypressRate(): number {
	const pressTimestamps = useRef<number[]>([]);
	const heldRef = useRef(false);
	const lastKeyTime = useRef(0);
	const [rate, setRate] = useState(0);

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (IGNORED_KEYS.has(e.key)) return;
			lastKeyTime.current = performance.now();
			if (e.repeat) {
				heldRef.current = true;
			} else {
				heldRef.current = false;
				pressTimestamps.current.push(performance.now());
			}
		}
		function onKeyUp() {
			heldRef.current = false;
		}

		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);

		const id = setInterval(() => {
			const now = performance.now();
			if (now - lastKeyTime.current > IDLE_TIMEOUT) {
				pressTimestamps.current.length = 0;
				setRate(0);
			} else if (heldRef.current) {
				setRate(HELD_CAP);
			} else {
				const cutoff = now - IDLE_TIMEOUT;
				const ts = pressTimestamps.current;
				while (ts.length > 0 && ts[0] < cutoff) ts.shift();
				setRate(ts.length / 3);
			}
		}, 500);

		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
			clearInterval(id);
		};
	}, []);

	return rate;
}

// ── Styles ──

const sourceRowCss = css({
	display: "flex",
	alignItems: "center",
	gap: 6,
	height: 24,
});

const sourceNameCss = css({
	minWidth: 64,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
	fontSize: 11,
});

const barTrackCss = css({
	flex: 1,
	height: 4,
	borderRadius: 3,
	overflow: "hidden",
	minWidth: 30,
});

const barFillCss = css({
	height: "100%",
	borderRadius: 3,
	width: "100%",
	transformOrigin: "left",
	transition: "transform 0.3s ease",
});

const sourceValueCss = css({
	minWidth: 50,
	textAlign: "right",
	fontVariantNumeric: "tabular-nums",
	fontSize: 11,
});

interface SourceRow {
	name: string;
	locPerSec: number;
	color: string;
	count?: number;
}

export function StatsLocSection() {
	const { t } = useTranslation();
	const theme = useIdeTheme();
	const loc = useGameStore((s) => s.loc);
	const totalLoc = useGameStore((s) => s.totalLoc);
	const analyticsUnlocked = useGameStore(
		(s) => (s.ownedTechNodes.unlock_analytics ?? 0) > 0,
	);
	const graphsUnlocked = useGameStore(
		(s) => (s.ownedTechNodes.unlock_perf_graphs ?? 0) > 0,
	);
	const ownedUpgrades = useGameStore((s) => s.ownedUpgrades);
	const freelancerLocPerSec = useGameStore((s) => s.freelancerLocPerSec);
	const internLocPerSec = useGameStore((s) => s.internLocPerSec);
	const devLocPerSec = useGameStore((s) => s.devLocPerSec);
	const teamLocPerSec = useGameStore((s) => s.teamLocPerSec);
	const managerBonus = useGameStore((s) => s.managerBonus);
	const locPerKey = useGameStore((s) => s.locPerKey);
	const autoTypeEnabled = useGameStore((s) => s.autoTypeEnabled);
	const autoLocPerSec = useGameStore((s) => s.autoLocPerSec);
	const rateSnapshots = useGameStore((s) => s.rateSnapshots);
	const tierTransitions = useGameStore((s) => s.tierTransitions);
	const sessionStartTime = useGameStore((s) => s.sessionStartTime);

	const keysPerSec = useKeypressRate();
	const locRate = useRatePerSec(totalLoc);
	const elapsed = (performance.now() - sessionStartTime) / 1000;

	const humanSources = useMemo((): SourceRow[] => {
		const rows: SourceRow[] = [];
		if ((ownedUpgrades.malt_freelancer ?? 0) > 0)
			rows.push({
				name: t("malt_freelancer.name", { ns: "upgrades" }),
				locPerSec: freelancerLocPerSec,
				color: SOURCE_COLORS.malt_freelancer,
				count: ownedUpgrades.malt_freelancer,
			});
		if ((ownedUpgrades.intern ?? 0) > 0)
			rows.push({
				name: t("intern.name", { ns: "upgrades" }),
				locPerSec: internLocPerSec,
				color: SOURCE_COLORS.intern,
				count: ownedUpgrades.intern,
			});
		if ((ownedUpgrades.dev_team ?? 0) > 0)
			rows.push({
				name: t("dev_team.name", { ns: "upgrades" }),
				locPerSec: teamLocPerSec,
				color: SOURCE_COLORS.dev_team,
				count: ownedUpgrades.dev_team,
			});
		if (devLocPerSec > 0 && (ownedUpgrades.dev_team ?? 0) === 0)
			rows.push({
				name: t("dev_team.name", { ns: "upgrades" }),
				locPerSec: devLocPerSec,
				color: SOURCE_COLORS.dev_team,
			});
		const autoTypeKeysPerSec = autoTypeEnabled ? 5 : 0;
		const effectiveKeysPerSec = Math.max(keysPerSec, autoTypeKeysPerSec);
		rows.push({
			name: t("stats_panel.you"),
			locPerSec: effectiveKeysPerSec * locPerKey,
			color: SOURCE_COLORS.you,
		});
		rows.sort((a, b) => b.locPerSec - a.locPerSec);
		return rows;
	}, [
		ownedUpgrades,
		freelancerLocPerSec,
		internLocPerSec,
		devLocPerSec,
		teamLocPerSec,
		locPerKey,
		autoTypeEnabled,
		keysPerSec,
		t,
	]);

	const humanMaxLoc = Math.max(1, ...humanSources.map((s) => s.locPerSec));

	const { locProdData, locExecData } = useMemo(
		() => ({
			locProdData: rateSnapshots.map((s) => s.locProducedPerSec),
			locExecData: rateSnapshots.map((s) => s.locExecutedPerSec),
		}),
		[rateSnapshots],
	);
	const latest = rateSnapshots[rateSnapshots.length - 1];

	return (
		<CollapsibleSection
			icon={<span style={{ color: theme.locColor }}>◇</span>}
			label={t("stats_panel.loc")}
			value={
				<RollingNumber value={formatNumber(loc)} color={theme.locColor} />
			}
			rate={
				<span style={{ color: theme.locColor }}>
					{formatNumber(locRate)}
					{t("stats_panel.per_sec")}
				</span>
			}
			collapsible={analyticsUnlocked}
			defaultOpen={true}
		>
			{/* Produced vs Executed sparkline */}
			{graphsUnlocked && latest && (
				<div style={{ marginBottom: 8 }}>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							fontSize: 10,
							color: theme.lineNumbers,
							marginBottom: 4,
						}}
					>
						<span>{t("stats_panel.produced_vs_executed")}</span>
						<span>
							<span style={{ color: theme.locColor }}>
								{formatNumber(latest.locProducedPerSec)}
							</span>
							<span style={{ color: theme.lineNumbers }}> / </span>
							<span style={{ color: theme.flopsColor }}>
								{formatNumber(latest.locExecutedPerSec)}
							</span>
						</span>
					</div>
					<Sparkline
						data={locProdData}
						color={theme.locColor ?? "#61afef"}
						data2={locExecData}
						color2={theme.flopsColor ?? "#c678dd"}
						tierTransitions={tierTransitions}
						totalTime={elapsed}
					/>
				</div>
			)}
			{/* Source rows */}
			{humanSources.map((s) => (
				<div css={sourceRowCss} key={s.name}>
					<span css={sourceNameCss} style={{ color: theme.textMuted }}>
						{s.name}
						{s.count !== undefined && (
							<span style={{ color: theme.lineNumbers }}> x{s.count}</span>
						)}
					</span>
					<div css={barTrackCss} style={{ background: theme.border }}>
						<div
							css={barFillCss}
							style={{
								transform: `scaleX(${s.locPerSec / humanMaxLoc})`,
								background: s.color,
							}}
						/>
					</div>
					<span css={sourceValueCss} style={{ color: s.color }}>
						{formatNumber(s.locPerSec)}
						{t("stats_panel.per_sec")}
					</span>
				</div>
			))}
			{managerBonus > 1 && (
				<div style={{ fontSize: 10, color: theme.lineNumbers, marginTop: 3 }}>
					{t("stats_panel.manager_bonus", {
						bonus: Math.round((managerBonus - 1) * 100),
					})}
				</div>
			)}
		</CollapsibleSection>
	);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: No errors. Note: `totalLoc` may not exist in the store yet — if so, use `totalCash` pattern or derive from `rateSnapshots`. Check the store and adjust accordingly.

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/stats-loc-section.tsx
git commit -m "✨ Add StatsLocSection with tier-colored producer breakdown"
```

---

## Task 4: Create StatsTokensSection

**Files:**
- Create: `apps/game/src/components/stats-tokens-section.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { css } from "@emotion/react";
import { aiModels, useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useIdeTheme } from "../hooks/use-ide-theme";
import { CollapsibleSection } from "./collapsible-section";
import { RollingNumber } from "./rolling-number";
import { Sparkline } from "./sparkline";

// ── AI model family colors ──
const MODEL_COLORS: Record<string, string> = {
	claude: "#d4a574",
	gpt: "#3fb950",
	gemini: "#58a6ff",
	llama: "#a29bfe",
	mistral: "#fd79a8",
	deepseek: "#00d4aa",
	copilot: "#6c5ce7",
};

const TOKEN_COLOR = "#6a9955";

const sourceRowCss = css({
	display: "flex",
	alignItems: "center",
	gap: 6,
	height: 24,
});

const sourceNameCss = css({
	minWidth: 64,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
	fontSize: 11,
});

const barTrackCss = css({
	flex: 1,
	height: 4,
	borderRadius: 3,
	overflow: "hidden",
	minWidth: 30,
});

const barFillCss = css({
	height: "100%",
	borderRadius: 3,
	width: "100%",
	transformOrigin: "left",
	transition: "transform 0.3s ease",
});

const sourceValueCss = css({
	minWidth: 50,
	textAlign: "right",
	fontVariantNumeric: "tabular-nums",
	fontSize: 11,
});

interface AiSourceRow {
	name: string;
	tokenPerSec: number;
	flopsCost: number;
	color: string;
}

export function StatsTokensSection() {
	const { t } = useTranslation();
	const theme = useIdeTheme();
	const tokens = useGameStore((s) => s.tokens);
	const aiUnlocked = useGameStore((s) => s.aiUnlocked);
	const unlockedModels = useGameStore((s) => s.unlockedModels);
	const llmHostSlots = useGameStore((s) => s.llmHostSlots);
	const flops = useGameStore((s) => s.flops);
	const flopSlider = useGameStore((s) => s.flopSlider);
	const graphsUnlocked = useGameStore(
		(s) => (s.ownedTechNodes.unlock_perf_graphs ?? 0) > 0,
	);
	const rateSnapshots = useGameStore((s) => s.rateSnapshots);
	const tierTransitions = useGameStore((s) => s.tierTransitions);
	const sessionStartTime = useGameStore((s) => s.sessionStartTime);

	const elapsed = (performance.now() - sessionStartTime) / 1000;

	const { aiSources, totalTokenPerSec, aiFlops, totalDemand, saturation } =
		useMemo(() => {
			if (!aiUnlocked) return { aiSources: [], totalTokenPerSec: 0, aiFlops: 0, totalDemand: 0, saturation: 0 };
			const activeModels = aiModels
				.filter((m) => unlockedModels[m.id])
				.slice(0, llmHostSlots);
			const af = flops * (1 - flopSlider);
			let td = 0;
			for (const m of activeModels) td += m.flopsCost;
			const sat = td > 0 ? Math.min(1, af / td) : 0;
			const rows: AiSourceRow[] = activeModels.map((model) => ({
				name: `${model.name} ${model.version}`,
				tokenPerSec: model.tokenCost * sat,
				flopsCost: model.flopsCost,
				color: MODEL_COLORS[model.family] ?? theme.textMuted,
			}));
			rows.sort((a, b) => b.tokenPerSec - a.tokenPerSec);
			const total = rows.reduce((sum, r) => sum + r.tokenPerSec, 0);
			return { aiSources: rows, totalTokenPerSec: total, aiFlops: af, totalDemand: td, saturation: sat };
		}, [aiUnlocked, unlockedModels, llmHostSlots, flops, flopSlider, theme.textMuted]);

	// Token rate sparkline data — derive from rateSnapshots if available,
	// otherwise skip. We use locProducedPerSec as a proxy since tokens
	// scale proportionally with AI LoC production. A dedicated tokenPerSec
	// snapshot field would be better but isn't in the store yet.
	// For now, just show the sparkline based on total AI token consumption.
	// If rateSnapshots doesn't have token data, we skip the sparkline.

	const aiMaxToken = Math.max(1, ...aiSources.map((s) => s.tokenPerSec));

	if (!aiUnlocked) return null;

	return (
		<CollapsibleSection
			icon={<span style={{ color: TOKEN_COLOR }}>🪙</span>}
			label={t("stats_panel.tokens")}
			value={
				<RollingNumber
					value={formatNumber(tokens)}
					color={TOKEN_COLOR}
				/>
			}
			rate={
				<span style={{ color: TOKEN_COLOR }}>
					{formatNumber(totalTokenPerSec)}
					{t("stats_panel.tokens_per_sec")}
				</span>
			}
			collapsible={true}
			defaultOpen={true}
		>
			{/* FLOPS saturation */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					fontSize: 10,
					marginBottom: 6,
					gap: 4,
				}}
			>
				<span style={{ color: theme.flopsColor }}>
					⚡ {formatNumber(aiFlops)}
				</span>
				<span style={{ color: theme.lineNumbers }}>/</span>
				<span
					style={{
						color:
							saturation < 0.5
								? "#f44336"
								: saturation < 0.9
									? "#fbbf24"
									: theme.success,
					}}
				>
					{formatNumber(totalDemand)} FLOPS (
					{Math.round(saturation * 100)}%)
				</span>
			</div>
			{/* AI model rows */}
			{aiSources.map((s) => (
				<div css={sourceRowCss} key={s.name}>
					<span css={sourceNameCss} style={{ color: theme.textMuted }}>
						{s.name}
					</span>
					<div css={barTrackCss} style={{ background: theme.border }}>
						<div
							css={barFillCss}
							style={{
								transform: `scaleX(${s.tokenPerSec / aiMaxToken})`,
								background: s.color,
							}}
						/>
					</div>
					<span css={sourceValueCss} style={{ color: s.color }}>
						{formatNumber(s.tokenPerSec)}/s
					</span>
				</div>
			))}
		</CollapsibleSection>
	);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/stats-tokens-section.tsx
git commit -m "✨ Add StatsTokensSection with family-colored AI model breakdown"
```

---

## Task 5: Create StatsFlopsSection

**Files:**
- Create: `apps/game/src/components/stats-flops-section.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { css } from "@emotion/react";
import { useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useIdeTheme } from "../hooks/use-ide-theme";
import { CollapsibleSection } from "./collapsible-section";
import { RollingNumber } from "./rolling-number";
import { Sparkline } from "./sparkline";

const splitBarCss = css({
	display: "flex",
	height: 10,
	borderRadius: 5,
	overflow: "hidden",
});

const splitLegendCss = css({
	display: "flex",
	justifyContent: "space-between",
	fontSize: 9,
	marginTop: 3,
});

export function StatsFlopsSection() {
	const { t } = useTranslation();
	const theme = useIdeTheme();
	const flops = useGameStore((s) => s.flops);
	const aiUnlocked = useGameStore((s) => s.aiUnlocked);
	const flopSlider = useGameStore((s) => s.flopSlider);
	const graphsUnlocked = useGameStore(
		(s) => (s.ownedTechNodes.unlock_perf_graphs ?? 0) > 0,
	);
	const rateSnapshots = useGameStore((s) => s.rateSnapshots);
	const tierTransitions = useGameStore((s) => s.tierTransitions);
	const sessionStartTime = useGameStore((s) => s.sessionStartTime);

	const elapsed = (performance.now() - sessionStartTime) / 1000;

	const flopUtilData = useMemo(
		() => rateSnapshots.map((s) => s.flopUtilization * 100),
		[rateSnapshots],
	);
	const latest = rateSnapshots[rateSnapshots.length - 1];

	const execFlops = flops * flopSlider;
	const aiFlops = flops * (1 - flopSlider);
	const execPct = Math.round(flopSlider * 100);
	const aiPct = 100 - execPct;

	return (
		<CollapsibleSection
			icon={<span style={{ color: theme.flopsColor }}>⚡</span>}
			label={t("stats_panel.flops")}
			value={
				<RollingNumber
					value={formatNumber(flops)}
					color={theme.flopsColor}
				/>
			}
			collapsible={graphsUnlocked}
			defaultOpen={false}
		>
			{/* Exec/AI split bar (only when AI unlocked) */}
			{aiUnlocked && (
				<div style={{ marginBottom: 8 }}>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							fontSize: 10,
							color: theme.lineNumbers,
							marginBottom: 4,
						}}
					>
						<span>{t("stats_panel.exec_ai_split", { defaultValue: "Exec / AI allocation" })}</span>
						<span>
							{execPct}% / {aiPct}%
						</span>
					</div>
					<div css={splitBarCss} style={{ border: `1px solid ${theme.border}` }}>
						<div
							style={{
								width: `${execPct}%`,
								background: theme.success,
							}}
						/>
						<div
							style={{
								width: `${aiPct}%`,
								background: theme.flopsColor,
							}}
						/>
					</div>
					<div css={splitLegendCss}>
						<span style={{ color: theme.success }}>
							● Exec {formatNumber(execFlops)}
						</span>
						<span style={{ color: theme.flopsColor }}>
							● AI {formatNumber(aiFlops)}
						</span>
					</div>
				</div>
			)}
			{/* Utilization sparkline */}
			{latest && (
				<div>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							fontSize: 10,
							color: theme.lineNumbers,
							marginBottom: 4,
						}}
					>
						<span>{t("stats_panel.utilization")}</span>
						<span style={{ color: theme.flopsColor }}>
							{Math.round(latest.flopUtilization * 100)}%
						</span>
					</div>
					<Sparkline
						data={flopUtilData}
						color={theme.flopsColor ?? "#c678dd"}
						tierTransitions={tierTransitions}
						totalTime={elapsed}
					/>
				</div>
			)}
		</CollapsibleSection>
	);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/stats-flops-section.tsx
git commit -m "✨ Add StatsFlopsSection with exec/AI split bar and utilization sparkline"
```

---

## Task 6: Create StatsTierBar

**Files:**
- Create: `apps/game/src/components/stats-tier-bar.tsx`

- [ ] **Step 1: Create the component**

Extract the tier progression bar from `stats-panel-timeline.tsx` into its own component.

```tsx
import { css } from "@emotion/react";
import { useGameStore } from "@modules/game";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useIdeTheme } from "../hooks/use-ide-theme";

const TIER_COLORS = [
	"#6272a4",
	"#8be9fd",
	"#3fb950",
	"#d19a66",
	"#c678dd",
	"#e94560",
];

const barCss = css({
	display: "flex",
	height: 22,
	borderRadius: 4,
	overflow: "hidden",
});

const segCss = css({
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	fontSize: 9,
	fontWeight: 600,
	position: "relative",
	transition: "width 0.3s",
});

function formatElapsed(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

export function StatsTierBar() {
	const { t } = useTranslation();
	const theme = useIdeTheme();
	const tierTransitions = useGameStore((s) => s.tierTransitions);
	const sessionStartTime = useGameStore((s) => s.sessionStartTime);

	const elapsed = (performance.now() - sessionStartTime) / 1000;

	const tierDurations = useMemo(() => {
		const durations: Array<{ tierIndex: number; duration: number }> = [];
		for (let i = 0; i < tierTransitions.length; i++) {
			const start = tierTransitions[i].enteredAt;
			const end = tierTransitions[i + 1]?.enteredAt ?? elapsed;
			durations.push({
				tierIndex: tierTransitions[i].tierIndex,
				duration: end - start,
			});
		}
		return durations;
	}, [tierTransitions, elapsed]);

	return (
		<div style={{ padding: "8px 14px 4px" }}>
			<div
				style={{
					fontSize: 10,
					textTransform: "uppercase",
					letterSpacing: 0.5,
					color: theme.lineNumbers,
					marginBottom: 6,
				}}
			>
				{t("stats_panel.tier_progression")}
			</div>
			<div css={barCss} style={{ border: `1px solid ${theme.border}` }}>
				{tierDurations.map((td, i) => {
					const pct = elapsed > 0 ? (td.duration / elapsed) * 100 : 0;
					const isLast = i === tierDurations.length - 1;
					return (
						<div
							key={td.tierIndex}
							css={segCss}
							style={{
								width: `${Math.max(pct, 2)}%`,
								background: TIER_COLORS[td.tierIndex],
								color: td.tierIndex <= 1 ? "#c9d1d9" : "rgba(0,0,0,0.7)",
								...(isLast
									? { animation: "tier-pulse 2s ease-in-out infinite" }
									: {}),
							}}
						>
							{pct > 8 && <span>T{td.tierIndex}</span>}
							{pct > 15 && (
								<span
									style={{
										position: "absolute",
										bottom: 1,
										right: 3,
										fontSize: 7,
										opacity: 0.7,
									}}
								>
									{formatElapsed(td.duration)}
								</span>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/stats-tier-bar.tsx
git commit -m "✨ Add StatsTierBar component extracted from timeline"
```

---

## Task 7: Create StatsHistory (Git-Graph Log)

**Files:**
- Create: `apps/game/src/components/stats-history.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { css } from "@emotion/react";
import { useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useIdeTheme } from "../hooks/use-ide-theme";

const TIER_COLORS = [
	"#6272a4",
	"#8be9fd",
	"#3fb950",
	"#d19a66",
	"#c678dd",
	"#e94560",
];

const VISIBLE_COUNT = 5;

const headerCss = css({
	display: "flex",
	alignItems: "center",
	cursor: "pointer",
	userSelect: "none",
	marginBottom: 8,
});

const chevronCss = css({
	fontSize: 12,
	marginRight: 6,
	transition: "transform 0.15s ease",
	display: "inline-block",
	width: 14,
	textAlign: "center",
});

const rowCss = css({
	display: "flex",
	alignItems: "center",
	gap: 6,
	padding: "3px 0",
	fontSize: 11,
});

const shaCss = css({
	fontSize: 10,
	flexShrink: 0,
	letterSpacing: 0.3,
});

const nameCss = css({
	flex: 1,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
});

const timeCss = css({
	fontSize: 10,
	flexShrink: 0,
});

const overflowCss = css({
	overflow: "hidden",
	transition: "max-height 0.25s ease",
});

function formatAgo(secondsAgo: number): string {
	if (secondsAgo < 60) return `${Math.floor(secondsAgo)}s`;
	const m = Math.floor(secondsAgo / 60);
	return `${m}m`;
}

/** Generate a deterministic-looking 5-char hex suffix from a string + index */
function pseudoHash(id: string, index: number): string {
	let h = index * 2654435761;
	for (let i = 0; i < id.length; i++) {
		h = ((h << 5) - h + id.charCodeAt(i)) | 0;
	}
	return Math.abs(h).toString(16).slice(0, 5).padEnd(5, "0");
}

export function StatsHistory() {
	const { t } = useTranslation();
	const theme = useIdeTheme();
	const purchaseLog = useGameStore((s) => s.purchaseLog);
	const sessionStartTime = useGameStore((s) => s.sessionStartTime);
	const currentTierIndex = useGameStore((s) => s.currentTierIndex);
	const tierTransitions = useGameStore((s) => s.tierTransitions);

	const { t: tUpgrades } = useTranslation("upgrades");
	const { t: tTech } = useTranslation("tech-tree");

	const [expanded, setExpanded] = useState(false);
	const toggleExpand = useCallback(() => setExpanded((e) => !e), []);

	const elapsed = (performance.now() - sessionStartTime) / 1000;

	const entries = useMemo(() => {
		const reversed = [...purchaseLog].reverse();
		return reversed.map((p, i) => {
			// Determine which tier this purchase was in
			let tier = 0;
			for (const tt of tierTransitions) {
				if (p.time >= tt.enteredAt) tier = tt.tierIndex;
			}
			const name =
				tUpgrades(`${p.id}.name`, { defaultValue: "" }) ||
				tTech(`${p.id}.name`, { defaultValue: p.id });
			return {
				id: `${p.id}-${i}`,
				name,
				tier,
				ago: elapsed - p.time,
				sha: `t${tier}${pseudoHash(p.id, i)}`,
			};
		});
	}, [purchaseLog, elapsed, tierTransitions, tUpgrades, tTech]);

	const visibleEntries = entries.slice(0, VISIBLE_COUNT);
	const overflowEntries = entries.slice(VISIBLE_COUNT);
	const hasOverflow = overflowEntries.length > 0;

	const renderEntry = (entry: (typeof entries)[0], isLast: boolean) => (
		<div key={entry.id}>
			<div css={rowCss}>
				<span style={{ color: theme.accent, fontSize: 12 }}>●</span>
				<span css={shaCss}>
					<span style={{ color: TIER_COLORS[entry.tier], fontWeight: 600 }}>
						t{entry.tier}
					</span>
					<span style={{ color: theme.lineNumbers }}>
						{entry.sha.slice(2)}
					</span>
				</span>
				<span css={nameCss} style={{ color: theme.foreground }}>
					{entry.name}
				</span>
				<span css={timeCss} style={{ color: theme.lineNumbers }}>
					{formatAgo(entry.ago)}
				</span>
			</div>
			{!isLast && (
				<div
					style={{
						marginLeft: 5,
						color: theme.border,
						lineHeight: 1,
						fontSize: 13,
					}}
				>
					│
				</div>
			)}
		</div>
	);

	if (entries.length === 0) {
		return (
			<div style={{ padding: "8px 14px" }}>
				<div
					style={{
						fontSize: 10,
						textTransform: "uppercase",
						letterSpacing: 0.5,
						color: theme.lineNumbers,
						marginBottom: 8,
					}}
				>
					{t("stats_panel.history", { defaultValue: "History" })}
				</div>
				<div
					style={{
						color: theme.lineNumbers,
						fontStyle: "italic",
						textAlign: "center",
						padding: "12px 0",
						fontSize: 11,
					}}
				>
					{t("stats_panel.no_purchases", {
						defaultValue: "No purchases yet",
					})}
				</div>
			</div>
		);
	}

	return (
		<div style={{ padding: "8px 14px" }}>
			{/* Header — clickable to expand if overflow */}
			<div
				css={hasOverflow ? headerCss : undefined}
				onClick={hasOverflow ? toggleExpand : undefined}
				style={
					hasOverflow
						? undefined
						: {
								fontSize: 10,
								textTransform: "uppercase",
								letterSpacing: 0.5,
								color: theme.lineNumbers,
								marginBottom: 8,
							}
				}
			>
				{hasOverflow && (
					<span
						css={chevronCss}
						style={{
							color: theme.lineNumbers,
							transform: expanded ? "rotate(90deg)" : "none",
						}}
					>
						▶
					</span>
				)}
				<span
					style={{
						fontSize: 10,
						textTransform: "uppercase",
						letterSpacing: 0.5,
						color: theme.lineNumbers,
					}}
				>
					{t("stats_panel.history", { defaultValue: "History" })}
				</span>
			</div>

			{/* Visible entries (always shown) */}
			{visibleEntries.map((entry, i) => {
				const isLastVisible =
					i === visibleEntries.length - 1 && !hasOverflow;
				return renderEntry(entry, isLastVisible);
			})}

			{/* Overflow entries */}
			{hasOverflow && (
				<>
					<div
						css={overflowCss}
						style={{
							maxHeight: expanded ? 500 : 0,
							overflowY: expanded ? "auto" : "hidden",
						}}
					>
						{overflowEntries.map((entry, i) =>
							renderEntry(entry, i === overflowEntries.length - 1),
						)}
					</div>
					{!expanded && (
						<div
							style={{
								marginLeft: 5,
								color: theme.lineNumbers,
								fontSize: 13,
							}}
						>
							⋮
						</div>
					)}
				</>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/stats-history.tsx
git commit -m "✨ Add StatsHistory git-graph purchase log component"
```

---

## Task 8: Create StatsExecuteBar

**Files:**
- Create: `apps/game/src/components/stats-execute-bar.tsx`

- [ ] **Step 1: Create the component**

Extract the execute button logic from `stats-panel-resources.tsx`. Layout: button on left, toggle column (Auto label + switch) on right.

```tsx
import { css } from "@emotion/react";
import { aiModels, tiers, useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useIdeTheme } from "../hooks/use-ide-theme";

function useRatePerSec(value: number): number {
	const valueRef = useRef(value);
	valueRef.current = value;
	const prevRef = useRef(value);
	const [rate, setRate] = useState(0);

	useEffect(() => {
		const id = setInterval(() => {
			setRate(Math.max(0, valueRef.current - prevRef.current));
			prevRef.current = valueRef.current;
		}, 1000);
		return () => clearInterval(id);
	}, []);

	return rate;
}

const wrapCss = css({
	display: "flex",
	alignItems: "center",
	gap: 8,
});

const btnCss = css({
	flex: 1,
	padding: "9px 0",
	fontSize: 13,
	fontWeight: "bold",
	fontFamily: "inherit",
	textTransform: "uppercase",
	letterSpacing: 1,
	borderRadius: 4,
	cursor: "pointer",
	transition: "all 0.1s",
});

const toggleColCss = css({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	gap: 3,
	flexShrink: 0,
});

const toggleTrackCss = css({
	width: 28,
	height: 14,
	borderRadius: 7,
	position: "relative",
	cursor: "pointer",
	transition: "background 0.2s",
});

const toggleThumbCss = css({
	position: "absolute",
	top: 2,
	width: 10,
	height: 10,
	borderRadius: "50%",
	background: "#e0e0e0",
	transition: "left 0.2s",
});

export function StatsExecuteBar() {
	const { t } = useTranslation();
	const theme = useIdeTheme();
	const loc = useGameStore((s) => s.loc);
	const flops = useGameStore((s) => s.flops);
	const totalCash = useGameStore((s) => s.totalCash);
	const currentTierIndex = useGameStore((s) => s.currentTierIndex);
	const cashMultiplier = useGameStore((s) => s.cashMultiplier);
	const aiUnlocked = useGameStore((s) => s.aiUnlocked);
	const autoExec = useGameStore((s) => s.autoExecuteEnabled);
	const autoExecUnlocked = useGameStore(
		(s) => (s.ownedTechNodes.auto_execute ?? 0) > 0,
	);
	const toggleAutoExecute = useGameStore((s) => s.toggleAutoExecute);
	const executeManual = useGameStore((s) => s.executeManual);
	const flopSlider = useGameStore((s) => s.flopSlider);

	const cashRate = useRatePerSec(totalCash);

	const tier = tiers[currentTierIndex];
	const cashPerLoc = tier?.cashPerLoc ?? 0.1;

	let aiFlopsCost = 0;
	if (aiUnlocked) {
		for (const model of aiModels) {
			aiFlopsCost += model.flopsCost;
		}
	}
	const execFlops = aiUnlocked
		? flops * flopSlider
		: flops;
	const execLoc = Math.min(Math.floor(execFlops), Math.floor(loc));
	const earnPerExec = execLoc * cashPerLoc * cashMultiplier;

	const autoDisplay = (
		<div
			style={{
				flex: 1,
				textAlign: "center",
				padding: "9px 0",
				fontSize: 13,
				fontWeight: "bold",
				fontFamily: "inherit",
				textTransform: "uppercase",
				letterSpacing: 1,
				color: theme.success,
				border: `1px solid ${theme.success}80`,
				borderRadius: 4,
				background: `${theme.success}1A`,
			}}
		>
			⚡ ${formatNumber(cashRate, true)}/s
		</div>
	);

	const manualButton = (
		<button
			type="button"
			css={btnCss}
			onClick={executeManual}
			disabled={execLoc <= 0}
			style={{
				border: `1px solid ${theme.success}`,
				background: "transparent",
				color: theme.success,
			}}
		>
			{t("stats_panel.execute", {
				loc: formatNumber(execLoc),
				earn: formatNumber(earnPerExec, true),
			})}
		</button>
	);

	const toggleSwitch = (
		<div css={toggleColCss}>
			<span
				style={{
					fontSize: 9,
					textTransform: "uppercase",
					letterSpacing: 0.5,
					color: theme.textMuted,
					lineHeight: 1,
				}}
			>
				Auto
			</span>
			<div
				css={toggleTrackCss}
				onClick={toggleAutoExecute}
				style={{
					background: autoExec ? theme.success : theme.lineNumbers,
				}}
			>
				<span
					css={toggleThumbCss}
					style={{ left: autoExec ? 16 : 2 }}
				/>
			</div>
		</div>
	);

	return (
		<div
			style={{
				padding: "8px 12px",
				borderTop: `1px solid ${theme.border}`,
				flexShrink: 0,
			}}
		>
			{autoExecUnlocked ? (
				<div css={wrapCss}>
					{autoExec ? autoDisplay : manualButton}
					{toggleSwitch}
				</div>
			) : (
				manualButton
			)}
		</div>
	);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/components/stats-execute-bar.tsx
git commit -m "✨ Add StatsExecuteBar with auto toggle on right"
```

---

## Task 9: Rewrite StatsPanel and Delete Old Components

**Files:**
- Rewrite: `apps/game/src/components/stats-panel.tsx`
- Delete: `apps/game/src/components/stats-panel-resources.tsx`
- Delete: `apps/game/src/components/stats-panel-timeline.tsx`
- Delete: `apps/game/src/components/stats-panel-graphs.tsx`

- [ ] **Step 1: Rewrite stats-panel.tsx**

```tsx
import { css } from "@emotion/react";
import { useGameStore } from "@modules/game";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useIdeTheme } from "../hooks/use-ide-theme";
import { StatsCashSection } from "./stats-cash-section";
import { StatsExecuteBar } from "./stats-execute-bar";
import { StatsFlopsSection } from "./stats-flops-section";
import { StatsHistory } from "./stats-history";
import { StatsLocSection } from "./stats-loc-section";
import { StatsTierBar } from "./stats-tier-bar";
import { StatsTokensSection } from "./stats-tokens-section";

const panelCss = css({
	display: "flex",
	flexDirection: "column",
	width: 280,
	minWidth: 280,
	flexShrink: 0,
	overflow: "hidden",
});

const headerCss = css({
	padding: "0 12px",
	height: 35,
	display: "flex",
	alignItems: "center",
	gap: 8,
	fontSize: 12,
	fontWeight: 600,
	textTransform: "uppercase",
	letterSpacing: 0.5,
	flexShrink: 0,
});

const bodyCss = css({
	flex: 1,
	overflowY: "auto",
	overflowX: "hidden",
	"&::-webkit-scrollbar": { width: 6 },
	"&::-webkit-scrollbar-track": { background: "transparent" },
	"&::-webkit-scrollbar-thumb": { borderRadius: 3 },
});

export function StatsPanel({ onCollapse }: { onCollapse?: () => void }) {
	const { t } = useTranslation();
	const theme = useIdeTheme();
	const sessionStartTime = useGameStore((s) => s.sessionStartTime);

	const [elapsed, setElapsed] = useState(0);

	useEffect(() => {
		const id = setInterval(() => {
			setElapsed((performance.now() - sessionStartTime) / 1000);
		}, 1000);
		return () => clearInterval(id);
	}, [sessionStartTime]);

	const elapsedStr = `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`;

	return (
		<div
			css={panelCss}
			style={{
				background: theme.sidebarBg,
				borderLeft: `1px solid ${theme.border}`,
			}}
		>
			{/* Header */}
			<div
				css={headerCss}
				style={{
					background: theme.tabBarBg,
					borderBottom: `1px solid ${theme.border}`,
					color: theme.textMuted,
				}}
			>
				<span style={{ fontSize: 14, color: theme.flopsColor }}>⚡</span>
				<span style={{ flex: 1 }}>{t("stats_panel.title")}</span>
				<span
					style={{
						fontSize: 10,
						background: theme.hoverBg,
						padding: "2px 6px",
						borderRadius: 3,
						fontWeight: 400,
					}}
				>
					{elapsedStr}
				</span>
				{onCollapse && (
					<button
						type="button"
						onClick={onCollapse}
						title={t("stats_panel.hide")}
						css={{
							background: "none",
							border: "none",
							cursor: "pointer",
							color: theme.textMuted,
							padding: 2,
							display: "flex",
							alignItems: "center",
							"&:hover": { color: theme.foreground },
						}}
					>
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
							<path
								d="M5 4l4 4-4 4"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
				)}
			</div>

			{/* Scrollable body */}
			<div css={bodyCss} style={{ "&::-webkit-scrollbar-thumb": { background: theme.border } } as never}>
				<StatsCashSection />
				<StatsLocSection />
				<StatsTokensSection />
				<StatsFlopsSection />
				<StatsTierBar />
				<StatsHistory />
			</div>

			{/* Sticky execute */}
			<StatsExecuteBar />
		</div>
	);
}
```

- [ ] **Step 2: Delete old tab components**

```bash
rm apps/game/src/components/stats-panel-resources.tsx
rm apps/game/src/components/stats-panel-timeline.tsx
rm apps/game/src/components/stats-panel-graphs.tsx
```

- [ ] **Step 3: Verify no broken imports**

Run: `npm run typecheck`
Expected: No errors. If there are stale imports elsewhere (e.g. in test files or barrel exports), fix them.

- [ ] **Step 4: Run the dev server and verify**

Run: `npm run dev`
Expected: Game loads, stats panel shows the new collapsible sections, no console errors.

- [ ] **Step 5: Commit**

```bash
git add -A apps/game/src/components/stats-panel.tsx apps/game/src/components/stats-panel-resources.tsx apps/game/src/components/stats-panel-timeline.tsx apps/game/src/components/stats-panel-graphs.tsx
git commit -m "♻️ Rewrite StatsPanel as single scrollable panel, delete tab components"
```

---

## Task 10: Update i18n Keys

**Files:**
- Modify: `apps/game/src/i18n/locales/en/ui.json`
- Modify: `apps/game/src/i18n/locales/{fr,it,de,es,pl,zh,ru}/ui.json`

- [ ] **Step 1: Update English locale**

In `apps/game/src/i18n/locales/en/ui.json`, within the `stats_panel` object:

**Add these keys:**
```json
"history": "History",
"no_purchases": "No purchases yet",
"exec_ai_split": "Exec / AI allocation"
```

**Remove these keys** (no longer used):
```json
"tab_resources": "Resources",
"tab_timeline": "Timeline",
"tab_graphs": "Graphs",
"rates_vs_30s": "Rates (vs 30s ago)",
"recent_purchases": "Recent Purchases"
```

**Update the auto_exec key** to remove "Auto —" prefix:
```json
"auto_exec": "⚡ ${{rate}}/s"
```

- [ ] **Step 2: Mirror changes to all 7 other locales**

Apply the same key additions and removals to: `fr`, `it`, `de`, `es`, `pl`, `zh`, `ru`. For the new keys, add translated versions. For removed keys, just delete them.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run dev`
Expected: No missing key warnings in console.

- [ ] **Step 4: Commit**

```bash
git add apps/game/src/i18n/
git commit -m "🌐 Update i18n keys for stats panel redesign"
```

---

## Task 11: Fix Analytics Unlock Condition

**Files:**
- Verify in: `apps/game/src/components/stats-loc-section.tsx`

- [ ] **Step 1: Verify the condition**

The spec requires that the LoC producer breakdown is shown as soon as the `unlock_analytics` tech node is bought, **not** gated on `autoLocPerSec > 0 || humanSources.length > 1` as the old code did. Verify that `StatsLocSection` uses only:

```tsx
const analyticsUnlocked = useGameStore(
	(s) => (s.ownedTechNodes.unlock_analytics ?? 0) > 0,
);
```

And passes `collapsible={analyticsUnlocked}` — no extra conditions.

- [ ] **Step 2: Commit if any change was needed**

```bash
git add apps/game/src/components/stats-loc-section.tsx
git commit -m "🐛 Fix analytics unlock to use tech node only, not source count"
```

---

## Task 12: Lint, Format, and Final Verification

**Files:** All modified/created files

- [ ] **Step 1: Run biome check and fix**

```bash
npm run check:fix
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors

- [ ] **Step 3: Run the game end to end**

```bash
npm run dev
```

Manual verification checklist:
- Stats panel loads with Cash, LoC, FLOPS sections (no tabs)
- Cash value displays correctly, not collapsible initially
- LoC value + rate displays, not collapsible until analytics unlocked
- FLOPS value displays, not collapsible until graphs unlocked
- Execute button at bottom is sticky
- Tier bar shows above history
- History shows "No purchases yet" initially
- No console errors

- [ ] **Step 4: Run balance simulation to make sure nothing broke**

```bash
npm run sim
```

Expected: All 3 profiles pass

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "✨ Stats panel redesign complete — single panel with collapsible sections"
```
