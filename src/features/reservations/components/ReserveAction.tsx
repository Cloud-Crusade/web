import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
import { useAuth } from '@/features/auth/AuthContext';
import { useCreateReservation } from '@/features/reservations/hooks';

// reserved_num 은 좌석 번호(1..total_seats) — 개수가 아니다
const makeReserveFormSchema = (totalSeats: number) =>
  z.object({
    reserved_num: z
      .number({ message: '좌석 번호를 입력하세요' })
      .int()
      .min(1, '좌석 번호는 1 이상이에요')
      .max(totalSeats, `좌석 번호는 1~${totalSeats}번 중에서 선택하세요`),
  });
type ReserveFormValues = z.infer<ReturnType<typeof makeReserveFormSchema>>;

export function ReserveAction({
  eventId,
  totalSeats,
}: {
  eventId: string;
  totalSeats: number;
}) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const create = useCreateReservation();

  const form = useForm<ReserveFormValues>({
    resolver: zodResolver(makeReserveFormSchema(totalSeats)),
    defaultValues: { reserved_num: 1 },
  });

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-border p-4">
        <p className="mb-3 text-sm text-muted-foreground">예매하려면 로그인이 필요해요.</p>
        <Button onClick={() => navigate('/login', { state: { from: location } })}>
          로그인하고 예매하기
        </Button>
      </div>
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      { event_id: eventId, reserved_num: values.reserved_num },
      {
        onSuccess: ({ reservation_id }) => {
          toast.success('예매 요청을 접수했어요. 처리 결과를 확인하세요.');
          navigate(`/reservations/${reservation_id}`);
        },
      },
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
          name="reserved_num"
          render={({ field }) => (
            <FormItem className="w-28">
              <FormLabel>좌석 번호</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={totalSeats}
                  {...field}
                  onChange={(e) =>
                    field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={create.isPending}>
          {create.isPending && <Loader2 className="animate-spin" aria-hidden />}
          {create.isPending ? '예매 처리 중...' : '예매하기'}
        </Button>
      </form>
    </Form>
  );
}
