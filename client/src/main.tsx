import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { AppProviders } from '@/app/AppProviders';
import { router } from '@/app/router';
import '@/lib/i18n';
import '@/styles/index.css';

document.documentElement.dataset.theme = 'wasl';
document.documentElement.dataset.mode = 'light';
document.documentElement.dataset.density = 'comfortable';
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('The application root element is missing.');

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
