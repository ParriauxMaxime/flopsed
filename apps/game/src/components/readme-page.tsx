import { css } from "@emotion/react";
import { useIdeTheme } from "../hooks/use-ide-theme";

const wrapperCss = css({
	flex: 1,
	overflow: "auto",
	padding: "24px 32px",
	fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
	lineHeight: 1.7,
	maxWidth: 800,
	"&::-webkit-scrollbar": { width: 6 },
	"&::-webkit-scrollbar-thumb": { borderRadius: 3 },
});

const h1Css = css({
	fontSize: 28,
	fontWeight: 700,
	marginBottom: 4,
	display: "flex",
	alignItems: "center",
	gap: 12,
});

const badgeCss = css({
	display: "inline-block",
	fontSize: 11,
	padding: "2px 10px",
	borderRadius: 12,
	fontWeight: 600,
	letterSpacing: 0.5,
});

const pCss = css({
	fontSize: 14,
	marginBottom: 16,
});

const h2Css = css({
	fontSize: 18,
	fontWeight: 600,
	marginTop: 28,
	marginBottom: 10,
	paddingBottom: 6,
});

const codeCss = css({
	fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
	fontSize: 12,
	padding: "2px 6px",
	borderRadius: 3,
});

const blockCss = css({
	fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
	fontSize: 12,
	padding: "12px 16px",
	borderRadius: 6,
	marginBottom: 16,
	lineHeight: 1.8,
	overflowX: "auto",
});

const collaboratorsCss = css({
	display: "flex",
	gap: 16,
	flexWrap: "wrap",
	marginBottom: 16,
});

const cardCss = css({
	padding: "12px 16px",
	borderRadius: 8,
	minWidth: 200,
	fontSize: 13,
});

const listCss = css({
	fontSize: 14,
	paddingLeft: 20,
	marginBottom: 16,
	"& li": { marginBottom: 6 },
});

export function ReadmePage() {
	const theme = useIdeTheme();

	return (
		<div
			css={wrapperCss}
			style={
				{
					background: theme.background,
					color: theme.foreground,
					"&::-webkit-scrollbar-thumb": { background: theme.border },
				} as React.CSSProperties
			}
		>
			<div css={h1Css}>
				flopsed
				<span
					css={badgeCss}
					style={{
						background: `${theme.success}20`,
						color: theme.success,
					}}
				>
					v1.0
				</span>
				<span
					css={badgeCss}
					style={{
						background: `${theme.accent}20`,
						color: theme.accent,
					}}
				>
					incremental
				</span>
			</div>

			<p css={pCss} style={{ color: theme.textMuted, fontStyle: "italic" }}>
				An incremental game about building the thing that replaces you.
			</p>

			<p css={pCss}>
				Type code. Execute it for cash. Scale from a garage to building AGI. The
				meta joke: every upgrade brings you closer to making yourself obsolete.
				The keyboard is your first tool. The AI is your last.
			</p>

			<div
				css={h2Css}
				style={{
					borderBottom: `1px solid ${theme.border}`,
					color: theme.accent,
				}}
			>
				## Quick Start
			</div>

			<div
				css={blockCss}
				style={{ background: theme.panelBg, color: theme.foreground }}
			>
				<span style={{ color: theme.comment }}>{"# "}</span>
				<span style={{ color: theme.keyword }}>git clone</span>{" "}
				<span style={{ color: theme.string }}>
					github.com/ParriauxMaxime/flopsed
				</span>
				<br />
				<span style={{ color: theme.comment }}>{"# "}</span>
				<span style={{ color: theme.keyword }}>npm install</span>
				{" && "}
				<span style={{ color: theme.keyword }}>npm run dev</span>
				<br />
				<span style={{ color: theme.comment }}>{"# "}</span>
				open <span style={{ color: theme.string }}>localhost:3000</span>{" "}
				<span style={{ color: theme.comment }}>{"// start typing"}</span>
			</div>

			<div
				css={h2Css}
				style={{
					borderBottom: `1px solid ${theme.border}`,
					color: theme.accent,
				}}
			>
				## The Loop
			</div>

			<div
				css={blockCss}
				style={{ background: theme.panelBg, color: theme.foreground }}
			>
				<span style={{ color: theme.comment }}>
					{"You type  ->  LoC pile up  ->  FLOPS execute  ->  Cash flows"}
				</span>
				<br />
				<span style={{ color: theme.comment }}>
					{"Cash buys ->  more devs    ->  more FLOPS     ->  more cash"}
				</span>
				<br />
				<span style={{ color: theme.comment }}>
					{"Until    ->  AI writes     ->  code for you   ->  ???"}
				</span>
			</div>

			<div
				css={h2Css}
				style={{
					borderBottom: `1px solid ${theme.border}`,
					color: theme.accent,
				}}
			>
				## Tech Stack
			</div>

			<ul css={listCss}>
				<li>
					<span css={codeCss} style={{ background: theme.panelBg }}>
						React 19
					</span>
					{" + "}
					<span css={codeCss} style={{ background: theme.panelBg }}>
						Emotion
					</span>{" "}
					for the IDE shell
				</li>
				<li>
					<span css={codeCss} style={{ background: theme.panelBg }}>
						Zustand
					</span>{" "}
					for state (persisted to localStorage)
				</li>
				<li>
					<span css={codeCss} style={{ background: theme.panelBg }}>
						Rspack
					</span>{" "}
					for builds (sub-second HMR)
				</li>
				<li>
					<span css={codeCss} style={{ background: theme.panelBg }}>
						TypeScript
					</span>{" "}
					strict mode, no exceptions
				</li>
				<li>
					8 languages via{" "}
					<span css={codeCss} style={{ background: theme.panelBg }}>
						i18next
					</span>
				</li>
			</ul>

			<div
				css={h2Css}
				style={{
					borderBottom: `1px solid ${theme.border}`,
					color: theme.accent,
				}}
			>
				## Collaborators
			</div>

			<div css={collaboratorsCss}>
				<div
					css={cardCss}
					style={{
						background: theme.panelBg,
						border: `1px solid ${theme.border}`,
					}}
				>
					<div
						style={{
							fontWeight: 700,
							marginBottom: 4,
							color: theme.foreground,
						}}
					>
						Maxime Parriaux
					</div>
					<div style={{ color: theme.textMuted, fontSize: 12 }}>
						Human developer
					</div>
					<div style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
						Game design, balance, architecture, deployment.
						<br />
						The one who types. For now.
					</div>
				</div>
				<div
					css={cardCss}
					style={{
						background: theme.panelBg,
						border: `1px solid ${theme.border}`,
					}}
				>
					<div
						style={{
							fontWeight: 700,
							marginBottom: 4,
							color: theme.foreground,
						}}
					>
						Claude
					</div>
					<div style={{ color: theme.textMuted, fontSize: 12 }}>
						AI collaborator (Anthropic)
					</div>
					<div style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
						Implementation, sim engine, prestige system, i18n.
						<br />
						The one who writes the code that writes the code.
					</div>
				</div>
			</div>

			<div
				css={h2Css}
				style={{
					borderBottom: `1px solid ${theme.border}`,
					color: theme.accent,
				}}
			>
				## License
			</div>

			<p css={pCss}>
				<span css={codeCss} style={{ background: theme.panelBg }}>
					MIT
				</span>{" "}
				<span style={{ color: theme.textMuted }}>
					-- because the singularity should be open source.
				</span>
			</p>

			<p
				css={pCss}
				style={{
					color: theme.textMuted,
					fontSize: 11,
					marginTop: 32,
					fontStyle: "italic",
				}}
			>
				Built with mass keystrokes and mass token consumption.
			</p>
		</div>
	);
}
