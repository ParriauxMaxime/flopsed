import { css, keyframes } from "@emotion/react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useIdeTheme } from "../hooks/use-ide-theme";
import { useTouchDevice } from "../hooks/use-touch-device";

const SESSION_KEY = "flopsed-rotate-dismissed";

const fadeIn = keyframes({
	from: { opacity: 0 },
	to: { opacity: 1 },
});

const overlayCss = css({
	position: "fixed",
	inset: 0,
	zIndex: 9999,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	gap: 16,
	padding: 32,
	cursor: "pointer",
	animation: `${fadeIn} 0.3s ease-out`,
	textAlign: "center",
});

const iconCss = css({
	fontSize: 48,
	lineHeight: 1,
});

const messageCss = css({
	fontSize: 16,
	fontWeight: 500,
	lineHeight: 1.4,
	maxWidth: 280,
});

const hintCss = css({
	fontSize: 12,
	opacity: 0.6,
	marginTop: 4,
});

export function RotateNudge() {
	const isTouch = useTouchDevice();
	const { t } = useTranslation("ui");
	const theme = useIdeTheme();
	const [portrait, setPortrait] = useState(false);
	const [dismissed, setDismissed] = useState(
		() => sessionStorage.getItem(SESSION_KEY) === "1",
	);

	useEffect(() => {
		const mql = window.matchMedia("(orientation: portrait)");
		setPortrait(mql.matches);
		const handler = (e: MediaQueryListEvent) => setPortrait(e.matches);
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, []);

	const dismiss = useCallback(() => {
		setDismissed(true);
		sessionStorage.setItem(SESSION_KEY, "1");
	}, []);

	if (!isTouch || !portrait || dismissed) return null;

	return (
		<div
			css={overlayCss}
			style={{
				background: theme.background,
				color: theme.foreground,
			}}
			onClick={dismiss}
			onKeyDown={undefined}
		>
			<div css={iconCss}>📱↔️</div>
			<div css={messageCss}>{t("mobile.rotate_device")}</div>
			<div css={hintCss} style={{ color: theme.textMuted }}>
				{t("mobile.tap_to_dismiss", {
					defaultValue: "Tap anywhere to continue",
				})}
			</div>
		</div>
	);
}
