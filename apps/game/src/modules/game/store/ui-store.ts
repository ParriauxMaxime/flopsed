import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ShellLine } from "../../terminal/types";

export const PageEnum = {
	game: "game",
	tech_tree: "tech_tree",
	settings: "settings",
	god_mode: "god_mode",
	readme: "readme",
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

export const PaneEnum = {
	left: "left",
	right: "right",
} as const;

export type PaneEnum = (typeof PaneEnum)[keyof typeof PaneEnum];

interface TechTreeViewport {
	x: number;
	y: number;
	zoom: number;
}

interface UiState {
	page: PageEnum;
	openTabs: PageEnum[];
	rightPage: PageEnum;
	rightOpenTabs: PageEnum[];
	lastActivePane: PaneEnum;
	splitEnabled: boolean;
	editorTheme: EditorThemeEnum;
	seenTips: string[];
	terminalLog: ShellLine[];
	terminalOpen: boolean;
	techTreeViewport: TechTreeViewport;
	uiZoom: number;
	sidebarWidth: number;
	statsPanelWidth: number;
	terminalHeight: number;
	splitRatio: number;
	sidebarCollapsed: boolean;
	statsPanelCollapsed: boolean;
	setPage: (page: PageEnum) => void;
	openTab: (page: PageEnum) => void;
	closeTab: (page: PageEnum) => void;
	setRightPage: (page: PageEnum) => void;
	openRightTab: (page: PageEnum) => void;
	closeRightTab: (page: PageEnum) => void;
	focusPane: (pane: PaneEnum) => void;
	/** Move a tab from one pane to the other */
	moveTab: (page: PageEnum, from: PaneEnum, to: PaneEnum) => void;
	/** Opens a tab in the last-focused pane */
	openInActivePane: (page: PageEnum) => void;
	toggleSplit: () => void;
	toggleSidebar: () => void;
	toggleStatsPanel: () => void;
	toggleTerminal: () => void;
	setEditorTheme: (theme: EditorThemeEnum) => void;
	setUiZoom: (size: number) => void;
	setSidebarWidth: (w: number) => void;
	setStatsPanelWidth: (w: number) => void;
	setTerminalHeight: (h: number) => void;
	setSplitRatio: (r: number) => void;
	showTip: (id: string) => void;
	pushTerminalLines: (lines: ShellLine[]) => void;
	resetAll: () => void;
	setTechTreeViewport: (viewport: TechTreeViewport) => void;
}

function addToTabs(tabs: PageEnum[], page: PageEnum): PageEnum[] {
	return tabs.includes(page) ? tabs : [...tabs, page];
}

export const useUiStore = create<UiState>()(
	persist(
		(set, get) => ({
			page: PageEnum.game,
			openTabs: [PageEnum.readme, PageEnum.game, PageEnum.settings],
			rightPage: PageEnum.tech_tree,
			rightOpenTabs: [PageEnum.tech_tree],
			lastActivePane: PaneEnum.left,
			splitEnabled: false,
			editorTheme: EditorThemeEnum.one_dark,
			seenTips: [],
			terminalLog: [],
			terminalOpen: true,
			techTreeViewport: {
				x: -850,
				y: -200,
				zoom: 1,
			},
			uiZoom: 100,
			sidebarWidth: 260,
			statsPanelWidth: 280,
			terminalHeight: 200,
			splitRatio: 0.5,
			sidebarCollapsed: true,
			statsPanelCollapsed: true,

			// Left pane
			setPage: (page) => set({ page, lastActivePane: PaneEnum.left }),
			openTab: (page) =>
				set((s) => ({
					openTabs: addToTabs(s.openTabs, page),
					page,
					lastActivePane: PaneEnum.left,
				})),
			closeTab: (page) =>
				set((s) => {
					const remaining = s.openTabs.filter((t) => t !== page);
					if (remaining.length === 0) {
						// Last tab closed: if split, merge right into left
						if (s.splitEnabled) {
							return {
								openTabs: s.rightOpenTabs,
								page: s.rightPage,
								rightOpenTabs: [PageEnum.tech_tree],
								splitEnabled: false,
								lastActivePane: PaneEnum.left,
							};
						}
						// Single panel: "Focused Workers" achievement
						return { openTabs: [], page: s.page };
					}
					const newActive =
						s.page === page
							? (remaining[remaining.length - 1] ?? PageEnum.game)
							: s.page;
					return { openTabs: remaining, page: newActive };
				}),

			// Right pane
			setRightPage: (page) =>
				set({ rightPage: page, lastActivePane: PaneEnum.right }),
			openRightTab: (page) =>
				set((s) => ({
					rightOpenTabs: addToTabs(s.rightOpenTabs, page),
					rightPage: page,
					lastActivePane: PaneEnum.right,
				})),
			closeRightTab: (page) =>
				set((s) => {
					const remaining = s.rightOpenTabs.filter((t) => t !== page);
					if (remaining.length === 0) {
						// Last tab in right pane: unsplit
						return {
							rightOpenTabs: [PageEnum.tech_tree],
							splitEnabled: false,
							lastActivePane: PaneEnum.left,
						};
					}
					const newActive =
						s.rightPage === page
							? (remaining[remaining.length - 1] ?? PageEnum.tech_tree)
							: s.rightPage;
					return { rightOpenTabs: remaining, rightPage: newActive };
				}),

			focusPane: (pane) => set({ lastActivePane: pane }),

			moveTab: (page, from, to) =>
				set((s) => {
					if (from === to) return s;
					const srcTabs = from === PaneEnum.left ? s.openTabs : s.rightOpenTabs;
					const srcActive = from === PaneEnum.left ? s.page : s.rightPage;
					const dstTabs = to === PaneEnum.left ? s.openTabs : s.rightOpenTabs;

					const newSrc = srcTabs.filter((t) => t !== page);
					const newDst = addToTabs(dstTabs, page);
					const newSrcActive =
						srcActive === page
							? (newSrc[newSrc.length - 1] ?? PageEnum.game)
							: srcActive;

					const update: Partial<UiState> = {};
					if (from === PaneEnum.left) {
						// If source left is now empty, unsplit (merge dst into left)
						if (newSrc.length === 0) {
							update.openTabs = newDst;
							update.page = page;
							update.splitEnabled = false;
							update.lastActivePane = PaneEnum.left;
							return update;
						}
						update.openTabs = newSrc;
						update.page = newSrcActive;
					} else {
						if (newSrc.length === 0) {
							update.rightOpenTabs = [PageEnum.tech_tree];
							update.splitEnabled = false;
							update.lastActivePane = PaneEnum.left;
							// Add the tab to left if not already there
							update.openTabs = addToTabs(s.openTabs, page);
							update.page = page;
							return update;
						}
						update.rightOpenTabs = newSrc;
						update.rightPage = newSrcActive;
					}
					if (to === PaneEnum.left) {
						update.openTabs = newDst;
						update.page = page;
						update.lastActivePane = PaneEnum.left;
					} else {
						update.rightOpenTabs = newDst;
						update.rightPage = page;
						update.lastActivePane = PaneEnum.right;
					}
					return update;
				}),

			// Sidebar: open in whichever pane was last touched
			openInActivePane: (page) => {
				const s = get();
				if (s.splitEnabled && s.lastActivePane === PaneEnum.right) {
					set({
						rightOpenTabs: addToTabs(s.rightOpenTabs, page),
						rightPage: page,
						lastActivePane: PaneEnum.right,
					});
				} else {
					set({
						openTabs: addToTabs(s.openTabs, page),
						page,
						lastActivePane: PaneEnum.left,
					});
				}
			},

			toggleSplit: () => set((s) => ({ splitEnabled: !s.splitEnabled })),
			toggleSidebar: () =>
				set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
			toggleStatsPanel: () =>
				set((s) => ({ statsPanelCollapsed: !s.statsPanelCollapsed })),
			toggleTerminal: () => set((s) => ({ terminalOpen: !s.terminalOpen })),
			setEditorTheme: (editorTheme) => set({ editorTheme }),
			setUiZoom: (value) => set({ uiZoom: Math.min(150, Math.max(75, value)) }),
			setSidebarWidth: (w) =>
				set({ sidebarWidth: Math.min(500, Math.max(160, w)) }),
			setStatsPanelWidth: (w) =>
				set({ statsPanelWidth: Math.min(500, Math.max(200, w)) }),
			setTerminalHeight: (h) =>
				set({
					terminalHeight: Math.min(window.innerHeight * 0.7, Math.max(80, h)),
				}),
			setSplitRatio: (r) =>
				set({ splitRatio: Math.min(0.8, Math.max(0.2, r)) }),
			setTechTreeViewport: (viewport) => set({ techTreeViewport: viewport }),
			showTip: (id) => {
				const { seenTips } = get();
				if (seenTips.includes(id)) return;
				set({ seenTips: [...seenTips, id] });
			},
			pushTerminalLines: (lines) =>
				set((s) => ({
					terminalLog: [...s.terminalLog, ...lines],
					terminalOpen: true,
				})),
			resetAll: () => {
				set({
					seenTips: [],
					terminalLog: [],
					terminalOpen: true,
					page: PageEnum.game,
					openTabs: [PageEnum.readme, PageEnum.game, PageEnum.settings],
					rightPage: PageEnum.tech_tree,
					rightOpenTabs: [PageEnum.tech_tree],
					lastActivePane: PaneEnum.left,
					splitEnabled: false,
					sidebarCollapsed: true,
					statsPanelCollapsed: true,
					techTreeViewport: {
						x: -850,
						y: -200,
						zoom: 1,
					},
					uiZoom: 100,
					sidebarWidth: 260,
					statsPanelWidth: 280,
					terminalHeight: 200,
					splitRatio: 0.5,
				});
				localStorage.removeItem("flopsed-ui");
			},
		}),
		{
			name: "flopsed-ui",
			partialize: (state) => ({
				page: state.page,
				openTabs: state.openTabs,
				rightPage: state.rightPage,
				rightOpenTabs: state.rightOpenTabs,
				lastActivePane: state.lastActivePane,
				splitEnabled: state.splitEnabled,
				sidebarCollapsed: state.sidebarCollapsed,
				statsPanelCollapsed: state.statsPanelCollapsed,
				sidebarWidth: state.sidebarWidth,
				statsPanelWidth: state.statsPanelWidth,
				terminalHeight: state.terminalHeight,
				splitRatio: state.splitRatio,
				techTreeViewport: state.techTreeViewport,
				editorTheme: state.editorTheme,
				uiZoom: state.uiZoom,
				seenTips: state.seenTips,
				terminalLog: state.terminalLog,
				terminalOpen: state.terminalOpen,
			}),
		},
	),
);
