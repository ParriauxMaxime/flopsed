import { css } from "@emotion/react";
import type { SimSnapshot } from "@flopsed/engine";
import { useMemo } from "react";

const containerCss = css({
	background: "#161b22",
	border: "1px solid #1e2630",
	borderRadius: 6,
	padding: 16,
});

const CHART_W = 700;
const CHART_H = 200;
const PAD = { top: 10, right: 10, bottom: 30, left: 60 };

function formatFlops(v: number): string {
	if (v >= 1e9) return `${(v / 1e9).toFixed(0)}B`;
	if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
	if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
	return `${v.toFixed(0)}`;
}

interface FlopsChartProps {
	snapshots: SimSnapshot[];
}

export function FlopsChart({ snapshots }: FlopsChartProps) {
	const { flopsPoints, locPoints, xTicks, yTicks } = useMemo(() => {
		if (snapshots.length === 0)
			return { flopsPoints: "", locPoints: "", xTicks: [], yTicks: [] };

		const mTime = snapshots[snapshots.length - 1].time;
		const allValues = snapshots.flatMap((s) => [s.flops, s.locPerSec]).filter(
			(v) => v > 0,
		);
		if (allValues.length === 0)
			return { flopsPoints: "", locPoints: "", xTicks: [], yTicks: [] };

		const minLog = Math.floor(Math.log10(Math.max(Math.min(...allValues), 1)));
		const maxLog = Math.ceil(
			Math.log10(Math.max(Math.max(...allValues), 1)),
		);
		const logRange = Math.max(maxLog - minLog, 1);

		const innerW = CHART_W - PAD.left - PAD.right;
		const innerH = CHART_H - PAD.top - PAD.bottom;

		const toPoint = (time: number, value: number) => {
			const x = PAD.left + (time / mTime) * innerW;
			const logY = (Math.log10(Math.max(value, 1)) - minLog) / logRange;
			const y = PAD.top + innerH - logY * innerH;
			return `${x},${y}`;
		};

		const fPts = snapshots
			.filter((s) => s.flops > 0)
			.map((s) => toPoint(s.time, s.flops))
			.join(" ");

		const lPts = snapshots
			.filter((s) => s.locPerSec > 0)
			.map((s) => toPoint(s.time, s.locPerSec))
			.join(" ");

		const xT = Array.from({ length: 5 }, (_, i) => {
			const t = (mTime / 4) * i;
			return {
				x: PAD.left + (t / mTime) * innerW,
				label: `${Math.floor(t / 60)}m`,
			};
		});

		const yT: { y: number; label: string }[] = [];
		for (let exp = minLog; exp <= maxLog; exp++) {
			const logY = (exp - minLog) / logRange;
			yT.push({
				y: PAD.top + innerH - logY * innerH,
				label: formatFlops(10 ** exp),
			});
		}

		return { flopsPoints: fPts, locPoints: lPts, xTicks: xT, yTicks: yT };
	}, [snapshots]);

	if (snapshots.length === 0) return null;

	return (
		<div css={containerCss}>
			<svg
				viewBox={`0 0 ${CHART_W} ${CHART_H}`}
				width="100%"
				preserveAspectRatio="xMidYMid meet"
			>
				{yTicks.map((t) => (
					<line
						key={t.label}
						x1={PAD.left}
						x2={CHART_W - PAD.right}
						y1={t.y}
						y2={t.y}
						stroke="#1e2630"
						strokeWidth={1}
					/>
				))}
				{xTicks.map((t) => (
					<text
						key={t.label}
						x={t.x}
						y={CHART_H - 5}
						fill="#6272a4"
						fontSize={10}
						textAnchor="middle"
					>
						{t.label}
					</text>
				))}
				{yTicks.map((t) => (
					<text
						key={t.label}
						x={PAD.left - 8}
						y={t.y + 3}
						fill="#6272a4"
						fontSize={10}
						textAnchor="end"
					>
						{t.label}
					</text>
				))}
				<polyline
					fill="none"
					stroke="#c678dd"
					strokeWidth={2}
					points={flopsPoints}
				/>
				<polyline
					fill="none"
					stroke="#61afef"
					strokeWidth={1.5}
					strokeDasharray="4 2"
					points={locPoints}
				/>
				{/* Legend */}
				<line
					x1={PAD.left + 10}
					x2={PAD.left + 30}
					y1={PAD.top + 8}
					y2={PAD.top + 8}
					stroke="#c678dd"
					strokeWidth={2}
				/>
				<text
					x={PAD.left + 34}
					y={PAD.top + 12}
					fill="#c678dd"
					fontSize={9}
				>
					FLOPS
				</text>
				<line
					x1={PAD.left + 80}
					x2={PAD.left + 100}
					y1={PAD.top + 8}
					y2={PAD.top + 8}
					stroke="#61afef"
					strokeWidth={1.5}
					strokeDasharray="4 2"
				/>
				<text
					x={PAD.left + 104}
					y={PAD.top + 12}
					fill="#61afef"
					fontSize={9}
				>
					LoC/s
				</text>
			</svg>
		</div>
	);
}
