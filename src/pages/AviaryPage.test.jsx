import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import AviaryPage from './AviaryPage';
import { fetchAviary, fetchVocabulary, deleteAviary } from '../api';

vi.mock('../api', () => ({
  fetchAviary: vi.fn(),
  deleteAviary: vi.fn(),
  // Imported by the editing sections the page composes
  createSubject: vi.fn(),
  updateSubject: vi.fn(),
  changeSubjectType: vi.fn(),
  deleteSubject: vi.fn(),
  createPerch: vi.fn(),
  updatePerch: vi.fn(),
  deletePerch: vi.fn(),
  fetchVocabulary: vi.fn(),
  setEnablement: vi.fn(),
  mintDiagramUpload: vi.fn(),
  setDiagrams: vi.fn(),
  uploadToBucket: vi.fn(),
  updateAviary: vi.fn(),
}));

// An inactive (draft) variant of the fixture — the delete affordance only
// appears for inactive aviaries
const inactive = (payload) => ({
  ...payload,
  payload: {
    ...payload.payload,
    data: { ...payload.payload.data, isActive: false },
  },
});

const AVIARY = {
  ok: true,
  status: 200,
  payload: {
    success: true,
    data: {
      slug: 'sayyidas-cove',
      name: "Sayyida's Cove",
      isActive: true,
      diagrams: [
        { url: 'https://pub-x.r2.dev/ne.webp', label: 'NE half' },
        { url: 'https://pub-x.r2.dev/sw.webp', label: 'SW half' },
      ],
      perches: [
        {
          value: '12',
          label: 'Perch 12',
          group: 'High perches',
          retired: false,
        },
        { value: 'Ground', label: 'Ground', group: null, retired: false },
      ],
      subjects: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Sayyida',
          species: 'Barred Owl',
          type: 'foster_parent',
          arrivedOn: '2024-01-01',
          departedOn: null,
          current: true,
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: '187(B)',
          species: 'Barred Owl',
          type: 'juvenile',
          arrivedOn: '2026-06-01',
          departedOn: null,
          current: true,
        },
      ],
      enabled: {
        behaviors: ['resting', 'flying'],
        object: ['ball'],
        object_interaction: [],
        animal: [],
        animal_interaction: [],
      },
    },
  },
};

function renderAt(slug) {
  render(
    <MemoryRouter initialEntries={[`/aviaries/${slug}`]}>
      <Routes>
        <Route path="/aviaries/:slug" element={<AviaryPage />} />
        <Route path="/" element={<div>Overview stub</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // The enablement editor fetches the catalog on mount
  fetchVocabulary.mockResolvedValue({
    ok: true,
    status: 200,
    payload: {
      success: true,
      data: {
        behaviorGroups: [],
        behaviors: [],
        options: {
          object: [],
          object_interaction: [],
          animal: [],
          animal_interaction: [],
        },
        enablement: {},
      },
    },
  });
});

describe('AviaryPage', () => {
  it('renders subjects, diagrams, and perches for the routed slug', async () => {
    fetchAviary.mockResolvedValueOnce(AVIARY);
    renderAt('sayyidas-cove');

    expect(
      await screen.findByRole('heading', { name: /sayyida's cove/i })
    ).toBeInTheDocument();
    expect(fetchAviary).toHaveBeenCalledWith('sayyidas-cove');

    expect(screen.getByText('187(B)')).toBeInTheDocument();
    expect(screen.getAllByText('Current')).toHaveLength(2);

    expect(screen.getByAltText('Perch diagram: NE half')).toHaveAttribute(
      'src',
      'https://pub-x.r2.dev/ne.webp'
    );

    expect(screen.getByText('Perch 12')).toBeInTheDocument();
    expect(screen.getByText(/2 behaviors enabled/)).toBeInTheDocument();
  });

  it('shows the API error with a way back for unknown slugs', async () => {
    fetchAviary.mockResolvedValueOnce({
      ok: false,
      status: 404,
      payload: { success: false, error: 'Unknown aviary' },
    });
    renderAt('nowhere');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unknown aviary'
    );
    expect(
      screen.getByRole('link', { name: /back to overview/i })
    ).toBeInTheDocument();
  });

  it('offers delete only for an inactive draft, not an active aviary', async () => {
    fetchAviary.mockResolvedValueOnce(AVIARY); // isActive: true
    renderAt('sayyidas-cove');
    await screen.findByRole('heading', { name: /sayyida's cove/i });
    expect(
      screen.queryByRole('button', { name: /delete this draft aviary/i })
    ).not.toBeInTheDocument();
  });

  it('deletes an inactive draft after confirmation and returns to the overview', async () => {
    fetchAviary.mockResolvedValueOnce(inactive(AVIARY));
    deleteAviary.mockResolvedValueOnce({
      ok: true,
      status: 200,
      payload: { success: true, data: { slug: 'sayyidas-cove' } },
    });
    const user = userEvent.setup();
    renderAt('sayyidas-cove');

    await user.click(
      await screen.findByRole('button', { name: /delete this draft aviary/i })
    );
    expect(deleteAviary).not.toHaveBeenCalled(); // armed, not fired
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(deleteAviary).toHaveBeenCalledWith('sayyidas-cove');
    expect(await screen.findByText('Overview stub')).toBeInTheDocument();
  });

  it("surfaces the server's refusal and stays put when delete is blocked", async () => {
    fetchAviary.mockResolvedValueOnce(inactive(AVIARY));
    deleteAviary.mockResolvedValueOnce({
      ok: false,
      status: 409,
      payload: {
        success: false,
        error:
          "This aviary is in a published config version and can't be deleted",
      },
    });
    const user = userEvent.setup();
    renderAt('sayyidas-cove');

    await user.click(
      await screen.findByRole('button', { name: /delete this draft aviary/i })
    );
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /published config version/
    );
    expect(screen.queryByText('Overview stub')).not.toBeInTheDocument();
  });
});
