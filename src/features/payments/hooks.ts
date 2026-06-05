import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthContext';
import type { PageParams } from '@/types/common';

import { paymentApi } from './api';
import type { PaymentCreateInput } from './schema';

export const paymentKeys = {
  all: ['payments'] as const,
  list: (params: PageParams) => ['payments', params] as const,
  detail: (paymentHistoryId: string) => ['payment', paymentHistoryId] as const,
};

export function useMyPayments(params: PageParams) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => paymentApi.list(params),
    enabled: isAuthenticated,
  });
}

export function usePayment(paymentHistoryId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: paymentKeys.detail(paymentHistoryId),
    queryFn: () => paymentApi.get(paymentHistoryId),
    enabled: isAuthenticated && !!paymentHistoryId,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentCreateInput) => paymentApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
  });
}
