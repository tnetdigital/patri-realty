import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  loadEditorialReview,
  type EditorialArticle,
} from '../features/content/editorial-review';
import './editorial-preview.css';

type Article = EditorialArticle;
const root = '/previa-editorial';

function Photo({
  article,
  cover = false,
}: {
  article: Article;
  cover?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const photo = article.image;
  return (
    <figure className={cover ? 'ed-cover' : 'ed-photo'}>
      {failed ? (
        <p className="ed-image-fallback">
          Fotografia indisponível no momento.{' '}
          <a href={photo.source} target="_blank" rel="noopener noreferrer">
            Consultar o arquivo original
          </a>
        </p>
      ) : (
        <img
          src={photo.url}
          alt={photo.alt}
          loading={cover ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      <figcaption>
        {cover && <span>{photo.caption} </span>}
        Foto: {photo.photographer} /{' '}
        <a href={photo.source} target="_blank" rel="noopener noreferrer">
          Wikimedia Commons
        </a>{' '}
        ·{' '}
        <a
          href={photo.licenseUrl || photo.source}
          target="_blank"
          rel="noopener noreferrer"
        >
          {photo.license}
        </a>
        {cover && (
          <span>
            {' '}
            · Registro: {photo.originalDate}. {photo.changes}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

function SourcedText({ text, article }: { text: string; article: Article }) {
  return (
    <>
      {text.split(/(\[\d+\])/g).map((part, index) => {
        const match = /^\[(\d+)\]$/.exec(part);
        const source = match ? article.sources[Number(match[1]) - 1] : null;
        return source ? (
          <a
            key={index}
            className="ed-citation"
            href={source.url}
            title={source.label}
            target="_blank"
            rel="noopener noreferrer"
          >
            {part}
          </a>
        ) : (
          part
        );
      })}
    </>
  );
}

function downloadKit(articles: Article[]) {
  const blob = new Blob(
    [
      JSON.stringify(
        { status: 'rascunho', verifiedAt: '2026-10-22', articles },
        null,
        2,
      ),
    ],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'patri-realty-12-artigos-2026-10-22.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function EditorialPreview() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    loadEditorialReview(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setArticles(data);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setLoadError('A revisão exige acesso à prévia protegida.');
      });
    return () => controller.abort();
  }, []);
  const categories = [...new Set(articles.map((item) => item.category))];
  const { slug } = useParams();
  const [category, setCategory] = useState('Todos');
  const [query, setQuery] = useState('');
  const article = articles.find((item) => item.slug === slug);
  useEffect(() => {
    document.title = `${article?.title || 'Curadoria editorial para revisão'} | Patri Realty`;
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex,nofollow');
  }, [article]);
  const normalized = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const filtered = articles.filter(
    (item) =>
      (category === 'Todos' || item.category === category) &&
      `${item.title} ${item.description}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes(normalized),
  );
  if (loadError)
    return (
      <section className="container page" role="alert">
        <h1>Revisão restrita</h1>
        <p>{loadError}</p>
      </section>
    );
  if (!loaded)
    return (
      <p className="container page" role="status">
        Carregando revisão protegida…
      </p>
    );
  return (
    <div className="ed-shell">
      <div className="ed-status">
        <span>Prévia editorial</span> Rascunhos para revisão · Apuração em
        22/10/2026
      </div>
      {slug && !article ? (
        <section className="ed-empty">
          <h1>Artigo não encontrado</h1>
          <p>Este endereço não corresponde a um texto desta edição.</p>
          <Link to={root}>Voltar aos 12 artigos</Link>
        </section>
      ) : article ? (
        <article className="ed-article">
          <Link className="ed-back" to={root}>
            Todos os artigos
          </Link>
          <header className="ed-article-head">
            <p className="ed-kicker">{article.category}</p>
            <h1>{article.title}</h1>
            <p className="ed-deck">{article.description}</p>
            <p className="ed-byline">
              {article.author} · Pesquisa documental · Leitura de{' '}
              {Math.ceil(
                JSON.stringify(article.sections).split(/\s+/).length / 180,
              )}{' '}
              min
            </p>
          </header>
          <Photo key={article.slug} article={article} cover />
          <div className="ed-reading">
            <aside className="ed-answer">
              <h2>Em poucas palavras</h2>
              <p>{article.answer}</p>
            </aside>
            <nav className="ed-toc" aria-label="Nesta matéria">
              <strong>Nesta matéria</strong>
              {article.sections.map((section, i) => (
                <a
                  key={section.heading}
                  href={`#sec-${i}`}
                  onClick={(event) => {
                    event.preventDefault();
                    document
                      .getElementById(`sec-${i}`)
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {section.heading}
                </a>
              ))}
            </nav>
            {article.sections.map((section, i) => (
              <section
                key={section.heading}
                id={`sec-${i}`}
                className="ed-section"
              >
                <h2>{section.heading}</h2>
                {section.paragraphs.map((text) => (
                  <p key={text}>
                    <SourcedText text={text} article={article} />
                  </p>
                ))}
              </section>
            ))}
            <section className="ed-section">
              <h2>Perguntas frequentes</h2>
              {article.faq.map((faq) => (
                <details className="ed-faq" key={faq.question}>
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </section>
            <section className="ed-section">
              <h2>Verbetes para entender o tema</h2>
              <dl className="ed-glossary">
                {article.glossary.map((term) => (
                  <div key={term.term}>
                    <dt>{term.term}</dt>
                    <dd>{term.definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="ed-section ed-sources">
              <h2>Fontes e conferência</h2>
              <p>
                Consultadas em 22 de outubro de 2026. Informações operacionais
                podem mudar; consulte os responsáveis antes de contratar.
              </p>
              <ol>
                {article.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {source.label}
                    </a>
                  </li>
                ))}
              </ol>
            </section>
            <section className="ed-section">
              <h2>Continue a leitura</h2>
              <ul className="ed-related">
                {article.related.map((related) => {
                  const item = articles.find((a) => a.slug === related);
                  return item ? (
                    <li key={related}>
                      <Link to={`${root}/${related}`}>{item.title}</Link>
                    </li>
                  ) : null;
                })}
              </ul>
              {!['Hotéis', 'Restaurantes', 'Viagens e gastronomia'].includes(
                article.category,
              ) && (
                <p>
                  <Link to="/guia">
                    Consultar especialidades no guia de fornecedores
                  </Link>
                </p>
              )}
            </section>
            <details className="ed-kit">
              <summary>Kit de publicação e redes sociais</summary>
              <dl>
                <dt>Título SEO</dt>
                <dd>{article.seoTitle}</dd>
                <dt>Meta description</dt>
                <dd>{article.description}</dd>
                <dt>Slug</dt>
                <dd>{article.slug}</dd>
                <dt>Busca principal</dt>
                <dd>{article.keywords.join(' · ')}</dd>
                <dt>Intenção</dt>
                <dd>{article.intent}</dd>
                <dt>Entidades e localização</dt>
                <dd>
                  {article.geoEntities
                    .map((entity) => `${entity.name}, ${entity.country}`)
                    .join(' · ')}
                </dd>
                <dt>Legenda para redes sociais</dt>
                <dd>{article.socialCaption}</dd>
              </dl>
              <p>
                FAQ visível, respostas diretas e fontes identificadas ajudam a
                leitura. Não há garantia de posição nas buscas ou de citação por
                IA.
              </p>
            </details>
          </div>
          <div className="ed-bottom">
            <Link to={root}>Voltar à seleção completa</Link>
          </div>
        </article>
      ) : (
        <>
          <header className="ed-intro">
            <p className="ed-kicker">Patri Realty · Edição de lançamento</p>
            <h1>
              Morar bem.
              <br />
              <em>Viver melhor.</em>
            </h1>
            <p>
              Arquitetura, gestão, sustentabilidade e destinos que ampliam a
              conversa sobre alto padrão.
            </p>
            <div className="ed-intro-meta">
              <span>12 artigos completos</span>
              <span>Fotos reais com créditos e licenças</span>
              <span>Fontes, FAQ e verbetes</span>
            </div>
          </header>
          <section className="ed-note">
            <h2>Uma curadoria para revisar antes de publicar</h2>
            <p>
              Imóveis e condomínios com foco no Brasil; hotelaria e gastronomia
              em recorte internacional. Os seis endereços Michelin são escolhas
              editoriais na distinção máxima de cada categoria, sem ordem de
              ranking. As fotografias de arquivo e de contexto estão
              identificadas nas matérias.
            </p>
            <button type="button" onClick={() => downloadKit(articles)}>
              Baixar os 12 textos e metadados
            </button>
          </section>
          <div className="ed-controls">
            <label htmlFor="ed-query">
              Buscar nesta edição
              <input
                id="ed-query"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tema, destino ou empreendimento"
              />
            </label>
            <label htmlFor="ed-category">
              Tema
              <select
                id="ed-category"
                aria-label="Tema"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option>Todos</option>
                {categories.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="ed-count" role="status">
            {filtered.length}{' '}
            {filtered.length === 1
              ? 'artigo encontrado'
              : 'artigos encontrados'}
          </p>
          <div className="ed-grid">
            {filtered.map((item, i) => (
              <article className="ed-card" key={item.slug}>
                <Photo article={item} />
                <div className="ed-card-body">
                  <p className="ed-kicker">{item.category}</p>
                  <h2>
                    <Link to={`${root}/${item.slug}`}>{item.title}</Link>
                  </h2>
                  <p>{item.description}</p>
                  <Link
                    className="ed-read"
                    to={`${root}/${item.slug}`}
                    aria-label={`Ler artigo: ${item.title}`}
                  >
                    Ler artigo{' '}
                    <span aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {!filtered.length && (
            <div className="ed-empty">
              <h2>Nenhum artigo encontrado</h2>
              <button
                type="button"
                onClick={() => {
                  setCategory('Todos');
                  setQuery('');
                }}
              >
                Limpar filtros
              </button>
            </div>
          )}
          <section className="ed-method">
            <h2>Critério editorial</h2>
            <p>
              Pesquisa documental, fontes primárias e recomendações
              identificadas. Os textos não simulam visitas, hospedagens ou
              refeições da redação. A data de apuração não equivale a publicação
              em produção. As imagens são fotografias reais, sem geração por IA,
              acompanhadas de autoria, origem e licença.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
