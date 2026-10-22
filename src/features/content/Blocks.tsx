import { useState } from "react";
import { type Block, publicHref, videoId } from "./model";
import { uploadContent } from "./api";
export function ArticleBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="article-body">
      {blocks.map((b, i) =>
        b.tipo === "titulo" ? (
          <h2 key={i}>{b.texto}</h2>
        ) : b.tipo === "citacao" ? (
          <blockquote key={i}>{b.texto}</blockquote>
        ) : b.tipo === "lista" ? (
          <ul key={i}>
            {b.texto
              .split("\n")
              .filter(Boolean)
              .map((t, n) => (
                <li key={n}>{t}</li>
              ))}
          </ul>
        ) : b.tipo === "imagem" ? (
          <figure key={i}>
            {(publicHref(b.url || "") ||
              b.url?.startsWith("data:image/webp;base64,")) && (
              <img src={b.url} alt={b.legenda || ""} loading="lazy" />
            )}
            {b.legenda && <figcaption>{b.legenda}</figcaption>}
          </figure>
        ) : b.tipo === "video" ? (
          <Video key={i} url={b.url || ""} />
        ) : b.tipo === "link" ? (
          <p key={i}>
            <a
              href={publicHref(b.url || "")}
              target="_blank"
              rel="noopener noreferrer"
            >
              {b.texto || "Abrir referência"}
            </a>
          </p>
        ) : b.tipo === "tabela" ? (
          <div className="content-table" key={i}>
            <table>
              <caption>{b.texto || "Informações da matéria"}</caption>
              <tbody>
                {b.linhas?.map((r, n) => (
                  <tr key={n}>
                    {r.map((v, j) =>
                      n === 0 ? (
                        <th scope="col" key={j}>
                          {v}
                        </th>
                      ) : (
                        <td key={j}>{v}</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p key={i}>{b.texto}</p>
        ),
      )}
    </div>
  );
}
function Video({ url }: { url: string }) {
  const [open, setOpen] = useState(false),
    id = videoId(url);
  return !id ? null : (
    <div className="content-video">
      {open ? (
        <iframe
          title="Vídeo da matéria"
          src={"https://www.youtube-nocookie.com/embed/" + id}
          loading="lazy"
          allowFullScreen
        />
      ) : (
        <button onClick={() => setOpen(true)}>Carregar vídeo do YouTube</button>
      )}
      <p>O vídeo é um conteúdo externo, carregado somente ao solicitar.</p>
    </div>
  );
}
export function ContentImage({
  label,
  value,
  onChange,
  demo,
  mid,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  demo: boolean;
  mid: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="content-image-field">
      <label>
        {label}
        <input
          value={
            value.startsWith("data:") ? "Imagem local de demonstração" : value
          }
          readOnly={value.startsWith("data:")}
          type="text"
          placeholder="https://..."
          disabled={disabled || busy}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      <label>
        Enviar imagem: {label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || busy || !mid}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            setError("");
            try {
              onChange(await uploadContent(f, mid, demo));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {!mid && (
        <small>Salve o rascunho para habilitar o envio de imagens.</small>
      )}
      {value && (
        <img
          src={value}
          alt="Prévia da imagem escolhida"
          className="content-image-preview"
        />
      )}
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Preparando imagem WebP…</p>}
      <small>
        JPG, PNG ou WebP, até 5 MB. A imagem enviada é redimensionada e
        convertida para WebP sem os metadados originais.
      </small>
    </div>
  );
}
export function BlockEditor({
  blocks,
  onChange,
  demo,
  mid,
  disabled,
}: {
  blocks: Block[];
  onChange: (b: Block[]) => void;
  demo: boolean;
  mid: string;
  disabled: boolean;
}) {
  const [type, setType] = useState<Block["tipo"]>("paragrafo");
  function update(i: number, b: Block) {
    onChange(blocks.map((x, n) => (n === i ? b : x)));
  }
  return (
    <fieldset disabled={disabled}>
      <legend>Editor de blocos</legend>
      <p>
        Organize o texto com títulos, listas, imagens e tabelas. HTML não é
        aceito.
      </p>
      {blocks.map((b, i) => (
        <div className="content-block" key={i}>
          <div className="content-block-header">
            <strong>
              Bloco {i + 1}: {b.tipo}
            </strong>
            <div className="content-actions">
              <button
                type="button"
                disabled={i === 0}
                aria-label={"Mover bloco " + (i + 1) + " para cima"}
                onClick={() => {
                  const copy = [...blocks];
                  [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                  onChange(copy);
                }}
              >
                Subir
              </button>
              <button
                type="button"
                disabled={i === blocks.length - 1}
                aria-label={"Mover bloco " + (i + 1) + " para baixo"}
                onClick={() => {
                  const copy = [...blocks];
                  [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]];
                  onChange(copy);
                }}
              >
                Descer
              </button>
              <button
                type="button"
                disabled={blocks.length === 1}
                onClick={() => onChange(blocks.filter((_, n) => n !== i))}
              >
                Remover bloco {i + 1}
              </button>
            </div>
          </div>
          {b.tipo === "imagem" ? (
            <>
              <ContentImage
                label={"Imagem do bloco " + (i + 1)}
                value={b.url || ""}
                onChange={(v) => update(i, { ...b, url: v })}
                demo={demo}
                mid={mid}
                disabled={disabled}
              />
              <label>
                Legenda e descrição da imagem
                <input
                  value={b.legenda || ""}
                  maxLength={200}
                  onChange={(e) => update(i, { ...b, legenda: e.target.value })}
                />
              </label>
            </>
          ) : b.tipo === "video" ? (
            <label>
              URL do YouTube
              <input
                value={b.url || ""}
                onChange={(e) => update(i, { ...b, url: e.target.value })}
              />
            </label>
          ) : (
            <>
              <label>
                {b.tipo === "tabela"
                  ? "Título da tabela"
                  : "Texto do bloco " + (i + 1)}
                <textarea
                  rows={b.tipo === "titulo" ? 2 : 5}
                  value={b.texto}
                  onChange={(e) => update(i, { ...b, texto: e.target.value })}
                />
              </label>
              {b.tipo === "lista" && <small>Um item por linha.</small>}
              {b.tipo === "link" && (
                <label>
                  URL de referência HTTPS
                  <input
                    value={b.url || ""}
                    onChange={(e) => update(i, { ...b, url: e.target.value })}
                  />
                </label>
              )}
              {b.tipo === "tabela" && (
                <label>
                  Linhas da tabela
                  <textarea
                    rows={5}
                    value={b.linhas?.map((r) => r.join(" | ")).join("\n") || ""}
                    placeholder={"Coluna 1 | Coluna 2\nDado 1 | Dado 2"}
                    onChange={(e) =>
                      update(i, {
                        ...b,
                        linhas: e.target.value
                          .split("\n")
                          .map((r) => r.split("|").map((c) => c.trim())),
                      })
                    }
                  />
                  <small>
                    Uma linha por registro, colunas separadas por |. A primeira
                    linha vira o cabeçalho. Até 20 linhas e oito colunas.
                  </small>
                </label>
              )}
            </>
          )}
        </div>
      ))}
      <div className="content-actions">
        <label>
          Tipo de novo bloco
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Block["tipo"])}
          >
            {[
              "paragrafo",
              "titulo",
              "citacao",
              "lista",
              "imagem",
              "video",
              "tabela",
              "link",
            ].map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={blocks.length >= 100}
          onClick={() =>
            onChange([
              ...blocks,
              {
                tipo: type,
                texto: "",
                ...(type === "tabela"
                  ? {
                      linhas: [
                        ["", ""],
                        ["", ""],
                      ],
                    }
                  : {}),
              },
            ])
          }
        >
          Adicionar bloco
        </button>
      </div>
    </fieldset>
  );
}
