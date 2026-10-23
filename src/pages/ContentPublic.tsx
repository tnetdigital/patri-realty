import { SupplierDestination } from '../features/directory/SupplierDestination';
import { usePageMetadata } from '../seo/metadata';
import { contentMetadata, publicRedirect } from '../seo/policy';
import { ArticleEngagement, track } from '../features/growth/events';
import { ViewEvent } from '../features/growth/events';
import { AdSlot } from '../features/commercial/AdSlot';
import { ContentCards } from '../features/content/PublicCards';
import { useEffect } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDirectoryRuntime } from '../features/directory/api';
import { contentKey, contentPublic } from '../features/content/api';
import { ArticleBody } from '../features/content/Blocks';
import { NewsletterForm } from '../features/content/Newsletter';
import type { Article, Magazine } from '../features/content/model';
import '../features/content/content.css';
export default function ContentPublic({ demo = false }: { demo?: boolean }) {
  const runtime = useDirectoryRuntime(),
    r = demo ? { ...runtime, source: 'demo' as const } : runtime,
    { slug, category } = useParams(),
    loc = useLocation(),
    nav = useNavigate(),
    [params] = useSearchParams(),
    base = demo ? '/demonstracao-editorial' : '',
    path = loc.pathname.slice(base.length),
    magazine = path.startsWith('/revista'),
    detail = !!slug,
    kind = detail
      ? magazine
        ? 'revista'
        : 'materia'
      : magazine
        ? 'catalogo'
        : 'lista',
    page = Math.max(1, Math.min(10000, Number(params.get('pagina')) || 1));
  const q = useQuery({
      queryKey: contentKey(r, kind, slug || '', category || '', page),
      queryFn: () => contentPublic(r, kind, slug || '', category || '', page),
      refetchInterval: detail ? 15000 : false,
      refetchOnWindowFocus: 'always',
    }),
    catalog = useQuery({
      queryKey: contentKey(r, 'catalogo'),
      queryFn: () => contentPublic(r, 'catalogo'),
    });
  const article =
      !magazine && detail ? (q.data?.item as Article | null) : undefined,
    issue = magazine && detail ? (q.data?.item as Magazine | null) : undefined;
  useEffect(() => {
    const target = publicRedirect(q.data?.redirect);
    if (target) nav(base + target, { replace: true });
  }, [q.data?.redirect, base, nav]);
  const meta = contentMetadata({
    path,
    category,
    title: article?.seo_titulo || article?.titulo || issue?.titulo,
    description: article?.seo_descricao || article?.resumo,
    edition: issue?.edicao,
  });
  usePageMetadata({
    ...meta,
    socialImage: article?.social_image,
    socialImageAlt: article?.social_image_alt,
    source: r.source,
    status: q.isError
      ? 503
      : q.data?.not_found || (detail && !q.isPending && !q.data?.item)
        ? 404
        : 200,
    pending: q.isPending,
    pageItems: !detail && !magazine ? q.data?.items?.length : undefined,
  });
  return (
    <section className="content-page container">
      <nav className="content-nav" aria-label="Conteúdo">
        <Link to={base + (demo ? '' : '/materias')}>Matérias</Link>
        <Link to={base + '/revista'}>Revista</Link>
        {demo && (
          <>
            <Link to="/demonstracao-conteudo">Redação de demonstração</Link>
            <Link to="/demonstracao-materias">
              Painel de matérias do fornecedor
            </Link>
          </>
        )}
      </nav>
      {r.source === 'demo' && (
        <aside className="content-notice">
          <strong>Portal editorial de demonstração</strong>
          <p>
            Textos, empresas e publicações fictícios para análise do projeto.
            Nenhuma notícia real ou entrega externa é representada.
          </p>
        </aside>
      )}
      {q.isPending ? (
        <p role="status">Carregando conteúdo…</p>
      ) : q.isError ? (
        <div role="alert">
          <p>Não foi possível carregar as publicações.</p>
          <button onClick={() => q.refetch()}>Tentar novamente</button>
        </div>
      ) : detail ? (
        article ? (
          <article className="content-detail">
            <Link to={base + '/materias/' + article.categoria_slug}>
              {article.categoria}
            </Link>
            {(article.selo || article.tipo !== 'editorial') && (
              <p>
                <span className="content-tag">
                  {article.selo || 'Conteúdo de marca'}
                </span>
              </p>
            )}
            <h1>{article.titulo}</h1>
            <p className="content-lead">{article.resumo}</p>
            <div className="content-author">
              <span>{article.autor || 'Redação Patri Realty'}</span>
              <time>
                {article.publicada_em &&
                  new Date(article.publicada_em).toLocaleDateString('pt-BR')}
              </time>
              <span>{article.tempo_leitura || 1} min de leitura</span>
            </div>
            {article.imagem_capa && (
              <img
                width={1280}
                height={720}
                decoding="async"
                className="article-cover"
                src={article.imagem_capa}
                alt={
                  article.media_credits?.find(
                    (m) => m.url === article.imagem_capa,
                  )?.alt || article.titulo
                }
              />
            )}
            {article.media_credits
              ?.filter((m) => m.url === article.imagem_capa)
              .map((m) => (
                <p key={m.url}>{m.credit}</p>
              ))}
            <ViewEvent
              runtime={r}
              type="visualizacao_materia"
              target={article.id}
            />
            <ArticleEngagement runtime={r} target={article.id} />
            <ArticleBody
              sources={article.public_sources}
              media={article.media_credits}
              blocks={article.corpo.slice(
                0,
                Math.ceil(article.corpo.length / 2),
              )}
            />
            <AdSlot position="materia_meio" />
            <ArticleBody
              sources={article.public_sources}
              media={article.media_credits}
              offset={Math.ceil(article.corpo.length / 2)}
              blocks={article.corpo.slice(Math.ceil(article.corpo.length / 2))}
            />
            {!!article.public_sources?.length && (
              <section aria-label="Afirmações e fontes">
                <h2>Fontes e limites da apuração</h2>
                <ol>
                  {article.public_sources.map((s, i) => (
                    <li key={i}>
                      <a href={'#article-block-' + s.block}>
                        Trecho {s.block + 1}
                      </a>
                      : {s.claim} —{' '}
                      <a href={s.url} rel="noopener noreferrer" target="_blank">
                        Fonte
                      </a>
                      . {s.limit} Conferido em {s.checkedAt.slice(0, 10)}.
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {!!article.media_credits?.length && (
              <section aria-label="Créditos de mídia">
                <h2>Créditos e uso de mídia</h2>
                {article.media_credits.map((m) => (
                  <p key={m.url}>{m.credit}</p>
                ))}
              </section>
            )}
            {article.fornecedor && (
              <aside className="content-notice">
                <strong>{article.fornecedor.nome}</strong>
                <p>{article.fornecedor.descricao}</p>
                <SupplierDestination
                  slug={article.fornecedor.slug}
                  onClick={() =>
                    void track(r, 'clique_perfil_materia', article.id)
                  }
                />
              </aside>
            )}
          </article>
        ) : issue ? (
          <article className="content-detail">
            <span className="eyebrow">EDIÇÃO {issue.edicao}</span>
            <h1>{issue.titulo}</h1>
            {issue.capa_url && (
              <img
                width={1280}
                height={720}
                decoding="async"
                className="article-cover"
                src={issue.capa_url}
                alt={'Capa de ' + issue.titulo}
              />
            )}
            <p>
              {issue.publicada_em &&
                new Date(issue.publicada_em).toLocaleDateString('pt-BR')}
            </p>
            <a
              className="content-button"
              href={issue.link_digital}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ler edição digital
            </a>
          </article>
        ) : (
          <>
            <h1>Publicação não encontrada</h1>
            <p>Ela pode estar em preparação ou fora do ar.</p>
            <Link to={base + (demo ? '' : '/materias')}>
              Explorar matérias publicadas
            </Link>
          </>
        )
      ) : magazine ? (
        <>
          <span className="eyebrow">A REVISTA DO MERCADO CONDOMINIAL</span>
          <h1>Perspectivas para novas conexões.</h1>
          {catalog.data?.revistas?.filter(
            (x) =>
              x.status === 'publicada' &&
              !!x.publicada_em &&
              Date.parse(x.publicada_em) <= Date.now(),
          ).length ? (
            <div className="content-grid">
              {catalog.data.revistas
                .filter(
                  (x) =>
                    x.status === 'publicada' &&
                    !!x.publicada_em &&
                    Date.parse(x.publicada_em) <= Date.now(),
                )
                .map((m) => (
                  <article className="content-card" key={m.id}>
                    {m.capa_url && (
                      <img
                        width={1280}
                        height={720}
                        decoding="async"
                        src={m.capa_url}
                        alt={'Capa da edição ' + m.edicao}
                        loading="lazy"
                      />
                    )}
                    <h2>
                      <Link to={base + '/revista/' + m.slug}>{m.titulo}</Link>
                    </h2>
                    <p>Edição {m.edicao}</p>
                    <Link to={base + '/revista/' + m.slug}>
                      Conhecer a edição
                    </Link>
                  </article>
                ))}
            </div>
          ) : (
            <p>
              As edições estarão disponíveis após a publicação pela redação.
            </p>
          )}
        </>
      ) : (
        <>
          <div className="content-public-head">
            <span className="eyebrow">LEITURAS QUE APROXIMAM</span>
            <h1>Conhecimento para cuidar melhor.</h1>
            <p>
              Gestão, manutenção e perspectivas para quem vive o mercado
              condominial.
            </p>
          </div>
          <nav className="content-nav" aria-label="Categorias de matérias">
            <Link to={base + (demo ? '' : '/materias')}>Todas</Link>
            {catalog.data?.categorias?.map((c) => (
              <Link key={c.id} to={base + '/materias/' + c.slug}>
                {c.nome}
              </Link>
            ))}
          </nav>
          {q.data?.not_found ? (
            <p>Categoria não encontrada.</p>
          ) : q.data?.items?.length ? (
            <ContentCards items={q.data.items} base={base} />
          ) : (
            <p>Ainda não há matérias publicadas nesta seleção.</p>
          )}
          {(q.data?.total || 0) > 12 && (
            <nav className="content-actions" aria-label="Páginas de matérias">
              {page > 1 && (
                <Link
                  to={{
                    pathname: loc.pathname,
                    search: '?pagina=' + (page - 1),
                  }}
                >
                  Anterior
                </Link>
              )}
              <span>
                Página {page} de {Math.ceil(q.data!.total! / 12)}
              </span>
              {page * 12 < (q.data?.total || 0) && (
                <Link
                  to={{
                    pathname: loc.pathname,
                    search: '?pagina=' + (page + 1),
                  }}
                >
                  Próxima
                </Link>
              )}
            </nav>
          )}
        </>
      )}
      <div className="content-related">
        <NewsletterForm demo={r.source === 'demo'} />
      </div>
    </section>
  );
}
