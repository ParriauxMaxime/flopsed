import { css } from "@emotion/react";
import { tiers, useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";

const barStyle = css({
	background: "#161b22",
	padding: 16,
	borderBottom: "1px solid #1e2630",
	textAlign: "center",
});

const locCountStyle = css({
	fontSize: 32,
	fontWeight: "bold",
	color: "#58a6ff",
});

const labelStyle = css({
	fontSize: 12,
	color: "#6272a4",
	marginTop: 2,
});

const rateStyle = css({
	fontSize: 12,
	color: "#3fb950",
	marginTop: 4,
});

const cashStyle = css({
	fontSize: 18,
	fontWeight: "bold",
	color: "#d19a66",
	marginTop: 8,
});

const flopsStyle = css({
	fontSize: 12,
	color: "#c678dd",
	marginTop: 4,
});

const tierStyle = css({
	fontSize: 11,
	color: "#8be9fd",
	marginTop: 8,
	textTransform: "uppercase",
	letterSpacing: 1,
});

export function ResourceBar() {
	const loc = useGameStore((s) => s.loc);
	const cash = useGameStore((s) => s.cash);
	const flops = useGameStore((s) => s.flops);
	const autoLocPerSec = useGameStore((s) => s.autoLocPerSec);
	const currentTierIndex = useGameStore((s) => s.currentTierIndex);
	const cashMultiplier = useGameStore((s) => s.cashMultiplier);

	const tier = tiers[currentTierIndex];
	const cashPerSec = flops * tier.cashPerLoc * cashMultiplier;

	return (
		<div css={barStyle}>
			<div css={locCountStyle}>{formatNumber(loc)}</div>
			<div css={labelStyle}>lines of code</div>
			{autoLocPerSec > 0 && (
				<div css={rateStyle}>{formatNumber(autoLocPerSec)} LoC/s</div>
			)}
			<div css={cashStyle}>${formatNumber(cash, true)}</div>
			{cashPerSec > 0 && (
				<div css={rateStyle}>${formatNumber(cashPerSec, true)}/s</div>
			)}
			<div css={flopsStyle}>{formatNumber(flops)} FLOPS</div>
			<div css={tierStyle}>{tier.name}</div>
		</div>
	);
}
