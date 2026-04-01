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
	flex: 1,
	fontSize: 13,
});

const linkCss = css({
	fontSize: 11,
	textDecoration: "none",
	"&:hover": { textDecoration: "underline" },
});

const linkRowCss = css({
	display: "flex",
	gap: 10,
	marginTop: 6,
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
				Type code. Execute it for cash. Scale from a garage to building AGI.
				Every upgrade brings you closer to making yourself obsolete. The
				keyboard is your first tool. The AI is your last.
			</p>

			<p css={pCss}>
				<a
					href="https://github.com/ParriauxMaxime/flopsed"
					target="_blank"
					rel="noreferrer"
					css={linkCss}
					style={{ color: theme.accent, fontSize: 13 }}
				>
					github.com/ParriauxMaxime/flopsed
				</a>
			</p>

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
					<div css={linkRowCss}>
						<a
							href="https://github.com/ParriauxMaxime"
							target="_blank"
							rel="noreferrer"
							css={linkCss}
							style={{ color: theme.accent }}
						>
							GitHub
						</a>
						<a
							href="https://parriauxmaxime.github.io/"
							target="_blank"
							rel="noreferrer"
							css={linkCss}
							style={{ color: theme.accent }}
						>
							Website
						</a>
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
						Noe Maire-Amiot
					</div>
					<div style={{ color: theme.textMuted, fontSize: 12 }}>
						Human developer
					</div>
					<div style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
						Game design, art direction, UX, playtesting.
						<br />
						The one who makes it look good.
					</div>
					<div css={linkRowCss}>
						<a
							href="https://noemaireamiot.com/"
							target="_blank"
							rel="noreferrer"
							css={linkCss}
							style={{ color: theme.accent }}
						>
							Website
						</a>
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
					<div css={linkRowCss}>
						<a
							href="https://claude.ai"
							target="_blank"
							rel="noreferrer"
							css={linkCss}
							style={{ color: theme.accent }}
						>
							claude.ai
						</a>
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
				MIT{" "}
				<span style={{ color: theme.textMuted }}>
					— because the singularity should be open source.
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
