import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import deLocale from "./locales/de";
import enAiModels from "./locales/en/ai-models.json";
import enEvents from "./locales/en/events.json";
import enMilestones from "./locales/en/milestones.json";
import enSingularity from "./locales/en/singularity.json";
import enTechTree from "./locales/en/tech-tree.json";
import enTiers from "./locales/en/tiers.json";
import enTutorial from "./locales/en/tutorial.json";
import enUi from "./locales/en/ui.json";
import enUpgrades from "./locales/en/upgrades.json";
import esLocale from "./locales/es";
import frLocale from "./locales/fr";
import itLocale from "./locales/it";
import plLocale from "./locales/pl";
import ruLocale from "./locales/ru";
import zhLocale from "./locales/zh";

export const supportedLanguages = [
	{ code: "en", name: "English", flag: "🇬🇧" },
	{ code: "fr", name: "Français", flag: "🇫🇷" },
	{ code: "it", name: "Italiano", flag: "🇮🇹" },
	{ code: "de", name: "Deutsch", flag: "🇩🇪" },
	{ code: "es", name: "Español", flag: "🇪🇸" },
	{ code: "pl", name: "Polski", flag: "🇵🇱" },
	{ code: "zh", name: "中文", flag: "🇨🇳" },
	{ code: "ru", name: "Русский", flag: "🇷🇺" },
] as const;

const enBundles = {
	ui: enUi,
	upgrades: enUpgrades,
	"tech-tree": enTechTree,
	tiers: enTiers,
	events: enEvents,
	milestones: enMilestones,
	"ai-models": enAiModels,
	tutorial: enTutorial,
	singularity: enSingularity,
};

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		fallbackLng: "en",
		defaultNS: "ui",
		ns: [
			"ui",
			"upgrades",
			"tech-tree",
			"tiers",
			"events",
			"milestones",
			"ai-models",
			"tutorial",
			"singularity",
		],
		resources: {
			en: enBundles,
			fr: frLocale,
			it: itLocale,
			de: deLocale,
			es: esLocale,
			pl: plLocale,
			zh: zhLocale,
			ru: ruLocale,
		},
		interpolation: { escapeValue: false },
		detection: {
			order: ["localStorage", "navigator"],
			caches: ["localStorage"],
		},
	});

// Chinese requires a web font on systems without CJK fonts installed.
// Load Noto Sans SC dynamically only when the active language is zh, and
// apply it as a global fallback so every translated string renders.
const ZH_FONT_LINK_ID = "zh-font-link";
const ZH_FONT_STYLE_ID = "zh-font-style";

function applyChineseFontSupport(lang: string): void {
	if (typeof document === "undefined") return;
	const isZh = lang.toLowerCase().startsWith("zh");
	const existingLink = document.getElementById(ZH_FONT_LINK_ID);
	const existingStyle = document.getElementById(ZH_FONT_STYLE_ID);

	if (!isZh) {
		existingLink?.remove();
		existingStyle?.remove();
		return;
	}

	if (!existingLink) {
		const link = document.createElement("link");
		link.id = ZH_FONT_LINK_ID;
		link.rel = "stylesheet";
		link.href =
			"https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap";
		document.head.appendChild(link);
	}

	if (!existingStyle) {
		const style = document.createElement("style");
		style.id = ZH_FONT_STYLE_ID;
		style.textContent = `body, input, button, select, textarea {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
		}`;
		document.head.appendChild(style);
	}
}

applyChineseFontSupport(i18n.language);
i18n.on("languageChanged", applyChineseFontSupport);

export default i18n;
