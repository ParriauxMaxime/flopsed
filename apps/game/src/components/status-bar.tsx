import { css } from "@emotion/react";
import { aiModels, tiers, useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useEffect, useRef, useState } from "react";

const barCss = css({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	padding: "2px 12px",
	background: "#0d1117",
	borderTop: "1px solid #1e2630",
	fontSize: 11,
	fontFamily: "'Courier New', monospace",
	flexShrink: 0,
	height: 24,
});

const leftCss = css({
	display: "flex",
	alignItems: "center",
	gap: 16,
});

const rightCss = css({
	display: "flex",
	alignItems: "center",
	gap: 16,
});

const statCss = css({
	display: "flex",
	alignItems: "center",
	gap: 4,
	whiteSpace: "nowrap",
	fontVariantNumeric: "tabular-nums",
});

const rateCss = css({
	color: "#484f58",
	fontSize: 10,
});

const execBarCss = css({
	display: "flex",
	alignItems: "center",
	padding: "0 12px",
	background: "#0d1117",
	borderTop: "1px solid #1e2630",
	flexShrink: 0,
	height: 28,
});

const execBtnCss = css({
	flex: 1,
	padding: "4px 0",
	fontSize: 11,
	fontWeight: "bold",
	fontFamily: "inherit",
	textTransform: "uppercase",
	letterSpacing: 1,
	border: "1px solid #7ee787",
	borderRadius: 3,
	cursor: "pointer",
	transition: "all 0.1s",
	background: "transparent",
	color: "#7ee787",
	"&:hover": { background: "#7ee787", color: "#0d1117" },
	"&:active": { transform: "scale(0.97)" },
});

const autoExecLabelCss = css({
	flex: 1,
	padding: "4px 0",
	fontSize: 11,
	fontWeight: "bold",
	fontFamily: "inherit",
	textTransform: "uppercase",
	letterSpacing: 1,
	textAlign: "center",
	color: "#3fb950",
	border: "1px solid #238636",
	borderRadius: 3,
	background: "rgba(35, 134, 54, 0.1)",
});

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

export function StatusBar() {
	const cash = useGameStore((s) => s.cash);
	const loc = useGameStore((s) => s.loc);
	const totalLoc = useGameStore((s) => s.totalLoc);
	const totalCash = useGameStore((s) => s.totalCash);
	const totalExecutedLoc = useGameStore((s) => s.totalExecutedLoc);
	const flops = useGameStore((s) => s.flops);
	const currentTierIndex = useGameStore((s) => s.currentTierIndex);
	const cashMultiplier = useGameStore((s) => s.cashMultiplier);
	const aiUnlocked = useGameStore((s) => s.aiUnlocked);
	const unlockedModels = useGameStore((s) => s.unlockedModels);
	const autoExec = useGameStore((s) => s.autoExecuteEnabled);
	const executeManual = useGameStore((s) => s.executeManual);

	const locRate = useRatePerSec(totalLoc);
	const cashRate = useRatePerSec(totalCash);
	const execRate = useRatePerSec(totalExecutedLoc);

	const tier = tiers[currentTierIndex];
	const cashPerLoc = tier?.cashPerLoc ?? 0.1;

	let aiFlopsCost = 0;
	if (aiUnlocked) {
		for (const model of aiModels) {
			if (unlockedModels[model.id]) aiFlopsCost += model.flopsCost;
		}
	}
	const execFlops = Math.max(0, flops - Math.min(aiFlopsCost, flops));
	const execLoc = Math.min(Math.floor(execFlops), Math.floor(loc));
	const earnPerExec = execLoc * cashPerLoc * cashMultiplier;

	return (
		<>
			{!autoExec && (
				<div css={execBarCss}>
					<button
						type="button"
						css={execBtnCss}
						onClick={executeManual}
						disabled={execLoc <= 0}
					>
						⚡ Execute {formatNumber(execLoc)} queued → $
						{formatNumber(earnPerExec, true)}
					</button>
				</div>
			)}
			{autoExec && (
				<div css={execBarCss}>
					<div css={autoExecLabelCss}>
						⚡ Auto-Execute — +${formatNumber(cashRate, true)}/s
					</div>
				</div>
			)}
			<div css={barCss}>
				<div css={leftCss}>
					<span css={statCss}>
						<span style={{ color: "#3fb950" }}>
							${formatNumber(cash, true)}
						</span>
						{cashRate > 0.1 && (
							<span css={rateCss}>(+${formatNumber(cashRate, true)}/s)</span>
						)}
					</span>
					<span css={statCss}>
						<span style={{ color: "#58a6ff" }}>
							◇ {formatNumber(loc)} LoC
						</span>
						{locRate > 0.1 && (
							<span css={rateCss}>(+{formatNumber(locRate)}/s)</span>
						)}
					</span>
					<span css={statCss}>
						<span style={{ color: "#fbbf24" }}>
							⚡ {formatNumber(flops)} FLOPS
						</span>
						{execRate > 0.1 && (
							<span css={rateCss}>({formatNumber(execRate)} exec/s)</span>
						)}
					</span>
				</div>
				<div css={rightCss}>
					<span style={{ color: "#8b949e" }}>{tier?.name ?? "—"}</span>
					<span style={{ color: "#484f58" }}>Python</span>
					<span style={{ color: "#484f58" }}>UTF-8</span>
				</div>
			</div>
		</>
	);
}
