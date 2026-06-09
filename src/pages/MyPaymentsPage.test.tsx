import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setTokens } from '@/lib/authToken';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';

import MyPaymentsPage from './MyPaymentsPage';

const BASE = 'http://localhost:8020';

describe('MyPaymentsPage', () => {
  beforeEach(() => setTokens('access.mock', 'refresh.mock'));
  afterEach(() => localStorage.clear());

  it('결제 내역 목록을 보여준다', async () => {
    renderWithProviders(<MyPaymentsPage />);
    expect(await screen.findByText('신용카드')).toBeInTheDocument();
  });

  it('결제 내역이 없으면 빈 상태를 보여준다', async () => {
    server.use(
      http.get(`${BASE}/payments`, () =>
        HttpResponse.json({ items: [], total: 0, page: 1, size: 10 }),
      ),
    );
    renderWithProviders(<MyPaymentsPage />);
    expect(await screen.findByText('결제 내역이 없어요')).toBeInTheDocument();
  });
});
