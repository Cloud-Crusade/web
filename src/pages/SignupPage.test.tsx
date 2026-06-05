import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/utils';

import SignupPage from './SignupPage';

describe('SignupPage', () => {
  it('이미 사용 중인 사용자 이름이면 필드 에러를 보여준다', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupPage />);

    await user.type(screen.getByLabelText('사용자 이름'), 'taken');
    await user.type(screen.getByLabelText('비밀번호'), 'password1234');
    await user.click(screen.getByRole('button', { name: '회원가입' }));

    expect(await screen.findByText('이미 사용 중인 사용자 이름입니다')).toBeInTheDocument();
  });
});
