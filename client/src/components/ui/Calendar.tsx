import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DayPicker, type DayPickerProps } from 'react-day-picker';
import { ar, enUS, tr } from 'react-day-picker/locale';
import { cn } from '@/lib/cn';

const locales = { en: enUS, ar, tr };

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: DayPickerProps): React.JSX.Element {
  const { i18n } = useTranslation();
  const language = i18n.language.startsWith('ar')
    ? 'ar'
    : i18n.language.startsWith('tr')
      ? 'tr'
      : 'en';
  return (
    <DayPicker
      className={cn('p-1', className)}
      classNames={{
        months: 'relative flex flex-col gap-4 sm:flex-row',
        month: 'flex w-full flex-col gap-3',
        month_caption: 'flex h-9 items-center justify-center px-9',
        caption_label: 'text-sm font-semibold text-text',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous:
          'grid size-9 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-soft hover:text-text disabled:opacity-(--opacity-disabled)',
        button_next:
          'grid size-9 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-soft hover:text-text disabled:opacity-(--opacity-disabled)',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 rounded-md text-center text-[0.7rem] font-medium uppercase tracking-wide text-text-subtle',
        week: 'mt-1 flex w-full',
        day: 'relative size-9 p-0 text-center text-sm',
        day_button:
          'size-9 rounded-md p-0 font-medium text-text transition-colors hover:bg-surface-soft aria-selected:hover:bg-primary-hover',
        range_start: 'rounded-s-md bg-primary-soft',
        range_end: 'rounded-e-md bg-primary-soft',
        range_middle: 'rounded-none bg-primary-soft/70',
        selected:
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary-hover',
        today: '[&>button]:font-bold [&>button]:text-primary-soft-text',
        outside: 'text-text-subtle/60',
        disabled: 'text-text-subtle/40',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass }) =>
          orientation === 'left' ? (
            <ChevronLeft aria-hidden="true" className={cn('size-4 rtl:rotate-180', chevronClass)} />
          ) : (
            <ChevronRight aria-hidden="true" className={cn('size-4 rtl:rotate-180', chevronClass)} />
          ),
      }}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      locale={locales[language]}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  );
}

export { type DateRange } from 'react-day-picker';
