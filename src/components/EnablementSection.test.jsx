import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnablementSection from './EnablementSection';
import { fetchVocabulary, setEnablement } from '../api';

vi.mock('../api', () => ({
  fetchVocabulary: vi.fn(),
  setEnablement: vi.fn(),
}));

const CATALOG = {
  ok: true,
  status: 200,
  payload: {
    success: true,
    data: {
      behaviorGroups: [
        { name: 'Locomotion', sortOrder: 1 },
        { name: 'Resting', sortOrder: 2 },
      ],
      behaviors: [
        {
          value: 'flying',
          label: 'Flying',
          group: 'Locomotion',
          retired: false,
        },
        {
          value: 'hopping',
          label: 'Hopping',
          group: 'Locomotion',
          retired: false,
        },
        {
          value: 'resting',
          label: 'Resting',
          group: 'Resting',
          retired: false,
        },
      ],
      options: {
        object: [
          { value: 'ball', label: 'Ball', retired: false },
          { value: 'rope', label: 'Rope', retired: true },
        ],
        object_interaction: [],
        animal: [],
        animal_interaction: [],
      },
      enablement: {},
    },
  },
};

const ENABLED = {
  behaviors: ['flying'],
  object: ['ball'],
  object_interaction: [],
  animal: [],
  animal_interaction: [],
};

const ok = (data = {}) => ({
  ok: true,
  status: 200,
  payload: { success: true, data },
});

let onChanged;

beforeEach(() => {
  vi.clearAllMocks();
  onChanged = vi.fn();
  fetchVocabulary.mockResolvedValue(CATALOG);
});

function renderSection() {
  render(
    <EnablementSection
      slug="sayyidas-cove"
      enabled={ENABLED}
      onChanged={onChanged}
    />
  );
}

describe('EnablementSection', () => {
  it('checks exactly the enabled entries', async () => {
    renderSection();

    expect(await screen.findByLabelText('Flying')).toBeChecked();
    expect(screen.getByLabelText('Hopping')).not.toBeChecked();
    expect(screen.getByLabelText('Ball')).toBeChecked();
    expect(screen.getByLabelText(/Rope/)).not.toBeChecked();
  });

  it('saves the complete replace-set after toggling', async () => {
    setEnablement.mockResolvedValueOnce(ok({ slug: 'sayyidas-cove' }));
    const user = userEvent.setup();
    renderSection();

    const save = await screen.findByRole('button', {
      name: 'Save enabled vocabulary',
    });
    expect(save).toBeDisabled();

    await user.click(screen.getByLabelText('Hopping'));
    await user.click(screen.getByLabelText('Ball'));
    expect(save).toBeEnabled();
    await user.click(save);

    expect(setEnablement).toHaveBeenCalledWith('sayyidas-cove', {
      behaviors: ['flying', 'hopping'],
      object: [],
      object_interaction: [],
      animal: [],
      animal_interaction: [],
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('re-disables save when a toggle is undone', async () => {
    const user = userEvent.setup();
    renderSection();

    const save = await screen.findByRole('button', {
      name: 'Save enabled vocabulary',
    });
    await user.click(screen.getByLabelText('Hopping'));
    expect(save).toBeEnabled();
    await user.click(screen.getByLabelText('Hopping'));
    expect(save).toBeDisabled();
    expect(setEnablement).not.toHaveBeenCalled();
  });
});
