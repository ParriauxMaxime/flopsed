import { css } from "@emotion/react";
import { useUiStore } from "@modules/game";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useIdeTheme } from "../hooks/use-ide-theme";

interface TargetRect {
	top: number;
	left: number;
	width: number;
	height: number;
}

const TOOLTIP_WIDTH = 280;
const TOOLTIP_FLIP_THRESHOLD = 148; // min px below target before flipping above

export function SpotlightOverlay() {
	const activeSpotlight = useUiStore((s) => s.activeSpotlight);
	const dismissSpotlight = useUiStore((s) => s.dismissSpotlight);
	const theme = useIdeTheme();
	const { t } = useTranslation("tutorial");
	const [rect, setRect] = useState<TargetRect | null>(null);
	const [flipped, setFlipped] = useState(false);
	const tooltipRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!activeSpotlight) {
			setRect(null);
			return;
		}

		const el = document.querySelector(
			`[data-spotlight="${activeSpotlight.targetId}"]`,
		);
		if (!el) {
			setRect(null);
			return;
		}

		const measure = () => {
			const r = el.getBoundingClientRect();
			const next = {
				top: r.top,
				left: r.left,
				width: r.width,
				height: r.height,
			};
			setRect(next);
			setFlipped(window.innerHeight - r.bottom < TOOLTIP_FLIP_THRESHOLD);
		};

		measure();

		const ro = new ResizeObserver(measure);
		ro.observe(el);
		window.addEventListener("resize", measure);

		return () => {
			ro.disconnect();
			window.removeEventListener("resize", measure);
		};
	}, [activeSpotlight]);

	if (!activeSpotlight || !rect) return null;

	const holeStyle: React.CSSProperties = {
		position: "fixed",
		top: rect.top,
		left: rect.left,
		width: rect.width,
		height: rect.height,
		boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
		borderRadius: 4,
		pointerEvents: "none",
		zIndex: 9998,
	};

	const clampedLeft = Math.max(
		8,
		Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH - 8),
	);
	const tooltipH = tooltipRef.current?.offsetHeight ?? 120;
	const tooltipTop = flipped
		? rect.top - tooltipH - 8
		: rect.top + rect.height + 8;

	const tooltipStyle: React.CSSProperties = {
		position: "fixed",
		top: tooltipTop,
		left: clampedLeft,
		width: TOOLTIP_WIDTH,
		background: theme.sidebarBg,
		border: `1px solid ${theme.accent}`,
		borderRadius: 6,
		padding: "10px 14px",
		zIndex: 9999,
		boxShadow: `0 4px 16px rgba(0,0,0,0.4)`,
		fontFamily: "inherit",
	};

	const arrowSize = 6;
	const arrowLeft = Math.max(
		arrowSize * 2,
		Math.min(
			rect.left + rect.width / 2 - clampedLeft - arrowSize,
			TOOLTIP_WIDTH - arrowSize * 4,
		),
	);

	const arrowStyle: React.CSSProperties = {
		position: "absolute",
		left: arrowLeft,
		width: 0,
		height: 0,
		...(flipped
			? {
					bottom: -arrowSize,
					borderLeft: `${arrowSize}px solid transparent`,
					borderRight: `${arrowSize}px solid transparent`,
					borderTop: `${arrowSize}px solid ${theme.accent}`,
				}
			: {
					top: -arrowSize,
					borderLeft: `${arrowSize}px solid transparent`,
					borderRight: `${arrowSize}px solid transparent`,
					borderBottom: `${arrowSize}px solid ${theme.accent}`,
				}),
	};

	return createPortal(
		<>
			{/* Click-through backdrop blocker (prevents interacting with game while spotlight is active) */}
			<div css={css({ position: "fixed", inset: 0, zIndex: 9997 })} />
			{/* Spotlight hole — box-shadow creates the dim effect */}
			<div style={holeStyle} />
			{/* Tooltip */}
			<div ref={tooltipRef} style={tooltipStyle}>
				<div style={arrowStyle} />
				<div
					css={css({
						fontWeight: 600,
						fontSize: 15,
						marginBottom: 8,
						lineHeight: 1.3,
					})}
					style={{ color: theme.accent }}
				>
					{t(activeSpotlight.titleKey)}
				</div>
				<div
					css={css({ fontSize: 13, lineHeight: 1.6, marginBottom: 12 })}
					style={{ color: theme.foreground }}
				>
					{t(activeSpotlight.bodyKey)}
				</div>
				<div css={css({ display: "flex", justifyContent: "flex-end" })}>
					<button
						type="button"
						onClick={dismissSpotlight}
						css={css({
							fontSize: 13,
							padding: "6px 16px",
							borderRadius: 4,
							cursor: "pointer",
							fontFamily: "inherit",
							fontWeight: 600,
							transition: "opacity 0.15s",
							"&:hover": { opacity: 0.85 },
						})}
						style={{
							background: theme.accent,
							border: `1px solid ${theme.accent}`,
							color: theme.background,
						}}
					>
						{t("spotlight_got_it", { defaultValue: "Got it →" })}
					</button>
				</div>
			</div>
		</>,
		document.body,
	);
}
