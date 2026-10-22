import { billingHandlers } from "../_shared/billing-handler.mjs";
Deno.serve(
  billingHandlers({
    enabled: Deno.env.get("STRIPE_ENABLED") === "true",
    url: Deno.env.get("SUPABASE_URL"),
    serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    stripeKey: Deno.env.get("STRIPE_SECRET_KEY"),
    webhookSecret: Deno.env.get("STRIPE_WEBHOOK_SECRET"),
  }).webhook,
);
