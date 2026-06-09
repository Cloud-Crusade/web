import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { EventForm } from '@/features/events/components/EventForm';
import { useCreateEvent } from '@/features/events/hooks';
import { type EventFormValues, toEventPayload } from '@/features/events/schema';

const CREATE_DEFAULTS: EventFormValues = {
  title: '',
  body: '',
  start_at: '',
  end_at: '',
  img_url: '',
  total_seats: 1,
};

export default function EventCreatePage() {
  const navigate = useNavigate();
  const createEvent = useCreateEvent();

  const onSubmit = (values: EventFormValues) => {
    createEvent.mutate(toEventPayload(values), {
      onSuccess: (event) => {
        toast.success('행사를 등록했어요.');
        navigate(`/events/${event.event_id}`, { replace: true });
      },
    });
  };

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">행사 등록</h1>
      <Card>
        <CardContent className="pt-6">
          <EventForm
            defaultValues={CREATE_DEFAULTS}
            onSubmit={onSubmit}
            isPending={createEvent.isPending}
            submitLabel="등록하기"
          />
        </CardContent>
      </Card>
    </section>
  );
}
