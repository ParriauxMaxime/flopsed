import { create } from "zustand";
import { persist } from "zustand/middleware";

export const PageEnum = {
	game: "game",
	tech_tree: "tech_tree",
	settings: "settings",
	god_mode: "god_mode",
} as const;

export type PageEnum = (typeof PageEnum)[keyof typeof PageEnum];

export const EditorThemeEnum = {
	one_dark: "one_dark",
	monokai: "monokai",
	github_dark: "github_dark",
	github_light: "github_light",
	solarized_dark: "solarized_dark",
	solarized_light: "solarized_light",
	dracula: "dracula",
	nord: "nord",
} as const;

export type EditorThemeEnum =
	(typeof EditorThemeEnum)[keyof typeof EditorThemeEnum];

interface UiState {
	page: PageEnum;
	editorTheme: EditorThemeEnum;
	seenTips: string[];
	activeTip: string | null;
	setPage: (page: PageEnum) => void;
	setEditorTheme: (theme: EditorThemeEnum) => void;
	showTip: (id: string) => void;
	dismissTip: () => void;
	resetTips: () => void;
}

export const useUiStore = create<UiState>()(
	persist(
		(set, get) => ({
			page: PageEnum.game,
			editorTheme: EditorThemeEnum.one_dark,
			seenTips: [],
			activeTip: null,
			setPage: (page) => set({ page }),
			setEditorTheme: (editorTheme) => set({ editorTheme }),
			showTip: (id) => {
				const { seenTips, activeTip } = get();
				if (seenTips.includes(id) || activeTip !== null) return;
				set({ activeTip: id, seenTips: [...seenTips, id] });
			},
			dismissTip: () => set({ activeTip: null }),
			resetTips: () => {
				set({ seenTips: [], activeTip: null });
				// Flush to localStorage synchronously so reload picks it up
				try {
					const raw = localStorage.getItem("agi-rush-ui");
					if (raw) {
						const parsed = JSON.parse(raw);
						parsed.state.seenTips = [];
						localStorage.setItem("agi-rush-ui", JSON.stringify(parsed));
					}
				} catch {
					// ignore
				}
			},
		}),
		{
			name: "agi-rush-ui",
			partialize: (state) => ({
				editorTheme: state.editorTheme,
				seenTips: state.seenTips,
			}),
		},
	),
);
