export function captchaUnavailable() {
  return (
    import.meta.env.PROD &&
    (import.meta.env.VITE_CAPTCHA_ENABLED !== "true" ||
      !import.meta.env.VITE_TURNSTILE_SITE_KEY)
  );
}
export function requireCaptcha(token?: string) {
  if (captchaUnavailable()) {
    console.warn("CAPTCHA_CONFIGURATION_MISSING");
    throw Error(
      "Verificação de segurança indisponível. Tente novamente mais tarde.",
    );
  }
  if (import.meta.env.VITE_CAPTCHA_ENABLED === "true" && !token)
    throw Error("Conclua a verificação de segurança para continuar.");
}
