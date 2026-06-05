import { useParams } from 'react-router-dom';

import { useEvent } from '@/features/events/hooks';

export default function EventDetailPage() {
  const { eventId = '' } = useParams();
  const { data } = useEvent(eventId);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{data?.title ?? '행사 상세'}</h1>
      <p className="text-muted-foreground">상세 정보·예매 액션은 후속 이슈에서 구현됩니다.</p>
    </section>
  );
}
