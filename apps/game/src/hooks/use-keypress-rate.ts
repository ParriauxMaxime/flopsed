import { useEffect, useRef, useState } from "react";

const IGNORED_KEYS = new Set([
	"Shift",
	"Control",
	"Alt",
	"Meta",
	"Tab",
	"Escape",
	"CapsLock",
]);
const IDLE_TIMEOUT = 3000;
const REPEAT_WINDOW = 1000; // measure repeat rate over last 1s

export function useKeypressRate(): number {
	const pressTimestamps = useRef<number[]>([]);
	const repeatTimestamps = useRef<number[]>([]);
	const heldRef = useRef(false);
	const lastKeyTime = useRef(0);
	const [rate, setRate] = useState(0);

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (IGNORED_KEYS.has(e.key)) return;
			lastKeyTime.current = performance.now();
			if (e.repeat) {
				heldRef.current = true;
				repeatTimestamps.current.push(performance.now());
			} else {
				heldRef.current = false;
				pressTimestamps.current.push(performance.now());
			}
		}
		function onKeyUp() {
			heldRef.current = false;
			repeatTimestamps.current.length = 0;
		}

		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);

		const id = setInterval(() => {
			const now = performance.now();
			if (now - lastKeyTime.current > IDLE_TIMEOUT) {
				pressTimestamps.current.length = 0;
				repeatTimestamps.current.length = 0;
				setRate(0);
			} else if (heldRef.current) {
				// Measure actual OS repeat rate from recent events
				const cutoff = now - REPEAT_WINDOW;
				const rts = repeatTimestamps.current;
				while (rts.length > 0 && rts[0] < cutoff) rts.shift();
				setRate(rts.length);
			} else {
				const cutoff = now - IDLE_TIMEOUT;
				const ts = pressTimestamps.current;
				while (ts.length > 0 && ts[0] < cutoff) ts.shift();
				setRate(ts.length / 3);
			}
		}, 500);

		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
			clearInterval(id);
		};
	}, []);

	return rate;
}
