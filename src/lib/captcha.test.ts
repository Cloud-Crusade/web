import { createHash } from 'node:crypto';

import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/test/msw/server';

import { solveCaptchaToken } from './captcha';

const BASE = 'http://localhost:8020';

describe('solveCaptchaToken', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('플래그 off 면 토큰 없이 undefined 를 반환한다', async () => {
    vi.stubEnv('VITE_CAPTCHA_ENABLED', 'false');
    expect(await solveCaptchaToken()).toBeUndefined();
  });

  it('플래그 on 이면 PoW 를 풀어 유효한 ALTCHA 토큰을 만든다', async () => {
    vi.stubEnv('VITE_CAPTCHA_ENABLED', 'true');
    const salt = 'abc123.9999999999';
    const number = 7;
    const challenge = createHash('sha256').update(`${salt}${number}`).digest('hex');
    server.use(
      http.get(`${BASE}/captcha/challenge`, () =>
        HttpResponse.json({
          algorithm: 'SHA-256',
          challenge,
          maxnumber: 50,
          salt,
          signature: 'server-sig',
        }),
      ),
    );

    const token = await solveCaptchaToken();

    expect(token).toBeDefined();
    const decoded = JSON.parse(atob(token!)) as {
      number: number;
      challenge: string;
      signature: string;
    };
    expect(decoded.number).toBe(number);
    expect(decoded.challenge).toBe(challenge);
    expect(decoded.signature).toBe('server-sig');
  });

  it('PoW 를 풀 수 없으면 무효 토큰 대신 에러를 throw 한다', async () => {
    vi.stubEnv('VITE_CAPTCHA_ENABLED', 'true');
    server.use(
      http.get(`${BASE}/captcha/challenge`, () =>
        HttpResponse.json({
          algorithm: 'SHA-256',
          challenge: 'f'.repeat(64), // 범위 내 어떤 number 로도 안 나오는 해시
          maxnumber: 20,
          salt: 'no-solution',
          signature: 'sig',
        }),
      ),
    );

    await expect(solveCaptchaToken()).rejects.toMatchObject({ code: 'CAPTCHA_SOLVE_FAILED' });
  });

  it('지원하지 않는 알고리즘이면 에러를 throw 한다', async () => {
    vi.stubEnv('VITE_CAPTCHA_ENABLED', 'true');
    server.use(
      http.get(`${BASE}/captcha/challenge`, () =>
        HttpResponse.json({
          algorithm: 'MD5',
          challenge: 'x',
          maxnumber: 1,
          salt: 's',
          signature: 'sig',
        }),
      ),
    );

    await expect(solveCaptchaToken()).rejects.toMatchObject({ code: 'CAPTCHA_UNSUPPORTED' });
  });
});
