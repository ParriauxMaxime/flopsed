import { css } from "@emotion/react";
import { useCallback, useRef } from "react";
import { useIdeTheme } from "../hooks/use-ide-theme";

const horizontalCss = css({
	width: 4,
	flexShrink: 0,
	cursor: "col-resize",
	position: "relative",
	zIndex: 3,
	"&::after": {
		content: '""',
		position: "absolute",
		top: 0,
		bottom: 0,
		left: -2,
		right: -2,
	},
	"&:hover, &:active": {
		"& > div": { opacity: 1 },
	},
});

const verticalCss = css({
	height: 4,
	flexShrink: 0,
	cursor: "row-resize",
	position: "relative",
	zIndex: 3,
	"&::after": {
		content: '""',
		position: "absolute",
		left: 0,
		right: 0,
		top: -2,
		bottom: -2,
	},
	"&:hover, &:active": {
		"& > div": { opacity: 1 },
	},
});

interface ResizeHandleProps {
	onResize: (delta: number) => void;
	vertical?: boolean;
}

export function ResizeHandle({ onResize, vertical }: ResizeHandleProps) {
	const theme = useIdeTheme();
	const startRef = useRef(0);
	const onResizeRef = useRef(onResize);
	onResizeRef.current = onResize;

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			startRef.current = vertical ? e.clientY : e.clientX;

			const handleMouseMove = (ev: MouseEvent) => {
				const pos = vertical ? ev.clientY : ev.clientX;
				const delta = pos - startRef.current;
				startRef.current = pos;
				onResizeRef.current(delta);
			};

			const handleMouseUp = () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			};

			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
			document.body.style.cursor = vertical ? "row-resize" : "col-resize";
			document.body.style.userSelect = "none";
		},
		[vertical],
	);

	return (
		<div
			css={vertical ? verticalCss : horizontalCss}
			style={{ background: theme.border }}
			onMouseDown={handleMouseDown}
		>
			<div
				css={{
					position: "absolute",
					top: 0,
					bottom: 0,
					left: 0,
					right: 0,
					opacity: 0,
					transition: "opacity 0.15s",
				}}
				style={{ background: theme.accent }}
			/>
		</div>
	);
}
