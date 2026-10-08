import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { homeContentService } from '../api/services';
import { APP_CONFIG } from '../constants/config';

/** Deal variants ride on the cart line as qtyOptionId = 1_000_000 + variant id. */
const DEAL_VARIANT_OPTION_BASE = 1_000_000;

/**
 * Per-line purchase cap.
 *
 * A normal product line is capped at the store-wide limit
 * (APP_CONFIG.MAX_CART_ITEM_QTY = 10). A Today's Deal line uses the deal's
 * own "max per customer" instead - a deal that allows 24 must let the
 * customer reach 24, not stop at 10.
 *
 * Returns `maxQtyFor(qtyOptionId)`. Falls back to the store limit whenever
 * the deals are not loaded or the line is not a deal line, so a network
 * failure can never raise a cap.
 */
export function useDealLimits() {
  const { data } = useQuery({
    queryKey: ['deal-limits'],
    queryFn: homeContentService.getLiveDeals,
    staleTime: 60_000,
  });

  const limits = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of data ?? []) {
      // A deal may set a LOWER limit than the store-wide 10, never a higher one.
      const cap = Math.min(
        APP_CONFIG.MAX_CART_ITEM_QTY,
        d.maxQtyPerCustomer > 0 ? d.maxQtyPerCustomer : 1,
      );
      for (const v of d.variants ?? []) {
        map[String(DEAL_VARIANT_OPTION_BASE + v.id)] = cap;
      }
      if (d.qtyOptionId) map[String(d.qtyOptionId)] = cap;
    }
    return map;
  }, [data]);

  const maxQtyFor = useCallback(
    (qtyOptionId?: string | number | null): number => {
      if (qtyOptionId == null || qtyOptionId === '') return APP_CONFIG.MAX_CART_ITEM_QTY;
      return limits[String(qtyOptionId)] ?? APP_CONFIG.MAX_CART_ITEM_QTY;
    },
    [limits],
  );

  return { maxQtyFor };
}
