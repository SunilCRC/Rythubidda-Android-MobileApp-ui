import { z } from 'zod';
import { APP_CONFIG } from '../constants/config';

/**
 * Shared Zod schemas for form validation.
 * Phone rule matches the web app: 10 digits, first digit 6–9.
 */

export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const passwordSchema = z
  .string()
  .min(APP_CONFIG.PASSWORD_MIN_LENGTH, `At least ${APP_CONFIG.PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/\d/, 'Include a number')
  .regex(/[^A-Za-z0-9]/, 'Include a special character');

export const otpSchema = z
  .string()
  .length(APP_CONFIG.OTP_LENGTH, `Enter the ${APP_CONFIG.OTP_LENGTH}-digit OTP`)
  .regex(/^\d+$/, 'OTP must be digits only');

export const pincodeSchema = z
  .string()
  .length(APP_CONFIG.PINCODE_LENGTH, 'Pincode must be 6 digits')
  .regex(/^\d+$/, 'Pincode must be digits only');

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is too short').max(40),
  lastName: z.string().trim().min(1, 'Last name is required').max(40),
  phone: phoneSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  phone: phoneSchema,
});

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(d => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(d => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

/**
 * Address form — only fields the user actually TYPES are validated here.
 * city / state / postcode / latitude / longitude are derived from the map
 * + Google reverse-geocode and don't need user-facing validation. They're
 * still sent to the backend on save (alongside this schema's output).
 */
export const addressSchema = z.object({
  firstname: z.string().trim().min(2, 'Required'),
  lastname: z.string().trim().min(1, 'Required'),
  // House / Flat / Plot number — short string is fine; landmark is below.
  address1: z.string().trim().min(1, 'Required'),
  // Landmark — fully optional.
  address2: z.string().optional(),
  telephone: phoneSchema,
});

export const profileSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is too short'),
  lastName: z.string().trim().min(1, 'Last name is required'),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Please rate the product').max(5),
  title: z.string().trim().max(80).optional(),
  message: z.string().trim().min(3, 'Write a short review').max(500),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
