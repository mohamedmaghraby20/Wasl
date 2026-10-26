import { zodResolver } from '@hookform/resolvers/zod';
import { useHead } from '@unhead/react';
import { ArrowLeft, Camera, CircleUserRound, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { TagInput } from '@/components/ui/TagInput';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/features/auth/AuthProvider';
import { languageCode } from '@/features/resources/resource-utils';
import { profileImageExtension } from './profile-utils';
import { focusFirstInvalid } from '@/lib/focus-first-invalid';
import { supabase } from '@/lib/supabase';

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  bio: z.string().max(500),
  cityId: z.string(),
  interests: z.array(z.string().trim().min(1).max(60)).max(20),
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
  const formRef = useRef<HTMLFormElement>(null);
  const previewUrl = useMemo(
    () => (selectedPhoto ? URL.createObjectURL(selectedPhoto) : null),
    [selectedPhoto],
  );
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: '', bio: '', cityId: '', interests: [] },
  });

  useHead({ title: t('editProfile') });
  useEffect(() => {
    if (!profile.data) return;
    form.reset({
      displayName: profile.data.displayName,
      bio: profile.data.bio,
      cityId: profile.data.cityId ?? '',
      interests: profile.data.interests,
    });
  }, [form, profile.data]);
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
  if (loading || profile.isPending)
    return (
      <p className="text-sm text-text-muted" role="status">
        {t('loadingProfile')}
      </p>
    );
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
        const { error } = await supabase.storage
          .from('profile-photos')
          .upload(uploadedPath, selectedPhoto, {
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
          interests: values.interests,
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

  const photoSource = previewUrl ?? (removePhoto ? null : profile.data.avatarUrl);
  const initials = profile.data.displayName.trim().slice(0, 1).toLocaleUpperCase(i18n.language);
  const cityOptions = (cities.data ?? []).map((city) => ({
    value: city.id,
    label: lang === 'ar' ? city.nameAr : lang === 'tr' ? city.nameTr : city.nameEn,
  }));

  return (
    <section className="mx-auto grid max-w-(--container-reading) gap-6">
      <Link
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
        to="/profile"
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t('backToProfile')}
      </Link>
      <header className="grid gap-2">
        <h1 className="text-3xl font-extrabold">{t('editProfile')}</h1>
        <p className="text-sm leading-relaxed text-text-muted">{t('profileEditIntro')}</p>
      </header>

      <Card>
        <form
          className="grid gap-6 p-5 sm:p-7"
          onSubmit={(event) =>
            void form.handleSubmit(
              (values) => void saveProfile(values),
              () => focusFirstInvalid(formRef.current),
            )(event)
          }
          ref={formRef}
        >
          <section
            aria-labelledby="profile-photo-heading"
            className="grid gap-4 sm:grid-cols-[7rem_1fr] sm:items-center"
          >
            <div className="grid size-24 place-items-center overflow-hidden rounded-full border border-border bg-primary-soft text-3xl font-bold text-primary-soft-text">
              {photoSource ? (
                <img alt="" className="size-full object-cover" src={photoSource} />
              ) : (
                initials || <CircleUserRound aria-hidden="true" size={38} />
              )}
            </div>
            <div className="grid justify-items-start gap-2">
              <h2 className="text-sm font-semibold text-text" id="profile-photo-heading">
                {t('profilePhoto')}
              </h2>
              <p className="text-sm text-text-muted">{t('profilePhotoHint')}</p>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-(--shape-radius-control) border border-input bg-background px-4 text-sm font-semibold text-text transition-colors hover:bg-surface-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background">
                  <Camera aria-hidden="true" className="size-4" />
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
                {profile.data.avatarUrl && !removePhoto ? (
                  <Button
                    onClick={() => {
                      setSelectedPhoto(null);
                      setRemovePhoto(true);
                    }}
                    type="button"
                    variant="outline"
                  >
                    <X aria-hidden="true" />
                    {t('removePhoto')}
                  </Button>
                ) : null}
              </div>
            </div>
          </section>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              error={form.formState.errors.displayName ? t('profileNameInvalid') : undefined}
              id="profile-display-name"
              label={t('profileNameLabel')}
            >
              <Input
                aria-describedby={
                  form.formState.errors.displayName ? 'profile-display-name-error' : undefined
                }
                aria-invalid={Boolean(form.formState.errors.displayName)}
                id="profile-display-name"
                maxLength={80}
                {...form.register('displayName')}
              />
            </Field>
            <Field
              error={cities.isError ? t('profileCitiesError') : undefined}
              id="profile-city"
              label={t('profileCity')}
            >
              <SearchableSelect
                disabled={cities.isPending || cities.isError}
                emptyMessage={t('noCitiesFound')}
                id="profile-city"
                onValueChange={(value) =>
                  form.setValue('cityId', value === '__none__' ? '' : value, {
                    shouldDirty: true,
                  })
                }
                options={[{ value: '__none__', label: t('profileCityEmpty') }, ...cityOptions]}
                searchPlaceholder={t('searchCities')}
                value={form.watch('cityId') || '__none__'}
              />
            </Field>
          </div>

          <Field
            error={form.formState.errors.bio ? t('formFieldInvalid') : undefined}
            hint={t('profileBioHint')}
            id="profile-bio"
            label={t('profileAbout')}
          >
            <Textarea
              aria-describedby={form.formState.errors.bio ? 'profile-bio-error' : undefined}
              aria-invalid={Boolean(form.formState.errors.bio)}
              id="profile-bio"
              maxLength={500}
              {...form.register('bio')}
            />
          </Field>

          <Field hint={t('profileInterestsHint')} id="profile-interests" label={t('profileInterests')}>
            <TagInput
              id="profile-interests"
              onChange={(interests) =>
                form.setValue('interests', interests, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              placeholder={t('addInterest')}
              value={form.watch('interests')}
            />
          </Field>

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
              <Link to="/profile">{t('cancel')}</Link>
            </Button>
            <Button disabled={update.isPending} type="submit">
              {update.isPending ? t('savingProfile') : t('saveProfile')}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
