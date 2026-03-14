#!/usr/bin/env node
/**
 * AGI Rush — Balance Checker
 *
 * Run after editing any data JSON to verify the game still hits target pacing.
 * Usage: node balance-check.js [--fix] [--verbose]
 *
 * Exit codes:
 *   0 = all checks pass
 *   1 = balance broken (with details on what to fix)
 */

const tiers = require("./data/tiers.json").tiers;
const upgrades = require("./data/upgrades.json").upgrades;
const techNodes = require("./data/tech-tree.json").nodes;
const aiModels = require("./data/ai-models.json").models;
const balance = require("./data/balance.json");

const VERBOSE = process.argv.includes("--verbose");

// ── Thresholds (edit these to adjust tolerance) ──
const RULES = {
	agiMinMinutes: 33,
	agiMaxMinutes: 50,
	maxWaitSeconds: 300,
	minPurchases: 80,
	maxPurchases: 500,
	minTiers: 6,
	tierMinDuration: {
		garage: 60,
		freelancing: 50,
		startup: 120,
		tech_company: 120,
		ai_lab: 300,
		agi_race: 120,
	},
	tierMaxDuration: {
		garage: 300,
		freelancing: 600,
		startup: 700,
		tech_company: 1000,
		ai_lab: 1000,
		agi_race: 800,
	},
};

// ── Simulation ──
function simulate(keysPerSec = 6) {
	const sim = {
		cash: 0,
		totalCash: 0,
		loc: 0,
		totalLoc: 0,
		flops: balance.core.startingFlops,
		cpuFlops: 0,
		ramFlops: 0,
		storageFlops: 0,
		locPerKey: balance.core.startingLocPerKey,
		locPerKeyMultiplier: 1,
		locProductionMultiplier: 1,
		internLoc: 0,
		devLoc: 0,
		teamLoc: 0,
		managerCount: 0,
		internLocMultiplier: 1,
		devLocMultiplier: 1,
		teamLocMultiplier: 1,
		managerMultiplier: 1,
		devSpeedMultiplier: 1,
		cashMultiplier: 1,
		aiLocMultiplier: 1,
		internCostDiscount: 1,
		devCostDiscount: 1,
		teamCostDiscount: 1,
		managerCostDiscount: 1,
		codeQuality: 100,
		currentTier: 0,
		owned: {},
		ownedTech: {},
		ownedModels: {},
		aiUnlocked: false,
		flopSlider: 0.5,
		autoTypeEnabled: false,
	};

	function getTechCost(node) {
		const owned = sim.ownedTech[node.id] || 0;
		return Math.floor(node.baseCost * Math.pow(node.costMultiplier, owned));
	}

	function getCost(u) {
		const owned = sim.owned[u.id] || 0;
		let cost = Math.floor(u.baseCost * Math.pow(u.costMultiplier, owned));
		if (u.costCategory === 'intern') cost = Math.floor(cost * sim.internCostDiscount);
		if (u.costCategory === 'dev') cost = Math.floor(cost * sim.devCostDiscount);
		if (u.costCategory === 'team') cost = Math.floor(cost * sim.teamCostDiscount);
		if (u.costCategory === 'manager') cost = Math.floor(cost * sim.managerCostDiscount);
		return Math.max(1, cost);
	}

	function totalFlops() {
		const hw = Math.min(sim.cpuFlops, sim.ramFlops) + sim.storageFlops;
		return sim.flops + hw;
	}

	function cashPerLoc() {
		return (
			tiers[sim.currentTier].cashPerLoc *
			sim.cashMultiplier *
			(sim.codeQuality / 100)
		);
	}

	function effLocPerKey() {
		return sim.locPerKey * sim.locPerKeyMultiplier;
	}

	function applyEffects(effects) {
		for (const e of effects) {
			if (e.type === "locPerKey" && e.op === "add") sim.locPerKey += e.value;
			if (e.type === "locPerKey" && e.op === "multiply")
				sim.locPerKeyMultiplier *= e.value;
			if (e.type === "flops" && e.op === "add") sim.flops += e.value;
			if (e.type === "cpuFlops" && e.op === "add") sim.cpuFlops += e.value;
			if (e.type === "ramFlops" && e.op === "add") sim.ramFlops += e.value;
			if (e.type === "storageFlops" && e.op === "add")
				sim.storageFlops += e.value;
			if (e.type === "autoLoc" && e.op === "add") sim.devLoc += e.value;
			if (e.type === "internLoc" && e.op === "add") sim.internLoc += e.value;
			if (e.type === "devLoc" && e.op === "add") sim.devLoc += e.value;
			if (e.type === "teamLoc" && e.op === "add") sim.teamLoc += e.value;
			if (e.type === "managerLoc" && e.op === "add") sim.managerCount += e.value;
			if (e.type === "devSpeed" && e.op === "multiply")
				sim.devSpeedMultiplier *= e.value;
			if (e.type === "locProductionSpeed" && e.op === "multiply")
				sim.locProductionMultiplier *= e.value;
			if (e.type === "cashMultiplier" && e.op === "multiply")
				sim.cashMultiplier *= e.value;
			if (e.type === "internLocMultiplier" && e.op === "multiply")
				sim.internLocMultiplier *= e.value;
			if (e.type === "devLocMultiplier" && e.op === "multiply")
				sim.devLocMultiplier *= e.value;
			if (e.type === "teamLocMultiplier" && e.op === "multiply")
				sim.teamLocMultiplier *= e.value;
			if (e.type === "managerMultiplier" && e.op === "multiply")
				sim.managerMultiplier *= e.value;
			if (e.type === "internCostDiscount" && e.op === "multiply")
				sim.internCostDiscount *= e.value;
			if (e.type === "devCostDiscount" && e.op === "multiply")
				sim.devCostDiscount *= e.value;
			if (e.type === "teamCostDiscount" && e.op === "multiply")
				sim.teamCostDiscount *= e.value;
			if (e.type === "managerCostDiscount" && e.op === "multiply")
				sim.managerCostDiscount *= e.value;
			if (e.type === "aiLocMultiplier" && e.op === "multiply")
				sim.aiLocMultiplier *= e.value;
			if (e.type === "instantCash" && e.op === "add") {
				sim.cash += e.value;
				sim.totalCash += e.value;
			}
			if (e.type === "autoType" && e.op === "enable") {
				sim.autoTypeEnabled = true;
			}
			if (e.type === "tierUnlock" && e.op === "set") {
				sim.currentTier = Math.max(sim.currentTier, e.value);
			}
		}
	}

	function calcAutoLoc() {
		const managerTeamBonus = 1 + sim.managerCount * 0.5 * sim.managerMultiplier;
		return (
			sim.internLoc * sim.internLocMultiplier +
			sim.devLoc * sim.devLocMultiplier * sim.devSpeedMultiplier +
			sim.teamLoc * sim.teamLocMultiplier * managerTeamBonus
		) * sim.locProductionMultiplier;
	}

	const agiTarget = balance.core.agiLocTarget || 200000000;
	const maxSec = 3600;
	let purchaseCount = 0;
	let lastPurchaseTime = 0;
	let longestWait = 0;
	let agiTime = null;
	const tierTimes = { 0: 0 };

	for (let t = 0; t < maxSec; t++) {
		const flops = totalFlops();

		// ── Produce LoC ──
		const manualLoc = effLocPerKey() * keysPerSec;
		const autoTypeLoc = sim.autoTypeEnabled ? effLocPerKey() * 5 : 0;
		const autoLoc = calcAutoLoc();
		sim.loc += manualLoc + autoTypeLoc + autoLoc;
		sim.totalLoc += manualLoc + autoTypeLoc + autoLoc;

		// ── AI + execution ──
		let aiLoc = 0;
		if (sim.aiUnlocked) {
			const aiFlops = flops * (1 - sim.flopSlider);
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
			const execFlops = flops * sim.flopSlider;
			const executed = Math.min(sim.loc, execFlops);
			sim.cash += executed * cashPerLoc();
			sim.totalCash += executed * cashPerLoc();
			sim.loc -= executed;
		} else {
			const executed = Math.min(sim.loc, flops);
			sim.cash += executed * cashPerLoc();
			sim.totalCash += executed * cashPerLoc();
			sim.loc -= executed;
		}
		sim.loc = Math.max(0, sim.loc);

		// ── Research tech nodes (costs LoC or cash depending on node) ──
		for (let b = 0; b < 3; b++) {
			const availTech = techNodes.filter((n) => {
				const owned = sim.ownedTech[n.id] || 0;
				if (owned >= n.max) return false;
				return n.requires.every((r) => (sim.ownedTech[r] || 0) > 0);
			});

			let bestTech = null;
			let bestTechVal = 0;

			for (const n of availTech) {
				const cost = getTechCost(n);
				const useLoc = n.currency === "loc";
				if (useLoc && cost > sim.loc) continue;
				if (!useLoc && cost > sim.cash) continue;
				let val = 0;
				for (const e of n.effects) {
					if (e.type === "flops") val += e.value * cashPerLoc() * 2;
					if (e.type === "cpuFlops" || e.type === "ramFlops")
						val += e.value * cashPerLoc() * 1.5;
					if (e.type === "storageFlops") val += e.value * cashPerLoc();
					if (e.type === "locPerKey" && e.op === "add")
						val += e.value * keysPerSec * cashPerLoc();
					if (e.type === "locPerKey" && e.op === "multiply")
						val +=
							sim.locPerKey * (e.value - 1) * keysPerSec * cashPerLoc();
					if (e.type === "locProductionSpeed" && e.op === "multiply")
						val += sim.autoLocPerSec * (e.value - 1) * cashPerLoc();
					if (e.type === "autoType") val += 5 * effLocPerKey() * cashPerLoc();
				}
				if (cost > 0 && val / cost > bestTechVal) {
					bestTechVal = val / cost;
					bestTech = { node: n, cost };
				}
			}

			if (!bestTech) break;
			if (bestTech.node.currency === "loc") {
				sim.loc -= bestTech.cost;
			} else {
				sim.cash -= bestTech.cost;
			}
			sim.ownedTech[bestTech.node.id] =
				(sim.ownedTech[bestTech.node.id] || 0) + 1;
			applyEffects(bestTech.node.effects);
			purchaseCount++;
		}

		// ── Buy items (costs cash) ──
		let boughtThisTick = false;
		for (let b = 0; b < 5; b++) {
			const avail = upgrades.filter((u) => {
				const tier = tiers.find((t2) => t2.id === u.tier);
				return (
					tier &&
					tier.index <= sim.currentTier &&
					(sim.owned[u.id] || 0) < u.max
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
				effLocPerKey() * keysPerSec +
				autoTypeLoc +
				calcAutoLoc() +
				aiLoc;
			const execCap = sim.aiUnlocked ? flops * sim.flopSlider : flops;
			const bottlenecked = totalLocS > execCap;

			let best = null;
			let bestVal = 0;

			for (const u of avail) {
				const cost = getCost(u);
				if (cost > sim.cash) continue;
				let val = 0;
				for (const e of u.effects) {
					if (e.type === "flops")
						val += e.value * cashPerLoc() * (bottlenecked ? 2 : 0.5);
					if (e.type === "locPerKey" && e.op === "add")
						val +=
							e.value *
							keysPerSec *
							cashPerLoc() *
							(bottlenecked ? 0.3 : 1);
					if (e.type === "locPerKey" && e.op === "multiply")
						val +=
							sim.locPerKey *
							(e.value - 1) *
							keysPerSec *
							cashPerLoc() *
							(bottlenecked ? 0.3 : 1);
					if (e.type === "autoLoc" || e.type === "internLoc" || e.type === "devLoc")
						val += e.value * cashPerLoc() * (bottlenecked ? 0.3 : 1);
					if (e.type === "teamLoc")
						val += e.value * cashPerLoc() * (1 + sim.managerCount * 0.5) * (bottlenecked ? 0.3 : 1);
					if (e.type === "managerLoc")
						val += sim.teamLoc * 0.5 * cashPerLoc() * (bottlenecked ? 0.3 : 1);
					if (e.type === "cashMultiplier")
						val +=
							Math.min(totalLocS, execCap) * cashPerLoc() * (e.value - 1);
					if (e.type === "instantCash") val += e.value / 60;
					if (e.type === "devSpeed" || e.type === "locProductionSpeed")
						val +=
							sim.autoLocPerSec *
							(e.value - 1) *
							cashPerLoc() *
							(bottlenecked ? 0.3 : 1);
				}
				if (cost > 0 && val / cost > bestVal) {
					bestVal = val / cost;
					best = { type: "u", item: u, cost };
				}
			}

			for (const m of availModels) {
				if (m.cost > sim.cash) continue;
				const val =
					(m.locPerSec * sim.aiLocMultiplier * cashPerLoc()) / m.cost;
				if (val > bestVal) {
					bestVal = val;
					best = { type: "m", item: m, cost: m.cost };
				}
			}

			if (!best) break;

			if (best.type === "u") {
				sim.cash -= best.cost;
				sim.owned[best.item.id] = (sim.owned[best.item.id] || 0) + 1;
				applyEffects(best.item.effects);
			} else {
				sim.cash -= best.cost;
				sim.ownedModels[best.item.id] = true;
				if (!sim.aiUnlocked) {
					sim.aiUnlocked = true;
					sim.flopSlider = 0.5;
				}
			}
			purchaseCount++;
			boughtThisTick = true;
		}

		if (boughtThisTick) {
			const wait = t - lastPurchaseTime;
			if (wait > longestWait) longestWait = wait;
			lastPurchaseTime = t;
		}

		// ── Tier unlock (manual advance — costs cash) ──
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
			} else {
				break;
			}
		}

		// ── AGI check ──
		if (sim.totalLoc >= agiTarget && agiTime === null) {
			agiTime = t;
			break;
		}
	}

	return {
		agiTime,
		purchaseCount,
		longestWait,
		tierTimes,
		totalCash: sim.totalCash,
		totalLoc: sim.totalLoc,
		finalTier: sim.currentTier,
		aiModelsOwned: Object.values(sim.ownedModels).filter(Boolean).length,
	};
}

// ── Run checks ──
function check() {
	const results = [];
	let ok = true;

	function fail(msg) {
		ok = false;
		results.push(`  FAIL: ${msg}`);
	}
	function pass(msg) {
		results.push(`  pass: ${msg}`);
	}
	function info(msg) {
		if (VERBOSE) results.push(`  info: ${msg}`);
	}

	const profiles = [
		{ name: "Casual (4 keys/s)", keysPerSec: 4 },
		{ name: "Average (6 keys/s)", keysPerSec: 6 },
		{ name: "Fast (9 keys/s)", keysPerSec: 9 },
	];

	for (const profile of profiles) {
		results.push(`\n[${profile.name}]`);
		const r = simulate(profile.keysPerSec);

		if (r.agiTime === null) {
			fail(`AGI never reached in 60 minutes!`);
		} else {
			const agiMin = r.agiTime / 60;
			if (agiMin < RULES.agiMinMinutes)
				fail(
					`AGI too fast: ${agiMin.toFixed(1)}min (min: ${RULES.agiMinMinutes})`,
				);
			else if (agiMin > RULES.agiMaxMinutes)
				fail(
					`AGI too slow: ${agiMin.toFixed(1)}min (max: ${RULES.agiMaxMinutes})`,
				);
			else
				pass(
					`AGI at ${agiMin.toFixed(1)}min (target: ${RULES.agiMinMinutes}-${RULES.agiMaxMinutes})`,
				);
		}

		if (r.purchaseCount < RULES.minPurchases)
			fail(
				`Too few purchases: ${r.purchaseCount} (min: ${RULES.minPurchases})`,
			);
		else if (r.purchaseCount > RULES.maxPurchases)
			fail(
				`Too many purchases: ${r.purchaseCount} (max: ${RULES.maxPurchases})`,
			);
		else
			pass(
				`${r.purchaseCount} purchases (${RULES.minPurchases}-${RULES.maxPurchases})`,
			);

		if (r.longestWait > RULES.maxWaitSeconds)
			fail(
				`Longest wait: ${r.longestWait}s (max: ${RULES.maxWaitSeconds}s)`,
			);
		else
			pass(`Longest wait: ${r.longestWait}s (max: ${RULES.maxWaitSeconds}s)`);

		const tiersReached = Object.keys(r.tierTimes).length;
		if (tiersReached < RULES.minTiers)
			fail(`Only ${tiersReached} tiers reached (need ${RULES.minTiers})`);
		else pass(`All ${tiersReached} tiers reached`);

		const tierIds = tiers.map((t) => t.id);
		for (let i = 0; i < tierIds.length; i++) {
			const id = tierIds[i];
			const start = r.tierTimes[i];
			if (start === undefined) continue;
			const end =
				i + 1 < tierIds.length && r.tierTimes[i + 1] !== undefined
					? r.tierTimes[i + 1]
					: r.agiTime || 3600;
			const duration = end - start;

			const minDur = RULES.tierMinDuration[id];
			const maxDur = RULES.tierMaxDuration[id];

			if (minDur && duration < minDur)
				fail(
					`${tiers[i].name} too short: ${duration}s (min: ${minDur}s)`,
				);
			else if (maxDur && duration > maxDur)
				fail(
					`${tiers[i].name} too long: ${duration}s (max: ${maxDur}s)`,
				);
			else
				info(
					`${tiers[i].name}: ${duration}s (${minDur}-${maxDur}s)`,
				);
		}

		info(`AI models owned: ${r.aiModelsOwned}/${aiModels.length}`);
	}

	return { ok, results };
}

// ── Main ──
const { ok, results } = check();

console.log("AGI Rush — Balance Check");
console.log("========================");
console.log(results.join("\n"));
console.log(
	"\n" + (ok ? "ALL CHECKS PASSED" : "BALANCE BROKEN — see failures above"),
);
process.exit(ok ? 0 : 1);
