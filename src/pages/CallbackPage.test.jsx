import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CallbackPage from './CallbackPage';
import { verifyToken } from '../api';

vi.mock('../api', () => ({
  verifyToken: vi.fn(),
}));

function renderCallback(onSignedIn = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/auth/callback']}>
      <Routes>
        <Route
          path="/auth/callback"
          element={<CallbackPage onSignedIn={onSignedIn} />}
        />
        <Route path="/" element={<p>dashboard home</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/auth/callback');
});

describe('CallbackPage', () => {
  it('captures the fragment token, strips it from the URL, and redeems on click', async () => {
    window.history.replaceState(null, '', '/auth/callback#token=tok-abc-123');
    verifyToken.mockResolvedValueOnce({
      ok: true,
      payload: { success: true, data: { email: 'a@b.c', displayName: 'A' } },
    });
    const onSignedIn = vi.fn();
    const user = userEvent.setup();
    renderCallback(onSignedIn);

    // Token is gone from the address bar before any click
    expect(window.location.hash).toBe('');

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(verifyToken).toHaveBeenCalledWith('tok-abc-123');
    expect(onSignedIn).toHaveBeenCalledWith({
      email: 'a@b.c',
      displayName: 'A',
    });
    expect(await screen.findByText('dashboard home')).toBeInTheDocument();
  });

  it('does not redeem the token without a click', () => {
    window.history.replaceState(null, '', '/auth/callback#token=tok-abc-123');
    renderCallback();
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('shows the API error and a retry link when redemption fails', async () => {
    window.history.replaceState(null, '', '/auth/callback#token=tok-expired');
    verifyToken.mockResolvedValueOnce({
      ok: false,
      payload: {
        success: false,
        error: 'This sign-in link is invalid or has expired.',
      },
    });
    const user = userEvent.setup();
    renderCallback();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /invalid or has expired/i
    );
    expect(
      screen.getByRole('link', { name: /request a new link/i })
    ).toBeInTheDocument();
  });

  it('explains when the link carries no token', () => {
    renderCallback();
    expect(
      screen.getByText(/incomplete or has already been opened/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /request a new sign-in link/i })
    ).toBeInTheDocument();
  });
});
