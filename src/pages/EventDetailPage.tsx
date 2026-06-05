import { CalendarDays, Ticket } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EventImage } from '@/features/events/components/EventImage';
import { useEvent } from '@/features/events/hooks';
import { ReserveAction } from '@/features/reservations/components/ReserveAction';
import { toApiError } from '@/lib/apiError';
import { formatDateRange } from '@/lib/format';

export default function EventDetailPage() {
  const { eventId = '' } = useParams();
  const { data, isPending, isError, error } = useEvent(eventId);

  if (eventId && isPending) {
    return <EventDetailSkeleton />;
  }

  // eventId 누락(쿼리 비활성) · 에러 · 데이터 없음을 모두 안전하게 분기
  if (!eventId || isError || !data) {
    const notFound = !eventId || (isError && toApiError(error).status === 404);
    return (
      <EmptyState
        title={notFound ? '존재하지 않는 행사예요' : '행사를 불러오지 못했어요'}
        action={
          <Button asChild variant="outline">
            <Link to="/events">행사 목록으로</Link>
          </Button>
        }
      />
    );
  }

  return (
    <article className="space-y-6">
      <EventImage src={data.img_urls[0]} alt={data.title} className="rounded-xl" />

      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden />
            {formatDateRange(data.schedule.start_at, data.schedule.end_at)}
          </span>
          <Badge variant="secondary" className="gap-1">
            <Ticket className="size-3.5" aria-hidden />
            전체 {data.total_seats}석
          </Badge>
        </div>

        {data.body && <p className="whitespace-pre-wrap leading-relaxed">{data.body}</p>}
      </div>

      <ReserveAction eventId={data.event_id} totalSeats={data.total_seats} />
    </article>
  );
}

function EventDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
