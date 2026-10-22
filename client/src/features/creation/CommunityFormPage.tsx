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
import { useAuth } from '@/features/auth/AuthProvider';
import { languageCode } from '@/features/resources/resource-utils';

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
  if (loading || (editing && existing.isPending)) return <p role="status">{t('authWorking')}</p>;
  if (editing && existing.isError) return <p role="alert">{t('resourceEditLoadError')}</p>;

  const inputClass =
    'min-h-(--control-height-lg) w-full rounded-(--shape-radius-control) border border-input bg-background px-3 py-2 text-base outline-none focus-visible:ring-(length:--focus-ring-width) focus-visible:ring-ring';
  const labelClass = 'grid gap-2 text-sm font-semibold';
  const categoryIds = form.watch('categoryIds');

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
    <section className="mx-auto max-w-(--container-reading) space-y-7">
      <Link
        className="inline-flex min-h-(--control-height-md) items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        to={editing ? `/communities/${existing.data!.slug}` : '/create'}
      >
        <ArrowLeft aria-hidden="true" size={17} />
        {t(editing ? 'backToCommunity' : 'backToCreate')}
      </Link>
      <header className="border-b border-border pb-5">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {t(editing ? 'editCommunity' : 'createCommunityTitle')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t('communityFormIntro')}
        </p>
      </header>

      <form
        className="grid gap-5"
        onSubmit={(event) => void form.handleSubmit((values) => void save(values))(event)}
      >
        {Object.keys(form.formState.errors).length > 0 && (
          <p
            className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {t('formValidationError')}
          </p>
        )}
        {!editing && (
          <label className={labelClass} htmlFor="community-organization">
            <span>{t('resourceOrganizationHost')}</span>
            <select
              className={inputClass}
              id="community-organization"
              {...form.register('organizationId')}
            >
              <option value="">{t('hostAsYourself')}</option>
              {organizations.data?.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name} ({t(`organizationRole_${organization.role}`)})
                </option>
              ))}
            </select>
            {organizations.isError && (
              <span className="text-xs font-normal text-destructive">
                {t('managedOrganizationsLoadError')}
              </span>
            )}
          </label>
        )}
        <label className={labelClass} htmlFor="community-name">
          <span>{t('communityName')}</span>
          <input
            aria-describedby={form.formState.errors.name ? 'community-name-error' : undefined}
            aria-invalid={Boolean(form.formState.errors.name)}
            className={inputClass}
            id="community-name"
            maxLength={100}
            required
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <span className="text-xs text-destructive" id="community-name-error">
              {t('formFieldInvalid')}
            </span>
          )}
        </label>
        <label className={labelClass} htmlFor="community-description">
          <span>{t('description')}</span>
          <textarea
            aria-describedby={
              form.formState.errors.description ? 'community-description-error' : undefined
            }
            aria-invalid={Boolean(form.formState.errors.description)}
            className={`${inputClass} min-h-36 resize-y`}
            id="community-description"
            maxLength={5000}
            required
            {...form.register('description')}
          />
          {form.formState.errors.description && (
            <span className="text-xs text-destructive" id="community-description-error">
              {t('formFieldInvalid')}
            </span>
          )}
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={labelClass} htmlFor="community-city">
            <span>{t('profileCity')}</span>
            <select
              aria-describedby={form.formState.errors.cityId ? 'community-city-error' : undefined}
              aria-invalid={Boolean(form.formState.errors.cityId)}
              className={inputClass}
              id="community-city"
              required
              {...form.register('cityId')}
            >
              <option value="">{t('profileCityEmpty')}</option>
              {cities.data?.map((city) => (
                <option key={city.id} value={city.id}>
                  {lang === 'ar' ? city.nameAr : lang === 'tr' ? city.nameTr : city.nameEn}
                </option>
              ))}
            </select>
            {form.formState.errors.cityId && (
              <span className="text-xs text-destructive" id="community-city-error">
                {t('formFieldInvalid')}
              </span>
            )}
          </label>
          <label className={labelClass} htmlFor="community-admission">
            <span>{t('admissionPolicy')}</span>
            <select
              className={inputClass}
              id="community-admission"
              {...form.register('admissionMode')}
            >
              <option value="open">{t('admissionOpen')}</option>
              <option value="approval">{t('admissionApproval')}</option>
              <option value="automatic">{t('admissionAutomatic')}</option>
            </select>
          </label>
        </div>
        <label className={labelClass} htmlFor="community-capacity">
          <span>{t('capacityOptional')}</span>
          <input
            aria-describedby={
              form.formState.errors.capacity ? 'community-capacity-error' : undefined
            }
            aria-invalid={Boolean(form.formState.errors.capacity)}
            className={inputClass}
            id="community-capacity"
            inputMode="numeric"
            max="10000"
            min="1"
            type="number"
            {...form.register('capacity')}
          />
          {form.formState.errors.capacity && (
            <span className="text-xs text-destructive" id="community-capacity-error">
              {t('formFieldInvalid')}
            </span>
          )}
        </label>
        <fieldset
          aria-describedby={
            form.formState.errors.categoryIds ? 'community-categories-error' : undefined
          }
          className="grid gap-3"
        >
          <legend className="mb-3 text-sm font-semibold">{t('chooseCategories')}</legend>
          {categories.data?.map((category) => (
            <label
              className="flex min-h-11 items-center gap-3 border-b border-border py-2 text-sm"
              key={category.id}
            >
              <input
                checked={categoryIds.includes(category.id)}
                onChange={(event) => {
                  const next = event.currentTarget.checked
                    ? [...categoryIds, category.id]
                    : categoryIds.filter((idValue) => idValue !== category.id);
                  form.setValue('categoryIds', next, { shouldDirty: true, shouldValidate: true });
                }}
                type="checkbox"
              />
              {lang === 'ar' ? category.nameAr : lang === 'tr' ? category.nameTr : category.nameEn}
            </label>
          ))}
          {categories.isError && (
            <p className="text-sm text-destructive">{t('categoriesLoadError')}</p>
          )}
          {form.formState.errors.categoryIds && (
            <p className="text-xs text-destructive" id="community-categories-error">
              {t('formFieldInvalid')}
            </p>
          )}
        </fieldset>
        {formError && (
          <p
            className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {formError}
          </p>
        )}
        <div className="flex justify-end gap-3 border-t border-border pt-5">
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
    </section>
  );
}
