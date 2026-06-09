import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PageParams } from '@/types/common';

import { eventApi } from './api';
import type { EventCreateInput, EventUpdateInput } from './schema';

export const eventKeys = {
  all: ['events'] as const,
  list: (params: PageParams) => ['events', params] as const,
  detail: (eventId: string) => ['event', eventId] as const,
};

export function useEvents(params: PageParams) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => eventApi.list(params),
    // 페이지 이동 시 이전 데이터 유지로 깜빡임 방지 (09-performance)
    placeholderData: keepPreviousData,
  });
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: eventKeys.detail(eventId),
    queryFn: () => eventApi.get(eventId),
    enabled: !!eventId,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EventCreateInput) => eventApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.all }),
  });
}

export function useUpdateEvent(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EventUpdateInput) => eventApi.update(eventId, input),
    onSuccess: () => {
      // 단건·목록 모두 갱신
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => eventApi.remove(eventId),
    onSuccess: (_data, eventId) => {
      // 단건 캐시 제거 + 목록 갱신
      queryClient.removeQueries({ queryKey: eventKeys.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}
