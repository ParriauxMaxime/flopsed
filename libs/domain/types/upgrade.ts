export interface UpgradeEffect {
	type: string;
	op: "add" | "multiply" | "enable" | "set";
	value: number | boolean | string;
	doubleInterval?: number;
}

export interface Upgrade {
	id: string;
	tier: string;
	name: string;
	description: string;
	icon: string;
	baseCost: number;
	costMultiplier: number;
	max: number;
	effects: UpgradeEffect[];
	/** Cost category for discount tech: "freelancer", "intern", "team", "manager", "llm", "agent" */
	costCategory?: string;
	codeQuality?: number;
	flopsCost?: number | string;
	/** Tech tree node IDs that must be researched before this upgrade appears */
	requires?: string[];
}
