import type { RefObject } from "react";
import { useEffect } from "react";

export function useEditorFocus(ref: RefObject<HTMLElement | null>) {
	useEffect(() => {
		ref.current?.focus();

		function handleClick(e: MouseEvent) {
			const target = e.target as HTMLElement;
			if (!target.closest("[data-sidebar]")) {
				ref.current?.focus();
			}
		}

		document.addEventListener("click", handleClick);
		return () => document.removeEventListener("click", handleClick);
	}, [ref]);
}
