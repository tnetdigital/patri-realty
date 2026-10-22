export type Plan = {
  id: string;
  codigo: string;
  nome: string;
  preco_centavos: number;
  stripe_price_id?: string | null;
  limites: Record<string, number | boolean | null>;
};
export type Package = {
  id: string;
  codigo: string;
  creditos: number;
  preco_centavos: number;
  ativo: boolean;
};
export type Ledger = {
  id: string;
  tipo: string;
  quantidade: number;
  valor: number;
  motivo: string;
  criado_em: string;
};
export type Payment = {
  id: string;
  produto: string;
  valor_centavos: number;
  status: string;
  criado_em: string;
  fatura_url?: string | null;
};
export type Summary = {
  fornecedor_id: string;
  plano: string;
  assinatura: {
    status: string;
    teste_ate?: string;
    periodo_ate?: string;
    carencia_ate?: string;
    cancelar_no_fim?: boolean;
  } | null;
  saldo: number;
  extrato: Ledger[];
  pagamentos: Payment[];
  limites: Record<string, number | boolean | null>;
  cortesias: number;
  dono: boolean;
};
export const money = (centavos: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    centavos / 100,
  );
export const names: Record<string, string> = {
  leads: "Contatos de orçamento por mês",
  fotos: "Fotos na galeria",
  servicos: "Serviços",
  cases: "Cases",
  video: "Vídeo",
  verificado: "Selo após verificação",
  metricas: "Métricas",
  responder_avaliacoes: "Responder avaliações",
  materias: "Matérias no blog por mês",
  parceiro: "Matérias em parceiro por mês",
  prioridade: "Prioridade de exibição",
};
export const resource = (v: unknown) =>
  v === null
    ? "Ilimitado"
    : typeof v === "boolean"
      ? v
        ? "Incluído"
        : "Não incluído"
      : String(v);
export const daysLeft = (date?: string, now = Date.now()) =>
  date ? Math.max(0, Math.ceil((Date.parse(date) - now) / 86400000)) : 0;
