import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  PAYMENT_POLL_TIMEOUT_MS,
  useCreatePayment,
  usePaymentStatus,
} from '@/features/payments/hooks';

// 백엔드 제약 미러: payment_method 1~20자 (mock 문자열)
const payFormSchema = z.object({
  payment_method: z
    .string()
    .min(1, '결제 수단을 입력하세요')
    .max(20, '결제 수단은 20자 이내로 입력하세요'),
});
type PayFormValues = z.infer<typeof payFormSchema>;

export function PayAction({ reservationId }: { reservationId: string }) {
  const [paymentId, setPaymentId] = useState<string>();
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const create = useCreatePayment();
  // 타임아웃 후에는 폴링 비활성화 (undefined → enabled=false)
  const { data: payment } = usePaymentStatus(hasTimedOut ? undefined : paymentId);

  const form = useForm<PayFormValues>({
    resolver: zodResolver(payFormSchema),
    defaultValues: { payment_method: '' },
  });

  // 결제 접수 후 일정 시간 내 반영 안 되면 타임아웃 처리 (무한 '처리 중' 방지)
  useEffect(() => {
    if (paymentId == null || payment != null || hasTimedOut) return;
    const timer = setTimeout(() => setHasTimedOut(true), PAYMENT_POLL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [paymentId, payment, hasTimedOut]);

  // 폴링으로 결제 기록이 잡힘 → 완료
  if (payment) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-border p-4 text-primary"
        aria-live="polite"
      >
        <CheckCircle2 className="size-4" aria-hidden />
        <p className="text-sm font-medium">결제 완료 ({payment.payment_method})</p>
      </div>
    );
  }

  const retry = () => {
    setHasTimedOut(false);
    setPaymentId(undefined);
    form.reset();
  };

  // 타임아웃 — 실패 단정 금지(비동기라 나중에 반영될 수 있음). 안내 + 재시도 (04 룰셋)
  if (hasTimedOut) {
    return (
      <div className="space-y-2 rounded-lg border border-border p-4" aria-live="polite">
        <p className="text-sm font-medium">결제 확인이 지연되고 있어요.</p>
        <p className="text-sm text-muted-foreground">
          잠시 후 결제 내역에서 확인하거나 다시 시도해 주세요.
        </p>
        <Button variant="outline" onClick={retry}>
          다시 시도
        </Button>
      </div>
    );
  }

  // 202 접수 후 폴링 중(또는 제출 중) — 중복 제출 차단
  if (create.isPending || paymentId != null) {
    return (
      <div className="space-y-1 rounded-lg border border-border p-4" aria-live="polite">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          결제 처리 중이에요...
        </p>
        <p className="text-sm text-muted-foreground">잠시 후 자동으로 반영돼요.</p>
      </div>
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      { reservation_id: reservationId, payment_method: values.payment_method },
      { onSuccess: ({ payment_history_id }) => setPaymentId(payment_history_id) },
    );
  });

  return (
    <Form {...form}>
      <form
        onSubmit={onSubmit}
        className="flex items-end gap-3 rounded-lg border border-border p-4"
      >
        <FormField
          control={form.control}
          name="payment_method"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>결제 수단</FormLabel>
              <FormControl>
                <Input placeholder="예: 신용카드" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">결제하기</Button>
      </form>
    </Form>
  );
}
