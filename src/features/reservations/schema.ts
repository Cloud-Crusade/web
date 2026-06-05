import { z } from 'zod';

// 백엔드 제약 미러: reserved_num ≥1
export const reservationCreateSchema = z.object({
  event_id: z.string().min(1),
  reserved_num: z.number().int().min(1, '예매 수량은 1 이상이어야 합니다'),
});
export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>;
