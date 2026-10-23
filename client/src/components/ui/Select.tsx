import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type SelectOption = { value: string; label: ReactNode; disabled?: boolean };

export type SelectProps = {
  id?: string | undefined;
  name?: string | undefined;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  'aria-label'?: string | undefined;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: boolean | undefined;
  'aria-busy'?: boolean | undefined;
};

/**
 * shadcn-style select built on Radix. Same 44px height and border treatment as
 * Input so mixed filter and form rows line up on one baseline.
 */
export function Select({
  id,
  name,
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-busy': ariaBusy,
}: SelectProps): React.JSX.Element {
  return (
    <SelectPrimitive.Root
      disabled={disabled}
      name={name}
      onValueChange={onValueChange}
      value={value}
    >
      <SelectPrimitive.Trigger
        aria-busy={ariaBusy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        className={cn(
          'flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-(--shape-radius-control) border border-input bg-background px-3 text-start text-sm text-text shadow-xs transition-[border-color,background-color] duration-(--motion-duration-fast) hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled) aria-invalid:border-danger [&>span]:truncate',
          !value && 'text-text-subtle',
          className,
        )}
        id={id}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-text-subtle" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="z-(--z-dropdown) max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          position="popper"
          sideOffset={6}
        >
          <SelectPrimitive.Viewport className="max-h-72 overflow-y-auto p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                className="relative flex h-9 w-full cursor-pointer select-none items-center rounded-md px-2.5 pe-8 text-sm outline-hidden data-[disabled]:pointer-events-none data-[disabled]:opacity-(--opacity-disabled) data-[highlighted]:bg-primary-soft data-[highlighted]:text-primary-soft-text data-[state=checked]:font-semibold"
                disabled={option.disabled}
                key={option.value}
                value={option.value}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute end-2 grid place-items-center">
                  <Check aria-hidden="true" className="size-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
