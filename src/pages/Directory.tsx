import { PublicReviews } from '../features/growth/Reviews';
import { InstagramPosts } from '../features/growth/Instagram';
import { ViewEvent, track } from '../features/growth/events';
import { AdSlot } from '../features/commercial/AdSlot';
import { SupplierArticles } from '../features/content/PublicCards';
import { SmartCombobox } from '../features/directory/SmartCombobox';
import { SpecialtyPicker } from '../features/directory/SpecialtyPicker';
import { QuotationForm } from '../features/quotations/Form';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  directoryCatalog,
  searchDirectory,
  publicProfile,
  catalogKey,
  searchKey,
  profileKey,
  useDirectoryRuntime,
  localEligibility,
  eligibilityKey,
  approvedLocalGuides,
  localGuidesKey,
} from '../features/directory/api';
import {
  directoryPath,
  filtersFromRoute,
  safeHttps,
  videoId,
  type Filters,
  type PublicSupplier,
} from '../features/directory/model';
import { directoryTexts as t } from '../features/directory/texts';
import '../features/directory/directory.css';
export { PageMetadata as DirectorySeo } from '../seo/metadata';
import { PageMetadata as DirectorySeo } from '../seo/metadata';
import { directoryMetadata, publicRedirect } from '../seo/policy';
import { localLocation, freshEligibility } from '../seo/eligibility';
import { nationalPilotBlocked } from '../seo/national-pilot';
import {
  GuideDecision,
  type GuideBrief,
} from '../features/directory/GuideDecision';
export function DemoNotice() {
  return useDirectoryRuntime().source === 'demo' ? (
    <aside className="directory-demo">
      <strong>{t.demoTitle}</strong>
      <p>{t.demoBody}</p>
    </aside>
  ) : null;
}
const empty: Filters = {
  segmento: '',
  uf: '',
  cidade: '',
  q: '',
  pagina: 1,
  ordem: 'relevancia',
};
export function SearchForm({
  initial = empty,
  expandedSpecialties = false,
}: {
  initial?: Filters;
  expandedSpecialties?: boolean;
}) {
  const r = useDirectoryRuntime(),
    navigate = useNavigate();
  const [f, setF] = useState(initial);
  useEffect(
    () => setF(initial),
    [initial.segmento, initial.uf, initial.cidade, initial.q],
  );
  const c = useQuery({
    queryKey: catalogKey(r, f.uf),
    queryFn: () => directoryCatalog(r, f.uf),
  });
  const base = useQuery({
    queryKey: catalogKey(r),
    queryFn: () => directoryCatalog(r),
  });
  return (
    <form
      className="directory-search"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(directoryPath({ ...f, pagina: 1 }));
      }}
    >
      <label>
        {t.keyword}
        <input
          value={f.q}
          maxLength={120}
          placeholder={t.keywordPlaceholder}
          onChange={(e) => setF({ ...f, q: e.target.value })}
        />
      </label>
      <SmartCombobox
        label={t.state}
        value={f.uf}
        options={(base.data?.estados || []).map((s) => ({
          value: s.uf,
          label: s.nome + ' (' + s.uf + ')',
          search: s.uf,
        }))}
        onChange={(uf) => setF({ ...f, uf, cidade: '' })}
        placeholder="Ex.: SP, São Paulo ou Minas"
        loading={base.isPending}
        error={base.isError}
        onRetry={() => void base.refetch()}
      />
      <SmartCombobox
        label={t.city}
        value={f.cidade}
        options={(c.data?.cidades || []).map((s) => ({
          value: s.slug,
          label: s.nome,
        }))}
        onChange={(cidade) => setF({ ...f, cidade })}
        placeholder={f.uf ? 'Digite o nome da cidade' : 'Escolha um estado'}
        resetKey={f.uf}
        disabled={!f.uf}
        loading={c.isFetching}
        error={c.isError}
        onRetry={() => void c.refetch()}
      />
      <SpecialtyPicker
        initiallyOpen={expandedSpecialties}
        segments={base.data?.segmentos || []}
        value={f.segmento}
        onChange={(segmento) => setF({ ...f, segmento })}
        loading={base.isPending}
        error={base.isError}
        onRetry={() => void base.refetch()}
      />
      <button className="directory-button" type="submit">
        {t.search}
      </button>
    </form>
  );
}
export function DirectoryHome() {
  const r = useDirectoryRuntime(),
    c = useQuery({
      queryKey: catalogKey(r),
      queryFn: () => directoryCatalog(r),
    });
  return (
    <section className="container directory-home">
      <span className="eyebrow">{t.homeKicker}</span>
      <h2>{t.homeTitle}</h2>
      <p>{t.homeIntro}</p>
      <SearchForm />
      <div className="directory-popular">
        <span>Mais procurados</span>
        {[
          'manutencao-predial',
          'elevadores',
          'seguranca-e-portaria',
          'limpeza-e-conservacao',
          'administracao-condominial',
        ]
          .map((slug) => c.data?.segmentos.find((s) => s.slug === slug))
          .filter(Boolean)
          .map((s) => (
            <Link key={s!.id} to={directoryPath({ segmento: s!.slug })}>
              {s!.nome}
            </Link>
          ))}
      </div>
      <Link to="/guia">{t.all}</Link>
    </section>
  );
}
function Card({ s }: { s: PublicSupplier }) {
  return (
    <article className="directory-card">
      {safeHttps(s.capa_url) && <img src={s.capa_url} alt="" loading="lazy" />}
      <div>
        <span className="eyebrow">{s.segmentos[0]?.nome}</span>
        <h2>
          <Link to={'/fornecedor/' + s.slug}>{s.nome_fantasia}</Link>
        </h2>
        {s.patrocinado && <p className="directory-verified">Patrocinado</p>}
        {s.avaliacoes > 0 && s.nota !== null && (
          <p>
            {s.nota} / 5 · {s.avaliacoes} avaliações
          </p>
        )}
        <p>{s.descricao_curta}</p>
        <p className="directory-location">
          {s.cidade?.nome} · {s.cidade?.uf}
        </p>
        <Link className="directory-link" to={'/fornecedor/' + s.slug}>
          {t.viewProfile}
        </Link>
      </div>
    </article>
  );
}
export default function Directory({ brief }: { brief?: GuideBrief } = {}) {
  const r = useDirectoryRuntime(),
    loc = useLocation(),
    navigate = useNavigate(),
    f = filtersFromRoute(loc.pathname, loc.search);
  const c = useQuery({
      queryKey: catalogKey(r, f.uf),
      queryFn: () => directoryCatalog(r, f.uf),
    }),
    q = useQuery({
      queryKey: searchKey(r, f),
      queryFn: () => searchDirectory(r, f),
    });
  const municipal = localLocation(f);
  const eligibility = useQuery({
    queryKey: eligibilityKey(r, f),
    queryFn: () => localEligibility(r, f),
    enabled: !!municipal,
    staleTime: 10000,
    gcTime: 0,
    refetchInterval: 15000,
    refetchOnWindowFocus: 'always',
  });
  const gate = eligibility.data;
  const [gateTime, setGateTime] = useState(Date.now);
  useEffect(() => {
    if (!gate) return;
    const expire = () => setGateTime(Date.now());
    const timer = window.setTimeout(
      expire,
      Math.max(0, gate.recheckAt - Date.now() + 1),
    );
    window.addEventListener('focus', expire);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', expire);
    };
  }, [gate]);
  const localLinks = useQuery({
    queryKey: localGuidesKey(r, f.segmento),
    queryFn: () => approvedLocalGuides(r, f.segmento),
    enabled: !!f.segmento && !f.segmento.includes(',') && !f.uf && !f.q,
    staleTime: 10000,
    gcTime: 0,
    refetchInterval: 15000,
  });
  useEffect(() => {
    const deadlines =
      localLinks.data?.map((x) => x.expiresAt).filter((x) => x > Date.now()) ||
      [];
    if (!deadlines.length) return;
    const timer = window.setTimeout(
      () => setGateTime(Date.now()),
      Math.max(0, Math.min(...deadlines) - Date.now() + 1),
    );
    return () => window.clearTimeout(timer);
  }, [localLinks.data]);
  const usableContent =
    gate && gate.recheckAt > Math.max(gateTime, Date.now())
      ? gate.content
      : null;
  useEffect(() => {
    const target = publicRedirect(q.data?.redirect);
    if (target) navigate(target, { replace: true });
  }, [q.data?.redirect, navigate]);
  const chosen = f.segmento.split(',').filter(Boolean);
  const labels = chosen
    .map((slug) => c.data?.segmentos.find((s) => s.slug === slug)?.nome)
    .filter(Boolean);
  const name =
    labels.length > 1
      ? labels.slice(0, 2).join(' + ') +
        (labels.length > 2 ? ` e mais ${labels.length - 2}` : '')
      : labels[0];
  const { title, description } = usableContent || directoryMetadata(f, c.data);
  return (
    <section className="container directory-page">
      <ViewEvent
        key={loc.pathname + loc.search}
        runtime={r}
        type="busca"
        target={null}
        region={f.uf}
        segment={
          c.data?.segmentos.find((s) => s.slug === f.segmento)?.id || null
        }
      />
      <AdSlot
        position={f.segmento ? 'segmento_topo' : 'guia_topo'}
        segment={f.segmento}
        region={f.uf}
      />
      <DirectorySeo
        title={title}
        description={description}
        status={q.isError || c.isError ? 503 : q.data?.not_found ? 404 : 200}
        pending={q.isPending || c.isPending}
        pageItems={q.data?.items.length}
        localEligibility={eligibility.isError ? undefined : gate}
        noindex={!!municipal && !!gate && gate.recheckAt <= gateTime}
      />
      <nav aria-label="Caminho da página">
        <Link to="/">Início</Link> /{' '}
        <Link to="/guia">Guia de fornecedores</Link>
        {name && ' / ' + name}
      </nav>
      <div className="directory-heading">
        <span className="eyebrow">{t.kicker}</span>
        <h1>{title}</h1>
        <p>{t.intro}</p>
      </div>
      <DemoNotice />
      {nationalPilotBlocked(loc.pathname) && (
        <aside className="directory-empty" aria-label="Guia em preparação">
          <h2>Guia em preparação</h2>
          <p>
            As orientações desta especialidade estão em revisão. A seleção
            exibida não comprova atendimento em todas as cidades; confira o
            escopo e a cobertura diretamente com cada empresa.
          </p>
        </aside>
      )}
      {municipal &&
        !freshEligibility(eligibility.isError ? undefined : gate) && (
          <aside
            className="directory-empty"
            aria-label="Cobertura municipal em validação"
          >
            <h2>Cobertura municipal em validação</h2>
            <p>
              Esta seleção ainda não reúne todas as comprovações necessárias
              para um guia local. Os resultados da busca podem incluir empresas
              com cobertura estadual declarada; confirme diretamente o
              atendimento no município.
            </p>
            <Link
              to={gate?.fallback || '/guia/' + encodeURIComponent(f.segmento)}
            >
              Consultar o guia nacional desta especialidade
            </Link>
          </aside>
        )}
      {municipal && usableContent && (
        <section aria-label="Orientações locais revisadas">
          <p>{usableContent.intro}</p>
          <p>{usableContent.context}</p>
          <ul>
            {usableContent.checklist.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      )}
      {!localLinks.isError &&
        !!localLinks.data?.some((x) => x.expiresAt > Date.now()) && (
          <nav aria-label="Guias locais com cobertura validada">
            {localLinks.data
              .filter((x) => x.expiresAt > Date.now())
              .map((x) => (
                <Link key={x.path} to={x.path}>
                  {x.label}
                </Link>
              ))}
          </nav>
        )}
      <SearchForm initial={f} expandedSpecialties />
      {!municipal && chosen.length === 1 && brief && (
        <GuideDecision brief={brief} />
      )}
      {q.isPending ? (
        <p role="status">{t.loading}</p>
      ) : q.isError ? (
        <div role="alert">
          <p>{t.error}</p>
          <button onClick={() => q.refetch()}>{t.retry}</button>
        </div>
      ) : (
        <>
          <div className="directory-results" id="guide-results">
            <p>
              Empresas com destaque comercial podem aparecer antes das demais na
              ordem de relevância. O destaque pago não representa avaliação
              editorial, nota de qualidade ou garantia de atendimento.
            </p>
            <p aria-live="polite">
              {q.data.total} {t.resultLabel.toLowerCase()}
            </p>
            <label>
              {t.order}{' '}
              <select
                value={f.ordem}
                onChange={(e) =>
                  navigate(
                    directoryPath({
                      ...f,
                      pagina: 1,
                      ordem: e.target.value as Filters['ordem'],
                    }),
                  )
                }
              >
                <option value="relevancia">{t.relevance}</option>
                <option value="nome">{t.alphabetical}</option>
              </select>
            </label>
            <Link to="/guia">{t.clear}</Link>
          </div>
          {q.data.items.length ? (
            <div className="directory-grid">
              {q.data.items.map((s) => (
                <Card key={s.id} s={s} />
              ))}
            </div>
          ) : (
            <div className="directory-empty">
              <h2>{q.data.not_found ? t.notFound : t.noResults}</h2>
              <p>{t.noResultsBody}</p>
              <Link to="/guia">{t.clear}</Link>
            </div>
          )}
          {q.data.paginas > 1 && (
            <nav className="directory-pagination" aria-label="Paginação">
              {f.pagina > 1 && (
                <Link to={directoryPath({ ...f, pagina: f.pagina - 1 })}>
                  {t.previous}
                </Link>
              )}
              <span>
                {t.page} {f.pagina} / {q.data.paginas}
              </span>
              {f.pagina < q.data.paginas && (
                <Link to={directoryPath({ ...f, pagina: f.pagina + 1 })}>
                  {t.next}
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
export function SupplierProfile() {
  const { slug = '' } = useParams(),
    r = useDirectoryRuntime(),
    navigate = useNavigate();
  const q = useQuery({
    queryKey: profileKey(r, slug),
    queryFn: () => publicProfile(r, slug),
  });
  useEffect(() => {
    if (q.data?.redirect)
      navigate('/fornecedor/' + q.data.redirect, { replace: true });
  }, [q.data?.redirect, navigate]);
  if (q.isPending)
    return (
      <p className="container page" role="status">
        {t.loading}
      </p>
    );
  if (q.isError)
    return (
      <section className="container page">
        <DirectorySeo status={503} />
        <p role="alert">{t.error}</p>
        <button onClick={() => q.refetch()}>{t.retry}</button>
      </section>
    );
  const s = q.data.fornecedor;
  if (!s)
    return (
      <section className="container page">
        <DirectorySeo
          title={t.notFound}
          description={t.notFoundBody}
          status={404}
        />
        <h1>{t.notFound}</h1>
        <p>{t.notFoundBody}</p>
        <Link to="/guia">{t.back}</Link>
      </section>
    );
  const contacts = [
    s.whatsapp && {
      label: t.whatsapp,
      url: 'https://wa.me/' + s.whatsapp.replace(/\D/g, ''),
    },
    s.telefone && {
      label: t.phone,
      url: 'tel:+' + s.telefone.replace(/\D/g, ''),
    },
    safeHttps(s.site) && { label: t.website, url: s.site },
    safeHttps(s.instagram) && { label: t.instagram, url: s.instagram },
  ].filter(Boolean) as { label: string; url: string }[];
  const video = videoId(s.video_url);
  return (
    <article className="container directory-page">
      <ViewEvent runtime={r} type="visualizacao_perfil" target={s.id} />
      <DirectorySeo
        title={s.nome_fantasia + ' — ' + (s.segmentos[0]?.nome || 'Fornecedor')}
        description={s.descricao_curta}
      />
      <Link to="/guia">{t.back}</Link>
      <DemoNotice />
      {safeHttps(s.capa_url) && (
        <img className="directory-cover" src={s.capa_url} alt="" />
      )}
      <header className="directory-profile-heading">
        <span className="eyebrow">
          {s.segmentos.map((x) => x.nome).join(' · ')}
        </span>
        {safeHttps(s.logo_thumb_url || s.logo_url) && (
          <img
            className="directory-logo"
            src={s.logo_thumb_url || s.logo_url}
            alt={'Logo de ' + s.nome_fantasia}
          />
        )}
        <h1>{s.nome_fantasia}</h1>
        {s.avaliacoes > 0 && s.nota !== null && (
          <p>
            {s.nota} / 5 · {s.avaliacoes} avaliações publicadas
          </p>
        )}
        {s.verificado && (
          <p className="directory-verified">
            Empresa com verificação documental
          </p>
        )}
        <p>{s.descricao_curta}</p>
      </header>
      <div className="directory-profile-layout">
        <div>
          {s.sobre && (
            <section>
              <h2>{t.about}</h2>
              <p className="directory-prose">{s.sobre}</p>
              {s.ano_fundacao && <p>Desde {s.ano_fundacao}</p>}
            </section>
          )}
          {s.servicos.length > 0 && (
            <section>
              <h2>{t.services}</h2>
              <div className="directory-services">
                {s.servicos.map((x) => (
                  <article key={x.id}>
                    {safeHttps(x.foto_url) && (
                      <img src={x.foto_url} alt="" loading="lazy" />
                    )}
                    <h3>{x.titulo}</h3>
                    <p>{x.descricao}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
          <section>
            <h2>{t.coverage}</h2>
            <ul>
              {s.cobertura.map((x, i) => (
                <li key={i}>
                  {x.cidade_nome || t.allState} · {x.uf}
                </li>
              ))}
            </ul>
          </section>
          {s.midias.length > 0 && (
            <section>
              <h2>{t.gallery}</h2>
              <div className="directory-services">
                {s.midias
                  .filter((x) => safeHttps(x.url))
                  .map((x) => (
                    <figure key={x.id}>
                      <img src={x.url} alt={x.legenda || ''} loading="lazy" />
                      <figcaption>{x.legenda}</figcaption>
                    </figure>
                  ))}
              </div>
            </section>
          )}
          {s.cases.length > 0 && (
            <section>
              <h2>{t.cases}</h2>
              {s.cases.map((x) => (
                <article key={x.id}>
                  <h3>{x.condominio}</h3>
                  <p>{x.descricao}</p>
                </article>
              ))}
            </section>
          )}
          {s.certificacoes.length > 0 && (
            <section>
              <h2>Certificações informadas pela empresa</h2>
              <ul>
                {s.certificacoes.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </section>
          )}
          {video && (
            <iframe
              title={'Vídeo de ' + s.nome_fantasia}
              loading="lazy"
              src={'https://www.youtube-nocookie.com/embed/' + video}
              allowFullScreen
            />
          )}
          {s.faqs.length > 0 && (
            <section>
              <h2>{t.faq}</h2>
              {s.faqs.map((x) => (
                <details key={x.id}>
                  <summary>{x.pergunta}</summary>
                  <p>{x.resposta}</p>
                </details>
              ))}
            </section>
          )}
        </div>
        <aside className="directory-contact">
          <h2>{t.contacts}</h2>
          {r.source === 'demo' ? (
            <p>{t.demoContact}</p>
          ) : contacts.length ? (
            contacts.map((x) => (
              <a
                className="directory-button"
                key={x.label}
                href={x.url}
                target={x.url.startsWith('https:') ? '_blank' : undefined}
                rel="noopener noreferrer"
                onClick={() =>
                  void track(
                    r,
                    x.url.includes('wa.me')
                      ? 'clique_whatsapp'
                      : x.url.startsWith('tel:')
                        ? 'clique_telefone'
                        : x.url.includes('instagram.com')
                          ? 'clique_instagram'
                          : 'clique_site',
                    s.id,
                  )
                }
              >
                {x.label}
              </a>
            ))
          ) : (
            <p>A empresa ainda não informou contatos públicos.</p>
          )}
          <a
            className="directory-button"
            href="#pedir-orcamento"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById('pedir-orcamento')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Pedir orçamento
          </a>
          {s.endereco && (
            <p>
              {s.endereco}
              <br />
              {s.cidade?.nome} · {s.cidade?.uf}
            </p>
          )}
        </aside>
      </div>
      <InstagramPosts
        supplierId={s.id}
        urls={s.instagram_posts}
        cover={s.capa_url}
        handle={s.instagram
          .replace(/^https:\/\/(www\.)?instagram.com\//, '')
          .replace(/\/$/, '')}
      />
      <PublicReviews sid={s.id} />
      <SupplierArticles slug={s.slug} />
      <QuotationForm supplier={s} />
      <Similar supplier={s} />
      {
        <nav className="directory-mobile-contact" aria-label="Contatar empresa">
          <a
            href="#pedir-orcamento"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById('pedir-orcamento')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Pedir orçamento
          </a>
          {contacts.slice(0, 2).map((x) => (
            <a key={x.label} href={x.url} rel="noopener noreferrer">
              {x.label}
            </a>
          ))}
        </nav>
      }
    </article>
  );
}

function Similar({ supplier }: { supplier: PublicSupplier }) {
  const r = useDirectoryRuntime();
  const f = { ...empty, segmento: supplier.segmentos[0]?.slug || '' };
  const q = useQuery({
    queryKey: searchKey(r, f),
    queryFn: () => searchDirectory(r, f),
    enabled: !!f.segmento,
  });
  const items =
    q.data?.items.filter((x) => x.id !== supplier.id).slice(0, 3) || [];
  return items.length ? (
    <section className="directory-home">
      <h2>{t.similar}</h2>
      <div className="directory-grid">
        {items.map((s) => (
          <Card key={s.id} s={s} />
        ))}
      </div>
    </section>
  ) : null;
}
