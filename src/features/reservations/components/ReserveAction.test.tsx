import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/utils';

import { ReserveAction } from './ReserveAction';

describe('ReserveAction', () => {
  it('비로그인 상태에서는 로그인 유도 버튼을 보여준다', () => {
    renderWithProviders(<ReserveAction eventId="e1" />);
    expect(screen.getByRole('button', { name: '로그인하고 예매하기' })).toBeInTheDocument();
  });
});
