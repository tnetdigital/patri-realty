import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { demoNewsletter } from "../features/content/demo";
import { newsletterToken } from "../features/content/api";
import "../features/content/content.css";
export default function NewsletterToken({ demo = false }: { demo?: boolean }) {
  const { action, token } = useParams(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  async function run() {
    setBusy(true);
    try {
      let valid = true;
      if (demo) demoNewsletter(action || "", { token });
      else valid = await newsletterToken(token || "", action || "");
      setDone(valid);
      setMessage(
        valid
          ? action === "confirmar"
            ? "Inscrição confirmada. Seu duplo aceite foi registrado."
            : "Inscrição cancelada. Você não receberá novidades desta lista."
          : "Este link é inválido, expirou ou já foi utilizado. Solicite uma nova inscrição.",
      );
    } catch {
      setMessage("Não foi possível processar o link. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (action === "descadastrar") void run();
  }, [action, token]);
  return (
    <section className="content-page container content-detail">
      <h1>
        {action === "confirmar"
          ? "Confirme sua inscrição"
          : "Cancelar inscrição"}
      </h1>
      {demo && (
        <p className="content-notice">
          Simulação local. Nenhum e-mail real é enviado.
        </p>
      )}
      {action === "confirmar" && !done && (
        <>
          <p>
            Confirme que deseja receber as novidades da Patri Realty. Você pode
            cancelar quando quiser.
          </p>
          <button
            disabled={busy}
            className="primary"
            onClick={() => void run()}
          >
            Confirmar inscrição
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
      {demo && done && action === "confirmar" && (
        <p>
          <Link to={"/demonstracao-editorial/newsletter/descadastrar/" + token}>
            Cancelar inscrição simulada
          </Link>
        </p>
      )}
      <Link to={demo ? "/demonstracao-editorial" : "/materias"}>
        Voltar às matérias
      </Link>
    </section>
  );
}
