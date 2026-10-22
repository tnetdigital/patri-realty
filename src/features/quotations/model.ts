import { z } from "zod";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `Informe pelo menos ${min} caracteres.`)
    .max(max, `Use até ${max} caracteres.`)
    .refine((v) => !/[<>]/.test(v), "Use apenas texto, sem HTML.");
export const quotationSchema = z.object({
  nome: text(3, 120),
  email: z.string().trim().email("Informe um e-mail válido.").max(254),
  telefone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{10,13}$/, "Informe telefone com DDD.")),
  condominio_nome: text(2, 160),
  cidade: text(2, 120),
  uf: z.string().regex(/^[A-Z]{2}$/, "Selecione o estado."),
  unidades: z.coerce.number().int().min(1).max(100000),
  urgencia: z.enum(["planejamento", "30_dias", "urgente"]),
  mensagem: text(20, 4000),
  privacidade: z.literal(true, {
    errorMap: () => ({ message: "Aceite a política para enviar o pedido." }),
  }),
  website: z.literal(""),
  fornecedor_id: z.string().min(1),
  segmento_id: z.string().min(1),
  copias: z.array(z.string()).max(2),
});
export type Quotation = z.infer<typeof quotationSchema>;
export type Lead = {
  id: string;
  fornecedor_id: string;
  empresa?: string;
  segmento_id: string;
  nome: string;
  email: string;
  telefone: string;
  condominio_nome: string;
  cidade: string;
  uf: string;
  unidades: number;
  urgencia: string;
  mensagem: string;
  status:
    | "novo"
    | "visto"
    | "respondido"
    | "sem_resposta"
    | "spam"
    | "bloqueado_plano";
  criado_em: string;
  visto_em: string | null;
  respondido_em: string | null;
  atualizado_em: string;
  notas: { id: string; texto: string; criado_em: string }[];
};
export const statuses = {
  novo: "Novo",
  visto: "Visto",
  respondido: "Respondido",
  sem_resposta: "Sem resposta há 48 horas",
  spam: "Spam",
  bloqueado_plano: "Bloqueado pelo plano",
};
export const demoKey = "patri:quotation-demo:v1";
export function readDemo(): Lead[] {
  try {
    return JSON.parse(localStorage.getItem(demoKey) || "[]");
  } catch {
    return [];
  }
}
export function writeDemo(rows: Lead[]) {
  localStorage.setItem(demoKey, JSON.stringify(rows));
  window.dispatchEvent(new Event("patri:leads"));
}
