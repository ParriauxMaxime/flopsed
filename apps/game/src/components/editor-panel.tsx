import { css } from "@emotion/react";
import { Editor, StreamingEditor } from "@modules/editor";
import { useGameStore } from "@modules/game";
import { useIdeTheme } from "../hooks/use-ide-theme";
import { CliPrompt } from "./cli-prompt";
import { FlopsSlider } from "./flops-slider";

const wrapperCss = css({
	display: "flex",
	flexDirection: "column",
	flex: 1,
	overflow: "hidden",
});

const editorAreaCss = css({
	overflow: "hidden",
	display: "flex",
	flexDirection: "column",
	minHeight: 0,
	boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
});

const contentCss = css({
	flex: 1,
	overflow: "hidden",
	display: "flex",
	flexDirection: "column",
});

export function EditorPanel() {
	const aiUnlocked = useGameStore((s) => s.aiUnlocked);
	const streamingMode = useGameStore((s) => s.editorStreamingMode);
	const theme = useIdeTheme();

	if (aiUnlocked) {
		// T4+: CLI prompt takes over entirely
		return (
			<div css={wrapperCss} data-tutorial="editor">
				<FlopsSlider />
				<div css={contentCss} style={{ background: theme.panelBg }}>
					<CliPrompt />
				</div>
			</div>
		);
	}

	// T2+ streaming: simplified CSS-driven editor
	if (streamingMode) {
		return (
			<div css={wrapperCss} data-tutorial="editor">
				<div css={editorAreaCss} style={{ flex: 1 }}>
					<StreamingEditor />
				</div>
			</div>
		);
	}

	// T0-early T2: Full block-based editor
	return (
		<div css={wrapperCss} data-tutorial="editor">
			<div css={editorAreaCss} style={{ flex: 1 }}>
				<Editor />
			</div>
		</div>
	);
}
