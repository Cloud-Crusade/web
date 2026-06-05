import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';

import EventListPage from './EventListPage';

const BASE = 'http://localhost:8020';

describe('EventListPage', () => {
  it('행사를 불러오면 카드 목록을 보여준다', async () => {
    renderWithProviders(<EventListPage />);
    expect(await screen.findByText('테스트 콘서트')).toBeInTheDocument();
  });

  it('행사가 없으면 빈 상태를 보여준다', async () => {
    server.use(
      http.get(`${BASE}/events`, () =>
        HttpResponse.json({ items: [], total: 0, page: 1, size: 12 }),
      ),
    );
    renderWithProviders(<EventListPage />);
    expect(await screen.findByText('등록된 행사가 없어요')).toBeInTheDocument();
  });

  it('조회에 실패하면 다시 시도 버튼을 보여준다', async () => {
    server.use(
      http.get(`${BASE}/events`, () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: '오류', details: {} },
          { status: 503 },
        ),
      ),
    );
    renderWithProviders(<EventListPage />);
    expect(await screen.findByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });
});
