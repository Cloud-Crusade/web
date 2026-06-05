import { z } from 'zod';

// 백엔드 제약 미러: payment_method 1~20자
export const paymentCreateSchema = z.object({
  reservation_id: z.string().min(1),
  payment_method: z.string().min(1, '결제 수단을 입력하세요').max(20),
});
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
