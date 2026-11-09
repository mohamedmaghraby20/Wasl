export function Avatar({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-(--shape-radius-control) bg-primary-soft text-xl font-bold text-primary-soft-text"
    >
      {avatarUrl ? (
        <img alt="" className="size-full object-cover" src={avatarUrl} />
      ) : (
        displayName.trim().slice(0, 1).toLocaleUpperCase()
      )}
    </span>
  );
}
