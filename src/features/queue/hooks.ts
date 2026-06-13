import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthContext';
import { getReservationToken, setReservationToken } from '@/lib/reservationToken';
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

// 입장 판정 — COMPLETED 이면서 유효한(만료 안 된) 입장 토큰 보유. 토큰 만료 시 재대기열 대상.
export function isQueueAdmitted(data: QueueResponse | undefined): boolean {
  return isQueueCompleted(data) && getReservationToken() != null;
}

export function useQueueStatus(eventId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queueKeys.status(eventId),
    // 입장 완료 시 발급 토큰을 즉시 저장 → 렌더 레이스 없이 게이트/인터셉터가 같은 토큰을 본다
    queryFn: async () => {
      const data = await queueApi.getStatus(eventId);
      if (data.code === QUEUE_COMPLETED && data.data?.token) {
        setReservationToken(data.data.token);
      }
      return data;
    },
    enabled: isAuthenticated && !!eventId,
    staleTime: 0,
    refetchInterval: (q) => {
      // 에러(네트워크/401/500) 시 폴링 중단 — 재시도 스팸 방지(QueuePage 가 에러 UI 노출)
      if (q.state.status === 'error') return false;
      return q.state.data?.code === QUEUE_COMPLETED ? false : QUEUE_POLL_INTERVAL_MS;
    },
  });
}
