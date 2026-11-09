import { Facebook, Link2, Linkedin, Mail, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, buttonVariants } from '@/components/ui/Button';

/** Share links and copy action for a public resource detail page. */
export function ResourceShareLinks({
  label,
  path,
  title,
  onCopy,
}: {
  label: string;
  path: string;
  title: string;
  onCopy: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const shareUrl = `${window.location.origin}${path}`;
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
      href: `https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`,
      Icon: MessageCircle,
    },
    {
      label: t('shareEmail'),
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodedUrl}`,
      Icon: Mail,
    },
  ];

  return (
    <div className="grid justify-items-start gap-1">
      <p className="text-xs font-semibold text-text-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-1">
        {shares.map(({ label: shareLabel, href, Icon }) => (
          <a
            key={shareLabel}
            aria-label={shareLabel}
            className={buttonVariants({ size: 'icon-sm', variant: 'ghost' })}
            href={href}
            rel="noopener noreferrer"
            target={href.startsWith('mailto:') ? undefined : '_blank'}
            title={shareLabel}
          >
            <Icon aria-hidden="true" />
          </a>
        ))}
        <Button
          aria-label={t('copyShare')}
          onClick={onCopy}
          size="icon-sm"
          title={t('copyShare')}
          variant="ghost"
        >
          <Link2 aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
