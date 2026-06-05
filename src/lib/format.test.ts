import { describe, expect, it } from 'vitest';

import { formatDateTime } from './format';

describe('formatDateTime', () => {
  it('ISO 문자열을 한국어 날짜로 포맷한다', () => {
    expect(formatDateTime('2026-06-15T10:00:00Z')).toContain('2026');
  });

  it('잘못된 문자열은 원본을 그대로 반환한다', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
  });
});
