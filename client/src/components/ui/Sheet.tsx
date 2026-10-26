import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

export function SheetContent({
  className,
  children,
  side = 'end',
  closeLabel = 'Close',
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  side?: 'start' | 'end' | 'top';
  closeLabel?: string;
}): React.JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-overlay) bg-text/35 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-(--z-modal) flex flex-col gap-1 border-border bg-card p-4 shadow-lg data-[state=closed]:animate-out data-[state=open]:animate-in',
          side === 'end' &&
            'inset-y-0 end-0 h-full w-[86%] max-w-sm border-s duration-(--motion-duration-slow) data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right rtl:data-[state=closed]:slide-out-to-left rtl:data-[state=open]:slide-in-from-left',
          side === 'start' &&
            'inset-y-0 start-0 h-full w-[86%] max-w-sm border-e duration-(--motion-duration-slow) data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left rtl:data-[state=closed]:slide-out-to-right rtl:data-[state=open]:slide-in-from-right',
          side === 'top' &&
            'inset-x-0 top-0 max-h-[85vh] overflow-y-auto rounded-b-2xl border-b duration-(--motion-duration-slow) data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="absolute end-2 top-2 grid size-11 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-soft hover:text-text"
        >
          <X aria-hidden="true" className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
