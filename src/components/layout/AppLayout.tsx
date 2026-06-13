import { useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/AuthContext';

import { Header } from './Header';

export function AppLayout() {
  const { pathname } = useLocation();
  const { syncAuth } = useAuth();

  // 페이지 이동마다 토큰 저장소 기준으로 로그인 상태를 다시 확인.
  // paint 전에 끝내 보호 라우트/헤더가 stale 상태로 한 프레임 노출되는 깜빡임을 막는다.
  useLayoutEffect(() => {
    syncAuth();
  }, [pathname, syncAuth]);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-screen-lg flex-1 px-4 py-8 md:px-6">
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © 2026 C.C Ticketing — Cloud Crusade
      </footer>
    </div>
  );
}
