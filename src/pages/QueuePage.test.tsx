import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthProvider } from '@/features/auth/AuthContext';
import { setTokens } from '@/lib/authToken';
import QueuePage from '@/pages/QueuePage';
import { server } from '@/test/msw/server';
import { createTestQueryClient } from '@/test/utils';

const BASE = 'http://localhost:8020';

function renderQueuePage() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/queue/ev-1']}>
          <Routes>
            <Route path="/queue/:eventId" element={<QueuePage />} />
            <Route path="/events/:eventId" element={<div>이벤트 상세</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('QueuePage', () => {
  beforeEach(() => {
    localStorage.clear();
    setTokens('access.token', 'refresh.token'); // useQueueStatus enabled 조건(인증) 충족
  });

  it('WAITING 응답의 queue_number·remaining 으로 대기 현황을 표시한다', async () => {
    server.use(
      http.get(`${BASE}/queue/:eventId`, () =>
        HttpResponse.json({
          code: 'WAITING',
          message: '현재 대기열',
          data: { queue_number: 123, remaining: 7 },
        }),
      ),
    );

    renderQueuePage();

    expect(await screen.findByText('123')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText(/앞에/)).toBeInTheDocument();
  });
});
