import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NewAviaryPage from './NewAviaryPage';
import { suggestSlug } from '../slug';
import { createAviary, fetchOverview } from '../api';

vi.mock('../api', () => ({
  createAviary: vi.fn(),
  fetchOverview: vi.fn(),
}));

const OVERVIEW = {
  ok: true,
  status: 200,
  payload: {
    success: true,
    data: {
      aviaries: [
        { slug: 'sayyidas-cove', name: "Sayyida's Cove", isActive: true },
      ],
      latestVersion: { version: 5 },
      unpublishedChanges: false,
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchOverview.mockResolvedValue(OVERVIEW);
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/aviaries/new']}>
      <Routes>
        <Route path="/aviaries/new" element={<NewAviaryPage />} />
        <Route path="/aviaries/:slug" element={<p>aviary page for test</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('suggestSlug', () => {
  it('derives API-valid slugs from display names', () => {
    expect(suggestSlug('Kestrel Corner')).toBe('kestrel-corner');
    expect(suggestSlug("Sayyida's Cove")).toBe('sayyida-s-cove');
    expect(suggestSlug('  Volière  #2  ')).toBe('voliere-2');
  });
});

describe('NewAviaryPage', () => {
  it('creates a blank aviary and navigates to its page', async () => {
    createAviary.mockResolvedValueOnce({
      ok: true,
      status: 201,
      payload: {
        success: true,
        data: { slug: 'kestrel-corner', name: 'Kestrel Corner' },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Name'), 'Kestrel Corner');
    expect(screen.getByLabelText('Slug')).toHaveValue('kestrel-corner');
    await user.click(
      screen.getByRole('button', { name: 'Create draft aviary' })
    );

    expect(createAviary).toHaveBeenCalledWith({
      slug: 'kestrel-corner',
      name: 'Kestrel Corner',
    });
    expect(await screen.findByText('aviary page for test')).toBeInTheDocument();
  });

  it('passes the template slug when cloning', async () => {
    createAviary.mockResolvedValueOnce({
      ok: true,
      status: 201,
      payload: { success: true, data: { slug: 'kestrel-corner' } },
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Name'), 'Kestrel Corner');
    await user.selectOptions(
      screen.getByLabelText('Start from'),
      'sayyidas-cove'
    );
    await user.click(
      screen.getByRole('button', { name: 'Create draft aviary' })
    );

    expect(createAviary).toHaveBeenCalledWith({
      slug: 'kestrel-corner',
      name: 'Kestrel Corner',
      cloneFrom: 'sayyidas-cove',
    });
  });

  it('keeps a hand-edited slug when the name keeps changing', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Name'), 'Kestrel');
    const slugInput = screen.getByLabelText('Slug');
    await user.clear(slugInput);
    await user.type(slugInput, 'kc');
    await user.type(screen.getByLabelText('Name'), ' Corner');

    expect(slugInput).toHaveValue('kc');
  });

  it("shows the server's rejection (e.g. duplicate slug) inline", async () => {
    createAviary.mockResolvedValueOnce({
      ok: false,
      status: 409,
      payload: {
        success: false,
        error: 'An aviary with that slug or name already exists',
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Name'), "Sayyida's Cove");
    await user.click(
      screen.getByRole('button', { name: 'Create draft aviary' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /already exists/
    );
    expect(screen.queryByText('aviary page for test')).not.toBeInTheDocument();
  });
});
