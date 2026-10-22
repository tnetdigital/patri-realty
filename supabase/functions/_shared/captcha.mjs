export async function verifyCaptcha(token, config = {}) {
  if (!config.enabled || !config.secret) {
    if (config.production) {
      console.warn("CAPTCHA_CONFIGURATION_MISSING");
      return false;
    }
    return !config.enabled;
  }
  if (typeof token !== "string" || !token) return false;
  try {
    const r = await (config.fetch || fetch)(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({ secret: config.secret, response: token }),
      },
    );
    const v = await r.json();
    return (
      r.ok &&
      v.success === true &&
      (!config.hostname || v.hostname === config.hostname)
    );
  } catch {
    return false;
  }
}
