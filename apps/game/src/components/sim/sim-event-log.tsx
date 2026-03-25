import type { SimLogEntry } from "@agi-rush/engine";
import { css } from "@emotion/react";
import { formatNumber, formatTime } from "@utils/format";

const containerCss = css({
	background: "#0d1117",
	border: "1px solid #1e2630",
	borderRadius: 6,
	padding: 16,
	maxHeight: 400,
	overflowY: "auto",
});

const entryCss = css({
	fontSize: 12,
	padding: "3px 0",
	borderBottom: "1px solid #0a0e14",
	display: "flex",
	gap: 12,
});

const timeCss = css({ color: "#6272a4", minWidth: 60 });
const eventCss = css({ color: "#abb2bf", flex: 1 });
const cashCss = css({ color: "#3fb950", minWidth: 90, textAlign: "right" });
const locCss = css({ color: "#58a6ff", minWidth: 80, textAlign: "right" });
const flopsCss = css({ color: "#e5c07b", minWidth: 70, textAlign: "right" });

function rowBg(type: string): string | undefined {
	if (type === "tier-unlock") return "#1a1040";
	if (type === "ai-unlock") return "#0e1a1a";
	return undefined;
}

export function SimEventLog({ log }: { log: SimLogEntry[] }) {
	if (log.length === 0) {
		return (
			<div
				css={[containerCss, { color: "#484f58", textAlign: "center" as const }]}
			>
				No events
			</div>
		);
	}

	return (
		<div css={containerCss}>
			{log.map((entry, i) => (
				<div
					key={i}
					css={entryCss}
					style={
						rowBg(entry.type) ? { background: rowBg(entry.type) } : undefined
					}
				>
					<span css={timeCss}>{formatTime(entry.time)}</span>
					<span css={eventCss}>{entry.msg}</span>
					<span css={cashCss}>${formatNumber(entry.cash)}</span>
					<span css={locCss}>{formatNumber(entry.loc)} LoC</span>
					<span css={flopsCss}>{formatNumber(entry.flops)} F</span>
				</div>
			))}
		</div>
	);
}
