import { apiClient } from '@/lib/apiClient';
import type { PageParams } from '@/types/common';
import type { PaymentAccepted, PaymentPage, PaymentRead } from '@/types/payment';

import type { PaymentCreateInput } from './schema';

const BASE = '/payments';

export const paymentApi = {
  async list(params: PageParams): Promise<PaymentPage> {
    const { data } = await apiClient.get<PaymentPage>(BASE, { params });
    return data;
  },

  async get(paymentHistoryId: string): Promise<PaymentRead> {
    const { data } = await apiClient.get<PaymentRead>(`${BASE}/${paymentHistoryId}`);
    return data;
  },

  // 202 Accepted — 비동기 write
  async create(payload: PaymentCreateInput): Promise<PaymentAccepted> {
    const { data } = await apiClient.post<PaymentAccepted>(BASE, payload);
    return data;
  },
};
