import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActivationControl from './ActivationControl';
import { updateAviary } from '../api';

vi.mock('../api', () => ({ updateAviary: vi.fn() }));

const ok = () => ({
  ok: true,
  status: 200,
  payload: { success: true, data: {} },
});

let onChanged;
beforeEach(() => {
  vi.clearAllMocks();
  onChanged = vi.fn();
});

describe('ActivationControl', () => {
  it('activates an inactive aviary', async () => {
    updateAviary.mockResolvedValueOnce(ok());
    const user = userEvent.setup();
    render(
      <ActivationControl slug="cove" isActive={false} onChanged={onChanged} />
    );

    expect(screen.getByText('Inactive')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Activate' }));

    expect(updateAviary).toHaveBeenCalledWith('cove', { isActive: true });
    expect(onChanged).toHaveBeenCalled();
  });

  it('deactivates an active aviary', async () => {
    updateAviary.mockResolvedValueOnce(ok());
    const user = userEvent.setup();
    render(
      <ActivationControl slug="cove" isActive={true} onChanged={onChanged} />
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Deactivate' }));

    expect(updateAviary).toHaveBeenCalledWith('cove', { isActive: false });
    expect(onChanged).toHaveBeenCalled();
  });

  it("surfaces the server's error and does not reload", async () => {
    updateAviary.mockResolvedValueOnce({
      ok: false,
      status: 500,
      payload: { success: false, error: 'Something broke' },
    });
    const user = userEvent.setup();
    render(
      <ActivationControl slug="cove" isActive={false} onChanged={onChanged} />
    );

    await user.click(screen.getByRole('button', { name: 'Activate' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something broke'
    );
    expect(onChanged).not.toHaveBeenCalled();
  });
});
