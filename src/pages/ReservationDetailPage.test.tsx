import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setTokens } from '@/lib/authToken';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';

import ReservationDetailPage from './ReservationDetailPage';

const BASE = 'http://localhost:8020';

function renderDetail(reservationId: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/reservations/:reservationId" element={<ReservationDetailPage />} />
    </Routes>,
    { route: `/reservations/${reservationId}` },
  );
}

describe('ReservationDetailPage', () => {
  beforeEach(() => setTokens('access.mock', 'refresh.mock'));
  afterEach(() => localStorage.clear());

  it('예매 정보를 보여준다', async () => {
    renderDetail('r1');
    expect(await screen.findByText('2번')).toBeInTheDocument();
    expect(screen.getByText('예매 완료')).toBeInTheDocument();
  });

  it('취소되지 않은 예매에는 결제 액션을 보여준다', async () => {
    renderDetail('r1');
    expect(await screen.findByRole('button', { name: '결제하기' })).toBeInTheDocument();
    expect(screen.getByLabelText('결제 수단')).toBeInTheDocument();
  });

  it('취소된 예매에는 결제 액션을 숨긴다', async () => {
    server.use(
      http.get(`${BASE}/reservations/:reservationId`, ({ params }) =>
        HttpResponse.json({
          reservation_id: params.reservationId,
          user_id: 'u1',
          event_id: 'e1',
          is_canceled: true,
          reserved_num: 2,
          created_at: '2026-06-01',
          last_modified: null,
        }),
      ),
    );
    renderDetail('r1');
    await screen.findByText('2번'); // 상세 로드 대기

    expect(screen.queryByRole('button', { name: '결제하기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '예매 취소' })).not.toBeInTheDocument();
  });

  it('예매 취소를 누르면 확인 다이얼로그를 보여준다', async () => {
    const user = userEvent.setup();
    renderDetail('r1');

    await user.click(await screen.findByRole('button', { name: '예매 취소' }));
    expect(await screen.findByText('예매를 취소할까요?')).toBeInTheDocument();
  });
});
