import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthContext';
import type { PageParams } from '@/types/common';

import { reservationApi } from './api';
import type { ReservationCreateInput } from './schema';

export const reservationKeys = {
  all: ['reservations'] as const,
  list: (params: PageParams) => ['reservations', params] as const,
  detail: (reservationId: string) => ['reservation', reservationId] as const,
};

export function useMyReservations(params: PageParams) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: reservationKeys.list(params),
    queryFn: () => reservationApi.list(params),
    enabled: isAuthenticated,
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
