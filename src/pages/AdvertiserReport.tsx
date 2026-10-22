import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useDirectoryRuntime } from "../features/directory/api";
import {
  advertiserReport,
  bannerDestination,
} from "../features/commercial/api";
import "../features/commercial/commercial.css";
const today = () => new Date().toISOString().slice(0, 10);
export default function AdvertiserReport({ demo = false }: { demo?: boolean }) {
  const { token = "" } = useParams(),
    runtime = useDirectoryRuntime(),
    r = demo ? { ...runtime, source: "demo" as const } : runtime,
    [from, setFrom] = useState(() =>
      new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    ),
    [to, setTo] = useState(today);
  const q = useQuery({
    queryKey: ["advertiser-report", r.source, token, from, to],
    queryFn: () => advertiserReport(r, token, from, to),
    enabled: !!from && !!to && from <= to,
    retry: false,
  });
  useEffect(() => {
    document.title = "Relatório de campanha | Patri Realty";
    const robots = document.querySelector("meta[name=robots]");
    robots?.setAttribute("content", "noindex,nofollow");
    const m = document.createElement("meta");
    m.name = "referrer";
    m.content = "no-referrer";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
  const report = q.data;
  function csv() {
    if (!report) return;
    const data = [
      "dia;impressoes;cliques",
      ...report.diario.map((d) => [d.dia, d.impressoes, d.cliques].join(";")),
    ].join("\n");
    const url = URL.createObjectURL(
        new Blob(["\uFEFF" + data], { type: "text/csv;charset=utf-8" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "relatorio-campanha.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="container commercial-page">
      <span className="eyebrow">PATRI REALTY · RESULTADOS</span>
      <h1>Relatório do anunciante</h1>
      {demo && (
        <p className="commercial-demo">
          Demonstração: números gerados apenas neste navegador.
        </p>
      )}
      <div className="report-filters">
        <label>
          De
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Até
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button onClick={() => void q.refetch()}>Atualizar</button>
      </div>
      {q.isFetching ? (
        <p role="status">Consultando resultados…</p>
      ) : q.isError ? (
        <p role="alert">Serviço indisponível. Tente atualizar.</p>
      ) : !report ? (
        <p className="commercial-empty">
          Link inválido, revogado ou expirado. Solicite um novo relatório ao
          atendimento comercial. O intervalo máximo é de 365 dias.
        </p>
      ) : (
        <>
          <h2>{report.anunciante}</h2>
          <p>
            Campanha de {new Date(report.inicio).toLocaleDateString("pt-BR")} a{" "}
            {new Date(report.fim).toLocaleDateString("pt-BR")}.
          </p>
          <div className="commercial-stats">
            <div>
              <strong>{report.impressoes}</strong>
              <span>Impressões</span>
            </div>
            <div>
              <strong>{report.cliques}</strong>
              <span>Cliques</span>
            </div>
            <div>
              <strong>{report.ctr}%</strong>
              <span>CTR</span>
            </div>
          </div>
          <p>
            Contagens operacionais, sem identificação de visitantes, registradas
            com consentimento para análises. CTR = cliques ÷ impressões × 100.
          </p>
          <div className="commercial-actions">
            <button onClick={() => window.print()}>
              Imprimir / salvar PDF
            </button>
            <button onClick={csv}>Exportar CSV</button>
          </div>
          <table className="report-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Impressões</th>
                <th>Cliques</th>
              </tr>
            </thead>
            <tbody>
              {report.diario.map((d) => (
                <tr key={d.dia}>
                  <td>{d.dia.split("-").reverse().join("/")}</td>
                  <td>{d.impressoes}</td>
                  <td>{d.cliques}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!report.diario.length && <p>Sem eventos no período selecionado.</p>}
        </>
      )}
      <p>
        <Link to="/">Voltar ao portal</Link>
      </p>
    </section>
  );
}
export function AdRedirect() {
  const { id = "" } = useParams(),
    r = useDirectoryRuntime(),
    q = useQuery({
      queryKey: ["banner-destination", r.source, id],
      queryFn: () => bannerDestination(r, id),
      retry: false,
    });
  useEffect(() => {
    if (q.data && /^https:\/\//.test(q.data)) window.location.assign(q.data);
  }, [q.data]);
  return (
    <section className="container page">
      <h1>{q.isPending ? "Abrindo anunciante…" : "Publicidade"}</h1>
      {q.data ? (
        <a href={q.data} rel="noreferrer">
          Continuar para o anunciante
        </a>
      ) : (
        !q.isPending && <p>Esta campanha não está disponível.</p>
      )}
      <Link to="/">Voltar ao portal</Link>
    </section>
  );
}
