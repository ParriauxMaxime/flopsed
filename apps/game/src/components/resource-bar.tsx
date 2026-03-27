import { css, keyframes } from "@emotion/react";
import { aiModels, tiers, useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useCallback, useEffect, useRef, useState } from "react";
import { RollingNumber } from "./rolling-number";

const barStyle = css({
	display: "flex",
	gap: 8,
	padding: "14px 12px 10px",
	borderBottom: "1px solid #1e2630",
	background: "#161b22",
});

const statCellCss = css({
	flex: 1,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	gap: 2,
	minWidth: 0,
});

const valueCss = css({
	fontSize: 22,
	fontWeight: "bold",
	lineHeight: 1.1,
	fontVariantNumeric: "tabular-nums",
	whiteSpace: "nowrap",
});

const labelCss = css({
	fontSize: 10,
	textTransform: "uppercase",
	letterSpacing: 0.5,
	color: "#6272a4",
});

const rateCss = css({
	fontSize: 10,
	color: "#3fb950",
	minHeight: 14,
});

const dividerCss = css({
	width: 1,
	background: "#1e2630",
	alignSelf: "stretch",
	margin: "2px 0",
});

// ── Rate tracker: snapshot every 1s, display delta ──

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

const execPulse = keyframes({
	"0%": { boxShadow: "0 0 0 0 rgba(126, 231, 135, 0.4)" },
	"70%": { boxShadow: "0 0 0 6px rgba(126, 231, 135, 0)" },
	"100%": { boxShadow: "0 0 0 0 rgba(126, 231, 135, 0)" },
});

const execBarCss = css({
	display: "flex",
	padding: "6px 12px",
	borderBottom: "1px solid #1e2630",
	background: "#161b22",
});

const execBtnCss = css({
	flex: 1,
	padding: "8px 0",
	fontSize: 12,
	fontWeight: "bold",
	fontFamily: "inherit",
	textTransform: "uppercase",
	letterSpacing: 1,
	border: "1px solid #7ee787",
	borderRadius: 4,
	cursor: "pointer",
	transition: "all 0.1s",
	background: "transparent",
	color: "#7ee787",
	"&:hover": { background: "#7ee787", color: "#0d1117" },
	"&:active": {
		transform: "scale(0.97)",
		animation: `${execPulse} 0.3s ease-out`,
	},
});

const autoExecLabelCss = css({
	flex: 1,
	padding: "8px 0",
	fontSize: 12,
	fontWeight: "bold",
	fontFamily: "inherit",
	textTransform: "uppercase",
	letterSpacing: 1,
	textAlign: "center",
	color: "#3fb950",
	border: "1px solid #238636",
	borderRadius: 4,
	background: "rgba(35, 134, 54, 0.1)",
});

export function ResourceBar() {
	const loc = useGameStore((s) => s.loc);
	const cash = useGameStore((s) => s.cash);
	const totalLoc = useGameStore((s) => s.totalLoc);
	const totalCash = useGameStore((s) => s.totalCash);
	const totalExecutedLoc = useGameStore((s) => s.totalExecutedLoc);
	const flops = useGameStore((s) => s.flops);
	const aiUnlocked = useGameStore((s) => s.aiUnlocked);
	const unlockedModels = useGameStore((s) => s.unlockedModels);
	const currentTierIndex = useGameStore((s) => s.currentTierIndex);
	const cashMultiplier = useGameStore((s) => s.cashMultiplier);
	const autoExec = useGameStore((s) => s.autoExecuteEnabled);
	const executeManual = useGameStore((s) => s.executeManual);

	const locRate = useRatePerSec(totalLoc);
	const cashRate = useRatePerSec(totalCash);
	const execRate = useRatePerSec(totalExecutedLoc);

	const handleExec = useCallback(() => {
		executeManual();
	}, [executeManual]);

	const tier = tiers[currentTierIndex];
	const cashPerLoc = tier?.cashPerLoc ?? 0.1;

	// Compute FLOPS remaining after AI models consume their share
	let aiFlopsCost = 0;
	if (aiUnlocked) {
		for (const model of aiModels) {
			if (unlockedModels[model.id]) aiFlopsCost += model.flopsCost;
		}
	}
	const execFlops = Math.max(0, flops - Math.min(aiFlopsCost, flops));

	return (
		<>
			<div css={barStyle}>
				<div css={statCellCss} data-tutorial="loc">
					<div css={valueCss}>
						<RollingNumber value={formatNumber(loc)} color="#58a6ff" />
					</div>
					<div css={labelCss}>Queued</div>
					<div css={rateCss}>
						{locRate > 0.1 ? `${formatNumber(locRate)} loc/s` : ""}
					</div>
				</div>

				<div css={dividerCss} />

				<div css={statCellCss} data-tutorial="cash">
					<div css={valueCss}>
						<RollingNumber
							value={`$${formatNumber(cash, true)}`}
							color="#d19a66"
						/>
					</div>
					<div css={labelCss}>Cash</div>
					<div css={rateCss}>
						{cashRate > 0.1 ? `+$${formatNumber(cashRate, true)}/s` : ""}
					</div>
				</div>

				<div css={dividerCss} />

				<div css={statCellCss} data-tutorial="flops">
					<div css={valueCss}>
						<RollingNumber value={formatNumber(flops)} color="#c678dd" />
					</div>
					<div css={labelCss}>FLOPS</div>
					<div css={rateCss}>
						{execRate > 0.1 ? `${formatNumber(execRate)} loc/s` : ""}
					</div>
				</div>
			</div>
			<div css={execBarCss} data-tutorial="execute">
				{autoExec ? (
					<div css={autoExecLabelCss}>
						⚡ Auto-Execute — +${formatNumber(cashRate, true)}/s
					</div>
				) : (
					(() => {
						const execLoc = Math.min(Math.floor(execFlops), Math.floor(loc));
						const earnPerExec = execLoc * cashPerLoc * cashMultiplier;
						return (
							<button
								type="button"
								css={execBtnCss}
								onClick={handleExec}
								disabled={execLoc <= 0}
							>
								⚡ Execute {formatNumber(execLoc)} queued → $
								{formatNumber(earnPerExec, true)}
							</button>
						);
					})()
				)}
			</div>
		</>
	);
}
