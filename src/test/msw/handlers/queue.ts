import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:8020';

// 기본은 즉시 입장(admitted) — 대기/폴링 시나리오는 각 테스트에서 override
export const queueHandlers = [
  http.get(`${BASE}/queue/:eventId`, ({ params }) =>
    HttpResponse.json({ event_id: params.eventId, position: 0, status: 'admitted' }),
  ),
];
