import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from './AlertDialog';
import { Button } from './Button';
import { Field } from './Field';
import { Input } from './Input';

export type DeleteOptions = {
  title: string;
  description: string;
  confirmationText: string;
  confirmLabel: string;
  successMessage: string;
  errorMessage: string;
  onDelete: () => Promise<string | void>;
  onComplete?: () => void;
};

export function DeleteDialog({
  open,
  onClose,
  ...options
}: DeleteOptions & {
  open: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const id = useId();
  const [typed, setTyped] = useState('');
  const [state, setState] = useState<'confirm' | 'pending' | 'error' | 'complete'>('confirm');
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  const close = () => {
    if (busy.current) return;
    onClose();
    if (state === 'complete') options.onComplete?.();
  };
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="grid gap-4">
          <span
            className={`grid size-10 place-items-center rounded-full ${state === 'complete' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}
          >
            {state === 'complete' ? (
              <Check aria-hidden="true" className="size-5" />
            ) : (
              <AlertTriangle aria-hidden="true" className="size-5" />
            )}
          </span>
          <AlertDialogTitle className="break-words text-lg font-semibold">
            {state === 'complete' ? t('deletionComplete') : options.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-text-muted">
            {state === 'complete' ? message || options.successMessage : options.description}
          </AlertDialogDescription>
          {state === 'complete' ? (
            <Button onClick={close}>{t('done')}</Button>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (busy.current || typed !== options.confirmationText) return;
                busy.current = true;
                setState('pending');
                void options
                  .onDelete()
                  .then((result) => {
                    setMessage(result ?? '');
                    setState('complete');
                  })
                  .catch(() => setState('error'))
                  .finally(() => {
                    busy.current = false;
                  });
              }}
            >
              <div className="rounded-(--shape-radius-control) border border-danger/30 bg-danger-soft p-3 text-sm font-medium text-danger">
                {t('deletionWarning')}
              </div>
              <Field id={id} label={t('typeToConfirmDeletion', { name: options.confirmationText })}>
                <Input
                  autoComplete="off"
                  autoCorrect="off"
                  disabled={state === 'pending'}
                  id={id}
                  onChange={(event) => setTyped(event.target.value)}
                  placeholder={options.confirmationText}
                  spellCheck={false}
                  value={typed}
                />
              </Field>
              {state === 'error' ? (
                <p className="text-sm text-danger" role="alert">
                  {options.errorMessage}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <AlertDialogCancel asChild>
                  <Button disabled={state === 'pending'} type="button" variant="outline">
                    {t('cancel')}
                  </Button>
                </AlertDialogCancel>
                <Button
                  aria-busy={state === 'pending'}
                  disabled={state === 'pending' || typed !== options.confirmationText}
                  type="submit"
                  variant="danger"
                >
                  {state === 'pending' ? (
                    <Loader2
                      aria-hidden="true"
                      className="animate-spin motion-reduce:animate-none"
                    />
                  ) : null}
                  {state === 'pending' ? t('deletionInProgress') : options.confirmLabel}
                </Button>
              </div>
            </form>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useDeleteConfirmation(): {
  requestDeletion: (options: DeleteOptions) => void;
  deleteDialog: React.JSX.Element | null;
} {
  const [options, setOptions] = useState<DeleteOptions | null>(null);
  return {
    requestDeletion: setOptions,
    deleteDialog: options ? (
      <DeleteDialog {...options} open onClose={() => setOptions(null)} />
    ) : null,
  };
}
