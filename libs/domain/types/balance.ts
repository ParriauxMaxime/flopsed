export interface BalanceCore {
	targetSessionMinutes: number;
	ticksPerSecond: number;
	startingCash: number;
	startingFlops: number;
	startingLocPerKey: number;
	manualTypingQuality: number;
	agiLocTarget: number;
}

export interface BalanceConfig {
	core: BalanceCore;
	[key: string]: unknown;
}
