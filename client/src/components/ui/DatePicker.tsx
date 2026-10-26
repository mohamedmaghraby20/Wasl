import { CalendarDays, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useDownwardDropdown } from '@/lib/use-downward-dropdown';
import { Calendar } from './Calendar';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

function useCompactViewport(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(max-width: 39.999rem)');
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return compact;
}

export function parseIsoDate(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Single-date picker. The trigger is a real button with the field label as its
 * accessible name, so it behaves the same as a native input in forms.
 */
export function DatePicker({
  id,
  label,
  value,
  onChange,
  placeholder,
  min,
  disabled,
  className,
  align = 'center',
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: {
  id?: string | undefined;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  min?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  align?: 'start' | 'center' | 'end' | undefined;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: boolean | undefined;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const compact = useCompactViewport();
  const { open, onOpenChange, triggerRef, alignOffset } = useDownwardDropdown(374, compact ? 270 : undefined);
  const selected = parseIsoDate(value);
  const minDate = parseIsoDate(min ?? '');
  const formatter = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });
  const popoverAlign = compact ? 'start' : align;

  return (
    <Popover modal onOpenChange={onOpenChange} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          aria-label={selected ? `${label}: ${formatter.format(selected)}` : label}
          className={cn(
            'flex h-11 w-full min-w-0 items-center gap-2 rounded-(--shape-radius-control) border border-input bg-background px-3 text-start text-sm shadow-xs transition-[border-color,box-shadow] duration-(--motion-duration-fast) hover:border-border-control-hover disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled) aria-invalid:border-danger',
            !selected && 'text-text-subtle',
            className,
          )}
          disabled={disabled}
          id={id}
          ref={triggerRef}
          type="button"
        >
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-text-subtle" />
          <span className="truncate">
            {selected ? formatter.format(selected) : (placeholder ?? t('pickDate'))}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={popoverAlign}
        alignOffset={compact ? alignOffset : 0}
        avoidCollisions={false}
        className="max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        side="bottom"
      >
        <Calendar
          fixedWeeks
          disabled={minDate ? { before: minDate } : undefined}
          mode="single"
          onSelect={(date) => {
            onChange(date ? toIsoDate(date) : '');
            if (date) onOpenChange(false);
          }}
          selected={selected}
        />
        <div className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-2">
          <button
            className="min-h-9 rounded-md px-3 text-xs font-semibold text-text-muted hover:bg-surface-soft hover:text-text"
            onClick={() => {
              onChange(toIsoDate(new Date()));
              onOpenChange(false);
            }}
            type="button"
          >
            {t('today')}
          </button>
          {value ? (
            <button
              className="inline-flex min-h-9 items-center gap-1 rounded-md px-3 text-xs font-semibold text-danger hover:bg-danger-soft"
              onClick={() => {
                onChange('');
                onOpenChange(false);
              }}
              type="button"
            >
              <X aria-hidden="true" className="size-3" />
              {t('clear')}
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
