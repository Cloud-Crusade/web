import { z } from 'zod';

// 백엔드 제약 미러: reserved_num 은 좌석 번호(≥1)
export const reservationCreateSchema = z.object({
  event_id: z.string().min(1),
  reserved_num: z.number().int().min(1, '좌석 번호는 1 이상이어야 합니다'),
});
export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>;
