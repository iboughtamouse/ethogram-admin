import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmButton from './ConfirmButton';

describe('ConfirmButton', () => {
  it('arms on first click, runs the action only on Confirm', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmButton
        label="Remove"
        question='Remove "X"?'
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Remove "X"?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    // Disarmed again: back to the idle button
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('cancel disarms without running the action', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmButton
        label="Remove"
        question='Remove "X"?'
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByText('Remove "X"?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('moves focus to the safe Cancel button when armed (a stray Enter cancels, not deletes)', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmButton label="Remove" question="Sure?" onConfirm={vi.fn()} />
    );

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });
});
