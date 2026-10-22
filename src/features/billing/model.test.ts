import { describe, it, expect, beforeEach } from "vitest";
import { daysLeft, money, resource } from "./model";
import { billingDemoAction, readBillingDemo } from "./demo";
beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => values.get(k) || null,
      setItem: (k: string, v: string) => values.set(k, v),
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: { dispatchEvent: () => true },
    configurable: true,
  });
});
describe("ciclo demonstrativo de cobrança", () => {
  it("calcula período restante e formatos sem arredondar preços", () => {
    expect(daysLeft(new Date(86400001).toISOString(), 1)).toBe(1);
    expect(daysLeft(new Date(0).toISOString(), 1)).toBe(0);
    expect(money(19990)).toContain("199,90");
    expect(resource(null)).toBe("Ilimitado");
  });
  it("expira teste, compra uma vez, debita uma vez e registra estorno", () => {
    billingDemoAction("expire");
    expect(readBillingDemo().summary.plano).toBe("gratuito");
    expect(() => billingDemoAction("unlock")).toThrow("Saldo insuficiente");
    billingDemoAction("buy", "creditos_10");
    billingDemoAction("repeat");
    expect(readBillingDemo().summary.saldo).toBe(10);
    billingDemoAction("unlock");
    billingDemoAction("unlock");
    expect(readBillingDemo().summary.saldo).toBe(9);
    billingDemoAction("refund");
    expect(readBillingDemo().summary.saldo).toBe(-1);
  });
});
