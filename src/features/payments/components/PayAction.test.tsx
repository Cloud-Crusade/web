import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { setTokens } from '@/lib/authToken';
import { renderWithProviders } from '@/test/utils';

import { PayAction } from './PayAction';

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

  it('결제 수단이 비어 있으면 검증 에러를 보여준다', async () => {
    setTokens('access.mock', 'refresh.mock');
    const user = userEvent.setup();
    renderWithProviders(<PayAction reservationId="r1" />);

    await user.click(screen.getByRole('button', { name: '결제하기' }));

    expect(await screen.findByText('결제 수단을 입력하세요')).toBeInTheDocument();
  });
});
