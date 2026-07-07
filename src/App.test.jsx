import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { fetchMe, logout, fetchOverview, onUnauthorized } from './api';

vi.mock('./api', () => ({
  fetchMe: vi.fn(),
  logout: vi.fn(),
  requestLink: vi.fn(),
  verifyToken: vi.fn(),
  fetchOverview: vi.fn(),
  fetchAviary: vi.fn(),
  fetchVocabulary: vi.fn(),
  fetchVersions: vi.fn(),
  fetchSubmissions: vi.fn(),
  excelDownloadUrl: vi.fn(() => '#'),
  onUnauthorized: vi.fn(() => () => {}),
}));

const OVERVIEW = {
  ok: true,
  status: 200,
  payload: {
    success: true,
    data: {
      aviaries: [
        {
          slug: 'sayyidas-cove',
          name: "Sayyida's Cove",
          isActive: true,
          currentSubjects: 4,
          perches: 38,
          diagrams: 2,
        },
      ],
      latestVersion: {
        version: 3,
        publishedAt: '2026-07-07T12:00:00Z',
        notes: null,
      },
      unpublishedChanges: false,
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchOverview.mockResolvedValue(OVERVIEW);
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

  it('shows the dashboard shell with nav when signed in, and signs out', async () => {
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
    expect(
      screen.getByRole('link', { name: 'Vocabulary' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Submissions' })
    ).toBeInTheDocument();
    // The overview page renders at /
    expect(await screen.findByText("Sayyida's Cove")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(logout).toHaveBeenCalled();
    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
  });

  it('returns to the login page when a dashboard request reports session loss', async () => {
    let sessionLossHandler;
    onUnauthorized.mockImplementation((handler) => {
      sessionLossHandler = handler;
      return () => {};
    });
    fetchMe.mockResolvedValueOnce({
      ok: true,
      status: 200,
      payload: {
        success: true,
        data: { email: 'a@b.c', displayName: 'Mouse' },
      },
    });
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByText(/signed in as mouse/i)).toBeInTheDocument();

    // Simulate what apiFetch does when a dashboard endpoint returns 401
    act(() => sessionLossHandler());

    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
  });
});
