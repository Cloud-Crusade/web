import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthContext';
import { useSettlementQuery } from '@/hooks/useSettlementQuery';
import { solveCaptchaToken } from '@/lib/captcha';
import type { PageParams } from '@/types/common';

import { reservationApi } from './api';
import type { ReservationCreateInput } from './schema';

// 예매도 202 비동기 → 단건이 200 으로 잡힐 때까지 폴링 (결제와 동일 정착 모델)
const RESERVATION_POLL_INTERVAL_MS = 1_500;
export const RESERVATION_POLL_TIMEOUT_MS = 30_000;

export const reservationKeys = {
  all: ['reservations'] as const,
  list: (params: PageParams) => ['reservations', params] as const,
  detail: (reservationId: string) => ['reservation', reservationId] as const,
  occupied: (eventId: string) => ['reservations', 'occupied', eventId] as const,
};

// 점유 좌석은 다른 사용자의 예매로 바뀜 → 짧은 staleTime 으로 최신성 확보
const OCCUPIED_STALE_MS = 10_000;

export function useOccupiedSeats(eventId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: reservationKeys.occupied(eventId),
    queryFn: () => reservationApi.occupiedSeats(eventId),
    enabled: isAuthenticated && !!eventId,
    staleTime: OCCUPIED_STALE_MS,
  });
}

export function useMyReservations(params: PageParams) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: reservationKeys.list(params),
    queryFn: () => reservationApi.list(params),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });
}

// 예매 생성(202) 직후 단건 반영을 폴링으로 확인 — 정착(200) 또는 타임아웃까지.
export function useReservationStatus(reservationId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useSettlementQuery({
    queryKey: reservationKeys.detail(reservationId ?? ''),
    queryFn: () => reservationApi.get(reservationId!),
    resetKey: reservationId,
    enabled: isAuthenticated && !!reservationId,
    intervalMs: RESERVATION_POLL_INTERVAL_MS,
    timeoutMs: RESERVATION_POLL_TIMEOUT_MS,
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    // 캡차 활성 시 PoW 토큰을 먼저 풀어 함께 전송 (off 면 undefined → 기존 흐름)
    mutationFn: async (input: ReservationCreateInput) => {
      const captchaToken = await solveCaptchaToken();
      return reservationApi.create(input, captchaToken);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservationKeys.all }),
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: string) => reservationApi.cancel(reservationId),
    onSuccess: (_data, reservationId) => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.detail(reservationId) });
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
    },
  });
}
