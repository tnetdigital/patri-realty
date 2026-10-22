import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, ShieldCheck, UserRound, LockKeyhole } from "lucide-react";
import { useAuth } from "../features/auth/context";
import {
  updateName,
  updateEmail,
  updatePassword,
  signOut,
} from "../features/shared/api";
import { password as passwordSchema } from "../features/auth/schema";
import { accountAction, downloadPersonalData } from "../features/privacy/api";
import "../features/privacy/privacy.css";
const demoKey = "patri:privacy-demo:v1";
type DemoAccount = { nome: string; email: string; removed: boolean };
function readDemo(): DemoAccount {
  try {
    const raw = JSON.parse(localStorage.getItem(demoKey) || "null");
    if (
      raw &&
      typeof raw.nome === "string" &&
      typeof raw.email === "string" &&
      typeof raw.removed === "boolean"
    )
      return raw;
  } catch {
    /* Start with a safe fictional record. */
  }
  return {
    nome: "Pessoa de demonstração",
    email: "pessoa@example.com",
    removed: false,
  };
}
export function Workspace({ area }: { area: string }) {
  return (
    <section className="container page">
      <h1>{area}</h1>
      <Link to="/conta">Ver meus dados</Link>
    </section>
  );
}
export function Account({ demo = false }: { demo?: boolean }) {
  const { access, refresh } = useAuth();
  const navigate = useNavigate();
  const [sample, setSample] = useState(readDemo);
  const [nome, setNome] = useState(
    demo ? sample.nome : access?.profile.nome || "",
  );
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [removed, setRemoved] = useState(demo && sample.removed);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const saveDemo = (next: DemoAccount) => {
    localStorage.setItem(demoKey, JSON.stringify(next));
    setSample(next);
  };
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível concluir. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  function prevent(e: FormEvent, action: () => Promise<void>) {
    e.preventDefault();
    void run(action);
  }
  return (
    <section className="container page privacy-page">
      <div className="privacy-heading">
        <span className="eyebrow">SEU ESPAÇO</span>
        <h1>Minha conta e privacidade</h1>
        <p>
          Seus dados, suas escolhas. Gerencie o acesso e acompanhe como suas
          informações são usadas.
        </p>
      </div>
      {demo && (
        <aside className="privacy-notice">
          <strong>Demonstração com dados fictícios</strong>
          <p>
            As alterações ficam neste navegador. Nenhum e-mail é enviado e
            nenhuma conta real é alterada. Para confirmar a exclusão simulada,
            use a senha <code>TestePatri2026!</code>.
          </p>
          <button
            type="button"
            onClick={() => {
              const next = {
                nome: "Pessoa de demonstração",
                email: "pessoa@example.com",
                removed: false,
              };
              saveDemo(next);
              setNome(next.nome);
              setRemoved(false);
              setDeleting(false);
              setConfirmation("");
              setDeletePassword("");
              setError("");
              setMessage("Demonstração reiniciada.");
            }}
          >
            Reiniciar demonstração da conta
          </button>
        </aside>
      )}
      {error && (
        <p role="alert" className="privacy-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="privacy-success">
          {message}
        </p>
      )}
      {removed ? (
        <div className="card privacy-card">
          <ShieldCheck aria-hidden="true" />
          <h2>Conta removida</h2>
          <p>
            Os dados pessoais foram anonimizados e o acesso foi encerrado.
            Orçamentos e avaliações preservam apenas o histórico sem a
            identificação da pessoa.
          </p>
          <Link to="/guia">Explorar o guia</Link>
        </div>
      ) : (
        <>
          <div className="privacy-grid">
            <section className="card privacy-card">
              <UserRound aria-hidden="true" />
              <h2>Dados pessoais</h2>
              <form
                onSubmit={(e) =>
                  prevent(e, async () => {
                    if (nome.trim().length < 3)
                      throw new Error(
                        "Informe um nome com pelo menos 3 caracteres.",
                      );
                    if (demo) saveDemo({ ...sample, nome: nome.trim() });
                    else {
                      const result = await updateName(
                        access!.user.id,
                        nome.trim(),
                      );
                      if (result.error)
                        throw new Error("Não foi possível salvar seus dados.");
                      await refresh();
                    }
                    setMessage("Dados pessoais atualizados.");
                  })
                }
              >
                <fieldset disabled={busy}>
                  <label>
                    Nome completo
                    <input
                      autoComplete="name"
                      required
                      minLength={3}
                      maxLength={120}
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                    />
                  </label>
                  <p className="privacy-muted">
                    E-mail atual:{" "}
                    <strong>{demo ? sample.email : access?.user.email}</strong>
                  </p>
                  <button type="submit" className="primary">
                    Salvar dados pessoais
                  </button>
                </fieldset>
              </form>
            </section>
            <section className="card privacy-card">
              <ShieldCheck aria-hidden="true" />
              <h2>Alterar e-mail</h2>
              <p>
                O novo endereço só passa a valer após a confirmação. Confira as
                mensagens enviadas pelo serviço de autenticação.
              </p>
              <form
                onSubmit={(e) =>
                  prevent(e, async () => {
                    if (demo) {
                      setMessage(
                        "Confirmação simulada preparada. O e-mail atual foi mantido; nenhum e-mail foi enviado.",
                      );
                    } else {
                      const result = await updateEmail(email);
                      if (result.error)
                        throw new Error(
                          "Não foi possível solicitar a alteração de e-mail.",
                        );
                      setMessage(
                        "Confira os links de confirmação nos endereços de e-mail. O endereço atual permanece até concluir.",
                      );
                    }
                    setEmail("");
                  })
                }
              >
                <fieldset disabled={busy}>
                  <label>
                    Novo e-mail
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <button type="submit">Solicitar alteração de e-mail</button>
                </fieldset>
              </form>
            </section>
            <section className="card privacy-card">
              <LockKeyhole aria-hidden="true" />
              <h2>Senha e acesso</h2>
              <p>Use pelo menos oito caracteres, incluindo letras e números.</p>
              <form
                onSubmit={(e) =>
                  prevent(e, async () => {
                    const parsed = passwordSchema.safeParse(senha);
                    if (!parsed.success)
                      throw new Error(parsed.error.issues[0].message);
                    if (senha !== confirmSenha)
                      throw new Error("As senhas devem ser iguais.");
                    if (!demo) {
                      const result = await updatePassword(senha);
                      if (result.error)
                        throw new Error(
                          "Não foi possível alterar sua senha. Entre novamente ou solicite recuperação.",
                        );
                    }
                    setSenha("");
                    setConfirmSenha("");
                    setMessage(
                      demo
                        ? "Troca de senha simulada. Nenhuma credencial real foi alterada."
                        : "Senha alterada.",
                    );
                  })
                }
              >
                <fieldset disabled={busy}>
                  <label>
                    Nova senha
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={256}
                      required
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                    />
                  </label>
                  <label>
                    Confirmar nova senha
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmSenha}
                      onChange={(e) => setConfirmSenha(e.target.value)}
                    />
                  </label>
                  <button type="submit">Alterar senha</button>
                  <Link to="/recuperar-senha">Esqueci minha senha</Link>
                </fieldset>
              </form>
            </section>
            <section className="card privacy-card">
              <Download aria-hidden="true" />
              <h2>Uma cópia dos seus dados</h2>
              <p>
                Baixe um arquivo JSON com seu cadastro, consentimentos e
                registros próprios. Notas internas e informações de outras
                pessoas ficam protegidas.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    downloadPersonalData(
                      demo
                        ? {
                            versao: "2026-10-21",
                            demonstracao: true,
                            conta: { nome: sample.nome, email: sample.email },
                            avaliacoes: [],
                            consentimentos: [],
                          }
                        : await accountAction("export"),
                    );
                    setMessage("Arquivo de dados preparado para download.");
                  })
                }
              >
                Baixar meus dados
              </button>
              <Link to="/privacidade">Entender a política de privacidade</Link>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    if (demo) {
                      setMessage(
                        "Encerramento de sessões simulado. Nenhuma conta real foi desconectada.",
                      );
                      return;
                    }
                    await signOut("global");
                    await refresh();
                  })
                }
              >
                Encerrar todas as sessões
              </button>
            </section>
          </div>
          <section className="card privacy-card privacy-danger">
            <h2>Apagar minha conta</h2>
            <p>
              Seu cadastro pessoal será anonimizado, a newsletter será cancelada
              e o acesso encerrado. O histórico de orçamentos e avaliações
              permanece sem sua identificação. A página da empresa fica
              indisponível até a regularização de um responsável. A exclusão da
              conta não cancela cobranças externas: confira a assinatura antes
              de continuar.
            </p>
            <Link to="/painel/plano">Consultar plano e assinatura</Link>
            {!deleting ? (
              <button type="button" onClick={() => setDeleting(true)}>
                Quero apagar minha conta
              </button>
            ) : (
              <form
                onSubmit={(e) =>
                  prevent(e, async () => {
                    if (confirmation !== "APAGAR")
                      throw new Error("Digite APAGAR para confirmar.");
                    if (demo) {
                      if (deletePassword !== "TestePatri2026!")
                        throw new Error(
                          "Não foi possível confirmar sua senha.",
                        );
                      saveDemo({
                        nome: "Conta removida",
                        email: "",
                        removed: true,
                      });
                    } else {
                      await accountAction(
                        "delete",
                        deletePassword,
                        confirmation,
                      );
                      navigate("/conta-removida", { replace: true });
                      await signOut("local");
                    }
                    setDeletePassword("");
                    setConfirmation("");
                    setRemoved(true);
                    setMessage("Dados pessoais anonimizados.");
                  })
                }
              >
                <fieldset disabled={busy}>
                  <label>
                    Senha atual
                    <input
                      type="password"
                      autoComplete="current-password"
                      required
                      minLength={8}
                      maxLength={256}
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                    />
                  </label>
                  <label>
                    Digite APAGAR
                    <input
                      required
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      autoComplete="off"
                    />
                  </label>
                  <div className="privacy-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleting(false);
                        setDeletePassword("");
                        setConfirmation("");
                      }}
                    >
                      Cancelar exclusão
                    </button>
                    <button type="submit" className="danger">
                      Confirmar exclusão da conta
                    </button>
                  </div>
                </fieldset>
              </form>
            )}
          </section>
        </>
      )}
    </section>
  );
}

export function AccountRemoved() {
  return (
    <section className="container page privacy-page">
      <div className="card privacy-card">
        <ShieldCheck aria-hidden="true" />
        <h1>Conta removida</h1>
        <p>
          A solicitação foi concluída. Os dados pessoais foram anonimizados e o
          acesso encerrado.
        </p>
        <Link to="/guia">Explorar o guia</Link>
      </div>
    </section>
  );
}
