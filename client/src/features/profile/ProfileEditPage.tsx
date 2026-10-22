import { zodResolver } from '@hookform/resolvers/zod';
import { useHead } from '@unhead/react';
import { ArrowLeft, Camera, CircleUserRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  getUsersControllerCurrentQueryKey,
  useUsersControllerCurrent,
  useUsersControllerUpdate,
} from '@/api/generated/users/users';
import { useDiscoveryControllerCities } from '@/api/generated/discovery/discovery';
import { QueryError } from '@/components/feedback/QueryError';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { languageCode } from '@/features/resources/resource-utils';
import { profileImageExtension } from './profile-utils';
import { supabase } from '@/lib/supabase';

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  bio: z.string().max(500),
  cityId: z.string(),
  interests: z.string(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileEditPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lang = languageCode(i18n.language);
  const profile = useUsersControllerCurrent({ lang }, { query: { enabled: Boolean(user) } });
  const cities = useDiscoveryControllerCities();
  const update = useUsersControllerUpdate();
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [formError, setFormError] = useState('');
  const previewUrl = useMemo(
    () => (selectedPhoto ? URL.createObjectURL(selectedPhoto) : null),
    [selectedPhoto],
  );
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: '', bio: '', cityId: '', interests: '' },
  });

  useHead({ title: t('editProfile') });
  useEffect(() => {
    if (!profile.data) return;
    form.reset({
      displayName: profile.data.displayName,
      bio: profile.data.bio,
      cityId: profile.data.cityId ?? '',
      interests: profile.data.interests.join(', '),
    });
  }, [form, profile.data]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  if (!loading && !user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`} />;
  }
  if (loading || profile.isPending) return <p role="status">{t('loadingProfile')}</p>;
  if (profile.isError) {
    return <QueryError message={t('profileLoadError')} onRetry={() => void profile.refetch()} />;
  }

  const saveProfile = async (values: ProfileFormValues): Promise<void> => {
    setFormError('');
    let uploadedPath: string | undefined;
    try {
      if (selectedPhoto) {
        if (!supabase || !user) throw new Error('profile-storage-unavailable');
        const extension = await profileImageExtension(selectedPhoto);
        uploadedPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from('profile-photos').upload(uploadedPath, selectedPhoto, {
          contentType: selectedPhoto.type,
          upsert: false,
        });
        if (error) throw error;
      }

      const avatarPath = uploadedPath ?? (removePhoto ? null : undefined);
      const updated = await update.mutateAsync({
        data: {
          displayName: values.displayName,
          bio: values.bio,
          cityId: values.cityId || null,
          interests: values.interests.split(',').map((interest) => interest.trim()).filter(Boolean),
          ...(avatarPath !== undefined ? { avatarPath } : {}),
        },
        params: { lang },
      });
      queryClient.setQueryData(getUsersControllerCurrentQueryKey({ lang }), updated);
      await queryClient.invalidateQueries();
      void navigate('/profile');
    } catch (error) {
      if (uploadedPath) await supabase?.storage.from('profile-photos').remove([uploadedPath]);
      setFormError(
        error instanceof Error && error.message.startsWith('profile-image-')
          ? t('profileAvatarInvalid')
          : t('profileSaveError'),
      );
    }
  };

  const inputClass =
    'min-h-(--control-height-lg) w-full rounded-(--shape-radius-control) border border-input bg-background px-3 py-2 text-base outline-none focus-visible:ring-(length:--focus-ring-width) focus-visible:ring-ring';
  const labelClass = 'grid gap-2 text-sm font-semibold';
  const photoSource = previewUrl ?? (removePhoto ? null : profile.data.avatarUrl);
  const initials = profile.data.displayName.trim().slice(0, 1).toLocaleUpperCase(i18n.language);

  return (
    <section className="mx-auto max-w-(--container-reading) space-y-7">
      <Link
        className="inline-flex min-h-(--control-height-md) items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:ring-ring"
        to="/profile"
      >
        <ArrowLeft aria-hidden="true" size={17} />
        {t('backToProfile')}
      </Link>
      <header className="border-b border-border pb-5">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{t('editProfile')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('profileEditIntro')}</p>
      </header>

      <form className="grid gap-7" onSubmit={(event) => void form.handleSubmit((values) => void saveProfile(values))(event)}>
        <section aria-labelledby="profile-photo-heading" className="grid gap-3 sm:grid-cols-[8rem_1fr] sm:items-center">
          <div className="grid size-28 place-items-center overflow-hidden rounded-full border border-border bg-primary-soft text-3xl font-bold text-primary-soft-text">
            {photoSource ? (
              <img alt="" className="size-full object-cover" src={photoSource} />
            ) : (
              initials || <CircleUserRound aria-hidden="true" size={42} />
            )}
          </div>
          <div className="grid justify-items-start gap-2">
            <h2 className="text-sm font-semibold" id="profile-photo-heading">{t('profilePhoto')}</h2>
            <p className="text-sm text-muted-foreground">{t('profilePhotoHint')}</p>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex min-h-(--control-height-md) cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm font-semibold hover:bg-secondary focus-within:ring-(length:--focus-ring-width) focus-within:ring-ring">
                <Camera aria-hidden="true" size={16} />
                {t('choosePhoto')}
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    setSelectedPhoto(event.currentTarget.files?.[0] ?? null);
                    setRemovePhoto(false);
                  }}
                  type="file"
                />
              </label>
              {profile.data.avatarUrl && !removePhoto && (
                <Button
                  onClick={() => {
                    setSelectedPhoto(null);
                    setRemovePhoto(true);
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

        <div className="grid gap-5 sm:grid-cols-2">
          <label className={labelClass} htmlFor="profile-display-name">
            <span>{t('profileNameLabel')}</span>
            <input aria-describedby={form.formState.errors.displayName ? 'profile-display-name-error' : undefined} aria-invalid={Boolean(form.formState.errors.displayName)} className={inputClass} id="profile-display-name" maxLength={80} {...form.register('displayName')} />
            {form.formState.errors.displayName && <span className="text-xs text-destructive" id="profile-display-name-error">{t('profileNameInvalid')}</span>}
          </label>
          <label className={labelClass} htmlFor="profile-city">
            <span>{t('profileCity')}</span>
            <select className={inputClass} id="profile-city" {...form.register('cityId')}>
              <option value="">{t('profileCityEmpty')}</option>
              {cities.data?.map((city) => (
                <option key={city.id} value={city.id}>
                  {lang === 'ar' ? city.nameAr : lang === 'tr' ? city.nameTr : city.nameEn}
                </option>
              ))}
            </select>
            {cities.isError && <span className="text-xs text-destructive">{t('profileCitiesError')}</span>}
          </label>
        </div>

        <label className={labelClass} htmlFor="profile-bio">
          <span>{t('profileAbout')}</span>
          <textarea aria-describedby={form.formState.errors.bio ? 'profile-bio-error' : undefined} aria-invalid={Boolean(form.formState.errors.bio)} className={`${inputClass} min-h-32 resize-y`} id="profile-bio" maxLength={500} {...form.register('bio')} />
          {form.formState.errors.bio && <span className="text-xs text-destructive" id="profile-bio-error">{t('formFieldInvalid')}</span>}
          <span className="text-xs font-normal text-muted-foreground">{t('profileBioHint')}</span>
        </label>

        <label className={labelClass} htmlFor="profile-interests">
          <span>{t('profileInterests')}</span>
          <input className={inputClass} id="profile-interests" maxLength={1200} {...form.register('interests')} />
          <span className="text-xs font-normal text-muted-foreground">{t('profileInterestsHint')}</span>
        </label>

        {formError && <p className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive" role="alert">{formError}</p>}
        <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
          <Button asChild variant="outline"><Link to="/profile">{t('cancel')}</Link></Button>
          <Button disabled={update.isPending} type="submit">{update.isPending ? t('savingProfile') : t('saveProfile')}</Button>
        </div>
      </form>
    </section>
  );
}
