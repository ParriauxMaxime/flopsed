import aiModelsData from "../../specs/data/ai-models.json";
import balanceData from "../../specs/data/balance.json";
import tiersData from "../../specs/data/tiers.json";
import upgradesData from "../../specs/data/upgrades.json";

// ── Types ──

export const AiStrategyEnum = {
	balanced: "balanced",
	exec_heavy: "exec_heavy",
	ai_heavy: "ai_heavy",
} as const;
export type AiStrategyEnum =
	(typeof AiStrategyEnum)[keyof typeof AiStrategyEnum];

export const PurchaseTypeEnum = {
	upgrade: "upgrade",
	tier: "tier",
	ai: "ai",
} as const;
export type PurchaseTypeEnum =
	(typeof PurchaseTypeEnum)[keyof typeof PurchaseTypeEnum];

export interface SimConfig {
	keysPerSec: number;
	skill: number;
	aiStrategy: AiStrategyEnum;
	maxMinutes: number;
}

export interface SimSnapshot {
	time: number;
	cash: number;
	loc: number;
	flops: number;
	quality: number;
	locPerSec: number;
	cashPerSec: number;
	tier: number;
}

export interface SimLogEntry {
	time: number;
	type: string;
	msg: string;
	cash: number;
	loc: number;
	flops: number;
}

export interface SimPurchase {
	time: number;
	type: PurchaseTypeEnum;
	name: string;
}

export interface SimResult {
	agiTime: number | null;
	endTime: number;
	purchaseCount: number;
	longestWait: number;
	tierTimes: Record<number, number>;
	totalCash: number;
	totalLoc: number;
	finalTier: number;
	finalQuality: number;
	aiModelsOwned: number;
	passed: boolean;
	failures: string[];
	snapshots: SimSnapshot[];
	log: SimLogEntry[];
	purchases: SimPurchase[];
}

// ── Data ──

interface AiModel {
	id: string;
	name: string;
	version: string;
	locPerSec: number;
	flopsCost: number;
	cost: number;
	requires?: string;
}

const tiers = tiersData.tiers;
const upgrades = upgradesData.upgrades;
const aiModels: AiModel[] = aiModelsData.models as AiModel[];
const { core, costCurve, qualityCurve, flopsAllocation } = balanceData;

const RULES = {
	agiMinMinutes: 33,
	agiMaxMinutes: 50,
	maxWaitSeconds: 160,
	minPurchases: 80,
	maxPurchases: 150,
};

const DEFAULT_CONFIG: SimConfig = {
	keysPerSec: 6,
	skill: 0.8,
	aiStrategy: AiStrategyEnum.balanced,
	maxMinutes: 60,
};

// ── Helpers ──

function getCostCategory(
	effects: Array<{ type: string }>,
): keyof typeof costCurve {
	if (effects.some((e) => e.type === "flops")) return "hardware";
	if (effects.some((e) => e.type === "locPerKey")) return "typing";
	if (effects.some((e) => e.type === "autoLoc")) return "devs";
	return "infrastructure";
}

// ── Simulation ──

export function runBalanceSim(config: Partial<SimConfig> = {}): SimResult {
	const cfg = { ...DEFAULT_CONFIG, ...config };

	const sim = {
		cash: core.startingCash,
		totalCash: 0,
		loc: 0,
		totalLoc: 0,
		flops: core.startingFlops,
		locPerKey: core.startingLocPerKey,
		locPerKeyMultiplier: 1,
		autoLocPerSec: 0,
		devSpeedMultiplier: 1,
		cashMultiplier: 1,
		aiLocMultiplier: 1,
		codeQuality: core.manualTypingQuality,
		currentTier: 0,
		owned: {} as Record<string, number>,
		ownedModels: {} as Record<string, boolean>,
		aiUnlocked: false,
		flopSlider: flopsAllocation.defaultSplit,
	};

	const log: SimLogEntry[] = [];
	const snapshots: SimSnapshot[] = [];
	const purchases: SimPurchase[] = [];

	function getCost(u: (typeof upgrades)[0]): number {
		const owned = sim.owned[u.id] ?? 0;
		const cat = getCostCategory(u.effects);
		const rate =
			(costCurve[cat] as { growthRate: number } | undefined)?.growthRate ??
			1.12;
		return Math.floor(u.baseCost * rate ** owned);
	}

	function cashPerLoc(): number {
		return (
			tiers[sim.currentTier].cashPerLoc *
			sim.cashMultiplier *
			(sim.codeQuality / 100)
		);
	}

	function effLocPerKey(): number {
		return sim.locPerKey * sim.locPerKeyMultiplier * sim.devSpeedMultiplier;
	}

	function applyEffects(u: (typeof upgrades)[0]): void {
		for (const e of u.effects) {
			const val = e.value as number;
			if (e.type === "locPerKey" && e.op === "add") sim.locPerKey += val;
			if (e.type === "locPerKey" && e.op === "multiply")
				sim.locPerKeyMultiplier *= val;
			if (e.type === "flops" && e.op === "add") sim.flops += val;
			if (e.type === "autoLoc" && e.op === "add") sim.autoLocPerSec += val;
			if (e.type === "devSpeed" && e.op === "multiply")
				sim.devSpeedMultiplier *= val;
			if (e.type === "locProductionSpeed" && e.op === "multiply")
				sim.devSpeedMultiplier *= val;
			if (e.type === "cashMultiplier" && e.op === "multiply")
				sim.cashMultiplier *= val;
			if (e.type === "aiLocMultiplier" && e.op === "multiply")
				sim.aiLocMultiplier *= val;
			if (e.type === "instantCash" && e.op === "add") {
				sim.cash += val;
				sim.totalCash += val;
			}
		}
	}

	const agiTarget =
		"agiLocTarget" in core ? (core.agiLocTarget as number) : 200000000;
	const maxSeconds = cfg.maxMinutes * 60;
	let purchaseCount = 0;
	let lastPurchaseTime = 0;
	let longestWait = 0;
	let agiTime: number | null = null;
	const tierTimes: Record<number, number> = { 0: 0 };
	let endTime = 0;

	for (let t = 0; t < maxSeconds; t++) {
		endTime = t;

		// ── Manual typing ──
		const manualLoc = effLocPerKey() * cfg.keysPerSec;
		sim.loc += manualLoc;
		sim.totalLoc += manualLoc;

		// ── Dev auto-LoC ──
		const devLoc = sim.autoLocPerSec * sim.devSpeedMultiplier;
		sim.loc += devLoc;
		sim.totalLoc += devLoc;

		// ── AI generation + Execution ──
		let aiLoc = 0;
		if (sim.aiUnlocked) {
			const aiFlops = sim.flops * (1 - sim.flopSlider);
			let totalAiLoc = 0;
			let totalAiFlops = 0;
			for (const [id, v] of Object.entries(sim.ownedModels)) {
				if (!v) continue;
				const m = aiModels.find((x) => x.id === id);
				if (m) {
					totalAiLoc += m.locPerSec * sim.aiLocMultiplier;
					totalAiFlops += m.flopsCost;
				}
			}
			if (totalAiFlops > 0) {
				aiLoc = totalAiLoc * Math.min(1, aiFlops / totalAiFlops);
				sim.loc += aiLoc;
				sim.totalLoc += aiLoc;
			}
			const execFlops = sim.flops * sim.flopSlider;
			const executed = Math.min(sim.loc, execFlops);
			sim.cash += executed * cashPerLoc();
			sim.totalCash += executed * cashPerLoc();
			sim.loc -= executed;
		} else {
			const executed = Math.min(sim.loc, sim.flops);
			sim.cash += executed * cashPerLoc();
			sim.totalCash += executed * cashPerLoc();
			sim.loc -= executed;
		}

		// ── Quality decay ──
		const aiDecay = aiLoc * qualityCurve.aiQualityDecayMultiplier;
		sim.codeQuality -= qualityCurve.qualityDecayPerMinute / 60 + aiDecay;
		sim.codeQuality = Math.max(sim.codeQuality, 40);

		// ── Purchasing ──
		let boughtThisTick = false;
		for (let b = 0; b < 5; b++) {
			const avail = upgrades.filter((u) => {
				const tier = tiers.find((t2) => t2.id === u.tier);
				return (
					tier &&
					tier.index <= sim.currentTier &&
					(sim.owned[u.id] ?? 0) < u.max
				);
			});
			const availModels =
				sim.currentTier >= 4
					? aiModels.filter(
							(m) =>
								!sim.ownedModels[m.id] &&
								(!m.requires || sim.ownedModels[m.requires]),
						)
					: [];

			const totalLocS =
				effLocPerKey() * cfg.keysPerSec +
				sim.autoLocPerSec * sim.devSpeedMultiplier +
				aiLoc;
			const execCap = sim.aiUnlocked ? sim.flops * sim.flopSlider : sim.flops;
			const bottlenecked = totalLocS > execCap;

			interface Candidate {
				type: "u" | "m";
				item: (typeof upgrades)[0] | AiModel;
				cost: number;
				value: number;
			}
			const candidates: Candidate[] = [];

			for (const u of avail) {
				const c = getCost(u);
				if (c > sim.cash) continue;
				let val = 0;
				for (const e of u.effects) {
					const ev = e.value as number;
					if (e.type === "flops")
						val += ev * cashPerLoc() * (bottlenecked ? 2 : 0.5);
					if (e.type === "locPerKey" && e.op === "add")
						val +=
							ev * cfg.keysPerSec * cashPerLoc() * (bottlenecked ? 0.3 : 1);
					if (e.type === "locPerKey" && e.op === "multiply")
						val +=
							sim.locPerKey *
							(ev - 1) *
							cfg.keysPerSec *
							cashPerLoc() *
							(bottlenecked ? 0.3 : 1);
					if (e.type === "autoLoc")
						val += ev * cashPerLoc() * (bottlenecked ? 0.3 : 1);
					if (e.type === "cashMultiplier")
						val += Math.min(totalLocS, execCap) * cashPerLoc() * (ev - 1);
					if (e.type === "instantCash") val += ev / 60;
					if (e.type === "locProductionSpeed" || e.type === "devSpeed")
						val +=
							sim.autoLocPerSec *
							(ev - 1) *
							cashPerLoc() *
							(bottlenecked ? 0.3 : 1);
				}
				if (val > 0) {
					candidates.push({ type: "u", item: u, cost: c, value: val / c });
				}
			}

			for (const m of availModels) {
				if (m.cost > sim.cash) continue;
				const val = (m.locPerSec * sim.aiLocMultiplier * cashPerLoc()) / m.cost;
				if (val > 0) {
					candidates.push({ type: "m", item: m, cost: m.cost, value: val });
				}
			}

			if (candidates.length === 0) break;

			candidates.sort((a, b) => b.value - a.value);

			// Skill-based selection: sometimes pick suboptimally
			let pick = candidates[0];
			if (Math.random() > cfg.skill && candidates.length > 1) {
				const idx = Math.floor(Math.random() * Math.min(3, candidates.length));
				pick = candidates[idx];
			}

			if (pick.type === "u") {
				const u = pick.item as (typeof upgrades)[0];
				sim.cash -= pick.cost;
				sim.owned[u.id] = (sim.owned[u.id] ?? 0) + 1;
				applyEffects(u);
				log.push({
					time: t,
					type: "purchase",
					msg: `Bought ${u.name} (#${sim.owned[u.id]}) for $${Math.floor(pick.cost).toLocaleString()}`,
					cash: sim.cash,
					loc: sim.totalLoc,
					flops: sim.flops,
				});
				purchases.push({
					time: t,
					type: PurchaseTypeEnum.upgrade,
					name: u.name,
				});
			} else {
				const m = pick.item as AiModel;
				sim.cash -= pick.cost;
				sim.ownedModels[m.id] = true;
				if (!sim.aiUnlocked) {
					sim.aiUnlocked = true;
					if (cfg.aiStrategy === AiStrategyEnum.exec_heavy)
						sim.flopSlider = 0.7;
					else if (cfg.aiStrategy === AiStrategyEnum.ai_heavy)
						sim.flopSlider = 0.3;
					else sim.flopSlider = 0.5;
					log.push({
						time: t,
						type: "ai-unlock",
						msg: "AI UNLOCKED! FLOPS slider active.",
						cash: sim.cash,
						loc: sim.totalLoc,
						flops: sim.flops,
					});
				}
				log.push({
					time: t,
					type: "purchase ai",
					msg: `Bought ${m.name} ${m.version} for $${Math.floor(pick.cost).toLocaleString()}`,
					cash: sim.cash,
					loc: sim.totalLoc,
					flops: sim.flops,
				});
				purchases.push({
					time: t,
					type: PurchaseTypeEnum.ai,
					name: `${m.name} ${m.version}`,
				});
			}
			purchaseCount++;
			boughtThisTick = true;
		}

		if (boughtThisTick) {
			const wait = t - lastPurchaseTime;
			if (wait > longestWait) longestWait = wait;
			lastPurchaseTime = t;
		}

		// ── Tier unlock ──
		while (sim.currentTier < tiers.length - 1) {
			const next = tiers[sim.currentTier + 1];
			if (
				sim.totalLoc >= next.locRequired &&
				sim.totalCash >= next.cashRequired &&
				sim.cash >= next.cost
			) {
				sim.cash -= next.cost;
				sim.currentTier++;
				tierTimes[sim.currentTier] = t;
				log.push({
					time: t,
					type: "tier-unlock",
					msg: `TIER UNLOCKED: ${next.name} (${next.tagline})`,
					cash: sim.cash,
					loc: sim.totalLoc,
					flops: sim.flops,
				});
				purchases.push({
					time: t,
					type: PurchaseTypeEnum.tier,
					name: next.name,
				});
			} else {
				break;
			}
		}

		// ── Snapshot every 10s ──
		if (t % 10 === 0) {
			const execCap = sim.aiUnlocked ? sim.flops * sim.flopSlider : sim.flops;
			snapshots.push({
				time: t,
				cash: sim.totalCash,
				loc: sim.totalLoc,
				flops: sim.flops,
				quality: sim.codeQuality,
				locPerSec: manualLoc + devLoc + aiLoc,
				cashPerSec:
					Math.min(sim.loc + manualLoc + devLoc + aiLoc, execCap) *
					cashPerLoc(),
				tier: sim.currentTier,
			});
		}

		// ── AGI check ──
		if (sim.totalLoc >= agiTarget) {
			agiTime = t;
			log.push({
				time: t,
				type: "tier-unlock",
				msg: `AGI ACHIEVED!`,
				cash: sim.cash,
				loc: sim.totalLoc,
				flops: sim.flops,
			});
			break;
		}
	}

	// ── Validate ──
	const failures: string[] = [];
	if (agiTime === null) {
		failures.push("AGI never reached");
	} else {
		const min = agiTime / 60;
		if (min < RULES.agiMinMinutes)
			failures.push(`AGI too fast: ${min.toFixed(1)}m`);
		if (min > RULES.agiMaxMinutes)
			failures.push(`AGI too slow: ${min.toFixed(1)}m`);
	}
	if (purchaseCount < RULES.minPurchases)
		failures.push(`Too few purchases: ${purchaseCount}`);
	if (purchaseCount > RULES.maxPurchases)
		failures.push(`Too many purchases: ${purchaseCount}`);
	if (longestWait > RULES.maxWaitSeconds)
		failures.push(`Longest wait: ${longestWait}s`);

	return {
		agiTime,
		endTime,
		purchaseCount,
		longestWait,
		tierTimes,
		totalCash: sim.totalCash,
		totalLoc: sim.totalLoc,
		finalTier: sim.currentTier,
		finalQuality: sim.codeQuality,
		aiModelsOwned: Object.values(sim.ownedModels).filter(Boolean).length,
		passed: failures.length === 0,
		failures,
		snapshots,
		log,
		purchases,
	};
}
