import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { EventFormValues } from '../schema';
import { EventForm } from './EventForm';

const VALID: EventFormValues = {
  title: '콘서트',
  body: '',
  start_at: '2026-12-31T19:00',
  end_at: '2026-12-31T21:00',
  img_url: '',
  total_seats: 10,
};

describe('EventForm', () => {
  it('제목이 비면 검증 에러를 보여주고 제출하지 않는다', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <EventForm
        defaultValues={{ ...VALID, title: '' }}
        onSubmit={onSubmit}
        isPending={false}
        submitLabel="등록하기"
      />,
    );

    await user.click(screen.getByRole('button', { name: '등록하기' }));

    expect(await screen.findByText('제목을 입력하세요')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('유효한 입력을 제출하면 onSubmit 이 폼 값으로 호출된다', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <EventForm
        defaultValues={VALID}
        onSubmit={onSubmit}
        isPending={false}
        submitLabel="등록하기"
      />,
    );

    await user.click(screen.getByRole('button', { name: '등록하기' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ title: '콘서트', total_seats: 10 });
  });
});
