import { ui } from "../../lib/texts";
import { z } from "zod";
export function validCnpj(value: string) {
  const d = value.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const digit = (s: string) => {
    let weight = s.length - 7;
    const total = [...s].reduce((a, c) => {
      const v = a + Number(c) * weight;
      weight = weight === 2 ? 9 : weight - 1;
      return v;
    }, 0);
    return total % 11 < 2 ? 0 : 11 - (total % 11);
  };
  return (
    digit(d.slice(0, 12)) === Number(d[12]) &&
    digit(d.slice(0, 13)) === Number(d[13])
  );
}
export const password = z
  .string()
  .min(8, ui.use_pelo_menos_8_caracteres)
  .regex(/[a-zA-Z]/, ui.inclua_uma_letra)
  .regex(/\d/, ui.inclua_um_numero)
  .refine(
    (v) =>
      !["senha123", "password1", "12345678", "123456789", "abc12345"].includes(
        v.toLowerCase(),
      ),
    ui.escolha_uma_senha_menos_comum,
  );
export const registerSchema = z
  .object({
    nome: z.string().min(3).max(120),
    email: z.string().email(),
    senha: password,
    tipo: z.enum(["sindico", "fornecedor"]),
    telefone: z.string(),
    condominio_nome: z.string().max(160).optional(),
    cargo: z.enum(["", "sindico", "morador", "administrador"]).optional(),
    cidade: z.string(),
    estado: z.string(),
    empresa: z.string(),
    cnpj: z.string(),
    termos: z.literal(true, {
      message: ui.aceite_os_termos_e_a_politica_para,
    }),
    newsletter: z.boolean(),
  })
  .superRefine((v, c) => {
    if (v.tipo === "fornecedor") {
      if (!validCnpj(v.cnpj))
        c.addIssue({
          code: "custom",
          path: ["cnpj"],
          message: ui.cnpj_invalido,
        });
      if (!/^\d{10,11}$/.test(v.telefone.replace(/\D/g, "")))
        c.addIssue({
          code: "custom",
          path: ["telefone"],
          message: ui.informe_telefone_com_ddd,
        });
      if (!v.empresa.trim())
        c.addIssue({
          code: "custom",
          path: ["empresa"],
          message: ui.informe_a_empresa,
        });
    } else if (!v.cidade || !v.estado)
      c.addIssue({
        code: "custom",
        path: ["cidade"],
        message: ui.informe_cidade_e_estado,
      });
  });
export type Registration = z.infer<typeof registerSchema>;
export type Role = "admin" | "editor" | "comercial" | "fornecedor" | "sindico";
export function destination(roles: Role[]) {
  return roles.length > 1
    ? "/area"
    : roles.includes("admin") || roles.includes("comercial")
      ? "/admin"
      : roles.includes("editor")
        ? "/admin/conteudo"
        : roles.includes("fornecedor")
          ? "/painel"
          : "/area";
}
