import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { usePageParam } from '@/hooks/usePageParam';

function wrapper(initialEntry: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  );
}

describe('usePageParam', () => {
  it('page 파라미터가 없으면 1을 반환한다', () => {
    const { result } = renderHook(() => usePageParam(), { wrapper: wrapper('/events') });
    expect(result.current.page).toBe(1);
  });

  it('유효한 page 파라미터를 파싱한다', () => {
    const { result } = renderHook(() => usePageParam(), { wrapper: wrapper('/events?page=3') });
    expect(result.current.page).toBe(3);
  });

  it.each(['foo', '0', '-2'])('잘못된 page(%s)는 1로 폴백한다', (raw) => {
    const { result } = renderHook(() => usePageParam(), {
      wrapper: wrapper(`/events?page=${raw}`),
    });
    expect(result.current.page).toBe(1);
  });

  it('goToPage 가 page 파라미터를 갱신한다', () => {
    const { result } = renderHook(() => usePageParam(), { wrapper: wrapper('/events?page=1') });
    act(() => result.current.goToPage(2));
    expect(result.current.page).toBe(2);
  });
});
