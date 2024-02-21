import { create } from "zustand";

type PageTransitionState = {
  inPageTransition: boolean;
  startTransition: () => void;
  endTransition: () => void;
};

export const usePageTransitionStore = create<PageTransitionState>((set) => ({
  inPageTransition: false,
  startTransition: () => set({ inPageTransition: true }),
  endTransition: () => set({ inPageTransition: false }),
}));
