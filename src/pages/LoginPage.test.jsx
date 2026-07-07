import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import { requestLink } from '../api';

vi.mock('../api', () => ({
  requestLink: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginPage', () => {
  it('requests a link and shows the check-your-email state', async () => {
    requestLink.mockResolvedValueOnce({ ok: true, payload: { success: true } });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'staff@example.com');
    await user.click(screen.getByRole('button', { name: /sign-in link/i }));

    expect(requestLink).toHaveBeenCalledWith('staff@example.com');
    expect(await screen.findByText(/on its way/i)).toBeInTheDocument();
    expect(screen.getByText('staff@example.com')).toBeInTheDocument();
  });

  it('shows the API error message when the request is rejected', async () => {
    requestLink.mockResolvedValueOnce({
      ok: false,
      payload: {
        success: false,
        error: 'Too many sign-in requests. Please try again later.',
      },
    });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'staff@example.com');
    await user.click(screen.getByRole('button', { name: /sign-in link/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /too many sign-in requests/i
    );
  });
});
