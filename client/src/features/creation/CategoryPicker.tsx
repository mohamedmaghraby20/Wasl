import { useTranslation } from 'react-i18next';
import { useDiscoveryControllerCategories } from '@/api/generated/discovery/discovery';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { languageCode } from '@/features/resources/resource-utils';
import { cn } from '@/lib/cn';

type CategoryPickerProps = {
  error?: boolean;
  idPrefix: string;
  max: number;
  onChange: (categoryIds: string[]) => void;
  value: string[];
};

export function CategoryPicker({
  error,
  idPrefix,
  max,
  onChange,
  value,
}: CategoryPickerProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const lang = languageCode(i18n.language);
  const categories = useDiscoveryControllerCategories();

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
          const atLimit = !checked && value.length >= max;
          const categoryName =
            lang === 'ar' ? category.nameAr : lang === 'tr' ? category.nameTr : category.nameEn;
          return (
            <div
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors',
                checked
                  ? 'border-primary/40 bg-primary-soft'
                  : 'border-border-control bg-surface-soft hover:border-border-control-hover',
                atLimit && 'opacity-60',
              )}
              key={category.id}
            >
              <Checkbox
                checked={checked}
                className="size-3.5 rounded-xs [&_svg]:size-2.5"
                disabled={atLimit}
                id={`${idPrefix}-category-${category.id}`}
                onCheckedChange={(next) => {
                  if (next && value.length >= max) return;
                  onChange(
                    next
                      ? [...value, category.id]
                      : value.filter((idValue) => idValue !== category.id),
                  );
                }}
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
      {error ? (
        <p className="text-xs font-medium text-danger" id={`${idPrefix}-categories-error`}>
          {t('formFieldInvalid')}
        </p>
      ) : null}
    </fieldset>
  );
}
