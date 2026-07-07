import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OverviewPage from './OverviewPage';
import { fetchOverview } from '../api';

vi.mock('../api', () => ({
  fetchOverview: vi.fn(),
}));

function overviewResponse({ unpublishedChanges = false } = {}) {
  return {
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
          notes: 'R2 swap',
        },
        unpublishedChanges,
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OverviewPage', () => {
  it('renders the version line and aviary cards', async () => {
    fetchOverview.mockResolvedValueOnce(overviewResponse());
    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/version 3/)).toBeInTheDocument();
    expect(screen.getByText(/R2 swap/)).toBeInTheDocument();
    expect(screen.getByText('Up to date')).toBeInTheDocument();

    const card = screen.getByRole('link', { name: /sayyida's cove/i });
    expect(card).toHaveAttribute('href', '/aviaries/sayyidas-cove');
    expect(card).toHaveTextContent('4 current birds');
    expect(card).toHaveTextContent('38 perches');
  });

  it('shows the unpublished-changes badge when the editing tables drifted', async () => {
    fetchOverview.mockResolvedValueOnce(
      overviewResponse({ unpublishedChanges: true })
    );
    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>
    );

    const badge = await screen.findByRole('link', {
      name: /unpublished changes — review & publish/i,
    });
    expect(badge).toHaveAttribute('href', '/publish');
  });

  it('surfaces API errors', async () => {
    fetchOverview.mockResolvedValueOnce({
      ok: false,
      status: 500,
      payload: null,
    });
    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /request failed/i
    );
  });
});
