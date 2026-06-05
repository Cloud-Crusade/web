import { Link } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import type { ReservationRead } from '@/types/reservation';

import { ReservationStatusBadge } from './ReservationStatusBadge';

export function ReservationCard({ reservation }: { reservation: ReservationRead }) {
  return (
    <Link
      to={`/reservations/${reservation.reservation_id}`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <Card className="transition-colors hover:bg-accent">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="space-y-1">
            <p className="font-medium">{reservation.reserved_num}매 예매</p>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(reservation.created_at)}
            </p>
          </div>
          <ReservationStatusBadge isCanceled={reservation.is_canceled} />
        </CardContent>
      </Card>
    </Link>
  );
}
