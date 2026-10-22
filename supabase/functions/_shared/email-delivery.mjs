export async function deliverEmail(config, message) {
  if (config.enabled !== true || !config.key || !config.from)
    return { simulated: true };
  const r = await (config.fetch || fetch)("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + config.key,
      "Content-Type": "application/json",
      "Idempotency-Key": "supplier-email-" + message.id,
    },
    body: JSON.stringify({ ...message.payload, from: config.from }),
  });
  return { simulated: false, ok: r.ok, status: r.status };
}
