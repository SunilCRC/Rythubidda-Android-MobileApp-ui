/**
 * Domain types mirroring backend DTOs.
 * Not every field is required for every response — backend is loose, so we're permissive.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  statusCode?: number;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize?: number;
}

export interface Customer {
  customerId?: number;
  firstname?: string;
  lastname?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  isActive?: boolean | number;
  billingAddress?: CustomerAddress;
  shippingAddress?: CustomerAddress;
  addresses?: CustomerAddress[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerAddress {
  customerAddressId?: number;
  customerId?: number;
  firstname?: string;
  lastname?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postcode: string;
  telephone: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface SignupRequest {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
}

export interface AuthSuccessData {
  token: string;
  customer?: Customer;
  customerId?: number;
  customerName?: string;
  activated?: boolean;
  otpSent?: boolean;
  otpVerified?: boolean;
}

export interface Category {
  id?: number;
  categoryId?: number;
  name: string;
  parentId?: number;
  image?: string;
  icon?: string;
  isActive?: boolean | number;
  children?: Category[];
  subcategories?: Category[];
}

export interface ProductQtyOption {
  id?: number;
  qtyOptionId?: number;
  label?: string;
  name?: string;
  value?: string;
  price?: number;
  mrp?: number;
  stock?: number;
  startQty?: number;
  endQty?: number;
  displayOrder?: number;
  default?: boolean;
}

/**
 * Product / order review. Mirrors
 * `com.pineblue.ai.commerce.model.product.ProductReview` on the backend.
 * Used in two contexts:
 *  1. Reviews shown on a Product page (`comment`/`message` are aliases there).
 *  2. Orders LIST endpoint attaches an array of these per order via
 *     `setProductReviews(...)` so the mobile knows what was already reviewed.
 */
export interface ProductReview {
  id?: number;
  reviewId?: number;
  productId?: number;
  orderId?: number;
  productName?: string;
  customerId?: number;
  customerName?: string;
  rating?: number;
  title?: string;
  /** Backend field name on the JSON payload. */
  review?: string;
  /** Aliases used by the product detail screen. */
  comment?: string;
  message?: string;
  /** Moderation status: -1 pending, 0 rejected, 1 accepted. */
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id?: number;
  productId?: number;
  name: string;
  sku?: string;
  description?: string;
  shortDescription?: string;
  price: number;
  mrp?: number;
  cost?: number;
  quantity?: number;
  stock?: number;
  image?: string;
  imageUrl?: string;
  images?: string[];
  gallery?: string[];
  categoryId?: number;
  category?: string;
  isActive?: boolean | number;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  qtyOptions?: ProductQtyOption[];
  reviews?: ProductReview[];
  rating?: number;
  totalReviews?: number;
  relatedProducts?: Product[];
  unit?: string;             // e.g. "500 g" — derived from qty options
  inStock?: boolean;
  discountPercent?: number;  // pre-computed for the primary price
}

export interface ShoppingItem {
  itemId?: number;
  cartItemId?: number;
  cartId?: string | number;
  productId: number;
  product?: Product;
  name?: string;
  image?: string;
  qty: number;
  price: number;
  mrp?: number;
  qtyOptionId?: string | number;
  qtyOptionLabel?: string;
  subtotal?: number;
}

export interface ShoppingCart {
  cartId?: string | number;
  customerId?: number;
  items?: ShoppingItem[];
  subtotal?: number;
  shippingCost?: number;
  tax?: number;
  orderTotal?: number;
  zipCode?: string;
  shippingCode?: string;
  shippingName?: string;
  customerAddressId?: number;
  deliveryDate?: string;
  eventDate?: string;
  eventName?: string;
  deliveryNotes?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShippingCalcResult {
  shippingCost?: number;
  shippingCostFormatted?: string;
  displayShippingCost?: string;
  isFreeDelivery?: boolean;
}

export interface PincodeValidation {
  isDeliverable: boolean;
  zipCode?: string;
}

export interface DeliveryInfo {
  cartId: string | number;
  addressId: number;
  deliveryDate?: string;
  eventDate?: string;
  eventName?: string;
  deliveryComments?: string;
}

export interface SaleOrderItem {
  id?: number;
  orderId?: number;
  productId?: number;
  productName?: string;
  name?: string;
  image?: string;
  qty: number;
  price: number;
  subtotal?: number;
  qtyOptionLabel?: string;
  reviewed?: boolean;
  rating?: number;
  /**
   * The backend's `viewSubmitReviews` endpoint attaches this field per
   * line item — `null` means the user hasn't reviewed this product yet,
   * a populated object means they have. The mobile WriteReviewScreen
   * uses this directly (mirrors what the web Orders.tsx does) instead of
   * trying to cross-reference a separate reviews array.
   */
  productReview?: ProductReview | null;
}


export interface SaleOrder {
  entityId?: number;
  orderId?: string | number;
  uuid?: string;
  // Backend's `incrementId` (e.g. "100000123") — preferred display id when present.
  incrementId?: string;
  customerId?: number;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  // Backend uses `subTotal` / `grandTotal` / `shippingAmount` (camelCase) and
  // exposes pre-formatted display strings as `dspSubTotal` / `dspGrandTotal`.
  // We also keep the older field names so any code that already reads them
  // continues to work.
  subtotal?: number;
  subTotal?: number;
  dspSubTotal?: string;
  shippingCost?: number;
  shippingAmount?: number;
  dspShippingAmount?: string;
  tax?: number;
  orderTotal?: number;
  grandTotal?: number;
  dspGrandTotal?: string;
  // Total number of line items — only field surfaced by the orders LIST endpoint.
  // The detail endpoint additionally returns the `items` array.
  totalItemCount?: number;
  // Backend Java field is `saleItems` — kept as an alternative to `items`.
  saleItems?: SaleOrderItem[];
  items?: SaleOrderItem[];
  // Reviews the customer has already submitted for items on this order.
  // Populated by the orders LIST endpoint (one row per reviewed product).
  productReviews?: ProductReview[];
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  deliveryDate?: string;
  // Backend populates the resolved address objects on `shippingAddress` /
  // `billingAddress` (snapshot first, then DB lookup as fallback). The older
  // `address` field is kept for legacy callers.
  shippingAddress?: CustomerAddress;
  billingAddress?: CustomerAddress;
  address?: CustomerAddress;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceInfo {
  order?: SaleOrder;
  customer?: Customer;
  items?: SaleOrderItem[];
  shippingAddress?: CustomerAddress;
  billingAddress?: CustomerAddress;
  subtotal?: number;
  shippingCost?: number;
  tax?: number;
  total?: number;
  // Backend `/api/v1/shop/invoice/{orderId}` actually returns these fields
  // (after the envelope is unwrapped): { order, invoiceNumber, orderId, orderDate, status }.
  // Every numeric / address / item field lives under `order.*`.
  invoiceNumber?: string | number;
  orderDate?: string;
  invoiceDate?: string;
  status?: string;
  paymentMethod?: string;
}

export interface GalleryImage {
  id?: number;
  imageUrl?: string;
  image?: string;
  url?: string;
  title?: string;
  orientation?: string;
  position?: number;
  linkTo?: string;
}

export interface Banner {
  id?: number;
  text?: string;
  badgeText?: string;
  scrollingText?: string;
  isActive?: boolean;
}

export interface RazorpayOrderConfig {
  key_id: string;
  amount: number;
  currency: string;
  id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

/**
 * Wire shape expected by the backend's `POST /api/v1/shop/submitReviews`.
 * - `saleOrderItemId` matches `SaleOrderItem.id` (NOT `productId` — the
 *   backend looks up the product internally from the sale-item record).
 * - `rating` is sent as a STRING (the controller calls `Integer.parseInt`).
 * - `headline` is the optional title field name on the backend DTO.
 */
export interface ReviewItem {
  saleOrderItemId: number;
  rating: string;
  headline?: string;
  message?: string;
}

export interface ReviewSubmission {
  orderId: number;
  reviews: ReviewItem[];
}

export type PaymentMethod = 'RAZORPAY' | 'PAY_AFTER_DELIVERY' | 'COD';

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | string;
