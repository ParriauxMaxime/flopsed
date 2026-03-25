import aiModelsJson from "./data/ai-models.json";
import balanceJson from "./data/balance.json";
import eventsJson from "./data/events.json";
import milestonesJson from "./data/milestones.json";
import techTreeJson from "./data/tech-tree.json";
import tiersJson from "./data/tiers.json";
import upgradesJson from "./data/upgrades.json";
import type { AgentSetup, AiModelData } from "./types/ai-model";
import type { BalanceConfig } from "./types/balance";
import type { EventConfig, EventDefinition } from "./types/event";
import type { Milestone } from "./types/milestone";
import type { TechNode } from "./types/tech-node";
import type { Tier } from "./types/tier";
import type { Upgrade } from "./types/upgrade";

export const tiers: Tier[] = tiersJson.tiers as Tier[];
export const upgrades: Upgrade[] = upgradesJson.upgrades as Upgrade[];
export const techNodes: TechNode[] = techTreeJson.nodes as TechNode[];
export const aiModels: AiModelData[] = aiModelsJson.models as AiModelData[];
export const agentSetups: AgentSetup[] =
	aiModelsJson.agentSetups as AgentSetup[];
export const events: EventDefinition[] = eventsJson.events as EventDefinition[];
export const eventConfig: EventConfig = eventsJson.eventConfig as EventConfig;
export const milestones: Milestone[] = milestonesJson.milestones as Milestone[];
export const balance: BalanceConfig = balanceJson as unknown as BalanceConfig;

// Re-export raw JSON for cases that need the full structure
export {
	aiModelsJson,
	balanceJson,
	eventsJson,
	milestonesJson,
	techTreeJson,
	tiersJson,
	upgradesJson,
};
