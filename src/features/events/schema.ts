import { z } from 'zod';

import type { EventRead } from '@/types/event';

// ISO 8601 형식 보장 — start_at < end_at 문자열 비교의 정확성 전제
const scheduleSchema = z.object({
  start_at: z.string().datetime({ message: '시작 시각을 ISO 형식으로 입력하세요' }),
  end_at: z.string().datetime({ message: '종료 시각을 ISO 형식으로 입력하세요' }),
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

// === 등록/수정 폼 ===
// UI 입력(datetime-local "YYYY-MM-DDTHH:mm" · 단일 이미지 URL)을 다루고, 제출 시 API 페이로드로 변환한다.
export const eventFormSchema = z
  .object({
    title: z.string().min(1, '제목을 입력하세요').max(20, '제목은 최대 20자입니다'),
    body: z.string().optional(),
    start_at: z
      .string()
      .min(1, '시작 시각을 입력하세요')
      .refine((s) => !Number.isNaN(Date.parse(s)), '시작 시각이 올바르지 않습니다'),
    end_at: z
      .string()
      .min(1, '종료 시각을 입력하세요')
      .refine((s) => !Number.isNaN(Date.parse(s)), '종료 시각이 올바르지 않습니다'),
    img_url: z.union([z.literal(''), z.string().url('올바른 URL 이 아닙니다')]).optional(),
    total_seats: z
      .number({ message: '좌석 수를 입력하세요' })
      .int()
      .min(1, '좌석 수는 1 이상이어야 합니다'),
  })
  .refine((v) => v.start_at < v.end_at, {
    message: '종료 시각은 시작 시각보다 이후여야 합니다',
    path: ['end_at'],
  });
export type EventFormValues = z.infer<typeof eventFormSchema>;

// 폼 값 → 백엔드 페이로드(등록·수정 공통; 수정도 전체 필드 전송)
export function toEventPayload(values: EventFormValues): EventCreateInput {
  return {
    title: values.title,
    body: values.body?.trim() ? values.body : undefined,
    schedule: {
      start_at: new Date(values.start_at).toISOString(),
      end_at: new Date(values.end_at).toISOString(),
    },
    img_urls: values.img_url ? [values.img_url] : [],
    total_seats: values.total_seats,
  };
}

// ISO → datetime-local 입력 형식("YYYY-MM-DDTHH:mm", 로컬 타임존)
export function isoToDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

// 행사 단건 → 수정 폼 기본값
export function toEventFormValues(event: EventRead): EventFormValues {
  return {
    title: event.title,
    body: event.body ?? '',
    start_at: isoToDateTimeLocal(event.schedule.start_at),
    end_at: isoToDateTimeLocal(event.schedule.end_at),
    img_url: event.img_urls[0] ?? '',
    total_seats: event.total_seats,
  };
}
