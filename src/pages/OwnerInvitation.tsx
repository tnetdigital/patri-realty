import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../features/auth/context";
import { acceptOwnership } from "../features/shared/api";
export default function OwnerInvitation() {
  const { token = "" } = useParams(),
    { access, refresh } = useAuth(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [done, setDone] = useState(false);
  return (
    <section className="container page prose">
      <h1>Assumir a página da empresa</h1>
      <p>
        Este convite é pessoal, vinculado ao e-mail destinatário e válido por 14
        dias. Entre com o mesmo e-mail antes de aceitar.
      </p>
      {!access ? (
        <div>
          <Link to="/entrar" target="_blank" rel="noopener noreferrer">
            Entrar em outra aba
          </Link>
          <p>
            Se ainda não tem conta,{" "}
            <Link
              to="/cadastrar?tipo=fornecedor"
              target="_blank"
              rel="noopener noreferrer"
            >
              cadastre-se como fornecedor
            </Link>{" "}
            usando o CNPJ da empresa. Confirme o e-mail e volte a esta aba.
          </p>
          <button onClick={() => void refresh()}>
            Já entrei, verificar sessão
          </button>
        </div>
      ) : (
        <p>Conta conectada: {access.user.email}</p>
      )}
      {message && <p role={done ? "status" : "alert"}>{message}</p>}
      {done ? (
        <Link to="/painel">Acessar o painel da empresa</Link>
      ) : (
        <button
          className="directory-button"
          disabled={!access || busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await acceptOwnership(token);
              if (r.error) throw Error(r.error.message);
              await refresh();
              setDone(true);
              setMessage(
                "A página agora está vinculada à sua conta. Complete o perfil e envie para análise.",
              );
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "Não foi possível aceitar.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Aceitar propriedade da página
        </button>
      )}
    </section>
  );
}
