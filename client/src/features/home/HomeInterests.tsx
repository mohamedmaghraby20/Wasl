import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useDiscoveryControllerDiscoveryCategories } from '@/api/generated/discovery/discovery';
import { QueryError } from '@/components/feedback/QueryError';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { localizedName } from '@/features/resources/resource-utils';

export function HomeInterests({ cityId }: { cityId: string }): React.JSX.Element | null {
  const { t, i18n } = useTranslation();
  const categories = useDiscoveryControllerDiscoveryCategories(
    cityId ? { city: cityId } : undefined,
  );
  if (categories.isSuccess && categories.data.length === 0) return null;

  return (
    <section aria-labelledby="home-interests-heading" className="grid gap-4">
      <h2 className="text-xl font-bold sm:text-2xl" id="home-interests-heading">
        {t('homeInterests')}
      </h2>
      {categories.isPending ? (
        <>
          <p className="sr-only" role="status">
            {t('loadingCategories')}
          </p>
          <div aria-hidden="true" className="flex flex-wrap gap-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton className="h-11 w-28" key={index} />
            ))}
          </div>
        </>
      ) : categories.isError ? (
        <QueryError message={t('homeInterestsError')} onRetry={() => void categories.refetch()} />
      ) : (
        <ul className="flex flex-wrap gap-3">
          {categories.data.map((category) => {
            const destination = new URLSearchParams({
              category: category.id,
              ...(cityId ? { city: cityId } : {}),
              upcoming: 'true',
              nonCancelled: 'true',
              cityScope: 'include-online',
            });
            return (
              <li className="min-w-0 max-w-full" key={category.id}>
                <Button
                  asChild
                  className="h-auto min-h-11 max-w-full whitespace-normal break-words py-2 text-start"
                  variant="outline"
                >
                  <Link to={`/discover?${destination}`}>
                    {localizedName(category, i18n.language)}
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
