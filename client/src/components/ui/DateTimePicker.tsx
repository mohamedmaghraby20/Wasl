import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { DatePicker } from './DatePicker';
import { Select } from './Select';

const pad = (value: number): string => String(value).padStart(2, '0');

const timeOptions = Array.from({ length: 24 * 4 }, (_, index) => {
  const value = `${pad(Math.floor(index / 4))}:${pad((index % 4) * 15)}`;
  return { value, label: value };
});

/**
 * Date + time pair stored as `YYYY-MM-DDTHH:mm`, matching the local Türkiye
 * value the event form has always submitted. Replaces the native
 * `datetime-local` input, whose popup is rendered by the operating system.
 */
export function DateTimePicker({
  id,
  label,
  value,
  onChange,
  minDate,
  disabled,
  className,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: {
  id?: string | undefined;
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: boolean | undefined;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [datePart = '', timePart = ''] = value.split('T');
  const update = (nextDate: string, nextTime: string): void => {
    if (!nextDate) {
      onChange('');
      return;
    }
    onChange(`${nextDate}T${nextTime || '18:00'}`);
  };
  return (
    <div className={cn('flex items-start gap-2', className)}>
      <DatePicker
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className="flex-1"
        disabled={disabled}
        id={id}
        label={label}
        min={minDate}
        onChange={(nextDate) => update(nextDate, timePart)}
        value={datePart}
      />
      <Select
        aria-label={t('time')}
        className="w-28"
        disabled={disabled || !datePart}
        onValueChange={(nextTime) => update(datePart, nextTime)}
        options={timeOptions}
        placeholder={t('time')}
        value={timePart}
      />
    </div>
  );
}
