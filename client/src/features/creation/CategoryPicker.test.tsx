import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/lib/i18n';
import { CategoryPicker } from './CategoryPicker';

const mocks = vi.hoisted(() => ({ categories: vi.fn() }));

vi.mock('@/api/generated/discovery/discovery', () => ({
  useDiscoveryControllerCategories: mocks.categories,
}));

const categories = ['education', 'sports', 'music', 'food'].map((id) => ({
  id,
  nameEn: id,
  nameAr: id,
  nameTr: id,
}));

function renderPicker(value: string[], onChange = vi.fn()): void {
  render(
    <I18nextProvider i18n={i18n}>
      <CategoryPicker idPrefix="test" max={3} onChange={onChange} value={value} />
    </I18nextProvider>,
  );
}

describe('CategoryPicker', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
    mocks.categories.mockReturnValue({ data: categories, isPending: false, isError: false });
  });

  it('adds a category while under the limit', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPicker(['education'], onChange);

    await user.click(screen.getByLabelText('sports'));
    expect(onChange).toHaveBeenCalledWith(['education', 'sports']);
  });

  it('disables unselected categories once the limit is reached', () => {
    renderPicker(['education', 'sports', 'music']);

    expect(screen.getByLabelText('education')).toBeEnabled();
    expect(screen.getByLabelText('food')).toBeDisabled();
  });
});
