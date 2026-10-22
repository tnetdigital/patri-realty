import { QuotationInbox } from "../features/quotations/Inbox";
import { supplierCopy as copy } from "../features/suppliers/texts";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Eye,
  Send,
  Building2,
  Image,
  AlignLeft,
  MapPin,
  Layers,
  Users,
  CheckCircle2,
  Lock,
  Loader2,
  Plus,
  X,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../features/auth/context";
import { supplierTexts as t } from "../features/suppliers/texts";
import { SupplierPreview } from "../features/suppliers/Preview";
import { ImagePicker } from "../features/suppliers/ImagePicker";
import { ContentEditor } from "../features/suppliers/ContentEditor";
import { SupplierTeam } from "../features/suppliers/Team";
import { exampleSupplier } from "../features/suppliers/demo";
import {
  listSuppliers,
  loadSupplier,
  saveSupplier,
  submitSupplier,
  supplierCatalog,
  lookupCep,
  resetDemo,
  claim,
  SupplierApiError,
  type SupplierMode,
} from "../features/suppliers/api";
import {
  completeness,
  diagnosis,
  missingMinimum,
  canSubmit,
  editable,
  validateStep,
  type SupplierDraft,
} from "../features/suppliers/model";
import "../features/suppliers/supplier.css";
const icons = [Building2, Image, AlignLeft, MapPin, Layers];
export default function SupplierPortal({
  demo = false,
  initialSupplierId = "",
}: {
  demo?: boolean;
  initialSupplierId?: string;
}) {
  const route = useLocation();
  const loadedId = useRef("");
  const mode: SupplierMode = demo ? "demo" : "live";
  const { access } = useAuth();
  const client = useQueryClient();
  const [selected, setSelected] = useState(initialSupplierId),
    [draft, setDraft] = useState<SupplierDraft | null>(null),
    [step, setStep] = useState(0),
    [tab, setTab] = useState<"profile" | "team" | "leads">(
      route.pathname.endsWith("/orcamentos")
        ? "leads"
        : route.pathname.endsWith("/equipe")
          ? "team"
          : "profile",
    ),
    [preview, setPreview] = useState(false),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [message, setMessage] = useState(""),
    [regionUf, setRegionUf] = useState(""),
    [regionCity, setRegionCity] = useState(""),
    [regionName, setRegionName] = useState(""),
    [cepBusy, setCepBusy] = useState(false),
    [duplicate, setDuplicate] = useState(false),
    [proof, setProof] = useState(""),
    [claimMessage, setClaimMessage] = useState("");
  const modal = useRef<HTMLDialogElement>(null);
  const companies = useQuery({
    queryKey: ["suppliers", mode],
    queryFn: () => listSuppliers(mode),
  });
  const catalog = useQuery({
    queryKey: ["supplier-catalog", mode],
    queryFn: () => supplierCatalog(mode),
    staleTime: 300000,
  });
  const id = selected || companies.data?.[0]?.id || "";
  const profile = useQuery({
    queryKey: ["supplier", mode, id],
    queryFn: () => loadSupplier(mode, id),
    enabled: !!id,
  });
  useEffect(() => {
    if (profile.data && loadedId.current !== profile.data.id) {
      loadedId.current = profile.data.id;
      setDraft(profile.data);
      setStep(profile.data.etapa);
      setDirty(false);
    }
  }, [profile.data]);
  useEffect(() => {
    function leave(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  function update(patch: Partial<SupplierDraft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
    setMessage("");
    setErrors({});
  }
  async function save(target?: number) {
    if (!draft || !catalog.data) return false;
    setMessage("");
    const e = validateStep(draft, step, catalog.data.limits);
    if (Object.keys(e).length) {
      setErrors(e);
      setMessage(copy.revise_os_campos_indicados_antes_de_salvar);
      return false;
    }
    setBusy(true);
    try {
      const result = await saveSupplier(mode, draft, step, catalog.data.limits);
      setDraft(result);
      client.setQueryData(["supplier", mode, id], result);
      setDirty(false);
      setMessage(t.saved);
      if (target !== undefined) setStep(target);
      return true;
    } catch (e) {
      if (e instanceof SupplierApiError) setDuplicate(e.duplicateCnpj);
      setMessage(e instanceof Error ? e.message : copy.nao_foi_possivel_salvar);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function go(target: number) {
    if (busy || !draft) return;
    if (dirty) {
      await save(target);
    } else {
      setStep(target);
      setErrors({});
      setMessage("");
    }
    setTab("profile");
  }
  async function send() {
    if (!draft) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await submitSupplier(mode, draft);
      setDraft(result);
      client.setQueryData(["supplier", mode, id], result);
      modal.current?.close();
      setMessage(demo ? t.demoSent : t.sentBody);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : copy.nao_foi_possivel_enviar);
    } finally {
      setBusy(false);
    }
  }
  if (companies.isLoading || catalog.isLoading || profile.isLoading)
    return (
      <section className="container supplier-loading">
        <Loader2 className="spin" />
        {copy.carregando_seu_espaco}
      </section>
    );
  if (companies.isError || catalog.isError || profile.isError)
    return (
      <section className="container page">
        <h1>{copy.nao_foi_possivel_abrir_o_painel}</h1>
        <p role="alert">{t.loadError}</p>
        <button
          className="btn"
          onClick={() => {
            void companies.refetch();
            void catalog.refetch();
            void profile.refetch();
          }}
        >
          {t.retry}
        </button>
      </section>
    );
  if (!companies.data?.length)
    return (
      <section className="container page">
        <h1>{copy.painel_do_fornecedor}</h1>
        <p>{t.noSupplier}</p>
        <Link to="/conta">{copy.minha_conta}</Link>
      </section>
    );
  if (!draft || !catalog.data) return null;
  const cat = catalog.data,
    limits = cat.limits,
    score = completeness(draft),
    missing = missingMinimum(draft),
    locked = !(editable(draft.status) || !!access?.roles.includes("admin")),
    isOwner = demo || draft.dono_id === access?.user.id;
  const remaining = Math.max(
    0,
    limits.dias_completude -
      Math.floor((Date.now() - Date.parse(draft.cadastro_em)) / 86400000),
  );
  const field = (
    key: keyof typeof t.fields,
    type = "text",
    maxLength = 160,
  ) => (
    <label key={key}>
      {t.fields[key]}
      <input
        type={type}
        aria-label={t.fields[key]}
        maxLength={maxLength}
        value={String(draft[key])}
        disabled={locked || busy}
        aria-invalid={!!errors[key]}
        onChange={(e) => update({ [key]: e.target.value })}
      />
      {errors[key] && <small className="field-error">{errors[key]}</small>}
    </label>
  );
  if (preview)
    return (
      <section className="container supplier-area">
        <SupplierPreview
          draft={draft}
          catalog={cat}
          onBack={() => setPreview(false)}
        />
      </section>
    );
  return (
    <div className="supplier-area">
      <div className="container">
        {demo && (
          <div className="demo-banner">
            <div>
              <span className="demo-dot" />
              <strong>{t.demo}</strong>
              <p>{t.demoBody}</p>
            </div>
            <Link to="/">
              {copy.voltar_ao_portal}
              <ArrowRight size={14} />
            </Link>
          </div>
        )}
        <div className="supplier-heading">
          <div>
            <span className="eyebrow">{t.kicker}</span>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          <button
            type="button"
            className="btn outline"
            onClick={() => setPreview(true)}
          >
            <Eye size={16} />
            {t.preview}
          </button>
        </div>
        {companies.data.length > 1 && (
          <label className="company-select">
            {copy.empresa}
            <select
              value={id}
              onChange={(e) => {
                if (
                  !dirty ||
                  window.confirm(
                    copy.ha_alteracoes_nao_salvas_trocar_de_empresa,
                  )
                )
                  setSelected(e.target.value);
              }}
            >
              {companies.data.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.nome_fantasia}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="supplier-layout">
          <aside className="supplier-sidebar">
            <div className="supplier-id">
              <div className="supplier-monogram">
                {draft.logo_url ? (
                  <img src={draft.logo_url} alt={draft.nome_fantasia} />
                ) : (
                  <Building2 size={25} />
                )}
              </div>
              <strong>{draft.nome_fantasia || copy.sua_empresa}</strong>
              <span className={`status-chip status-${draft.status}`}>
                {t.status[draft.status]}
              </span>
            </div>
            <nav aria-label={copy.painel_do_fornecedor}>
              <Link
                className="btn outline"
                to={demo ? "/demonstracao-crescimento" : "/painel/metricas"}
              >
                Resultados e reputação
              </Link>
              <Link
                className="btn outline"
                to={
                  demo ? "/demonstracao-crescimento/cresca" : "/painel/cresca"
                }
              >
                Cresça com a gente
              </Link>
              <Link
                className="btn outline"
                to={demo ? "/demonstracao-anuncios" : "/painel/anuncios"}
              >
                Anúncios e contratos
              </Link>
              <Link
                className="btn outline"
                to={demo ? "/demonstracao-materias" : "/painel/materias"}
              >
                Matérias da empresa
              </Link>
              <Link
                className="billing-panel-link btn outline"
                to={demo ? "/demonstracao-plano" : "/painel/plano"}
              >
                Plano e créditos
              </Link>
              <button
                className={tab === "profile" ? "selected" : ""}
                onClick={() => setTab("profile")}
              >
                <Building2 size={17} />
                {t.profile}
              </button>
              <button
                className={tab === "team" ? "selected" : ""}
                onClick={() => {
                  if (
                    !dirty ||
                    window.confirm(
                      copy.salve_suas_alteracoes_antes_de_trocar_de,
                    )
                  )
                    setTab("team");
                }}
              >
                <Users size={17} />
                {t.team}
              </button>
              <button
                className={tab === "leads" ? "selected" : ""}
                onClick={() => {
                  if (
                    !dirty ||
                    window.confirm(
                      "Salve suas alterações antes de trocar de seção. Deseja continuar?",
                    )
                  )
                    setTab("leads");
                }}
              >
                Pedidos de orçamento
              </button>
            </nav>
            <div className="profile-diagnosis">
              <div className="score-label">
                <span>{t.progress}</span>
                <strong>
                  {score}
                  {copy.texto_}
                </strong>
              </div>
              <div
                className="score-track"
                role="progressbar"
                aria-label={copy.completude_do_perfil}
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${score}%` }} />
              </div>
              <p className="deadline">
                {draft.status === "rascunho"
                  ? `${remaining} dias restantes para preparar o perfil.`
                  : t.status[draft.status]}
              </p>
              <details open>
                <summary>{t.diagnosis}</summary>
                <ul>
                  {diagnosis(draft).map((item) => (
                    <li key={item.key}>
                      <button
                        className={item.done ? "complete" : ""}
                        disabled={item.step < 0 || busy}
                        onClick={() => void go(item.step)}
                      >
                        <span>
                          {item.done ? (
                            <Check size={13} />
                          ) : (
                            <span className="empty-check" />
                          )}
                          {item.label}
                        </span>
                        <small>
                          {copy.texto__2}
                          {item.points}
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
            {score < 60 && (
              <div className="diagnosis-tip">
                <Sparkles size={20} />
                <h3>{t.specialist}</h3>
                <p>{t.specialistBody}</p>
                <Link
                  to={
                    demo ? "/demonstracao-crescimento/cresca" : "/painel/cresca"
                  }
                >
                  Conhecer o apoio disponível
                </Link>
              </div>
            )}
            {demo && (
              <button
                className="reset-demo"
                disabled={busy}
                onClick={async () => {
                  if (
                    !window.confirm(
                      copy.reiniciar_a_demonstracao_e_apagar_os_dados,
                    )
                  )
                    return;
                  setBusy(true);
                  try {
                    await resetDemo();
                    setSelected("");
                    await client.invalidateQueries({
                      queryKey: ["suppliers", "demo"],
                    });
                    await client.invalidateQueries({
                      queryKey: ["supplier", "demo"],
                    });
                    setMessage(copy.demonstracao_reiniciada);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <RotateCcw size={13} />
                {copy.reiniciar_demonstracao}
              </button>
            )}
          </aside>
          <div className="supplier-main">
            {tab === "leads" ? (
              <QuotationInbox supplierId={id} demo={demo} />
            ) : tab === "team" ? (
              <SupplierTeam
                mode={mode}
                supplierId={id}
                isOwner={isOwner}
                limit={limits.membros}
              />
            ) : (
              <>
                <div
                  className="wizard-stepper"
                  role="navigation"
                  aria-label={copy.etapas_do_cadastro}
                >
                  {t.steps.map((name, i) => {
                    const Icon = icons[i];
                    return (
                      <button
                        type="button"
                        aria-current={step === i ? "step" : undefined}
                        key={name}
                        className={
                          step === i ? "active" : i < step ? "past" : ""
                        }
                        disabled={busy}
                        onClick={() => void go(i)}
                      >
                        <span>
                          {i < step ? <Check size={17} /> : <Icon size={17} />}
                        </span>
                        <small>{name}</small>
                      </button>
                    );
                  })}
                </div>
                {draft.status === "em_analise" && (
                  <div className="submission-success">
                    <CheckCircle2 size={28} />
                    <div>
                      <strong>{t.sent}</strong>
                      <p>{demo ? t.demoSent : t.sentBody}</p>
                    </div>
                  </div>
                )}
                {draft.motivo_status && (
                  <div className="notice">
                    <strong>{t.status[draft.status]}</strong>
                    <p>{draft.motivo_status}</p>
                  </div>
                )}
                {draft.alteracoes_pendentes.length > 0 && (
                  <div className="notice">
                    {t.pending}
                    <ul>
                      {draft.alteracoes_pendentes.map((a) => (
                        <li key={a.campo}>
                          {a.campo}
                          {copy.texto__3}
                          {a.depois}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <section className="supplier-section">
                  <div className="wizard-title">
                    <div>
                      <span className="eyebrow">
                        {copy.passo}
                        {step + 1}
                        {copy.de_5}
                      </span>
                      <h2>{t.steps[step]}</h2>
                      <p>{t.stepDescriptions[step]}</p>
                    </div>
                    {locked ? (
                      <Lock size={22} />
                    ) : (
                      <span className="autosave-label">
                        <span className={dirty ? "dirty-dot" : "saved-dot"} />
                        {busy ? t.saving : dirty ? t.unsaved : t.saved}
                      </span>
                    )}
                  </div>
                  {demo && !draft.nome_fantasia && !locked && (
                    <button
                      className="sample-button"
                      type="button"
                      onClick={() => {
                        update(exampleSupplier(draft, cat));
                        setMessage(
                          copy.exemplo_ficticio_preenchido_salve_para_continuar,
                        );
                      }}
                    >
                      <Sparkles size={15} />
                      {copy.preencher_exemplo_ficticio}
                    </button>
                  )}
                  {step === 0 && (
                    <div className="company-fields">
                      <div className="form-grid">
                        {field("nome_fantasia")}
                        {field("razao_social")}
                        {field("cnpj")}
                        {field("whatsapp", "tel")}
                        {field("telefone", "tel")}
                        {field("email", "email")}
                        {field("site", "url")}
                        {field("instagram")}
                        <label>
                          {copy.cep}
                          <div className="input-with-button">
                            <input
                              value={draft.cep}
                              disabled={locked || busy || cepBusy}
                              maxLength={9}
                              onChange={(e) => update({ cep: e.target.value })}
                            />
                            <button
                              type="button"
                              disabled={
                                locked ||
                                busy ||
                                cepBusy ||
                                draft.cep.replace(/\D/g, "").length !== 8
                              }
                              onClick={async () => {
                                setCepBusy(true);
                                try {
                                  const address = await lookupCep(draft.cep);
                                  const city = cat.cities.find(
                                    (c) =>
                                      c.nome === address.cidade &&
                                      c.uf === address.uf,
                                  );
                                  update({
                                    endereco: address.endereco,
                                    estado: address.uf,
                                    cidade_nome: address.cidade,
                                    cidade_id: city?.id || "",
                                  });
                                } catch (e) {
                                  setMessage(
                                    e instanceof Error
                                      ? e.message
                                      : copy.preencha_o_endereco_manualmente,
                                  );
                                } finally {
                                  setCepBusy(false);
                                }
                              }}
                            >
                              {cepBusy ? "Buscando…" : copy.buscar}
                            </button>
                          </div>
                          {errors.cep && (
                            <small className="field-error">{errors.cep}</small>
                          )}
                        </label>
                        <label>
                          {t.state}
                          <select
                            aria-label={copy.estado_da_sede}
                            disabled={locked || busy}
                            value={draft.estado}
                            onChange={(e) =>
                              update({
                                estado: e.target.value,
                                cidade_id: "",
                                cidade_nome: "",
                              })
                            }
                          >
                            <option value="">{copy.selecione}</option>
                            {cat.states.map((uf) => (
                              <option key={uf}>{uf}</option>
                            ))}
                          </select>
                        </label>
                        {demo ? (
                          <label>
                            {t.fields.cidade_id}
                            <input
                              list="demo-headquarters-cities"
                              value={draft.cidade_nome}
                              disabled={locked || busy}
                              onChange={(e) => {
                                const city = cat.cities.find(
                                  (c) =>
                                    c.uf === draft.estado &&
                                    c.nome === e.target.value,
                                );
                                update({
                                  cidade_nome: e.target.value,
                                  cidade_id: city?.id || crypto.randomUUID(),
                                });
                              }}
                            />
                            <datalist id="demo-headquarters-cities">
                              {cat.cities
                                .filter((c) => c.uf === draft.estado)
                                .map((c) => (
                                  <option key={c.id}>{c.nome}</option>
                                ))}
                            </datalist>
                          </label>
                        ) : (
                          <label>
                            {t.fields.cidade_id}
                            <select
                              aria-label="Cidade-sede"
                              disabled={locked || busy}
                              value={draft.cidade_id}
                              onChange={(e) => {
                                const city = cat.cities.find(
                                  (c) => c.id === e.target.value,
                                );
                                update({
                                  cidade_id: e.target.value,
                                  cidade_nome: city?.nome || "",
                                });
                              }}
                            >
                              <option value="">{copy.selecione}</option>
                              {cat.cities
                                .filter((c) => c.uf === draft.estado)
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome}
                                  </option>
                                ))}
                            </select>
                          </label>
                        )}
                        {field("endereco")}
                      </div>
                      {duplicate && !demo && (
                        <div className="claim-form">
                          <h3>{copy.reivindicar_pagina}</h3>
                          <p>{copy.envie_um_comprovante_do_seu_vinculo_com}</p>
                          <label>
                            {copy.link_https_do_comprovante}
                            <input
                              type="url"
                              value={proof}
                              onChange={(e) => setProof(e.target.value)}
                            />
                          </label>
                          <label>
                            {copy.explique_seu_vinculo}
                            <textarea
                              value={claimMessage}
                              onChange={(e) => setClaimMessage(e.target.value)}
                              minLength={20}
                              maxLength={2000}
                            />
                          </label>
                          <button
                            type="button"
                            className="btn"
                            onClick={async () => {
                              try {
                                await claim(draft.cnpj, proof, claimMessage);
                                setMessage(
                                  copy.reivindicacao_registrada_para_analise,
                                );
                                setDuplicate(false);
                              } catch (e) {
                                setMessage(
                                  e instanceof Error
                                    ? e.message
                                    : copy.falha_ao_registrar,
                                );
                              }
                            }}
                          >
                            {copy.solicitar_reivindicacao}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {step === 1 && (
                    <>
                      <p className="muted brand-hint">{t.brandHint}</p>
                      <div className="brand-editors">
                        <ImagePicker
                          label={t.logo}
                          value={draft.logo_url}
                          mode={mode}
                          supplierId={id}
                          kind="logo"
                          maxMb={limits.upload_mb}
                          disabled={locked || busy}
                          onChange={(url, thumbnail) =>
                            update({ logo_url: url, logo_thumb_url: thumbnail })
                          }
                        />
                        <ImagePicker
                          label={t.cover}
                          value={draft.capa_url}
                          mode={mode}
                          supplierId={id}
                          kind="cover"
                          maxMb={limits.upload_mb}
                          disabled={locked || busy}
                          onChange={(url, thumbnail) =>
                            update({ capa_url: url, capa_thumb_url: thumbnail })
                          }
                        />
                      </div>
                    </>
                  )}
                  {step === 2 && (
                    <>
                      <label>
                        {t.fields.descricao_curta}
                        <textarea
                          rows={2}
                          aria-label={t.fields.descricao_curta}
                          maxLength={160}
                          disabled={locked || busy}
                          value={draft.descricao_curta}
                          onChange={(e) =>
                            update({ descricao_curta: e.target.value })
                          }
                        />
                        <span className="field-counter">
                          {draft.descricao_curta.length}
                          {copy.texto_160}
                        </span>
                        {errors.descricao_curta && (
                          <small className="field-error">
                            {errors.descricao_curta}
                          </small>
                        )}
                      </label>
                      <label>
                        {t.fields.sobre}
                        <textarea
                          rows={7}
                          aria-label={t.fields.sobre}
                          maxLength={2000}
                          disabled={locked || busy}
                          value={draft.sobre}
                          onChange={(e) => update({ sobre: e.target.value })}
                        />
                        <span className="field-counter">
                          {draft.sobre.length}
                          {copy.texto_2000_nao_inclua_telefone_email_ou_html}
                        </span>
                        {errors.sobre && (
                          <small className="field-error">{errors.sobre}</small>
                        )}
                      </label>
                      {field("ano_fundacao", "text", 4)}
                      <fieldset
                        className="segment-choices"
                        disabled={locked || busy}
                      >
                        <legend>
                          {t.segments}
                          {copy.ate}
                          {limits.segmentos}
                        </legend>
                        {cat.segments.map((s) => (
                          <label
                            key={s.id}
                            className={
                              draft.segmentos.includes(s.id) ? "chosen" : ""
                            }
                          >
                            <input
                              type="checkbox"
                              checked={draft.segmentos.includes(s.id)}
                              disabled={
                                !draft.segmentos.includes(s.id) &&
                                draft.segmentos.length >= limits.segmentos
                              }
                              onChange={(e) =>
                                update({
                                  segmentos: e.target.checked
                                    ? [...draft.segmentos, s.id]
                                    : draft.segmentos.filter(
                                        (id) => id !== s.id,
                                      ),
                                })
                              }
                            />
                            {s.nome}
                          </label>
                        ))}
                      </fieldset>
                      {errors.segmentos && (
                        <p className="field-error">{errors.segmentos}</p>
                      )}
                    </>
                  )}
                  {step === 3 && (
                    <>
                      <div className="region-form">
                        <label>
                          {t.state}
                          <select
                            aria-label={copy.estado_de_atendimento}
                            value={regionUf}
                            disabled={locked || busy}
                            onChange={(e) => {
                              setRegionUf(e.target.value);
                              setRegionCity("");
                              setRegionName("");
                            }}
                          >
                            <option value="">{copy.selecione}</option>
                            {cat.states.map((uf) => (
                              <option key={uf}>{uf}</option>
                            ))}
                          </select>
                        </label>
                        {demo ? (
                          <label>
                            {t.city}
                            <input
                              value={regionName}
                              placeholder={copy.deixe_vazio_para_todo_o_estado}
                              disabled={locked || busy}
                              onChange={(e) => {
                                setRegionName(e.target.value);
                                setRegionCity(
                                  e.target.value ? crypto.randomUUID() : "",
                                );
                              }}
                            />
                          </label>
                        ) : (
                          <label>
                            {t.city}
                            <select
                              aria-label={copy.cidade_de_atendimento}
                              value={regionCity}
                              disabled={locked || busy}
                              onChange={(e) => {
                                setRegionCity(e.target.value);
                                setRegionName(
                                  cat.cities.find(
                                    (c) => c.id === e.target.value,
                                  )?.nome || "",
                                );
                              }}
                            >
                              <option value="">{t.wholeState}</option>
                              {cat.cities
                                .filter((c) => c.uf === regionUf)
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome}
                                  </option>
                                ))}
                            </select>
                          </label>
                        )}
                        <button
                          type="button"
                          className="btn outline"
                          disabled={locked || busy || !regionUf}
                          onClick={() => {
                            if (
                              draft.cobertura.some(
                                (r) =>
                                  r.uf === regionUf &&
                                  (r.cidade_id === regionCity ||
                                    (!r.cidade_id && !regionCity)),
                              )
                            ) {
                              setMessage(copy.esta_regiao_ja_esta_cadastrada);
                              return;
                            }
                            update({
                              cobertura: [
                                ...draft.cobertura,
                                {
                                  id: crypto.randomUUID(),
                                  uf: regionUf,
                                  cidade_id: regionCity || null,
                                  cidade_nome: regionName,
                                },
                              ],
                            });
                            setRegionCity("");
                            setRegionName("");
                          }}
                        >
                          <Plus size={16} />
                          {t.addRegion}
                        </button>
                      </div>
                      <div className="region-chips">
                        {draft.cobertura.map((r) => (
                          <span key={r.id}>
                            <MapPin size={14} />
                            {r.cidade_nome || t.wholeState}
                            {copy.texto__4}
                            {r.uf}
                            <button
                              type="button"
                              disabled={locked || busy}
                              aria-label={`Remover região ${r.cidade_nome || r.uf}`}
                              onClick={() =>
                                update({
                                  cobertura: draft.cobertura.filter(
                                    (x) => x.id !== r.id,
                                  ),
                                })
                              }
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                      {!draft.cobertura.length && (
                        <p className="empty-state">
                          {copy.escolha_onde_sua_empresa_atende_para_se}
                        </p>
                      )}
                      {errors.cobertura && (
                        <p className="field-error">{errors.cobertura}</p>
                      )}
                    </>
                  )}
                  {step === 4 && (
                    <ContentEditor
                      draft={draft}
                      update={update}
                      limits={limits}
                      mode={mode}
                      disabled={locked || busy}
                    />
                  )}
                  {Object.entries(errors)
                    .filter(([key]) => key.includes("."))
                    .map(([key, v]) => (
                      <p className="field-error" role="alert" key={key}>
                        {key}
                        {copy.texto__3}
                        {v}
                      </p>
                    ))}
                  {message && (
                    <p className="notice save-status" role="status">
                      {message}
                    </p>
                  )}
                  <div className="wizard-actions">
                    <button
                      type="button"
                      className="back-button"
                      disabled={step === 0 || busy}
                      onClick={() => void go(step - 1)}
                    >
                      <ArrowLeft size={16} />
                      {t.back}
                    </button>
                    <div>
                      <button
                        type="button"
                        className="btn outline"
                        disabled={locked || busy}
                        onClick={() => void save()}
                      >
                        {busy ? (
                          <Loader2 size={16} className="spin" />
                        ) : (
                          <Check size={16} />
                        )}{" "}
                        {t.save}
                      </button>
                      {step < 4 && (
                        <button
                          type="button"
                          className="btn"
                          disabled={locked || busy}
                          onClick={() => void save(step + 1)}
                        >
                          {t.next}
                          <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </section>
                <section className="submission-card">
                  <div>
                    <span className="eyebrow">{copy.o_proximo_passo}</span>
                    <h3>{copy.pronto_para_se_conectar}</h3>
                    <p>
                      {missing.length
                        ? `${t.minimum} ${missing.join(", ")}.`
                        : draft.status === "em_analise"
                          ? t.sentBody
                          : copy.a_publicacao_comeca_com_uma_analise_cuidadosa}
                    </p>
                    {dirty && (
                      <small>
                        {copy.salve_suas_alteracoes_antes_de_enviar}
                      </small>
                    )}
                  </div>
                  <button
                    className="btn"
                    type="button"
                    disabled={!canSubmit(draft) || dirty || busy}
                    onClick={() => modal.current?.showModal()}
                  >
                    <Send size={16} />
                    {t.send}
                  </button>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
      <dialog
        ref={modal}
        className="supplier-modal"
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <CheckCircle2 size={35} />
        <h2>{t.confirmSend}</h2>
        <p>{t.confirmBody}</p>
        {demo && <p className="notice">{t.demoSent}</p>}
        <div className="modal-actions">
          <button
            type="button"
            className="btn outline"
            disabled={busy}
            onClick={() => modal.current?.close()}
          >
            {t.cancel}
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => void send()}
          >
            {busy ? "Enviando…" : t.confirm}
          </button>
        </div>
      </dialog>
    </div>
  );
}
