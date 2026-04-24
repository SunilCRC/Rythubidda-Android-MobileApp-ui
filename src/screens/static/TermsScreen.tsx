import React from 'react';
import { PolicyLayout } from '../../components/layout/PolicyLayout';

export const TermsScreen: React.FC = () => (
  <PolicyLayout
    title="Terms & Conditions"
    effectiveDate="1 April 2026"
    intro="By accessing or using the Rythu Bidda mobile application and services, you agree to be bound by these Terms & Conditions. Please read them carefully before placing an order."
    sections={[
      {
        heading: '1. Acceptance of Terms',
        paragraphs: [
          'By creating an account, browsing products, or placing an order on Rythu Bidda, you confirm that you are at least 18 years of age and legally capable of entering into a binding contract.',
          'We may update these terms from time to time. Continued use of the app after changes means you accept the updated terms.',
        ],
      },
      {
        heading: '2. Account & Security',
        paragraphs: [
          'You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.',
        ],
        bullets: [
          'Provide accurate, current and complete information during registration.',
          'Keep your password secure and do not share it with anyone.',
          'Notify us immediately if you suspect any unauthorized use of your account.',
        ],
      },
      {
        heading: '3. Products & Pricing',
        paragraphs: [
          'We strive to display accurate product descriptions, images and prices. However, errors can occur. Rythu Bidda reserves the right to correct inaccuracies and to cancel orders placed with incorrect pricing.',
          'All prices are listed in Indian Rupees (₹) and are inclusive of applicable taxes unless stated otherwise.',
        ],
      },
      {
        heading: '4. Orders & Payments',
        bullets: [
          'Orders are confirmed only after successful payment or acceptance under Pay-after-Delivery.',
          'We accept online payments via Razorpay (UPI, cards, wallets, netbanking).',
          'Rythu Bidda reserves the right to refuse or cancel orders at its discretion, including cases of suspected fraud or unavailability of stock.',
        ],
      },
      {
        heading: '5. Delivery',
        paragraphs: [
          'Delivery timelines are estimates and may vary based on your location and product availability. Please refer to our Shipping Policy for details.',
        ],
      },
      {
        heading: '6. User Conduct',
        bullets: [
          'Do not misuse the app or attempt to interfere with its normal operation.',
          'Do not post reviews or content that is abusive, misleading or infringes on others\u2019 rights.',
          'Do not resell products purchased via Rythu Bidda without our written consent.',
        ],
      },
      {
        heading: '7. Limitation of Liability',
        paragraphs: [
          'To the maximum extent permitted by law, Rythu Bidda shall not be liable for any indirect, incidental or consequential damages arising from your use of the app or services.',
        ],
      },
      {
        heading: '8. Governing Law',
        paragraphs: [
          'These terms shall be governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts at Hyderabad, Telangana.',
        ],
      },
      {
        heading: '9. Contact',
        paragraphs: [
          'For any questions about these Terms, reach out to us at admin@RythuBidda.com.',
        ],
      },
    ]}
  />
);
