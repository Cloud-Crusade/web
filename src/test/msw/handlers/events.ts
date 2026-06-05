import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:8020';

export const eventHandlers = [
  http.get(`${BASE}/events`, () =>
    HttpResponse.json({
      items: [
        {
          event_id: 'e1',
          user_id: 'u1',
          title: '테스트 콘서트',
          schedule: { start_at: '2026-12-31T19:00:00Z', end_at: '2026-12-31T21:00:00Z' },
          img_urls: [],
          total_seats: 100,
          created_at: '2026-06-01',
        },
      ],
      total: 1,
      page: 1,
      size: 20,
    }),
  ),

  http.get(`${BASE}/events/:eventId`, ({ params }) =>
    HttpResponse.json({
      event_id: params.eventId,
      user_id: 'u1',
      title: '테스트 콘서트',
      schedule: { start_at: '2026-12-31T19:00:00Z', end_at: '2026-12-31T21:00:00Z' },
      img_urls: [],
      total_seats: 100,
      created_at: '2026-06-01',
    }),
  ),
];
