import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listSuppliers, loadSupplier } from "../features/suppliers/api";
import { diagnosis, completeness } from "../features/suppliers/model";
import {
  metrics,
  interests,
  interest,
  interestUpdate,
  reviews,
} from "../features/growth/api";
import {
  services,
  eventNames,
  today,
  previousMonth,
  type Interest,
} from "../features/growth/model";
import { ReviewCards } from "../features/growth/Reviews";
import {
  growthDemo,
  writeGrowth,
  resetGrowth,
  sampleMetrics,
} from "../features/growth/demo";
import "../features/growth/growth.css";
type View = "metricas" | "avaliacoes" | "diagnostico" | "cresca" | "marketing";
const labels: Record<View, string> = {
  metricas: "Métricas",
  avaliacoes: "Avaliações",
  diagnostico: "Diagnóstico",
  cresca: "Cresça com a gente",
  marketing: "Interesses de marketing",
};
export default function GrowthPage({
  demo = false,
  admin = false,
  view = "metricas",
}: {
  demo?: boolean;
  admin?: boolean;
  view?: View;
}) {
  const client = useQueryClient(),
    [sid, setSid] = useState(""),
    [from, setFrom] = useState(previousMonth),
    [to, setTo] = useState(today),
    [message, setMessage] = useState(""),
    [page, setPage] = useState(1),
    [premium, setPremium] = useState(true);
  const companies = useQuery({
      queryKey: ["growth-companies", demo],
      queryFn: () => listSuppliers(demo ? "demo" : "live"),
      enabled: !admin,
    }),
    id = admin
      ? ""
      : demo
        ? "demo-company-0"
        : sid || companies.data?.[0]?.id || "",
    draftId = demo ? companies.data?.[0]?.id || "" : id;
  const published = useQuery({
      queryKey: ["reviews", demo, "fornecedor", id, 1],
      queryFn: () => reviews(id, "fornecedor", 1, demo),
      enabled: !admin && !!id,
    }),
    profile = useQuery({
      queryKey: ["growth-profile", demo, draftId, published.data?.publicadas],
      queryFn: () => loadSupplier(demo ? "demo" : "live", draftId),
      enabled: !admin && !!draftId,
    });
  const draft = profile.data
      ? {
          ...profile.data,
          avaliacoes_publicadas: published.data?.publicadas || 0,
        }
      : null,
    score = draft ? completeness(draft) : 0;
  const stats = useQuery({
    queryKey: ["growth-metrics", demo, admin, id, from, to],
    queryFn: () => metrics(admin ? null : id, from, to, demo),
    enabled:
      (admin || !!id) && view === "metricas" && !!from && !!to && from <= to,
  });
  const crm = useQuery({
    queryKey: ["growth-interests", demo, admin, id, page],
    queryFn: () => interests(admin ? null : id, page, demo),
    enabled: (admin || !!id) && (view === "cresca" || view === "marketing"),
  });
  useEffect(() => {
    if (demo) setPremium(growthDemo().premium);
    const update = () => {
      void client.invalidateQueries({ queryKey: ["growth-metrics"] });
      void client.invalidateQueries({ queryKey: ["growth-interests"] });
    };
    window.addEventListener("patri:growth", update);
    return () => window.removeEventListener("patri:growth", update);
  }, [demo, client]);
  useEffect(() => {
    setPage(1);
  }, [view, id]);
  const base = demo ? "/demonstracao-crescimento" : "/painel",
    views: View[] = admin
      ? ["metricas", "avaliacoes", "marketing"]
      : ["metricas", "avaliacoes", "diagnostico", "cresca"];
  const path = (v: View) =>
    admin
      ? demo
        ? v === "avaliacoes"
          ? "/demonstracao-moderacao"
          : v === "marketing"
            ? "/demonstracao-marketing"
            : "/demonstracao-metricas-admin"
        : "/admin/" + v
      : demo
        ? base + (v === "metricas" ? "" : "/" + v)
        : base + "/" + v;
  return (
    <section className="container growth-page">
      <div className="growth-heading">
        <div>
          <span className="eyebrow">
            PATRI REALTY ·{" "}
            {admin ? "GESTÃO DO PORTAL" : "EVOLUÇÃO DA SUA PRESENÇA"}
          </span>
          <h1>{labels[view]}</h1>
          <p>
            {view === "metricas"
              ? "Entenda os resultados e acompanhe a evolução do seu alcance."
              : view === "avaliacoes"
                ? "Confiança construída com experiências e respostas transparentes."
                : view === "diagnostico"
                  ? "Um roteiro claro para completar sua apresentação no portal."
                  : "Apoio para valorizar sua presença e gerar novas oportunidades."}
          </p>
        </div>
        <Link
          to={
            demo
              ? admin
                ? "/demonstracao-admin"
                : "/demonstracao"
              : admin
                ? "/admin"
                : "/painel"
          }
        >
          Voltar ao painel
        </Link>
      </div>
      {demo && (
        <div className="growth-notice">
          <strong>Demonstração com dados fictícios</strong>
          <p>
            As simulações ficam neste navegador. Nenhuma conta, cobrança ou
            mensagem externa é criada.
          </p>
          <div className="growth-actions">
            <button
              onClick={() => {
                resetGrowth();
                setPremium(true);
                setMessage("Simulação reiniciada.");
                void client.invalidateQueries({ queryKey: ["reviews"] });
              }}
            >
              Reiniciar simulação
            </button>
            {!admin && (
              <button
                onClick={() => {
                  const s = growthDemo();
                  s.premium = !s.premium;
                  writeGrowth(s);
                  setPremium(s.premium);
                }}
              >
                Simular plano {premium ? "Grátis" : "Premium"}
              </button>
            )}
            <button
              onClick={() => {
                sampleMetrics();
                setMessage(
                  "Exemplo de resultados gerado. Os números são fictícios.",
                );
              }}
            >
              Gerar exemplo de resultados
            </button>
          </div>
          <div className="growth-actions">
            <Link to="/demonstracao-avaliacoes">
              Avaliar fornecedor fictício
            </Link>
            <Link to="/demonstracao-moderacao">Moderação demonstrativa</Link>
            <Link to="/demonstracao-marketing">Comercial demonstrativo</Link>
          </div>
        </div>
      )}
      <nav className="growth-nav" aria-label="Resultados e reputação">
        {views.map((v) => (
          <Link
            to={path(v)}
            key={v}
            aria-current={view === v ? "page" : undefined}
          >
            {labels[v]}
          </Link>
        ))}
      </nav>
      {!admin && !demo && companies.data && companies.data.length > 1 && (
        <label>
          Empresa
          <select value={id} onChange={(e) => setSid(e.target.value)}>
            {companies.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome_fantasia}
              </option>
            ))}
          </select>
        </label>
      )}
      {message && (
        <p role="status" className="growth-notice">
          {message}
        </p>
      )}
      {!admin && companies.isError && (
        <p role="alert">Não foi possível carregar sua empresa.</p>
      )}
      {!admin && companies.isSuccess && !companies.data.length && (
        <p>Não há empresa vinculada à sua conta.</p>
      )}
      {view === "avaliacoes" && (admin || id) && (
        <>
          {admin && (
            <p>
              Revise avaliações pendentes e denunciadas. Remova dados pessoais,
              ofensas ou propaganda antes de publicar. A remoção exige motivo.
            </p>
          )}
          <ReviewCards
            key={id}
            sid={id}
            mode={admin ? "admin" : "fornecedor"}
            demo={demo}
          />
        </>
      )}
      {view === "metricas" && (
        <>
          <div className="growth-filters">
            <label>
              De
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Até
              <input
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button onClick={() => void stats.refetch()}>
              Atualizar métricas
            </button>
          </div>
          <p>
            Agregados atualizados pela rotina diária. A coleta respeita o
            consentimento para análises; estes números não representam
            visitantes únicos.
          </p>
          {stats.isFetching ? (
            <p role="status">Consultando métricas…</p>
          ) : stats.isError ? (
            <p role="alert">
              Não foi possível consultar as métricas. Confira o período e tente
              atualizar.
            </p>
          ) : stats.data?.bloqueado ? (
            <div className="growth-locked">
              <div className="blur" aria-hidden="true">
                — — — —
              </div>
              <h2>Conheça os resultados da sua presença</h2>
              <p>
                Visitas, cliques e comparação de períodos estão disponíveis nos
                planos Premium e Destaque.
              </p>
              <Link to={demo ? "/demonstracao-plano" : "/painel/plano"}>
                Conhecer planos
              </Link>
            </div>
          ) : stats.data ? (
            <>
              <p>
                As contagens de interação dependem da autorização de análises e
                podem ser parciais. Consulte a caixa de orçamentos para
                acompanhar os pedidos registrados. Cliques em telefone ou
                WhatsApp não confirmam conversa, qualificação ou contratação.
              </p>
              <div className="growth-metrics">
                {Object.entries(eventNames)
                  .filter(
                    ([type]) =>
                      admin ||
                      !["busca", "impressao_banner", "clique_banner"].includes(
                        type,
                      ),
                  )
                  .map(([type, label]) => (
                    <div className="growth-metric" key={type}>
                      <span>{label}</span>
                      <strong>{stats.data?.atual?.[type] || 0}</strong>
                      <small>
                        Período anterior: {stats.data?.anterior?.[type] || 0}
                      </small>
                    </div>
                  ))}
              </div>
              {stats.data.queda_visitas !== null &&
                stats.data.queda_visitas !== undefined && (
                  <p>
                    Variação de visitas: {stats.data.queda_visitas}% em relação
                    ao período anterior de mesma duração.
                  </p>
                )}
              {!admin &&
                stats.data.queda_visitas !== null &&
                Number(stats.data.queda_visitas) <= -30 && (
                  <Specialist
                    to={path("cresca")}
                    reason="Suas visitas caíram 30% ou mais. Podemos ajudar a revisar sua presença."
                  />
                )}
              <MetricChart rows={stats.data.diario} />
              <div className="growth-actions">
                <button
                  onClick={() => {
                    const csv = [
                      "data;evento;quantidade",
                      ...stats.data!.diario.map(
                        (d) => `${d.dia};${d.tipo};${d.quantidade}`,
                      ),
                    ].join("\n");
                    const u = URL.createObjectURL(
                      new Blob(["\uFEFF" + csv], {
                        type: "text/csv;charset=utf-8",
                      }),
                    );
                    const a = document.createElement("a");
                    a.href = u;
                    a.download = "metricas.csv";
                    a.click();
                    URL.revokeObjectURL(u);
                  }}
                >
                  Exportar métricas CSV
                </button>
                <button onClick={() => window.print()}>
                  Imprimir relatório
                </button>
              </div>
            </>
          ) : null}
        </>
      )}
      {view === "diagnostico" &&
        (profile.isPending ? (
          <p role="status">Carregando diagnóstico…</p>
        ) : draft ? (
          <>
            <strong className="growth-score">{score} / 100</strong>
            <p>
              A pontuação considera os dados atuais, incluindo avaliações
              publicadas. Remover fotos, serviços ou outros itens reduz os
              pontos correspondentes.
            </p>
            <ul className="growth-checklist">
              {diagnosis(draft).map((item) => (
                <li key={item.label}>
                  <span>
                    {item.label}
                    <br />
                    <small>
                      {item.done ? "Concluído" : "Ainda pode melhorar"}
                    </small>
                  </span>
                  <strong>
                    {item.done ? item.points : 0} / {item.points}
                  </strong>
                </li>
              ))}
            </ul>
            <Link to={demo ? "/demonstracao" : "/painel"}>
              Completar meu perfil
            </Link>
            {score < 60 && (
              <Specialist
                to={path("cresca")}
                reason="Seu perfil está abaixo de 60 pontos. Conte com ajuda para completar sua apresentação."
              />
            )}
          </>
        ) : (
          <p>Não foi possível carregar o perfil.</p>
        ))}
      {(view === "cresca" || view === "marketing") && (
        <>
          {view === "cresca" && (
            <div className="growth-layout">
              {Object.entries(services).map(([key, label]) => (
                <MarketingForm
                  key={key}
                  service={key}
                  label={label}
                  sid={id}
                  demo={demo}
                />
              ))}
            </div>
          )}
          <h2>{admin ? "Solicitações recebidas" : "Minhas solicitações"}</h2>
          {crm.isPending ? (
            <p role="status">Carregando solicitações…</p>
          ) : crm.isError ? (
            <p role="alert">Não foi possível carregar as solicitações.</p>
          ) : crm.data?.items.length ? (
            <div className="growth-cards">
              {crm.data.items.map((i) => (
                <InterestCard key={i.id} row={i} admin={admin} demo={demo} />
              ))}
            </div>
          ) : (
            <p className="growth-empty">Nenhuma solicitação por enquanto.</p>
          )}
          <div className="growth-actions">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
            <span>Página {page}</span>
            <button
              disabled={page * 20 >= (crm.data?.total || 0)}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </section>
  );
}
function Specialist({ to, reason }: { to: string; reason: string }) {
  return (
    <aside className="growth-notice">
      <h2>Falar com um especialista</h2>
      <p>{reason}</p>
      <Link to={to}>Conhecer o apoio disponível</Link>
    </aside>
  );
}
function MarketingForm({
  service,
  label,
  sid,
  demo,
}: {
  service: string;
  label: string;
  sid: string;
  demo: boolean;
}) {
  const [phone, setPhone] = useState(""),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    client = useQueryClient();
  return (
    <form
      className="growth-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await interest(sid, service, body, phone.replace(/\D/g, ""), demo);
          setMessage(
            "Interesse registrado. A equipe comercial poderá entrar em contato sobre esta solicitação.",
          );
          await client.invalidateQueries({ queryKey: ["growth-interests"] });
        } catch (e) {
          setMessage((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{label}</h2>
      <p>
        {service === "perfil"
          ? "Organização dos textos, imagens e informações da sua página."
          : service === "redes"
            ? "Planejamento e acompanhamento da presença nas redes sociais."
            : service === "campanha"
              ? "Apoio no planejamento de campanhas para gerar oportunidades."
              : "Um plano integrado para apresentar e posicionar sua empresa."}
      </p>
      <label>
        WhatsApp para retorno
        <input
          type="tel"
          required
          inputMode="tel"
          maxLength={20}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      <label>
        O que você busca?
        <textarea
          maxLength={1000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <button className="primary" disabled={busy || !sid}>
        Quero saber mais
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
function InterestCard({
  row: r,
  admin,
  demo,
}: {
  row: Interest;
  admin: boolean;
  demo: boolean;
}) {
  const [status, setStatus] = useState(r.status),
    [notes, setNotes] = useState(r.notas),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    client = useQueryClient();
  return (
    <article className="growth-card">
      <h3>{services[r.servico as keyof typeof services]}</h3>
      <p>
        {r.empresa} · {r.status} ·{" "}
        {new Date(r.criado_em).toLocaleDateString("pt-BR")}
      </p>
      <p>{r.mensagem}</p>
      <p>Retorno solicitado: {r.whatsapp}</p>
      {admin && (
        <form
          className="growth-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await interestUpdate(r.id, status, notes, demo);
              setMessage("Acompanhamento atualizado.");
              await client.invalidateQueries({
                queryKey: ["growth-interests"],
              });
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Status
            <select
              aria-label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {["novo", "em_contato", "proposta", "fechado"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Notas internas
            <textarea
              value={notes}
              maxLength={3000}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button disabled={busy}>Salvar acompanhamento</button>
          {message && <p role="status">{message}</p>}
        </form>
      )}
    </article>
  );
}
function MetricChart({
  rows,
}: {
  rows: { dia: string; tipo: string; quantidade: number }[];
}) {
  const dates = [...new Set(rows.map((d) => d.dia))].sort(),
    values = dates.map((d) => ({
      dia: d,
      n: rows
        .filter((x) => x.dia === d && x.tipo === "visualizacao_perfil")
        .reduce((a, x) => a + x.quantidade, 0),
    })),
    max = Math.max(1, ...values.map((v) => v.n));
  return (
    <div className="growth-panel">
      <h2>Visitas por dia</h2>
      {!dates.length ? (
        <p>Sem eventos no período selecionado.</p>
      ) : (
        <>
          <div
            className="growth-chart"
            role="img"
            aria-label="Gráfico de visitas ao perfil; os valores estão na tabela abaixo"
          >
            {values.map((v) => (
              <div
                key={v.dia}
                style={{ height: Math.max(2, (v.n / max) * 100) + "%" }}
                title={v.dia + ": " + v.n}
              />
            ))}
          </div>
          <p className="growth-chart-caption">
            De {dates[0]} a {dates[dates.length - 1]}
          </p>
          <details>
            <summary>Ver dados diários</summary>
            <table className="growth-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Evento</th>
                  <th>Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.dia + d.tipo}>
                    <td>{d.dia}</td>
                    <td>{eventNames[d.tipo] || d.tipo}</td>
                    <td>{d.quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </div>
  );
}
