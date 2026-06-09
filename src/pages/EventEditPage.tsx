import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EventForm } from '@/features/events/components/EventForm';
import { useEvent, useUpdateEvent } from '@/features/events/hooks';
import { type EventFormValues, toEventFormValues, toEventPayload } from '@/features/events/schema';
import { toApiError } from '@/lib/apiError';

export default function EventEditPage() {
  const { eventId = '' } = useParams();
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useEvent(eventId);
  const updateEvent = useUpdateEvent(eventId);

  if (eventId && isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

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

  const onSubmit = (values: EventFormValues) => {
    updateEvent.mutate(toEventPayload(values), {
      onSuccess: () => {
        toast.success('행사를 수정했어요.');
        navigate(`/events/${eventId}`, { replace: true });
      },
    });
  };

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">행사 수정</h1>
      <Card>
        <CardContent className="pt-6">
          <EventForm
            defaultValues={toEventFormValues(data)}
            onSubmit={onSubmit}
            isPending={updateEvent.isPending}
            submitLabel="수정하기"
          />
        </CardContent>
      </Card>
    </section>
  );
}
