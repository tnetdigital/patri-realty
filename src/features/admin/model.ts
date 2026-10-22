export type Row = Record<string, unknown> & {
  id: string;
  nome?: string;
  nome_fantasia?: string;
  status?: string;
  criado_em?: string;
  atualizado_em?: string;
};
export type AdminKind =
  | "fornecedores"
  | "pedidos"
  | "usuarios"
  | "segmentos"
  | "auditoria"
  | "alteracoes"
  | "reivindicacoes"
  | "configuracoes"
  | "emails";
export type Filters = {
  q: string;
  status: string;
  uf: string;
  plano: string;
  segmento: string;
  de: string;
  ate: string;
  ator: string;
  tabela: string;
  acao: string;
  ordem: string;
  incompletos: string;
  testes: string;
  verificado: string;
  fornecedor_id: string;
  cidade: string;
  segmento_id: string;
  pagina: number;
};
export const blankFilters: Filters = {
  q: "",
  status: "",
  uf: "",
  plano: "",
  segmento: "",
  de: "",
  ate: "",
  ator: "",
  tabela: "",
  acao: "",
  ordem: "criado_em",
  incompletos: "",
  testes: "",
  verificado: "",
  fornecedor_id: "",
  cidade: "",
  segmento_id: "",
  pagina: 1,
};
export type Page = {
  items: Row[];
  total: number;
  pagina: number;
  paginas: number;
};
export type ImportRow = {
  linha: number;
  nome_fantasia: string;
  cnpj: string;
  segmento: string;
  cidade: string;
  uf: string;
  whatsapp: string;
  email: string;
  site: string;
  instagram: string;
};
export type ImportResult = {
  linha: number;
  status: "valido" | "erro" | "ignorado" | "criado";
  mensagem: string;
};
export const columns = [
  "nome_fantasia",
  "cnpj",
  "segmento",
  "cidade",
  "uf",
  "whatsapp",
  "email",
  "site",
  "instagram",
] as const;
export function parseCsv(source: string): ImportRow[] {
  if (new TextEncoder().encode(source).length > 1048576)
    throw Error("Use um CSV de até 1 MB.");
  const records: { cells: string[]; line: number }[] = [];
  let cells: string[] = [],
    cell = "",
    quoted = false,
    afterQuote = false,
    line = 1,
    start = 1;
  const text = source.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else {
        cell += c;
        if (c === "\n") line++;
      }
    } else if (c === '"') {
      if (cell || afterQuote) throw Error(`Aspas inválidas na linha ${line}.`);
      quoted = true;
    } else if (c === ",") {
      cells.push(cell);
      cell = "";
      afterQuote = false;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      cells.push(cell);
      if (cells.some((v) => v.trim())) records.push({ cells, line: start });
      cells = [];
      cell = "";
      afterQuote = false;
      line++;
      start = line;
    } else {
      if (afterQuote && c !== " " && c !== "\t")
        throw Error(`Conteúdo após aspas na linha ${line}.`);
      if (!afterQuote) cell += c;
    }
  }
  if (quoted) throw Error(`Campo sem fechar aspas na linha ${start}.`);
  cells.push(cell);
  if (cells.some((v) => v.trim())) records.push({ cells, line: start });
  const header = records.shift()?.cells.map((v) => v.trim());
  if (
    !header ||
    header.length !== columns.length ||
    new Set(header).size !== header.length ||
    columns.some((c) => !header.includes(c))
  )
    throw Error("O cabeçalho precisa conter: " + columns.join(", "));
  if (records.length > 10000)
    throw Error("Limite de 10 mil linhas por arquivo.");
  return records.map((r) => {
    if (r.cells.length !== header.length)
      throw Error(
        `Linha ${r.line}: quantidade de colunas diferente do cabeçalho.`,
      );
    return {
      ...Object.fromEntries(header.map((k, i) => [k, r.cells[i].trim()])),
      linha: r.line,
    } as ImportRow;
  });
}
export function csvText(
  rows: Record<string, unknown>[],
  keys = Object.keys(rows[0] || {}),
) {
  const cell = (v: unknown) => {
    let s =
      typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "");
    if (/^[\s]*[=+@\-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      keys.map(cell).join(","),
      ...rows.map((r) => keys.map((k) => cell(r[k])).join(",")),
    ].join("\r\n")
  );
}
export function downloadCsv(
  name: string,
  rows: Record<string, unknown>[],
  keys?: string[],
) {
  const url = URL.createObjectURL(
      new Blob([csvText(rows, keys)], { type: "text/csv;charset=utf-8" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
export const labels: Record<AdminKind, string> = {
  fornecedores: "Fornecedores",
  pedidos: "Orçamentos",
  usuarios: "Usuários",
  segmentos: "Especialidades",
  auditoria: "Auditoria",
  alteracoes: "Alterações pendentes",
  reivindicacoes: "Reivindicações",
  configuracoes: "Configurações",
  emails: "Histórico de e-mails",
};
