import { z } from 'zod';

const scheduleSchema = z.object({
  start_at: z.string().min(1, '시작 시각을 입력하세요'),
  end_at: z.string().min(1, '종료 시각을 입력하세요'),
});

// 백엔드 제약 미러: title ≤20, total_seats ≥1, start_at < end_at
export const eventCreateSchema = z
  .object({
    title: z.string().min(1, '제목을 입력하세요').max(20),
    body: z.string().optional(),
    schedule: scheduleSchema,
    img_urls: z.array(z.string().url('올바른 URL 이 아닙니다')).default([]),
    total_seats: z.number().int().min(1, '좌석 수는 1 이상이어야 합니다'),
  })
  .refine((v) => v.schedule.start_at < v.schedule.end_at, {
    message: '종료 시각은 시작 시각보다 이후여야 합니다',
    path: ['schedule', 'end_at'],
  });
export type EventCreateInput = z.infer<typeof eventCreateSchema>;

export const eventUpdateSchema = z.object({
  title: z.string().min(1).max(20).optional(),
  body: z.string().optional(),
  schedule: scheduleSchema.optional(),
  img_urls: z.array(z.string().url()).optional(),
  total_seats: z.number().int().min(1).optional(),
});
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
