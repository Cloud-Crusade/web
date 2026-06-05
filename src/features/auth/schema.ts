import { z } from 'zod';

// 백엔드 제약 미러: user_name ≤255, password ≤72
export const loginSchema = z.object({
  user_name: z.string().min(1, '사용자 이름을 입력하세요').max(255),
  password: z.string().min(1, '비밀번호를 입력하세요').max(72),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = loginSchema;
export type SignupInput = z.infer<typeof signupSchema>;
