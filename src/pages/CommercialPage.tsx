import { CommercialCalendar } from "../features/commercial/CommercialCalendar";
import { demoSuppliers } from "../features/directory/fixtures";
import { BannerUpload } from "../features/commercial/BannerUpload";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CompanyPicker } from "../features/admin/CompanyPicker";
import {
  useDirectoryRuntime,
  directoryCatalog,
} from "../features/directory/api";
import {
  listCommercial,
  saveCommercial,
  reportLink,
} from "../features/commercial/api";
import { resetCommercialDemo } from "../features/commercial/demo";
import {
  dateTime,
  money,
  type Row,
  type Catalog,
} from "../features/commercial/model";
import { AdSlot } from "../features/commercial/AdSlot";
import "../features/admin/admin.css";
import "../features/commercial/commercial.css";
const names = {
  contratos: "Contratos",
  banners: "Banners",
  destaques: "Destaques",
  precos: "Preços",
};
type Tab = keyof typeof names;
const iso = (v: unknown) => new Date(String(v)).toISOString();
function blank(tab: Tab): Record<string, unknown> {
  return {
    anunciante_nome: "",
    fornecedor_id: "",
    produto: "banner",
    valor_centavos: 0,
    contrato_id: "",
    posicao_id: "",
    imagem_desktop: "",
    imagem_mobile: "",
    link_destino: "",
    segmento_id: "",
    uf: "",
    cidade_id: "",
    vaga: 1,
    inicio: dateTime(new Date().toISOString()),
    fim: dateTime(new Date(Date.now() + 28 * 86400000).toISOString()),
    status:
      tab === "contratos"
        ? "proposta"
        : tab === "destaques"
          ? "pausado"
          : "rascunho",
    pago: false,
    observacao: "",
  };
}
export default function CommercialPage({ demo = false }: { demo?: boolean }) {
  const runtime = useDirectoryRuntime(),
    r = demo ? { ...runtime, source: "demo" as const } : runtime,
    client = useQueryClient(),
    [tab, setTab] = useState<Tab>("contratos"),
    [page, setPage] = useState(1),
    [contractPage, setContractPage] = useState(1),
    [draft, setDraft] = useState<Record<string, unknown>>(() =>
      blank("contratos"),
    ),
    [editing, setEditing] = useState<string | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [link, setLink] = useState("");
  const cat = useQuery({
      queryKey: ["commercial", demo, "catalogo"],
      queryFn: () => listCommercial("catalogo", 1, demo) as Promise<Catalog>,
    }),
    rows = useQuery({
      queryKey: ["commercial", demo, tab, page],
      queryFn: () =>
        listCommercial(
          tab === "precos" ? "contratos" : tab,
          page,
          demo,
        ) as Promise<{ items: Row[]; total: number }>,
    }),
    contracts = useQuery({
      queryKey: ["commercial", demo, "contracts", contractPage],
      queryFn: () =>
        listCommercial("contratos", contractPage, demo) as Promise<{
          items: Row[];
          total: number;
        }>,
    }),
    directory = useQuery({
      queryKey: ["commercial-directory", r.source, String(draft.uf || "")],
      queryFn: () => directoryCatalog(r, String(draft.uf || "")),
      placeholderData: (previous) => previous,
    });
  const products = cat.data?.produtos || [],
    positions = cat.data?.posicoes || [],
    segments = directory.data?.segmentos || [];
  const set = (key: string, value: unknown) =>
    setDraft((p) => ({
      ...p,
      [key]: value,
      ...(key === "uf" ? { cidade_id: "" } : {}),
    }));
  function select(t: Tab) {
    setTab(t);
    setPage(1);
    setEditing(null);
    setDraft(blank(t));
    setMessage("");
    setLink("");
  }
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const kind =
          tab === "contratos"
            ? "contrato"
            : tab === "banners"
              ? "banner"
              : "destaque",
        p: Record<string, unknown> = {
          ...draft,
          inicio: iso(draft.inicio),
          fim: iso(draft.fim),
        };
      if (kind === "destaque") p.vaga = Number(p.vaga);
      await saveCommercial(kind, editing, p, demo);
      setMessage("Salvo com sucesso.");
      setEditing(null);
      setDraft(blank(tab));
      await client.invalidateQueries({ queryKey: ["commercial"] });
      await client.invalidateQueries({ queryKey: ["banners"] });
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : (e as { message: string }).message || "Não foi possível salvar.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function token(id: string, op: string) {
    try {
      const value = await reportLink(id, op, demo);
      setLink(
        value
          ? `${location.origin}${r.hashRouting || location.hash.startsWith("#/") ? "/#" : ""}/${demo ? "demonstracao-relatorio" : "relatorio"}/${value}`.replace(
              " /",
              "/",
            )
          : "",
      );
      setMessage(
        op === "revogar"
          ? "Link revogado."
          : "Link gerado por 90 dias. Gerar outro invalida o anterior.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  const field = (
    key: string,
    label: string,
    type = "text",
    required = false,
  ) => (
    <label key={key}>
      {label}
      <input
        type={type}
        step={type === "datetime-local" ? 1 : undefined}
        required={required}
        value={
          type === "datetime-local" && draft[key]
            ? dateTime(String(draft[key]))
            : String(draft[key] ?? "")
        }
        onChange={(e) =>
          set(key, type === "number" ? Number(e.target.value) : e.target.value)
        }
        min={type === "number" ? 0 : undefined}
      />
    </label>
  );
  const options = (
    key: string,
    label: string,
    values: { id: string; nome: string }[],
    optional = false,
  ) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={String(draft[key] || "")}
        required={!optional}
        onChange={(e) => set(key, e.target.value)}
      >
        <option value="">
          {optional ? "Todas / não vincular" : "Selecione"}
        </option>
        {values.map((x) => (
          <option key={x.id} value={x.id}>
            {x.nome}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section className="container commercial-page">
      <CommercialCalendar demo={demo} />
      {/* Faturamento e período por listagem */}
      <div className="commercial-hero">
        <div>
          <span className="eyebrow">PATRI REALTY · COMERCIAL</span>
          <h1>Campanhas que conectam</h1>
          <p>Contratos, presença no portal e resultados em um só lugar.</p>
        </div>
        <Link
          className="action-link"
          to={demo ? "/demonstracao-admin" : "/admin"}
        >
          Administração
        </Link>
      </div>
      {demo && (
        <div className="commercial-demo">
          <strong>Demonstração comercial</strong>
          <p>
            Dados fictícios salvos neste navegador. Sem cobrança ou envio de
            mensagens.
          </p>
          <button
            onClick={() => {
              resetCommercialDemo();
              void client.invalidateQueries({ queryKey: ["commercial"] });
              void client.invalidateQueries({ queryKey: ["banners"] });
              setMessage("Demonstração reiniciada.");
            }}
          >
            Reiniciar demonstração
          </button>
        </div>
      )}
      <nav className="commercial-tabs" aria-label="Gestão comercial">
        {Object.entries(names).map(([key, label]) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            aria-pressed={tab === key}
            onClick={() => select(key as Tab)}
          >
            {label}
          </button>
        ))}
      </nav>
      {message && (
        <p className="commercial-message" role="status">
          {message}
        </p>
      )}
      {link && (
        <p className="commercial-link">
          <a href={link} referrerPolicy="no-referrer">
            Abrir relatório do anunciante
          </a>
          <br />
          {link}
          <br />
          <button
            onClick={() =>
              void navigator.clipboard
                .writeText(link)
                .then(() => setMessage("Link copiado."))
                .catch(() => setMessage("Copie o endereço acima."))
            }
          >
            Copiar link
          </button>
        </p>
      )}
      {(rows.isError || cat.isError) && (
        <p role="alert">
          Não foi possível carregar.{" "}
          <button
            onClick={() => {
              void rows.refetch();
              void cat.refetch();
            }}
          >
            Tentar novamente
          </button>
        </p>
      )}
      {tab === "precos" ? (
        <div className="commercial-cards">
          <p>
            Valores de referência. O contrato guarda o valor negociado;
            alterações aqui não geram cobranças.
          </p>
          {products.map((p) => (
            <Price
              key={p.id}
              row={p}
              demo={demo}
              onSave={() => {
                void client.invalidateQueries({ queryKey: ["commercial"] });
              }}
            />
          ))}
        </div>
      ) : (
        <div className="commercial-layout">
          <form
            className="commercial-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <h2>
              {editing ? "Editar" : "Novo"}{" "}
              {tab === "contratos"
                ? "contrato"
                : tab === "banners"
                  ? "banner"
                  : "destaque"}
            </h2>
            {tab === "contratos" ? (
              <>
                {field("anunciante_nome", "Anunciante", "text", true)}
                {options(
                  "produto",
                  "Produto",
                  products
                    .filter((p) => p.ativo)
                    .map((p) => ({ id: p.codigo, nome: p.nome })),
                )}
                {demo ? (
                  options(
                    "fornecedor_id",
                    "Fornecedor vinculado (opcional para banners)",
                    demoSuppliers.map((s) => ({
                      id: s.id,
                      nome: s.nome_fantasia,
                    })),
                    true,
                  )
                ) : (
                  <CompanyPicker
                    demo={demo}
                    role="comercial"
                    value={String(draft.fornecedor_id || "")}
                    onChange={(v) => set("fornecedor_id", v)}
                    label="Fornecedor vinculado (opcional para banners)"
                  />
                )}
                <label>
                  Valor do contrato (R$)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={Number(draft.valor_centavos || 0) / 100}
                    onChange={(e) =>
                      set(
                        "valor_centavos",
                        Math.round(Number(e.target.value) * 100),
                      )
                    }
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={!!draft.pago}
                    onChange={(e) => set("pago", e.target.checked)}
                  />
                  Pagamento confirmado manualmente
                </label>
                <label>
                  Observações
                  <textarea
                    value={String(draft.observacao || "")}
                    onChange={(e) => set("observacao", e.target.value)}
                  />
                </label>
              </>
            ) : (
              <>
                {options(
                  "contrato_id",
                  "Contrato",
                  (contracts.data?.items || [])
                    .filter(
                      (c) =>
                        c.produto ===
                        (tab === "banners" ? "banner" : "destaque"),
                    )
                    .map((c) => ({
                      id: c.id,
                      nome:
                        String(c.anunciante_nome) + " · " + String(c.status),
                    })),
                )}
                <p>
                  Contratos da página {contractPage}. Use a paginação para
                  acessar os demais.
                </p>
                <div className="commercial-actions">
                  <button
                    type="button"
                    disabled={contractPage === 1}
                    onClick={() => setContractPage((p) => p - 1)}
                  >
                    Contratos anteriores
                  </button>
                  <button
                    type="button"
                    disabled={contractPage * 25 >= (contracts.data?.total || 0)}
                    onClick={() => setContractPage((p) => p + 1)}
                  >
                    Mais contratos
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const c = contracts.data?.items.find(
                      (c) => c.id === draft.contrato_id,
                    );
                    if (c)
                      setDraft((d) => ({
                        ...d,
                        inicio: String(c.inicio),
                        fim: String(c.fim),
                        anunciante_nome: c.anunciante_nome,
                        fornecedor_id: c.fornecedor_id,
                      }));
                  }}
                >
                  Usar anunciante e vigência do contrato
                </button>
                {tab === "banners" ? (
                  <>
                    {field("anunciante_nome", "Anunciante", "text", true)}
                    {options("posicao_id", "Posição", positions)}
                    {field(
                      "imagem_desktop",
                      "Imagem desktop (URL)",
                      "url",
                      true,
                    )}
                    <BannerUpload
                      demo={demo}
                      mobile={false}
                      onUploaded={(url) => set("imagem_desktop", url)}
                    />
                    {field("imagem_mobile", "Imagem mobile (URL)", "url", true)}
                    <BannerUpload
                      demo={demo}
                      mobile
                      onUploaded={(url) => set("imagem_mobile", url)}
                    />
                    {field("link_destino", "Destino HTTPS", "url", true)}
                  </>
                ) : (
                  <>
                    {demo ? (
                      options(
                        "fornecedor_id",
                        "Fornecedor da reserva",
                        demoSuppliers.map((s) => ({
                          id: s.id,
                          nome: s.nome_fantasia,
                        })),
                        true,
                      )
                    ) : (
                      <CompanyPicker
                        demo={demo}
                        role="comercial"
                        value={String(draft.fornecedor_id || "")}
                        onChange={(v) => set("fornecedor_id", v)}
                        label="Fornecedor da reserva"
                      />
                    )}
                    {options(
                      "vaga",
                      "Vaga",
                      [1, 2, 3].map((i) => ({
                        id: String(i),
                        nome: "Vaga " + i,
                      })),
                    )}
                    <p>
                      Até três vagas por especialidade, estado e período.
                      Reservas sobrepostas são bloqueadas.
                    </p>
                  </>
                )}
                {options(
                  "segmento_id",
                  "Especialidade",
                  segments,
                  tab === "banners",
                )}
                {options(
                  "uf",
                  "Estado",
                  (directory.data?.estados || []).map((s) => ({
                    id: s.uf,
                    nome: s.nome,
                  })),
                  tab === "banners",
                )}
                {tab === "destaques" &&
                  options(
                    "cidade_id",
                    "Cidade",
                    directory.data?.cidades.filter((c) => c.uf === draft.uf) ||
                      [],
                    true,
                  )}
              </>
            )}
            {field("inicio", "Início", "datetime-local", true)}
            {field("fim", "Fim", "datetime-local", true)}
            {options(
              "status",
              "Situação",
              (tab === "contratos"
                ? ["proposta", "ativo", "encerrado", "cancelado"]
                : tab === "destaques"
                  ? ["ativo", "pausado", "encerrado"]
                  : ["rascunho", "ativo", "pausado", "encerrado"]
              ).map((x) => ({ id: x, nome: x })),
            )}
            <button
              className="primary"
              disabled={
                busy ||
                cat.isPending ||
                cat.isError ||
                (tab !== "contratos" &&
                  (directory.isPending || directory.isPlaceholderData))
              }
            >
              {busy ? "Salvando…" : "Salvar"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setDraft(blank(tab));
                }}
              >
                Cancelar edição
              </button>
            )}
          </form>
          <div className="commercial-cards">
            {rows.isPending ? (
              <p role="status">Carregando…</p>
            ) : rows.data?.items.length ? (
              rows.data.items.map((row) => (
                <article className="commercial-card" key={row.id}>
                  <span className="commercial-status">
                    {String(row.status)}
                  </span>
                  <h3>
                    {String(row.anunciante_nome || "Reserva de destaque")}
                  </h3>
                  <p>
                    {new Date(String(row.inicio)).toLocaleString("pt-BR")} até{" "}
                    {new Date(String(row.fim)).toLocaleString("pt-BR")}
                  </p>
                  {tab === "contratos" && (
                    <p>
                      {String(row.produto)} ·{" "}
                      {money(Number(row.valor_centavos))} ·{" "}
                      {row.pago ? "Pago" : "Pagamento pendente"}
                    </p>
                  )}
                  {tab === "destaques" && (
                    <p>
                      Vaga {String(row.vaga)} · {String(row.uf)} ·{" "}
                      {segments.find((s) => s.id === row.segmento_id)?.nome ||
                        "Especialidade reservada"}
                    </p>
                  )}
                  <div className="commercial-actions">
                    <button
                      onClick={() => {
                        setEditing(row.id);
                        setDraft({
                          ...row,
                          inicio: String(row.inicio),
                          fim: String(row.fim),
                        });
                      }}
                    >
                      Editar
                    </button>
                    {tab === "banners" && (
                      <>
                        <button onClick={() => void token(row.id, "gerar")}>
                          Gerar relatório
                        </button>
                        <button onClick={() => void token(row.id, "revogar")}>
                          Revogar link
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <p className="commercial-empty">
                Nenhum registro. Comece pelo contrato e depois vincule uma
                campanha.
              </p>
            )}
            <div className="commercial-actions">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span>Página {page}</span>
              <button
                disabled={page * 25 >= (rows.data?.total || 0)}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}
      {cat.data?.renovacoes.length ? (
        <aside className="commercial-message">
          <h2>Renovações nos próximos 30 dias</h2>
          {cat.data.renovacoes.map((c) => (
            <p key={c.id}>
              {c.anunciante_nome} ·{" "}
              {new Date(c.fim).toLocaleDateString("pt-BR")}
            </p>
          ))}
        </aside>
      ) : null}
      {demo && (
        <div>
          <h2>Visualização de publicidade</h2>
          <p>
            Exemplo da posição inicial. Impressões e cliques só entram nas
            métricas se você permitir análises nas preferências.
          </p>
          <AdSlot position="home_topo" demo={demo} />
        </div>
      )}
    </section>
  );
}
function Price({
  row,
  demo,
  onSave,
}: {
  row: Catalog["produtos"][number];
  demo: boolean;
  onSave: () => void;
}) {
  const [value, setValue] = useState(row.preco_centavos),
    [active, setActive] = useState(row.ativo),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="commercial-card commercial-price"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await saveCommercial(
            "preco",
            row.id,
            { preco_centavos: value, ativo: active },
            demo,
          );
          setMessage("Preço atualizado.");
          onSave();
        } catch (e) {
          setMessage((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{row.nome}</h2>
      <label>
        Preço de referência (R$){" "}
        <input
          type="number"
          min="0"
          step="0.01"
          value={value / 100}
          onChange={(e) => setValue(Math.round(Number(e.target.value) * 100))}
        />
      </label>
      <p>{value ? money(value) : "Valor ainda não definido"}</p>
      <label>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />{" "}
        Produto ativo
      </label>
      <button disabled={busy}>Salvar preço</button>
      <p role="status">{message}</p>
    </form>
  );
}
