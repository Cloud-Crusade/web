import { CalendarOff, Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/AuthContext';
import { EventCard } from '@/features/events/components/EventCard';
import { useEvents } from '@/features/events/hooks';

const PAGE_SIZE = 12;

export default function EventListPage() {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  // 잘못된 page 파라미터(?page=foo 등)는 1로 폴백
  const parsedPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const { data, isPending, isError, refetch, isPlaceholderData } = useEvents({
    page,
    size: PAGE_SIZE,
  });

  const goToPage = (next: number) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('page', String(next));
      return params;
    });
  };

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
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-muted-foreground">행사를 불러오지 못했어요.</p>
          <Button variant="outline" onClick={() => refetch()}>
            다시 시도
          </Button>
        </div>
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

interface PaginationProps {
  page: number;
  size: number;
  total: number;
  disableNext: boolean;
  onChange: (next: number) => void;
}

function Pagination({ page, size, total, disableNext, onChange }: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / size));
  if (lastPage <= 1) {
    return null;
  }
  return (
    <div className="flex items-center justify-center gap-4">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        이전
      </Button>
      <span className="text-sm text-muted-foreground">
        {page} / {lastPage}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={disableNext || page >= lastPage}
        onClick={() => onChange(page + 1)}
      >
        다음
      </Button>
    </div>
  );
}
