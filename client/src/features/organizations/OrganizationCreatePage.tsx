import { zodResolver } from '@hookform/resolvers/zod';
import { useHead } from '@unhead/react';
import { ArrowLeft } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { useOrganizationsControllerCreate } from '@/api/generated/organizations/organizations';
import { useDiscoveryControllerCities } from '@/api/generated/discovery/discovery';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/features/auth/AuthProvider';
import { languageCode } from '@/features/resources/resource-utils';
import { focusFirstInvalid } from '@/lib/focus-first-invalid';

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
  const formRef = useRef<HTMLFormElement>(null);
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
  if (loading)
    return (
      <p className="text-sm text-text-muted" role="status">
        {t('authWorking')}
      </p>
    );

  const errors = form.formState.errors;

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
    <section className="mx-auto grid max-w-(--container-reading) gap-6">
      <Link
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
        to="/create"
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t('backToCreate')}
      </Link>
      <header className="grid gap-2">
        <h1 className="text-3xl font-extrabold">{t('createOrganizationTitle')}</h1>
        <p className="text-sm leading-relaxed text-text-muted">
          {t('organizationCreateFormIntro')}
        </p>
      </header>

      <Card>
        <form
          className="grid gap-6 p-5 sm:p-7"
          onSubmit={(event) =>
            void form.handleSubmit(
              (values) => void save(values),
              () => focusFirstInvalid(formRef.current),
            )(event)
          }
          ref={formRef}
        >
          {Object.keys(errors).length > 0 ? (
            <p
              className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
              role="alert"
            >
              {t('formValidationError')}
            </p>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-[1.4fr_1fr]">
            <Field
              error={errors.name ? t('formFieldInvalid') : undefined}
              id="organization-name"
              label={t('organizationName')}
              required
            >
              <Input
                aria-describedby={errors.name ? 'organization-name-error' : undefined}
                aria-invalid={Boolean(errors.name)}
                id="organization-name"
                maxLength={160}
                required
                {...form.register('name')}
              />
            </Field>
            <Field
              error={errors.type ? t('formFieldInvalid') : undefined}
              id="organization-type"
              label={t('organizationType')}
              required
            >
              <Input
                aria-describedby={errors.type ? 'organization-type-error' : undefined}
                aria-invalid={Boolean(errors.type)}
                id="organization-type"
                maxLength={80}
                required
                {...form.register('type')}
              />
            </Field>
          </div>

          <Field
            error={errors.description ? t('formFieldInvalid') : undefined}
            id="organization-description"
            label={t('description')}
            required
          >
            <Textarea
              aria-describedby={
                errors.description ? 'organization-description-error' : undefined
              }
              aria-invalid={Boolean(errors.description)}
              id="organization-description"
              maxLength={5000}
              required
              {...form.register('description')}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              error={cities.isError ? t('profileCitiesError') : undefined}
              id="organization-city"
              label={t('profileCity')}
            >
              <SearchableSelect
                aria-busy={cities.isPending}
                disabled={cities.isPending || cities.isError}
                emptyMessage={t('noCitiesFound')}
                id="organization-city"
                onValueChange={(value) =>
                  form.setValue('cityId', value === '__none__' ? '' : value, {
                    shouldDirty: true,
                  })
                }
                options={[
                  { value: '__none__', label: t('organizationCityEmpty') },
                  ...(cities.data ?? []).map((city) => ({
                    value: city.id,
                    label:
                      lang === 'ar' ? city.nameAr : lang === 'tr' ? city.nameTr : city.nameEn,
                  })),
                ]}
                placeholder={cities.isPending ? t('loadingCities') : t('organizationCityEmpty')}
                searchPlaceholder={t('searchCities')}
                value={form.watch('cityId') || '__none__'}
              />
            </Field>
            <Field
              error={errors.locationName ? t('formFieldInvalid') : undefined}
              id="organization-location"
              label={t('organizationLocation')}
            >
              <Input
                aria-describedby={
                  errors.locationName ? 'organization-location-error' : undefined
                }
                aria-invalid={Boolean(errors.locationName)}
                id="organization-location"
                maxLength={160}
                {...form.register('locationName')}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              error={errors.websiteUrl ? t('formFieldInvalid') : undefined}
              id="organization-website"
              label={t('organizationWebsite')}
            >
              <Input
                aria-describedby={
                  errors.websiteUrl ? 'organization-website-error' : undefined
                }
                aria-invalid={Boolean(errors.websiteUrl)}
                id="organization-website"
                inputMode="url"
                maxLength={2048}
                placeholder="https://"
                type="url"
                {...form.register('websiteUrl')}
              />
            </Field>
            <Field
              error={errors.socialUrl ? t('formFieldInvalid') : undefined}
              id="organization-social"
              label={t('organizationSocial')}
            >
              <Input
                aria-describedby={errors.socialUrl ? 'organization-social-error' : undefined}
                aria-invalid={Boolean(errors.socialUrl)}
                id="organization-social"
                inputMode="url"
                maxLength={2048}
                placeholder="https://"
                type="url"
                {...form.register('socialUrl')}
              />
            </Field>
          </div>

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
              <Link to="/create">{t('cancel')}</Link>
            </Button>
            <Button disabled={create.isPending} type="submit">
              {create.isPending ? t('savingResource') : t('publishOrganization')}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
