import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSettlementQuery } from '@/hooks/useSettlementQuery';
import { createQueryWrapper } from '@/test/utils';

const base = { resetKey: 'id', enabled: true, intervalMs: 20, timeoutMs: 1_000 };

describe('useSettlementQuery', () => {
  it('단건이 잡히면 정착(isSettled)으로 표시한다', async () => {
    const { result } = renderHook(
      () =>
        useSettlementQuery({
          ...base,
          queryKey: ['s', 1],
          queryFn: () => Promise.resolve({ ok: true }),
        }),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => expect(result.current.isSettled).toBe(true));
    expect(result.current.hasTimedOut).toBe(false);
  });

  it('첫 조회가 실패해도 폴링으로 정착한다', async () => {
    let calls = 0;
    const { result } = renderHook(
      () =>
        useSettlementQuery({
          ...base,
          queryKey: ['s', 2],
          queryFn: () => {
            calls += 1;
            return calls === 1 ? Promise.reject(new Error('404')) : Promise.resolve({ ok: true });
          },
        }),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => expect(result.current.isSettled).toBe(true), { timeout: 2_000 });
  });

  it('타임아웃까지 미정착이면 hasTimedOut 으로 표시한다', async () => {
    const { result } = renderHook(
      () =>
        useSettlementQuery({
          ...base,
          timeoutMs: 50,
          queryKey: ['s', 3],
          queryFn: () => Promise.reject(new Error('404')),
        }),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => expect(result.current.hasTimedOut).toBe(true), { timeout: 2_000 });
    expect(result.current.isSettled).toBe(false);
  });
});
