import axios, { type InternalAxiosRequestConfig } from 'axios';

import { toApiError } from '@/lib/apiError';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/lib/authToken';
import { clearReservationToken, getReservationToken } from '@/lib/reservationToken';
import type { TokenPair } from '@/types/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8020';
const DEFAULT_TIMEOUT_MS = 10_000;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// 요청 인터셉터 — access token + 대기열 입장 토큰(RESERVATION) 자동 주입
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const reservationToken = getReservationToken();
  if (reservationToken) {
    config.headers.RESERVATION = reservationToken;
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

// 갱신 실패 = 더 이상 유효한 세션이 아님 → 토큰을 비우고 현재 페이지를 새로고침해
// 로그인 상태를 내린다. 보호 라우트는 새로고침 후 가드가 로그인으로 보낸다.
function clearAuthAndReload(): void {
  clearTokens();
  clearReservationToken();
  window.location.reload();
}

// 인증 엔드포인트의 401 은 refresh 대상이 아니다 — 잘못된 자격 증명은 폼 에러로 노출한다
const AUTH_PATHS = ['/auth/login', '/auth/signup', '/auth/refresh'];
const isAuthPath = (url?: string) => !!url && AUTH_PATHS.some((path) => url.includes(path));

// 응답 인터셉터 — 401 → refresh → 재시도, 그 외 에러는 ApiError 로 정규화
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (status !== 401 || !config || config._retried || isAuthPath(config.url)) {
      return Promise.reject(toApiError(error));
    }
    config._retried = true;

    // 리프레시 토큰이 없으면(비로그인) 갱신·새로고침 없이 그대로 실패 — 새로고침 루프 방지
    if (!getRefreshToken()) {
      return Promise.reject(toApiError(error));
    }

    try {
      refreshPromise ??= requestRefresh();
      const tokens = await refreshPromise;
      config.headers.Authorization = `Bearer ${tokens.access_token}`;
      return apiClient(config);
    } catch (refreshError) {
      clearAuthAndReload();
      return Promise.reject(toApiError(refreshError));
    } finally {
      refreshPromise = null;
    }
  },
);
