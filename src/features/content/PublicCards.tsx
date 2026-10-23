import { AdSlot } from "../commercial/AdSlot";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useDirectoryRuntime } from "../directory/api";
import { contentKey, contentPublic } from "./api";
import type { Article } from "./model";
import "./content.css";
export function ContentCards({
  items,
  base = "",
}: {
  items: Article[];
  base?: string;
}) {
  return (
    <div className="content-grid">
      {items.map((a) => (
        <article className="content-card" key={a.id}>
          {a.imagem_capa && (
            <img
              src={a.imagem_capa}
              alt={
                a.media_credits?.find((m) => m.url === a.imagem_capa)?.alt || ""
              }
              loading="lazy"
            />
          )}
          {a.media_credits
            ?.filter((m) => m.url === a.imagem_capa)
            .map((m) => (
              <small key={m.url}>{m.credit}</small>
            ))}
          <span className="content-tag">
            {a.tipo === "editorial" ? a.categoria : "Conteúdo de marca"}
          </span>
          <h2>
            <Link to={base + "/materia/" + a.slug}>{a.titulo}</Link>
          </h2>
          <p>{a.resumo}</p>
          <p className="content-list-meta">
            {a.publicada_em &&
              new Date(a.publicada_em).toLocaleDateString("pt-BR")}{" "}
            · {a.tempo_leitura || 1} min de leitura
          </p>
          <Link to={base + "/materia/" + a.slug}>Ler matéria</Link>
        </article>
      ))}
    </div>
  );
}
export function ContentHome() {
  const r = useDirectoryRuntime(),
    q = useQuery({
      queryKey: contentKey(r, "lista"),
      queryFn: () => contentPublic(r, "lista"),
    }),
    catalog = useQuery({
      queryKey: contentKey(r, "catalogo"),
      queryFn: () => contentPublic(r, "catalogo"),
    }),
    latest = catalog.data?.revistas
      ?.filter(
        (m) =>
          m.status === "publicada" &&
          !!m.publicada_em &&
          Date.parse(m.publicada_em) <= Date.now(),
      )
      .sort((a, b) =>
        String(b.publicada_em).localeCompare(String(a.publicada_em)),
      )[0];
  return (
    <section className="content-page content-home container">
      <span className="eyebrow">CONHECIMENTO PARA QUEM CUIDA</span>
      <h2>Leituras para o seu condomínio</h2>
      {r.source === "demo" && (
        <p className="content-muted">Conteúdo fictício de demonstração.</p>
      )}
      {q.data?.items?.length ? (
        <ContentCards items={q.data.items.slice(0, 3)} />
      ) : (
        <p>As próximas matérias aparecerão aqui após a publicação editorial.</p>
      )}
      <AdSlot position="home_meio" />
      {latest && (
        <article className="content-panel">
          <span className="eyebrow">ÚLTIMA EDIÇÃO</span>
          <h2>{latest.titulo}</h2>
          <p>Edição {latest.edicao}</p>
          <Link className="content-button" to={"/revista/" + latest.slug}>
            Conhecer a revista
          </Link>
        </article>
      )}
      <div className="content-actions">
        <Link className="content-button" to="/materias">
          Todas as matérias
        </Link>
        <Link className="content-button" to="/revista">
          Revista Patri Realty
        </Link>
      </div>
    </section>
  );
}

export function SupplierArticles({ slug }: { slug: string }) {
  const r = useDirectoryRuntime(),
    q = useQuery({
      queryKey: contentKey(r, "fornecedor", slug),
      queryFn: () => contentPublic(r, "fornecedor", slug),
    });
  if (!q.data?.items?.length) return null;
  return (
    <section className="content-page content-related">
      <h2>Matérias deste fornecedor</h2>
      <ContentCards items={q.data.items} />
    </section>
  );
}
