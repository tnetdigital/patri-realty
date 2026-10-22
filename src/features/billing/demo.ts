import type { Plan, Package, Summary } from "./model";
const key = "patri:billing-demo:v1";
export const demoPlans: Plan[] = [
  {
    id: "free",
    codigo: "gratuito",
    nome: "Grátis",
    preco_centavos: 0,
    limites: {
      leads: 3,
      fotos: 1,
      servicos: 3,
      cases: 0,
      video: false,
      verificado: false,
      metricas: false,
      responder_avaliacoes: false,
      materias: 0,
      parceiro: 0,
      prioridade: 0,
    },
  },
  {
    id: "premium",
    codigo: "premium",
    nome: "Premium",
    preco_centavos: 9900,
    limites: {
      leads: null,
      fotos: 12,
      servicos: null,
      cases: null,
      video: true,
      verificado: true,
      metricas: true,
      responder_avaliacoes: true,
      materias: 1,
      parceiro: 0,
      prioridade: 1,
    },
  },
  {
    id: "destaque",
    codigo: "destaque",
    nome: "Destaque",
    preco_centavos: 19900,
    limites: {
      leads: null,
      fotos: 20,
      servicos: null,
      cases: null,
      video: true,
      verificado: true,
      metricas: true,
      responder_avaliacoes: true,
      materias: 2,
      parceiro: 1,
      prioridade: 2,
    },
  },
];
export const demoPackages: Package[] = [10, 25, 50].map((n, i) => ({
  id: "pack-" + n,
  codigo: "creditos_" + n,
  creditos: n,
  preco_centavos: [4900, 9900, 17900][i],
  ativo: true,
}));
export type BillingDemo = {
  summary: Summary;
  expired: boolean;
  unlocked: boolean;
  events: string[];
  lastOrder?: string;
  refunds: string[];
};
function seed(): BillingDemo {
  return {
    summary: {
      fornecedor_id: "billing-demo",
      plano: "premium",
      assinatura: {
        status: "teste",
        teste_ate: new Date(Date.now() + 12 * 86400000).toISOString(),
      },
      saldo: 0,
      extrato: [],
      pagamentos: [],
      limites: demoPlans[1].limites,
      cortesias: 0,
      dono: true,
    },
    expired: false,
    unlocked: false,
    events: [],
    refunds: [],
  };
}
export function readBillingDemo(): BillingDemo {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || seed();
  } catch {
    return seed();
  }
}
function save(s: BillingDemo) {
  localStorage.setItem(key, JSON.stringify(s));
  window.dispatchEvent(new Event("patri:billing"));
}
export function billingDemoAction(action: string, product = "") {
  const s = readBillingDemo(),
    now = new Date().toISOString();
  if (action === "reset") {
    save(seed());
    return;
  }
  if (action === "expire") {
    s.expired = true;
    s.summary.plano = "gratuito";
    s.summary.limites = demoPlans[0].limites;
    s.summary.assinatura = { status: "gratuita" };
  }
  if (action === "buy" || action === "repeat") {
    const configured = <T extends { id: string }>(
      x: T | undefined,
    ): T | undefined =>
      x
        ? ({
            ...x,
            ...JSON.parse(
              localStorage.getItem("patri:billing-config:" + x.id) || "{}",
            ),
          } as T)
        : undefined;
    const pack = configured(demoPackages.find((x) => x.codigo === product)),
      plan = configured(demoPlans.find((x) => x.codigo === product));
    const id = action === "repeat" ? s.lastOrder : crypto.randomUUID();
    if (!id) throw Error("Simule uma compra antes de repetir o evento.");
    if (!s.events.includes(id)) {
      if (!pack && !plan) throw Error("Produto inválido");
      s.events.push(id);
      s.lastOrder = id;
      s.summary.pagamentos.unshift({
        id,
        produto: product,
        valor_centavos: pack?.preco_centavos || plan?.preco_centavos || 0,
        status: "pago",
        criado_em: now,
      });
      if (pack) {
        s.summary.saldo += pack.creditos;
        s.summary.extrato.unshift({
          id,
          quantidade: pack.creditos,
          tipo: "compra",
          valor: pack.preco_centavos / 100,
          motivo: "Compra simulada. Nenhuma cobrança realizada.",
          criado_em: now,
        });
      } else if (plan) {
        s.summary.plano = plan.codigo;
        s.summary.limites = plan.limites;
        s.summary.assinatura = {
          status: "ativa",
          periodo_ate: new Date(Date.now() + 30 * 86400000).toISOString(),
        };
        s.unlocked = true;
      }
    }
  }
  if (action === "unlock") {
    if (s.unlocked) return;
    if (s.summary.saldo < 1)
      throw Error("Saldo insuficiente. Escolha um pacote de créditos.");
    s.summary.saldo--;
    s.unlocked = true;
    s.summary.extrato.unshift({
      id: crypto.randomUUID(),
      tipo: "uso",
      quantidade: -1,
      valor: 0,
      motivo: "Liberação simulada do quarto pedido.",
      criado_em: now,
    });
  }
  if (action === "refund") {
    const p = s.summary.pagamentos.find(
      (x) => x.produto.startsWith("creditos_") && x.status === "pago",
    );
    if (!p) throw Error("Simule uma compra de créditos antes do estorno.");
    const pack = demoPackages.find((x) => x.codigo === p.produto)!;
    s.summary.saldo -= pack.creditos;
    p.status = "estornado";
    s.summary.extrato.unshift({
      id: crypto.randomUUID(),
      tipo: "ajuste",
      quantidade: -pack.creditos,
      valor: -p.valor_centavos / 100,
      motivo: "Estorno simulado. Nenhum pagamento real.",
      criado_em: now,
    });
  }
  save(s);
}
