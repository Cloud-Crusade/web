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
import { useCancelReservation, useReservationStatus } from '@/features/reservations/hooks';
import { formatDateTime } from '@/lib/format';

export default function ReservationDetailPage() {
  const { reservationId = '' } = useParams();
  // 202 직후 단건이 아직 안 잡힐 수 있어 정착까지 폴링
  const { data, hasTimedOut, retry } = useReservationStatus(reservationId);
  const cancel = useCancelReservation();

  // 잘못된 id → 빈 상태
  if (!reservationId) {
    return (
      <EmptyState
        title="예매를 찾을 수 없어요"
        action={
          <Button asChild variant="outline">
            <Link to="/reservations">내 예매로</Link>
          </Button>
        }
      />
    );
  }

  if (!data) {
    // 타임아웃 — 실패·부재 단정 금지(비동기라 나중에 반영될 수 있음). 지연 안내 + 재시도 (04 룰셋)
    if (hasTimedOut) {
      return (
        <div className="space-y-2 rounded-lg border border-border p-4" aria-live="polite">
          <p className="text-sm font-medium">예매 확인이 지연되고 있어요.</p>
          <p className="text-sm text-muted-foreground">
            잠시 후 내 예매에서 확인하거나 다시 시도해 주세요.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => retry()}>
              다시 시도
            </Button>
            <Button asChild variant="ghost">
              <Link to="/reservations">내 예매로</Link>
            </Button>
          </div>
        </div>
      );
    }

    // 정착 전(폴링 중) — 스켈레톤
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
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
