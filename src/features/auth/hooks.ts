import { useMutation } from '@tanstack/react-query';

import { authApi } from './api';
import { useAuth } from './AuthContext';

export function useLogin() {
  const { login } = useAuth();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (tokens) => login(tokens),
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: authApi.signup,
  });
}
