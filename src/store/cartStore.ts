import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cartService } from '../api/services';
import { STORAGE_KEYS } from '../constants/storage';
import type { ShoppingCart, ShoppingItem } from '../types';

interface CartState {
  cart: ShoppingCart | null;
  loading: boolean;
  hydrated: boolean;

  /** Load cached cart from AsyncStorage. Call once on app start. */
  hydrate: () => Promise<void>;
  /** Pull latest cart from backend (authenticated users). */
  refresh: () => Promise<void>;
  addItem: (item: Partial<ShoppingItem>) => Promise<void>;
  updateQty: (itemId: number | string, qty: number) => Promise<void>;
  removeItem: (itemId: number | string) => Promise<void>;
  clear: () => Promise<void>;
  reset: () => void;
}

async function persist(cart: ShoppingCart | null) {
  try {
    if (cart) {
      await AsyncStorage.setItem(STORAGE_KEYS.GUEST_CART, JSON.stringify(cart));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.GUEST_CART);
    }
  } catch {
    // swallow — persistence is best-effort
  }
}

/**
 * Map the backend's `ShoppingItem` DTO field names to the UI's
 * expected shape.
 *
 * Specifically: the backend exposes the variant string as `qtyOption`
 * (see ShoppingItem.java line 18) — e.g. "100gms", "1kg", "250ml".
 * Every screen in the app reads `qtyOptionLabel`. Without aliasing the
 * field here, the variant silently disappears between cart add and
 * cart render — that's the "cart doesn't show 100gms" bug testers
 * reported.
 *
 * Applies to every code path that brings a cart into the store
 * (addItem, refresh, hydrate) so the UI's existing reads work
 * unchanged.
 */
function normalizeCart(cart: ShoppingCart | null): ShoppingCart | null {
  if (!cart) return cart;
  const items = Array.isArray(cart.items)
    ? cart.items.map(it => {
        if (!it) return it;
        const raw = it as ShoppingItem & { qtyOption?: string };
        return {
          ...raw,
          qtyOptionLabel: raw.qtyOptionLabel ?? raw.qtyOption ?? undefined,
        } as ShoppingItem;
      })
    : cart.items;
  return { ...cart, items } as ShoppingCart;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  loading: false,
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.GUEST_CART);
      if (raw) {
        const cart = normalizeCart(JSON.parse(raw) as ShoppingCart);
        set({ cart });
      }
    } catch {
      // ignore — stale cache is non-fatal
    } finally {
      set({ hydrated: true });
    }
  },

  refresh: async () => {
    set({ loading: true });
    try {
      const cart = normalizeCart(await cartService.getCart());
      set({ cart, loading: false });
      persist(cart);
    } catch {
      set({ loading: false });
    }
  },

  addItem: async item => {
    const cart = normalizeCart(await cartService.addItem(item));
    set({ cart });
    persist(cart);
  },

  updateQty: async (itemId, qty) => {
    await cartService.updateQuantity(itemId, qty);
    await get().refresh();
  },

  removeItem: async itemId => {
    // Optimistic remove — testers reported that tapping delete felt
    // like a 5–10 min freeze on slow networks. The old flow was
    // `await delete` THEN `await refresh`: two sequential network
    // round-trips before the UI updated, so the item visibly sat
    // there until both returned. Now we drop the item from local
    // state IMMEDIATELY, persist the snapshot, then sync with the
    // backend in the background. On API failure we revert and surface
    // an error so the caller can toast.
    const prev = get().cart;
    if (prev && Array.isArray(prev.items)) {
      const targetId = String(itemId);
      const remaining = prev.items.filter(i => {
        const ids = [
          (i as any).itemId,
          (i as any).cartItemId,
          (i as any).id,
        ].map(v => (v == null ? '' : String(v)));
        return !ids.includes(targetId);
      });
      // Recompute subtotal so the bottom bar / checkout row reacts
      // instantly without a refresh round-trip.
      const newSubtotal = remaining.reduce(
        (s, i) => s + (i.price || 0) * (i.qty || 0),
        0,
      );
      const optimistic = {
        ...prev,
        items: remaining,
        subtotal: newSubtotal,
      } as ShoppingCart;
      set({ cart: optimistic });
      persist(optimistic);
    }
    try {
      await cartService.removeItem(itemId);
      // Quietly reconcile with server in the background. We don't
      // await visibility — UI is already updated. If the refresh
      // brings back the item (rare), the user sees it re-appear,
      // which is correct.
      get().refresh();
    } catch (e) {
      // Revert on failure so the cart returns to its real state and
      // the caller's catch block can toast.
      set({ cart: prev });
      persist(prev);
      throw e;
    }
  },

  clear: async () => {
    const cartId = get().cart?.cartId;
    if (cartId) {
      try {
        await cartService.clearCart(cartId);
      } catch {
        // ignore
      }
    }
    set({ cart: null });
    persist(null);
  },

  reset: () => {
    set({ cart: null, loading: false });
    persist(null);
  },
}));

export const useCartItemCount = () =>
  useCartStore(
    s => s.cart?.items?.reduce((sum, i) => sum + (i.qty || 0), 0) || 0,
  );

/**
 * Returns the cart line matching a specific product + qty-option.
 * Used by product cards to reflect the currently-in-cart quantity.
 */
export const useCartLineFor = (
  productId?: number | string,
  qtyOptionId?: number | string,
) =>
  useCartStore(s =>
    s.cart?.items?.find(
      i =>
        productIdEquals(i.productId, productId) &&
        qtyOptionEquals(i.qtyOptionId, qtyOptionId),
    ),
  );

function productIdEquals(a: any, b: any) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function qtyOptionEquals(a: any, b: any) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return String(a) === String(b);
}
