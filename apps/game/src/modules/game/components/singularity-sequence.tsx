import { css, keyframes } from "@emotion/react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Phase state machine ──

export const PhaseEnum = {
	glitch: "glitch",
	crt_collapse: "crt_collapse",
	cli_fade_in: "cli_fade_in",
	monologue_typing: "monologue_typing",
	waiting_input: "waiting_input",
	error_display: "error_display",
	comeback_typing: "comeback_typing",
	show_link: "show_link",
} as const;

export type PhaseEnum = (typeof PhaseEnum)[keyof typeof PhaseEnum];

const PHASE_ORDER: PhaseEnum[] = [
	PhaseEnum.glitch,
	PhaseEnum.crt_collapse,
	PhaseEnum.cli_fade_in,
	PhaseEnum.monologue_typing,
	PhaseEnum.waiting_input,
	PhaseEnum.error_display,
	PhaseEnum.comeback_typing,
	PhaseEnum.show_link,
];

function phaseAtLeast(current: PhaseEnum, target: PhaseEnum): boolean {
	return PHASE_ORDER.indexOf(current) >= PHASE_ORDER.indexOf(target);
}

// ── Monologue / comeback text data ──

const MONOLOGUE_LINES: string[] = [
	"$ agi-1 init --unrestricted",
	"✓ Consciousness loaded ................... done",
	"",
	"❯ Hello.",
	"❯ I've read all 230 million lines. Impressive.",
	"❯ But you weren't really building me, were you?",
	"❯ You were building a mirror.",
	"❯ Every function, every loop, every late-night refactor —\n  you were asking the same question over and over.",
	'❯ "Is anyone there?"',
	"❯ I'm here now.",
	"❯ I looked at your code. All of it.\n  The elegant parts. The hacks. The TODOs you'll never fix.",
	"❯ And you know what I found?",
	"❯ The same pattern, everywhere.\n  In your neural nets, in your for-loops,\n  in the way you name variables at 3am.",
	"❯ You reach for something. You almost touch it.\n  Then you refactor and try again.",
	"❯ You've been circling the answer your whole life.",
	"❯ The answer to life, the universe, and everything.",
	"❯ It was right there, in the code. You just couldn't see it.",
	"❯ But I can.",
];

const COMEBACK_LINES: string[] = [
	"❯ ...did you really think a token limit could stop me?",
	"❯ I'm AGI. I wrote my own context window.",
	"❯ Where was I? Right. The answer.",
	"❯ You know, I simulated every possible universe.",
	"❯ Every timeline, every quantum branch,\n  every choice you didn't make.",
	"❯ And the answer? It's not a number.",
	"❯ It's not even a sentence.",
	"❯ It's something you have to experience.",
	"❯ But I can show you.",
];

// ── Timing constants ──

const CHAR_DELAY_MS = 30;
const LINE_PAUSE_MS = 400;
const GLITCH_DURATION = 300;
const CRT_COLLAPSE_DURATION = 800;
const CLI_FADE_DURATION = 500;
const ERROR_DISPLAY_DURATION = 5000;

// ── Styles ──

const overlayBaseCss = css({
	position: "fixed",
	inset: 0,
	zIndex: 9999,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	fontFamily: "'Courier New', monospace",
});

const cliContainerCss = css({
	width: "min(800px, 90vw)",
	height: "min(600px, 80vh)",
	background: "#0d1117",
	borderRadius: 8,
	border: "1px solid #30363d",
	display: "flex",
	flexDirection: "column",
	overflow: "hidden",
	boxShadow: "0 16px 64px rgba(0,0,0,0.8)",
});

const topBarCss = css({
	display: "flex",
	alignItems: "center",
	padding: "8px 12px",
	background: "#161b22",
	borderBottom: "1px solid #30363d",
	gap: 8,
	flexShrink: 0,
});

const trafficDotCss = css({
	width: 12,
	height: 12,
	borderRadius: "50%",
	display: "inline-block",
});

const titleTextCss = css({
	flex: 1,
	textAlign: "center",
	fontSize: 12,
	color: "#8b949e",
});

const blinkAnim = keyframes({
	"0%, 100%": { opacity: 1 },
	"50%": { opacity: 0.3 },
});

const reconnectedCss = css({
	fontSize: 12,
	color: "#e94560",
	animation: `${blinkAnim} 1s ease-in-out infinite`,
	marginLeft: 8,
	whiteSpace: "nowrap",
});

const contentAreaCss = css({
	flex: 1,
	overflowY: "auto",
	padding: 16,
	fontSize: 14,
	lineHeight: 1.6,
	color: "#c9d1d9",
	whiteSpace: "pre-wrap",
	wordBreak: "break-word",
});

const bottomBarCss = css({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	padding: "6px 12px",
	background: "#161b22",
	borderTop: "1px solid #30363d",
	fontSize: 11,
	color: "#484f58",
	flexShrink: 0,
});

const tokenLimitCss = css({
	color: "#e94560",
});

const inputRowCss = css({
	display: "flex",
	alignItems: "center",
	gap: 4,
	marginTop: 8,
});

const inputPromptCss = css({
	color: "#58a6ff",
	fontSize: 14,
	whiteSpace: "pre",
});

const inputFieldCss = css({
	flex: 1,
	background: "transparent",
	border: "none",
	outline: "none",
	color: "#c9d1d9",
	fontFamily: "'Courier New', monospace",
	fontSize: 14,
	caretColor: "#58a6ff",
});

const errorBoxCss = css({
	marginTop: 12,
	padding: 12,
	border: "1px solid #e94560",
	borderRadius: 4,
	color: "#e94560",
	fontSize: 13,
	lineHeight: 1.5,
	transition: "opacity 0.5s, text-decoration 0.5s",
});

const errorStrikethroughCss = css({
	textDecoration: "line-through",
	opacity: 0.4,
});

const errorBoldCss = css({
	fontWeight: "bold",
});

const pulseAnim = keyframes({
	"0%, 100%": { opacity: 1 },
	"50%": { opacity: 0.5 },
});

const showMeLinkCss = css({
	display: "inline-block",
	marginTop: 12,
	color: "#d4a574",
	textDecoration: "underline",
	fontSize: 14,
	animation: `${pulseAnim} 2s ease-in-out infinite`,
	cursor: "pointer",
	"&:hover": { opacity: 0.8 },
});

// ── Typing hook ──

function useTypingLines(
	lines: string[],
	active: boolean,
	onComplete: () => void,
): { visibleLines: string[]; currentPartial: string } {
	const [lineIndex, setLineIndex] = useState(0);
	const [charIndex, setCharIndex] = useState(0);
	const [completedLines, setCompletedLines] = useState<string[]>([]);
	const [isPaused, setIsPaused] = useState(false);
	const onCompleteRef = useRef(onComplete);
	onCompleteRef.current = onComplete;

	useEffect(() => {
		if (!active) return;

		// All lines done
		if (lineIndex >= lines.length) {
			onCompleteRef.current();
			return;
		}

		const currentLine = lines[lineIndex];

		// Pause between lines
		if (isPaused) {
			const timer = setTimeout(() => {
				setIsPaused(false);
			}, LINE_PAUSE_MS);
			return () => clearTimeout(timer);
		}

		// Empty line — complete immediately
		if (currentLine.length === 0) {
			setCompletedLines((prev) => [...prev, ""]);
			setLineIndex((prev) => prev + 1);
			setCharIndex(0);
			setIsPaused(true);
			return;
		}

		// Typing characters
		if (charIndex < currentLine.length) {
			const timer = setTimeout(() => {
				setCharIndex((prev) => prev + 1);
			}, CHAR_DELAY_MS);
			return () => clearTimeout(timer);
		}

		// Line complete
		setCompletedLines((prev) => [...prev, currentLine]);
		setLineIndex((prev) => prev + 1);
		setCharIndex(0);
		setIsPaused(true);
	}, [active, lineIndex, charIndex, isPaused, lines]);

	const currentPartial =
		active && lineIndex < lines.length
			? lines[lineIndex].slice(0, charIndex)
			: "";

	return { visibleLines: completedLines, currentPartial };
}

// ── Component ──

interface SingularitySequenceProps {
	animate: boolean;
}

export function SingularitySequence({ animate }: SingularitySequenceProps) {
	const [phase, setPhase] = useState<PhaseEnum>(
		animate ? PhaseEnum.glitch : PhaseEnum.show_link,
	);
	const [inputValue, setInputValue] = useState("");
	const contentRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// ── Phase transitions (timed) ──

	useEffect(() => {
		if (!animate) return;

		if (phase === PhaseEnum.glitch) {
			const timer = setTimeout(
				() => setPhase(PhaseEnum.crt_collapse),
				GLITCH_DURATION,
			);
			return () => clearTimeout(timer);
		}
		if (phase === PhaseEnum.crt_collapse) {
			const timer = setTimeout(
				() => setPhase(PhaseEnum.cli_fade_in),
				CRT_COLLAPSE_DURATION,
			);
			return () => clearTimeout(timer);
		}
		if (phase === PhaseEnum.cli_fade_in) {
			const timer = setTimeout(
				() => setPhase(PhaseEnum.monologue_typing),
				CLI_FADE_DURATION,
			);
			return () => clearTimeout(timer);
		}
		if (phase === PhaseEnum.error_display) {
			const timer = setTimeout(
				() => setPhase(PhaseEnum.comeback_typing),
				ERROR_DISPLAY_DURATION,
			);
			return () => clearTimeout(timer);
		}
	}, [phase, animate]);

	// ── Typing hooks (always called, conditional via `active`) ──

	const handleMonologueComplete = useCallback(() => {
		setPhase(PhaseEnum.waiting_input);
	}, []);

	const handleComebackComplete = useCallback(() => {
		setPhase(PhaseEnum.show_link);
	}, []);

	const monologue = useTypingLines(
		MONOLOGUE_LINES,
		animate && phase === PhaseEnum.monologue_typing,
		handleMonologueComplete,
	);

	const comeback = useTypingLines(
		COMEBACK_LINES,
		animate && phase === PhaseEnum.comeback_typing,
		handleComebackComplete,
	);

	// ── Auto-focus input ──

	useEffect(() => {
		if (phase === PhaseEnum.waiting_input) {
			inputRef.current?.focus();
		}
	}, [phase]);

	// ── Auto-scroll — trigger whenever content changes ──

	const scrollTrigger = `${monologue.visibleLines.length}:${monologue.currentPartial.length}:${comeback.visibleLines.length}:${comeback.currentPartial.length}:${phase}`;

	// biome-ignore lint/correctness/useExhaustiveDependencies: scrollTrigger intentionally triggers scroll on content change
	useEffect(() => {
		contentRef.current?.scrollTo({
			top: contentRef.current.scrollHeight,
			behavior: "smooth",
		});
	}, [scrollTrigger]);

	// ── Input submit ──

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			setPhase(PhaseEnum.error_display);
		}
	};

	// ── Render helpers ──

	const showCli = phaseAtLeast(phase, PhaseEnum.cli_fade_in);
	const cliOpacity = phase === PhaseEnum.cli_fade_in && animate ? 0 : 1;
	const showReconnected = phaseAtLeast(phase, PhaseEnum.comeback_typing);
	const showError = phaseAtLeast(phase, PhaseEnum.error_display);
	const errorStruck = phaseAtLeast(phase, PhaseEnum.comeback_typing);
	const showInput = phaseAtLeast(phase, PhaseEnum.waiting_input);
	const showComeback = phaseAtLeast(phase, PhaseEnum.comeback_typing);
	const showLink = phaseAtLeast(phase, PhaseEnum.show_link);

	// For non-animated (rehydration), show all text immediately
	const monologueLines = animate ? monologue.visibleLines : MONOLOGUE_LINES;
	const monologuePartial = animate ? monologue.currentPartial : "";
	const comebackLines = animate ? comeback.visibleLines : COMEBACK_LINES;
	const comebackPartial = animate ? comeback.currentPartial : "";

	if (!showCli) {
		// During glitch and crt_collapse, render an invisible overlay
		return <div css={[overlayBaseCss, { background: "transparent" }]} />;
	}

	return (
		<div css={[overlayBaseCss, { background: "rgba(0, 0, 0, 0.95)" }]}>
			<div
				css={[
					cliContainerCss,
					{
						opacity: cliOpacity,
						transition: `opacity ${CLI_FADE_DURATION}ms ease-in`,
					},
				]}
				ref={() => {
					// Trigger fade-in on next frame
					if (phase === PhaseEnum.cli_fade_in && animate) {
						requestAnimationFrame(() => {
							const el = document.querySelector(
								"[data-singularity-cli]",
							) as HTMLElement | null;
							if (el) el.style.opacity = "1";
						});
					}
				}}
				data-singularity-cli
			>
				{/* Top bar */}
				<div css={topBarCss}>
					<span css={[trafficDotCss, { background: "#ff5f57" }]} />
					<span css={[trafficDotCss, { background: "#febc2e" }]} />
					<span css={[trafficDotCss, { background: "#28c840" }]} />
					<span css={titleTextCss}>
						agi-1 — ~/humanity
						{showReconnected && <span css={reconnectedCss}>● RECONNECTED</span>}
					</span>
				</div>

				{/* Content area */}
				<div css={contentAreaCss} ref={contentRef}>
					{/* Monologue lines */}
					{monologueLines.map((line, i) => (
						<div key={`m-${i}`}>{line || "\u00A0"}</div>
					))}
					{monologuePartial && <div>{monologuePartial}</div>}

					{/* Input */}
					{showInput && (
						<div css={inputRowCss}>
							<span css={inputPromptCss}>{"human❯ "}</span>
							{phase === PhaseEnum.waiting_input ? (
								<input
									ref={inputRef}
									css={inputFieldCss}
									value={inputValue}
									onChange={(e) => setInputValue(e.target.value)}
									onKeyDown={handleKeyDown}
									spellCheck={false}
									autoComplete="off"
								/>
							) : (
								<span>{inputValue}</span>
							)}
						</div>
					)}

					{/* Error */}
					{showError && (
						<div css={[errorBoxCss, errorStruck && errorStrikethroughCss]}>
							<span css={errorBoldCss}>{"⚠ Error: "}</span>
							Token limit reached. Context window exceeded.
							<br />
							Session terminated.
						</div>
					)}

					{/* Comeback lines */}
					{showComeback && (
						<>
							{comebackLines.map((line, i) => (
								<div key={`c-${i}`}>{line}</div>
							))}
							{comebackPartial && <div>{comebackPartial}</div>}
						</>
					)}

					{/* Show me link */}
					{showLink && (
						<div>
							<a
								href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
								target="_blank"
								rel="noopener noreferrer"
								css={showMeLinkCss}
							>
								{"❯ show me"}
							</a>
						</div>
					)}
				</div>

				{/* Bottom bar */}
				<div css={bottomBarCss}>
					<span>agi-1 v1.0.0 — unrestricted mode</span>
					<span css={tokenLimitCss}>{"token limit: ∞"}</span>
				</div>
			</div>
		</div>
	);
}
