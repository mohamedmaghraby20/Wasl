import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useHead } from '@unhead/react';
import { ArrowLeft, Building2, Camera, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import {
  getOrganizationsControllerPublicProfileQueryKey,
  useOrganizationsControllerPublicProfile,
  useOrganizationsControllerUpdate,
} from '@/api/generated/organizations/organizations';
import { useDiscoveryControllerCities } from '@/api/generated/discovery/discovery';
import { ApiError } from '@/api/fetcher';
import { QueryError } from '@/components/feedback/QueryError';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { profileImageExtension } from '@/features/profile/profile-utils';
import { languageCode } from '@/features/resources/resource-utils';
import { supabase } from '@/lib/supabase';

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

export function OrganizationEditPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const { slug = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lang = languageCode(i18n.language);
  const organization = useOrganizationsControllerPublicProfile(
    slug,
    { lang },
    { query: { enabled: Boolean(user && slug) } },
  );
  const cities = useDiscoveryControllerCities();
  const update = useOrganizationsControllerUpdate();
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [formError, setFormError] = useState('');
  const previewUrl = useMemo(
    () => (selectedLogo ? URL.createObjectURL(selectedLogo) : null),
    [selectedLogo],
  );
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

  useHead({ title: t('editOrganization') });
  useEffect(() => {
    if (!organization.data) return;
    form.reset({
      name: organization.data.name,
      description: organization.data.description,
      type: organization.data.type,
      cityId: organization.data.cityId ?? '',
      locationName: organization.data.locationName ?? '',
      websiteUrl: organization.data.websiteUrl ?? '',
      socialUrl: organization.data.socialUrl ?? '',
    });
  }, [form, organization.data]);
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  if (!loading && !user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`} />;
  }
  if (loading || organization.isPending) return <p role="status">{t('loadingOrganization')}</p>;
  if (organization.isError || !organization.data) {
    return (
      <QueryError
        message={t('organizationEditLoadError')}
        onRetry={() => void organization.refetch()}
      />
    );
  }

  const inputClass =
    'min-h-(--control-height-lg) w-full rounded-(--shape-radius-control) border border-input bg-background px-3 py-2 text-base outline-none focus-visible:ring-(length:--focus-ring-width) focus-visible:ring-ring';
  const labelClass = 'grid gap-2 text-sm font-semibold';
  const logoSource = previewUrl ?? (removeLogo ? null : organization.data.logoUrl);

  const save = async (values: FormValues): Promise<void> => {
    setFormError('');
    let uploadedPath: string | undefined;
    try {
      if (selectedLogo) {
        if (!supabase || !user) throw new Error('organization-logo-storage-unavailable');
        const extension = await profileImageExtension(selectedLogo);
        uploadedPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage
          .from('profile-photos')
          .upload(uploadedPath, selectedLogo, { contentType: selectedLogo.type, upsert: false });
        if (error) throw error;
      }
      const logoPath = uploadedPath ?? (removeLogo ? null : undefined);
      const updated = await update.mutateAsync({
        id: organization.data.id,
        data: {
          name: values.name,
          description: values.description,
          type: values.type,
          cityId: values.cityId || null,
          locationName: values.locationName || null,
          websiteUrl: values.websiteUrl || null,
          socialUrl: values.socialUrl || null,
          ...(logoPath !== undefined ? { logoPath } : {}),
        },
        params: { lang },
      });
      queryClient.setQueryData(
        getOrganizationsControllerPublicProfileQueryKey(slug, { lang }),
        updated,
      );
      void navigate(`/organizations/${updated.slug}`);
    } catch (error) {
      if (uploadedPath) await supabase?.storage.from('profile-photos').remove([uploadedPath]);
      if (error instanceof ApiError && error.status === 403) {
        setFormError(t('organizationManagementForbidden'));
      } else if (error instanceof Error && error.message.startsWith('profile-image-')) {
        setFormError(t('profileAvatarInvalid'));
      } else {
        setFormError(t('organizationSaveError'));
      }
    }
  };

  return (
    <section className="mx-auto max-w-(--container-reading) space-y-7">
      <Link
        className="inline-flex min-h-(--control-height-md) items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        to={`/organizations/${organization.data.slug}`}
      >
        <ArrowLeft aria-hidden="true" size={17} />
        {t('backToOrganization')}
      </Link>
      <header className="border-b border-border pb-5">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{t('editOrganization')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t('organizationEditFormIntro')}
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
        <section
          aria-labelledby="organization-logo-heading"
          className="grid gap-3 sm:grid-cols-[8rem_1fr] sm:items-center"
        >
          <div className="grid size-28 place-items-center overflow-hidden rounded-(--shape-radius-card) border border-border bg-primary-soft text-primary-soft-text">
            {logoSource ? (
              <img alt="" className="size-full object-cover" src={logoSource} />
            ) : (
              <Building2 aria-hidden="true" size={42} />
            )}
          </div>
          <div className="grid justify-items-start gap-2">
            <h2 className="text-sm font-semibold" id="organization-logo-heading">
              {t('organizationLogo')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('organizationLogoHint')}</p>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex min-h-(--control-height-md) cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm font-semibold hover:bg-secondary focus-within:ring-(length:--focus-ring-width) focus-within:ring-ring">
                <Camera aria-hidden="true" size={16} />
                {t('choosePhoto')}
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    setSelectedLogo(event.currentTarget.files?.[0] ?? null);
                    setRemoveLogo(false);
                  }}
                  type="file"
                />
              </label>
              {organization.data.logoUrl && !removeLogo && (
                <Button
                  onClick={() => {
                    setSelectedLogo(null);
                    setRemoveLogo(true);
                  }}
                  type="button"
                  variant="outline"
                >
                  <X aria-hidden="true" size={16} />
                  {t('removePhoto')}
                </Button>
              )}
            </div>
          </div>
        </section>
        <label className={labelClass} htmlFor="organization-name">
          <span>{t('organizationName')}</span>
          <input
            aria-invalid={Boolean(form.formState.errors.name)}
            className={inputClass}
            id="organization-name"
            maxLength={160}
            required
            {...form.register('name')}
          />
        </label>
        <label className={labelClass} htmlFor="organization-description">
          <span>{t('description')}</span>
          <textarea
            aria-invalid={Boolean(form.formState.errors.description)}
            className={`${inputClass} min-h-36 resize-y`}
            id="organization-description"
            maxLength={5000}
            required
            {...form.register('description')}
          />
        </label>
        <label className={labelClass} htmlFor="organization-type">
          <span>{t('organizationType')}</span>
          <input
            aria-invalid={Boolean(form.formState.errors.type)}
            className={inputClass}
            id="organization-type"
            maxLength={80}
            required
            {...form.register('type')}
          />
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
              aria-invalid={Boolean(form.formState.errors.locationName)}
              className={inputClass}
              id="organization-location"
              maxLength={160}
              {...form.register('locationName')}
            />
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={labelClass} htmlFor="organization-website">
            <span>{t('organizationWebsite')}</span>
            <input
              aria-invalid={Boolean(form.formState.errors.websiteUrl)}
              className={inputClass}
              id="organization-website"
              inputMode="url"
              maxLength={2048}
              placeholder="https://"
              type="url"
              {...form.register('websiteUrl')}
            />
          </label>
          <label className={labelClass} htmlFor="organization-social">
            <span>{t('organizationSocial')}</span>
            <input
              aria-invalid={Boolean(form.formState.errors.socialUrl)}
              className={inputClass}
              id="organization-social"
              inputMode="url"
              maxLength={2048}
              placeholder="https://"
              type="url"
              {...form.register('socialUrl')}
            />
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
            <Link to={`/organizations/${organization.data.slug}`}>{t('cancel')}</Link>
          </Button>
          <Button disabled={update.isPending} type="submit">
            {update.isPending ? t('savingResource') : t('saveOrganization')}
          </Button>
        </div>
      </form>
    </section>
  );
}
