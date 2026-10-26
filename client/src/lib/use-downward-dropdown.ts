import { useEffect, useRef, useState } from 'react';

/** Make room before Radix locks scrolling, so panels can consistently open below. */
export function useDownwardDropdown(panelHeight: number, panelWidth?: number) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);
  const [alignOffset, setAlignOffset] = useState(0);

  useEffect(() => () => restoreRef.current?.(), []);

  const onOpenChange = (nextOpen: boolean): void => {
    if (nextOpen && !open) {
      const trigger = triggerRef.current;
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        if (panelWidth) {
          const left = rect.left + (rect.width - panelWidth) / 2;
          const targetLeft = Math.max(8, Math.min(left, window.innerWidth - 8 - panelWidth));
          const rtl = getComputedStyle(trigger).direction === 'rtl';
          setAlignOffset(rtl ? rect.right - panelWidth - targetLeft : targetLeft - rect.left);
        }
        const height = Math.min(panelHeight, Math.max(120, window.innerHeight - rect.height - 96));
        const distance = Math.max(0, rect.bottom + height + 16 - window.innerHeight);
        if (distance) {
          const body = document.body;
          const previousPadding = body.style.paddingBottom;
          const padding = Number.parseFloat(getComputedStyle(body).paddingBottom) || 0;
          const remaining = Math.max(0, document.documentElement.scrollHeight - window.innerHeight - window.scrollY);
          if (remaining < distance) {
            body.style.paddingBottom = `${padding + distance - remaining}px`;
            restoreRef.current = () => { body.style.paddingBottom = previousPadding; };
          }
          window.scrollBy({ top: distance, behavior: 'instant' });
        }
      }
    } else if (!nextOpen) {
      restoreRef.current?.();
      restoreRef.current = null;
    }
    setOpen(nextOpen);
  };

  return { open, onOpenChange, triggerRef, alignOffset };
}
