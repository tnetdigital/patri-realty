import { Link } from "react-router-dom";
import { unlockQuote } from "../shared/api";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listLeads, manageLead } from "./api";
import { statuses, readDemo, writeDemo, type Lead } from "./model";
import "./quotations.css";
export function QuotationInbox({
  supplierId,
  demo,
}: {
  supplierId: string;
  demo: boolean;
}) {
  const client = useQueryClient(),
    key = ["leads", demo, supplierId];
  const q = useQuery({
    queryKey: key,
    queryFn: () => listLeads(supplierId, demo),
    refetchInterval: 60000,
  });
  const [selected, setSelected] = useState(""),
    [filter, setFilter] = useState(""),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lead = q.data?.find((x) => x.id === selected);
  useEffect(() => {
    setSelected("");
    setText("");
  }, [supplierId]);
  useEffect(() => {
    const update = () => client.invalidateQueries({ queryKey: ["leads"] });
    window.addEventListener("storage", update);
    window.addEventListener("patri:leads", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("patri:leads", update);
    };
  }, [client]);
  async function action(id: string, kind: string) {
    setError("");
    setBusy(true);
    try {
      if (kind === "unlock") {
        const r = await unlockQuote(id);
        if (r.error) throw Error(r.error.message);
        await client.invalidateQueries({ queryKey: ["billing"] });
      } else await manageLead(id, kind, text, demo);
      if (kind === "nota") setText("");
      await client.invalidateQueries({ queryKey: key });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar pedido.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="supplier-section quotation-inbox">
      <span className="eyebrow">BOAS CONEXÕES, NOVAS OPORTUNIDADES</span>
      <h2>Pedidos de orçamento</h2>
      <p>
        Consulte os pedidos, responda pelos contatos informados e registre o
        acompanhamento.
      </p>
      {demo && (
        <aside className="directory-demo">
          <strong>Caixa de demonstração</strong>
          <p>
            Somente pedidos simulados neste navegador. Não representam
            oportunidades reais e não enviam e-mails.
          </p>
          <button
            onClick={() => {
              const now = Date.now();
              writeDemo(
                readDemo().map((x) =>
                  ["novo", "visto"].includes(x.status)
                    ? {
                        ...x,
                        status: "sem_resposta",
                        criado_em: new Date(now - 49 * 3600000).toISOString(),
                      }
                    : x,
                ),
              );
            }}
          >
            Simular passagem de 48 horas
          </button>
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Apagar todos os pedidos simulados deste navegador?",
                )
              ) {
                writeDemo([]);
                setSelected("");
              }
            }}
          >
            Apagar simulações
          </button>
        </aside>
      )}
      <label>
        Filtrar por status
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Todos os pedidos</option>
          {Object.entries(statuses).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="quote-error">
          {error}
        </p>
      )}
      {q.isPending ? (
        <p role="status">Carregando pedidos…</p>
      ) : q.isError ? (
        <div role="alert">
          <p>Não foi possível carregar os pedidos.</p>
          <button onClick={() => q.refetch()}>Tentar novamente</button>
        </div>
      ) : (
        <div className="quote-inbox-layout">
          <div className="quote-list">
            {q.data
              .filter((x) => !filter || x.status === filter)
              .map((x) => (
                <button
                  key={x.id}
                  className={selected === x.id ? "selected" : ""}
                  disabled={busy}
                  onClick={() => {
                    setSelected(x.id);
                    setText("");
                    if (x.status !== "bloqueado_plano")
                      void action(x.id, "visto");
                  }}
                >
                  <strong>{x.condominio_nome || "Contato bloqueado"}</strong>
                  <span>
                    {x.cidade} · {x.uf}
                  </span>
                  <span>{statuses[x.status]}</span>
                  <time>{new Date(x.criado_em).toLocaleString("pt-BR")}</time>
                </button>
              ))}
            {!q.data.some((x) => !filter || x.status === filter) && (
              <p>
                Nenhum pedido neste filtro.
                {demo
                  ? " Simule um pedido em um perfil do guia para começar."
                  : ""}
              </p>
            )}
          </div>
          {lead ? (
            <LeadDetail
              lead={lead}
              busy={busy}
              action={action}
              text={text}
              setText={setText}
            />
          ) : (
            <p className="quote-detail-placeholder">
              Selecione um pedido para ver os detalhes.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
function LeadDetail({
  lead: l,
  busy,
  action,
  text,
  setText,
}: {
  lead: Lead;
  busy: boolean;
  action: (id: string, kind: string) => Promise<void>;
  text: string;
  setText: (v: string) => void;
}) {
  return (
    <article className="quote-detail">
      <span className="eyebrow">{statuses[l.status]}</span>
      <h3>{l.condominio_nome || "Pedido de orçamento"}</h3>
      {l.empresa && <p>Destinatário: {l.empresa}</p>}
      <p>
        {l.cidade} · {l.uf} · {l.unidades} unidades
      </p>
      {l.status === "bloqueado_plano" ? (
        <div>
          <p>Os contatos deste pedido estão bloqueados pelo plano.</p>
          <button
            disabled={busy}
            onClick={() => {
              if (window.confirm("Usar 1 crédito para liberar este contato?"))
                void action(l.id, "unlock");
            }}
          >
            Liberar por 1 crédito
          </button>
          <Link to="/painel/plano">Ver planos e comprar créditos</Link>
        </div>
      ) : (
        <>
          <p>
            <strong>{l.nome}</strong>
            <br />
            {l.email}
            <br />
            {l.telefone}
          </p>
          <div className="quote-contact-actions">
            <a href={"mailto:" + l.email}>Responder por e-mail</a>
            <a
              href={
                "https://wa.me/" +
                (l.telefone.length <= 11 ? "55" : "") +
                l.telefone
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              Responder no WhatsApp
            </a>
          </div>
          <p>
            Prazo:{" "}
            {l.urgencia === "urgente"
              ? "Urgente"
              : l.urgencia === "30_dias"
                ? "Próximos 30 dias"
                : "Planejamento"}
          </p>
          <p className="directory-prose">{l.mensagem}</p>
          <ol className="quote-timeline">
            <li>Recebido: {new Date(l.criado_em).toLocaleString("pt-BR")}</li>
            {l.visto_em && (
              <li>Visto: {new Date(l.visto_em).toLocaleString("pt-BR")}</li>
            )}
            {l.respondido_em && (
              <li>
                Resposta registrada:{" "}
                {new Date(l.respondido_em).toLocaleString("pt-BR")}
              </li>
            )}
          </ol>
          <p className="muted">
            Abrir um contato não registra uma resposta. Marque abaixo depois de
            responder ao solicitante.
          </p>
          <div className="quote-contact-actions">
            <button
              disabled={
                busy || l.status === "respondido" || l.status === "spam"
              }
              onClick={() => void action(l.id, "respondido")}
            >
              Marcar como respondido
            </button>
            <button
              disabled={busy || l.status === "spam"}
              onClick={() => {
                if (window.confirm("Marcar este pedido como spam?"))
                  void action(l.id, "spam");
              }}
            >
              Marcar spam
            </button>
          </div>
          <h4>Notas internas</h4>
          <p className="muted">
            Visíveis somente à equipe desta empresa e à administração.
          </p>
          {l.notas.map((n) => (
            <blockquote key={n.id}>
              <p>{n.texto}</p>
              <time>{new Date(n.criado_em).toLocaleString("pt-BR")}</time>
            </blockquote>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action(l.id, "nota");
            }}
          >
            <label>
              Nova nota
              <textarea
                value={text}
                maxLength={2000}
                rows={3}
                onChange={(e) => setText(e.target.value)}
                required
              />
            </label>
            <button disabled={busy || !text.trim()}>Salvar nota</button>
          </form>
        </>
      )}
    </article>
  );
}
