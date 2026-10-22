import { zodResolver } from '@hookform/resolvers/zod';
import { useHead } from '@unhead/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { useOrganizationsControllerCreate } from '@/api/generated/organizations/organizations';
import { useDiscoveryControllerCities } from '@/api/generated/discovery/discovery';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { languageCode } from '@/features/resources/resource-utils';

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => !value || /^https?:\/\//i.test(value), 'url');

const formSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(5000),
  type: z.string().trim().min(1).max(80),
  cityId: z.string(),
  locationName: z.string().trim().max(160),
  websiteUrl: optionalUrl,
  socialUrl: optionalUrl,
});

type FormValues = z.infer<typeof formSchema>;

export function OrganizationCreatePage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const lang = languageCode(i18n.language);
  const cities = useDiscoveryControllerCities();
  const create = useOrganizationsControllerCreate();
  const [formError, setFormError] = useState('');
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      type: '',
      cityId: '',
      locationName: '',
      websiteUrl: '',
      socialUrl: '',
    },
  });

  useHead({ title: t('createOrganizationTitle') });

  if (!loading && !user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`} />;
  }
  if (loading) return <p role="status">{t('authWorking')}</p>;

  const inputClass =
    'min-h-(--control-height-lg) w-full rounded-(--shape-radius-control) border border-input bg-background px-3 py-2 text-base outline-none focus-visible:ring-(length:--focus-ring-width) focus-visible:ring-ring';
  const labelClass = 'grid gap-2 text-sm font-semibold';

  const save = async (values: FormValues): Promise<void> => {
    setFormError('');
    try {
      const created = await create.mutateAsync({
        data: {
          name: values.name,
          description: values.description,
          type: values.type,
          cityId: values.cityId || null,
          locationName: values.locationName || null,
          websiteUrl: values.websiteUrl || null,
          socialUrl: values.socialUrl || null,
        },
      });
      void navigate(`/organizations/${created.slug}`);
    } catch {
      setFormError(t('organizationCreateError'));
    }
  };

  return (
    <section className="mx-auto max-w-(--container-reading) space-y-7">
      <Link
        className="inline-flex min-h-(--control-height-md) items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        to="/create"
      >
        <ArrowLeft aria-hidden="true" size={17} />
        {t('backToCreate')}
      </Link>
      <header className="border-b border-border pb-5">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {t('createOrganizationTitle')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t('organizationCreateFormIntro')}
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
        <label className={labelClass} htmlFor="organization-name">
          <span>{t('organizationName')}</span>
          <input
            aria-describedby={form.formState.errors.name ? 'organization-name-error' : undefined}
            aria-invalid={Boolean(form.formState.errors.name)}
            className={inputClass}
            id="organization-name"
            maxLength={160}
            required
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <span className="text-xs text-destructive" id="organization-name-error">
              {t('formFieldInvalid')}
            </span>
          )}
        </label>
        <label className={labelClass} htmlFor="organization-description">
          <span>{t('description')}</span>
          <textarea
            aria-describedby={
              form.formState.errors.description ? 'organization-description-error' : undefined
            }
            aria-invalid={Boolean(form.formState.errors.description)}
            className={`${inputClass} min-h-36 resize-y`}
            id="organization-description"
            maxLength={5000}
            required
            {...form.register('description')}
          />
          {form.formState.errors.description && (
            <span className="text-xs text-destructive" id="organization-description-error">
              {t('formFieldInvalid')}
            </span>
          )}
        </label>
        <label className={labelClass} htmlFor="organization-type">
          <span>{t('organizationType')}</span>
          <input
            aria-describedby={form.formState.errors.type ? 'organization-type-error' : undefined}
            aria-invalid={Boolean(form.formState.errors.type)}
            className={inputClass}
            id="organization-type"
            maxLength={80}
            required
            {...form.register('type')}
          />
          {form.formState.errors.type && (
            <span className="text-xs text-destructive" id="organization-type-error">
              {t('formFieldInvalid')}
            </span>
          )}
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={labelClass} htmlFor="organization-city">
            <span>{t('profileCity')}</span>
            <select className={inputClass} id="organization-city" {...form.register('cityId')}>
              <option value="">{t('organizationCityEmpty')}</option>
              {cities.data?.map((city) => (
                <option key={city.id} value={city.id}>
                  {lang === 'ar' ? city.nameAr : lang === 'tr' ? city.nameTr : city.nameEn}
                </option>
              ))}
            </select>
            {cities.isError && (
              <span className="text-xs font-normal text-destructive">
                {t('profileCitiesError')}
              </span>
            )}
          </label>
          <label className={labelClass} htmlFor="organization-location">
            <span>{t('organizationLocation')}</span>
            <input
              aria-describedby={
                form.formState.errors.locationName ? 'organization-location-error' : undefined
              }
              aria-invalid={Boolean(form.formState.errors.locationName)}
              className={inputClass}
              id="organization-location"
              maxLength={160}
              {...form.register('locationName')}
            />
            {form.formState.errors.locationName && (
              <span className="text-xs text-destructive" id="organization-location-error">
                {t('formFieldInvalid')}
              </span>
            )}
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={labelClass} htmlFor="organization-website">
            <span>{t('organizationWebsite')}</span>
            <input
              aria-describedby={
                form.formState.errors.websiteUrl ? 'organization-website-error' : undefined
              }
              aria-invalid={Boolean(form.formState.errors.websiteUrl)}
              className={inputClass}
              id="organization-website"
              inputMode="url"
              maxLength={2048}
              placeholder="https://"
              type="url"
              {...form.register('websiteUrl')}
            />
            {form.formState.errors.websiteUrl && (
              <span className="text-xs text-destructive" id="organization-website-error">
                {t('formFieldInvalid')}
              </span>
            )}
          </label>
          <label className={labelClass} htmlFor="organization-social">
            <span>{t('organizationSocial')}</span>
            <input
              aria-describedby={
                form.formState.errors.socialUrl ? 'organization-social-error' : undefined
              }
              aria-invalid={Boolean(form.formState.errors.socialUrl)}
              className={inputClass}
              id="organization-social"
              inputMode="url"
              maxLength={2048}
              placeholder="https://"
              type="url"
              {...form.register('socialUrl')}
            />
            {form.formState.errors.socialUrl && (
              <span className="text-xs text-destructive" id="organization-social-error">
                {t('formFieldInvalid')}
              </span>
            )}
          </label>
        </div>
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
            <Link to="/create">{t('cancel')}</Link>
          </Button>
          <Button disabled={create.isPending} type="submit">
            {create.isPending ? t('savingResource') : t('publishOrganization')}
          </Button>
        </div>
      </form>
    </section>
  );
}
