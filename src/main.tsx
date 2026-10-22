import React from 'react';
import { decideSeo } from './seo/policy';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
} from '@tanstack/react-query';
import { AuthProvider } from './features/auth/context';
import App from './pages/App';
import './styles.css';
import './premium.css';
import './mobile.css';
const state = (
  window as unknown as {
    __PATRI_STATE__?: import('@tanstack/react-query').DehydratedState;
  }
).__PATRI_STATE__;
// The protected HashRouter adapter sets this to true at build time.
const legacyHashRouting = false;
if (!legacyHashRouting && window.location.hash.startsWith('#/')) {
  const address = window.location.hash.slice(1);
  const decision = decideSeo(address, {
    siteUrl: window.location.origin,
    source: 'live',
  });
  if (decision.publicRoute && decision.status === 200)
    window.location.replace(address);
}
const tree = (
  <React.StrictMode>
    <QueryClientProvider client={new QueryClient()}>
      <BrowserRouter>
        <AuthProvider>
          <HydrationBoundary state={state}>
            <App />
          </HydrationBoundary>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
if (state) ReactDOM.hydrateRoot(document.getElementById('root')!, tree);
else ReactDOM.createRoot(document.getElementById('root')!).render(tree);
