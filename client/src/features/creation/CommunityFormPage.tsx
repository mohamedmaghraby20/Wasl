import { zodResolver } from '@hookform/resolvers/zod';
import { useHead } from '@unhead/react';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import {
  useCommunitiesControllerCreate,
  useCommunitiesControllerUpdate,
} from '@/api/generated/communities/communities';
import { useOrganizationsControllerMine } from '@/api/generated/organizations/organizations';
import {
  useDiscoveryControllerCategories,
  useDiscoveryControllerCities,
  useDiscoveryControllerCommunity,
} from '@/api/generated/discovery/discovery';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/features/auth/AuthProvider';
import { languageCode } from '@/features/resources/resource-utils';
import { cn } from '@/lib/cn';

const formSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(5000),
  cityId: z.string().min(1),
  categoryIds: z.array(z.string()).min(1).max(5),
  admissionMode: z.enum(['open', 'approval', 'automatic']),
  capacity: z
    .string()
    .refine(
      (value) => !value || (/^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 10000),
    ),
  organizationId: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function CommunityFormPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const editing = Boolean(id);
  const lang = languageCode(i18n.language);
  const existing = useDiscoveryControllerCommunity(id, { lang }, { query: { enabled: editing } });
  const cities = useDiscoveryControllerCities();
  const categories = useDiscoveryControllerCategories();
  const organizations = useOrganizationsControllerMine({
    query: { enabled: Boolean(user) && !editing },
  });
  const create = useCommunitiesControllerCreate();
  const update = useCommunitiesControllerUpdate();
  const [formError, setFormError] = useState('');
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      cityId: '',
      categoryIds: [],
      admissionMode: 'open',
      capacity: '',
      organizationId: '',
    },
  });

  useHead({ title: t(editing ? 'editCommunity' : 'createCommunityTitle') });
  useEffect(() => {
    const community = existing.data;
    if (!community) return;
    form.reset({
      name: community.name,
      description: community.description,
      cityId: community.cityId,
      categoryIds: community.categories.map((category) => category.id),
      admissionMode: community.admissionMode as FormValues['admissionMode'],
      capacity: community.capacity === null ? '' : String(community.capacity),
    });
  }, [existing.data, form]);

  if (!loading && !user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`} />;
  }
  if (loading || (editing && existing.isPending))
    return (
      <p className="text-sm text-text-muted" role="status">
        {t('authWorking')}
      </p>
    );
  if (editing && existing.isError)
    return (
      <p className="text-sm font-medium text-danger" role="alert">
        {t('resourceEditLoadError')}
      </p>
    );

  const categoryIds = form.watch('categoryIds');
  const errors = form.formState.errors;

  const save = async (values: FormValues): Promise<void> => {
    setFormError('');
    const payload = {
      name: values.name,
      description: values.description,
      cityId: values.cityId,
      categoryIds: values.categoryIds,
      admissionMode: values.admissionMode,
      capacity: values.capacity ? Number(values.capacity) : null,
      organizationId: editing ? null : values.organizationId || null,
    };
    try {
      const saved = editing
        ? await update.mutateAsync({ id: existing.data!.id, data: payload })
        : await create.mutateAsync({ data: payload });
      void navigate(`/communities/${saved.slug}`);
    } catch {
      setFormError(t('resourceSaveError'));
    }
  };

  return (
    <section className="mx-auto grid max-w-(--container-reading) gap-6">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
        to={editing ? `/communities/${existing.data!.slug}` : '/create'}
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t(editing ? 'backToCommunity' : 'backToCreate')}
      </Link>
      <header className="grid gap-2">
        <h1 className="text-3xl font-extrabold">
          {t(editing ? 'editCommunity' : 'createCommunityTitle')}
        </h1>
        <p className="text-sm leading-relaxed text-text-muted">{t('communityFormIntro')}</p>
      </header>

      <Card>
        <form
          className="grid gap-6 p-5 sm:p-7"
          onSubmit={(event) => void form.handleSubmit((values) => void save(values))(event)}
        >
          {Object.keys(errors).length > 0 ? (
            <p
              className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
              role="alert"
            >
              {t('formValidationError')}
            </p>
          ) : null}

          {!editing ? (
            <Field
              error={organizations.isError ? t('managedOrganizationsLoadError') : undefined}
              id="community-organization"
              label={t('resourceOrganizationHost')}
            >
              <Select
                id="community-organization"
                onValueChange={(value) =>
                  form.setValue('organizationId', value === '__self__' ? '' : value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                options={[
                  { value: '__self__', label: t('hostAsYourself') },
                  ...(organizations.data ?? []).map((organization) => ({
                    value: organization.id,
                    label: `${organization.name} (${t(`organizationRole_${organization.role}`)})`,
                  })),
                ]}
                value={form.watch('organizationId') || '__self__'}
              />
            </Field>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field error={errors.name ? t('formFieldInvalid') : undefined} id="community-name" label={t('communityName')} required>
              <Input
                aria-describedby={errors.name ? 'community-name-error' : undefined}
                aria-invalid={Boolean(errors.name)}
                id="community-name"
                maxLength={100}
                required
                {...form.register('name')}
              />
            </Field>
            <Field
              error={errors.capacity ? t('formFieldInvalid') : undefined}
              id="community-capacity"
              label={t('capacityOptional')}
            >
              <Input
                aria-describedby={errors.capacity ? 'community-capacity-error' : undefined}
                aria-invalid={Boolean(errors.capacity)}
                id="community-capacity"
                inputMode="numeric"
                max="10000"
                min="1"
                type="number"
                {...form.register('capacity')}
              />
            </Field>
          </div>

          <Field
            error={errors.description ? t('formFieldInvalid') : undefined}
            id="community-description"
            label={t('description')}
            required
          >
            <Textarea
              aria-describedby={errors.description ? 'community-description-error' : undefined}
              aria-invalid={Boolean(errors.description)}
              id="community-description"
              maxLength={5000}
              required
              {...form.register('description')}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              error={errors.cityId ? t('formFieldInvalid') : undefined}
              id="community-city"
              label={t('profileCity')}
              required
            >
              <Select
                aria-describedby={errors.cityId ? 'community-city-error' : undefined}
                aria-invalid={Boolean(errors.cityId)}
                id="community-city"
                onValueChange={(value) =>
                  form.setValue('cityId', value, { shouldDirty: true, shouldValidate: true })
                }
                options={(cities.data ?? []).map((city) => ({
                  value: city.id,
                  label: lang === 'ar' ? city.nameAr : lang === 'tr' ? city.nameTr : city.nameEn,
                }))}
                placeholder={t('profileCityEmpty')}
                value={form.watch('cityId')}
              />
            </Field>
            <Field id="community-admission" label={t('admissionPolicy')}>
              <Select
                id="community-admission"
                onValueChange={(value) =>
                  form.setValue('admissionMode', value as FormValues['admissionMode'], {
                    shouldDirty: true,
                  })
                }
                options={[
                  { value: 'open', label: t('admissionOpen') },
                  { value: 'approval', label: t('admissionApproval') },
                  { value: 'automatic', label: t('admissionAutomatic') },
                ]}
                value={form.watch('admissionMode')}
              />
            </Field>
          </div>

          <fieldset
            aria-describedby={errors.categoryIds ? 'community-categories-error' : undefined}
            className="grid gap-3"
          >
            <legend className="text-sm font-medium text-text">{t('chooseCategories')}</legend>
            <div className="flex flex-wrap gap-2">
              {categories.data?.map((category) => {
                const checked = categoryIds.includes(category.id);
                const categoryName =
                  lang === 'ar' ? category.nameAr : lang === 'tr' ? category.nameTr : category.nameEn;
                return (
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors',
                      checked
                        ? 'border-primary/40 bg-primary-soft'
                        : 'border-border bg-surface-soft hover:border-border-strong',
                    )}
                    key={category.id}
                  >
                    <Checkbox
                      checked={checked}
                      id={`category-${category.id}`}
                      onCheckedChange={(next) => {
                        const nextIds = next
                          ? [...categoryIds, category.id]
                          : categoryIds.filter((idValue) => idValue !== category.id);
                        form.setValue('categoryIds', nextIds, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                    />
                    <Label
                      className={cn(
                        'cursor-pointer text-sm font-medium',
                        checked ? 'text-primary-soft-text' : 'text-text-muted',
                      )}
                      htmlFor={`category-${category.id}`}
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
            {errors.categoryIds ? (
              <p className="text-xs font-medium text-danger" id="community-categories-error">
                {t('formFieldInvalid')}
              </p>
            ) : null}
          </fieldset>

          {formError ? (
            <p
              className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            <Button asChild variant="outline">
              <Link to={editing ? `/communities/${existing.data!.slug}` : '/create'}>
                {t('cancel')}
              </Link>
            </Button>
            <Button disabled={create.isPending || update.isPending} type="submit">
              {create.isPending || update.isPending
                ? t('savingResource')
                : t(editing ? 'saveChanges' : 'publishCommunity')}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
