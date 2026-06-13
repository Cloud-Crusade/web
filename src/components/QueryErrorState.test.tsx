import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { QueryErrorState } from '@/components/QueryErrorState';
import { ApiError } from '@/lib/apiError';

describe('QueryErrorState', () => {
  it('일반 실패는 메시지와 다시 시도 버튼을 보여준다', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(
      <QueryErrorState
        error={new ApiError(500, { code: 'INTERNAL', message: 'x' })}
        onRetry={onRetry}
        message="행사를 불러오지 못했어요."
      />,
    );

    expect(screen.getByText('행사를 불러오지 못했어요.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('404 는 빈 상태로 강등한다', () => {
    render(
      <QueryErrorState
        error={new ApiError(404, { code: 'NOT_FOUND', message: 'x' })}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('찾을 수 없는 항목이에요')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
  });
});
