import { css } from "@emotion/react";
import { useGameStore, useUiStore } from "@modules/game";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useIdeTheme } from "../hooks/use-ide-theme";
import i18n from "../i18n";

// ── Tip ID → translation key mapping ──

const tipTranslationKeys: Record<string, string> = {
	welcome: "welcome.lines",
	tech_tree_intro: "tech_tree.lines",
	sidebar_intro: "sidebar.lines",
	execution_intro: "execution.lines",
	ai_lab_tokens: "ai_lab.lines",
};

// ── Trigger conditions ──

type GameState = ReturnType<typeof useGameStore.getState>;

const triggers: Array<{ id: string; test: (s: GameState) => boolean }> = [
	{ id: "welcome", test: () => true },
	{ id: "tech_tree_intro", test: (s) => s.totalLoc >= 15 },
	{
		id: "sidebar_intro",
		test: (s) => (s.ownedTechNodes.unlock_sidebar ?? 0) > 0,
	},
	{
		id: "execution_intro",
		test: (s) => (s.ownedTechNodes.unlock_stats_panel ?? 0) > 0,
	},
	{
		id: "ai_lab_tokens",
		test: (s) => s.aiUnlocked,
	},
];

// ── Watcher hook — pushes lines to terminal log ──

export function useTutorialTriggers() {
	useEffect(() => {
		const tTutorial = i18n.getFixedT(null, "tutorial");

		const getTipLines = (id: string): string[] | undefined => {
			const translationKey = tipTranslationKeys[id];
			if (!translationKey) return undefined;
			const result = tTutorial(translationKey, {
				returnObjects: true,
			}) as string[];
			return result;
		};

		const unsub = useGameStore.subscribe((state) => {
			const uiState = useUiStore.getState();
			for (const trigger of triggers) {
				if (uiState.seenTips.includes(trigger.id)) continue;
				if (trigger.test(state)) {
					uiState.showTip(trigger.id);
					// Resolve loading line when tech tree unlocks
					if (trigger.id === "tech_tree_intro") {
						uiState.resolveLoadingLine("✓ tech-tree.svg loaded");
						if (!uiState.splitEnabled) {
							uiState.toggleSplit();
						}
					}
					const lines = getTipLines(trigger.id);
					if (lines) {
						for (const line of lines) {
							uiState.pushTerminalLine(line);
						}
						uiState.pushTerminalLine("");
					}
					break;
				}
			}
		});

		// Initial check for welcome
		const uiState = useUiStore.getState();
		if (!uiState.seenTips.includes("welcome")) {
			uiState.showTip("welcome");
			const lines = getTipLines("welcome");
			if (lines) {
				for (const line of lines) {
					uiState.pushTerminalLine(line);
				}
				uiState.pushTerminalLine("");
				uiState.pushTerminalLine(tTutorial("loading") as string);
			}
		}

		return () => unsub();
	}, []);
}

// ── Keyboard shortcuts hook ──

export function useKeyboardShortcuts() {
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			// Only trigger with Ctrl held, and not when typing in an input
			if (!e.ctrlKey) return;
			const tag = (e.target as HTMLElement).tagName;
			if (tag === "INPUT" || tag === "TEXTAREA") return;

			const ui = useUiStore.getState();
			switch (e.key) {
				case "t":
					e.preventDefault();
					ui.toggleTerminal();
					break;
				case "b":
					e.preventDefault();
					ui.toggleSidebar();
					break;
				case "s":
					e.preventDefault();
					ui.toggleStatsPanel();
					break;
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
}

// ── Terminal panel component ──

const panelCss = css({
	display: "flex",
	flexDirection: "column",
	flexShrink: 0,
	overflow: "hidden",
	maxHeight: "30%",
	minHeight: 80,
	boxShadow: "0 -2px 6px rgba(0,0,0,0.15)",
	zIndex: 1,
	position: "relative",
});

const tabBarCss = css({
	display: "flex",
	alignItems: "center",
	height: 28,
	flexShrink: 0,
});

const tabCss = css({
	padding: "0 12px",
	height: "100%",
	display: "flex",
	alignItems: "center",
	fontSize: 12,
	textTransform: "uppercase",
	letterSpacing: 0.5,
	border: "none",
	background: "none",
	fontFamily: "inherit",
	cursor: "pointer",
});

const logCss = css({
	flex: 1,
	overflowY: "auto",
	padding: "8px 16px",
	fontFamily: "'Courier New', monospace",
	fontSize: 13,
	lineHeight: 1.7,
	"&::-webkit-scrollbar": { width: 6 },
	"&::-webkit-scrollbar-track": { background: "transparent" },
});

const shortcutHintCss = css({
	fontSize: 10,
	opacity: 0.5,
	marginLeft: 6,
});

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function Spinner({ color }: { color: string }) {
	const [frame, setFrame] = useState(0);
	useEffect(() => {
		const id = setInterval(() => {
			setFrame((f) => (f + 1) % spinnerFrames.length);
		}, 80);
		return () => clearInterval(id);
	}, []);
	return <span style={{ color }}>{spinnerFrames[frame]}</span>;
}

export function TutorialTip() {
	const terminalOpen = useUiStore((s) => s.terminalOpen);
	const terminalLog = useUiStore((s) => s.terminalLog);
	const toggleTerminal = useUiStore((s) => s.toggleTerminal);
	const theme = useIdeTheme();
	const { t: tTutorial } = useTranslation("tutorial");
	const logRef = useRef<HTMLDivElement>(null);
	const prevLogLen = useRef(terminalLog.length);

	// Auto-scroll when new lines added
	useEffect(() => {
		if (terminalLog.length > prevLogLen.current && logRef.current) {
			logRef.current.scrollTop = logRef.current.scrollHeight;
		}
		prevLogLen.current = terminalLog.length;
	}, [terminalLog.length]);

	if (!terminalOpen || terminalLog.length === 0) return null;

	return (
		<div css={panelCss} style={{ borderTop: `1px solid ${theme.border}` }}>
			<div
				css={tabBarCss}
				style={{
					background: theme.tabBarBg,
					borderBottom: `1px solid ${theme.border}`,
				}}
			>
				<span
					css={tabCss}
					style={{
						color: theme.foreground,
						borderBottom: `1px solid ${theme.foreground}`,
					}}
				>
					{tTutorial("terminal_label")}
					<span css={shortcutHintCss}>{tTutorial("terminal_shortcut")}</span>
				</span>
				<button
					type="button"
					css={[
						tabCss,
						{
							marginLeft: "auto",
							color: theme.textMuted,
							fontSize: 14,
							"&:hover": { color: theme.foreground },
						},
					]}
					onClick={toggleTerminal}
					title={tTutorial("close_terminal")}
				>
					×
				</button>
			</div>
			<div
				ref={logRef}
				css={logCss}
				style={{
					background: theme.panelBg,
					color: theme.textMuted,
				}}
			>
				{terminalLog.map((line, i) => {
					const isLoading = line.startsWith("$ loading ");
					return (
						<div
							key={i}
							style={{
								color: line.startsWith("$")
									? theme.success
									: line.startsWith("✓")
										? theme.accent
										: line.startsWith("  ")
											? theme.foreground
											: theme.textMuted,
								minHeight: line === "" ? "0.8em" : undefined,
							}}
						>
							{isLoading ? (
								<>
									{line} <Spinner color={theme.success} />
								</>
							) : (
								line || "\u00A0"
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
