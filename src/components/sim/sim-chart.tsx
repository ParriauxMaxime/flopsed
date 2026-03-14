import { css } from "@emotion/react";
import type { SimSnapshot } from "@utils/balance-sim";
import { useEffect, useRef } from "react";

const wrapperCss = css({
	background: "#0d1117",
	border: "1px solid #1e2630",
	borderRadius: 6,
	padding: 16,
	marginBottom: 16,
	overflowX: "auto",
});

const canvasCss = css({
	width: "100%",
	height: 280,
	display: "block",
});

function formatNum(n: number): string {
	if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
	if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
	if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
	if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
	return Math.floor(n).toString();
}

function formatTime(s: number): string {
	const m = Math.floor(s / 60);
	const sec = Math.floor(s % 60);
	return `${m}:${sec.toString().padStart(2, "0")}`;
}

function drawChart(
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	data: SimSnapshot[],
	dataKey: keyof SimSnapshot,
	color: string,
	label: string,
	logScale: boolean,
) {
	const pad = { top: 30, right: 20, bottom: 30, left: 70 };

	ctx.clearRect(0, 0, w, h);
	if (data.length < 2) return;

	const values = data.map((d) => d[dataKey] as number);
	const maxVal = Math.max(...values, 1);
	const minVal = logScale
		? Math.max(Math.min(...values.filter((v) => v > 0)), 0.01)
		: 0;

	function toY(v: number): number {
		if (logScale && v > 0) {
			const logMin = Math.log10(Math.max(minVal, 0.01));
			const logMax = Math.log10(maxVal);
			const logV = Math.log10(Math.max(v, 0.01));
			return (
				pad.top +
				(h - pad.top - pad.bottom) *
					(1 - (logV - logMin) / (logMax - logMin || 1))
			);
		}
		return pad.top + (h - pad.top - pad.bottom) * (1 - v / maxVal);
	}

	function toX(i: number): number {
		return pad.left + (w - pad.left - pad.right) * (i / (data.length - 1));
	}

	// Grid
	ctx.strokeStyle = "#1e2630";
	ctx.lineWidth = 1;
	for (let i = 0; i <= 4; i++) {
		const y = pad.top + ((h - pad.top - pad.bottom) * i) / 4;
		ctx.beginPath();
		ctx.moveTo(pad.left, y);
		ctx.lineTo(w - pad.right, y);
		ctx.stroke();

		let val: number;
		if (logScale) {
			const logMin = Math.log10(Math.max(minVal, 0.01));
			const logMax = Math.log10(maxVal);
			val = 10 ** (logMax - ((logMax - logMin) * i) / 4);
		} else {
			val = maxVal * (1 - i / 4);
		}
		ctx.fillStyle = "#484f58";
		ctx.font = "10px monospace";
		ctx.textAlign = "right";
		ctx.fillText(formatNum(val), pad.left - 8, y + 4);
	}

	// Time labels
	ctx.textAlign = "center";
	const step = Math.floor(data.length / 6) || 1;
	for (let i = 0; i < data.length; i += step) {
		const x = toX(i);
		ctx.fillStyle = "#484f58";
		ctx.fillText(formatTime(data[i].time), x, h - 8);
	}

	// Line
	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	ctx.beginPath();
	for (let i = 0; i < data.length; i++) {
		const x = toX(i);
		const y = toY(values[i]);
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.stroke();

	// Fill under
	ctx.globalAlpha = 0.1;
	ctx.lineTo(toX(data.length - 1), h - pad.bottom);
	ctx.lineTo(toX(0), h - pad.bottom);
	ctx.fillStyle = color;
	ctx.fill();
	ctx.globalAlpha = 1;

	// Label
	ctx.fillStyle = color;
	ctx.font = "bold 12px monospace";
	ctx.textAlign = "left";
	ctx.fillText(
		label + (logScale ? " (log scale)" : ""),
		pad.left + 8,
		pad.top - 10,
	);
}

interface SimChartProps {
	snapshots: SimSnapshot[];
	dataKey: keyof SimSnapshot;
	color: string;
	label: string;
	logScale?: boolean;
}

export function SimChart({
	snapshots,
	dataKey,
	color,
	label,
	logScale = true,
}: SimChartProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const wrapper = wrapperRef.current;
		if (!canvas || !wrapper || snapshots.length < 2) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const w = wrapper.clientWidth - 32;
		const h = 280;
		canvas.width = w;
		canvas.height = h;

		drawChart(ctx, w, h, snapshots, dataKey, color, label, logScale);
	}, [snapshots, dataKey, color, label, logScale]);

	return (
		<div ref={wrapperRef} css={wrapperCss}>
			<canvas ref={canvasRef} css={canvasCss} />
		</div>
	);
}
