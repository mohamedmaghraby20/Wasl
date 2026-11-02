import { LoaderCircle } from 'lucide-react';

export function LoadingState({ message }: { message: string }): React.JSX.Element {
  return (
    <p aria-live="polite" aria-busy="true" className="flex items-center gap-2 text-sm text-text-muted" role="status">
      <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
      {message}
    </p>
  );
}
