import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { billingHistory } from "../shared/api";
import { catalog, savePrice } from "./api";
import { names, type Plan, type Package } from "./model";
import { downloadCsv } from "../admin/model";
import "./billing.css";
export function AdminBilling({ demo, role }: { demo: boolean; role: string }) {
  const c = useQueryClient(),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const q = useQuery({
    queryKey: ["billing-catalog", demo],
    queryFn: () => catalog(demo),
  });
  const history = useQuery({
    queryKey: ["billing-admin", demo],
    queryFn: async () => {
      if (demo) return { subscriptions: [], payments: [] };
      return billingHistory();
    },
  });
  return (
    <section className="billing-page">
      <h2>Planos e cobrança</h2>
      <p>
        Preços em centavos, limites por plano e pacotes. Zero em preço pago
        impede a compra até a definição comercial. Campos vazios de limites
        numéricos representam ilimitado.
      </p>
      {demo && (
        <p className="billing-notice">
          Configuração de demonstração. Valores ilustrativos; salvar aqui
          modifica somente esta prévia no navegador.
        </p>
      )}
      {error && (
        <p role="alert" className="billing-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {(q.isError || history.isError) && (
        <p role="alert">
          Não foi possível carregar a cobrança.{" "}
          <button
            onClick={() => {
              void q.refetch();
              void history.refetch();
            }}
          >
            Tentar novamente
          </button>
        </p>
      )}
      {q.data?.plans.map((p) => (
        <PriceForm
          key={p.id + JSON.stringify(p)}
          item={p}
          kind="plano"
          disabled={!["admin", "comercial"].includes(role)}
          priceOnly={role !== "admin"}
          save={async (data) => {
            setError("");
            try {
              if (demo) {
                localStorage.setItem(
                  "patri:billing-config:" + p.id,
                  JSON.stringify(data),
                );
              } else await savePrice("plano", p.id, data);
              await c.invalidateQueries({ queryKey: ["billing-catalog"] });
              setMessage(
                "Plano salvo. Alterações registradas" +
                  (demo ? " somente na demonstração." : " na auditoria."),
              );
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      ))}
      {q.data?.packs.map((p) => (
        <PriceForm
          key={p.id + JSON.stringify(p)}
          item={p}
          kind="pacote"
          disabled={!["admin", "comercial"].includes(role)}
          priceOnly={role !== "admin"}
          save={async (data) => {
            setError("");
            try {
              if (demo)
                localStorage.setItem(
                  "patri:billing-config:" + p.id,
                  JSON.stringify(data),
                );
              else await savePrice("pacote", p.id, data);
              await c.invalidateQueries({ queryKey: ["billing-catalog"] });
              setMessage(
                "Pacote salvo" +
                  (demo ? " na demonstração." : " na auditoria."),
              );
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      ))}
      <h3>Assinaturas e testes</h3>
      <p>
        Últimos 100 registros. O término do teste usa a data registrada; a
        rotina de ciclo efetiva a migração e preserva o conteúdo excedente. As
        extensões continuam no detalhe do fornecedor com motivo obrigatório.
      </p>
      {history.data?.subscriptions.length ? (
        <>
          <button
            onClick={() =>
              downloadCsv("assinaturas.csv", history.data!.subscriptions)
            }
          >
            Exportar assinaturas CSV
          </button>
          <div className="billing-table">
            <table>
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th>Plano</th>
                  <th>Status</th>
                  <th>Fim do teste</th>
                </tr>
              </thead>
              <tbody>
                {history.data.subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.fornecedor_id}</td>
                    <td>{s.plano}</td>
                    <td>{s.status}</td>
                    <td>
                      {s.teste_ate
                        ? new Date(s.teste_ate).toLocaleDateString("pt-BR")
                        : "Não se aplica"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p>Nenhuma assinatura nesta consulta.</p>
      )}
      <h3>Pagamentos para contabilidade</h3>
      <button
        disabled={!history.data?.payments.length}
        onClick={() =>
          downloadCsv("pagamentos-contabilidade.csv", history.data!.payments)
        }
      >
        Exportar pagamentos CSV
      </button>
      <p>
        Nota fiscal fora deste módulo. Configure no Stripe a régua de três
        tentativas em sete dias; após a carência, a rotina migra a conta ao
        Grátis.
      </p>
    </section>
  );
}
function PriceForm({
  item,
  kind,
  disabled,
  priceOnly,
  save,
}: {
  item: Plan | Package;
  kind: string;
  disabled: boolean;
  priceOnly: boolean;
  save: (d: Record<string, unknown>) => Promise<void>;
}) {
  const plan = "limites" in item ? item : null,
    [price, setPrice] = useState(item.preco_centavos),
    [stripe, setStripe] = useState(plan?.stripe_price_id || ""),
    [limits, setLimits] = useState(plan?.limites || {}),
    [busy, setBusy] = useState(false);
  return (
    <details className="billing-card">
      <summary>
        {plan?.nome ||
          ("creditos" in item ? item.creditos + " créditos" : "Pacote")}
      </summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await save(
              priceOnly
                ? { preco_centavos: price }
                : {
                    preco_centavos: price,
                    stripe_price_id: stripe,
                    limites: limits,
                    ativo: true,
                  },
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={disabled || busy}>
          <legend>
            {kind === "plano"
              ? "Configuração do plano"
              : "Configuração do pacote"}
          </legend>
          <label>
            Preço em centavos
            <input
              type="number"
              min="0"
              max="10000000"
              required
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </label>
          {plan && !priceOnly && (
            <>
              <label>
                Price ID Stripe mensal
                <input
                  value={stripe}
                  onChange={(e) => setStripe(e.target.value)}
                  placeholder="price_..."
                  maxLength={120}
                />
              </label>
              <div className="billing-admin-fields">
                {Object.entries(limits).map(([k, v]) => (
                  <label key={k}>
                    {names[k] || k}
                    {typeof v === "boolean" ? (
                      <input
                        type="checkbox"
                        checked={v}
                        onChange={(e) =>
                          setLimits({ ...limits, [k]: e.target.checked })
                        }
                      />
                    ) : (
                      <input
                        type="number"
                        min="0"
                        max="999999"
                        value={v ?? ""}
                        placeholder="Ilimitado"
                        onChange={(e) =>
                          setLimits({
                            ...limits,
                            [k]:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                      />
                    )}
                  </label>
                ))}
              </div>
            </>
          )}
          <button disabled={busy}>
            Salvar {kind === "plano" ? "plano" : "pacote"}
          </button>
        </fieldset>
      </form>
    </details>
  );
}
