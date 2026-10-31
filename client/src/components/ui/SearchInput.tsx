import { Search, X } from 'lucide-react';
import { useRef, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Input } from './Input';
import { IconButton } from './IconButton';

export function SearchInput({
  value,
  onValueChange,
  onClear,
  className,
  ref,
  onKeyDown,
  ...props
}: Omit<ComponentProps<'input'>, 'type' | 'value' | 'onChange'> & {
  value: string;
  onValueChange: (value: string) => void;
  onClear?: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const clearSearch = (): void => {
    onValueChange('');
    onClear?.();
    inputRef.current?.focus();
  };
  return (
    <div className="search-field relative w-full min-w-0 flex-1">
      <Search
        aria-hidden="true"
        className="search-field-icon pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
      />
      <Input
        aria-label={props['aria-label'] ?? t('search')}
        autoComplete="off"
        enterKeyHint="search"
        {...props}
        className={cn('ps-10 pe-12 text-base sm:text-sm', className)}
        onChange={(event) => onValueChange(event.currentTarget.value)}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (
            event.key === 'Escape' &&
            !event.defaultPrevented &&
            !event.nativeEvent.isComposing &&
            value &&
            !props.readOnly &&
            !props.disabled
          ) {
            event.preventDefault();
            clearSearch();
          }
        }}
        ref={(element) => {
          inputRef.current = element;
          if (typeof ref === 'function') return ref(element);
          if (ref) ref.current = element;
        }}
        type="search"
        value={value}
      />
      {value && !props.readOnly ? (
        <IconButton
          className="search-field-clear absolute end-0 top-1/2 -translate-y-1/2 hover:bg-primary-soft focus-visible:bg-primary-soft"
          disabled={props.disabled}
          icon={X}
          label={t('clearSearch')}
          onClick={clearSearch}
          type="button"
        />
      ) : null}
    </div>
  );
}
