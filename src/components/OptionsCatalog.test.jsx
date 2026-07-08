import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OptionsCatalog from './OptionsCatalog';
import { createOption, updateOption, deleteOption } from '../api';

vi.mock('../api', () => ({
  createOption: vi.fn(),
  updateOption: vi.fn(),
  deleteOption: vi.fn(),
}));

const ok = (data = {}) => ({
  ok: true,
  status: 200,
  payload: { success: true, data },
});

const OPTIONS = {
  object: [
    { value: 'ball', label: 'Ball', retired: false },
    { value: 'rope', label: 'Rope', retired: true },
  ],
  object_interaction: [],
  animal: [{ value: 'hawk', label: 'Hawk', retired: false }],
  animal_interaction: [],
};

const ENABLEMENT = {
  'sayyidas-cove': {
    behaviors: [],
    object: ['ball'],
    object_interaction: [],
    animal: [],
    animal_interaction: [],
  },
};

let onChanged;

beforeEach(() => {
  vi.clearAllMocks();
  onChanged = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderCatalog() {
  render(
    <OptionsCatalog
      options={OPTIONS}
      aviarySlugs={['sayyidas-cove']}
      enablement={ENABLEMENT}
      onChanged={onChanged}
    />
  );
}

describe('OptionsCatalog', () => {
  it('adds an option under its kind', async () => {
    createOption.mockResolvedValueOnce(
      ok({ kind: 'animal', value: 'squirrel', label: 'Squirrel' })
    );
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getByText('Add animal'));
    const form = screen.getByText('Add animal').closest('details');
    await user.type(within(form).getByLabelText('Value'), 'squirrel');
    await user.type(within(form).getByLabelText('Label'), 'Squirrel');
    await user.click(within(form).getByRole('button', { name: 'Add option' }));

    expect(createOption).toHaveBeenCalledWith({
      kind: 'animal',
      value: 'squirrel',
      label: 'Squirrel',
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('edits an option label inline', async () => {
    updateOption.mockResolvedValueOnce(ok());
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getAllByRole('button', { name: 'Edit…' })[0]);
    const form = screen
      .getByRole('button', { name: 'Save option' })
      .closest('form');
    const input = within(form).getByLabelText('Label');
    await user.clear(input);
    await user.type(input, 'Ball toy');
    await user.click(screen.getByRole('button', { name: 'Save option' }));

    expect(updateOption).toHaveBeenCalledWith('object', 'ball', {
      label: 'Ball toy',
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('retires and unretires with one click', async () => {
    updateOption.mockResolvedValue(ok());
    const user = userEvent.setup();
    renderCatalog();

    // Ball (active) → Retire; Rope (retired) → Unretire
    await user.click(screen.getAllByRole('button', { name: 'Retire' })[0]);
    expect(updateOption).toHaveBeenCalledWith('object', 'ball', {
      retired: true,
    });

    await user.click(screen.getByRole('button', { name: 'Unretire' }));
    expect(updateOption).toHaveBeenCalledWith('object', 'rope', {
      retired: false,
    });
  });

  it("surfaces the API's refusal when removing a published option", async () => {
    deleteOption.mockResolvedValueOnce({
      ok: false,
      status: 409,
      payload: {
        success: false,
        error:
          'This option appears in a published config version and cannot be deleted — retire it instead',
      },
    });
    const user = userEvent.setup();
    renderCatalog();

    // In-app confirm (SM-1): arm, then confirm
    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(screen.getByText('Remove "Ball"?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(deleteOption).toHaveBeenCalledWith('object', 'ball');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /retire it instead/
    );
    expect(onChanged).not.toHaveBeenCalled();
  });
});
