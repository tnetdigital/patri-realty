import { afterEach, describe, expect, it, vi } from "vitest";
import { acceptedReceipt, retryId, clearRetry } from "./contracts";
import { analyticsAllowed } from "../commercial/model";
import { track } from "../growth/events";
const r = {
  source: "live" as const,
  url: "https://controlled.invalid",
  key: "fixture",
  siteUrl: "https://patri.example",
  hashRouting: false,
};
const id = "11000000-0000-4000-8000-000000000001";
afterEach(() => vi.unstubAllGlobals());
describe("confirmed conversion receipts", () => {
  it.each([
    Response.json({}),
    Response.json({ recebido: false }),
    Response.json({ recebido: true }, { status: 503 }),
    new Response("HTML"),
  ])("rejects an unconfirmed response", async (response) => {
    await expect(acceptedReceipt(response)).rejects.toThrow();
  });
  it("accepts explicit success only", async () => {
    expect(await acceptedReceipt(Response.json({ recebido: true }))).toEqual({
      recebido: true,
    });
  });
  it("preserves a recoverable backend error", async () => {
    await expect(
      acceptedReceipt(
        Response.json({ error: "Aguarde e tente novamente" }, { status: 429 }),
      ),
    ).rejects.toThrow("Aguarde");
  });
});
it("reuses an opaque attempt across refresh, scopes supplier/product and clears on known completion", () => {
  const data = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => data.get(k),
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  });
  expect(retryId("quotation:a", id)).toBe(id);
  expect(retryId("quotation:a", crypto.randomUUID())).toBe(id);
  expect(retryId("quotation:b", crypto.randomUUID())).not.toBe(id);
  expect(JSON.parse([...data.values()][0])).toEqual({
    id,
    expires: expect.any(Number),
  });
  clearRetry("quotation:a");
  expect(retryId("quotation:a", crypto.randomUUID())).not.toBe(id);
});
it("storage denial never blocks submission or analytics refusal", async () => {
  vi.stubGlobal("sessionStorage", {
    getItem: () => {
      throw Error("denied");
    },
  });
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw Error("denied");
    },
  });
  expect(retryId("q", id)).toBe(id);
  expect(() => clearRetry("q")).not.toThrow();
  expect(analyticsAllowed()).toBe(false);
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(track(r, "orcamento_enviado", id)).resolves.toBeUndefined();
  expect(fetch).not.toHaveBeenCalled();
});
it("optional events fail quietly and contain identifiers only", async () => {
  vi.stubGlobal("localStorage", { getItem: () => "analytics" });
  vi.stubGlobal("document", { cookie: "" });
  vi.stubGlobal("location", { protocol: "https:" });
  const fetch = vi.fn().mockRejectedValue(Error("offline"));
  vi.stubGlobal("fetch", fetch);
  await expect(
    track(r, "orcamento_enviado", id, id, "SP"),
  ).resolves.toBeUndefined();
  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(Object.keys(body).sort()).toEqual(
    [
      "consented",
      "eid",
      "etype",
      "region",
      "segment",
      "session_id",
      "target",
    ].sort(),
  );
  await track(
    r,
    "busca",
    "nome@example.com",
    "telefone11999999999",
    "https://url.example?email=x",
  );
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({
    target: null,
    segment: null,
    region: "",
  });
  await track(r, "lead_qualificado", id);
  await track(r, "clique_whatsapp", "nome@example.com");
  expect(fetch).toHaveBeenCalledTimes(2);
});
