/** Axios instance with JWT attach + single-flight refresh on 401. */

import {
  create,
  isAxiosError,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import type { TokenPair } from '../types/api';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
} from './tokens';

const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export const api = create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Separate client for the refresh call: it must never pick up the request
 * interceptor (no stale access token) nor the response interceptor (a failed
 * refresh must not recurse into another refresh).
 */
const refreshClient = create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/** Endpoints that must never carry (or retry with) a token. */
const PUBLIC_PATHS = ['/auth/login/', '/auth/register/', '/auth/token/refresh/'];

function isPublic(url: string | undefined): boolean {
  return !!url && PUBLIC_PATHS.some((path) => url.includes(path));
}

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    if (!isPublic(config.url)) {
      const token = await getAccessToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
);

type RetryConfig = AxiosRequestConfig & { _retried?: boolean };

/** Shared promise so N concurrent 401s trigger exactly one refresh call. */
let refreshInFlight: Promise<string | null> | null = null;

/** Notifies the app (see AuthProvider) when the session is unrecoverable. */
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler = () => {};

export function setSessionExpiredHandler(handler: SessionExpiredHandler): void {
  onSessionExpired = handler;
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) return null;
  try {
    const { data } = await refreshClient.post<TokenPair>('/auth/token/refresh/', {
      refresh,
    });
    await saveAccessToken(data.access);
    return data.access;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (status !== 401 || !config || config._retried || isPublic(config.url)) {
      return Promise.reject(error);
    }

    config._retried = true;
    refreshInFlight ??= refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
    const token = await refreshInFlight;

    if (!token) {
      await clearTokens();
      onSessionExpired();
      return Promise.reject(error);
    }

    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    return api.request(config);
  },
);

/** Flattens DRF error payloads into one human-readable Uzbek string. */
export function apiErrorMessage(error: unknown, fallback = 'Xatolik yuz berdi'): string {
  if (!isAxiosError(error)) return fallback;
  const data = error.response?.data;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const messages = Object.values(data as Record<string, unknown>).flatMap(
      (value) => (Array.isArray(value) ? value : [value]),
    );
    const first = messages.find((item) => typeof item === 'string');
    if (first) return first as string;
  }
  if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
    return 'Internet aloqasi yo’q';
  }
  return fallback;
}

export default api;
