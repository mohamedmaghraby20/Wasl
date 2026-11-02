import type { ReactNode } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Facebook,
  Link2,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  UsersRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useSearchParams } from 'react-router';
import type { CommunityPublicDto } from '@/api/generated/wasl-client.schemas';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CommunityMemberPreview } from '@/features/participation/CommunityMemberPreview';
import { CommunityMembersTab } from '@/features/participation/CommunityMembersTab';
import { CommunityTopics } from '@/features/discussions/CommunityTopics';
import { defaultResourceCover, localizedName } from '@/features/resources/resource-utils';
import { CommunityEvents } from './CommunityEvents';
import { ParticipationQueueLinks } from '@/features/participation/ParticipationQueueLinks';

const sections = [
  { id: 'about', label: 'communityAbout', Icon: BookOpen },
  { id: 'events', label: 'events', Icon: CalendarDays },
  { id: 'members', label: 'communityMembers', Icon: UsersRound },
  { id: 'discussion', label: 'communityDiscussion', Icon: MessageSquare },
] as const;

export function defaultCommunityCover(id: string): string {
  return defaultResourceCover(id, 'communities');
}

export function CommunityDetailsLayout({
  item,
  hostPath,
  canManage,
  canViewMembers,
  viewerId,
  membershipAction,
  managementActions,
  managementPanel,
  chatAction,
  onCopyShare,
}: {
  item: CommunityPublicDto;
  hostPath?: string | undefined;
  canManage: boolean;
  canViewMembers: boolean;
  viewerId?: string | undefined;
  membershipAction: ReactNode;
  managementActions: ReactNode;
  managementPanel: ReactNode;
  chatAction: ReactNode;
  onCopyShare: () => void;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [params] = useSearchParams();
  const selected = sections.some((section) => section.id === params.get('tab'))
    ? params.get('tab')
    : 'about';
  const shareUrl = `${window.location.origin}/communities/${item.slug}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const shares = [
    {
      label: t('shareFacebook'),
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      Icon: Facebook,
    },
    {
      label: t('shareLinkedIn'),
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      Icon: Linkedin,
    },
    {
      label: t('shareWhatsApp'),
      href: `https://wa.me/?text=${encodeURIComponent(`${item.name} ${shareUrl}`)}`,
      Icon: MessageCircle,
    },
    {
      label: t('shareEmail'),
      href: `mailto:?subject=${encodeURIComponent(item.name)}&body=${encodedUrl}`,
      Icon: Mail,
    },
  ];

  return (
    <article className="mx-auto grid w-full min-w-0 max-w-(--container-max) gap-8 sm:gap-10">
      <Link
        className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-text-muted hover:text-text"
        to="/communities"
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t('backTo', { resource: t('communities') })}
      </Link>
      <header className="grid items-center gap-7 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-10 lg:gap-14">
        <div className="relative isolate">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 translate-x-1 translate-y-2 rotate-1 rounded-(--shape-radius-2xl) bg-primary-soft sm:translate-x-2 rtl:-translate-x-1 sm:rtl:-translate-x-2"
          />
          <img
            alt={t('defaultCommunityCoverAlt')}
            className="aspect-[16/10] w-full rounded-(--shape-radius-2xl) border border-border object-cover shadow-xs"
            height={750}
            src={defaultCommunityCover(item.id)}
            width={1200}
          />
        </div>
        <div className="grid min-w-0 gap-5">
          <h1 className="max-w-xl break-words font-heading text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {item.name}
          </h1>
          <div className="grid gap-2 text-sm text-text-muted">
            <p className="flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4 shrink-0" />
              {item.cityName}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {item.memberCount !== undefined ? (
                <p className="flex items-center gap-2">
                  <UsersRound aria-hidden="true" className="size-4 shrink-0" />
                  {t('communityMemberCount', { count: item.memberCount })}
                </p>
              ) : null}
              {canManage ? (
                <ParticipationQueueLinks kind="communities" resourceId={item.id} />
              ) : null}
            </div>
            <p>
              {item.ownerType === 'user' && viewerId === item.ownerId ? (
                t('hostedByYou')
              ) : (
                <>
                  {t('hostedByLabel')}{' '}
                  {hostPath ? (
                    <Link className="font-semibold text-text hover:underline" to={hostPath}>
                      {item.hostName}
                    </Link>
                  ) : (
                    item.hostName
                  )}
                </>
              )}
            </p>
          </div>
          {item.categories.length ? (
            <ul className="flex flex-wrap gap-2" aria-label={t('categoriesLabel')}>
              {item.categories.map((category) => (
                <li key={category.id}>
                  <Badge variant="primary">{localizedName(category, i18n.language)}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="grid justify-items-start gap-1 pt-1">
            <p className="text-xs font-semibold text-text-muted">{t('shareCommunity')}</p>
            <div className="flex flex-wrap items-center gap-1">
              {shares.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  aria-label={label}
                  className={buttonVariants({ size: 'icon-sm', variant: 'ghost' })}
                  href={href}
                  rel="noopener noreferrer"
                  target={href.startsWith('mailto:') ? undefined : '_blank'}
                  title={label}
                >
                  <Icon aria-hidden="true" />
                </a>
              ))}
              <Button
                aria-label={t('copyShare')}
                onClick={onCopyShare}
                size="icon-sm"
                title={t('copyShare')}
                variant="ghost"
              >
                <Link2 aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-4 border-b border-border">
        <nav aria-label={t('communitySections')} className="flex max-w-full gap-1 sm:gap-3">
          {sections.map(({ id, label, Icon }) => {
            const next = new URLSearchParams(params);
            if (id === 'about') next.delete('tab');
            else next.set('tab', id);
            return (
              <Link
                key={id}
                aria-current={selected === id ? 'page' : undefined}
                className={`relative flex min-h-18 min-w-0 flex-col items-center justify-center gap-2 border-b-2 px-3 pb-3 pt-2 text-xs font-semibold transition-colors sm:px-5 ${selected === id ? 'border-primary text-primary-soft-text' : 'border-transparent text-text-muted hover:border-border-strong hover:text-text'}`}
                preventScrollReset
                to={{ pathname: location.pathname, search: next.toString() }}
              >
                <Icon
                  aria-hidden="true"
                  className="size-4.5"
                />
                {t(label)}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-wrap items-center gap-2 pb-3">
          {canManage ? managementActions : membershipAction}
        </div>
      </div>

      <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
        <div className="grid min-w-0 content-start gap-7">
          {selected === 'about' ? (
            <>
              <section aria-labelledby="community-about-heading" className="grid gap-4">
                <h2 className="font-heading text-2xl font-bold" id="community-about-heading">
                  {t('communityAboutUs')}
                </h2>
                <p className="max-w-prose whitespace-pre-wrap break-words text-sm leading-7 text-text-muted">
                  {item.description}
                </p>
              </section>
              <dl className="grid gap-5 border-t border-border pt-6 sm:grid-cols-2">
                <div className="grid gap-1">
                  <dt className="text-xs font-semibold text-text-muted">{t('detailAdmission')}</dt>
                  <dd className="text-sm font-medium">
                    {t(
                      item.admissionMode === 'approval'
                        ? 'admissionApproval'
                        : item.admissionMode === 'automatic'
                          ? 'admissionAutomatic'
                          : 'admissionOpen',
                    )}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-xs font-semibold text-text-muted">{t('capacityLabel')}</dt>
                  <dd className="text-sm font-medium">
                    {item.capacity == null
                      ? t('unlimited')
                      : t('capacityValue', { capacity: item.capacity })}
                  </dd>
                </div>
              </dl>
            </>
          ) : null}
          {selected === 'events' ? (
            <CommunityEvents key={item.id} communityId={item.id} canManage={canManage} />
          ) : null}
          {selected === 'members' ? (
            canViewMembers ? (
              <>
                <CommunityMembersTab key={item.id} communityId={item.id} canManage={canManage} />
                {canManage ? managementPanel : null}
              </>
            ) : (
              <section className="grid gap-3">
                <h2 className="font-heading text-2xl font-bold">{t('communityMembers')}</h2>
                <p className="rounded-(--shape-radius-card) border border-dashed border-border p-6 text-sm text-text-muted">
                  {t('membersOnly')}
                </p>
              </section>
            )
          ) : null}
          {selected === 'discussion' ? (
            <CommunityTopics key={item.id} communityId={item.id} canPost={canViewMembers} />
          ) : null}
        </div>
        <aside
          aria-label={t('communitySidebar')}
          className="grid min-w-0 gap-4 lg:sticky lg:top-24"
        >
          <CommunityMemberPreview
            community={item}
            communityId={item.id}
            canViewMembers={canViewMembers}
            viewerId={viewerId}
          />
          {chatAction}
        </aside>
      </div>
    </article>
  );
}
