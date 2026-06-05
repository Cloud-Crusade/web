import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createQueryWrapper } from '@/test/utils';

import { useEvents } from './hooks';

describe('useEvents', () => {
  it('행사 목록을 불러온다', async () => {
    const { result } = renderHook(() => useEvents({ page: 1, size: 20 }), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0].title).toBe('테스트 콘서트');
  });
});
