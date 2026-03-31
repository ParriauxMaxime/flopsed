import { css, keyframes } from "@emotion/react";
import { useGameStore, useUiStore } from "@modules/game";
import { useMemo } from "react";
import { CODE_BLOCKS } from "../data/code-tokens";
import { EDITOR_THEMES } from "../data/editor-themes";

const LINE_HEIGHT = 21;
const VISIBLE_LINES = 40;

// Build a static HTML line buffer from CODE_BLOCKS (done once at module load)
function buildStaticLines(): string[] {
	const lines: string[] = [];
	for (const block of CODE_BLOCKS) {
		for (const line of block.lines) {
			lines.push(line);
		}
		lines.push(""); // blank between blocks
	}
	// Repeat to fill at least VISIBLE_LINES * 2 (for seamless loop)
	while (lines.length < VISIBLE_LINES * 2) {
		for (const block of CODE_BLOCKS) {
			for (const line of block.lines) {
				lines.push(line);
			}
			lines.push("");
		}
	}
	return lines;
}

const STATIC_LINES = buildStaticLines();
const HALF = Math.floor(STATIC_LINES.length / 2);

// ── Styles ──

const wrapperCss = css({
	flex: 1,
	position: "relative",
	overflow: "hidden",
	fontSize: 13,
	lineHeight: 1.6,
	contain: "strict",
});

const maskCss = css({
	position: "absolute",
	inset: 0,
	pointerEvents: "none",
	zIndex: 1,
	maskImage:
		"linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
	WebkitMaskImage:
		"linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
});

const linesCss = css({
	position: "absolute",
	left: 0,
	right: 0,
	willChange: "transform",
});

const lineCss = css({
	display: "flex",
	gap: 16,
	height: LINE_HEIGHT,
	padding: "0 16px",
	whiteSpace: "pre",
});

const lineNumCss = css({
	minWidth: 40,
	textAlign: "right",
	userSelect: "none",
	fontVariantNumeric: "tabular-nums",
});

const fillBarCss = css({
	position: "absolute",
	right: 2,
	top: 0,
	bottom: 0,
	width: 3,
	borderRadius: 2,
	transformOrigin: "bottom",
	transition: "transform 0.5s ease, opacity 0.5s ease",
	zIndex: 2,
});

export function StreamingEditor() {
	const autoLocPerSec = useGameStore((s) => s.autoLocPerSec);
	const loc = useGameStore((s) => s.loc);
	const flops = useGameStore((s) => s.flops);
	const editorTheme = useUiStore((s) => s.editorTheme);
	const theme = EDITOR_THEMES[editorTheme];

	// Scroll speed: map autoLocPerSec to animation duration
	// Higher production = faster scroll. Clamp between 4s (very fast) and 60s (slow).
	const scrollDuration = useMemo(() => {
		if (autoLocPerSec <= 0) return 0;
		const speed = Math.max(4, Math.min(60, 2000 / autoLocPerSec));
		return speed;
	}, [autoLocPerSec]);

	// Fill indicator: loc as fraction of a visual "buffer" (flops × 10 as max)
	const maxBuffer = Math.max(1, flops * 10);
	const fillRatio = Math.min(1, loc / maxBuffer);

	const scrollAnim = useMemo(
		() =>
			scrollDuration > 0
				? keyframes({
						"0%": { transform: "translateY(0)" },
						"100%": {
							transform: `translateY(-${HALF * LINE_HEIGHT}px)`,
						},
					})
				: null,
		[scrollDuration],
	);

	const themedWrapperCss = useMemo(
		() =>
			css(wrapperCss, {
				background: theme.background,
				color: theme.foreground,
				fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
				".kw": { color: theme.keyword },
				".fn": { color: theme.function },
				".str": { color: theme.string },
				".cm": { color: theme.comment, fontStyle: "italic" },
				".num": { color: theme.number },
				".op": { color: theme.operator },
				".type": { color: theme.type },
				".var": { color: theme.variable },
			}),
		[theme],
	);

	const animatedLinesCss = useMemo(
		() =>
			css(linesCss, {
				animation:
					scrollAnim && scrollDuration > 0
						? `${scrollAnim} ${scrollDuration}s linear infinite`
						: "none",
			}),
		[scrollAnim, scrollDuration],
	);

	return (
		<div css={themedWrapperCss}>
			<div css={maskCss}>
				<div css={animatedLinesCss}>
					{STATIC_LINES.map((line, i) => (
						<div css={lineCss} key={i}>
							<span css={lineNumCss} style={{ color: theme.lineNumbers }}>
								{(i % HALF) + 1}
							</span>
							<span dangerouslySetInnerHTML={{ __html: line || "&nbsp;" }} />
						</div>
					))}
				</div>
			</div>
			{/* Fill indicator bar */}
			<div
				css={fillBarCss}
				style={{
					background: theme.accent,
					opacity: fillRatio > 0.01 ? 0.4 : 0,
					transform: `scaleY(${fillRatio})`,
				}}
			/>
		</div>
	);
}
