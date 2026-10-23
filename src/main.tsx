import { loadPublicContent } from './pages/public-content-loader';
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
function mount() {
  if (state) ReactDOM.hydrateRoot(document.getElementById('root')!, tree);
  else ReactDOM.createRoot(document.getElementById('root')!).render(tree);
}
// Keep SSR content in place while the matching public route becomes ready.
// Hydrating first allowed context updates to replace a not-yet-ready boundary.
if (
  state &&
  /^\/(materia|materias|revista)(\/|$)/.test(window.location.pathname)
)
  void loadPublicContent()
    .then(mount)
    .catch(() => {
      // Offline/chunk failures retain the readable SSR document.
      console.error(
        'Não foi possível ativar as interações desta página. Recarregue para tentar novamente.',
      );
    });
else mount();
