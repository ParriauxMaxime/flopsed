import { useEffect, useRef, useState } from "react";

const SAMPLES = 3;

export function useRatePerSec(value: number): number {
	const valueRef = useRef(value);
	valueRef.current = value;
	const historyRef = useRef<number[]>([]);
	const [rate, setRate] = useState(0);

	useEffect(() => {
		let prev = valueRef.current;
		const id = setInterval(() => {
			const delta = Math.max(0, valueRef.current - prev);
			prev = valueRef.current;
			const history = historyRef.current;
			history.push(delta);
			if (history.length > SAMPLES) history.shift();
			const avg = history.reduce((a, b) => a + b, 0) / history.length;
			setRate(avg);
		}, 1000);
		return () => clearInterval(id);
	}, []);

	return rate;
}
