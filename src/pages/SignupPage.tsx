import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useSignup } from '@/features/auth/hooks';
import { type SignupInput, signupSchema } from '@/features/auth/schema';
import { toApiError } from '@/lib/apiError';

export default function SignupPage() {
  const navigate = useNavigate();
  const signup = useSignup();

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { user_name: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    signup.mutate(values, {
      onSuccess: () => {
        toast.success('회원가입이 완료되었어요. 로그인해 주세요.');
        navigate('/login', { replace: true });
      },
      onError: (error) => {
        const apiError = toApiError(error);
        // 409 — 사용자 이름 중복
        if (apiError.status === 409) {
          form.setError('user_name', { message: apiError.message });
        }
      },
    });
  });

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">회원가입</CardTitle>
          <CardDescription>사용할 사용자 이름과 비밀번호를 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="user_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>사용자 이름</FormLabel>
                    <FormControl>
                      <Input autoComplete="username" {...field} />
                    </FormControl>
                    <FormDescription>최대 255자</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormDescription>최대 72자</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={signup.isPending}>
                {signup.isPending && <Loader2 className="animate-spin" aria-hidden />}
                회원가입
              </Button>
            </form>
          </Form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
