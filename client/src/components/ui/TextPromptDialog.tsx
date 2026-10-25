import { Loader2 } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './Dialog';
import { Field } from './Field';
import { Textarea } from './Textarea';

export function TextPromptDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  value,
  onValueChange,
  onSubmit,
  submitLabel,
  pending = false,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  pending?: boolean;
  error?: string | undefined;
}): React.JSX.Element {
  const { t } = useTranslation();
  const id = useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        <DialogDescription className="mt-1 text-sm leading-relaxed text-text-muted">
          {description}
        </DialogDescription>
        <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
          <Field error={error} id={id} label={label}>
            <Textarea
              autoFocus
              id={id}
              maxLength={500}
              onChange={(event) => onValueChange(event.target.value)}
              required
              value={value}
            />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button disabled={pending} type="button" variant="outline">
                {t('cancel')}
              </Button>
            </DialogClose>
            <Button disabled={pending || !value.trim()} type="submit">
              {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
