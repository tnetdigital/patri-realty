import { supplierCopy as copy } from "./texts";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MailPlus, Users, Trash2 } from "lucide-react";
import { team, invite, revoke, type SupplierMode } from "./api";
import { supplierTexts as t } from "./texts";
export function SupplierTeam({
  mode,
  supplierId,
  isOwner,
  limit,
}: {
  mode: SupplierMode;
  supplierId: string;
  isOwner: boolean;
  limit: number;
}) {
  const client = useQueryClient(),
    [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const key = ["supplier-team", mode, supplierId];
  const rows = useQuery({
    queryKey: key,
    queryFn: () => team(mode, supplierId),
  });
  const active =
    rows.data?.filter((r) => r.status === "ativo" || r.status === "pendente")
      .length || 0;
  return (
    <section className="supplier-section">
      <div className="subsection-title">
        <div>
          <span className="eyebrow">{copy.trabalhe_em_conjunto}</span>
          <h2>{t.team}</h2>
        </div>
        <Users size={28} strokeWidth={1.2} />
      </div>
      <p className="muted">{t.inviteHint}</p>
      {isOwner ? (
        <form
          className="team-invite"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            try {
              await invite(mode, supplierId, email, limit);
              setEmail("");
              await client.invalidateQueries({ queryKey: key });
              setMessage(
                mode === "demo" ? t.demoInviteSuccess : t.inviteSuccess,
              );
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : copy.nao_foi_possivel_convidar,
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {t.inviteEmail}
            <input
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </label>
          <button className="btn" disabled={busy || active >= limit}>
            <MailPlus size={16} />
            {t.invite}
          </button>
          <small>
            {active}
            {copy.texto__6}
            {limit}
            {copy.vagas_utilizadas}
          </small>
        </form>
      ) : (
        <p className="notice">{t.ownerOnly}</p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {rows.isLoading ? (
        <p>{copy.carregando_equipe}</p>
      ) : rows.isError ? (
        <p role="alert">
          {copy.nao_foi_possivel_carregar_a_equipe}{" "}
          <button onClick={() => void rows.refetch()}>{t.retry}</button>
        </p>
      ) : !rows.data?.length ? (
        <div className="empty-state">
          <Users size={35} />
          <p>{t.noTeam}</p>
        </div>
      ) : (
        <div className="team-list">
          {rows.data.map((r) => (
            <article key={r.id}>
              <span className="member-avatar">
                {(r.nome || r.email).slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{r.nome || r.email}</strong>
                {r.nome && <p>{r.email}</p>}
                {r.expira_em && (
                  <small>
                    {copy.expira_em}{" "}
                    {new Date(r.expira_em).toLocaleDateString("pt-BR")}
                  </small>
                )}
              </div>
              <span className={`status-chip status-${r.status}`}>
                {
                  {
                    ativo: copy.ativo,
                    pendente: copy.pendente,
                    expirado: copy.expirado,
                    revogado: copy.revogado,
                  }[r.status]
                }
              </span>
              {isOwner && ["ativo", "pendente"].includes(r.status) && (
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Revogar acesso de ${r.email}`}
                  onClick={async () => {
                    if (!window.confirm(`Revogar o acesso de ${r.email}?`))
                      return;
                    setBusy(true);
                    try {
                      await revoke(mode, supplierId, r);
                      await client.invalidateQueries({ queryKey: key });
                      setMessage(copy.acesso_revogado);
                    } catch (e) {
                      setMessage(
                        e instanceof Error ? e.message : copy.falha_ao_revogar,
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
