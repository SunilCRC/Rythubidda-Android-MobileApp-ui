import { create } from 'zustand';

/**
 * UI-only ephemeral state — things that need to be triggered from one
 * place in the tree and consumed somewhere else, without prop-drilling.
 *
 * Currently just the categories side-drawer: HomeScreen mounts it, but
 * the bottom-tab "Shop" button also needs to open it. A tiny global
 * store is the simplest bridge — no context boilerplate, no navigator
 * params, nothing to clean up. State is reset implicitly when the app
 * restarts.
 */
interface UIState {
  categoriesDrawerOpen: boolean;
  openCategoriesDrawer: () => void;
  closeCategoriesDrawer: () => void;
}

export const useUIStore = create<UIState>(set => ({
  categoriesDrawerOpen: false,
  openCategoriesDrawer: () => set({ categoriesDrawerOpen: true }),
  closeCategoriesDrawer: () => set({ categoriesDrawerOpen: false }),
}));
