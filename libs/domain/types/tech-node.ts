import type { UpgradeEffect } from "./upgrade";

export const TechCurrencyEnum = {
	loc: "loc",
	cash: "cash",
} as const;
export type TechCurrencyEnum =
	(typeof TechCurrencyEnum)[keyof typeof TechCurrencyEnum];

export interface TechNode {
	id: string;
	name: string;
	description: string;
	icon: string;
	requires: string[];
	max: number;
	baseCost: number;
	costMultiplier: number;
	currency: TechCurrencyEnum;
	effects: UpgradeEffect[];
	levelLabels?: string[];
	/** Position from tech tree editor */
	x?: number;
	y?: number;
}
