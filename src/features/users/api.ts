import { apiClient } from '@/lib/apiClient';
import type { UserRead } from '@/types/user';

export const userApi = {
  async me(): Promise<UserRead> {
    const { data } = await apiClient.get<UserRead>('/users/me');
    return data;
  },
};
