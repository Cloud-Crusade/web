import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { eventFormSchema, type EventFormValues } from '../schema';

type Props = {
  defaultValues: EventFormValues;
  onSubmit: (values: EventFormValues) => void;
  isPending: boolean;
  submitLabel: string;
};

export function EventForm({ defaultValues, onSubmit, isPending, submitLabel }: Props) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  });

  const submit = form.handleSubmit((values) => onSubmit(values));

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>제목</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>최대 20자</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>설명</FormLabel>
              <FormControl>
                <textarea
                  rows={4}
                  name={field.name}
                  ref={field.ref}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  className={cn(
                    'flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                    'ring-offset-background placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                />
              </FormControl>
              <FormDescription>선택 입력</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="start_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>시작 시각</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>종료 시각</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="total_seats"
          render={({ field }) => (
            <FormItem>
              <FormLabel>좌석 수</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  name={field.name}
                  ref={field.ref}
                  value={Number.isNaN(field.value) ? '' : field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  onBlur={field.onBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="img_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>대표 이미지 URL</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>선택 입력</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" aria-hidden />}
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
