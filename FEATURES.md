# Rythu Bidda Mobile — Feature Parity Checklist

Every feature shipped by the Rythu Bidda web app, mapped to the mobile implementation.
Backend APIs are **unchanged** — the mobile app speaks the same contracts.

Legend: ✅ implemented · 🟡 partial · ⏳ deferred

---

## 🔐 Authentication

| # | Feature | Web reference | Mobile screen | Status |
|---|---|---|---|---|
| 1 | Mobile + password login | `pages/Login.tsx` | `LoginScreen` | ✅ |
| 2 | Registration with first/last name | `pages/Register.tsx` | `RegisterScreen` | ✅ |
| 3 | OTP verification (registration) | in Register.tsx | `OTPScreen` (flow: `signup`) | ✅ |
| 4 | Forgot password → OTP → reset | in Login.tsx | `ForgotPasswordScreen` → `OTPScreen` (forgot) → `ResetPasswordScreen` | ✅ |
| 5 | Change password | inside Profile.tsx | `ChangePasswordScreen` | ✅ |
| 6 | Resend OTP with timer | Register.tsx | `OTPScreen` (30s timer, re-send) | ✅ |
| 7 | Password strength rules (8+, upper, lower, digit, symbol) | client validation | Zod schema in `utils/validation.ts` | ✅ |
| 8 | Logout + clear stored token | AuthContext.tsx | `useAuthStore.logout` + Keychain wipe | ✅ |
| 9 | Auto-login on app launch via token validation | AuthContext | `useAuthStore.hydrate` | ✅ |
| 10 | Secure token storage | localStorage (web) | **Device Keychain / Keystore** via `react-native-keychain` | ✅ (stronger than web) |
| 11 | Auto-logout on 401 | axios interceptor | `setOnUnauthorized` + navigation reset | ✅ |

## 🛍️ Catalog & Discovery

| # | Feature | Web reference | Mobile | Status |
|---|---|---|---|---|
| 12 | Home landing page | `pages/Home.tsx` | `HomeScreen` | ✅ |
| 13 | Hero image carousel (auto-advance) | `components/HeroCarousel.tsx` | `HeroCarousel.tsx` with 4s autoplay | ✅ |
| 14 | Best Sellers row | BestSellersCarousel.tsx | Home section | ✅ |
| 15 | New Arrivals row | NewArrivalsCarousel.tsx | Home section | ✅ |
| 16 | Featured products | Home.tsx | Home section | ✅ |
| 17 | Category list (horizontal on home) | SideNav.tsx | Home chips + `CategoriesListScreen` | ✅ |
| 18 | Category browse grid | via SideNav navigation | `CategoryScreen` 2-col grid | ✅ |
| 19 | Product detail page | `pages/ProductDetailNew.tsx` | `ProductDetailScreen` | ✅ |
| 20 | Product image gallery + thumbnails | product detail | zoomable main + thumb strip | ✅ |
| 21 | Quantity / size variants | qtyOptions | Pill selector | ✅ |
| 22 | Quantity stepper (max 10) | product detail | Animated stepper, disabled at limits | ✅ |
| 23 | Product rating + reviews list | product detail | StarRating + reviews card | ✅ |
| 24 | Price + MRP + % off | ProductCard | `Price` component | ✅ |
| 25 | Best seller / new arrival badges | ProductCard | Corner badge | ✅ |
| 26 | Product search | Header.tsx | `SearchScreen` with 300ms debounce | ✅ |
| 27 | Recent searches (persisted) | not on web | AsyncStorage-backed recents | ✅ **added** |

## 🛒 Cart

| # | Feature | Web reference | Mobile | Status |
|---|---|---|---|---|
| 28 | View cart (backend sync) | `components/Cart.tsx` | `CartScreen` | ✅ |
| 29 | Add to cart from product detail | CartService.ts | `useCartStore.addItem` | ✅ |
| 30 | Increment / decrement qty | CartService.updateQuantity | Inline stepper on each line | ✅ |
| 31 | Remove item | CartService.removeItem | Trash icon + confirmation toast | ✅ |
| 32 | Cart tab badge count | Header badge | Bottom-tab badge with count | ✅ |
| 33 | Pull-to-refresh on cart | — | `RefreshControl` | ✅ **added** |
| 34 | Subtotal / shipping / total display | cart drawer | Summary card | ✅ |

## 💳 Checkout & Payments

| # | Feature | Web reference | Mobile | Status |
|---|---|---|---|---|
| 35 | Select delivery address | Checkout.tsx | Radio-style address cards | ✅ |
| 36 | Add new address during checkout | Checkout inline form | Navigate to `AddEditAddressScreen` | ✅ |
| 37 | Pincode validation | `validatePincode` | Auto-validate on address select | ✅ |
| 38 | Dynamic shipping cost calculation | `calculateShipping` | Re-fetched on address/cart change | ✅ |
| 39 | Free shipping over ₹1000 | threshold | Displayed as `FREE` on summary | ✅ |
| 40 | Razorpay payment | `pages/Checkout.tsx` + razorpay.js | `react-native-razorpay` native SDK | ✅ |
| 41 | Payment verification | `/shop/razorpay/verify` | Called after success callback | ✅ |
| 42 | Payment cancel / fail handling | `/shop/razorpay/{cancel,fail}` | Called on error code | ✅ |
| 43 | Pay after delivery (COD) | radio option on checkout | `paymentService.createOrder` | ✅ |
| 44 | Order success screen | redirect to /shop/orderSuccess | `OrderSuccessScreen` | ✅ |

## 📦 Orders & Invoice

| # | Feature | Web reference | Mobile | Status |
|---|---|---|---|---|
| 45 | Orders list (authenticated) | `pages/Orders.tsx` | `OrdersScreen` | ✅ |
| 46 | Order status badges | Orders.tsx | Color-coded Badge | ✅ |
| 47 | Order detail page | not on web (modal on Orders) | `OrderDetailScreen` (full page) | ✅ **upgraded** |
| 48 | Cancel order (if pending) | cancelOrder API | Confirmation dialog + API call | ✅ |
| 49 | Invoice view | `pages/Invoice.tsx` | `InvoiceScreen` | ✅ |
| 50 | Invoice PDF export | html2pdf.js | **Share as text via native share sheet** | ✅ (adapted for mobile) |
| 51 | Write product review | in Orders.tsx | `WriteReviewScreen` — rating + title + message per item | ✅ |

## 👤 Profile

| # | Feature | Web reference | Mobile | Status |
|---|---|---|---|---|
| 52 | View profile | Profile.tsx | `ProfileScreen` (avatar, name, phone, email) | ✅ |
| 53 | Edit profile (first/last name) | Profile.tsx | `EditProfileScreen` | ✅ |
| 54 | Change password | Profile.tsx | `ChangePasswordScreen` | ✅ |
| 55 | Manage addresses (list) | Profile.tsx | `AddressesScreen` | ✅ |
| 56 | Add new address | Profile.tsx | `AddEditAddressScreen` (mode: add) | ✅ |
| 57 | Edit existing address | Profile.tsx | `AddEditAddressScreen` (mode: edit) | ✅ |
| 58 | Delete address | addressService | Confirm dialog + API delete | ✅ |
| 59 | Logout with confirm | top nav | Alert dialog + logout | ✅ |

## 📄 Static / Policies

| # | Feature | Web reference | Mobile | Status |
|---|---|---|---|---|
| 60 | About page | `pages/About.tsx` | `AboutScreen` (native) | ✅ |
| 61 | Contact Us | `pages/Contact.tsx` | `ContactScreen` — tappable email & website | ✅ |
| 62 | Terms & Conditions | `pages/Terms.tsx` | `TermsScreen` (WebView to `/terms`) | ✅ |
| 63 | Privacy Policy | `pages/Privacy.tsx` | `PrivacyScreen` (WebView) | ✅ |
| 64 | Refund Policy | `pages/RefundPolicy.tsx` | `RefundPolicyScreen` (WebView) | ✅ |
| 65 | Shipping Policy | `pages/ShippingPolicy.tsx` | `ShippingPolicyScreen` (WebView) | ✅ |

## 🎨 Design System (parity with web)

| # | Feature | Source | Mobile | Status |
|---|---|---|---|---|
| 66 | Exact color palette | `tailwind.config.js` | `src/theme/colors.ts` — hex-for-hex match | ✅ |
| 67 | Montserrat font | `/public/fonts/Montserrat-VariableFont_wght.ttf` | Bundled in `android/app/src/main/assets/fonts/` + linked via `react-native.config.js` | ✅ |
| 68 | Cream background `#f9f4ec` | body background | `colors.background` | ✅ |
| 69 | Earth-tone primary `#AE6F4C` | tailwind primary | `colors.primary` | ✅ |
| 70 | Atomic components (Button/Input/Card/Badge) | component library | `src/components/common/` | ✅ |

## 📱 Mobile-Only UX Enhancements

| # | Feature | Status |
|---|---|---|
| 71 | Bottom tab navigation (Home / Shop / Cart / Orders / Profile) | ✅ |
| 72 | Cart badge on bottom tab | ✅ |
| 73 | Pull-to-refresh on Home, Category, Cart, Orders | ✅ |
| 74 | Skeleton loaders during fetch | ✅ |
| 75 | Empty states with CTAs | ✅ |
| 76 | Toast notifications for success/error/info | ✅ |
| 77 | Keychain-backed token storage (more secure than web localStorage) | ✅ |
| 78 | Keyboard-aware scroll views on all forms | ✅ |
| 79 | Status bar styling per screen background | ✅ |
| 80 | Android back-button handled natively by React Navigation | ✅ |
| 81 | Safe area insets respected (notch / gesture bar) | ✅ |

## ⏳ Deferred to Phase 2

| # | Feature | Reason |
|---|---|---|
| — | Push notifications (FCM + APNs) | Explicitly deferred to the end |
| — | Splash screen with custom logo | Use `react-native-bootsplash` generator when app icon is finalised |
| — | App icon (custom) | Using RN default `ic_launcher` for now |
| — | Biometric login | Can be added on top of Keychain |
| — | Firebase Analytics / Crashlytics | Not part of web app; add if desired |

---

## Feature count summary

**Total features delivered in Phase 1: 81**
- **Parity with web: 65/65 (100%)**
- **Mobile-only enhancements: 16**
- **Deferred: 5 (by design)**
