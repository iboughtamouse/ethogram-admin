import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubmissionsPage from './SubmissionsPage';
import { fetchSubmissions } from '../api';

vi.mock('../api', () => ({
  fetchSubmissions: vi.fn(),
  excelDownloadUrl: (id) => `https://api.example/api/observations/${id}/excel`,
}));

const LIST = {
  ok: true,
  status: 200,
  payload: {
    success: true,
    data: {
      total: 1,
      items: [
        {
          id: 'abc-123',
          submittedAt: '2026-03-01T20:00:00Z',
          observationDate: '2026-03-01',
          startTime: '14:00:00',
          endTime: '14:30:00',
          observerName: 'Alice',
          mode: 'live',
          aviarySlug: 'sayyidas-cove',
          aviaryName: "Sayyida's Cove",
          slotCount: 2,
        },
      ],
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchSubmissions.mockResolvedValue(LIST);
});

describe('SubmissionsPage', () => {
  it('lists submissions with an Excel download link', async () => {
    render(<SubmissionsPage />);

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('14:00–14:30')).toBeInTheDocument();
    expect(screen.getByText(/showing 1 of 1 submission/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      'https://api.example/api/observations/abc-123/excel'
    );
    expect(fetchSubmissions).toHaveBeenCalledWith({
      from: '',
      to: '',
      observer: '',
      aviary: '',
    });
  });

  it('applies filters only on submit', async () => {
    const user = userEvent.setup();
    render(<SubmissionsPage />);
    await screen.findByText('Alice');

    await user.type(screen.getByLabelText('Observer'), 'Bob');
    expect(fetchSubmissions).toHaveBeenCalledTimes(1); // typing alone doesn't refetch

    await user.click(screen.getByRole('button', { name: 'Filter' }));
    expect(fetchSubmissions).toHaveBeenLastCalledWith({
      from: '',
      to: '',
      observer: 'Bob',
      aviary: '',
    });
  });
});
