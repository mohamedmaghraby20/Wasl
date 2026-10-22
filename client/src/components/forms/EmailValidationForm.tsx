import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useId, useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';

const emailSchema = z.object({ email: z.string().email() });
type EmailForm = z.infer<typeof emailSchema>;

export function EmailValidationForm(): React.JSX.Element {
  const { t } = useTranslation();
  const emailId = useId();
  const [isValid, setIsValid] = useState(false);
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });

  return (
    <form
      className="grid min-w-64 gap-2"
      noValidate
      onSubmit={(event) =>
        void handleSubmit(
          () => setIsValid(true),
          () => setIsValid(false),
        )(event)
      }
    >
      <label className="text-sm font-semibold" htmlFor={emailId}>
        {t('exampleFormLabel')}
      </label>
      <input
        aria-describedby={
          errors.email ? `${emailId}-error` : isValid ? `${emailId}-success` : undefined
        }
        className="min-h-(--control-height-md) rounded-(--shape-radius-control) border border-input bg-background px-(--field-padding-inline) outline-none focus-visible:ring-(length:--focus-ring-width) focus-visible:ring-ring"
        id={emailId}
        type="email"
        autoComplete="email"
        aria-invalid={Boolean(errors.email)}
        {...register('email', { onChange: () => setIsValid(false) })}
      />
      {errors.email && (
        <p className="text-sm text-destructive" id={`${emailId}-error`} role="alert">
          {t('exampleFormError')}
        </p>
      )}
      {isValid && (
        <p className="text-sm text-[var(--color-success)]" id={`${emailId}-success`} role="status">
          {t('exampleFormSuccess')}
        </p>
      )}
      <Button type="submit">{t('exampleFormSubmit')}</Button>
    </form>
  );
}
