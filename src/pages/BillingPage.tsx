import { retryId, clearRetry } from "../features/conversion/contracts";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ownCompanies } from "../features/shared/api";
import { catalog, summary, checkout } from "../features/billing/api";
import { billingDemoAction, readBillingDemo } from "../features/billing/demo";
import { money, resource, names, daysLeft } from "../features/billing/model";
import { downloadCsv } from "../features/admin/model";
import "../features/billing/billing.css";
export default function BillingPage({ demo = false }: { demo?: boolean }) {
  const sending = useRef(false);
  const client = useQueryClient(),
    [params] = useSearchParams(),
    [sid, setSid] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [order, setOrder] = useState({ product: "", id: crypto.randomUUID() }),
    [page, setPage] = useState(1);
  const companies = useQuery({
    queryKey: ["billing-companies", demo],
    queryFn: async () => {
      if (demo)
        return [{ id: "billing-demo", nome_fantasia: "Empresa Exemplo" }];
      const r = await ownCompanies();
      if (r.error) throw Error(r.error.message);
      return r.data;
    },
  });
  const id = sid || companies.data?.[0]?.id || "";
  const products = useQuery({
    queryKey: ["billing-catalog", demo],
    queryFn: () => catalog(demo),
  });
  const current = useQuery({
    queryKey: ["billing", demo, id],
    enabled: !!id,
    queryFn: () => summary(id, demo),
    refetchInterval: 30000,
  });
  useEffect(() => {
    const listener = () =>
      void client.invalidateQueries({ queryKey: ["billing"] });
    window.addEventListener("patri:billing", listener);
    return () => window.removeEventListener("patri:billing", listener);
  }, [client]);
  async function run(
    fn: () => unknown | Promise<unknown>,
    success = "Operação concluída.",
  ) {
    if (sending.current) return;
    sending.current = true;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await fn();
      await client.invalidateQueries({ queryKey: ["billing"] });
      setMessage(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
      if (e instanceof Error && e.message.includes("encerrado"))
        setOrder({ product: "", id: crypto.randomUUID() });
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function buy(product: string) {
    if (demo) {
      if (
        window.confirm("Confirmar compra simulada? Nenhum valor será cobrado.")
      )
        await run(
          () => billingDemoAction("buy", product),
          "Compra simulada confirmada. Nenhuma cobrança realizada.",
        );
      return;
    }
    const request =
      order.product === product ? order : { product, id: crypto.randomUUID() };
    setOrder(request);
    const scope = "checkout:" + id + ":" + product;
    await run(async () => {
      try {
        await checkout(id, product, retryId(scope, request.id));
      } catch (e) {
        if (e instanceof Error && e.message.includes("encerrado"))
          clearRetry(scope);
        throw e;
      }
    }, "Redirecionamento solicitado. A compra depende da confirmação segura do pagamento.");
  }
  const s = current.data,
    simulation = demo ? readBillingDemo() : null;
  return (
    <section className="billing-page container">
      <span className="eyebrow">SEU PRÓXIMO NÍVEL</span>
      <h1>Plano e créditos</h1>
      <p>
        Escolha como sua empresa quer se conectar. Acompanhe benefícios, saldo e
        histórico em um só lugar.
      </p>
      <Link to={demo ? "/demonstracao" : "/painel"}>
        Voltar ao painel do fornecedor
      </Link>
      {demo && (
        <aside className="billing-notice">
          <strong>Demonstração de planos e pagamentos</strong>
          <p>
            Valores ilustrativos, dados fictícios e compras simuladas somente
            neste navegador. Não há cobrança, cartão ou Pix real. Os preços
            finais serão definidos no admin.
          </p>
          <div className="billing-actions">
            <button
              onClick={() => {
                if (window.confirm("Reiniciar a demonstração de planos?"))
                  void run(() => billingDemoAction("reset"));
              }}
            >
              Reiniciar demonstração de planos
            </button>
            <Link to="/demonstracao-admin/planos">
              Ver configuração administrativa
            </Link>
          </div>
        </aside>
      )}
      {params.get("checkout") === "retorno" && (
        <p role="status">
          Você retornou do checkout. A liberação depende da confirmação segura
          do pagamento; atualizar esta página não confirma uma compra.
        </p>
      )}
      {params.get("checkout") === "cancelado" && (
        <p role="status">
          Checkout encerrado sem confirmação. Você pode tentar novamente.
        </p>
      )}
      {companies.data && companies.data.length > 1 && (
        <label>
          Empresa
          <select
            value={id}
            onChange={(e) => {
              setSid(e.target.value);
              setPage(1);
            }}
          >
            {companies.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome_fantasia}
              </option>
            ))}
          </select>
        </label>
      )}
      {(companies.isError || current.isError || products.isError) && (
        <div role="alert">
          <p>Não foi possível carregar os dados do plano.</p>
          <button
            onClick={() => {
              void companies.refetch();
              void current.refetch();
              void products.refetch();
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {!id && !companies.isPending && !companies.isError && (
        <p>Nenhuma empresa vinculada à sua conta.</p>
      )}
      {current.isPending && id && <p role="status">Carregando seu plano…</p>}
      {error && (
        <p role="alert" className="billing-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="billing-success">
          {message}
        </p>
      )}
      {s && (
        <>
          <div className="billing-current">
            <span>PLANO ATUAL</span>
            <h2>
              {s.assinatura?.status === "teste"
                ? "Premium em teste"
                : s.plano === "gratuito"
                  ? "Grátis"
                  : s.plano === "destaque"
                    ? "Destaque"
                    : "Premium"}
            </h2>
            {s.assinatura?.status === "teste" && (
              <p>
                {daysLeft(s.assinatura.teste_ate)} dias restantes de teste. Até{" "}
                {new Date(s.assinatura.teste_ate!).toLocaleDateString("pt-BR")}.
                Sem assinatura, a conta passa ao Grátis e os itens excedentes
                ficam ocultos, preservados para uma futura reativação.
              </p>
            )}
            {s.assinatura?.status === "inadimplente" && (
              <p>
                Pagamento pendente. Atualize o meio de pagamento antes de{" "}
                {new Date(s.assinatura.carencia_ate!).toLocaleDateString(
                  "pt-BR",
                )}{" "}
                para manter os benefícios.
              </p>
            )}
            {s.assinatura?.cancelar_no_fim && (
              <p>Cancelamento agendado ao fim do período pago.</p>
            )}
            <div className="billing-metrics">
              <div>
                <strong>{s.saldo}</strong>créditos disponíveis
              </div>
              <div>
                <strong>{resource(s.limites.leads)}</strong>contatos por mês
              </div>
              <div>
                <strong>{resource(s.limites.fotos)}</strong>fotos visíveis
              </div>
              <div>
                <strong>{s.cortesias}</strong>matérias de cortesia
              </div>
            </div>
            {s.dono && !demo && (
              <div className="billing-actions">
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      checkout(id, "", crypto.randomUUID(), "portal"),
                    )
                  }
                >
                  Gerenciar cartão e cancelamento
                </button>
              </div>
            )}
            {!s.dono && (
              <p>Somente o proprietário pode comprar e gerenciar a cobrança.</p>
            )}
          </div>
          <h2>Compare os planos</h2>
          <p>
            Recursos editoriais, avaliações e métricas serão disponibilizados
            nas próximas fases. O selo depende da verificação da equipe.
          </p>
          <div className="billing-grid">
            {products.data?.plans.map((p) => (
              <article
                className="billing-card"
                data-selected={s.plano === p.codigo}
                key={p.id}
              >
                <h3>{p.nome}</h3>
                <p className="billing-price">
                  {p.codigo === "gratuito"
                    ? "R$ 0"
                    : p.preco_centavos > 0
                      ? money(p.preco_centavos)
                      : "Preço em definição"}
                  {p.codigo !== "gratuito" && p.preco_centavos > 0 && (
                    <small> / mês</small>
                  )}
                </p>
                <ul>
                  {Object.entries(p.limites).map(([k, v]) => (
                    <li key={k}>
                      <span>{names[k] || k}</span>
                      <strong>
                        {k === "prioridade"
                          ? Number(v) >= 2
                            ? "Alta"
                            : "Normal"
                          : resource(v)}
                      </strong>
                    </li>
                  ))}
                </ul>
                {p.codigo !== "gratuito" && (
                  <button
                    className="primary"
                    disabled={
                      busy ||
                      !s.dono ||
                      p.preco_centavos <= 0 ||
                      (s.plano === p.codigo && s.assinatura?.status === "ativa")
                    }
                    onClick={() => void buy(p.codigo)}
                  >
                    {demo ? "Simular assinatura " : "Escolher "}
                    {p.nome}
                  </button>
                )}
              </article>
            ))}
          </div>
          <h2>Créditos para novas oportunidades</h2>
          <p>
            No Grátis, os três primeiros contatos do mês civil ficam liberados.
            Cada pedido adicional pode ser aberto com um crédito. Créditos não
            expiram nesta versão; estornos geram lançamentos negativos no
            extrato.
          </p>
          <div className="billing-grid">
            {products.data?.packs.map((p) => (
              <article className="billing-card" key={p.id}>
                <h3>{p.creditos} créditos</h3>
                <p className="billing-price">
                  {p.preco_centavos > 0
                    ? money(p.preco_centavos)
                    : "Preço em definição"}
                </p>
                <p>
                  Pagamento único. Cartão ou Pix no checkout quando configurado.
                </p>
                <button
                  disabled={busy || !s.dono || p.preco_centavos <= 0}
                  onClick={() => void buy(p.codigo)}
                >
                  {demo ? "Simular compra de " : "Comprar "}
                  {p.creditos} créditos
                </button>
              </article>
            ))}
          </div>
          {demo && simulation && (
            <section className="billing-scenario">
              <h2>Explore o fim do teste</h2>
              <p>
                Este cenário tem cinco fotos e quatro pedidos fictícios. No
                Grátis, uma foto fica visível e quatro são preservadas, ocultas.
                O quarto pedido precisa de um crédito ou assinatura.
              </p>
              <div className="billing-actions">
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => billingDemoAction("expire"),
                      "Teste encerrado na simulação. Conteúdo excedente preservado.",
                    )
                  }
                >
                  Simular fim do teste
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => billingDemoAction("repeat"),
                      "Evento repetido ignorado. O saldo não foi creditado novamente.",
                    )
                  }
                >
                  Repetir último evento de pagamento
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => billingDemoAction("refund"),
                      "Estorno simulado registrado no extrato.",
                    )
                  }
                >
                  Simular estorno de créditos
                </button>
              </div>
              <p>
                <strong>
                  {s.plano === "gratuito"
                    ? "1 foto visível · 4 fotos ocultas e preservadas"
                    : "5 fotos visíveis · nenhuma foto apagada"}
                </strong>
              </p>
              <article>
                <h3>Quarto pedido do mês</h3>
                <p>
                  Manutenção predial · Campinas, SP ·{" "}
                  {new Date().toLocaleDateString("pt-BR")}
                </p>
                {s.plano !== "gratuito" || simulation.unlocked ? (
                  <p>
                    Contato fictício liberado: Síndico Exemplo ·
                    sindico@example.com · (11) 98888-7777
                  </p>
                ) : (
                  <>
                    <p>
                      Contato bloqueado pelo plano. A informação pessoal só
                      aparece após a liberação.
                    </p>
                    <button
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => billingDemoAction("unlock"),
                          "Pedido liberado com um crédito. Débito registrado no extrato.",
                        )
                      }
                    >
                      Liberar pedido por 1 crédito
                    </button>
                  </>
                )}
              </article>
            </section>
          )}
          <h2>Extrato de créditos</h2>
          <div className="billing-actions">
            <button
              disabled={!s.extrato.length}
              onClick={() => downloadCsv("extrato-creditos.csv", s.extrato)}
            >
              Exportar extrato CSV
            </button>
          </div>
          {s.extrato.length ? (
            <>
              <div className="billing-table">
                <table>
                  <caption>Últimos 100 movimentos</caption>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Créditos</th>
                      <th>Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.extrato.slice((page - 1) * 20, page * 20).map((e) => (
                      <tr key={e.id}>
                        <td>
                          {new Date(e.criado_em).toLocaleDateString("pt-BR")}
                        </td>
                        <td>{e.tipo}</td>
                        <td>
                          {e.quantidade > 0 ? "+" : ""}
                          {e.quantidade}
                        </td>
                        <td>{e.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <nav className="billing-actions" aria-label="Páginas do extrato">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Anterior
                </button>
                <span>Página {page}</span>
                <button
                  disabled={page * 20 >= s.extrato.length}
                  onClick={() => setPage(page + 1)}
                >
                  Próxima
                </button>
              </nav>
            </>
          ) : (
            <p>Nenhuma movimentação de créditos.</p>
          )}
          <h2>Pagamentos</h2>
          {s.pagamentos.length ? (
            <div className="billing-table">
              <table>
                <caption>Últimos 100 pedidos de pagamento</caption>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Produto</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Fatura</th>
                  </tr>
                </thead>
                <tbody>
                  {s.pagamentos.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                      </td>
                      <td>{p.produto.replaceAll("_", " ")}</td>
                      <td>{money(p.valor_centavos)}</td>
                      <td>{p.status}</td>
                      <td>
                        {p.fatura_url?.startsWith(
                          "https://invoice.stripe.com/",
                        ) ? (
                          <a
                            href={p.fatura_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Abrir fatura
                          </a>
                        ) : (
                          "Disponível no portal quando aplicável"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Nenhum pagamento registrado.</p>
          )}
        </>
      )}
    </section>
  );
}
