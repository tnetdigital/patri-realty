export type Review = {
  id: string;
  fornecedor_id: string;
  empresa?: string;
  nota: number;
  titulo: string;
  texto: string;
  condominio: string;
  status: string;
  resposta_fornecedor: string;
  resposta_em?: string | null;
  denuncia_motivo?: string;
  motivo_moderacao?: string;
  criado_em: string;
};
export type ReviewPage = {
  items: Review[];
  total: number;
  media: number | null;
  publicadas: number;
};
export type Interest = {
  id: string;
  fornecedor_id: string;
  empresa?: string;
  servico: string;
  mensagem: string;
  whatsapp: string;
  status: string;
  notas: string;
  criado_em: string;
};
export type Metrics = {
  bloqueado: boolean;
  atual: Record<string, number> | null;
  anterior: Record<string, number> | null;
  diario: { dia: string; tipo: string; quantidade: number }[];
  queda_visitas?: number | null;
  de?: string;
  ate?: string;
};
export const services = {
  perfil: "Perfil otimizado",
  redes: "Gestão de redes sociais",
  campanha: "Campanha de geração de orçamentos",
  completo: "Pacote completo de posicionamento",
};
export const eventNames: Record<string, string> = {
  visualizacao_perfil: "Visitas ao perfil",
  clique_whatsapp: "Cliques no WhatsApp",
  clique_telefone: "Cliques no telefone",
  clique_site: "Cliques no site",
  clique_instagram: "Cliques no Instagram",
  orcamento_enviado: "Orçamentos enviados",
  visualizacao_materia: "Leituras de matérias",
  busca: "Buscas",
  impressao_banner: "Impressões de banners",
  clique_banner: "Cliques em banners",
};
export function reviewValid(r: {
  nota: number;
  titulo: string;
  texto: string;
}) {
  if (
    !Number.isInteger(r.nota) ||
    r.nota < 1 ||
    r.nota > 5 ||
    r.titulo.trim().length < 3 ||
    r.titulo.length > 100 ||
    r.texto.trim().length < 30 ||
    r.texto.length > 1000 ||
    /[<>]/.test(r.texto + r.titulo)
  )
    throw Error(
      "Informe nota de 1 a 5, título e texto de 30 a 1.000 caracteres.",
    );
}
export const today = () => new Date().toISOString().slice(0, 10);
export const previousMonth = () =>
  new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
