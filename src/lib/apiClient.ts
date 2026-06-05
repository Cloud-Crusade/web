import axios, { type InternalAxiosRequestConfig } from 'axios';

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/lib/authToken';
import { toApiError } from '@/lib/apiError';
import type { TokenPair } from '@/types/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8020';
const DEFAULT_TIMEOUT_MS = 10_000;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// 요청 인터셉터 — access token 자동 주입
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// 동시 401 들이 단일 refresh 를 공유 (토큰 레이스 방지)
let refreshPromise: Promise<TokenPair> | null = null;

// refresh 는 인터셉터를 안 타는 raw axios 로 호출 (재귀 401 방지)
async function requestRefresh(): Promise<TokenPair> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('no refresh token');
  }
  const { data } = await axios.post<TokenPair>(`${BASE_URL}/auth/refresh`, {
    refresh_token: refreshToken,
  });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

function redirectToLogin(): void {
  clearTokens();
  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`/login?redirect=${redirect}`);
}

// 응답 인터셉터 — 401 → refresh → 재시도, 그 외 에러는 ApiError 로 정규화
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (status !== 401 || !config || config._retried) {
      return Promise.reject(toApiError(error));
    }
    config._retried = true;

    try {
      refreshPromise ??= requestRefresh();
      const tokens = await refreshPromise;
      config.headers.Authorization = `Bearer ${tokens.access_token}`;
      return apiClient(config);
    } catch (refreshError) {
      redirectToLogin();
      return Promise.reject(toApiError(refreshError));
    } finally {
      refreshPromise = null;
    }
  },
);
