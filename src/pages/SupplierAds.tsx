import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ownContracts } from "../features/shared/api";
import { commercialDemo } from "../features/commercial/demo";
import { money, type Contract } from "../features/commercial/model";
import "../features/commercial/commercial.css";
export default function SupplierAds({ demo = false }: { demo?: boolean }) {
  const q = useQuery({
    queryKey: ["own-contracts", demo],
    queryFn: async () => {
      if (demo) return commercialDemo().contratos;
      const { data, error } = await ownContracts();
      if (error) throw error;
      return data as Contract[];
    },
  });
  return (
    <section className="container commercial-page">
      <span className="eyebrow">PRESENÇA NO PORTAL</span>
      <h1>Meus anúncios e contratos</h1>
      {demo && (
        <p className="commercial-demo">
          Exemplo fictício, sem contratação ou cobrança.
        </p>
      )}
      <p>
        Acompanhe vigência e confirmação de pagamento. Solicite ao comercial seu
        link de resultados.
      </p>
      {q.isPending ? (
        <p role="status">Carregando…</p>
      ) : q.isError ? (
        <p role="alert">Não foi possível consultar seus contratos.</p>
      ) : q.data?.length ? (
        <div className="commercial-cards">
          {q.data.map((c) => (
            <article className="commercial-card" key={c.id}>
              <h2>{c.anunciante_nome}</h2>
              <p>
                {c.produto} · {c.status}
              </p>
              <p>
                {new Date(c.inicio).toLocaleDateString("pt-BR")} a{" "}
                {new Date(c.fim).toLocaleDateString("pt-BR")}
              </p>
              <p>
                {money(c.valor_centavos)} ·{" "}
                {c.pago ? "Pagamento confirmado" : "Pagamento pendente"}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="commercial-empty">
          Você ainda não possui contratos vinculados.
        </p>
      )}
      <p>
        <Link to={demo ? "/demonstracao" : "/painel"}>Voltar ao painel</Link>
      </p>
    </section>
  );
}
