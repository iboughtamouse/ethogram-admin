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

describe('VersionsPage', () => {
  it('lists published versions with notes', async () => {
    fetchVersions.mockResolvedValueOnce({
      ok: true,
      status: 200,
      payload: {
        success: true,
        data: {
          versions: [
            {
              version: 3,
              publishedAt: '2026-07-07T12:00:00Z',
              notes: 'R2 perch diagrams',
            },
            {
              version: 2,
              publishedAt: '2026-07-06T12:00:00Z',
              notes: 'Juveniles',
            },
            { version: 1, publishedAt: '2026-07-06T10:00:00Z', notes: null },
          ],
        },
      },
    });
    render(<VersionsPage />);

    expect(await screen.findByText('R2 perch diagrams')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(4); // header + 3 versions
    expect(screen.getByText('—')).toBeInTheDocument(); // null notes placeholder
  });
});
