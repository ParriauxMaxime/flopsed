export function computeFlops(
	cpu: number,
	ram: number,
	storage: number,
): number {
	return Math.min(cpu, ram) + storage;
}
