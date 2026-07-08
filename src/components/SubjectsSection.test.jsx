import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubjectsSection from './SubjectsSection';
import {
  createSubject,
  updateSubject,
  changeSubjectType,
  deleteSubject,
} from '../api';

vi.mock('../api', () => ({
  createSubject: vi.fn(),
  updateSubject: vi.fn(),
  changeSubjectType: vi.fn(),
  deleteSubject: vi.fn(),
}));

const ok = (data = {}) => ({
  ok: true,
  status: 200,
  payload: { success: true, data },
});

const SAYYIDA_ID = '11111111-1111-4111-8111-111111111111';
const JUVENILE_ID = '22222222-2222-4222-8222-222222222222';

const SUBJECTS = [
  {
    id: SAYYIDA_ID,
    name: 'Sayyida',
    species: 'Barred Owl',
    type: 'foster_parent',
    arrivedOn: '2025-12-15',
    departedOn: null,
    current: true,
  },
  {
    id: JUVENILE_ID,
    name: '187(B)',
    species: 'Barred Owl',
    type: 'juvenile',
    arrivedOn: '2026-06-01',
    departedOn: '2026-07-01',
    current: false,
  },
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
    <SubjectsSection
      slug="sayyidas-cove"
      subjects={SUBJECTS}
      onChanged={onChanged}
    />
  );
}

describe('SubjectsSection', () => {
  it('adds a subject with name, species, type, and arrival date', async () => {
    createSubject.mockResolvedValueOnce(ok({ id: 'new', name: 'Zephyr' }));
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByText('Add a subject'));
    await user.type(screen.getByLabelText('Name'), 'Zephyr');
    await user.type(screen.getByLabelText('Species'), 'Barred Owl');
    await user.selectOptions(screen.getByLabelText('Type'), 'baby');
    fireEvent.change(screen.getByLabelText('Arrival date'), {
      target: { value: '2026-07-07' },
    });
    await user.click(screen.getByRole('button', { name: 'Add subject' }));

    expect(createSubject).toHaveBeenCalledWith('sayyidas-cove', {
      name: 'Zephyr',
      species: 'Barred Owl',
      type: 'baby',
      arrivedOn: '2026-07-07',
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('records a departure for an open episode', async () => {
    updateSubject.mockResolvedValueOnce(ok());
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Departed…' }));
    fireEvent.change(screen.getByLabelText('Departure date'), {
      target: { value: '2026-07-07' },
    });
    await user.click(screen.getByRole('button', { name: 'Record departure' }));

    expect(updateSubject).toHaveBeenCalledWith(SAYYIDA_ID, {
      departedOn: '2026-07-07',
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('changes type as one close-and-reopen action', async () => {
    changeSubjectType.mockResolvedValueOnce(
      ok({ closedId: SAYYIDA_ID, openedId: 'new' })
    );
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Change type…' }));
    await user.selectOptions(screen.getByLabelText('New type'), 'juvenile');
    fireEvent.change(screen.getByLabelText('Effective date'), {
      target: { value: '2026-07-07' },
    });
    await user.click(screen.getByRole('button', { name: 'Change type' }));

    expect(changeSubjectType).toHaveBeenCalledWith(SAYYIDA_ID, {
      newType: 'juvenile',
      effectiveOn: '2026-07-07',
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('offers departure and type change only for open episodes', () => {
    renderSection();
    // One open episode (Sayyida) → one of each button; the departed juvenile
    // only gets Remove
    expect(screen.getAllByRole('button', { name: 'Departed…' })).toHaveLength(
      1
    );
    expect(
      screen.getAllByRole('button', { name: 'Change type…' })
    ).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2);
  });

  it("surfaces the API's refusal when removing a published episode", async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteSubject.mockResolvedValueOnce({
      ok: false,
      status: 409,
      payload: {
        success: false,
        error:
          'This episode appears in a published config version and cannot be deleted — record a departure instead',
      },
    });
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

    expect(deleteSubject).toHaveBeenCalledWith(SAYYIDA_ID);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /record a departure instead/
    );
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('does nothing when the remove confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

    expect(deleteSubject).not.toHaveBeenCalled();
  });
});
