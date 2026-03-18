import eventsData from "../../../../specs/data/events.json";
import type { EventConfig, EventDefinition } from "../types";

export const TierIdEnum = {
	garage: "garage",
	freelancing: "freelancing",
	startup: "startup",
	tech_company: "tech_company",
	ai_lab: "ai_lab",
	agi_race: "agi_race",
} as const;
export type TierIdEnum = (typeof TierIdEnum)[keyof typeof TierIdEnum];

/** Tier ID → numeric index (matches tiers.json order) */
export const TIER_INDEX: Record<TierIdEnum, number> = {
	garage: 0,
	freelancing: 1,
	startup: 2,
	tech_company: 3,
	ai_lab: 4,
	agi_race: 5,
};

export const allEvents: EventDefinition[] =
	eventsData.events as EventDefinition[];

export const eventConfig: EventConfig = eventsData.eventConfig as EventConfig;
