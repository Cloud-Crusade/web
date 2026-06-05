import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:8020';

const reservation = {
  reservation_id: 'r1',
  user_id: 'u1',
  event_id: 'e1',
  is_canceled: false,
  reserved_num: 2,
  created_at: '2026-06-01',
  last_modified: null,
};

export const reservationHandlers = [
  http.get(`${BASE}/reservations`, () =>
    HttpResponse.json({ items: [reservation], total: 1, page: 1, size: 10 }),
  ),

  http.get(`${BASE}/reservations/seats/occupied`, ({ request }) => {
    const eventId = new URL(request.url).searchParams.get('event_id');
    return HttpResponse.json({ event_id: eventId, occupied: [2, 4] });
  }),

  http.get(`${BASE}/reservations/:reservationId`, ({ params }) =>
    HttpResponse.json({ ...reservation, reservation_id: params.reservationId }),
  ),

  http.post(`${BASE}/reservations`, () =>
    HttpResponse.json({ reservation_id: 'r-new', status: 'accepted' }, { status: 202 }),
  ),

  http.delete(`${BASE}/reservations/:reservationId`, ({ params }) =>
    HttpResponse.json(
      { reservation_id: params.reservationId, status: 'accepted' },
      { status: 202 },
    ),
  ),
];
