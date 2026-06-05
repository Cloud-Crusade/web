import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:8020';

const payment = {
  payment_history_id: 'p1',
  user_id: 'u1',
  reservation_id: 'r1',
  payment_method: '신용카드',
  created_at: '2026-06-05',
};

export const paymentHandlers = [
  http.get(`${BASE}/payments`, () =>
    HttpResponse.json({ items: [payment], total: 1, page: 1, size: 10 }),
  ),

  http.get(`${BASE}/payments/:paymentHistoryId`, ({ params }) =>
    HttpResponse.json({ ...payment, payment_history_id: params.paymentHistoryId }),
  ),

  http.post(`${BASE}/payments`, () =>
    HttpResponse.json({ payment_history_id: 'p-new', status: 'accepted' }, { status: 202 }),
  ),
];
