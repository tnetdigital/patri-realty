import {
  blankArticle,
  slugify,
  validateArticle,
  type Article,
  type Catalog,
  type Subscriber,
  type Balance,
} from "./model";
const key = "patri:content-demo:v1";
type State = {
  articles: Article[];
  catalog: Catalog;
  subscribers: Subscriber[];
  balance: Balance;
  consumed: string[];
  redirects: Record<string, string>;
};
const now = () => new Date().toISOString();
const intro =
  "Este é um conteúdo fictício de demonstração da Patri Realty. Ele permite analisar a leitura, a organização editorial e o fluxo de publicação do portal, sem representar uma notícia ou recomendação técnica.";
function seed(): State {
  const cat = {
    id: "category-demo-1",
    nome: "Gestão condominial",
    slug: "gestao-condominial",
    ativa: true,
  };
  return {
    articles: [
      {
        ...blankArticle(),
        id: "article-demo-public",
        titulo: "Planejamento da manutenção: exemplo editorial",
        slug: "planejamento-da-manutencao-exemplo",
        resumo:
          "Uma amostra fictícia para explorar o novo espaço de leitura da Patri Realty.",
        corpo: [
          { tipo: "paragrafo", texto: intro },
          { tipo: "titulo", texto: "Uma leitura organizada para o condomínio" },
          {
            tipo: "paragrafo",
            texto:
              "O editor permite organizar parágrafos, títulos, listas, imagens e tabelas. Os dados deste exemplo existem apenas para apresentar o funcionamento do projeto.",
          },
          {
            tipo: "lista",
            texto:
              "Definir prioridades\nOrganizar documentos\nAcompanhar responsáveis",
          },
        ],
        categoria_id: cat.id,
        status: "publicada",
        publicada_em: "2026-10-20T08:00:00Z",
        autor: "Redação de demonstração",
        categoria: cat.nome,
        categoria_slug: cat.slug,
      },
      {
        ...blankArticle(),
        id: "article-demo-review",
        titulo: "Empresa Exemplo apresenta conteúdo para revisão",
        slug: "empresa-exemplo-conteudo",
        resumo:
          "Matéria fictícia de fornecedor aguardando a avaliação editorial.",
        corpo: [{ tipo: "paragrafo", texto: intro }],
        categoria_id: cat.id,
        tipo: "fornecedor",
        fornecedor_id: "supplier-content-demo",
        status: "em_revisao",
        primeiro_envio_em: new Date(Date.now() - 32 * 86400000).toISOString(),
      },
    ],
    catalog: {
      categorias: [
        cat,
        {
          id: "category-demo-2",
          nome: "Sustentabilidade",
          slug: "sustentabilidade",
          ativa: true,
        },
      ],
      revistas: [],
      pautas: [],
      portais: [],
      equipe: [{ id: "editor-demo", nome: "Editor de demonstração" }],
      entregas: [],
    },
    subscribers: [],
    balance: {
      mensal: 1,
      limite: 1,
      usadas: 0,
      cortesia: 0,
      parceiro: 0,
      mes: new Date().toISOString().slice(0, 7) + "-01",
    },
    consumed: ["article-demo-review"],
    redirects: {},
  };
}
export function contentDemo(): State {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || seed();
  } catch {
    return seed();
  }
}
function write(s: State) {
  localStorage.setItem(key, JSON.stringify(s));
  window.dispatchEvent(new Event("patri:content"));
}
export function resetContentDemo() {
  write(seed());
}
export function demoSaveArticle(a: Article, sid: string | null) {
  const s = contentDemo();
  validateArticle(a, !!sid || !!a.fornecedor_id);
  const old = s.articles.find((x) => x.id === a.id);
  if (old && old.versao !== a.versao)
    throw Error("A matéria mudou. Recarregue antes de salvar");
  const row = {
    ...a,
    id: a.id || crypto.randomUUID(),
    slug: a.slug || slugify(a.titulo),
    fornecedor_id: old?.fornecedor_id || sid,
    tipo: (old?.tipo || (sid ? "fornecedor" : a.tipo)) as Article["tipo"],
    versao: (old?.versao || 0) + 1,
    atualizado_em: now(),
  };
  if (old && row.slug !== old.slug) s.redirects[old.slug] = row.slug;
  s.articles = [row, ...s.articles.filter((x) => x.id !== row.id)];
  write(s);
  return row;
}
export function demoArticleAction(
  id: string,
  action: string,
  p: Record<string, unknown> = {},
) {
  const s = contentDemo(),
    a = s.articles.find((x) => x.id === id);
  if (!a) throw Error("Matéria não encontrada");
  if (action === "enviar") {
    if (!["rascunho", "ajuste"].includes(a.status))
      throw Error("Envio não permitido");
    if (!s.consumed.includes(id)) {
      if (a.portal_id) {
        const portal = s.catalog.portais?.find(
          (p) => p.id === a.portal_id && p.ativo,
        );
        const reserved = s.articles.filter(
          (x) => x.portal_id === a.portal_id && s.consumed.includes(x.id),
        ).length;
        if (
          s.balance.parceiro < 1 ||
          !portal ||
          reserved >= portal.vagas_por_mes
        )
          throw Error("Sem vaga de portal parceiro neste mês");
        s.balance.parceiro--;
      }
      if (s.balance.mensal > 0) {
        s.balance.mensal--;
        s.balance.usadas++;
      } else if (s.balance.cortesia > 0) s.balance.cortesia--;
      else throw Error("Saldo de matérias insuficiente neste mês");
      s.consumed.push(id);
    }
    a.status = "em_revisao";
    a.primeiro_envio_em ||= now();
  } else if (action === "publicar" || action === "agendar") {
    if (a.fornecedor_id && a.status !== "em_revisao")
      throw Error("Matéria de fornecedor precisa passar pela revisão");
    validateArticle(a, !!a.fornecedor_id);
    if (
      action === "agendar" &&
      (!p.agendada_em || Date.parse(String(p.agendada_em)) <= Date.now())
    )
      throw Error("Escolha uma data futura");
    a.status = action === "agendar" ? "agendada" : "publicada";
    a.agendada_em = action === "agendar" ? String(p.agendada_em) : null;
    a.publicada_em = action === "publicar" ? now() : null;
    a.motivo = "";
  } else if (action === "ajuste" || action === "recusar") {
    if (a.status !== "em_revisao" || String(p.motivo || "").trim().length < 10)
      throw Error("Revisão exige motivo de 10 a 2000 caracteres");
    a.status = action === "ajuste" ? "ajuste" : "recusada";
    a.motivo = String(p.motivo);
  } else if (action === "arquivar") a.status = "arquivada";
  a.versao++;
  write(s);
  return a;
}
export function demoRunSchedule() {
  const s = contentDemo();
  for (const a of s.articles)
    if (
      a.status === "agendada" &&
      a.agendada_em &&
      Date.parse(a.agendada_em) <= Date.now()
    ) {
      a.status = "publicada";
      a.publicada_em = a.agendada_em;
      a.versao++;
    }
  write(s);
}
export function demoSaveResource(
  kind: string,
  rid: string | null,
  p: Record<string, unknown>,
) {
  const s = contentDemo(),
    map = {
      categoria: "categorias",
      revista: "revistas",
      pauta: "pautas",
      portal: "portais",
      entrega: "entregas",
    } as const,
    k = map[kind as keyof typeof map];
  if (!k) throw Error("Recurso inválido");
  const rows = s.catalog[k] as unknown as Record<string, unknown>[];
  const row = { ...p, id: rid || crypto.randomUUID() };
  if (
    (kind === "categoria" || kind === "revista") &&
    !row["slug" as keyof typeof row]
  )
    (row as Record<string, unknown>).slug = slugify(
      String(p.nome || p.titulo || ""),
    );
  s.catalog[k] = [row, ...rows.filter((x) => x.id !== rid)] as never;
  write(s);
  return row.id;
}
export function demoNewsletter(action: string, p: Record<string, unknown>) {
  const s = contentDemo();
  if (action === "inscrever") {
    const email = String(p.email || "")
      .trim()
      .toLowerCase();
    if (!p.aceite || !email.includes("@"))
      throw Error("Confira seu e-mail e o aceite");
    let n = s.subscribers.find((x) => x.email === email);
    if (!n) {
      n = {
        id: crypto.randomUUID(),
        email,
        nome: String(p.nome),
        cidade: String(p.cidade || ""),
        perfil: String(p.perfil || "outro"),
        confirmado: false,
        confirmado_em: null,
        descadastrado_em: null,
        origem: "demonstracao",
        criado_em: now(),
      };
      s.subscribers.push(n);
    }
    write(s);
    return n.id;
  }
  const n = s.subscribers.find((x) => x.id === p.token);
  if (!n) throw Error("Link inválido");
  if (action === "confirmar") {
    n.confirmado = true;
    n.confirmado_em = now();
    n.descadastrado_em = null;
  } else {
    n.confirmado = false;
    n.descadastrado_em = now();
  }
  write(s);
  return n.id;
}
