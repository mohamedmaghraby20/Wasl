import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useDownwardDropdown } from '@/lib/use-downward-dropdown';
import { Input } from './Input';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

export type SearchableSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  searchText?: string;
};

export function SearchableSelect({
  id,
  name,
  value,
  onValueChange,
  options,
  placeholder,
  selectedLabel,
  searchPlaceholder,
  emptyMessage,
  loading = false,
  onSearch,
  disabled,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-busy': ariaBusy,
}: {
  id: string;
  name?: string | undefined;
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string | undefined;
  selectedLabel?: string | undefined;
  searchPlaceholder?: string | undefined;
  emptyMessage?: string | undefined;
  loading?: boolean | undefined;
  onSearch?: ((query: string) => void) | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  'aria-label'?: string | undefined;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: boolean | undefined;
  'aria-busy'?: boolean | undefined;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { open, onOpenChange, triggerRef } = useDownwardDropdown(344);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(false);
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    if (onSearch) return options;
    const term = search.trim().toLocaleLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      (option.searchText ?? option.label).toLocaleLowerCase().includes(term),
    );
  }, [onSearch, options, search]);

  useEffect(() => {
    if (open && !wasOpen.current) {
      const selectedIndex = filtered.findIndex((option) => option.value === value);
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : filtered.length ? 0 : -1);
    } else if (!open) {
      setSearch('');
      setActiveIndex(-1);
    }
    wasOpen.current = open;
  }, [filtered, open, value]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex((current) =>
      current >= 0 && current < filtered.length ? current : filtered.length ? 0 : -1,
    );
  }, [filtered.length, open]);

  const choose = (option: SearchableSelectOption | undefined): void => {
    if (!option || option.disabled) return;
    onValueChange(option.value);
    onOpenChange(false);
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(filtered[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onOpenChange(false);
    }
  };

  return (
    <Popover modal onOpenChange={onOpenChange} open={open}>
      {name ? <input name={name} type="hidden" value={value} /> : null}
      <PopoverTrigger asChild>
        <button
          aria-autocomplete="list"
          aria-busy={ariaBusy}
          aria-controls={`${id}-listbox`}
          aria-describedby={ariaDescribedBy}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel}
          className={cn(
            'flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-(--shape-radius-control) border border-input bg-background px-3 text-start text-sm text-text shadow-xs transition-[border-color,background-color] duration-(--motion-duration-fast) hover:border-border-control-hover disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled) aria-invalid:border-danger',
            !selected && !selectedLabel && 'text-text-subtle',
            className,
          )}
          disabled={disabled}
          id={id}
          role="combobox"
          ref={triggerRef}
          type="button"
        >
          <span className="truncate">{selected?.label ?? (selectedLabel || placeholder)}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-text-subtle" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        avoidCollisions={false}
        className="flex max-h-[calc(100dvh-6rem)] w-(--radix-popover-trigger-width) flex-col overflow-hidden p-1"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus();
        }}
      >
        <div className="relative m-1 mb-2">
          <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle" />
          <Input
            aria-activedescendant={
              activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
            }
            aria-autocomplete="list"
            aria-controls={`${id}-listbox`}
            aria-expanded={open}
            aria-label={searchPlaceholder ?? t('searchOptions')}
            autoComplete="off"
            className="h-9 ps-9 py-1"
            onChange={(event) => {
              setSearch(event.target.value);
              onSearch?.(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onSearchKeyDown}
            placeholder={searchPlaceholder ?? t('searchOptions')}
            ref={searchRef}
            type="search"
            value={search}
          />
        </div>
        <ul
          aria-label={ariaLabel}
          className="min-h-0 max-h-72 overflow-y-auto overscroll-contain p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          id={`${id}-listbox`}
          role="listbox"
        >
          {loading ? (
            <li className="px-2 py-3 text-sm text-text-muted" role="presentation">
              {t('loadingOptions')}
            </li>
          ) : filtered.length === 0 ? (
            <li className="px-2 py-3 text-sm text-text-muted" role="presentation">
              {emptyMessage ?? t('noOptions')}
            </li>
          ) : (
            filtered.map((option, index) => (
              <li key={option.value} role="presentation">
                <button
                  aria-selected={option.value === value}
                  className={cn(
                    'flex min-h-11 w-full cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm text-text transition-colors hover:bg-primary-soft hover:text-primary-soft-text',
                    option.value === value && 'font-semibold',
                    index === activeIndex && 'bg-primary-soft text-primary-soft-text',
                  )}
                  disabled={option.disabled}
                  id={`${id}-option-${index}`}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                  type="button"
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.value === value ? (
                    <Check aria-hidden="true" className="size-4 shrink-0" />
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
