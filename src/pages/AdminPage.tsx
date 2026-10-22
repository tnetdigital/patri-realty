import { JobStatus } from "../features/admin/JobStatus";
import { AdminBilling } from "../features/billing/AdminBilling";
import { CompanyPicker } from "../features/admin/CompanyPicker";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../features/auth/context";
import { adminList, adminAct, exportAdmin } from "../features/admin/api";
import {
  blankFilters,
  labels,
  downloadCsv,
  type Row,
  type Page,
  type AdminKind,
  type Filters,
} from "../features/admin/model";
import { resetAdminDemo } from "../features/admin/demo";
import { AdminImport } from "../features/admin/Import";
import taxonomy from "../features/directory/taxonomy.json";
import states from "../features/directory/states.json";
import "../features/admin/admin.css";
const SupplierPortal = lazy(() => import("./SupplierPortal"));
const kinds = Object.keys(labels) as AdminKind[];
const text = (v: unknown) =>
  v === null || v === undefined
    ? "—"
    : typeof v === "boolean"
      ? v
        ? "Sim"
        : "Não"
      : Array.isArray(v)
        ? v
            .map((x) =>
              typeof x === "object" && x ? String(x.nome || "") : String(x),
            )
            .join(", ")
        : typeof v === "object"
          ? JSON.stringify(v)
          : String(v);
const date = (v: unknown) =>
  v ? new Date(String(v)).toLocaleString("pt-BR") : "—";
export default function AdminPage({ demo = false }: { demo?: boolean }) {
  const navigate = useNavigate(),
    [globalSearch, setGlobalSearch] = useState("");
  const loc = useLocation(),
    { id } = useParams(),
    { access } = useAuth(),
    client = useQueryClient(),
    [simRole, setSimRole] = useState("admin"),
    [menu, setMenu] = useState(false);
  const role = demo
      ? simRole
      : access?.roles.includes("admin")
        ? "admin"
        : "comercial",
    base = demo ? "/demonstracao-admin" : "/admin",
    part =
      loc.pathname.slice(base.length).split("/").filter(Boolean)[0] ||
      "dashboard";
  useEffect(() => {
    document.title = "Administração | Patri Realty";
    const meta = document.querySelector("meta[name=robots]");
    meta?.setAttribute("content", "noindex,nofollow");
    setMenu(false);
  }, [loc.pathname]);
  if (part === "fornecedores" && id && loc.pathname.endsWith("/editar"))
    return role === "admin" ? (
      <div className="admin-edit">
        <div className="container">
          <Link to={base + "/fornecedores"}>Voltar à administração</Link>
        </div>
        <Suspense fallback={<p>Carregando editor…</p>}>
          <SupplierPortal
            demo={demo}
            initialSupplierId={demo ? undefined : id}
          />
        </Suspense>
      </div>
    ) : (
      <p>A edição exige papel admin.</p>
    );
  return (
    <section className="admin-area container">
      {!demo && role === "admin" && part === "dashboard" && <JobStatus />}
      <div className="admin-top">
        <div>
          <span className="eyebrow">PATRI REALTY</span>
          <h1>Administração</h1>
          <p>Revisão, operação e acompanhamento do portal.</p>
        </div>
        <button
          onClick={() => setMenu(!menu)}
          aria-expanded={menu}
          aria-controls="admin-navigation"
        >
          {menu ? "Recolher navegação" : "Abrir navegação administrativa"}
        </button>
        <Link to={base + "/fornecedores?status=em_analise"}>
          Ver pendências
        </Link>
      </div>
      <form
        className="admin-global-search"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(
            base + "/fornecedores?q=" + encodeURIComponent(globalSearch),
          );
        }}
      >
        <label>
          Busca global de fornecedores
          <input
            value={globalSearch}
            maxLength={120}
            placeholder="Empresa, e-mail ou CNPJ"
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
        </label>
        <button>Buscar fornecedor</button>
      </form>
      {demo && (
        <aside className="directory-demo">
          <strong>Administração de demonstração</strong>
          <p>
            Empresas, usuários e pedidos fictícios. Alterações ficam somente
            neste navegador, sem publicar empresas reais ou enviar e-mails.
          </p>
          <div className="admin-actions">
            <label>
              Simular papel
              <select
                value={simRole}
                onChange={(e) => setSimRole(e.target.value)}
              >
                <option value="admin">Administrador</option>
                <option value="comercial">Comercial (somente leitura)</option>
              </select>
            </label>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Reiniciar todos os dados da administração de demonstração?",
                  )
                ) {
                  resetAdminDemo();
                  void client.invalidateQueries({ queryKey: ["admin"] });
                }
              }}
            >
              Reiniciar demonstração administrativa
            </button>
          </div>
        </aside>
      )}
      <div className="admin-layout">
        <nav
          id="admin-navigation"
          className={menu ? "admin-nav open" : "admin-nav"}
          aria-label="Administração"
        >
          <Link to={demo ? "/demonstracao-metricas-admin" : "/admin/metricas"}>
            Métricas do portal
          </Link>
          <Link to={demo ? "/demonstracao-marketing" : "/admin/marketing"}>
            Marketing
          </Link>
          {role === "admin" && (
            <Link to={demo ? "/demonstracao-moderacao" : "/admin/avaliacoes"}>
              Moderação de avaliações
            </Link>
          )}
          <Link to={demo ? "/demonstracao-comercial" : "/admin/comercial"}>
            Comercial
          </Link>
          <Link to={demo ? "/demonstracao-conteudo" : "/admin/conteudo"}>
            Redação e conteúdo
          </Link>
          <Link to={base + "/planos"}>Planos e cobrança</Link>
          <Link className={part === "dashboard" ? "active" : ""} to={base}>
            Visão geral
          </Link>
          {kinds
            .filter(
              (k) =>
                role === "admin" || ["fornecedores", "pedidos"].includes(k),
            )
            .map((k) => (
              <Link
                className={part === k ? "active" : ""}
                key={k}
                to={base + "/" + k}
              >
                {labels[k]}
              </Link>
            ))}
          {role === "admin" && (
            <Link
              className={part === "importar" ? "active" : ""}
              to={base + "/importar"}
            >
              Importar CSV
            </Link>
          )}
        </nav>
        <div className="admin-content">
          {part === "planos" ? (
            <AdminBilling demo={demo} role={role} />
          ) : part === "dashboard" ? (
            <Dashboard demo={demo} role={role} base={base} />
          ) : part === "importar" ? (
            role === "admin" ? (
              <AdminImport demo={demo} role={role} />
            ) : (
              <p role="alert">A importação exige papel admin.</p>
            )
          ) : kinds.includes(part as AdminKind) ? (
            <AdminList
              key={part + role + loc.search}
              kind={part as AdminKind}
              demo={demo}
              role={role}
              base={base}
            />
          ) : (
            <p>Página administrativa não encontrada.</p>
          )}
        </div>
      </div>
    </section>
  );
}
function Dashboard({
  demo,
  role,
  base,
}: {
  demo: boolean;
  role: string;
  base: string;
}) {
  const q = useQuery({
    queryKey: ["admin", demo, role, "dashboard"],
    queryFn: () => adminList("dashboard", {}, demo, role),
  });
  const cards = [
    ["analise", "Fornecedores em análise", "fornecedores?status=em_analise"],
    ["ajustes", "Ajustes solicitados", "fornecedores?status=ajuste_solicitado"],
    [
      "incompletos",
      "Incompletos há mais de 7 dias",
      "fornecedores?incompletos=1",
    ],
    ["testes_vencendo", "Testes vencendo em 15 dias", "fornecedores?testes=1"],
    [
      "pedidos_semana",
      "Pedidos nos últimos 7 dias",
      "pedidos?de=" + new Date(Date.now() - 7 * 86400000).toISOString(),
    ],
    ["sem_resposta", "Pedidos sem resposta", "pedidos?status=sem_resposta"],
  ];
  return (
    <section>
      <h2>Visão geral</h2>
      {q.isPending ? (
        <p role="status">Carregando indicadores…</p>
      ) : q.isError ? (
        <ErrorState retry={() => void q.refetch()} />
      ) : (
        <>
          <div className="admin-metrics">
            {cards.map(([key, title, path]) => (
              <Link key={key} to={base + "/" + path}>
                <strong>{text(q.data[key as keyof typeof q.data])}</strong>
                <span>{title}</span>
              </Link>
            ))}
          </div>
          <div className="admin-panel">
            <h3>Cadastros e pedidos por semana</h3>
            {(
              ((q.data as Record<string, unknown>).semanas as {
                semana: string;
                cadastros: number;
                pedidos: number;
              }[]) || []
            ).length ? (
              <div className="admin-chart">
                {(
                  (q.data as Record<string, unknown>).semanas as {
                    semana: string;
                    cadastros: number;
                    pedidos: number;
                  }[]
                ).map((w) => (
                  <div key={w.semana}>
                    <span>{date(w.semana).split(",")[0]}</span>
                    <div>
                      <span>Cadastros: {w.cadastros}</span>
                      <meter
                        min={0}
                        max={Math.max(1, w.cadastros, w.pedidos)}
                        value={w.cadastros}
                      />
                      <span>Pedidos: {w.pedidos}</span>
                      <meter
                        min={0}
                        max={Math.max(1, w.cadastros, w.pedidos)}
                        value={w.pedidos}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>
                O gráfico será preenchido conforme houver movimentação. Os
                exemplos não representam métricas reais.
              </p>
            )}
          </div>
          <p className="admin-muted">
            Avaliações, conteúdo e contratos terão seus indicadores nas fases
            correspondentes.
          </p>
        </>
      )}
    </section>
  );
}
const cols: Record<AdminKind, [string, string][]> = {
  fornecedores: [
    ["nome", "Empresa"],
    ["cnpj", "CNPJ"],
    ["status", "Status"],
    ["plano_codigo", "Plano"],
    ["completude", "Completude"],
    ["teste_fim", "Fim do teste"],
    ["pedidos_mes", "Pedidos no mês"],
  ],
  pedidos: [
    ["nome", "Condomínio"],
    ["empresa", "Fornecedor"],
    ["status", "Status"],
    ["cidade", "Cidade"],
    ["uf", "UF"],
    ["criado_em", "Enviado em"],
  ],
  usuarios: [
    ["nome", "Nome"],
    ["email", "E-mail"],
    ["papeis", "Papéis"],
    ["ativo", "Ativo"],
  ],
  segmentos: [
    ["nome", "Especialidade"],
    ["grupo", "Grupo"],
    ["ordem", "Ordem"],
    ["ativo", "Ativa"],
    ["fornecedores", "Fornecedores"],
  ],
  auditoria: [
    ["criado_em", "Quando"],
    ["nome", "Ator"],
    ["acao", "Ação"],
    ["tabela", "Recurso"],
  ],
  alteracoes: [
    ["nome", "Empresa"],
    ["campo", "Campo"],
    ["antes", "Antes"],
    ["depois", "Depois"],
    ["pendente", "Pendente"],
  ],
  reivindicacoes: [
    ["nome", "Empresa"],
    ["status", "Status"],
    ["criado_em", "Solicitada em"],
  ],
  configuracoes: [
    ["nome", "Configuração"],
    ["atualizado_em", "Atualizada em"],
  ],
  emails: [
    ["nome", "Destinatário"],
    ["template", "Tipo"],
    ["status", "Status"],
    ["criado_em", "Criado em"],
  ],
};
function AdminList({
  kind,
  demo,
  role,
  base,
}: {
  kind: AdminKind;
  demo: boolean;
  role: string;
  base: string;
}) {
  const loc = useLocation(),
    query = new URLSearchParams(loc.search);
  const [filters, setFilters] = useState<Filters>({
      ...blankFilters,
      ...Object.fromEntries(query),
      pagina: 1,
    }),
    [draft, setDraft] = useState(filters),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const client = useQueryClient(),
    q = useQuery({
      queryKey: ["admin", demo, role, kind, filters],
      queryFn: () => adminList(kind, filters, demo, role) as Promise<Page>,
    });
  const row = q.data?.items.find((x) => x.id === selected);
  async function act(
    id: string,
    action: string,
    data: Record<string, unknown> = {},
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await adminAct(kind, id, action, data, demo, role);
      await client.invalidateQueries({ queryKey: ["admin"] });
      setMessage(
        demo
          ? "Operação simulada salva neste navegador."
          : "Operação concluída e registrada na auditoria.",
      );
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="admin-section-title">
        <h2>{labels[kind]}</h2>
        <button
          disabled={busy || q.isPending}
          onClick={async () => {
            setBusy(true);
            try {
              downloadCsv(
                kind + ".csv",
                await exportAdmin(kind, filters, demo, role),
              );
            } catch (e) {
              setError(e instanceof Error ? e.message : "Falha ao exportar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Exportar CSV filtrado
        </button>
        {kind === "segmentos" && role === "admin" && (
          <button onClick={() => setSelected("novo")}>
            Nova especialidade
          </button>
        )}
      </div>
      <form
        className="admin-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters({ ...draft, pagina: 1 });
          setSelected("");
        }}
      >
        <label>
          Buscar
          <input
            aria-label="Buscar na administração"
            placeholder={
              kind === "fornecedores"
                ? "Empresa, e-mail ou CNPJ"
                : "Buscar nesta lista"
            }
            value={draft.q}
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
          />
        </label>
        {["fornecedores", "pedidos", "reivindicacoes", "emails"].includes(
          kind,
        ) && (
          <label>
            Status
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              <option value="">Todos</option>
              {(kind === "fornecedores"
                ? [
                    "rascunho",
                    "em_analise",
                    "ajuste_solicitado",
                    "publicado",
                    "suspenso",
                    "recusado",
                  ]
                : kind === "pedidos"
                  ? [
                      "novo",
                      "visto",
                      "respondido",
                      "sem_resposta",
                      "spam",
                      "bloqueado_plano",
                    ]
                  : kind === "reivindicacoes"
                    ? ["pendente", "aprovada", "recusada"]
                    : ["enviado", "falhou", "pendente"]
              ).map((x) => (
                <option key={x} value={x}>
                  {x.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
        )}
        {["fornecedores", "pedidos"].includes(kind) && (
          <label>
            Estado
            <select
              value={draft.uf}
              onChange={(e) => setDraft({ ...draft, uf: e.target.value })}
            >
              <option value="">Todos</option>
              {states.map((x) => (
                <option key={x.uf}>{x.uf}</option>
              ))}
            </select>
          </label>
        )}
        {kind === "fornecedores" && (
          <>
            <label>
              Plano
              <select
                value={draft.plano}
                onChange={(e) => setDraft({ ...draft, plano: e.target.value })}
              >
                <option value="">Todos</option>
                {["gratuito", "premium", "destaque"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Especialidade
              <select
                value={draft.segmento}
                onChange={(e) =>
                  setDraft({ ...draft, segmento: e.target.value })
                }
              >
                <option value="">Todas</option>
                {taxonomy.segments.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {["auditoria", "pedidos", "fornecedores"].includes(kind) && (
          <>
            <label>
              Desde
              <input
                type="date"
                value={draft.de.slice(0, 10)}
                onChange={(e) => setDraft({ ...draft, de: e.target.value })}
              />
            </label>
            <label>
              Até
              <input
                type="date"
                value={draft.ate.slice(0, 10)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    ate: e.target.value
                      ? e.target.value + "T23:59:59.999Z"
                      : "",
                  })
                }
              />
            </label>
          </>
        )}
        {kind === "auditoria" && (
          <>
            <label>
              Ator (identificador)
              <input
                value={draft.ator}
                onChange={(e) => setDraft({ ...draft, ator: e.target.value })}
              />
            </label>
            <label>
              Recurso
              <input
                placeholder="fornecedores, leads…"
                value={draft.tabela}
                onChange={(e) => setDraft({ ...draft, tabela: e.target.value })}
              />
            </label>
            <label>
              Ação
              <input
                placeholder="INSERT, UPDATE…"
                value={draft.acao}
                onChange={(e) => setDraft({ ...draft, acao: e.target.value })}
              />
            </label>
          </>
        )}
        {kind === "fornecedores" && (
          <label>
            Verificação
            <select
              value={draft.verificado}
              onChange={(e) =>
                setDraft({ ...draft, verificado: e.target.value })
              }
            >
              <option value="">Todas</option>
              <option value="true">Verificados</option>
              <option value="false">Não verificados</option>
            </select>
          </label>
        )}
        {kind === "pedidos" && (
          <>
            <CompanyPicker
              demo={demo}
              role={role}
              value={draft.fornecedor_id}
              onChange={(fornecedor_id) =>
                setDraft({ ...draft, fornecedor_id })
              }
            />
            <label>
              Cidade
              <input
                value={draft.cidade}
                onChange={(e) => setDraft({ ...draft, cidade: e.target.value })}
              />
            </label>
          </>
        )}
        <label>
          Ordenar
          <select
            value={draft.ordem}
            onChange={(e) => setDraft({ ...draft, ordem: e.target.value })}
          >
            <option value="criado_em">Mais recentes</option>
            <option value="nome">Nome</option>
          </select>
        </label>
        <button type="submit" className="directory-button">
          Aplicar filtros
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(blankFilters);
            setFilters(blankFilters);
          }}
        >
          Limpar filtros
        </button>
      </form>
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="admin-success">
          {message}
        </p>
      )}
      {q.isPending ? (
        <p role="status">Carregando registros…</p>
      ) : q.isError ? (
        <ErrorState retry={() => void q.refetch()} />
      ) : (
        <>
          <p>{q.data.total} registros encontrados</p>
          <div className="admin-table-wrap">
            <table>
              <caption>
                {labels[kind]} — página {filters.pagina}
              </caption>
              <thead>
                <tr>
                  {cols[kind].map(([k, label]) => (
                    <th key={k}>{label}</th>
                  ))}
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((x) => (
                  <tr
                    draggable={kind === "segmentos" && role === "admin"}
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", x.id)
                    }
                    onDragOver={(e) => {
                      if (kind === "segmentos") e.preventDefault();
                    }}
                    onDrop={(e) => {
                      if (kind === "segmentos" && role === "admin") {
                        e.preventDefault();
                        const from = e.dataTransfer.getData("text/plain");
                        if (from && from !== x.id)
                          void act(from, "mover", { alvo_id: x.id });
                      }
                    }}
                    key={x.id}
                    className={
                      x.status === "sem_resposta" ? "admin-overdue" : ""
                    }
                  >
                    {cols[kind].map(([k]) => (
                      <td key={k}>
                        {k.endsWith("_em") || k === "teste_fim"
                          ? date(x[k])
                          : text(x[k])}
                      </td>
                    ))}
                    <td>
                      <button
                        aria-label={"Abrir " + text(x.nome || x.id)}
                        onClick={() => setSelected(x.id)}
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {q.data.items.length === 0 && <p>Nenhum registro neste filtro.</p>}
          </div>
          <nav
            className="admin-pagination"
            aria-label="Paginação administrativa"
          >
            <button
              disabled={filters.pagina === 1}
              onClick={() =>
                setFilters({ ...filters, pagina: filters.pagina - 1 })
              }
            >
              Anterior
            </button>
            <span>
              Página {filters.pagina} de {Math.max(1, q.data.paginas)}
            </span>
            <button
              disabled={filters.pagina >= q.data.paginas}
              onClick={() =>
                setFilters({ ...filters, pagina: filters.pagina + 1 })
              }
            >
              Próxima
            </button>
          </nav>
        </>
      )}
      {(row || selected === "novo") && (
        <Detail
          key={selected}
          row={row || { id: "00000000-0000-4000-8000-000000000000" }}
          kind={kind}
          role={role}
          demo={demo}
          busy={busy}
          base={base}
          act={act}
          close={() => setSelected("")}
        />
      )}
    </section>
  );
}
function Detail({
  row: r,
  kind,
  role,
  demo,
  busy,
  base,
  act,
  close,
}: {
  row: Row;
  kind: AdminKind;
  role: string;
  demo: boolean;
  busy: boolean;
  base: string;
  act: (
    id: string,
    a: string,
    d?: Record<string, unknown>,
  ) => Promise<Row | { ok: boolean } | null>;
  close: () => void;
}) {
  const [reason, setReason] = useState(""),
    [checklist, setChecklist] = useState<Record<string, boolean>>({
      logo: false,
      texto: false,
      cnpj: false,
      fotos: false,
      segmentos: false,
    }),
    [readOnly, setReadOnly] = useState<Row | null>(null),
    [extra, setExtra] = useState<Record<string, unknown>>({
      nome: r.nome || "",
      grupo: r.grupo || "moradia",
      ordem: r.ordem || 150,
      ativo: r.ativo ?? true,
      plano:
        r.plano_codigo === "teste" ? "premium" : r.plano_codigo || "gratuito",
      ate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
      dias: 30,
      quantidade: 1,
      papel: "fornecedor",
      valor: true,
      fornecedor_id: "",
      consentimento_confirmado: false,
    }),
    [config, setConfig] = useState<Record<string, unknown>>(
      (r.valor as Record<string, unknown>) || {},
    );
  const admin = role === "admin";
  const button = (
    label: string,
    action: string,
    data: Record<string, unknown> = {},
    confirm = false,
  ) => (
    <button
      type="button"
      disabled={!admin || busy}
      onClick={() => {
        if (!confirm || window.confirm(label + "?"))
          void act(r.id, action, {
            ...data,
            motivo: reason,
            versao: r.atualizado_em,
          }).then((v) => {
            if (v && action === "leitura") setReadOnly(v as Row);
          });
      }}
    >
      {label}
    </button>
  );
  return (
    <section
      className="admin-panel admin-detail"
      aria-label="Detalhes do registro"
    >
      <div className="admin-section-title">
        <h3>{text(r.nome || labels[kind])}</h3>
        <button onClick={close}>Fechar detalhes</button>
      </div>
      {!admin && (
        <p className="admin-muted">Acesso comercial: somente leitura.</p>
      )}
      {readOnly ? (
        <div>
          <h4>Visualização como fornecedor — somente leitura</h4>
          <p>
            Esta consulta foi registrada na auditoria e não altera sua sessão.
          </p>
          <dl>
            {[
              "nome_fantasia",
              "cnpj",
              "descricao_curta",
              "sobre",
              "status",
              "completude",
            ].map((k) => (
              <div key={k}>
                <dt>{k.replaceAll("_", " ")}</dt>
                <dd>{text(readOnly[k])}</dd>
              </div>
            ))}
          </dl>
          <button onClick={() => setReadOnly(null)}>Voltar aos detalhes</button>
        </div>
      ) : (
        <>
          <dl className="admin-record">
            {Object.entries(r)
              .filter(
                ([k]) => !["valor", "antes", "depois", "notas"].includes(k),
              )
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k.replaceAll("_", " ")}</dt>
                  <dd>
                    {k.endsWith("_em") || k === "teste_fim" ? date(v) : text(v)}
                  </dd>
                </div>
              ))}
          </dl>
          {kind === "fornecedores" && (
            <>
              <h4>Checklist de aprovação</h4>
              <p>
                A situação cadastral do CNPJ e os direitos das fotos devem ser
                conferidos pela equipe. Não há consulta automática à Receita
                Federal.
              </p>
              {Object.entries({
                logo: "Logo legível",
                texto: "Descrição sem contato indevido ou propaganda enganosa",
                cnpj: "CNPJ válido e situação ativa conferida",
                fotos: "Fotos próprias ou autorizadas",
                segmentos: "Especialidades coerentes",
              }).map(([k, label]) => (
                <label className="admin-check" key={k}>
                  <input
                    type="checkbox"
                    checked={checklist[k]}
                    disabled={!admin}
                    onChange={(e) =>
                      setChecklist({ ...checklist, [k]: e.target.checked })
                    }
                  />
                  {label}
                </label>
              ))}
              <div className="admin-actions">
                {button("Aprovar e publicar", "aprovar", { checklist }, true)}
                {button("Pedir ajuste", "ajuste")}
                {button("Recusar cadastro", "recusar", {}, true)}
                {button("Suspender empresa", "suspender", {}, true)}
                {button("Reativar para análise", "reativar", {}, true)}
                {button(
                  r.verificado
                    ? "Remover verificação"
                    : "Marcar verificação documental",
                  "verificado",
                  { valor: !r.verificado },
                  true,
                )}
              </div>
              <label>
                Motivo da decisão
                <textarea
                  value={reason}
                  maxLength={2000}
                  rows={3}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Obrigatório para ajuste, recusa, suspensão e ações de exceção."
                />
              </label>
              <div className="admin-actions">
                {button("Visualizar como fornecedor (leitura)", "leitura")}
                {!demo && admin && (
                  <Link to={base + "/fornecedores/" + r.id + "/editar"}>
                    Editar perfil completo
                  </Link>
                )}
                {button(
                  "Reenviar convite ao proprietário",
                  "convidar",
                  {},
                  true,
                )}
              </div>
              <details>
                <summary>Ações administrativas de exceção</summary>
                <p>
                  Registro manual, sem cobrança automática. Motivo obrigatório
                  para concessão de plano, crédito e extensão de teste.
                  Assinatura paga vigente prevalece.
                </p>
                <label>
                  Concessão de plano
                  <select
                    value={String(extra.plano)}
                    onChange={(e) =>
                      setExtra({ ...extra, plano: e.target.value })
                    }
                  >
                    {["gratuito", "premium", "destaque"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Validade da concessão
                  <input
                    type="datetime-local"
                    required
                    value={String(extra.ate || "")}
                    onChange={(e) =>
                      setExtra({ ...extra, ate: e.target.value })
                    }
                  />
                </label>
                {button(
                  "Atualizar plano",
                  "plano",
                  { plano: extra.plano, ate: extra.ate },
                  true,
                )}
                <label>
                  Dias adicionais
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={Number(extra.dias)}
                    onChange={(e) =>
                      setExtra({ ...extra, dias: Number(e.target.value) })
                    }
                  />
                </label>
                {button(
                  "Estender teste",
                  "estender_teste",
                  { dias: extra.dias },
                  true,
                )}
                <label>
                  Ajuste de créditos
                  <input
                    type="number"
                    min={-10000}
                    max={10000}
                    value={Number(extra.quantidade)}
                    onChange={(e) =>
                      setExtra({ ...extra, quantidade: Number(e.target.value) })
                    }
                  />
                </label>
                {button(
                  "Registrar ajuste de créditos",
                  "creditos",
                  { quantidade: extra.quantidade },
                  true,
                )}
              </details>
            </>
          )}
          {kind === "usuarios" && (
            <>
              <div className="admin-actions">
                {button(
                  r.ativo ? "Desativar conta" : "Reativar conta",
                  "ativo",
                  { valor: !r.ativo },
                  true,
                )}
                {button(
                  "Forçar redefinição de senha",
                  "redefinir_senha",
                  {},
                  true,
                )}
                {button("Reenviar confirmação", "confirmacao", {}, true)}
              </div>
              <label>
                Papel
                <select
                  value={String(extra.papel)}
                  onChange={(e) =>
                    setExtra({ ...extra, papel: e.target.value })
                  }
                >
                  {[
                    "admin",
                    "editor",
                    "comercial",
                    "fornecedor",
                    "sindico",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <div className="admin-actions">
                {button(
                  "Conceder papel",
                  "papel",
                  { papel: extra.papel, valor: true },
                  true,
                )}
                {button(
                  "Remover papel",
                  "papel",
                  { papel: extra.papel, valor: false },
                  true,
                )}
              </div>
              <p>
                O último administrador ativo não pode perder o papel nem ser
                desativado.
              </p>
            </>
          )}
          {kind === "pedidos" && (
            <>
              <ol>
                <li>Enviado: {date(r.criado_em)}</li>
                {!!r.visto_em && <li>Visto: {date(r.visto_em)}</li>}
                {!!r.respondido_em && (
                  <li>Respondido: {date(r.respondido_em)}</li>
                )}
              </ol>
              <div className="admin-actions">
                {button("Marcar spam", "spam", {}, true)}
                {button("Reenviar ao fornecedor", "reenviar", {}, true)}
              </div>
              <CompanyPicker
                label="Empresa destinatária"
                value={String(extra.fornecedor_id)}
                onChange={(fornecedor_id) =>
                  setExtra({ ...extra, fornecedor_id })
                }
                demo={demo}
                role={role}
                segmentId={String(r.segmento_id || "")}
                publicOnly
              />
              <label>
                Motivo do encaminhamento
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </label>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={!!extra.consentimento_confirmado}
                  onChange={(e) =>
                    setExtra({
                      ...extra,
                      consentimento_confirmado: e.target.checked,
                    })
                  }
                />
                Confirmei a autorização do solicitante para compartilhar com
                este destinatário.
              </label>
              {button(
                "Encaminhar para empresa da mesma especialidade",
                "encaminhar",
                extra,
                true,
              )}
            </>
          )}
          {kind === "segmentos" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(r.id, "salvar", extra);
              }}
            >
              <label>
                Nome da especialidade
                <input
                  required
                  maxLength={120}
                  value={String(extra.nome)}
                  onChange={(e) => setExtra({ ...extra, nome: e.target.value })}
                />
              </label>
              <label>
                Grupo
                <select
                  value={String(extra.grupo)}
                  onChange={(e) =>
                    setExtra({ ...extra, grupo: e.target.value })
                  }
                >
                  {taxonomy.groups.map((x) => (
                    <option key={x.slug} value={x.slug}>
                      {x.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Prioridade de exibição
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={Number(extra.ordem)}
                  onChange={(e) =>
                    setExtra({ ...extra, ordem: Number(e.target.value) })
                  }
                />
              </label>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={!!extra.ativo}
                  onChange={(e) =>
                    setExtra({ ...extra, ativo: e.target.checked })
                  }
                />
                Especialidade ativa
              </label>
              <div className="admin-actions">
                {button("Subir especialidade", "mover", { direcao: "subir" })}
                {button("Descer especialidade", "mover", { direcao: "descer" })}
                <button disabled={!admin || busy}>Salvar especialidade</button>
                {button("Excluir especialidade sem uso", "excluir", {}, true)}
              </div>
            </form>
          )}
          {kind === "alteracoes" && (
            <>
              <div className="admin-comparison">
                <div>
                  <h4>Antes</h4>
                  <p>{text(r.antes)}</p>
                </div>
                <div>
                  <h4>Solicitado</h4>
                  <p>{text(r.depois)}</p>
                </div>
              </div>
              <label>
                Motivo da recusa
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <div className="admin-actions">
                {button("Aprovar alteração", "aprovar", {}, true)}
                {button("Recusar alteração", "recusar", {}, true)}
              </div>
            </>
          )}
          {kind === "reivindicacoes" && (
            <>
              <p>
                Revise a documentação de propriedade antes de transferir o
                acesso. A transferência volta o perfil para análise.
              </p>
              <label>
                Motivo da decisão
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <div className="admin-actions">
                {button("Aprovar reivindicação", "aprovar", {}, true)}
                {button("Recusar reivindicação", "recusar", {}, true)}
              </div>
            </>
          )}
          {kind === "auditoria" && (
            <div className="admin-comparison">
              <div>
                <h4>Antes</h4>
                <pre>{JSON.stringify(r.antes, null, 2)}</pre>
              </div>
              <div>
                <h4>Depois</h4>
                <pre>{JSON.stringify(r.depois, null, 2)}</pre>
              </div>
            </div>
          )}
          {kind === "configuracoes" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(r.id, "salvar", { valor: config });
              }}
            >
              {Object.entries(config).map(([k, v]) =>
                typeof v === "boolean" ? (
                  <label className="admin-check" key={k}>
                    <input
                      type="checkbox"
                      checked={v}
                      onChange={(e) =>
                        setConfig({ ...config, [k]: e.target.checked })
                      }
                    />
                    {k.replaceAll("_", " ")}
                  </label>
                ) : (
                  <label key={k}>
                    {k.replaceAll("_", " ")}
                    <input
                      type={typeof v === "number" ? "number" : "text"}
                      value={String(v)}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          [k]:
                            typeof v === "number"
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                    />
                  </label>
                ),
              )}
              <button disabled={!admin || busy}>Salvar configuração</button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
function ErrorState({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="admin-error">
      <p>
        Não foi possível carregar os dados. Verifique sua sessão e tente
        novamente.
      </p>
      <button onClick={retry}>Tentar novamente</button>
    </div>
  );
}
