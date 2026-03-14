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

export interface EditorTheme {
	name: string;
	background: string;
	foreground: string;
	lineNumbers: string;
	cursor: string;
	scrollThumb: string;
	keyword: string;
	function: string;
	string: string;
	comment: string;
	number: string;
	operator: string;
	type: string;
	variable: string;
}

export const EDITOR_THEMES: Record<EditorThemeEnum, EditorTheme> = {
	[EditorThemeEnum.one_dark]: {
		name: "One Dark",
		background: "#0a0e14",
		foreground: "#c5c8c6",
		lineNumbers: "#3b4048",
		cursor: "#528bff",
		scrollThumb: "#1e2630",
		keyword: "#c678dd",
		function: "#61afef",
		string: "#98c379",
		comment: "#5c6370",
		number: "#d19a66",
		operator: "#56b6c2",
		type: "#e5c07b",
		variable: "#e06c75",
	},
	[EditorThemeEnum.monokai]: {
		name: "Monokai",
		background: "#272822",
		foreground: "#f8f8f2",
		lineNumbers: "#75715e",
		cursor: "#f8f8f0",
		scrollThumb: "#49483e",
		keyword: "#f92672",
		function: "#a6e22e",
		string: "#e6db74",
		comment: "#75715e",
		number: "#ae81ff",
		operator: "#f92672",
		type: "#66d9ef",
		variable: "#fd971f",
	},
	[EditorThemeEnum.github_dark]: {
		name: "GitHub Dark",
		background: "#0d1117",
		foreground: "#e6edf3",
		lineNumbers: "#484f58",
		cursor: "#58a6ff",
		scrollThumb: "#30363d",
		keyword: "#ff7b72",
		function: "#d2a8ff",
		string: "#a5d6ff",
		comment: "#8b949e",
		number: "#79c0ff",
		operator: "#ff7b72",
		type: "#ffa657",
		variable: "#ffa657",
	},
	[EditorThemeEnum.github_light]: {
		name: "GitHub Light",
		background: "#ffffff",
		foreground: "#1f2328",
		lineNumbers: "#8c959f",
		cursor: "#0969da",
		scrollThumb: "#afb8c1",
		keyword: "#cf222e",
		function: "#8250df",
		string: "#0a3069",
		comment: "#6e7781",
		number: "#0550ae",
		operator: "#cf222e",
		type: "#953800",
		variable: "#953800",
	},
	[EditorThemeEnum.solarized_dark]: {
		name: "Solarized Dark",
		background: "#002b36",
		foreground: "#839496",
		lineNumbers: "#586e75",
		cursor: "#268bd2",
		scrollThumb: "#073642",
		keyword: "#859900",
		function: "#268bd2",
		string: "#2aa198",
		comment: "#586e75",
		number: "#d33682",
		operator: "#93a1a1",
		type: "#b58900",
		variable: "#cb4b16",
	},
	[EditorThemeEnum.solarized_light]: {
		name: "Solarized Light",
		background: "#fdf6e3",
		foreground: "#657b83",
		lineNumbers: "#93a1a1",
		cursor: "#268bd2",
		scrollThumb: "#eee8d5",
		keyword: "#859900",
		function: "#268bd2",
		string: "#2aa198",
		comment: "#93a1a1",
		number: "#d33682",
		operator: "#657b83",
		type: "#b58900",
		variable: "#cb4b16",
	},
	[EditorThemeEnum.dracula]: {
		name: "Dracula",
		background: "#282a36",
		foreground: "#f8f8f2",
		lineNumbers: "#6272a4",
		cursor: "#f8f8f2",
		scrollThumb: "#44475a",
		keyword: "#ff79c6",
		function: "#50fa7b",
		string: "#f1fa8c",
		comment: "#6272a4",
		number: "#bd93f9",
		operator: "#ff79c6",
		type: "#8be9fd",
		variable: "#ffb86c",
	},
	[EditorThemeEnum.nord]: {
		name: "Nord",
		background: "#2e3440",
		foreground: "#d8dee9",
		lineNumbers: "#4c566a",
		cursor: "#88c0d0",
		scrollThumb: "#3b4252",
		keyword: "#81a1c1",
		function: "#88c0d0",
		string: "#a3be8c",
		comment: "#616e88",
		number: "#b48ead",
		operator: "#81a1c1",
		type: "#ebcb8b",
		variable: "#d08770",
	},
};
