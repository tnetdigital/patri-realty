import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  parseCsv,
  downloadCsv,
  columns,
  type ImportRow,
  type ImportResult,
} from "./model";
import { adminImport } from "./api";
export function AdminImport({ demo, role }: { demo: boolean; role: string }) {
  const [rows, setRows] = useState<ImportRow[]>([]),
    [report, setReport] = useState<ImportResult[]>([]),
    [page, setPage] = useState(1),
    [invite, setInvite] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [batch, setBatch] = useState(crypto.randomUUID());
  const client = useQueryClient();
  async function validate(source: ImportRow[], commit = false) {
    setBusy(true);
    setPage(1);
    setError("");
    try {
      const result: ImportResult[] = [];
      const counts = new Map<string, number>();
      for (const row of source) {
        const doc = row.cnpj.replace(/\D/g, "");
        counts.set(doc, (counts.get(doc) || 0) + 1);
      }

      for (let i = 0; i < source.length; i += 100) {
        const id = commit
          ? batch.slice(0, 24) +
            ((parseInt(batch.slice(-12), 16) + i) % 281474976710656)
              .toString(16)
              .padStart(12, "0")
          : crypto.randomUUID();
        result.push(
          ...(await adminImport(
            source
              .slice(i, i + 100)
              .filter((x) => counts.get(x.cnpj.replace(/\D/g, "")) === 1),
            commit,
            id,
            invite,
            demo,
            role,
          )),
        );
        result.push(
          ...source
            .slice(i, i + 100)
            .filter((x) => (counts.get(x.cnpj.replace(/\D/g, "")) || 0) > 1)
            .map((x) => ({
              linha: x.linha,
              status: "erro" as const,
              mensagem: "CNPJ repetido no arquivo",
            })),
        );
        setReport([...result].sort((a, b) => a.linha - b.linha));
      }
      if (commit) {
        setDone(true);
        await client.invalidateQueries({ queryKey: ["admin"] });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na importação.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-panel">
      <h2>Importação de fornecedores</h2>
      <p>
        CSV UTF-8, separado por vírgulas, até 1 MB e 10 mil linhas. A validação
        identifica cada linha antes de criar rascunhos sem proprietário.
      </p>
      <p>
        Colunas: <span className="admin-wrap">{columns.join(", ")}</span>
      </p>
      <button
        onClick={() => downloadCsv("modelo-fornecedores.csv", [], [...columns])}
      >
        Baixar modelo CSV
      </button>
      <label>
        Arquivo CSV
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy || role !== "admin"}
          onChange={async (e) => {
            setReport([]);
            setDone(false);
            setError("");
            setBatch(crypto.randomUUID());
            try {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 1048576) throw Error("Use um CSV de até 1 MB.");
              const source = parseCsv(
                new TextDecoder("utf-8", { fatal: true }).decode(
                  await file.arrayBuffer(),
                ),
              );
              if (!source.length) throw Error("O CSV não contém fornecedores.");
              setRows(source);
              await validate(source);
            } catch (e) {
              setRows([]);
              setError(e instanceof Error ? e.message : "Arquivo inválido.");
            }
          }}
        />
      </label>
      <label className="admin-check">
        <input
          type="checkbox"
          checked={invite}
          disabled={busy || done}
          onChange={(e) => {
            setInvite(e.target.checked);
            setReport([]);
          }}
        />
        Convidar por e-mail para assumir a página (expira em 14 dias)
      </label>
      {rows.length > 0 && (
        <button disabled={busy || done} onClick={() => void validate(rows)}>
          Validar linhas
        </button>
      )}
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {busy && <p role="status">Processando lote de até 100 linhas…</p>}
      {report.length > 0 && (
        <>
          <div className="admin-summary" role="status">
            <span>
              {report.filter((x) => x.status === "valido").length} válidos
            </span>
            <span>
              {report.filter((x) => x.status === "criado").length} criados
            </span>
            <span>
              {report.filter((x) => x.status === "ignorado").length} ignorados
            </span>
            <span>
              {report.filter((x) => x.status === "erro").length} com erro
            </span>
          </div>
          <button
            onClick={() => downloadCsv("relatorio-importacao.csv", report)}
          >
            Baixar relatório por linha
          </button>
          <div className="admin-table-wrap">
            <table>
              <caption>Prévia e resultado da importação</caption>
              <thead>
                <tr>
                  <th>Linha do CSV</th>
                  <th>Empresa</th>
                  <th>Status</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {report.slice((page - 1) * 25, page * 25).map((x) => (
                  <tr key={x.linha}>
                    <td>{x.linha}</td>
                    <td>
                      {rows.find((r) => r.linha === x.linha)?.nome_fantasia}
                    </td>
                    <td>{x.status}</td>
                    <td>{x.mensagem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="admin-pagination" aria-label="Páginas do relatório">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              Anterior
            </button>
            <span>
              Página {page} de {Math.ceil(report.length / 25)}
            </span>
            <button
              disabled={page * 25 >= report.length}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </button>
          </nav>
          {!done && (
            <button
              className="directory-button"
              disabled={
                busy ||
                role !== "admin" ||
                !report.some((x) => x.status === "valido")
              }
              onClick={() => {
                if (
                  window.confirm(
                    "Importar os registros válidos como rascunhos? Linhas com erro não serão criadas.",
                  )
                )
                  void validate(rows, true);
              }}
            >
              Confirmar importação
            </button>
          )}
        </>
      )}
      {demo && (
        <p className="admin-muted">
          Simulação local: empresas e convites ficam somente neste navegador.
          Nenhum e-mail é enviado.
        </p>
      )}
    </section>
  );
}
