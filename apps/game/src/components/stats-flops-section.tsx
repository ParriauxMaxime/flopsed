import { useGameStore } from "@modules/game";
import { formatNumber } from "@utils/format";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useIdeTheme } from "../hooks/use-ide-theme";
import { CollapsibleSection } from "./collapsible-section";
import { RollingNumber } from "./rolling-number";
import { Sparkline } from "./sparkline";

export function StatsFlopsSection() {
	const { t } = useTranslation();
	const theme = useIdeTheme();
	const flops = useGameStore((s) => s.flops);
	const graphsUnlocked = useGameStore(
		(s) => (s.ownedTechNodes.unlock_perf_graphs ?? 0) > 0,
	);
	const rateSnapshots = useGameStore((s) => s.rateSnapshots);
	const tierTransitions = useGameStore((s) => s.tierTransitions);
	const sessionStartTime = useGameStore((s) => s.sessionStartTime);

	const elapsed = (performance.now() - sessionStartTime) / 1000;

	const flopUtilData = useMemo(
		() => rateSnapshots.map((s) => s.flopUtilization * 100),
		[rateSnapshots],
	);
	const latest = rateSnapshots[rateSnapshots.length - 1];

	return (
		<CollapsibleSection
			icon={<span style={{ color: theme.flopsColor }}>⚡</span>}
			label={t("stats_panel.flops")}
			value={
				<RollingNumber value={formatNumber(flops)} color={theme.flopsColor} />
			}
			collapsible={graphsUnlocked}
			defaultOpen={false}
		>
			{/* Utilization sparkline */}
			{latest && (
				<div>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							fontSize: 10,
							color: theme.textMuted,
							marginBottom: 4,
						}}
					>
						<span>{t("stats_panel.utilization")}</span>
						<span style={{ color: theme.flopsColor }}>
							{Math.round(latest.flopUtilization * 100)}%
						</span>
					</div>
					<Sparkline
						data={flopUtilData}
						color={theme.flopsColor ?? "#c678dd"}
						tierTransitions={tierTransitions}
						totalTime={elapsed}
					/>
				</div>
			)}
		</CollapsibleSection>
	);
}
