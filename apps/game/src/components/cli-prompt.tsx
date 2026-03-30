import { css } from "@emotion/react";
import { aiModels, useGameStore } from "@modules/game";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
	const { t: tAi } = useTranslation("ai-models");
	const { t: tUi } = useTranslation();
	const [log, setLog] = useState<LogEntry[]>([]);
	const [input, setInput] = useState("");
	const logRef = useRef<HTMLDivElement>(null);

	const flavorResponses = useMemo(
		() => ({
			claude: tAi("_flavor.claude", { returnObjects: true }) as string[],
			gpt: tAi("_flavor.gpt", { returnObjects: true }) as string[],
			gemini: tAi("_flavor.gemini", { returnObjects: true }) as string[],
			llama: tAi("_flavor.llama", { returnObjects: true }) as string[],
			grok: tAi("_flavor.grok", { returnObjects: true }) as string[],
			mistral: tAi("_flavor.mistral", { returnObjects: true }) as string[],
			copilot: tAi("_flavor.copilot", { returnObjects: true }) as string[],
		}),
		[tAi],
	);

	const idleMessages = useMemo(
		() => tAi("_idle", { returnObjects: true }) as string[],
		[tAi],
	);

	const getFlavorResponse = useCallback(
		(family: string): string => {
			const responses =
				flavorResponses[family as keyof typeof flavorResponses] ??
				flavorResponses.gpt;
			return responses[Math.floor(Math.random() * responses.length)];
		},
		[flavorResponses],
	);

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
	}, [input, activeModels, addEntry, theme.foreground, getFlavorResponse]);

	// Idle messages every ~20s
	useEffect(() => {
		if (activeModels.length === 0) return;
		const interval = setInterval(() => {
			const model =
				activeModels[Math.floor(Math.random() * activeModels.length)];
			addEntry({
				model: `${model.name} ${model.version}`,
				color: getModelColor(model.family),
				text: idleMessages[Math.floor(Math.random() * idleMessages.length)],
			});
		}, 20_000);
		return () => clearInterval(interval);
	}, [activeModels, addEntry, idleMessages]);

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
						<div>{tUi("cli.header")}</div>
						<div>{tUi("cli.loaded")}</div>
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
					placeholder={tUi("cli.placeholder")}
					spellCheck={false}
					autoComplete="off"
				/>
			</div>
		</div>
	);
}
