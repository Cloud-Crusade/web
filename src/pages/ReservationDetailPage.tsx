import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EmptyState } from '@/components/EmptyState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PayAction } from '@/features/payments/components/PayAction';
import { ReservationStatusBadge } from '@/features/reservations/components/ReservationStatusBadge';
import { useCancelReservation, useReservation } from '@/features/reservations/hooks';
import { toApiError } from '@/lib/apiError';
import { formatDateTime } from '@/lib/format';

export default function ReservationDetailPage() {
  const { reservationId = '' } = useParams();
  const { data, isPending, isError, error } = useReservation(reservationId);
  const cancel = useCancelReservation();

  if (reservationId && isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (!reservationId || isError || !data) {
    const notFound = !reservationId || (isError && toApiError(error).status === 404);
    return (
      <EmptyState
        title={notFound ? '예매를 찾을 수 없어요' : '예매를 불러오지 못했어요'}
        action={
          <Button asChild variant="outline">
            <Link to="/reservations">내 예매로</Link>
          </Button>
        }
      />
    );
  }

  const onCancel = () => {
    cancel.mutate(reservationId, {
      onSuccess: () => toast.success('예매 취소 요청을 접수했어요.'),
    });
  };

  return (
    <article className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">예매 상세</h1>
        <ReservationStatusBadge isCanceled={data.is_canceled} pending={cancel.isPending} />
      </div>

      <dl className="space-y-3 rounded-lg border border-border p-4">
        <Row label="좌석 번호" value={`${data.reserved_num}번`} />
        <Row label="예매일" value={formatDateTime(data.created_at)} />
        <Row
          label="행사"
          value={
            <Link to={`/events/${data.event_id}`} className="underline underline-offset-4">
              행사 보기
            </Link>
          }
        />
      </dl>

      {!data.is_canceled && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">결제</h2>
          <PayAction reservationId={reservationId} />
        </section>
      )}

      {!data.is_canceled && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={cancel.isPending}>
              예매 취소
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>예매를 취소할까요?</AlertDialogTitle>
              <AlertDialogDescription>
                취소 후에는 되돌릴 수 없어요. 같은 좌석은 다른 사용자가 예매할 수 있어요.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>닫기</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onCancel}
              >
                예매 취소
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </article>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
