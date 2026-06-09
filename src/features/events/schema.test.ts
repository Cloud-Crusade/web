import { describe, expect, it } from 'vitest';

import type { EventRead } from '@/types/event';

import { type EventFormValues, toEventFormValues, toEventPayload } from './schema';

const baseValues: EventFormValues = {
  title: '콘서트',
  body: '설명',
  start_at: '2026-12-31T19:00',
  end_at: '2026-12-31T21:00',
  img_url: 'https://img.test/a.png',
  total_seats: 50,
};

describe('toEventPayload', () => {
  it('datetime-local 을 ISO 로 변환하고 단일 URL 을 배열로 만든다', () => {
    const payload = toEventPayload(baseValues);
    expect(new Date(payload.schedule.start_at).getTime()).toBe(
      new Date('2026-12-31T19:00').getTime(),
    );
    expect(payload.img_urls).toEqual(['https://img.test/a.png']);
    expect(payload.total_seats).toBe(50);
  });

  it('빈 이미지 URL 은 빈 배열, 공백뿐인 설명은 undefined', () => {
    const payload = toEventPayload({ ...baseValues, img_url: '', body: '   ' });
    expect(payload.img_urls).toEqual([]);
    expect(payload.body).toBeUndefined();
  });
});

describe('toEventFormValues', () => {
  it('행사 단건을 폼 기본값으로 역변환하고 시각 round-trip 이 보존된다', () => {
    const event = {
      event_id: 'e1',
      user_id: 'u1',
      title: 'T',
      body: '본문',
      schedule: { start_at: '2026-12-31T19:00:00Z', end_at: '2026-12-31T21:00:00Z' },
      img_urls: ['https://img/a'],
      total_seats: 30,
      created_at: '2026-06-01',
    } satisfies EventRead;

    const values = toEventFormValues(event);
    expect(values.title).toBe('T');
    expect(values.img_url).toBe('https://img/a');
    expect(values.total_seats).toBe(30);
    // datetime-local 형식
    expect(values.start_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    // 폼값 → payload 변환 시 원래 시각(UTC) 보존
    expect(new Date(toEventPayload(values).schedule.start_at).toISOString()).toBe(
      '2026-12-31T19:00:00.000Z',
    );
  });
});
