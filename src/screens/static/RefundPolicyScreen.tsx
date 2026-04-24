import React from 'react';
import { PolicyLayout } from '../../components/layout/PolicyLayout';

export const RefundPolicyScreen: React.FC = () => (
  <PolicyLayout
    title="Refund Policy"
    effectiveDate="1 April 2026"
    intro="We want you to love every product you receive from Rythu Bidda. If something isn\u2019t right, here\u2019s how we handle returns and refunds."
    sections={[
      {
        heading: '1. Eligibility',
        paragraphs: [
          'Because most of our products are perishable agricultural goods, returns are accepted only for the reasons below and only if reported within the specified timeframe.',
        ],
        bullets: [
          'Items were damaged or spoilt at the time of delivery.',
          'The wrong item or quantity was delivered.',
          'Item is expired or sealed packaging is broken.',
          'Raise the concern within 24 hours of delivery.',
        ],
      },
      {
        heading: '2. How to Raise a Refund Request',
        bullets: [
          'Open the Orders tab in the app and tap the affected order.',
          'Take clear photos of the product and packaging as received.',
          'Email us at admin@RythuBidda.com with your order number and photos.',
        ],
      },
      {
        heading: '3. Refund Process',
        paragraphs: [
          'Once we receive your request and verify it, we will process a refund to your original payment method within 5\u20137 business days. Depending on your bank, it may take an additional 2\u20134 days for the amount to reflect in your account.',
        ],
        bullets: [
          'Razorpay (UPI/Card/Wallet): refund goes to the same source.',
          'Pay-after-Delivery orders: refund credited as store credit or bank transfer on request.',
        ],
      },
      {
        heading: '4. Non-Refundable Items',
        bullets: [
          'Opened consumable products that are not spoilt.',
          'Products returned without the original packaging.',
          'Orders cancelled after dispatch and shipping charges already incurred.',
        ],
      },
      {
        heading: '5. Order Cancellations',
        paragraphs: [
          'You may cancel an order directly from the Orders tab while it is still in Pending or Processing state. Once the order is packed or dispatched, it can no longer be cancelled from the app \u2014 please contact support for assistance.',
        ],
      },
      {
        heading: '6. Questions?',
        paragraphs: [
          'For anything not covered above, reach out to admin@RythuBidda.com and we will do our best to help.',
        ],
      },
    ]}
  />
);
