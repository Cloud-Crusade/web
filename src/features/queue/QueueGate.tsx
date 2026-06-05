import { Navigate, Outlet, useParams } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/AuthContext';
import { useQueueStatus } from '@/features/queue/hooks';

// 예매 진입(이벤트 상세)을 감싸는 대기 게이트.
// 비로그인은 통과(예매 시 로그인 유도), 로그인 사용자는 admitted 전까지 대기열로 보낸다.
export function QueueGate() {
  const { isAuthenticated } = useAuth();
  const { eventId = '' } = useParams();
  const { data, isPending } = useQueueStatus(eventId);

  if (!isAuthenticated) {
    return <Outlet />;
  }

  if (isPending) {
    return <Skeleton className="h-40 w-full rounded-lg" />;
  }

  if (data?.status !== 'admitted') {
    return <Navigate to={`/queue/${eventId}`} replace />;
  }

  return <Outlet />;
}
