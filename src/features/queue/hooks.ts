import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthContext';

import { queueApi } from './api';

// 대기열 순번은 입장 전까지 주기적으로 폴링 (admitted 면 중단)
const QUEUE_POLL_INTERVAL_MS = 2_000;

export const queueKeys = {
  status: (eventId: string) => ['queue', eventId] as const,
};

export function useQueueStatus(eventId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queueKeys.status(eventId),
    queryFn: () => queueApi.getStatus(eventId),
    enabled: isAuthenticated && !!eventId,
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.status === 'admitted' ? false : QUEUE_POLL_INTERVAL_MS,
  });
}
