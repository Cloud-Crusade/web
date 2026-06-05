import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils';

import EventDetailPage from './EventDetailPage';

const BASE = 'http://localhost:8020';

function renderDetail(eventId: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/events/:eventId" element={<EventDetailPage />} />
    </Routes>,
    { route: `/events/${eventId}` },
  );
}

describe('EventDetailPage', () => {
  it('행사 정보를 보여준다', async () => {
    renderDetail('e1');
    expect(await screen.findByRole('heading', { name: '테스트 콘서트' })).toBeInTheDocument();
  });

  it('존재하지 않는 행사면 안내와 목록 이동 버튼을 보여준다', async () => {
    server.use(
      http.get(`${BASE}/events/:eventId`, () =>
        HttpResponse.json(
          { code: 'EVENT_NOT_FOUND', message: '이벤트를 찾을 수 없습니다', details: {} },
          { status: 404 },
        ),
      ),
    );
    renderDetail('missing');
    expect(await screen.findByText('존재하지 않는 행사예요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '행사 목록으로' })).toBeInTheDocument();
  });
});
