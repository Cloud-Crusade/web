import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

import { server } from './msw/server';

// 모든 테스트가 공유하는 단일 MSW 서버 — mock 하지 않은 요청은 즉시 실패시킨다
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// 로컬 .env(VITE_CAPTCHA_ENABLED) 와 무관하게 테스트는 캡차 비활성 고정 — 캡차 테스트가 명시적으로 켠다
beforeEach(() => vi.stubEnv('VITE_CAPTCHA_ENABLED', 'false'));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.unstubAllEnvs(); // env 스텁(vi.stubEnv)이 다음 테스트로 새지 않도록 전역 정리
});
afterAll(() => server.close());
