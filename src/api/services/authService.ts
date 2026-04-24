import { apiGet, apiPost, apiPut } from '../client';
import { ENDPOINTS } from '../../constants/endpoints';
import type {
  AuthSuccessData,
  Customer,
  CustomerAddress,
  LoginRequest,
  SignupRequest,
} from '../../types';

export const authService = {
  login: (body: LoginRequest) =>
    apiPost<AuthSuccessData>(ENDPOINTS.LOGIN, body),

  signup: (body: SignupRequest) =>
    apiPost<AuthSuccessData>(ENDPOINTS.SIGNUP, body),

  verifyOtp: (customerId: number, otp: string) =>
    apiPost<AuthSuccessData>(ENDPOINTS.VERIFY_OTP, undefined, {
      params: { customerId, otp },
    }),

  resendOtp: (customerId: number, phone?: string) =>
    apiPost<AuthSuccessData>(ENDPOINTS.RESEND_OTP, undefined, {
      params: { customerId, ...(phone ? { phone } : {}) },
    }),

  forgotPassword: (phone: string) =>
    apiPost<AuthSuccessData>(ENDPOINTS.FORGOT_PASSWORD, { phone }),

  forgotPasswordVerifyOtp: (customerId: number, otp: string) =>
    apiPost<AuthSuccessData>(ENDPOINTS.FORGOT_PASSWORD_VERIFY_OTP, undefined, {
      params: { customerId, otp },
    }),

  resetPassword: (newPassword: string) =>
    apiPost<void>(ENDPOINTS.RESET_PASSWORD, { newPassword }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiPost<void>(ENDPOINTS.CHANGE_PASSWORD, { currentPassword, newPassword }),

  logout: () => apiPost<void>(ENDPOINTS.LOGOUT),

  getProfile: () => apiGet<Customer>(ENDPOINTS.PROFILE),

  updateProfile: (body: { firstName: string; lastName: string }) =>
    apiPut<Customer>(ENDPOINTS.PROFILE, body),

  updateBillingAddress: (body: { billingAddress: CustomerAddress }) =>
    apiPut<CustomerAddress>(ENDPOINTS.BILLING_ADDRESS, body),

  updateShippingAddress: (body: { shippingAddress: CustomerAddress }) =>
    apiPut<CustomerAddress>(ENDPOINTS.SHIPPING_ADDRESS, body),
};
