import React from 'react';
import { PolicyLayout } from '../../components/layout/PolicyLayout';

export const PrivacyScreen: React.FC = () => (
  <PolicyLayout
    title="Privacy Policy"
    effectiveDate="1 April 2026"
    intro="Rythu Bidda respects your privacy. This policy explains what information we collect, how we use it, and the choices available to you."
    sections={[
      {
        heading: '1. Information We Collect',
        bullets: [
          'Account information: name, mobile number, email (optional) and password.',
          'Address information: delivery and billing addresses you save.',
          'Order information: products, quantities, payment mode and order status.',
          'Device information: device model, operating system, crash logs and diagnostics (non-identifying).',
        ],
      },
      {
        heading: '2. How We Use Your Information',
        bullets: [
          'Process and deliver your orders and invoices.',
          'Send OTP and transactional SMS related to your account and orders.',
          'Provide customer support when you contact us.',
          'Improve the app, troubleshoot issues and prevent fraud.',
          'Comply with legal obligations.',
        ],
      },
      {
        heading: '3. Sharing With Third Parties',
        paragraphs: [
          'We do not sell your personal information. We share data only with trusted service providers that help us run the service:',
        ],
        bullets: [
          'Razorpay — to process payments.',
          'MSG91 — to send OTP and order SMS.',
          'Delivery partners — to fulfil your orders (name, address, phone).',
          'Analytics & crash-reporting tools — in aggregated, anonymised form.',
        ],
      },
      {
        heading: '4. Data Storage & Security',
        paragraphs: [
          'Your authentication token is stored in the device\u2019s secure hardware (Keychain on iOS, Keystore on Android). We apply industry-standard safeguards to protect personal data on our servers.',
        ],
      },
      {
        heading: '5. Your Rights',
        bullets: [
          'Access and update your profile and addresses from the Profile tab.',
          'Request deletion of your account by emailing admin@RythuBidda.com.',
          'Opt out of non-essential communications at any time.',
        ],
      },
      {
        heading: '6. Children',
        paragraphs: [
          'Rythu Bidda is not intended for use by anyone under 18. We do not knowingly collect personal information from children.',
        ],
      },
      {
        heading: '7. Changes to This Policy',
        paragraphs: [
          'We may update this Privacy Policy from time to time. Material changes will be notified within the app.',
        ],
      },
      {
        heading: '8. Contact',
        paragraphs: [
          'For privacy enquiries, write to us at admin@RythuBidda.com.',
        ],
      },
    ]}
  />
);
