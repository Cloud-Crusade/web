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
});
