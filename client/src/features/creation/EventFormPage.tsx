import { zodResolver } from '@hookform/resolvers/zod';
import { useHead } from '@unhead/react';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { useCommunitiesControllerMine } from '@/api/generated/communities/communities';
import { useOrganizationsControllerMine } from '@/api/generated/organizations/organizations';
import {
  useEventsControllerCreate,
  useEventsControllerUpdate,
} from '@/api/generated/events/events';
import {
  useDiscoveryControllerCategories,
  useDiscoveryControllerCities,
  useDiscoveryControllerEvent,
} from '@/api/generated/discovery/discovery';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { languageCode } from '@/features/resources/resource-utils';
import { fromTurkeyDateTime, parseCapacity, toTurkeyIso } from './creation-utils';

const formSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(5000),
    categoryIds: z.array(z.string()).min(1).max(5),
    visibility: z.enum(['public', 'unlisted']),
    startsAt: z.string().min(1),
    endsAt: z.string(),
    online: z.boolean(),
    cityId: z.string(),
    locationName: z.string().max(200),
    admissionMode: z.enum(['instant', 'approval', 'automatic']),
    capacity: z
      .string()
      .refine(
        (value) => !value || (/^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 10000),
      ),
    communityId: z.string(),
    organizationId: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.online && !values.cityId)
      context.addIssue({ code: 'custom', path: ['cityId'], message: 'required' });
    if (!values.online && !values.locationName.trim())
      context.addIssue({ code: 'custom', path: ['locationName'], message: 'required' });
    if (values.startsAt && values.endsAt && values.endsAt < values.startsAt)
      context.addIssue({ code: 'custom', path: ['endsAt'], message: 'invalid-range' });
  });

type FormValues = z.infer<typeof formSchema>;

export function EventFormPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const editing = Boolean(id);
  const lang = languageCode(i18n.language);
  const existing = useDiscoveryControllerEvent(id, { lang }, { query: { enabled: editing } });
  const cities = useDiscoveryControllerCities();
  const categories = useDiscoveryControllerCategories();
  const communities = useCommunitiesControllerMine({
    query: { enabled: Boolean(user) && !editing },
  });
  const organizations = useOrganizationsControllerMine({
    query: { enabled: Boolean(user) && !editing },
  });
  const create = useEventsControllerCreate();
  const update = useEventsControllerUpdate();
  const [formError, setFormError] = useState('');
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      categoryIds: [],
      visibility: 'public',
      startsAt: '',
      endsAt: '',
      online: false,
      cityId: '',
      locationName: '',
      admissionMode: 'instant',
      capacity: '',
      communityId: '',
      organizationId: '',
    },
  });

  useHead({ title: t(editing ? 'editEvent' : 'createEventTitle') });
  useEffect(() => {
    const event = existing.data;
    if (!event) return;
    form.reset({
      title: event.title,
      description: event.description,
      categoryIds: event.categories.map((category) => category.id),
      visibility: event.visibility as FormValues['visibility'],
      startsAt: fromTurkeyDateTime(event.startsAt),
      endsAt: fromTurkeyDateTime(event.endsAt),
      online: event.online,
      cityId: event.cityId ?? '',
      locationName: event.locationName ?? '',
      admissionMode: event.admissionMode as FormValues['admissionMode'],
      capacity: event.capacity === null ? '' : String(event.capacity),
      communityId: event.hostType === 'community' ? event.hostId : '',
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
  const online = form.watch('online');

  const save = async (values: FormValues): Promise<void> => {
    setFormError('');
    let startsAt: string;
    let endsAt: string | null;
    try {
      startsAt = toTurkeyIso(values.startsAt);
      endsAt = values.endsAt ? toTurkeyIso(values.endsAt) : null;
    } catch {
      setFormError(t('eventDateInvalid'));
      form.setError('startsAt', { type: 'validate', message: 'invalid' });
      return;
    }
    const payload = {
      title: values.title,
      description: values.description,
      categoryIds: values.categoryIds,
      visibility: values.visibility,
      startsAt,
      endsAt,
      online: values.online,
      cityId: values.online ? null : values.cityId || null,
      locationName: values.online ? null : values.locationName,
      admissionMode: values.admissionMode,
      capacity: parseCapacity(values.capacity),
      communityId: editing
        ? existing.data?.hostType === 'community'
          ? existing.data.hostId
          : null
        : values.communityId || null,
      organizationId: editing ? null : values.organizationId || null,
    };
    try {
      const saved = editing
        ? await update.mutateAsync({ id: existing.data!.id, data: payload })
        : await create.mutateAsync({ data: payload });
      void navigate(`/events/${saved.slug}`);
    } catch {
      setFormError(t('resourceSaveError'));
    }
  };

  return (
    <section className="mx-auto max-w-(--container-reading) space-y-7">
      <Link
        className="inline-flex min-h-(--control-height-md) items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        to={editing ? `/events/${existing.data!.slug}` : '/create'}
      >
        <ArrowLeft aria-hidden="true" size={17} />
        {t(editing ? 'backToEvent' : 'backToCreate')}
      </Link>
      <header className="border-b border-border pb-5">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {t(editing ? 'editEvent' : 'createEventTitle')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('eventFormIntro')}</p>
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
        <label className={labelClass} htmlFor="event-title">
          <span>{t('eventName')}</span>
          <input
            aria-describedby={form.formState.errors.title ? 'event-title-error' : undefined}
            aria-invalid={Boolean(form.formState.errors.title)}
            className={inputClass}
            id="event-title"
            maxLength={160}
            required
            {...form.register('title')}
          />
          {form.formState.errors.title && (
            <span className="text-xs text-destructive" id="event-title-error">
              {t('formFieldInvalid')}
            </span>
          )}
        </label>
        <label className={labelClass} htmlFor="event-description">
          <span>{t('description')}</span>
          <textarea
            aria-describedby={
              form.formState.errors.description ? 'event-description-error' : undefined
            }
            aria-invalid={Boolean(form.formState.errors.description)}
            className={`${inputClass} min-h-36 resize-y`}
            id="event-description"
            maxLength={5000}
            required
            {...form.register('description')}
          />
          {form.formState.errors.description && (
            <span className="text-xs text-destructive" id="event-description-error">
              {t('formFieldInvalid')}
            </span>
          )}
        </label>

        {!editing && (
          <>
            <label className={labelClass} htmlFor="event-host">
              <span>{t('eventHost')}</span>
              <select
                className={inputClass}
                id="event-host"
                {...form.register('communityId', {
                  onChange: () => form.setValue('organizationId', ''),
                })}
              >
                <option value="">{t('hostAsYourself')}</option>
                {communities.data?.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))}
              </select>
              {communities.isError && (
                <span className="text-xs font-normal text-destructive">
                  {t('managedCommunitiesLoadError')}
                </span>
              )}
            </label>
            <label className={labelClass} htmlFor="event-organization-host">
              <span>{t('resourceOrganizationHost')}</span>
              <select
                className={inputClass}
                id="event-organization-host"
                {...form.register('organizationId', {
                  onChange: () => form.setValue('communityId', ''),
                })}
              >
                <option value="">{t('organizationNoHost')}</option>
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
          </>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <label className={labelClass} htmlFor="event-visibility">
            <span>{t('eventVisibility')}</span>
            <select className={inputClass} id="event-visibility" {...form.register('visibility')}>
              <option value="public">{t('eventPublic')}</option>
              <option value="unlisted">{t('eventUnlisted')}</option>
            </select>
          </label>
          <label className={labelClass} htmlFor="event-admission">
            <span>{t('admissionPolicy')}</span>
            <select className={inputClass} id="event-admission" {...form.register('admissionMode')}>
              <option value="instant">{t('admissionInstant')}</option>
              <option value="approval">{t('admissionApproval')}</option>
              <option value="automatic">{t('admissionAutomatic')}</option>
            </select>
          </label>
        </div>

        <p className="text-sm text-muted-foreground">{t('eventTimeZoneHint')}</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={labelClass} htmlFor="event-starts-at">
            <span>{t('eventStartsAt')}</span>
            <input
              aria-describedby={
                form.formState.errors.startsAt ? 'event-starts-at-error' : undefined
              }
              aria-invalid={Boolean(form.formState.errors.startsAt)}
              className={inputClass}
              id="event-starts-at"
              required
              type="datetime-local"
              {...form.register('startsAt')}
            />
            {form.formState.errors.startsAt && (
              <span className="text-xs text-destructive" id="event-starts-at-error">
                {t('formFieldInvalid')}
              </span>
            )}
          </label>
          <label className={labelClass} htmlFor="event-ends-at">
            <span>{t('eventEndsAt')}</span>
            <input
              aria-describedby={form.formState.errors.endsAt ? 'event-ends-at-error' : undefined}
              aria-invalid={Boolean(form.formState.errors.endsAt)}
              className={inputClass}
              id="event-ends-at"
              type="datetime-local"
              {...form.register('endsAt')}
            />
            {form.formState.errors.endsAt && (
              <span className="text-xs text-destructive" id="event-ends-at-error">
                {t('formFieldInvalid')}
              </span>
            )}
          </label>
        </div>

        <label className="flex min-h-12 items-center gap-3 border-y border-border py-3 text-sm font-semibold">
          <input type="checkbox" {...form.register('online')} />
          {t('eventOnline')}
        </label>
        {!online && (
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass} htmlFor="event-city">
              <span>{t('profileCity')}</span>
              <select
                aria-describedby={form.formState.errors.cityId ? 'event-city-error' : undefined}
                aria-invalid={Boolean(form.formState.errors.cityId)}
                className={inputClass}
                id="event-city"
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
                <span className="text-xs text-destructive" id="event-city-error">
                  {t('formFieldInvalid')}
                </span>
              )}
            </label>
            <label className={labelClass} htmlFor="event-location">
              <span>{t('eventLocation')}</span>
              <input
                aria-describedby={
                  form.formState.errors.locationName ? 'event-location-error' : undefined
                }
                aria-invalid={Boolean(form.formState.errors.locationName)}
                className={inputClass}
                id="event-location"
                maxLength={200}
                required
                {...form.register('locationName')}
              />
              {form.formState.errors.locationName && (
                <span className="text-xs text-destructive" id="event-location-error">
                  {t('formFieldInvalid')}
                </span>
              )}
            </label>
          </div>
        )}
        <label className={labelClass} htmlFor="event-capacity">
          <span>{t('capacityOptional')}</span>
          <input
            aria-describedby={form.formState.errors.capacity ? 'event-capacity-error' : undefined}
            aria-invalid={Boolean(form.formState.errors.capacity)}
            className={inputClass}
            id="event-capacity"
            inputMode="numeric"
            max="10000"
            min="1"
            type="number"
            {...form.register('capacity')}
          />
          {form.formState.errors.capacity && (
            <span className="text-xs text-destructive" id="event-capacity-error">
              {t('formFieldInvalid')}
            </span>
          )}
        </label>

        <fieldset
          aria-describedby={
            form.formState.errors.categoryIds ? 'event-categories-error' : undefined
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
            <p className="text-xs text-destructive" id="event-categories-error">
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
            <Link to={editing ? `/events/${existing.data!.slug}` : '/create'}>{t('cancel')}</Link>
          </Button>
          <Button disabled={create.isPending || update.isPending} type="submit">
            {create.isPending || update.isPending
              ? t('savingResource')
              : t(editing ? 'saveChanges' : 'publishEvent')}
          </Button>
        </div>
      </form>
    </section>
  );
}
