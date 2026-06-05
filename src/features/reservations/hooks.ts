import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthContext';
import type { PageParams } from '@/types/common';

import { reservationApi } from './api';
import type { ReservationCreateInput } from './schema';

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

export function useReservation(reservationId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: reservationKeys.detail(reservationId),
    queryFn: () => reservationApi.get(reservationId),
    enabled: isAuthenticated && !!reservationId,
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReservationCreateInput) => reservationApi.create(input),
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
