import { supplierCopy as copy } from "./texts";
import { db } from "../../lib/supabase";
import { catalog } from "../auth/api";
import { texts } from "../../lib/texts";
import {
  blankSupplier,
  initialLimits,
  completeness,
  canSubmit,
  editable,
  validateStep,
  type SupplierDraft,
  type Catalog,
  type TeamEntry,
  type Limits,
} from "./model";
export type SupplierMode = "live" | "demo";
export class SupplierApiError extends Error {
  constructor(
    message: string,
    public duplicateCnpj = false,
  ) {
    super(message);
  }
}
const fail = (error: { message: string }) => {
  throw new SupplierApiError(
    error.message.includes("CNPJ_DUPLICADO")
      ? copy.este_cnpj_ja_possui_uma_pagina_voce
      : error.message,
    error.message.includes("CNPJ_DUPLICADO"),
  );
};
const typed = (v: unknown) => v as SupplierDraft;
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("patri-supplier-demo", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("data");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(new Error(copy.nao_foi_possivel_abrir_o_armazenamento_deste));
  });
}
async function localGet<T>(key: string): Promise<T | undefined> {
  const d = await database();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("data", "readonly"),
      r = tx.objectStore("data").get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    tx.oncomplete = () => d.close();
  });
}
async function localSet(key: string, value: unknown) {
  const d = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = d.transaction("data", "readwrite");
    tx.objectStore("data").put(value, key);
    tx.oncomplete = () => {
      d.close();
      resolve();
    };
    tx.onabort = () => {
      d.close();
      reject(
        new Error(
          copy.armazenamento_cheio_ou_indisponivel_remova_algumas_imagens,
        ),
      );
    };
    tx.onerror = () => {};
  });
}
export async function listSuppliers(mode: SupplierMode) {
  if (mode === "demo") {
    let draft = await localGet<SupplierDraft>("draft");
    if (!draft) {
      draft = blankSupplier();
      await localSet("draft", draft);
    }
    return [
      {
        id: draft.id,
        nome_fantasia: draft.nome_fantasia || copy.sua_empresa,
        dono_id: draft.dono_id,
      },
    ];
  }
  const { data, error } = await db()
    .from("fornecedores")
    .select("id,nome_fantasia,dono_id")
    .order("criado_em");
  if (error) fail(error);
  return data!;
}
export async function loadSupplier(mode: SupplierMode, id: string) {
  if (mode === "demo") return (await localGet<SupplierDraft>("draft"))!;
  const { data, error } = await db().rpc("obter_fornecedor", { sid: id });
  if (error) fail(error);
  if (!data) throw new Error(copy.empresa_indisponivel_para_sua_conta);
  return typed(data);
}
export async function saveSupplier(
  mode: SupplierMode,
  d: SupplierDraft,
  step: number,
  limits: Limits,
) {
  const errors = validateStep(d, step, limits);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  if (mode === "demo") {
    const current = await localGet<SupplierDraft>("draft");
    if (current && !editable(current.status))
      throw new Error(copy.a_edicao_esta_pausada_durante_a_analise);
    const updated = {
      ...d,
      etapa: step,
      atualizado_em: new Date().toISOString(),
      completude: completeness(d),
    };
    await localSet("draft", updated);
    return updated;
  }
  const { data, error } = await db().rpc("salvar_fornecedor", {
    sid: d.id,
    step,
    data: JSON.parse(JSON.stringify(d)),
    version: d.atualizado_em || undefined,
  });
  if (error) fail(error);
  return typed(data);
}
export async function submitSupplier(mode: SupplierMode, d: SupplierDraft) {
  if (!canSubmit(d))
    throw new Error(copy.complete_os_campos_minimos_para_enviar);
  if (mode === "demo") {
    const current = await localGet<SupplierDraft>("draft");
    if (!current || !canSubmit(current))
      throw new Error(copy.salve_as_alteracoes_antes_de_enviar);
    const next = {
      ...current,
      status: "em_analise" as const,
      atualizado_em: new Date().toISOString(),
    };
    await localSet("draft", next);
    return next;
  }
  const { data, error } = await db().rpc("enviar_fornecedor", { sid: d.id });
  if (error) fail(error);
  return typed(data);
}
export async function supplierCatalog(mode: SupplierMode): Promise<Catalog> {
  if (mode === "demo") {
    const names = [
      copy.seguranca_e_portaria,
      copy.limpeza_e_conservacao,
      copy.manutencao_predial,
      "Elevadores",
      copy.administracao_condominial,
      copy.jardinagem_e_paisagismo,
    ];
    return {
      segments: names.map((nome, i) => ({
        id: `00000000-0000-4000-8000-00000000000${i + 1}`,
        nome,
      })),
      states: [
        "AC",
        "AL",
        "AP",
        "AM",
        "BA",
        "CE",
        "DF",
        "ES",
        "GO",
        "MA",
        "MT",
        "MS",
        "MG",
        "PA",
        "PB",
        "PR",
        "PE",
        "PI",
        "RJ",
        "RN",
        "RS",
        "RO",
        "RR",
        "SC",
        "SP",
        "SE",
        "TO",
      ],
      cities: [
        {
          id: "00000000-0000-4000-8000-000000000101",
          nome: copy.sao_paulo,
          uf: "SP",
        },
        {
          id: "00000000-0000-4000-8000-000000000102",
          nome: "Campinas",
          uf: "SP",
        },
        {
          id: "00000000-0000-4000-8000-000000000103",
          nome: copy.rio_de_janeiro,
          uf: "RJ",
        },
        {
          id: "00000000-0000-4000-8000-000000000104",
          nome: copy.belo_horizonte,
          uf: "MG",
        },
      ],
      limits: initialLimits,
    };
  }
  const [c, settings, states] = await Promise.all([
    catalog(),
    db()
      .from("configuracoes")
      .select("valor")
      .eq("chave", "limites_cadastro")
      .single(),
    db().from("estados").select("uf").order("uf"),
  ]);
  if (settings.error) fail(settings.error);
  if (states.error) fail(states.error);
  return {
    segments: c.segments,
    cities: c.cities,
    states: states.data!.map((s) => s.uf),
    limits: settings.data!.valor as unknown as Limits,
  };
}
export async function lookupCep(cep: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const r = await fetch(
      `https://viacep.com.br/ws/${cep.replace(/\D/g, "")}/json/`,
      { signal: controller.signal },
    );
    if (!r.ok)
      throw new Error(copy.consulta_de_cep_indisponivel_preencha_o_endereco);
    const v = await r.json();
    if (v.erro) throw new Error(copy.cep_nao_encontrado);
    return {
      endereco: [v.logradouro, v.bairro].filter(Boolean).join(", "),
      cidade: v.localidade as string,
      uf: v.uf as string,
    };
  } finally {
    clearTimeout(timeout);
  }
}
export async function uploadSupplierImage(
  mode: SupplierMode,
  sid: string,
  image: {
    blob: Blob;
    thumbnail: Blob;
  },
  kind: string,
) {
  if (mode === "demo") {
    const asUrl = (b: Blob) =>
      new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(b);
      });
    return {
      url: await asUrl(image.blob),
      thumbnail: await asUrl(image.thumbnail),
    };
  }
  const name = `${sid}/${kind}-${crypto.randomUUID()}`;
  const uploads = await Promise.all([
    db().storage.from("fornecedores").upload(`${name}.webp`, image.blob, {
      contentType: "image/webp",
      upsert: false,
    }),
    db()
      .storage.from("fornecedores")
      .upload(`${name}-thumb.webp`, image.thumbnail, {
        contentType: "image/webp",
        upsert: false,
      }),
  ]);
  for (const u of uploads)
    if (u.error) throw new Error(copy.nao_foi_possivel_salvar_a_imagem_no);
  return {
    url: db().storage.from("fornecedores").getPublicUrl(`${name}.webp`).data
      .publicUrl,
    thumbnail: db()
      .storage.from("fornecedores")
      .getPublicUrl(`${name}-thumb.webp`).data.publicUrl,
  };
}
export async function team(
  mode: SupplierMode,
  sid: string,
): Promise<TeamEntry[]> {
  if (mode === "demo") return (await localGet<TeamEntry[]>("team")) || [];
  const { data, error } = await db().rpc("equipe_fornecedor", { sid });
  if (error) fail(error);
  const value = data as unknown as {
    members: TeamEntry[];
    invites: TeamEntry[];
  };
  return [...value.members, ...value.invites];
}
export async function invite(
  mode: SupplierMode,
  sid: string,
  email: string,
  limit: number,
) {
  if (mode === "demo") {
    const rows = await team(mode, sid);
    if (
      rows.filter((r) => r.status === "ativo" || r.status === "pendente")
        .length >= limit
    )
      throw new Error(copy.limite_de_membros_atingido);
    if (
      rows.some(
        (r) =>
          r.email.toLowerCase() === email.toLowerCase() &&
          r.status === "pendente",
      )
    )
      throw new Error(copy.ja_existe_convite_para_este_email);
    const next = {
      id: crypto.randomUUID(),
      nome: "",
      email,
      status: "pendente" as const,
      expira_em: new Date(Date.now() + 14 * 86400000).toISOString(),
    };
    await localSet("team", [...rows, next]);
    return;
  }
  const { error } = await db().rpc("convidar_membro", { sid, address: email });
  if (error) fail(error);
}
export async function revoke(
  mode: SupplierMode,
  sid: string,
  entry: TeamEntry,
) {
  if (mode === "demo") {
    await localSet(
      "team",
      (await team(mode, sid)).map((r) =>
        r.id === entry.id ? { ...r, status: "revogado" } : r,
      ),
    );
    return;
  }
  const { error } = await db().rpc("revogar_membro", {
    sid,
    target: entry.id,
    is_invite: !entry.user_id,
  });
  if (error) fail(error);
}
export async function resetDemo() {
  await localSet("draft", blankSupplier());
  await localSet("team", []);
}
export async function inspectInvite(token: string) {
  const { data, error } = await db().rpc("inspecionar_convite", { raw: token });
  if (error) fail(error);
  return data as {
    empresa: string;
    email: string;
    expira_em: string;
  } | null;
}
export async function acceptInvite(token: string) {
  const { error } = await db().rpc("aceitar_convite", { raw: token });
  if (error) fail(error);
}
export async function signUpInvite(
  token: string,
  email: string,
  nome: string,
  password: string,
  captchaToken?: string,
) {
  const { error } = await db().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: location.origin + "/area",
      captchaToken,
      data: {
        tipo: "membro_fornecedor",
        nome,
        convite: token,
        termos: true,
        termos_versao: texts.termsVersion,
        privacidade_versao: texts.privacyVersion,
      },
    },
  });
  if (error) throw new Error(copy.nao_foi_possivel_criar_a_conta_confira);
}
export async function claim(cnpj: string, proof: string, message: string) {
  const { error } = await db().rpc("reivindicar_fornecedor", {
    document: cnpj,
    proof,
    message,
  });
  if (error) fail(error);
}
