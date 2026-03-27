import { css } from "@emotion/react";
import { Editor } from "@modules/editor";
import { useGameStore } from "@modules/game";

const panelCss = css({
	display: "flex",
	flexDirection: "column",
	flex: 1,
	minWidth: 280,
	borderRight: "1px solid #1e2630",
	overflow: "hidden",
});

const subPanelCss = css({
	display: "flex",
	flexDirection: "column",
	flex: 1,
	overflow: "hidden",
	minHeight: 0,
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

const dimTabCss = css(tabCss, {
	color: "#5c6370",
	background: "#0d1117",
	borderBottom: "1px solid #1e2630",
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

const files = ["agi.py", "wasm.rs", "agi.go"];

export function EditorPanel() {
	const tierIndex = useGameStore((s) => s.currentTierIndex);
	const hasTeams = tierIndex >= 3;

	if (!hasTeams) {
		return (
			<div css={panelCss} data-tutorial="editor">
				<div css={tabBarCss}>
					<div css={tabCss}>agi.py</div>
				</div>
				<div css={contentCss}>
					<Editor />
				</div>
			</div>
		);
	}

	return (
		<div css={panelCss} data-tutorial="editor">
			{files.map((file, i) => (
				<div key={file} css={subPanelCss}>
					{i > 0 && <div css={dividerCss} />}
					<div css={tabBarCss}>
						<div css={i === 0 ? tabCss : dimTabCss}>{file}</div>
					</div>
					<div css={contentCss}>
						<Editor />
					</div>
				</div>
			))}
		</div>
	);
}
