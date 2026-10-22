import { documentVersion } from "../../lib/texts";
import type { DirectoryRuntime } from "../directory/api";
export type LegalIdentity = {
  razao_social: string;
  cnpj: string;
  email_privacidade: string;
  email_atendimento: string;
  revisado: boolean;
};
export const pendingIdentity: LegalIdentity = {
  razao_social: "",
  cnpj: "",
  email_privacidade: "",
  email_atendimento: "",
  revisado: false,
};
export const legalKey = (r: DirectoryRuntime) => [
  "legal-identity",
  r.source,
  r.url,
];
export async function legalIdentity(
  r: DirectoryRuntime,
): Promise<LegalIdentity> {
  if (r.source === "demo") return pendingIdentity;
  const response = await fetch(
    r.url + "/rest/v1/configuracoes?chave=eq.identidade_legal&select=valor",
    {
      headers: { apikey: r.key, Authorization: "Bearer " + r.key },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok)
    throw new Error("Identificação legal temporariamente indisponível.");
  const rows = await response.json();
  const value = rows?.[0]?.valor || {};
  return {
    razao_social:
      typeof value.razao_social === "string" ? value.razao_social : "",
    cnpj: typeof value.cnpj === "string" ? value.cnpj : "",
    email_privacidade:
      typeof value.email_privacidade === "string" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email_privacidade)
        ? value.email_privacidade
        : "",
    email_atendimento:
      typeof value.email_atendimento === "string" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email_atendimento)
        ? value.email_atendimento
        : "",
    revisado: value.revisado === true,
  };
}
export const institutionalMeta: Record<
  string,
  { title: string; description: string }
> = {
  "/sobre-o-projeto": {
    title: "Sobre a Patri Realty",
    description: "Conexões, informação e serviços para o mercado condominial.",
  },
  "/para-fornecedores": {
    title: "Para fornecedores",
    description: "Apresente sua empresa e receba oportunidades de condomínios.",
  },
  "/evento": {
    title: "Eventos",
    description: "Programação de encontros do mercado condominial.",
  },
  "/contato": {
    title: "Contato",
    description: "Fale com a equipe Patri Realty.",
  },
  "/contrato-fornecedor": {
    title: "Contrato de fornecedor",
    description: "Condições de participação para fornecedores.",
  },
  "/termos": {
    title: "Termos de uso",
    description:
      "Regras de participação, conteúdo, avaliações e contratação no portal.",
  },
  "/privacidade": {
    title: "Política de privacidade",
    description: "Como seus dados são utilizados e como exercer seus direitos.",
  },
};

export const documentVersionKey = (r: DirectoryRuntime) => [
  "document-version",
  r.source,
  r.url,
];
export async function publicDocumentVersion(
  r: DirectoryRuntime,
): Promise<string> {
  if (r.source === "demo") return documentVersion;
  const response = await fetch(
    r.url + "/rest/v1/configuracoes?chave=eq.documentos_versao&select=valor",
    {
      headers: { apikey: r.key, Authorization: "Bearer " + r.key },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok)
    throw Error("Não foi possível consultar a versão dos documentos.");
  const rows = await response.json();
  if (typeof rows?.[0]?.valor !== "string")
    throw Error("Versão dos documentos indisponível.");
  return rows[0].valor;
}
