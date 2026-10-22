import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ownQuoteHistory } from "../shared/api";
export function QuotationHistory() {
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["my-quotes", page],
    queryFn: () => ownQuoteHistory(page),
  });
  return (
    <section aria-label="Meus pedidos de orçamento">
      <h2>Meus pedidos de orçamento</h2>
      {q.isPending ? (
        <p>Carregando pedidos…</p>
      ) : q.isError ? (
        <p role="alert">Não foi possível carregar seus pedidos.</p>
      ) : (
        <>
          {q.data.items.length === 0 ? (
            <p>Você ainda não enviou pedidos de orçamento.</p>
          ) : (
            q.data.items.map((x) => (
              <article className="card" key={x.id}>
                <h3>{x.empresa}</h3>
                <p>{x.mensagem}</p>
                <p>
                  {x.status.replaceAll("_", " ")} ·{" "}
                  {new Date(x.criado_em).toLocaleDateString("pt-BR")}
                </p>
              </article>
            ))
          )}
          <div>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
            <span> Página {page} </span>
            <button
              disabled={page * 20 >= q.data.total}
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
