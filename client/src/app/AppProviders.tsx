import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { i18n } from '@/lib/i18n';
import { AuthProvider } from '@/features/auth/AuthProvider';

const head = createHead();

export function AppProviders({ children }: PropsWithChildren): React.JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
          mutations: { onError: () => toast.error(i18n.t('genericError')) },
        },
      }),
  );
  return (
    <UnheadProvider head={head}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <Toaster richColors closeButton />
        </AuthProvider>
      </QueryClientProvider>
    </UnheadProvider>
  );
}
