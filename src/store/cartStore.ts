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

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  loading: false,
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.GUEST_CART);
      if (raw) {
        const cart = JSON.parse(raw) as ShoppingCart;
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
      const cart = await cartService.getCart();
      set({ cart, loading: false });
      persist(cart);
    } catch {
      set({ loading: false });
    }
  },

  addItem: async item => {
    const cart = await cartService.addItem(item);
    set({ cart });
    persist(cart);
  },

  updateQty: async (itemId, qty) => {
    await cartService.updateQuantity(itemId, qty);
    await get().refresh();
  },

  removeItem: async itemId => {
    await cartService.removeItem(itemId);
    await get().refresh();
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
