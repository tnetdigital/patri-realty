import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { editorialReport } from "./api";
import { downloadCsv } from "../admin/model";
import { metricWindow } from "../measurement/metrics";
import { today, previousMonth } from "../growth/model";
export function EditorialReport({
  sid,
  demo,
}: {
  sid: string | null;
  demo: boolean;
}) {
  const [from, setFrom] = useState(previousMonth);
  const [to, setTo] = useState(today);
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["editorial-report", sid, from, to, page, demo],
    queryFn: () =>
      demo
        ? Promise.resolve({ items: [], total: 0 })
        : editorialReport(sid, from, to, page),
    enabled: (demo || sid !== "") && metricWindow(from, to),
  });
  return (
    <section className="card">
      <h2>Resultados editoriais</h2>
      {demo && <p>Demonstração sem métricas reais.</p>}
      <p>
        Fonte: eventos próprios sob consentimento, agregados por dia em
        America/Sao_Paulo. Aberturas não comprovam leitura completa. O proxy de
        atividade divide intervalos registrados de 30 segundos pelas aberturas;
        não é tempo médio real de leitura ou leitores únicos. Última agregação
        não informada pela fonte.
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
      {!metricWindow(from, to) && (
        <p role="alert">
          Selecione datas válidas com intervalo de até 365 dias.
        </p>
      )}
      {q.isFetching ? (
        <p role="status">Consultando relatório editorial…</p>
      ) : q.isError ? (
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
              <p>
                Nenhuma linha de métrica retornada nesta página do relatório.
                Isso não comprova ausência de leitores.
              </p>
            )}
            {q.data.items.map((a) => (
              <article key={a.id}>
                <h3>{a.titulo}</h3>
                <p>
                  Aberturas registradas: {a.aberturas ?? "Não disponível"} ·
                  Proxy de atividade por abertura:{" "}
                  {a.atividade_por_abertura === null
                    ? "Não disponível"
                    : a.atividade_por_abertura + " s"}{" "}
                  · Cliques para o perfil:{" "}
                  {a.cliques_perfil ?? "Não disponível"}
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
