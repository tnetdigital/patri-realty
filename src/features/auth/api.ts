import { requireCaptcha } from "./captcha";
import { currentDocumentVersion } from "../../lib/documents";
import { ui } from "../../lib/texts";
import { db } from "../../lib/supabase";
import { texts } from "../../lib/texts";
import type { Registration } from "./schema";
export async function register(v: Registration, captchaToken?: string) {
  requireCaptcha(captchaToken);
  const version = await currentDocumentVersion();
  const { error } = await db().auth.signUp({
    email: v.email,
    password: v.senha,
    options: {
      captchaToken,
      emailRedirectTo: location.origin + "/area",
      data: {
        nome: v.nome,
        tipo: v.tipo,
        telefone: v.telefone,
        condominio_nome: v.condominio_nome,
        cargo: v.cargo,
        cidade: v.cidade,
        estado: v.estado,
        empresa: v.empresa,
        cnpj: v.cnpj.replace(/\D/g, ""),
        termos: true,
        termos_versao: version,
        privacidade_versao: version,
        newsletter: v.newsletter,
      },
    },
  });
  if (error) throw new Error(ui.nao_foi_possivel_concluir_o_cadastro_verifique);
}
export async function login(
  email: string,
  password: string,
  captchaToken?: string,
) {
  requireCaptcha(captchaToken);
  const endpoint =
    import.meta.env.VITE_LOGIN_URL ||
    import.meta.env.VITE_SUPABASE_URL + "/functions/v1/auth-login";
  {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, captchaToken }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "Limite de tentativas. Aguarde 15 minutos."
          : texts.loginError,
      );
    const session = await db().auth.setSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });
    if (session.error) throw new Error(texts.loginError);
    return;
  }
}
export async function getAccess() {
  const {
    data: { user },
  } = await db().auth.getUser();
  if (!user) return null;
  const [profile, roles] = await Promise.all([
    db().from("profiles").select("*").eq("id", user.id).single(),
    db().from("user_roles").select("role").eq("user_id", user.id),
  ]);
  if (profile.error || !profile.data.ativo) {
    await db().auth.signOut();
    return null;
  }
  if (roles.error) throw roles.error;
  return { user, profile: profile.data, roles: roles.data.map((x) => x.role) };
}
export async function recover(email: string, captchaToken?: string) {
  requireCaptcha(captchaToken);
  await db().auth.resetPasswordForEmail(email, {
    redirectTo: location.origin + "/redefinir-senha",
    captchaToken,
  });
}
export async function reset(password: string) {
  const { error } = await db().auth.updateUser({ password });
  if (error) throw new Error(ui.o_link_expirou_ou_a_senha_nao);
}
export async function resend(email: string) {
  await db().auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: location.origin + "/area" },
  });
}
export async function logout() {
  await db().auth.signOut();
}
export async function catalog() {
  const segments = await db()
    .from("segmentos")
    .select("*")
    .eq("ativo", true)
    .order("ordem");
  if (segments.error)
    throw new Error(ui.nao_foi_possivel_carregar_os_segmentos);
  const cities = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await db()
      .from("cidades")
      .select("*")
      .order("ibge_id")
      .range(offset, offset + 999);
    if (page.error) throw new Error(ui.nao_foi_possivel_carregar_as_cidades);
    cities.push(...page.data);
    if (page.data.length < 1000) break;
  }
  return { segments: segments.data, cities };
}
