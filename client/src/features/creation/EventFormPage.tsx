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
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/features/auth/AuthProvider';
import { languageCode } from '@/features/resources/resource-utils';
import { cn } from '@/lib/cn';
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

const HOST_SELF = '__self__';

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
  const online = form.watch('online');
  const errors = form.formState.errors;
  const startsAt = form.watch('startsAt');

  const save = async (values: FormValues): Promise<void> => {
    setFormError('');
    let startsAtIso: string;
    let endsAtIso: string | null;
    try {
      startsAtIso = toTurkeyIso(values.startsAt);
      endsAtIso = values.endsAt ? toTurkeyIso(values.endsAt) : null;
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
      startsAt: startsAtIso,
      endsAt: endsAtIso,
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
    <section className="mx-auto grid max-w-(--container-reading) gap-6">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
        to={editing ? `/events/${existing.data!.slug}` : '/create'}
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t(editing ? 'backToEvent' : 'backToCreate')}
      </Link>
      <header className="grid gap-2">
        <h1 className="text-3xl font-extrabold">{t(editing ? 'editEvent' : 'createEventTitle')}</h1>
        <p className="text-sm leading-relaxed text-text-muted">{t('eventFormIntro')}</p>
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

          <div className="grid gap-5 sm:grid-cols-[1.6fr_1fr]">
            <Field
              error={errors.title ? t('formFieldInvalid') : undefined}
              id="event-title"
              label={t('eventName')}
              required
            >
              <Input
                aria-describedby={errors.title ? 'event-title-error' : undefined}
                aria-invalid={Boolean(errors.title)}
                id="event-title"
                maxLength={160}
                required
                {...form.register('title')}
              />
            </Field>
            <Field
              error={errors.capacity ? t('formFieldInvalid') : undefined}
              id="event-capacity"
              label={t('capacityOptional')}
            >
              <Input
                aria-describedby={errors.capacity ? 'event-capacity-error' : undefined}
                aria-invalid={Boolean(errors.capacity)}
                id="event-capacity"
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
            id="event-description"
            label={t('description')}
            required
          >
            <Textarea
              aria-describedby={errors.description ? 'event-description-error' : undefined}
              aria-invalid={Boolean(errors.description)}
              id="event-description"
              maxLength={5000}
              required
              {...form.register('description')}
            />
          </Field>

          {!editing ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                error={communities.isError ? t('managedCommunitiesLoadError') : undefined}
                id="event-host"
                label={t('eventHost')}
              >
                <Select
                  id="event-host"
                  onValueChange={(value) => {
                    form.setValue('communityId', value === HOST_SELF ? '' : value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    if (value !== HOST_SELF) {
                      form.setValue('organizationId', '', { shouldDirty: true });
                    }
                  }}
                  options={[
                    { value: HOST_SELF, label: t('hostAsYourself') },
                    ...(communities.data ?? []).map((community) => ({
                      value: community.id,
                      label: community.name,
                    })),
                  ]}
                  value={form.watch('communityId') || HOST_SELF}
                />
              </Field>
              <Field
                error={organizations.isError ? t('managedOrganizationsLoadError') : undefined}
                id="event-organization-host"
                label={t('resourceOrganizationHost')}
              >
                <Select
                  id="event-organization-host"
                  onValueChange={(value) => {
                    form.setValue('organizationId', value === HOST_SELF ? '' : value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    if (value !== HOST_SELF) {
                      form.setValue('communityId', '', { shouldDirty: true });
                    }
                  }}
                  options={[
                    { value: HOST_SELF, label: t('organizationNoHost') },
                    ...(organizations.data ?? []).map((organization) => ({
                      value: organization.id,
                      label: `${organization.name} (${t(`organizationRole_${organization.role}`)})`,
                    })),
                  ]}
                  value={form.watch('organizationId') || HOST_SELF}
                />
              </Field>
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="event-visibility" label={t('eventVisibility')}>
              <Select
                id="event-visibility"
                onValueChange={(value) =>
                  form.setValue('visibility', value as FormValues['visibility'], {
                    shouldDirty: true,
                  })
                }
                options={[
                  { value: 'public', label: t('eventPublic') },
                  { value: 'unlisted', label: t('eventUnlisted') },
                ]}
                value={form.watch('visibility')}
              />
            </Field>
            <Field id="event-admission" label={t('admissionPolicy')}>
              <Select
                id="event-admission"
                onValueChange={(value) =>
                  form.setValue('admissionMode', value as FormValues['admissionMode'], {
                    shouldDirty: true,
                  })
                }
                options={[
                  { value: 'instant', label: t('admissionInstant') },
                  { value: 'approval', label: t('admissionApproval') },
                  { value: 'automatic', label: t('admissionAutomatic') },
                ]}
                value={form.watch('admissionMode')}
              />
            </Field>
          </div>

          <p className="text-xs font-medium text-text-subtle">{t('eventTimeZoneHint')}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              error={errors.startsAt ? t('formFieldInvalid') : undefined}
              id="event-starts-at"
              label={t('eventStartsAt')}
              required
            >
              <DateTimePicker
                aria-describedby={errors.startsAt ? 'event-starts-at-error' : undefined}
                aria-invalid={Boolean(errors.startsAt)}
                id="event-starts-at"
                label={t('eventStartsAt')}
                onChange={(value) =>
                  form.setValue('startsAt', value, { shouldDirty: true, shouldValidate: true })
                }
                value={startsAt}
              />
            </Field>
            <Field
              error={errors.endsAt ? t('formFieldInvalid') : undefined}
              id="event-ends-at"
              label={t('eventEndsAt')}
            >
              <DateTimePicker
                aria-describedby={errors.endsAt ? 'event-ends-at-error' : undefined}
                aria-invalid={Boolean(errors.endsAt)}
                id="event-ends-at"
                label={t('eventEndsAt')}
                minDate={startsAt.split('T')[0]}
                onChange={(value) =>
                  form.setValue('endsAt', value, { shouldDirty: true, shouldValidate: true })
                }
                value={form.watch('endsAt')}
              />
            </Field>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-soft px-3 py-2.5">
            <Checkbox
              checked={online}
              id="event-online"
              onCheckedChange={(checked) =>
                form.setValue('online', checked === true, { shouldDirty: true })
              }
            />
            <Label className="cursor-pointer font-medium" htmlFor="event-online">
              {t('eventOnline')}
            </Label>
          </div>

          {!online ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                error={errors.cityId ? t('formFieldInvalid') : undefined}
                id="event-city"
                label={t('profileCity')}
                required
              >
                <Select
                  aria-describedby={errors.cityId ? 'event-city-error' : undefined}
                  aria-invalid={Boolean(errors.cityId)}
                  id="event-city"
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
              <Field
                error={errors.locationName ? t('formFieldInvalid') : undefined}
                id="event-location"
                label={t('eventLocation')}
                required
              >
                <Input
                  aria-describedby={errors.locationName ? 'event-location-error' : undefined}
                  aria-invalid={Boolean(errors.locationName)}
                  id="event-location"
                  maxLength={200}
                  required
                  {...form.register('locationName')}
                />
              </Field>
            </div>
          ) : null}

          <fieldset
            aria-describedby={errors.categoryIds ? 'event-categories-error' : undefined}
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
                      id={`event-category-${category.id}`}
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
                      htmlFor={`event-category-${category.id}`}
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
              <p className="text-xs font-medium text-danger" id="event-categories-error">
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
              <Link to={editing ? `/events/${existing.data!.slug}` : '/create'}>{t('cancel')}</Link>
            </Button>
            <Button disabled={create.isPending || update.isPending} type="submit">
              {create.isPending || update.isPending
                ? t('savingResource')
                : t(editing ? 'saveChanges' : 'publishEvent')}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
