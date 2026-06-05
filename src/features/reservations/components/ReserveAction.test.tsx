import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { setTokens } from '@/lib/authToken';
import { renderWithProviders } from '@/test/utils';

import { ReserveAction } from './ReserveAction';

describe('ReserveAction', () => {
  afterEach(() => localStorage.clear());

  it('비로그인 상태에서는 로그인 유도 버튼을 보여준다', () => {
    renderWithProviders(<ReserveAction eventId="e1" totalSeats={100} />);
    expect(screen.getByRole('button', { name: '로그인하고 예매하기' })).toBeInTheDocument();
  });

  it('로그인 상태에서 이미 예매된 좌석을 안내한다', async () => {
    setTokens('access.mock', 'refresh.mock');
    renderWithProviders(<ReserveAction eventId="e1" totalSeats={100} />);
    expect(await screen.findByText('이미 예매된 좌석: 2, 4')).toBeInTheDocument();
  });

  it('점유된 좌석을 입력해 제출하면 인라인 에러를 보여준다', async () => {
    setTokens('access.mock', 'refresh.mock');
    const user = userEvent.setup();
    renderWithProviders(<ReserveAction eventId="e1" totalSeats={100} />);
    await screen.findByText('이미 예매된 좌석: 2, 4');

    const input = screen.getByLabelText('좌석 번호');
    fireEvent.change(input, { target: { value: '2' } });
    await user.click(screen.getByRole('button', { name: '예매하기' }));

    expect(
      await screen.findByText('이미 예매된 좌석이에요. 다른 좌석을 선택하세요.'),
    ).toBeInTheDocument();
  });
});
