import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import PublishPage from './PublishPage';
import { fetchConfigDiff, publishConfig } from '../api';

vi.mock('../api', () => ({
  fetchConfigDiff: vi.fn(),
  publishConfig: vi.fn(),
}));

const FINGERPRINT = 'abc123def456abc123def456abc12300';

const diff = (overrides = {}) => ({
  ok: true,
  status: 200,
  payload: {
    success: true,
    data: {
      identical: false,
      fingerprint: FINGERPRINT,
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
    render(
      <MemoryRouter>
        <PublishPage />
      </MemoryRouter>
    );

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
    render(
      <MemoryRouter>
        <PublishPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/draft changes since version 3/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText('Behavior added: "Stretching" (stretching).')
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/notes/i), '  new behavior  ');
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    // FU-9: the fingerprint the diff was computed from rides along
    expect(publishConfig).toHaveBeenCalledWith({
      notes: 'new behavior',
      expectedFingerprint: FINGERPRINT,
    });
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
    render(
      <MemoryRouter>
        <PublishPage />
      </MemoryRouter>
    );

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
      expectedFingerprint: FINGERPRINT,
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
    render(
      <MemoryRouter>
        <PublishPage />
      </MemoryRouter>
    );

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
    render(
      <MemoryRouter>
        <PublishPage />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: 'Publish' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /nothing to publish/i
    );
  });

  it('refreshes the diff after a failed publish so new confirmations can render', async () => {
    // Mount-time diff shows no flag changes; the server rejects the publish
    // because the draft moved under this page. The refreshed diff must
    // surface the now-required confirmation checkbox instead of dead-ending.
    fetchConfigDiff
      .mockResolvedValueOnce(diff())
      .mockResolvedValueOnce(diff({ flagChanges: ['flying'] }));
    publishConfig.mockResolvedValueOnce({
      ok: false,
      status: 409,
      payload: {
        success: false,
        error:
          'Some behaviors changed which extra fields they need — this alters how FUTURE observations are entered. Re-publish with confirmFlagChanges: true to proceed.',
        flagChanges: ['flying'],
      },
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PublishPage />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: 'Publish' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/re-publish/i);
    expect(fetchConfigDiff).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByLabelText(/changed which extra fields they need/i)
    ).toBeInTheDocument();
  });

  it('clears a confirmation tick when a rejected publish reloads the diff', async () => {
    // A flag confirmation is required; the publish is rejected (draft moved)
    // and the reloaded diff still requires it — the earlier tick must NOT
    // survive to re-enable Publish without a fresh confirmation.
    fetchConfigDiff
      .mockResolvedValueOnce(diff({ flagChanges: ['flying'] }))
      .mockResolvedValueOnce(diff({ flagChanges: ['flying'] }));
    publishConfig.mockResolvedValueOnce({
      ok: false,
      status: 409,
      payload: {
        success: false,
        error:
          'The draft changed since you opened this review — reload the diff and check it again before publishing.',
      },
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PublishPage />
      </MemoryRouter>
    );

    await user.click(
      await screen.findByLabelText(/changed which extra fields they need/i)
    );
    const publish = screen.getByRole('button', { name: 'Publish' });
    expect(publish).toBeEnabled();
    await user.click(publish);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /draft changed/i
    );
    // Tick cleared, Publish disabled again until re-confirmed
    expect(
      screen.getByLabelText(/changed which extra fields they need/i)
    ).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('re-reviews the moved draft when the fingerprint is stale (FU-9)', async () => {
    // The draft moved after this page's diff was rendered: publish 409s, and
    // the reload surfaces the newer change list to re-review.
    fetchConfigDiff
      .mockResolvedValueOnce(diff({ changes: ['Behavior added: "A" (a).'] }))
      .mockResolvedValueOnce(
        diff({
          fingerprint: 'ffffffffffffffffffffffffffffffff',
          changes: ['Behavior added: "A" (a).', 'Behavior added: "B" (b).'],
        })
      );
    publishConfig.mockResolvedValueOnce({
      ok: false,
      status: 409,
      payload: {
        success: false,
        error:
          'The draft changed since you opened this review — reload the diff and check it again before publishing.',
      },
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PublishPage />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: 'Publish' }));

    // The first publish carried the stale fingerprint
    expect(publishConfig).toHaveBeenCalledWith({
      expectedFingerprint: FINGERPRINT,
    });
    // The server's message shows and the diff reloaded to the moved draft
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /draft changed/i
    );
    expect(
      await screen.findByText('Behavior added: "B" (b).')
    ).toBeInTheDocument();
    expect(fetchConfigDiff).toHaveBeenCalledTimes(2);
  });
});
