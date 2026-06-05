import { Button } from '@/components/ui/button';

interface Props {
  page: number;
  total: number;
  size: number;
  disableNext?: boolean;
  onChange: (next: number) => void;
}

export function Pagination({ page, total, size, disableNext = false, onChange }: Props) {
  const lastPage = Math.max(1, Math.ceil(total / size));
  if (lastPage <= 1) {
    return null;
  }
  return (
    <div className="flex items-center justify-center gap-4">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        이전
      </Button>
      <span className="text-sm text-muted-foreground">
        {page} / {lastPage}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={disableNext || page >= lastPage}
        onClick={() => onChange(page + 1)}
      >
        다음
      </Button>
    </div>
  );
}
