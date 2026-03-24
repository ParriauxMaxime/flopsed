import type { RefObject } from "react";
import { useEffect } from "react";

const IGNORED_KEYS = new Set([
	"Shift",
	"Control",
	"Alt",
	"Meta",
	"Tab",
	"Escape",
	"CapsLock",
]);

export function useKeyboardInput(
	ref: RefObject<HTMLElement | null>,
	onKeystroke: () => void,
) {
	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		function handleKeyDown(e: KeyboardEvent) {
			if (IGNORED_KEYS.has(e.key)) return;
			e.preventDefault();
			onKeystroke();
		}

		el.addEventListener("keydown", handleKeyDown);
		return () => el.removeEventListener("keydown", handleKeyDown);
	}, [ref, onKeystroke]);
}
