import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AudioState {
	muted: boolean;
	musicVolume: number;
	sfxVolume: number;
}

interface AudioActions {
	toggleMute: () => void;
	setMusicVolume: (v: number) => void;
	setSfxVolume: (v: number) => void;
}

export const useAudioStore = create<AudioState & AudioActions>()(
	persist(
		(set) => ({
			muted: false,
			musicVolume: 50,
			sfxVolume: 70,

			toggleMute: () => set((s) => ({ muted: !s.muted })),
			setMusicVolume: (v: number) => set({ musicVolume: v }),
			setSfxVolume: (v: number) => set({ sfxVolume: v }),
		}),
		{ name: "flopsed-audio" },
	),
);
