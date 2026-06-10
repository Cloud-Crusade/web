import { CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import type { PaymentRead } from '@/types/payment';

export function PaymentCard({ payment }: { payment: PaymentRead }) {
  return (
    <Link
      to={`/reservations/${payment.reservation_id}`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 font-medium">
              <CreditCard className="size-4 text-muted-foreground" aria-hidden />
              {payment.payment_method}
            </p>
            <p className="text-sm text-muted-foreground">{formatDateTime(payment.created_at)}</p>
          </div>
          <span className="text-xs text-muted-foreground">예매 보기</span>
        </CardContent>
      </Card>
    </Link>
  );
}
