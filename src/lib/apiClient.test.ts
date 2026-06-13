import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/apiClient';
import { getAccessToken, setTokens } from '@/lib/authToken';
import { queryClient } from '@/lib/queryClient';
import { getReservationToken, setReservationToken } from '@/lib/reservationToken';
import { server } from '@/test/msw/server';

const BASE = 'http://localhost:8020';

const b64url = (obj: unknown) =>
  btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const makeReservationToken = () => `e30.${b64url({ exp: Math.floor(Date.now() / 1000) + 600 })}.sig`;

describe('apiClient 401 인터셉터', () => {
  const reloadSpy = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    reloadSpy.mockClear();
    // jsdom 의 location.reload 는 재정의 불가 → location 전역을 스텁으로 대체
    vi.stubGlobal('location', { href: `${BASE}/protected`, reload: reloadSpy });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('401 후 refresh 성공하면 새 토큰으로 원요청을 재시도한다', async () => {
    setTokens('old.access', 'valid.refresh');
    server.use(
      http.get(`${BASE}/protected`, ({ request }) =>
        request.headers.get('Authorization') === 'Bearer new.access'
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ code: 'INVALID_TOKEN', message: '만료', details: {} }, { status: 401 }),
      ),
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json({ access_token: 'new.access', refresh_token: 'new.refresh', token_type: 'Bearer' }),
      ),
    );

    const { data } = await apiClient.get<{ ok: boolean }>('/protected');

    expect(data.ok).toBe(true);
    expect(getAccessToken()).toBe('new.access');
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('401 후 refresh 가 실패하면 토큰을 비우고 페이지를 새로고침한다', async () => {
    setTokens('old.access', 'invalid.refresh');
    server.use(
      http.get(`${BASE}/protected`, () =>
        HttpResponse.json({ code: 'INVALID_TOKEN', message: '만료', details: {} }, { status: 401 }),
      ),
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json({ code: 'INVALID_TOKEN', message: '만료', details: {} }, { status: 401 }),
      ),
    );

    await expect(apiClient.get('/protected')).rejects.toBeTruthy();

    expect(getAccessToken()).toBeNull();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('리프레시 토큰이 없는 401 은 새로고침 없이 실패하고 잔여 토큰을 정리한다', async () => {
    setReservationToken('reservation.token');
    server.use(
      http.get(`${BASE}/protected`, () =>
        HttpResponse.json({ code: 'INVALID_TOKEN', message: '만료', details: {} }, { status: 401 }),
      ),
    );

    await expect(apiClient.get('/protected')).rejects.toBeTruthy();

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(getReservationToken()).toBeNull();
  });
});

describe('apiClient 403 입장 토큰 거부 처리', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('RESERVATION 헤더를 실은 요청이 403 이면 토큰을 비우고 대기열을 무효화한다', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    setTokens('valid.access', 'valid.refresh');
    setReservationToken(makeReservationToken());
    server.use(
      http.get(`${BASE}/reservations`, () =>
        HttpResponse.json({ code: 'FORBIDDEN', message: '입장 권한 없음', details: {} }, { status: 403 }),
      ),
    );

    await expect(apiClient.get('/reservations')).rejects.toBeTruthy();

    expect(getReservationToken()).toBeNull();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['queue'] });
  });

  it('RESERVATION 헤더가 없는 403 은 대기열을 무효화하지 않는다', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    setTokens('valid.access', 'valid.refresh');
    server.use(
      http.get(`${BASE}/events/1`, () =>
        HttpResponse.json({ code: 'FORBIDDEN', message: '권한 없음', details: {} }, { status: 403 }),
      ),
    );

    await expect(apiClient.get('/events/1')).rejects.toBeTruthy();

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
