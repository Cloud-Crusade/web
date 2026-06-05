import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

interface Props {
  isCanceled: boolean;
  pending?: boolean;
}

export function ReservationStatusBadge({ isCanceled, pending = false }: Props) {
  if (pending) {
    return (
      <Badge variant="secondary" className="gap-1" aria-live="polite">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        처리 중
      </Badge>
    );
  }
  if (isCanceled) {
    return (
      <Badge variant="secondary" className="gap-1 bg-destructive/10 text-destructive">
        <XCircle className="size-3.5" aria-hidden />
        취소됨
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
      <CheckCircle2 className="size-3.5" aria-hidden />
      예매 완료
    </Badge>
  );
}
