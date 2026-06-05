import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

import { clearTokens, getAccessToken, setTokens } from '@/lib/authToken';
import type { TokenPair } from '@/types/auth';

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (tokens: TokenPair) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => getAccessToken() != null);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      login: (tokens) => {
        setTokens(tokens.access_token, tokens.refresh_token);
        setIsAuthenticated(true);
      },
      logout: () => {
        clearTokens();
        setIsAuthenticated(false);
      },
    }),
    [isAuthenticated],
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
