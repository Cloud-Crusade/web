import { useEvents } from '@/features/events/hooks';

export default function EventListPage() {
  const { data, isLoading, isError } = useEvents({ page: 1, size: 20 });

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">행사</h1>

      {isLoading && <p className="text-muted-foreground">불러오는 중…</p>}
      {isError && <p className="text-destructive">행사를 불러오지 못했어요.</p>}
      {data && data.items.length === 0 && (
        <p className="text-muted-foreground">등록된 행사가 없어요.</p>
      )}
      {data && data.items.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((event) => (
            <li key={event.event_id} className="rounded-lg border border-border p-4">
              <h2 className="font-semibold">{event.title}</h2>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
