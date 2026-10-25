import { Flag } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { toast } from 'sonner';
import { useModerationControllerReport } from '@/api/generated/moderation/moderation';
import { Button } from '@/components/ui/Button';
import { TextPromptDialog } from '@/components/ui/TextPromptDialog';
import { useAuth } from '@/features/auth/AuthProvider';

export function ReportAction({ targetType, targetId }: {
  targetType: 'user' | 'community' | 'event' | 'organization' | 'post';
  targetId: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const report = useModerationControllerReport();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState(false);
  const signIn = `/sign-in?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`;

  return (
    <>
      <Button asChild={!user} onClick={user ? () => setOpen(true) : undefined} size="sm" variant="ghost">
        {user ? <><Flag aria-hidden="true" />{t('reportContent')}</> : <Link to={signIn}><Flag aria-hidden="true" />{t('reportContent')}</Link>}
      </Button>
      <TextPromptDialog
        open={open}
        onOpenChange={(value) => { setOpen(value); setError(false); }}
        title={t('reportContent')}
        description={t('reportDescription')}
        label={t('reportReasonLabel')}
        value={reason}
        onValueChange={setReason}
        pending={report.isPending}
        error={error ? t('reportSubmitError') : undefined}
        submitLabel={t('submitReport')}
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = reason.trim();
          if (!trimmed) return;
          void report.mutateAsync({ data: { targetType, targetId, reason: trimmed } })
            .then(() => { setOpen(false); setReason(''); toast.success(t('reportSubmitted')); })
            .catch(() => setError(true));
        }}
      />
    </>
  );
}
