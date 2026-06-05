import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { isUnauthorized, isValidationError, toApiError } from '@/lib/apiError';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const e = toApiError(error);
        if (e.status >= 400 && e.status < 500) return false; // 4xx 재시도 무의미
        return failureCount < 2;
      },
    },
  },
  // 쓰기 실패는 전역 토스트 (401·422 는 각 화면이 처리)
  mutationCache: new MutationCache({
    onError: (error) => {
      const e = toApiError(error);
      if (isUnauthorized(e) || isValidationError(e)) return;
      toast.error(e.message);
    },
  }),
});
