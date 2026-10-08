import { CFPaymentGatewayService, type CFErrorResponse } from 'react-native-cashfree-pg-sdk';
import { CFEnvironment, CFSession } from 'cashfree-pg-api-contract';

export type CashfreeSdkResult =
  | { outcome: 'returned'; orderId: string }
  | { outcome: 'error'; orderId: string; message: string; cancelled: boolean };

/**
 * Opens Cashfree's hosted checkout and resolves when the SDK hands control
 * back. The SDK is callback-based; this wraps it in a promise so the checkout
 * screen can `await` it like the Razorpay call.
 *
 * IMPORTANT: "returned" does NOT mean paid - the SDK only says the customer
 * came back. The caller must ask OUR server (/shop/cashfree/verify), which
 * re-checks the order with Cashfree, before treating the order as placed.
 */
export function openCashfreeCheckout(params: {
  paymentSessionId: string;
  orderId: string;
  mode: 'sandbox' | 'production';
}): Promise<CashfreeSdkResult> {
  return new Promise(resolve => {
    let settled = false;
    const finish = (r: CashfreeSdkResult) => {
      if (settled) return;
      settled = true;
      try {
        CFPaymentGatewayService.removeCallback();
      } catch {
        /* ignore */
      }
      resolve(r);
    };

    try {
      CFPaymentGatewayService.setCallback({
        onVerify(orderID: string) {
          finish({ outcome: 'returned', orderId: orderID || params.orderId });
        },
        onError(error: CFErrorResponse, orderID: string) {
          const message = (error && error.getMessage && error.getMessage()) || 'Payment was not completed';
          const code = (error && error.getCode && error.getCode()) || '';
          const cancelled = /cancel/i.test(`${code} ${message}`);
          finish({ outcome: 'error', orderId: orderID || params.orderId, message, cancelled });
        },
      });

      const session = new CFSession(
        params.paymentSessionId,
        params.orderId,
        params.mode === 'production' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
      );
      CFPaymentGatewayService.doWebPayment(session);
    } catch (e: any) {
      finish({
        outcome: 'error',
        orderId: params.orderId,
        message: e?.message || 'Could not open the payment screen',
        cancelled: false,
      });
    }
  });
}
