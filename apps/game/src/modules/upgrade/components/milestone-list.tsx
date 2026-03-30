import { css } from "@emotion/react";
import { allMilestones, useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useTranslation } from "react-i18next";

const milestoneStyle = css({
	padding: "10px 12px",
	marginBottom: 6,
	borderRadius: 4,
	fontSize: 12,
	background: "#161b22",
	borderLeft: "3px solid #1e2630",
});

const reachedStyle = css({
	borderLeftColor: "#3fb950",
});

const nameStyle = css({
	color: "#6272a4",
	fontWeight: "bold",
	marginBottom: 2,
});

const reachedNameStyle = css({
	color: "#3fb950",
});

const descStyle = css({
	color: "#484f58",
	fontSize: 11,
});

export function MilestoneList() {
	const { t } = useTranslation();
	const { t: tMilestones } = useTranslation("milestones");
	const reachedMilestones = useGameStore((s) => s.reachedMilestones);

	return (
		<div>
			{allMilestones.map((m) => {
				const reached = reachedMilestones.includes(m.id);
				return (
					<div key={m.id} css={[milestoneStyle, reached && reachedStyle]}>
						<div css={[nameStyle, reached && reachedNameStyle]}>
							{reached ? t("milestones.reached_prefix") : ""}
							{tMilestones(`${m.id}.name`)} — {formatNumber(m.threshold)}
						</div>
						<div css={descStyle}>
							{reached
								? tMilestones(`${m.id}.description`)
								: t("milestones.unknown")}
						</div>
					</div>
				);
			})}
		</div>
	);
}
