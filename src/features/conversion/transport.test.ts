import { afterEach, expect, it, vi } from "vitest";
const assign = vi.fn();
vi.mock("../../lib/supabase", () => ({
  db: () => ({
    auth: {
      getSession: async () => ({
        data: { session: { access_token: "fixture-only" } },
      }),
    },
  }),
}));
import { checkout } from "../billing/api";
import { submitQuotation } from "../quotations/api";
import type { Quotation } from "../quotations/model";
afterEach(() => {
  vi.unstubAllGlobals();
  assign.mockReset();
});
it("quotation does not confirm a 200 without a receipt", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
  await expect(
    submitQuotation({} as Quotation, false, "attempt", "test", "QA"),
  ).rejects.toThrow("confirmar");
});
it("quotation only returns confirmation after the controlled response", async () => {
  let resolve!: (r: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockReturnValue(new Promise((r) => (resolve = r))),
  );
  const promise = submitQuotation(
    {
      fornecedor_id: "QA",
      segmento_id: "segment",
      cidade: "Cidade",
      uf: "SP",
    } as Quotation,
    false,
    "attempt",
    "test",
    "QA",
  );
  await vi.waitFor(() => expect(resolve).toBeDefined());
  resolve(Response.json({ recebido: true }));
  await expect(promise).resolves.toEqual({ recebido: true, simulated: false });
});
it.each([
  "https://evil.example",
  "https://secret@checkout.stripe.com",
  "http://checkout.stripe.com",
])("rejects invalid checkout destinations %s", async (url) => {
  vi.stubGlobal("location", { assign });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ url })));
  await expect(checkout("supplier", "product", "attempt")).rejects.toThrow(
    "inválido",
  );
  expect(assign).not.toHaveBeenCalled();
});
it("valid checkout opens a session without confirming a purchase", async () => {
  vi.stubGlobal("location", { assign });
  const fetch = vi
    .fn()
    .mockResolvedValue(
      Response.json({ url: "https://checkout.stripe.com/c/pay/fixture" }),
    );
  vi.stubGlobal("fetch", fetch);
  await checkout("supplier", "product", "attempt");
  expect(assign).toHaveBeenCalledOnce();
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    sid: "supplier",
    product: "product",
    request_id: "attempt",
    action: "checkout",
  });
});
