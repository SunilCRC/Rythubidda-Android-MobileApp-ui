import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: { redirectTo?: string } | undefined;
  Register: undefined;
  OTP: { customerId: number; phone: string; flow: 'signup' | 'forgot' };
  ForgotPassword: undefined;
  ResetPassword: { customerId: number };
};

export type HomeStackParamList = {
  HomeMain: undefined;
  Category: { categoryId: number; name: string };
  ProductDetail: { productId: number };
  Search: { initialQuery?: string } | undefined;
};

export type CategoriesStackParamList = {
  CategoriesMain: undefined;
  Category: { categoryId: number; name: string };
  ProductDetail: { productId: number };
  Search: { initialQuery?: string } | undefined;
};

export type CartStackParamList = {
  CartMain: undefined;
  Checkout: undefined;
  Addresses: { selectMode?: boolean } | undefined;
  AddEditAddress: { addressId?: number } | undefined;
  OrderSuccess: { orderId?: string | number } | undefined;
  ProductDetail: { productId: number };
};

export type OrdersStackParamList = {
  OrdersMain: undefined;
  OrderDetail: { orderId: number | string };
  Invoice: { orderId: number | string };
  WriteReview: { orderId: number | string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  Addresses: { selectMode?: boolean } | undefined;
  AddEditAddress: { addressId?: number } | undefined;
  About: undefined;
  Contact: undefined;
  Terms: undefined;
  Privacy: undefined;
  RefundPolicy: undefined;
  ShippingPolicy: undefined;
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  CategoriesTab: NavigatorScreenParams<CategoriesStackParamList>;
  CartTab: NavigatorScreenParams<CartStackParamList>;
  OrdersTab: NavigatorScreenParams<OrdersStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootStackParamList = {
  Splash: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Auth: NavigatorScreenParams<AuthStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
