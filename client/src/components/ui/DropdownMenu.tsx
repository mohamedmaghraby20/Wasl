import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight } from 'lucide-react';
import { createContext, useContext, type ComponentProps, type RefObject } from 'react';
import { cn } from '@/lib/cn';
import { useDownwardDropdown } from '@/lib/use-downward-dropdown';

const TriggerContext = createContext<RefObject<HTMLButtonElement | null> | undefined>(undefined);

export function DropdownMenu({ children, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Root>): React.JSX.Element {
  const { open, onOpenChange, triggerRef } = useDownwardDropdown(360);
  return (
    <TriggerContext.Provider value={triggerRef}>
      <DropdownMenuPrimitive.Root {...props} open={open} onOpenChange={onOpenChange}>
        {children}
      </DropdownMenuPrimitive.Root>
    </TriggerContext.Provider>
  );
}

export function DropdownMenuTrigger(props: ComponentProps<typeof DropdownMenuPrimitive.Trigger>): React.JSX.Element {
  const triggerRef = useContext(TriggerContext);
  return <DropdownMenuPrimitive.Trigger {...props} ref={triggerRef} />;
}
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

export function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 8,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>): React.JSX.Element {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        side="bottom"
        avoidCollisions={false}
        align={align}
        className={cn(
          'z-(--z-dropdown) min-w-52 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className,
        )}
        sideOffset={sideOffset}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  inset,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }): React.JSX.Element {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'relative flex min-h-11 cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-text outline-hidden transition-colors duration-(--motion-duration-fast) data-[disabled]:pointer-events-none data-[disabled]:opacity-(--opacity-disabled) data-[highlighted]:bg-surface-soft [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-text-subtle',
        inset && 'ps-8',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>): React.JSX.Element {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        'relative flex min-h-11 cursor-pointer select-none items-center rounded-md py-2 pe-2.5 ps-8 text-sm text-text outline-hidden data-[highlighted]:bg-surface-soft',
        className,
      )}
      {...props}
    >
      <span className="absolute start-2.5 grid place-items-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check aria-hidden="true" className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label>): React.JSX.Element {
  return (
    <DropdownMenuPrimitive.Label
      className={cn('px-2.5 pb-1 pt-2 text-xs font-semibold text-text-subtle', className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>): React.JSX.Element {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

export function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>): React.JSX.Element {
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={cn(
        'flex min-h-11 cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-text outline-hidden data-[state=open]:bg-surface-soft data-[highlighted]:bg-surface-soft',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRight aria-hidden="true" className="ms-auto size-4 rtl:rotate-180" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

export const DropdownMenuSub = DropdownMenuPrimitive.Sub;

export function DropdownMenuSubContent({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubContent>): React.JSX.Element {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        className={cn(
          'z-(--z-dropdown) min-w-44 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}
