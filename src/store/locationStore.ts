import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storage';

/**
 * Persistent delivery-location state.
 *
 * Used by:
 *  • <DeliverToPill /> in the home header — shows the saved pincode.
 *  • CheckoutScreen — pre-selects an address matching the saved pincode.
 *  • AddEditAddressScreen "Use current location" — writes here on tap.
 *
 * Backed by AsyncStorage so the user's last choice survives app restarts.
 * Pincode is later validated against the existing
 * /api/v1/shop/pincode/validate endpoint.
 */

export interface DeliveryLocation {
  pincode: string;
  city?: string;
  state?: string;
  area?: string;
  road?: string;
  formatted?: string;
  latitude?: number;
  longitude?: number;
  /** How we got this location, for analytics + UI hints. */
  source: 'gps' | 'manual' | 'saved-address' | 'autocomplete';
  /** Last-validated serviceability flag from /pincode/validate. */
  isServiceable?: boolean;
  /** ISO timestamp; used to expire stale fixes if needed. */
  capturedAt: string;
}

const RECENT_LIMIT = 5;

interface LocationState {
  location: DeliveryLocation | null;
  recents: DeliveryLocation[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLocation: (loc: DeliveryLocation) => Promise<void>;
  clear: () => Promise<void>;
}

async function persist(loc: DeliveryLocation | null): Promise<void> {
  try {
    if (loc) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.DELIVERY_LOCATION,
        JSON.stringify(loc),
      );
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.DELIVERY_LOCATION);
    }
  } catch {
    // best-effort
  }
}

async function persistRecents(list: DeliveryLocation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.RECENT_LOCATIONS,
      JSON.stringify(list),
    );
  } catch {
    // best-effort
  }
}

/**
 * Push a location to the front of the recents list, dedupe by pincode,
 * cap at RECENT_LIMIT. Mirrors the way Zepto / Swiggy keep "recently used".
 */
function nextRecents(
  current: DeliveryLocation[],
  loc: DeliveryLocation,
): DeliveryLocation[] {
  const filtered = current.filter(r => r.pincode !== loc.pincode);
  return [loc, ...filtered].slice(0, RECENT_LIMIT);
}

export const useLocationStore = create<LocationState>((set, get) => ({
  location: null,
  recents: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const [rawLoc, rawRecents] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DELIVERY_LOCATION),
        AsyncStorage.getItem(STORAGE_KEYS.RECENT_LOCATIONS),
      ]);
      let location: DeliveryLocation | null = null;
      let recents: DeliveryLocation[] = [];
      if (rawLoc) {
        const parsed = JSON.parse(rawLoc) as DeliveryLocation;
        if (parsed?.pincode) location = parsed;
      }
      if (rawRecents) {
        const parsed = JSON.parse(rawRecents);
        if (Array.isArray(parsed)) recents = parsed.filter(r => r?.pincode);
      }
      set({ location, recents });
    } catch {
      // ignore — start with empty state
    } finally {
      set({ hydrated: true });
    }
  },

  setLocation: async loc => {
    const recents = nextRecents(get().recents, loc);
    set({ location: loc, recents });
    await Promise.all([persist(loc), persistRecents(recents)]);
  },

  clear: async () => {
    set({ location: null });
    await persist(null);
  },
}));

/** Convenience hook used by the home pill to render the short label. */
export const useDeliveryPincode = () =>
  useLocationStore(s => s.location?.pincode);
