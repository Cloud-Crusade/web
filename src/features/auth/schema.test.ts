import { describe, expect, it } from 'vitest';

import { loginSchema } from './schema';

describe('loginSchema', () => {
  it('올바른 입력을 통과시킨다', () => {
    const result = loginSchema.safeParse({ user_name: 'tester', password: 'password1234' });
    expect(result.success).toBe(true);
  });

  it.each([
    ['', 'password1234', 'user_name'],
    ['tester', '', 'password'],
  ])('빈 입력(%s/%s)은 %s 필드에서 실패한다', (user_name, password, field) => {
    const result = loginSchema.safeParse({ user_name, password });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe(field);
    }
  });
});
