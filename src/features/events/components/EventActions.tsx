import { Pencil, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import { useDeleteEvent } from '../hooks';

export function EventActions({ eventId }: { eventId: string }) {
  const navigate = useNavigate();
  const deleteEvent = useDeleteEvent();

  const onDelete = () => {
    deleteEvent.mutate(eventId, {
      onSuccess: () => {
        toast.success('행사를 삭제했어요.');
        navigate('/events', { replace: true });
      },
    });
  };

  return (
    <div className="flex gap-2">
      <Button asChild variant="outline" size="sm">
        <Link to={`/events/${eventId}/edit`}>
          <Pencil className="size-4" aria-hidden />
          수정
        </Link>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={deleteEvent.isPending}
          >
            <Trash2 className="size-4" aria-hidden />
            삭제
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>행사를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제하면 되돌릴 수 없어요. 관련 예매에도 영향을 줄 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
