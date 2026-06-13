import { TicketX } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { QueryErrorState } from '@/components/QueryErrorState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReservationCard } from '@/features/reservations/components/ReservationCard';
import { useMyReservations } from '@/features/reservations/hooks';
import { usePageParam } from '@/hooks/usePageParam';

const PAGE_SIZE = 10;

export default function MyReservationsPage() {
  const { page, goToPage } = usePageParam();

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useMyReservations({
    page,
    size: PAGE_SIZE,
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">내 예매</h1>

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState error={error} onRetry={refetch} message="예매 내역을 불러오지 못했어요." />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={TicketX}
          title="예매 내역이 없어요"
          description="행사를 둘러보고 예매해 보세요."
          action={
            <Button asChild>
              <Link to="/events">행사 둘러보기</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="space-y-3" aria-busy={isPlaceholderData}>
            {data.items.map((reservation) => (
              <li key={reservation.reservation_id}>
                <ReservationCard reservation={reservation} />
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            total={data.total}
            size={PAGE_SIZE}
            disableNext={isPlaceholderData}
            onChange={goToPage}
          />
        </>
      )}
    </section>
  );
}
