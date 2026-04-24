import React from 'react';
import { PolicyLayout } from '../../components/layout/PolicyLayout';

export const ShippingPolicyScreen: React.FC = () => (
  <PolicyLayout
    title="Shipping Policy"
    effectiveDate="1 April 2026"
    intro="We deliver across India through our logistics partners. Here\u2019s everything you need to know about when and how your order will reach you."
    sections={[
      {
        heading: '1. Delivery Coverage',
        paragraphs: [
          'We currently ship to serviceable pincodes across most of India. To confirm whether we deliver to your area, enter your pincode on the checkout screen \u2014 we\u2019ll validate it in real time.',
        ],
      },
      {
        heading: '2. Delivery Timelines',
        bullets: [
          'Metro cities: 2\u20134 business days from order confirmation.',
          'Tier-2 cities and towns: 4\u20137 business days.',
          'Remote areas: up to 10 business days.',
          'Delivery timelines are estimates and may be impacted by weather, strikes or local holidays.',
        ],
      },
      {
        heading: '3. Shipping Charges',
        bullets: [
          'Free delivery on orders of \u20b91,000 or more (before taxes).',
          'For orders below \u20b91,000, a flat shipping fee is calculated at checkout based on weight and destination.',
          'Exact shipping cost is always shown before you complete payment.',
        ],
      },
      {
        heading: '4. Order Tracking',
        paragraphs: [
          'Once dispatched, your order status is updated inside the Orders tab. You will also receive an SMS with tracking information when available.',
        ],
      },
      {
        heading: '5. Packaging',
        paragraphs: [
          'Perishable and fragile items are carefully packed to preserve freshness and prevent damage during transit. We use recyclable, food-safe materials wherever possible.',
        ],
      },
      {
        heading: '6. Missed or Failed Deliveries',
        bullets: [
          'Please ensure someone is available at the delivery address on the promised day.',
          'Our partner will attempt delivery up to two times. If both attempts fail, the order may be returned to the origin.',
          'Shipping charges for re-dispatch after a failed delivery may apply.',
        ],
      },
      {
        heading: '7. Need Help?',
        paragraphs: [
          'For urgent delivery queries, contact us at admin@RythuBidda.com with your order number.',
        ],
      },
    ]}
  />
);
