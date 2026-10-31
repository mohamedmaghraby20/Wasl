import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { CategoryPicker } from './CategoryPicker';

const mocks = vi.hoisted(() => ({
  categories: vi.fn(),
  createCategory: vi.fn(),
}));

vi.mock('@/api/generated/discovery/discovery', () => ({
  getDiscoveryControllerCategoriesQueryKey: () => ['discoveryControllerCategories'],
  useDiscoveryControllerCategories: mocks.categories,
  useDiscoveryControllerCreateCategory: mocks.createCategory,
}));

const photography = {
  id: 'photography',
  nameEn: 'Photography',
  nameAr: 'Photography',
  nameTr: 'Photography',
};

function renderPicker(onChange = vi.fn()): void {
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <CategoryPicker idPrefix="test" onChange={onChange} value={[]} />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe('CategoryPicker', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
    mocks.categories.mockReturnValue({ data: [photography], isPending: false, isError: false });
    mocks.createCategory.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(photography),
      isPending: false,
    });
  });

  it('selects an existing category', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mocks.categories.mockReturnValue({ data: [photography], isPending: false, isError: false });
    renderPicker(onChange);

    await user.click(screen.getByLabelText('Photography'));
    expect(onChange).toHaveBeenCalledWith(['photography']);
  });

  it('creates a category from the name field and clears it', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue(photography);
    mocks.createCategory.mockReturnValue({ mutateAsync, isPending: false });
    renderPicker();

    const input = screen.getByLabelText('New category name');
    await user.type(input, 'Photography');
    await user.click(screen.getByRole('button', { name: 'Add category' }));

    expect(mutateAsync).toHaveBeenCalledWith({ data: { name: 'Photography' } });
    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('reports a failed create without clearing the name', async () => {
    const user = userEvent.setup();
    mocks.createCategory.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error('offline')),
      isPending: false,
    });
    renderPicker();

    const input = screen.getByLabelText('New category name');
    await user.type(input, 'Pottery');
    await user.click(screen.getByRole('button', { name: 'Add category' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The category could not be added. Try again.',
    );
    expect(input).toHaveValue('Pottery');
  });
});
