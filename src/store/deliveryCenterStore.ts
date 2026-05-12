import { create } from 'zustand';
import { shippingService } from '../api/services';
import type { ShippingConfig } from '../types';

/**
 * Holds the list of active delivery centers + global shipping defaults
 * fetched from the backend. Hydrated once on app launch (SplashScreen);
 * every screen that needs shipping math reads from here, NOT from the
 * hardcoded `src/constants/shipping.ts` fallback.
 *
 * Falls back to a sensible default if the fetch fails (offline, server
 * down) so checkout still works in degraded mode using the single
 * legacy store. That fallback should rarely fire in practice.
 */
interface DeliveryCenterState {
  config: ShippingConfig | null;
  hydrated: boolean;
  loading: boolean;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useDeliveryCenterStore = create<DeliveryCenterState>(
  (set, get) => ({
    config: null,
    hydrated: false,
    loading: false,

    hydrate: async () => {
      // Only fetch once per session — refresh() is the manual override.
      if (get().hydrated || get().loading) return;
      set({ loading: true });
      try {
        const config = await shippingService.config();
        set({ config, hydrated: true });
      } catch {
        // Mark as hydrated even on failure so we don't retry every
        // navigation. Callers must handle a null `config` by falling back
        // to the hardcoded SHIPPING_CONFIG.
        set({ hydrated: true });
      } finally {
        set({ loading: false });
      }
    },

    refresh: async () => {
      set({ loading: true });
      try {
        const config = await shippingService.config();
        set({ config, hydrated: true });
      } catch {
        // keep previous config on failure
      } finally {
        set({ loading: false });
      }
    },
  }),
);

/** Convenience hook: returns the centers array or empty list. */
export const useDeliveryCenters = () =>
  useDeliveryCenterStore(s => s.config?.centers ?? []);
