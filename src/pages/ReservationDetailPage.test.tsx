import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setTokens } from '@/lib/authToken';
import { renderWithProviders } from '@/test/utils';

import ReservationDetailPage from './ReservationDetailPage';

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

  it('예매 취소를 누르면 확인 다이얼로그를 보여준다', async () => {
    const user = userEvent.setup();
    renderDetail('r1');

    await user.click(await screen.findByRole('button', { name: '예매 취소' }));
    expect(await screen.findByText('예매를 취소할까요?')).toBeInTheDocument();
  });
});
