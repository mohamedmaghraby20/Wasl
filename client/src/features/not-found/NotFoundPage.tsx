import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

export function NotFoundPage(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <section className="grid justify-items-center gap-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-soft-text">
        404
      </p>
      <h1 className="text-3xl font-extrabold sm:text-4xl">{t('notFound')}</h1>
      <Button asChild>
        <Link to="/">{t('backHome')}</Link>
      </Button>
    </section>
  );
}
