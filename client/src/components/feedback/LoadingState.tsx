export function LoadingState({ message }: { message: string }): React.JSX.Element {
  return <p aria-live="polite" className="text-sm text-text-muted" role="status">{message}</p>;
}
