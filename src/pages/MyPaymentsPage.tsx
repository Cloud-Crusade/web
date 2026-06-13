import { Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { QueryErrorState } from '@/components/QueryErrorState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentCard } from '@/features/payments/components/PaymentCard';
import { useMyPayments } from '@/features/payments/hooks';
import { usePageParam } from '@/hooks/usePageParam';

const PAGE_SIZE = 10;

export default function MyPaymentsPage() {
  const { page, goToPage } = usePageParam();

  const { data, isPending, isError, error, refetch } = useMyPayments({ page, size: PAGE_SIZE });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">결제 내역</h1>

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState error={error} onRetry={refetch} message="결제 내역을 불러오지 못했어요." />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="결제 내역이 없어요"
          description="예매를 결제하면 여기에 표시돼요."
          action={
            <Button asChild>
              <Link to="/reservations">내 예매로</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {data.items.map((payment) => (
              <li key={payment.payment_history_id}>
                <PaymentCard payment={payment} />
              </li>
            ))}
          </ul>
          <Pagination page={page} total={data.total} size={PAGE_SIZE} onChange={goToPage} />
        </>
      )}
    </section>
  );
}
