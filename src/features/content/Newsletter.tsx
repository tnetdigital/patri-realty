import { acceptedReceipt } from "../conversion/contracts";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { demoNewsletter } from "./demo";
export function NewsletterForm({ demo }: { demo: boolean }) {
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [token, setToken] = useState(""),
    [demoId, setDemoId] = useState("");
  const captcha = useRef<HTMLDivElement>(null),
    sending = useRef(false),
    widgetId = useRef("");
  useEffect(() => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (demo || !siteKey) return;
    let widget: string | undefined;
    let stopped = false;
    const render = () => {
      const w = window as unknown as {
        turnstile?: {
          render: (el: HTMLElement, p: Record<string, unknown>) => string;
          remove: (id: string) => void;
        };
      };
      if (!stopped && !widget && w.turnstile && captcha.current)
        widgetId.current = widget = w.turnstile.render(captcha.current, {
          sitekey: siteKey,
          action: "newsletter",
          callback: (t: string) => setToken(t),
          "expired-callback": () => setToken(""),
        });
    };
    if ((window as unknown as { turnstile?: unknown }).turnstile) render();
    else {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = render;
      document.head.append(script);
    }
    return () => {
      stopped = true;
      const w = window as unknown as {
        turnstile?: { remove: (id: string) => void };
      };
      if (widget) w.turnstile?.remove(widget);
      widgetId.current = "";
    };
  }, [demo]);
  return (
    <section className="content-panel">
      <h2>Boas conexões também chegam por e-mail</h2>
      <p>
        Solicite sua inscrição nas novidades da Patri Realty. Você só entra na
        lista após confirmar o link enviado ao seu e-mail.
      </p>
      <form
        method="post"
        aria-busy={busy}
        onSubmit={async (e) => {
          e.preventDefault();
          if (sending.current) return;
          sending.current = true;
          setError("");
          setMessage("");
          setBusy(true);
          const f = new FormData(e.currentTarget),
            data = {
              nome: f.get("nome"),
              email: f.get("email"),
              cidade: f.get("cidade"),
              perfil: f.get("perfil"),
              aceite: f.get("aceite") === "on",
              website: f.get("website"),
              turnstile_token:
                token ||
                (import.meta.env.VITE_QUOTATION_URL ? "local-integration" : ""),
            };
          try {
            if (demo) {
              setDemoId(demoNewsletter("inscrever", data));
              setMessage(
                "Solicitação simulada salva. Confirme abaixo para testar o duplo aceite; nenhum e-mail é enviado.",
              );
            } else {
              const url =
                import.meta.env.VITE_NEWSLETTER_URL ||
                (import.meta.env.VITE_QUOTATION_URL
                  ? new URL("/newsletter", import.meta.env.VITE_QUOTATION_URL)
                      .href
                  : import.meta.env.VITE_SUPABASE_URL +
                    "/functions/v1/newsletter");
              const r = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                signal: AbortSignal.timeout(15000),
              });
              await acceptedReceipt(r);
              setMessage(
                "Se aplicável, enviaremos um link de confirmação. Confira sua caixa de entrada e confirme em até 48 horas.",
              );
            }
          } catch (e) {
            setError((e as Error).message);
          } finally {
            sending.current = false;
            setToken("");
            setBusy(false);
            try {
              if (widgetId.current) window.turnstile?.reset(widgetId.current);
            } catch {
              /* The next submission still requires a fresh security token. */
            }
          }
        }}
      >
        <div className="content-form-grid">
          <label>
            Seu nome
            <input
              name="nome"
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
            />
          </label>
          <label>
            Seu e-mail
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
            />
          </label>
          <label>
            Cidade
            <input
              name="cidade"
              maxLength={120}
              autoComplete="address-level2"
            />
          </label>
          <label>
            Seu perfil
            <select name="perfil">
              <option value="sindico">Síndico</option>
              <option value="administrador">Administrador</option>
              <option value="fornecedor">Fornecedor</option>
              <option value="morador">Morador</option>
              <option value="outro">Outro</option>
            </select>
          </label>
        </div>
        <div className="newsletter-honeypot" aria-hidden="true">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label>
          <input type="checkbox" name="aceite" required />
          Quero receber as novidades e li a{" "}
          <Link to="/privacidade">política de privacidade</Link>. Poderei
          cancelar a qualquer momento.
        </label>
        <div ref={captcha} />
        <button
          className="primary"
          disabled={
            busy ||
            !!message ||
            (!demo && !!import.meta.env.VITE_TURNSTILE_SITE_KEY && !token)
          }
        >
          {busy ? "Enviando…" : "Solicitar inscrição"}
        </button>
      </form>
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
      {demoId && (
        <div className="newsletter-demo-link">
          <Link to={"/demonstracao-editorial/newsletter/confirmar/" + demoId}>
            Abrir confirmação simulada
          </Link>
          <p>
            Esta ação existe apenas na demonstração. Na versão integrada, o link
            chega por e-mail.
          </p>
        </div>
      )}
    </section>
  );
}
