import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import deLocale from "./locales/de";
import enAiModels from "./locales/en/ai-models.json";
import enEvents from "./locales/en/events.json";
import enMilestones from "./locales/en/milestones.json";
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

export default i18n;
