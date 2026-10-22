import { useQuery } from "@tanstack/react-query";
import { jobStatus } from "./api";
export function JobStatus() {
  const q = useQuery({
    queryKey: ["job-status"],
    queryFn: jobStatus,
    refetchInterval: 60000,
  });
  return (
    <aside className="card">
      <h2>Saúde das rotinas</h2>
      {q.isError ? (
        <p role="alert">Não foi possível consultar as rotinas.</p>
      ) : (
        <p>
          Falhas nas últimas 24 horas:{" "}
          <strong>{q.data?.falhas_24h ?? "…"}</strong>
        </p>
      )}
      {q.data?.ultimas.map((x, i) => (
        <p key={i}>
          {x.rotina}: {x.codigo} ·{" "}
          {new Date(x.criado_em).toLocaleString("pt-BR")}
        </p>
      ))}
    </aside>
  );
}
