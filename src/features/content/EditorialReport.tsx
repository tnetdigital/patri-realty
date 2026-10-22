import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { editorialReport } from "./api";
import { downloadCsv } from "../admin/model";
export function EditorialReport({
  sid,
  demo,
}: {
  sid: string | null;
  demo: boolean;
}) {
  const [from, setFrom] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["editorial-report", sid, from, to, page, demo],
    queryFn: () =>
      demo
        ? Promise.resolve({ items: [], total: 0 })
        : editorialReport(sid, from, to, page),
    enabled: demo || sid !== "",
  });
  return (
    <section className="card">
      <h2>Resultados editoriais</h2>
      {demo && <p>Demonstração sem métricas reais.</p>}
      <p>
        Tempo médio considera blocos de 30 segundos de leitura visível e
        autorizada.
      </p>
      <div className="filter-row">
        <label>
          De
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
          Até
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
        <p role="alert">Não foi possível consultar o relatório.</p>
      ) : (
        q.data && (
          <>
            <button
              disabled={!q.data.items.length}
              onClick={() => downloadCsv("editorial.csv", q.data.items)}
            >
              Exportar página do relatório
            </button>
            {q.data.items.length === 0 && (
              <p>Nenhuma leitura registrada neste período.</p>
            )}
            {q.data.items.map((a) => (
              <article key={a.id}>
                <h3>{a.titulo}</h3>
                <p>
                  Leituras: {a.leituras} · Tempo médio: {a.tempo_medio_segundos}{" "}
                  s · Cliques para o perfil: {a.cliques_perfil}
                </p>
              </article>
            ))}
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
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
    </section>
  );
}
