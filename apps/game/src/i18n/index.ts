import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enAiModels from "./locales/en/ai-models.json";
import enEvents from "./locales/en/events.json";
import enMilestones from "./locales/en/milestones.json";
import enTechTree from "./locales/en/tech-tree.json";
import enTiers from "./locales/en/tiers.json";
import enTutorial from "./locales/en/tutorial.json";
import enUi from "./locales/en/ui.json";
import enUpgrades from "./locales/en/upgrades.json";

export const supportedLanguages = [
	{ code: "en", name: "English" },
	{ code: "fr", name: "Fran\u00e7ais" },
	{ code: "it", name: "Italiano" },
	{ code: "de", name: "Deutsch" },
	{ code: "es", name: "Espa\u00f1ol" },
	{ code: "pl", name: "Polski" },
	{ code: "zh", name: "\u4e2d\u6587" },
	{ code: "ru", name: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439" },
] as const;

const lazyLocales: Record<string, () => Promise<{ default: Record<string, Record<string, unknown>> }>> = {
	fr: () => import("./locales/fr"),
	it: () => import("./locales/it"),
	de: () => import("./locales/de"),
	es: () => import("./locales/es"),
	pl: () => import("./locales/pl"),
	zh: () => import("./locales/zh"),
	ru: () => import("./locales/ru"),
};

const namespaces = ["ui", "upgrades", "tech-tree", "tiers", "events", "milestones", "ai-models", "tutorial"] as const;

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		fallbackLng: "en",
		defaultNS: "ui",
		ns: [...namespaces],
		resources: {
			en: {
				ui: enUi,
				upgrades: enUpgrades,
				"tech-tree": enTechTree,
				tiers: enTiers,
				events: enEvents,
				milestones: enMilestones,
				"ai-models": enAiModels,
				tutorial: enTutorial,
			},
		},
		interpolation: { escapeValue: false },
		detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] },
	});

i18n.on("languageChanged", async (lng: string) => {
	if (lng === "en" || !lazyLocales[lng]) return;
	if (i18n.hasResourceBundle(lng, "ui")) return;

	const loader = lazyLocales[lng];
	const mod = await loader();
	const bundles = mod.default;
	for (const ns of namespaces) {
		if (bundles[ns]) {
			i18n.addResourceBundle(lng, ns, bundles[ns]);
		}
	}
});

export default i18n;
