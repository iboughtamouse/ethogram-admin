import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminsPage from './AdminsPage';
import { fetchAdmins, createAdmin, setAdminActive } from '../api';

vi.mock('../api', () => ({
  fetchAdmins: vi.fn(),
  createAdmin: vi.fn(),
  setAdminActive: vi.fn(),
}));

const ok = (data = {}) => ({
  ok: true,
  status: 200,
  payload: { success: true, data },
});

const LIST = ok({
  admins: [
    {
      id: 'me',
      email: 'owner@example.com',
      displayName: 'Owner',
      isActive: true,
    },
    {
      id: 'colleague',
      email: 'poppy@example.com',
      displayName: 'Poppy',
      isActive: true,
    },
    {
      id: 'gone',
      email: 'left@example.com',
      displayName: 'Departed Dan',
      isActive: false,
    },
  ],
});

const CURRENT = { email: 'owner@example.com', displayName: 'Owner' };

beforeEach(() => {
  vi.clearAllMocks();
  fetchAdmins.mockResolvedValue(LIST);
});

function renderPage() {
  return render(<AdminsPage currentUser={CURRENT} />);
}

async function findRow(name) {
  return (await screen.findByText(name)).closest('tr');
}

describe('AdminsPage', () => {
  it('lists admins and marks the current admin without a Remove button', async () => {
    renderPage();

    const meRow = within(await findRow('Owner'));
    expect(meRow.getByText('you')).toBeInTheDocument();
    expect(
      meRow.queryByRole('button', { name: 'Remove' })
    ).not.toBeInTheDocument();

    // An active colleague can be removed; a removed one can be reactivated
    expect(
      within(await findRow('Poppy')).getByRole('button', { name: 'Remove' })
    ).toBeInTheDocument();
    const goneRow = within(await findRow('Departed Dan'));
    expect(
      goneRow.getByRole('button', { name: 'Reactivate' })
    ).toBeInTheDocument();
    expect(goneRow.getByText('Removed')).toBeInTheDocument();
  });

  it('removes a colleague after in-app confirmation', async () => {
    setAdminActive.mockResolvedValueOnce(ok());
    const user = userEvent.setup();
    renderPage();

    await user.click(
      within(await findRow('Poppy')).getByRole('button', { name: 'Remove' })
    );
    // Armed confirmation, not yet called
    expect(setAdminActive).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(setAdminActive).toHaveBeenCalledWith('colleague', false);
  });

  it('reactivates a removed admin', async () => {
    setAdminActive.mockResolvedValueOnce(ok());
    const user = userEvent.setup();
    renderPage();

    await user.click(
      within(await findRow('Departed Dan')).getByRole('button', {
        name: 'Reactivate',
      })
    );
    expect(setAdminActive).toHaveBeenCalledWith('gone', true);
  });

  it('adds an admin, trimming the inputs, and clears the form on success', async () => {
    createAdmin.mockResolvedValueOnce(ok({ id: 'new' }));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText('Add an admin'));
    await user.type(screen.getByLabelText('Email'), '  new@example.com  ');
    await user.type(screen.getByLabelText('Display name'), '  Wren  ');
    await user.click(screen.getByRole('button', { name: 'Add admin' }));

    expect(createAdmin).toHaveBeenCalledWith({
      email: 'new@example.com',
      displayName: 'Wren',
    });
    // Cleared after success
    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(screen.getByLabelText('Display name')).toHaveValue('');
  });

  it("surfaces the server's message when an add is rejected", async () => {
    createAdmin.mockResolvedValueOnce({
      ok: false,
      status: 409,
      payload: { success: false, error: 'That email is already an admin' },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText('Add an admin'));
    await user.type(screen.getByLabelText('Email'), 'poppy@example.com');
    await user.type(screen.getByLabelText('Display name'), 'Poppy');
    await user.click(screen.getByRole('button', { name: 'Add admin' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /already an admin/
    );
  });
});
