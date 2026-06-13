import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { clearTokens, getAccessToken, setTokens } from '@/lib/authToken';
import { clearReservationToken } from '@/lib/reservationToken';
import type { TokenPair } from '@/types/auth';

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (tokens: TokenPair) => void;
  logout: () => void;
  syncAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => getAccessToken() != null);

  // 토큰 저장소를 단일 출처로 인증 상태 재동기화 — 인터셉터가 401 갱신 실패로
  // 토큰을 비운 경우 등 외부 변경을 페이지 이동 시점에 반영한다.
  const syncAuth = useCallback(() => {
    setIsAuthenticated(getAccessToken() != null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      login: (tokens) => {
        setTokens(tokens.access_token, tokens.refresh_token);
        setIsAuthenticated(true);
      },
      logout: () => {
        clearTokens();
        // RESERVATION 헤더가 비로그인 요청에 새지 않도록 입장 토큰도 함께 정리
        clearReservationToken();
        setIsAuthenticated(false);
      },
      syncAuth,
    }),
    [isAuthenticated, syncAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 는 AuthProvider 안에서만 사용할 수 있습니다');
  }
  return ctx;
}
