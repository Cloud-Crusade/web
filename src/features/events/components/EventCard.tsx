import { CalendarDays, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import type { EventRead } from '@/types/event';

import { EventImage } from './EventImage';

export function EventCard({ event }: { event: EventRead }) {
  return (
    <Link
      to={`/events/${event.event_id}`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <Card className="h-full overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
        <EventImage src={event.img_urls[0]} alt={event.title} />
        <CardContent className="space-y-2 p-4">
          <h2 className="line-clamp-1 font-semibold">{event.title}</h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden />
            {formatDateTime(event.schedule.start_at)}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Ticket className="size-4" aria-hidden />
            전체 {event.total_seats}석
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
