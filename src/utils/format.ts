export function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatNumber(n: number, decimals = false): string {
	if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
	if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
	if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
	if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
	if (decimals && n > 0 && n < 1) return n.toFixed(2);
	if (decimals && n < 100) return n.toFixed(2);
	return Math.floor(n).toString();
}
