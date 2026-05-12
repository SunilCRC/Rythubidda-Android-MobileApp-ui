import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { APP_CONFIG } from '../constants/config';
import { clearToken, getToken } from '../utils/authStorage';

/**
 * Central axios instance.
 * - Base URL from .env (falls back to production).
 * - Request interceptor attaches Bearer JWT.
 * - Response interceptor normalises errors and auto-logs-out on 401.
 * - Auto-fallback: if the primary URL (typically local dev) fails with
 *   a NETWORK error, we silently retry once against the fallback URL
 *   (typically production). Once switched, all subsequent requests go
 *   to the fallback for the rest of the session. Resets on app launch.
 */

/**
 * Tracks whether the fallback URL is currently active. Once true, the
 * interceptor stops trying the primary — every request goes straight
 * to the fallback. Reset on app launch (module re-evaluation).
 */
let usingFallback = false;

export interface ApiError {
  status?: number;
  message: string;
  data?: unknown;
  isNetworkError?: boolean;
  isTimeout?: boolean;
}

type OnUnauthorizedHandler = () => void | Promise<void>;

let onUnauthorized: OnUnauthorizedHandler | null = null;

export function setOnUnauthorized(handler: OnUnauthorizedHandler | null) {
  onUnauthorized = handler;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: APP_CONFIG.API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(async config => {
  const token = await getToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[API] → ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  response => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[API] ← ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error: AxiosError<any>) => {
    const status = error.response?.status;
    const url = error.config?.url;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[API] ✗ ${status ?? 'NETWORK'} ${url}`, error.message);
    }

    // ── Auto-fallback to the secondary URL on network failure ──────────
    // Only triggers when:
    //   • a fallback is configured (different from primary)
    //   • we haven't switched yet (prevents infinite loop)
    //   • this is a NETWORK error (no response from server) — NOT a 4xx/5xx
    //   • the request is retryable (has a config object, isn't already a retry)
    const isNetworkError = !error.response;
    const isTimeout = error.code === 'ECONNABORTED';
    const fallback = APP_CONFIG.API_BASE_URL_FALLBACK;
    const cfg = error.config as
      | (AxiosRequestConfig & { _isFallbackRetry?: boolean })
      | undefined;

    if (
      (isNetworkError || isTimeout) &&
      !usingFallback &&
      fallback &&
      cfg &&
      !cfg._isFallbackRetry
    ) {
      usingFallback = true;
      apiClient.defaults.baseURL = fallback;
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          `[API] primary URL unreachable — switching to fallback: ${fallback}`,
        );
      }
      try {
        return await apiClient({
          ...cfg,
          baseURL: fallback,
          _isFallbackRetry: true,
        } as AxiosRequestConfig);
      } catch (retryErr) {
        // Fallback also failed — let the normal error path handle it below.
        error = retryErr as AxiosError<any>;
      }
    }

    if (status === 401) {
      await clearToken();
      if (onUnauthorized) await onUnauthorized();
    }

    const normalised: ApiError = {
      status: error.response?.status,
      message: extractMessage(error),
      data: error.response?.data,
      isNetworkError: !error.response,
      isTimeout: error.code === 'ECONNABORTED',
    };
    return Promise.reject(normalised);
  },
);

function extractMessage(error: AxiosError<any>): string {
  const resp = error.response?.data;
  if (resp && typeof resp === 'object') {
    if (typeof resp.message === 'string') return resp.message;
    if (typeof resp.error === 'string') return resp.error;
  }
  if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  if (!error.response) return 'Network error. Check your connection.';
  return error.message || 'Something went wrong.';
}

/**
 * Small helper wrappers that auto-unwrap the `data` field from our API's
 * `{success, message, data}` envelope.
 */
export async function apiGet<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.get(url, config);
  return unwrap<T>(res.data);
}

export async function apiPost<T = unknown>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await apiClient.post(url, body, config);
  return unwrap<T>(res.data);
}

export async function apiPut<T = unknown>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await apiClient.put(url, body, config);
  return unwrap<T>(res.data);
}

export async function apiDelete<T = unknown>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await apiClient.delete(url, config);
  return unwrap<T>(res.data);
}

/**
 * The backend uses these envelope shapes on different endpoints:
 *   - `{ success, message, data }`   — newer endpoints
 *   - `{ data: { ... } }`            — most `/api/v1/shop/*` endpoints
 *   - plain JSON                     — legacy `/shop/*` endpoints
 * We transparently unwrap all of them.
 */
function unwrap<T>(payload: any): T {
  if (!payload || typeof payload !== 'object') return payload as T;

  // `{success, message, data}` envelope
  if ('success' in payload) {
    if (payload.success === false) {
      const err: ApiError = {
        status: payload.statusCode,
        message: payload.message || 'Request failed',
        data: payload.data,
      };
      throw err;
    }
    return payload.data as T;
  }

  // `{data: ...}` envelope (no `success` field) — common on this backend.
  // We only unwrap when `data` is the sole meaningful key so we don't
  // accidentally hide real domain objects that happen to include a `data` field.
  const keys = Object.keys(payload);
  if (keys.length <= 3 && 'data' in payload) {
    return payload.data as T;
  }

  return payload as T;
}

export function apiRaw<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return apiClient.get<T>(url, config).then(r => r.data);
}
