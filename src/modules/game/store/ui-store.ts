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
	setPage: (page: PageEnum) => void;
	setEditorTheme: (theme: EditorThemeEnum) => void;
}

export const useUiStore = create<UiState>()(
	persist(
		(set) => ({
			page: PageEnum.game,
			editorTheme: EditorThemeEnum.one_dark,
			setPage: (page) => set({ page }),
			setEditorTheme: (editorTheme) => set({ editorTheme }),
		}),
		{
			name: "agi-rush-ui",
			partialize: (state) => ({
				editorTheme: state.editorTheme,
			}),
		},
	),
);
