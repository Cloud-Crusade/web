import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { setTokens } from '@/lib/authToken';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';

import { EventActions } from './EventActions';

const BASE = 'http://localhost:8020';

describe('EventActions', () => {
  afterEach(() => localStorage.clear());

  it('삭제 확인 시 해당 행사로 DELETE 요청을 보낸다', async () => {
    setTokens('access.mock', 'refresh.mock');
    let deletedId: string | null = null;
    server.use(
      http.delete(`${BASE}/events/:eventId`, ({ params }) => {
        deletedId = String(params.eventId);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<EventActions eventId="e1" />);

    // 트리거 버튼(삭제) → 확인 다이얼로그
    await user.click(screen.getByRole('button', { name: /삭제/ }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(deletedId).toBe('e1'));
  });
});
