import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { fetchMe, logout } from './api';

vi.mock('./api', () => ({
  fetchMe: vi.fn(),
  logout: vi.fn(),
  requestLink: vi.fn(),
  verifyToken: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('App', () => {
  it('shows the login page when there is no session', async () => {
    fetchMe.mockResolvedValueOnce({ ok: false, status: 401, payload: null });
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
  });

  it('shows the dashboard when a session exists, and signs out', async () => {
    fetchMe.mockResolvedValueOnce({
      ok: true,
      status: 200,
      payload: {
        success: true,
        data: { email: 'a@b.c', displayName: 'Mouse' },
      },
    });
    logout.mockResolvedValueOnce({
      ok: true,
      status: 200,
      payload: { success: true },
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText(/signed in as mouse/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(logout).toHaveBeenCalled();
    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
  });
});
