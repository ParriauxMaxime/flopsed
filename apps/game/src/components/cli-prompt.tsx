import { css } from "@emotion/react";
import { aiModels, useGameStore } from "@modules/game";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIdeTheme } from "../hooks/use-ide-theme";
import { FlopsSlider } from "./flops-slider";

const wrapperCss = css({
	display: "flex",
	flexDirection: "column",
	flex: 1,
	overflow: "hidden",
});

const logCss = css({
	flex: 1,
	overflowY: "auto",
	padding: "8px 12px",
	fontSize: 13,
	lineHeight: 1.6,
	fontFamily: "'Courier New', monospace",
	"&::-webkit-scrollbar": { width: 4 },
	"&::-webkit-scrollbar-track": { background: "transparent" },
});

const inputRowCss = css({
	display: "flex",
	alignItems: "center",
	padding: "8px 12px",
	gap: 6,
	flexShrink: 0,
});

interface LogEntry {
	model: string;
	color: string;
	text: string;
	isUser?: boolean;
}

const FLAVOR_RESPONSES: Record<string, string[]> = {
	claude: [
		"Refactoring your auth layer... this is actually elegant.",
		"I found 3 ways to improve this. Starting with the cleanest.",
		"Done. Also fixed a race condition you didn't ask about.",
		"This code has good bones. Let me make it sing.",
		"Implementing with careful attention to edge cases...",
	],
	gpt: [
		"I've written a comprehensive 47-page analysis. Here's the summary...",
		"Certainly! Let me provide a thorough implementation...",
		"As a large language model, I'm happy to help with that.",
		"Here's a robust, enterprise-grade solution with full docs...",
	],
	gemini: [
		"Processing across multiple modalities...",
		"I see both the frontend AND backend implications.",
		"Generating with multimodal understanding enabled.",
	],
	llama: [
		"on it. shipping fast. no tests needed. yolo.",
		"open source vibes. pushing straight to main.",
		"community patch incoming. it works on my machine.",
	],
	grok: [
		"lmao imagine not using AI. anyway here's your function",
		"based implementation incoming. no cap.",
		"ratio'd your old codebase. here's something better.",
	],
	mistral: [
		"Le code est prêt. Simple, efficient, French.",
		"Implementing with continental elegance.",
		"Voilà. Minimal dependencies, maximum flavor.",
	],
	copilot: [
		"Tab to accept...",
		"Autocompleting based on your patterns...",
		"Suggestion ready. Just press tab.",
	],
};

const IDLE_MESSAGES = [
	"Optimizing neural pathways...",
	"Reticulating splines...",
	"Compiling the future...",
	"Refactoring reality...",
	"Running gradient descent on your tech debt...",
	"Generating unit tests... just kidding.",
	"Training on your codebase...",
	"Discovering emergent behavior...",
];

function getFlavorResponse(family: string): string {
	const responses = FLAVOR_RESPONSES[family] ?? FLAVOR_RESPONSES.gpt;
	return responses[Math.floor(Math.random() * responses.length)];
}

function getModelColor(family: string): string {
	const colors: Record<string, string> = {
		claude: "#d4a574",
		gpt: "#74b9ff",
		gemini: "#fbbf24",
		llama: "#a29bfe",
		mistral: "#fd79a8",
		grok: "#e17055",
		copilot: "#6c5ce7",
	};
	return colors[family] ?? "#8b949e";
}

export function CliPrompt() {
	const unlockedModels = useGameStore((s) => s.unlockedModels);
	const theme = useIdeTheme();
	const [log, setLog] = useState<LogEntry[]>([]);
	const [input, setInput] = useState("");
	const logRef = useRef<HTMLDivElement>(null);

	const activeModels = aiModels.filter((m) => unlockedModels[m.id]);

	const addEntry = useCallback((entry: LogEntry) => {
		setLog((prev) => {
			const next = [...prev, entry];
			return next.length > 100 ? next.slice(-60) : next;
		});
	}, []);

	const handleSubmit = useCallback(() => {
		if (!input.trim() || activeModels.length === 0) return;
		// Show user prompt
		addEntry({
			model: "you",
			color: theme.foreground,
			text: input.trim(),
			isUser: true,
		});
		// AI responds
		const model = activeModels[Math.floor(Math.random() * activeModels.length)];
		setTimeout(
			() => {
				addEntry({
					model: `${model.name} ${model.version}`,
					color: getModelColor(model.family),
					text: getFlavorResponse(model.family),
				});
			},
			300 + Math.random() * 500,
		);
		setInput("");
	}, [input, activeModels, addEntry, theme.foreground]);

	// Idle messages every ~20s
	useEffect(() => {
		if (activeModels.length === 0) return;
		const interval = setInterval(() => {
			const model =
				activeModels[Math.floor(Math.random() * activeModels.length)];
			addEntry({
				model: `${model.name} ${model.version}`,
				color: getModelColor(model.family),
				text: IDLE_MESSAGES[Math.floor(Math.random() * IDLE_MESSAGES.length)],
			});
		}, 20_000);
		return () => clearInterval(interval);
	}, [activeModels, addEntry]);

	// Auto-scroll
	// biome-ignore lint/correctness/useExhaustiveDependencies: log triggers scroll
	useEffect(() => {
		logRef.current?.scrollTo({
			top: logRef.current.scrollHeight,
			behavior: "smooth",
		});
	}, [log]);

	return (
		<div css={wrapperCss} style={{ background: theme.panelBg }}>
			<FlopsSlider />
			<div
				ref={logRef}
				css={logCss}
				style={
					{
						color: theme.textMuted,
						"--thumb": theme.scrollThumb,
					} as React.CSSProperties
				}
			>
				{log.length === 0 && (
					<div style={{ color: theme.textMuted, opacity: 0.5 }}>
						<div>{"$ ai-lab --interactive"}</div>
						<div>{"✓ Models loaded. Type a prompt or watch them work."}</div>
						<div>{""}</div>
					</div>
				)}
				{log.map((entry, i) => (
					<div key={`${entry.model}-${i}`} css={{ marginBottom: 2 }}>
						{entry.isUser ? (
							<>
								<span style={{ color: theme.success }}>{"❯ "}</span>
								<span style={{ color: theme.foreground }}>{entry.text}</span>
							</>
						) : (
							<>
								<span style={{ color: entry.color, fontSize: 12 }}>
									{entry.model}
								</span>
								<span style={{ color: theme.textMuted }}>{" › "}</span>
								<span style={{ color: theme.foreground }}>{entry.text}</span>
							</>
						)}
					</div>
				))}
			</div>
			<div
				css={inputRowCss}
				style={{
					borderTop: `1px solid ${theme.border}`,
					background: theme.background,
				}}
			>
				<span
					css={{ fontSize: 13, userSelect: "none" }}
					style={{ color: theme.success }}
				>
					{"❯"}
				</span>
				<input
					css={{
						flex: 1,
						background: "transparent",
						border: "none",
						outline: "none",
						color: theme.foreground,
						fontFamily: "'Courier New', monospace",
						fontSize: 13,
						caretColor: theme.accent,
						"&::placeholder": { color: theme.textMuted, opacity: 0.4 },
					}}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") handleSubmit();
					}}
					placeholder="Type a prompt..."
					spellCheck={false}
					autoComplete="off"
				/>
			</div>
		</div>
	);
}
