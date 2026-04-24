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

export interface ProductReview {
  id?: number;
  reviewId?: number;
  customerId?: number;
  customerName?: string;
  rating: number;
  title?: string;
  comment?: string;
  message?: string;
  createdAt?: string;
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
}

export interface SaleOrder {
  entityId?: number;
  orderId?: string | number;
  uuid?: string;
  customerId?: number;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  subtotal?: number;
  shippingCost?: number;
  tax?: number;
  orderTotal?: number;
  items?: SaleOrderItem[];
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  deliveryDate?: string;
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
  invoiceNumber?: string;
  invoiceDate?: string;
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

export interface ReviewSubmission {
  productId: number;
  orderId: number;
  rating: number;
  title?: string;
  message?: string;
}

export type PaymentMethod = 'RAZORPAY' | 'PAY_AFTER_DELIVERY' | 'COD';

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | string;
