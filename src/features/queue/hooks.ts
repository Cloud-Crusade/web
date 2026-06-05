import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthContext';
import { setReservationToken } from '@/lib/reservationToken';
import type { QueueResponse } from '@/types/queue';

import { queueApi } from './api';

// 대기열 순번은 입장 전까지 주기적으로 폴링 (COMPLETED 면 중단)
const QUEUE_POLL_INTERVAL_MS = 2_000;
const QUEUE_COMPLETED = 'COMPLETED';

export const queueKeys = {
  status: (eventId: string) => ['queue', eventId] as const,
};

export function isQueueCompleted(data: QueueResponse | undefined): boolean {
  return data?.code === QUEUE_COMPLETED;
}

export function useQueueStatus(eventId: string) {
  const { isAuthenticated } = useAuth();
  const query = useQuery({
    queryKey: queueKeys.status(eventId),
    queryFn: () => queueApi.getStatus(eventId),
    enabled: isAuthenticated && !!eventId,
    staleTime: 0,
    refetchInterval: (q) => {
      // 에러(네트워크/401/500) 시 폴링 중단 — 재시도 스팸 방지(QueuePage 가 에러 UI 노출)
      if (q.state.status === 'error') return false;
      return q.state.data?.code === QUEUE_COMPLETED ? false : QUEUE_POLL_INTERVAL_MS;
    },
  });

  // 입장 완료 시 발급된 토큰을 저장 → 이후 요청의 RESERVATION 헤더로 주입(apiClient)
  const token = query.data?.code === QUEUE_COMPLETED ? query.data.data?.token : undefined;
  useEffect(() => {
    if (token) {
      setReservationToken(token);
    }
  }, [token]);

  return query;
}
