import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import VersionsPage from './VersionsPage';
import { fetchVersions } from '../api';

vi.mock('../api', () => ({
  fetchVersions: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const ok = (versions) => ({
  ok: true,
  status: 200,
  payload: { success: true, data: { versions } },
});

describe('VersionsPage', () => {
  it('lists published versions with notes and who published them', async () => {
    fetchVersions.mockResolvedValueOnce(
      ok([
        {
          version: 3,
          publishedAt: '2026-07-07T12:00:00Z',
          notes: 'R2 perch diagrams',
          publishedBy: 'Poppy',
        },
        {
          version: 1,
          publishedAt: '2026-07-06T10:00:00Z',
          notes: null,
          publishedBy: null,
        },
      ])
    );
    render(<VersionsPage />);

    expect(await screen.findByText('R2 perch diagrams')).toBeInTheDocument();
    // Attribution column: display name, and 'Engineering' for a NULL published_by
    expect(screen.getByText('Poppy')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument(); // null notes placeholder
  });

  it('shows a plain message when nothing has been published', async () => {
    fetchVersions.mockResolvedValueOnce(ok([]));
    render(<VersionsPage />);

    expect(
      await screen.findByText(/no config has been published yet/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
