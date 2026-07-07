import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PublishPage from './PublishPage';
import { fetchConfigDiff, publishConfig } from '../api';

vi.mock('../api', () => ({
  fetchConfigDiff: vi.fn(),
  publishConfig: vi.fn(),
}));

const diff = (overrides = {}) => ({
  ok: true,
  status: 200,
  payload: {
    success: true,
    data: {
      identical: false,
      latestVersion: 3,
      changes: ['Behavior added: "Stretching" (stretching).'],
      flagChanges: [],
      rowMapChanges: [],
      violations: [],
      ...overrides,
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PublishPage', () => {
  it('says there is nothing to publish when the draft is clean', async () => {
    fetchConfigDiff.mockResolvedValue(diff({ identical: true, changes: [] }));
    render(<PublishPage />);

    expect(
      await screen.findByText(/nothing to publish.*version 3/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Publish' })
    ).not.toBeInTheDocument();
  });

  it('publishes the draft with trimmed notes and shows the result', async () => {
    fetchConfigDiff.mockResolvedValue(diff());
    publishConfig.mockResolvedValueOnce({
      ok: true,
      status: 201,
      payload: {
        success: true,
        data: {
          version: 4,
          publishedAt: '2026-07-07T18:00:00Z',
          changes: ['Behavior added: "Stretching" (stretching).'],
        },
      },
    });
    const user = userEvent.setup();
    render(<PublishPage />);

    expect(
      await screen.findByText(/draft changes since version 3/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText('Behavior added: "Stretching" (stretching).')
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/notes/i), '  new behavior  ');
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    expect(publishConfig).toHaveBeenCalledWith({ notes: 'new behavior' });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Published version 4'
    );
  });

  it('requires the confirmation checkboxes before publishing flagged changes', async () => {
    fetchConfigDiff.mockResolvedValue(
      diff({
        changes: ['Behavior "flying" changed which extra fields it needs.'],
        flagChanges: ['flying'],
        rowMapChanges: ['flying'],
      })
    );
    publishConfig.mockResolvedValueOnce({
      ok: true,
      status: 201,
      payload: {
        success: true,
        data: { version: 4, publishedAt: 'x', changes: [] },
      },
    });
    const user = userEvent.setup();
    render(<PublishPage />);

    const publish = await screen.findByRole('button', { name: 'Publish' });
    expect(publish).toBeDisabled();

    await user.click(
      screen.getByLabelText(/changed which extra fields they need/i)
    );
    expect(publish).toBeDisabled();
    await user.click(
      screen.getByLabelText(/changed their Excel row label or position/i)
    );
    expect(publish).toBeEnabled();

    await user.click(publish);
    expect(publishConfig).toHaveBeenCalledWith({
      confirmFlagChanges: true,
      confirmRowMapChanges: true,
    });
  });

  it('blocks publishing and lists the violations', async () => {
    fetchConfigDiff.mockResolvedValue(
      diff({
        changes: ['Behavior "flying" is gone.'],
        violations: [
          'Behavior "flying" was published in version 1 and cannot be removed or renamed — retire it instead.',
        ],
      })
    );
    render(<PublishPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /cannot be removed or renamed/
    );
    expect(
      screen.queryByRole('button', { name: 'Publish' })
    ).not.toBeInTheDocument();
  });

  it("shows the server's error when publishing fails", async () => {
    fetchConfigDiff.mockResolvedValue(diff());
    publishConfig.mockResolvedValueOnce({
      ok: false,
      status: 409,
      payload: {
        success: false,
        error:
          'Nothing to publish — the editing tables match the latest published version',
      },
    });
    const user = userEvent.setup();
    render(<PublishPage />);

    await user.click(await screen.findByRole('button', { name: 'Publish' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /nothing to publish/i
    );
  });
});
