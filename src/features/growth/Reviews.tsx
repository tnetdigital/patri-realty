import { track, ViewEvent } from "./events";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/context";
import { DirectoryContext, useDirectoryRuntime } from "../directory/api";
import { reviews, saveReview, reviewAction } from "./api";
import { growthDemo, writeGrowth } from "./demo";
import type { Review } from "./model";
import "./growth.css";
export function ReviewCards({
  sid,
  mode,
  demo,
}: {
  sid: string;
  mode: "publico" | "fornecedor" | "admin";
  demo: boolean;
}) {
  const r = useDirectoryRuntime(),
    client = useQueryClient(),
    [page, setPage] = useState(1),
    [filter, setFilter] = useState("admin"),
    [message, setMessage] = useState(""),
    q = useQuery({
      queryKey: ["reviews", demo, mode === "admin" ? filter : mode, sid, page],
      queryFn: () =>
        reviews(sid, mode === "admin" ? filter : mode, page, demo, r),
    });
  return (
    <div>
      {mode === "admin" && (
        <label>
          Fila de moderação
          <select
            aria-label="Fila de moderação"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="admin">Todas as avaliações</option>
            <option value="pendentes">Pendentes</option>
            <option value="denunciadas">Denunciadas</option>
          </select>
        </label>
      )}
      {q.isPending ? (
        <p role="status">Carregando avaliações…</p>
      ) : q.isError ? (
        <p role="alert">
          Não foi possível consultar avaliações.{" "}
          <button onClick={() => void q.refetch()}>Tentar novamente</button>
        </p>
      ) : (
        <>
          {q.data?.publicadas ? (
            <p className="growth-rating">
              <strong>{q.data.media} / 5</strong> · {q.data.publicadas}{" "}
              {q.data.publicadas === 1
                ? "avaliação publicada"
                : "avaliações publicadas"}
            </p>
          ) : (
            <p>Sem avaliações publicadas.</p>
          )}
          {message && <p role="status">{message}</p>}
          <div className="growth-cards">
            {q.data?.items.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                mode={mode}
                onAction={async (action, text) => {
                  try {
                    await reviewAction(review.id, action, text, demo);
                    setMessage(
                      action === "publicar"
                        ? "Avaliação publicada."
                        : action === "remover"
                          ? "Avaliação removida."
                          : action === "responder"
                            ? "Resposta publicada."
                            : action === "denunciar"
                              ? "Denúncia encaminhada à moderação."
                              : "Avaliação mantida.",
                    );
                    await client.invalidateQueries({ queryKey: ["reviews"] });
                    await client.invalidateQueries({
                      queryKey: ["public-profile"],
                    });
                    await client.invalidateQueries({
                      queryKey: ["public-search"],
                    });
                    await client.invalidateQueries({
                      queryKey: ["growth-profile"],
                    });
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              />
            ))}
          </div>
          <div className="growth-actions">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
            <span>Página {page}</span>
            <button
              disabled={page * 20 >= (q.data?.total || 0)}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </div>
  );
}
function ReviewCard({
  review: r,
  mode,
  onAction,
}: {
  review: Review;
  mode: string;
  onAction: (action: string, text: string) => Promise<void>;
}) {
  const [body, setBody] = useState(""),
    [busy, setBusy] = useState(false);
  async function act(a: string) {
    setBusy(true);
    try {
      await onAction(a, body);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="growth-card">
      <div className="growth-card-heading">
        <strong>{r.nota} / 5</strong>
        <span>{new Date(r.criado_em).toLocaleDateString("pt-BR")}</span>
      </div>
      <h3>{r.titulo}</h3>
      {mode === "admin" && (
        <p>
          {r.empresa} · {r.status}
        </p>
      )}
      <p className="growth-prose">{r.texto}</p>
      {r.condominio && <p>Condomínio informado: {r.condominio}</p>}
      {mode !== "publico" && r.denuncia_motivo && (
        <p className="growth-notice">Denúncia: {r.denuncia_motivo}</p>
      )}
      {mode !== "publico" && r.motivo_moderacao && (
        <p>Motivo: {r.motivo_moderacao}</p>
      )}
      {r.resposta_fornecedor && (
        <blockquote>
          <strong>Resposta da empresa</strong>
          <p>{r.resposta_fornecedor}</p>
        </blockquote>
      )}
      {mode !== "publico" && (
        <>
          <label>
            {mode === "admin"
              ? "Motivo da moderação"
              : "Resposta ou motivo da denúncia"}
            <textarea
              value={body}
              maxLength={1000}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <div className="growth-actions">
            {mode === "admin" ? (
              <>
                <button disabled={busy} onClick={() => void act("publicar")}>
                  Publicar
                </button>
                <button disabled={busy} onClick={() => void act("remover")}>
                  Remover com motivo
                </button>
                {r.status === "publicada" && r.denuncia_motivo && (
                  <button disabled={busy} onClick={() => void act("manter")}>
                    Manter avaliação
                  </button>
                )}
              </>
            ) : r.status === "publicada" ? (
              <>
                <button disabled={busy} onClick={() => void act("responder")}>
                  Publicar resposta
                </button>
                <button disabled={busy} onClick={() => void act("denunciar")}>
                  Denunciar avaliação
                </button>
              </>
            ) : (
              <p>
                Aguardando moderação. O fornecedor não pode remover avaliações.
              </p>
            )}
          </div>
        </>
      )}
    </article>
  );
}
export function PublicReviews({ sid }: { sid: string }) {
  const runtime = useDirectoryRuntime(),
    demo = runtime.source === "demo",
    { access } = useAuth(),
    client = useQueryClient(),
    [actor, setActor] = useState("visitante"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState({
      nota: 5,
      titulo: "",
      texto: "",
      condominio: "",
    });
  useEffect(() => {
    if (demo) setActor(growthDemo().actor);
  }, [demo]);
  const logged = demo ? actor !== "visitante" : !!access,
    own = useQuery({
      queryKey: ["reviews", demo, "minha", sid, demo ? actor : access?.user.id],
      queryFn: () => reviews(sid, "minha", 1, demo),
      enabled: logged,
    });
  useEffect(() => {
    const mine = own.data?.items[0];
    if (mine)
      setForm({
        nota: mine.nota,
        titulo: mine.titulo,
        texto: mine.texto,
        condominio: mine.condominio,
      });
  }, [own.data]);
  return (
    <section className="growth-reviews" id="avaliacoes">
      <span className="eyebrow">EXPERIÊNCIAS DA COMUNIDADE</span>
      <h2>Avaliações</h2>
      {demo && (
        <div className="growth-notice">
          <p>
            Simulação com pessoas e relatos fictícios. Escolha um perfil para
            experimentar.
          </p>
          <label>
            Pessoa na simulação
            <select
              value={actor}
              onChange={(e) => {
                const s = growthDemo();
                s.actor = e.target.value;
                writeGrowth(s);
                setActor(e.target.value);
                setForm({ nota: 5, titulo: "", texto: "", condominio: "" });
              }}
            >
              <option value="visitante">Visitante</option>
              <option value="sindico-1">Síndico Exemplo 1</option>
              <option value="sindico-2">Síndico Exemplo 2</option>
              <option value="sindico-3">Síndico Exemplo 3</option>
              <option value="fornecedor">Fornecedor vinculado</option>
            </select>
          </label>
        </div>
      )}
      <ReviewCards sid={sid} mode="publico" demo={demo} />
      {!logged ? (
        <p>
          <Link to="/entrar">Entre na sua conta para avaliar</Link>. Sua
          avaliação será revisada antes da publicação.
        </p>
      ) : (
        <form
          className="growth-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            try {
              await saveReview(sid, form, demo);
              setMessage(
                "Avaliação enviada para moderação. Ela aparecerá após aprovação.",
              );
              await client.invalidateQueries({ queryKey: ["reviews"] });
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>
            {own.data?.items.length
              ? "Editar minha avaliação"
              : "Conte sua experiência"}
          </h3>
          {own.data?.items[0] && (
            <p>
              Situação: {own.data.items[0].status}. Alterações passam por nova
              revisão.
            </p>
          )}
          <label>
            Nota
            <select
              value={form.nota}
              onChange={(e) =>
                setForm((f) => ({ ...f, nota: Number(e.target.value) }))
              }
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option value={n} key={n}>
                  {n} de 5
                </option>
              ))}
            </select>
          </label>
          <label>
            Título
            <input
              required
              minLength={3}
              maxLength={100}
              value={form.titulo}
              onChange={(e) =>
                setForm((f) => ({ ...f, titulo: e.target.value }))
              }
            />
          </label>
          <label>
            Sua experiência
            <textarea
              required
              minLength={30}
              maxLength={1000}
              value={form.texto}
              onChange={(e) =>
                setForm((f) => ({ ...f, texto: e.target.value }))
              }
            />
          </label>
          <label>
            Condomínio (opcional)
            <input
              maxLength={120}
              value={form.condominio}
              onChange={(e) =>
                setForm((f) => ({ ...f, condominio: e.target.value }))
              }
            />
          </label>
          <p>
            Descreva uma experiência real. Não inclua contatos, dados pessoais,
            ofensas ou publicidade. Você pode manter uma avaliação por empresa.
          </p>
          <button className="primary" disabled={busy}>
            {busy ? "Enviando…" : "Enviar avaliação"}
          </button>
          {message && <p role="status">{message}</p>}
        </form>
      )}
    </section>
  );
}

export function DemoReviewsPage() {
  const r = useDirectoryRuntime();
  return (
    <DirectoryContext.Provider value={{ ...r, source: "demo" }}>
      <section className="container growth-page">
        <span className="eyebrow">SIMULAÇÃO DE EXPERIÊNCIAS</span>
        <h1>Manutenção Exemplo Paulista</h1>
        <p>
          Fornecedor fictício para experimentar avaliações. Os relatos desta
          página ficam apenas no seu navegador.
        </p>
        <ViewEvent
          runtime={{ ...r, source: "demo" }}
          type="visualizacao_perfil"
          target="demo-company-0"
        />
        <button
          onClick={() =>
            void track(
              { ...r, source: "demo" },
              "clique_whatsapp",
              "demo-company-0",
            )
          }
        >
          Simular clique no WhatsApp
        </button>
        <PublicReviews sid="demo-company-0" />
        <p>
          <Link to="/demonstracao-crescimento">Voltar aos resultados</Link>
        </p>
      </section>
    </DirectoryContext.Provider>
  );
}
