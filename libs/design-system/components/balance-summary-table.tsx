import { tiers } from "@agi-rush/domain";
import type { SimResult } from "@agi-rush/engine";
import { css } from "@emotion/react";
import { useMemo } from "react";
import { tierColors } from "../theme";

function formatNumber(n: number): string {
	if (n >= 1e12) return fmtTier(n, 1e12, "T");
	if (n >= 1e9) return fmtTier(n, 1e9, "B");
	if (n >= 1e6) return fmtTier(n, 1e6, "M");
	if (n >= 1e3) return fmtTier(n, 1e3, "K");
	if (n > 0 && n < 100) return n.toFixed(1);
	return Math.floor(n).toString();
}

function fmtTier(n: number, div: number, suffix: string): string {
	const scaled = n / div;
	if (scaled >= 100) return `${Math.floor(scaled)}${suffix}`;
	if (scaled >= 10) return `${scaled.toFixed(1)}${suffix}`;
	return `${scaled.toFixed(2)}${suffix}`;
}

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

interface TierStats {
	tierIndex: number;
	tierName: string;
	tierId: string;
	duration: number;
	buys: number;
	locPerSecMin: number;
	locPerSecMax: number;
	flopsMin: number;
	flopsMax: number;
	cashPerSecMin: number;
	cashPerSecMax: number;
	avgGap: number;
	maxGap: number;
}

function computeTierStats(result: SimResult): TierStats[] {
	const tierLookup = new Map(tiers.map((t) => [t.index, t]));

	const stats: TierStats[] = [];

	// Group purchases by tier
	const purchasesByTier = new Map<number, typeof result.purchases>();
	for (const p of result.purchases) {
		const tier = p.snapshot?.tier ?? 0;
		if (!purchasesByTier.has(tier)) {
			purchasesByTier.set(tier, []);
		}
		purchasesByTier.get(tier)?.push(p);
	}

	// Get all tiers that appear in tierTimes
	const tierIndices = Object.keys(result.tierTimes)
		.map(Number)
		.sort((a, b) => a - b);

	for (const tierIndex of tierIndices) {
		const tierData = tierLookup.get(tierIndex);
		if (!tierData) continue;

		const tierStart = result.tierTimes[tierIndex] ?? 0;
		const nextTierIndex = tierIndices.find((t) => t > tierIndex);
		const tierEnd =
			nextTierIndex !== undefined
				? (result.tierTimes[nextTierIndex] ?? result.endTime)
				: result.endTime;
		const duration = tierEnd - tierStart;

		const purchases = purchasesByTier.get(tierIndex) ?? [];

		let locPerSecMin = Number.POSITIVE_INFINITY;
		let locPerSecMax = 0;
		let flopsMin = Number.POSITIVE_INFINITY;
		let flopsMax = 0;
		let cashPerSecMin = Number.POSITIVE_INFINITY;
		let cashPerSecMax = 0;

		for (const p of purchases) {
			if (!p.snapshot) continue;
			const s = p.snapshot;
			locPerSecMin = Math.min(locPerSecMin, s.locPerSec);
			locPerSecMax = Math.max(locPerSecMax, s.locPerSec);
			flopsMin = Math.min(flopsMin, s.flops);
			flopsMax = Math.max(flopsMax, s.flops);
			cashPerSecMin = Math.min(cashPerSecMin, s.cashPerSec);
			cashPerSecMax = Math.max(cashPerSecMax, s.cashPerSec);
		}

		// Also use snapshots for min/max if no purchases in tier
		for (const snap of result.snapshots) {
			if (snap.time < tierStart || snap.time > tierEnd) continue;
			if (snap.tier !== tierIndex) continue;
			locPerSecMin = Math.min(locPerSecMin, snap.locPerSec);
			locPerSecMax = Math.max(locPerSecMax, snap.locPerSec);
			flopsMin = Math.min(flopsMin, snap.flops);
			flopsMax = Math.max(flopsMax, snap.flops);
			cashPerSecMin = Math.min(cashPerSecMin, snap.cashPerSec);
			cashPerSecMax = Math.max(cashPerSecMax, snap.cashPerSec);
		}

		// Fix infinities if no data
		if (locPerSecMin === Number.POSITIVE_INFINITY) locPerSecMin = 0;
		if (flopsMin === Number.POSITIVE_INFINITY) flopsMin = 0;
		if (cashPerSecMin === Number.POSITIVE_INFINITY) cashPerSecMin = 0;

		// Compute gaps for this tier
		const tierGaps = result.idle.gaps.filter((g) => g.tier === tierIndex);
		const avgGap =
			tierGaps.length > 0
				? tierGaps.reduce((sum, g) => sum + g.duration, 0) / tierGaps.length
				: 0;
		const maxGap =
			tierGaps.length > 0 ? Math.max(...tierGaps.map((g) => g.duration)) : 0;

		stats.push({
			tierIndex,
			tierName: tierData.name,
			tierId: tierData.id,
			duration,
			buys: purchases.length,
			locPerSecMin,
			locPerSecMax,
			flopsMin,
			flopsMax,
			cashPerSecMin,
			cashPerSecMax,
			avgGap,
			maxGap,
		});
	}

	return stats;
}

const tableWrapCss = css({
	overflowX: "auto",
	marginBottom: 16,
});

const tableCss = css({
	width: "100%",
	borderCollapse: "collapse",
	fontSize: 12,
	fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
	"& th": {
		color: "#6272a4",
		fontSize: 10,
		fontWeight: 600,
		textTransform: "uppercase",
		letterSpacing: 0.5,
		padding: "6px 8px",
		textAlign: "right",
		borderBottom: "1px solid #1e2630",
		whiteSpace: "nowrap",
	},
	"& th:first-of-type": {
		textAlign: "left",
	},
	"& td": {
		padding: "5px 8px",
		textAlign: "right",
		color: "#c9d1d9",
		whiteSpace: "nowrap",
	},
	"& td:first-of-type": {
		textAlign: "left",
		fontWeight: 600,
	},
	"& tr:nth-of-type(even)": {
		background: "rgba(22, 27, 34, 0.5)",
	},
	"& tr:hover": {
		background: "rgba(88, 166, 255, 0.05)",
	},
});

interface BalanceSummaryTableProps {
	result: SimResult;
}

export function BalanceSummaryTable({ result }: BalanceSummaryTableProps) {
	const stats = useMemo(() => computeTierStats(result), [result]);

	return (
		<div css={tableWrapCss}>
			<table css={tableCss}>
				<thead>
					<tr>
						<th>Tier</th>
						<th>Duration</th>
						<th>Buys</th>
						<th>LoC/s min</th>
						<th>LoC/s max</th>
						<th>FLOPS min</th>
						<th>FLOPS max</th>
						<th>$/s min</th>
						<th>$/s max</th>
						<th>Avg gap</th>
						<th>Max gap</th>
					</tr>
				</thead>
				<tbody>
					{stats.map((s) => (
						<tr key={s.tierIndex}>
							<td
								css={css({
									color: tierColors[s.tierId] ?? "#c9d1d9",
								})}
							>
								{s.tierName}
							</td>
							<td>{formatTime(s.duration)}</td>
							<td>{s.buys}</td>
							<td>{formatNumber(s.locPerSecMin)}</td>
							<td>{formatNumber(s.locPerSecMax)}</td>
							<td>{formatNumber(s.flopsMin)}</td>
							<td>{formatNumber(s.flopsMax)}</td>
							<td>{formatNumber(s.cashPerSecMin)}</td>
							<td>{formatNumber(s.cashPerSecMax)}</td>
							<td>{s.avgGap > 0 ? `${s.avgGap.toFixed(1)}s` : "-"}</td>
							<td>{s.maxGap > 0 ? `${Math.round(s.maxGap)}s` : "-"}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
