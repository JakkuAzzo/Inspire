import { create } from 'zustand';
import type { InspireAnyPack, ModePack } from '../types';

interface PackState {
        currentPack: InspireAnyPack | null;
        savedPacks: InspireAnyPack[];
        remixHistory: ModePack[];
        combinedFocusIds: string[];
        setCurrentPack: (pack: InspireAnyPack | null) => void;
        setSavedPacks: (packs: InspireAnyPack[]) => void;
        addSavedPack: (pack: InspireAnyPack) => void;
        recordRemix: (pack: ModePack) => void;
        setCombinedFocusIds: (ids: string[] | ((prev: string[]) => string[])) => void;
}

export const usePackStore = create<PackState>((set) => ({
        currentPack: null,
        savedPacks: [],
        remixHistory: [],
        combinedFocusIds: [],
        setCurrentPack: (pack) => set({ currentPack: pack }),
        setSavedPacks: (packs) => set({ savedPacks: packs }),
        addSavedPack: (pack) =>
                set((state) => {
                        const exists = state.savedPacks.some((entry) => entry && (entry as any).id === (pack as any).id);
                        if (exists) return state;
                        return { savedPacks: [pack, ...state.savedPacks] };
                }),
        recordRemix: (pack) =>
                set((state) => ({
                        remixHistory: [pack, ...state.remixHistory].slice(0, 15),
                        currentPack: pack
                })),
        setCombinedFocusIds: (ids) =>
                set((state) => ({
                        combinedFocusIds: typeof ids === 'function' ? (ids as (prev: string[]) => string[])(state.combinedFocusIds) : ids
                }))
}));
