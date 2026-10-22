import { supplierCopy as copy } from "./texts";
import {
  Building2,
  MapPin,
  CheckCircle,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { supplierTexts as t } from "./texts";
import { youtubeId, type SupplierDraft, type Catalog } from "./model";
export function SupplierPreview({
  draft: d,
  catalog,
  onBack,
}: {
  draft: SupplierDraft;
  catalog: Catalog;
  onBack: () => void;
}) {
  const vid = youtubeId(d.video_url);
  return (
    <div className="supplier-preview">
      <div className="preview-toolbar">
        <button onClick={onBack}>
          <ArrowLeft size={16} />
          {t.edit}
        </button>
        <span>{t.privatePreview}</span>
      </div>
      <div className="preview-cover">
        {d.capa_url ? (
          <img src={d.capa_url} alt={`Capa de ${d.nome_fantasia}`} />
        ) : (
          <Building2 size={100} strokeWidth={0.5} />
        )}
      </div>
      <div className="preview-body">
        <div className="preview-brand">
          {d.logo_url ? (
            <img
              className="preview-logo"
              src={d.logo_url}
              alt={`Logo de ${d.nome_fantasia}`}
            />
          ) : (
            <div className="preview-logo logo-placeholder">
              <Building2 size={40} />
            </div>
          )}
          <div>
            <span className="eyebrow">
              {d.segmentos
                .map((id) => catalog.segments.find((s) => s.id === id)?.nome)
                .filter(Boolean)
                .join(" · ")}
            </span>
            <h1>{d.nome_fantasia || copy.sua_empresa}</h1>
            {d.cidade_nome && (
              <p>
                <MapPin size={15} />
                {d.cidade_nome} {d.estado && `· ${d.estado}`}
              </p>
            )}
          </div>
        </div>
        {d.descricao_curta && (
          <p className="preview-summary">{d.descricao_curta}</p>
        )}
        {d.sobre && (
          <section>
            <h2>{copy.sobre_a_empresa}</h2>
            <p className="preserve-lines">{d.sobre}</p>
            {d.ano_fundacao && (
              <small>
                {copy.desde}
                {d.ano_fundacao}
              </small>
            )}
          </section>
        )}
        {d.certificacoes.length > 0 && (
          <section>
            <h2>{t.certifications}</h2>
            <div className="certificates">
              {d.certificacoes.map((c, i) => (
                <span key={i}>
                  <CheckCircle size={15} />
                  {c}
                </span>
              ))}
            </div>
          </section>
        )}
        {d.servicos.length > 0 && (
          <section>
            <h2>{t.services}</h2>
            <div className="preview-cards">
              {d.servicos.map((s) => (
                <article key={s.id}>
                  {s.foto_url && (
                    <img src={s.foto_url} loading="lazy" alt={s.titulo} />
                  )}
                  <h3>{s.titulo}</h3>
                  <p>{s.descricao}</p>
                </article>
              ))}
            </div>
          </section>
        )}
        {d.midias.length > 0 && (
          <section>
            <h2>{t.gallery}</h2>
            <div className="preview-gallery">
              {d.midias.map((m) => (
                <figure key={m.id}>
                  <img
                    src={m.url}
                    alt={m.legenda || copy.foto_da_empresa}
                    loading="lazy"
                  />
                  {m.legenda && <figcaption>{m.legenda}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
        )}
        {vid && (
          <section>
            <h2>{copy.conheca_nosso_trabalho}</h2>
            <iframe
              title={copy.video_da_empresa}
              src={`https://www.youtube-nocookie.com/embed/${vid}`}
              loading="lazy"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </section>
        )}
        {d.cobertura.length > 0 && (
          <section>
            <h2>{copy.onde_atendemos}</h2>
            <div className="region-chips">
              {d.cobertura.map((r) => (
                <span key={r.id}>
                  <MapPin size={14} />
                  {r.cidade_nome || copy.todo_o_estado}
                  {copy.texto__4}
                  {r.uf}
                </span>
              ))}
            </div>
          </section>
        )}
        {d.cases.length > 0 && (
          <section>
            <h2>{t.cases}</h2>
            <div className="preview-cards">
              {d.cases.map((c) => (
                <article key={c.id}>
                  {c.foto_url && (
                    <img src={c.foto_url} alt={c.condominio} loading="lazy" />
                  )}
                  <h3>{c.condominio}</h3>
                  <p>{c.descricao}</p>
                </article>
              ))}
            </div>
          </section>
        )}
        {d.faqs.length > 0 && (
          <section>
            <h2>{t.faq}</h2>
            {d.faqs.map((f) => (
              <details key={f.id}>
                <summary>{f.pergunta}</summary>
                <p>{f.resposta}</p>
              </details>
            ))}
          </section>
        )}
        {d.instagram && (
          <section>
            <h2>{copy.conectese_com_a_empresa}</h2>
            <a
              href={`https://www.instagram.com/${encodeURIComponent(d.instagram)}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="editorial-link"
            >
              {copy.texto__7}
              {d.instagram}
              <ExternalLink size={15} />
            </a>
            {d.instagram_posts.length > 0 && (
              <div className="instagram-links">
                {d.instagram_posts.map((url, i) => (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={url}
                  >
                    {copy.publicacao}
                    {i + 1} <ExternalLink size={13} />
                  </a>
                ))}
              </div>
            )}
          </section>
        )}
        {!d.descricao_curta && !d.sobre && (
          <p className="empty-state">{t.empty}</p>
        )}
        <div className="preview-footer-note">
          {copy.esta_e_uma_previsualizacao_avaliacoes_selo_verificado}
        </div>
      </div>
    </div>
  );
}
