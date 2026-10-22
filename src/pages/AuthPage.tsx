import { captchaUnavailable } from "../features/auth/captcha";
import { ui } from "../lib/texts";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { Building2, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { useAuth } from "../features/auth/context";
import {
  catalog,
  login,
  recover,
  register as signup,
  resend,
  reset,
} from "../features/auth/api";
import {
  password,
  registerSchema,
  type Registration,
} from "../features/auth/schema";
import { configured } from "../lib/supabase";
export default function AuthPage({
  mode,
}: {
  mode: "login" | "register" | "recover" | "reset" | "confirm";
}) {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get("convite");
  const { refresh } = useAuth();
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [captcha, setCaptcha] = useState("");
  const initial =
    searchParams.get("tipo") === "fornecedor" ? "fornecedor" : "sindico";
  const form = useForm<Registration>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      tipo: initial,
      nome: "",
      email: "",
      senha: "",
      telefone: "",
      condominio_nome: "",
      cargo: "",
      cidade: "",
      estado: "",
      empresa: "",
      cnpj: "",
      newsletter: false,
    },
  });
  const kind = form.watch("tipo");
  const cities = useQuery({
    queryKey: ["catalog"],
    queryFn: catalog,
    enabled: configured && mode === "register",
  });
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : ui.nao_foi_possivel_continuar,
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (
      !import.meta.env.VITE_TURNSTILE_SITE_KEY ||
      mode === "reset" ||
      mode === "confirm"
    )
      return;
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => {
      const ts = (
        window as unknown as {
          turnstile: {
            render: (el: string, opts: object) => void;
          };
        }
      ).turnstile;
      ts.render("#captcha", {
        sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
        callback: setCaptcha,
        "expired-callback": () => setCaptcha(""),
      });
    };
    document.body.appendChild(script);
    return () => script.remove();
  }, [mode]);
  const titles = {
    login: ui.bom_ter_voce_por_aqui,
    register: ui.vamos_construir_boas_conexoes,
    recover: ui.recupere_seu_acesso,
    reset: ui.escolha_sua_nova_senha,
    confirm: ui.confira_sua_caixa_de_entrada,
  };
  function field(name: keyof Registration, label: string, type = "text") {
    return (
      <label>
        {label}
        <input
          type={type}
          autoComplete={
            name === "senha"
              ? "new-password"
              : name === "email"
                ? "email"
                : undefined
          }
          {...form.register(name)}
        />
        {form.formState.errors[name] && (
          <small className="error">
            {form.formState.errors[name]?.message}
          </small>
        )}
      </label>
    );
  }
  return (
    <section className="container auth-layout">
      <aside>
        <span className="eyebrow">{ui.bemvindo_a_patri_realty}</span>
        <h1>
          {ui.uma_boa_parceria}
          <br />
          {ui.comeca_com}
          <br />
          <em>{ui.uma_conexao}</em>
        </h1>
        <p>{ui.um_espaco_pensado_para_sindicos_fornecedores_e}</p>
        <Building2 size={100} strokeWidth={0.6} />
      </aside>
      <div className="card auth-card">
        <h2>{titles[mode]}</h2>
        {captchaUnavailable() && (
          <p role="alert">
            [PENDENTE: verificação de segurança] O acesso está temporariamente
            indisponível.
          </p>
        )}
        <p>
          {mode === "register"
            ? ui.crie_sua_conta_e_escolha_como_quer
            : ui.acesse_sua_conta_com_seguranca}
        </p>
        {!configured && (
          <div className="notice">
            {ui.o_ambiente_de_autenticacao_ainda_nao_esta}
          </div>
        )}
        {mode === "register" ? (
          <form
            onSubmit={form.handleSubmit((v) =>
              run(async () => {
                await signup(v, captcha || undefined);
                nav("/confirmar-email");
              }),
            )}
          >
            <div className="role-choice">
              {(["sindico", "fornecedor"] as const).map((v) => (
                <label key={v} className={kind === v ? "selected" : ""}>
                  <input type="radio" value={v} {...form.register("tipo")} />
                  {v === "sindico" ? ui.sou_sindico : ui.sou_fornecedor}
                </label>
              ))}
            </div>
            {field("nome", ui.nome_completo)}
            {field("email", ui.email, "email")}
            {field("senha", ui.senha, "password")}
            <small>{ui.minimo_de_8_caracteres_com_letra_e}</small>
            {field(
              "telefone",
              kind === "fornecedor"
                ? ui.whatsapp_com_ddd
                : ui.telefone_opcional,
              "tel",
            )}
            {kind === "fornecedor" ? (
              <>
                {field("empresa", ui.nome_da_empresa)}
                {field("cnpj", ui.cnpj)}
              </>
            ) : (
              <>
                <label>
                  {ui.estado}
                  <select aria-label={ui.estado} {...form.register("estado")}>
                    <option value="">{ui.selecione}</option>
                    {Array.from(
                      new Set(cities.data?.cities.map((c) => c.uf)),
                    ).map((uf) => (
                      <option key={uf}>{uf}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {ui.cidade}
                  <select aria-label={ui.cidade} {...form.register("cidade")}>
                    <option value="">{ui.selecione}</option>
                    {cities.data?.cities
                      .filter((c) => c.uf === form.watch("estado"))
                      .map((c) => (
                        <option key={c.id}>{c.nome}</option>
                      ))}
                  </select>
                </label>
                {field("condominio_nome", ui.nome_do_condominio_opcional)}
                <label>
                  {ui.cargo_opcional}
                  <select
                    aria-label={ui.cargo_opcional}
                    {...form.register("cargo")}
                  >
                    <option value="">{ui.selecione}</option>
                    <option value="sindico">{ui.sindico}</option>
                    <option value="morador">{ui.morador}</option>
                    <option value="administrador">{ui.administrador}</option>
                  </select>
                </label>
                {form.formState.errors.cidade && (
                  <small className="error">
                    {form.formState.errors.cidade.message}
                  </small>
                )}
              </>
            )}
            <label className="checkbox">
              <input type="checkbox" {...form.register("termos")} />
              <span>
                {ui.li_e_aceito_os}
                <Link to="/termos">{ui.termos_de_uso}</Link>
                {ui.e_a}{" "}
                <Link to="/privacidade">{ui.politica_de_privacidade}</Link>
                {ui.texto__2}
              </span>
            </label>
            {form.formState.errors.termos && (
              <small className="error">
                {form.formState.errors.termos.message}
              </small>
            )}
            <label className="checkbox">
              <input type="checkbox" {...form.register("newsletter")} />
              <span>{ui.quero_receber_novidades_por_email_opcional}</span>
            </label>
            <div id="captcha" />
            <Button
              disabled={
                busy ||
                !configured ||
                captchaUnavailable() ||
                (!!import.meta.env.VITE_TURNSTILE_SITE_KEY && !captcha)
              }
            >
              {busy ? ui.criando_conta : ui.criar_minha_conta}{" "}
              <ArrowRight size={16} />
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              void run(async () => {
                if (mode === "login") {
                  await login(
                    String(d.get("email")),
                    String(d.get("senha")),
                    captcha || undefined,
                  );
                  await refresh();
                  nav(
                    invitationToken
                      ? "/convite/" + encodeURIComponent(invitationToken)
                      : "/area",
                  );
                }
                if (mode === "recover") {
                  await recover(String(d.get("email")), captcha || undefined);
                  setMessage(ui.se_houver_uma_conta_enviaremos_as_instrucoes);
                }
                if (mode === "reset") {
                  const p = password.parse(d.get("senha"));
                  await reset(p);
                  nav("/entrar");
                }
                if (mode === "confirm") {
                  await resend(String(d.get("email")));
                  setMessage(ui.se_aplicavel_um_novo_email_de_confirmacao);
                }
              });
            }}
          >
            {mode !== "reset" && (
              <label>
                {ui.email}
                <input
                  required
                  name="email"
                  type="email"
                  autoComplete="email"
                />
              </label>
            )}
            {(mode === "login" || mode === "reset") && (
              <label>
                {ui.senha}
                <input
                  required
                  name="senha"
                  type="password"
                  minLength={8}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
              </label>
            )}
            {mode === "login" && (
              <Link to="/recuperar-senha">{ui.esqueci_minha_senha}</Link>
            )}
            <div id="captcha" />
            <Button
              disabled={
                busy ||
                !configured ||
                captchaUnavailable() ||
                ((mode === "recover" || mode === "login") &&
                  !!import.meta.env.VITE_TURNSTILE_SITE_KEY &&
                  !captcha)
              }
            >
              {busy
                ? "Aguarde…"
                : mode === "login"
                  ? ui.entrar
                  : mode === "reset"
                    ? ui.salvar_nova_senha
                    : mode === "confirm"
                      ? ui.reenviar_confirmacao
                      : ui.enviar_instrucoes}
            </Button>
          </form>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <div className="auth-bottom">
          {mode === "login" ? (
            <>
              {ui.ainda_nao_tem_conta}
              <Link to="/cadastrar">{ui.cadastrese}</Link>
            </>
          ) : (
            <Link to="/entrar">{ui.ja_tenho_conta_entrar}</Link>
          )}
        </div>
      </div>
    </section>
  );
}
