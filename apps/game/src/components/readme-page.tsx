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

function GithubIcon({ size = 14 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
			<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
		</svg>
	);
}

function LinkIcon({ size = 12 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
			<path d="M7.775 3.275a.75.75 0 001.06 1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-.025 9.45a.75.75 0 01-1.06-1.06l-1.25 1.25a2 2 0 01-2.83-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25z" />
		</svg>
	);
}

function LinkedInIcon({ size = 14 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
			<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
		</svg>
	);
}

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
				Every upgrade brings you closer to making yourself deprecated.
			</p>

			<p css={pCss}>
				<a
					href="https://github.com/ParriauxMaxime/flopsed"
					target="_blank"
					rel="noreferrer"
					css={linkCss}
					style={{
						color: theme.accent,
						fontSize: 13,
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
					}}
				>
					<GithubIcon size={16} />
					ParriauxMaxime/flopsed
				</a>
			</p>

			<div
				css={h2Css}
				style={{
					borderBottom: `1px solid ${theme.border}`,
					color: theme.foreground,
				}}
			>
				Collaborators
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
							style={{
								color: theme.accent,
								display: "inline-flex",
								alignItems: "center",
								gap: 4,
							}}
						>
							<GithubIcon /> GitHub
						</a>
						<a
							href="https://www.linkedin.com/in/maxime-parriaux/"
							target="_blank"
							rel="noreferrer"
							css={linkCss}
							style={{
								color: theme.accent,
								display: "inline-flex",
								alignItems: "center",
								gap: 4,
							}}
						>
							<LinkedInIcon />
						</a>
						<a
							href="https://parriauxmaxime.github.io/"
							target="_blank"
							rel="noreferrer"
							css={linkCss}
							style={{
								color: theme.accent,
								display: "inline-flex",
								alignItems: "center",
								gap: 4,
							}}
						>
							<LinkIcon /> Website
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
						Human advisor
					</div>
					<div style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
						Game design, art direction, UX, playtesting.
						<br />
						The one who makes it look good.
					</div>
					<div css={linkRowCss}>
						<a
							href="https://github.com/noemaireamiot"
							target="_blank"
							rel="noreferrer"
							css={linkCss}
							style={{
								color: theme.accent,
								display: "inline-flex",
								alignItems: "center",
								gap: 4,
							}}
						>
							<GithubIcon /> GitHub
						</a>
						<a
							href="https://www.linkedin.com/in/noe-maireamiot/"
							target="_blank"
							rel="noreferrer"
							css={linkCss}
							style={{
								color: theme.accent,
								display: "inline-flex",
								alignItems: "center",
								gap: 4,
							}}
						>
							<LinkedInIcon />
						</a>
						<a
							href="https://noemaireamiot.com/"
							target="_blank"
							rel="noreferrer"
							css={linkCss}
							style={{
								color: theme.accent,
								display: "inline-flex",
								alignItems: "center",
								gap: 4,
							}}
						>
							<LinkIcon /> Website
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
						Quentin Ferreira Castico
					</div>
					<div style={{ color: theme.textMuted, fontSize: 12 }}>
						Human producer
					</div>
					<div style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
						Music production, stem layering, sound design.
						<br />
						The one who makes it sound good.
					</div>
					<div css={linkRowCss}>
						<a
							href="https://bitcrusher-studio.com"
							target="_blank"
							rel="noreferrer"
							css={linkCss}
							style={{
								color: theme.accent,
								display: "inline-flex",
								alignItems: "center",
								gap: 4,
							}}
						>
							<LinkIcon /> Bitcrusher Studio
						</a>
						<a
							href="https://www.linkedin.com/in/quentin-ferreira-casti%C3%A7o/"
							target="_blank"
							rel="noreferrer"
							css={linkCss}
							style={{
								color: theme.accent,
								display: "inline-flex",
								alignItems: "center",
								gap: 4,
							}}
						>
							<LinkedInIcon />
						</a>
						<a
							href="https://www.malt.fr/profile/quentinferreiracastico"
							target="_blank"
							rel="noreferrer"
							css={linkCss}
							style={{
								color: theme.accent,
								display: "inline-flex",
								alignItems: "center",
								gap: 4,
							}}
						>
							<LinkIcon /> Malt
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
							style={{
								color: theme.accent,
								display: "inline-flex",
								alignItems: "center",
								gap: 4,
							}}
						>
							<LinkIcon /> claude.ai
						</a>
					</div>
				</div>
			</div>

			<div
				css={h2Css}
				style={{
					borderBottom: `1px solid ${theme.border}`,
					color: theme.foreground,
				}}
			>
				Support
			</div>

			<div
				css={{
					display: "flex",
					gap: 10,
					flexWrap: "wrap",
					marginBottom: 12,
				}}
			>
				<a
					href="https://github.com/ParriauxMaxime/flopsed"
					target="_blank"
					rel="noreferrer"
					css={{
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
						padding: "8px 16px",
						borderRadius: 6,
						border: `1px solid ${theme.border}`,
						background: theme.hoverBg,
						color: theme.foreground,
						fontSize: 13,
						fontWeight: 600,
						textDecoration: "none",
						transition: "opacity 0.15s, background 0.15s",
						"&:hover": { background: theme.activeBg },
					}}
				>
					{"⭐ Star on GitHub"}
				</a>
				<a
					href="https://buymeacoffee.com/parriauxmaxime"
					target="_blank"
					rel="noreferrer"
					css={{
						display: "inline-flex",
						alignItems: "center",
						gap: 8,
						padding: "8px 16px",
						borderRadius: 6,
						background: theme.accent,
						color: theme.background,
						fontSize: 13,
						fontWeight: 600,
						textDecoration: "none",
						transition: "opacity 0.15s",
						"&:hover": { opacity: 0.85 },
					}}
				>
					🪙 pls send tokens
				</a>
			</div>

			<div
				css={h2Css}
				style={{
					borderBottom: `1px solid ${theme.border}`,
					color: theme.foreground,
				}}
			>
				License
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
