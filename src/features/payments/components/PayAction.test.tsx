import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { setTokens } from '@/lib/authToken';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';

import { PayAction } from './PayAction';

const BASE = 'http://localhost:8020';

describe('PayAction', () => {
  afterEach(() => localStorage.clear());

  it('결제 수단을 입력하고 결제하면 폴링 후 결제 완료가 표시된다', async () => {
    setTokens('access.mock', 'refresh.mock');
    const user = userEvent.setup();
    renderWithProviders(<PayAction reservationId="r1" />);

    await user.type(screen.getByLabelText('결제 수단'), '신용카드');
    await user.click(screen.getByRole('button', { name: '결제하기' }));

    // 202 접수 → 폴링으로 단건 조회 200 → 완료
    expect(await screen.findByText('결제 완료 (신용카드)')).toBeInTheDocument();
  });

  it('첫 조회가 404여도 폴링으로 200을 잡아 완료를 표시한다', async () => {
    setTokens('access.mock', 'refresh.mock');
    const user = userEvent.setup();

    let calls = 0;
    server.use(
      http.get(`${BASE}/payments/:paymentHistoryId`, ({ params }) => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json(
            { code: 'PAYMENT_NOT_FOUND', message: '결제 내역을 찾을 수 없습니다', details: {} },
            { status: 404 },
          );
        }
        return HttpResponse.json({
          payment_history_id: params.paymentHistoryId,
          user_id: 'u1',
          reservation_id: 'r1',
          payment_method: '신용카드',
          created_at: '2026-06-05',
        });
      }),
    );

    renderWithProviders(<PayAction reservationId="r1" />);
    await user.type(screen.getByLabelText('결제 수단'), '신용카드');
    await user.click(screen.getByRole('button', { name: '결제하기' }));

    // 첫 폴링 404 → 처리 중, 다음 폴링(1.5s)에서 200 → 완료
    expect(await screen.findByText('결제 처리 중이에요...')).toBeInTheDocument();
    expect(await screen.findByText('결제 완료 (신용카드)', undefined, { timeout: 4000 })).toBeInTheDocument();
  });

  it('결제 수단이 비어 있으면 검증 에러를 보여준다', async () => {
    setTokens('access.mock', 'refresh.mock');
    const user = userEvent.setup();
    renderWithProviders(<PayAction reservationId="r1" />);

    await user.click(screen.getByRole('button', { name: '결제하기' }));

    expect(await screen.findByText('결제 수단을 입력하세요')).toBeInTheDocument();
  });
});
