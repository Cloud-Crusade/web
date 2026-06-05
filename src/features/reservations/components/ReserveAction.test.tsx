import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { setTokens } from '@/lib/authToken';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';

import { ReserveAction } from './ReserveAction';

const BASE = 'http://localhost:8020';

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

  it('점유 좌석 에러는 다른 좌석으로 바꾸면 해제된다', async () => {
    setTokens('access.mock', 'refresh.mock');
    const user = userEvent.setup();
    renderWithProviders(<ReserveAction eventId="e1" totalSeats={100} />);
    await screen.findByText('이미 예매된 좌석: 2, 4');

    const input = screen.getByLabelText('좌석 번호');
    fireEvent.change(input, { target: { value: '2' } });
    await user.click(screen.getByRole('button', { name: '예매하기' }));
    await screen.findByText('이미 예매된 좌석이에요. 다른 좌석을 선택하세요.');

    // 빈 좌석으로 변경 → 점유 에러 자동 해제
    fireEvent.change(input, { target: { value: '5' } });
    await waitFor(() =>
      expect(
        screen.queryByText('이미 예매된 좌석이에요. 다른 좌석을 선택하세요.'),
      ).not.toBeInTheDocument(),
    );
  });

  it('생성 실패(409) 시 점유 좌석 목록을 갱신한다', async () => {
    setTokens('access.mock', 'refresh.mock');
    const user = userEvent.setup();

    let seatTaken = false;
    server.use(
      http.post(`${BASE}/reservations`, () => {
        seatTaken = true;
        return HttpResponse.json(
          { code: 'SEAT_ALREADY_TAKEN', message: '이미 선점된 좌석입니다', details: {} },
          { status: 409 },
        );
      }),
      http.get(`${BASE}/reservations/seats/occupied`, ({ request }) => {
        const eventId = new URL(request.url).searchParams.get('event_id');
        // 409 발생 후엔 5번도 점유된 것으로 갱신
        return HttpResponse.json({ event_id: eventId, occupied: seatTaken ? [2, 4, 5] : [2, 4] });
      }),
    );

    renderWithProviders(<ReserveAction eventId="e1" totalSeats={100} />);
    await screen.findByText('이미 예매된 좌석: 2, 4');

    const input = screen.getByLabelText('좌석 번호');
    fireEvent.change(input, { target: { value: '5' } }); // 조회 시점엔 빈 좌석
    await user.click(screen.getByRole('button', { name: '예매하기' }));

    // 409 → occupied invalidate → refetch 로 안내 문구 갱신
    expect(await screen.findByText('이미 예매된 좌석: 2, 4, 5')).toBeInTheDocument();
  });
});
