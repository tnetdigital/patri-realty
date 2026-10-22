import { useEffect, useRef } from "react";
import type { DirectoryRuntime } from "../directory/api";
import { analyticsAllowed } from "../commercial/model";
import { demoMetricEvent } from "./demo";
function anonymousSession() {
  if (!analyticsAllowed()) return null;
  let value = document.cookie
    .split("; ")
    .find((s) => s.startsWith("patri_analytics="))
    ?.split("=")[1];
  if (!value || !/^[a-f0-9-]{36}$/.test(value)) {
    value = crypto.randomUUID();
    document.cookie = `patri_analytics=${value}; Max-Age=1800; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }
  return value;
}
export function clearAnalyticsSession() {
  if (typeof document !== "undefined")
    document.cookie = "patri_analytics=; Max-Age=0; Path=/; SameSite=Lax";
}
export async function track(
  r: DirectoryRuntime,
  type: string,
  target: string | null,
  segment: string | null = null,
  region = "",
) {
  if (!analyticsAllowed()) return;
  const session = anonymousSession();
  if (!session) return;
  const id = crypto.randomUUID();
  if (r.source === "demo") {
    demoMetricEvent(type, target || "portal", id);
    return;
  }
  const endpoint =
    import.meta.env.VITE_EVENT_URL ||
    (import.meta.env.VITE_QUOTATION_URL
      ? import.meta.env.VITE_QUOTATION_URL.replace(/\/quotation$/, "/event")
      : r.url + "/functions/v1/event");
  await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eid: id,
      etype: type,
      target,
      session_id: session,
      consented: true,
      segment,
      region,
    }),
    keepalive: true,
  }).catch(() => {});
}
export function ViewEvent({
  runtime: r,
  type,
  target,
  segment = null,
  region = "",
}: {
  runtime: DirectoryRuntime;
  type: string;
  target: string | null;
  segment?: string | null;
  region?: string;
}) {
  const sent = useRef("");
  useEffect(() => {
    const k = type + target + segment + region;
    const send = () => {
      if (
        analyticsAllowed() &&
        document.visibilityState === "visible" &&
        sent.current !== k
      ) {
        sent.current = k;
        void track(r, type, target, segment, region);
      }
    };
    const timer = setTimeout(send, 1000);
    window.addEventListener("patri:consent", send);
    document.addEventListener("visibilitychange", send);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("patri:consent", send);
      document.removeEventListener("visibilitychange", send);
    };
  }, [r.source, r.url, r.key, type, target, segment, region]);
  return null;
}

// Thirty seconds of visible, consented reading per tick. Background time is excluded.
export function ArticleEngagement({
  runtime,
  target,
}: {
  runtime: DirectoryRuntime;
  target: string;
}) {
  useEffect(() => {
    let seconds = 0;
    const tick = setInterval(() => {
      if (document.visibilityState !== "visible" || !analyticsAllowed()) {
        seconds = 0;
        return;
      }
      seconds++;
      if (seconds >= 30) {
        seconds = 0;
        void track(runtime, "tempo_materia", target);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [runtime.source, runtime.url, target]);
  return null;
}
