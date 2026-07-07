import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import VocabularyPage from './VocabularyPage';
import { fetchVocabulary } from '../api';

vi.mock('../api', () => ({
  fetchVocabulary: vi.fn(),
}));

const VOCAB = {
  ok: true,
  status: 200,
  payload: {
    success: true,
    data: {
      behaviorGroups: [
        { name: 'Feeding', sortOrder: 1 },
        { name: 'Resting', sortOrder: 3 },
      ],
      behaviors: [
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
      ],
      options: {
        object: [{ value: 'ball', label: 'Ball', retired: false }],
        object_interaction: [],
        animal: [],
        animal_interaction: [],
      },
      enablement: {
        'sayyidas-cove': {
          behaviors: ['feeding_prey'],
          object: ['ball'],
          object_interaction: [],
          animal: [],
          animal_interaction: [],
        },
      },
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VocabularyPage', () => {
  it('renders the grouped catalog with flags, retirement, and the enablement matrix', async () => {
    fetchVocabulary.mockResolvedValueOnce(VOCAB);
    render(<VocabularyPage />);

    expect(
      await screen.findByRole('heading', { name: 'Feeding' })
    ).toBeInTheDocument();
    expect(screen.getByText('Feeding on prey')).toBeInTheDocument();
    expect(screen.getByText('location')).toBeInTheDocument(); // requires-flag summary
    expect(screen.getByText('Retired')).toBeInTheDocument(); // old_resting badge

    // Enablement: feeding_prey enabled (✓), old_resting not
    const feedingRow = screen.getByText('feeding_prey').closest('tr');
    expect(feedingRow).toHaveTextContent('✓');
    const retiredRow = screen.getByText('old_resting').closest('tr');
    expect(retiredRow).not.toHaveTextContent('✓');

    expect(
      screen.getByRole('heading', { name: 'Objects' })
    ).toBeInTheDocument();
    expect(screen.getByText('Ball')).toBeInTheDocument();
  });
});
