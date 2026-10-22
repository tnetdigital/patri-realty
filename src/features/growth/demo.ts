import {
  reviewValid,
  today,
  type Review,
  type ReviewPage,
  type Interest,
  type Metrics,
} from "./model";
const key = "patri:growth-demo:v1";
type State = {
  reviews: (Review & { author: string })[];
  interests: Interest[];
  events: {
    id: string;
    tipo: string;
    target: string;
    dia: string;
    quantidade: number;
  }[];
  premium: boolean;
  actor: string;
};
const seed = (): State => ({
  reviews: [],
  interests: [],
  events: [],
  premium: true,
  actor: "visitante",
});
export function growthDemo(): State {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || seed();
  } catch {
    return seed();
  }
}
export function writeGrowth(s: State) {
  localStorage.setItem(key, JSON.stringify(s));
  window.dispatchEvent(new Event("patri:growth"));
}
export const resetGrowth = () => writeGrowth(seed());
export function demoReviewList(
  sid: string,
  mode: string,
  page: number,
): ReviewPage {
  const s = growthDemo(),
    all = s.reviews.filter(
      (r) =>
        (["admin", "pendentes", "denunciadas"].includes(mode) ||
          r.fornecedor_id === sid) &&
        (mode === "publico"
          ? r.status === "publicada"
          : mode === "minha"
            ? r.author === s.actor
            : mode === "pendentes"
              ? r.status === "pendente"
              : mode === "denunciadas"
                ? !!r.denuncia_motivo
                : true),
    );
  const published = all.filter((r) => r.status === "publicada");
  return {
    items: all.slice((page - 1) * 20, page * 20).map(({ author, ...r }) => r),
    total: all.length,
    media: published.length
      ? Math.round(
          (published.reduce((n, r) => n + r.nota, 0) / published.length) * 10,
        ) / 10
      : null,
    publicadas: published.length,
  };
}
export function demoSaveReview(
  sid: string,
  p: { nota: number; titulo: string; texto: string; condominio: string },
) {
  const s = growthDemo();
  if (s.actor === "visitante") throw Error("Entre na simulação para avaliar.");
  if (s.actor === "fornecedor")
    throw Error("Você não pode avaliar uma empresa com a qual possui vínculo");
  reviewValid(p);
  const old = s.reviews.find(
      (r) => r.fornecedor_id === sid && r.author === s.actor,
    ),
    id = old?.id || crypto.randomUUID();
  s.reviews = [
    {
      id,
      fornecedor_id: sid,
      empresa: "Fornecedor Exemplo",
      author: s.actor,
      ...p,
      status: "pendente",
      resposta_fornecedor: "",
      criado_em: old?.criado_em || new Date().toISOString(),
      denuncia_motivo: "",
    },
    ...s.reviews.filter((r) => r.id !== id),
  ];
  writeGrowth(s);
  return id;
}
export function demoReviewAction(id: string, action: string, body: string) {
  const s = growthDemo(),
    r = s.reviews.find((r) => r.id === id);
  if (!r) throw Error("Avaliação indisponível");
  if (/[<>]/.test(body) || body.length > 1000) throw Error("Texto inválido");
  if (action === "responder") {
    if (!s.premium)
      throw Error(
        "Responder avaliações está disponível nos planos Premium e Destaque",
      );
    if (r.status !== "publicada" || body.trim().length < 10)
      throw Error("Use ao menos 10 caracteres em uma avaliação publicada");
    r.resposta_fornecedor = body;
    r.resposta_em = new Date().toISOString();
  } else if (action === "denunciar") {
    if (body.trim().length < 10)
      throw Error("Explique a denúncia com ao menos 10 caracteres");
    r.denuncia_motivo = body;
  } else {
    if (action === "remover" && body.trim().length < 10)
      throw Error("Informe o motivo da remoção");
    r.status = action === "remover" ? "removida" : "publicada";
    r.denuncia_motivo = "";
    r.motivo_moderacao = action === "remover" ? body : "";
  }
  writeGrowth(s);
}
export function demoMetricEvent(type: string, target: string, id: string) {
  const s = growthDemo();
  if (s.events.some((e) => e.id === id)) return;
  s.events.push({ id, tipo: type, target, dia: today(), quantidade: 1 });
  writeGrowth(s);
}
export function sampleMetrics() {
  const s = growthDemo();
  s.events = [];
  for (let i = 0; i < 60; i++) {
    const dia = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    for (const type of [
      "visualizacao_perfil",
      "clique_whatsapp",
      "orcamento_enviado",
    ])
      s.events.push({
        id: crypto.randomUUID(),
        tipo: type,
        target: "demo-company-0",
        dia,
        quantidade:
          type === "visualizacao_perfil"
            ? i < 30
              ? 3
              : 5
            : type === "clique_whatsapp"
              ? 2
              : 1,
      });
  }
  writeGrowth(s);
}
export function demoMetrics(
  sid: string | null,
  from: string,
  to: string,
): Metrics {
  const s = growthDemo();
  if (!s.premium && sid !== null)
    return { bloqueado: true, atual: null, anterior: null, diario: [] };
  if (
    !from ||
    !to ||
    to < from ||
    Date.parse(to) - Date.parse(from) > 365 * 86400000
  )
    throw Error("Selecione um intervalo de até 365 dias");
  const n = Date.parse(to) - Date.parse(from) + 86400000,
    prevFrom = new Date(Date.parse(from) - n).toISOString().slice(0, 10),
    prevTo = new Date(Date.parse(from) - 86400000).toISOString().slice(0, 10),
    rows = s.events.filter((e) => !sid || e.target === sid),
    sum = (a: string, b: string) =>
      rows
        .filter((e) => e.dia >= a && e.dia <= b)
        .reduce<Record<string, number>>(
          (acc, e) => ({ ...acc, [e.tipo]: (acc[e.tipo] || 0) + e.quantidade }),
          {},
        ),
    atual = sum(from, to),
    anterior = sum(prevFrom, prevTo);
  const daily = new Map<
    string,
    { dia: string; tipo: string; quantidade: number }
  >();
  for (const e of rows.filter((e) => e.dia >= from && e.dia <= to)) {
    const k = e.dia + e.tipo,
      d = daily.get(k) || { dia: e.dia, tipo: e.tipo, quantidade: 0 };
    d.quantidade += e.quantidade;
    daily.set(k, d);
  }
  return {
    bloqueado: false,
    atual,
    anterior,
    diario: [...daily.values()].sort((a, b) => a.dia.localeCompare(b.dia)),
    queda_visitas: anterior.visualizacao_perfil
      ? Math.round(
          ((atual.visualizacao_perfil || 0) / anterior.visualizacao_perfil -
            1) *
            100,
        )
      : null,
  };
}
export function demoInterest(
  sid: string,
  service: string,
  body: string,
  phone: string,
) {
  const s = growthDemo();
  if (
    s.interests.some(
      (i) =>
        i.fornecedor_id === sid &&
        i.servico === service &&
        i.status !== "fechado",
    )
  )
    throw Error("Já existe uma solicitação em andamento para este serviço");
  if (!/^\d{10,13}$/.test(phone) || body.length > 1000 || /[<>]/.test(body))
    throw Error("Confira mensagem e WhatsApp");
  s.interests.unshift({
    id: crypto.randomUUID(),
    fornecedor_id: sid,
    empresa: "Fornecedor Exemplo",
    servico: service,
    mensagem: body,
    whatsapp: phone,
    status: "novo",
    notas: "",
    criado_em: new Date().toISOString(),
  });
  writeGrowth(s);
}
export function demoInterestUpdate(id: string, status: string, notes: string) {
  const s = growthDemo(),
    r = s.interests.find((i) => i.id === id);
  if (r) {
    r.status = status;
    r.notas = notes;
    writeGrowth(s);
  }
}
