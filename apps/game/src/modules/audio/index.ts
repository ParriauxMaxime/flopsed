export { useAudioStore } from "./audio-store";
export {
	initMusic,
	isStarted as isMusicStarted,
	setMusicVolume,
	setTier,
	singularityBreakdown,
	startMusic,
	stopMusic,
} from "./music-engine";
export {
	playEvent,
	playExecute,
	playMilestone,
	playPurchase,
	playTierUnlock,
	playTyping,
	resumeCtx,
} from "./sfx-engine";
