import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { useAuth } from '@/features/auth/AuthContext';
import type { PageParams } from '@/types/common';

import { paymentApi } from './api';
import type { PaymentCreateInput } from './schema';

// 결제는 202 비동기(SQS→Lambda) → 단건 조회가 200 으로 잡힐 때까지 폴링 (02/03/09 룰셋)
const PAYMENT_POLL_INTERVAL_MS = 1_500;
const PAYMENT_POLL_TIMEOUT_MS = 30_000;

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

// 결제 생성(202) 직후 반영을 폴링으로 확인. 단건이 200 으로 잡히면(success) 폴링 종료.
export function usePaymentStatus(paymentHistoryId: string | undefined) {
  const { isAuthenticated } = useAuth();
  const startedAt = useRef(Date.now());
  return useQuery({
    queryKey: paymentKeys.detail(paymentHistoryId ?? ''),
    queryFn: () => paymentApi.get(paymentHistoryId!),
    enabled: isAuthenticated && !!paymentHistoryId,
    staleTime: 0,
    retry: false,
    refetchInterval: (query) => {
      if (query.state.status === 'success') return false; // 결제 기록 반영됨 → 완료
      if (Date.now() - startedAt.current > PAYMENT_POLL_TIMEOUT_MS) return false; // 타임아웃
      return PAYMENT_POLL_INTERVAL_MS; // 미반영(404 등) → 계속 폴링
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentCreateInput) => paymentApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
  });
}
