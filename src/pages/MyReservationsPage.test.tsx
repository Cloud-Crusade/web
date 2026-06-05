import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setTokens } from '@/lib/authToken';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';

import MyReservationsPage from './MyReservationsPage';

const BASE = 'http://localhost:8020';

describe('MyReservationsPage', () => {
  beforeEach(() => setTokens('access.mock', 'refresh.mock'));
  afterEach(() => localStorage.clear());

  it('예매 목록을 보여준다', async () => {
    renderWithProviders(<MyReservationsPage />);
    expect(await screen.findByText('2매 예매')).toBeInTheDocument();
  });

  it('예매가 없으면 빈 상태를 보여준다', async () => {
    server.use(
      http.get(`${BASE}/reservations`, () =>
        HttpResponse.json({ items: [], total: 0, page: 1, size: 10 }),
      ),
    );
    renderWithProviders(<MyReservationsPage />);
    expect(await screen.findByText('예매 내역이 없어요')).toBeInTheDocument();
  });
});
