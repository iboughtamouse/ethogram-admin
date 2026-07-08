import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PerchesSection from './PerchesSection';
import { createPerch, updatePerch, deletePerch } from '../api';

vi.mock('../api', () => ({
  createPerch: vi.fn(),
  updatePerch: vi.fn(),
  deletePerch: vi.fn(),
}));

const ok = (data = {}) => ({
  ok: true,
  status: 200,
  payload: { success: true, data },
});

const PERCHES = [
  { value: '12', label: 'Perch 12', group: 'High perches', retired: false },
  { value: 'Ground', label: 'Ground', group: null, retired: true },
];

let onChanged;

beforeEach(() => {
  vi.clearAllMocks();
  onChanged = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderSection() {
  render(
    <PerchesSection
      slug="sayyidas-cove"
      perches={PERCHES}
      onChanged={onChanged}
    />
  );
}

describe('PerchesSection', () => {
  it('adds a perch, defaulting an empty group to null', async () => {
    createPerch.mockResolvedValueOnce(ok({ value: '39', label: 'Perch 39' }));
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByText('Add a perch'));
    await user.type(screen.getByLabelText('Value'), '39');
    await user.type(screen.getByLabelText('Label'), 'Perch 39');
    await user.click(screen.getByRole('button', { name: 'Add perch' }));

    expect(createPerch).toHaveBeenCalledWith('sayyidas-cove', {
      value: '39',
      label: 'Perch 39',
      group: null,
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('edits a perch label and group inline', async () => {
    updatePerch.mockResolvedValueOnce(ok());
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getAllByRole('button', { name: 'Edit…' })[0]);
    // The collapsed add-perch form also has a "Label" field — scope to the editor
    const editorForm = screen
      .getByRole('button', { name: 'Save perch' })
      .closest('form');
    const labelInput = within(editorForm).getByLabelText('Label');
    await user.clear(labelInput);
    await user.type(labelInput, 'Perch 12 (north)');
    await user.click(screen.getByRole('button', { name: 'Save perch' }));

    expect(updatePerch).toHaveBeenCalledWith('sayyidas-cove', '12', {
      label: 'Perch 12 (north)',
      group: 'High perches',
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('retires and unretires with one click', async () => {
    updatePerch.mockResolvedValue(ok());
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Retire' }));
    expect(updatePerch).toHaveBeenCalledWith('sayyidas-cove', '12', {
      retired: true,
    });

    await user.click(screen.getByRole('button', { name: 'Unretire' }));
    expect(updatePerch).toHaveBeenCalledWith('sayyidas-cove', 'Ground', {
      retired: false,
    });
    expect(onChanged).toHaveBeenCalledTimes(2);
  });

  it("surfaces the API's refusal when removing a published perch", async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deletePerch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      payload: {
        success: false,
        error:
          'This perch appears in a published config version and cannot be deleted — retire it instead',
      },
    });
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

    expect(deletePerch).toHaveBeenCalledWith('sayyidas-cove', '12');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /retire it instead/
    );
    expect(onChanged).not.toHaveBeenCalled();
  });
});
