import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

export function NotFoundPage(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <section className="grid min-h-64 place-items-center text-center">
      <div>
        <h1 className="text-3xl font-bold">{t('notFound')}</h1>
        <Button asChild className="mt-4">
          <Link to="/">{t('backHome')}</Link>
        </Button>
      </div>
    </section>
  );
}
