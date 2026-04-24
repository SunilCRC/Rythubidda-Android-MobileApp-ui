import { create } from 'zustand';
import { authService } from '../api/services';
import { clearToken, getToken, saveToken } from '../utils/authStorage';
import type { Customer } from '../types';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: Customer | null;

  hydrate: () => Promise<void>;
  login: (phone: string, password: string) => Promise<Customer>;
  verifyOtp: (customerId: number, otp: string) => Promise<Customer>;
  verifyForgotPasswordOtp: (customerId: number, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: Customer | null) => void;
  refreshProfile: () => Promise<Customer | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'idle',
  user: null,

  hydrate: async () => {
    set({ status: 'loading' });
    const token = await getToken();
    if (!token) {
      set({ status: 'unauthenticated', user: null });
      return;
    }
    try {
      const profile = await authService.getProfile();
      set({ status: 'authenticated', user: profile });
    } catch {
      await clearToken();
      set({ status: 'unauthenticated', user: null });
    }
  },

  login: async (phone, password) => {
    const result = await authService.login({ phone, password });
    if (!result.token) throw new Error('Invalid response from server');
    await saveToken(result.token);
    const profile = result.customer ?? (await authService.getProfile());
    set({ status: 'authenticated', user: profile });
    return profile;
  },

  verifyOtp: async (customerId, otp) => {
    const result = await authService.verifyOtp(customerId, otp);
    if (!result.token) throw new Error('OTP verification failed');
    await saveToken(result.token);
    const profile = result.customer ?? (await authService.getProfile());
    set({ status: 'authenticated', user: profile });
    return profile;
  },

  verifyForgotPasswordOtp: async (customerId, otp) => {
    const result = await authService.forgotPasswordVerifyOtp(customerId, otp);
    if (result.token) await saveToken(result.token);
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // ignore — we still clear local state
    }
    await clearToken();
    set({ status: 'unauthenticated', user: null });
  },

  setUser: (user) => set({ user }),

  refreshProfile: async () => {
    try {
      const profile = await authService.getProfile();
      set({ user: profile, status: 'authenticated' });
      return profile;
    } catch {
      return null;
    }
  },
}));

export const useIsAuthenticated = () =>
  useAuthStore(s => s.status === 'authenticated');
