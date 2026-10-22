import { supplierCopy as copy } from "./texts";
import { Plus, Trash2 } from "lucide-react";
import { ImagePicker } from "./ImagePicker";
import { supplierTexts as t } from "./texts";
import type { SupplierMode } from "./api";
import type { SupplierDraft, Limits } from "./model";
export function ContentEditor({
  draft: d,
  update,
  limits,
  mode,
  disabled,
}: {
  draft: SupplierDraft;
  update: (patch: Partial<SupplierDraft>) => void;
  limits: Limits;
  mode: SupplierMode;
  disabled: boolean;
}) {
  function remove(
    key: "servicos" | "cases" | "faqs" | "midias",
    index: number,
  ) {
    if (window.confirm(copy.remover_este_item_do_perfil_a_alteracao))
      update({ [key]: d[key].filter((_, i) => i !== index) });
  }
  const input = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    maxLength: number,
    multiline = false,
  ) => (
    <label>
      {label}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          disabled={disabled}
          rows={3}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          disabled={disabled}
        />
      )}
    </label>
  );
  return (
    <div className="content-editor">
      <section>
        <div className="subsection-title">
          <h3>{t.services}</h3>
          <span>
            {d.servicos.length}
            {copy.texto__6}
            {limits.servicos}
          </span>
        </div>
        {d.servicos.map((s, i) => (
          <div className="repeater-card" key={s.id}>
            <div className="repeater-top">
              <strong>
                {copy.servico}
                {i + 1}
              </strong>
              <button
                disabled={disabled}
                type="button"
                aria-label={`Remover serviço ${i + 1}`}
                onClick={() => remove("servicos", i)}
              >
                <Trash2 size={15} />
              </button>
            </div>
            {input(
              t.serviceTitle,
              s.titulo,
              (v) =>
                update({
                  servicos: d.servicos.map((x, j) =>
                    i === j ? { ...x, titulo: v } : x,
                  ),
                }),
              120,
            )}
            {input(
              t.description,
              s.descricao,
              (v) =>
                update({
                  servicos: d.servicos.map((x, j) =>
                    i === j ? { ...x, descricao: v } : x,
                  ),
                }),
              1000,
              true,
            )}
            <ImagePicker
              label={`Foto do serviço ${i + 1}`}
              value={s.foto_url}
              mode={mode}
              supplierId={d.id}
              disabled={disabled}
              onChange={(url) =>
                update({
                  servicos: d.servicos.map((x, j) =>
                    i === j ? { ...x, foto_url: url } : x,
                  ),
                })
              }
            />
          </div>
        ))}
        <button
          type="button"
          className="add-item"
          disabled={disabled || d.servicos.length >= limits.servicos}
          onClick={() =>
            update({
              servicos: [
                ...d.servicos,
                {
                  id: crypto.randomUUID(),
                  titulo: "",
                  descricao: "",
                  foto_url: "",
                },
              ],
            })
          }
        >
          <Plus size={16} />
          {t.add}
          {copy.servico_2}
        </button>
      </section>
      <section>
        <div className="subsection-title">
          <h3>{t.gallery}</h3>
          <span>
            {d.midias.length}
            {copy.texto__6}
            {limits.fotos}
          </span>
        </div>
        <div className="gallery-editor">
          {d.midias.map((m, i) => (
            <div className="repeater-card" key={m.id}>
              <div className="repeater-top">
                <strong>
                  {copy.foto}
                  {i + 1}
                </strong>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Remover foto ${i + 1}`}
                  onClick={() => remove("midias", i)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <ImagePicker
                label={`Foto da galeria ${i + 1}`}
                value={m.url}
                mode={mode}
                supplierId={d.id}
                disabled={disabled}
                onChange={(url) =>
                  update({
                    midias: d.midias.map((x, j) =>
                      i === j ? { ...x, url } : x,
                    ),
                  })
                }
              />
              {input(
                t.caption,
                m.legenda,
                (v) =>
                  update({
                    midias: d.midias.map((x, j) =>
                      i === j ? { ...x, legenda: v } : x,
                    ),
                  }),
                160,
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="add-item"
          disabled={disabled || d.midias.length >= limits.fotos}
          onClick={() =>
            update({
              midias: [
                ...d.midias,
                { id: crypto.randomUUID(), url: "", legenda: "" },
              ],
            })
          }
        >
          <Plus size={16} />
          {t.add}
          {copy.foto_2}
        </button>
      </section>
      <section>
        <h3>{t.video}</h3>
        {input(
          copy.link_do_video,
          d.video_url,
          (v) => update({ video_url: v }),
          300,
        )}
        {!limits.video && (
          <p className="muted">{copy.video_nao_disponivel_neste_plano}</p>
        )}
      </section>
      <section>
        <div className="subsection-title">
          <h3>{t.cases}</h3>
          <span>
            {d.cases.length}
            {copy.texto__6}
            {limits.cases}
          </span>
        </div>
        {d.cases.map((c, i) => (
          <div className="repeater-card" key={c.id}>
            <div className="repeater-top">
              <strong>
                {copy.case}
                {i + 1}
              </strong>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remover case ${i + 1}`}
                onClick={() => remove("cases", i)}
              >
                <Trash2 size={15} />
              </button>
            </div>
            {input(
              t.condominium,
              c.condominio,
              (v) =>
                update({
                  cases: d.cases.map((x, j) =>
                    i === j ? { ...x, condominio: v } : x,
                  ),
                }),
              160,
            )}
            {input(
              t.description,
              c.descricao,
              (v) =>
                update({
                  cases: d.cases.map((x, j) =>
                    i === j ? { ...x, descricao: v } : x,
                  ),
                }),
              1000,
              true,
            )}
            <ImagePicker
              label={`Foto do case ${i + 1}`}
              value={c.foto_url}
              mode={mode}
              supplierId={d.id}
              disabled={disabled}
              onChange={(url) =>
                update({
                  cases: d.cases.map((x, j) =>
                    i === j ? { ...x, foto_url: url } : x,
                  ),
                })
              }
            />
          </div>
        ))}
        <button
          type="button"
          className="add-item"
          disabled={disabled || d.cases.length >= limits.cases}
          onClick={() =>
            update({
              cases: [
                ...d.cases,
                {
                  id: crypto.randomUUID(),
                  condominio: "",
                  descricao: "",
                  foto_url: "",
                },
              ],
            })
          }
        >
          <Plus size={16} />
          {t.add}
          {copy.case_2}
        </button>
      </section>
      <section>
        <div className="subsection-title">
          <h3>{t.faq}</h3>
          <span>
            {d.faqs.length}
            {copy.texto__6}
            {limits.faqs}
          </span>
        </div>
        {d.faqs.map((f, i) => (
          <div className="repeater-card" key={f.id}>
            <div className="repeater-top">
              <strong>
                {copy.pergunta}
                {i + 1}
              </strong>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remover pergunta ${i + 1}`}
                onClick={() => remove("faqs", i)}
              >
                <Trash2 size={15} />
              </button>
            </div>
            {input(
              t.question,
              f.pergunta,
              (v) =>
                update({
                  faqs: d.faqs.map((x, j) =>
                    i === j ? { ...x, pergunta: v } : x,
                  ),
                }),
              200,
            )}
            {input(
              t.answer,
              f.resposta,
              (v) =>
                update({
                  faqs: d.faqs.map((x, j) =>
                    i === j ? { ...x, resposta: v } : x,
                  ),
                }),
              1000,
              true,
            )}
          </div>
        ))}
        <button
          type="button"
          className="add-item"
          disabled={disabled || d.faqs.length >= limits.faqs}
          onClick={() =>
            update({
              faqs: [
                ...d.faqs,
                { id: crypto.randomUUID(), pergunta: "", resposta: "" },
              ],
            })
          }
        >
          <Plus size={16} />
          {t.add}
          {copy.pergunta_2}
        </button>
      </section>
      <section>
        <h3>{t.certifications}</h3>
        <label>
          {copy.uma_certificacao_por_linha}
          <textarea
            disabled={disabled}
            rows={3}
            value={d.certificacoes.join("\n")}
            onChange={(e) =>
              update({ certificacoes: e.target.value.split("\n") })
            }
            onBlur={() =>
              update({
                certificacoes: d.certificacoes
                  .map((v) => v.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      </section>
      <section>
        <h3>{t.posts}</h3>
        <label>
          {copy.ate_6_links_de_publicacoes_um_por}
          <textarea
            disabled={disabled}
            rows={3}
            value={d.instagram_posts.join("\n")}
            onChange={(e) =>
              update({ instagram_posts: e.target.value.split("\n") })
            }
            onBlur={() =>
              update({
                instagram_posts: d.instagram_posts
                  .map((v) => v.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      </section>
    </div>
  );
}
