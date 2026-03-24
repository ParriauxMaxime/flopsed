import { css } from "@emotion/react";
import { aiModels, useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useCallback, useMemo } from "react";

const wrapperCss = css({
	padding: "10px 12px",
	background: "#131820",
	borderBottom: "1px solid #1e2630",
});

const headerCss = css({
	display: "flex",
	justifyContent: "space-between",
	marginBottom: 6,
});

const labelCss = css({
	fontSize: 9,
	textTransform: "uppercase",
	letterSpacing: 0.5,
});

const sliderCss = css({
	width: "100%",
	height: 6,
	appearance: "none",
	background: "transparent",
	cursor: "pointer",
	"&::-webkit-slider-runnable-track": {
		height: 6,
		borderRadius: 3,
		background: "linear-gradient(90deg, #3fb950, #c678dd)",
	},
	"&::-webkit-slider-thumb": {
		appearance: "none",
		width: 14,
		height: 14,
		borderRadius: "50%",
		background: "#fff",
		border: "2px solid #c678dd",
		marginTop: -4,
	},
	"&::-moz-range-track": {
		height: 6,
		borderRadius: 3,
		background: "linear-gradient(90deg, #3fb950, #c678dd)",
	},
	"&::-moz-range-thumb": {
		width: 14,
		height: 14,
		borderRadius: "50%",
		background: "#fff",
		border: "2px solid #c678dd",
	},
});

const ratesCss = css({
	display: "flex",
	justifyContent: "space-between",
	marginTop: 4,
});

const rateCss = css({
	fontSize: 8,
	color: "#484e58",
});

export function FlopsSlider() {
	const aiUnlocked = useGameStore((s) => s.aiUnlocked);
	const flopSlider = useGameStore((s) => s.flopSlider);
	const flops = useGameStore((s) => s.flops);
	const unlockedModels = useGameStore((s) => s.unlockedModels);
	const setFlopSlider = useGameStore((s) => s.setFlopSlider);

	const execPct = Math.round(flopSlider * 100);
	const aiPct = 100 - execPct;
	const execFlops = flops * flopSlider;
	const aiFlops = flops * (1 - flopSlider);

	// Compute actual AI LoC/s rate (capped by available FLOPS)
	const aiLocPerSec = useMemo(() => {
		let totalAiLoc = 0;
		let totalAiFlops = 0;
		for (const model of aiModels) {
			if (unlockedModels[model.id]) {
				totalAiLoc += model.locPerSec;
				totalAiFlops += model.flopsCost;
			}
		}
		if (totalAiFlops === 0) return 0;
		return totalAiLoc * Math.min(1, aiFlops / totalAiFlops);
	}, [unlockedModels, aiFlops]);

	const onChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setFlopSlider(Number.parseFloat(e.target.value));
		},
		[setFlopSlider],
	);

	if (!aiUnlocked) return null;

	return (
		<div css={wrapperCss}>
			<div css={headerCss}>
				<span css={[labelCss, { color: "#3fb950" }]}>Exec {execPct}%</span>
				<span css={[labelCss, { color: "#c678dd" }]}>AI {aiPct}%</span>
			</div>
			<input
				type="range"
				min={0}
				max={1}
				step={0.01}
				value={flopSlider}
				onChange={onChange}
				css={sliderCss}
			/>
			<div css={ratesCss}>
				<span css={rateCss}>{formatNumber(execFlops)} loc/s exec</span>
				<span css={rateCss}>{formatNumber(aiLocPerSec)} loc/s gen</span>
			</div>
		</div>
	);
}
