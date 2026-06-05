import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  isCanceled: boolean;
  pending?: boolean;
}

export function ReservationStatusBadge({ isCanceled, pending = false }: Props) {
  const status = pending
    ? { Icon: Loader2, label: '처리 중', className: 'bg-muted text-muted-foreground', spin: true }
    : isCanceled
      ? {
          Icon: XCircle,
          label: '취소됨',
          className: 'bg-destructive/10 text-destructive',
          spin: false,
        }
      : {
          Icon: CheckCircle2,
          label: '예매 완료',
          className: 'bg-primary/10 text-primary',
          spin: false,
        };

  return (
    // 상태 전이(처리 중 → 완료/취소됨)를 스크린리더가 읽도록 모든 상태에서 live 영역 유지
    <Badge
      variant="secondary"
      role="status"
      aria-live="polite"
      className={cn('gap-1', status.className)}
    >
      <status.Icon className={cn('size-3.5', status.spin && 'animate-spin')} aria-hidden />
      {status.label}
    </Badge>
  );
}
