import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:8020';

// 기본은 즉시 입장(COMPLETED) + 입장 토큰 — 대기/폴링 시나리오는 각 테스트에서 override
export const queueHandlers = [
  http.get(`${BASE}/queue/:eventId`, () =>
    HttpResponse.json({
      code: 'COMPLETED',
      message: '입장되었습니다.',
      data: { token: 'mock-reservation-token' },
    }),
  ),
];
