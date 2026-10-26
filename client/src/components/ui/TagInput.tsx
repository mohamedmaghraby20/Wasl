import { X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export function TagInput({
  id,
  value,
  onChange,
  placeholder,
  max = 20,
  maxLength = 60,
  disabled,
  className,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string | undefined;
  max?: number | undefined;
  maxLength?: number | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: boolean | undefined;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const add = (raw: string): void => {
    const incoming = raw
      .split(',')
      .map((item) => item.trim().slice(0, maxLength))
      .filter(Boolean);
    if (!incoming.length) return;
    onChange([...new Set([...value, ...incoming])].slice(0, max));
  };

  const commit = (): void => {
    if (!draft.trim()) return;
    add(draft);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      aria-invalid={ariaInvalid}
      className={cn(
        'flex min-h-11 max-h-44 flex-wrap items-center gap-1.5 overflow-y-auto rounded-(--shape-radius-control) border border-input bg-background px-2 py-1.5 text-sm shadow-xs transition-[border-color,box-shadow] duration-(--motion-duration-fast) focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background aria-invalid:border-danger',
        disabled && 'cursor-not-allowed bg-surface-soft opacity-(--opacity-disabled)',
        className,
      )}
    >
      {value.map((item) => (
        <span
          className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface-soft py-1 pe-1 ps-2.5 text-xs font-medium text-text"
          key={item}
        >
          <span className="truncate">{item}</span>
          <button
            aria-label={t('removeInterest', { interest: item })}
            className="grid size-6 shrink-0 place-items-center rounded-full text-text-subtle transition-colors hover:bg-surface hover:text-text disabled:pointer-events-none"
            disabled={disabled}
            onClick={() => onChange(value.filter((current) => current !== item))}
            type="button"
          >
            <X aria-hidden="true" className="size-3" />
          </button>
        </span>
      ))}
      <input
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className="min-w-24 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-text-subtle disabled:cursor-not-allowed"
        disabled={disabled}
        id={id}
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData('text');
          if (!pasted.includes(',')) return;
          event.preventDefault();
          add(pasted);
        }}
        placeholder={value.length >= max ? undefined : placeholder}
        value={draft}
      />
    </div>
  );
}
