import { retryId, clearRetry } from "../conversion/contracts";
import { currentDocumentVersion } from "../../lib/documents";
import { track } from "../growth/events";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  catalogKey,
  directoryCatalog,
  searchKey,
  searchDirectory,
  useDirectoryRuntime,
} from "../directory/api";
import type { PublicSupplier } from "../directory/model";
import { quotationSchema, type Quotation } from "./model";
import { submitQuotation } from "./api";
import "./quotations.css";
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}
export function QuotationForm({ supplier: s }: { supplier: PublicSupplier }) {
  const r = useDirectoryRuntime(),
    demo = r.source === "demo";
  const [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false),
    [fields, setFields] = useState<Record<string, string>>({}),
    [segment, setSegment] = useState(s.segmentos[0]?.id || ""),
    [copies, setCopies] = useState<string[]>([]);
  const form = useRef<HTMLFormElement>(null),
    captcha = useRef<HTMLDivElement>(null),
    widget = useRef(""),
    sending = useRef(false),
    requestId = useRef<string>(crypto.randomUUID());
  const key = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const local =
    !demo &&
    import.meta.env.VITE_QUOTATION_URL?.startsWith("http://127.0.0.1:8788/");
  const catalog = useQuery({
    queryKey: catalogKey(r),
    queryFn: () => directoryCatalog(r),
  });
  const filters = {
    segmento: s.segmentos.find((x) => x.id === segment)?.slug || "",
    q: "",
    uf: "",
    cidade: "",
    pagina: 1,
    ordem: "nome" as const,
  };
  const similar = useQuery({
    queryKey: searchKey(r, filters),
    queryFn: () => searchDirectory(r, filters),
    enabled: !!segment,
  });
  useEffect(() => {
    if (demo || local || !key || !captcha.current) return;
    let active = true;
    const mount = () => {
      if (active && captcha.current && window.turnstile && !widget.current)
        widget.current = window.turnstile.render(captcha.current, {
          sitekey: key,
          action: "quotation",
          callback: (v: string) => setToken(v),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
    };
    let script = document.querySelector<HTMLScriptElement>(
      "script[data-turnstile]",
    );
    if (!script) {
      script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.dataset.turnstile = "true";
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", mount);
    mount();
    return () => {
      active = false;
      script?.removeEventListener("load", mount);
      if (widget.current) {
        window.turnstile?.remove(widget.current);
        widget.current = "";
      }
    };
  }, [demo, local, key]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (sending.current || sent) return;
    setError("");
    setFields({});
    const f = new FormData(form.current!);
    const result = quotationSchema.safeParse({
      ...Object.fromEntries(f),
      fornecedor_id: s.id,
      segmento_id: segment,
      copias: copies,
      privacidade: f.get("privacidade") === "on",
    });
    if (!result.success) {
      setFields(
        Object.fromEntries(
          result.error.issues.map((x) => [String(x.path[0]), x.message]),
        ),
      );
      form.current
        ?.querySelector<HTMLElement>(
          '[name="' + result.error.issues[0]?.path[0] + '"]',
        )
        ?.focus();
      return;
    }
    if (!demo && !local && !token) {
      setError("Conclua a verificação de segurança.");
      return;
    }
    sending.current = true;
    setBusy(true);
    const scope = "quotation:" + r.source + ":" + s.id;
    requestId.current = retryId(scope, requestId.current);
    try {
      const receipt = await submitQuotation(
        result.data,
        demo,
        requestId.current,
        local ? "local-integration" : token,
        s.nome_fantasia,
      );
      clearRetry(scope);
      setSent(true);
      if (!receipt.simulated)
        void track(r, "orcamento_enviado", s.id, segment, result.data.uf);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao enviar.");
    } finally {
      sending.current = false;
      setBusy(false);
      setToken("");
      try {
        if (widget.current) window.turnstile?.reset(widget.current);
      } catch {
        /* A widget failure must not leave the form locked. */
      }
    }
  }
  const field = (
    name: keyof Quotation,
    label: string,
    type = "text",
    max = 120,
  ) => (
    <label>
      {label}
      <input
        name={name}
        aria-label={label}
        type={type}
        autoComplete={
          name === "nome"
            ? "name"
            : name === "email"
              ? "email"
              : name === "telefone"
                ? "tel"
                : name === "cidade"
                  ? "address-level2"
                  : "off"
        }
        required
        maxLength={max}
        aria-invalid={!!fields[name]}
        aria-describedby={
          fields[name] ? "quote-error-" + String(name) : undefined
        }
      />
      {fields[name] && (
        <span id={"quote-error-" + String(name)} className="quote-error">
          {fields[name]}
        </span>
      )}
    </label>
  );
  return (
    <section id="pedir-orcamento" className="quotation-section">
      <span className="eyebrow">SEU PRÓXIMO PARCEIRO</span>
      <h2>Pedir orçamento</h2>
      <p>
        Conte o que seu condomínio precisa. O pedido será enviado para{" "}
        {s.nome_fantasia}.
      </p>
      {demo && (
        <aside className="directory-demo">
          <strong>Simulação de orçamento</strong>
          <p>
            Use apenas dados fictícios. O pedido ficará neste navegador para
            análise no painel de demonstração. Nenhum e-mail será enviado.
          </p>
        </aside>
      )}
      {sent ? (
        <div role="status" className="quote-success">
          <h3>
            {demo
              ? "Simulação registrada neste navegador."
              : "Pedido registrado."}
          </h3>
          <p>
            {demo
              ? "Veja o pedido no painel de demonstração."
              : "Seu pedido foi registrado para a empresa selecionada. A entrega da notificação e a resposta do fornecedor ainda dependem do processamento e do atendimento."}
          </p>
          {demo && <Link to="/demonstracao">Ver pedidos no painel</Link>}
          <p>O envio não garante prazo de resposta ou contratação.</p>
        </div>
      ) : (
        <form
          ref={form}
          className="quotation-form"
          onSubmit={send}
          noValidate
          aria-busy={busy}
        >
          <div className="quote-fields">
            {field("nome", "Seu nome")}
            {field("email", "Seu e-mail", "email", 254)}
            {field("telefone", "WhatsApp com DDD", "tel", 20)}
            {field("condominio_nome", "Nome do condomínio", "text", 160)}
            {field("cidade", "Cidade do condomínio")}
            <label>
              Estado do condomínio
              <select
                aria-label="Estado do condomínio"
                name="uf"
                required
                defaultValue=""
              >
                <option value="">Selecione</option>
                {catalog.data?.estados.map((x) => (
                  <option key={x.uf} value={x.uf}>
                    {x.nome}
                  </option>
                ))}
              </select>
              {fields.uf && <span className="quote-error">{fields.uf}</span>}
            </label>
            <label>
              Quantidade de unidades
              <input
                type="number"
                aria-label="Quantidade de unidades"
                name="unidades"
                min={1}
                max={100000}
                required
              />
              {fields.unidades && (
                <span className="quote-error">{fields.unidades}</span>
              )}
            </label>
            <label>
              Prazo desejado
              <select name="urgencia" defaultValue="planejamento">
                <option value="planejamento">Estou planejando</option>
                <option value="30_dias">Nos próximos 30 dias</option>
                <option value="urgente">Preciso com urgência</option>
              </select>
            </label>
          </div>
          <label>
            Especialidade
            <select
              value={segment}
              onChange={(e) => {
                setSegment(e.target.value);
                setCopies([]);
              }}
            >
              {s.segmentos.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Descreva sua necessidade
            <textarea
              aria-label="Descreva sua necessidade"
              name="mensagem"
              rows={5}
              maxLength={4000}
              required
              placeholder="Informe o serviço, a necessidade e os detalhes para preparar o orçamento."
            />
            {fields.mensagem && (
              <span className="quote-error">{fields.mensagem}</span>
            )}
          </label>
          {(similar.data?.items.filter((x) => x.id !== s.id).length || 0) >
            0 && (
            <fieldset>
              <legend>
                Enviar também para até 2 empresas desta especialidade (opcional)
              </legend>
              {similar.data?.items
                .filter((x) => x.id !== s.id)
                .slice(0, 8)
                .map((x) => (
                  <label className="quote-check" key={x.id}>
                    <input
                      type="checkbox"
                      checked={copies.includes(x.id)}
                      disabled={!copies.includes(x.id) && copies.length >= 2}
                      onChange={(e) =>
                        setCopies(
                          e.target.checked
                            ? [...copies, x.id]
                            : copies.filter((v) => v !== x.id),
                        )
                      }
                    />
                    {x.nome_fantasia}
                  </label>
                ))}
            </fieldset>
          )}
          <div className="quote-honeypot" aria-hidden="true">
            <label>
              Deixe este campo vazio
              <input
                name="website"
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
              />
            </label>
          </div>
          <label className="quote-check">
            <input name="privacidade" type="checkbox" required />
            Autorizo o compartilhamento destes dados com as empresas
            selecionadas para responder ao pedido, conforme a{" "}
            <Link to="/privacidade">Política de Privacidade</Link>.{" "}
            <DocumentVersion />
          </label>
          {fields.privacidade && (
            <p className="quote-error">{fields.privacidade}</p>
          )}
          <div ref={captcha} />
          {!demo && !local && !key && (
            <p role="alert">
              O envio está temporariamente indisponível enquanto a verificação
              de segurança é configurada.
            </p>
          )}
          {local && (
            <p className="muted">
              Ambiente de testes local. E-mails são entregues somente ao
              Mailpit.
            </p>
          )}
          {error && (
            <p role="alert" className="quote-error">
              {error}
            </p>
          )}
          <button
            className="directory-button"
            disabled={busy || (!demo && !local && !key)}
          >
            {busy
              ? "Enviando…"
              : demo
                ? "Simular envio de orçamento"
                : "Enviar pedido de orçamento"}
          </button>
          <p className="muted">
            Seus dados serão usados para responder a este pedido. Este aceite
            não inclui publicidade.
          </p>
        </form>
      )}
    </section>
  );
}

function DocumentVersion() {
  const q = useQuery({
    queryKey: ["document-version"],
    queryFn: currentDocumentVersion,
  });
  return <small>Versão {q.data || "[PENDENTE: versão dos documentos]"}</small>;
}
