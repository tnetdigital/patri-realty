import { supplierCopy as copy } from "./texts";
import { z } from "zod";
import { validCnpj } from "../auth/schema";
export type ProfileStatus =
  | "rascunho"
  | "em_analise"
  | "ajuste_solicitado"
  | "publicado"
  | "suspenso"
  | "recusado";
export type Service = {
  id: string;
  titulo: string;
  descricao: string;
  foto_url: string;
};
export type Case = {
  id: string;
  condominio: string;
  descricao: string;
  foto_url: string;
};
export type Faq = {
  id: string;
  pergunta: string;
  resposta: string;
};
export type Media = {
  id: string;
  url: string;
  legenda: string;
};
export type Region = {
  id: string;
  uf: string;
  cidade_id: string | null;
  cidade_nome: string;
};
export type SupplierDraft = {
  id: string;
  dono_id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  slug: string;
  whatsapp: string;
  telefone: string;
  email: string;
  site: string;
  instagram: string;
  cep: string;
  endereco: string;
  cidade_id: string;
  cidade_nome: string;
  estado: string;
  logo_url: string;
  logo_thumb_url: string;
  capa_url: string;
  capa_thumb_url: string;
  descricao_curta: string;
  sobre: string;
  ano_fundacao: string;
  segmentos: string[];
  cobertura: Region[];
  servicos: Service[];
  midias: Media[];
  cases: Case[];
  faqs: Faq[];
  certificacoes: string[];
  instagram_posts: string[];
  video_url: string;
  status: ProfileStatus;
  motivo_status: string;
  cadastro_em: string;
  atualizado_em: string;
  completude: number;
  etapa: number;
  avaliacoes_publicadas: number;
  alteracoes_pendentes: {
    campo: string;
    depois: string;
  }[];
};
export type Limits = {
  fotos: number;
  servicos: number;
  cases: number;
  faqs: number;
  video: boolean;
  segmentos: number;
  membros: number;
  upload_mb: number;
  dias_completude: number;
};
export type Catalog = {
  segments: {
    id: string;
    nome: string;
  }[];
  cities: {
    id: string;
    nome: string;
    uf: string;
  }[];
  states: string[];
  limits: Limits;
};
export type TeamEntry = {
  id: string;
  nome: string;
  email: string;
  status: "ativo" | "pendente" | "revogado" | "expirado";
  expira_em?: string;
  user_id?: string;
};
export const initialLimits: Limits = {
  fotos: 12,
  servicos: 20,
  cases: 10,
  faqs: 20,
  video: true,
  segmentos: 3,
  membros: 3,
  upload_mb: 5,
  dias_completude: 7,
};
export function blankSupplier(): SupplierDraft {
  return {
    id: crypto.randomUUID(),
    dono_id: "demo-owner",
    nome_fantasia: "",
    razao_social: "",
    cnpj: "",
    slug: "",
    whatsapp: "",
    telefone: "",
    email: "",
    site: "",
    instagram: "",
    cep: "",
    endereco: "",
    cidade_id: "",
    cidade_nome: "",
    estado: "",
    logo_url: "",
    logo_thumb_url: "",
    capa_url: "",
    capa_thumb_url: "",
    descricao_curta: "",
    sobre: "",
    ano_fundacao: "",
    segmentos: [],
    cobertura: [],
    servicos: [],
    midias: [],
    cases: [],
    faqs: [],
    certificacoes: [],
    instagram_posts: [],
    video_url: "",
    status: "rascunho",
    motivo_status: "",
    cadastro_em: new Date().toISOString(),
    atualizado_em: "",
    completude: 0,
    etapa: 0,
    avaliacoes_publicadas: 0,
    alteracoes_pendentes: [],
  };
}
export const digits = (v: string) => v.replace(/\D/g, "");
export function slugify(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export const safeText = (v: string) =>
  !/<[^>]*>|javascript:|data:text\/html/i.test(v);
export const hasContact = (v: string) =>
  /[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?55\s*)?(?:\(?\d{2}\)?[\s.-]*)?\d{4,5}[\s.-]?\d{4}/i.test(
    v,
  );
export function youtubeId(url: string) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    const h = u.hostname.replace(/^www\./, "");
    const id =
      h === "youtu.be"
        ? u.pathname.slice(1)
        : h === "youtube.com"
          ? u.searchParams.get("v") || u.pathname.split("/").at(-1)
          : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
const text = (max: number) =>
  z.string().max(max).refine(safeText, copy.remova_html_ou_conteudo_inseguro);
const optionalHttps = z.string().refine(
  (v) =>
    !v ||
    (/^https:\/\//.test(v) &&
      (() => {
        try {
          const u = new URL(v);
          return !u.username && !u.password;
        } catch {
          return false;
        }
      })()),
  copy.use_um_endereco_completo_iniciado_por_https,
);
export function stepSchema(step: number, limits: Limits) {
  const schemas = [
    z.object({
      nome_fantasia: text(120).refine(
        (v) => v.trim().length >= 2,
        copy.informe_o_nome_fantasia,
      ),
      razao_social: text(160),
      cnpj: z.string().refine(validCnpj, copy.cnpj_invalido),
      whatsapp: z
        .string()
        .refine(
          (v) => /^\d{10,11}$/.test(digits(v)),
          copy.informe_whatsapp_com_ddd,
        ),
      telefone: z
        .string()
        .refine(
          (v) => !v || /^\d{10,11}$/.test(digits(v)),
          copy.telefone_invalido,
        ),
      email: z.string().email(copy.email_comercial_invalido).or(z.literal("")),
      site: optionalHttps,
      instagram: z
        .string()
        .regex(/^[a-zA-Z0-9._]*$/, copy.informe_o_usuario_sem),
      cep: z
        .string()
        .refine((v) => !v || digits(v).length === 8, copy.cep_invalido),
      endereco: text(240),
    }),
    z.object({ logo_url: z.string(), capa_url: z.string() }),
    z.object({
      descricao_curta: text(160).refine(
        (v) => v.trim().length > 0,
        copy.escreva_uma_descricao_curta,
      ),
      sobre: text(2000).refine(
        (v) => !hasContact(v),
        copy.nao_inclua_telefone_ou_email_no_texto,
      ),
      ano_fundacao: z
        .string()
        .refine(
          (v) =>
            !v ||
            (/^\d{4}$/.test(v) &&
              Number(v) >= 1800 &&
              Number(v) <= new Date().getFullYear()),
          copy.ano_de_fundacao_invalido,
        ),
      segmentos: z
        .array(z.string().uuid())
        .min(1, copy.escolha_ao_menos_um_segmento)
        .max(limits.segmentos, `Escolha até ${limits.segmentos} segmentos.`),
    }),
    z.object({
      cobertura: z
        .array(
          z.object({
            id: z.string(),
            uf: z.string().length(2),
            cidade_id: z.string().nullable(),
            cidade_nome: z.string(),
          }),
        )
        .min(1, copy.adicione_ao_menos_uma_regiao_de_atendimento),
    }),
    z.object({
      servicos: z
        .array(
          z.object({
            id: z.string(),
            titulo: text(120).refine(
              (v) => v.trim().length >= 2,
              copy.preencha_este_campo,
            ),
            descricao: text(1000),
            foto_url: z.string(),
          }),
        )
        .max(limits.servicos),
      midias: z
        .array(
          z.object({
            id: z.string(),
            url: z.string().min(1, copy.selecione_uma_foto),
            legenda: text(160),
          }),
        )
        .max(limits.fotos),
      cases: z
        .array(
          z.object({
            id: z.string(),
            condominio: text(160).refine(
              (v) => v.trim().length >= 2,
              copy.preencha_este_campo,
            ),
            descricao: text(1000),
            foto_url: z.string(),
          }),
        )
        .max(limits.cases),
      faqs: z
        .array(
          z.object({
            id: z.string(),
            pergunta: text(200).refine(
              (v) => v.trim().length >= 3,
              copy.preencha_este_campo,
            ),
            resposta: text(1000).refine(
              (v) => v.trim().length >= 3,
              copy.preencha_este_campo,
            ),
          }),
        )
        .max(limits.faqs),
      certificacoes: z
        .array(
          text(100).refine(
            (v) => v.trim().length >= 2,
            copy.preencha_este_campo,
          ),
        )
        .max(20),
      video_url: z
        .string()
        .refine(
          (v) => !v || (limits.video && !!youtubeId(v)),
          copy.use_um_link_https_valido_do_youtube,
        ),
      instagram_posts: z
        .array(
          z.string().refine((v) => {
            try {
              const u = new URL(v);
              return (
                u.protocol === "https:" &&
                ["instagram.com", "www.instagram.com"].includes(u.hostname) &&
                /^\/(p|reel)\/[\w-]+\/?$/.test(u.pathname)
              );
            } catch {
              return false;
            }
          }, copy.link_de_publicacao_invalido),
        )
        .max(6),
    }),
  ];
  return schemas[step] || schemas[0];
}
export function validateStep(d: SupplierDraft, step: number, l: Limits) {
  const result = stepSchema(step, l).safeParse(d);
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((i) => [i.path.join("."), i.message]),
      );
}
export function diagnosis(d: SupplierDraft) {
  return [
    {
      key: "logo",
      label: copy.adicionar_logo,
      points: 10,
      done: !!d.logo_url,
      step: 1,
    },
    {
      key: "cover",
      label: copy.adicionar_capa,
      points: 10,
      done: !!d.capa_url,
      step: 1,
    },
    {
      key: "short",
      label: copy.escrever_descricao_curta,
      points: 10,
      done: !!d.descricao_curta.trim(),
      step: 2,
    },
    {
      key: "about",
      label: copy.sobre_com_mais_de_300_caracteres,
      points: 10,
      done: d.sobre.length > 300,
      step: 2,
    },
    {
      key: "photos",
      label: copy.adicionar_ao_menos_5_fotos,
      points: 10,
      done: d.midias.length >= 5,
      step: 4,
    },
    {
      key: "services",
      label: copy.cadastrar_ao_menos_3_servicos,
      points: 10,
      done: d.servicos.length >= 3,
      step: 4,
    },
    {
      key: "case",
      label: copy.apresentar_um_case,
      points: 10,
      done: d.cases.length >= 1,
      step: 4,
    },
    {
      key: "faq",
      label: copy.responder_ao_menos_3_perguntas,
      points: 5,
      done: d.faqs.length >= 3,
      step: 4,
    },
    {
      key: "regions",
      label: copy.definir_onde_atende,
      points: 10,
      done: d.cobertura.length > 0,
      step: 3,
    },
    {
      key: "instagram",
      label: copy.informar_instagram,
      points: 5,
      done: !!d.instagram,
      step: 0,
    },
    {
      key: "reviews",
      label: copy.receber_3_avaliacoes_publicadas,
      points: 10,
      done: d.avaliacoes_publicadas >= 3,
      step: -1,
    },
  ];
}
export const completeness = (d: SupplierDraft) =>
  diagnosis(d).reduce((s, i) => s + (i.done ? i.points : 0), 0);
export function missingMinimum(d: SupplierDraft) {
  return [
    !d.nome_fantasia.trim() && copy.nome_da_empresa,
    !validCnpj(d.cnpj) && copy.cnpj_valido,
    !d.logo_url && "Logo",
    !d.descricao_curta.trim() && copy.descricao_curta,
    !d.segmentos.length && "Segmento",
    !d.cobertura.length && copy.regiao_de_atendimento,
    !/^\d{10,11}$/.test(digits(d.whatsapp)) && "WhatsApp",
  ].filter(Boolean) as string[];
}
export function canSubmit(d: SupplierDraft) {
  return (
    ["rascunho", "ajuste_solicitado"].includes(d.status) &&
    missingMinimum(d).length === 0
  );
}
export const editable = (s: ProfileStatus) =>
  !["em_analise", "recusado", "suspenso"].includes(s);
