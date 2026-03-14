import { useGameStore } from "@modules/game";
import { useEffect, useRef } from "react";

export function useAutoType(advanceTokens: (count: number) => void) {
	const autoLocPerSec = useGameStore((s) => s.autoLocPerSec);
	const autoTypeEnabled = useGameStore((s) => s.autoTypeEnabled);
	const locPerKey = useGameStore((s) => s.locPerKey);
	const autoAccumRef = useRef(0);

	useEffect(() => {
		const hasAutoType = autoTypeEnabled;
		const hasDevs = autoLocPerSec > 0;
		if (!hasAutoType && !hasDevs) return;

		let rafId: number;
		let lastTime = performance.now();

		function autoLoop() {
			const now = performance.now();
			const dt = (now - lastTime) / 1000;
			lastTime = now;

			// Auto-type: ~5 keystrokes/sec (passive coding, not as fast as active typing)
			const autoTypeRate = hasAutoType ? 5 : 0;
			// Dev rate: proportional to autoLocPerSec
			const devRate = hasDevs ? autoLocPerSec * 0.5 : 0;

			autoAccumRef.current += (autoTypeRate + devRate) * dt;

			const toAdd = Math.min(Math.floor(autoAccumRef.current), 20);
			if (toAdd > 0) {
				autoAccumRef.current -= toAdd;
				// Batch all tokens into a single advanceTokens call
				advanceTokens(toAdd * locPerKey);
			}

			rafId = requestAnimationFrame(autoLoop);
		}

		rafId = requestAnimationFrame(autoLoop);
		return () => cancelAnimationFrame(rafId);
	}, [autoLocPerSec, autoTypeEnabled, locPerKey, advanceTokens]);
}
