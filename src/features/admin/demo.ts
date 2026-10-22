import { validCnpj as cnpjValid } from "../auth/schema";
import taxonomy from "../directory/taxonomy.json";
import type {
  Row,
  AdminKind,
  Filters,
  Page,
  ImportRow,
  ImportResult,
} from "./model";
const key = "patri:admin-demo:v1";
type State = {
  tables: Record<string, Row[]>;
  trials: Record<string, string>;
  batches: Record<string, ImportResult[]>;
};
const now = () => new Date().toISOString();
function seed(): State {
  return {
    tables: {
      fornecedores: [
        {
          id: "empresa-demo-1",
          nome: "Empresa Exemplo em Análise",
          nome_fantasia: "Empresa Exemplo em Análise",
          cnpj: "11222333000181",
          email: "fornecedor@example.com",
          status: "em_analise",
          dono_id: "usuario-demo-2",
          logo_url: "https://example.com/logo.webp",
          descricao_curta: "Empresa fictícia para análise da administração.",
          sobre:
            "Perfil fictício criado para demonstração. Nenhum dado representa um fornecedor real.",
          whatsapp: "11988887777",
          cidade: "São Paulo",
          uf: "SP",
          plano_codigo: "gratuito",
          completude: 85,
          verificado: false,
          segmentos: [
            {
              id: "segment-demo-0",
              nome: "Manutenção predial",
              slug: "manutencao-predial",
            },
          ],
          cobertura: [{ uf: "SP" }],
          criado_em: now(),
          atualizado_em: now(),
        },
      ],
      usuarios: [
        {
          id: "usuario-demo-1",
          nome: "Administrador de demonstração",
          email: "admin@example.com",
          ativo: true,
          papeis: ["admin"],
          criado_em: now(),
        },
        {
          id: "usuario-demo-2",
          nome: "Fornecedor de demonstração",
          email: "fornecedor@example.com",
          ativo: true,
          papeis: ["fornecedor"],
          criado_em: now(),
        },
      ],
      pedidos: [
        {
          id: "pedido-demo-1",
          fornecedor_id: "empresa-demo-1",
          nome: "Condomínio Exemplo",
          condominio_nome: "Condomínio Exemplo",
          email: "sindico@example.com",
          telefone: "11988887777",
          cidade: "São Paulo",
          uf: "SP",
          status: "sem_resposta",
          mensagem: "Solicitação fictícia para analisar a gestão de pedidos.",
          empresa: "Empresa Exemplo em Análise",
          segmento: "Manutenção predial",
          criado_em: new Date(Date.now() - 49 * 3600000).toISOString(),
        },
      ],
      segmentos: taxonomy.segments.map((s, i) => ({
        id: "segment-demo-" + i,
        nome: s.nome,
        slug: s.slug,
        grupo: s.grupo,
        ativo: true,
        ordem: i + 1,
        fornecedores: 0,
        criado_em: now(),
      })),
      auditoria: [],
      alteracoes: [],
      reivindicacoes: [],
      emails: [],
      configuracoes: [
        {
          id: "config-demo",
          nome: "prazos_operacionais",
          chave: "prazos_operacionais",
          valor: { dias_teste: 90, horas_alerta: 48 },
          criado_em: now(),
        },
      ],
    },
    trials: {},
    batches: {},
  };
}
function read(): State {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : seed();
  } catch {
    return seed();
  }
}
function save(s: State) {
  localStorage.setItem(key, JSON.stringify(s));
}
export function resetAdminDemo() {
  save(seed());
}
function guard(role: string) {
  if (role !== "admin")
    throw Error("O papel comercial pode somente consultar.");
}
function audit(
  s: State,
  kind: string,
  id: string,
  action: string,
  before: unknown,
  after: unknown,
) {
  s.tables.auditoria.unshift({
    id: crypto.randomUUID(),
    nome: "Administrador de demonstração",
    ator_id: "usuario-demo-1",
    acao: action,
    tabela: kind,
    registro_id: id,
    antes: structuredClone(before),
    depois: structuredClone(after),
    criado_em: now(),
  });
}
export function demoList(
  kind: string,
  f: Partial<Filters>,
  role: string,
): Page | Record<string, unknown> {
  if (
    role !== "admin" &&
    !["dashboard", "fornecedores", "pedidos"].includes(kind)
  )
    throw Error("Acesso administrativo negado");
  const s = read();
  if (kind === "dashboard")
    return {
      analise: s.tables.fornecedores.filter((x) => x.status === "em_analise")
        .length,
      ajustes: s.tables.fornecedores.filter(
        (x) => x.status === "ajuste_solicitado",
      ).length,
      incompletos: 0,
      testes_vencendo: 0,
      pedidos_semana: s.tables.pedidos.length,
      sem_resposta: s.tables.pedidos.filter((x) => x.status === "sem_resposta")
        .length,
      semanas: [],
    };
  let rows = s.tables[kind] || [];
  rows = rows.filter(
    (x) =>
      (!f.q ||
        JSON.stringify(x)
          .toLocaleLowerCase("pt-BR")
          .includes(f.q.toLocaleLowerCase("pt-BR"))) &&
      (!f.status || x.status === f.status) &&
      (!f.uf || x.uf === f.uf) &&
      (!f.plano || x.plano_codigo === f.plano) &&
      (!f.de || String(x.criado_em) >= f.de) &&
      (!f.ate || String(x.criado_em) <= f.ate) &&
      (!f.tabela || x.tabela === f.tabela) &&
      (!f.acao || x.acao === f.acao),
  );
  rows.sort((a, b) =>
    String(b[f.ordem === "nome" ? "nome" : "criado_em"]).localeCompare(
      String(a[f.ordem === "nome" ? "nome" : "criado_em"]),
    ),
  );
  const p = f.pagina || 1;
  return {
    items: rows.slice((p - 1) * 25, p * 25),
    total: rows.length,
    pagina: p,
    paginas: Math.ceil(rows.length / 25),
  };
}
export function demoAct(
  kind: AdminKind,
  id: string,
  action: string,
  data: Record<string, unknown>,
  role: string,
) {
  guard(role);
  const s = read();
  let row = s.tables[kind]?.find((x) => x.id === id);
  if (!row && kind === "segmentos" && action === "salvar") {
    row = { id: crypto.randomUUID(), criado_em: now() };
    s.tables.segmentos.push(row);
  }
  if (!row) throw Error("Registro não encontrado");
  const before = structuredClone(row);
  if (kind === "fornecedores") {
    if (action === "aprovar") {
      if (
        row.status !== "em_analise" ||
        !Object.values((data.checklist as object) || {}).length ||
        Object.values(data.checklist as object).some((x) => !x)
      )
        throw Error("Conclua o checklist de revisão.");
      row.status = "publicado";
      if (!s.trials[String(row.cnpj)])
        s.trials[String(row.cnpj)] = new Date(
          Date.now() + 90 * 86400000,
        ).toISOString();
      row.teste_fim = row.teste_fim || s.trials[String(row.cnpj)];
      row.teste_inicio = row.teste_inicio || now();
      row.plano_codigo = "teste";
    } else if (["ajuste", "recusar", "suspender"].includes(action)) {
      if (String(data.motivo || "").trim().length < 10)
        throw Error("Informe um motivo de pelo menos 10 caracteres.");
      row.status =
        action === "ajuste"
          ? "ajuste_solicitado"
          : action === "recusar"
            ? "recusado"
            : "suspenso";
      row.motivo_status = data.motivo;
    } else if (action === "reativar") row.status = "em_analise";
    else if (action === "verificado") row.verificado = !!data.valor;
    else if (action === "plano") row.plano_codigo = data.plano;
    else if (action === "estender_teste") {
      if (!row.teste_fim) throw Error("Não há teste ativo.");
      row.teste_fim = new Date(
        new Date(String(row.teste_fim)).getTime() +
          Number(data.dias) * 86400000,
      ).toISOString();
    } else if (action === "creditos")
      row.creditos = Number(row.creditos || 0) + Number(data.quantidade);
    else if (action === "convidar")
      s.tables.emails.unshift({
        id: crypto.randomUUID(),
        nome: String(row.email || ""),
        status: "simulado",
        template: "convite_proprietario",
        criado_em: now(),
      });
    else if (action === "leitura") {
      audit(s, kind, id, "VISUALIZACAO_FORNECEDOR", null, {
        modo: "somente_leitura",
      });
      save(s);
      return structuredClone(row);
    }
  } else if (kind === "usuarios") {
    if (action === "ativo") {
      if (row.id === "usuario-demo-1" && data.valor === false)
        throw Error("O último admin ativo não pode ser desativado");
      row.ativo = data.valor;
    } else if (action === "papel") {
      if (
        row.id === "usuario-demo-1" &&
        data.papel === "admin" &&
        data.valor === false
      )
        throw Error("O último admin ativo não pode ser removido");
      const roles = row.papeis as string[];
      row.papeis = data.valor
        ? [...new Set([...roles, String(data.papel)])]
        : roles.filter((x) => x !== data.papel);
    } else
      s.tables.emails.unshift({
        id: crypto.randomUUID(),
        nome: String(row.email || ""),
        status: "simulado",
        template: action,
        criado_em: now(),
      });
  } else if (kind === "pedidos") {
    if (action === "spam") row.status = "spam";
    else if (action === "encaminhar")
      throw Error(
        "Cadastre outra empresa publicada da mesma especialidade antes de encaminhar.",
      );
    else
      s.tables.emails.unshift({
        id: crypto.randomUUID(),
        nome: String(row.email || ""),
        status: "simulado",
        template: "novo_orcamento",
        criado_em: now(),
      });
  } else if (kind === "segmentos") {
    if (action === "mover") {
      const sorted = [...s.tables.segmentos].sort(
        (a, b) => Number(a.ordem) - Number(b.ordem),
      );
      const n = sorted.findIndex((x) => x.id === id);
      const other = data.alvo_id
        ? sorted.find((x) => x.id === data.alvo_id)
        : sorted[n + (data.direcao === "subir" ? -1 : 1)];
      if (other) {
        const temp = row.ordem;
        row.ordem = other.ordem;
        other.ordem = temp;
      }
    } else if (action === "salvar") Object.assign(row, data);
    else {
      if (Number(row.fornecedores) > 0)
        throw Error("Especialidade em uso: desative em vez de excluir");
      s.tables.segmentos = s.tables.segmentos.filter((x) => x.id !== id);
    }
  } else if (kind === "configuracoes") row.valor = data.valor;
  else if (kind === "alteracoes") row.pendente = false;
  else if (kind === "reivindicacoes")
    row.status = action === "aprovar" ? "aprovada" : "recusada";
  row.atualizado_em = now();
  audit(s, kind, id, action, before, row);
  save(s);
  return { ok: true, id };
}
export async function demoImport(
  rows: ImportRow[],
  commit: boolean,
  batch: string,
  invite: boolean,
  role: string,
): Promise<ImportResult[]> {
  guard(role);
  const s = read();
  if (commit && s.batches[batch]) return s.batches[batch];
  const loaders = import.meta.glob<{ default: { nome: string; uf: string }[] }>(
    "../directory/locations/*.json",
  );
  const cities = new Map<string, { nome: string; uf: string }[]>();
  for (const uf of new Set(rows.map((x) => x.uf.toUpperCase()))) {
    const load = loaders[`../directory/locations/${uf}.json`];
    cities.set(uf, load ? (await load()).default : []);
  }
  const out = rows.map((x) => {
    const doc = x.cnpj.replace(/\D/g, "");
    let status: ImportResult["status"] = "valido",
      mensagem = "Pronto para importar";
    if (!cnpjValid(doc)) {
      status = "erro";
      mensagem = "CNPJ inválido";
    } else if (
      !s.tables.segmentos.some(
        (y) =>
          y.slug === x.segmento ||
          String(y.nome).toLowerCase() === x.segmento.toLowerCase(),
      )
    ) {
      status = "erro";
      mensagem = "Especialidade não encontrada";
    } else if (
      !cities.get(x.uf.toUpperCase())?.some(
        (c) =>
          c.nome
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase() ===
          x.cidade
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase(),
      )
    ) {
      status = "erro";
      mensagem = "Cidade/UF não encontrada";
    } else if (s.tables.fornecedores.some((y) => y.cnpj === doc)) {
      status = "ignorado";
      mensagem = "CNPJ já cadastrado";
    } else if (
      rows.filter((y) => y.cnpj.replace(/\D/g, "") === doc).length > 1
    ) {
      status = "erro";
      mensagem = "CNPJ repetido no lote";
    } else if (commit) {
      status = "criado";
      mensagem = "Rascunho sem proprietário";
      const row = {
        ...x,
        id: crypto.randomUUID(),
        nome: x.nome_fantasia,
        cnpj: doc,
        status: "rascunho",
        dono_id: null,
        completude: 0,
        criado_em: now(),
        atualizado_em: now(),
      };
      s.tables.fornecedores.push(row);
      audit(s, "fornecedores", row.id, "IMPORTACAO_CSV", null, row);
      if (invite)
        s.tables.emails.push({
          id: crypto.randomUUID(),
          nome: x.email,
          status: "simulado",
          template: "convite_proprietario",
          criado_em: now(),
        });
    }
    return { linha: x.linha, status, mensagem };
  });
  if (commit) {
    s.batches[batch] = out;
    save(s);
  }
  return out;
}
