import { Search, X } from 'lucide-react';
import { useRef, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Input } from './Input';

export function SearchInput({
  value,
  onValueChange,
  onClear,
  className,
  ref,
  ...props
}: Omit<ComponentProps<'input'>, 'type' | 'value' | 'onChange'> & {
  value: string;
  onValueChange: (value: string) => void;
  onClear?: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="relative w-full min-w-0 flex-1">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
      />
      <Input
        aria-label={props['aria-label'] ?? t('search')}
        autoComplete="off"
        enterKeyHint="search"
        {...props}
        className={cn('ps-9 pe-11 [&::-webkit-search-cancel-button]:appearance-none', className)}
        onChange={(event) => onValueChange(event.currentTarget.value)}
        ref={(element) => {
          inputRef.current = element;
          if (typeof ref === 'function') return ref(element);
          if (ref) ref.current = element;
        }}
        type="search"
        value={value}
      />
      {value && !props.readOnly ? (
        <button
          aria-label={t('clearSearch')}
          className="absolute end-0 top-0 grid h-full min-w-11 place-items-center rounded-(--shape-radius-control) text-text-subtle transition-colors hover:bg-surface-soft hover:text-text disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled)"
          disabled={props.disabled}
          onClick={() => {
            onValueChange('');
            onClear?.();
            inputRef.current?.focus();
          }}
          title={t('clearSearch')}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
