import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppLayout } from '@/components/layout/AppLayout';
import { AuthProvider } from '@/features/auth/AuthContext';
import { clearTokens, setTokens } from '@/lib/authToken';
import { createTestQueryClient } from '@/test/utils';

function renderApp() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/events']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="events" element={<div>행사 목록</div>} />
              <Route path="me" element={<div>내 정보</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AppLayout 인증 상태 재확인', () => {
  beforeEach(() => localStorage.clear());

  it('토큰이 외부에서 비워지면 페이지 이동 시 로그아웃 상태로 갱신한다', async () => {
    const user = userEvent.setup();
    setTokens('access.token', 'refresh.token');
    renderApp();

    // 로그인 상태 — 로그아웃 버튼 노출
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();

    // 인터셉터가 토큰을 비운 상황을 모사한 뒤 다른 페이지로 이동
    clearTokens();
    await user.click(screen.getByRole('link', { name: '내 정보' }));

    // 이동 후 로그인 버튼으로 전환 (syncAuth 재확인)
    expect(await screen.findByRole('link', { name: '로그인' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument();
  });
});
