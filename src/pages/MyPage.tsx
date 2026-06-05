import { useMe } from '@/features/users/hooks';

export default function MyPage() {
  const { data } = useMe();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">내 정보</h1>
      <p className="text-muted-foreground">{data ? data.user_name : '불러오는 중…'}</p>
    </section>
  );
}
