import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getDiscoveryControllerCategoriesQueryKey,
  useDiscoveryControllerCategories,
  useDiscoveryControllerCreateCategory,
} from '@/api/generated/discovery/discovery';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { languageCode } from '@/features/resources/resource-utils';
import { cn } from '@/lib/cn';

type CategoryPickerProps = {
  error?: boolean;
  idPrefix: string;
  onChange: (categoryIds: string[]) => void;
  value: string[];
};

export function CategoryPicker({
  error,
  idPrefix,
  onChange,
  value,
}: CategoryPickerProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const lang = languageCode(i18n.language);
  const categories = useDiscoveryControllerCategories();
  const createCategory = useDiscoveryControllerCreateCategory();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');

  const addCategory = async (): Promise<void> => {
    const name = newName.trim();
    if (name.length < 2 || createCategory.isPending) return;
    setAddError('');
    try {
      await createCategory.mutateAsync({ data: { name } });
      setNewName('');
      void queryClient.invalidateQueries({
        queryKey: getDiscoveryControllerCategoriesQueryKey(),
      });
    } catch {
      setAddError(t('categoryAddError'));
    }
  };

  return (
    <fieldset
      aria-busy={categories.isPending}
      aria-describedby={error ? `${idPrefix}-categories-error` : undefined}
      aria-invalid={error}
      className="grid gap-3"
      tabIndex={-1}
    >
      <legend className="mb-3 text-sm font-medium text-text">{t('chooseCategories')}</legend>
      <div className="flex flex-wrap gap-2">
        {categories.isPending ? (
          <p className="text-sm text-text-muted" role="status">
            {t('loadingCategories')}
          </p>
        ) : null}
        {categories.data?.map((category) => {
          const checked = value.includes(category.id);
          const categoryName =
            lang === 'ar' ? category.nameAr : lang === 'tr' ? category.nameTr : category.nameEn;
          return (
            <div
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors',
                checked
                  ? 'border-primary/40 bg-primary-soft'
                  : 'border-border-control bg-surface-soft hover:border-border-control-hover',
              )}
              key={category.id}
            >
              <Checkbox
                checked={checked}
                className="size-3.5 rounded-xs [&_svg]:size-2.5"
                id={`${idPrefix}-category-${category.id}`}
                onCheckedChange={(next) =>
                  onChange(
                    next
                      ? [...value, category.id]
                      : value.filter((idValue) => idValue !== category.id),
                  )
                }
              />
              <Label
                className={cn(
                  'cursor-pointer text-sm font-medium',
                  checked ? 'text-primary-soft-text' : 'text-text-muted',
                )}
                htmlFor={`${idPrefix}-category-${category.id}`}
              >
                {categoryName}
              </Label>
            </div>
          );
        })}
      </div>
      {categories.isError ? (
        <p className="text-xs font-medium text-danger">{t('categoriesLoadError')}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={t('newCategoryName')}
          className="max-w-64"
          maxLength={40}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            void addCategory();
          }}
          placeholder={t('newCategoryName')}
          value={newName}
        />
        <Button
          disabled={createCategory.isPending || newName.trim().length < 2}
          onClick={() => void addCategory()}
          size="sm"
          type="button"
          variant="secondary"
        >
          {createCategory.isPending ? t('addingCategory') : t('addCategory')}
        </Button>
      </div>
      {addError ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {addError}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs font-medium text-danger" id={`${idPrefix}-categories-error`}>
          {t('formFieldInvalid')}
        </p>
      ) : null}
    </fieldset>
  );
}
