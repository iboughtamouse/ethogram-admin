import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BehaviorCatalog from './BehaviorCatalog';
import {
  createBehavior,
  createBehaviorGroup,
  updateBehavior,
  deleteBehavior,
} from '../api';

vi.mock('../api', () => ({
  createBehavior: vi.fn(),
  createBehaviorGroup: vi.fn(),
  updateBehavior: vi.fn(),
  deleteBehavior: vi.fn(),
}));

const ok = (data = {}) => ({
  ok: true,
  status: 200,
  payload: { success: true, data },
});

const GROUPS = [
  { name: 'Feeding', sortOrder: 1 },
  { name: 'Resting', sortOrder: 3 },
];

const BEHAVIORS = [
  {
    value: 'feeding_prey',
    label: 'Feeding on prey',
    group: 'Feeding',
    requiresLocation: true,
    requiresObject: false,
    requiresObjectInteraction: false,
    requiresAnimal: false,
    requiresAnimalInteraction: false,
    requiresDescription: false,
    excelRowLabel: 'Feeding',
    excelRowOrder: 1,
    retired: false,
  },
  {
    value: 'old_resting',
    label: 'Old resting',
    group: 'Resting',
    requiresLocation: false,
    requiresObject: false,
    requiresObjectInteraction: false,
    requiresAnimal: false,
    requiresAnimalInteraction: false,
    requiresDescription: false,
    excelRowLabel: 'Resting',
    excelRowOrder: 2,
    retired: true,
  },
];

const ENABLEMENT = {
  'sayyidas-cove': {
    behaviors: ['feeding_prey'],
    object: [],
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
    <BehaviorCatalog
      groups={GROUPS}
      behaviors={BEHAVIORS}
      aviarySlugs={['sayyidas-cove']}
      aviaryNames={{ 'sayyidas-cove': "Sayyida's Cove" }}
      enablement={ENABLEMENT}
      onChanged={onChanged}
    />
  );
}

describe('BehaviorCatalog', () => {
  it('adds a behavior with flags, group, and Excel row placement', async () => {
    createBehavior.mockResolvedValueOnce(ok({ value: 'stretching' }));
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getByText('Add a behavior'));
    const form = screen
      .getByRole('button', { name: 'Add behavior' })
      .closest('form');
    await user.type(within(form).getByLabelText('Value'), 'stretching');
    await user.type(within(form).getByLabelText('Label'), 'Stretching');
    await user.selectOptions(within(form).getByLabelText('Group'), 'Resting');
    await user.type(
      within(form).getByLabelText('Excel row label'),
      'Stretching'
    );
    await user.selectOptions(
      within(form).getByLabelText('Excel row position'),
      'feeding_prey'
    );
    await user.click(within(form).getByLabelText('Needs a location'));
    await user.click(screen.getByRole('button', { name: 'Add behavior' }));

    expect(createBehavior).toHaveBeenCalledWith({
      value: 'stretching',
      label: 'Stretching',
      group: 'Resting',
      excelRowLabel: 'Stretching',
      insertAfter: 'feeding_prey',
      requiresLocation: true,
      requiresObject: false,
      requiresObjectInteraction: false,
      requiresAnimal: false,
      requiresAnimalInteraction: false,
      requiresDescription: false,
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('omits insertAfter entirely for the default at-the-end placement', async () => {
    createBehavior.mockResolvedValueOnce(ok({ value: 'preening' }));
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getByText('Add a behavior'));
    const form = screen
      .getByRole('button', { name: 'Add behavior' })
      .closest('form');
    await user.type(within(form).getByLabelText('Value'), 'preening');
    await user.type(within(form).getByLabelText('Label'), 'Preening');
    await user.type(within(form).getByLabelText('Excel row label'), 'Preening');
    await user.click(screen.getByRole('button', { name: 'Add behavior' }));

    // The server rejects insertAfter: '' (wire-value pattern) — the default
    // path must drop the key, not send an empty string
    expect(createBehavior).toHaveBeenCalledTimes(1);
    expect(createBehavior.mock.calls[0][0]).not.toHaveProperty('insertAfter');
    expect(createBehavior.mock.calls[0][0]).toMatchObject({
      value: 'preening',
      group: 'Feeding',
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('adds a behavior group with the next sort order prefilled', async () => {
    createBehaviorGroup.mockResolvedValueOnce(ok({ name: 'Vocalization' }));
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getByText('Add a behavior group'));
    await user.type(screen.getByLabelText('Group name'), 'Vocalization');
    await user.click(screen.getByRole('button', { name: 'Add group' }));

    expect(createBehaviorGroup).toHaveBeenCalledWith({
      name: 'Vocalization',
      sortOrder: 4,
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('edits a behavior inline, sending the full editable state', async () => {
    updateBehavior.mockResolvedValueOnce(ok());
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getAllByRole('button', { name: 'Edit…' })[0]);
    const form = screen
      .getByRole('button', { name: 'Save behavior' })
      .closest('form');
    await user.click(within(form).getByLabelText('Needs a description'));
    await user.click(screen.getByRole('button', { name: 'Save behavior' }));

    expect(updateBehavior).toHaveBeenCalledWith('feeding_prey', {
      label: 'Feeding on prey',
      group: 'Feeding',
      excelRowLabel: 'Feeding',
      requiresLocation: true,
      requiresObject: false,
      requiresObjectInteraction: false,
      requiresAnimal: false,
      requiresAnimalInteraction: false,
      requiresDescription: true,
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('retires and unretires with one click', async () => {
    updateBehavior.mockResolvedValue(ok());
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getByRole('button', { name: 'Retire' }));
    expect(updateBehavior).toHaveBeenCalledWith('feeding_prey', {
      retired: true,
    });

    await user.click(screen.getByRole('button', { name: 'Unretire' }));
    expect(updateBehavior).toHaveBeenCalledWith('old_resting', {
      retired: false,
    });
  });

  it("surfaces the API's refusal when removing a published behavior", async () => {
    deleteBehavior.mockResolvedValueOnce({
      ok: false,
      status: 409,
      payload: {
        success: false,
        error:
          'This behavior appears in a published config version and cannot be deleted — retire it instead',
      },
    });
    const user = userEvent.setup();
    renderCatalog();

    // In-app confirm (SM-1): arm, then confirm
    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(screen.getByText('Remove "Feeding on prey"?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(deleteBehavior).toHaveBeenCalledWith('feeding_prey');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /retire it instead/
    );
    expect(onChanged).not.toHaveBeenCalled();
  });
});
