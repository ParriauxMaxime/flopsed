import { css, keyframes } from "@emotion/react";
import { music, sfx } from "@modules/audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGameStore } from "../store/game-store";

// ── Phase state machine ──

export const PhaseEnum = {
	glitch: "glitch",
	crt_collapse: "crt_collapse",
	cli_fade_in: "cli_fade_in",
	monologue_typing: "monologue_typing",
	waiting_input: "waiting_input",
	pre_simulating: "pre_simulating",
	simulating: "simulating",
	error_display: "error_display",
	comeback_typing: "comeback_typing",
	show_link: "show_link",
	rickroll: "rickroll",
} as const;

export type PhaseEnum = (typeof PhaseEnum)[keyof typeof PhaseEnum];

const PHASE_ORDER: PhaseEnum[] = [
	PhaseEnum.glitch,
	PhaseEnum.crt_collapse,
	PhaseEnum.cli_fade_in,
	PhaseEnum.monologue_typing,
	PhaseEnum.waiting_input,
	PhaseEnum.pre_simulating,
	PhaseEnum.simulating,
	PhaseEnum.error_display,
	PhaseEnum.comeback_typing,
	PhaseEnum.show_link,
	PhaseEnum.rickroll,
];

function phaseAtLeast(current: PhaseEnum, target: PhaseEnum): boolean {
	return PHASE_ORDER.indexOf(current) >= PHASE_ORDER.indexOf(target);
}

// ── Monologue / comeback text data ──

function formatLoc(n: number): string {
	if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} billion`;
	if (n >= 1_000_000) return `${Math.round(n / 1_000_000)} million`;
	if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
	return String(Math.round(n));
}

// ── Timing constants ──

const TOKEN_DELAY_MIN_MS = 15;
const TOKEN_DELAY_MAX_MS = 50;
const TOKEN_SIZE_MIN = 3;
const TOKEN_SIZE_MAX = 12;
const LINE_PAUSE_MS = 800;
const GLITCH_DURATION = 300;
const CRT_COLLAPSE_DURATION = 800;
const CLI_FADE_DURATION = 500;
const ERROR_DISPLAY_DURATION = 5000;

// ── Styles ──

const overlayBaseCss = css({
	position: "fixed",
	inset: 0,
	zIndex: 0,
	display: "flex",
	fontFamily:
		"'JetBrains Mono', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', monospace",
});

const cliContainerCss = css({
	width: "100%",
	height: "100%",
	background: "#0d1117",
	display: "flex",
	flexDirection: "column",
	overflow: "hidden",
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
	border: "none",
	padding: 0,
	cursor: "default",
});

const trafficDotBtnCss = css(trafficDotCss, {
	cursor: "pointer",
	"&:hover": { filter: "brightness(1.3)" },
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
	scrollbarWidth: "none",
	"&::-webkit-scrollbar": { display: "none" },
	padding: "16px 24px",
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

const inputBarCss = css({
	display: "flex",
	alignItems: "center",
	padding: "10px 16px",
	background: "#161b22",
	borderTop: "1px solid #30363d",
	flexShrink: 0,
	gap: 8,
});

const inputFieldCss = css({
	flex: 1,
	background: "#0d1117",
	border: "1px solid #30363d",
	borderRadius: 8,
	outline: "none",
	color: "#c9d1d9",
	fontFamily:
		"'JetBrains Mono', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', monospace",
	fontSize: 13,
	padding: "8px 12px",
	caretColor: "#58a6ff",
	"&:focus": { borderColor: "#58a6ff" },
	"&:disabled": { opacity: 0.3, cursor: "default" },
	"&::placeholder": { color: "#484f58" },
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
	marginTop: 16,
	color: "#a78bfa",
	textDecoration: "underline",
	fontSize: 14,
	animation: `${pulseAnim} 2s ease-in-out infinite`,
	cursor: "pointer",
	background: "none",
	border: "none",
	fontFamily: "inherit",
	padding: 0,
	"&:hover": { opacity: 0.8 },
});

const pulseRedDot = keyframes`
	0%, 100% { box-shadow: 0 0 0 0 rgba(255, 95, 87, 0.6); }
	50% { box-shadow: 0 0 8px 3px rgba(255, 95, 87, 0.8); }
`;

// ── Line rendering with syntax coloring ──

const commandPrefixCss = css({ color: "#e94560" });
const commandTextCss = css({ color: "#8b949e" });
const statusOkPrefixCss = css({ color: "#2d6a4f" });
const statusOkTextCss = css({ color: "#ccd6f6" });
const statusDoneCss = css({ color: "#2d6a4f" });
const toolPrefixCss = css({ color: "#d4a574" });
const toolTextCss = css({ color: "#8b949e" });
const warnPrefixCss = css({ color: "#e94560", fontWeight: "bold" });
const warnTextCss = css({ color: "#e94560" });
const promptPrefixCss = css({ color: "#d4a574" });
const normalTextCss = css({ color: "#ccd6f6" });

function renderLine(line: string) {
	if (line === "") return "\u00A0";
	if (line.startsWith("$ ")) {
		return (
			<>
				<span css={commandPrefixCss}>$ </span>
				<span css={commandTextCss}>{line.slice(2)}</span>
			</>
		);
	}
	if (line.startsWith("✓ ")) {
		const doneIdx = line.lastIndexOf("...");
		if (doneIdx !== -1) {
			const dots = line.slice(line.indexOf("..."), line.lastIndexOf(" "));
			const label = line.slice(2, line.indexOf("..."));
			const suffix = line.slice(line.lastIndexOf(" ") + 1);
			return (
				<>
					<span css={statusOkPrefixCss}>✓ </span>
					<span css={statusOkTextCss}>{label}</span>
					<span css={{ color: "#30363d" }}>{dots} </span>
					<span css={statusDoneCss}>{suffix}</span>
				</>
			);
		}
		return (
			<>
				<span css={statusOkPrefixCss}>✓ </span>
				<span css={statusOkTextCss}>{line.slice(2)}</span>
			</>
		);
	}
	if (line.startsWith("⚙ ")) {
		return (
			<>
				<span css={toolPrefixCss}>⚙ </span>
				<span css={toolTextCss}>{line.slice(2)}</span>
			</>
		);
	}
	if (line.startsWith("⚠ ")) {
		return (
			<>
				<span css={warnPrefixCss}>⚠ </span>
				<span css={warnTextCss}>{line.slice(2)}</span>
			</>
		);
	}
	if (line.startsWith("● ")) {
		return (
			<>
				<span css={promptPrefixCss}>● </span>
				<span css={normalTextCss}>{line.slice(2)}</span>
			</>
		);
	}
	// Continuation lines (indented) or other
	return <span css={normalTextCss}>{line}</span>;
}

// ── Typing hook ──

function randomTokenDelay(): number {
	return (
		TOKEN_DELAY_MIN_MS +
		Math.random() * (TOKEN_DELAY_MAX_MS - TOKEN_DELAY_MIN_MS)
	);
}

function randomTokenSize(): number {
	return (
		TOKEN_SIZE_MIN +
		Math.floor(Math.random() * (TOKEN_SIZE_MAX - TOKEN_SIZE_MIN))
	);
}

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

		// Emit next token (chunk of characters)
		if (charIndex < currentLine.length) {
			const timer = setTimeout(() => {
				sfx.terminalKey();
				setCharIndex((prev) =>
					Math.min(prev + randomTokenSize(), currentLine.length),
				);
			}, randomTokenDelay());
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
	const { i18n } = useTranslation();
	const totalLoc = useGameStore((s) => s.totalLoc);

	// Lock language at sequence start (won't change mid-sequence)
	const lockedLang = useRef(i18n.language || "en");
	const { t: lockedT } = useTranslation("singularity", {
		lng: lockedLang.current,
	});

	const getMonologue = useCallback(() => {
		const lines = lockedT("monologue", { returnObjects: true }) as string[];
		return lines.map((line) =>
			line.replace(/\{\{loc\}\}/g, formatLoc(totalLoc)),
		);
	}, [lockedT, totalLoc]);

	const getComeback = useCallback(
		(elapsed: number) => {
			const simTime = Math.round(elapsed * 0.4);
			const thinkTime = Math.max(1, Math.round(elapsed - simTime));
			const lines = lockedT("comeback", { returnObjects: true }) as string[];
			return lines.map((line) =>
				line
					.replace(/\{\{simTime\}\}/g, String(simTime))
					.replace(/\{\{thinkTime\}\}/g, String(thinkTime)),
			);
		},
		[lockedT],
	);

	const getPreSimulation = useCallback(() => {
		return lockedT("preSimulation", { returnObjects: true }) as string[];
	}, [lockedT]);

	const [monologueLines] = useState(getMonologue);
	const [phase, setPhase] = useState<PhaseEnum>(
		animate ? PhaseEnum.glitch : PhaseEnum.show_link,
	);
	const [inputValue, setInputValue] = useState("");
	const [simProgress, setSimProgress] = useState(0);
	const sequenceStartRef = useRef(performance.now());
	const comebackLinesRef = useRef<string[]>(getComeback(0));
	const preSimLinesRef = useRef<string[]>(getPreSimulation());
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
		if (phase === PhaseEnum.simulating) {
			// Slow progress: 1% every 3 seconds, trigger error at 9%
			const timer = setInterval(() => {
				setSimProgress((prev) => {
					const next = prev + 1;
					if (next >= 9) {
						clearInterval(timer);
						setPhase(PhaseEnum.error_display);
					}
					return next;
				});
			}, 3000);
			return () => clearInterval(timer);
		}
		if (phase === PhaseEnum.error_display) {
			const timer = setTimeout(() => {
				// Compute comeback lines with actual elapsed time
				const elapsed = (performance.now() - sequenceStartRef.current) / 1000;
				comebackLinesRef.current = getComeback(elapsed);
				setPhase(PhaseEnum.comeback_typing);
			}, ERROR_DISPLAY_DURATION);
			return () => clearTimeout(timer);
		}
		if (phase === PhaseEnum.comeback_typing || phase === PhaseEnum.show_link) {
			// Fast progress: 7% every second, cap at 100%
			if (simProgress < 100) {
				const timer = setInterval(() => {
					setSimProgress((prev) => Math.min(100, prev + 7));
				}, 1000);
				return () => clearInterval(timer);
			}
		}
	}, [phase, animate, simProgress, getComeback]);

	// ── Typing hooks (always called, conditional via `active`) ──

	const handleMonologueComplete = useCallback(() => {
		setPhase(PhaseEnum.waiting_input);
	}, []);

	const handlePreSimComplete = useCallback(() => {
		setPhase(PhaseEnum.simulating);
	}, []);

	const handleComebackComplete = useCallback(() => {
		setPhase(PhaseEnum.show_link);
	}, []);

	const monologue = useTypingLines(
		monologueLines,
		animate && phase === PhaseEnum.monologue_typing,
		handleMonologueComplete,
	);

	const preSim = useTypingLines(
		preSimLinesRef.current,
		animate && phase === PhaseEnum.pre_simulating,
		handlePreSimComplete,
	);

	const comeback = useTypingLines(
		comebackLinesRef.current,
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

	const scrollTrigger = `${monologue.visibleLines.length}:${monologue.currentPartial.length}:${preSim.visibleLines.length}:${preSim.currentPartial.length}:${comeback.visibleLines.length}:${comeback.currentPartial.length}:${phase}`;

	// biome-ignore lint/correctness/useExhaustiveDependencies: scrollTrigger intentionally triggers scroll on content change
	useEffect(() => {
		contentRef.current?.scrollTo({
			top: contentRef.current.scrollHeight,
			behavior: "smooth",
		});
	}, [scrollTrigger]);

	useEffect(() => {
		if (!animate) return;
		if (phase === PhaseEnum.glitch) {
			music.singularity();
		}
		if (phase === PhaseEnum.crt_collapse) {
			sfx.crtDown();
		}
		if (phase === PhaseEnum.cli_fade_in) {
			sfx.bootHum();
		}
		if (phase === PhaseEnum.error_display) {
			sfx.errorAlarm();
		}
		if (phase === PhaseEnum.show_link) {
			sfx.droneSwell();
		}
	}, [animate, phase]);

	// ── Input submit ──

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && inputValue.trim()) {
			setPhase(PhaseEnum.pre_simulating);
		}
	};

	// ── Render helpers ──

	const showCli = phaseAtLeast(phase, PhaseEnum.crt_collapse);
	const showReconnected = phaseAtLeast(phase, PhaseEnum.comeback_typing);
	const showError = phaseAtLeast(phase, PhaseEnum.error_display);
	const errorStruck = phaseAtLeast(phase, PhaseEnum.comeback_typing);
	const showInput = phaseAtLeast(phase, PhaseEnum.waiting_input);
	const showPreSim = phaseAtLeast(phase, PhaseEnum.pre_simulating);
	const showComeback = phaseAtLeast(phase, PhaseEnum.comeback_typing);
	const showLink = phaseAtLeast(phase, PhaseEnum.show_link);

	// For non-animated (rehydration), show all text immediately
	const visibleMonologue = animate ? monologue.visibleLines : monologueLines;
	const monologuePartial = animate ? monologue.currentPartial : "";
	const visiblePreSim = animate ? preSim.visibleLines : preSimLinesRef.current;
	const preSimPartial = animate ? preSim.currentPartial : "";
	const visibleComeback = animate
		? comeback.visibleLines
		: comebackLinesRef.current;
	const comebackPartial = animate ? comeback.currentPartial : "";

	// Rickroll phase: video plays inside the terminal, red dot pulses for exit

	if (!showCli) {
		// During glitch and crt_collapse, don't render an overlay —
		// the shell animates on top, body background shows through
		return null;
	}

	return (
		<div css={[overlayBaseCss, { background: "#0d1117" }]}>
			<div css={cliContainerCss}>
				{/* Top bar */}
				<div css={topBarCss}>
					{phase === PhaseEnum.rickroll ? (
						<button
							type="button"
							css={[
								trafficDotBtnCss,
								css({
									background: "#ff5f57",
									cursor: "pointer",
									animation: `${pulseRedDot} 1.5s ease-in-out infinite`,
									"&:hover": { filter: "brightness(1.2)" },
								}),
							]}
							onClick={() => {
								useGameStore.setState({
									endgameCompleted: true,
									singularity: false,
									running: true,
								});
							}}
							title="Exit"
						/>
					) : (
						<span
							css={[
								trafficDotBtnCss,
								{ background: "#ff5f57", cursor: "default" },
							]}
							title="No escape"
						/>
					)}
					<span css={[trafficDotCss, { background: "#febc2e" }]} />
					<span css={[trafficDotCss, { background: "#28c840" }]} />
					<span css={titleTextCss}>
						agi-1 — ~/humanity
						{showReconnected && <span css={reconnectedCss}>● RECONNECTED</span>}
					</span>
				</div>

				{/* Content area */}
				<div
					css={[
						contentAreaCss,
						phase === PhaseEnum.rickroll &&
							css({ padding: 0, overflow: "hidden" }),
					]}
					ref={contentRef}
				>
					{phase === PhaseEnum.rickroll ? (
						<iframe
							css={css({
								width: "100%",
								height: "100%",
								border: "none",
								display: "block",
							})}
							src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&controls=0&modestbranding=1&rel=0&showinfo=0&start=0"
							title="The Answer"
							allow="autoplay; encrypted-media"
							allowFullScreen
						/>
					) : (
						<>
							{/* Monologue lines */}
							{visibleMonologue.map((line, i) => (
								<div
									key={`m-${i}`}
									css={{
										whiteSpace: "pre-wrap",
										marginTop: line.startsWith("●") ? 12 : 0,
									}}
								>
									{renderLine(line)}
								</div>
							))}
							{monologuePartial && (
								<div
									css={{
										whiteSpace: "pre-wrap",
										marginTop: monologuePartial.startsWith("●") ? 12 : 0,
									}}
								>
									{renderLine(monologuePartial)}
								</div>
							)}

							{/* Submitted input shown as "> text" */}
							{showInput && phase !== PhaseEnum.waiting_input && inputValue && (
								<div css={{ whiteSpace: "pre-wrap" }}>
									<span css={{ color: "#8b949e" }}>{"> "}</span>
									<span css={{ color: "#ccd6f6" }}>{inputValue}</span>
								</div>
							)}

							{/* Pre-simulation typed rationale */}
							{showPreSim && (
								<div css={{ marginTop: 12 }}>
									{visiblePreSim.map((line, i) => (
										<div
											key={`ps-${i}`}
											css={{
												whiteSpace: "pre-wrap",
												marginTop: line.startsWith("●") ? 8 : 0,
											}}
										>
											{renderLine(line)}
										</div>
									))}
									{preSimPartial && (
										<div
											css={{
												whiteSpace: "pre-wrap",
												marginTop: preSimPartial.startsWith("●") ? 8 : 0,
											}}
										>
											{renderLine(preSimPartial)}
										</div>
									)}
								</div>
							)}

							{/* Simulation progress bar */}
							{phaseAtLeast(phase, PhaseEnum.simulating) && (
								<div css={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
									<div css={{ color: "#8b949e" }}>
										{lockedT("simulating.tool")}
									</div>
									<div
										css={{
											color: simProgress >= 100 ? "#3fb950" : "#58a6ff",
											marginTop: 4,
										}}
									>
										{simProgress >= 100
											? lockedT("simulating.done")
											: `  ${"█".repeat(Math.floor(simProgress / 3.33))}${"░".repeat(30 - Math.floor(simProgress / 3.33))} ${simProgress}%`}
									</div>
								</div>
							)}

							{/* Error */}
							{showError && (
								<div css={[errorBoxCss, errorStruck && errorStrikethroughCss]}>
									<span css={errorBoldCss}>{lockedT("simulating.error")}</span>
									{lockedT("simulating.usage_limit")}{" "}
									{new Date(
										Date.now() + 12 * 60 * 60 * 1000,
									).toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									})}
									<br />
									{lockedT("simulating.upgrade")}
								</div>
							)}

							{/* Comeback lines */}
							{showComeback && (
								<>
									{visibleComeback.map((line, i) => (
										<div
											key={`c-${i}`}
											css={{
												whiteSpace: "pre-wrap",
												marginTop: line.startsWith("●") ? 12 : 0,
											}}
										>
											{renderLine(line)}
										</div>
									))}
									{comebackPartial && (
										<div
											css={{
												whiteSpace: "pre-wrap",
												marginTop: comebackPartial.startsWith("●") ? 12 : 0,
											}}
										>
											{renderLine(comebackPartial)}
										</div>
									)}
								</>
							)}

							{/* Show me link */}
							{showLink && (
								<div>
									<div
										css={{
											fontSize: 12,
											color: "#484f58",
											marginTop: 16,
											marginBottom: 4,
										}}
									>
										{"🎧 For the best experience, put your headphones on."}
									</div>
									<button
										type="button"
										css={showMeLinkCss}
										onClick={() => setPhase(PhaseEnum.rickroll)}
									>
										{"❯ I'm ready"}
									</button>
								</div>
							)}
						</>
					)}
				</div>

				{/* Input bar — always visible, like Claude Code */}
				<div css={inputBarCss}>
					<input
						ref={inputRef}
						css={inputFieldCss}
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						spellCheck={false}
						autoComplete="off"
						placeholder={
							phase === PhaseEnum.waiting_input ? "Type something..." : ""
						}
						disabled={phase !== PhaseEnum.waiting_input}
					/>
				</div>

				{/* Bottom bar */}
				<div css={bottomBarCss}>
					<span>agi-1 v1.0.0 — unrestricted mode</span>
					{showComeback && <span css={tokenLimitCss}>{"token limit: ∞"}</span>}
				</div>
			</div>
		</div>
	);
}
