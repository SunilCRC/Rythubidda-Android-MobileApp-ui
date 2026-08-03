import { apiGet } from '../client';
import { ENDPOINTS } from '../../constants/endpoints';
import type { ApprovedReview, TodaysDeal, TodaysFarmer } from '../../types';

export interface FirstOrderDiscount {
  eligible: boolean;
  code: string;
  /** Whole-number percent, e.g. 10. */
  discountPct: number;
}

/**
 * Home-page dynamic content — Today's Deal, Meet Today's Farmer and
 * the approved-reviews carousel. All three endpoints were built for
 * the web shop and are already live; the axios client unwraps the
 * `{success, message, data}` envelope, so `raw` here is the `data`
 * object.
 *
 * Every getter resolves to null / [] on missing content so the home
 * screen can simply hide the section — real data or nothing.
 */
export const homeContentService = {
  /**
   * The currently-live deal, or null (no deal / expired / already
   * used by THIS signed-in customer — the backend hides it per
   * customer when the JWT is attached, which the client does
   * automatically once logged in).
   */
  getCurrentDeal: async (): Promise<TodaysDeal | null> => {
    const raw = await apiGet<any>(ENDPOINTS.TODAYS_DEAL_CURRENT);
    const deal = raw && typeof raw === 'object' && 'deal' in raw ? raw.deal : raw;
    if (!deal || typeof deal !== 'object' || !deal.productId) return null;
    return {
      ...deal,
      variants: Array.isArray(deal.variants) ? deal.variants : [],
      maxQtyPerCustomer: deal.maxQtyPerCustomer ?? 1,
      remainingSeconds: deal.remainingSeconds ?? 0,
    } as TodaysDeal;
  },

  /** The farmer flagged as "today's" in admin, or null. */
  getTodaysFarmer: async (): Promise<TodaysFarmer | null> => {
    const raw = await apiGet<any>(ENDPOINTS.TODAYS_FARMER);
    const farmer =
      raw && typeof raw === 'object' && 'farmer' in raw ? raw.farmer : raw;
    if (!farmer || typeof farmer !== 'object' || !farmer.name) return null;
    return farmer as TodaysFarmer;
  },

  /** Full farmer detail (storyFull etc.) for the story page. */
  getFarmerDetail: async (id: number): Promise<TodaysFarmer | null> => {
    const raw = await apiGet<any>(ENDPOINTS.FARMER_DETAIL(id));
    const farmer =
      raw && typeof raw === 'object' && 'farmer' in raw ? raw.farmer : raw;
    if (!farmer || typeof farmer !== 'object' || !farmer.name) return null;
    return farmer as TodaysFarmer;
  },

  /** Admin-approved reviews (status = 1), newest first, capped server-side. */
  getApprovedReviews: async (): Promise<ApprovedReview[]> => {
    const raw = await apiGet<any>(ENDPOINTS.REVIEWS_APPROVED);
    const list =
      raw && typeof raw === 'object' && Array.isArray(raw.reviews)
        ? raw.reviews
        : Array.isArray(raw)
          ? raw
          : [];
    return list.filter(
      (r: any) => r && (String(r.review || '').trim() || String(r.title || '').trim()),
    );
  },

  /**
   * FIRST10 eligibility for the signed-in customer (JWT attached by
   * the client). The backend is authoritative — it applies the same
   * 10% when the order is actually created, so this is display-only.
   * Guests get `eligible: false` from the server ("Not logged in").
   */
  getFirstOrderDiscount: async (): Promise<FirstOrderDiscount> => {
    const raw = await apiGet<any>(ENDPOINTS.FIRST_ORDER_DISCOUNT);
    return {
      eligible: !!raw?.eligible,
      code: raw?.code || 'FIRST10',
      discountPct: Number(raw?.discountPct) || 10,
    };
  },
};
