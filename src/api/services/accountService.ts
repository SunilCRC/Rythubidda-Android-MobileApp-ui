import { apiGet, apiPost, type ApiError } from '../client';
import { ENDPOINTS } from '../../constants/endpoints';

/** An order standing in the way of closing the account. */
export interface BlockingOrder {
  orderId: number;
  status: string;
  statusLabel: string;
  placedAt: string | null;
}

export interface AccountEligibility {
  canDeactivate: boolean;
  canDelete: boolean;
  blockingOrders: BlockingOrder[];
  /** Ready-to-show explanation; null when nothing is blocking. */
  reason: string | null;
  graceDays: number;
  /** Masked, e.g. "••••••3210". */
  phone: string;
}

export type AccountOtpPurpose = 'DEACTIVATE' | 'DELETE';
export type RecoveryPurpose = 'REACTIVATE' | 'DELETE';

/**
 * Account deactivation, deletion and restoration.
 *
 * The recovery pair runs without a token on purpose: a customer who has
 * deactivated cannot sign in, so the only way back has to be reachable
 * from the login screen.
 */
export const accountService = {
  getEligibility: () => apiGet<AccountEligibility>(ENDPOINTS.ACCOUNT_ELIGIBILITY),

  sendOtp: (purpose: AccountOtpPurpose) =>
    apiPost<{ otpSent: boolean; phone: string }>(ENDPOINTS.ACCOUNT_OTP, { purpose }),

  deactivate: (otp: string) =>
    apiPost<{ accountStatus: string }>(ENDPOINTS.ACCOUNT_DEACTIVATE, { otp }),

  requestDeletion: (otp: string) =>
    apiPost<{ accountStatus: string; graceDays: number }>(ENDPOINTS.ACCOUNT_DELETE, { otp }),

  sendRecoveryOtp: (phone: string, password: string, purpose: RecoveryPurpose) =>
    apiPost<{ otpSent: boolean; phone: string; accountStatus: string }>(
      ENDPOINTS.ACCOUNT_RECOVERY_OTP,
      { phone, password, purpose },
    ),

  confirmRecovery: (phone: string, otp: string, purpose: RecoveryPurpose) =>
    apiPost<{ accountStatus: string; graceDays?: number }>(
      ENDPOINTS.ACCOUNT_RECOVERY_CONFIRM,
      { phone, otp, purpose },
    ),
};

/**
 * Digs the blocking-order list out of a rejected request.
 *
 * A refusal to close the account is only useful if it says which order is
 * in the way, and that list rides in the error body rather than a success
 * response. The client normalises axios errors into ApiError with the raw
 * body on `.data`, so this unwraps one level further.
 */
export function blockingOrdersFromError(err: unknown): BlockingOrder[] {
  const body = (err as ApiError)?.data as
    | { data?: { blockingOrders?: BlockingOrder[] } }
    | undefined;
  return body?.data?.blockingOrders ?? [];
}

/** Login refusal reason, e.g. ACCOUNT_DEACTIVATED. */
export function errorCodeFrom(err: unknown): string | undefined {
  const body = (err as ApiError)?.data as { errorCode?: string } | undefined;
  return body?.errorCode;
}
