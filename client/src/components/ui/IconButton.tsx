import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Button } from './Button';

type IconButtonProps = Omit<ComponentProps<typeof Button>, 'children' | 'size' | 'asChild' | 'aria-label' | 'title'> & {
  icon: LucideIcon;
  label: string;
};

export function IconButton({ icon: Icon, label, variant = 'ghost', ...props }: IconButtonProps): React.JSX.Element {
  return (
    <Button {...props} aria-label={label} title={label} size="icon-sm" variant={variant}>
      <Icon aria-hidden="true" />
    </Button>
  );
}
