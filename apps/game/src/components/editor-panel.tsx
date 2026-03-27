import { css } from "@emotion/react";
import { Editor } from "@modules/editor";
import { useGameStore } from "@modules/game";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { CliPrompt } from "./cli-prompt";

const wrapperCss = css({
	display: "flex",
	flexDirection: "column",
	flex: 1,
	overflow: "hidden",
});

const sectionCss = css({
	display: "flex",
	flexDirection: "column",
	overflow: "hidden",
	transition: "flex 0.5s ease",
});

const tabBarCss = css({
	display: "flex",
	background: "#0d1117",
	borderBottom: "1px solid #1e2630",
	flexShrink: 0,
});

const tabCss = css({
	padding: "6px 16px",
	fontSize: 12,
	color: "#c9d1d9",
	background: "#141920",
	border: "none",
	borderRight: "1px solid #1e2630",
	borderBottom: "1px solid #141920",
	marginBottom: -1,
	fontFamily: "inherit",
	whiteSpace: "nowrap",
});

const contentCss = css({
	flex: 1,
	overflow: "hidden",
	display: "flex",
	flexDirection: "column",
});

const dividerCss = css({
	height: 1,
	background: "#1e2630",
	flexShrink: 0,
});

export function EditorPanel() {
	const tierIndex = useGameStore((s) => s.currentTierIndex);
	const autoLocPerSec = useGameStore((s) => s.autoLocPerSec);
	const aiUnlocked = useGameStore((s) => s.aiUnlocked);

	const showDashboard = autoLocPerSec > 0 || tierIndex >= 2;
	const showEditor = !aiUnlocked;
	const showPrompt = aiUnlocked;

	return (
		<div css={wrapperCss} data-tutorial="editor">
			{showDashboard && (
				<div css={sectionCss} style={{ flex: showEditor ? 2 : 3 }}>
					<AnalyticsDashboard />
				</div>
			)}

			{showDashboard && (showEditor || showPrompt) && <div css={dividerCss} />}

			{showEditor && (
				<div css={sectionCss} style={{ flex: showDashboard ? 3 : 1 }}>
					<div css={tabBarCss}>
						<div css={tabCss}>agi.py</div>
					</div>
					<div css={contentCss}>
						<Editor />
					</div>
				</div>
			)}

			{showPrompt && (
				<div css={sectionCss} style={{ flex: 2 }}>
					<CliPrompt />
				</div>
			)}
		</div>
	);
}
