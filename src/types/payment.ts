import type { Page } from '@/types/common';

export interface PaymentAccepted {
  payment_history_id: string;
  status: string; // "accepted"
}

export interface PaymentRead {
  payment_history_id: string;
  user_id: string;
  reservation_id: string;
  payment_method: string; // 1~20자
  created_at: string;
}

export type PaymentPage = Page<PaymentRead>;
