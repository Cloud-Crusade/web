import { CalendarOff, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { QueryErrorState } from '@/components/QueryErrorState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/AuthContext';
import { EventCard } from '@/features/events/components/EventCard';
import { useEvents } from '@/features/events/hooks';
import { usePageParam } from '@/hooks/usePageParam';

const PAGE_SIZE = 12;

export default function EventListPage() {
  const { isAuthenticated } = useAuth();
  const { page, goToPage } = usePageParam();

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useEvents({
    page,
    size: PAGE_SIZE,
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">행사</h1>
        {isAuthenticated && (
          <Button asChild size="sm">
            <Link to="/events/new">
              <Plus aria-hidden />
              행사 등록
            </Link>
          </Button>
        )}
      </div>

      {isPending ? (
        <EventGridSkeleton />
      ) : isError ? (
        <QueryErrorState error={error} onRetry={refetch} message="행사를 불러오지 못했어요." />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="등록된 행사가 없어요"
          description="새 행사가 등록되면 여기에 표시됩니다."
        />
      ) : (
        <>
          <ul
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy={isPlaceholderData}
          >
            {data.items.map((event) => (
              <li key={event.event_id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            size={PAGE_SIZE}
            total={data.total}
            disableNext={isPlaceholderData}
            onChange={goToPage}
          />
        </>
      )}
    </section>
  );
}

function EventGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-border p-4">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
