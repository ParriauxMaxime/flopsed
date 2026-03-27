import { css } from "@emotion/react";
import { useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useCallback, useState } from "react";

interface MobileResourceBarProps {
	onOpenSettings: () => void;
}

const barCss = css({
	position: "sticky",
	top: 0,
	display: "flex",
	flexDirection: "column",
	background: "#0d1117",
	borderBottom: "1px solid #1e2630",
	zIndex: 100,
});

const statsRowCss = css({
	display: "flex",
	alignItems: "center",
	gap: 12,
	padding: "8px 12px",
});

const statCss = css({
	display: "flex",
	flexDirection: "row",
	alignItems: "center",
	gap: 4,
	fontSize: 14,
	fontVariantNumeric: "tabular-nums",
	whiteSpace: "nowrap",
});

const gearButtonCss = css({
	marginLeft: "auto",
	background: "none",
	border: "none",
	fontSize: 16,
	color: "#8b949e",
	cursor: "pointer",
	padding: 0,
	lineHeight: 1,
});

const sliderRowCss = css({
	display: "flex",
	alignItems: "center",
	gap: 8,
	padding: "6px 12px 8px",
	borderTop: "1px solid #1e2630",
});

const sliderLabelCss = css({
	fontSize: 10,
	color: "#8b949e",
	whiteSpace: "nowrap",
});

const sliderInputCss = css({
	flex: 1,
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

export function MobileResourceBar({ onOpenSettings }: MobileResourceBarProps) {
	const cash = useGameStore((s) => s.cash);
	const loc = useGameStore((s) => s.loc);
	const flops = useGameStore((s) => s.flops);
	const aiUnlocked = useGameStore((s) => s.aiUnlocked);

	return (
		<div css={barCss}>
			<div css={statsRowCss}>
				<span css={[statCss, { color: "#d19a66" }]}>
					{"💰"} ${formatNumber(cash, true)}
				</span>
				<span css={[statCss, { color: "#58a6ff" }]}>
					{"📝"} {formatNumber(loc)}
				</span>
				{aiUnlocked && (
					<span css={[statCss, { color: "#c678dd" }]}>
						{"⚡"} {formatNumber(flops)}
					</span>
				)}
				<button type="button" css={gearButtonCss} onClick={onOpenSettings}>
					{"⚙"}
				</button>
			</div>
		</div>
	);
}
