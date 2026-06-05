import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/utils';

import LoginPage from './LoginPage';

describe('LoginPage', () => {
  it('빈 입력으로 제출하면 검증 에러를 보여준다', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.click(screen.getByRole('button', { name: '로그인' }));

    expect(await screen.findByText('사용자 이름을 입력하세요')).toBeInTheDocument();
    expect(await screen.findByText('비밀번호를 입력하세요')).toBeInTheDocument();
  });

  it('잘못된 자격으로 제출하면 인증 실패 메시지를 보여준다', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText('사용자 이름'), 'tester');
    await user.type(screen.getByLabelText('비밀번호'), 'wrong');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    expect(await screen.findByText('아이디 또는 비밀번호가 올바르지 않습니다')).toBeInTheDocument();
  });
});
