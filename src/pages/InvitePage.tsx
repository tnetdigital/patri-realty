import { supplierCopy as copy } from "../features/suppliers/texts";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MailCheck, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../features/auth/context";
import { configured } from "../lib/supabase";
import { password } from "../features/auth/schema";
import {
  acceptInvite,
  inspectInvite,
  signUpInvite,
} from "../features/suppliers/api";
import "../features/suppliers/supplier.css";
export default function InvitePage() {
  const { token = "" } = useParams(),
    { access, refresh } = useAuth(),
    nav = useNavigate();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [register, setRegister] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [captcha, setCaptcha] = useState("");
  const invitation = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => inspectInvite(token),
    enabled: configured && token.length === 64,
    retry: false,
  });
  useEffect(() => {
    if (!register || !import.meta.env.VITE_TURNSTILE_SITE_KEY) return;
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => {
      const widget = (
        window as unknown as {
          turnstile: {
            render: (selector: string, options: object) => void;
          };
        }
      ).turnstile;
      widget.render("#invite-captcha", {
        sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
        callback: setCaptcha,
        "expired-callback": () => setCaptcha(""),
      });
    };
    document.body.appendChild(script);
    return () => script.remove();
  }, [register]);
  if (!configured)
    return (
      <section className="invite-page">
        <Users size={32} />
        <h1>{copy.convite_para_a_equipe}</h1>
        <p>{copy.a_autenticacao_online_ainda_nao_esta_configurada}</p>
        <Link className="btn" to="/demonstracao">
          {copy.experimentar_o_painel}
        </Link>
      </section>
    );
  if (confirmed)
    return (
      <section className="invite-page">
        <MailCheck size={36} />
        <h1>{copy.confirme_seu_email}</h1>
        <p>{copy.enviamos_uma_confirmacao_para_o_endereco_do}</p>
        <Link className="btn" to="/entrar">
          {copy.entrar}
        </Link>
      </section>
    );
  if (invitation.isLoading)
    return (
      <section className="invite-page">
        <p>{copy.verificando_convite}</p>
      </section>
    );
  if (!invitation.data)
    return (
      <section className="invite-page">
        <h1>{copy.convite_indisponivel}</h1>
        <p>{copy.o_convite_expirou_ja_foi_utilizado_ou}</p>
        <Link to="/">{copy.voltar_ao_portal_2}</Link>
      </section>
    );
  return (
    <section className="invite-page">
      <span className="eyebrow">{copy.vamos_trabalhar_em_conjunto}</span>
      <h1>
        {copy.voce_foi_convidado_para}
        {invitation.data.empresa}
        {copy.texto__5}
      </h1>
      <p>
        {copy.use_o_email}
        <strong>{invitation.data.email}</strong>
        {copy.como_editor_voce_podera_atualizar_a_pagina}
      </p>
      {access ? (
        <button
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await acceptInvite(token);
              await refresh();
              nav("/painel");
            } catch (e) {
              setMessage(
                e instanceof Error
                  ? e.message
                  : copy.nao_foi_possivel_aceitar_o_convite,
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Aceitando…" : copy.aceitar_convite}
        </button>
      ) : register ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setBusy(true);
            setMessage("");
            try {
              const pass = password.parse(String(form.get("senha")));
              await signUpInvite(
                token,
                invitation.data!.email,
                String(form.get("nome")),
                pass,
                captcha || undefined,
              );
              setConfirmed(true);
            } catch (e) {
              setMessage(
                e instanceof Error
                  ? e.message
                  : copy.nao_foi_possivel_criar_a_conta,
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {copy.nome_completo}
            <input name="nome" minLength={3} maxLength={120} required />
          </label>
          <label>
            {copy.email}
            <input value={invitation.data.email} type="email" readOnly />
          </label>
          <label>
            {copy.senha}
            <input
              name="senha"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label className="checkbox">
            <input type="checkbox" required />
            <span>
              {copy.li_e_aceito_os}
              <Link to="/termos">{copy.termos}</Link>
              {copy.e_a}{" "}
              <Link to="/privacidade">{copy.politica_de_privacidade}</Link>
              {copy.texto__5}
            </span>
          </label>
          <div id="invite-captcha" />
          <button
            className="btn"
            disabled={
              busy || (!!import.meta.env.VITE_TURNSTILE_SITE_KEY && !captcha)
            }
          >
            {copy.criar_minha_conta_de_editor}
          </button>
        </form>
      ) : (
        <div className="invite-links">
          <Link className="btn" to={`/entrar?convite=${token}`}>
            {copy.ja_tenho_conta}
          </Link>
          <button className="editorial-link" onClick={() => setRegister(true)}>
            {copy.criar_conta}
          </button>
        </div>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
