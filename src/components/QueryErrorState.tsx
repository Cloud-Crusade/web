import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { isNotFound, toApiError } from '@/lib/apiError';

type Props = {
  error: unknown;
  onRetry: () => void;
  message?: string;
};

// 목록·단건 조회 실패 공통 표시 (04-error-handling 룰). 404 는 에러가 아니라 빈 상태로 강등.
export function QueryErrorState({ error, onRetry, message = '불러오지 못했어요.' }: Props) {
  if (isNotFound(toApiError(error))) {
    return <EmptyState title="찾을 수 없는 항목이에요" />;
  }

  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}
