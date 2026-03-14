import { useEffect, useRef } from "react";
import { useGameStore } from "../store/game-store";

export function useGameLoop() {
	const tick = useGameStore((s) => s.tick);
	const lastTickRef = useRef(performance.now());

	useEffect(() => {
		let rafId: number;

		function loop() {
			const now = performance.now();
			const dt = (now - lastTickRef.current) / 1000;
			lastTickRef.current = now;
			tick(dt);
			rafId = requestAnimationFrame(loop);
		}

		rafId = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(rafId);
	}, [tick]);
}
