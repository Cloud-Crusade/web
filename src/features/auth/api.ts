import { apiClient } from '@/lib/apiClient';
import type { TokenPair } from '@/types/auth';
import type { UserRead } from '@/types/user';

import type { LoginInput, SignupInput } from './schema';

const BASE = '/auth';

export const authApi = {
  async login(payload: LoginInput): Promise<TokenPair> {
    const { data } = await apiClient.post<TokenPair>(`${BASE}/login`, payload);
    return data;
  },

  async signup(payload: SignupInput): Promise<UserRead> {
    const { data } = await apiClient.post<UserRead>(`${BASE}/signup`, payload);
    return data;
  },
};
