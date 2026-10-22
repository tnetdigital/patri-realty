import { EditorialReport } from "../features/content/EditorialReport";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ownCompanies, activePortals } from "../features/shared/api";
import { useDirectoryRuntime } from "../features/directory/api";
import {
  contentPublic,
  contentKey,
  staffList,
  ownArticles,
  balance,
  saveArticle,
  articleAction,
  saveResource,
} from "../features/content/api";
import {
  blankArticle,
  statusNames,
  validateArticle,
  wordCount,
  type Article,
  type Catalog,
  type Subscriber,
} from "../features/content/model";
import { resetContentDemo, demoRunSchedule } from "../features/content/demo";
import {
  ArticleBody,
  BlockEditor,
  ContentImage,
} from "../features/content/Blocks";
import { downloadCsv } from "../features/admin/model";
import "../features/content/content.css";
type Tab =
  | "materias"
  | "categorias"
  | "revistas"
  | "pautas"
  | "parceiros"
  | "newsletter";
export default function ContentPanel({
  demo = false,
  supplier = false,
}: {
  demo?: boolean;
  supplier?: boolean;
}) {
  const runtime = useDirectoryRuntime(),
    client = useQueryClient(),
    loc = useLocation(),
    [tab, setTab] = useState<Tab>("materias"),
    [company, setCompany] = useState(""),
    [page, setPage] = useState(1),
    [filter, setFilter] = useState(""),
    [needle, setNeedle] = useState(""),
    [draft, setDraft] = useState<Article | null>(null),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState(""),
    [date, setDate] = useState("");
  const companies = useQuery({
      queryKey: ["content-companies", demo, supplier],
      enabled: supplier,
      queryFn: async () => {
        if (demo)
          return [
            { id: "supplier-content-demo", nome_fantasia: "Empresa Exemplo" },
          ];
        const q = await ownCompanies();
        if (q.error) throw Error(q.error.message);
        return q.data;
      },
    }),
    sid = supplier ? company || companies.data?.[0]?.id || "" : null;
  const catalog = useQuery({
    queryKey: ["content-catalog", demo, supplier],
    queryFn: async () =>
      supplier
        ? ((await contentPublic(
            { ...runtime, source: demo ? "demo" : runtime.source },
            "catalogo",
          )) as Catalog)
        : await staffList("catalogo", demo),
  });
  const portals = useQuery({
    queryKey: ["content-portals", demo, supplier],
    enabled: supplier,
    queryFn: async () => {
      if (demo) return (await staffList("catalogo", true)).portais || [];
      const q = await activePortals();
      if (q.error) throw Error(q.error.message);
      return q.data;
    },
  });
  const articles = useQuery({
      queryKey: ["content-private", demo, supplier, sid, page],
      enabled: !supplier || !!sid,
      queryFn: async () => {
        if (supplier) {
          const all = await ownArticles(sid!, demo);
          return {
            items: all.slice((page - 1) * 25, page * 25),
            total: all.length,
          };
        }
        const q = await staffList("materias", demo, page);
        return { items: q.items as Article[], total: q.total };
      },
    }),
    quota = useQuery({
      queryKey: ["content-balance", demo, sid],
      enabled: !!sid,
      queryFn: () => balance(sid!, demo),
    }),
    subscribers = useQuery({
      queryKey: ["content-newsletter", demo, page],
      enabled: !supplier && tab === "newsletter",
      queryFn: () => staffList("newsletter", demo, page),
    });
  const base = demo ? "/demonstracao-editorial" : "";
  useEffect(() => {
    const update = () =>
      void client.invalidateQueries({
        predicate: (q) => String(q.queryKey[0]).startsWith("content"),
      });
    window.addEventListener("patri:content", update);
    return () => window.removeEventListener("patri:content", update);
  }, [client]);
  useEffect(() => {
    if (loc.pathname.endsWith("/nova")) {
      const a = blankArticle();
      a.fornecedor_id = sid;
      a.tipo = supplier ? "fornecedor" : "editorial";
      setDraft(a);
    }
  }, [loc.pathname, sid, supplier]);
  async function refresh() {
    await client.invalidateQueries({
      predicate: (q) => String(q.queryKey[0]).startsWith("content"),
    });
  }
  async function run(
    fn: () => unknown | Promise<unknown>,
    success = "Operação concluída.",
  ) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await fn();
      await refresh();
      setMessage(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function choose(a: Article | null) {
    if (
      dirty &&
      !window.confirm("Há alterações não salvas. Deseja trocar de matéria?")
    )
      return;
    setDraft(a ? structuredClone(a) : null);
    setDirty(false);
    setPreview(false);
    setReason("");
    setError("");
    setMessage("");
  }
  function change(a: Article) {
    setDraft(a);
    setDirty(true);
  }
  async function save() {
    if (!draft) return;
    validateArticle(draft, supplier || !!draft.fornecedor_id);
    const a = await saveArticle(draft, sid, demo);
    setDraft(a);
    setDirty(false);
  }
  async function act(action: string) {
    if (!draft?.id) throw Error("Salve o rascunho antes de continuar.");
    if (dirty)
      throw Error("Salve as alterações antes de mudar o estado da matéria.");
    const a = await articleAction(
      draft.id,
      action,
      {
        motivo: reason,
        ...(date ? { agendada_em: new Date(date).toISOString() } : {}),
      },
      demo,
    );
    setDraft(a);
    setDirty(false);
  }
  async function exportNewsletter() {
    const all: Subscriber[] = [];
    for (let p = 1; p <= 400; p++) {
      const result = await staffList("newsletter", demo, p);
      all.push(...(result.items as Subscriber[]));
      if (all.length >= result.total) {
        downloadCsv("newsletter-inscritos.csv", all);
        return;
      }
    }
    throw Error(
      "Lista muito grande. Use exportação por períodos na operação de dados.",
    );
  }
  const editable =
    !supplier || !draft?.id || ["rascunho", "ajuste"].includes(draft.status);
  return (
    <section className="content-page container">
      <EditorialReport sid={sid} demo={demo} />
      <span className="eyebrow">
        {supplier
          ? "SUA EXPERIÊNCIA TEM ESPAÇO AQUI"
          : "PATRI REALTY · REDAÇÃO"}
      </span>
      <h1>{supplier ? "Matérias da sua empresa" : "Conteúdo e publicação"}</h1>
      <p>
        {supplier
          ? "Prepare sua matéria e envie para a revisão editorial. A publicação depende da aprovação da equipe."
          : "Organize pautas, revise contribuições e publique com clareza e responsabilidade."}
      </p>
      <div className="content-actions">
        <Link to={base + (demo ? "" : "/materias")}>
          Ver o portal de matérias
        </Link>
        <Link
          to={
            supplier
              ? demo
                ? "/demonstracao"
                : "/painel"
              : demo
                ? "/demonstracao-admin"
                : "/admin"
          }
        >
          Voltar ao painel
        </Link>
        {demo && (
          <Link
            to={supplier ? "/demonstracao-conteudo" : "/demonstracao-materias"}
          >
            {supplier
              ? "Abrir redação de demonstração"
              : "Abrir painel do fornecedor"}
          </Link>
        )}
      </div>
      {demo && (
        <aside className="content-notice">
          <strong>Ambiente de demonstração</strong>
          <p>
            Dados fictícios persistidos neste navegador. Publicar e enviar
            e-mails são simulações locais. O painel da redação e o painel do
            fornecedor compartilham estes exemplos para testar a revisão.
          </p>
          <div className="content-actions">
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Reiniciar matérias, pautas e inscrições fictícias?",
                  )
                )
                  void run(() => {
                    resetContentDemo();
                    setDraft(null);
                    setDirty(false);
                  }, "Demonstração reiniciada.");
              }}
            >
              Reiniciar demonstração editorial
            </button>
            {!supplier && (
              <button
                onClick={() =>
                  void run(
                    () => demoRunSchedule(),
                    "Rotina de publicações agendadas simulada executada.",
                  )
                }
              >
                Executar publicações agendadas
              </button>
            )}
          </div>
        </aside>
      )}
      {supplier && (
        <>
          <label>
            Empresa
            <select
              value={sid || ""}
              onChange={(e) => {
                if (
                  !dirty ||
                  window.confirm(
                    "Trocar de empresa e descartar alterações não salvas?",
                  )
                ) {
                  setCompany(e.target.value);
                  setDraft(null);
                  setPage(1);
                }
              }}
            >
              {companies.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_fantasia}
                </option>
              ))}
            </select>
          </label>
          {quota.data && (
            <div className="content-metrics">
              <div>
                <strong>{quota.data.mensal}</strong>matérias disponíveis no mês
              </div>
              <div>
                <strong>{quota.data.usadas}</strong>enviadas pela franquia
                mensal
              </div>
              <div>
                <strong>{quota.data.cortesia}</strong>cortesias sem expiração
              </div>
              <div>
                <strong>{quota.data.parceiro}</strong>envios a parceiro
                disponíveis
              </div>
            </div>
          )}
          <p className="content-muted">
            A franquia renova no mês civil de São Paulo. O primeiro envio
            reserva o saldo, mesmo se a revisão pedir ajustes ou recusar;
            reenviar a mesma matéria não consome novamente. Até 600 palavras, um
            link e cinco fotos incluindo a capa.
          </p>
          <Link to={demo ? "/demonstracao-plano" : "/painel/plano"}>
            Consultar meu plano
          </Link>
        </>
      )}
      {!supplier && (
        <nav className="content-nav" aria-label="Redação">
          {(
            [
              "materias",
              "categorias",
              "revistas",
              "pautas",
              "parceiros",
              "newsletter",
            ] as Tab[]
          ).map((k) => (
            <button
              key={k}
              aria-pressed={tab === k}
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm(
                    "Trocar de seção e descartar alterações não salvas?",
                  )
                ) {
                  setTab(k);
                  setPage(1);
                  setDraft(null);
                  setDirty(false);
                }
              }}
            >
              {
                {
                  materias: "Matérias",
                  categorias: "Categorias",
                  revistas: "Revistas",
                  pautas: "Pautas",
                  parceiros: "Portais e entregas",
                  newsletter: "Newsletter",
                }[k]
              }
            </button>
          ))}
        </nav>
      )}
      {error && (
        <p role="alert" className="content-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="content-success">
          {message}
        </p>
      )}
      {(catalog.isError || articles.isError || quota.isError) && (
        <div role="alert">
          <p>Não foi possível carregar os dados editoriais.</p>
          <button onClick={() => void refresh()}>Tentar novamente</button>
        </div>
      )}
      {tab === "materias" ? (
        <>
          <div className="content-actions">
            <button
              className="primary"
              disabled={busy || (supplier && !sid)}
              onClick={() => {
                const a = blankArticle();
                a.tipo = supplier ? "fornecedor" : "editorial";
                a.fornecedor_id = sid;
                choose(a);
              }}
            >
              Nova matéria
            </button>
            <label>
              Filtrar status desta página
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">Todos</option>
                {Object.entries(statusNames).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Buscar nesta página
              <input
                value={needle}
                onChange={(e) => setNeedle(e.target.value)}
                maxLength={120}
              />
            </label>
          </div>
          <div className="content-editor-layout">
            <aside
              className="content-select-list"
              aria-label="Lista de matérias"
            >
              {articles.data?.items
                .filter(
                  (a) =>
                    (!filter || a.status === filter) &&
                    a.titulo.toLowerCase().includes(needle.toLowerCase()),
                )
                .map((a) => (
                  <button
                    key={a.id}
                    className={draft?.id === a.id ? "selected" : ""}
                    onClick={() => choose(a)}
                  >
                    <strong>{a.titulo}</strong>
                    <span>{statusNames[a.status]}</span>
                    <span>
                      {a.tipo === "fornecedor"
                        ? "Contribuição do fornecedor"
                        : "Redação"}
                    </span>
                  </button>
                ))}
              {articles.isPending ? (
                <p role="status">Carregando matérias…</p>
              ) : (
                !articles.data?.items.length && (
                  <p>Nenhuma matéria. Comece com um rascunho.</p>
                )
              )}
              <nav className="content-actions" aria-label="Páginas editoriais">
                <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Anterior
                </button>
                <span>Página {page}</span>
                <button
                  disabled={page * 25 >= (articles.data?.total || 0)}
                  onClick={() => setPage(page + 1)}
                >
                  Próxima
                </button>
              </nav>
            </aside>
            <div>
              {draft ? (
                <>
                  <div className="content-panel">
                    <span className="content-tag">
                      {statusNames[draft.status]}
                    </span>
                    <h2>{draft.id ? "Editar matéria" : "Preparar rascunho"}</h2>
                    {draft.motivo && (
                      <p className="content-notice">
                        <strong>Comentário da revisão:</strong> {draft.motivo}
                      </p>
                    )}
                    {draft.agendada_em && (
                      <p>
                        Agendada para{" "}
                        {new Date(draft.agendada_em).toLocaleString("pt-BR")}
                      </p>
                    )}
                    {!editable && (
                      <p>
                        Este envio está bloqueado para edição. Aguarde a
                        revisão.
                      </p>
                    )}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void run(save, "Rascunho salvo.");
                      }}
                    >
                      <fieldset disabled={busy || !editable}>
                        <legend>Dados da matéria</legend>
                        <label>
                          Título
                          <input
                            value={draft.titulo}
                            minLength={5}
                            maxLength={180}
                            required
                            onChange={(e) =>
                              change({ ...draft, titulo: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Resumo
                          <textarea
                            value={draft.resumo}
                            maxLength={320}
                            rows={3}
                            onChange={(e) =>
                              change({ ...draft, resumo: e.target.value })
                            }
                          />
                        </label>
                        <div className="content-form-grid">
                          <label>
                            Categoria
                            <select
                              required
                              value={draft.categoria_id}
                              onChange={(e) =>
                                change({
                                  ...draft,
                                  categoria_id: e.target.value,
                                })
                              }
                            >
                              <option value="">Selecione</option>
                              {catalog.data?.categorias
                                .filter((c) => c.ativa !== false)
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome}
                                  </option>
                                ))}
                            </select>
                          </label>
                          {!supplier && !draft.fornecedor_id && (
                            <label>
                              Tipo de conteúdo
                              <select
                                value={draft.tipo}
                                disabled={!!draft.id}
                                onChange={(e) =>
                                  change({
                                    ...draft,
                                    tipo: e.target.value as Article["tipo"],
                                  })
                                }
                              >
                                <option value="editorial">Editorial</option>
                                <option value="patrocinada">
                                  Patrocinada · Conteúdo de marca
                                </option>
                              </select>
                            </label>
                          )}
                        </div>
                        <ContentImage
                          label="Imagem de capa"
                          value={draft.imagem_capa}
                          onChange={(v) => change({ ...draft, imagem_capa: v })}
                          demo={demo}
                          mid={draft.id}
                          disabled={!editable || busy}
                        />
                        {(supplier || draft.fornecedor_id) && (
                          <label>
                            Destino parceiro opcional
                            <select
                              value={draft.portal_id || ""}
                              disabled={!!draft.primeiro_envio_em}
                              onChange={(e) =>
                                change({
                                  ...draft,
                                  portal_id: e.target.value || null,
                                })
                              }
                            >
                              <option value="">
                                Somente blog Patri Realty
                              </option>
                              {(
                                portals.data ||
                                catalog.data?.portais ||
                                []
                              ).map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nome}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <BlockEditor
                          blocks={draft.corpo}
                          onChange={(b) => change({ ...draft, corpo: b })}
                          demo={demo}
                          mid={draft.id}
                          disabled={busy || !editable}
                        />
                        <p>
                          {wordCount(draft.corpo)} palavras
                          {draft.fornecedor_id ? " de até 600" : ""}
                        </p>
                        <details>
                          <summary>Endereço e SEO</summary>
                          <label>
                            Slug
                            <input
                              value={draft.slug}
                              maxLength={200}
                              onChange={(e) =>
                                change({ ...draft, slug: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            Título SEO
                            <input
                              value={draft.seo_titulo}
                              maxLength={80}
                              onChange={(e) =>
                                change({ ...draft, seo_titulo: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            Descrição SEO
                            <textarea
                              rows={3}
                              value={draft.seo_descricao}
                              maxLength={180}
                              onChange={(e) =>
                                change({
                                  ...draft,
                                  seo_descricao: e.target.value,
                                })
                              }
                            />
                          </label>
                        </details>
                        <button
                          className="primary"
                          disabled={busy || !editable}
                        >
                          Salvar rascunho
                        </button>
                      </fieldset>
                    </form>
                    <div className="content-actions">
                      <button
                        type="button"
                        onClick={() => setPreview(!preview)}
                      >
                        {preview ? "Fechar prévia" : "Pré-visualizar matéria"}
                      </button>
                      {supplier && (
                        <button
                          disabled={busy || !draft.id || dirty || !editable}
                          onClick={() =>
                            void run(
                              () => act("enviar"),
                              "Matéria enviada para revisão. O saldo foi reservado.",
                            )
                          }
                        >
                          Enviar para revisão
                        </button>
                      )}
                    </div>
                    {preview && (
                      <section
                        className="content-notice"
                        aria-label="Prévia privada da matéria"
                      >
                        <p>Prévia privada. Salvar não publica este conteúdo.</p>
                        <h2>{draft.titulo}</h2>
                        <p>{draft.resumo}</p>
                        <ArticleBody blocks={draft.corpo} />
                      </section>
                    )}
                  </div>
                  {!supplier && draft.id && (
                    <section className="content-panel">
                      <h2>Revisão e publicação</h2>
                      {draft.fornecedor_id && (
                        <p>
                          Publicações aprovadas de fornecedores recebem o selo
                          Conteúdo de marca e o cartão da empresa.
                        </p>
                      )}
                      <label>
                        Comentário da revisão
                        <textarea
                          rows={3}
                          value={reason}
                          maxLength={2000}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </label>
                      <div className="content-actions">
                        <button
                          disabled={
                            busy || dirty || draft.status !== "em_revisao"
                          }
                          onClick={() =>
                            void run(
                              () => act("ajuste"),
                              "Ajuste solicitado com comentário.",
                            )
                          }
                        >
                          Pedir ajuste
                        </button>
                        <button
                          disabled={
                            busy || dirty || draft.status !== "em_revisao"
                          }
                          onClick={() => {
                            if (
                              window.confirm(
                                "Recusar este envio com o motivo informado?",
                              )
                            )
                              void run(
                                () => act("recusar"),
                                "Matéria recusada.",
                              );
                          }}
                        >
                          Recusar matéria
                        </button>
                        <button
                          className="primary"
                          disabled={
                            busy ||
                            dirty ||
                            !["rascunho", "em_revisao", "agendada"].includes(
                              draft.status,
                            )
                          }
                          onClick={() => {
                            if (window.confirm("Publicar esta matéria agora?"))
                              void run(
                                () => act("publicar"),
                                "Matéria publicada.",
                              );
                          }}
                        >
                          Publicar agora
                        </button>
                      </div>
                      <label>
                        Data e hora de publicação
                        <input
                          type="datetime-local"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </label>
                      <div className="content-actions">
                        <button
                          disabled={
                            busy ||
                            dirty ||
                            !date ||
                            !["rascunho", "em_revisao", "agendada"].includes(
                              draft.status,
                            )
                          }
                          onClick={() =>
                            void run(
                              () => act("agendar"),
                              "Publicação agendada.",
                            )
                          }
                        >
                          Agendar publicação
                        </button>
                        <button
                          disabled={
                            busy || dirty || draft.status === "arquivada"
                          }
                          onClick={() => {
                            if (
                              window.confirm(
                                "Arquivar e retirar esta matéria do portal?",
                              )
                            )
                              void run(
                                () => act("arquivar"),
                                "Matéria arquivada.",
                              );
                          }}
                        >
                          Arquivar matéria
                        </button>
                        {draft.status === "publicada" && (
                          <Link to={base + "/materia/" + draft.slug}>
                            Ver matéria publicada
                          </Link>
                        )}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <section className="content-panel">
                  <h2>Seu espaço de publicação</h2>
                  <p>
                    Selecione uma matéria ou crie um novo rascunho. A prévia
                    permite conferir o texto antes de publicar.
                  </p>
                </section>
              )}
            </div>
          </div>
        </>
      ) : tab === "newsletter" ? (
        <section className="content-panel">
          <h2>Inscritos da newsletter</h2>
          <p>
            Somente inscritos confirmados e sem descadastro estão aptos a
            receber novidades. Esta fase capta a lista; não faz disparos de
            campanhas.
          </p>
          <button
            disabled={busy}
            onClick={() =>
              void run(exportNewsletter, "CSV da newsletter exportado.")
            }
          >
            Exportar inscritos CSV
          </button>
          <div className="content-table">
            <table>
              <caption>Inscrições · página {page}</caption>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Duplo aceite</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {(subscribers.data?.items as Subscriber[] | undefined)?.map(
                  (n) => (
                    <tr key={n.id}>
                      <td>{n.nome}</td>
                      <td>{n.email}</td>
                      <td>{n.perfil}</td>
                      <td>
                        {n.confirmado_em
                          ? new Date(n.confirmado_em).toLocaleString("pt-BR")
                          : "Aguardando confirmação"}
                      </td>
                      <td>
                        {n.descadastrado_em
                          ? "Descadastrado"
                          : n.confirmado
                            ? "Confirmado"
                            : "Pendente"}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          <div className="content-actions">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              Anterior
            </button>
            <button
              disabled={page * 25 >= (subscribers.data?.total || 0)}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </button>
          </div>
        </section>
      ) : (
        catalog.data && (
          <Resources
            tab={tab}
            catalog={catalog.data}
            demo={demo}
            busy={busy}
            run={run}
          />
        )
      )}
    </section>
  );
}
function Resources({
  tab,
  catalog,
  demo,
  busy,
  run,
}: {
  tab: Tab;
  catalog: Catalog;
  demo: boolean;
  busy: boolean;
  run: (
    fn: () => unknown | Promise<unknown>,
    success?: string,
  ) => Promise<void>;
}) {
  const [id, setId] = useState<string | null>(null),
    [fields, setFields] = useState<Record<string, string>>({});
  useEffect(() => {
    setFields({});
    setId(null);
  }, [tab]);
  const kind =
      tab === "categorias"
        ? "categoria"
        : tab === "revistas"
          ? "revista"
          : tab === "pautas"
            ? "pauta"
            : "portal",
    rows =
      tab === "categorias"
        ? catalog.categorias
        : tab === "revistas"
          ? catalog.revistas
          : tab === "pautas"
            ? catalog.pautas || []
            : catalog.portais || [];
  const labels: Record<string, string> = {
    nome: "Nome",
    titulo: "Título",
    edicao: "Edição",
    slug: "Slug",
    capa_url: "URL da capa",
    link_digital: "Link da edição digital",
    publicada_em: "Data de publicação",
    status: "Status",
    responsavel_id: "Responsável",
    data_prevista: "Data prevista",
    observacoes: "Observações",
    url: "URL HTTPS do portal",
    vagas_por_mes: "Vagas por mês",
  };
  const keys =
    tab === "categorias"
      ? ["nome"]
      : tab === "revistas"
        ? [
            "titulo",
            "edicao",
            "slug",
            "capa_url",
            "link_digital",
            "publicada_em",
            "status",
          ]
        : tab === "pautas"
          ? [
              "titulo",
              "responsavel_id",
              "data_prevista",
              "status",
              "observacoes",
            ]
          : ["nome", "url", "vagas_por_mes"];
  function edit(row: object & { id: string }) {
    setId(row.id);
    setFields(
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, v === null ? "" : String(v)]),
      ),
    );
  }
  const field = (k: string) =>
    k === "status" ? (
      <select
        value={fields.status || "rascunho"}
        onChange={(e) => setFields({ ...fields, status: e.target.value })}
      >
        {(tab === "pautas"
          ? ["ideia", "escrevendo", "revisao", "publicada"]
          : ["rascunho", "publicada", "arquivada"]
        ).map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    ) : k === "responsavel_id" ? (
      <select
        value={fields[k] || ""}
        onChange={(e) => setFields({ ...fields, [k]: e.target.value })}
      >
        <option value="">Sem responsável</option>
        {catalog.equipe?.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nome}
          </option>
        ))}
      </select>
    ) : k === "observacoes" ? (
      <textarea
        rows={3}
        value={fields[k] || ""}
        onChange={(e) => setFields({ ...fields, [k]: e.target.value })}
      />
    ) : (
      <input
        type={
          k === "vagas_por_mes"
            ? "number"
            : k === "data_prevista"
              ? "date"
              : k === "publicada_em"
                ? "datetime-local"
                : "text"
        }
        min={k === "vagas_por_mes" ? 0 : undefined}
        maxLength={k === "titulo" ? 180 : 1000}
        required={["nome", "titulo", "edicao", "url", "vagas_por_mes"].includes(
          k,
        )}
        value={
          k === "publicada_em" && fields[k]
            ? fields[k].slice(0, 16)
            : fields[k] || ""
        }
        onChange={(e) => setFields({ ...fields, [k]: e.target.value })}
      />
    );
  return (
    <div className="content-resources">
      <section className="content-panel">
        <h2>
          {tab === "categorias"
            ? "Categorias"
            : tab === "revistas"
              ? "Revistas"
              : tab === "pautas"
                ? "Pautas da redação"
                : "Portais parceiros"}
        </h2>
        <div className="content-actions">
          <button
            onClick={() => {
              setId(null);
              setFields({ status: tab === "pautas" ? "ideia" : "rascunho" });
            }}
          >
            Novo registro
          </button>
        </div>
        {tab === "pautas" ? (
          <div className="content-board">
            {["ideia", "escrevendo", "revisao", "publicada"].map((status) => (
              <section key={status} className="content-board-col">
                <h3>{status}</h3>
                {catalog.pautas
                  ?.filter((p) => p.status === status)
                  .map((p) => (
                    <article className="content-card" key={p.id}>
                      <strong>{p.titulo}</strong>
                      <p>
                        {catalog.equipe?.find((e) => e.id === p.responsavel_id)
                          ?.nome || "Sem responsável"}{" "}
                        · {p.data_prevista || "Sem data"}
                      </p>
                      <button onClick={() => edit(p)}>Editar pauta</button>
                    </article>
                  ))}
              </section>
            ))}
          </div>
        ) : (
          <div className="content-select-list">
            {rows.map((r) => (
              <button key={r.id} onClick={() => edit(r)}>
                {"nome" in r ? r.nome : r.titulo}
                {"status" in r ? " · " + r.status : ""}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const p: Record<string, unknown> = {
                ...fields,
                ativa: fields.ativa !== "false",
                ativo: fields.ativo !== "false",
                vagas_por_mes: Number(fields.vagas_por_mes || 1),
                status:
                  fields.status || (tab === "pautas" ? "ideia" : "rascunho"),
              };
              if (fields.publicada_em)
                p.publicada_em = new Date(fields.publicada_em).toISOString();
              await saveResource(kind, id, p, demo);
              setId(null);
              setFields({});
            }, "Registro editorial salvo.");
          }}
        >
          <fieldset disabled={busy}>
            <legend>{id ? "Editar registro" : "Novo registro"}</legend>
            {keys.map((k) => (
              <label key={k}>
                {labels[k]}
                {field(k)}
              </label>
            ))}
            {["categorias", "parceiros"].includes(tab) && (
              <label>
                <input
                  type="checkbox"
                  checked={
                    fields[tab === "categorias" ? "ativa" : "ativo"] !== "false"
                  }
                  onChange={(e) =>
                    setFields({
                      ...fields,
                      [tab === "categorias" ? "ativa" : "ativo"]: String(
                        e.target.checked,
                      ),
                    })
                  }
                />
                Ativo
              </label>
            )}
            <button className="primary">
              Salvar{" "}
              {kind === "categoria"
                ? "categoria"
                : kind === "revista"
                  ? "revista"
                  : kind === "pauta"
                    ? "pauta"
                    : "portal"}
            </button>
          </fieldset>
        </form>
      </section>
      {tab === "parceiros" && (
        <DeliveryForm catalog={catalog} demo={demo} busy={busy} run={run} />
      )}
    </div>
  );
}
function DeliveryForm({
  catalog,
  demo,
  busy,
  run,
}: {
  catalog: Catalog;
  demo: boolean;
  busy: boolean;
  run: (
    fn: () => unknown | Promise<unknown>,
    success?: string,
  ) => Promise<void>;
}) {
  const [page, setPage] = useState(1),
    [mid, setMid] = useState("");
  const q = useQuery({
      queryKey: ["content-delivery-options", demo, page],
      queryFn: () => staffList("materias", demo, page),
    }),
    rows =
      (q.data?.items as Article[] | undefined)?.filter(
        (a) => a.status === "publicada" && a.portal_id,
      ) || [];
  return (
    <section className="content-panel">
      <h2>Entregas em portais parceiros</h2>
      <p>
        Registre a URL da entrega externa. A versão no parceiro deve apontar a
        URL original como canonical. O portal não publica automaticamente em
        sites de terceiros.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void run(
            () =>
              saveResource(
                "entrega",
                null,
                {
                  materia_id: mid,
                  url_externa: f.get("url_externa"),
                  canonical_url: f.get("canonical_url"),
                },
                demo,
              ),
            "Entrega externa registrada.",
          );
        }}
      >
        <fieldset disabled={busy}>
          <legend>Registrar entrega</legend>
          <label>
            Matéria com portal reservado
            <select
              value={mid}
              onChange={(e) => setMid(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {rows.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.titulo}
                </option>
              ))}
            </select>
          </label>
          <div className="content-actions">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Página anterior
            </button>
            <button
              type="button"
              disabled={page * 25 >= (q.data?.total || 0)}
              onClick={() => setPage(page + 1)}
            >
              Próxima página
            </button>
          </div>
          <label>
            URL externa da entrega
            <input name="url_externa" type="url" required />
          </label>
          <label>
            Canonical original da matéria
            <input
              name="canonical_url"
              type="url"
              required
              placeholder="https://seu-dominio/materia/slug"
            />
          </label>
          <button>Registrar entrega</button>
        </fieldset>
      </form>
      {catalog.entregas?.map((e) => (
        <p key={e.id}>
          <a href={e.url_externa} rel="noopener noreferrer" target="_blank">
            Entrega de {new Date(e.entregue_em).toLocaleDateString("pt-BR")}
          </a>{" "}
          · canonical: {e.canonical_url}
        </p>
      ))}
    </section>
  );
}
