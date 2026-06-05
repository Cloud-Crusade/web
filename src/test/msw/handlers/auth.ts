import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:8020';

export const authHandlers = [
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { user_name: string; password: string };
    if (body.password === 'wrong') {
      return HttpResponse.json(
        {
          code: 'INVALID_CREDENTIALS',
          message: '아이디 또는 비밀번호가 올바르지 않습니다',
          details: {},
        },
        { status: 401 },
      );
    }
    return HttpResponse.json({
      access_token: 'access.mock.token',
      refresh_token: 'refresh.mock.token',
      token_type: 'Bearer',
    });
  }),

  http.post(`${BASE}/auth/signup`, async ({ request }) => {
    const body = (await request.json()) as { user_name: string; password: string };
    if (body.user_name === 'taken') {
      return HttpResponse.json(
        { code: 'DUPLICATE_USER', message: '이미 사용 중인 사용자 이름입니다', details: {} },
        { status: 409 },
      );
    }
    return HttpResponse.json(
      { user_id: 'u-new', user_name: body.user_name, created_at: '2026-06-05' },
      { status: 201 },
    );
  }),
];
