import { beforeEach, describe, expect, it } from 'vitest';

import { getReservationToken, setReservationToken } from '@/lib/reservationToken';

const b64url = (obj: unknown) =>
  btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// header.payload.signature 형태의 가짜 JWT (서명은 검증 안 하므로 임의값)
const makeToken = (payload: Record<string, unknown>) => `e30.${b64url(payload)}.sig`;

describe('getReservationToken', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('만료되지 않은 토큰은 그대로 반환한다', () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) + 600 });
    setReservationToken(token);

    expect(getReservationToken()).toBe(token);
  });

  it('만료된 토큰은 정리하고 null 을 반환한다', () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) - 1 });
    setReservationToken(token);

    expect(getReservationToken()).toBeNull();
    expect(localStorage.getItem('cc.reservation')).toBeNull();
  });

  it('exp 가 없는 토큰은 정리하고 null 을 반환한다', () => {
    setReservationToken(makeToken({ user_id: 'u1' }));

    expect(getReservationToken()).toBeNull();
    expect(localStorage.getItem('cc.reservation')).toBeNull();
  });

  it('JWT 형식이 아닌 값은 정리하고 null 을 반환한다', () => {
    setReservationToken('not-a-jwt');

    expect(getReservationToken()).toBeNull();
    expect(localStorage.getItem('cc.reservation')).toBeNull();
  });

  it('토큰이 없으면 null 을 반환한다', () => {
    expect(getReservationToken()).toBeNull();
  });
});
