import { applyMetadata } from '../seo/metadata';
import { decideSeo } from '../seo/policy';
import { useDirectoryRuntime } from '../features/directory/api';
import { ContactPage, EventPage } from './ContactEvent';
import { clearAnalyticsSession } from '../features/growth/events';
import { ui } from '../lib/texts';
import { useEffect, useState, lazy, Suspense } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { portalCnpj } from '../lib/brand';
import { About, Legal, NotFound } from './InstitutionalPages';
import { Button } from '../components/ui/button';
import { RequireRole } from '../components/RequireRole';
import Header from '../components/Header';
import Home from './Home';
import Directory, { SupplierProfile } from './Directory';
import Area from './Area';
import { Account, AccountRemoved } from './AccountPages';
const DemoReviewsPage = lazy(() =>
  import('../features/growth/Reviews').then((m) => ({
    default: m.DemoReviewsPage,
  })),
);
const GrowthPage = lazy(() => import('./GrowthPage'));
const SupplierAds = lazy(() => import('./SupplierAds'));
const CommercialPage = lazy(() => import('./CommercialPage'));
const AdvertiserReport = lazy(() => import('./AdvertiserReport'));
const AdRedirect = lazy(() =>
  import('./AdvertiserReport').then((m) => ({ default: m.AdRedirect })),
);
const EditorialPreview = lazy(() => import('./EditorialPreview'));
const ContentPublic = lazy(() => import('./ContentPublic'));
const ContentPanel = lazy(() => import('./ContentPanel'));
const NewsletterToken = lazy(() => import('./NewsletterToken'));
const BillingPage = lazy(() => import('./BillingPage'));
const AdminPage = lazy(() => import('./AdminPage'));
const OwnerInvitation = lazy(() => import('./OwnerInvitation'));
const SupplierPortal = lazy(() => import('./SupplierPortal'));
const InvitePage = lazy(() => import('./InvitePage'));
const AuthPage = lazy(() => import('./AuthPage'));
function Cookies() {
  const [visible, setVisible] = useState(false),
    [custom, setCustom] = useState(false);
  useEffect(() => {
    setVisible(!localStorage.getItem('patri:consent'));
  }, []);
  function save(v: string) {
    localStorage.setItem('patri:consent', v);
    if (v !== 'analytics') clearAnalyticsSession();
    window.dispatchEvent(new Event('patri:consent'));
    setVisible(false);
  }
  return visible ? (
    <div
      className="cookies"
      role="region"
      aria-label={ui.preferencias_de_cookies}
    >
      <div>
        <strong>{ui.sua_privacidade_importa}</strong>
        <p>
          Cookies essenciais mantêm sua sessão. Com sua permissão, contamos
          visualizações e cliques em anúncios, sem identificar visitantes.
        </p>
        {custom && (
          <p>
            Essenciais sempre ativos. Análises opcionais. Você pode alterar sua
            escolha no rodapé.
          </p>
        )}
      </div>
      <button onClick={() => setCustom(!custom)}>{ui.personalizar}</button>
      <Button variant="outline" onClick={() => save('essential')}>
        {ui.recusar_opcionais}
      </Button>
      <Button onClick={() => save('analytics')}>Permitir análises</Button>
    </div>
  ) : null;
}
export default function App() {
  const loc = useLocation();
  const seoRuntime = useDirectoryRuntime();
  useEffect(() => {
    if (
      decideSeo(loc.pathname + loc.search, seoRuntime).privateRoute ||
      !/^\/(guia|busca|fornecedor|materias|materia|revista|sobre-o-projeto|para-fornecedores|termos|privacidade|evento|contato|contrato-fornecedor)(\/|$)/.test(
        loc.pathname,
      )
    ) {
      applyMetadata(decideSeo(loc.pathname + loc.search, seoRuntime));
    }
    if (loc.hash) {
      requestAnimationFrame(() =>
        document.getElementById(loc.hash.slice(1))?.scrollIntoView(),
      );
    } else {
      window.scrollTo(0, 0);
    }
  }, [loc.pathname, loc.search, loc.hash, seoRuntime]);
  return (
    <>
      <Header />
      <main>
        <Suspense
          fallback={
            <p role="status" className="container page">
              {ui.carregando}
            </p>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/previa-editorial" element={<EditorialPreview />} />
            <Route
              path="/previa-editorial/:slug"
              element={<EditorialPreview />}
            />
            <Route path="/guia" element={<Directory />} />
            <Route path="/guia/:segmento" element={<Directory />} />
            <Route path="/guia/:segmento/:uf/:cidade" element={<Directory />} />
            <Route path="/busca" element={<Directory />} />
            <Route path="/fornecedor/:slug" element={<SupplierProfile />} />
            <Route path="/evento" element={<EventPage />} />
            <Route path="/contato" element={<ContactPage />} />
            <Route path="/sobre-o-projeto" element={<About />} />
            <Route path="/para-fornecedores" element={<About />} />
            {(
              ['login', 'register', 'recover', 'reset', 'confirm'] as const
            ).map((mode, i) => (
              <Route
                key={mode}
                path={
                  [
                    '/entrar',
                    '/cadastrar',
                    '/recuperar-senha',
                    '/redefinir-senha',
                    '/confirmar-email',
                  ][i]
                }
                element={<AuthPage key={mode} mode={mode} />}
              />
            ))}
            <Route path="/materias" element={<ContentPublic />} />
            <Route path="/materias/:category" element={<ContentPublic />} />
            <Route path="/materia/:slug" element={<ContentPublic />} />
            <Route path="/revista" element={<ContentPublic />} />
            <Route path="/revista/:slug" element={<ContentPublic />} />
            <Route
              path="/newsletter/:action/:token"
              element={<NewsletterToken />}
            />
            <Route
              path="/demonstracao-editorial"
              element={<ContentPublic demo />}
            />
            <Route
              path="/demonstracao-editorial/materias/:category"
              element={<ContentPublic demo />}
            />
            <Route
              path="/demonstracao-editorial/materia/:slug"
              element={<ContentPublic demo />}
            />
            <Route
              path="/demonstracao-editorial/revista"
              element={<ContentPublic demo />}
            />
            <Route
              path="/demonstracao-editorial/revista/:slug"
              element={<ContentPublic demo />}
            />
            <Route
              path="/demonstracao-editorial/newsletter/:action/:token"
              element={<NewsletterToken demo />}
            />
            <Route
              path="/demonstracao-conteudo"
              element={<ContentPanel demo />}
            />
            <Route
              path="/demonstracao-materias/*"
              element={<ContentPanel demo supplier />}
            />
            <Route
              path="/demonstracao-anuncios"
              element={<SupplierAds demo />}
            />
            <Route
              path="/demonstracao-comercial"
              element={<CommercialPage demo />}
            />
            <Route
              path="/demonstracao-relatorio/:token"
              element={<AdvertiserReport demo />}
            />
            <Route path="/relatorio/:token" element={<AdvertiserReport />} />
            <Route path="/r/:id" element={<AdRedirect />} />
            <Route
              path="/demonstracao-avaliacoes"
              element={<DemoReviewsPage />}
            />
            <Route
              path="/demonstracao-crescimento"
              element={<GrowthPage demo />}
            />
            <Route
              path="/demonstracao-crescimento/avaliacoes"
              element={<GrowthPage demo view="avaliacoes" />}
            />
            <Route
              path="/demonstracao-crescimento/diagnostico"
              element={<GrowthPage demo view="diagnostico" />}
            />
            <Route
              path="/demonstracao-crescimento/cresca"
              element={<GrowthPage demo view="cresca" />}
            />
            <Route
              path="/demonstracao-moderacao"
              element={<GrowthPage demo admin view="avaliacoes" />}
            />
            <Route
              path="/demonstracao-marketing"
              element={<GrowthPage demo admin view="marketing" />}
            />
            <Route
              path="/demonstracao-metricas-admin"
              element={<GrowthPage demo admin />}
            />
            <Route path="/conta-removida" element={<AccountRemoved />} />
            <Route path="/demonstracao-conta" element={<Account demo />} />
            <Route path="/area" element={<Area />} />
            <Route path="/demonstracao-admin/*" element={<AdminPage demo />} />
            <Route path="/assumir/:token" element={<OwnerInvitation />} />
            <Route path="/demonstracao" element={<SupplierPortal demo />} />
            <Route path="/demonstracao-plano" element={<BillingPage demo />} />
            <Route path="/convite/:token" element={<InvitePage />} />
            <Route element={<RequireRole roles={['fornecedor']} />}>
              <Route
                path="/painel/materias/*"
                element={<ContentPanel supplier />}
              />
              <Route path="/painel/metricas" element={<GrowthPage />} />
              <Route
                path="/painel/avaliacoes"
                element={<GrowthPage view="avaliacoes" />}
              />
              <Route
                path="/painel/diagnostico"
                element={<GrowthPage view="diagnostico" />}
              />
              <Route
                path="/painel/cresca"
                element={<GrowthPage view="cresca" />}
              />
              <Route path="/painel/anuncios" element={<SupplierAds />} />
              <Route path="/painel/plano" element={<BillingPage />} />
              <Route path="/painel/*" element={<SupplierPortal />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'comercial']} />}>
              <Route
                path="/admin/fornecedores/:id/editar"
                element={<AdminPage />}
              />
              <Route path="/admin/metricas" element={<GrowthPage admin />} />
              <Route
                path="/admin/marketing"
                element={<GrowthPage admin view="marketing" />}
              />
              <Route path="/admin/comercial/*" element={<CommercialPage />} />
              <Route path="/admin/*" element={<AdminPage />} />
            </Route>
            <Route element={<RequireRole roles={['admin']} />}>
              <Route
                path="/admin/avaliacoes"
                element={<GrowthPage admin view="avaliacoes" />}
              />
            </Route>
            <Route element={<RequireRole roles={['admin', 'editor']} />}>
              <Route path="/admin/conteudo/*" element={<ContentPanel />} />
            </Route>
            <Route
              element={
                <RequireRole
                  roles={[
                    'admin',
                    'editor',
                    'comercial',
                    'fornecedor',
                    'sindico',
                  ]}
                />
              }
            >
              <Route path="/conta" element={<Account />} />
            </Route>
            <Route path="/contrato-fornecedor" element={<Legal />} />
            <Route path="/termos" element={<Legal />} />
            <Route path="/privacidade" element={<Legal />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <footer>
        <div className="container footer">
          <div className="brand">
            <BrandLogo />
          </div>
          <div>
            <p>{ui.conexoes_que_valorizam_o_seu_condominio}</p>
            <p>CNPJ {portalCnpj}</p>
          </div>
          <div>
            <Link to="/sobre-o-projeto">Sobre a Patri</Link>
            <Link to="/para-fornecedores">Para fornecedores</Link>
            <Link to="/termos">{ui.termos}</Link>
            <Link to="/contrato-fornecedor">Contrato de fornecedor</Link>
            <Link to="/contato">Contato</Link>
            <Link to="/evento">Eventos</Link>
            <Link to="/privacidade">{ui.privacidade}</Link>
            <span>
              {ui.texto_}
              {new Date().getFullYear()}
              {ui.patri_realty_2}
            </span>
          </div>
        </div>
      </footer>
      <button
        className="container"
        onClick={() => {
          localStorage.removeItem('patri:consent');
          clearAnalyticsSession();
          window.location.reload();
        }}
      >
        Preferências de privacidade
      </button>
      <Cookies />
    </>
  );
}
