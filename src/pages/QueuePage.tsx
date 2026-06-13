import { Loader2 } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { isQueueCompleted, useQueueStatus } from '@/features/queue/hooks';

export default function QueuePage() {
  const { eventId = '' } = useParams();
  const { data, isError } = useQueueStatus(eventId);

  if (!eventId) {
    return <Navigate to="/events" replace />;
  }

  // 입장 완료(COMPLETED) → 토큰은 useQueueStatus 가 저장, 예매 화면(이벤트 상세)으로 복귀
  if (isQueueCompleted(data)) {
    return <Navigate to={`/events/${eventId}`} replace />;
  }

  if (isError) {
    return (
      <EmptyState
        title="대기열 정보를 불러오지 못했어요"
        action={
          <Button asChild variant="outline">
            <Link to="/events">행사 목록으로</Link>
          </Button>
        }
      />
    );
  }

  return (
    <section className="flex flex-col items-center gap-4 py-16 text-center" aria-live="polite">
      <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
      <h1 className="text-2xl font-bold tracking-tight">예매 대기 중이에요</h1>
      {data?.data?.remaining != null ? (
        <div className="space-y-1 text-muted-foreground">
          {data.data.queue_number != null && (
            <p>
              내 대기 번호{' '}
              <span className="font-semibold text-foreground">{data.data.queue_number}</span>번
            </p>
          )}
          <p>
            앞에 <span className="font-semibold text-foreground">{data.data.remaining}</span>명 남았어요
            — 곧 입장돼요.
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground">{data?.message ?? '대기열 정보를 확인하고 있어요...'}</p>
      )}
      <p className="text-sm text-muted-foreground">
        이 페이지를 벗어나지 마세요. 순서가 되면 자동으로 입장됩니다.
      </p>
    </section>
  );
}
