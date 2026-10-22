import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { commercialCalendar } from "./api";
import { money } from "./model";
export function CommercialCalendar({ demo }: { demo: boolean }) {
  const [from, setFrom] = useState(
    new Date().toISOString().slice(0, 7) + "-01",
  );
  const [to, setTo] = useState(
    new Date(Date.now() + 31 * 86400000).toISOString().slice(0, 10),
  );
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["commercial-calendar", from, to, page, demo],
    queryFn: () => commercialCalendar(from, to, page),
    enabled: !demo,
  });
  return (
    <details className="card">
      <summary>Calendário e faturamento</summary>
      <h2>Faturamento por contrato</h2>
      <p>
        Valores integrais dos contratos com vigência no período, sem rateio
        mensal. Campanhas só aparecem no portal dentro da vigência ativa.
      </p>
      {demo ? (
        <p>[PENDENTE: conectar dados para consultar faturamento real]</p>
      ) : (
        <>
          <div className="filter-row">
            <label>
              Início do período
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              Fim do período
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
          {q.isError ? (
            <p role="alert">Não foi possível consultar o calendário.</p>
          ) : (
            q.data && (
              <>
                <p>
                  Contratado: {money(q.data.faturamento_centavos)} · Recebido:{" "}
                  {money(q.data.recebido_centavos)}
                </p>
                {q.data.items.length === 0 && (
                  <p>Nenhum contrato neste período.</p>
                )}
                {q.data.items.map((c) => (
                  <article key={c.id}>
                    <h3>{c.anunciante_nome}</h3>
                    <p>
                      {new Date(c.inicio).toLocaleDateString("pt-BR")} a{" "}
                      {new Date(c.fim).toLocaleDateString("pt-BR")} ·{" "}
                      {money(c.faturamento_centavos)} ·{" "}
                      {c.pago ? "Pago" : "A receber"}
                    </p>
                    {c.exibicoes.map((x, i) => (
                      <p key={i}>
                        Exibição de {x.tipo}:{" "}
                        {new Date(x.inicio).toLocaleDateString("pt-BR")} a{" "}
                        {new Date(x.fim).toLocaleDateString("pt-BR")}
                      </p>
                    ))}
                  </article>
                ))}
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </button>
                <span> Página {page} </span>
                <button
                  disabled={page * 25 >= q.data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </button>
              </>
            )
          )}
        </>
      )}
    </details>
  );
}
