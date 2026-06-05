import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthContext';

import { userApi } from './api';

export const userKeys = {
  me: ['me'] as const,
};

export function useMe() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: userKeys.me,
    queryFn: userApi.me,
    enabled: isAuthenticated,
  });
}
