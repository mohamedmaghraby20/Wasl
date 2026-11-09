import { Search } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { SearchInput } from '@/components/ui/SearchInput';

/** Site-wide shortcut for the same public discovery search used on the homepage. */
export function GlobalSearch({
  inlineSearch,
}: { inlineSearch?: HTMLElement | null } = {}): React.JSX.Element | null {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.shiftKey ||
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== 'k'
      )
        return;
      if (!open && document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      event.preventDefault();
      if (inlineSearch) {
        inlineSearch.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
        return;
      }
      setOpen((previous) => !previous);
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [inlineSearch, open]);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const params = new URLSearchParams({
      q: query.trim(),
      upcoming: 'true',
      nonCancelled: 'true',
      cityScope: 'include-online',
    });
    try {
      const city = window.localStorage.getItem('wasl-city');
      if (city) params.set('city', city);
    } catch {
      // Search remains available when browser storage is disabled.
    }
    setOpen(false);
    void navigate(`/discover?${params}`);
  };

  if (inlineSearch) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          aria-label={t('homeSearchLabel')}
          aria-keyshortcuts="Control+K Meta+K"
          size="icon"
          title={t('homeSearchLabel')}
          variant="ghost"
        >
          <Search aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent
        closeLabel={t('cancel')}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="pe-12 text-lg font-bold">{t('homeSearchLabel')}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-text-muted">
          {t('homeSearchExample')}
        </DialogDescription>
        <form className="mt-5 grid gap-3" onSubmit={submit} role="search">
          <SearchInput
            aria-label={t('homeSearchLabel')}
            placeholder={t('homeSearchExample')}
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
          />
          <Button type="submit">{t('search')}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
